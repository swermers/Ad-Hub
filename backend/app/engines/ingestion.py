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
    all_fonts: set[str] = set()

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

                # Extract colors and fonts from the raw HTML before stripping styles
                page_colors = _extract_colors_from_html(html)
                all_colors.update(page_colors)
                page_fonts = _extract_fonts_from_html(html)
                all_fonts.update(page_fonts)

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

    # Attach extracted colors and fonts to the results metadata
    if results:
        results[0]["_extracted_colors"] = list(all_colors)[:20]
        results[0]["_extracted_fonts"] = list(all_fonts)[:10]

    return results


def _color_distance(c1: str, c2: str) -> float:
    """Approximate perceptual distance between two hex colors (0-1 scale)."""
    r1, g1, b1 = _hex_to_rgb(c1)
    r2, g2, b2 = _hex_to_rgb(c2)
    # Weighted Euclidean distance — human eyes are more sensitive to green
    dr, dg, db = (r1 - r2) / 255.0, (g1 - g2) / 255.0, (b1 - b2) / 255.0
    return (0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db) ** 0.5


def _dedup_similar_colors(colors: list[tuple[str, float]], threshold: float = 0.08) -> list[str]:
    """Remove near-duplicate colors, keeping the one with higher priority score."""
    # Sort by priority descending so the best-scored color survives
    sorted_colors = sorted(colors, key=lambda x: x[1], reverse=True)
    kept: list[str] = []
    for color, _score in sorted_colors:
        if all(_color_distance(color, k) > threshold for k in kept):
            kept.append(color)
    return kept


def _is_framework_utility_block(css_text: str) -> bool:
    """Detect Tailwind/Bootstrap utility class patterns in a CSS block.

    These frameworks generate thousands of utility classes like:
      .bg-blue-500{background-color:rgb(59 130 246)}
      .text-emerald-600{color:#059669}
    The colors in these blocks are framework defaults, NOT the brand's colors.
    """
    # Tailwind patterns: .bg-COLOR-N, .text-COLOR-N, .border-COLOR-N, etc.
    tw_pattern = re.compile(
        r'\.\!?(?:bg|text|border|ring|shadow|accent|outline|decoration|fill|stroke)'
        r'-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|'
        r'emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'
        r'-\d{2,3}\b',
        re.IGNORECASE,
    )
    # Bootstrap patterns: .btn-primary, .bg-success, .text-danger etc.
    bs_pattern = re.compile(
        r'\.(?:btn|bg|text|border|alert|badge)-(?:primary|secondary|success|danger|warning|info|light|dark)\b',
        re.IGNORECASE,
    )
    tw_hits = len(tw_pattern.findall(css_text[:50000]))
    bs_hits = len(bs_pattern.findall(css_text[:50000]))
    return tw_hits > 10 or bs_hits > 10


