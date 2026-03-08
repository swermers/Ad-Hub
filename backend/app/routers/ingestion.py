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
    """Run brand brief generation in background thread."""
    from app.database import SessionLocal
    from app.engines.ingestion import generate_brand_brief

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return

        pages = db.query(CrawledPage).filter(CrawledPage.product_id == product_id).all()
        documents = (
            db.query(UploadedDocument).filter(UploadedDocument.product_id == product_id).all()
        )

        brief = asyncio.run(generate_brand_brief(product, pages, documents))
        product.brand_brief = json.dumps(brief)
        product.status = "active"
        product.updated_at = datetime.now(timezone.utc)
        db.commit()
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
