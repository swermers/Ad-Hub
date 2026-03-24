"""Content Prompt Set — customizable prompts for the content pipeline.

Each product can have its own prompt set that overrides the generic defaults.
New users get clean, generic prompts. Power users refine them over time.

Covers: Voice Rules, Idea Sharpener, Templates A-D, Social Post Rules,
Video Script Rules, X Thread Rules, Weekly Mix schedule.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ContentPromptSet(Base):
    __tablename__ = "content_prompt_sets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # ── Voice Rules ──────────────────────────────────────────────────────
    voice_rules: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Idea Sharpener prompt ────────────────────────────────────────────
    idea_sharpener_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Newsletter Templates (JSON: {"A": "...", "B": "...", ...}) ──────
    template_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Social Post Rules ────────────────────────────────────────────────
    social_post_rules: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Video Script Rules ───────────────────────────────────────────────
    video_script_rules: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── X Thread Rules ───────────────────────────────────────────────────
    x_thread_rules: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Weekly Mix (JSON array of day/content_type/platform/purpose) ────
    weekly_mix: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── System prompt intro (the persona line) ───────────────────────────
    system_prompt_intro: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
