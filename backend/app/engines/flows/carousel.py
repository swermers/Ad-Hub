"""Carousel Flow — 4-step pipeline for Instagram/Facebook carousels.

Steps:
  1. Slide Outline    → Plan story arc across 4-6 slides
  2. Write Slides     → Individual slide copy (standalone + sequential)
  3. Cover + CTA      → Refine cover slide hook + final CTA slide
  4. Validate Arc     → Each slide standalone? Cover hooks? Flow works?
"""

import json

from app.engines.flows import ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry


# ─── Step 1: Slide Outline ────────────────────────────────────────────────

def _outline_system(ctx: FlowContext) -> str:
    return f"""You are a carousel content architect. You structure ideas into compelling slide sequences.

{ctx.product_context}

{ctx.voice_context}

Carousel psychology: People swipe when the current slide creates a question the next slide answers.
The cover slide is the ad for the carousel. The last slide is the conversion point."""


def _outline_user(ctx: FlowContext) -> str:
    return f"""Source material:
Seed: {ctx.seed.get('seed', '')}
Heat lines: {json.dumps(ctx.seed.get('heat', []))}
{f"Newsletter excerpt: {ctx.source_text[:800]}" if ctx.draft else ""}

Plan a carousel with 5-6 slides. For each slide define:
- Role in the arc (hook, problem, insight, evidence, reframe, CTA)
- Core message (one idea per slide)
- Swipe trigger (why the viewer swipes to the next slide)

Return ONLY a JSON object:
{{
    "theme": "one-line carousel theme",
    "slide_count": 5,
    "target_audience_feeling": "what the viewer should feel after the last slide",
    "slides": [
        {{
            "position": 1,
            "role": "hook",
            "message": "what this slide communicates",
            "swipe_trigger": "why they swipe to the next"
        }}
    ]
}}"""


# ─── Step 2: Write Slides ────────────────────────────────────────────────

def _write_system(ctx: FlowContext) -> str:
    return f"""You are writing carousel slide copy. Each slide headline must be under 25 characters. Punchy, visual, bold.

{ctx.prompt_set.get("voice_rules", "")}

SLIDE COPY RULES:
- Headline: MAX 25 characters. Bold statement, not a sentence.
- Subtext (optional): MAX 50 characters. One supporting line.
- Each slide must make sense on its own (someone might screenshot just one).
- But together they must tell a story with forward momentum.
- Use contrast, numbers, or questions to create visual interest."""


def _write_user(ctx: FlowContext) -> str:
    outline = ctx.get_step_result("slide_outline") or {}
    slides = outline.get("slides", [])
    outline_text = json.dumps(slides, indent=2)

    return f"""Write the copy for each slide in this carousel:

Theme: {outline.get('theme', '')}

Outline:
{outline_text}

Return ONLY a JSON object:
{{
    "slides": [
        {{
            "position": 1,
            "headline": "bold headline (max 25 chars)",
            "subtext": "supporting line (max 50 chars, optional)",
            "role": "hook"
        }}
    ]
}}"""


# ─── Step 3: Cover + CTA Refine ──────────────────────────────────────────

def _refine_system(ctx: FlowContext) -> str:
    return f"""You are refining the two most important slides in a carousel: the cover and the CTA.

{ctx.voice_context}

The cover slide is competing with everything else in someone's feed. It must win that competition.
The CTA slide is the only slide that directly drives action. Make it count."""


def _refine_user(ctx: FlowContext) -> str:
    written = ctx.get_step_result("write_slides") or {}
    slides = written.get("slides", [])
    cover = slides[0] if slides else {}
    cta = slides[-1] if slides else {}

    return f"""Refine these two critical slides:

COVER SLIDE (current):
  Headline: {cover.get('headline', '')}
  Subtext: {cover.get('subtext', '')}

CTA SLIDE (current):
  Headline: {cta.get('headline', '')}
  Subtext: {cta.get('subtext', '')}

For the COVER, generate 3 variations and pick the strongest.
For the CTA, make it action-oriented and low-friction.

Return ONLY a JSON object:
{{
    "cover_variations": ["variation 1", "variation 2", "variation 3"],
    "best_cover_index": 0,
    "cover_reasoning": "why this one wins",
    "refined_cover": {{
        "headline": "...",
        "subtext": "..."
    }},
    "refined_cta": {{
        "headline": "...",
        "subtext": "..."
    }}
}}"""


