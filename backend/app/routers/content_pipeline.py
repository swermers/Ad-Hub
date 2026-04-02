"""Content Pipeline Router — Stepped content creation flow.

Breaks the content pipeline into discrete, approvable steps:
1. Sharpen — extract the core idea from raw input
2. Draft — generate the newsletter / primary content
3. Expand — generate platform variants using content-specific workflows
   Each content type has its own dedicated skill sequence:
   - Twitter posts: Post Sharpener (specificity/tension/stealable-line)
   - LinkedIn posts: Professional Tone Gate
   - Meta posts: Story Hook Gate
   - Video scripts: Video Converter (breath-blocks)
   - X threads: Thread Structurer (arc/pacing)
   - Video ads: Ad Copy + composition style
   - Carousels: Slide Architect (hook→build→CTA)
   - Email: Email Formatter (subject/preview/body/CTA)
4. Finalize — polish and save to database

Each step returns its output for review. The frontend calls the next
step only after the user approves (or auto-advances if toggled on).
"""

import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.engines.content_workflows import generate_content_by_type
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
    product_id: str | None = None
    raw_text: str  # transcribed voice memo + manual notes combined
    voice_profile_id: str | None = None
    workflow_type: str | None = None  # routes to content-type-specific flow


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
    product_id: str | None = None
    seed: dict  # the SharpenResponse data
    voice_profile_id: str | None = None
    template_override: str | None = None  # override template_fit from seed
    workflow_type: str | None = None


class DraftResponse(BaseModel):
    title: str
    subject_line: str
    preview_text: str
    body: str
    template_used: str


class ExpandRequest(BaseModel):
    """Newsletter draft → multi-platform content variants."""
    product_id: str | None = None
    seed: dict
    draft: dict  # the DraftResponse data
    voice_profile_id: str | None = None
    platforms: list[str] = ["twitter", "linkedin", "meta"]
    include_video_script: bool = True
    include_thread: bool = True
    include_video_ad: bool = False
    include_carousel: bool = False
    include_email: bool = False
    workflow_type: str | None = None  # routes to content-type-specific flow


class QuickExpandRequest(BaseModel):
    """Sharpened seed → platform content directly (skip newsletter draft)."""
    product_id: str | None = None
    seed: dict
    voice_profile_id: str | None = None
    platforms: list[str] = ["twitter", "linkedin", "meta"]
    content_types: list[str] = ["social_post"]
    include_video_script: bool = False
    include_thread: bool = False
    include_video_ad: bool = False
    include_carousel: bool = False
    include_email: bool = False
    workflow_type: str | None = None


class ExpandedPiece(BaseModel):
    content_type: str
    platform: str
    title: str
    body: str
    hook: str | None = None
    cta: str | None = None
    funnel_stage: str = "awareness"
    metadata: dict = {}
    # Video / carousel composition fields
    video_style: str | None = None
    video_config: dict | None = None


class ExpandResponse(BaseModel):
    pieces: list[ExpandedPiece]


class FinalizeRequest(BaseModel):
    """Save approved content pieces to the database."""
    product_id: str | None = None
    voice_profile_id: str | None = None
    seed: dict
    pieces: list[dict]  # list of ExpandedPiece-like dicts (may have user edits)
    save_seed: bool = True  # also save to seed bank


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _get_voice_context(voice_profile_id: str | None, user_id: str, db: Session, product_id: str | None = None) -> str:
    """Build voice context string from a voice profile.

    Resolution: explicit voice_profile_id > product voice profile > user default.
    """
    profile = None
    if voice_profile_id:
        profile = db.query(VoiceProfile).filter(VoiceProfile.id == voice_profile_id).first()
    if not profile and product_id:
        # Try product-specific voice profile
        profile = (
            db.query(VoiceProfile)
            .filter(VoiceProfile.product_id == product_id, VoiceProfile.user_id == user_id)
            .first()
        )
    if not profile:
        # Fall back to user's default profile
        profile = (
            db.query(VoiceProfile)
            .filter(VoiceProfile.user_id == user_id, VoiceProfile.is_default == True)  # noqa: E712
            .first()
        )

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


def _get_brand_context(product: Product | None, db: Session) -> str:
    """Get brand profile context for a product. Returns empty if no product."""
    if not product:
        return ""
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


