"""Autonomous Loop Engine — the closed-loop brain that ties all pipeline stages together.

Three loops, each independently toggleable per product:

1. CONTENT LOOP: Seed Bank → Generate → Schedule → Publish
   - Picks highest-priority parked seeds
   - Generates content via the content pipeline
   - Auto-schedules to connected platforms (or queues for approval)

2. AD LOOP: Pain Points → Generate Variations → Upload → Campaign
   - Picks pain points that haven't been used recently
   - Generates ad variations
   - Auto-uploads to Meta (or queues for approval)
   - Creates campaigns within budget guardrails

3. FEEDBACK LOOP: Metrics → Seed Priority → Archive Underperformers
   - Reads performance metrics for posted content
   - Boosts priority of seeds whose content performed well
   - Archives seeds whose content consistently underperformed
   - Feeds winning patterns back into generation context
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import (
    ContentPiece,
    PainPoint,
    PerformanceMetric,
    PlatformConnection,
    ScheduledPost,
    Seed,
)
from app.models.autonomous_loop import AutonomousLoopConfig
from app.models.brand_profile import BrandProfile
from app.models.campaign import AgentLog
from app.models.content_workflow import ContentTypeWorkflow

logger = logging.getLogger(__name__)


# ─── Content Loop ─────────────────────────────────────────────────────────────

def run_content_loop(db: Session, product_id: str, config: AutonomousLoopConfig) -> dict:
    """Pick seeds → generate content → schedule across platforms.

    Returns a summary dict of what was done.
    """
    from app.engines.generation import generate_content_batch_sync
    from app.models import Product

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"status": "skipped", "reason": "Product not found"}

    # Load brand profile
    brand_profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()

    # Check daily post cap
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    posts_today = (
        db.query(ScheduledPost)
        .filter(
            ScheduledPost.content.has(ContentPiece.product_id == product_id),
            ScheduledPost.created_at >= today_start,
        )
        .count()
    )
    if posts_today >= config.max_posts_per_day:
        return {"status": "skipped", "reason": f"Daily post cap reached ({posts_today}/{config.max_posts_per_day})"}

    # Get active platforms with connections
    active_platforms = _get_active_platforms(db, product_id, config)
    if not active_platforms:
        return {"status": "skipped", "reason": "No active platform connections"}

    # Pick the best seed to develop
    seed = _pick_next_seed(db, product_id)
    if not seed:
        return {"status": "skipped", "reason": "No parked seeds available"}

    # Mark seed as developing
    seed.status = "developing"
    db.commit()

    try:
        # Generate content for each platform using multi-step flows when available
        platforms = [p for p in active_platforms if p in ("twitter", "linkedin", "meta")]
        if not platforms:
            platforms = active_platforms[:3]

        pieces = _generate_with_flows(
            db=db,
            product=product,
            seed=seed,
            platforms=platforms,
            brand_profile=brand_profile,
        )

        # Save content pieces and optionally schedule
        saved_count = 0
        scheduled_count = 0
        approval_count = 0

        for piece_data in pieces:
            piece = ContentPiece(
                product_id=product_id,
                content_type=piece_data["content_type"],
                platform=piece_data["platform"],
                title=piece_data.get("title"),
                body=piece_data["body"],
                hook=piece_data.get("hook"),
                cta=piece_data.get("cta"),
                funnel_stage="awareness",
                status="draft",
                generation_metadata=piece_data.get("metadata"),
            )
            db.add(piece)
            db.flush()  # Get the ID
            saved_count += 1

            # Decide: auto-schedule (as draft) or queue for Telegram approval
            should_auto = config.auto_publish_social and piece_data["content_type"] == "social_post"

            if should_auto:
                scheduled = _auto_schedule_content(db, piece, product_id, config)
                if scheduled:
                    scheduled_count += 1
                    piece.status = "scheduled"
            else:
                piece.status = "pending_approval"
                approval_count += 1
                # Send to Telegram for approval if configured
                _queue_telegram_approval(db, piece)

        # Update seed status
        seed.status = "used"
        seed.used_at = datetime.now(timezone.utc)
        if pieces:
            seed.content_piece_id = piece.id  # Link to last generated piece

        db.commit()

        # Log the action
        _log_action(db, "content_loop_cycle", "content", product_id, {
            "seed_id": seed.id,
            "seed_text": seed.seed[:100],
            "pieces_generated": saved_count,
            "auto_scheduled": scheduled_count,
            "queued_for_approval": approval_count,
            "platforms": platforms,
        })

        return {
            "status": "generated",
            "seed_id": seed.id,
            "pieces_generated": saved_count,
            "auto_scheduled": scheduled_count,
            "queued_for_approval": approval_count,
        }

    except Exception as e:
        # Revert seed status on failure
        seed.status = "parked"
        db.commit()
        logger.error("Content loop failed for product %s: %s", product_id, e)
        return {"status": "error", "reason": str(e)}


def _generate_with_flows(
    db: Session,
    product,
    seed: Seed,
    platforms: list[str],
    brand_profile=None,
) -> list[dict]:
    """Generate content using multi-step flows when available, fallback to batch generation.

    This bridges the autonomous loop (sync) with the async flow architecture.
    """
    import asyncio
    from app.engines.flows import FlowContext, FlowRegistry

    # Map platform → flow type
    platform_flow_map = {
        "twitter": "x_post",
        "linkedin": "linkedin_post",
        "meta": "meta_post",
    }

    # Build shared context
    product_context = f"Product: {product.name}\nDescription: {product.description}"
    if product.target_audience:
        product_context += f"\nTarget Audience: {product.target_audience}"

    voice_context = ""
    if brand_profile:
        voice_context = f"Brand tone: {brand_profile.tone_of_voice or ''}"

    seed_dict = {
        "seed": seed.seed,
        "audience_hook": seed.audience_hook or "",
        "weekly_theme": seed.weekly_theme or "",
    }

    # Load workflow overrides from DB
    flow_types_needed = [platform_flow_map.get(p, p) for p in platforms]
    workflow_overrides = {}
    workflows = (
        db.query(ContentTypeWorkflow)
        .filter(
            ContentTypeWorkflow.product_id == product.id,
            ContentTypeWorkflow.workflow_type.in_(flow_types_needed),
            ContentTypeWorkflow.is_active.is_(True),
        )
        .all()
    )
    for wf in workflows:
        workflow_overrides[wf.workflow_type] = wf

    # Try to run flows
    pieces = []
    fallback_platforms = []

    async def _run_flows():
        tasks = []
        for platform in platforms:
            flow_type = platform_flow_map.get(platform, platform)
            flow = FlowRegistry.get(flow_type)

            if not flow:
                fallback_platforms.append(platform)
                continue

            wf = workflow_overrides.get(flow_type)
            step_overrides = {}
            gate_overrides = {}
            version = 1
            if wf:
                version = wf.version
                if wf.step_prompts:
                    try:
                        step_overrides = json.loads(wf.step_prompts)
                    except (json.JSONDecodeError, TypeError):
                        pass
                if wf.quality_gate_rules:
                    try:
                        gate_overrides = json.loads(wf.quality_gate_rules)
                    except (json.JSONDecodeError, TypeError):
                        pass

            ctx = FlowContext(
                seed=seed_dict,
                draft=None,
                product_context=product_context,
                voice_context=voice_context,
                prompt_set={},
                workflow_type=flow_type,
                workflow_version=version,
                step_prompt_overrides=step_overrides,
                quality_gate_overrides=gate_overrides,
            )
            tasks.append(flow.run(ctx))

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, Exception):
                    logger.warning("Flow execution failed: %s", r)
                    continue
                pieces.append({
                    "content_type": r.content_type,
                    "platform": r.platform,
                    "title": r.title,
                    "body": r.body,
                    "hook": r.hook,
                    "cta": r.cta,
                    "metadata": json.dumps(r.metadata),
                    "video_style": r.video_style,
                    "video_config": r.video_config,
                })

    asyncio.run(_run_flows())

    # Fallback for platforms without flows
    if fallback_platforms:
        from app.engines.generation import generate_content_batch_sync

        fallback_pieces = generate_content_batch_sync(
            product=product,
            content_types=["social_post"],
            platforms=fallback_platforms,
            count=1,
            funnel_stage="awareness",
            instructions=f"Core idea: {seed.seed}\nHook: {seed.audience_hook}\nTheme: {seed.weekly_theme or 'General'}",
            brand_profile=brand_profile,
        )
        pieces.extend(fallback_pieces)

    return pieces


def _pick_next_seed(db: Session, product_id: str) -> Seed | None:
    """Pick the highest-priority parked seed for content generation."""
    return (
        db.query(Seed)
        .filter(
            Seed.product_id == product_id,
            Seed.status == "parked",
        )
        .order_by(Seed.priority.desc(), Seed.created_at.asc())
        .first()
    )


def _get_active_platforms(db: Session, product_id: str, config: AutonomousLoopConfig) -> list[str]:
    """Get platforms that have active connections and are in the config."""
    connections = (
        db.query(PlatformConnection)
        .filter(
            PlatformConnection.product_id == product_id,
            PlatformConnection.status == "active",
        )
        .all()
    )
    connected = {c.platform for c in connections}

    # Filter by config's active_platforms if set
    if config.active_platforms:
        try:
            allowed = set(json.loads(config.active_platforms))
            return list(connected & allowed)
        except (json.JSONDecodeError, TypeError):
            pass

    return list(connected)


def _auto_schedule_content(
    db: Session,
    piece: ContentPiece,
    product_id: str,
    config: AutonomousLoopConfig,
) -> bool:
    """Schedule a content piece for the next available time slot."""
    # Find the platform connection
    connection = (
        db.query(PlatformConnection)
        .filter(
            PlatformConnection.product_id == product_id,
            PlatformConnection.platform == piece.platform,
            PlatformConnection.status == "active",
        )
        .first()
    )
    if not connection:
        return False

    # Calculate next post time (stagger by 2 hours from last scheduled)
    last_scheduled = (
        db.query(ScheduledPost)
        .filter(ScheduledPost.connection_id == connection.id)
        .order_by(ScheduledPost.scheduled_at.desc())
        .first()
    )

    if last_scheduled and last_scheduled.scheduled_at > datetime.now(timezone.utc):
        next_time = last_scheduled.scheduled_at + timedelta(hours=2)
    else:
        # Schedule for tomorrow at preferred time or 9 AM
        preferred_times = {}
        if config.preferred_post_times:
            try:
                preferred_times = json.loads(config.preferred_post_times)
            except (json.JSONDecodeError, TypeError):
                pass

        hour = int(preferred_times.get(piece.platform, "9").split(":")[0])
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        next_time = tomorrow.replace(hour=hour, minute=0, second=0, microsecond=0)

    scheduled_post = ScheduledPost(
        content_id=piece.id,
        connection_id=connection.id,
        scheduled_at=next_time,
        status="scheduled",
    )
    db.add(scheduled_post)
    return True


# ─── Ad Loop ──────────────────────────────────────────────────────────────────

def run_ad_loop(db: Session, product_id: str, config: AutonomousLoopConfig) -> dict:
    """Generate ad variations from pain points → optionally upload.

    This loop generates fresh ad copy. The optimizer + auto-iterate handle
    the performance-based iteration. This focuses on expanding coverage
    of pain points that haven't been addressed yet.
    """
    from app.engines.generation import generate_ad_variations_sync
    from app.models import AdTemplate, Product

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"status": "skipped", "reason": "Product not found"}

    brand_profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()

    # Find pain points that don't have many ad variations yet
    underserved_pain_points = _find_underserved_pain_points(db, product_id, limit=3)
    if not underserved_pain_points:
        return {"status": "skipped", "reason": "All pain points have adequate coverage"}

    # Get a template (prefer the most used one, or first available)
    template = db.query(AdTemplate).filter(AdTemplate.product_id == product_id).first()
    if not template:
        return {"status": "skipped", "reason": "No ad templates configured"}

    try:
        variations = generate_ad_variations_sync(
            product=product,
            template=template,
            pain_points=underserved_pain_points,
            variations_per=min(3, config.max_ads_per_cycle // max(len(underserved_pain_points), 1)),
            funnel_stage="awareness",
            brand_profile=brand_profile,
        )

        # Save variations
        from app.models import AdVariation
        import uuid

        batch_id = str(uuid.uuid4())
        saved_count = 0

        for v in variations:
            config_override = {}
            for color_key in ("backgroundColor", "textColor", "accentColor"):
                if v.get(color_key):
                    config_override[color_key] = v[color_key]

            ad_var = AdVariation(
                product_id=product_id,
                batch_id=batch_id,
                template_id=template.id,
                pain_point_id=v.get("pain_point_id"),
                headline=v["headline"],
                body=v["body"],
                cta=v["cta"],
                template_config_override=json.dumps(config_override) if config_override else None,
                status="draft" if not config.auto_upload_ads else "pending_upload",
            )
            db.add(ad_var)
            saved_count += 1

        db.commit()

        _log_action(db, "ad_loop_cycle", "ad_variation", product_id, {
            "batch_id": batch_id,
            "pain_points_targeted": len(underserved_pain_points),
            "variations_generated": saved_count,
            "auto_upload": config.auto_upload_ads,
        })

        return {
            "status": "generated",
            "batch_id": batch_id,
            "variations_generated": saved_count,
            "pain_points_targeted": len(underserved_pain_points),
        }

    except Exception as e:
        logger.error("Ad loop failed for product %s: %s", product_id, e)
        return {"status": "error", "reason": str(e)}


def _find_underserved_pain_points(db: Session, product_id: str, limit: int = 3) -> list:
    """Find pain points that have few or no ad variations targeting them."""
    from app.models import AdVariation

    # Get all pain points
    all_pps = (
        db.query(PainPoint)
        .filter(PainPoint.product_id == product_id)
        .order_by(PainPoint.severity.desc())
        .all()
    )

    # Count variations per pain point
    scored = []
    for pp in all_pps:
        variation_count = (
            db.query(AdVariation)
            .filter(AdVariation.pain_point_id == pp.id)
            .count()
        )
        scored.append((pp, variation_count))

    # Sort by fewest variations first (then highest severity)
    scored.sort(key=lambda x: (x[1], -x[0].severity))

    return [pp for pp, count in scored[:limit]]


# ─── Feedback Loop ────────────────────────────────────────────────────────────

def run_feedback_loop(db: Session, product_id: str, config: AutonomousLoopConfig) -> dict:
    """Read performance → boost winning seeds → archive underperformers.

    The feedback loop connects the end of the pipeline (metrics) back to
    the beginning (seed bank), creating the self-improvement cycle.
    """
    boosted = 0
    archived = 0
    insights = []

    # 1. Boost seeds whose content performed well
    used_seeds = (
        db.query(Seed)
        .filter(
            Seed.product_id == product_id,
            Seed.status == "used",
            Seed.content_piece_id.isnot(None),
        )
        .all()
    )

    for seed in used_seeds:
        piece = db.query(ContentPiece).filter(ContentPiece.id == seed.content_piece_id).first()
        if not piece:
            continue

        # Check metrics for this content piece
        metrics = (
            db.query(PerformanceMetric)
            .filter(PerformanceMetric.content_id == piece.id)
            .order_by(PerformanceMetric.collected_at.desc())
            .first()
        )
        if not metrics:
            continue

        ctr = metrics.ctr or 0.0

        if ctr >= config.winning_ctr_threshold:
            # This seed produced winning content — boost similar seeds
            seed.priority = max(seed.priority, 1)  # Mark as high priority
            seed.notes = (seed.notes or "") + f"\n[Auto] CTR {ctr:.1f}% — winning seed"
            boosted += 1
            insights.append({
                "seed_id": seed.id,
                "action": "boosted",
                "ctr": ctr,
                "theme": seed.weekly_theme,
            })

    # 2. Archive underperforming seeds
    if config.auto_archive_underperformers:
        # Find seeds marked "used" with content that has metrics but low CTR
        cutoff = datetime.now(timezone.utc) - timedelta(
            days=7 * config.underperform_cycles_before_archive
        )
        old_used_seeds = (
            db.query(Seed)
            .filter(
                Seed.product_id == product_id,
                Seed.status == "used",
                Seed.used_at.isnot(None),
                Seed.used_at <= cutoff,
                Seed.priority <= 0,  # Not already boosted
            )
            .all()
        )

        for seed in old_used_seeds:
            if not seed.content_piece_id:
                continue

            metrics = (
                db.query(PerformanceMetric)
                .filter(PerformanceMetric.content_id == seed.content_piece_id)
                .order_by(PerformanceMetric.collected_at.desc())
                .first()
            )

            # Archive if metrics exist and CTR is below threshold, or if no metrics after N weeks
            should_archive = (
                (metrics and (metrics.ctr or 0) < config.winning_ctr_threshold * 0.5)
                or (not metrics)
            )

            if should_archive:
                seed.status = "archived"
                seed.notes = (seed.notes or "") + "\n[Auto] Archived — underperforming"
                archived += 1

    # 3. Discover winning patterns from top content
    top_pieces = (
        db.query(ContentPiece)
        .join(PerformanceMetric, PerformanceMetric.content_id == ContentPiece.id)
        .filter(
            ContentPiece.product_id == product_id,
            PerformanceMetric.ctr >= config.winning_ctr_threshold,
        )
        .order_by(PerformanceMetric.ctr.desc())
        .limit(5)
        .all()
    )

    winning_patterns = []
    for piece in top_pieces:
        winning_patterns.append({
            "platform": piece.platform,
            "content_type": piece.content_type,
            "hook": piece.hook,
            "funnel_stage": piece.funnel_stage,
        })

    # 4. Evolve content workflows based on performance data
    evolution_result = {}
    try:
        import asyncio
        from app.engines.workflow_evolution import run_evolution_cycle

        evolution_result = asyncio.run(run_evolution_cycle(db, product_id))
    except Exception as e:
        logger.warning("Workflow evolution failed for product %s: %s", product_id, e)
        evolution_result = {"status": "error", "reason": str(e)}

    db.commit()

    _log_action(db, "feedback_loop_cycle", "seed", product_id, {
        "seeds_boosted": boosted,
        "seeds_archived": archived,
        "winning_patterns_found": len(winning_patterns),
        "workflow_evolution": evolution_result,
        "insights": insights[:5],
    })

    return {
        "status": "completed",
        "seeds_boosted": boosted,
        "seeds_archived": archived,
        "winning_patterns": winning_patterns,
        "workflow_evolution": evolution_result,
    }


# ─── Master Loop Runner ──────────────────────────────────────────────────────

def run_autonomous_cycle(db: Session, product_id: str) -> dict:
    """Run all enabled loops for a product. Called by the scheduler."""
    config = (
        db.query(AutonomousLoopConfig)
        .filter(AutonomousLoopConfig.product_id == product_id)
        .first()
    )
    if not config:
        return {"status": "skipped", "reason": "No autonomous loop config"}

    results = {}
    now = datetime.now(timezone.utc)

    # Content loop (run at most once per day)
    if config.content_loop_enabled:
        last_run = config.last_content_cycle_at
        if not last_run or (now - last_run) > timedelta(hours=20):
            results["content"] = run_content_loop(db, product_id, config)
            config.last_content_cycle_at = now
        else:
            results["content"] = {"status": "skipped", "reason": "Already ran today"}

    # Ad loop (run at most once per day)
    if config.ad_loop_enabled:
        last_run = config.last_ad_cycle_at
        if not last_run or (now - last_run) > timedelta(hours=20):
            results["ad"] = run_ad_loop(db, product_id, config)
            config.last_ad_cycle_at = now
        else:
            results["ad"] = {"status": "skipped", "reason": "Already ran today"}

    # Feedback loop (run at most once per week)
    if config.feedback_loop_enabled:
        last_run = config.last_feedback_cycle_at
        if not last_run or (now - last_run) > timedelta(days=6):
            results["feedback"] = run_feedback_loop(db, product_id, config)
            config.last_feedback_cycle_at = now
        else:
            results["feedback"] = {"status": "skipped", "reason": "Already ran this week"}

    config.total_cycles_run += 1
    config.updated_at = now
    db.commit()

    return results


def run_all_autonomous_loops():
    """Top-level function called by the scheduler. Runs all product loops."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        configs = (
            db.query(AutonomousLoopConfig)
            .filter(
                (AutonomousLoopConfig.content_loop_enabled.is_(True))
                | (AutonomousLoopConfig.ad_loop_enabled.is_(True))
                | (AutonomousLoopConfig.feedback_loop_enabled.is_(True))
            )
            .all()
        )

        for config in configs:
            try:
                result = run_autonomous_cycle(db, config.product_id)
                logger.info("Autonomous cycle for product %s: %s", config.product_id, result)
            except Exception as e:
                logger.error("Autonomous cycle failed for product %s: %s", config.product_id, e)

    finally:
        db.close()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _queue_telegram_approval(db: Session, piece: ContentPiece):
    """Send a content piece to Telegram for approval (fire-and-forget).

    This is called from the synchronous autonomous loop, so we schedule
    the async Telegram call as a background task via a simple thread.
    """
    import asyncio
    import threading

    from app.config import settings

    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return  # Telegram not configured — content stays in dashboard queue

    scheduled_post = (
        db.query(ScheduledPost)
        .filter(ScheduledPost.content_id == piece.id)
        .first()
    )

    def _send():
        try:
            from app.services.telegram_bot import ClawdBot

            bot = ClawdBot(token=settings.telegram_bot_token, chat_id=settings.telegram_chat_id)
            asyncio.run(bot.send_approval_request(
                content_id=piece.id,
                scheduled_post_id=scheduled_post.id if scheduled_post else None,
                platform=piece.platform,
                title=piece.title,
                body=piece.body,
                hook=piece.hook,
                cta=piece.cta,
                content_type=piece.content_type,
            ))
        except Exception as e:
            logger.warning("Failed to send Telegram approval for %s: %s", piece.id, e)

    threading.Thread(target=_send, daemon=True).start()


def _log_action(db: Session, action_type: str, resource_type: str, product_id: str, details: dict):
    """Log an autonomous action for the audit trail."""
    log = AgentLog(
        agent_id="autonomous-loop",
        action_type=action_type,
        resource_type=resource_type,
        resource_id=product_id,
        details=json.dumps(details),
        approval_required=False,
    )
    db.add(log)
    db.commit()
