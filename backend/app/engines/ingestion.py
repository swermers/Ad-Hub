import json
import logging
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


async def crawl_website(start_url: str, max_pages: int = 20) -> list[dict]:
    """Crawl a website starting from start_url, extracting text content.

    Uses httpx (HTTP client) by default. Falls back gracefully if a page
    can't be fetched. For JS-heavy sites, Playwright can be used instead
    (requires `playwright install chromium`).
    """
    domain = urlparse(start_url).netloc
    visited: set[str] = set()
    results: list[dict] = []
    queue = [start_url]

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=15.0,
        headers={"User-Agent": "AdHub-Crawler/0.1"},
    ) as client:
        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue

            try:
                response = await client.get(url)
                if response.status_code >= 400:
                    visited.add(url)
                    continue

                html = response.text
                soup = BeautifulSoup(html, "html.parser")

                # Remove non-content elements
                for tag in soup(
                    ["nav", "footer", "script", "style", "header", "aside", "noscript"]
                ):
                    tag.decompose()

                title = ""
                if soup.title and soup.title.string:
                    title = soup.title.string.strip()

                # Extract main content area
                main = soup.find("main") or soup.find("article") or soup.find("body")
                content_text = main.get_text(separator="\n", strip=True) if main else ""

                # Classify page type
                page_type = _classify_page(url, title, content_text)

                results.append(
                    {
                        "url": url,
                        "title": title,
                        "content": content_text,
                        "page_type": page_type,
                    }
                )
                visited.add(url)

                # Discover internal links
                for a_tag in soup.find_all("a", href=True):
                    link = urljoin(url, a_tag["href"])
                    parsed = urlparse(link)
                    if parsed.netloc == domain and link not in visited:
                        clean = link.split("#")[0].split("?")[0]
                        if not clean.endswith((".pdf", ".png", ".jpg", ".gif", ".zip", ".mp4")):
                            queue.append(clean)

            except Exception as e:
                logger.warning("Failed to crawl %s: %s", url, e)
                visited.add(url)

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
Website: {product.website_url or "N/A"}
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

    try:
        # Try to parse as JSON
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {"raw_brief": result["content"]}