def _extract_colors_from_html(html: str) -> set[str]:
    """Extract brand-relevant hex color values from HTML/CSS.

    Uses a priority-scoring system to surface true brand colors:
    - CSS custom properties with brand-related names get highest priority
    - Meta theme-color is a strong signal
    - Button/link/accent colors are prioritized over generic CSS
    - Detects and deprioritizes CSS framework (Tailwind/Bootstrap) utility colors
    - Deduplicates visually similar colors

    Filters out pure neutrals (blacks, whites, grays) using luminance + saturation.
    """
    # Detect if the page uses a CSS utility framework
    has_framework = _is_framework_utility_block(html)

    # If framework detected, extract only inline styles and CSS custom properties
    # to avoid picking up the framework's palette instead of the brand's
    if has_framework:
        return _extract_colors_framework_aware(html)

    # Collect colors with priority scores: (hex, score)
    scored: list[tuple[str, float]] = []

    def _add(color: str, score: float):
        normalized = _normalize_hex(color)
        if _is_brand_color(normalized):
            scored.append((normalized, score))

    # 1. Meta theme-color — strongest signal (score: 10)
    theme_match = re.search(r'<meta[^>]*name=["\']theme-color["\'][^>]*content=["\'](#[0-9a-fA-F]{3,6})["\']', html, re.IGNORECASE)
    if not theme_match:
        theme_match = re.search(r'<meta[^>]*content=["\'](#[0-9a-fA-F]{3,6})["\'][^>]*name=["\']theme-color["\']', html, re.IGNORECASE)
    if theme_match:
        _add(theme_match.group(1), 10.0)

    # 2. CSS custom properties with brand-related names (score: 8)
    brand_var_pattern = re.compile(
        r'--(?:brand|primary|accent|main|theme|highlight|cta|action|link)[\w-]*\s*:\s*([^;}{]+)',
        re.IGNORECASE,
    )
    for m in brand_var_pattern.finditer(html):
        value = m.group(1).strip()
        for hex_m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', value):
            _add(f"#{hex_m.group(1)}", 8.0)
        for rgb_m in re.finditer(r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})', value):
            r, g, b = int(rgb_m.group(1)), int(rgb_m.group(2)), int(rgb_m.group(3))
            _add(f"#{r:02x}{g:02x}{b:02x}", 8.0)

    # 3. Button / link / CTA styles — very likely brand colors (score: 7)
    cta_pattern = re.compile(
        r'(?:\.btn|\.button|\.cta|a\s*\{|\.link|button\s*\{|\.hero)[^}{]*\{([^}]+)\}',
        re.IGNORECASE,
    )
    for m in cta_pattern.finditer(html):
        block = m.group(1)
        for hex_m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', block):
            _add(f"#{hex_m.group(1)}", 7.0)

    # 4. CSS color/background properties in style blocks and attributes (score: 4)
    css_prop_pattern = re.compile(
        r'(?:(?:background|accent|border)-color|(?<!-)color)\s*:\s*([^;}{]+?)(?:;|"|\'|})',
        re.IGNORECASE,
    )
    for m in css_prop_pattern.finditer(html):
        value = m.group(1).strip()
        for hex_m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', value):
            _add(f"#{hex_m.group(1)}", 4.0)
        for rgb_m in re.finditer(r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})', value):
            r, g, b = int(rgb_m.group(1)), int(rgb_m.group(2)), int(rgb_m.group(3))
            _add(f"#{r:02x}{g:02x}{b:02x}", 4.0)

    # 5. Gradient colors — often contain brand palette (score: 5)
    gradient_pattern = re.compile(r'(?:linear|radial)-gradient\(([^)]+)\)', re.IGNORECASE)
    for m in gradient_pattern.finditer(html):
        value = m.group(1)
        for hex_m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', value):
            _add(f"#{hex_m.group(1)}", 5.0)

    # 6. General CSS custom properties (score: 3)
    general_var_pattern = re.compile(r'--[\w-]+\s*:\s*([^;}{]+)', re.IGNORECASE)
    for m in general_var_pattern.finditer(html):
        value = m.group(1).strip()
        for hex_m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', value):
            _add(f"#{hex_m.group(1)}", 3.0)

    # 7. fill/stroke in SVGs (often logo colors) (score: 6)
    svg_color_pattern = re.compile(r'(?:fill|stroke)\s*[=:]\s*["\']?\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
    for m in svg_color_pattern.finditer(html):
        _add(f"#{m.group(1)}", 6.0)

    # 8. Background shorthand and other generic color declarations (score: 2)
    bg_shorthand = re.compile(r'background\s*:\s*([^;}{]+?)(?:;|"|\'|})', re.IGNORECASE)
    for m in bg_shorthand.finditer(html):
        value = m.group(1)
        for hex_m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', value):
            _add(f"#{hex_m.group(1)}", 2.0)

    # Deduplicate similar colors, keeping highest-priority ones
    deduped = _dedup_similar_colors(scored, threshold=0.08)

    return set(deduped)


def _extract_colors_framework_aware(html: str) -> set[str]:
    """Extract colors from a page that uses a CSS utility framework.

    When Tailwind/Bootstrap is detected, we ignore <style> blocks entirely
    (they're full of framework utility definitions) and focus only on:
    1. Meta theme-color (strongest signal)
    2. CSS custom properties (--brand-*, --primary-*, etc.) — intentionally set by devs
    3. Inline style="" attributes — actually applied to elements
    4. SVG fill/stroke — often logo colors
    """
    scored: list[tuple[str, float]] = []

    def _add(color: str, score: float):
        normalized = _normalize_hex(color)
        if _is_brand_color(normalized):
            scored.append((normalized, score))

    # 1. Meta theme-color (score: 10)
    theme_match = re.search(
        r'<meta[^>]*name=["\']theme-color["\'][^>]*content=["\'](#[0-9a-fA-F]{3,6})["\']',
        html, re.IGNORECASE,
    )
    if not theme_match:
        theme_match = re.search(
            r'<meta[^>]*content=["\'](#[0-9a-fA-F]{3,6})["\'][^>]*name=["\']theme-color["\']',
            html, re.IGNORECASE,
        )
    if theme_match:
        _add(theme_match.group(1), 10.0)

    # 2. CSS custom properties — these are explicitly defined by the developer (score: 8)
    # Look in :root, html, body blocks and data-theme attributes
    root_block_pattern = re.compile(
        r'(?::root|html|body|\[data-theme[^\]]*\])\s*\{([^}]+)\}',
        re.IGNORECASE,
    )
    for m in root_block_pattern.finditer(html):
        block = m.group(1)
        for var_m in re.finditer(r'--[\w-]+\s*:\s*([^;]+)', block):
            value = var_m.group(1).strip()
            for hex_m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', value):
                _add(f"#{hex_m.group(1)}", 8.0)
            for rgb_m in re.finditer(r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})', value):
                r, g, b = int(rgb_m.group(1)), int(rgb_m.group(2)), int(rgb_m.group(3))
                _add(f"#{r:02x}{g:02x}{b:02x}", 8.0)
            # Handle Tailwind's space-separated RGB format: --color-primary: 34 197 94;
            rgb_space_m = re.match(r'(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$', value)
            if rgb_space_m:
                r, g, b = int(rgb_space_m.group(1)), int(rgb_space_m.group(2)), int(rgb_space_m.group(3))
                _add(f"#{r:02x}{g:02x}{b:02x}", 8.0)

    # 3. Inline style="" attributes — these are actually applied to elements (score: 7)
    inline_style_pattern = re.compile(r'style\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
    for m in inline_style_pattern.finditer(html):
        style = m.group(1)
        for hex_m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', style):
            _add(f"#{hex_m.group(1)}", 7.0)
        for rgb_m in re.finditer(r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})', style):
            r, g, b = int(rgb_m.group(1)), int(rgb_m.group(2)), int(rgb_m.group(3))
            _add(f"#{r:02x}{g:02x}{b:02x}", 7.0)

    # 4. SVG fill/stroke attributes — often logo/icon colors (score: 6)
    svg_color_pattern = re.compile(
        r'(?:fill|stroke)\s*[=:]\s*["\']?\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b'
    )
    for m in svg_color_pattern.finditer(html):
        _add(f"#{m.group(1)}", 6.0)

    # 5. Gradient colors in inline styles or CSS vars (score: 5)
    gradient_pattern = re.compile(r'(?:linear|radial)-gradient\(([^)]+)\)', re.IGNORECASE)
    for m in gradient_pattern.finditer(html):
        value = m.group(1)
        for hex_m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', value):
            _add(f"#{hex_m.group(1)}", 5.0)

    deduped = _dedup_similar_colors(scored, threshold=0.08)
    return set(deduped)


