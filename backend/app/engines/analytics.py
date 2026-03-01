"""Analytics engine — metrics collection, insights, and optimization logic."""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import ContentPiece, PerformanceMetric, ScheduledPost

logger = logging.getLogger(__name__)


async def collect_metrics_for_all_posts(db: Session) -> int:
    """Collect metrics for all posted content from the last 30 days."""
    from app.engines.distribution import collect_metrics_for_post

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    posted = (
        db.query(ScheduledPost)
        .filter(
            ScheduledPost.status == "posted",
            ScheduledPost.posted_at >= cutoff,
            ScheduledPost.platform_post_id.isnot(None),
        )
        .all()
    )

    collected = 0
    for post in posted:
        metrics_data = await collect_metrics_for_post(db, post)
        if metrics_data:
            metric = PerformanceMetric(
                scheduled_post_id=post.id,
                content_id=post.content_id,
                platform=post.connection.platform,
                impressions=metrics_data.get("impressions", 0),
                clicks=metrics_data.get("clicks", 0),
                likes=metrics_data.get("likes", 0),
                shares=metrics_data.get("shares", 0),
                comments=metrics_data.get("comments", 0),
                spend=metrics_data.get("spend"),
                conversions=metrics_data.get("conversions", 0),
            )
            # Calculate CTR
            if metric.impressions > 0:
                metric.ctr = metric.clicks / metric.impressions
            db.add(metric)
            collected += 1

    db.commit()
    logger.info("Collected metrics for %d posts", collected)
    return collected


def get_overview(db: Session, product_id: str | None = None, days: int = 30) -> dict:
    """Get aggregate performance overview."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    query = db.query(PerformanceMetric).filter(PerformanceMetric.collected_at >= cutoff)

    if product_id:
        query = query.filter(
            PerformanceMetric.content_id.in_(
                db.query(ContentPiece.id).filter(ContentPiece.product_id == product_id)
            )
        )

    metrics = query.all()

    if not metrics:
        return {
            "total_impressions": 0,
            "total_clicks": 0,
            "total_likes": 0,
            "total_shares": 0,
            "total_comments": 0,
            "total_spend": 0.0,
            "total_conversions": 0,
            "avg_ctr": 0.0,
            "posts_tracked": 0,
            "period_days": days,
        }

    total_impressions = sum(m.impressions for m in metrics)
    total_clicks = sum(m.clicks for m in metrics)

    return {
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "total_likes": sum(m.likes for m in metrics),
        "total_shares": sum(m.shares for m in metrics),
        "total_comments": sum(m.comments for m in metrics),
        "total_spend": sum(m.spend or 0 for m in metrics),
        "total_conversions": sum(m.conversions for m in metrics),
        "avg_ctr": (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0,
        "posts_tracked": len(set(m.scheduled_post_id for m in metrics)),
        "period_days": days,
    }


def get_top_performers(
    db: Session,
    product_id: str | None = None,
    metric: str = "impressions",
    limit: int = 10,
) -> list[dict]:
    """Get top performing content pieces by a given metric."""
    valid_metrics = {"impressions", "clicks", "likes", "shares", "comments", "ctr"}
    if metric not in valid_metrics:
        metric = "impressions"

    metric_col = getattr(PerformanceMetric, metric)

    query = db.query(
        PerformanceMetric.content_id,
        func.sum(PerformanceMetric.impressions).label("total_impressions"),
        func.sum(PerformanceMetric.clicks).label("total_clicks"),
        func.sum(PerformanceMetric.likes).label("total_likes"),
        func.sum(PerformanceMetric.shares).label("total_shares"),
        func.avg(PerformanceMetric.ctr).label("avg_ctr"),
        PerformanceMetric.platform,
    ).group_by(PerformanceMetric.content_id, PerformanceMetric.platform)

    if product_id:
        query = query.filter(
            PerformanceMetric.content_id.in_(
                db.query(ContentPiece.id).filter(ContentPiece.product_id == product_id)
            )
        )

    query = query.order_by(func.sum(metric_col).desc()).limit(limit)
    rows = query.all()

    results = []
    for row in rows:
        content = db.query(ContentPiece).filter(ContentPiece.id == row.content_id).first()
        results.append(
            {
                "content_id": row.content_id,
                "title": content.title if content else None,
                "body_preview": (content.body[:100] + "...")
                if content and len(content.body) > 100
                else (content.body if content else ""),
                "content_type": content.content_type if content else None,
                "platform": row.platform,
                "total_impressions": row.total_impressions or 0,
                "total_clicks": row.total_clicks or 0,
                "total_likes": row.total_likes or 0,
                "total_shares": row.total_shares or 0,
                "avg_ctr": round(float(row.avg_ctr or 0), 4),
            }
        )

    return results


async def generate_insights(db: Session, product_id: str) -> dict:
    """Use Claude to generate optimization insights from performance data."""
    from app.services.claude_client import call_claude

    # Gather performance data
    overview = get_overview(db, product_id, days=30)
    top = get_top_performers(db, product_id, limit=5)

    if overview["posts_tracked"] == 0:
        return {
            "insights": [
                "Not enough data yet. Post more content and check back after collecting metrics."
            ],
            "recommendations": [],
        }

    prompt = f"""Analyze the following marketing performance data and provide actionable insights.

Performance Overview (last 30 days):
{json.dumps(overview, indent=2)}

Top Performing Content:
{json.dumps(top, indent=2)}

Based on this data, provide:
1. 3-5 key insights about what's working and what's not
2. 3-5 specific recommendations to improve performance
3. Suggested content angles to explore next

Return as JSON:
{{
    "insights": ["insight 1", "insight 2", ...],
    "recommendations": ["recommendation 1", "recommendation 2", ...],
    "content_angles": ["angle 1", "angle 2", ...]
}}

Return ONLY the JSON object."""

    result = await call_claude(prompt)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {
            "insights": [result["content"]],
            "recommendations": [],
            "content_angles": [],
        }
