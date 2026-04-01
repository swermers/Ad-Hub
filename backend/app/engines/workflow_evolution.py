"""Workflow Evolution Engine — auto-evolves content workflows based on performance.

Mirrors the auto_iterate.py pattern for ads, but for content workflow prompts.
The loop:
  1. Aggregate performance metrics for each workflow version
  2. Identify top/bottom performing content per workflow type
  3. Ask Claude to analyze winning/losing patterns
  4. Generate improved step prompts for a new workflow version
  5. Activate the new version (old version deactivated but kept for comparison)

This runs as part of the feedback loop in the autonomous cycle.
"""

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import ContentPiece, PerformanceMetric, ScheduledPost
from app.models.content_workflow import ContentTypeWorkflow
from app.services.claude_client import call_claude

logger = logging.getLogger(__name__)

# Minimum content pieces with metrics before we try to evolve
MIN_PIECES_TO_EVOLVE = 5
# Minimum pieces that must have good engagement to identify winners
MIN_WINNERS = 2


async def aggregate_workflow_metrics(db: Session, product_id: str) -> dict:
    """Aggregate performance metrics from published content back to workflow versions.

    Reads generation_metadata.workflow_type and workflow_version from ContentPiece,
    joins with PerformanceMetric, and updates ContentTypeWorkflow stats.

    Returns summary of what was updated.
    """
    # Get all content pieces for this product that have been published and have metrics
    pieces_with_metrics = (
        db.query(
            ContentPiece.id,
            ContentPiece.generation_metadata,
            ContentPiece.content_type,
            ContentPiece.platform,
            PerformanceMetric.impressions,
            PerformanceMetric.clicks,
            PerformanceMetric.likes,
            PerformanceMetric.shares,
            PerformanceMetric.comments,
            PerformanceMetric.ctr,
        )
        .join(PerformanceMetric, PerformanceMetric.content_id == ContentPiece.id)
        .filter(ContentPiece.product_id == product_id)
        .all()
    )

    if not pieces_with_metrics:
        return {"status": "skipped", "reason": "No published content with metrics"}

    # Group metrics by (workflow_type, workflow_version)
    version_metrics: dict[tuple[str, int], list[dict]] = {}

    for row in pieces_with_metrics:
        meta = {}
        if row.generation_metadata:
            try:
                meta = json.loads(row.generation_metadata)
            except (json.JSONDecodeError, TypeError):
                pass

        wf_type = meta.get("workflow_type", row.content_type or "unknown")
        wf_version = meta.get("workflow_version", 1)
        key = (wf_type, wf_version)

        if key not in version_metrics:
            version_metrics[key] = []

        engagement = (row.likes or 0) + (row.shares or 0) + (row.comments or 0)
        impressions = row.impressions or 0
        engagement_rate = (engagement / impressions * 100) if impressions > 0 else 0.0

        version_metrics[key].append({
            "impressions": impressions,
            "clicks": row.clicks or 0,
            "engagement_rate": engagement_rate,
            "ctr": row.ctr or 0.0,
        })

    # Update ContentTypeWorkflow records
    updated = 0
    for (wf_type, wf_version), metrics_list in version_metrics.items():
        workflow = (
            db.query(ContentTypeWorkflow)
            .filter(
                ContentTypeWorkflow.product_id == product_id,
                ContentTypeWorkflow.workflow_type == wf_type,
                ContentTypeWorkflow.version == wf_version,
            )
            .first()
        )

        if not workflow:
            # Create a tracking record if one doesn't exist
            workflow = ContentTypeWorkflow(
                id=str(uuid.uuid4()),
                product_id=product_id,
                workflow_type=wf_type,
                version=wf_version,
                is_active=(wf_version == max(v for (t, v) in version_metrics if t == wf_type)),
            )
            db.add(workflow)

        n = len(metrics_list)
        workflow.total_pieces_generated = n
        workflow.avg_engagement_rate = sum(m["engagement_rate"] for m in metrics_list) / n
        workflow.avg_impressions = sum(m["impressions"] for m in metrics_list) / n
        workflow.avg_clicks = sum(m["clicks"] for m in metrics_list) / n
        workflow.updated_at = datetime.now(timezone.utc)
        updated += 1

    # Calculate win rates (compare versions within the same workflow type)
    workflow_types_seen = set(wf_type for wf_type, _ in version_metrics)
    for wf_type in workflow_types_seen:
        type_versions = {v: version_metrics[(wf_type, v)] for (t, v) in version_metrics if t == wf_type}
        if len(type_versions) < 2:
            continue

        # Compare each version's avg engagement rate against the previous version
        sorted_versions = sorted(type_versions.keys())
        for i in range(1, len(sorted_versions)):
            curr_v = sorted_versions[i]
            prev_v = sorted_versions[i - 1]

            curr_avg = sum(m["engagement_rate"] for m in type_versions[curr_v]) / len(type_versions[curr_v])
            prev_avg = sum(m["engagement_rate"] for m in type_versions[prev_v]) / len(type_versions[prev_v])

            win_rate = (curr_avg / prev_avg * 100) if prev_avg > 0 else 100.0

            wf = (
                db.query(ContentTypeWorkflow)
                .filter(
                    ContentTypeWorkflow.product_id == product_id,
                    ContentTypeWorkflow.workflow_type == wf_type,
                    ContentTypeWorkflow.version == curr_v,
                )
                .first()
            )
            if wf:
                wf.win_rate = win_rate

    db.commit()

    return {
        "status": "updated",
        "workflow_versions_updated": updated,
        "total_pieces_analyzed": len(pieces_with_metrics),
    }


