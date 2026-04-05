"""LinkedIn Post Flow — 4-step pipeline for thought-leadership posts.

Steps:
  1. Angle Selection  → Pick contrarian take or insight from brief
  2. Hook + Structure → Write opening hook + outline (story → lesson → CTA)
  3. Draft Post       → Full post with line breaks, authority tone
  4. Engagement Gate  → Strong hook? Clear value? Conversation-starting close?
"""

from app.engines.flows import (
    ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry,
    editor_gate_parser, editor_gate_check,
)


# ─── Step 1: Angle Selection ──────────────────────────────────────────────

def _angle_system(ctx: FlowContext) -> str:
    # Use loaded skill content if available, otherwise fall back to inline prompt
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Your current task: find the most compelling professional ANGLE from the source material.
Do NOT draft the post yet — just identify the angle."""

    return f"""You are a LinkedIn content strategist. You find the most compelling professional angle from raw ideas.

{ctx.product_context}

{ctx.voice_context}

LinkedIn posts that perform best share a specific, contrarian, or experiential insight — not generic advice."""


def _angle_user(ctx: FlowContext) -> str:
    return f"""Source material:
Seed: {ctx.seed.get('seed', '')}
Heat lines: {ctx.seed.get('heat', [])}
Audience hook: {ctx.seed.get('audience_hook', '')}
{f"Newsletter excerpt: {ctx.source_text[:600]}" if ctx.draft else ""}

Find the ONE strongest ANGLE for a LinkedIn post. Identify the single core insight — strip everything that doesn't serve it. Look for:
- A contrarian take that challenges conventional wisdom
- A personal experience that reveals a non-obvious lesson
- A pattern you've noticed that others haven't named yet
- An unpopular opinion you can back with evidence

Return ONLY a JSON object:
{{
    "angle": "one sentence describing the angle",
    "hook_type": "contrarian|experiential|pattern|unpopular_opinion",
    "target_emotion": "what the reader should feel (curiosity, recognition, surprise)",
    "proof_points": ["2-3 supporting points or examples"]
}}"""


# ─── Step 2: Hook + Structure ─────────────────────────────────────────────

def _structure_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

Your current task: craft 3 opening hook variations and outline the post structure.
LinkedIn shows ~140 characters before "see more". That first line IS the ad for the rest of the post."""

    return f"""You are a LinkedIn copywriter. You craft opening hooks that stop professionals mid-scroll.

{ctx.voice_context}

{ctx.prompt_set.get("voice_rules", "")}

LinkedIn shows ~140 characters before "see more". That first line IS the ad for the rest of the post."""


def _structure_user(ctx: FlowContext) -> str:
    angle = ctx.get_step_result("angle_selection") or {}
    return f"""Angle: {angle.get('angle', ctx.seed.get('seed', ''))}
Hook type: {angle.get('hook_type', 'experiential')}
Target emotion: {angle.get('target_emotion', 'curiosity')}
Proof points: {angle.get('proof_points', [])}

Write 3 opening hook variations (each under 140 chars) and outline the post structure.

Return ONLY a JSON object:
{{
    "hooks": ["hook 1", "hook 2", "hook 3"],
    "best_hook_index": 0,
    "structure": {{
        "opening": "how the post starts after the hook",
        "middle": "the core insight or story",
        "proof": "evidence or example that makes it credible",
        "close": "conversation-starting question or takeaway"
    }}
}}"""


# ─── Step 3: Draft Post ──────────────────────────────────────────────────

def _draft_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Your current task: write the FULL LinkedIn post using the angle and hook structure from previous steps."""

    return f"""You are writing a LinkedIn post. Professional but not corporate. First-person, authentic.

{ctx.product_context}

{ctx.voice_context}

{ctx.prompt_set.get("voice_rules", "")}

{ctx.prompt_set.get("social_post_rules", "")}

LINKEDIN FORMAT RULES:
- 150-250 words. Shorter is stronger. Every sentence must earn its place.
- Short paragraphs (1-2 sentences). White space is your friend.
- No emojis unless brand voice calls for them.
- No hashtags in body. Add 3-5 at the very end.
- End with a genuine question that invites discussion."""


def _draft_user(ctx: FlowContext) -> str:
    angle = ctx.get_step_result("angle_selection") or {}
    structure = ctx.get_step_result("hook_structure") or {}
    hooks = structure.get("hooks", [])
    best_idx = structure.get("best_hook_index", 0)
    best_hook = hooks[best_idx] if hooks else ctx.seed.get("seed", "")
    outline = structure.get("structure", {})

    return f"""Write the full LinkedIn post using this plan:

