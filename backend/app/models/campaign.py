import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Campaign(Base):
    """Tracks ad campaigns across platforms (Meta, Google, etc.)."""

    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)  # meta, google
    platform_campaign_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    objective: Mapped[str] = mapped_column(String(50), default="traffic")  # awareness, traffic, conversions, engagement
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, pending_approval, active, paused, completed, failed
    daily_budget: Mapped[float] = mapped_column(Float, default=0.0)
    lifetime_budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_spend: Mapped[float] = mapped_column(Float, default=0.0)
    targeting_config: Mapped[str] = mapped_column(Text, default="{}")  # JSON: audience, demographics, interests, placements
    destination_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    ad_variations: Mapped[list["CampaignAdVariation"]] = relationship(back_populates="campaign")


class CampaignAdVariation(Base):
    """Links campaigns to ad variations (many-to-many with metadata)."""

    __tablename__ = "campaign_ad_variations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id: Mapped[str] = mapped_column(String(36), ForeignKey("campaigns.id"), nullable=False)
    ad_variation_id: Mapped[str] = mapped_column(String(36), ForeignKey("ad_variations.id"), nullable=False)
    platform_ad_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, active, paused
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    campaign: Mapped[Campaign] = relationship(back_populates="ad_variations")


class SafetyGuardrail(Base):
    """Configurable spend caps, auto-pause rules, and safety limits."""

    __tablename__ = "safety_guardrails"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("products.id"), nullable=True)  # null = global rule
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Rule types:
    #   daily_spend_cap — max spend per day across all campaigns for this product
    #   campaign_spend_cap — max spend per individual campaign
    #   total_spend_cap — absolute max spend (kill switch threshold)
    #   min_roas — pause if ROAS drops below this for 48h
    #   max_cpc — reduce bids or pause if CPC exceeds this
    #   max_frequency — rotate creative when frequency exceeds this
    #   pause_no_conversions — pause after spending X with 0 conversions
    threshold_value: Mapped[float] = mapped_column(Float, nullable=False)
    action: Mapped[str] = mapped_column(String(50), default="alert")  # pause, alert, reduce_budget, rotate_creative
    cooldown_hours: Mapped[int] = mapped_column(Integer, default=48)  # hours before rule can fire again
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class AgentLog(Base):
    """Audit trail for every action the autonomous agent takes."""

    __tablename__ = "agent_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id: Mapped[str] = mapped_column(String(100), default="iterant-agent")  # which agent/skill
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # Action types:
    #   content_generated, campaign_created, campaign_paused, campaign_resumed,
    #   budget_changed, creative_rotated, creative_refreshed, optimization_run,
    #   guardrail_triggered, report_sent, performance_ingested, transcript_processed
    resource_type: Mapped[str] = mapped_column(String(50), default="")  # campaign, content, ad_variation, product
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    details: Mapped[str] = mapped_column(Text, default="{}")  # JSON: full action details + reasoning
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    approved: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # null = pending, True/False = decided
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
