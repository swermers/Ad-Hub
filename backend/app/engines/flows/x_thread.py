"""X Thread Flow — 5-step pipeline for viral tweet threads.

Steps:
  1. Hook Mining     → Find the most provocative angle
  2. Thread Outline  → Plan tweet-by-tweet arc (standalone + connected)
  3. Draft Tweets    → Write each tweet with cliffhanger transitions
  4. Engagement Gate → Scroll-stop tweet 1? Standalone value per tweet?
  5. Polish          → Trim to 280, validate flow, add formatting
"""

import json

from app.engines.flows import (
    ContentFlow, FlowContext, FlowResult, FlowStep, FlowRegistry,
    editor_gate_parser, editor_gate_check,
)


# ─── Step 1: Hook Mining ──────────────────────────────────────────────────

def _hook_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Your current task: find the most provocative opening tweet. The first tweet decides if anyone reads the rest."""

    return f"""You are an X/Twitter thread strategist. You find the most provocative angle to open a thread.

{ctx.product_context}

{ctx.voice_context}

The first tweet decides if anyone reads the rest. It must create an irresistible gap — "I need to know more"."""


def _hook_user(ctx: FlowContext) -> str:
    return f"""Source material:
Seed: {ctx.seed.get('seed', '')}
Heat lines: {json.dumps(ctx.seed.get('heat', []))}
{f"Newsletter excerpt: {ctx.source_text[:800]}" if ctx.draft else ""}

Generate 5 opening tweet candidates. Each must:
- Be under 280 characters
- Create curiosity or challenge a belief
- Make people want to click "Show this thread"
- NOT use "Thread:" or "1/" prefix — just the raw idea

Return ONLY a JSON object:
{{
    "hooks": [
        {{"text": "tweet text", "strategy": "contrarian|story_opener|bold_claim|question|pattern_interrupt"}}
    ],
    "best_index": 0,
    "reasoning": "why this hook is strongest"
}}"""


# ─── Step 2: Thread Outline ──────────────────────────────────────────────

def _outline_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

Your current task: plan the tweet-by-tweet arc. Each tweet must stand alone AND build on the previous."""

    return f"""You are structuring an X thread. Each tweet must stand alone in someone's feed AND build on the previous.

{ctx.voice_context}

{ctx.prompt_set.get("x_thread_rules", "")}

Thread arc: Hook → Context → Insight → Evidence/Example → Deeper implication → Close"""


def _outline_user(ctx: FlowContext) -> str:
    hook_result = ctx.get_step_result("hook_mining") or {}
    hooks = hook_result.get("hooks", [])
    best_idx = hook_result.get("best_index", 0)
    best_hook = hooks[best_idx]["text"] if hooks else ctx.seed.get("seed", "")

    return f"""Opening tweet: {best_hook}

Plan a 6-8 tweet thread. For each tweet, describe:
- What it covers (one idea per tweet)
- How it connects to the previous tweet (the "bridge")
- Why someone would keep reading (the "pull")

Return ONLY a JSON object:
{{
    "tweet_count": 7,
    "outline": [
        {{
            "position": 1,
            "role": "hook",
            "covers": "the provocative opening",
            "bridge": "n/a — this is the start",
            "pull": "creates gap: 'what does this mean?'"
        }},
        {{
            "position": 2,
            "role": "context",
            "covers": "...",
            "bridge": "...",
            "pull": "..."
        }}
    ]
}}"""


# ─── Step 3: Draft Tweets ────────────────────────────────────────────────

def _draft_system(ctx: FlowContext) -> str:
    if ctx.drafter_skill:
        return f"""{ctx.drafter_skill}

{ctx.voice_context}

{ctx.product_context}

Your current task: write the full thread following the outline. Each tweet under 280 characters."""

    return f"""You are writing an X/Twitter thread. Each tweet under 280 characters. No hashtags. No emojis.

{ctx.voice_context}

{ctx.prompt_set.get("voice_rules", "")}

{ctx.prompt_set.get("x_thread_rules", "")}

THREAD WRITING RULES:
- Vary sentence length. Mix punchy one-liners with slightly longer tweets.
- Use line breaks within tweets for visual rhythm.
- Each tweet should make sense if someone only sees THAT tweet in their feed.
- End tweets with subtle hooks that pull to the next one.
- NO "Thread:" prefix. NO tweet numbering. NO emojis. NO hashtags in body."""


def _draft_user(ctx: FlowContext) -> str:
    outline = ctx.get_step_result("thread_outline") or {}
    hook_result = ctx.get_step_result("hook_mining") or {}
    hooks = hook_result.get("hooks", [])
    best_idx = hook_result.get("best_index", 0)
    best_hook = hooks[best_idx]["text"] if hooks else ""

    outline_text = json.dumps(outline.get("outline", []), indent=2)

    return f"""Write the full thread following this outline:

Opening tweet (use this exactly or improve it): {best_hook}

Outline:
{outline_text}

Return ONLY a JSON object:
{{
    "tweets": ["tweet 1 text", "tweet 2 text", "..."],
    "tweet_count": 7
}}"""


# ─── Step 4: Engagement Gate ─────────────────────────────────────────────

