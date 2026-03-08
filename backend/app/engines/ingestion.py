import json
import logging
import os
import re
import uuid
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "screenshots")


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
    all_colors: set[str] = set()

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

                # Extract colors from the raw HTML before stripping styles
                page_colors = _extract_colors_from_html(html)
                all_colors.update(page_colors)

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

    # Attach extracted colors to the results metadata
    if results:
        results[0]["_extracted_colors"] = list(all_colors)[:20]

    return results


def _extract_colors_from_html(html: str) -> set[str]:
    """Extract hex color values from inline styles and CSS in HTML."""
    colors: set[str] = set()

    # Match hex colors (#rgb, #rrggbb)
    hex_pattern = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
    for match in hex_pattern.finditer(html):
        color = f"#{match.group(1).lower()}"
        # Skip near-black and near-white (not useful for branding)
        if color not in ("#000", "#000000", "#fff", "#ffffff", "#333", "#333333",
                         "#666", "#666666", "#999", "#999999", "#ccc", "#cccccc",
                         "#eee", "#eeeeee", "#ddd", "#dddddd", "#f5f5f5", "#fafafa"):
            colors.add(color)

    return colors


async def capture_screenshot(url: str, product_id: str) -> str | None:
    """Capture a screenshot of a URL using Playwright.

    Returns the file path or None if Playwright isn't available.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.info("Playwright not installed, skipping screenshot capture")
        return None

    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.png"
    filepath = os.path.join(SCREENSHOT_DIR, filename)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": 1280, "height": 800})
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.screenshot(path=filepath, full_page=False)
            await browser.close()

        return f"/uploads/screenshots/{filename}"
    except Exception as e:
        logger.warning("Screenshot capture failed for %s: %s", url, e)
        return None


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


PRODUCT_TYPE_CONTEXT = {
    "saas": "This is a SaaS/software product. Focus on features, ease of use, time saved, ROI, integrations, and user workflows.",
    "physical": "This is a physical product. Focus on quality, materials, design, shipping, customer reviews, and tactile experience.",
    "service": "This is a service business. Focus on expertise, trust, results, testimonials, process, and the human connection.",
    "other": "Determine the product type from the content and tailor the brief accordingly.",
}


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

    # Product type context
    product_type = getattr(product, "product_type", "other") or "other"
    type_context = PRODUCT_TYPE_CONTEXT.get(product_type, PRODUCT_TYPE_CONTEXT["other"])

    # Brand colors context
    brand_colors_str = ""
    if getattr(product, "brand_colors", None):
        try:
            colors = json.loads(product.brand_colors)
            brand_colors_str = f"\nBrand Colors Detected: {', '.join(colors)}"
        except (json.JSONDecodeError, TypeError):
            pass

    # Screenshots context
    screenshot_context = ""
    if getattr(product, "screenshots", None):
        try:
            screenshots = json.loads(product.screenshots)
            if screenshots:
                screenshot_context = f"\n{len(screenshots)} screenshot(s) of the product/website have been uploaded for visual reference."
        except (json.JSONDecodeError, TypeError):
            pass

    prompt = f"""Analyze the following product information and generate a comprehensive brand brief.

Product Name: {product.name}
Website: {product.website_url or "N/A"}
Description: {product.description}
Product Type: {product_type}
{type_context}
Target Audience: {product.target_audience}
Pain Points: {product.pain_points}
Differentiators: {product.differentiators}
{brand_colors_str}
{screenshot_context}

--- Crawled Website Content ---
{all_content}
---

Generate a JSON brand brief with these fields:
{{
    "product_type_analysis": {{
        "category": "saas|physical|service|other",
        "business_model": "description of how the business makes money",
        "key_features_or_offerings": ["feature/offering 1", "feature/offering 2"]
    }},
    "brand_voice": {{
        "tone": "description of the brand's tone",
        "vocabulary": ["key words and phrases the brand uses"],
        "personality": "brand personality traits",
        "do": ["things the brand should do in content"],
        "dont": ["things the brand should avoid"]
    }},
    "visual_identity": {{
        "primary_colors": ["#hex1", "#hex2"],
        "style": "description of visual style (modern, rustic, clinical, playful, etc.)",
        "imagery_recommendations": ["type of imagery to use in ads"]
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
    "value_proposition": "the core value proposition in one sentence",
    "ad_recommendations": {{
        "best_formats": ["which ad formats would work best for this product type"],
        "key_angles": ["specific ad angles to test"],
        "cta_suggestions": ["CTA text suggestions specific to this product"]
    }}
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
