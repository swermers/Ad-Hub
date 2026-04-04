"""Newsletter Flow — 5-step pipeline for email newsletters.

Steps:
  1. Subject A/B     → Generate subject line variants
  2. Preview Text    → Write preview text that complements subject
  3. Draft Sections  → Full newsletter body with template + voice
  4. Voice Check     → Ensure voice consistency + readability
  5. CTA Blocks      → Optimize calls to action placement
"""

import json
from app.engines.flows import (
    ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry,
    editor_gate_parser, editor_gate_check,
)


def _subject_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Your current task: generate 5 subject line A/B variants. The subject line is an ad for the newsletter — it decides open rates."""

    return f"""You write newsletter subject lines. The subject line is an ad for the email — it decides open rates.
{ctx.product_context}
{ctx.voice_context}"""


def _subject_user(ctx: FlowContext) -> str:
    return f"""Seed: {ctx.seed.get('seed', '')}
Theme: {ctx.seed.get('weekly_theme', '')}
Heat: {json.dumps(ctx.seed.get('heat', []))}

Generate 5 subject line A/B variants. Each should:
- Be 6-10 words
- Create curiosity without clickbait
- Test different angles (question, statement, number, personal, urgency)

Return ONLY JSON: {{"subjects": [{{"text": "...", "angle": "...", "predicted_open_driver": "..."}}], "recommended_index": 0}}"""


def _preview_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

Your current task: write preview text that COMPLEMENTS the subject line. Never repeat it."""

    return f"""You write email preview text — the line that shows next to the subject in inbox. Complements, doesn't repeat.

{ctx.voice_context}"""


def _preview_user(ctx: FlowContext) -> str:
    subjects = ctx.get_step_result("subject_lines") or {}
    best_idx = subjects.get("recommended_index", 0)
    best = (subjects.get("subjects") or [{}])[best_idx].get("text", "")
    return f"""Subject line: {best}

Write preview text (under 90 chars) that:
- Creates additional curiosity beyond the subject
- Never repeats the subject line
- Feels like a whispered aside or teaser

Return ONLY JSON: {{"preview_text": "...", "subject_line": "{best}"}}"""


def _draft_system(ctx: FlowContext) -> str:
    ps = ctx.prompt_set
    template = ctx.seed.get("template_fit", "A")
    template_instructions = ps.get("template_instructions", {})

    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

TEMPLATE: {template}
{template_instructions.get(template, template_instructions.get("A", ""))}

Your current task: write the full newsletter body following the template structure."""

    return f"""You are writing a newsletter. Authentic voice, clear structure.
{ctx.product_context}
{ctx.voice_context}
{ps.get("voice_rules", "")}

TEMPLATE: {template}
{template_instructions.get(template, template_instructions.get("A", ""))}"""


def _draft_user(ctx: FlowContext) -> str:
    preview = ctx.get_step_result("preview_text") or {}
    return f"""Write the full newsletter body.

Subject: {preview.get('subject_line', '')}
Preview: {preview.get('preview_text', '')}
Seed: {ctx.seed.get('seed', '')}
Metaphor: {ctx.seed.get('metaphor', 'None')}
{f"Source content: {ctx.source_text[:1500]}" if ctx.source_text else ""}

Return ONLY JSON: {{"title": "...", "body": "full newsletter in markdown", "sections": ["section headings"]}}"""


def _voice_system(ctx: FlowContext) -> str:
    if ctx.editor_skill:
        return f"""{ctx.editor_skill}

{ctx.voice_context}

Your current task: review this newsletter draft for voice consistency and quality gates."""

    return f"""You are a voice consistency editor. Check that the newsletter sounds like the creator, not AI.
{ctx.voice_context}
{ctx.prompt_set.get("voice_rules", "")}"""


def _voice_user(ctx: FlowContext) -> str:
    draft = ctx.get_step_result("draft_sections") or {}
    template = ctx.seed.get("template_fit", "A")
    return f"""Review this newsletter draft:

---
{draft.get('body', '')[:3000]}
---

Seed: {ctx.seed.get('seed', '')}
Template: {template}
Metaphor: {ctx.seed.get('metaphor', 'None')}

Score each dimension 1-5. Pass threshold: 22/25.

| Dimension | What You're Measuring |
|---|---|
| Voice match | Does this sound like the creator? Would they send this without edits? |
| Observation vs. prescription | Is it noticing patterns or telling the reader what to do? |
| Psychological curiosity | Does it explore the WHY behind behavior, not just the WHAT? |
| Energy/cost framing | Does it frame struggle as expensive, not wrong? |
| Grounding | Is the piece anchored in something specific — a scene, a moment, a metaphor? |

