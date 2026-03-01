from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.engines.analytics import (
    collect_metrics_for_all_posts,
    generate_insights,
    get_overview,
    get_top_performers,
)
from app.models import ContentPiece, PerformanceMetric

router = APIRouter()


class OverviewResponse(BaseModel):
    total_impressions: int
    total_clicks: int
    total_likes: int
    total_shares: int
    total_comments: int
    total_spend: float
    total_conversions: int
    avg_ctr: float
    posts_tracked: int
    period_days: int


class TopPerformerItem(BaseModel):
    content_id: str
    title: str | None
    body_preview: str | None
    content_type: str | None
    platform: str
    total_impressions: int
    total_clicks: int
    total_likes: int
    total_shares: int
    avg_ctr: float


class ContentMetricResponse(BaseModel):
    content_id: str
    title: str | None
    total_impressions: int
    total_clicks: int
    total_likes: int
    total_shares: int
    total_comments: int
    total_conversions: int
    avg_ctr: float
    total_spend: float
    platforms: list[str]


class InsightsResponse(BaseModel):
    insights: list[str]
    recommendations: list[str]
    content_angles: list[str] = []


class CollectResult(BaseModel):
    collected: int


@router.get("/overview", response_model=OverviewResponse)
def analytics_overview(
    product_id: str | None = None,
    days: int = 30,
    db: Session = Depends(get_db),
):
    return get_overview(db, product_id, days)


@router.get("/top-performers", response_model=list[TopPerformerItem])
def top_performers(
    product_id: str | None = None,
    metric: str = "impressions",
    limit: int = 10,
    db: Session = Depends(get_db),
):
    return get_top_performers(db, product_id, metric, limit)


@router.get("/content/{content_id}", response_model=ContentMetricResponse)
def content_metrics(content_id: str, db: Session = Depends(get_db)):
    content = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    metrics = db.query(PerformanceMetric).filter(PerformanceMetric.content_id == content_id).all()

    if not metrics:
        return ContentMetricResponse(
            content_id=content_id,
            title=content.title,
            total_impressions=0,
            total_clicks=0,
            total_likes=0,
            total_shares=0,
            total_comments=0,
            total_conversions=0,
            avg_ctr=0.0,
            total_spend=0.0,
            platforms=[],
        )

    total_impressions = sum(m.impressions for m in metrics)
    total_clicks = sum(m.clicks for m in metrics)

    return ContentMetricResponse(
        content_id=content_id,
        title=content.title,
        total_impressions=total_impressions,
        total_clicks=total_clicks,
        total_likes=sum(m.likes for m in metrics),
        total_shares=sum(m.shares for m in metrics),
        total_comments=sum(m.comments for m in metrics),
        total_conversions=sum(m.conversions for m in metrics),
        avg_ctr=(total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0,
        total_spend=sum(m.spend or 0 for m in metrics),
        platforms=list(set(m.platform for m in metrics)),
    )


@router.get("/insights", response_model=InsightsResponse)
async def analytics_insights(
    product_id: str,
    db: Session = Depends(get_db),
):
    return await generate_insights(db, product_id)


def _run_collect(connection_id: str | None):
    """Background task to collect metrics."""
    import asyncio

    from app.database import SessionLocal

    db = SessionLocal()
    try:
        asyncio.run(collect_metrics_for_all_posts(db))
    finally:
        db.close()


@router.post("/collect", response_model=CollectResult)
async def trigger_collect(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    count = await collect_metrics_for_all_posts(db)
    return CollectResult(collected=count)
