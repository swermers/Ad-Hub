"""Content Pipeline Router — Stepped content creation flow.

Breaks the content pipeline into discrete, approvable steps:
1. Sharpen — extract the core idea from raw input
2. Draft — generate the newsletter / primary content
3. Expand — generate all platform variants (social, video, thread)
4. Finalize — polish and save to database

Each step returns its output for review. The frontend calls the next
step only after the user approves (or auto-advances if toggled on).
"""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContentPiece, Product
from app.models.brand_profile import BrandProfile
from app.models.seed_bank import Seed
from app.models.voice_profile import VoiceProfile
from app.permissions import get_current_user
from app.services.claude_client import call_claude

router = APIRouter()


# ─── Request / Response Models ────────────────────────────────────────────────


class SharpenRequest(BaseModel):
    """Raw input → sharpened idea seed."""
    product_id: str
    raw_text: str  # transcribed voice memo + manual notes combined
    voice_profile_id: str | None = None


class SharpenResponse(BaseModel):
    seed: str
    heat: list[str]
    audience_hook: str
    template_fit: str
    subject_line: str
    metaphor: str | None
    weekly_theme: str
    raw_ideas: list[str]
    verdict: str


class DraftRequest(BaseModel):
    """Sharpened seed → newsletter/primary draft."""
    product_id: str
    seed: dict  # the SharpenResponse data
    voice_profile_id: str | None = None
    template_override: str | None = None  # override template_fit from seed


class DraftResponse(BaseModel):
    title: str
    subject_line: str
    preview_text: str
    body: str
    template_used: str


class ExpandRequest(BaseModel):
    """Newsletter draft → multi-platform content variants."""
    product_id: str
    seed: dict
    draft: dict  # the DraftResponse data
    voice_profile_id: str | None = None
    platforms: list[str] = ["twitter", "linkedin", "meta"]
    include_video_script: bool = True
    include_thread: bool = True


class ExpandedPiece(BaseModel):
    content_type: str
    platform: str
    title: str
    body: str
    hook: str | None = None
    cta: str | None = None
    funnel_stage: str = "awareness"
    metadata: dict = {}


class ExpandResponse(BaseModel):
    pieces: list[ExpandedPiece]


class FinalizeRequest(BaseModel):
    """Save approved content pieces to the database."""
    product_id: str
    seed: dict
    pieces: list[dict]  # list of ExpandedPiece-like dicts (may have user edits)
    save_seed: bool = True  # also save to seed bank


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _get_voice_context(voice_profile_id: str | None, user_id: str, db: Session) -> str:
    """Build voice context string from a voice profile."""
    if not voice_profile_id:
        # Try default profile
        profile = (
            db.query(VoiceProfile)
            .filter(VoiceProfile.user_id == user_id, VoiceProfile.is_default == True)  # noqa: E712
            .first()
        )
    else:
        profile = db.query(VoiceProfile).filter(VoiceProfile.id == voice_profile_id).first()

    if not profile:
        return ""

    parts = [f"CREATOR VOICE PROFILE: {profile.name}"]

    if profile.description:
        parts.append(f"Description: {profile.description}")

    if profile.tone_keywords:
        try:
            keywords = json.loads(profile.tone_keywords)
            parts.append(f"Tone: {', '.join(keywords)}")
        except json.JSONDecodeError:
            pass

    if profile.style_rules:
        parts.append(f"Style Rules: {profile.style_rules}")

    if profile.sentence_style:
        parts.append(f"Sentence Style: {profile.sentence_style}")

    if profile.favorite_phrases:
        try:
            phrases = json.loads(profile.favorite_phrases)
            parts.append(f"Signature Phrases: {', '.join(phrases)}")
        except json.JSONDecodeError:
            pass

    if profile.words_to_avoid:
        try:
            avoid = json.loads(profile.words_to_avoid)
            parts.append(f"Words to AVOID: {', '.join(avoid)}")
        except json.JSONDecodeError:
            pass

    if profile.words_to_use:
        try:
            use = json.loads(profile.words_to_use)
            parts.append(f"Words to USE: {', '.join(use)}")
        except json.JSONDecodeError:
            pass

    if profile.writing_samples:
        try:
            samples = json.loads(profile.writing_samples)
            if samples:
                parts.append("Writing Samples (match this voice):")
                for i, s in enumerate(samples[:3], 1):
                    parts.append(f"  Sample {i}: {s[:500]}")
        except json.JSONDecodeError:
            pass

    return "\n".join(parts)