def _get_product_context(product: Product | None) -> str:
    """Build product context block for prompts. Empty string if no product."""
    if not product:
        return "Mode: Personal brand content (no specific product)"
    return f"""{_get_product_context(product)}"""


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
    product = None
    if data.product_id:
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

    prompt_set = load_prompt_set(data.product_id, db, voice_profile_id=data.voice_profile_id)
    voice_context = _get_voice_context(data.voice_profile_id, user["id"], db, product_id=data.product_id)
    brand_context = _get_brand_context(product, db)

    system_prompt = f"""You are a content strategist and idea sharpener.

{_get_product_context(product)}

{voice_context}

{brand_context}

{prompt_set["voice_rules"]}"""

    user_prompt = f"""Here is raw input from the content creator (may include transcribed voice memo and typed notes):

---
{data.raw_text}
---

{prompt_set["idea_sharpener_prompt"]}"""

    result = await call_claude(user_prompt, system=system_prompt, premium=True)

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
    product = None
    if data.product_id:
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

    prompt_set = load_prompt_set(data.product_id, db, voice_profile_id=data.voice_profile_id)
    voice_context = _get_voice_context(data.voice_profile_id, user["id"], db, product_id=data.product_id)
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


# ─── Flow Helpers ──────────────────────────────────────────────────────────


def _load_workflow_overrides(product_id: str, flow_types: list[str], db: Session) -> dict[str, dict]:
    """Load active workflow prompt overrides from DB for the given product + flow types.

    Returns: {flow_type: {"step_prompts": {...}, "quality_gate_rules": {...}, "version": int}}
    """
    from app.models.content_workflow import ContentTypeWorkflow

    overrides = {}
    if not flow_types:
        return overrides

    workflows = (
        db.query(ContentTypeWorkflow)
        .filter(
            ContentTypeWorkflow.product_id == product_id,
            ContentTypeWorkflow.workflow_type.in_(flow_types),
            ContentTypeWorkflow.is_active == True,  # noqa: E712
        )
        .all()
    )

    for w in workflows:
        step_prompts = {}
        gate_rules = {}
        if w.step_prompts:
            try:
                step_prompts = json.loads(w.step_prompts)
            except json.JSONDecodeError:
                pass
        if w.quality_gate_rules:
            try:
                gate_rules = json.loads(w.quality_gate_rules)
            except json.JSONDecodeError:
                pass
        overrides[w.workflow_type] = {
            "step_prompts": step_prompts,
            "quality_gate_rules": gate_rules,
            "version": w.version,
        }

    return overrides


async def _run_flow_or_fallback(
    flow_type: str,
    fallback_ct: str,
    fallback_platform: str,
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
    workflow_overrides: dict,
) -> dict:
    """Run a content flow if registered, otherwise fall back to single-call generation."""
    from app.engines.flows import FlowContext, FlowRegistry

    flow = FlowRegistry.get(flow_type)

    if flow:
        ctx = FlowContext(
            seed=seed,
            draft=draft,
            product_context=product_context,
            voice_context=voice_context,
            prompt_set=prompt_set,
            workflow_type=flow_type,
            workflow_version=workflow_overrides.get("version", 1),
            step_prompt_overrides=workflow_overrides.get("step_prompts", {}),
            quality_gate_overrides=workflow_overrides.get("quality_gate_rules", {}),
        )
        result = await flow.run(ctx)
        return result.to_dict()

    # Fallback to single-call generation for unregistered flow types
    return await generate_content_by_type(
        content_type=fallback_ct,
        platform=fallback_platform,
        seed=seed,
        draft=draft,
        product_context=product_context,
        voice_context=voice_context,
        prompt_set=prompt_set,
    )


# ─── Step 3: Expand ─────────────────────────────────────────────────────────


