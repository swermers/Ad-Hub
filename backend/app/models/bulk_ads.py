import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AdTemplate(Base):
    __tablename__ = "ad_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("products.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    template_type: Mapped[str] = mapped_column(String(50), nullable=False)  # before_after, pain_solution, stat_proof
    layout_config: Mapped[str] = mapped_column(Text, default="{}")  # JSON: colors, fonts, etc.
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    variations: Mapped[list["AdVariation"]] = relationship(back_populates="template")


class PainPoint(Base):
    __tablename__ = "pain_points"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    pain_point: Mapped[str] = mapped_column(Text, nullable=False)
    desired_outcome: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(50), default="frustration")  # frustration, fear, desire, objection
    severity: Mapped[int] = mapped_column(Integer, default=5)
    target_segment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="ai_generated")  # ai_generated, manual
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    variations: Mapped[list["AdVariation"]] = relationship(back_populates="pain_point")


class AdVariation(Base):
    __tablename__ = "ad_variations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[str] = mapped_column(String(36), nullable=False)
    template_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ad_templates.id"), nullable=True)
    pain_point_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("pain_points.id"), nullable=True)
    headline: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    cta: Mapped[str] = mapped_column(String(255), default="Learn More")
    template_config_override: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON overrides
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, approved, exported, uploaded, live, paused
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    meta_ad_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    performance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    template: Mapped[AdTemplate | None] = relationship(back_populates="variations")
    pain_point: Mapped[PainPoint | None] = relationship(back_populates="variations")


class OptimizationConfig(Base):
    __tablename__ = "optimization_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), unique=True, nullable=False)
    min_impressions: Mapped[int] = mapped_column(Integer, default=500)
    max_cpm: Mapped[float] = mapped_column(Float, default=30.0)
    min_ctr: Mapped[float] = mapped_column(Float, default=0.5)
    winner_ctr_threshold: Mapped[float] = mapped_column(Float, default=2.0)
    winner_budget_multiplier: Mapped[float] = mapped_column(Float, default=2.0)
    check_interval_hours: Mapped[int] = mapped_column(Integer, default=6)
    enabled: Mapped[bool] = mapped_column(default=False)
    auto_iterate: Mapped[bool] = mapped_column(default=False)
    max_iterations: Mapped[int] = mapped_column(Integer, default=10)  # safety cap on auto-generated batches
    iterations_run: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class OptimizationLog(Base):
    __tablename__ = "optimization_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    ad_variation_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ad_variations.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # paused, promoted, kept
    reason: Mapped[str] = mapped_column(Text, default="")
    metrics_snapshot: Mapped[str] = mapped_column(Text, default="{}")  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
