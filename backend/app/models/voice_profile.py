"""Voice Profile — personal writing voice & style definitions.

Unlike BrandProfile (product-scoped), VoiceProfile is user-scoped.
It captures how the creator writes: tone, vocabulary, sentence style,
and writing samples that the content pipeline uses to match their voice.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class VoiceProfile(Base):
    __tablename__ = "voice_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "Personal Brand", "Company Voice"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # short description of this voice

    # Tone & Style
    tone_keywords: Mapped[str | None] = mapped_column(Text)  # JSON: ["warm", "observational", "grounded"]
    style_rules: Mapped[str | None] = mapped_column(Text)  # free-form style guide text
    sentence_style: Mapped[str | None] = mapped_column(String(50))  # short_punchy, long_flowing, mixed, varied

    # Vocabulary
    favorite_phrases: Mapped[str | None] = mapped_column(Text)  # JSON: ["stay curious", "here's the weight of it"]
    words_to_avoid: Mapped[str | None] = mapped_column(Text)  # JSON: ["journey", "transform", "unlock"]
    words_to_use: Mapped[str | None] = mapped_column(Text)  # JSON: ["notice", "weight", "friction"]

    # Writing Samples
    writing_samples: Mapped[str | None] = mapped_column(Text)  # JSON: ["sample paragraph 1", "sample paragraph 2"]

    # Preferences
    default_template: Mapped[str | None] = mapped_column(String(10))  # A, B, C, D
    content_themes: Mapped[str | None] = mapped_column(Text)  # JSON: ["mental health", "wellness", "leadership"]

    # Flags
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
