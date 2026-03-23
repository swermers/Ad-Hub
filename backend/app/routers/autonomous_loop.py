"""Autonomous Loop configuration and monitoring endpoints.

Human-only: only admins can enable/configure the autonomous loop.
The loop itself runs as the bot seat, but configuration is human-curated.
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product
from app.models.autonomous_loop import AutonomousLoopConfig
from app.permissions import deny_agent

router = APIRouter(dependencies=[Depends(deny_agent)])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class LoopConfigResponse(BaseModel):
    id: str
    product_id: str

    content_loop_enabled: bool
    ad_loop_enabled: bool
    feedback_loop_enabled: bool

    auto_publish_social: bool
    auto_publish_email: bool
    auto_publish_ads: bool

    max_content_per_cycle: int
    max_ads_per_cycle: int
    active_platforms: list[str]
    preferred_post_times: dict
    timezone: str

    auto_upload_ads: bool
    auto_create_campaigns: bool
    max_autonomous_daily_budget: float

    winning_ctr_threshold: float
    auto_archive_underperformers: bool
    underperform_cycles_before_archive: int

    max_posts_per_day: int
    max_campaigns_per_week: int
    require_approval_above_budget: float

    last_content_cycle_at: str | None
    last_ad_cycle_at: str | None
    last_feedback_cycle_at: str | None
    total_cycles_run: int


class LoopConfigUpdate(BaseModel):
    content_loop_enabled: bool | None = None
    ad_loop_enabled: bool | None = None
    feedback_loop_enabled: bool | None = None

    auto_publish_social: bool | None = None
    auto_publish_email: bool | None = None
    auto_publish_ads: bool | None = None

    max_content_per_cycle: int | None = None
    max_ads_per_cycle: int | None = None
    active_platforms: list[str] | None = None
    preferred_post_times: dict | None = None
    timezone: str | None = None

    auto_upload_ads: bool | None = None
    auto_create_campaigns: bool | None = None
    max_autonomous_daily_budget: float | None = None

    winning_ctr_threshold: float | None = None
    auto_archive_underperformers: bool | None = None
    underperform_cycles_before_archive: int | None = None

    max_posts_per_day: int | None = None
    max_campaigns_per_week: int | None = None
    require_approval_above_budget: float | None = None


class CycleResult(BaseModel):
    product_id: str
    results: dict


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_response(config: AutonomousLoopConfig) -> dict:
    active_platforms = []
    if config.active_platforms:
        try:
            active_platforms = json.loads(config.active_platforms)
        except (json.JSONDecodeError, TypeError):
            pass

    preferred_times = {}
    if config.preferred_post_times:
        try:
            preferred_times = json.loads(config.preferred_post_times)
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "id": config.id,
        "product_id": config.product_id,
        "content_loop_enabled": config.content_loop_enabled,
        "ad_loop_enabled": config.ad_loop_enabled,
        "feedback_loop_enabled": config.feedback_loop_enabled,
        "auto_publish_social": config.auto_publish_social,
        "auto_publish_email": config.auto_publish_email,
        "auto_publish_ads": config.auto_publish_ads,
        "max_content_per_cycle": config.max_content_per_cycle,
        "max_ads_per_cycle": config.max_ads_per_cycle,
        "active_platforms": active_platforms,
        "preferred_post_times": preferred_times,
        "timezone": config.timezone,
        "auto_upload_ads": config.auto_upload_ads,
        "auto_create_campaigns": config.auto_create_campaigns,
        "max_autonomous_daily_budget": config.max_autonomous_daily_budget,
        "winning_ctr_threshold": config.winning_ctr_threshold,
        "auto_archive_underperformers": config.auto_archive_underperformers,
        "underperform_cycles_before_archive": config.underperform_cycles_before_archive,
        "max_posts_per_day": config.max_posts_per_day,
        "max_campaigns_per_week": config.max_campaigns_per_week,
        "require_approval_above_budget": config.require_approval_above_budget,
        "last_content_cycle_at": config.last_content_cycle_at.isoformat() if config.last_content_cycle_at else None,
        "last_ad_cycle_at": config.last_ad_cycle_at.isoformat() if config.last_ad_cycle_at else None,
        "last_feedback_cycle_at": config.last_feedback_cycle_at.isoformat() if config.last_feedback_cycle_at else None,
        "total_cycles_run": config.total_cycles_run,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/{product_id}/autonomous-loop", response_model=LoopConfigResponse)
def get_loop_config(product_id: str, db: Session = Depends(get_db)):
    """Get or create the autonomous loop configuration for a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    config = db.query(AutonomousLoopConfig).filter(
        AutonomousLoopConfig.product_id == product_id
    ).first()

    if not config:
        # Create default config (everything off)
        config = AutonomousLoopConfig(product_id=product_id)
        db.add(config)
        db.commit()
        db.refresh(config)

    return _to_response(config)


@router.put("/{product_id}/autonomous-loop", response_model=LoopConfigResponse)
def update_loop_config(
    product_id: str,
    data: LoopConfigUpdate,
    db: Session = Depends(get_db),
):
    """Update the autonomous loop configuration for a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    config = db.query(AutonomousLoopConfig).filter(
        AutonomousLoopConfig.product_id == product_id
    ).first()

    if not config:
        config = AutonomousLoopConfig(product_id=product_id)
        db.add(config)
        db.flush()

    update_data = data.model_dump(exclude_unset=True)

    # Handle JSON fields
    if "active_platforms" in update_data:
        update_data["active_platforms"] = json.dumps(update_data["active_platforms"])
    if "preferred_post_times" in update_data:
        update_data["preferred_post_times"] = json.dumps(update_data["preferred_post_times"])

    for key, value in update_data.items():
        setattr(config, key, value)

    config.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(config)

    return _to_response(config)


@router.post("/{product_id}/autonomous-loop/run-now", response_model=CycleResult)
def run_loop_now(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Manually trigger an autonomous cycle for a product (for testing/debugging)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    config = db.query(AutonomousLoopConfig).filter(
        AutonomousLoopConfig.product_id == product_id
    ).first()
    if not config:
        raise HTTPException(404, "No autonomous loop config. Configure it first.")

    if not (config.content_loop_enabled or config.ad_loop_enabled or config.feedback_loop_enabled):
        raise HTTPException(400, "All loops are disabled. Enable at least one loop first.")

    # Run synchronously for immediate feedback
    from app.engines.autonomous_loop import run_autonomous_cycle

    result = run_autonomous_cycle(db, product_id)

    return CycleResult(product_id=product_id, results=result)
