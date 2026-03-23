import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Voice & Tone
    writing_samples: Mapped[str | None] = mapped_column(Text)  # JSON: ["sample text 1", "sample text 2", ...]
    tone_descriptors: Mapped[str | None] = mapped_column(Text)  # JSON: ["warm", "authoritative", ...]
    always_use_words: Mapped[str | None] = mapped_column(Text)  # JSON: ["learners", "community", ...]
    never_use_words: Mapped[str | None] = mapped_column(Text)  # JSON: ["cheap", "discount", ...]
    sentence_style: Mapped[str | None] = mapped_column(String(50))  # short_punchy, long_flowing, mixed

    # Visual Identity
    logo_url: Mapped[str | None] = mapped_column(Text)
    logo_usage_rules: Mapped[str | None] = mapped_column(Text)
    primary_colors: Mapped[str | None] = mapped_column(Text)  # JSON: ["#hex1", "#hex2"]
    secondary_colors: Mapped[str | None] = mapped_column(Text)  # JSON: ["#hex1"]
    accent_colors: Mapped[str | None] = mapped_column(Text)  # JSON: ["#hex1"]
    approved_fonts: Mapped[str | None] = mapped_column(Text)  # JSON: ["Font Name", ...]
    photography_style: Mapped[str | None] = mapped_column(Text)  # candid, posed, lifestyle, etc.

    # Content Rules
    approved_topics: Mapped[str | None] = mapped_column(Text)  # JSON: ["campus life", "admissions", ...]
    off_limit_topics: Mapped[str | None] = mapped_column(Text)  # JSON: ["competitor X", ...]
    claims_allowed: Mapped[str | None] = mapped_column(Text)  # JSON: ["#1 international school in Switzerland"]
    claims_need_review: Mapped[str | None] = mapped_column(Text)  # JSON: ["scholarship guarantees", ...]
    hashtag_strategy: Mapped[str | None] = mapped_column(Text)
    emoji_usage: Mapped[str | None] = mapped_column(String(20))  # yes, no, limited
    approved_emojis: Mapped[str | None] = mapped_column(Text)  # JSON: ["emoji1", "emoji2"]
    cta_style: Mapped[str | None] = mapped_column(Text)  # e.g. "action-oriented, warm"
    regulatory_notes: Mapped[str | None] = mapped_column(Text)  # free-form regulatory constraints

    # Platform-Specific Rules
    linkedin_rules: Mapped[str | None] = mapped_column(Text)  # JSON: {tone, max_length, notes}
    instagram_rules: Mapped[str | None] = mapped_column(Text)
    x_rules: Mapped[str | None] = mapped_column(Text)
    meta_ads_rules: Mapped[str | None] = mapped_column(Text)

    # Content Pause Topics (real-time content pauses)
    paused_topics: Mapped[str | None] = mapped_column(Text)  # JSON: ["campus safety", ...]

    # Versioning
    version: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    product: Mapped["Product"] = relationship(back_populates="brand_profile")  # noqa: F821


class RejectionFeedback(Base):
    __tablename__ = "rejection_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    content_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("content_pieces.id", ondelete="SET NULL"))
    reason: Mapped[str] = mapped_column(String(50), nullable=False)  # off_brand_voice, wrong_imagery, policy_concern, too_casual, too_formal, other
    details: Mapped[str | None] = mapped_column(Text)  # free-form explanation
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
