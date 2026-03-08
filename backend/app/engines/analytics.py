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


async def get_command_center(db: Session) -> dict:
    """Get a comprehensive snapshot of all products, ad performance, and AI recommendations."""
    from app.models import AdVariation, OptimizationLog, PainPoint, Product

    products = db.query(Product).all()

    product_summaries = []
    total_spend = 0.0
    total_active = 0
    total_paused = 0
    total_winners = 0
    all_winners = []
    all_losers = []

    for product in products:
        # Ad variation stats
        variations = db.query(AdVariation).filter(AdVariation.product_id == product.id).all()
        status_counts = {"draft": 0, "approved": 0, "exported": 0, "uploaded": 0, "live": 0, "paused": 0}
        product_spend = 0.0
        product_winners = []
        product_losers = []

        for v in variations:
            status_counts[v.status] = status_counts.get(v.status, 0) + 1
            # Parse metrics from optimization logs if available
            latest_log = (
                db.query(OptimizationLog)
                .filter(OptimizationLog.ad_variation_id == v.id)
                .order_by(OptimizationLog.created_at.desc())
                .first()
            )
            if latest_log and latest_log.metrics_snapshot:
                try:
                    snap = json.loads(latest_log.metrics_snapshot)
                    product_spend += snap.get("spend", 0.0)
                    entry = {
                        "variation_id": v.id,
                        "headline": v.headline,
                        "status": v.status,
                        "ctr": snap.get("ctr", 0.0),
                        "cpm": snap.get("cpm", 0.0),
                        "impressions": snap.get("impressions", 0),
                        "spend": snap.get("spend", 0.0),
                    }
                    if latest_log.action == "promoted":
                        product_winners.append(entry)
                    elif latest_log.action == "paused":
                        product_losers.append(entry)
                except (json.JSONDecodeError, TypeError):
                    pass

        active = status_counts.get("live", 0) + status_counts.get("uploaded", 0)
        paused = status_counts.get("paused", 0)
        total_active += active
        total_paused += paused
        total_winners += len(product_winners)
        total_spend += product_spend
        all_winners.extend(product_winners)
        all_losers.extend(product_losers)

        # Pain point count
        pain_count = db.query(PainPoint).filter(PainPoint.product_id == product.id).count()

        # Recent optimization actions
        recent_actions = (
            db.query(OptimizationLog)
            .filter(OptimizationLog.product_id == product.id)
            .order_by(OptimizationLog.created_at.desc())
            .limit(5)
            .all()
        )

        product_summaries.append({
            "id": product.id,
            "name": product.name,
            "product_type": getattr(product, "product_type", "other"),
            "total_variations": len(variations),
            "status_breakdown": status_counts,
            "active_ads": active,
            "paused_ads": paused,
            "winners": len(product_winners),
            "total_spend": round(product_spend, 2),
            "pain_points_count": pain_count,
            "top_winner": max(product_winners, key=lambda x: x["ctr"], default=None),
            "recent_actions": [
                {
                    "action": log.action,
                    "reason": log.reason,
                    "created_at": log.created_at.isoformat(),
                }
                for log in recent_actions
            ],
        })

    # Content performance overview
    overview = get_overview(db, days=30)

    # Sort winners/losers by CTR
    all_winners.sort(key=lambda x: x["ctr"], reverse=True)
    all_losers.sort(key=lambda x: x["cpm"], reverse=True)

    return {
        "summary": {
            "total_products": len(products),
            "total_active_ads": total_active,
            "total_paused_ads": total_paused,
            "total_winners": total_winners,
            "total_spend": round(total_spend, 2),
            "content_performance": overview,
        },
        "products": product_summaries,
        "top_winners": all_winners[:10],
        "worst_losers": all_losers[:10],
    }


async def get_command_center_with_ai(db: Session) -> dict:
    """Get command center data plus AI-generated strategic recommendations."""
    from app.services.claude_client import call_claude

    data = await get_command_center(db)

    # Build a concise data summary for Claude
    summary_for_ai = {
        "total_products": data["summary"]["total_products"],
        "active_ads": data["summary"]["total_active_ads"],
        "paused_ads": data["summary"]["total_paused_ads"],
        "winners": data["summary"]["total_winners"],
        "total_spend": data["summary"]["total_spend"],
        "products": [
            {
                "name": p["name"],
                "type": p["product_type"],
                "active": p["active_ads"],
                "paused": p["paused_ads"],
                "winners": p["winners"],
                "spend": p["total_spend"],
                "variations": p["total_variations"],
            }
            for p in data["products"]
        ],
        "top_winners": data["top_winners"][:5],
        "worst_losers": data["worst_losers"][:5],
    }

    prompt = f"""You are an ad performance analyst. Analyze this advertising data and give actionable next steps.

Data:
{json.dumps(summary_for_ai, indent=2)}

Provide:
1. A 2-3 sentence executive summary of current ad performance
2. Top 3 immediate actions to take (be specific - name products, cite numbers)
3. Budget recommendations (where to increase, where to cut)
4. What to test next (specific ad angles or audiences)

Return as JSON:
{{
    "executive_summary": "...",
    "immediate_actions": ["action 1", "action 2", "action 3"],
    "budget_recommendations": ["rec 1", "rec 2"],
    "next_tests": ["test 1", "test 2"]
}}

Return ONLY the JSON object."""

    try:
        result = await call_claude(prompt, max_tokens=1024)
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        data["ai_recommendations"] = json.loads(text)
    except Exception:
        data["ai_recommendations"] = {
            "executive_summary": "Unable to generate AI recommendations at this time.",
            "immediate_actions": [],
            "budget_recommendations": [],
            "next_tests": [],
        }

    return data


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
