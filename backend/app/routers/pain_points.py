import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PainPoint, Product

router = APIRouter()

_task_status: dict[str, dict] = {}


class PainPointCreate(BaseModel):
    pain_point: str
    desired_outcome: str = ""
    category: str = "frustration"
    severity: int = 5
    target_segment: str | None = None


class PainPointResponse(BaseModel):
    id: str
    product_id: str
    pain_point: str
    desired_outcome: str
    category: str
    severity: int
    target_segment: str | None
    source: str
    created_at: str


class ResearchStatusResponse(BaseModel):
    task_id: str
    status: str
    points_generated: int
    error: str | None = None


def _to_response(pp: PainPoint) -> dict:
    return {
        "id": pp.id,
        "product_id": pp.product_id,
        "pain_point": pp.pain_point,
        "desired_outcome": pp.desired_outcome,
        "category": pp.category,
        "severity": pp.severity,
        "target_segment": pp.target_segment,
        "source": pp.source,
        "created_at": pp.created_at.isoformat(),
    }


def _run_research(task_id: str, product_id: str, count: int):
    from app.database import SessionLocal
    from app.engines.generation import research_pain_points_sync

    _task_status[task_id] = {"status": "running", "points_generated": 0, "error": None}

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            _task_status[task_id] = {"status": "failed", "points_generated": 0, "error": "Product not found"}
            return

        points = research_pain_points_sync(product, count=count)

        for p in points:
            pp = PainPoint(
                product_id=product_id,
                pain_point=p["pain_point"],
                desired_outcome=p.get("desired_outcome", ""),
                category=p.get("category", "frustration"),
                severity=p.get("severity", 5),
                target_segment=p.get("target_segment"),
                source="ai_generated",
            )
            db.add(pp)

        db.commit()
        _task_status[task_id] = {"status": "completed", "points_generated": len(points), "error": None}
    except Exception as e:
        _task_status[task_id] = {"status": "failed", "points_generated": 0, "error": str(e)}
    finally:
        db.close()


@router.get("/{product_id}/pain-points", response_model=list[PainPointResponse])
def list_pain_points(product_id: str, category: str | None = None, db: Session = Depends(get_db)):
    query = db.query(PainPoint).filter(PainPoint.product_id == product_id)
    if category:
        query = query.filter(PainPoint.category == category)
    points = query.order_by(PainPoint.severity.desc()).all()
    return [_to_response(pp) for pp in points]


@router.post("/{product_id}/pain-points", response_model=PainPointResponse)
def create_pain_point(product_id: str, data: PainPointCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    pp = PainPoint(
        product_id=product_id,
        pain_point=data.pain_point,
        desired_outcome=data.desired_outcome,
        category=data.category,
        severity=data.severity,
        target_segment=data.target_segment,
        source="manual",
    )
    db.add(pp)
    db.commit()
    db.refresh(pp)
    return _to_response(pp)


@router.delete("/{product_id}/pain-points/{point_id}", status_code=204)
def delete_pain_point(product_id: str, point_id: str, db: Session = Depends(get_db)):
    pp = db.query(PainPoint).filter(PainPoint.id == point_id, PainPoint.product_id == product_id).first()
    if not pp:
        raise HTTPException(status_code=404, detail="Pain point not found")
    db.delete(pp)
    db.commit()


@router.post("/{product_id}/research-pain-points", response_model=ResearchStatusResponse)
def research_pain_points_endpoint(
    product_id: str,
    count: int = 20,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "points_generated": 0, "error": None}
    background_tasks.add_task(_run_research, task_id, product_id, count)
    return ResearchStatusResponse(task_id=task_id, status="pending", points_generated=0)


@router.get("/{product_id}/research-pain-points-status/{task_id}", response_model=ResearchStatusResponse)
def get_research_status(product_id: str, task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return ResearchStatusResponse(task_id=task_id, **status)
