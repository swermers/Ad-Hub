"""Engine for auto-optimizing Facebook ad campaigns."""

import json
import logging

from sqlalchemy.orm import Session

from app.models import AdVariation, OptimizationConfig, OptimizationLog, PlatformConnection
from app.services.meta_client import MetaClient

logger = logging.getLogger(__name__)


async def run_optimization_cycle(
    db: Session,
    product_id: str,
    config: OptimizationConfig,
) -> dict:
    """Analyze running ads, pause losers, flag winners."""

    # Get all uploaded/live variations with Facebook ad IDs
    variations = (
        db.query(AdVariation)
        .filter(
            AdVariation.product_id == product_id,
            AdVariation.meta_ad_id.isnot(None),
            AdVariation.status.in_(["uploaded", "live"]),
        )
        .all()
    )

    if not variations:
        return {"actions_taken": 0, "paused": 0, "promoted": 0, "kept": 0}

    # Find a Meta connection for this product
    connection = (
        db.query(PlatformConnection)
        .filter(PlatformConnection.platform == "meta")
        .first()
    )
    if not connection:
        raise ValueError("No Meta platform connection found")

    client = MetaClient(
        access_token=connection.access_token,
        ad_account_id=connection.platform_account_id or "",
    )

    actions_taken = 0
    paused = 0
    promoted = 0
    kept = 0

    for variation in variations:
        try:
            metrics = await client.get_ad_insights(variation.meta_ad_id)
            if not metrics:
                continue

            impressions = metrics.get("impressions", 0)
            clicks = metrics.get("clicks", 0)
            spend = metrics.get("spend", 0.0)
            ctr = metrics.get("ctr", 0.0)

            # Calculate CPM
            cpm = (spend / impressions * 1000) if impressions > 0 else 0

            metrics_snapshot = json.dumps({
                "impressions": impressions,
                "clicks": clicks,
                "spend": spend,
                "ctr": ctr,
                "cpm": cpm,
            })

            # Not enough data yet
            if impressions < config.min_impressions:
                kept += 1
                continue

            # KILL RULE: High CPM or low CTR
            if cpm > config.max_cpm or ctr < config.min_ctr:
                reason = []
                if cpm > config.max_cpm:
                    reason.append(f"CPM ${cpm:.2f} exceeds max ${config.max_cpm:.2f}")
                if ctr < config.min_ctr:
                    reason.append(f"CTR {ctr:.2f}% below min {config.min_ctr:.2f}%")

                await client.update_ad_status(variation.meta_ad_id, "PAUSED")
                variation.status = "paused"

                log = OptimizationLog(
                    product_id=product_id,
                    ad_variation_id=variation.id,
                    action="paused",
                    reason="; ".join(reason),
                    metrics_snapshot=metrics_snapshot,
                )
                db.add(log)
                paused += 1
                actions_taken += 1
                logger.info("Paused ad %s: %s", variation.meta_ad_id, "; ".join(reason))

            # WINNER RULE: High CTR
            elif ctr >= config.winner_ctr_threshold:
                variation.status = "live"
                variation.performance_score = ctr

                log = OptimizationLog(
                    product_id=product_id,
                    ad_variation_id=variation.id,
                    action="promoted",
                    reason=f"CTR {ctr:.2f}% exceeds winner threshold {config.winner_ctr_threshold:.2f}%",
                    metrics_snapshot=metrics_snapshot,
                )
                db.add(log)
                promoted += 1
                actions_taken += 1
                logger.info("Promoted ad %s: CTR %.2f%%", variation.meta_ad_id, ctr)

            else:
                variation.status = "live"
                kept += 1

        except Exception as e:
            logger.error("Failed to analyze ad %s: %s", variation.meta_ad_id, e)

    db.commit()
    return {"actions_taken": actions_taken, "paused": paused, "promoted": promoted, "kept": kept}
