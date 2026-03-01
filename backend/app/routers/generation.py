import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContentPiece, Product

router = APIRouter()

_task_status: dict[str, dict] = {}


class GenerateRequest(BaseModel):
    content_types: list[str] = ["social_post"]
    platforms: list[str] = ["twitter"]
    count: int = 5
    funnel_stage: str = "awareness"
    instructions: str | None = None


class GenerateStatusResponse(BaseModel):
    task_id: str
    status: str
    pieces_generated: int
    error: str | None = None


def _run_generation(
    task_id: str,
    product_id: str,
    content_types: list[str],
    platforms: list[str],
    count: int,
    funnel_stage: str,
    instructions: str | None,
):
    """Run content generation in background thread."""
    from app.database import SessionLocal
    from app.engines.generation import generate_content_batch

    _task_status[task_id] = {
        "status": "running",
        "pieces_generated": 0,
        "error": None,
    }

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            _task_status[task_id] = {
                "status": "failed",
                "pieces_generated": 0,
                "error": "Product not found",
            }
            return

        pieces = asyncio.run(
            generate_content_batch(
                product=product,
                content_types=content_types,
                platforms=platforms,
                count=count,
                funnel_stage=funnel_stage,
                instructions=instructions,
            )
        )

        for piece_data in pieces:
            piece = ContentPiece(
                product_id=product_id,
                content_type=piece_data["content_type"],
                platform=piece_data["platform"],
                title=piece_data.get("title"),
                body=piece_data["body"],
                hook=piece_data.get("hook"),
                cta=piece_data.get("cta"),
                funnel_stage=funnel_stage,
                status="draft",
                generation_metadata=piece_data.get("metadata"),
            )
            db.add(piece)

        db.commit()
        _task_status[task_id] = {
            "status": "completed",
            "pieces_generated": len(pieces),
            "error": None,
        }
    except Exception as e:
        _task_status[task_id] = {
            "status": "failed",
            "pieces_generated": 0,
            "error": str(e),
        }
    finally:
        db.close()


@router.post("/{product_id}/generate", response_model=GenerateStatusResponse)
def generate_content(
    product_id: str,
    data: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "pieces_generated": 0, "error": None}

    background_tasks.add_task(
        _run_generation,
        task_id,
        product_id,
        data.content_types,
        data.platforms,
        data.count,
        data.funnel_stage,
        data.instructions,
    )

    return GenerateStatusResponse(task_id=task_id, status="pending", pieces_generated=0)


@router.get("/{product_id}/generate-status/{task_id}", response_model=GenerateStatusResponse)
def get_generation_status(product_id: str, task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return GenerateStatusResponse(task_id=task_id, **status)
