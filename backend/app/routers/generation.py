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
    template_type: str | None = None
    aspect_ratio: str | None = None
    industry_vertical: str | None = None
    creative_preset: str | None = None
    image_url: str | None = None
    industry_colors: dict | None = None
    use_premium_model: bool = False


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
    template_type: str | None = None,
    aspect_ratio: str | None = None,
    industry_vertical: str | None = None,
    creative_preset: str | None = None,
    image_url: str | None = None,
    industry_colors: dict | None = None,
    use_premium_model: bool = False,
):
    """Run content generation in background thread (sync — no asyncio.run)."""
    from app.database import SessionLocal
    from app.engines.billing import UsageLimitExceeded, check_generation_limit, increment_usage
    from app.engines.generation import generate_content_batch_sync
    from app.models.brand_profile import BrandProfile

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

        # Check usage limits before generating
        if product.workspace_id:
            try:
                check_generation_limit(db, product.workspace_id)
            except UsageLimitExceeded as e:
                _task_status[task_id] = {
                    "status": "failed",
                    "pieces_generated": 0,
                    "error": str(e),
                }
                return

        # Load brand profile for constraint enforcement
        brand_profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()

        pieces = generate_content_batch_sync(
            product=product,
            content_types=content_types,
            platforms=platforms,
            count=count,
            funnel_stage=funnel_stage,
            instructions=instructions,
            brand_profile=brand_profile,
            template_type=template_type,
            industry_vertical=industry_vertical,
            creative_preset=creative_preset,
            image_url=image_url,
            industry_colors=industry_colors,
            use_premium_model=use_premium_model,
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
                template_type=piece_data.get("template_type") or template_type,
                aspect_ratio=aspect_ratio,
                status="draft",
                generation_metadata=piece_data.get("metadata"),
            )
            db.add(piece)

        db.commit()

        # Track usage
        if product.workspace_id:
            increment_usage(db, product.workspace_id, "content_generations", len(pieces))

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
        data.template_type,
        data.aspect_ratio,
        data.industry_vertical,
        data.creative_preset,
        data.image_url,
        data.industry_colors,
        data.use_premium_model,
    )

    return GenerateStatusResponse(task_id=task_id, status="pending", pieces_generated=0)


@router.get("/{product_id}/generate-status/{task_id}", response_model=GenerateStatusResponse)
def get_generation_status(product_id: str, task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return GenerateStatusResponse(task_id=task_id, **status)


@router.get("/creative-presets")
def list_creative_presets():
    """Return available creative direction presets for the generate UI."""
    from app.engines.generation import CREATIVE_PRESETS
    return [
        {"value": key, "label": preset["label"]}
        for key, preset in CREATIVE_PRESETS.items()
    ]