# ─── Step 4: Validate Arc ────────────────────────────────────────────────

def _validate_system(ctx: FlowContext) -> str:
    return """You are validating a carousel for quality. Check each slide and the overall arc."""


def _validate_user(ctx: FlowContext) -> str:
    written = ctx.get_step_result("write_slides") or {}
    slides = written.get("slides", [])
    refine = ctx.get_step_result("cover_cta_refine") or {}

    # Apply refined cover and CTA
    if slides and refine.get("refined_cover"):
        slides[0] = {**slides[0], **refine["refined_cover"]}
    if slides and refine.get("refined_cta"):
        slides[-1] = {**slides[-1], **refine["refined_cta"]}

    slides_text = "\n".join([
        f"Slide {s.get('position', i+1)}: [{s.get('headline', '')}] {s.get('subtext', '')}"
        for i, s in enumerate(slides)
    ])

    return f"""Validate this carousel:

{slides_text}

Check:
1. COVER HOOK: Does slide 1 make you want to swipe? (1-10)
2. STANDALONE: Can each slide be screenshotted and still make sense? (1-10)
3. FLOW: Does each slide pull you to the next? (1-10)
4. ARC: Is there a clear beginning → middle → end? (1-10)
5. CTA: Is the last slide a clear, compelling next step? (1-10)
6. CHARACTER LIMITS: Any headline over 25 chars? Flag it.

Return ONLY a JSON object:
{{
    "scores": {{"cover_hook": 8, "standalone": 7, "flow": 8, "arc": 9, "cta": 8}},
    "average": 8.0,
    "passed": true,
    "over_limit_slides": [],
    "feedback": "what works and what could improve",
    "final_slides": [
        {{"position": 1, "headline": "...", "subtext": "..."}}
    ]
}}"""


def _validate_parser(result: dict, ctx: FlowContext) -> dict:
    from app.engines.flows import _default_parse
    parsed = _default_parse(result)

    if parsed.get("final_slides"):
        ctx.step_results["write_slides"]["slides"] = parsed["final_slides"]

    return parsed


def _validate_check(result: dict, ctx: FlowContext) -> bool:
    return result.get("passed", False) or result.get("average", 0) >= 7


# ─── Assemble Flow ─────────────────────────────────────────────────────────

class CarouselFlow(ContentFlow):
    flow_type = "carousel"
    platform = "general"
    steps = [
        FlowStep(name="slide_outline", system_prompt_builder=_outline_system, user_prompt_builder=_outline_user, max_tokens=1536),
        FlowStep(name="write_slides", system_prompt_builder=_write_system, user_prompt_builder=_write_user, max_tokens=2048, premium=True),
        FlowStep(name="cover_cta_refine", system_prompt_builder=_refine_system, user_prompt_builder=_refine_user, max_tokens=1536),
        FlowStep(name="validate_arc", system_prompt_builder=_validate_system, user_prompt_builder=_validate_user, parser=_validate_parser, quality_gate=_validate_check, max_tokens=2048),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        written = ctx.get_step_result("write_slides") or {}
        slides = written.get("slides", [])
        validate = ctx.get_step_result("validate_arc") or {}
        outline = ctx.get_step_result("slide_outline") or {}

        # Build pipe-delimited headlines for compatibility
        headlines = [s.get("headline", "") for s in slides]
        body = "|".join(headlines)

        return FlowResult(
            content_type="carousel",
            platform="general",
            title=outline.get("theme", "Carousel"),
            body=body,
            hook=headlines[0] if headlines else None,
            cta=headlines[-1] if headlines else None,
            funnel_stage="awareness",
            metadata={
                "workflow_type": "carousel",
                "workflow_version": ctx.workflow_version,
                "steps_completed": steps_done,
                "slides": slides,
                "slide_headlines": headlines,
                "slide_count": len(slides),
                "quality_scores": validate.get("scores", {}),
                "quality_average": validate.get("average"),
                "theme": outline.get("theme"),
            },
            video_style="swiss-carousel",
            video_config={"aspect_ratio": "1:1"},
            steps_completed=steps_done,
            quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed,
            total_llm_calls=total_calls,
        )


FlowRegistry.register(CarouselFlow())
