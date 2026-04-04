"""Content-type flow architecture — multi-step pipelines per content type.

Each content type gets its own sequenced pipeline with specialized LLM calls
and quality gates between steps. Quality comes from multi-step refinement,
not from a better single prompt.

Usage:
    from app.engines.flows import FlowRegistry

    flow = FlowRegistry.get("linkedin_post")
    result = await flow.run(FlowContext(
        seed=seed_dict,
        draft=draft_dict,
        product_context="...",
        voice_context="...",
        prompt_set={...},
        workflow=workflow_obj,  # for versioned prompt overrides
    ))
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Awaitable

from app.services.claude_client import call_claude

logger = logging.getLogger(__name__)


# ─── Flow Context ──────────────────────────────────────────────────────────

@dataclass
class FlowContext:
    """Shared state that flows through all steps in a content flow."""

    seed: dict
    draft: dict | None
    product_context: str
    voice_context: str
    prompt_set: dict
    workflow_type: str = ""
    workflow_version: int = 1

    # Loaded skill content (from skill_loader) — rich, enforceable agent instructions
    drafter_skill: str = ""
    editor_skill: str = ""

    # Voice profile quality score (0-100) — affects editor pass thresholds
    # 90+: full enforcement (22/25), 70-89: softer gates (20/25), <70: guidance only
    voice_quality_score: int = 100

    # Step overrides from ContentTypeWorkflow (loaded from DB or defaults)
    step_prompt_overrides: dict[str, str] = field(default_factory=dict)
    quality_gate_overrides: dict[str, str] = field(default_factory=dict)

    # Accumulated results from each step — each step can read previous steps
    step_results: dict[str, Any] = field(default_factory=dict)

    def add_step_result(self, step_name: str, result: Any) -> None:
        self.step_results[step_name] = result

    def get_step_result(self, step_name: str) -> Any:
        return self.step_results.get(step_name)

    @property
    def source_text(self) -> str:
        """Best available source text for generation."""
        if self.draft and self.draft.get("body"):
            return self.draft["body"]
        return self.seed.get("seed", "")


# ─── Flow Result ───────────────────────────────────────────────────────────

def _clean_em_dashes(text: str | None) -> str | None:
    """Strip em dashes from generated text. Hard rule, no exceptions."""
    if not text or "\u2014" not in text:
        return text
    return text.replace(" \u2014 ", ", ").replace("\u2014", ", ")


@dataclass
class FlowResult:
    """Final output of a content flow."""

    content_type: str
    platform: str
    title: str = ""
    body: str = ""
    hook: str | None = None
    cta: str | None = None
    funnel_stage: str = "awareness"
    metadata: dict = field(default_factory=dict)
    video_style: str | None = None
    video_config: dict | None = None

    # Multi-step tracking
    steps_completed: list[str] = field(default_factory=list)
    quality_gates_passed: list[str] = field(default_factory=list)
    quality_gates_failed: list[str] = field(default_factory=list)
    total_llm_calls: int = 0

    def __post_init__(self):
        """Strip em dashes from all text fields on creation."""
        self.title = _clean_em_dashes(self.title) or ""
        self.body = _clean_em_dashes(self.body) or ""
        self.hook = _clean_em_dashes(self.hook)
        self.cta = _clean_em_dashes(self.cta)

    def to_dict(self) -> dict:
        d = {
            "content_type": self.content_type,
            "platform": self.platform,
            "title": self.title,
            "body": self.body,
            "hook": self.hook,
            "cta": self.cta,
            "funnel_stage": self.funnel_stage,
            "metadata": self.metadata,
        }
        if self.video_style:
            d["video_style"] = self.video_style
        if self.video_config:
            d["video_config"] = self.video_config
        return d


# ─── Flow Step ─────────────────────────────────────────────────────────────

@dataclass
class FlowStep:
    """A single step in a content flow."""

    name: str
    system_prompt_builder: Callable[[FlowContext], str]
    user_prompt_builder: Callable[[FlowContext], str]
    parser: Callable[[dict, FlowContext], Any] | None = None
    quality_gate: Callable[[Any, FlowContext], bool] | None = None
    max_retries: int = 1  # quality gate retries
    max_tokens: int = 2048
    premium: bool = False

    async def execute(self, ctx: FlowContext) -> Any:
        """Run this step: build prompts, call Claude, parse, gate."""
        # Allow workflow-level prompt overrides
        step_override = ctx.step_prompt_overrides.get(self.name)

        system = self.system_prompt_builder(ctx)
        user = self.user_prompt_builder(ctx)

        # If there's a workflow override for this step, append it
        if step_override:
            user = f"{user}\n\nADDITIONAL WORKFLOW INSTRUCTIONS:\n{step_override}"

        result = await call_claude(user, system=system, max_tokens=self.max_tokens, premium=self.premium)

        parsed = self._parse(result, ctx)

        # Quality gate with retry
        if self.quality_gate:
            for attempt in range(self.max_retries + 1):
                if self.quality_gate(parsed, ctx):
                    break
                if attempt < self.max_retries:
                    logger.info(f"Quality gate failed for {self.name}, retrying ({attempt + 1}/{self.max_retries})")
                    # Add feedback about what failed
                    retry_user = f"{user}\n\nYour previous output did not pass the quality gate. Try again with higher quality."
                    result = await call_claude(retry_user, system=system, max_tokens=self.max_tokens, premium=self.premium)
                    parsed = self._parse(result, ctx)

        return parsed

    def _parse(self, result: dict, ctx: FlowContext) -> Any:
        if self.parser:
            return self.parser(result, ctx)
        return _default_parse(result)


def _default_parse(result: dict) -> dict:
    """Default JSON parser with markdown fence stripping."""
    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {"raw": result.get("content", "")}


# ─── Base Content Flow ─────────────────────────────────────────────────────

class ContentFlow:
    """Base class for all content-type flows.

    Subclasses define `flow_type`, `platform`, and `steps`.
    The `run()` method executes steps in order, threading results through context.
    """

    flow_type: str = ""
    platform: str = "general"
    steps: list[FlowStep] = []

    async def run(self, ctx: FlowContext) -> FlowResult:
        """Execute all steps in order, accumulating results."""
        ctx.workflow_type = self.flow_type

        total_calls = 0
        gates_passed = []
        gates_failed = []
        steps_done = []

        for step in self.steps:
            result = await step.execute(ctx)
            ctx.add_step_result(step.name, result)
            total_calls += 1  # at least 1 call per step
            steps_done.append(step.name)

            if step.quality_gate:
                if step.quality_gate(result, ctx):
                    gates_passed.append(step.name)
                else:
                    gates_failed.append(step.name)

        return self.build_result(ctx, steps_done, gates_passed, gates_failed, total_calls)

    def build_result(
        self,
        ctx: FlowContext,
        steps_done: list[str],
        gates_passed: list[str],
        gates_failed: list[str],
        total_calls: int,
    ) -> FlowResult:
        """Build the final FlowResult from accumulated step results.

        Subclasses override this to assemble their specific output.
        """
        # Default: use the last step's result
        last_step = self.steps[-1].name if self.steps else ""
        last_result = ctx.get_step_result(last_step) or {}

        return FlowResult(
            content_type=self.flow_type,
            platform=self.platform,
            title=last_result.get("title", ""),
            body=last_result.get("body", ""),
            hook=last_result.get("hook"),
            cta=last_result.get("cta"),
            funnel_stage=last_result.get("funnel_stage", "awareness"),
            metadata={
                "workflow_type": self.flow_type,
                "workflow_version": ctx.workflow_version,
                "steps_completed": steps_done,
                **last_result.get("metadata", {}),
            },
            video_style=last_result.get("video_style"),
            video_config=last_result.get("video_config"),
            steps_completed=steps_done,
            quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed,
            total_llm_calls=total_calls,
        )


# ─── Editor Step Infrastructure ──────────────────────────────────────────
# Reusable components for the 22/25 scoring rubric, auto-fail conditions,
# and revision loop that all content flows share.


EDITOR_PASS_THRESHOLD = 22
EDITOR_REVISION_FLOOR = 18
EDITOR_HARD_FLOOR = 15


def editor_gate_check(result: dict, ctx: FlowContext) -> bool:
    """Score-aware 22/25 pass/fail check used by all editor steps.

    The pass threshold adjusts based on voice profile quality:
    - 90%+ profile: full enforcement (22/25)
    - 70-89% profile: softer gates (20/25)
    - Below 70%: even softer (18/25) since voice matching is inherently weaker

    Returns True if the draft passes, False to trigger a revision retry.
    """
    if result.get("passed") is True:
        return True

    score = result.get("overall_score", 0)

    # Adjust threshold based on voice profile quality
    if ctx.voice_quality_score >= 90:
        threshold = EDITOR_PASS_THRESHOLD  # 22
    elif ctx.voice_quality_score >= 70:
        threshold = 20
    else:
        threshold = EDITOR_REVISION_FLOOR  # 18

    return score >= threshold


def editor_gate_parser(result: dict, ctx: FlowContext) -> dict:
    """Standard editor parser — extracts scoring and handles revision feedback.

    If the editor returns priority_fixes, stores them in context so the
    retry prompt can reference them specifically.
    """
    parsed = _default_parse(result)

    # Store editor feedback for revision loop
    priority_fixes = parsed.get("priority_fixes", [])
    if priority_fixes:
        ctx.step_results["_editor_feedback"] = {
            "overall_score": parsed.get("overall_score", 0),
            "priority_fixes": priority_fixes,
            "violations": parsed.get("violations", []),
            "ai_fingerprints": parsed.get("ai_fingerprints", []),
        }

    return parsed


def build_editor_system_prompt(ctx: FlowContext, content_type: str, platform: str = "") -> str:
    """Build system prompt for an editor step using the loaded editor skill.

    Falls back to a structured default if no skill is loaded.
    """
    if ctx.editor_skill:
        return f"""{ctx.editor_skill}

