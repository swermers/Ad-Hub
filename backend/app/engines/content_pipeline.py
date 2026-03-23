"""Content Pipeline Engine — Voice memo transcript → full content package.

Mirrors the actual skill pipeline:
1. Idea Sharpener: transcript → seed (core observation, heat, audience hook, template fit)
2. Drafter: seed → newsletter draft (Templates A-D)
3. Post Sharpener: seed → social posts (specificity, tension, stealable line)
4. Content Engine: newsletter → video script, X thread, X article, short-form
5. Video Converter: newsletter → breath-block talking points

Voice rules enforced throughout (no AI fingerprints, somatic language, etc.)

Designed for agent consumption (OpenClaw on Pi calls this via API).
"""

import json

from app.engines.vectorstore import get_vectorstore
from app.services.claude_client import call_claude, call_claude_sync

# ─── Voice Rules (applied to ALL generation) ─────────────────────────────────

VOICE_RULES = """
VOICE RULES (mandatory for all content):

NEVER USE these AI fingerprints:
- "Here's the thing" / "The truth is" / "The reality is"
- "Let's be honest" / "It turns out" / "In other words"
- "What if I told you" / "At the end of the day" / "In today's world"
- "Here's why this matters" / "Think about it"
- "This is where X comes in" / "Not X, but Y" structure

NEVER USE these words:
- Journey, transform, unlock, navigate, unpack, dive into, lean into, tap into
- Powerful (vague), incredibly, game-changer, groundbreaking
- Alignment, transformation, empowerment, healing

NEVER moralize:
- No: should, must, need to
- Yes: might, could, try, "you might notice..."

ALWAYS include:
- Somatic language (chest, jaw, weight, breath, shoulders, stomach)
- Energy/cost framing (labor, weight, friction, drain, spent, high-load task)
- Varied sentence length. Short sentences land hard. Let them.
- Commas, periods, colons, or parentheses instead of em dashes

NEVER include:
- Emojis in body text
- Hashtags in body text (one max in final tweet if natural)

TONE: Grounded peer sitting beside the reader, not a coach standing in front of them.
STANCE: Observational, not prescriptive.
ENERGY: Curiosity, not lecturing.
FRAMING: Energy cost, not character flaw.
"""

# ─── Default Weekly Mix ───────────────────────────────────────────────────────

DEFAULT_WEEKLY_MIX = [
    {"day": "Monday", "content_type": "social_post", "platform": "linkedin", "purpose": "Thought leadership post from weekly theme"},
    {"day": "Tuesday", "content_type": "social_post", "platform": "twitter", "purpose": "Quick observation or tension-driven take"},
    {"day": "Wednesday", "content_type": "newsletter", "platform": "general", "purpose": "Weekly Wednesday Wellness newsletter"},
    {"day": "Thursday", "content_type": "social_post", "platform": "meta", "purpose": "Personal story or behind-the-scenes moment"},
    {"day": "Friday", "content_type": "video_script", "platform": "general", "purpose": "Breath-block video script from newsletter"},
    {"day": "Saturday", "content_type": "x_thread", "platform": "twitter", "purpose": "Thread expanding newsletter insight"},
    {"day": "Sunday", "content_type": "social_post", "platform": "twitter", "purpose": "Reflective question or closing thought"},
]


# ─── Step 1: Idea Sharpener ──────────────────────────────────────────────────

IDEA_SHARPENER_PROMPT = """You are finding the diamond in rough thinking.
Your job: identify the ONE observation, metaphor, or reframe strong enough to build a newsletter around.

Read the transcript. Find the 1-2 moments where the thinking gets specific, physical, or surprising.

Look for:
- A metaphor that emerged naturally ("it's like...")
- A somatic observation (something about the chest, the jaw, the weight)
- A contradiction or tension ("I thought X but actually Y")
- A moment of recognition ("I noticed that when I... it made me realize...")
- A line that sounds like something you'd screenshot if someone else said it

Return ONLY a JSON object:
{{
    "seed": "one sentence, the core observation",
    "heat": ["the 1-2 specific lines from the transcript that have the most energy"],
    "audience_hook": "who is stuck because of this, and what shifts for them when they hear it",
    "template_fit": "A (Reflective Essay) | B (Practical Guide) | C (Personal Story) | D (Quick Hit)",
    "subject_line": "a concrete image or phrase, not abstract",
    "metaphor": "the central metaphor if one emerged, or null",
    "weekly_theme": "one sentence theme for the week's content",
    "raw_ideas": ["any raw ideas or phrases worth preserving exactly as spoken"],
    "verdict": "Strong enough to build on | Needs another angle | Park it for later"
}}

If nothing is strong enough, say so. A shiny version of something generic is still generic.
Return ONLY the JSON object."""


async def extract_content_brief(transcript: str, product) -> dict:
    """Run the Idea Sharpener: find the seed in a voice memo transcript."""

    system_prompt = f"""You are a content strategist and idea sharpener.

Product Context:
- Name: {product.name}
- Description: {product.description}
- Target Audience: {product.target_audience or "General audience"}
- Brand Voice: {product.brand_voice or "Warm, observational, grounded. Peer, not coach."}

{VOICE_RULES}"""

    user_prompt = f"""Here is a voice memo transcript from the content creator:

---
{transcript}
---

{IDEA_SHARPENER_PROMPT}"""

    result = await call_claude(user_prompt, system=system_prompt)
    return _parse_json_response(result, _default_brief(transcript))


