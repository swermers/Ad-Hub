"""Workspace model — the customer/organization layer for multi-tenancy.

Each workspace represents one customer's isolated environment.
Products, users, and agent keys are scoped to a workspace.
Data never leaks across workspace boundaries.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Workspace(Base):
    """A customer workspace — the top-level isolation boundary.

    Everything below a workspace is scoped to it:
    - Products belong to a workspace
    - Users belong to a workspace
    - Agent API keys belong to a workspace
    - All queries are filtered by workspace_id
    """

    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # URL-friendly identifier

    # Owner info
    owner_email: Mapped[str | None] = mapped_column(String(255))

    # Subscription tier (for future billing)
    tier: Mapped[str] = mapped_column(String(50), default="starter")  # starter, pro, agency

    # Limits (per subscription tier)
    max_products: Mapped[int] = mapped_column(default=1)  # starter=1, pro=3, agency=10
    max_generations_per_month: Mapped[int] = mapped_column(default=100)

    # State
    is_active: Mapped[bool] = mapped_column(default=True)
    settings: Mapped[str | None] = mapped_column(Text)  # JSON for workspace-wide settings

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
