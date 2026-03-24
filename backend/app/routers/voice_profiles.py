"""Voice Profiles — CRUD for personal writing voice & style definitions."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.voice_profile import VoiceProfile
from app.permissions import get_current_user

router = APIRouter()


# ─── Request / Response Models ────────────────────────────────────────────────


class VoiceProfileCreate(BaseModel):
    name: str
    description: str | None = None
    tone_keywords: list[str] = []
    style_rules: str | None = None
    sentence_style: str | None = None
    favorite_phrases: list[str] = []
    words_to_avoid: list[str] = []
    words_to_use: list[str] = []
    writing_samples: list[str] = []
    default_template: str | None = None
    content_themes: list[str] = []
    is_default: bool = False


class VoiceProfileUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    tone_keywords: list[str] | None = None
    style_rules: str | None = None
    sentence_style: str | None = None
    favorite_phrases: list[str] | None = None
    words_to_avoid: list[str] | None = None
    words_to_use: list[str] | None = None
    writing_samples: list[str] | None = None
    default_template: str | None = None
    content_themes: list[str] | None = None
    is_default: bool | None = None


# ─── JSON field helpers ──────────────────────────────────────────────────────

_JSON_FIELDS = {
    "tone_keywords", "favorite_phrases", "words_to_avoid",
    "words_to_use", "writing_samples", "content_themes",
}


def _serialize(data: dict) -> dict:
    result = {}
    for key, value in data.items():
        if value is not None and key in _JSON_FIELDS:
            result[key] = json.dumps(value)
        else:
            result[key] = value
    return result


def _profile_to_dict(p: VoiceProfile) -> dict:
    def _parse_json(val: str | None) -> list:
        if not val:
            return []
        try:
            return json.loads(val)
        except json.JSONDecodeError:
            return []

    return {
        "id": p.id,
        "user_id": p.user_id,
        "name": p.name,
        "description": p.description,
        "tone_keywords": _parse_json(p.tone_keywords),
        "style_rules": p.style_rules,
        "sentence_style": p.sentence_style,
        "favorite_phrases": _parse_json(p.favorite_phrases),
        "words_to_avoid": _parse_json(p.words_to_avoid),
        "words_to_use": _parse_json(p.words_to_use),
        "writing_samples": _parse_json(p.writing_samples),
        "default_template": p.default_template,
        "content_themes": _parse_json(p.content_themes),
        "is_default": p.is_default,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.post("/")
def create_voice_profile(
    body: VoiceProfileCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Create a new voice profile."""
    data = _serialize(body.model_dump())

    # If setting as default, unset other defaults
    if body.is_default:
        db.query(VoiceProfile).filter(
            VoiceProfile.user_id == user["id"],
            VoiceProfile.is_default == True,  # noqa: E712
        ).update({"is_default": False})

    profile = VoiceProfile(user_id=user["id"], **data)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _profile_to_dict(profile)


@router.get("/")
def list_voice_profiles(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all voice profiles for the current user."""
    profiles = (
        db.query(VoiceProfile)
        .filter(VoiceProfile.user_id == user["id"])
        .order_by(VoiceProfile.is_default.desc(), VoiceProfile.created_at.desc())
        .all()
    )
    return [_profile_to_dict(p) for p in profiles]


@router.get("/{profile_id}")
def get_voice_profile(
    profile_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get a single voice profile."""
    profile = (
        db.query(VoiceProfile)
        .filter(VoiceProfile.id == profile_id, VoiceProfile.user_id == user["id"])
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return _profile_to_dict(profile)


@router.put("/{profile_id}")
def update_voice_profile(
    profile_id: str,
    body: VoiceProfileUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Update a voice profile."""
    profile = (
        db.query(VoiceProfile)
        .filter(VoiceProfile.id == profile_id, VoiceProfile.user_id == user["id"])
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")

    update_data = _serialize(body.model_dump(exclude_unset=True))

    # If setting as default, unset other defaults
    if body.is_default:
        db.query(VoiceProfile).filter(
            VoiceProfile.user_id == user["id"],
            VoiceProfile.is_default == True,  # noqa: E712
            VoiceProfile.id != profile_id,
        ).update({"is_default": False})

    for key, value in update_data.items():
        setattr(profile, key, value)

    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return _profile_to_dict(profile)


@router.delete("/{profile_id}")
def delete_voice_profile(
    profile_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Delete a voice profile."""
    profile = (
        db.query(VoiceProfile)
        .filter(VoiceProfile.id == profile_id, VoiceProfile.user_id == user["id"])
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    db.delete(profile)
    db.commit()
    return {"deleted": True}
