"""
Intelligence Brief Generator — Tier 5.

Generates periodic intelligence summaries combining competitor insights,
trend signals, hook patterns, evidence, and performance data into an
actionable briefing for the human seat.
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.services.claude_client import call_claude_sync

logger = logging.getLogger(__name__)


def generate_weekly_brief(db: Session, product_id: str) -> dict:
    """Generate a comprehensive weekly intelligence brief.

    Pulls from all intelligence sources: competitors, trends, hooks,
    evidence, and performance data to create an actionable summary.
    """
    from app.models.intelligence import (
        CompetitorProfile,
        EvidenceItem,
        HookPattern,
        IntelligenceBrief,
        TrendSignal,
    )
    from app.models.product import Product
    from app.models.distribution import PerformanceMetric
    from app.models.content import ContentPiece

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"error": "Product not found"}

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # Gather data from all intelligence sources
    # 1. Competitor updates
    competitors = (
        db.query(CompetitorProfile)
        .filter(
            CompetitorProfile.product_id == product_id,
            CompetitorProfile.is_active.is_(True),
        )
        .all()
    )
    competitor_data = []
    for c in competitors:
        if c.latest_snapshot:
            competitor_data.append(f"{c.name}: {c.latest_snapshot[:500]}")

    # 2. Recent trends
    trends = (
        db.query(TrendSignal)
        .filter(
            TrendSignal.product_id == product_id,
            TrendSignal.detected_at > week_ago,
        )
        .order_by(TrendSignal.relevance_score.desc())
        .limit(10)
        .all()
    )
    trend_data = [
        f"[{t.momentum}] {t.title} ({t.category}, relevance: {t.relevance_score}): {t.summary[:200]}"
        for t in trends
    ]

    # 3. Hook patterns
    hooks = (
        db.query(HookPattern)
        .filter(HookPattern.product_id == product_id)
        .order_by(HookPattern.engagement_score.desc())
        .limit(5)
        .all()
    )
    hook_data = [
        f"{h.pattern_name} ({h.pattern_type}): {h.description[:200]}"
        for h in hooks
    ]

    # 4. Evidence
    evidence = (
        db.query(EvidenceItem)
        .filter(EvidenceItem.product_id == product_id)
        .order_by(EvidenceItem.credibility_score.desc())
        .limit(5)
        .all()
    )
    evidence_data = [
        f"{e.evidence_text[:200]} — {e.source_name or 'Unknown source'}"
        for e in evidence
    ]

    # 5. Content performance (last 7 days)
    recent_content = (
        db.query(ContentPiece)
        .filter(
            ContentPiece.product_id == product_id,
            ContentPiece.status == "posted",
        )
        .order_by(ContentPiece.created_at.desc())
        .limit(10)
        .all()
    )

    recent_metrics = (
        db.query(PerformanceMetric)
        .filter(
            PerformanceMetric.collected_at > week_ago,
        )
        .all()
    )

    content_perf = f"{len(recent_content)} posts published, {len(recent_metrics)} metrics collected"

    prompt = f"""Generate a weekly marketing intelligence brief for this product.

PRODUCT: {product.name}
Description: {product.description or 'N/A'}
Target audience: {product.target_audience or 'N/A'}

COMPETITOR INTELLIGENCE ({len(competitor_data)} competitors):
{chr(10).join(competitor_data) if competitor_data else 'No competitor data this week.'}

TREND SIGNALS ({len(trend_data)} detected):
{chr(10).join(trend_data) if trend_data else 'No trends detected this week.'}

TOP HOOK PATTERNS:
{chr(10).join(hook_data) if hook_data else 'No patterns analyzed yet.'}

KEY EVIDENCE:
{chr(10).join(evidence_data) if evidence_data else 'No evidence gathered yet.'}

CONTENT PERFORMANCE:
{content_perf}

Generate a comprehensive but concise weekly brief. Return JSON:
{{
  "title": "Weekly Intelligence Brief — [date range]",
  "summary": "2-3 sentence executive summary of the week's key findings",
  "whats_working": [
    {{"insight": "...", "data_point": "...", "recommendation": "..."}}
  ],
  "competitor_moves": [
    {{"competitor": "...", "action": "...", "implication": "..."}}
  ],
  "trend_alerts": [
    {{"trend": "...", "relevance": "high|medium|low", "suggested_action": "..."}}
  ],
  "evidence_found": [
    {{"claim": "...", "evidence": "...", "source": "..."}}
  ],
  "creative_recommendations": [
    {{"format": "...", "reason": "...", "expected_impact": "high|medium|low"}}
  ],
  "next_actions": [
    {{"action": "...", "priority": "high|medium|low", "rationale": "..."}}
  ]
}}

