"""Scheduler engine — APScheduler-based job runner for posting and metric collection."""

import asyncio
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler()
    return _scheduler


def start_scheduler():
    """Start the background scheduler with posting and metrics jobs."""
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled by config")
        return

    scheduler = get_scheduler()

    # Check for posts due every N minutes
    scheduler.add_job(
        _check_scheduled_posts,
        "interval",
        minutes=settings.scheduler_interval_minutes,
        id="check_scheduled_posts",
        replace_existing=True,
    )

    # Collect metrics every N minutes
    scheduler.add_job(
        _collect_all_metrics,
        "interval",
        minutes=settings.metrics_collection_interval_minutes,
        id="collect_metrics",
        replace_existing=True,
    )

    # Auto-optimizer: check every hour
    scheduler.add_job(
        _run_auto_optimizer,
        "interval",
        minutes=60,
        id="auto_optimizer",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    """Shut down the scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
    _scheduler = None


def _check_scheduled_posts():
    """Find posts that are due and post them."""
    from app.database import SessionLocal
    from app.engines.distribution import post_to_platform
    from app.models import ScheduledPost

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_posts = (
            db.query(ScheduledPost)
            .filter(
                ScheduledPost.status == "scheduled",
                ScheduledPost.scheduled_at <= now,
            )
            .all()
        )

        for post in due_posts:
            try:
                asyncio.run(post_to_platform(db, post))
            except Exception as e:
                logger.error("Scheduler failed to post %s: %s", post.id, e)

    finally:
        db.close()


def _collect_all_metrics():
    """Collect metrics for all recently posted content."""
    from app.database import SessionLocal
    from app.engines.analytics import collect_metrics_for_all_posts

    db = SessionLocal()
    try:
        asyncio.run(collect_metrics_for_all_posts(db))
    except Exception as e:
        logger.error("Metrics collection failed: %s", e)
    finally:
        db.close()


def _run_auto_optimizer():
    """Run optimization cycles for all products with optimization enabled.

    After optimization, if auto_iterate is enabled and the optimizer found winners,
    trigger the auto-iterate engine to generate the next batch of ad variations.
    """
    from app.database import SessionLocal
    from app.engines.auto_iterate import run_auto_iterate
    from app.engines.optimizer import run_optimization_cycle
    from app.models import OptimizationConfig

    db = SessionLocal()
    try:
        configs = db.query(OptimizationConfig).filter(OptimizationConfig.enabled.is_(True)).all()
        for config in configs:
            try:
                result = asyncio.run(run_optimization_cycle(db, config.product_id, config))
                if result["actions_taken"] > 0:
                    logger.info(
                        "Optimization for product %s: %d actions (paused=%d, promoted=%d)",
                        config.product_id,
                        result["actions_taken"],
                        result["paused"],
                        result["promoted"],
                    )

                # Auto-iterate: if enabled and optimizer found winners, generate next batch
                if config.auto_iterate and result.get("promoted", 0) > 0:
                    try:
                        iterate_result = asyncio.run(run_auto_iterate(db, config.product_id, config))
                        if iterate_result["status"] == "generated":
                            logger.info(
                                "Auto-iterate for product %s: created %d variations (iteration %d/%d)",
                                config.product_id,
                                iterate_result["variations_created"],
                                iterate_result["iteration"],
                                iterate_result["max_iterations"],
                            )
                        elif iterate_result["status"] == "skipped":
                            logger.debug(
                                "Auto-iterate skipped for product %s: %s",
                                config.product_id,
                                iterate_result["reason"],
                            )
                    except Exception as e:
                        logger.error("Auto-iterate failed for product %s: %s", config.product_id, e)

            except Exception as e:
                logger.error("Optimization failed for product %s: %s", config.product_id, e)
    finally:
        db.close()
