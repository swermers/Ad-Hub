"""Built-in v1 default prompts for each content-type workflow.

These are the initial workflow defaults — the middle layer in the
prompt resolution chain:

  Generic defaults (prompt_defaults.py)
      ↓ overridden by
  Workflow defaults (THIS FILE — per content type, per step)
      ↓ overridden by
  Product/Voice customizations (ContentPromptSet)

As the evolution engine runs and workflows improve, these defaults
get versioned and stored in the ContentTypeWorkflow model. But these
serve as the v1 bootstrap for every new product.
"""

# All 9 supported workflow types
WORKFLOW_TYPES = [
    "linkedin_post",
    "x_post",
    "x_thread",
    "carousel",
    "newsletter",
    "story",
    "video_script",
    "meta_post",
    "email",
]

# Maps flow_type → {step_name: description} for documentation and UI
WORKFLOW_STEP_DESCRIPTIONS: dict[str, dict[str, str]] = {
    "linkedin_post": {
        "angle_selection": "Pick contrarian take or insight from brief",
        "hook_structure": "Write opening hook + outline (story → lesson → CTA)",
        "draft": "Full post with line breaks, authority tone",
        "engagement_gate": "Strong hook? Clear value? Conversation-starting close?",
    },
    "x_post": {
        "hook_variations": "Generate 5 tweet variations with different strategies",
        "pick_strongest": "Evaluate and select the best hook",
        "compress": "Sharpen, trim to 280 chars, ensure scroll-stop quality",
    },
    "x_thread": {
        "hook_mining": "Find the most provocative angle to open the thread",
        "thread_outline": "Plan tweet-by-tweet arc (standalone + connected)",
        "draft_tweets": "Write each tweet with cliffhanger transitions",
        "engagement_gate": "Scroll-stop tweet 1? Standalone value per tweet?",
        "polish": "Trim to 280, validate flow, add formatting",
    },
    "carousel": {
        "slide_outline": "Plan story arc across 4-6 slides",
        "write_slides": "Individual slide copy (standalone + sequential)",
        "cover_cta_refine": "Refine cover slide hook + final CTA slide",
        "validate_arc": "Each slide standalone? Cover hooks? Flow works?",
    },
    "newsletter": {
        "subject_lines": "Generate subject line A/B variants",
        "preview_text": "Write preview text that complements subject",
        "draft_sections": "Full newsletter body with template + voice",
        "voice_check": "Ensure voice consistency + readability",
        "cta_optimization": "Optimize CTA placement + P.S. line",
    },
    "story": {
        "frame_sequence": "Plan 3-5 frame arc with timing",
        "ultra_short_copy": "Write copy per frame (max 15 words each)",
        "visual_direction": "Suggest visual treatment per frame",
    },
    "video_script": {
        "video_hook": "Write the opening that earns the next 30 seconds",
        "breath_blocks": "Break content into speakable chunks with timing",
        "cta_timing": "Write closing CTA with timing marks",
        "cadence_check": "Verify spoken-word pacing and naturalness",
    },
    "meta_post": {
        "story_angle": "Find personal moment or behind-the-scenes angle",
        "draft_post": "Write conversational, story-driven post",
        "engagement_hooks": "Add save/share/comment triggers",
    },
    "email": {
        "subject_preview": "Write subject line + preview text pair",
        "body_paragraphs": "Write scannable email body (3-5 paragraphs)",
        "cta_optimization": "Optimize single CTA + P.S. line",
        "readability_gate": "Verify scannability, single CTA, tone",
    },
}

# Step count per workflow type (for UI display)
WORKFLOW_STEP_COUNTS: dict[str, int] = {
    wt: len(steps) for wt, steps in WORKFLOW_STEP_DESCRIPTIONS.items()
}

# Quality gates per workflow type (which steps have quality gates)
WORKFLOW_QUALITY_GATES: dict[str, list[str]] = {
    "linkedin_post": ["engagement_gate"],
    "x_post": [],
    "x_thread": ["engagement_gate"],
    "carousel": ["validate_arc"],
    "newsletter": ["voice_check"],
    "story": [],
    "video_script": ["cadence_check"],
    "meta_post": [],
    "email": ["readability_gate"],
}


def get_workflow_info(workflow_type: str) -> dict | None:
    """Get full info about a workflow type for API/UI."""
    if workflow_type not in WORKFLOW_TYPES:
        return None
    return {
        "workflow_type": workflow_type,
        "steps": WORKFLOW_STEP_DESCRIPTIONS.get(workflow_type, {}),
        "step_count": WORKFLOW_STEP_COUNTS.get(workflow_type, 0),
        "quality_gates": WORKFLOW_QUALITY_GATES.get(workflow_type, []),
    }


def get_all_workflow_info() -> list[dict]:
    """Get info for all workflow types."""
    return [get_workflow_info(wt) for wt in WORKFLOW_TYPES]
