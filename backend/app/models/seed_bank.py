import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Seed(Base):
    """A captured idea or observation waiting to be developed into content.

    Seeds come from voice memo transcripts (via the Idea Sharpener) or manual entry.
    They sit in the Seed Bank until the creator is ready to build content from them.
    """

    __tablename__ = "seeds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)

    # Core seed data (from Idea Sharpener)
    seed: Mapped[str] = mapped_column(Text, nullable=False)  # the one-sentence core observation
    heat: Mapped[str] = mapped_column(Text, default="[]")  # JSON array of strongest lines
    audience_hook: Mapped[str] = mapped_column(Text, default="")
    template_fit: Mapped[str] = mapped_column(String(10), default="A")  # A, B, C, D
    subject_line: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metaphor: Mapped[str | None] = mapped_column(Text, nullable=True)
    weekly_theme: Mapped[str | None] = mapped_column(String(500), nullable=True)
    verdict: Mapped[str] = mapped_column(String(100), default="Strong enough to build on")

    # Source
    raw_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)  # original voice memo text
    raw_ideas: Mapped[str] = mapped_column(Text, default="[]")  # JSON array of raw phrases to preserve
    source: Mapped[str] = mapped_column(String(50), default="voice_memo")  # voice_memo, manual, agent

    # Status
    status: Mapped[str] = mapped_column(String(50), default="parked")  # parked, developing, used, archived
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # when it was turned into content
    content_piece_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # link to the content it became

    # Metadata
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)  # personal notes
    priority: Mapped[int] = mapped_column(Integer, default=0)  # 0=normal, 1=high, -1=low
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