async def evolve_workflow(db: Session, product_id: str, workflow_type: str) -> dict:
    """Analyze performance data and create an evolved workflow version.

    This is the core evolution step:
    1. Load top and bottom performing content for this workflow type
    2. Load the current active workflow's step prompts
    3. Ask Claude to analyze patterns and suggest improved prompts
    4. Create a new workflow version with the improved prompts

    Returns the new version info or skip reason.
    """
    from app.engines.workflow_defaults import get_workflow_info

    # Get current active workflow
    current_workflow = (
        db.query(ContentTypeWorkflow)
        .filter(
            ContentTypeWorkflow.product_id == product_id,
            ContentTypeWorkflow.workflow_type == workflow_type,
            ContentTypeWorkflow.is_active.is_(True),
        )
        .first()
    )

    current_version = current_workflow.version if current_workflow else 1

    # Get content pieces for this workflow type with performance data
    pieces = (
        db.query(ContentPiece, PerformanceMetric)
        .join(PerformanceMetric, PerformanceMetric.content_id == ContentPiece.id)
        .filter(ContentPiece.product_id == product_id)
        .all()
    )

    # Filter to pieces generated by this workflow type
    typed_pieces = []
    for piece, metric in pieces:
        meta = {}
        if piece.generation_metadata:
            try:
                meta = json.loads(piece.generation_metadata)
            except (json.JSONDecodeError, TypeError):
                pass

        piece_wf_type = meta.get("workflow_type", piece.content_type)
        if piece_wf_type == workflow_type:
            engagement = (metric.likes or 0) + (metric.shares or 0) + (metric.comments or 0)
            impressions = metric.impressions or 0
            engagement_rate = (engagement / impressions * 100) if impressions > 0 else 0.0

            typed_pieces.append({
                "body": piece.body[:500],
                "hook": piece.hook,
                "cta": piece.cta,
                "platform": piece.platform,
                "impressions": impressions,
                "clicks": metric.clicks or 0,
                "engagement_rate": round(engagement_rate, 2),
                "ctr": round(metric.ctr or 0.0, 2),
                "likes": metric.likes or 0,
                "shares": metric.shares or 0,
                "comments": metric.comments or 0,
            })

    if len(typed_pieces) < MIN_PIECES_TO_EVOLVE:
        return {
            "status": "skipped",
            "reason": f"Not enough data ({len(typed_pieces)}/{MIN_PIECES_TO_EVOLVE} pieces with metrics)",
        }

    # Sort by engagement rate to identify winners and losers
    typed_pieces.sort(key=lambda x: x["engagement_rate"], reverse=True)
    winners = typed_pieces[:5]
    losers = typed_pieces[-5:] if len(typed_pieces) > 5 else []

    if len([w for w in winners if w["engagement_rate"] > 0]) < MIN_WINNERS:
        return {
            "status": "skipped",
            "reason": "Not enough winning content to identify patterns",
        }

    # Get current step prompts (from DB workflow or defaults)
    current_prompts = {}
    if current_workflow and current_workflow.step_prompts:
        try:
            current_prompts = json.loads(current_workflow.step_prompts)
        except (json.JSONDecodeError, TypeError):
            pass

    # Get default workflow info for step descriptions
    wf_info = get_workflow_info(workflow_type)
    step_descriptions = wf_info.get("steps", {}) if wf_info else {}

    # Ask Claude to analyze and suggest improvements
    analysis = await _analyze_and_evolve(
        workflow_type=workflow_type,
        winners=winners,
        losers=losers,
        current_prompts=current_prompts,
        step_descriptions=step_descriptions,
        current_version=current_version,
    )

    if not analysis or not analysis.get("improved_prompts"):
        return {"status": "skipped", "reason": "Claude could not identify improvements"}

    # Create new workflow version
    new_version = current_version + 1

    # Deactivate current version
    if current_workflow:
        current_workflow.is_active = False

    new_workflow = ContentTypeWorkflow(
        id=str(uuid.uuid4()),
        product_id=product_id,
        workflow_type=workflow_type,
        version=new_version,
        is_active=True,
        step_prompts=json.dumps(analysis["improved_prompts"]),
        quality_gate_rules=json.dumps(analysis.get("improved_gates", {})),
        parent_version=current_version,
        evolution_notes=analysis.get("evolution_summary", "Auto-evolved based on performance data"),
        total_pieces_generated=0,
    )
    db.add(new_workflow)
    db.commit()

    logger.info(
        "Evolved workflow %s for product %s: v%d → v%d. %s",
        workflow_type, product_id, current_version, new_version,
        analysis.get("evolution_summary", ""),
    )

    return {
        "status": "evolved",
        "workflow_type": workflow_type,
        "old_version": current_version,
        "new_version": new_version,
        "evolution_summary": analysis.get("evolution_summary", ""),
        "patterns_found": {
            "winning": analysis.get("winning_patterns", []),
            "losing": analysis.get("losing_patterns", []),
        },
    }


