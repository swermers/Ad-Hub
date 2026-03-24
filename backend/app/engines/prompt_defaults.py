"""Generic default prompts for the content pipeline.

These are clean, neutral defaults for new users. No specific brand voice,
no specific schedule, no specific format. Good out of the box but meant
to be customized as users refine their voice.

Power users override these per-product via ContentPromptSet in the DB.
"""

import json

# ─── Voice Rules ─────────────────────────────────────────────────────────────

DEFAULT_VOICE_RULES = """
VOICE RULES (mandatory for all content):

AVOID these overused AI phrases:
- "Here's the thing" / "The truth is" / "The reality is"
- "Let's be honest" / "It turns out" / "In other words"
- "What if I told you" / "At the end of the day" / "In today's world"
- "This is where X comes in" / "Not X, but Y" structure

AVOID these overused words:
- Journey, transform, unlock, navigate, unpack, dive into, lean into, tap into
- Powerful (vague), incredibly, game-changer, groundbreaking

WRITING STYLE:
- Vary sentence length. Short sentences land hard. Let them.
- Write like a real person, not a marketing template
- Be specific over abstract. Concrete details beat vague claims.
- Prefer active voice over passive
- Use natural punctuation. Avoid excessive exclamation marks.

TONE: Authentic and conversational, like talking to a smart friend.
STANCE: Confident but not preachy.
ENERGY: Engaging without being over-the-top.
"""

# ─── Idea Sharpener ──────────────────────────────────────────────────────────

DEFAULT_IDEA_SHARPENER_PROMPT = """You are finding the strongest idea in rough thinking.
Your job: identify the ONE insight, story, or perspective strong enough to build content around.

Read the transcript. Find the 1-2 moments where the thinking gets specific, surprising, or personal.

Look for:
- A fresh perspective or reframe ("I used to think X but actually Y")
- A specific story or example (not abstract theory)
- A tension or contradiction worth exploring
- A line that sounds quotable, something people would share
- An insight the audience hasn't heard put this way before

Return ONLY a JSON object:
{{
    "seed": "one sentence, the core insight or observation",
    "heat": ["the 1-2 specific lines from the transcript with the most energy"],
    "audience_hook": "who cares about this and why it matters to them",
    "template_fit": "A (Reflective Essay) | B (Practical Guide) | C (Personal Story) | D (Quick Hit)",
    "subject_line": "a concrete, curiosity-driving subject line",
    "metaphor": "the central metaphor if one emerged, or null",
    "weekly_theme": "one sentence theme for the week's content",
    "raw_ideas": ["any raw ideas or phrases worth preserving exactly as spoken"],
    "verdict": "Strong enough to build on | Needs another angle | Park it for later"
}}

If nothing is strong enough, say so. A polished version of something generic is still generic.
Return ONLY the JSON object."""

# ─── Newsletter Templates ────────────────────────────────────────────────────

DEFAULT_TEMPLATE_INSTRUCTIONS = {
    "A": """TEMPLATE A: REFLECTIVE ESSAY
OPENING: Start with a personal observation or something you've been noticing.
Drop into a specific, recognizable moment within 3 sentences.
THE INSIGHT: Introduce ONE central idea or metaphor. Commit to it for the entire piece.
THE DEEPER LOOK: Unpack what's really going on beneath the surface.
Frame as a shared experience, not a lecture.
THE WEIGHT: Extend the idea into lived experience. Slow down. Let the reader sit with it.
CLOSE: 1-2 reflective questions (not directives). End with your signature sign-off.""",

    "B": """TEMPLATE B: PRACTICAL GUIDE
HOOK: Start with a relatable scenario your audience knows well.
THE INSIGHT: One bold, clear statement that reframes the problem.
THE FRAMEWORK: 3-5 clear, actionable steps. Use "Try this:" prompts.
Keep each step concrete and doable, not abstract advice.
CLOSE: Encouragement and a clear next step for the reader.""",

    "C": """TEMPLATE C: PERSONAL STORY
THE SCENE: A specific anecdote. First person, past tense, sensory details.
THE LESSON: Bridge from personal to universal. Name the pattern others will recognize.
THE APPLICATION: Light touch. Questions over directives.
CLOSE: A reflection or your signature sign-off.""",

    "D": """TEMPLATE D: QUICK HIT
OBSERVATION: 2-3 sentences naming a common experience everyone recognizes.
REFRAME: 2-3 sentences offering a different way to see it.
INVITATION: 1-2 reflective questions.
SIGN-OFF: Your signature closing.""",
}

# ─── Social Post Rules ───────────────────────────────────────────────────────

