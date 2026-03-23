"""Content Pipeline Engine — Voice memo transcript → weekly content calendar.

Flow:
1. Receive raw transcript text (from Whisper transcription of voice memo)
2. Claude extracts: topics, key messages, tone, angles
3. Claude generates a full week of content across specified platforms
4. ContentPiece records are created and returned

Designed for agent consumption (OpenClaw on Pi calls this via API).
"""

import json

from app.engines.vectorstore import get_vectorstore
from app.services.claude_client import call_claude, call_claude_sync

# Days of the week for content calendar mapping
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Default content mix for a week — can be overridden per request
DEFAULT_WEEKLY_MIX = [
    {"day": "Monday", "content_type": "social_post", "platform": "linkedin", "purpose": "Thought leadership / industry insight"},
    {"day": "Tuesday", "content_type": "social_post", "platform": "twitter", "purpose": "Quick tip or hot take"},
    {"day": "Wednesday", "content_type": "blog_draft", "platform": "general", "purpose": "Long-form value content"},
    {"day": "Thursday", "content_type": "social_post", "platform": "meta", "purpose": "Story / behind-the-scenes / case study"},
    {"day": "Friday", "content_type": "email", "platform": "general", "purpose": "Newsletter or nurture email"},
    {"day": "Saturday", "content_type": "carousel", "platform": "meta", "purpose": "Educational carousel or recap"},
    {"day": "Sunday", "content_type": "social_post", "platform": "twitter", "purpose": "Personal reflection or community engagement"},
]


async def extract_content_brief(transcript: str, product) -> dict:
    """Extract structured content brief from a raw voice memo transcript."""

    system_prompt = f"""You are a content strategist. Extract a structured content brief from a voice memo transcript.

Product Context:
- Name: {product.name}
- Description: {product.description}
- Target Audience: {product.target_audience or "General audience"}
- Brand Voice: {product.brand_voice or "Professional but approachable"}"""

    user_prompt = f"""Here is a voice memo transcript from the content creator:

---
{transcript}
---

Extract a structured content brief. Return ONLY a JSON object:
{{
    "main_topics": ["topic 1", "topic 2", ...],
    "key_messages": ["message 1", "message 2", ...],
    "tone": "the overall tone they want (e.g., educational, provocative, personal, authoritative)",
    "angles": ["specific angle or hook 1", "angle 2", ...],
    "target_platforms": ["twitter", "linkedin", "meta", "general"],
    "specific_requests": ["any specific content they mentioned wanting", ...],
    "weekly_theme": "one sentence summarizing the week's content theme",
    "raw_ideas": ["any raw ideas or phrases worth preserving from the transcript"]
}}

Return ONLY the JSON object."""

    result = await call_claude(user_prompt, system=system_prompt)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {
            "main_topics": [transcript[:200]],
            "key_messages": [],
            "tone": "professional",
            "angles": [],
            "target_platforms": ["twitter", "linkedin", "meta"],
            "specific_requests": [],
            "weekly_theme": "Content from voice memo",
            "raw_ideas": [],
        }


