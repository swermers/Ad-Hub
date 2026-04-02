import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ContentPiece(Base):
    __tablename__ = "content_pieces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=True
    )
    voice_profile_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("voice_profiles.id", ondelete="SET NULL"), nullable=True
    )
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), default="general")
    title: Mapped[str | None] = mapped_column(String(512))
    body: Mapped[str] = mapped_column(Text, default="")
    hook: Mapped[str | None] = mapped_column(String(512))
    cta: Mapped[str | None] = mapped_column(String(512))
    funnel_stage: Mapped[str] = mapped_column(String(50), default="awareness")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    template_type: Mapped[str | None] = mapped_column(String(50))
    aspect_ratio: Mapped[str | None] = mapped_column(String(10))
    generation_metadata: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)
    media_type: Mapped[str | None] = mapped_column(String(20))
    video_style: Mapped[str | None] = mapped_column(String(50))
    video_config: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    product: Mapped["Product | None"] = relationship(back_populates="content_pieces")  # noqa: F821
