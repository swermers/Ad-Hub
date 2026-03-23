"""Billing engine — tier definitions, usage tracking, and limit enforcement.

This module is the single source of truth for what each tier includes.
Called by generation pipelines before running expensive operations.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.billing import Subscription, UsageRecord
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)


# ─── Tier Definitions ─────────────────────────────────────────────────────────

TIER_LIMITS = {
    "starter": {
        "price_monthly_cents": 19900,  # $199
        "max_products": 1,
        "max_generations_per_month": 100,
        "max_platforms": 2,
        "ad_management": False,
        "image_library_sync": False,
        "white_label": False,
        "max_users": 2,
    },
    "pro": {
        "price_monthly_cents": 39900,  # $399
        "max_products": 3,
        "max_generations_per_month": 500,
        "max_platforms": 999,  # unlimited
        "ad_management": True,
        "image_library_sync": True,
        "white_label": False,
        "max_users": 5,
    },
    "agency": {
        "price_monthly_cents": 99900,  # $999
        "max_products": 10,
        "max_generations_per_month": 999999,  # unlimited
        "max_platforms": 999,  # unlimited
        "ad_management": True,
        "image_library_sync": True,
        "white_label": True,
        "max_users": 25,
    },
}

DEFAULT_TIER = "starter"


def get_tier_limits(tier: str) -> dict:
    """Get the limits for a subscription tier."""
    return TIER_LIMITS.get(tier, TIER_LIMITS[DEFAULT_TIER])


# ─── Usage Tracking ───────────────────────────────────────────────────────────

def get_or_create_current_usage(db: Session, workspace_id: str) -> UsageRecord:
    """Get or create the usage record for the current billing period."""
    sub = db.query(Subscription).filter(Subscription.workspace_id == workspace_id).first()

    if sub and sub.current_period_start and sub.current_period_end:
        period_start = sub.current_period_start
        period_end = sub.current_period_end
    else:
        # No subscription — use calendar month
        now = datetime.now(timezone.utc)
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            period_end = period_start.replace(year=now.year + 1, month=1)
        else:
            period_end = period_start.replace(month=now.month + 1)

    usage = (
        db.query(UsageRecord)
        .filter(
            UsageRecord.workspace_id == workspace_id,
            UsageRecord.period_start == period_start,
        )
        .first()
    )

    if not usage:
        usage = UsageRecord(
            workspace_id=workspace_id,
            period_start=period_start,
            period_end=period_end,
        )
        db.add(usage)
        db.flush()

    return usage


def increment_usage(db: Session, workspace_id: str, usage_type: str, count: int = 1):
    """Increment a usage counter for the current billing period.

    usage_type: content_generations, ad_generations, image_generations,
                pain_point_researches, transcriptions, posts_published, ads_uploaded
    """
    usage = get_or_create_current_usage(db, workspace_id)

    current = getattr(usage, usage_type, 0)
    setattr(usage, usage_type, current + count)
    usage.updated_at = datetime.now(timezone.utc)
    db.commit()


# ─── Limit Enforcement ────────────────────────────────────────────────────────

class UsageLimitExceeded(Exception):
    """Raised when a workspace exceeds its tier limits."""

    def __init__(self, limit_type: str, current: int, maximum: int, tier: str):
        self.limit_type = limit_type
        self.current = current
        self.maximum = maximum
        self.tier = tier
        super().__init__(
            f"{limit_type} limit exceeded: {current}/{maximum} on {tier} plan. "
            f"Upgrade to increase your limit."
        )


def check_generation_limit(db: Session, workspace_id: str):
    """Check if the workspace can run another generation. Raises UsageLimitExceeded if not."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return  # No workspace = legacy, no limits

    tier = workspace.tier or DEFAULT_TIER
    limits = get_tier_limits(tier)
    max_gens = limits["max_generations_per_month"]

    usage = get_or_create_current_usage(db, workspace_id)
    total_gens = usage.content_generations + usage.ad_generations

    if total_gens >= max_gens:
        raise UsageLimitExceeded("generations", total_gens, max_gens, tier)


def check_product_limit(db: Session, workspace_id: str):
    """Check if the workspace can create another product."""
    from app.models import Product

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return

    tier = workspace.tier or DEFAULT_TIER
    limits = get_tier_limits(tier)
    max_products = limits["max_products"]

    current_count = db.query(Product).filter(Product.workspace_id == workspace_id).count()

    if current_count >= max_products:
        raise UsageLimitExceeded("products", current_count, max_products, tier)


def check_platform_limit(db: Session, workspace_id: str):
    """Check if the workspace can connect another platform."""
    from app.models import PlatformConnection, Product

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return

    tier = workspace.tier or DEFAULT_TIER
    limits = get_tier_limits(tier)
    max_platforms = limits["max_platforms"]

    # Count distinct platforms across all workspace products
    workspace_product_ids = [
        p.id for p in db.query(Product.id).filter(Product.workspace_id == workspace_id).all()
    ]
    current_count = (
        db.query(PlatformConnection)
        .filter(PlatformConnection.product_id.in_(workspace_product_ids))
        .count()
    )

    if current_count >= max_platforms:
        raise UsageLimitExceeded("platform_connections", current_count, max_platforms, tier)


def check_ad_management(db: Session, workspace_id: str):
    """Check if the workspace tier includes ad management."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return

    tier = workspace.tier or DEFAULT_TIER
    limits = get_tier_limits(tier)

    if not limits["ad_management"]:
        raise UsageLimitExceeded("ad_management", 0, 0, tier)


def get_usage_summary(db: Session, workspace_id: str) -> dict:
    """Get a summary of current usage vs limits for display."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return {"error": "Workspace not found"}

    tier = workspace.tier or DEFAULT_TIER
    limits = get_tier_limits(tier)
    usage = get_or_create_current_usage(db, workspace_id)

    total_gens = usage.content_generations + usage.ad_generations

    return {
        "tier": tier,
        "billing_period": {
            "start": usage.period_start.isoformat(),
            "end": usage.period_end.isoformat(),
        },
        "usage": {
            "content_generations": usage.content_generations,
            "ad_generations": usage.ad_generations,
            "total_generations": total_gens,
            "image_generations": usage.image_generations,
            "transcriptions": usage.transcriptions,
            "posts_published": usage.posts_published,
            "ads_uploaded": usage.ads_uploaded,
        },
        "limits": {
            "max_generations": limits["max_generations_per_month"],
            "max_products": limits["max_products"],
            "max_platforms": limits["max_platforms"],
            "ad_management": limits["ad_management"],
            "white_label": limits["white_label"],
        },
        "utilization": {
            "generations_pct": round(total_gens / max(limits["max_generations_per_month"], 1) * 100, 1),
        },
    }
