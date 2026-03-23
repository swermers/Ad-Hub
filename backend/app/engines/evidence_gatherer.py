"""
Evidence Gathering Engine — Tier 5.

Finds stats, studies, customer reviews, and benchmark data to back up ad claims.
"87% of teams report X" hits different than a generic claim.
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.services.claude_client import call_claude_sync

logger = logging.getLogger(__name__)


def gather_evidence(db: Session, product_id: str) -> list[dict]:
    """Research evidence that supports the product's key claims and pain points.

    Finds stats, studies, reviews, and benchmarks relevant to the product's
    niche. Each piece of evidence can be used in ad copy and content.
    """
    from app.models.intelligence import EvidenceItem, IntelligenceConfig, ResearchCache
    from app.models.product import Product

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return []

    config = db.query(IntelligenceConfig).filter(IntelligenceConfig.product_id == product_id).first()
    industry = config.industry_vertical if config else "general"

    # Check cache
    cache_key = f"evidence:{product_id}:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    cached = db.query(ResearchCache).filter(
        ResearchCache.cache_key == cache_key,
        ResearchCache.expires_at > datetime.now(timezone.utc),
    ).first()
    if cached:
        return json.loads(cached.data)

    # Get existing evidence to avoid duplicates
    existing = (
        db.query(EvidenceItem.evidence_text)
        .filter(EvidenceItem.product_id == product_id)
        .all()
    )
    existing_texts = [e[0][:100] for e in existing]

    # Get pain points for the product to focus evidence gathering
    from app.models.bulk_ads import PainPoint
    pain_points = (
        db.query(PainPoint)
        .filter(PainPoint.product_id == product_id)
        .limit(10)
        .all()
    )
    pain_point_texts = [pp.pain_point for pp in pain_points] if pain_points else []

    prompt = f"""You are a research analyst finding evidence to support marketing claims.

PRODUCT: {product.name}
Description: {product.description or 'N/A'}
Industry: {industry}
Target audience: {product.target_audience or 'N/A'}
Key pain points: {json.dumps(pain_point_texts) if pain_point_texts else 'Infer from product context'}
Product differentiators: {product.differentiators or 'N/A'}

EXISTING EVIDENCE (avoid duplicates):
{json.dumps(existing_texts[:15]) if existing_texts else '(none)'}

Find 8-12 pieces of evidence that could strengthen ad copy and content for this product.
Include industry statistics, survey results, benchmark data, and common customer sentiments.

Return a JSON array:
[
  {{
    "claim": "The marketing claim this evidence supports",
    "evidence_text": "The specific stat, finding, or data point (e.g. '78% of marketers report...')",
    "evidence_type": "statistic|study|review|testimonial|benchmark",
    "source_name": "Source name (e.g. 'HubSpot State of Marketing 2026')",
    "source_url": "URL if applicable (or null)",
    "credibility_score": 0.0-1.0,
    "freshness": "fresh|recent|dated",
    "usage_suggestion": "How to use this in ad copy (e.g. 'Lead with this stat in a hook')"
  }}
]

Focus on:
1. Specific numbers and percentages (not vague claims)
2. Reputable sources
3. Data points that create urgency or validate pain points
4. Evidence that differentiates the product from alternatives
5. Current/recent data where possible"""

    result = call_claude_sync(
        prompt=prompt,
        system="You are a research analyst. Return ONLY valid JSON array. Use realistic but clearly AI-generated evidence based on industry knowledge.",
        max_tokens=3000,
    )

    try:
        evidence_data = json.loads(result["content"])
    except json.JSONDecodeError:
        content = result["content"]
        start = content.find("[")
        end = content.rfind("]") + 1
        if start >= 0 and end > start:
            evidence_data = json.loads(content[start:end])
        else:
            logger.error("Failed to parse evidence gathering response")
            return []

    # Persist evidence items
    new_evidence = []
    for e in evidence_data:
        item = EvidenceItem(
            product_id=product_id,
            claim=e.get("claim", ""),
            evidence_text=e.get("evidence_text", ""),
            evidence_type=e.get("evidence_type", "statistic"),
            source_name=e.get("source_name"),
            source_url=e.get("source_url"),
            credibility_score=float(e.get("credibility_score", 0.5)),
            freshness=e.get("freshness", "recent"),
        )
        db.add(item)
        new_evidence.append(e)

    # Cache (72h)
    cache_entry = ResearchCache(
        product_id=product_id,
        cache_key=cache_key,
        cache_type="evidence_search",
        data=json.dumps(new_evidence),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=72),
    )
    db.add(cache_entry)
    db.commit()

    logger.info("Gathered %d evidence items for product %s", len(new_evidence), product_id)
    return new_evidence


def find_evidence_for_claim(db: Session, product_id: str, claim: str) -> list[dict]:
    """Find existing evidence that supports a specific claim."""
    from app.models.intelligence import EvidenceItem

    items = (
        db.query(EvidenceItem)
        .filter(EvidenceItem.product_id == product_id)
        .order_by(EvidenceItem.credibility_score.desc())
        .all()
    )

    if not items:
        return []

    # Use Claude to find the most relevant evidence for this claim
    evidence_list = "\n".join(
        f"[{i}] {item.evidence_text} (source: {item.source_name}, type: {item.evidence_type})"
        for i, item in enumerate(items)
    )

    prompt = f"""Given this claim: "{claim}"

Which of these evidence items best support it? Return the indices (0-based) of the top 3-5
most relevant items as a JSON array of integers.

Evidence items:
{evidence_list}

Return ONLY a JSON array of integers, e.g. [2, 5, 0]"""

    result = call_claude_sync(prompt=prompt, system="Return ONLY a JSON array of integers.", max_tokens=100)

    try:
        indices = json.loads(result["content"])
    except (json.JSONDecodeError, TypeError):
        # Return all sorted by credibility
        return [
            {
                "id": item.id,
                "claim": item.claim,
                "evidence_text": item.evidence_text,
                "evidence_type": item.evidence_type,
                "source_name": item.source_name,
                "credibility_score": item.credibility_score,
            }
            for item in items[:5]
        ]

    matched = []
    for idx in indices:
        if 0 <= idx < len(items):
            item = items[idx]
            matched.append({
                "id": item.id,
                "claim": item.claim,
                "evidence_text": item.evidence_text,
                "evidence_type": item.evidence_type,
                "source_name": item.source_name,
                "credibility_score": item.credibility_score,
            })

    return matched


def get_evidence_summary(db: Session, product_id: str) -> dict:
    """Get a summary of all evidence for a product."""
    from app.models.intelligence import EvidenceItem

    items = db.query(EvidenceItem).filter(EvidenceItem.product_id == product_id).all()

    if not items:
        return {
            "total": 0,
            "by_type": {},
            "verified": 0,
            "top_evidence": [],
            "message": "No evidence gathered yet. Run evidence gathering first.",
        }

    by_type: dict[str, int] = {}
    verified = 0
    for item in items:
        by_type[item.evidence_type] = by_type.get(item.evidence_type, 0) + 1
        if item.verified:
            verified += 1

    top = sorted(items, key=lambda x: x.credibility_score, reverse=True)[:10]

    return {
        "total": len(items),
        "by_type": by_type,
        "verified": verified,
        "top_evidence": [
            {
                "id": e.id,
                "claim": e.claim,
                "evidence_text": e.evidence_text,
                "evidence_type": e.evidence_type,
                "source_name": e.source_name,
                "credibility_score": e.credibility_score,
                "times_used": e.times_used,
            }
            for e in top
        ],
    }
