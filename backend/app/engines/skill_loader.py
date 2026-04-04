"""Skill Loader — reads agent skill .md files from backend/skills/ directory.

Each skill file is a structured prompt document (100-200 lines) that defines
an agent's role, rules, quality gates, and output format. These replace the
thin DEFAULT_* strings in prompt_defaults.py with rich, enforceable prompts.

Skills are loaded once at import time and cached as module-level constants.
The voice profile is NOT a skill — it's a user-provided constraint that gets
injected alongside skills at prompt assembly time.

Usage:
    from app.engines.skill_loader import get_skill, list_skills

    system_prompt = f'''
    {get_skill("IDEA_SHARPENER_SKILL")}

    <voice_profile>
    {voice_profile_text}
    </voice_profile>

    Product Context:
    ...
    '''
"""

import logging
import os
from functools import lru_cache

logger = logging.getLogger(__name__)

SKILLS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "skills")


@lru_cache(maxsize=None)
def get_skill(name: str) -> str:
    """Load a skill file by name (without .md extension).

    Returns the full markdown text of the skill, or empty string if not found.
    Results are cached after first load.

    Examples:
        get_skill("IDEA_SHARPENER_SKILL")
        get_skill("NEWSLETTER_DRAFTER_SKILL")
        get_skill("SOCIAL_POST_EDITOR_SKILL")
    """
    path = os.path.join(SKILLS_DIR, f"{name}.md")
    if not os.path.isfile(path):
        logger.warning(f"Skill file not found: {path}")
        return ""
    with open(path, encoding="utf-8") as f:
        return f.read()


def list_skills() -> list[str]:
    """List all available skill names (without .md extension)."""
    if not os.path.isdir(SKILLS_DIR):
        return []
    return sorted(
        f[:-3] for f in os.listdir(SKILLS_DIR)
        if f.endswith(".md") and not f.startswith(".")
    )


def get_skill_for_flow(flow_type: str) -> tuple[str, str | None]:
    """Map a flow type to its drafter and editor skill names.

    Returns (drafter_skill, editor_skill) where editor_skill may be None
    if the flow uses the universal CONTENT_EDITOR_SKILL.

    Flow types that have specialized editors:
    - newsletter -> NEWSLETTER_EDITOR_SKILL
    - linkedin_post, x_post, meta_post -> SOCIAL_POST_EDITOR_SKILL

    All others use CONTENT_EDITOR_SKILL as the universal fallback.
    """
    FLOW_TO_DRAFTER = {
        "linkedin_post": "LINKEDIN_POST_DRAFTER_SKILL",
        "x_post": "SOCIAL_POST_DRAFTER_SKILL",
        "meta_post": "SOCIAL_POST_DRAFTER_SKILL",
        "x_thread": "X_THREAD_DRAFTER_SKILL",
        "newsletter": "NEWSLETTER_DRAFTER_SKILL",
        "video_script": "VIDEO_CONVERTER_SKILL",
        "carousel": "CAROUSEL_DRAFTER_SKILL",
        "story": "STORY_REEL_DRAFTER_SKILL",
        "email": "EMAIL_DRAFTER_SKILL",
    }

    FLOW_TO_EDITOR = {
        "newsletter": "NEWSLETTER_EDITOR_SKILL",
        "linkedin_post": "SOCIAL_POST_EDITOR_SKILL",
        "x_post": "SOCIAL_POST_EDITOR_SKILL",
        "meta_post": "SOCIAL_POST_EDITOR_SKILL",
    }

    drafter = FLOW_TO_DRAFTER.get(flow_type, "")
    editor = FLOW_TO_EDITOR.get(flow_type, "CONTENT_EDITOR_SKILL")

    return drafter, editor


# Pre-validate on import: log which skills are available
_available = list_skills()
if _available:
    logger.info(f"Loaded {len(_available)} content skills: {', '.join(_available)}")
else:
    logger.warning("No skill files found — check SKILLS_DIR path")