async def generate_weekly_content(
    product,
    transcript: str,
    content_brief: dict | None = None,
    weekly_mix: list[dict] | None = None,
    instructions: str | None = None,
) -> list[dict]:
    """Generate a full week of content from a transcript and brief.

    Returns a list of content piece dicts ready to be saved as ContentPiece records.
    """

    # Extract brief if not provided
    if content_brief is None:
        content_brief = await extract_content_brief(transcript, product)

    mix = weekly_mix or DEFAULT_WEEKLY_MIX

    # Get RAG context
    vs = get_vectorstore()
    search_query = f"{product.name} {' '.join(content_brief.get('main_topics', []))}"
    rag_results = vs.query(product.id, search_query, n_results=5)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    # Build brand context
    brand_brief = ""
    if product.brand_brief:
        try:
            brief = json.loads(product.brand_brief)
            brand_brief = json.dumps(brief, indent=2)
        except json.JSONDecodeError:
            brand_brief = product.brand_brief

    system_prompt = f"""You are an expert content creator building a week of content from a voice memo brief.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Brand Voice: {product.brand_voice or "Professional but approachable"}

{f"Brand Brief: {brand_brief}" if brand_brief else ""}
{f"Product Knowledge: {rag_context}" if rag_context else ""}

CONTENT BRIEF FROM VOICE MEMO:
Weekly Theme: {content_brief.get('weekly_theme', 'General content')}
Main Topics: {json.dumps(content_brief.get('main_topics', []))}
Key Messages: {json.dumps(content_brief.get('key_messages', []))}
Tone: {content_brief.get('tone', 'professional')}
Angles: {json.dumps(content_brief.get('angles', []))}
Specific Requests: {json.dumps(content_brief.get('specific_requests', []))}
Raw Ideas to Preserve: {json.dumps(content_brief.get('raw_ideas', []))}

{f"Additional Instructions: {instructions}" if instructions else ""}

IMPORTANT: Create content that feels authentic and personal — this came from a real voice memo, not a template.
Preserve the creator's voice and any specific phrases they used. Every piece should connect back to the weekly theme."""

    # Generate all pieces in one Claude call for coherent cross-day narrative
    schedule_description = "\n".join(
        [f"- {item['day']} ({item['content_type']} on {item['platform']}): {item['purpose']}" for item in mix]
    )

    user_prompt = f"""Generate a full week of content following this schedule:

{schedule_description}

For each piece, return the appropriate format:

- social_post (Twitter): hook (max 30 chars), body (max 280 chars), cta (optional)
- social_post (LinkedIn): hook (compelling opener), body (200-400 words), cta
- social_post (Meta): hook, body (1-3 paragraphs), cta
- blog_draft: title, body (outline with intro + 3-5 sections + conclusion), cta
- email: title (subject line), hook (preview text max 90 chars), body (3-5 paragraphs), cta (button text)
- carousel: hook, body (main caption), cta, slide_headlines (pipe-delimited, 5 slides)

Return ONLY a JSON array with one object per day:
[
    {{
        "day": "Monday",
        "content_type": "social_post",
        "platform": "linkedin",
        "title": "short label for this piece",
        "body": "the full content text",
        "hook": "opening hook or headline",
        "cta": "call to action",
        "slide_headlines": "optional — pipe-delimited for carousels",
        "funnel_stage": "awareness|consideration|conversion",
        "notes": "brief note on how this connects to the weekly theme"
    }}
]

Return ONLY the JSON array, no additional text or markdown."""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=8192)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        pieces_raw = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        pieces_raw = [
            {
                "day": "Monday",
                "content_type": "social_post",
                "platform": "general",
                "title": "Generated Content",
                "body": result["content"],
                "hook": None,
                "cta": None,
                "funnel_stage": "awareness",
            }
        ]

    # Map to ContentPiece format
    all_pieces = []
    for piece in pieces_raw:
        piece_meta = {
            "model": result["model"],
            "input_tokens": result["input_tokens"],
            "output_tokens": result["output_tokens"],
            "source": "voice_memo_pipeline",
            "day": piece.get("day", ""),
            "weekly_theme": content_brief.get("weekly_theme", ""),
            "notes": piece.get("notes", ""),
        }
        if piece.get("slide_headlines"):
            piece_meta["slide_headlines"] = piece["slide_headlines"]

        all_pieces.append(
            {
                "content_type": piece.get("content_type", "social_post"),
                "platform": piece.get("platform", "general"),
                "title": piece.get("title"),
                "body": piece.get("body", ""),
                "hook": piece.get("hook"),
                "cta": piece.get("cta"),
                "funnel_stage": piece.get("funnel_stage", "awareness"),
                "metadata": json.dumps(piece_meta),
            }
        )

    return all_pieces


