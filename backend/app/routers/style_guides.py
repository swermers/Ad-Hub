"""Style Guides router — CRUD + PDF/image extraction.

Style guides are workspace-scoped and reusable across multiple voice profiles.
They store messaging pillars, writing rules, and audience context.
"""

import json
import os
import uuid as uuid_mod
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.style_guide import StyleGuide
from app.models.user import User
from app.models.workspace import Workspace
from app.permissions import deny_agent, get_current_user

router = APIRouter(dependencies=[Depends(deny_agent)])

STYLE_GUIDES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "style-guides"
)


# ── Pydantic models ──────────────────────────────────────────────────────────


class StyleGuideCreate(BaseModel):
    name: str
    description: str | None = None
    messaging_pillars: list[str] | None = None
    taglines: list[str] | None = None
    mission_statement: str | None = None
    value_proposition: str | None = None
    tone_rules: str | None = None
    formatting_rules: str | None = None
    vocabulary_rules: str | None = None
    cta_guidelines: str | None = None
    target_personas: list[dict] | None = None
    pain_points: list[str] | None = None
    is_default: bool = False


class StyleGuideUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    messaging_pillars: list[str] | None = None
    taglines: list[str] | None = None
    mission_statement: str | None = None
    value_proposition: str | None = None
    tone_rules: str | None = None
    formatting_rules: str | None = None
    vocabulary_rules: str | None = None
    cta_guidelines: str | None = None
    target_personas: list[dict] | None = None
    pain_points: list[str] | None = None
    is_default: bool | None = None


class StyleGuideResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: str | None
    messaging_pillars: str | None
    taglines: str | None
    mission_statement: str | None
    value_proposition: str | None
    tone_rules: str | None
    formatting_rules: str | None
    vocabulary_rules: str | None
    cta_guidelines: str | None
    target_personas: str | None
    pain_points: str | None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


_JSON_FIELDS = {"messaging_pillars", "taglines", "target_personas", "pain_points"}


def _serialize(data: dict) -> dict:
    result = {}
    for key, value in data.items():
        if value is not None and key in _JSON_FIELDS:
            result[key] = json.dumps(value)
        elif value is not None:
            result[key] = value
    return result


def _get_workspace_id(user: dict, db: Session) -> str:
    user_row = db.query(User).filter(User.id == user["sub"]).first()
    if not user_row or not user_row.workspace_id:
        ws = db.query(Workspace).first()
        return ws.id if ws else ""
    return user_row.workspace_id


# ── CRUD Endpoints ────────────────────────────────────────────────────────────