Opening hook: {best_hook}
Opening: {outline.get('opening', '')}
Middle: {outline.get('middle', '')}
Proof: {outline.get('proof', '')}
Close: {outline.get('close', '')}

Angle: {angle.get('angle', '')}

Return ONLY a JSON object:
{{
    "title": "short label for this post",
    "body": "the full LinkedIn post text",
    "hook": "the opening line",
    "cta": "the closing question",
    "funnel_stage": "awareness",
    "word_count": 250
}}"""


# ─── Step 4: Engagement Gate ─────────────────────────────────────────────

def _gate_system(ctx: FlowContext) -> str:
    if ctx.editor_skill:
        return f"""{ctx.editor_skill}

{ctx.voice_context}

Platform: LinkedIn
Your current task: evaluate this post against the voice profile and quality gates."""

    return f"""You are a LinkedIn algorithm expert and engagement coach. Evaluate this post ruthlessly.

{ctx.voice_context}"""


def _gate_user(ctx: FlowContext) -> str:
    draft = ctx.get_step_result("draft") or {}
    body = draft.get("body", "")
    return f"""Review this LinkedIn post:

---
{body}
---

Seed: {ctx.seed.get('seed', '')}
Audience hook: {ctx.seed.get('audience_hook', '')}

Score each dimension 1-5. Pass threshold: 22/25.

| Dimension | What You're Measuring |
|---|---|
| Voice match | Does this sound like the creator? Would they post this without edits? |
| Specificity | Is there at least one concrete moment/example the reader can picture? |
| Tension | Does the post hold two ideas that pull against each other? |
| Stealable line | Is there one phrase someone would screenshot or share? |
| Platform compliance | Hook under 140 chars? 125-300 words? Line breaks? Conversation-starting close? Posts over 250 words lose a point. |

Auto-fail conditions:
- Contains words from the voice profile's banned list
- More than 2 AI fingerprints
- Newsletter-style sign-off on a social post
- No identifiable stealable line
- "Most people don't understand X" or "I just had a realization" openers

Return ONLY a JSON object:
{{
    "overall_score": 22,
    "passed": true,
    "scores": {{
        "voice_match": 5,
        "specificity": 4,
        "tension": 5,
        "stealable_line": 4,
        "platform_compliance": 4
    }},
    "violations": [],
    "ai_fingerprints": [],
    "three_filters": {{
        "specificity": "description of the specific moment",
        "tension": "what pulls against what",
        "stealable_line": "the screenshot-worthy phrase"
    }},
    "priority_fixes": [],
    "strongest_moments": [],
    "feedback": ""
}}"""


# ─── Assemble Flow ─────────────────────────────────────────────────────────

class LinkedInPostFlow(ContentFlow):
    flow_type = "linkedin_post"
    platform = "linkedin"
    steps = [
        FlowStep(
            name="angle_selection",
            system_prompt_builder=_angle_system,
            user_prompt_builder=_angle_user,
            max_tokens=1024,
        ),
        FlowStep(
            name="hook_structure",
            system_prompt_builder=_structure_system,
            user_prompt_builder=_structure_user,
            max_tokens=1024,
        ),
        FlowStep(
            name="draft",
            system_prompt_builder=_draft_system,
            user_prompt_builder=_draft_user,
            max_tokens=2048,
            premium=True,
        ),
        FlowStep(
            name="engagement_gate",
            system_prompt_builder=_gate_system,
            user_prompt_builder=_gate_user,
            parser=editor_gate_parser,
            quality_gate=editor_gate_check,
            max_tokens=3072,
            premium=True,
        ),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        draft = ctx.get_step_result("draft") or {}
        gate = ctx.get_step_result("engagement_gate") or {}

        return FlowResult(
            content_type="social_post",
            platform="linkedin",
            title=draft.get("title", "LinkedIn Post"),
            body=draft.get("body", ""),
            hook=draft.get("hook"),
            cta=draft.get("cta"),
            funnel_stage=draft.get("funnel_stage", "awareness"),
            metadata={
                "workflow_type": "linkedin_post",
                "workflow_version": ctx.workflow_version,
                "steps_completed": steps_done,
                "editor_score": gate.get("overall_score"),
                "editor_scores": gate.get("scores", {}),
                "editor_passed": gate.get("passed", False),
                "three_filters": gate.get("three_filters", {}),
                "angle": (ctx.get_step_result("angle_selection") or {}).get("angle"),
                "hook_type": (ctx.get_step_result("angle_selection") or {}).get("hook_type"),
            },
            steps_completed=steps_done,
            quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed,
            total_llm_calls=total_calls,
        )


FlowRegistry.register(LinkedInPostFlow())
