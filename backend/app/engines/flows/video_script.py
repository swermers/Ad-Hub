"""Video Script Flow — 4-step pipeline for talking-head/explainer videos.

Steps:
  1. Hook (3 sec)    → Write the opening that earns the next 30 seconds
  2. Breath Blocks   → Break content into speakable chunks with timing
  3. CTA + Timing    → Write closing CTA with timing marks
  4. Cadence Check   → Verify spoken-word pacing and naturalness
"""

import json
from app.engines.flows import (
    ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry,
    editor_gate_parser, editor_gate_check,
)


def _hook_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Your current task: write 3 opening hook variations for the first 3 seconds of the video."""

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
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Your current task: break the content into breath blocks. 2-4 sentences each, speakable in one breath."""

    return f"""You convert ideas into breath blocks — chunks a speaker can deliver in one breath (2-4 sentences).

{ctx.voice_context}

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
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

Your current task: write the closing CTA and suggest a thumbnail concept."""

    return f"""You write video CTAs and suggest thumbnail concepts. The CTA should feel like a natural conclusion.

{ctx.voice_context}"""


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
    if ctx.editor_skill:
        return f"""{ctx.editor_skill}

{ctx.voice_context}

Content type: Video Script
Your current task: check spoken-word cadence. Flag anything that sounds unnatural when said aloud."""

    return f"""You check spoken-word cadence. Read the script aloud mentally. Flag anything that sounds unnatural.

{ctx.voice_context}"""


def _cadence_user(ctx: FlowContext) -> str:
    hook = ctx.get_step_result("video_hook") or {}
    blocks = ctx.get_step_result("breath_blocks") or {}
    cta = ctx.get_step_result("cta_timing") or {}
    best_idx = hook.get("best_index", 0)
    hooks = hook.get("hooks", [])
    best_hook = hooks[best_idx]["text"] if hooks else ""
    block_texts = [b.get("text", "") for b in blocks.get("blocks", [])]

    full_script = f"{best_hook}\n\n" + "\n\n".join(block_texts) + f"\n\n{cta.get('cta_text', '')}"

    return f"""Review this video script:

---
{full_script}
---

Seed: {ctx.seed.get('seed', '')}

Score each dimension 1-5. Pass threshold: 22/25.

| Dimension | What You're Measuring |
|---|---|
| Voice match | Does this sound like the creator speaking naturally? |
| Format compliance | Every block 2-4 sentences? Speakable? No em dashes? [THUMBNAIL MOMENT] marked? |
| Coherence | Does the script deliver on the seed's promise? Strong lines preserved? |
| Quality | Would this sound natural on camera without edits? Closing question intact? |
| AI-free | No AI fingerprints? No stilted written-language phrases? |

Auto-fail conditions:
- Blocks longer than 4 sentences
- Em dashes (spoken delivery doesn't have them)
- Sentences over 25 words that weren't simplified
- Strong lines from source paraphrased instead of preserved
- 3+ AI fingerprints

Return ONLY a JSON object:
{{
    "overall_score": 22,
    "passed": true,
    "scores": {{
        "voice_match": 5,
        "format_compliance": 4,
        "coherence": 5,
        "quality": 4,
        "ai_free": 4
    }},
    "tongue_twisters": [],
    "violations": [],
    "ai_fingerprints": [],
    "priority_fixes": [],
    "strongest_moments": [],
    "final_script": null
}}

Set final_script to the full corrected script ONLY if fixes are needed, otherwise null."""


class VideoScriptFlow(ContentFlow):
    flow_type = "video_script"
    platform = "general"
    steps = [
        FlowStep(name="video_hook", system_prompt_builder=_hook_system, user_prompt_builder=_hook_user, max_tokens=1024),
        FlowStep(name="breath_blocks", system_prompt_builder=_blocks_system, user_prompt_builder=_blocks_user, max_tokens=2048, premium=True),
        FlowStep(name="cta_timing", system_prompt_builder=_cta_system, user_prompt_builder=_cta_user, max_tokens=1024),
        FlowStep(name="cadence_check", system_prompt_builder=_cadence_system, user_prompt_builder=_cadence_user, parser=editor_gate_parser, quality_gate=editor_gate_check, max_tokens=2048, premium=True),
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
                "editor_score": cadence.get("overall_score"),
                "editor_scores": cadence.get("scores", {}),
                "editor_passed": cadence.get("passed", False),
            },
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(VideoScriptFlow())
