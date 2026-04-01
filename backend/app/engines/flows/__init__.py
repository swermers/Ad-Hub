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