@router.post("", response_model=StyleGuideResponse, status_code=201)
def create_style_guide(data: StyleGuideCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    workspace_id = _get_workspace_id(user, db)
    guide = StyleGuide(
        workspace_id=workspace_id,
        **_serialize(data.model_dump(exclude_unset=True)),
    )
    db.add(guide)
    db.commit()
    db.refresh(guide)
    return guide


@router.get("", response_model=list[StyleGuideResponse])
def list_style_guides(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    workspace_id = _get_workspace_id(user, db)
    return (
        db.query(StyleGuide)
        .filter(StyleGuide.workspace_id == workspace_id)
        .order_by(StyleGuide.created_at.desc())
        .all()
    )


@router.get("/{guide_id}", response_model=StyleGuideResponse)
def get_style_guide(guide_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    workspace_id = _get_workspace_id(user, db)
    guide = db.query(StyleGuide).filter(StyleGuide.id == guide_id, StyleGuide.workspace_id == workspace_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Style guide not found")
    return guide


@router.put("/{guide_id}", response_model=StyleGuideResponse)
def update_style_guide(guide_id: str, data: StyleGuideUpdate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    workspace_id = _get_workspace_id(user, db)
    guide = db.query(StyleGuide).filter(StyleGuide.id == guide_id, StyleGuide.workspace_id == workspace_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Style guide not found")

    update_data = _serialize(data.model_dump(exclude_unset=True))
    for key, value in update_data.items():
        setattr(guide, key, value)
    guide.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(guide)
    return guide


@router.delete("/{guide_id}", status_code=204)
def delete_style_guide(guide_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    workspace_id = _get_workspace_id(user, db)
    guide = db.query(StyleGuide).filter(StyleGuide.id == guide_id, StyleGuide.workspace_id == workspace_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Style guide not found")
    db.delete(guide)
    db.commit()


# ── PDF / Image Extraction ────────────────────────────────────────────────────


STYLE_GUIDE_EXTRACTION_PROMPT = """You are analyzing a brand style guide or content strategy document. Extract all writing and messaging guidelines you can find.

Look for and extract:

1. **Messaging pillars** — the core themes or values the brand communicates (e.g., "Trust", "Simplicity", "Innovation")
2. **Taglines / slogans** — any approved taglines, slogans, or campaign phrases
3. **Mission statement** — the brand's purpose or mission
4. **Value proposition** — what makes this brand uniquely valuable
5. **Tone rules** — how the writing should feel (e.g., "Write like a thoughtful friend, not a brand account")
6. **Formatting rules** — paragraph length, bullet usage, headers, capitalization
7. **Vocabulary rules** — words/phrases to prefer or avoid
8. **CTA guidelines** — how calls-to-action should be phrased or feel
9. **Target personas** — audience descriptions with pain points and motivations
10. **Pain points** — the audience problems this brand solves

Return ONLY a JSON object with this exact structure (use null for fields you can't find):
{
    "messaging_pillars": ["Pillar 1", "Pillar 2"],
    "taglines": ["tagline or slogan"],
    "mission_statement": "free text or null",
    "value_proposition": "free text or null",
    "tone_rules": "free text describing tone, or null",
    "formatting_rules": "free text describing formatting rules, or null",
    "vocabulary_rules": {"prefer": ["word1", "word2"], "avoid": ["word3"]},
    "cta_guidelines": "free text or null",
    "target_personas": [{"name": "Persona Name", "description": "Who they are", "pain_points": ["pain 1"]}],
    "pain_points": ["pain point 1", "pain point 2"],
    "summary": "2-3 sentence summary of the style guide"
}

Return ONLY the JSON object, no additional text."""


class StyleGuideExtractResponse(BaseModel):
    status: str
    extracted_fields: int
    summary: str
    guide: StyleGuideResponse


@router.post("/{guide_id}/extract", response_model=StyleGuideExtractResponse)
async def extract_style_guide(guide_id: str, file: UploadFile, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Upload a PDF or image and use Claude Vision to extract style guide data into an existing guide."""
    import base64

    from app.services.claude_client import call_claude_sync

    workspace_id = _get_workspace_id(user, db)
    guide = db.query(StyleGuide).filter(StyleGuide.id == guide_id, StyleGuide.workspace_id == workspace_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Style guide not found")

    filename = file.filename or "guide.pdf"
    ext = os.path.splitext(filename)[1].lower()
    allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"}
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Upload a PDF or image (PNG, JPG, WEBP).",
        )

    content = await file.read()

    os.makedirs(STYLE_GUIDES_DIR, exist_ok=True)
    saved_filename = f"{uuid_mod.uuid4()}{ext}"
    filepath = os.path.join(STYLE_GUIDES_DIR, saved_filename)
    with open(filepath, "wb") as f:
        f.write(content)

    media_type_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".pdf": "application/pdf",
    }
    media_type = media_type_map.get(ext, "application/octet-stream")
    b64_data = base64.b64encode(content).decode("utf-8")
    images = [{"media_type": media_type, "data": b64_data}]

    result = call_claude_sync(
        STYLE_GUIDE_EXTRACTION_PROMPT,
        system="You are a brand strategy expert. Analyze style guides and extract structured messaging and writing rules with precision.",
        images=images,
        premium=True,
    )

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        extracted = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        raise HTTPException(
            status_code=500,
            detail="Failed to parse style guide. Try uploading a clearer image or a different page.",
        )

    fields_updated = 0

    json_list_fields = ["messaging_pillars", "taglines", "pain_points"]
    for field in json_list_fields:
        value = extracted.get(field)
        if value and isinstance(value, list) and len(value) > 0:
            setattr(guide, field, json.dumps(value))
            fields_updated += 1

    # target_personas is a list of dicts
    personas = extracted.get("target_personas")
    if personas and isinstance(personas, list) and len(personas) > 0:
        guide.target_personas = json.dumps(personas)
        fields_updated += 1

    # vocabulary_rules is a dict
    vocab = extracted.get("vocabulary_rules")
    if vocab and isinstance(vocab, dict):
        guide.vocabulary_rules = json.dumps(vocab)
        fields_updated += 1

    text_fields = ["mission_statement", "value_proposition", "tone_rules", "formatting_rules", "cta_guidelines"]
    for field in text_fields:
        value = extracted.get(field)
        if value and isinstance(value, str) and value.strip() and value.strip().lower() != "null":
            setattr(guide, field, value.strip())
            fields_updated += 1

    guide.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(guide)

    summary = extracted.get("summary", "Style guide processed successfully.")
    return StyleGuideExtractResponse(
        status="success",
        extracted_fields=fields_updated,
        summary=summary,
        guide=StyleGuideResponse.model_validate(guide),
    )


@router.post("/create-and-extract", response_model=StyleGuideExtractResponse, status_code=201)
async def create_and_extract_style_guide(
    name: str,
    file: UploadFile,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Create a new style guide and immediately extract data from an uploaded PDF/image."""
    workspace_id = _get_workspace_id(user, db)
    guide = StyleGuide(workspace_id=workspace_id, name=name)
    db.add(guide)
    db.commit()
    db.refresh(guide)

    # Reuse the extraction endpoint logic via direct call
    from fastapi import UploadFile as FUploadFile  # noqa: F401
    return await extract_style_guide(guide.id, file, db, user)
