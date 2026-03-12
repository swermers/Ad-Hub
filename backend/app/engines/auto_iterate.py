"""Auto-iterate engine — analyzes winning ads and generates the next batch autonomously.

This closes the flywheel loop:
  generate ads → test → optimize (pause losers, promote winners) → analyze winners → generate next batch
"""

import json
import logging
import uuid

from sqlalchemy.orm import Session

from app.engines.generation import generate_ad_variations
from app.models import (
    AdTemplate,
    AdVariation,
    OptimizationConfig,
    OptimizationLog,
    PainPoint,
    Product,
)
from app.services.claude_client import call_claude

logger = logging.getLogger(__name__)

# Minimum winners needed before auto-iterating
MIN_WINNERS_TO_ITERATE = 2
# Minimum losers needed to learn from failures
MIN_LOSERS_TO_LEARN = 1


async def run_auto_iterate(db: Session, product_id: str, config: OptimizationConfig) -> dict:
    """Analyze winning/losing patterns and generate the next batch of ad variations.

    Returns a summary of what was generated or why it was skipped.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"status": "skipped", "reason": "Product not found"}

    # Safety cap check
    if config.iterations_run >= config.max_iterations:
        return {
            "status": "skipped",
            "reason": f"Reached max iterations ({config.max_iterations}). Reset to continue.",
        }

    # Gather winners and losers from optimization logs
    winner_logs = (
        db.query(OptimizationLog)
        .filter(
            OptimizationLog.product_id == product_id,
            OptimizationLog.action == "promoted",
        )
        .order_by(OptimizationLog.created_at.desc())
        .limit(20)
        .all()
    )

    loser_logs = (
        db.query(OptimizationLog)
        .filter(
            OptimizationLog.product_id == product_id,
            OptimizationLog.action == "paused",
        )
        .order_by(OptimizationLog.created_at.desc())
        .limit(20)
        .all()
    )

    if len(winner_logs) < MIN_WINNERS_TO_ITERATE:
        return {
            "status": "skipped",
            "reason": f"Not enough winners yet ({len(winner_logs)}/{MIN_WINNERS_TO_ITERATE}). Need more data.",
        }

    # Build winner/loser data for analysis
    winners = []
    for log in winner_logs:
        variation = db.query(AdVariation).filter(AdVariation.id == log.ad_variation_id).first()
        if variation:
            metrics = json.loads(log.metrics_snapshot) if log.metrics_snapshot else {}
            winners.append({
                "headline": variation.headline,
                "body": variation.body,
                "cta": variation.cta,
                "template_type": variation.template.template_type if variation.template else None,
                "pain_point": variation.pain_point.pain_point if variation.pain_point else None,
                "ctr": metrics.get("ctr", 0),
                "cpm": metrics.get("cpm", 0),
                "impressions": metrics.get("impressions", 0),
            })

    losers = []
    for log in loser_logs:
        variation = db.query(AdVariation).filter(AdVariation.id == log.ad_variation_id).first()
        if variation:
            metrics = json.loads(log.metrics_snapshot) if log.metrics_snapshot else {}
            losers.append({
                "headline": variation.headline,
                "body": variation.body,
                "cta": variation.cta,
                "template_type": variation.template.template_type if variation.template else None,
                "pain_point": variation.pain_point.pain_point if variation.pain_point else None,
                "ctr": metrics.get("ctr", 0),
                "cpm": metrics.get("cpm", 0),
            })

    # Get existing pain points for this product
    pain_points = db.query(PainPoint).filter(PainPoint.product_id == product_id).all()
    if not pain_points:
        return {"status": "skipped", "reason": "No pain points found for product"}

    # Find the most-used template from winners, or fall back to any template
    winner_template_types = [w["template_type"] for w in winners if w["template_type"]]
    best_template_type = max(set(winner_template_types), key=winner_template_types.count) if winner_template_types else "pain_solution"

    template = (
        db.query(AdTemplate)
        .filter(
            AdTemplate.template_type == best_template_type,
            (AdTemplate.product_id == product_id) | (AdTemplate.product_id.is_(None)),
        )
        .first()
    )
    if not template:
        template = db.query(AdTemplate).first()
    if not template:
        return {"status": "skipped", "reason": "No ad templates found"}

    # Ask Claude to analyze patterns and suggest which pain points to focus on
    analysis = await _analyze_and_plan(product, winners, losers, pain_points)

    # Pick pain points to use — prioritize ones Claude recommended, fall back to top-severity
    recommended_pain_ids = analysis.get("focus_pain_point_indices", [])
    if recommended_pain_ids:
        selected_pain_points = [pain_points[i] for i in recommended_pain_ids if i < len(pain_points)]
    else:
        # Fall back: pick top 3 by severity that haven't been used too much
        selected_pain_points = sorted(pain_points, key=lambda p: p.severity, reverse=True)[:3]

    if not selected_pain_points:
        selected_pain_points = pain_points[:3]

    # Generate new variations using the winning patterns as guidance
    batch_id = str(uuid.uuid4())
    new_variations = await _generate_iterated_variations(
        product=product,
        template=template,
        pain_points=selected_pain_points,
        winners=winners,
        losers=losers,
        analysis=analysis,
        variations_per=3,  # fewer per pain point for auto-iterate (controlled exploration)
    )

    # Save to database
    created = 0
    for v in new_variations:
        ad_var = AdVariation(
            product_id=product_id,
            batch_id=batch_id,
            template_id=template.id,
            pain_point_id=v.get("pain_point_id"),
            headline=v["headline"],
            body=v["body"],
            cta=v["cta"],
            status="draft",  # auto-iterate creates drafts — they still need approval or can be auto-approved
        )
        db.add(ad_var)
        created += 1

    # Update iteration counter
    config.iterations_run += 1

    # Log the auto-iterate action
    log = OptimizationLog(
        product_id=product_id,
        action="auto_iterate",
        reason=f"Generated {created} new variations (batch {batch_id}). "
               f"Iteration {config.iterations_run}/{config.max_iterations}. "
               f"Based on {len(winners)} winners, {len(losers)} losers.",
        metrics_snapshot=json.dumps({
            "batch_id": batch_id,
            "variations_created": created,
            "iteration": config.iterations_run,
            "winning_patterns": analysis.get("winning_patterns", [])[:3],
            "template_type": best_template_type,
        }),
    )
    db.add(log)
    db.commit()

    logger.info(
        "Auto-iterate for product %s: generated %d variations (iteration %d/%d)",
        product_id, created, config.iterations_run, config.max_iterations,
    )

    return {
        "status": "generated",
        "batch_id": batch_id,
        "variations_created": created,
        "iteration": config.iterations_run,
        "max_iterations": config.max_iterations,
        "template_used": best_template_type,
        "pain_points_used": len(selected_pain_points),
        "analysis_summary": analysis.get("summary", ""),
    }


async def _analyze_and_plan(product, winners: list, losers: list, pain_points: list) -> dict:
    """Ask Claude to analyze winning/losing patterns and recommend the next iteration strategy."""
    pain_point_list = [
        {"index": i, "pain_point": p.pain_point, "severity": p.severity, "category": p.category}
        for i, p in enumerate(pain_points)
    ]

    prompt = f"""You are an ad performance analyst planning the next iteration of Facebook ad testing.

