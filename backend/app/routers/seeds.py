"""Seed Bank — park, browse, and develop captured ideas."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.seed_bank import Seed
from app.permissions import get_current_user, scope_product_query

router = APIRouter()


# ─── Request / Response Models ────────────────────────────────────────────────


class SeedCreate(BaseModel):
    product_id: str
    seed: str
    heat: list[str] = []
    audience_hook: str = ""
    template_fit: str = "A"
    subject_line: str | None = None
    metaphor: str | None = None
    weekly_theme: str | None = None
    verdict: str = "Strong enough to build on"
    raw_transcript: str | None = None
    raw_ideas: list[str] = []
    source: str = "manual"
    notes: str | None = None
    priority: int = 0


class SeedUpdate(BaseModel):
    seed: str | None = None
    audience_hook: str | None = None
    template_fit: str | None = None
    subject_line: str | None = None
    metaphor: str | None = None
    weekly_theme: str | None = None
    notes: str | None = None
    priority: int | None = None
    status: str | None = None


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _seed_to_dict(s: Seed) -> dict:
    return {
        "id": s.id,
        "product_id": s.product_id,
        "seed": s.seed,
        "heat": json.loads(s.heat) if s.heat else [],
        "audience_hook": s.audience_hook,
        "template_fit": s.template_fit,
        "subject_line": s.subject_line,
        "metaphor": s.metaphor,
        "weekly_theme": s.weekly_theme,
        "verdict": s.verdict,
        "raw_transcript": s.raw_transcript,
        "raw_ideas": json.loads(s.raw_ideas) if s.raw_ideas else [],
        "source": s.source,
        "status": s.status,
        "used_at": s.used_at.isoformat() if s.used_at else None,
        "content_piece_id": s.content_piece_id,
        "notes": s.notes,
        "priority": s.priority,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/")
def create_seed(body: SeedCreate, db: Session = Depends(get_db)):
    """Park a new idea in the Seed Bank."""
    seed = Seed(
        product_id=body.product_id,
        seed=body.seed,
        heat=json.dumps(body.heat),
        audience_hook=body.audience_hook,
        template_fit=body.template_fit,
        subject_line=body.subject_line,
        metaphor=body.metaphor,
        weekly_theme=body.weekly_theme,
        verdict=body.verdict,
        raw_transcript=body.raw_transcript,
        raw_ideas=json.dumps(body.raw_ideas),
        source=body.source,
        notes=body.notes,
        priority=body.priority,
    )
    db.add(seed)
    db.commit()
    db.refresh(seed)
    return _seed_to_dict(seed)


@router.get("/")
def list_seeds(
    product_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List seeds, optionally filtered by product and status."""
    q = db.query(Seed)
    q = scope_product_query(q, Seed, user, db)
    if product_id:
        q = q.filter(Seed.product_id == product_id)
    if status:
        q = q.filter(Seed.status == status)
    seeds = q.order_by(Seed.priority.desc(), Seed.created_at.desc()).all()
    return [_seed_to_dict(s) for s in seeds]


@router.get("/{seed_id}")
def get_seed(seed_id: str, db: Session = Depends(get_db)):
    """Get a single seed by ID."""
    seed = db.query(Seed).filter(Seed.id == seed_id).first()
    if not seed:
        raise HTTPException(status_code=404, detail="Seed not found")
    return _seed_to_dict(seed)


@router.put("/{seed_id}")
def update_seed(seed_id: str, body: SeedUpdate, db: Session = Depends(get_db)):
    """Update a seed (status, notes, priority, etc.)."""
    seed = db.query(Seed).filter(Seed.id == seed_id).first()
    if not seed:
        raise HTTPException(status_code=404, detail="Seed not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(seed, field, value)

    if body.status == "used":
        seed.used_at = datetime.now(timezone.utc)

    seed.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(seed)
    return _seed_to_dict(seed)


@router.delete("/{seed_id}")
def delete_seed(seed_id: str, db: Session = Depends(get_db)):
    """Remove a seed from the bank."""
    seed = db.query(Seed).filter(Seed.id == seed_id).first()
    if not seed:
        raise HTTPException(status_code=404, detail="Seed not found")
    db.delete(seed)
    db.commit()
    return {"deleted": True}
