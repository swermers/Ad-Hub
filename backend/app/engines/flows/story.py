"""Story Flow — 3-step pipeline for Instagram/TikTok Stories.

Steps:
  1. Frame Sequence  → Plan 3-5 frame arc with timing
  2. Ultra-Short Copy → Write copy per frame (max 15 words each)
  3. Visual Direction → Suggest visual treatment per frame
"""

import json
from app.engines.flows import ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry


def _frames_system(ctx: FlowContext) -> str:
    return f"""You design Story sequences. 3-5 frames, each viewed for 3-5 seconds. Every frame must hook or lose them.
{ctx.product_context}
{ctx.voice_context}"""


def _frames_user(ctx: FlowContext) -> str:
    return f"""Seed: {ctx.seed.get('seed', '')}
{f"Context: {ctx.source_text[:400]}" if ctx.draft else ""}

Plan a Story sequence (3-5 frames). Each frame = 3-5 seconds of attention.
Frame 1 = stop the thumb. Last frame = drive action.

Return ONLY JSON: {{"frame_count": 4, "frames": [
{{"position": 1, "role": "hook", "message": "what this frame communicates", "timing": "3s", "transition": "cut|swipe|fade"}}
]}}"""


def _copy_system(ctx: FlowContext) -> str:
    return f"""You write Story copy. MAX 15 words per frame. If it takes more than 3 seconds to read, it's too long.
{ctx.prompt_set.get("voice_rules", "")}"""


def _copy_user(ctx: FlowContext) -> str:
    frames = ctx.get_step_result("frame_sequence") or {}
    return f"""Write copy for each frame:

{json.dumps(frames.get('frames', []), indent=2)}

Rules: Max 15 words per frame. Bold, punchy. No full sentences — fragments hit harder in Stories.

Return ONLY JSON: {{"frames": [
{{"position": 1, "headline": "3-5 words max", "subtext": "optional, 5-10 words", "word_count": 8}}
]}}"""


def _visual_system(ctx: FlowContext) -> str:
    return """You direct visual treatment for Stories. Think like a creative director."""


def _visual_user(ctx: FlowContext) -> str:
    copy = ctx.get_step_result("ultra_short_copy") or {}
    return f"""Add visual direction to each frame:

{json.dumps(copy.get('frames', []), indent=2)}

For each frame suggest: background treatment, text placement, animation style, color mood.

Return ONLY JSON: {{"frames": [
{{"position": 1, "headline": "...", "subtext": "...", "visual": {{
    "background": "solid color|gradient|image|video",
    "text_placement": "center|top|bottom",
    "animation": "fade_in|slide_up|typewriter|none",
    "color_mood": "dark_bold|light_clean|vibrant|muted"
}}}}
]}}"""


class StoryFlow(ContentFlow):
    flow_type = "story"
    platform = "general"
    steps = [
        FlowStep(name="frame_sequence", system_prompt_builder=_frames_system, user_prompt_builder=_frames_user, max_tokens=1024),
        FlowStep(name="ultra_short_copy", system_prompt_builder=_copy_system, user_prompt_builder=_copy_user, max_tokens=1024),
        FlowStep(name="visual_direction", system_prompt_builder=_visual_system, user_prompt_builder=_visual_user, max_tokens=1536),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        visual = ctx.get_step_result("visual_direction") or {}
        frames = visual.get("frames", [])
        headlines = [f.get("headline", "") for f in frames]
        body = "|".join(headlines)

        return FlowResult(
            content_type="social_post", platform="general",
            title="Story", body=body,
            hook=headlines[0] if headlines else None, cta=headlines[-1] if headlines else None,
            metadata={"workflow_type": "story", "workflow_version": ctx.workflow_version,
                       "steps_completed": steps_done, "frames": frames, "frame_count": len(frames)},
            video_style="swiss-story", video_config={"aspect_ratio": "9:16"},
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(StoryFlow())