def _gate_system(ctx: FlowContext) -> str:
    if ctx.editor_skill:
        return f"""{ctx.editor_skill}

{ctx.voice_context}

Content type: X Thread
Your current task: evaluate this thread against voice profile and quality gates."""

    return f"""You are an X/Twitter engagement expert. Evaluate this thread ruthlessly.

{ctx.voice_context}"""


def _gate_user(ctx: FlowContext) -> str:
    draft = ctx.get_step_result("draft_tweets") or {}
    tweets = draft.get("tweets", [])
    thread_text = "\n\n---\n\n".join([f"Tweet {i+1} ({len(t)} chars): {t}" for i, t in enumerate(tweets)])

    return f"""Review this X thread:

{thread_text}

Seed: {ctx.seed.get('seed', '')}
Audience hook: {ctx.seed.get('audience_hook', '')}

Score each dimension 1-5. Pass threshold: 22/25.

| Dimension | What You're Measuring |
|---|---|
| Voice match | Does this sound like the creator? |
| Format compliance | Every tweet under 280? No numbering/hashtags? Varied length? |
| Coherence | Clear arc from hook to close? Each tweet earns the next? |
| Quality | Tweet 1 standalone? Each tweet quotable? Close drives engagement? |
| AI-free | No AI fingerprints? No "Here's the thing" / "Let that sink in"? |

Auto-fail conditions:
- Any tweet over 280 characters
- "Thread:" or "1/" prefixes
- Tweet 1 opens with "I've been thinking..." (newsletter energy)
- 3+ AI fingerprints across the thread
- No clear arc (just disconnected takes)

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
    "over_limit_tweets": [],
    "filler_tweets": [],
    "violations": [],
    "ai_fingerprints": [],
    "priority_fixes": [],
    "strongest_moments": [],
    "notes": ""
}}"""


# ─── Step 5: Polish ─────────────────────────────────────────────────────

def _polish_system(ctx: FlowContext) -> str:
    if ctx.editor_skill:
        return f"""{ctx.editor_skill}

{ctx.voice_context}

Content type: X Thread
Your current task: final polish pass. Trim, tighten, format. Every tweet under 280 chars."""

    return f"""You are doing final polish on an X thread. Trim, tighten, format.

{ctx.voice_context}"""


def _polish_user(ctx: FlowContext) -> str:
    draft = ctx.get_step_result("draft_tweets") or {}
    tweets = draft.get("tweets", [])
    tweets_json = json.dumps(tweets)

    return f"""Final polish pass on this thread:

{tweets_json}

For each tweet:
1. Ensure it's under 280 characters (trim if needed, don't lose meaning)
2. Add line breaks for visual rhythm where helpful
3. Ensure no tweet starts with the same word as the previous one
4. Check the last tweet ends with engagement (question, invitation)

Return ONLY a JSON object:
{{
    "tweets": ["polished tweet 1", "polished tweet 2", "..."],
    "changes_made": ["what you changed and why"]
}}"""


# ─── Assemble Flow ─────────────────────────────────────────────────────────

class XThreadFlow(ContentFlow):
    flow_type = "x_thread"
    platform = "twitter"
    steps = [
        FlowStep(name="hook_mining", system_prompt_builder=_hook_system, user_prompt_builder=_hook_user, max_tokens=1024),
        FlowStep(name="thread_outline", system_prompt_builder=_outline_system, user_prompt_builder=_outline_user, max_tokens=1536),
        FlowStep(name="draft_tweets", system_prompt_builder=_draft_system, user_prompt_builder=_draft_user, max_tokens=2048, premium=True),
        FlowStep(name="engagement_gate", system_prompt_builder=_gate_system, user_prompt_builder=_gate_user, parser=editor_gate_parser, quality_gate=editor_gate_check, max_tokens=2048, premium=True),
        FlowStep(name="polish", system_prompt_builder=_polish_system, user_prompt_builder=_polish_user, max_tokens=1536),
    ]

    def build_result(self, ctx, steps_done, gates_passed, gates_failed, total_calls):
        polished = ctx.get_step_result("polish") or {}
        tweets = polished.get("tweets") or (ctx.get_step_result("draft_tweets") or {}).get("tweets", [])
        gate = ctx.get_step_result("engagement_gate") or {}

        # Enforce 280 char limit
        tweets = [t[:280] for t in tweets]

        body = "\n\n".join(tweets)

        return FlowResult(
            content_type="social_post",
            platform="twitter",
            title=f"Thread: {tweets[0][:50]}..." if tweets else "X Thread",
            body=body,
            hook=tweets[0] if tweets else None,
            cta=tweets[-1] if tweets else None,
            funnel_stage="awareness",
            metadata={
                "workflow_type": "x_thread",
                "workflow_version": ctx.workflow_version,
                "steps_completed": steps_done,
                "tweets": tweets,
                "tweet_count": len(tweets),
                "editor_score": gate.get("overall_score"),
                "editor_scores": gate.get("scores", {}),
                "editor_passed": gate.get("passed", False),
                "hook_strategy": (ctx.get_step_result("hook_mining") or {}).get("reasoning"),
            },
            steps_completed=steps_done,
            quality_gates_passed=gates_passed,
            quality_gates_failed=gates_failed,
            total_llm_calls=total_calls,
        )


FlowRegistry.register(XThreadFlow())
