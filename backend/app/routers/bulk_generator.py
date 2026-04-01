import json
import os
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdTemplate, AdVariation, PainPoint, Product

router = APIRouter()

_task_status: dict[str, dict] = {}

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "ad_images")


class BulkGenerateRequest(BaseModel):
    template_id: str
    pain_point_ids: list[str]
    variations_per_pain_point: int = 5
    funnel_stage: str = "awareness"


class BulkGenerateStatusResponse(BaseModel):
    task_id: str
    status: str
    variations_generated: int
    batch_id: str | None = None
    error: str | None = None


class VariationResponse(BaseModel):
    id: str
    product_id: str
    batch_id: str
    template_id: str | None
    pain_point_id: str | None
    headline: str
    body: str
    cta: str
    template_type: str | None
    template_config: dict
    pain_point_text: str | None
    desired_outcome: str | None
    status: str
    image_url: str | None
    meta_ad_id: str | None
    performance_score: float | None
    created_at: str


class VariationUpdate(BaseModel):
    headline: str | None = None
    body: str | None = None
    cta: str | None = None


class BulkStatusUpdate(BaseModel):
    variation_ids: list[str]
    status: str


def _to_response(v: AdVariation) -> dict:
    template_config = {}
    template_type = None
    if v.template:
        template_type = v.template.template_type
        template_config = json.loads(v.template.layout_config) if v.template.layout_config else {}
    if v.template_config_override:
        template_config.update(json.loads(v.template_config_override))

    return {
        "id": v.id,
        "product_id": v.product_id,
        "batch_id": v.batch_id,
        "template_id": v.template_id,
        "pain_point_id": v.pain_point_id,
        "headline": v.headline,
        "body": v.body,
        "cta": v.cta,
        "template_type": template_type,
        "template_config": template_config,
        "pain_point_text": v.pain_point.pain_point if v.pain_point else None,
        "desired_outcome": v.pain_point.desired_outcome if v.pain_point else None,
        "status": v.status,
        "image_url": v.image_url,
        "meta_ad_id": v.meta_ad_id,
        "performance_score": v.performance_score,
        "created_at": v.created_at.isoformat(),
    }


def _run_bulk_generation(
    task_id: str,
    product_id: str,
    template_id: str,
    pain_point_ids: list[str],
    variations_per: int,
    funnel_stage: str,
):
    from app.database import SessionLocal
    from app.engines.billing import UsageLimitExceeded, check_generation_limit, increment_usage
    from app.engines.generation import generate_ad_variations_sync
    from app.models.brand_profile import BrandProfile

    batch_id = str(uuid.uuid4())
    _task_status[task_id] = {
        "status": "running",
        "variations_generated": 0,
        "batch_id": batch_id,
        "error": None,
    }

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        template = db.query(AdTemplate).filter(AdTemplate.id == template_id).first()
        pain_points = db.query(PainPoint).filter(PainPoint.id.in_(pain_point_ids)).all()

        if not product or not template:
            _task_status[task_id] = {
                "status": "failed",
                "variations_generated": 0,
                "batch_id": batch_id,
                "error": "Product or template not found",
            }
            return

        # Check usage limits before generating
        if product.workspace_id:
            try:
                check_generation_limit(db, product.workspace_id)
            except UsageLimitExceeded as e:
                _task_status[task_id] = {
                    "status": "failed",
                    "variations_generated": 0,
                    "batch_id": batch_id,
                    "error": str(e),
                }
                return

        # Load brand profile for constraint enforcement
        brand_profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()

        variations = generate_ad_variations_sync(
            product=product,
            template=template,
            pain_points=pain_points,
            variations_per=variations_per,
            funnel_stage=funnel_stage,
            brand_profile=brand_profile,
        )

        for v in variations:
            # Build template_config_override from any color fields returned by AI
            config_override = {}
            for color_key in ("backgroundColor", "textColor", "accentColor"):
                if v.get(color_key):
                    config_override[color_key] = v[color_key]

            ad_var = AdVariation(
                product_id=product_id,
                batch_id=batch_id,
                template_id=template_id,
                pain_point_id=v.get("pain_point_id"),
                headline=v["headline"],
                body=v["body"],
                cta=v["cta"],
                template_config_override=json.dumps(config_override) if config_override else None,
                status="draft",
            )
            db.add(ad_var)

        db.commit()

        # Track usage
        if product.workspace_id:
            increment_usage(db, product.workspace_id, "ad_generations", len(variations))

        _task_status[task_id] = {
            "status": "completed",
            "variations_generated": len(variations),
            "batch_id": batch_id,
            "error": None,
        }
    except Exception as e:
        _task_status[task_id] = {
            "status": "failed",
            "variations_generated": 0,
            "batch_id": batch_id,
            "error": str(e),
        }
    finally:
        db.close()


@router.post("/{product_id}/bulk-generate", response_model=BulkGenerateStatusResponse)
def bulk_generate(
    product_id: str,
    data: BulkGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "variations_generated": 0, "batch_id": None, "error": None}

    background_tasks.add_task(
        _run_bulk_generation,
        task_id,
        product_id,
        data.template_id,
        data.pain_point_ids,
        data.variations_per_pain_point,
        data.funnel_stage,
    )

    return BulkGenerateStatusResponse(task_id=task_id, status="pending", variations_generated=0)


@router.get("/{product_id}/bulk-generate-status/{task_id}", response_model=BulkGenerateStatusResponse)
def get_bulk_generate_status(product_id: str, task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return BulkGenerateStatusResponse(task_id=task_id, **status)


@router.get("/{product_id}/ad-variations", response_model=list[VariationResponse])
def list_variations(
    product_id: str,
    batch_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(AdVariation).filter(AdVariation.product_id == product_id)
    if batch_id:
        query = query.filter(AdVariation.batch_id == batch_id)
    if status:
        query = query.filter(AdVariation.status == status)
    variations = query.order_by(AdVariation.created_at.desc()).offset(offset).limit(limit).all()
    return [_to_response(v) for v in variations]


@router.put("/ad-variations/{variation_id}", response_model=VariationResponse)
def update_variation(variation_id: str, data: VariationUpdate, db: Session = Depends(get_db)):
    v = db.query(AdVariation).filter(AdVariation.id == variation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Variation not found")
    if data.headline is not None:
        v.headline = data.headline
    if data.body is not None:
        v.body = data.body
    if data.cta is not None:
        v.cta = data.cta
    db.commit()
    db.refresh(v)
    return _to_response(v)


@router.put("/ad-variations/bulk-status")
def bulk_update_status(data: BulkStatusUpdate, db: Session = Depends(get_db)):
    updated = 0
    for vid in data.variation_ids:
        v = db.query(AdVariation).filter(AdVariation.id == vid).first()
        if v:
            v.status = data.status
            updated += 1
    db.commit()
    return {"updated": updated}


@router.delete("/ad-variations/{variation_id}", status_code=204)
def delete_variation(variation_id: str, db: Session = Depends(get_db)):
    v = db.query(AdVariation).filter(AdVariation.id == variation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Variation not found")
    db.delete(v)
    db.commit()


@router.post("/ad-variations/{variation_id}/upload-image")
async def upload_variation_image(variation_id: str, file: UploadFile, db: Session = Depends(get_db)):
    v = db.query(AdVariation).filter(AdVariation.id == variation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Variation not found")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{variation_id}.png"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    v.image_url = f"/uploads/ad_images/{filename}"
    db.commit()
    db.refresh(v)
    return {"image_url": v.image_url}
