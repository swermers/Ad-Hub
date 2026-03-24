import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CrawledPage, Product, UploadedDocument

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory task tracking (simple for Phase 1)
_task_status: dict[str, dict] = {}


class CrawlRequest(BaseModel):
    max_pages: int = 20


class CrawlStatusResponse(BaseModel):
    task_id: str
    status: str
    pages_crawled: int
    error: str | None = None


class BriefResponse(BaseModel):
    product_id: str
    brand_brief: str | None


class CrawledPageResponse(BaseModel):
    id: str
    url: str
    title: str | None
    content: str | None
    page_type: str
    crawled_at: datetime

    model_config = {"from_attributes": True}


def _run_crawl(task_id: str, product_id: str, url: str, max_pages: int):
    """Run website crawl in background thread."""
    from app.database import SessionLocal
    from app.engines.ingestion import crawl_website
    from app.engines.vectorstore import get_vectorstore

    _task_status[task_id] = {"status": "running", "pages_crawled": 0, "error": None}

    try:
        pages = asyncio.run(crawl_website(url, max_pages=max_pages))

        db = SessionLocal()
        try:
            for page_data in pages:
                existing = (
                    db.query(CrawledPage)
                    .filter(
                        CrawledPage.product_id == product_id,
                        CrawledPage.url == page_data["url"],
                    )
                    .first()
                )
                if existing:
                    existing.title = page_data["title"]
                    existing.content = page_data["content"]
                    existing.page_type = page_data.get("page_type", "unknown")
                    existing.crawled_at = datetime.now(timezone.utc)
                else:
                    crawled = CrawledPage(
                        product_id=product_id,
                        url=page_data["url"],
                        title=page_data["title"],
                        content=page_data["content"],
                        page_type=page_data.get("page_type", "unknown"),
                    )
                    db.add(crawled)

            db.commit()

            # Add to vector store
            vs = get_vectorstore()
            texts = [p["content"] for p in pages if p.get("content")]
            metadatas = [
                {"url": p["url"], "title": p.get("title", ""), "product_id": product_id}
                for p in pages
                if p.get("content")
            ]
            if texts:
                vs.add_documents(product_id, texts, metadatas)

            # Save extracted brand colors to the product
            # Only set crawl colors if no brief-generated colors exist yet
            if pages and "_extracted_colors" in pages[0]:
                crawl_colors = pages[0]["_extracted_colors"]
                if crawl_colors:
                    product_obj = db.query(Product).filter(Product.id == product_id).first()
                    if product_obj:
                        existing_colors = []
                        if product_obj.brand_colors:
                            try:
                                existing_colors = json.loads(product_obj.brand_colors)
                            except (json.JSONDecodeError, TypeError):
                                pass
                        if not existing_colors:
                            # No colors yet — use crawl colors as initial set
                            product_obj.brand_colors = json.dumps(crawl_colors)
                        else:
                            # Merge new crawl colors with existing (brief colors take priority)
                            merged = list(dict.fromkeys(existing_colors + crawl_colors))
                            product_obj.brand_colors = json.dumps(merged[:10])
                        db.commit()

            # Save extracted fonts to the product
            if pages and "_extracted_fonts" in pages[0]:
                crawl_fonts = pages[0]["_extracted_fonts"]
                if crawl_fonts:
                    product_obj = db.query(Product).filter(Product.id == product_id).first()
                    if product_obj:
                        existing_fonts = []
                        if product_obj.brand_fonts:
                            try:
                                existing_fonts = json.loads(product_obj.brand_fonts)
                            except (json.JSONDecodeError, TypeError):
                                pass
                        merged_fonts = list(dict.fromkeys(existing_fonts + crawl_fonts))
                        product_obj.brand_fonts = json.dumps(merged_fonts[:10])
                        db.commit()

            # Try to capture a screenshot of the homepage
            try:
                from app.engines.ingestion import capture_screenshot

                screenshot_path = asyncio.run(capture_screenshot(url, product_id))
                if screenshot_path:
                    product_obj = db.query(Product).filter(Product.id == product_id).first()
                    if product_obj:
                        existing = json.loads(product_obj.screenshots) if product_obj.screenshots else []
                        existing.append(screenshot_path)
                        product_obj.screenshots = json.dumps(existing)
                        db.commit()
            except Exception as e:
                logger.info("Screenshot capture skipped: %s", e)

            # Extract colors from screenshots using vision (most accurate method)
            _extract_colors_from_screenshots_vision(product_id, db)

            _task_status[task_id] = {
                "status": "completed",
                "pages_crawled": len(pages),
                "error": None,
            }
        finally:
            db.close()

    except Exception as e:
        _task_status[task_id] = {
            "status": "failed",
            "pages_crawled": 0,
            "error": str(e),
        }