Template {template} structure checks:
{"- First-person opening? ONE central metaphor, bolded? 'the mechanics' and 'the weight' lowercase headers? Reflective close?" if template == "A" else ""}
{"- Relatable scenario hook? Bold insight? 3-5 actionable steps? Sign-off?" if template == "B" else ""}
{"- Specific anecdote with sensory details? Personal-to-universal bridge? Light-touch application?" if template == "C" else ""}
{"- Observation (2-3 sentences)? Reframe? Questions? Short (3-5 paragraphs total)?" if template == "D" else ""}

Auto-fail conditions:
- Wrong sign-off (not matching voice profile)
- More than 3 AI fingerprints
- Brand copy in body text
- Wrong template structure entirely

Return ONLY a JSON object:
{{
    "overall_score": 22,
    "passed": true,
    "scores": {{
        "voice_match": 5,
        "observation_vs_prescription": 4,
        "psychological_curiosity": 5,
        "energy_cost_framing": 4,
        "grounding": 4
    }},
    "template_alignment": {{
        "template": "{template}",
        "structure_adherence": "Strong",
        "missing_elements": []
    }},
    "violations": [],
    "ai_fingerprints": [],
    "metaphor_check": {{
        "metaphor": "",
        "integrity": "",
        "recommendation": ""
    }},
    "priority_fixes": [],
    "strongest_moments": []
}}"""


def _cta_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

Your current task: optimize CTA placement. Natural, not salesy. Placed after value delivery."""

    return f"""You optimize newsletter CTAs. Natural, not salesy. Placed at the right moments.

{ctx.voice_context}"""


def _cta_user(ctx: FlowContext) -> str:
    draft = ctx.get_step_result("draft_sections") or {}
    return f"""Optimize CTAs in this newsletter:

{draft.get('body', '')[:2000]}

1. Is the primary CTA clear and compelling?
2. Is it placed at the right point (after value, not before)?
3. Should there be a secondary CTA or P.S. line?

Return ONLY JSON: {{"primary_cta": "...", "cta_placement": "after which section",
"ps_line": "optional P.S.", "final_body": "newsletter with optimized CTA placement"}}"""


class NewsletterFlow(ContentFlow):
    flow_type = "newsletter"
    platform = "general"
    steps = [
        FlowStep(name="subject_lines", system_prompt_builder=_subject_system, user_prompt_builder=_subject_user, max_tokens=1024),
        FlowStep(name="preview_text", system_prompt_builder=_preview_system, user_prompt_builder=_preview_user, max_tokens=512),
        FlowStep(name="draft_sections", system_prompt_builder=_draft_system, user_prompt_builder=_draft_user, max_tokens=4096, premium=True),
        FlowStep(name="voice_check", system_prompt_builder=_voice_system, user_prompt_builder=_voice_user, parser=editor_gate_parser, quality_gate=editor_gate_check, max_tokens=3072, premium=True),
        FlowStep(name="cta_optimization", system_prompt_builder=_cta_system, user_prompt_builder=_cta_user, max_tokens=2048),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        cta_result = ctx.get_step_result("cta_optimization") or {}
        draft = ctx.get_step_result("draft_sections") or {}
        subjects = ctx.get_step_result("subject_lines") or {}
        preview = ctx.get_step_result("preview_text") or {}
        voice = ctx.get_step_result("voice_check") or {}

        body = cta_result.get("final_body") or draft.get("body", "")
        best_idx = subjects.get("recommended_index", 0)
        subject_list = subjects.get("subjects", [])
        subject = subject_list[best_idx]["text"] if subject_list else ""

        return FlowResult(
            content_type="blog_draft", platform="general",
            title=draft.get("title", subject),
            body=body,
            hook=subject,
            cta=cta_result.get("primary_cta"),
            metadata={
                "workflow_type": "newsletter", "workflow_version": ctx.workflow_version,
                "steps_completed": steps_done,
                "subject_line": subject, "subject_variants": [s.get("text") for s in subject_list],
                "preview_text": preview.get("preview_text", ""),
                "ps_line": cta_result.get("ps_line"),
                "editor_score": voice.get("overall_score"),
                "editor_scores": voice.get("scores", {}),
                "editor_passed": voice.get("passed", False),
                "template_alignment": voice.get("template_alignment", {}),
                "metaphor_check": voice.get("metaphor_check", {}),
                "source": "newsletter_flow",
            },
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(NewsletterFlow())