def _get_brand_context(product: Product, db: Session) -> str:
    """Get brand profile context for a product."""
    bp = db.query(BrandProfile).filter(BrandProfile.product_id == product.id).first()
    if not bp:
        return ""

    parts = []
    if bp.tone_descriptors:
        try:
            parts.append(f"Brand Tone: {', '.join(json.loads(bp.tone_descriptors))}")
        except json.JSONDecodeError:
            pass
    if bp.always_use_words:
        try:
            parts.append(f"Brand Words to Use: {', '.join(json.loads(bp.always_use_words))}")
        except json.JSONDecodeError:
            pass
    if bp.never_use_words:
        try:
            parts.append(f"Brand Words to Avoid: {', '.join(json.loads(bp.never_use_words))}")
        except json.JSONDecodeError:
            pass
    if bp.cta_style:
        parts.append(f"CTA Style: {bp.cta_style}")

    return "\n".join(parts)


# Load per-product prompt sets with generic defaults
from app.engines.prompt_defaults import load_prompt_set  # noqa: E402


# ─── Step 1: Sharpen ────────────────────────────────────────────────────────


@router.post("/sharpen", response_model=SharpenResponse)
async def sharpen_idea(
    data: SharpenRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Extract the core idea from raw voice memo + notes input."""
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    prompt_set = load_prompt_set(data.product_id, db, voice_profile_id=data.voice_profile_id)
    voice_context = _get_voice_context(data.voice_profile_id, user["id"], db)
    brand_context = _get_brand_context(product, db)

    system_prompt = f"""You are a content strategist and idea sharpener.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}

{voice_context}

{brand_context}

{prompt_set["voice_rules"]}"""

    user_prompt = f"""Here is raw input from the content creator (may include transcribed voice memo and typed notes):

---
{data.raw_text}
---

{prompt_set["idea_sharpener_prompt"]}"""

    result = await call_claude(user_prompt, system=system_prompt)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        parsed = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        parsed = {
            "seed": data.raw_text[:200],
            "heat": [],
            "audience_hook": "",
            "template_fit": "A",
            "subject_line": "Untitled",
            "metaphor": None,
            "weekly_theme": "Content from raw input",
            "raw_ideas": [],
            "verdict": "Needs another angle",
        }

    return SharpenResponse(**parsed)


# ─── Step 2: Draft ──────────────────────────────────────────────────────────


@router.post("/draft", response_model=DraftResponse)
async def create_draft(
    data: DraftRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Generate the primary newsletter/content draft from the sharpened seed."""
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    prompt_set = load_prompt_set(data.product_id, db, voice_profile_id=data.voice_profile_id)
    voice_context = _get_voice_context(data.voice_profile_id, user["id"], db)
    brand_context = _get_brand_context(product, db)
    template = data.template_override or data.seed.get("template_fit", "A")

    template_instructions = prompt_set["template_instructions"]

    system_prompt = f"""You are a content writer. Write in the creator's authentic voice.

Product: {product.name}
Target Audience: {product.target_audience or "General audience"}

{voice_context}

{brand_context}

{prompt_set["voice_rules"]}

CONTENT BRIEF:
Seed: {data.seed.get('seed', '')}
Heat: {json.dumps(data.seed.get('heat', []))}
Audience Hook: {data.seed.get('audience_hook', '')}
Metaphor: {data.seed.get('metaphor', 'None')}
Weekly Theme: {data.seed.get('weekly_theme', '')}

{template_instructions.get(template, template_instructions.get("A", ""))}"""

    user_prompt = f"""Write a complete newsletter draft following Template {template}.

Use the seed observation as the foundation. Build around the central metaphor.
Preserve any "heat" lines (strong phrases) from the original input.

Return ONLY a JSON object:
{{
    "title": "newsletter title",
    "subject_line": "{data.seed.get('subject_line', 'Subject')}",
    "preview_text": "under 10 words, sensory",
    "body": "the full newsletter draft in markdown",
    "template_used": "{template}"
}}

Return ONLY the JSON object."""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=4096)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        parsed = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        parsed = {
            "title": data.seed.get("subject_line", "Draft"),
            "subject_line": data.seed.get("subject_line", "Draft"),
            "preview_text": "",
            "body": result.get("content", "Generation failed"),
            "template_used": template,
        }

    return DraftResponse(**parsed)


# ─── Step 3: Expand ─────────────────────────────────────────────────────────


