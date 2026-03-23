"""
Intelligence Router — Tier 5 API endpoints.

Provides access to competitor monitoring, trend detection, hook pattern analysis,
evidence gathering, and intelligence briefings.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.permissions import get_current_user, require_any, require_human

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory task status tracking
_task_status: dict[str, dict] = {}


# ─── Schemas ────────────────────────────────────────────────────────────────

class CompetitorCreate(BaseModel):
    name: str
    website_url: str | None = None
    social_urls: dict | None = None
    meta_ad_library_url: str | None = None
    description: str | None = None


class CompetitorUpdate(BaseModel):
    name: str | None = None
    website_url: str | None = None
    social_urls: dict | None = None
    meta_ad_library_url: str | None = None
    description: str | None = None
    is_active: bool | None = None


class IntelligenceConfigUpdate(BaseModel):
    competitor_monitoring_enabled: bool | None = None
    trend_detection_enabled: bool | None = None
    hook_analysis_enabled: bool | None = None
    evidence_gathering_enabled: bool | None = None
    weekly_brief_enabled: bool | None = None
    competitor_scan_interval_hours: int | None = None
    trend_scan_interval_hours: int | None = None
    hook_analysis_interval_hours: int | None = None
    evidence_refresh_interval_hours: int | None = None
    niche_keywords: list[str] | None = None
    subreddits: list[str] | None = None
    x_accounts_to_watch: list[str] | None = None
    industry_vertical: str | None = None


class TrendStatusUpdate(BaseModel):
    status: str  # reviewed, actioned, dismissed


class EvidenceVerify(BaseModel):
    verified: bool


class HookSuggestRequest(BaseModel):
    topic: str


class EvidenceSearchRequest(BaseModel):
    claim: str


# ─── Intelligence Config ────────────────────────────────────────────────────

@router.get("/{product_id}/intelligence/config")
def get_intelligence_config(
    product_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.models.intelligence import IntelligenceConfig

    config = db.query(IntelligenceConfig).filter(IntelligenceConfig.product_id == product_id).first()
    if not config:
        return {
            "product_id": product_id,
            "competitor_monitoring_enabled": False,
            "trend_detection_enabled": False,
            "hook_analysis_enabled": False,
            "evidence_gathering_enabled": False,
            "weekly_brief_enabled": True,
            "competitor_scan_interval_hours": 24,
            "trend_scan_interval_hours": 12,
            "hook_analysis_interval_hours": 48,
            "evidence_refresh_interval_hours": 72,
            "niche_keywords": [],
            "subreddits": [],
            "x_accounts_to_watch": [],
            "industry_vertical": None,
            "last_competitor_scan_at": None,
            "last_trend_scan_at": None,
            "last_hook_analysis_at": None,
            "last_evidence_refresh_at": None,
            "last_brief_generated_at": None,
        }

    return {
        "id": config.id,
        "product_id": config.product_id,
        "competitor_monitoring_enabled": config.competitor_monitoring_enabled,
        "trend_detection_enabled": config.trend_detection_enabled,
        "hook_analysis_enabled": config.hook_analysis_enabled,
        "evidence_gathering_enabled": config.evidence_gathering_enabled,
        "weekly_brief_enabled": config.weekly_brief_enabled,
        "competitor_scan_interval_hours": config.competitor_scan_interval_hours,
        "trend_scan_interval_hours": config.trend_scan_interval_hours,
        "hook_analysis_interval_hours": config.hook_analysis_interval_hours,
        "evidence_refresh_interval_hours": config.evidence_refresh_interval_hours,
        "niche_keywords": json.loads(config.niche_keywords) if config.niche_keywords else [],
        "subreddits": json.loads(config.subreddits) if config.subreddits else [],
        "x_accounts_to_watch": json.loads(config.x_accounts_to_watch) if config.x_accounts_to_watch else [],
        "industry_vertical": config.industry_vertical,
        "last_competitor_scan_at": config.last_competitor_scan_at,
        "last_trend_scan_at": config.last_trend_scan_at,
        "last_hook_analysis_at": config.last_hook_analysis_at,
        "last_evidence_refresh_at": config.last_evidence_refresh_at,
        "last_brief_generated_at": config.last_brief_generated_at,
    }


@router.put("/{product_id}/intelligence/config")
def update_intelligence_config(
    product_id: str,
    body: IntelligenceConfigUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_human),
):
    from app.models.intelligence import IntelligenceConfig

    config = db.query(IntelligenceConfig).filter(IntelligenceConfig.product_id == product_id).first()
    if not config:
        config = IntelligenceConfig(product_id=product_id)
        db.add(config)

    update_data = body.model_dump(exclude_none=True)

    # Serialize list fields to JSON
    for field in ("niche_keywords", "subreddits", "x_accounts_to_watch"):
        if field in update_data:
            update_data[field] = json.dumps(update_data[field])

    for key, value in update_data.items():
        setattr(config, key, value)

    db.commit()
    db.refresh(config)

    return {"status": "updated", "product_id": product_id}


# ─── Competitor Management ──────────────────────────────────────────────────

@router.get("/{product_id}/intelligence/competitors")
def list_competitors(
    product_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.models.intelligence import CompetitorProfile

    competitors = (
        db.query(CompetitorProfile)
        .filter(CompetitorProfile.product_id == product_id)
        .order_by(CompetitorProfile.created_at.desc())
        .all()
    )

    return [
        {
            "id": c.id,
            "name": c.name,
            "website_url": c.website_url,
            "social_urls": json.loads(c.social_urls) if c.social_urls else None,
            "meta_ad_library_url": c.meta_ad_library_url,
            "description": c.description,
            "last_crawled_at": c.last_crawled_at,
            "ad_count": c.ad_count,
            "longest_running_ad": json.loads(c.longest_running_ad) if c.longest_running_ad else None,
            "is_active": c.is_active,
            "latest_snapshot": json.loads(c.latest_snapshot) if c.latest_snapshot else None,
            "created_at": c.created_at,
        }
        for c in competitors
    ]


@router.post("/{product_id}/intelligence/competitors")
def create_competitor(
    product_id: str,
    body: CompetitorCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_human),
):
    from app.models.intelligence import CompetitorProfile

    competitor = CompetitorProfile(
        product_id=product_id,
        name=body.name,
        website_url=body.website_url,
        social_urls=json.dumps(body.social_urls) if body.social_urls else None,
        meta_ad_library_url=body.meta_ad_library_url,
        description=body.description,
    )
    db.add(competitor)
    db.commit()
    db.refresh(competitor)

    return {
        "id": competitor.id,
        "name": competitor.name,
        "website_url": competitor.website_url,
        "created_at": competitor.created_at,
    }


@router.put("/{product_id}/intelligence/competitors/{competitor_id}")
def update_competitor(
    product_id: str,
    competitor_id: str,
    body: CompetitorUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_human),
):
    from app.models.intelligence import CompetitorProfile

    competitor = (
        db.query(CompetitorProfile)
        .filter(CompetitorProfile.id == competitor_id, CompetitorProfile.product_id == product_id)
        .first()
    )
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    update_data = body.model_dump(exclude_none=True)
    if "social_urls" in update_data:
        update_data["social_urls"] = json.dumps(update_data["social_urls"])

    for key, value in update_data.items():
        setattr(competitor, key, value)

    db.commit()
    return {"status": "updated"}


@router.delete("/{product_id}/intelligence/competitors/{competitor_id}")
def delete_competitor(
    product_id: str,
    competitor_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_human),
):
    from app.models.intelligence import CompetitorProfile

    competitor = (
        db.query(CompetitorProfile)
        .filter(CompetitorProfile.id == competitor_id, CompetitorProfile.product_id == product_id)
        .first()
    )
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    db.delete(competitor)
    db.commit()
    return {"status": "deleted"}


@router.post("/{product_id}/intelligence/competitors/scan")
def scan_competitors(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    import uuid
    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "running", "product_id": product_id}

    def _run_scan(product_id: str, task_id: str):
        from app.database import SessionLocal
        from app.engines.competitor_monitor import scan_all_competitors

        session = SessionLocal()
        try:
            result = scan_all_competitors(session, product_id)
            _task_status[task_id] = {"status": "completed", "result": result}
        except Exception as e:
            _task_status[task_id] = {"status": "failed", "error": str(e)}
        finally:
            session.close()

    background_tasks.add_task(_run_scan, product_id, task_id)
    return {"task_id": task_id, "status": "running"}


@router.post("/{product_id}/intelligence/competitors/compare")
def compare_competitors_endpoint(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    import uuid
    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "running"}

    def _run_compare(product_id: str, task_id: str):
        from app.database import SessionLocal
        from app.engines.competitor_monitor import compare_competitors

        session = SessionLocal()
        try:
            result = compare_competitors(session, product_id)
            _task_status[task_id] = {"status": "completed", "result": result}
        except Exception as e:
            _task_status[task_id] = {"status": "failed", "error": str(e)}
        finally:
            session.close()

    background_tasks.add_task(_run_compare, product_id, task_id)
    return {"task_id": task_id, "status": "running"}


# ─── Trend Detection ────────────────────────────────────────────────────────

@router.get("/{product_id}/intelligence/trends")
def list_trends(
    product_id: str,
    category: str | None = None,
    momentum: str | None = None,
    status: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.models.intelligence import TrendSignal

    query = db.query(TrendSignal).filter(TrendSignal.product_id == product_id)
    if category:
        query = query.filter(TrendSignal.category == category)
    if momentum:
        query = query.filter(TrendSignal.momentum == momentum)
    if status:
        query = query.filter(TrendSignal.status == status)

    trends = query.order_by(TrendSignal.relevance_score.desc()).limit(limit).all()

    return [
        {
            "id": t.id,
            "title": t.title,
            "summary": t.summary,
            "source_type": t.source_type,
            "source_snippet": t.source_snippet,
            "category": t.category,
            "relevance_score": t.relevance_score,
            "momentum": t.momentum,
            "volume": t.volume,
            "status": t.status,
            "suggested_angle": t.suggested_angle,
            "detected_at": t.detected_at,
        }
        for t in trends
    ]


@router.post("/{product_id}/intelligence/trends/scan")
def scan_trends(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    import uuid
    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "running"}

    def _run_scan(product_id: str, task_id: str):
        from app.database import SessionLocal
        from app.engines.trend_detector import detect_trends

        session = SessionLocal()
        try:
            result = detect_trends(session, product_id)
            _task_status[task_id] = {"status": "completed", "count": len(result), "trends": result}
        except Exception as e:
            _task_status[task_id] = {"status": "failed", "error": str(e)}
        finally:
            session.close()

    background_tasks.add_task(_run_scan, product_id, task_id)
    return {"task_id": task_id, "status": "running"}


@router.get("/{product_id}/intelligence/trends/summary")
def get_trend_summary_endpoint(
    product_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.engines.trend_detector import get_trend_summary
    return get_trend_summary(db, product_id)


@router.put("/{product_id}/intelligence/trends/{trend_id}")
def update_trend_status(
    product_id: str,
    trend_id: str,
    body: TrendStatusUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_human),
):
    from app.models.intelligence import TrendSignal

    trend = (
        db.query(TrendSignal)
        .filter(TrendSignal.id == trend_id, TrendSignal.product_id == product_id)
        .first()
    )
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")

    trend.status = body.status
    db.commit()
    return {"status": "updated"}


# ─── Hook Patterns ──────────────────────────────────────────────────────────

@router.get("/{product_id}/intelligence/hooks")
def list_hook_patterns(
    product_id: str,
    pattern_type: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.engines.hook_analyzer import get_best_patterns
    return get_best_patterns(db, product_id, pattern_type, limit)


@router.post("/{product_id}/intelligence/hooks/analyze")
def analyze_hooks_endpoint(
    product_id: str,
    background_tasks: BackgroundTasks,
    platform: str = "all",
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    import uuid
    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "running"}

    def _run_analysis(product_id: str, platform: str, task_id: str):
        from app.database import SessionLocal
        from app.engines.hook_analyzer import analyze_hooks

        session = SessionLocal()
        try:
            result = analyze_hooks(session, product_id, platform)
            _task_status[task_id] = {"status": "completed", "count": len(result), "patterns": result}
        except Exception as e:
            _task_status[task_id] = {"status": "failed", "error": str(e)}
        finally:
            session.close()

    background_tasks.add_task(_run_analysis, product_id, platform, task_id)
    return {"task_id": task_id, "status": "running"}


@router.post("/{product_id}/intelligence/hooks/suggest")
def suggest_hooks_endpoint(
    product_id: str,
    body: HookSuggestRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.engines.hook_analyzer import suggest_hooks_for_topic
    hooks = suggest_hooks_for_topic(db, product_id, body.topic)
    return {"hooks": hooks}


# ─── Evidence ────────────────────────────────────────────────────────────────

@router.get("/{product_id}/intelligence/evidence")
def list_evidence(
    product_id: str,
    evidence_type: str | None = None,
    verified_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.models.intelligence import EvidenceItem

    query = db.query(EvidenceItem).filter(EvidenceItem.product_id == product_id)
    if evidence_type:
        query = query.filter(EvidenceItem.evidence_type == evidence_type)
    if verified_only:
        query = query.filter(EvidenceItem.verified.is_(True))

    items = query.order_by(EvidenceItem.credibility_score.desc()).limit(limit).all()

    return [
        {
            "id": e.id,
            "claim": e.claim,
            "evidence_text": e.evidence_text,
            "evidence_type": e.evidence_type,
            "source_name": e.source_name,
            "source_url": e.source_url,
            "credibility_score": e.credibility_score,
            "freshness": e.freshness,
            "times_used": e.times_used,
            "verified": e.verified,
            "created_at": e.created_at,
        }
        for e in items
    ]


@router.post("/{product_id}/intelligence/evidence/gather")
def gather_evidence_endpoint(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    import uuid
    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "running"}

    def _run_gather(product_id: str, task_id: str):
        from app.database import SessionLocal
        from app.engines.evidence_gatherer import gather_evidence

        session = SessionLocal()
        try:
            result = gather_evidence(session, product_id)
            _task_status[task_id] = {"status": "completed", "count": len(result), "evidence": result}
        except Exception as e:
            _task_status[task_id] = {"status": "failed", "error": str(e)}
        finally:
            session.close()

    background_tasks.add_task(_run_gather, product_id, task_id)
    return {"task_id": task_id, "status": "running"}


@router.get("/{product_id}/intelligence/evidence/summary")
def get_evidence_summary_endpoint(
    product_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.engines.evidence_gatherer import get_evidence_summary
    return get_evidence_summary(db, product_id)


@router.post("/{product_id}/intelligence/evidence/search")
def search_evidence_endpoint(
    product_id: str,
    body: EvidenceSearchRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.engines.evidence_gatherer import find_evidence_for_claim
    return {"results": find_evidence_for_claim(db, product_id, body.claim)}


@router.put("/{product_id}/intelligence/evidence/{evidence_id}/verify")
def verify_evidence(
    product_id: str,
    evidence_id: str,
    body: EvidenceVerify,
    db: Session = Depends(get_db),
    user: dict = Depends(require_human),
):
    from app.models.intelligence import EvidenceItem

    item = (
        db.query(EvidenceItem)
        .filter(EvidenceItem.id == evidence_id, EvidenceItem.product_id == product_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Evidence not found")

    item.verified = body.verified
    db.commit()
    return {"status": "updated"}


# ─── Intelligence Briefs ────────────────────────────────────────────────────

@router.get("/{product_id}/intelligence/briefs")
def list_briefs(
    product_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.models.intelligence import IntelligenceBrief

    briefs = (
        db.query(IntelligenceBrief)
        .filter(IntelligenceBrief.product_id == product_id)
        .order_by(IntelligenceBrief.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": b.id,
            "title": b.title,
            "period": b.period,
            "summary": b.summary,
            "status": b.status,
            "read_at": b.read_at,
            "created_at": b.created_at,
        }
        for b in briefs
    ]


@router.get("/{product_id}/intelligence/briefs/{brief_id}")
def get_brief(
    product_id: str,
    brief_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    from app.models.intelligence import IntelligenceBrief

    brief = (
        db.query(IntelligenceBrief)
        .filter(IntelligenceBrief.id == brief_id, IntelligenceBrief.product_id == product_id)
        .first()
    )
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    # Mark as read
    if not brief.read_at:
        brief.read_at = datetime.now(timezone.utc)
        db.commit()

    return {
        "id": brief.id,
        "title": brief.title,
        "period": brief.period,
        "summary": brief.summary,
        "whats_working": json.loads(brief.whats_working) if brief.whats_working else [],
        "competitor_moves": json.loads(brief.competitor_moves) if brief.competitor_moves else [],
        "trend_alerts": json.loads(brief.trend_alerts) if brief.trend_alerts else [],
        "evidence_found": json.loads(brief.evidence_found) if brief.evidence_found else [],
        "creative_recommendations": json.loads(brief.creative_recommendations) if brief.creative_recommendations else [],
        "next_actions": json.loads(brief.next_actions) if brief.next_actions else [],
        "status": brief.status,
        "read_at": brief.read_at,
        "created_at": brief.created_at,
    }


@router.post("/{product_id}/intelligence/briefs/generate")
def generate_brief_endpoint(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    import uuid
    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "running"}

    def _run_brief(product_id: str, task_id: str):
        from app.database import SessionLocal
        from app.engines.intelligence_brief import generate_weekly_brief

        session = SessionLocal()
        try:
            result = generate_weekly_brief(session, product_id)
            _task_status[task_id] = {"status": "completed", "brief": result}
        except Exception as e:
            _task_status[task_id] = {"status": "failed", "error": str(e)}
        finally:
            session.close()

    background_tasks.add_task(_run_brief, product_id, task_id)
    return {"task_id": task_id, "status": "running"}


# ─── Full Intelligence Cycle ────────────────────────────────────────────────

@router.post("/{product_id}/intelligence/run-cycle")
def run_intelligence_cycle(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    """Run the full intelligence cycle: competitors, trends, hooks, evidence, brief."""
    import uuid
    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "running"}

    def _run_cycle(product_id: str, task_id: str):
        from app.database import SessionLocal
        from app.engines.intelligence_brief import run_full_intelligence_cycle

        session = SessionLocal()
        try:
            result = run_full_intelligence_cycle(session, product_id)
            _task_status[task_id] = {"status": "completed", "result": result}
        except Exception as e:
            _task_status[task_id] = {"status": "failed", "error": str(e)}
        finally:
            session.close()

    background_tasks.add_task(_run_cycle, product_id, task_id)
    return {"task_id": task_id, "status": "running"}


# ─── Task Status (shared across all intelligence tasks) ─────────────────────

@router.get("/{product_id}/intelligence/task/{task_id}")
def get_task_status(
    product_id: str,
    task_id: str,
    user: dict = Depends(require_any),
):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return status


# ─── Dashboard Summary ──────────────────────────────────────────────────────

@router.get("/{product_id}/intelligence/dashboard")
def get_intelligence_dashboard(
    product_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(require_any),
):
    """Get a high-level overview of all intelligence data for the dashboard."""
    from app.models.intelligence import (
        CompetitorProfile,
        EvidenceItem,
        HookPattern,
        IntelligenceBrief,
        IntelligenceConfig,
        TrendSignal,
    )
    from datetime import timedelta

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    config = db.query(IntelligenceConfig).filter(IntelligenceConfig.product_id == product_id).first()

    competitors_count = db.query(CompetitorProfile).filter(
        CompetitorProfile.product_id == product_id,
        CompetitorProfile.is_active.is_(True),
    ).count()

    trends_count = db.query(TrendSignal).filter(
        TrendSignal.product_id == product_id,
        TrendSignal.detected_at > week_ago,
    ).count()

    rising_trends = db.query(TrendSignal).filter(
        TrendSignal.product_id == product_id,
        TrendSignal.momentum == "rising",
        TrendSignal.detected_at > week_ago,
    ).count()

    hooks_count = db.query(HookPattern).filter(HookPattern.product_id == product_id).count()

    evidence_count = db.query(EvidenceItem).filter(EvidenceItem.product_id == product_id).count()
    verified_evidence = db.query(EvidenceItem).filter(
        EvidenceItem.product_id == product_id,
        EvidenceItem.verified.is_(True),
    ).count()

    latest_brief = (
        db.query(IntelligenceBrief)
        .filter(IntelligenceBrief.product_id == product_id)
        .order_by(IntelligenceBrief.created_at.desc())
        .first()
    )

    return {
        "config": {
            "competitor_monitoring_enabled": config.competitor_monitoring_enabled if config else False,
            "trend_detection_enabled": config.trend_detection_enabled if config else False,
            "hook_analysis_enabled": config.hook_analysis_enabled if config else False,
            "evidence_gathering_enabled": config.evidence_gathering_enabled if config else False,
        },
        "competitors": {
            "active": competitors_count,
        },
        "trends": {
            "this_week": trends_count,
            "rising": rising_trends,
        },
        "hooks": {
            "total_patterns": hooks_count,
        },
        "evidence": {
            "total": evidence_count,
            "verified": verified_evidence,
        },
        "latest_brief": {
            "id": latest_brief.id if latest_brief else None,
            "title": latest_brief.title if latest_brief else None,
            "created_at": latest_brief.created_at if latest_brief else None,
            "read": latest_brief.read_at is not None if latest_brief else False,
        },
    }