@router.post("/expand", response_model=ExpandResponse)
async def expand_to_platforms(
    data: ExpandRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Expand the newsletter draft into multi-platform content variants.

    Uses the Flow Registry: each content type gets its own multi-step pipeline
    with specialized prompts, quality gates, and per-step refinement.
    All flows run in parallel via asyncio.gather.
    """
    product = None
    if data.product_id:
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

    voice_context = _get_voice_context(data.voice_profile_id, user["id"], db, product_id=data.product_id)
    prompt_set = load_prompt_set(data.product_id, db, voice_profile_id=data.voice_profile_id)
    brand_context = _get_brand_context(product, db)

    product_context = f"""{_get_product_context(product)}
{f"Brand: {brand_context}" if brand_context else ""}"""

    # Map platform → flow_type for social posts
    PLATFORM_FLOW_MAP = {
        "twitter": "x_post",
        "linkedin": "linkedin_post",
        "meta": "meta_post",
    }

    # Build the list of flows to run
    flow_specs = []
    for platform in data.platforms:
        flow_type = PLATFORM_FLOW_MAP.get(platform, "meta_post")
        flow_specs.append({"flow_type": flow_type, "fallback_ct": "social_post", "fallback_platform": platform})
    if data.include_video_script:
        flow_specs.append({"flow_type": "video_script", "fallback_ct": "video_script", "fallback_platform": "general"})
    if data.include_thread:
        flow_specs.append({"flow_type": "x_thread", "fallback_ct": "x_thread", "fallback_platform": "twitter"})
    if data.include_video_ad:
        flow_specs.append({"flow_type": "video_ad", "fallback_ct": "video_ad", "fallback_platform": "general"})
    if data.include_carousel:
        flow_specs.append({"flow_type": "carousel", "fallback_ct": "carousel", "fallback_platform": "general"})
    if data.include_email:
        flow_specs.append({"flow_type": "email", "fallback_ct": "email", "fallback_platform": "general"})

    # If a specific workflow_type is set, override all flows with that type
    if data.workflow_type:
        flow_specs = [{"flow_type": data.workflow_type, "fallback_ct": data.workflow_type, "fallback_platform": "general"}]

    # Load workflow-level prompt overrides from DB
    workflow_overrides = _load_workflow_overrides(data.product_id, [s["flow_type"] for s in flow_specs], db)

    # Run all flows in parallel
    tasks = []
    for spec in flow_specs:
        tasks.append(_run_flow_or_fallback(
            flow_type=spec["flow_type"],
            fallback_ct=spec["fallback_ct"],
            fallback_platform=spec["fallback_platform"],
            seed=data.seed,
            draft=data.draft,
            product_context=product_context,
            voice_context=voice_context,
            prompt_set=prompt_set,
            workflow_overrides=workflow_overrides.get(spec["flow_type"], {}),
        ))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    pieces = []
    for result in results:
        if isinstance(result, Exception):
            import logging
            logging.getLogger(__name__).warning(f"Flow failed: {result}")
            continue
        pieces.append(ExpandedPiece(
            content_type=result.get("content_type", "social_post"),
            platform=result.get("platform", "general"),
            title=result.get("title", ""),
            body=result.get("body", ""),
            hook=result.get("hook"),
            cta=result.get("cta"),
            funnel_stage=result.get("funnel_stage", "awareness"),
            metadata=result.get("metadata", {}),
            video_style=result.get("video_style"),
            video_config=result.get("video_config"),
        ))

    return ExpandResponse(pieces=pieces)


# ─── Step 3b: Quick Expand (skip newsletter draft) ─────────────────────────


@router.post("/quick-expand", response_model=ExpandResponse)
async def quick_expand(
    data: QuickExpandRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Generate platform content directly from seed, skipping the newsletter draft step.

    Uses the Flow Registry for multi-step generation per content type.
    """
    product = None
    if data.product_id:
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

    voice_context = _get_voice_context(data.voice_profile_id, user["id"], db, product_id=data.product_id)
    prompt_set = load_prompt_set(data.product_id, db, voice_profile_id=data.voice_profile_id)
    brand_context = _get_brand_context(product, db)

    product_context = f"""{_get_product_context(product)}
{f"Brand: {brand_context}" if brand_context else ""}"""

    PLATFORM_FLOW_MAP = {
        "twitter": "x_post",
        "linkedin": "linkedin_post",
        "meta": "meta_post",
    }

    # Build flow specs
    flow_specs = []
    for ct in data.content_types:
        for platform in data.platforms:
            flow_type = PLATFORM_FLOW_MAP.get(platform, ct)
            flow_specs.append({"flow_type": flow_type, "fallback_ct": ct, "fallback_platform": platform})
    if data.include_video_script:
        flow_specs.append({"flow_type": "video_script", "fallback_ct": "video_script", "fallback_platform": "general"})
    if data.include_thread:
        flow_specs.append({"flow_type": "x_thread", "fallback_ct": "x_thread", "fallback_platform": "twitter"})
    if data.include_video_ad:
        flow_specs.append({"flow_type": "video_ad", "fallback_ct": "video_ad", "fallback_platform": "general"})
    if data.include_carousel:
        flow_specs.append({"flow_type": "carousel", "fallback_ct": "carousel", "fallback_platform": "general"})
    if data.include_email:
        flow_specs.append({"flow_type": "email", "fallback_ct": "email", "fallback_platform": "general"})

    if data.workflow_type:
        flow_specs = [{"flow_type": data.workflow_type, "fallback_ct": data.workflow_type, "fallback_platform": "general"}]

    workflow_overrides = _load_workflow_overrides(data.product_id, [s["flow_type"] for s in flow_specs], db)

    tasks = [
        _run_flow_or_fallback(
            flow_type=spec["flow_type"],
            fallback_ct=spec["fallback_ct"],
            fallback_platform=spec["fallback_platform"],
            seed=data.seed,
            draft=None,
            product_context=product_context,
            voice_context=voice_context,
            prompt_set=prompt_set,
            workflow_overrides=workflow_overrides.get(spec["flow_type"], {}),
        )
        for spec in flow_specs
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    pieces = []
    for result in results:
        if isinstance(result, Exception):
            import logging
            logging.getLogger(__name__).warning(f"Flow failed: {result}")
            continue
        pieces.append(ExpandedPiece(
            content_type=result.get("content_type", "social_post"),
            platform=result.get("platform", "general"),
            title=result.get("title", ""),
            body=result.get("body", ""),
            hook=result.get("hook"),
            cta=result.get("cta"),
            funnel_stage=result.get("funnel_stage", "awareness"),
            metadata=result.get("metadata", {}),
            video_style=result.get("video_style"),
            video_config=result.get("video_config"),
        ))

    return ExpandResponse(pieces=pieces)


# ─── Step 5: Refine ───────────────────────────────────────────────────────


class RefineRequest(BaseModel):
    """Refine/regenerate a single content piece with optional instructions."""
    content_id: str
    instructions: str = ""  # e.g. "make it shorter", "more professional tone"
    voice_profile_id: str | None = None


class RefineResponse(BaseModel):
    title: str
    body: str
    hook: str | None = None
    cta: str | None = None


@router.post("/refine", response_model=RefineResponse)
async def refine_content(
    data: RefineRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Refine or regenerate a single content piece using Claude."""
    piece = db.query(ContentPiece).filter(ContentPiece.id == data.content_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Content piece not found")

    product = None
    if piece.product_id:
        product = db.query(Product).filter(Product.id == piece.product_id).first()

    voice_context = _get_voice_context(data.voice_profile_id, user["id"], db, product_id=piece.product_id)
    brand_context = _get_brand_context(product, db)

    system_prompt = f"""You are a content editor refining existing content.

{_get_product_context(product)}

{voice_context}

{brand_context}

Content Type: {piece.content_type}
Platform: {piece.platform}
Funnel Stage: {piece.funnel_stage}"""

    instruction_text = data.instructions or "Improve the overall quality, clarity, and impact of this content."

    user_prompt = f"""Here is the existing content to refine:

Title: {piece.title or ""}
Hook: {piece.hook or ""}
Body:
{piece.body}
CTA: {piece.cta or ""}

Refinement instructions: {instruction_text}

Return ONLY a JSON object with the refined content:
{{
    "title": "refined title",
    "body": "refined body text",
    "hook": "refined hook or null",
    "cta": "refined call to action or null"
}}

Return ONLY the JSON object."""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=4096, premium=True)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        parsed = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        parsed = {
            "title": piece.title or "",
            "body": result.get("content", piece.body),
            "hook": piece.hook,
            "cta": piece.cta,
        }

    return RefineResponse(**parsed)


# ─── Step 4: Finalize ───────────────────────────────────────────────────────


@router.post("/finalize")
async def finalize_content(
    data: FinalizeRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Save the approved content pieces to the database."""
    product = None
    if data.product_id:
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

    saved_ids = []

    try:
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
                # video_ad and carousel stay as-is
            }

            # Determine media type
            media_type_map = {
                "video_ad": "video",
                "carousel": "carousel",
                "video_script": "text",
            }
            media_type = media_type_map.get(ct, "text")

            # Video config
            video_style = piece_data.get("video_style")
            video_config = piece_data.get("video_config")
            aspect_ratio = video_config.get("aspect_ratio") if isinstance(video_config, dict) else None

            piece = ContentPiece(
                product_id=data.product_id or None,
                voice_profile_id=data.voice_profile_id,
                content_type=content_type_map.get(ct, ct),
                platform=piece_data.get("platform", "general"),
                title=piece_data.get("title", ""),
                body=piece_data.get("body", ""),
                hook=piece_data.get("hook"),
                cta=piece_data.get("cta"),
                funnel_stage=piece_data.get("funnel_stage", "awareness"),
                status="draft",
                generation_metadata=json.dumps(meta),
                media_type=media_type,
                video_style=video_style,
                video_config=json.dumps(video_config) if video_config else None,
                aspect_ratio=aspect_ratio,
            )
            db.add(piece)
            db.flush()
            saved_ids.append(piece.id)

        # Optionally save the seed to the seed bank
        seed_id = None
        if data.save_seed and data.seed.get("seed"):
            seed = Seed(
                product_id=data.product_id or None,
                voice_profile_id=data.voice_profile_id,
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save content: {str(e)}")
