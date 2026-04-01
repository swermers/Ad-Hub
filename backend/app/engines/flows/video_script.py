"""Video Script Flow — 4-step pipeline for talking-head/explainer videos.

Steps:
  1. Hook (3 sec)    → Write the opening that earns the next 30 seconds
  2. Breath Blocks   → Break content into speakable chunks with timing
  3. CTA + Timing    → Write closing CTA with timing marks
  4. Cadence Check   → Verify spoken-word pacing and naturalness
"""

import json
from app.engines.flows import ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry


def _hook_system(ctx: FlowContext) -> str:
    return f"""You write video hooks. The first 3 seconds decide if someone watches or scrolls.
{ctx.product_context}
{ctx.voice_context}
A great video hook creates an open loop the viewer NEEDS closed."""


def _hook_user(ctx: FlowContext) -> str:
    return f"""Seed: {ctx.seed.get('seed', '')}
{f"Source: {ctx.source_text[:600]}" if ctx.source_text else ""}

Write 3 hook variations for the first 3 seconds of a video. Each must:
- Be speakable in under 4 seconds
- Create an immediate open loop or pattern interrupt
- Sound natural when said aloud (not written-language)

Return ONLY JSON: {{"hooks": [{{"text": "...", "strategy": "open_loop|pattern_interrupt|bold_claim|direct_address", "spoken_seconds": 3}}],
"best_index": 0, "reasoning": "..."}}"""


def _blocks_system(ctx: FlowContext) -> str:
    return f"""You convert ideas into breath blocks — chunks a speaker can deliver in one breath (2-4 sentences).
{ctx.prompt_set.get("video_script_rules", "")}
{ctx.prompt_set.get("voice_rules", "")}

Write for SPEAKING, not reading. Test: would this sound natural said to a camera?"""


def _blocks_user(ctx: FlowContext) -> str:
    hook = ctx.get_step_result("video_hook") or {}
    best_idx = hook.get("best_index", 0)
    hooks = hook.get("hooks", [])
    best_hook = hooks[best_idx]["text"] if hooks else ""

    return f"""Opening hook: {best_hook}

Source material:
{ctx.source_text[:1500]}

Break the content into 4-8 breath blocks. Each block:
- 2-4 sentences max (one breath of speaking)
- Simplify any sentence over 25 words
- Keep strong lines exactly as written
- End each block with a subtle pull to the next

Return ONLY JSON: {{"blocks": [{{"text": "...", "estimated_seconds": 15, "energy": "high|medium|reflective"}}],
"total_estimated_seconds": 120}}"""


def _cta_system(ctx: FlowContext) -> str:
    return """You write video CTAs and suggest thumbnail concepts. The CTA should feel like a natural conclusion."""


def _cta_user(ctx: FlowContext) -> str:
    blocks = ctx.get_step_result("breath_blocks") or {}
    block_texts = [b.get("text", "") for b in blocks.get("blocks", [])]
    return f"""Video blocks so far:
{json.dumps(block_texts[:3])}...

Write:
1. A closing CTA (speakable in 5-8 seconds, feels natural not salesy)
2. A thumbnail concept that would make someone click

Return ONLY JSON: {{"cta_text": "...", "cta_seconds": 6, "thumbnail_concept": "description of a compelling thumbnail",
"end_screen_text": "text overlay for last 5 seconds"}}"""


def _cadence_system(ctx: FlowContext) -> str:
    return """You check spoken-word cadence. Read the script aloud mentally. Flag anything that sounds unnatural."""


def _cadence_user(ctx: FlowContext) -> str:
    hook = ctx.get_step_result("video_hook") or {}
    blocks = ctx.get_step_result("breath_blocks") or {}
    cta = ctx.get_step_result("cta_timing") or {}
    best_idx = hook.get("best_index", 0)
    hooks = hook.get("hooks", [])
    best_hook = hooks[best_idx]["text"] if hooks else ""
    block_texts = [b.get("text", "") for b in blocks.get("blocks", [])]

    full_script = f"{best_hook}\n\n" + "\n\n".join(block_texts) + f"\n\n{cta.get('cta_text', '')}"

    return f"""Review this video script for spoken cadence:

---
{full_script}
---

Check:
1. NATURALNESS: Does every sentence sound natural spoken aloud? (1-10)
2. PACING: Is there variety in sentence length and energy? (1-10)
3. TRANSITIONS: Do blocks flow into each other? (1-10)
4. TONGUE TWISTERS: Any phrases that are hard to say? Flag them.

Return ONLY JSON: {{"scores": {{"naturalness": 8, "pacing": 8, "transitions": 7}}, "average": 7.7,
"passed": true, "tongue_twisters": [], "final_script": "the full script with any fixes"}}"""


def _cadence_check(result: dict, ctx: FlowContext) -> bool:
    return result.get("passed", False) or result.get("average", 0) >= 7


class VideoScriptFlow(ContentFlow):
    flow_type = "video_script"
    platform = "general"
    steps = [
        FlowStep(name="video_hook", system_prompt_builder=_hook_system, user_prompt_builder=_hook_user, max_tokens=1024),
        FlowStep(name="breath_blocks", system_prompt_builder=_blocks_system, user_prompt_builder=_blocks_user, max_tokens=2048, premium=True),
        FlowStep(name="cta_timing", system_prompt_builder=_cta_system, user_prompt_builder=_cta_user, max_tokens=1024),
        FlowStep(name="cadence_check", system_prompt_builder=_cadence_system, user_prompt_builder=_cadence_user, quality_gate=_cadence_check, max_tokens=2048),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        hook = ctx.get_step_result("video_hook") or {}
        blocks = ctx.get_step_result("breath_blocks") or {}
        cta = ctx.get_step_result("cta_timing") or {}
        cadence = ctx.get_step_result("cadence_check") or {}

        best_idx = hook.get("best_index", 0)
        hooks = hook.get("hooks", [])
        best_hook = hooks[best_idx]["text"] if hooks else ""
        block_data = blocks.get("blocks", [])

        body = cadence.get("final_script") or best_hook + "\n\n" + "\n\n".join([b.get("text", "") for b in block_data]) + "\n\n" + cta.get("cta_text", "")

        return FlowResult(
            content_type="blog_draft", platform="general",
            title=f"Video: {best_hook[:40]}..." if best_hook else "Video Script",
            body=body, hook=best_hook, cta=cta.get("cta_text"),
            metadata={
                "workflow_type": "video_script", "workflow_version": ctx.workflow_version,
                "steps_completed": steps_done, "source": "video_script_flow",
                "blocks": [b.get("text", "") for b in block_data],
                "thumbnail_concept": cta.get("thumbnail_concept"),
                "estimated_length": f"{blocks.get('total_estimated_seconds', 120)}s",
                "cadence_scores": cadence.get("scores", {}),
            },
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(VideoScriptFlow())
