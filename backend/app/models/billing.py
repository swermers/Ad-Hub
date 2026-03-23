"""Billing models — subscription management and usage tracking.

Subscription tiers (from VISION.md):
  Starter — $199/month: 100 generations, 2 platforms, basic brand profile
  Pro     — $399/month: 500 generations, unlimited platforms, full brand profile + ads
  Agency  — $999/month: 10 brands, unlimited generations, white-label
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Subscription(Base):
    """Active subscription for a workspace. Tracks Stripe integration."""

    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True)

    # Stripe IDs
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255))
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255))
    stripe_price_id: Mapped[str | None] = mapped_column(String(255))

    # Plan details
    tier: Mapped[str] = mapped_column(String(50), nullable=False, default="starter")  # starter, pro, agency
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="trialing")
    # Status values: trialing, active, past_due, canceled, paused

    # Billing period
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime)
    trial_end: Mapped[datetime | None] = mapped_column(DateTime)

    # Payment info (display only — actual billing through Stripe)
    monthly_amount_cents: Mapped[int] = mapped_column(Integer, default=19900)  # $199.00
    currency: Mapped[str] = mapped_column(String(3), default="usd")

    # Cancellation
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class UsageRecord(Base):
    """Monthly usage counters per workspace. One row per billing period."""

    __tablename__ = "usage_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # Billing period this record covers
    period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Generation counters
    content_generations: Mapped[int] = mapped_column(Integer, default=0)
    ad_generations: Mapped[int] = mapped_column(Integer, default=0)
    image_generations: Mapped[int] = mapped_column(Integer, default=0)
    pain_point_researches: Mapped[int] = mapped_column(Integer, default=0)
    transcriptions: Mapped[int] = mapped_column(Integer, default=0)

    # Posting counters
    posts_published: Mapped[int] = mapped_column(Integer, default=0)
    ads_uploaded: Mapped[int] = mapped_column(Integer, default=0)

    # API cost tracking (for internal margin analysis)
    estimated_api_cost_cents: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
