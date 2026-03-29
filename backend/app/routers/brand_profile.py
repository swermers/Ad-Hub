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
from app.permissions import deny_agent

router = APIRouter(dependencies=[Depends(deny_agent)])

WRITING_SAMPLES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "writing-samples"
)
LOGO_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "logos"
)
BRAND_GUIDES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "brand-guides"
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


# ── Brand Guide Upload & AI Extraction ────────────────────────────────────────


BRAND_GUIDE_EXTRACTION_PROMPT = """You are analyzing a brand guide / style guide document. Extract all brand identity information you can find.

Look for and extract:

1. **Colors** — hex codes, RGB values, or named colors. Categorize as primary, secondary, or accent.
2. **Fonts/Typography** — font family names, weights, and usage rules.
3. **Voice & Tone** — any descriptors of how the brand sounds (e.g., "warm", "professional", "playful").
4. **Words to always use** — preferred terminology, brand-specific language.
5. **Words to never use** — banned words, competitor names, terms to avoid.
6. **Sentence style** — short and punchy, long and flowing, or mixed.
7. **Logo usage rules** — minimum sizes, clear space, do's and don'ts.
8. **Photography style** — candid, posed, lifestyle, product-focused, etc.
9. **Content rules** — approved topics, off-limit topics, regulatory constraints.
10. **Emoji usage** — encouraged, limited, or forbidden.
11. **CTA style** — how calls-to-action should feel (e.g., "action-oriented but warm").
12. **Platform-specific rules** — any per-platform guidelines (LinkedIn, Instagram, etc.).

Return ONLY a JSON object with this exact structure (use null for fields you can't find):
{
    "primary_colors": ["#hex1", "#hex2"],
    "secondary_colors": ["#hex1"],
    "accent_colors": ["#hex1"],
    "approved_fonts": ["Font Name 1", "Font Name 2"],
    "tone_descriptors": ["warm", "professional"],
    "always_use_words": ["preferred term 1"],
    "never_use_words": ["banned term 1"],
    "sentence_style": "short_punchy|long_flowing|mixed",
    "logo_usage_rules": "free text summary of logo rules",
    "photography_style": "free text description",
    "approved_topics": ["topic 1"],
    "off_limit_topics": ["topic 1"],
    "emoji_usage": "yes|limited|no",
    "cta_style": "free text description of CTA approach",
    "hashtag_strategy": "free text",
    "regulatory_notes": "any compliance or legal notes",
    "linkedin_rules": "platform-specific rules or null",
    "instagram_rules": "platform-specific rules or null",
    "x_rules": "platform-specific rules or null",
    "meta_ads_rules": "platform-specific rules or null",
    "summary": "2-3 sentence summary of the brand identity"
}

Be thorough. Extract every hex color you see. Extract every font name mentioned. If the guide uses color names instead of hex codes, convert common colors to hex (e.g., "Navy" → "#1a2744", "Gold" → "#d4a537").

Return ONLY the JSON object, no additional text."""


class BrandGuideExtractResponse(BaseModel):
    status: str
    extracted_fields: int
    summary: str
    profile: BrandProfileResponse


@router.post("/{product_id}/brand-profile/extract-guide", response_model=BrandGuideExtractResponse)
async def extract_brand_guide(product_id: str, file: UploadFile, db: Session = Depends(get_db)):
    """Upload a brand guide (PDF or image) and use Claude Vision to extract brand profile data."""
    import base64

    from app.services.claude_client import call_claude_sync

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate file type
    filename = file.filename or "guide.pdf"
    ext = os.path.splitext(filename)[1].lower()
    allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"}
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Upload a PDF or image (PNG, JPG, WEBP).",
        )

    content = await file.read()

    # Save the uploaded file
    os.makedirs(BRAND_GUIDES_DIR, exist_ok=True)
    saved_filename = f"{uuid_mod.uuid4()}{ext}"
    filepath = os.path.join(BRAND_GUIDES_DIR, saved_filename)
    with open(filepath, "wb") as f:
        f.write(content)

    # Determine media type
    media_type_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".pdf": "application/pdf",
    }
    media_type = media_type_map.get(ext, "application/octet-stream")

    # Encode as base64 for Claude Vision
    b64_data = base64.b64encode(content).decode("utf-8")

    # Call Claude with vision to extract brand details
    images = [{"media_type": media_type, "data": b64_data}]

    result = call_claude_sync(
        BRAND_GUIDE_EXTRACTION_PROMPT,
        system="You are a brand identity expert. Analyze brand guides and extract structured data with precision.",
        images=images,
        premium=True,
    )

    # Parse the extraction result
    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        extracted = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        raise HTTPException(
            status_code=500,
            detail="Failed to parse brand guide. Try uploading a clearer image or a different page.",
        )

    # Get or create brand profile
    profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()
    if not profile:
        profile = BrandProfile(product_id=product_id)
        db.add(profile)
        db.flush()

    # Apply extracted data to brand profile (only overwrite non-null extracted fields)
    fields_updated = 0

    json_field_map = {
        "primary_colors": "primary_colors",
        "secondary_colors": "secondary_colors",
        "accent_colors": "accent_colors",
        "approved_fonts": "approved_fonts",
        "tone_descriptors": "tone_descriptors",
        "always_use_words": "always_use_words",
        "never_use_words": "never_use_words",
        "approved_topics": "approved_topics",
        "off_limit_topics": "off_limit_topics",
    }

    text_field_map = {
        "sentence_style": "sentence_style",
        "logo_usage_rules": "logo_usage_rules",
        "photography_style": "photography_style",
        "emoji_usage": "emoji_usage",
        "cta_style": "cta_style",
        "hashtag_strategy": "hashtag_strategy",
        "regulatory_notes": "regulatory_notes",
        "linkedin_rules": "linkedin_rules",
        "instagram_rules": "instagram_rules",
        "x_rules": "x_rules",
        "meta_ads_rules": "meta_ads_rules",
    }

    for extract_key, profile_field in json_field_map.items():
        value = extracted.get(extract_key)
        if value and isinstance(value, list) and len(value) > 0:
            setattr(profile, profile_field, json.dumps(value))
            fields_updated += 1

    for extract_key, profile_field in text_field_map.items():
        value = extracted.get(extract_key)
        if value and isinstance(value, str) and value.strip() and value.strip().lower() != "null":
            setattr(profile, profile_field, value.strip())
            fields_updated += 1

    profile.updated_at = datetime.now(timezone.utc)
    profile.version += 1
    db.commit()
    db.refresh(profile)

    summary = extracted.get("summary", "Brand guide processed successfully.")

    return BrandGuideExtractResponse(
        status="success",
        extracted_fields=fields_updated,
        summary=summary,
        profile=BrandProfileResponse.model_validate(profile),
    )


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