def _extract_colors_from_screenshots_vision(product_id: str, db: Session):
    """Use Claude vision to extract accurate brand colors from screenshots.

    This is far more reliable than HTML parsing because it analyzes the actual
    rendered visual appearance of the site.
    """
    import base64
    import os

    from app.services.claude_client import call_claude_sync

    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product or not product.screenshots:
            return

        screenshots = json.loads(product.screenshots)
        if not screenshots:
            return

        uploads_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "uploads",
        )

        images: list[dict] = []
        for spath in screenshots[:3]:  # Use up to 3 screenshots
            file_path = os.path.join(uploads_dir, spath.replace("/uploads/", "", 1))
            if not os.path.exists(file_path):
                continue
            with open(file_path, "rb") as f:
                img_data = base64.standard_b64encode(f.read()).decode("utf-8")
            ext = file_path.rsplit(".", 1)[-1].lower()
            media_type = {
                "png": "image/png", "jpg": "image/jpeg",
                "jpeg": "image/jpeg", "webp": "image/webp",
            }.get(ext, "image/png")
            images.append({"media_type": media_type, "data": img_data})

        if not images:
            return

        result = call_claude_sync(
            prompt=(
                "Look at these website screenshots and extract the exact brand color palette. "
                "Use an eyedropper approach — identify the precise hex colors you see for:\n"
                "1. The dominant background color (even if very dark or nearly black)\n"
                "2. The primary accent/highlight color (buttons, links, emphasized text)\n"
                "3. Any secondary accent colors\n"
                "4. The main text color\n\n"
                "Return ONLY a JSON array of 3-5 hex color strings, ordered from most dominant to least. "
                "Be precise — match what you actually see, not generic approximations. "
                "Example: [\"#1a2420\", \"#8ba89a\", \"#e8e4e0\"]\n"
                "Return ONLY the JSON array, nothing else."
            ),
            images=images,
            max_tokens=256,
        )

        text = result["content"].strip()
        # Parse the JSON array
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        colors = json.loads(text)

        if isinstance(colors, list) and len(colors) >= 2:
            # Validate each is a proper hex color
            valid = []
            for c in colors:
                if isinstance(c, str) and c.startswith("#") and len(c) in (4, 7):
                    try:
                        int(c[1:], 16)
                        valid.append(c.lower())
                    except ValueError:
                        continue
            if valid:
                product.brand_colors = json.dumps(valid)
                db.commit()
                logger.info(
                    "Vision-extracted brand colors for %s: %s", product_id, valid
                )
    except Exception as e:
        logger.warning("Vision color extraction failed for %s: %s", product_id, e)


