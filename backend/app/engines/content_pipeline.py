"""Content Pipeline Engine — Voice memo transcript → full content package.

Mirrors the actual skill pipeline:
1. Idea Sharpener: transcript → seed (core observation, heat, audience hook, template fit)
2. Drafter: seed → newsletter draft (Templates A-D)
3. Post Sharpener: seed → social posts (specificity, tension, stealable line)
4. Content Engine: newsletter → video script, X thread, X article, short-form
5. Video Converter: newsletter → breath-block talking points

Prompts are loaded per-product from ContentPromptSet (DB) with generic defaults
for new users. Power users customize prompts to match their voice over time.

Designed for agent consumption (OpenClaw on Pi calls this via API).
"""

import json

from app.engines.prompt_defaults import (
    DEFAULT_VOICE_RULES,
    DEFAULT_WEEKLY_MIX,
    load_prompt_set,
)
from app.engines.vectorstore import get_vectorstore
from app.services.claude_client import call_claude, call_claude_sync

# Backward-compatible export: old code that imports VOICE_RULES still works
VOICE_RULES = DEFAULT_VOICE_RULES


# ─── Step 1: Idea Sharpener ──────────────────────────────────────────────────


async def extract_content_brief(transcript: str, product, prompt_set: dict | None = None) -> dict:
    """Run the Idea Sharpener: find the seed in a voice memo transcript."""
    ps = prompt_set or {}
    voice_rules = ps.get("voice_rules", DEFAULT_VOICE_RULES)
    idea_prompt = ps.get("idea_sharpener_prompt", "")

    # If no custom idea sharpener prompt, use the default from prompt_defaults
    if not idea_prompt:
        from app.engines.prompt_defaults import DEFAULT_IDEA_SHARPENER_PROMPT
        idea_prompt = DEFAULT_IDEA_SHARPENER_PROMPT

    system_prompt = f"""You are a content strategist and idea sharpener.

Product Context:
- Name: {product.name}
- Description: {product.description}
- Target Audience: {product.target_audience or "General audience"}
- Brand Voice: {product.brand_voice or "Authentic and conversational."}

{voice_rules}"""

    user_prompt = f"""Here is a voice memo transcript from the content creator:

---
{transcript}
---

{idea_prompt}"""

    result = await call_claude(user_prompt, system=system_prompt)
    return _parse_json_response(result, _default_brief(transcript))


def _extract_content_brief_sync(transcript: str, product, prompt_set: dict | None = None) -> dict:
    """Sync version of extract_content_brief for background threads."""
    ps = prompt_set or {}
    voice_rules = ps.get("voice_rules", DEFAULT_VOICE_RULES)
    idea_prompt = ps.get("idea_sharpener_prompt", "")

    if not idea_prompt:
        from app.engines.prompt_defaults import DEFAULT_IDEA_SHARPENER_PROMPT
        idea_prompt = DEFAULT_IDEA_SHARPENER_PROMPT

    system_prompt = f"""You are a content strategist and idea sharpener.

Product Context:
- Name: {product.name}
- Description: {product.description}
- Target Audience: {product.target_audience or "General audience"}
- Brand Voice: {product.brand_voice or "Authentic and conversational."}

{voice_rules}"""

    user_prompt = f"""Here is a voice memo transcript from the content creator:

---
{transcript}
---

{idea_prompt}"""

    result = call_claude_sync(user_prompt, system=system_prompt)
    return _parse_json_response(result, _default_brief(transcript))


def _default_brief(transcript: str) -> dict:
    return {
        "seed": transcript[:200],
        "heat": [],
        "audience_hook": "",
        "template_fit": "A",
        "subject_line": "Untitled",
        "metaphor": None,
        "weekly_theme": "Content from voice memo",
        "raw_ideas": [],
        "verdict": "Needs another angle",
    }


# ─── Step 2: Generate Full Content Package ───────────────────────────────────