@router.post("/expand", response_model=ExpandResponse)
async def expand_to_platforms(
    data: ExpandRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Expand the newsletter draft into multi-platform content variants."""
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    voice_context = _get_voice_context(data.voice_profile_id, user["id"], db)

    # Build the list of pieces to generate
    pieces_to_gen = []
    for platform in data.platforms:
        pieces_to_gen.append({"content_type": "social_post", "platform": platform})
    if data.include_video_script:
        pieces_to_gen.append({"content_type": "video_script", "platform": "general"})
    if data.include_thread:
        pieces_to_gen.append({"content_type": "x_thread", "platform": "twitter"})

    pieces_spec = "\n".join([f"- {p['content_type']} for {p['platform']}" for p in pieces_to_gen])

    prompt_set = load_prompt_set(data.product_id, db, voice_profile_id=data.voice_profile_id)

    system_prompt = f"""You are a content creator expanding a newsletter into platform-specific content.

{voice_context}

{prompt_set["voice_rules"]}

SOCIAL POST RULES:
{prompt_set["social_post_rules"]}

VIDEO SCRIPT RULES:
{prompt_set["video_script_rules"]}

X THREAD RULES:
{prompt_set["x_thread_rules"]}"""

    user_prompt = f"""Here is the approved newsletter draft:

Title: {data.draft.get('title', '')}
---
{data.draft.get('body', '')}
---

Core seed: {data.seed.get('seed', '')}
Weekly theme: {data.seed.get('weekly_theme', '')}

Generate these content pieces from the newsletter:
{pieces_spec}

Return ONLY a JSON array:
[
    {{
        "content_type": "social_post|video_script|x_thread",
        "platform": "twitter|linkedin|meta|general",
        "title": "short label",
        "body": "full content text",
        "hook": "opening line",
        "cta": "call to action",
        "funnel_stage": "awareness",
        "metadata": {{
            "specificity_check": "what the reader sees",
            "tension_check": "what pulls against what",
            "stealable_line": "the screenshot-worthy phrase"
        }}
    }}
]

Return ONLY the JSON array."""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=6144)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        parsed = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        parsed = []

    pieces = []
    for p in parsed:
        pieces.append(ExpandedPiece(
            content_type=p.get("content_type", "social_post"),
            platform=p.get("platform", "general"),
            title=p.get("title", ""),
            body=p.get("body", ""),
            hook=p.get("hook"),
            cta=p.get("cta"),
            funnel_stage=p.get("funnel_stage", "awareness"),
            metadata=p.get("metadata", {}),
        ))

    return ExpandResponse(pieces=pieces)


# ─── Step 4: Finalize ───────────────────────────────────────────────────────


@router.post("/finalize")
async def finalize_content(
    data: FinalizeRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Save the approved content pieces to the database."""
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    saved_ids = []

    for piece_data in data.pieces:
        meta = piece_data.get("metadata", {})
        meta["source"] = "content_studio_pipeline"
        meta["weekly_theme"] = data.seed.get("weekly_theme", "")
        meta["seed"] = data.seed.get("seed", "")

        ct = piece_data.get("content_type", "social_post")
        content_type_map = {
            "newsletter": "blog_draft",
            "video_script": "blog_draft",
            "x_thread": "social_post",
        }

        piece = ContentPiece(
            product_id=data.product_id,
            content_type=content_type_map.get(ct, ct),
            platform=piece_data.get("platform", "general"),
            title=piece_data.get("title", ""),
            body=piece_data.get("body", ""),
            hook=piece_data.get("hook"),
            cta=piece_data.get("cta"),
            funnel_stage=piece_data.get("funnel_stage", "awareness"),
            status="draft",
            generation_metadata=json.dumps(meta),
        )
        db.add(piece)
        db.flush()
        saved_ids.append(piece.id)

    # Optionally save the seed to the seed bank
    seed_id = None
    if data.save_seed and data.seed.get("seed"):
        seed = Seed(
            product_id=data.product_id,
            seed=data.seed.get("seed", ""),
            heat=json.dumps(data.seed.get("heat", [])),
            audience_hook=data.seed.get("audience_hook", ""),
            template_fit=data.seed.get("template_fit", "A"),
            subject_line=data.seed.get("subject_line"),
            metaphor=data.seed.get("metaphor"),
            weekly_theme=data.seed.get("weekly_theme"),
            verdict=data.seed.get("verdict", ""),
            raw_ideas=json.dumps(data.seed.get("raw_ideas", [])),
            source="content_studio",
            status="used",
        )
        db.add(seed)
        db.flush()
        seed_id = seed.id

    db.commit()

    return {
        "content_ids": saved_ids,
        "seed_id": seed_id,
        "pieces_saved": len(saved_ids),
    }