def _run_brief_generation(product_id: str):
    """Run brand brief generation in background thread (fully sync)."""
    from app.database import SessionLocal
    from app.engines.ingestion import PRODUCT_TYPE_CONTEXT
    from app.services.claude_client import call_claude_sync

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return

        pages = db.query(CrawledPage).filter(CrawledPage.product_id == product_id).all()
        documents = (
            db.query(UploadedDocument).filter(UploadedDocument.product_id == product_id).all()
        )

        # Build prompt (same as generate_brand_brief but sync)
        page_summaries = []
        for page in pages[:10]:
            text = (page.content or "")[:2000]
            page_summaries.append(f"[{page.page_type}: {page.url}]\n{text}")

        doc_summaries = []
        for doc in documents[:5]:
            text = (doc.content or "")[:2000]
            doc_summaries.append(f"[{doc.doc_type}: {doc.filename}]\n{text}")

        all_content = "\n\n---\n\n".join(page_summaries + doc_summaries)

        product_type = getattr(product, "product_type", "other") or "other"
        type_context = PRODUCT_TYPE_CONTEXT.get(product_type, PRODUCT_TYPE_CONTEXT["other"])

        brand_colors_str = ""
        if getattr(product, "brand_colors", None):
            try:
                colors = json.loads(product.brand_colors)
                brand_colors_str = f"\nBrand Colors Detected: {', '.join(colors)}"
            except (json.JSONDecodeError, TypeError):
                pass

        brand_fonts_str = ""
        if getattr(product, "brand_fonts", None):
            try:
                fonts = json.loads(product.brand_fonts)
                brand_fonts_str = f"\nBrand Fonts Detected: {', '.join(fonts)}"
            except (json.JSONDecodeError, TypeError):
                pass

        # Load screenshots as base64 images for vision-based analysis
        screenshot_images: list[dict] = []
        screenshot_context = ""
        if getattr(product, "screenshots", None):
            try:
                screenshots = json.loads(product.screenshots)
                if screenshots:
                    import base64
                    import os
                    uploads_dir = os.path.join(
                        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "uploads",
                    )
                    for spath in screenshots[:5]:  # Limit to 5 screenshots
                        # spath is like "/uploads/screenshots/uuid.png"
                        file_path = os.path.join(uploads_dir, spath.lstrip("/uploads/").lstrip("/"))
                        if not os.path.exists(file_path):
                            # Try direct path under uploads dir
                            file_path = os.path.join(
                                uploads_dir,
                                spath.replace("/uploads/", "", 1),
                            )
                        if os.path.exists(file_path):
                            with open(file_path, "rb") as f:
                                img_data = base64.standard_b64encode(f.read()).decode("utf-8")
                            ext = file_path.rsplit(".", 1)[-1].lower()
                            media_type = {
                                "png": "image/png",
                                "jpg": "image/jpeg",
                                "jpeg": "image/jpeg",
                                "gif": "image/gif",
                                "webp": "image/webp",
                            }.get(ext, "image/png")
                            screenshot_images.append({
                                "media_type": media_type,
                                "data": img_data,
                            })
                    if screenshot_images:
                        screenshot_context = (
                            f"\n{len(screenshot_images)} website screenshot(s) are attached as images. "
                            "LOOK at them carefully to extract the EXACT brand colors, fonts, and visual style. "
                            "The screenshots show the real rendered site — trust what you see over any text descriptions."
                        )
                    else:
                        screenshot_context = f"\n{len(screenshots)} screenshot(s) referenced but files not loaded."
            except (json.JSONDecodeError, TypeError):
                pass

        # Also check for user-uploaded screenshots in the screenshots field
        # that may have been uploaded via the product page UI
        if not screenshot_images and getattr(product, "screenshots", None):
            screenshot_context = ""

        # Build color instruction for the prompt
        color_ref = ""
        if brand_colors_str:
            color_ref = f" Reference colors detected from site CSS: {brand_colors_str}. These may be inaccurate — trust the screenshots if available."

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
        "primary_colors": ["#hex1", "#hex2", "#hex3 — {'LOOK at the attached screenshots and use an eyedropper approach to extract the EXACT hex colors you see. ' if screenshot_images else ''}Extract the ACTUAL brand colors from the website. Include the dominant background color (even if dark/nearly black), accent/highlight colors (even if muted/desaturated), and button/CTA colors. Match the real visual identity precisely — do NOT substitute generic bright colors or Tailwind defaults. Return 3-5 colors that accurately represent what a user SEES on the site.{color_ref}"],
        "fonts": ["Primary Font Name", "Secondary Font Name — extract the actual font families used on the website headings and body text.{' Detected fonts: ' + brand_fonts_str if brand_fonts_str else ''}"],
        "style": "description of visual style",
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
        "best_formats": ["which ad formats would work best"],
        "key_angles": ["specific ad angles to test"],
        "cta_suggestions": ["CTA text suggestions"]
    }}
}}

