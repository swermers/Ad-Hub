"""
Image generation engine.

Uses Claude to analyze brand context + reference images → builds a detailed
image prompt → calls an image generation API (OpenAI DALL-E 3) → saves result.

Flow:
1. Gather brand context: brief, colors, fonts, reference images
2. Send to Claude with vision to analyze visual style from references
3. Build a detailed image generation prompt
4. Call image gen API
5. Save to disk and return path
"""

import base64
import json
import logging
import os
import uuid

import httpx

from app.config import settings
from app.services.claude_client import call_claude_sync

logger = logging.getLogger(__name__)

GENERATED_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads",
    "generated",
)

# Aspect ratio → DALL-E size mapping
ASPECT_TO_SIZE = {
    "1:1": "1024x1024",
    "4:5": "1024x1024",  # DALL-E 3 doesn't have 4:5, use square
    "9:16": "1024x1792",
    "16:9": "1792x1024",
}


def _load_image_as_base64(path: str) -> str | None:
    """Load a local image file and return base64-encoded data."""
    # Resolve relative upload paths
    if path.startswith("/uploads/"):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        full_path = os.path.join(base_dir, path.lstrip("/"))
    else:
        full_path = path

    if not os.path.exists(full_path):
        return None

    with open(full_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


def _get_media_type(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }.get(ext, "image/png")


def build_image_prompt_with_claude(
    product,
    headline: str,
    body: str,
    cta: str,
    reference_image_paths: list[str] | None = None,
    style_notes: str = "",
) -> str:
    """Use Claude (with vision if references provided) to build a detailed
    image generation prompt based on brand context and reference images."""

    # Build brand context
    brand_context = f"Product: {product.name}\nDescription: {product.description}"

    if product.brand_brief:
        try:
            brief = json.loads(product.brand_brief)
            brand_context += f"\nBrand Voice: {json.dumps(brief.get('brand_voice', {}))}"
            vi = brief.get("visual_identity", {})
            if vi:
                brand_context += f"\nVisual Identity: {json.dumps(vi)}"
        except (json.JSONDecodeError, TypeError):
            pass

    brand_colors = []
    if product.brand_colors:
        try:
            brand_colors = json.loads(product.brand_colors)
        except (json.JSONDecodeError, TypeError):
            pass
    if brand_colors:
        brand_context += f"\nBrand Colors: {', '.join(brand_colors[:5])}"

    brand_fonts = []
    if product.brand_fonts:
        try:
            brand_fonts = json.loads(product.brand_fonts)
        except (json.JSONDecodeError, TypeError):
            pass
    if brand_fonts:
        brand_context += f"\nBrand Fonts: {', '.join(brand_fonts[:3])}"

    # Build the prompt for Claude
    # If we have reference images, use vision to analyze them
    has_references = reference_image_paths and len(reference_image_paths) > 0

    system = """You are an expert art director who creates detailed image generation prompts.
Given brand context and ad copy, you produce a single detailed prompt for an AI image generator
(like DALL-E 3) that will create a compelling ad visual.

Your prompts should describe:
- Overall composition and layout
- Color palette (using brand colors when provided)
- Typography style and placement
- Visual elements, textures, and effects
- Mood and atmosphere
- Specific design details that make the ad look premium and scroll-stopping

IMPORTANT: Output ONLY the image generation prompt text. No explanations, no JSON, no formatting."""

    if has_references:
        # Build multipart message with images for Claude vision
        user_content = []

        for ref_path in reference_image_paths[:3]:  # Max 3 references
            img_data = _load_image_as_base64(ref_path)
            if img_data:
                user_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": _get_media_type(ref_path),
                        "data": img_data,
                    },
                })

        user_content.append({
            "type": "text",
            "text": f"""Analyze the reference images above for visual style, then create an image generation prompt.

{brand_context}

Ad Copy:
- Headline: {headline}
- Body: {body}
- CTA: {cta}

{f"Style Notes: {style_notes}" if style_notes else ""}

Create a detailed image generation prompt that:
1. Captures the visual style and energy of the reference images
2. Incorporates the brand's colors and identity
3. Works as a compelling ad visual for the headline above
4. Is designed for social media (bold, eye-catching, scroll-stopping)

Output ONLY the prompt text.""",
        })

        # Call Claude with vision using the raw API
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": user_content}],
        )
        return message.content[0].text.strip()

    else:
        # No reference images — text-only prompt
        user_prompt = f"""{brand_context}

Ad Copy:
- Headline: {headline}
- Body: {body}
- CTA: {cta}

{f"Style Notes: {style_notes}" if style_notes else ""}

Create a detailed image generation prompt for a compelling ad visual that:
1. Uses the brand's colors and identity
2. Works as a social media ad visual
3. Is bold, eye-catching, and scroll-stopping
4. Uses modern design principles (clean typography, geometric shapes, strong color blocks)

Output ONLY the prompt text."""

        result = call_claude_sync(user_prompt, system=system, max_tokens=1024)
        return result["content"].strip()


def generate_image_openai(
    prompt: str,
    size: str = "1024x1024",
    quality: str = "standard",
) -> bytes:
    """Call OpenAI DALL-E 3 API to generate an image. Returns image bytes."""
    if not settings.openai_api_key:
        raise ValueError("OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.")

    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            "https://api.openai.com/v1/images/generations",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.image_gen_model,
                "prompt": prompt,
                "n": 1,
                "size": size,
                "quality": quality,
                "response_format": "b64_json",
            },
        )

    if response.status_code != 200:
        error_detail = response.json().get("error", {}).get("message", response.text)
        raise ValueError(f"Image generation failed: {error_detail}")

    data = response.json()
    image_b64 = data["data"][0]["b64_json"]
    return base64.b64decode(image_b64)


def generate_ad_image(
    product,
    headline: str,
    body: str,
    cta: str,
    aspect_ratio: str = "1:1",
    style_notes: str = "",
    quality: str = "standard",
) -> str:
    """Full pipeline: analyze brand + references → build prompt → generate image → save.

    Returns the saved image path (relative URL).
    """
    # Gather reference images
    ref_paths = []
    if product.reference_images:
        try:
            ref_paths = json.loads(product.reference_images)
        except (json.JSONDecodeError, TypeError):
            pass

    # Also include screenshots as visual context
    screenshots = []
    if product.screenshots:
        try:
            screenshots = json.loads(product.screenshots)
        except (json.JSONDecodeError, TypeError):
            pass

    all_references = ref_paths + screenshots[:2]  # References first, then some screenshots

    # Step 1: Build image prompt using Claude
    logger.info("Building image prompt for product %s", product.id)
    image_prompt = build_image_prompt_with_claude(
        product,
        headline,
        body,
        cta,
        reference_image_paths=all_references if all_references else None,
        style_notes=style_notes,
    )
    logger.info("Image prompt: %s", image_prompt[:200])

    # Step 2: Generate image
    size = ASPECT_TO_SIZE.get(aspect_ratio, settings.image_gen_size)
    image_bytes = generate_image_openai(image_prompt, size=size, quality=quality)

    # Step 3: Save to disk
    os.makedirs(GENERATED_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.png"
    filepath = os.path.join(GENERATED_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    image_url = f"/uploads/generated/{filename}"
    logger.info("Generated image saved: %s", image_url)

    return image_url