Product: {product.name}
Description: {product.description}

WINNING ADS (high CTR, kept running):
{json.dumps(winners[:10], indent=2)}

LOSING ADS (paused for poor performance):
{json.dumps(losers[:10], indent=2)}

AVAILABLE PAIN POINTS:
{json.dumps(pain_point_list, indent=2)}

Analyze the patterns and plan the next batch. Return JSON:
{{
    "winning_patterns": ["pattern 1", "pattern 2"],
    "losing_patterns": ["pattern 1", "pattern 2"],
    "focus_pain_point_indices": [0, 2, 4],
    "copy_direction": "specific guidance for the next batch's tone and angle",
    "summary": "2-3 sentence strategy summary"
}}

Pick 2-4 pain point indices to focus on — prioritize ones that align with winning patterns
or unexplored angles. Avoid patterns that consistently lose.

Return ONLY the JSON object."""

    try:
        result = await call_claude(prompt, max_tokens=1024)
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except Exception:
        return {
            "winning_patterns": [],
            "losing_patterns": [],
            "focus_pain_point_indices": [],
            "copy_direction": "Continue testing different angles.",
            "summary": "Unable to analyze patterns. Using default strategy.",
        }


async def _generate_iterated_variations(
    product,
    template,
    pain_points: list,
    winners: list,
    losers: list,
    analysis: dict,
    variations_per: int = 3,
) -> list[dict]:
    """Generate new ad variations informed by winning/losing patterns."""
    from app.engines.vectorstore import get_vectorstore

    vs = get_vectorstore()
    search_query = f"{product.name} {product.description} marketing ads"
    rag_results = vs.query(product.id, search_query, n_results=3)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    brand_brief = ""
    if product.brand_brief:
        try:
            brief = json.loads(product.brand_brief)
            brand_brief = json.dumps(brief, indent=2)
        except json.JSONDecodeError:
            brand_brief = product.brand_brief

    # Build examples from winners
    winner_examples = "\n".join([
        f"  - Headline: \"{w['headline']}\" | Body: \"{w['body']}\" | CTR: {w['ctr']:.2f}%"
        for w in winners[:5]
    ])

    # Build anti-examples from losers
    loser_warnings = "\n".join([
        f"  - Headline: \"{l['headline']}\" | Body: \"{l['body']}\" (FAILED)"
        for l in losers[:5]
    ])

    copy_direction = analysis.get("copy_direction", "Test fresh angles.")
    winning_patterns = ", ".join(analysis.get("winning_patterns", [])[:3]) or "No patterns yet"

    template_type = template.template_type if hasattr(template, "template_type") else "pain_solution"

    system_prompt = f"""You are an expert Facebook ad copywriter running iterative tests.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
{f"Brand Brief: {brand_brief}" if brand_brief else ""}
{f"Product Knowledge: {rag_context}" if rag_context else ""}