# Generic font names to exclude — we only want real brand fonts
_GENERIC_FONTS = {
    "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
    "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded",
    "inherit", "initial", "unset", "revert", "none",
    "arial", "helvetica", "times", "times new roman", "courier",
    "courier new", "verdana", "georgia", "tahoma", "trebuchet ms",
    "impact", "comic sans ms",
}


def _extract_fonts_from_html(html: str) -> set[str]:
    """Extract brand font families from HTML/CSS.

    Extracts from:
    - Google Fonts <link> tags (fonts.googleapis.com)
    - CSS font-family declarations in <style> blocks and inline styles
    - Adobe Fonts / Typekit references

    Filters out generic/system fonts.
    """
    fonts: set[str] = set()

    # 1. Google Fonts URLs — most reliable signal
    # Matches: fonts.googleapis.com/css?family=Open+Sans:400,700|Roboto
    # And: fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Poppins
    gf_matches = re.findall(
        r'fonts\.googleapis\.com/css2?\?[^"\'>\s]*family=([^"\'>\s&]+)',
        html, re.IGNORECASE,
    )
    for match in gf_matches:
        # Google Fonts uses + for spaces and | to separate families
        families = match.split("|")
        for fam in families:
            # Remove weight/style suffixes like :wght@400;700
            name = fam.split(":")[0].replace("+", " ").strip()
            if name and name.lower() not in _GENERIC_FONTS:
                fonts.add(name)

    # 2. CSS font-family declarations
    ff_matches = re.findall(
        r'font-family\s*:\s*([^;}{]+)',
        html, re.IGNORECASE,
    )
    for match in ff_matches:
        # Parse comma-separated font list, take first non-generic font
        families = [f.strip().strip("'\"") for f in match.split(",")]
        for fam in families:
            fam_lower = fam.lower().strip()
            if fam_lower and fam_lower not in _GENERIC_FONTS and len(fam) < 60:
                fonts.add(fam)
                break  # Only take the primary font from each declaration

    # 3. Adobe Fonts / Typekit
    typekit_matches = re.findall(
        r'use\.typekit\.net/([a-z0-9]+)\.(?:css|js)',
        html, re.IGNORECASE,
    )
    if typekit_matches:
        # We can't resolve the kit ID to font names without an API call,
        # but we can flag that Adobe Fonts are in use
        pass

    return fonts


