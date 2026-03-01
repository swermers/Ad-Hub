import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    website_url: Mapped[str | None] = mapped_column(String(2048))
    description: Mapped[str] = mapped_column(Text, default="")
    target_audience: Mapped[str] = mapped_column(Text, default="")
    pain_points: Mapped[str] = mapped_column(Text, default="")
    differentiators: Mapped[str] = mapped_column(Text, default="")
    brand_voice: Mapped[str | None] = mapped_column(Text)
    brand_brief: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="onboarding")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    crawled_pages: Mapped[list["CrawledPage"]] = relationship(  # noqa: F821
        back_populates="product", cascade="all, delete-orphan"
    )
    uploaded_documents: Mapped[list["UploadedDocument"]] = relationship(  # noqa: F821
        back_populates="product", cascade="all, delete-orphan"
    )
    content_pieces: Mapped[list["ContentPiece"]] = relationship(  # noqa: F821
        back_populates="product", cascade="all, delete-orphan"
    )
    connections: Mapped[list["PlatformConnection"]] = relationship(  # noqa: F821
        back_populates="product", cascade="all, delete-orphan"
    )
