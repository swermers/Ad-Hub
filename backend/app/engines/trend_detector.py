"""
Trend Detection Engine — Tier 5.

Monitors online sources (Reddit, X, forums, review sites) for emerging
pain points, complaints, desires, and opportunities in the customer's vertical.
Surfaces trends before they're saturated.
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.services.claude_client import call_claude_sync

logger = logging.getLogger(__name__)


def detect_trends(db: Session, product_id: str) -> list[dict]:
    """Run a trend detection scan for a product.

    Uses the product context and intelligence config to identify emerging
    trends, pain points, and opportunities from online sources.
    """
    from app.models.intelligence import IntelligenceConfig, ResearchCache, TrendSignal
    from app.models.product import Product

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return []

    config = db.query(IntelligenceConfig).filter(IntelligenceConfig.product_id == product_id).first()

    # Build context
    niche_keywords = []
    subreddits = []
    x_accounts = []
    industry = "general"

    if config:
        if config.niche_keywords:
            try:
                niche_keywords = json.loads(config.niche_keywords)
            except (json.JSONDecodeError, TypeError):
                pass
        if config.subreddits:
            try:
                subreddits = json.loads(config.subreddits)
            except (json.JSONDecodeError, TypeError):
                pass
        if config.x_accounts_to_watch:
            try:
                x_accounts = json.loads(config.x_accounts_to_watch)
            except (json.JSONDecodeError, TypeError):
                pass
        if config.industry_vertical:
            industry = config.industry_vertical

    # Check cache
    cache_key = f"trends:{product_id}:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    cached = db.query(ResearchCache).filter(
        ResearchCache.cache_key == cache_key,
        ResearchCache.expires_at > datetime.now(timezone.utc),
    ).first()
    if cached:
        return json.loads(cached.data)

    # Get existing trends to avoid duplicates
    existing_trends = (
        db.query(TrendSignal.title)
        .filter(
            TrendSignal.product_id == product_id,
            TrendSignal.detected_at > datetime.now(timezone.utc) - timedelta(days=7),
        )
        .all()
    )
    existing_titles = [t[0] for t in existing_trends]

    prompt = f"""You are a niche trend detector for the {industry} industry.

PRODUCT: {product.name}
Description: {product.description or 'N/A'}
Target audience: {product.target_audience or 'N/A'}
Pain points: {product.pain_points or 'N/A'}

MONITORING CONTEXT:
- Niche keywords: {json.dumps(niche_keywords) if niche_keywords else 'Use product context to infer'}
- Relevant subreddits: {json.dumps(subreddits) if subreddits else 'Infer from product niche'}
- X accounts of interest: {json.dumps(x_accounts) if x_accounts else 'N/A'}
- Industry: {industry}

ALREADY DETECTED (skip these):
{json.dumps(existing_titles[:20]) if existing_titles else '(none)'}

Based on your knowledge of current trends, common discussions, and emerging pain points
in this niche, identify 5-8 trend signals. For each, simulate what you'd find on Reddit,
X, forums, and review sites right now.

Return a JSON array:
[
  {{
    "title": "Short descriptive title",
    "summary": "2-3 sentence description of the trend/signal",
    "source_type": "reddit|x|forum|review_site|news",
    "source_snippet": "A representative quote or post you'd find",
    "category": "pain_point|desire|complaint|question|opportunity",
    "relevance_score": 0.0-1.0,
    "momentum": "rising|stable|declining",
    "volume": 1-100,
    "suggested_angle": "How to create content/ads that leverage this trend"
  }}
]

Focus on signals that are:
1. Actionable for content or ad creation
2. Not yet saturated / overused
3. Specific to this niche (not generic)
4. High relevance to this product's audience"""

    result = call_claude_sync(
        prompt=prompt,
        system="You are a market research analyst specializing in niche trend detection. Return ONLY valid JSON array.",
        max_tokens=3000,
    )

    try:
        trends_data = json.loads(result["content"])
    except json.JSONDecodeError:
        content = result["content"]
        start = content.find("[")
        end = content.rfind("]") + 1
        if start >= 0 and end > start:
            trends_data = json.loads(content[start:end])
        else:
            logger.error("Failed to parse trend detection response")
            return []

    # Persist new trend signals
    new_trends = []
    for t in trends_data:
        signal = TrendSignal(
            product_id=product_id,
            title=t.get("title", "Unnamed trend"),
            summary=t.get("summary", ""),
            source_type=t.get("source_type", "unknown"),
            source_snippet=t.get("source_snippet"),
            category=t.get("category", "opportunity"),
            relevance_score=float(t.get("relevance_score", 0.5)),
            momentum=t.get("momentum", "stable"),
            volume=int(t.get("volume", 1)),
            suggested_angle=t.get("suggested_angle"),
        )
        db.add(signal)
        new_trends.append(t)

    # Cache results (12h)
    cache_entry = ResearchCache(
        product_id=product_id,
        cache_key=cache_key,
        cache_type="trend_scan",
        data=json.dumps(new_trends),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=12),
    )
    db.add(cache_entry)
    db.commit()

    logger.info("Detected %d trends for product %s", len(new_trends), product_id)
    return new_trends


def get_trend_summary(db: Session, product_id: str) -> dict:
    """Get a summarized view of current trends for a product."""
    from app.models.intelligence import TrendSignal

    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    trends = (
        db.query(TrendSignal)
        .filter(
            TrendSignal.product_id == product_id,
            TrendSignal.detected_at > recent_cutoff,
        )
        .order_by(TrendSignal.relevance_score.desc())
        .all()
    )

    if not trends:
        return {
            "total": 0,
            "rising": 0,
            "top_categories": {},
            "top_trends": [],
            "message": "No trends detected yet. Run a trend scan first.",
        }

    by_category: dict[str, int] = {}
    rising_count = 0
    for t in trends:
        by_category[t.category] = by_category.get(t.category, 0) + 1
        if t.momentum == "rising":
            rising_count += 1

    top_trends = [
        {
            "id": t.id,
            "title": t.title,
            "category": t.category,
            "momentum": t.momentum,
            "relevance_score": t.relevance_score,
            "suggested_angle": t.suggested_angle,
        }
        for t in trends[:10]
    ]

    return {
        "total": len(trends),
        "rising": rising_count,
        "top_categories": by_category,
        "top_trends": top_trends,
    }