def _normalize_hex(color: str) -> str:
    """Normalize #rgb to #rrggbb lowercase."""
    color = color.lower()
    if len(color) == 4:  # #rgb
        return f"#{color[1]*2}{color[2]*2}{color[3]*2}"
    return color


def _hex_to_rgb(color: str) -> tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    color = color.lstrip("#")
    if len(color) == 3:
        color = color[0]*2 + color[1]*2 + color[2]*2
    return int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)


def _rgb_to_hsl(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert RGB to HSL (h: 0-360, s: 0-1, l: 0-1)."""
    r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(r_n, g_n, b_n), min(r_n, g_n, b_n)
    l = (mx + mn) / 2

    if mx == mn:
        h = s = 0.0
    else:
        d = mx - mn
        s = d / (2.0 - mx - mn) if l > 0.5 else d / (mx + mn)
        if mx == r_n:
            h = (g_n - b_n) / d + (6 if g_n < b_n else 0)
        elif mx == g_n:
            h = (b_n - r_n) / d + 2
        else:
            h = (r_n - g_n) / d + 4
        h *= 60

    return h, s, l


def _is_brand_color(hex_color: str) -> bool:
    """Return True if the color is likely a brand color (not a pure neutral).

    Allows dark and muted brand colors (common in modern design) while
    rejecting true neutrals (pure black/white/gray with zero saturation).
    """
    try:
        r, g, b = _hex_to_rgb(hex_color)
    except (ValueError, IndexError):
        return False

    _, s, l = _rgb_to_hsl(r, g, b)

    # Skip pure black (#000000 and very close)
    if l < 0.02:
        return False
    # Skip pure white (#ffffff and very close)
    if l > 0.97:
        return False
    # Skip true grays — zero or near-zero saturation with no chromatic value
    if s < 0.05:
        return False

    return True


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

    # Brand fonts context
    brand_fonts_str = ""
    if getattr(product, "brand_fonts", None):
        try:
            fonts = json.loads(product.brand_fonts)
            brand_fonts_str = f"\nBrand Fonts Detected: {', '.join(fonts)}"
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

    # Build color instruction for the prompt
    color_ref = ""
    if brand_colors_str:
        color_ref = f" Reference colors detected from site: {brand_colors_str}."

    prompt = f"""Analyze the following product information and generate a comprehensive brand brief.

Product Name: {product.name}
Website: {product.website_url or "N/A"}
Description: {product.description}
Product Type: {product_type}
{type_context}
Target Audience: {product.target_audience}
Pain Points: {product.pain_points}
Differentiators: {product.differentiators}
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
        "primary_colors": ["#hex1", "#hex2", "#hex3 — IMPORTANT: these MUST be vibrant, chromatic colors (NOT black, white, or gray). Extract the real brand colors from buttons, links, accents, logos, or gradients on the website. If the site is dark-themed, pick the accent/highlight colors. Every color must have visible hue and saturation.{color_ref}"],
        "fonts": ["Primary Font Name", "Secondary Font Name — extract the actual font families used on the website headings and body text.{' Detected fonts: ' + brand_fonts_str if brand_fonts_str else ''}"],
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