def _build_generation_system_prompt(product, content_brief: dict, rag_context: str, brand_brief: str, brand_profile=None, prompt_set: dict | None = None) -> str:
    """Build the system prompt with voice rules, brand context, and content brief."""
    from app.engines.generation import _build_brand_constraints  # noqa: F811
    from app.engines.prompt_defaults import DEFAULT_TEMPLATE_INSTRUCTIONS

    ps = prompt_set or {}
    brand_constraints = _build_brand_constraints(brand_profile)

    template = content_brief.get("template_fit", "A")
    template_instructions = ps.get("template_instructions", DEFAULT_TEMPLATE_INSTRUCTIONS)
    voice_rules = ps.get("voice_rules", DEFAULT_VOICE_RULES)
    social_post_rules = ps.get("social_post_rules", "")
    video_script_rules = ps.get("video_script_rules", "")
    x_thread_rules = ps.get("x_thread_rules", "")
    system_intro = ps.get("system_prompt_intro", "You are a content creator. You write authentic, engaging content that connects with your audience.")

    if not social_post_rules:
        from app.engines.prompt_defaults import DEFAULT_SOCIAL_POST_RULES
        social_post_rules = DEFAULT_SOCIAL_POST_RULES
    if not video_script_rules:
        from app.engines.prompt_defaults import DEFAULT_VIDEO_SCRIPT_RULES
        video_script_rules = DEFAULT_VIDEO_SCRIPT_RULES
    if not x_thread_rules:
        from app.engines.prompt_defaults import DEFAULT_X_THREAD_RULES
        x_thread_rules = DEFAULT_X_THREAD_RULES

    return f"""{system_intro}

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Brand Voice: {product.brand_voice or "Authentic and conversational."}

{f"Brand Brief: {brand_brief}" if brand_brief else ""}

{brand_constraints}

{f"Product Knowledge: {rag_context}" if rag_context else ""}

CONTENT BRIEF (from Idea Sharpener):
Seed: {content_brief.get('seed', '')}
Heat (strongest lines): {json.dumps(content_brief.get('heat', []))}
Audience Hook: {content_brief.get('audience_hook', '')}
Central Metaphor: {content_brief.get('metaphor', 'None identified')}
Weekly Theme: {content_brief.get('weekly_theme', '')}
Raw Ideas to Preserve: {json.dumps(content_brief.get('raw_ideas', []))}
Subject Line: {content_brief.get('subject_line', '')}

NEWSLETTER TEMPLATE:
{template_instructions.get(template, template_instructions.get("A", ""))}

{voice_rules}

SOCIAL POST RULES (for Twitter, LinkedIn, Meta posts):
{social_post_rules}

VIDEO SCRIPT RULES:
{video_script_rules}

X THREAD RULES:
{x_thread_rules}"""


def _build_generation_user_prompt(mix: list[dict], instructions: str | None) -> str:
    """Build the user prompt for generating the full content package."""

    schedule = "\n".join(
        [f"- {item['day']} ({item['content_type']} on {item['platform']}): {item['purpose']}" for item in mix]
    )

    return f"""Generate a full week of content following this schedule:

{schedule}

For each piece, use the appropriate format:

- newsletter: subject, preview (under 10 words, sensory), body (full draft following template)
- social_post (Twitter): hook (the tension or stealable line), body (max 280 chars), specificity_check, tension_check, stealable_line
- social_post (LinkedIn): hook (first-person observation), body (200-400 words, reflective)
- social_post (Meta): hook, body (1-3 paragraphs, personal)
- video_script: blocks (array of breath blocks, each 2-4 sentences), thumbnail_concept, estimated_length
- x_thread: tweets (array of 5-8 tweets, each under 280 chars)

{f"Additional Instructions: {instructions}" if instructions else ""}

Return ONLY a JSON array with one object per day:
[
    {{
        "day": "Monday",
        "content_type": "social_post",
        "platform": "linkedin",
        "title": "short label",
        "body": "the full content",
        "hook": "opening hook or headline",
        "cta": "call to action or closing question",
        "funnel_stage": "awareness|consideration|conversion",
        "notes": "how this connects to the weekly theme",
        "specificity_check": "what the reader sees (for social posts)",
        "tension_check": "what pulls against what (for social posts)",
        "stealable_line": "the screenshot-worthy phrase (for social posts)",
        "blocks": ["block 1 text", "block 2 text"],
        "tweets": ["tweet 1", "tweet 2"],
        "subject": "newsletter subject line",
        "preview": "newsletter preview text"
    }}
]

Return ONLY the JSON array, no additional text or markdown."""


# ─── Main Generation Functions ────────────────────────────────────────────────

async def generate_weekly_content(
    product,
    transcript: str,
    content_brief: dict | None = None,
    weekly_mix: list[dict] | None = None,
    instructions: str | None = None,
    brand_profile=None,
    prompt_set: dict | None = None,
) -> list[dict]:
    """Generate a full week of content from a transcript and brief.

    Follows the skill pipeline: Idea Sharpener → Drafter → Post Sharpener → Content Engine.
    Returns a list of content piece dicts ready to be saved as ContentPiece records.

    prompt_set: loaded via load_prompt_set() — per-product custom prompts with generic fallbacks.
    """
    ps = prompt_set or {}

    if content_brief is None:
        content_brief = await extract_content_brief(transcript, product, prompt_set=ps)

    mix = weekly_mix or ps.get("weekly_mix", DEFAULT_WEEKLY_MIX)

    # Get RAG context
    vs = get_vectorstore()
    topics = content_brief.get("heat", content_brief.get("raw_ideas", []))
    search_query = f"{product.name} {' '.join(topics[:3]) if topics else transcript[:100]}"
    rag_results = vs.query(product.id, search_query, n_results=5)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    brand_brief = _get_brand_brief(product)

    system_prompt = _build_generation_system_prompt(product, content_brief, rag_context, brand_brief, brand_profile, prompt_set=ps)
    user_prompt = _build_generation_user_prompt(mix, instructions)

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=8192)
    return _process_generation_result(result, content_brief)


