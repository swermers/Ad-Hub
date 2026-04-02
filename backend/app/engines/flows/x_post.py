"""X Post Flow — 3-step pipeline for single tweets.

Steps:
  1. Hook Variations → Generate 5 angle variations (280 char constraint)
  2. Pick Strongest  → Evaluate and select the best hook
  3. Compress        → Sharpen, trim, ensure scroll-stop quality
"""

import json
from app.engines.flows import ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry


def _variations_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Platform: X (Twitter)
Your current task: generate 5 tweet variations using different strategies. 280 characters max."""

    return f"""You write tweets that stop the scroll. 280 characters max. No filler.

{ctx.product_context}
{ctx.voice_context}
{ctx.prompt_set.get("voice_rules", "")}
{ctx.prompt_set.get("social_post_rules", "")}"""


def _variations_user(ctx: FlowContext) -> str:
    return f"""Seed: {ctx.seed.get('seed', '')}
Heat lines: {json.dumps(ctx.seed.get('heat', []))}
{f"Context: {ctx.source_text[:400]}" if ctx.draft else ""}

Generate 5 tweet variations using DIFFERENT strategies:
1. Contrarian take  2. Personal observation  3. Bold claim  4. Question  5. Pattern interrupt

Return ONLY JSON: {{"tweets": [{{"text": "...", "strategy": "...", "strength": "why this works"}}]}}"""


def _pick_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

Your current task: evaluate the tweet candidates and select the strongest one."""

    return f"""You are selecting the strongest tweet from candidates. Be ruthless.

{ctx.voice_context}"""


def _pick_user(ctx: FlowContext) -> str:
    variations = ctx.get_step_result("hook_variations") or {}
    tweets = variations.get("tweets", [])
    listed = "\n".join([f"{i+1}. [{t.get('strategy','')}] {t.get('text','')}" for i, t in enumerate(tweets)])
    return f"""Pick the strongest tweet:

{listed}

Criteria: scroll-stop power, specificity, tension, quotability.

Return ONLY JSON: {{"best_index": 0, "reasoning": "why", "improved_version": "the tweet, slightly improved if possible"}}"""


def _compress_system(ctx: FlowContext) -> str:
    if ctx.editor_skill:
        return f"""{ctx.editor_skill}

{ctx.voice_context}

Platform: X (Twitter)
Your current task: final polish pass. Every character must earn its place. 280 max."""

    return f"""Final polish. Every character must earn its place. 280 max.

{ctx.voice_context}"""


def _compress_user(ctx: FlowContext) -> str:
    pick = ctx.get_step_result("pick_strongest") or {}
    tweet = pick.get("improved_version", "")
    return f"""Polish this tweet:

{tweet}

1. Trim any word that doesn't add meaning
2. Ensure under 280 characters
3. Check: would YOU stop scrolling for this?

Return ONLY JSON: {{"body": "final tweet", "char_count": 140, "scroll_stop_score": 8}}"""


class XPostFlow(ContentFlow):
    flow_type = "x_post"
    platform = "twitter"
    steps = [
        FlowStep(name="hook_variations", system_prompt_builder=_variations_system, user_prompt_builder=_variations_user, max_tokens=1536),
        FlowStep(name="pick_strongest", system_prompt_builder=_pick_system, user_prompt_builder=_pick_user, max_tokens=512),
        FlowStep(name="compress", system_prompt_builder=_compress_system, user_prompt_builder=_compress_user, max_tokens=512),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        final = ctx.get_step_result("compress") or {}
        body = final.get("body", "")[:280]
        return FlowResult(
            content_type="social_post", platform="twitter",
            title=f"Tweet: {body[:40]}...", body=body, hook=body, cta=None,
            metadata={"workflow_type": "x_post", "workflow_version": ctx.workflow_version,
                       "steps_completed": steps_done, "scroll_stop_score": final.get("scroll_stop_score")},
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(XPostFlow())
