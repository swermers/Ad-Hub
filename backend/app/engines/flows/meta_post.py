"""Meta Post Flow — 4-step pipeline for Facebook/Instagram feed posts.

Steps:
  1. Story Angle    → Find the personal moment or behind-the-scenes angle
  2. Draft          → Write conversational, story-driven post
  3. Engagement Hooks → Add elements that drive saves, shares, comments
  4. Editor Gate    → 22/25 quality rubric with voice + platform checks
"""

import json
from app.engines.flows import (
    ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry,
    build_editor_system_prompt, build_editor_user_prompt,
    editor_gate_parser, editor_gate_check,
)


def _angle_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Platform: Meta/Facebook/Instagram
Your current task: find the most compelling personal/story angle from the source material."""

    return f"""You find personal, story-driven angles for Meta/Facebook/Instagram posts.
{ctx.product_context}
{ctx.voice_context}
Meta posts that perform best feel like a friend sharing something real — not a brand broadcasting."""


def _angle_user(ctx: FlowContext) -> str:
    return f"""Seed: {ctx.seed.get('seed', '')}
Heat: {json.dumps(ctx.seed.get('heat', []))}
{f"Context: {ctx.source_text[:400]}" if ctx.draft else ""}

Find the most compelling personal/story angle:
- A behind-the-scenes moment
- A lesson from a recent experience
- A vulnerable admission or honest reflection
- Something the audience hasn't seen from this brand before

Return ONLY JSON: {{"angle": "one sentence", "opening_scene": "the specific moment to open with",
"emotional_core": "what feeling this connects to", "relatability": "why the audience sees themselves in this"}}"""


def _draft_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Platform: Meta/Facebook/Instagram
Your current task: write the full Meta post using the angle from the previous step."""

    return f"""You write Meta posts. Conversational, personal, 1-3 paragraphs. Like talking to a friend at coffee.

{ctx.voice_context}

{ctx.prompt_set.get("voice_rules", "")}
{ctx.prompt_set.get("social_post_rules", "")}
No hashtags. No corporate speak. First person."""


def _draft_user(ctx: FlowContext) -> str:
    angle = ctx.get_step_result("story_angle") or {}
    return f"""Write a Meta post using this angle:

Opening scene: {angle.get('opening_scene', '')}
Emotional core: {angle.get('emotional_core', '')}
Angle: {angle.get('angle', '')}

1-3 short paragraphs. Lead with the scene, not a claim.

Return ONLY JSON: {{"title": "...", "body": "full post", "hook": "opening line", "cta": "closing question"}}"""


def _hooks_system(ctx: FlowContext) -> str:
    if ctx.editor_skill:
        return f"""{ctx.editor_skill}

{ctx.voice_context}

Platform: Meta/Facebook/Instagram
Your current task: optimize this post for engagement — saves, shares, comments. Subtle, not manipulative."""

    return f"""You optimize Meta posts for engagement — saves, shares, comments. Subtle, not manipulative.

{ctx.voice_context}"""


def _hooks_user(ctx: FlowContext) -> str:
    draft = ctx.get_step_result("draft_post") or {}
    return f"""Optimize this Meta post for engagement:

{draft.get('body', '')}

Check and improve:
1. Does the first line hook in the feed (before "...more")?
2. Is there a moment people would SAVE this post for later?
3. Does the ending invite genuine comments (not just "great post!")?

Return ONLY JSON: {{"optimized_body": "the improved post", "hook": "improved opening",
"cta": "improved closing", "save_trigger": "what makes this saveable",
"comment_trigger": "what invites real comments"}}"""


# ─── Step 4: Editor Gate ─────────────────────────────────────────────────

def _editor_system(ctx: FlowContext) -> str:
    return build_editor_system_prompt(ctx, "social_post", "meta")


def _editor_user(ctx: FlowContext) -> str:
    hooks = ctx.get_step_result("engagement_hooks") or {}
    draft = ctx.get_step_result("draft_post") or {}
    body = hooks.get("optimized_body") or draft.get("body", "")
    return build_editor_user_prompt(
        ctx, body, "social_post", "meta",
        extra_checks="""Additional checks for Meta posts:
- 1-3 paragraphs, story-driven, personal tone
- Must contain: specificity (one moment the reader can picture), tension, stealable line
- No hashtags in body. No corporate speak.
- No newsletter-style sign-offs""",
    )


class MetaPostFlow(ContentFlow):
    flow_type = "meta_post"
    platform = "meta"
    steps = [
        FlowStep(name="story_angle", system_prompt_builder=_angle_system, user_prompt_builder=_angle_user, max_tokens=1024),
        FlowStep(name="draft_post", system_prompt_builder=_draft_system, user_prompt_builder=_draft_user, max_tokens=1536),
        FlowStep(name="engagement_hooks", system_prompt_builder=_hooks_system, user_prompt_builder=_hooks_user, max_tokens=1536),
        FlowStep(name="editor_gate", system_prompt_builder=_editor_system, user_prompt_builder=_editor_user, parser=editor_gate_parser, quality_gate=editor_gate_check, max_tokens=1536, premium=True),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        hooks = ctx.get_step_result("engagement_hooks") or {}
        draft = ctx.get_step_result("draft_post") or {}
        angle = ctx.get_step_result("story_angle") or {}

        body = hooks.get("optimized_body") or draft.get("body", "")

        editor = ctx.get_step_result("editor_gate") or {}

        return FlowResult(
            content_type="social_post", platform="meta",
            title=draft.get("title", "Meta Post"), body=body,
            hook=hooks.get("hook") or draft.get("hook"),
            cta=hooks.get("cta") or draft.get("cta"),
            metadata={"workflow_type": "meta_post", "workflow_version": ctx.workflow_version,
                       "steps_completed": steps_done,
                       "angle": angle.get("angle"), "save_trigger": hooks.get("save_trigger"),
                       "comment_trigger": hooks.get("comment_trigger"),
                       "editor_score": editor.get("overall_score"),
                       "editor_scores": editor.get("scores", {}),
                       "editor_passed": editor.get("passed", False)},
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(MetaPostFlow())