def generate_weekly_content_sync(
    product,
    transcript: str,
    content_brief: dict | None = None,
    weekly_mix: list[dict] | None = None,
    instructions: str | None = None,
    brand_profile=None,
    prompt_set: dict | None = None,
) -> list[dict]:
    """Sync version for background threads."""
    ps = prompt_set or {}

    if content_brief is None:
        content_brief = _extract_content_brief_sync(transcript, product, prompt_set=ps)

    mix = weekly_mix or ps.get("weekly_mix", DEFAULT_WEEKLY_MIX)

    vs = get_vectorstore()
    topics = content_brief.get("heat", content_brief.get("raw_ideas", []))
    search_query = f"{product.name} {' '.join(topics[:3]) if topics else transcript[:100]}"
    rag_results = vs.query(product.id, search_query, n_results=5)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    brand_brief = _get_brand_brief(product)

    system_prompt = _build_generation_system_prompt(product, content_brief, rag_context, brand_brief, brand_profile, prompt_set=ps)
    user_prompt = _build_generation_user_prompt(mix, instructions)

    result = call_claude_sync(user_prompt, system=system_prompt, max_tokens=8192)
    return _process_generation_result(result, content_brief)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_brand_brief(product) -> str:
    if product.brand_brief:
        try:
            brief = json.loads(product.brand_brief)
            return json.dumps(brief, indent=2)
        except json.JSONDecodeError:
            return product.brand_brief
    return ""


def _parse_json_response(result: dict, fallback: dict) -> dict:
    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return fallback


def _process_generation_result(result: dict, content_brief: dict) -> list[dict]:
    """Parse Claude's response into ContentPiece-compatible dicts."""

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        pieces_raw = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        pieces_raw = [
            {
                "day": "Wednesday",
                "content_type": "newsletter",
                "platform": "general",
                "title": "Generated Content",
                "body": result["content"],
                "hook": None,
                "cta": None,
                "funnel_stage": "awareness",
            }
        ]

    all_pieces = []
    for piece in pieces_raw:
        piece_meta = {
            "model": result["model"],
            "input_tokens": result["input_tokens"],
            "output_tokens": result["output_tokens"],
            "source": "voice_memo_pipeline",
            "day": piece.get("day", ""),
            "weekly_theme": content_brief.get("weekly_theme", ""),
            "seed": content_brief.get("seed", ""),
            "template_fit": content_brief.get("template_fit", ""),
            "notes": piece.get("notes", ""),
        }

        # Preserve quality check metadata for social posts
        for check_key in ("specificity_check", "tension_check", "stealable_line"):
            if piece.get(check_key):
                piece_meta[check_key] = piece[check_key]

        # Preserve structured content for video scripts and threads
        if piece.get("blocks"):
            piece_meta["blocks"] = piece["blocks"]
        if piece.get("tweets"):
            piece_meta["tweets"] = piece["tweets"]
        if piece.get("subject"):
            piece_meta["subject"] = piece["subject"]
        if piece.get("preview"):
            piece_meta["preview"] = piece["preview"]
        if piece.get("slide_headlines"):
            piece_meta["slide_headlines"] = piece["slide_headlines"]

        # Map content_type to the ContentPiece enum values
        ct = piece.get("content_type", "social_post")
        content_type_map = {
            "newsletter": "blog_draft",
            "video_script": "blog_draft",  # stored as blog_draft, metadata.source distinguishes
            "x_thread": "social_post",     # stored as social_post, metadata has tweets array
        }
        mapped_type = content_type_map.get(ct, ct)

        all_pieces.append(
            {
                "content_type": mapped_type,
                "platform": piece.get("platform", "general"),
                "title": piece.get("title") or piece.get("subject", ""),
                "body": piece.get("body", ""),
                "hook": piece.get("hook"),
                "cta": piece.get("cta"),
                "funnel_stage": piece.get("funnel_stage", "awareness"),
                "metadata": json.dumps(piece_meta),
            }
        )

    return all_pieces
