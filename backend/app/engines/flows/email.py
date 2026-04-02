"""Email Flow — 4-step pipeline for marketing emails.

Steps:
  1. Subject + Preview → Write subject line + preview text pair
  2. Body              → Write scannable email body (3-5 paragraphs)
  3. CTA               → Optimize single CTA placement + P.S. line
  4. Readability Gate  → Verify scannability, single CTA, tone
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

Your current task: write a subject line (6-10 words) + preview text (under 90 chars). 60% of opens are decided by the subject alone."""

    return f"""You write marketing emails that get opened. Subject + preview are the only things people see in inbox.
{ctx.product_context}
{ctx.voice_context}"""


def _subject_user(ctx: FlowContext) -> str:
    return f"""Seed: {ctx.seed.get('seed', '')}
{f"Context: {ctx.source_text[:400]}" if ctx.draft else ""}

Write a subject line (6-10 words) + preview text (under 90 chars).
The preview must COMPLEMENT the subject, not repeat it.

Return ONLY JSON: {{"subject": "...", "preview": "...", "open_driver": "curiosity|urgency|personal|benefit"}}"""


def _body_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Your current task: write the email body. 150-300 words. Feels like a person, not a template."""

    return f"""You write marketing emails. Conversational, scannable, 3-5 short paragraphs.

{ctx.voice_context}

{ctx.prompt_set.get("voice_rules", "")}
Write like a person emailing a colleague, not a newsletter blasting a list."""


def _body_user(ctx: FlowContext) -> str:
    subject = ctx.get_step_result("subject_preview") or {}
    return f"""Subject: {subject.get('subject', '')}
Preview: {subject.get('preview', '')}

Write the email body. 3-5 short paragraphs. Scannable.
{f"Source: {ctx.source_text[:1000]}" if ctx.source_text else f"Topic: {ctx.seed.get('seed', '')}"}

Return ONLY JSON: {{"body": "full email body in markdown", "tone": "conversational|professional|urgent"}}"""


def _cta_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

Your current task: optimize the CTA. One clear ask — multiple CTAs dilute all of them. Add P.S. if it adds value."""

    return f"""You optimize email CTAs. One clear CTA — don't dilute with multiple asks. Optional P.S. for secondary hook.

{ctx.voice_context}"""


def _cta_user(ctx: FlowContext) -> str:
    body = ctx.get_step_result("body_paragraphs") or {}
    return f"""Optimize the CTA in this email:

{body.get('body', '')}

1. Write a clear CTA button text (3-5 words)
2. Place it after value delivery, not before
3. Write a P.S. line (optional but effective — use for social proof or secondary hook)

Return ONLY JSON: {{"cta_button": "...", "ps_line": "...", "final_body": "email with CTA placed correctly"}}"""


def _readability_system(ctx: FlowContext) -> str:
    if ctx.editor_skill:
        return f"""{ctx.editor_skill}

{ctx.voice_context}

Content type: Email
Your current task: check email quality — scannability, single CTA, human voice, value-first structure."""

    return f"""You check email quality. Scannable? Single CTA? Sounds human?

{ctx.voice_context}"""


def _readability_user(ctx: FlowContext) -> str:
    cta = ctx.get_step_result("cta_optimization") or {}
    subject = ctx.get_step_result("subject_preview") or {}
    body = cta.get('final_body', '')
    ps = cta.get('ps_line', '')

    return f"""Review this email:

Subject: {subject.get('subject', '')}
Preview: {subject.get('preview', '')}

{body}

{f"P.S. {ps}" if ps else ""}

Seed: {ctx.seed.get('seed', '')}

Score each dimension 1-5. Pass threshold: 22/25.

| Dimension | What You're Measuring |
|---|---|
| Voice match | Does this sound like the creator, not a marketing template? |
| Format compliance | Subject 6-10 words? Preview under 90 chars? Body 150-300 words? One CTA? |
| Coherence | Does the email deliver on the subject line's promise? |
| Quality | Opens personal/direct? Value before ask? P.S. adds value? |
| AI-free | No AI fingerprints? No "hope this email finds you well"? |

Auto-fail conditions:
- Multiple CTAs (dilutes all of them)
- Subject line over 10 words
- Preview text repeats the subject
- Opens with "Hope this email finds you well" or similar template language
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
    "violations": [],
    "ai_fingerprints": [],
    "priority_fixes": [],
    "strongest_moments": [],
    "notes": ""
}}"""


class EmailFlow(ContentFlow):
    flow_type = "email"
    platform = "general"
    steps = [
        FlowStep(name="subject_preview", system_prompt_builder=_subject_system, user_prompt_builder=_subject_user, max_tokens=512),
        FlowStep(name="body_paragraphs", system_prompt_builder=_body_system, user_prompt_builder=_body_user, max_tokens=2048),
        FlowStep(name="cta_optimization", system_prompt_builder=_cta_system, user_prompt_builder=_cta_user, max_tokens=2048),
        FlowStep(name="readability_gate", system_prompt_builder=_readability_system, user_prompt_builder=_readability_user, parser=editor_gate_parser, quality_gate=editor_gate_check, max_tokens=1536, premium=True),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        subject = ctx.get_step_result("subject_preview") or {}
        cta = ctx.get_step_result("cta_optimization") or {}
        readability = ctx.get_step_result("readability_gate") or {}

        body = cta.get("final_body", "")
        ps = cta.get("ps_line", "")
        if ps:
            body += f"\n\nP.S. {ps}"

        return FlowResult(
            content_type="email", platform="general",
            title=subject.get("subject", "Email"), body=body,
            hook=subject.get("subject"), cta=cta.get("cta_button"),
            funnel_stage="consideration",
            metadata={"workflow_type": "email", "workflow_version": ctx.workflow_version,
                       "steps_completed": steps_done,
                       "subject_line": subject.get("subject"), "preview_text": subject.get("preview"),
                       "ps_line": ps,
                       "editor_score": readability.get("overall_score"),
                       "editor_scores": readability.get("scores", {}),
                       "editor_passed": readability.get("passed", False)},
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(EmailFlow())