async def run_evolution_cycle(db: Session, product_id: str) -> dict:
    """Run a full evolution cycle: aggregate metrics, then evolve each workflow type.

    This is meant to be called from the autonomous feedback loop.
    """
    # Step 1: Aggregate metrics
    agg_result = await aggregate_workflow_metrics(db, product_id)

    # Step 2: Find workflow types that have enough data to evolve
    workflow_types_with_data = (
        db.query(ContentTypeWorkflow.workflow_type)
        .filter(
            ContentTypeWorkflow.product_id == product_id,
            ContentTypeWorkflow.total_pieces_generated >= MIN_PIECES_TO_EVOLVE,
        )
        .distinct()
        .all()
    )

    evolution_results = {}
    for (wf_type,) in workflow_types_with_data:
        result = await evolve_workflow(db, product_id, wf_type)
        evolution_results[wf_type] = result

    return {
        "aggregation": agg_result,
        "evolutions": evolution_results,
        "workflow_types_analyzed": len(workflow_types_with_data),
    }


async def _analyze_and_evolve(
    workflow_type: str,
    winners: list[dict],
    losers: list[dict],
    current_prompts: dict,
    step_descriptions: dict,
    current_version: int,
) -> dict:
    """Ask Claude to analyze performance patterns and suggest improved prompts."""

    prompt = f"""You are a content strategy analyst evolving a multi-step content generation workflow.

WORKFLOW TYPE: {workflow_type}
CURRENT VERSION: v{current_version}

CURRENT STEP PROMPTS:
{json.dumps(current_prompts, indent=2) if current_prompts else "Using defaults (no custom prompts yet)"}

STEP DESCRIPTIONS:
{json.dumps(step_descriptions, indent=2) if step_descriptions else "Standard flow steps"}

TOP PERFORMING CONTENT (highest engagement):
{json.dumps(winners, indent=2)}

LOWEST PERFORMING CONTENT:
{json.dumps(losers, indent=2)}

Analyze what makes the top content work vs. what makes the bottom content fail.
Then suggest improved step prompts that would push the workflow to produce more
content like the winners and less like the losers.

Return JSON:
{{
    "winning_patterns": ["pattern 1", "pattern 2", "pattern 3"],
    "losing_patterns": ["pattern 1", "pattern 2"],
    "improved_prompts": {{
        "step_name": "improved prompt instruction for this step",
        ...
    }},
    "improved_gates": {{
        "gate_name": "improved quality gate criteria"
    }},
    "evolution_summary": "2-3 sentence summary of what changed and why"
}}

RULES:
- Keep improved_prompts keys matching the existing step names
- Be specific — reference actual patterns from the data
- Don't change the workflow structure, only the prompts within steps
- Focus on the biggest leverage points (the steps where winners diverge from losers)
- If engagement data is thin, make conservative changes

Return ONLY the JSON object."""

    try:
        result = await call_claude(prompt, max_tokens=2048)
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        logger.error("Failed to analyze workflow evolution for %s: %s", workflow_type, e)
        return {}