def generate_weekly_content_sync(
    product,
    transcript: str,
    content_brief: dict | None = None,
    weekly_mix: list[dict] | None = None,
    instructions: str | None = None,
) -> list[dict]:
    """Sync version for background threads."""

    # Extract brief synchronously if not provided
    if content_brief is None:
        content_brief = _extract_content_brief_sync(transcript, product)

    mix = weekly_mix or DEFAULT_WEEKLY_MIX

    vs = get_vectorstore()
    search_query = f"{product.name} {' '.join(content_brief.get('main_topics', []))}"
    rag_results = vs.query(product.id, search_query, n_results=5)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    brand_brief = ""
    if product.brand_brief:
        try:
            brief = json.loads(product.brand_brief)
            brand_brief = json.dumps(brief, indent=2)
        except json.JSONDecodeError:
            brand_brief = product.brand_brief

    system_prompt = f"""You are an expert content creator building a week of content from a voice memo brief.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Brand Voice: {product.brand_voice or "Professional but approachable"}

{f"Brand Brief: {brand_brief}" if brand_brief else ""}
{f"Product Knowledge: {rag_context}" if rag_context else ""}

CONTENT BRIEF FROM VOICE MEMO:
Weekly Theme: {content_brief.get('weekly_theme', 'General content')}
Main Topics: {json.dumps(content_brief.get('main_topics', []))}
Key Messages: {json.dumps(content_brief.get('key_messages', []))}
Tone: {content_brief.get('tone', 'professional')}
Angles: {json.dumps(content_brief.get('angles', []))}
Specific Requests: {json.dumps(content_brief.get('specific_requests', []))}
Raw Ideas to Preserve: {json.dumps(content_brief.get('raw_ideas', []))}

{f"Additional Instructions: {instructions}" if instructions else ""}

IMPORTANT: Create content that feels authentic and personal — this came from a real voice memo, not a template.
Preserve the creator's voice and any specific phrases they used. Every piece should connect back to the weekly theme."""

    schedule_description = "\n".join(
        [f"- {item['day']} ({item['content_type']} on {item['platform']}): {item['purpose']}" for item in mix]
    )

    user_prompt = f"""Generate a full week of content following this schedule:

{schedule_description}

For each piece, return the appropriate format:

- social_post (Twitter): hook (max 30 chars), body (max 280 chars), cta (optional)
- social_post (LinkedIn): hook (compelling opener), body (200-400 words), cta
- social_post (Meta): hook, body (1-3 paragraphs), cta
- blog_draft: title, body (outline with intro + 3-5 sections + conclusion), cta
- email: title (subject line), hook (preview text max 90 chars), body (3-5 paragraphs), cta (button text)
- carousel: hook, body (main caption), cta, slide_headlines (pipe-delimited, 5 slides)

Return ONLY a JSON array with one object per day:
[
    {{
        "day": "Monday",
        "content_type": "social_post",
        "platform": "linkedin",
        "title": "short label for this piece",
        "body": "the full content text",
        "hook": "opening hook or headline",
        "cta": "call to action",
        "slide_headlines": "optional — pipe-delimited for carousels",
        "funnel_stage": "awareness|consideration|conversion",
        "notes": "brief note on how this connects to the weekly theme"
    }}
]

Return ONLY the JSON array, no additional text or markdown."""

    result = call_claude_sync(user_prompt, system=system_prompt, max_tokens=8192)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        pieces_raw = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        pieces_raw = [
            {
                "day": "Monday",
                "content_type": "social_post",
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
            "notes": piece.get("notes", ""),
        }
        if piece.get("slide_headlines"):
            piece_meta["slide_headlines"] = piece["slide_headlines"]

        all_pieces.append(
            {
                "content_type": piece.get("content_type", "social_post"),
                "platform": piece.get("platform", "general"),
                "title": piece.get("title"),
                "body": piece.get("body", ""),
                "hook": piece.get("hook"),
                "cta": piece.get("cta"),
                "funnel_stage": piece.get("funnel_stage", "awareness"),
                "metadata": json.dumps(piece_meta),
            }
        )

    return all_pieces


def _extract_content_brief_sync(transcript: str, product) -> dict:
    """Sync version of extract_content_brief for background threads."""

    system_prompt = f"""You are a content strategist. Extract a structured content brief from a voice memo transcript.

Product Context:
- Name: {product.name}
- Description: {product.description}
- Target Audience: {product.target_audience or "General audience"}
- Brand Voice: {product.brand_voice or "Professional but approachable"}"""

    user_prompt = f"""Here is a voice memo transcript from the content creator:

---
{transcript}
---

Extract a structured content brief. Return ONLY a JSON object:
{{
    "main_topics": ["topic 1", "topic 2", ...],
    "key_messages": ["message 1", "message 2", ...],
    "tone": "the overall tone they want",
    "angles": ["specific angle or hook 1", "angle 2", ...],
    "target_platforms": ["twitter", "linkedin", "meta", "general"],
    "specific_requests": ["any specific content they mentioned wanting", ...],
    "weekly_theme": "one sentence summarizing the week's content theme",
    "raw_ideas": ["any raw ideas or phrases worth preserving from the transcript"]
}}

Return ONLY the JSON object."""

    result = call_claude_sync(user_prompt, system=system_prompt)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {
            "main_topics": [transcript[:200]],
            "key_messages": [],
            "tone": "professional",
            "angles": [],
            "target_platforms": ["twitter", "linkedin", "meta"],
            "specific_requests": [],
            "weekly_theme": "Content from voice memo",
            "raw_ideas": [],
        }
