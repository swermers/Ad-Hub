"""
Image generation API routes.

POST /api/products/{id}/generate-image — generate an ad image for a content piece
GET  /api/products/{id}/generate-image-status/{task_id} — check generation status
"""

import json
import logging
import threading
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models import ContentPiece, Product

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory task status tracking
_tasks: dict[str, dict] = {}


class GenerateImageRequest(BaseModel):
    content_id: str | None = None
    headline: str | None = None
    body: str | None = None
    cta: str | None = None
    aspect_ratio: str = "1:1"
    style_notes: str = ""
    quality: str = "standard"  # "standard" or "hd"


class GenerateImageStatus(BaseModel):
    task_id: str
    status: str  # pending, running, completed, failed
    image_url: str | None = None
    image_prompt: str | None = None
    error: str | None = None


@router.post("/{product_id}/generate-image", response_model=GenerateImageStatus)
def generate_image(
    product_id: str,
    data: GenerateImageRequest,
    db: Session = Depends(get_db),
):
    """Start image generation for an ad. Can reference existing content or provide copy directly."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Resolve copy from content piece or direct input
    headline = data.headline or ""
    body_text = data.body or ""
    cta = data.cta or "Learn More"

    if data.content_id:
        content = db.query(ContentPiece).filter(ContentPiece.id == data.content_id).first()
        if content:
            headline = headline or content.hook or content.title or content.body.split("\n")[0][:30]
            body_text = body_text or content.body[:60]
            cta = cta or content.cta or "Learn More"
            if content.aspect_ratio:
                data.aspect_ratio = content.aspect_ratio

    if not headline:
        raise HTTPException(status_code=400, detail="Headline is required (provide content_id or headline)")

    task_id = str(uuid.uuid4())
    _tasks[task_id] = {
        "status": "pending",
        "image_url": None,
        "image_prompt": None,
        "error": None,
    }

    # Run in background thread
    thread = threading.Thread(
        target=_run_image_gen,
        args=(task_id, product_id, headline, body_text, cta, data.aspect_ratio, data.style_notes, data.quality, data.content_id),
        daemon=True,
    )
    thread.start()

    return GenerateImageStatus(task_id=task_id, status="pending")


@router.get("/{product_id}/generate-image-status/{task_id}", response_model=GenerateImageStatus)
def get_image_status(product_id: str, task_id: str):
    """Check status of an image generation task."""
    task = _tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return GenerateImageStatus(
        task_id=task_id,
        status=task["status"],
        image_url=task.get("image_url"),
        image_prompt=task.get("image_prompt"),
        error=task.get("error"),
    )


def _run_image_gen(
    task_id: str,
    product_id: str,
    headline: str,
    body: str,
    cta: str,
    aspect_ratio: str,
    style_notes: str,
    quality: str,
    content_id: str | None,
):
    """Background thread: generate image and update task status."""
    from app.engines.image_gen import generate_ad_image, build_image_prompt_with_claude

    _tasks[task_id]["status"] = "running"

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            _tasks[task_id]["status"] = "failed"
            _tasks[task_id]["error"] = "Product not found"
            return

        image_url = generate_ad_image(
            product,
            headline,
            body,
            cta,
            aspect_ratio=aspect_ratio,
            style_notes=style_notes,
            quality=quality,
        )

        # Update content piece with generated image URL
        if content_id:
            content = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
            if content:
                content.image_url = image_url
                # Also store in metadata
                meta = {}
                if content.generation_metadata:
                    try:
                        meta = json.loads(content.generation_metadata)
                    except (json.JSONDecodeError, TypeError):
                        pass
                meta["generated_image"] = image_url
                content.generation_metadata = json.dumps(meta)
                db.commit()

        _tasks[task_id]["status"] = "completed"
        _tasks[task_id]["image_url"] = image_url

    except Exception as e:
        logger.exception("Image generation failed for task %s", task_id)
        _tasks[task_id]["status"] = "failed"
        _tasks[task_id]["error"] = str(e)
    finally:
        db.close()