WINNING PATTERNS (copy these styles):
{winner_examples}

LOSING PATTERNS (avoid these):
{loser_warnings}

KEY PATTERNS IDENTIFIED: {winning_patterns}

STRATEGIC DIRECTION: {copy_direction}

Ad Template: {template_type}

CONSTRAINTS:
- Headline: max 40 characters
- Body: max 125 characters
- CTA: max 30 characters
- Build on what's working. Iterate, don't repeat.
- Try new angles within the winning style.
- NEVER copy a winning ad exactly — evolve it."""

    all_variations = []

    for pp in pain_points:
        user_prompt = f"""Pain Point: {pp.pain_point}
Desired Outcome: {pp.desired_outcome}

Generate {variations_per} new ad variations for this pain point.
Each should be DIFFERENT from the winners above but inspired by their winning patterns.

Return ONLY a JSON array:
[
    {{
        "headline": "max 40 chars",
        "body": "max 125 chars",
        "cta": "max 30 chars"
    }}
]

Return ONLY the JSON array."""

        result = await call_claude(user_prompt, system=system_prompt)

        try:
            text = result["content"].strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            variations = json.loads(text)
        except (json.JSONDecodeError, IndexError):
            variations = [{"headline": "Check this out", "body": result["content"][:125], "cta": "Learn More"}]

        for v in variations:
            all_variations.append({
                "pain_point_id": pp.id,
                "headline": v.get("headline", "")[:255],
                "body": v.get("body", ""),
                "cta": v.get("cta", "Learn More")[:255],
            })

    return all_variations