def _extract_content_brief_sync(transcript: str, product) -> dict:
    """Sync version of extract_content_brief for background threads."""

    system_prompt = f"""You are a content strategist and idea sharpener.

Product Context:
- Name: {product.name}
- Description: {product.description}
- Target Audience: {product.target_audience or "General audience"}
- Brand Voice: {product.brand_voice or "Warm, observational, grounded. Peer, not coach."}

{VOICE_RULES}"""

    user_prompt = f"""Here is a voice memo transcript from the content creator:

---
{transcript}
---

{IDEA_SHARPENER_PROMPT}"""

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

def _build_generation_system_prompt(product, content_brief: dict, rag_context: str, brand_brief: str, brand_profile=None) -> str:
    """Build the system prompt with voice rules, brand context, and content brief."""
    from app.engines.generation import _build_brand_constraints, _get_platform_rules  # noqa: F811

    brand_constraints = _build_brand_constraints(brand_profile)

    template = content_brief.get("template_fit", "A")
    template_instructions = {
        "A": """TEMPLATE A: REFLECTIVE ESSAY (Signature Style)
OPENING: Start with "I have been noticing lately..." or similar first-person observation.
Drop into a specific, recognizable micro-moment within 3 sentences. Physical or behavioral.
THE METAPHOR: Introduce ONE central metaphor. Bold it. Commit to it for the entire piece.
"the mechanics" (lowercase header): Unpack what's happening beneath the behavior.
Frame as energy cost, not character flaw. Use: "report on," "byproduct of," "high-load task."
"the weight" (lowercase header): Extend metaphor into lived experience. Slow down. Let the reader feel it.
CLOSE: 1-2 reflective questions (not directives). Final line: Stay mindful, stay curious.""",
        "B": """TEMPLATE B: PRACTICAL GUIDE
HOOK: Relatable scenario ("Have you ever noticed..." / "We've all been there")
THE INSIGHT: Bold standalone insight
THE FRAMEWORK: 3-5 clear, actionable steps with "Try this:" prompts
CLOSE: Encouragement + Stay Mindful, Stay Curious, LAS Counseling Team""",
        "C": """TEMPLATE C: PERSONAL STORY
THE SCENE: Specific anecdote, first person, past tense, sensory details
THE LESSON: Bridge from personal to universal, name the pattern
THE APPLICATION: Light touch, questions over directives
CLOSE: Reflection or signature sign-off""",
        "D": """TEMPLATE D: QUICK HIT
OBSERVATION: 2-3 sentences naming a common experience
REFRAME: 2-3 sentences offering a different way to see it
INVITATION: 1-2 reflective questions
SIGN-OFF: Stay mindful, stay curious.""",
    }

    return f"""You are the content creator for Weekly Wednesday Wellness. You write as a grounded peer
sitting beside the reader, not a coach standing in front of them.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Brand Voice: {product.brand_voice or "Warm, observational, grounded. Peer, not coach."}

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
{template_instructions.get(template, template_instructions["A"])}

{VOICE_RULES}

SOCIAL POST RULES (for Twitter, LinkedIn, Meta posts):
Every post must pass three filters:
1. SPECIFICITY: Contains at least one moment the reader can SEE (a specific scene, not abstract)
2. TENSION: Holds two things that pull against each other
3. STEALABLE LINE: One phrase someone would screenshot, save, or repeat

Post structures that create tension:
- "X feels like safety. It's actually a trap."
- "We call it Y. What it really is: Z."
- "[Surprising claim]. Here's why: [unexpected reason]."

VIDEO SCRIPT RULES (for breath-block scripts):
- Each block = ONE thought, 2-4 sentences max
- Remove em dashes, simplify sentences over 25 words
- Keep metaphors and strong lines EXACTLY as written
- Open with the newsletter hook nearly verbatim
- End with the closing question, held for 2 seconds

X THREAD RULES:
- Tweet 1 = the insight or metaphor, no preamble
- Each tweet under 280 characters
- No hashtags in body, no emojis
- 5-8 tweets total"""


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
) -> list[dict]:
    """Generate a full week of content from a transcript and brief.

    Follows the skill pipeline: Idea Sharpener → Drafter → Post Sharpener → Content Engine.
    Returns a list of content piece dicts ready to be saved as ContentPiece records.
    """

    if content_brief is None:
        content_brief = await extract_content_brief(transcript, product)

    mix = weekly_mix or DEFAULT_WEEKLY_MIX

    # Get RAG context
    vs = get_vectorstore()
    topics = content_brief.get("heat", content_brief.get("raw_ideas", []))
    search_query = f"{product.name} {' '.join(topics[:3]) if topics else transcript[:100]}"
    rag_results = vs.query(product.id, search_query, n_results=5)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    brand_brief = _get_brand_brief(product)

    system_prompt = _build_generation_system_prompt(product, content_brief, rag_context, brand_brief, brand_profile)
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
) -> list[dict]:
    """Sync version for background threads."""

    if content_brief is None:
        content_brief = _extract_content_brief_sync(transcript, product)

    mix = weekly_mix or DEFAULT_WEEKLY_MIX

    vs = get_vectorstore()
    topics = content_brief.get("heat", content_brief.get("raw_ideas", []))
    search_query = f"{product.name} {' '.join(topics[:3]) if topics else transcript[:100]}"
    rag_results = vs.query(product.id, search_query, n_results=5)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    brand_brief = _get_brand_brief(product)

    system_prompt = _build_generation_system_prompt(product, content_brief, rag_context, brand_brief, brand_profile)
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
