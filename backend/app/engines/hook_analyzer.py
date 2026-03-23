"""
Hook & Copy Pattern Analyzer — Tier 5.

Scrapes top-performing posts in the niche, reverse-engineers structural patterns.
Not copying — learning *why* they work (tension, specificity, open loops, etc.)
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.services.claude_client import call_claude_sync

logger = logging.getLogger(__name__)


def analyze_hooks(db: Session, product_id: str, platform: str = "all") -> list[dict]:
    """Analyze hook and copy patterns for a product's niche.

    Identifies structural patterns from top-performing content and creates
    reusable templates the bot can use for future generation.
    """
    from app.models.intelligence import HookPattern, IntelligenceConfig, ResearchCache
    from app.models.product import Product

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return []

    config = db.query(IntelligenceConfig).filter(IntelligenceConfig.product_id == product_id).first()

    # Check cache
    cache_key = f"hooks:{product_id}:{platform}:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    cached = db.query(ResearchCache).filter(
        ResearchCache.cache_key == cache_key,
        ResearchCache.expires_at > datetime.now(timezone.utc),
    ).first()
    if cached:
        return json.loads(cached.data)

    # Get existing patterns to avoid duplicates
    existing_patterns = (
        db.query(HookPattern.pattern_name)
        .filter(HookPattern.product_id == product_id)
        .all()
    )
    existing_names = [p[0] for p in existing_patterns]

    industry = config.industry_vertical if config else "general"
    niche_keywords = []
    if config and config.niche_keywords:
        try:
            niche_keywords = json.loads(config.niche_keywords)
        except (json.JSONDecodeError, TypeError):
            pass

    platforms_to_analyze = (
        ["x", "linkedin", "meta_ads", "instagram"]
        if platform == "all"
        else [platform]
    )

    prompt = f"""You are a world-class copywriting analyst specializing in the {industry} niche.

PRODUCT: {product.name}
Description: {product.description or 'N/A'}
Target audience: {product.target_audience or 'N/A'}
Niche keywords: {json.dumps(niche_keywords) if niche_keywords else 'Infer from product'}
Platforms: {', '.join(platforms_to_analyze)}

EXISTING PATTERNS (skip these):
{json.dumps(existing_names[:20]) if existing_names else '(none)'}

Analyze top-performing content in this niche and reverse-engineer the hook and copy
patterns that make them work. For each pattern, explain the psychological mechanism
and provide a reusable template.

Return a JSON array of 6-10 patterns:
[
  {{
    "pattern_name": "Short name (e.g. 'Contrarian Open Loop')",
    "pattern_type": "hook|cta|structure|angle|format",
    "description": "Why this pattern works psychologically (tension, curiosity, specificity, etc.)",
    "example": "A real-looking example from top content in this niche",
    "template": "Fill-in-the-blank template: '[Number] [niche] [professionals] are switching from [old] to [new]. Here's why:'",
    "source_platform": "x|linkedin|meta_ads|instagram",
    "engagement_score": 0.0-1.0
  }}
]

Focus on patterns that are:
1. Proven to drive engagement in this specific niche
2. Adaptable across content types (ads, posts, emails)
3. Not overused / still effective
4. Psychologically grounded (explain the mechanism)"""

    result = call_claude_sync(
        prompt=prompt,
        system="You are an expert copywriting analyst. Return ONLY valid JSON array.",
        max_tokens=3000,
    )

    try:
        patterns_data = json.loads(result["content"])
    except json.JSONDecodeError:
        content = result["content"]
        start = content.find("[")
        end = content.rfind("]") + 1
        if start >= 0 and end > start:
            patterns_data = json.loads(content[start:end])
        else:
            logger.error("Failed to parse hook analysis response")
            return []

    # Persist patterns
    new_patterns = []
    for p in patterns_data:
        pattern = HookPattern(
            product_id=product_id,
            pattern_name=p.get("pattern_name", "Unnamed"),
            pattern_type=p.get("pattern_type", "hook"),
            description=p.get("description", ""),
            example=p.get("example", ""),
            template=p.get("template"),
            source_platform=p.get("source_platform", "x"),
            engagement_score=float(p.get("engagement_score", 0.5)),
        )
        db.add(pattern)
        new_patterns.append(p)

    # Cache (48h)
    cache_entry = ResearchCache(
        product_id=product_id,
        cache_key=cache_key,
        cache_type="hook_analysis",
        data=json.dumps(new_patterns),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
    )
    db.add(cache_entry)
    db.commit()

    logger.info("Analyzed %d hook patterns for product %s", len(new_patterns), product_id)
    return new_patterns


def get_best_patterns(db: Session, product_id: str, pattern_type: str | None = None, limit: int = 10) -> list[dict]:
    """Get the highest-performing hook patterns for a product.

    Factors in both the initial engagement score and our actual performance
    when using the pattern.
    """
    from app.models.intelligence import HookPattern

    query = db.query(HookPattern).filter(HookPattern.product_id == product_id)
    if pattern_type:
        query = query.filter(HookPattern.pattern_type == pattern_type)

    patterns = query.order_by(HookPattern.engagement_score.desc()).limit(limit).all()

    return [
        {
            "id": p.id,
            "pattern_name": p.pattern_name,
            "pattern_type": p.pattern_type,
            "description": p.description,
            "example": p.example,
            "template": p.template,
            "source_platform": p.source_platform,
            "engagement_score": p.engagement_score,
            "times_used": p.times_used,
            "avg_performance": p.avg_performance,
        }
        for p in patterns
    ]


def suggest_hooks_for_topic(db: Session, product_id: str, topic: str) -> list[dict]:
    """Given a topic, suggest hooks using the best patterns in our library."""
    from app.models.intelligence import HookPattern
    from app.models.product import Product

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return []

    # Get top patterns
    patterns = (
        db.query(HookPattern)
        .filter(HookPattern.product_id == product_id)
        .order_by(HookPattern.engagement_score.desc())
        .limit(5)
        .all()
    )

    if not patterns:
        return []

    patterns_context = "\n".join(
        f"- {p.pattern_name}: {p.template or p.example}" for p in patterns
    )

    prompt = f"""Generate 5 hooks for this topic using our proven patterns.

PRODUCT: {product.name}
TOPIC: {topic}
TARGET AUDIENCE: {product.target_audience or 'N/A'}

TOP PERFORMING PATTERNS:
{patterns_context}

For each hook, apply one of the patterns to the topic. Return JSON array:
[
  {{
    "hook": "The actual hook text",
    "pattern_used": "Name of the pattern applied",
    "platform": "Best platform for this hook",
    "why_it_works": "Brief explanation"
  }}
]"""

    result = call_claude_sync(
        prompt=prompt,
        system="You are an expert copywriter. Return ONLY valid JSON array.",
        max_tokens=1500,
    )

    try:
        hooks = json.loads(result["content"])
    except json.JSONDecodeError:
        content = result["content"]
        start = content.find("[")
        end = content.rfind("]") + 1
        if start >= 0 and end > start:
            hooks = json.loads(content[start:end])
        else:
            return []

    return hooks
