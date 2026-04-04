"""Story Flow — 4-step pipeline for Instagram/TikTok Stories.

Steps:
  1. Frame Sequence  → Plan 3-5 frame arc with timing
  2. Ultra-Short Copy → Write copy per frame (max 15 words each)
  3. Visual Direction → Suggest visual treatment per frame
  4. Editor Gate     → 22/25 quality rubric with voice + format checks
"""

import json
from app.engines.flows import (
    ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry,
    build_editor_system_prompt, build_editor_user_prompt,
    editor_gate_parser, editor_gate_check,
)


def _frames_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Your current task: plan a 3-5 frame Story sequence. Each frame = 3-5 seconds of attention."""

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
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

Your current task: write ultra-short copy for each frame. MAX 15 words per frame."""

    return f"""You write Story copy. MAX 15 words per frame. If it takes more than 3 seconds to read, it's too long.

{ctx.voice_context}

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
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

Your current task: add visual direction for each frame (background, text placement, animation, color mood)."""

    return f"""You direct visual treatment for Stories. Think like a creative director.

{ctx.voice_context}"""


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


# ─── Step 4: Editor Gate ─────────────────────────────────────────────────

def _editor_system(ctx: FlowContext) -> str:
    return build_editor_system_prompt(ctx, "story_reel", "instagram")


def _editor_user(ctx: FlowContext) -> str:
    visual = ctx.get_step_result("visual_direction") or {}
    frames = visual.get("frames", [])
    frame_text = "\n".join([
        f"Frame {f.get('position', i+1)}: [{f.get('headline', '')}] {f.get('subtext', '')}"
        for i, f in enumerate(frames)
    ])
    return build_editor_user_prompt(
        ctx, frame_text, "story_reel", "instagram",
        extra_checks="""Additional checks for Stories/Reels:
- Hook stops scroll in under 2 seconds
- Each frame is 15 words or fewer
- Script is speakable (contractions, short sentences)
- One clear insight, landing line is memorable
- No "Hey everyone" / "What's up guys" opens
- No "like and subscribe" closes
- Voice profile energy level is the ceiling — no injected hyper-energy""",
    )


class StoryFlow(ContentFlow):
    flow_type = "story"
    platform = "general"
    steps = [
        FlowStep(name="frame_sequence", system_prompt_builder=_frames_system, user_prompt_builder=_frames_user, max_tokens=1024),
        FlowStep(name="ultra_short_copy", system_prompt_builder=_copy_system, user_prompt_builder=_copy_user, max_tokens=1024),
        FlowStep(name="visual_direction", system_prompt_builder=_visual_system, user_prompt_builder=_visual_user, max_tokens=1536),
        FlowStep(name="editor_gate", system_prompt_builder=_editor_system, user_prompt_builder=_editor_user, parser=editor_gate_parser, quality_gate=editor_gate_check, max_tokens=1536, premium=True),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        visual = ctx.get_step_result("visual_direction") or {}
        editor = ctx.get_step_result("editor_gate") or {}
        frames = visual.get("frames", [])
        headlines = [f.get("headline", "") for f in frames]
        body = "|".join(headlines)

        return FlowResult(
            content_type="social_post", platform="general",
            title="Story", body=body,
            hook=headlines[0] if headlines else None, cta=headlines[-1] if headlines else None,
            metadata={"workflow_type": "story", "workflow_version": ctx.workflow_version,
                       "steps_completed": steps_done, "frames": frames, "frame_count": len(frames),
                       "editor_score": editor.get("overall_score"),
                       "editor_scores": editor.get("scores", {}),
                       "editor_passed": editor.get("passed", False)},
            video_style="swiss-story", video_config={"aspect_ratio": "9:16"},
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(StoryFlow())
