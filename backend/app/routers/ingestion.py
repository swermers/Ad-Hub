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
            if pages and "_extracted_colors" in pages[0]:
                colors = pages[0]["_extracted_colors"]
                if colors:
                    product_obj = db.query(Product).filter(Product.id == product_id).first()
                    if product_obj:
                        product_obj.brand_colors = json.dumps(colors)
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

        screenshot_context = ""
        if getattr(product, "screenshots", None):
            try:
                screenshots = json.loads(product.screenshots)
                if screenshots:
                    screenshot_context = f"\n{len(screenshots)} screenshot(s) uploaded."
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

        result = call_claude_sync(prompt)

        try:
            text = result["content"].strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            brief = json.loads(text)
        except (json.JSONDecodeError, IndexError):
            brief = {"raw_brief": result["content"]}

        product.brand_brief = json.dumps(brief)
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

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "pages_crawled": 0, "error": None}
    background_tasks.add_task(_run_crawl, task_id, product_id, product.website_url, data.max_pages)
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
