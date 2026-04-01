import asyncio
import json
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdVariation, OptimizationConfig, OptimizationLog, Product

router = APIRouter()

_task_status: dict[str, dict] = {}


class OptimizationConfigUpdate(BaseModel):
    min_impressions: int | None = None
    max_cpm: float | None = None
    min_ctr: float | None = None
    winner_ctr_threshold: float | None = None
    winner_budget_multiplier: float | None = None
    check_interval_hours: int | None = None
    enabled: bool | None = None
    auto_iterate: bool | None = None
    max_iterations: int | None = None


class OptimizationConfigResponse(BaseModel):
    id: str
    product_id: str
    min_impressions: int
    max_cpm: float
    min_ctr: float
    winner_ctr_threshold: float
    winner_budget_multiplier: float
    check_interval_hours: int
    enabled: bool
    auto_iterate: bool
    max_iterations: int
    iterations_run: int


class OptimizationLogResponse(BaseModel):
    id: str
    product_id: str
    ad_variation_id: str | None
    action: str
    reason: str
    metrics_snapshot: dict
    headline: str | None
    created_at: str


class RunOptimizationResponse(BaseModel):
    task_id: str
    status: str
    actions_taken: int
    error: str | None = None


class WinnerAnalysisResponse(BaseModel):
    winning_patterns: list[str]
    losing_patterns: list[str]
    recommended_angles: list[str]
    recommended_templates: list[str]
    summary: str


@router.get("/{product_id}/optimization-config", response_model=OptimizationConfigResponse)
def get_optimization_config(product_id: str, db: Session = Depends(get_db)):
    config = db.query(OptimizationConfig).filter(OptimizationConfig.product_id == product_id).first()
    if not config:
        config = OptimizationConfig(product_id=product_id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.put("/{product_id}/optimization-config", response_model=OptimizationConfigResponse)
def update_optimization_config(
    product_id: str, data: OptimizationConfigUpdate, db: Session = Depends(get_db)
):
    config = db.query(OptimizationConfig).filter(OptimizationConfig.product_id == product_id).first()
    if not config:
        config = OptimizationConfig(product_id=product_id)
        db.add(config)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(config, field, value)

    db.commit()
    db.refresh(config)
    return config


@router.get("/{product_id}/optimization-log", response_model=list[OptimizationLogResponse])
def get_optimization_log(product_id: str, limit: int = 50, db: Session = Depends(get_db)):
    logs = (
        db.query(OptimizationLog)
        .filter(OptimizationLog.product_id == product_id)
        .order_by(OptimizationLog.created_at.desc())
        .limit(limit)
        .all()
    )

    # Batch-fetch all related variations in one query instead of N+1
    variation_ids = [log.ad_variation_id for log in logs if log.ad_variation_id]
    variations_map = {}
    if variation_ids:
        variations = db.query(AdVariation).filter(AdVariation.id.in_(variation_ids)).all()
        variations_map = {v.id: v for v in variations}

    results = []
    for log in logs:
        variation = variations_map.get(log.ad_variation_id)
        results.append({
            "id": log.id,
            "product_id": log.product_id,
            "ad_variation_id": log.ad_variation_id,
            "action": log.action,
            "reason": log.reason,
            "metrics_snapshot": json.loads(log.metrics_snapshot) if log.metrics_snapshot else {},
            "headline": variation.headline if variation else None,
            "created_at": log.created_at.isoformat(),
        })
    return results


def _run_optimization(task_id: str, product_id: str):
    from app.database import SessionLocal
    from app.engines.optimizer import run_optimization_cycle

    _task_status[task_id] = {"status": "running", "actions_taken": 0, "error": None}

    db = SessionLocal()
    try:
        config = db.query(OptimizationConfig).filter(OptimizationConfig.product_id == product_id).first()
        if not config:
            _task_status[task_id] = {"status": "failed", "actions_taken": 0, "error": "No optimization config"}
            return

        result = asyncio.run(run_optimization_cycle(db, product_id, config))
        _task_status[task_id] = {"status": "completed", "actions_taken": result["actions_taken"], "error": None}
    except Exception as e:
        _task_status[task_id] = {"status": "failed", "actions_taken": 0, "error": str(e)}
    finally:
        db.close()


@router.post("/{product_id}/run-optimization", response_model=RunOptimizationResponse)
def run_optimization(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "actions_taken": 0, "error": None}
    background_tasks.add_task(_run_optimization, task_id, product_id)
    return RunOptimizationResponse(task_id=task_id, status="pending", actions_taken=0)


@router.get("/{product_id}/run-optimization-status/{task_id}", response_model=RunOptimizationResponse)
def get_optimization_status(product_id: str, task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return RunOptimizationResponse(task_id=task_id, **status)


@router.post("/{product_id}/auto-iterate")
def trigger_auto_iterate(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Manually trigger the auto-iterate engine to analyze winners and generate next batch."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    config = db.query(OptimizationConfig).filter(OptimizationConfig.product_id == product_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="No optimization config. Create one first.")

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "actions_taken": 0, "error": None}

    def _run_iterate(task_id: str, product_id: str):
        from app.database import SessionLocal
        from app.engines.auto_iterate import run_auto_iterate

        _task_status[task_id] = {"status": "running", "actions_taken": 0, "error": None}
        db_inner = SessionLocal()
        try:
            cfg = db_inner.query(OptimizationConfig).filter(OptimizationConfig.product_id == product_id).first()
            result = asyncio.run(run_auto_iterate(db_inner, product_id, cfg))
            _task_status[task_id] = {
                "status": "completed",
                "actions_taken": result.get("variations_created", 0),
                "error": None,
                "result": result,
            }
        except Exception as e:
            _task_status[task_id] = {"status": "failed", "actions_taken": 0, "error": str(e)}
        finally:
            db_inner.close()

    background_tasks.add_task(_run_iterate, task_id, product_id)
    return {"task_id": task_id, "status": "pending"}


@router.get("/{product_id}/auto-iterate-status/{task_id}")
def get_auto_iterate_status(product_id: str, task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task_id, **status}


@router.post("/{product_id}/reset-iterations")
def reset_iterations(product_id: str, db: Session = Depends(get_db)):
    """Reset the auto-iterate counter so it can run again."""
    config = db.query(OptimizationConfig).filter(OptimizationConfig.product_id == product_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="No optimization config found")
    config.iterations_run = 0
    db.commit()
    return {"iterations_run": 0, "max_iterations": config.max_iterations}


@router.get("/{product_id}/winner-analysis", response_model=WinnerAnalysisResponse)
def get_winner_analysis(product_id: str, db: Session = Depends(get_db)):
    from app.engines.generation import analyze_winners

    winners = (
        db.query(AdVariation)
        .filter(AdVariation.product_id == product_id, AdVariation.status == "live")
        .all()
    )
    losers = (
        db.query(AdVariation)
        .filter(AdVariation.product_id == product_id, AdVariation.status == "paused")
        .all()
    )

    if not winners and not losers:
        return WinnerAnalysisResponse(
            winning_patterns=[],
            losing_patterns=[],
            recommended_angles=["Start by generating and uploading ads to gather performance data."],
            recommended_templates=[],
            summary="No performance data yet. Generate and upload ads to start gathering insights.",
        )

    result = asyncio.run(analyze_winners(
        db.query(Product).filter(Product.id == product_id).first(),
        winners,
        losers,
    ))
    return result
