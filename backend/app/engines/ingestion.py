from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright


async def crawl_website(start_url: str, max_pages: int = 20) -> list[dict]:
    """Crawl a website starting from start_url, extracting text content."""
    domain = urlparse(start_url).netloc
    visited: set[str] = set()
    results: list[dict] = []
    queue = [start_url]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue

            try:
                response = await page.goto(url, wait_until="networkidle", timeout=15000)
                if not response or response.status >= 400:
                    visited.add(url)
                    continue

                html = await page.content()
                soup = BeautifulSoup(html, "html.parser")

                # Remove non-content elements
                for tag in soup(["nav", "footer", "script", "style", "header", "aside", "noscript"]):
                    tag.decompose()

                title = ""
                if soup.title and soup.title.string:
                    title = soup.title.string.strip()

                # Extract main content area
                main = soup.find("main") or soup.find("article") or soup.find("body")
                content_text = main.get_text(separator="\n", strip=True) if main else ""

                # Classify page type
                page_type = _classify_page(url, title, content_text)

                results.append({
                    "url": url,
                    "title": title,
                    "content": content_text,
                    "page_type": page_type,
                })
                visited.add(url)

                # Discover internal links
                links = await page.eval_on_selector_all(
                    "a[href]", "els => els.map(e => e.href)"
                )
                for link in links:
                    parsed = urlparse(link)
                    if parsed.netloc == domain and link not in visited:
                        clean = link.split("#")[0].split("?")[0]
                        if not clean.endswith((".pdf", ".png", ".jpg", ".gif", ".zip", ".mp4")):
                            queue.append(clean)

            except Exception:
                visited.add(url)

        await browser.close()

    return results


def _classify_page(url: str, title: str, content: str) -> str:
    """Simple heuristic page classification."""
    url_lower = url.lower()
    title_lower = title.lower()

    if any(k in url_lower for k in ["/blog", "/post", "/article"]):
        return "blog"
    if any(k in url_lower for k in ["/about", "/team", "/story"]):
        return "about"
    if any(k in url_lower for k in ["/pricing", "/plans"]):
        return "pricing"
    if any(k in url_lower for k in ["/faq", "/help", "/support"]):
        return "faq"
    if any(k in url_lower for k in ["/contact"]):
        return "contact"
    if any(k in title_lower for k in ["home", "welcome"]) or url.rstrip("/").count("/") <= 3:
        return "landing"
    return "other"


async def generate_brand_brief(product, crawled_pages, documents) -> dict:
    """Generate a comprehensive brand brief using Claude."""
    from app.services.claude_client import call_claude

    # Compile all available content
    page_summaries = []
    for page in crawled_pages[:10]:  # Limit to avoid token overflow
        text = (page.content or "")[:2000]
        page_summaries.append(f"[{page.page_type}: {page.url}]\n{text}")

    doc_summaries = []
    for doc in documents[:5]:
        text = (doc.content or "")[:2000]
        doc_summaries.append(f"[{doc.doc_type}: {doc.filename}]\n{text}")

    all_content = "\n\n---\n\n".join(page_summaries + doc_summaries)

    prompt = f"""Analyze the following product information and generate a comprehensive brand brief.

Product Name: {product.name}
Website: {product.website_url or 'N/A'}
Description: {product.description}
Target Audience: {product.target_audience}
Pain Points: {product.pain_points}
Differentiators: {product.differentiators}

--- Crawled Website Content ---
{all_content}
---

Generate a JSON brand brief with these fields:
{{
    "brand_voice": {{
        "tone": "description of the brand's tone",
        "vocabulary": ["key words and phrases the brand uses"],
        "personality": "brand personality traits",
        "do": ["things the brand should do in content"],
        "dont": ["things the brand should avoid"]
    }},
    "audience_personas": [
        {{
            "name": "persona name",
            "description": "who they are",
            "pain_points": ["their specific pain points"],
            "motivations": ["what drives them"]
        }}
    ],
    "messaging_pillars": [
        {{
            "pillar": "pillar name",
            "description": "what this pillar covers",
            "key_messages": ["specific messages for this pillar"]
        }}
    ],
    "competitive_positioning": "how the product positions against alternatives",
    "content_themes": ["theme 1", "theme 2", "theme 3"],
    "value_proposition": "the core value proposition in one sentence"
}}

Return ONLY the JSON object, no markdown formatting."""

    result = await call_claude(prompt)

    import json
    try:
        # Try to parse as JSON
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {"raw_brief": result["content"]}
