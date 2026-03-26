"""Content Prompts Router — CRUD for per-product and per-profile content pipeline prompts.

GET  /api/products/{id}/content-prompts       — returns current prompts (custom or defaults)
PUT  /api/products/{id}/content-prompts       — create/update custom prompt set for a product
DELETE /api/products/{id}/content-prompts     — reset product prompts to defaults

GET  /api/voice-profiles/{id}/content-prompts — returns current prompts for a voice profile
PUT  /api/voice-profiles/{id}/content-prompts — create/update custom prompt set for a profile
DELETE /api/voice-profiles/{id}/content-prompts — reset profile prompts to defaults

GET  /api/content-prompts/defaults            — view all generic defaults
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.engines.prompt_defaults import get_all_defaults, load_prompt_set
from app.models import Product
from app.models.content_prompts import ContentPromptSet
from app.models.voice_profile import VoiceProfile
from app.permissions import get_current_user

router = APIRouter()


# ─── Request / Response Models ────────────────────────────────────────────────


class PromptSetUpdate(BaseModel):
    """All fields optional — only send what you want to override."""
    voice_rules: str | None = None
    idea_sharpener_prompt: str | None = None
    template_instructions: dict | None = None  # {"A": "...", "B": "...", "C": "...", "D": "..."}
    social_post_rules: str | None = None
    video_script_rules: str | None = None
    x_thread_rules: str | None = None
    weekly_mix: list[dict] | None = None
    system_prompt_intro: str | None = None


# ─── Product Prompt Endpoints ─────────────────────────────────────────────────


@router.get("/{product_id}/content-prompts")
async def get_content_prompts(
    product_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get the active prompt set for a product (custom overrides merged with defaults)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    prompt_set = load_prompt_set(product_id, db)

    # Also indicate whether this product has custom prompts
    custom = db.query(ContentPromptSet).filter_by(product_id=product_id).first()

    return {
        "product_id": product_id,
        "has_custom_prompts": custom is not None,
        "prompts": prompt_set,
    }


@router.put("/{product_id}/content-prompts")
async def update_content_prompts(
    product_id: str,
    data: PromptSetUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Create or update custom prompts for a product. Only set fields you want to override."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    custom = db.query(ContentPromptSet).filter_by(product_id=product_id).first()
    if not custom:
        custom = ContentPromptSet(product_id=product_id)
        db.add(custom)

    _apply_prompt_updates(custom, data)
    db.commit()

    prompt_set = load_prompt_set(product_id, db)
    return {
        "product_id": product_id,
        "has_custom_prompts": True,
        "prompts": prompt_set,
    }


@router.delete("/{product_id}/content-prompts")
async def reset_content_prompts(
    product_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Reset to defaults by deleting the custom prompt set."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    custom = db.query(ContentPromptSet).filter_by(product_id=product_id).first()
    if custom:
        db.delete(custom)
        db.commit()

    return {"product_id": product_id, "has_custom_prompts": False, "message": "Reset to defaults"}


# ─── Voice Profile Prompt Endpoints ───────────────────────────────────────────


@router.get("/profile/{voice_profile_id}/content-prompts", tags=["content-prompts"])
async def get_profile_prompts(
    voice_profile_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get the active prompt set for a voice profile."""
    profile = db.query(VoiceProfile).filter(VoiceProfile.id == voice_profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")

    prompt_set = load_prompt_set(None, db, voice_profile_id=voice_profile_id)
    custom = db.query(ContentPromptSet).filter_by(voice_profile_id=voice_profile_id).first()

    return {
        "voice_profile_id": voice_profile_id,
        "profile_name": profile.name,
        "has_custom_prompts": custom is not None,
        "prompts": prompt_set,
    }


@router.put("/profile/{voice_profile_id}/content-prompts", tags=["content-prompts"])
async def update_profile_prompts(
    voice_profile_id: str,
    data: PromptSetUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Create or update custom prompts for a voice profile."""
    profile = db.query(VoiceProfile).filter(VoiceProfile.id == voice_profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")

    custom = db.query(ContentPromptSet).filter_by(voice_profile_id=voice_profile_id).first()
    if not custom:
        custom = ContentPromptSet(voice_profile_id=voice_profile_id)
        db.add(custom)

    _apply_prompt_updates(custom, data)
    db.commit()

    prompt_set = load_prompt_set(None, db, voice_profile_id=voice_profile_id)
    return {
        "voice_profile_id": voice_profile_id,
        "profile_name": profile.name,
        "has_custom_prompts": True,
        "prompts": prompt_set,
    }


@router.delete("/profile/{voice_profile_id}/content-prompts", tags=["content-prompts"])
async def reset_profile_prompts(
    voice_profile_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Reset voice profile prompts to defaults."""
    profile = db.query(VoiceProfile).filter(VoiceProfile.id == voice_profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")

    custom = db.query(ContentPromptSet).filter_by(voice_profile_id=voice_profile_id).first()
    if custom:
        db.delete(custom)
        db.commit()

    return {"voice_profile_id": voice_profile_id, "has_custom_prompts": False, "message": "Reset to defaults"}


# ─── Defaults ─────────────────────────────────────────────────────────────────


@router.get("/defaults", tags=["content-prompts"])
async def get_default_prompts(
    user: dict = Depends(get_current_user),
):
    """View all generic default prompts (for reference before customizing)."""
    return get_all_defaults()


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _apply_prompt_updates(custom: ContentPromptSet, data: PromptSetUpdate):
    """Apply non-None fields from the update request to a ContentPromptSet."""
    if data.voice_rules is not None:
        custom.voice_rules = data.voice_rules
    if data.idea_sharpener_prompt is not None:
        custom.idea_sharpener_prompt = data.idea_sharpener_prompt
    if data.template_instructions is not None:
        custom.template_instructions = json.dumps(data.template_instructions)
    if data.social_post_rules is not None:
        custom.social_post_rules = data.social_post_rules
    if data.video_script_rules is not None:
        custom.video_script_rules = data.video_script_rules
    if data.x_thread_rules is not None:
        custom.x_thread_rules = data.x_thread_rules
    if data.weekly_mix is not None:
        custom.weekly_mix = json.dumps(data.weekly_mix)
    if data.system_prompt_intro is not None:
        custom.system_prompt_intro = data.system_prompt_intro
