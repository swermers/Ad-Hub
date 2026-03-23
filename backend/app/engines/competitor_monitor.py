"""
Competitor Monitoring Engine — Tier 5.

Crawls competitor websites, analyzes their messaging, and tracks their
ad activity to surface strategic insights for the human seat.
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.services.claude_client import call_claude_sync

logger = logging.getLogger(__name__)


def scan_competitor(db: Session, competitor_id: str) -> dict:
    """Crawl and analyze a single competitor.

    Returns a snapshot dict with headlines, offers, CTAs, and messaging angles.
    """
    from app.models.intelligence import CompetitorProfile, ResearchCache

    competitor = db.query(CompetitorProfile).filter(CompetitorProfile.id == competitor_id).first()
    if not competitor:
        return {"error": "Competitor not found"}

    # Check cache first
    cache_key = f"competitor:{competitor.id}:scan:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    cached = db.query(ResearchCache).filter(
        ResearchCache.cache_key == cache_key,
        ResearchCache.expires_at > datetime.now(timezone.utc),
    ).first()
    if cached:
        return json.loads(cached.data)

    # Build analysis prompt from available data
    context_parts = [f"Competitor: {competitor.name}"]
    if competitor.website_url:
        context_parts.append(f"Website: {competitor.website_url}")
    if competitor.description:
        context_parts.append(f"Description: {competitor.description}")
    if competitor.social_urls:
        context_parts.append(f"Social profiles: {competitor.social_urls}")
    if competitor.latest_snapshot:
        context_parts.append(f"Previous snapshot: {competitor.latest_snapshot}")

    prompt = f"""Analyze this competitor and produce a strategic intelligence snapshot.

{chr(10).join(context_parts)}

Provide a JSON response with these fields:
{{
  "messaging_angles": ["list of their key messaging angles/positioning"],
  "value_propositions": ["their main value props"],
  "target_audience": "who they seem to be targeting",
  "tone_and_style": "description of their brand voice",
  "common_ctas": ["list of CTAs they use"],
  "pricing_signals": "any pricing info or signals",
  "strengths": ["competitive strengths"],
  "weaknesses": ["potential weaknesses or gaps"],
  "opportunities": ["angles we could exploit against them"],
  "recent_changes": "any notable recent changes in their approach"
}}

Be specific and actionable. Base analysis on available data."""

    result = call_claude_sync(
        prompt=prompt,
        system="You are a competitive intelligence analyst. Return ONLY valid JSON, no markdown.",
        max_tokens=2048,
    )

    try:
        snapshot = json.loads(result["content"])
    except json.JSONDecodeError:
        # Try to extract JSON from response
        content = result["content"]
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            snapshot = json.loads(content[start:end])
        else:
            snapshot = {"raw_analysis": content}

    # Update competitor record
    competitor.latest_snapshot = json.dumps(snapshot)
    competitor.last_crawled_at = datetime.now(timezone.utc)

    # Cache the result (24h)
    cache_entry = ResearchCache(
        product_id=competitor.product_id,
        cache_key=cache_key,
        cache_type="competitor_crawl",
        data=json.dumps(snapshot),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(cache_entry)
    db.commit()

    return snapshot


def scan_all_competitors(db: Session, product_id: str) -> list[dict]:
    """Scan all active competitors for a product."""
    from app.models.intelligence import CompetitorProfile

    competitors = (
        db.query(CompetitorProfile)
        .filter(
            CompetitorProfile.product_id == product_id,
            CompetitorProfile.is_active.is_(True),
        )
        .all()
    )

    results = []
    for competitor in competitors:
        try:
            snapshot = scan_competitor(db, competitor.id)
            results.append({
                "competitor_id": competitor.id,
                "name": competitor.name,
                "snapshot": snapshot,
            })
        except Exception as e:
            logger.error("Failed to scan competitor %s: %s", competitor.name, e)
            results.append({
                "competitor_id": competitor.id,
                "name": competitor.name,
                "error": str(e),
            })

    return results


def compare_competitors(db: Session, product_id: str) -> dict:
    """Generate a comparative analysis across all tracked competitors."""
    from app.models.intelligence import CompetitorProfile
    from app.models.product import Product

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"error": "Product not found"}

    competitors = (
        db.query(CompetitorProfile)
        .filter(
            CompetitorProfile.product_id == product_id,
            CompetitorProfile.is_active.is_(True),
            CompetitorProfile.latest_snapshot.isnot(None),
        )
        .all()
    )

    if not competitors:
        return {"error": "No competitor data available. Add and scan competitors first."}

    competitor_data = []
    for c in competitors:
        competitor_data.append(f"**{c.name}**:\n{c.latest_snapshot}")

    prompt = f"""Compare these competitors against our product and identify strategic opportunities.

OUR PRODUCT: {product.name}
Description: {product.description or 'N/A'}
Target audience: {product.target_audience or 'N/A'}

COMPETITORS:
{chr(10).join(competitor_data)}

Return a JSON response:
{{
  "competitive_landscape": "overview of the competitive landscape",
  "our_unique_advantages": ["what we do that they don't"],
  "gaps_to_fill": ["where we're behind"],
  "messaging_opportunities": ["angles they're not using that we could own"],
  "pricing_position": "how we're positioned on price",
  "recommended_angles": [
    {{"angle": "...", "rationale": "...", "target_competitor": "..."}}
  ]
}}"""

    result = call_claude_sync(
        prompt=prompt,
        system="You are a competitive strategist. Return ONLY valid JSON.",
        max_tokens=2048,
    )

    try:
        analysis = json.loads(result["content"])
    except json.JSONDecodeError:
        content = result["content"]
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            analysis = json.loads(content[start:end])
        else:
            analysis = {"raw_analysis": content}

    return analysis