Be specific, actionable, and data-driven. No fluff."""

    result = call_claude_sync(
        prompt=prompt,
        system="You are a senior marketing strategist delivering a weekly intelligence brief. Return ONLY valid JSON.",
        max_tokens=4096,
    )

    try:
        brief_data = json.loads(result["content"])
    except json.JSONDecodeError:
        content = result["content"]
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            brief_data = json.loads(content[start:end])
        else:
            brief_data = {"title": "Weekly Brief", "summary": result["content"], "next_actions": []}

    # Persist the brief
    brief = IntelligenceBrief(
        product_id=product_id,
        title=brief_data.get("title", f"Weekly Brief — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"),
        period="weekly",
        summary=brief_data.get("summary", ""),
        whats_working=json.dumps(brief_data.get("whats_working", [])),
        competitor_moves=json.dumps(brief_data.get("competitor_moves", [])),
        trend_alerts=json.dumps(brief_data.get("trend_alerts", [])),
        evidence_found=json.dumps(brief_data.get("evidence_found", [])),
        creative_recommendations=json.dumps(brief_data.get("creative_recommendations", [])),
        next_actions=json.dumps(brief_data.get("next_actions", [])),
        status="published",
    )
    db.add(brief)

    # Update config state
    from app.models.intelligence import IntelligenceConfig
    config = db.query(IntelligenceConfig).filter(IntelligenceConfig.product_id == product_id).first()
    if config:
        config.last_brief_generated_at = datetime.now(timezone.utc)

    db.commit()

    logger.info("Generated weekly brief for product %s: %s", product_id, brief.title)

    return {
        "id": brief.id,
        **brief_data,
    }


def run_full_intelligence_cycle(db: Session, product_id: str) -> dict:
    """Run all intelligence engines for a product and generate a brief.

    This is the main entry point called by the scheduler.
    """
    from app.engines.competitor_monitor import scan_all_competitors
    from app.engines.trend_detector import detect_trends
    from app.engines.hook_analyzer import analyze_hooks
    from app.engines.evidence_gatherer import gather_evidence
    from app.models.intelligence import IntelligenceConfig

    config = db.query(IntelligenceConfig).filter(IntelligenceConfig.product_id == product_id).first()

    results = {
        "product_id": product_id,
        "competitor_scan": None,
        "trend_detection": None,
        "hook_analysis": None,
        "evidence_gathering": None,
        "brief": None,
    }

    now = datetime.now(timezone.utc)

    # Run each engine if enabled and due
    if config and config.competitor_monitoring_enabled:
        if not config.last_competitor_scan_at or (
            now - config.last_competitor_scan_at > timedelta(hours=config.competitor_scan_interval_hours)
        ):
            try:
                results["competitor_scan"] = scan_all_competitors(db, product_id)
                config.last_competitor_scan_at = now
            except Exception as e:
                logger.error("Competitor scan failed: %s", e)
                results["competitor_scan"] = {"error": str(e)}

    if config and config.trend_detection_enabled:
        if not config.last_trend_scan_at or (
            now - config.last_trend_scan_at > timedelta(hours=config.trend_scan_interval_hours)
        ):
            try:
                results["trend_detection"] = detect_trends(db, product_id)
                config.last_trend_scan_at = now
            except Exception as e:
                logger.error("Trend detection failed: %s", e)
                results["trend_detection"] = {"error": str(e)}

    if config and config.hook_analysis_enabled:
        if not config.last_hook_analysis_at or (
            now - config.last_hook_analysis_at > timedelta(hours=config.hook_analysis_interval_hours)
        ):
            try:
                results["hook_analysis"] = analyze_hooks(db, product_id)
                config.last_hook_analysis_at = now
            except Exception as e:
                logger.error("Hook analysis failed: %s", e)
                results["hook_analysis"] = {"error": str(e)}

    if config and config.evidence_gathering_enabled:
        if not config.last_evidence_refresh_at or (
            now - config.last_evidence_refresh_at > timedelta(hours=config.evidence_refresh_interval_hours)
        ):
            try:
                results["evidence_gathering"] = gather_evidence(db, product_id)
                config.last_evidence_refresh_at = now
            except Exception as e:
                logger.error("Evidence gathering failed: %s", e)
                results["evidence_gathering"] = {"error": str(e)}

    # Generate brief if enabled
    if not config or config.weekly_brief_enabled:
        if not config or not config.last_brief_generated_at or (
            now - config.last_brief_generated_at > timedelta(days=7)
        ):
            try:
                results["brief"] = generate_weekly_brief(db, product_id)
            except Exception as e:
                logger.error("Brief generation failed: %s", e)
                results["brief"] = {"error": str(e)}

    if config:
        db.commit()

    return results
