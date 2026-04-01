"""Meta Post Flow — 3-step pipeline for Facebook/Instagram feed posts.

Steps:
  1. Story Angle    → Find the personal moment or behind-the-scenes angle
  2. Draft          → Write conversational, story-driven post
  3. Engagement Hooks → Add elements that drive saves, shares, comments
"""

import json
from app.engines.flows import ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry


def _angle_system(ctx: FlowContext) -> str:
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
    return f"""You write Meta posts. Conversational, personal, 1-3 paragraphs. Like talking to a friend at coffee.
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
    return """You optimize Meta posts for engagement — saves, shares, comments. Subtle, not manipulative."""


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


class MetaPostFlow(ContentFlow):
    flow_type = "meta_post"
    platform = "meta"
    steps = [
        FlowStep(name="story_angle", system_prompt_builder=_angle_system, user_prompt_builder=_angle_user, max_tokens=1024),
        FlowStep(name="draft_post", system_prompt_builder=_draft_system, user_prompt_builder=_draft_user, max_tokens=1536),
        FlowStep(name="engagement_hooks", system_prompt_builder=_hooks_system, user_prompt_builder=_hooks_user, max_tokens=1536),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        hooks = ctx.get_step_result("engagement_hooks") or {}
        draft = ctx.get_step_result("draft_post") or {}
        angle = ctx.get_step_result("story_angle") or {}

        body = hooks.get("optimized_body") or draft.get("body", "")

        return FlowResult(
            content_type="social_post", platform="meta",
            title=draft.get("title", "Meta Post"), body=body,
            hook=hooks.get("hook") or draft.get("hook"),
            cta=hooks.get("cta") or draft.get("cta"),
            metadata={"workflow_type": "meta_post", "workflow_version": ctx.workflow_version,
                       "steps_completed": steps_done,
                       "angle": angle.get("angle"), "save_trigger": hooks.get("save_trigger"),
                       "comment_trigger": hooks.get("comment_trigger")},
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(MetaPostFlow())