{ctx.voice_context}

Content type: {content_type}
{f"Platform: {platform}" if platform else ""}
Your current task: review this draft against the voice profile and quality gates. Score on the 22/25 rubric."""

    # Fallback: structured editor prompt without skill file
    return f"""You are a content quality gate. Review this draft against the voice profile and quality standards.

{ctx.voice_context}

{ctx.prompt_set.get("voice_rules", "")}

Content type: {content_type}
{f"Platform: {platform}" if platform else ""}

Score each dimension 1-5:
- Voice match: Does this sound like the creator?
- Format compliance: Does it follow platform/type conventions?
- Coherence: Does it deliver on the seed's promise?
- Quality: Is this good enough to publish without edits?
- AI-free: Does it pass the fingerprint scan cleanly?

Pass threshold: 22/25. Auto-fail: banned words, 3+ AI fingerprints, wrong format conventions."""


def build_editor_user_prompt(
    ctx: FlowContext,
    draft_text: str,
    content_type: str,
    platform: str = "",
    extra_checks: str = "",
) -> str:
    """Build user prompt for an editor step.

    Includes the draft, seed context, and asks for the standardized scoring output.
    """
    seed_context = f"""Seed: {ctx.seed.get('seed', '')}
Heat: {json.dumps(ctx.seed.get('heat', []))}
Audience hook: {ctx.seed.get('audience_hook', '')}"""

    return f"""Review this {content_type} draft:

---
{draft_text[:3000]}
---

Source context:
{seed_context}

{extra_checks}

Score each dimension 1-5. Pass threshold: 22/25.

Auto-fail conditions:
- Any em dash (—) anywhere in the content. Rewrite using commas, periods, or colons instead.
- Any word from the voice profile's banned list
- More than 2 AI fingerprints (universal + profile-specific)
- Format conventions from another content type leaking in
{f"- Over 280 characters (X post)" if platform == "twitter" else ""}
{f"- Newsletter sign-off on a social post" if content_type == "social_post" else ""}

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


# ─── Flow Registry ─────────────────────────────────────────────────────────

class FlowRegistry:
    """Registry of all content-type flows. Import and register at module load."""

    _flows: dict[str, ContentFlow] = {}

    @classmethod
    def register(cls, flow: ContentFlow) -> None:
        cls._flows[flow.flow_type] = flow

    @classmethod
    def get(cls, flow_type: str) -> ContentFlow | None:
        return cls._flows.get(flow_type)

    @classmethod
    def list_types(cls) -> list[str]:
        return sorted(cls._flows.keys())

    @classmethod
    def all(cls) -> dict[str, ContentFlow]:
        return dict(cls._flows)


# ─── Register all flows on import ──────────────────────────────────────────
# Each flow module registers itself when imported.

def _register_all():
    """Import all flow modules to trigger registration."""
    from app.engines.flows import (  # noqa: F401
        linkedin_post,
        x_thread,
        carousel,
        x_post,
        newsletter,
        story,
        video_script,
        meta_post,
        email,
    )

_register_all()
