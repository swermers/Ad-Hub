import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ContentPiece(Base):
    __tablename__ = "content_pieces"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), default="general")
    title: Mapped[str | None] = mapped_column(String(512))
    body: Mapped[str] = mapped_column(Text, default="")
    hook: Mapped[str | None] = mapped_column(String(512))
    cta: Mapped[str | None] = mapped_column(String(512))
    funnel_stage: Mapped[str] = mapped_column(String(50), default="awareness")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    generation_metadata: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    product: Mapped["Product"] = relationship(back_populates="content_pieces")  # noqa: F821
