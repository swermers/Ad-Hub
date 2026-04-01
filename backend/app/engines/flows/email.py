"""Email Flow — 4-step pipeline for marketing emails.

Steps:
  1. Subject + Preview → Write subject line + preview text pair
  2. Body              → Write scannable email body (3-5 paragraphs)
  3. CTA               → Optimize single CTA placement + P.S. line
  4. Readability Gate  → Verify scannability, single CTA, tone
"""

import json
from app.engines.flows import ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry


def _subject_system(ctx: FlowContext) -> str:
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
    return f"""You write marketing emails. Conversational, scannable, 3-5 short paragraphs.
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
    return """You optimize email CTAs. One clear CTA — don't dilute with multiple asks. Optional P.S. for secondary hook."""


def _cta_user(ctx: FlowContext) -> str:
    body = ctx.get_step_result("body_paragraphs") or {}
    return f"""Optimize the CTA in this email:

{body.get('body', '')}

1. Write a clear CTA button text (3-5 words)
2. Place it after value delivery, not before
3. Write a P.S. line (optional but effective — use for social proof or secondary hook)

Return ONLY JSON: {{"cta_button": "...", "ps_line": "...", "final_body": "email with CTA placed correctly"}}"""


def _readability_system(ctx: FlowContext) -> str:
    return """You check email quality. Scannable? Single CTA? Sounds human?"""


def _readability_user(ctx: FlowContext) -> str:
    cta = ctx.get_step_result("cta_optimization") or {}
    subject = ctx.get_step_result("subject_preview") or {}
    return f"""Review this email:

Subject: {subject.get('subject', '')}
Preview: {subject.get('preview', '')}

{cta.get('final_body', '')}

P.S. {cta.get('ps_line', '')}

Score (1-10):
1. SCANNABILITY: Can someone get the gist in 10 seconds?
2. SINGLE CTA: Is there exactly one clear ask?
3. HUMAN VOICE: Does it sound like a person, not a template?
4. VALUE FIRST: Is value delivered before the ask?

Return ONLY JSON: {{"scores": {{"scannability": 8, "single_cta": 9, "human_voice": 8, "value_first": 8}},
"average": 8.25, "passed": true, "feedback": "..."}}"""


def _readability_check(result: dict, ctx: FlowContext) -> bool:
    return result.get("passed", False) or result.get("average", 0) >= 7


class EmailFlow(ContentFlow):
    flow_type = "email"
    platform = "general"
    steps = [
        FlowStep(name="subject_preview", system_prompt_builder=_subject_system, user_prompt_builder=_subject_user, max_tokens=512),
        FlowStep(name="body_paragraphs", system_prompt_builder=_body_system, user_prompt_builder=_body_user, max_tokens=2048),
        FlowStep(name="cta_optimization", system_prompt_builder=_cta_system, user_prompt_builder=_cta_user, max_tokens=2048),
        FlowStep(name="readability_gate", system_prompt_builder=_readability_system, user_prompt_builder=_readability_user, quality_gate=_readability_check, max_tokens=1024),
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
                       "ps_line": ps, "readability_scores": readability.get("scores", {})},
            steps_completed=steps_done, quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed, total_llm_calls=total_calls,
        )

FlowRegistry.register(EmailFlow())
