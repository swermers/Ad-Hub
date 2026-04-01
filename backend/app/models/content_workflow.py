"""ContentTypeWorkflow — versioned, per-content-type prompt overrides.

Each workflow stores per-step prompt overrides for a content type's
multi-step generation flow. Workflows are versioned so performance
can be attributed to specific prompt versions, enabling auto-evolution.

Prompt resolution chain:
  Generic defaults (prompt_defaults.py)
      ↓ overridden by
  Workflow defaults (workflow_defaults.py — per content type, per step)
      ↓ overridden by
  Product/Voice customizations (ContentPromptSet)
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text

from app.database import Base


class ContentTypeWorkflow(Base):
    __tablename__ = "content_type_workflows"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, nullable=True)  # null = global default workflow

    # Workflow identity
    workflow_type = Column(String(50), nullable=False)  # "linkedin_post", "x_thread", etc.
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, default=True)

    # Per-step prompt overrides (JSON dict: {"step_name": "prompt text", ...})
    step_prompts = Column(Text, nullable=True)

    # Quality gate rule overrides (JSON dict: {"gate_name": "rules text", ...})
    quality_gate_rules = Column(Text, nullable=True)

    # Performance tracking — updated as content from this workflow gets metrics
    total_pieces_generated = Column(Integer, default=0)
    avg_engagement_rate = Column(Float, nullable=True)
    avg_impressions = Column(Float, nullable=True)
    avg_clicks = Column(Float, nullable=True)
    win_rate = Column(Float, nullable=True)  # % of pieces that beat previous version

    # Evolution tracking
    parent_version = Column(Integer, nullable=True)  # v4's parent is v3
    evolution_notes = Column(Text, nullable=True)  # AI-generated notes on what changed

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
