"""StyleGuide — reusable brand writing & messaging guides.

StyleGuides are workspace-scoped and can be paired with VoiceProfiles.
They capture messaging strategy, writing rules, and audience context
separate from the visual identity stored in BrandProfile.

A single StyleGuide can be linked to multiple VoiceProfiles so that the
same brand messaging rules apply across different writers/personas.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StyleGuide(Base):
    __tablename__ = "style_guides"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    # Identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Messaging
    messaging_pillars: Mapped[str | None] = mapped_column(Text)  # JSON: ["Trust & Transparency", "Simplicity", ...]
    taglines: Mapped[str | None] = mapped_column(Text)  # JSON: ["Every version better than the last", ...]
    mission_statement: Mapped[str | None] = mapped_column(Text)
    value_proposition: Mapped[str | None] = mapped_column(Text)

    # Writing Rules
    tone_rules: Mapped[str | None] = mapped_column(Text)  # Free-form: "Write like a thoughtful friend, not a brand account"
    formatting_rules: Mapped[str | None] = mapped_column(Text)  # Free-form: "Use short paragraphs, avoid bullet hell"
    vocabulary_rules: Mapped[str | None] = mapped_column(Text)  # JSON: {"prefer": ["notice", "weight"], "avoid": ["leverage", "synergy"]}
    cta_guidelines: Mapped[str | None] = mapped_column(Text)  # Free-form: "CTAs should feel like an invitation, not a demand"

    # Audience
    target_personas: Mapped[str | None] = mapped_column(Text)  # JSON: [{"name": "...", "description": "...", "pain_points": [...]}]
    pain_points: Mapped[str | None] = mapped_column(Text)  # JSON: ["Overwhelmed by too many tools", ...]

    # Source document (raw markdown, if uploaded)
    markdown_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Meta
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
