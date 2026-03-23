import json
import os
import uuid as uuid_mod
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product
from app.models.brand_profile import BrandProfile, RejectionFeedback

router = APIRouter()

WRITING_SAMPLES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "writing-samples"
)
LOGO_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "logos"
)


# ── Pydantic models ──────────────────────────────────────────────────────────


class BrandProfileUpdate(BaseModel):
    # Voice & Tone
    writing_samples: list[str] | None = None
    tone_descriptors: list[str] | None = None
    always_use_words: list[str] | None = None
    never_use_words: list[str] | None = None
    sentence_style: str | None = None

    # Visual Identity
    logo_url: str | None = None
    logo_usage_rules: str | None = None
    primary_colors: list[str] | None = None
    secondary_colors: list[str] | None = None
    accent_colors: list[str] | None = None
    approved_fonts: list[str] | None = None
    photography_style: str | None = None

    # Content Rules
    approved_topics: list[str] | None = None
    off_limit_topics: list[str] | None = None
    claims_allowed: list[str] | None = None
    claims_need_review: list[str] | None = None
    hashtag_strategy: str | None = None
    emoji_usage: str | None = None
    approved_emojis: list[str] | None = None
    cta_style: str | None = None
    regulatory_notes: str | None = None

    # Platform-Specific Rules
    linkedin_rules: str | None = None
    instagram_rules: str | None = None
    x_rules: str | None = None
    meta_ads_rules: str | None = None

    # Content Pauses
    paused_topics: list[str] | None = None


class BrandProfileResponse(BaseModel):
    id: str
    product_id: str
    writing_samples: str | None
    tone_descriptors: str | None
    always_use_words: str | None
    never_use_words: str | None
    sentence_style: str | None
    logo_url: str | None
    logo_usage_rules: str | None
    primary_colors: str | None
    secondary_colors: str | None
    accent_colors: str | None
    approved_fonts: str | None
    photography_style: str | None
    approved_topics: str | None
    off_limit_topics: str | None
    claims_allowed: str | None
    claims_need_review: str | None
    hashtag_strategy: str | None
    emoji_usage: str | None
    approved_emojis: str | None
    cta_style: str | None
    regulatory_notes: str | None
    linkedin_rules: str | None
    instagram_rules: str | None
    x_rules: str | None
    meta_ads_rules: str | None
    paused_topics: str | None
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RejectionFeedbackCreate(BaseModel):
    content_id: str | None = None
    reason: str  # off_brand_voice, wrong_imagery, policy_concern, too_casual, too_formal, other
    details: str | None = None


class RejectionFeedbackResponse(BaseModel):
    id: str
    product_id: str
    content_id: str | None
    reason: str
    details: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── JSON field helpers ────────────────────────────────────────────────────────

_JSON_FIELDS = {
    "writing_samples", "tone_descriptors", "always_use_words", "never_use_words",
    "primary_colors", "secondary_colors", "accent_colors", "approved_fonts",
    "approved_topics", "off_limit_topics", "claims_allowed", "claims_need_review",
    "approved_emojis", "paused_topics",
}


def _serialize_update(data: dict) -> dict:
    """Convert list fields to JSON strings for storage."""
    result = {}
    for key, value in data.items():
        if value is not None and key in _JSON_FIELDS:
            result[key] = json.dumps(value)
        else:
            result[key] = value
    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/{product_id}/brand-profile", response_model=BrandProfileResponse)
def get_brand_profile(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()
    if not profile:
        # Auto-create an empty profile for this product
        profile = BrandProfile(product_id=product_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


@router.put("/{product_id}/brand-profile", response_model=BrandProfileResponse)
def update_brand_profile(product_id: str, data: BrandProfileUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()
    if not profile:
        profile = BrandProfile(product_id=product_id)
        db.add(profile)
        db.flush()

    update_data = _serialize_update(data.model_dump(exclude_unset=True))
    for key, value in update_data.items():
        setattr(profile, key, value)
    profile.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(profile)
    return profile


@router.post("/{product_id}/brand-profile/logo")
async def upload_logo(product_id: str, file: UploadFile, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    os.makedirs(LOGO_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "logo.png")[1] or ".png"
    filename = f"{uuid_mod.uuid4()}{ext}"
    filepath = os.path.join(LOGO_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    logo_path = f"/uploads/logos/{filename}"

    profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()
    if not profile:
        profile = BrandProfile(product_id=product_id, logo_url=logo_path)
        db.add(profile)
    else:
        profile.logo_url = logo_path
        profile.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(profile)
    return {"path": logo_path}


# ── Rejection Feedback ────────────────────────────────────────────────────────


@router.post("/{product_id}/rejection-feedback", response_model=RejectionFeedbackResponse, status_code=201)
def create_rejection_feedback(product_id: str, data: RejectionFeedbackCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    feedback = RejectionFeedback(
        product_id=product_id,
        content_id=data.content_id,
        reason=data.reason,
        details=data.details,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/{product_id}/rejection-feedback", response_model=list[RejectionFeedbackResponse])
def list_rejection_feedback(product_id: str, limit: int = 50, db: Session = Depends(get_db)):
    items = (
        db.query(RejectionFeedback)
        .filter(RejectionFeedback.product_id == product_id)
        .order_by(RejectionFeedback.created_at.desc())
        .limit(limit)
        .all()
    )
    return items
