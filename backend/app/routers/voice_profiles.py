"""Voice Profiles — CRUD for personal writing voice & style definitions."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.engines.voice_scoring import compute_voice_profile_score, compute_section_scores, get_quality_grade
from app.models.voice_profile import VoiceProfile
from app.permissions import get_current_user
from app.services.claude_client import call_claude

router = APIRouter()


# ─── Request / Response Models ────────────────────────────────────────────────


class VoiceProfileCreate(BaseModel):
    name: str
    product_id: str | None = None
    style_guide_id: str | None = None
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
    product_id: str | None = None
    style_guide_id: str | None = None
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

    quality = p.quality_score or 0
    return {
        "id": p.id,
        "user_id": p.user_id,
        "product_id": p.product_id,
        "style_guide_id": p.style_guide_id,
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
        "quality_score": quality,
        "quality_grade": get_quality_grade(quality),
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
    db.flush()
    profile.quality_score = compute_voice_profile_score(profile)
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

    profile.quality_score = compute_voice_profile_score(profile)
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


# ─── Score Preview & AI Analysis ────────────────────────────────────────────


class ScorePreviewRequest(BaseModel):
    """Preview quality score without saving to DB."""
    name: str = ""
    description: str | None = None
    tone_keywords: list[str] = []
    style_rules: str | None = None
    sentence_style: str | None = None
    favorite_phrases: list[str] = []
    words_to_avoid: list[str] = []
    words_to_use: list[str] = []
    writing_samples: list[str] = []


class AnalyzeSamplesRequest(BaseModel):
    """Writing samples to analyze via AI."""
    writing_samples: list[str]


@router.post("/score-preview")
def score_preview(
    body: ScorePreviewRequest,
    user: dict = Depends(get_current_user),
):
    """Preview quality score for voice profile data without saving.

    Used by the builder frontend to show live scoring as the user fills in sections.
    """
    # Create a transient profile object (not saved to DB) for scoring
    profile = VoiceProfile(
        user_id=user["id"],
        name=body.name,
        description=body.description,
        tone_keywords=json.dumps(body.tone_keywords) if body.tone_keywords else None,
        style_rules=body.style_rules,
        sentence_style=body.sentence_style,
        favorite_phrases=json.dumps(body.favorite_phrases) if body.favorite_phrases else None,
        words_to_avoid=json.dumps(body.words_to_avoid) if body.words_to_avoid else None,
        words_to_use=json.dumps(body.words_to_use) if body.words_to_use else None,
        writing_samples=json.dumps(body.writing_samples) if body.writing_samples else None,
    )
    return compute_section_scores(profile)


@router.post("/analyze-samples")
async def analyze_samples(
    body: AnalyzeSamplesRequest,
    user: dict = Depends(get_current_user),
):
    """Analyze writing samples via Claude and extract voice profile fields.

    Powers the "Analyze my writing" button in the Voice Profile Builder.
    Returns suggested tone, vocabulary, and anti-patterns derived from the samples.
    """
    if not body.writing_samples or not any(s.strip() for s in body.writing_samples):
        raise HTTPException(status_code=400, detail="At least one non-empty writing sample is required")

    from app.engines.voice_analyzer import analyze_writing_samples
    result = await analyze_writing_samples(body.writing_samples)
    return result


# ─── Markdown Import ─────────────────────────────────────────────────────────

_PARSE_SYSTEM = (
    "You are a voice-profile extraction assistant. Given a markdown document "
    "containing voice rules, style guides, or prompt instructions, extract "
    "structured voice profile fields. Respond ONLY with valid JSON — no "
    "markdown fences, no commentary."
)

_PARSE_PROMPT = """\
Analyze the following markdown document and extract voice profile fields.

Return a JSON object with these keys:
- "name" (string) — a suggested profile name based on the content
- "description" (string) — a brief 1-2 sentence description of this voice
- "tone_keywords" (list of strings) — tone descriptors, e.g. ["warm", "direct", "witty"]
- "style_rules" (string) — writing style guidelines as a paragraph
- "sentence_style" (string) — one of: "short_punchy", "long_flowing", "mixed", "varied"
- "favorite_phrases" (list of strings) — signature phrases or expressions
- "words_to_avoid" (list of strings) — words or phrases to never use
- "words_to_use" (list of strings) — preferred words or phrases
- "writing_samples" (list of strings) — example paragraphs showing the voice
- "content_themes" (list of strings) — topics this voice typically covers

If a field cannot be determined from the document, use an empty string for string
fields and an empty list for list fields.

---

{markdown_content}
"""


async def _parse_markdown_to_profile(markdown_content: str) -> dict:
    """Use Claude to extract voice profile fields from markdown text."""
    prompt = _PARSE_PROMPT.format(markdown_content=markdown_content)
    result = await call_claude(prompt, system=_PARSE_SYSTEM, max_tokens=4096)

    raw = result["content"].strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[: -3].rstrip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Failed to parse AI response as JSON",
        )

    # Normalise to expected schema
    return {
        "name": parsed.get("name", ""),
        "description": parsed.get("description", ""),
        "tone_keywords": parsed.get("tone_keywords", []),
        "style_rules": parsed.get("style_rules", ""),
        "sentence_style": parsed.get("sentence_style", "mixed"),
        "favorite_phrases": parsed.get("favorite_phrases", []),
        "words_to_avoid": parsed.get("words_to_avoid", []),
        "words_to_use": parsed.get("words_to_use", []),
        "writing_samples": parsed.get("writing_samples", []),
        "content_themes": parsed.get("content_themes", []),
    }


@router.post("/import-markdown")
async def import_markdown_parse(
    file: UploadFile,
    user: dict = Depends(get_current_user),
):
    """Parse a .md file and return extracted voice profile fields for review."""
    if not file.filename or not file.filename.lower().endswith(".md"):
        raise HTTPException(status_code=400, detail="Only .md files are accepted")

    content_bytes = await file.read()
    markdown_content = content_bytes.decode("utf-8", errors="replace")

    if not markdown_content.strip():
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    parsed = await _parse_markdown_to_profile(markdown_content)
    return parsed


@router.post("/import-markdown-and-create")
async def import_markdown_and_create(
    file: UploadFile,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Parse a .md file and immediately create a new voice profile."""
    if not file.filename or not file.filename.lower().endswith(".md"):
        raise HTTPException(status_code=400, detail="Only .md files are accepted")

    content_bytes = await file.read()
    markdown_content = content_bytes.decode("utf-8", errors="replace")

    if not markdown_content.strip():
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    parsed = await _parse_markdown_to_profile(markdown_content)

    # Ensure we have a name
    if not parsed.get("name"):
        parsed["name"] = file.filename.rsplit(".", 1)[0]

    data = _serialize(parsed)
    profile = VoiceProfile(user_id=user["id"], **data)
    db.add(profile)
    db.flush()
    profile.quality_score = compute_voice_profile_score(profile)
    db.commit()
    db.refresh(profile)
    return _profile_to_dict(profile)
