"""Autonomous Loop configuration — per-product settings for what runs automatically.

Controls whether the bot auto-publishes or queues for approval, which loops
are active, and safety caps on autonomous actions per cycle.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AutonomousLoopConfig(Base):
    """Per-product configuration for the autonomous content + ad loop."""

    __tablename__ = "autonomous_loop_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True)

    # ─── Master switches ──────────────────────────────────────────────────────
    content_loop_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    ad_loop_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    feedback_loop_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # ─── Content loop settings ────────────────────────────────────────────────
    # Which content types auto-publish vs need approval
    auto_publish_social: Mapped[bool] = mapped_column(Boolean, default=False)  # Twitter, LinkedIn, Meta posts
    auto_publish_email: Mapped[bool] = mapped_column(Boolean, default=False)   # Newsletters
    auto_publish_ads: Mapped[bool] = mapped_column(Boolean, default=False)     # Ad variations

    # How many pieces to generate per cycle
    max_content_per_cycle: Mapped[int] = mapped_column(Integer, default=7)     # Full week
    max_ads_per_cycle: Mapped[int] = mapped_column(Integer, default=10)

    # Which platforms to auto-schedule
    active_platforms: Mapped[str | None] = mapped_column(Text)  # JSON list: ["twitter", "linkedin", "meta"]

    # Scheduling preferences
    preferred_post_times: Mapped[str | None] = mapped_column(Text)  # JSON: {"twitter": "09:00", "linkedin": "08:00", ...}
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")

    # ─── Ad loop settings ─────────────────────────────────────────────────────
    # Auto-upload generated ad variations to Meta
    auto_upload_ads: Mapped[bool] = mapped_column(Boolean, default=False)
    # Auto-create campaigns from winning patterns
    auto_create_campaigns: Mapped[bool] = mapped_column(Boolean, default=False)
    # Max daily budget the bot can allocate autonomously
    max_autonomous_daily_budget: Mapped[float] = mapped_column(Float, default=50.0)

    # ─── Feedback loop settings ───────────────────────────────────────────────
    # Min CTR to consider content "winning" (for feedback purposes)
    winning_ctr_threshold: Mapped[float] = mapped_column(Float, default=2.0)
    # Auto-archive seeds whose content consistently underperforms
    auto_archive_underperformers: Mapped[bool] = mapped_column(Boolean, default=True)
    # Number of cycles before archiving a seed with no good results
    underperform_cycles_before_archive: Mapped[int] = mapped_column(Integer, default=3)

    # ─── Safety caps ──────────────────────────────────────────────────────────
    max_posts_per_day: Mapped[int] = mapped_column(Integer, default=5)
    max_campaigns_per_week: Mapped[int] = mapped_column(Integer, default=2)
    require_approval_above_budget: Mapped[float] = mapped_column(Float, default=100.0)  # Daily budget threshold

    # ─── State tracking ───────────────────────────────────────────────────────
    last_content_cycle_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_ad_cycle_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_feedback_cycle_at: Mapped[datetime | None] = mapped_column(DateTime)
    total_cycles_run: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