DEFAULT_SOCIAL_POST_RULES = """Every post must pass three filters:
1. SPECIFICITY: Contains at least one moment the reader can picture (a specific scene, not abstract)
2. TENSION: Holds two ideas that pull against each other
3. HOOK: One phrase someone would save, screenshot, or share

Post structures that create tension:
- "X feels like safety. It's actually a trap."
- "We call it Y. What it really is: Z."
- "[Surprising claim]. Here's why: [unexpected reason]."
"""

# ─── Video Script Rules ──────────────────────────────────────────────────────

DEFAULT_VIDEO_SCRIPT_RULES = """VIDEO SCRIPT RULES:
- Each block = ONE thought, 2-4 sentences max
- Simplify sentences over 25 words
- Keep strong lines and metaphors exactly as written
- Open with the hook from the source content
- End with a closing question or call to action
- Write for speaking out loud, not reading silently"""

# ─── X Thread Rules ──────────────────────────────────────────────────────────

DEFAULT_X_THREAD_RULES = """X THREAD RULES:
- Tweet 1 = the insight or hook, no preamble
- Each tweet under 280 characters
- No hashtags in body, no emojis
- 5-8 tweets total
- Each tweet should stand alone but build on the previous
- End with a question or invitation to engage"""

# ─── Weekly Mix ──────────────────────────────────────────────────────────────

DEFAULT_WEEKLY_MIX = [
    {"day": "Monday", "content_type": "social_post", "platform": "linkedin", "purpose": "Thought leadership post from weekly theme"},
    {"day": "Tuesday", "content_type": "social_post", "platform": "twitter", "purpose": "Quick observation or tension-driven take"},
    {"day": "Wednesday", "content_type": "newsletter", "platform": "general", "purpose": "Weekly newsletter"},
    {"day": "Thursday", "content_type": "social_post", "platform": "meta", "purpose": "Personal story or behind-the-scenes moment"},
    {"day": "Friday", "content_type": "video_script", "platform": "general", "purpose": "Video script from newsletter"},
    {"day": "Saturday", "content_type": "x_thread", "platform": "twitter", "purpose": "Thread expanding newsletter insight"},
    {"day": "Sunday", "content_type": "social_post", "platform": "twitter", "purpose": "Reflective question or closing thought"},
]

# ─── System Prompt Intro ─────────────────────────────────────────────────────

DEFAULT_SYSTEM_PROMPT_INTRO = """You are a content creator. You write authentic, engaging content
that connects with your audience. Your writing is clear, specific, and human."""


# ─── Loader ──────────────────────────────────────────────────────────────────

def load_prompt_set(product_id: str, db_session) -> dict:
    """Load prompts for a product: custom overrides if they exist, generic defaults otherwise.

    Returns a dict with all prompt fields ready to use in the pipeline.
    """
    from app.models.content_prompts import ContentPromptSet

    custom = db_session.query(ContentPromptSet).filter_by(product_id=product_id).first()

    def _get(field: str, default):
        if custom is None:
            return default
        val = getattr(custom, field, None)
        if val is None or val.strip() == "":
            return default
        return val

    def _get_json(field: str, default):
        if custom is None:
            return default
        val = getattr(custom, field, None)
        if val is None or val.strip() == "":
            return default
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return default

    return {
        "voice_rules": _get("voice_rules", DEFAULT_VOICE_RULES),
        "idea_sharpener_prompt": _get("idea_sharpener_prompt", DEFAULT_IDEA_SHARPENER_PROMPT),
        "template_instructions": _get_json("template_instructions", DEFAULT_TEMPLATE_INSTRUCTIONS),
        "social_post_rules": _get("social_post_rules", DEFAULT_SOCIAL_POST_RULES),
        "video_script_rules": _get("video_script_rules", DEFAULT_VIDEO_SCRIPT_RULES),
        "x_thread_rules": _get("x_thread_rules", DEFAULT_X_THREAD_RULES),
        "weekly_mix": _get_json("weekly_mix", DEFAULT_WEEKLY_MIX),
        "system_prompt_intro": _get("system_prompt_intro", DEFAULT_SYSTEM_PROMPT_INTRO),
    }


def get_all_defaults() -> dict:
    """Return all defaults as a dict (for API: show users what they'd get before customizing)."""
    return {
        "voice_rules": DEFAULT_VOICE_RULES,
        "idea_sharpener_prompt": DEFAULT_IDEA_SHARPENER_PROMPT,
        "template_instructions": DEFAULT_TEMPLATE_INSTRUCTIONS,
        "social_post_rules": DEFAULT_SOCIAL_POST_RULES,
        "video_script_rules": DEFAULT_VIDEO_SCRIPT_RULES,
        "x_thread_rules": DEFAULT_X_THREAD_RULES,
        "weekly_mix": DEFAULT_WEEKLY_MIX,
        "system_prompt_intro": DEFAULT_SYSTEM_PROMPT_INTRO,
    }