Return ONLY the JSON object, no markdown formatting."""

        result = call_claude_sync(
            prompt,
            images=screenshot_images if screenshot_images else None,
        )

        try:
            text = result["content"].strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            brief = json.loads(text)
        except (json.JSONDecodeError, IndexError):
            brief = {"raw_brief": result["content"]}

        product.brand_brief = json.dumps(brief)

        # Update brand_colors from the brief's visual_identity if Claude found better ones
        vi_colors = brief.get("visual_identity", {}).get("primary_colors", [])
        # Filter to valid hex colors — trust Claude's judgment on actual brand colors
        # since it has full website context. Only reject malformed values.
        valid_colors = []
        for c in vi_colors:
            if not isinstance(c, str) or not c.startswith("#"):
                continue
            # Strip any trailing instruction text Claude may have left
            c = c.split(" ")[0].split("—")[0].strip()
            if len(c) not in (4, 7):
                continue
            # Validate it's a parseable hex color
            try:
                from app.engines.ingestion import _hex_to_rgb
                _hex_to_rgb(c)
                valid_colors.append(c.lower())
            except (ValueError, IndexError):
                continue
        if valid_colors:
            product.brand_colors = json.dumps(valid_colors)

        product.status = "active"
        product.updated_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        logger.error("Brief generation failed for %s: %s", product_id, e, exc_info=True)
    finally:
        db.close()


@router.post("/{product_id}/crawl", response_model=CrawlStatusResponse)
def start_crawl(
    product_id: str,
    data: CrawlRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.website_url:
        raise HTTPException(status_code=400, detail="Product has no website URL")

    # Auto-normalize URL if missing scheme
    crawl_url = product.website_url.strip()
    if not crawl_url.startswith(("http://", "https://")):
        crawl_url = "https://" + crawl_url
        # Also fix the stored URL so it doesn't happen again
        product.website_url = crawl_url
        db.commit()

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "pages_crawled": 0, "error": None}
    background_tasks.add_task(_run_crawl, task_id, product_id, crawl_url, data.max_pages)
    return CrawlStatusResponse(task_id=task_id, status="pending", pages_crawled=0)


@router.get("/{product_id}/crawl-status/{task_id}", response_model=CrawlStatusResponse)
def get_crawl_status(product_id: str, task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return CrawlStatusResponse(task_id=task_id, **status)


@router.get("/{product_id}/pages", response_model=list[CrawledPageResponse])
def list_crawled_pages(product_id: str, db: Session = Depends(get_db)):
    return (
        db.query(CrawledPage)
        .filter(CrawledPage.product_id == product_id)
        .order_by(CrawledPage.crawled_at.desc())
        .all()
    )


@router.post("/{product_id}/documents")
async def upload_document(
    product_id: str,
    file: UploadFile,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    content_bytes = await file.read()
    text_content = content_bytes.decode("utf-8", errors="replace")

    doc = UploadedDocument(
        product_id=product_id,
        filename=file.filename or "unnamed",
        content=text_content,
        doc_type="other",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "filename": doc.filename}


@router.post("/{product_id}/generate-brief", response_model=BriefResponse)
def generate_brief(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    background_tasks.add_task(_run_brief_generation, product_id)
    return BriefResponse(product_id=product_id, brand_brief=product.brand_brief)
