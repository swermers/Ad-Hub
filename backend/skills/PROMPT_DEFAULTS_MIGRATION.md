# PROMPT DEFAULTS — MIGRATION GUIDE
#
# This file shows what changes in prompt_defaults.py to integrate
# the agent skill architecture. The skills replace the current
# thin DEFAULT_* strings with structured, enforceable prompts.
#
# APPROACH: Skills are loaded as text files and injected into system
# prompts. The voice profile overrides DEFAULT_VOICE_RULES when present.

# ─── What Changes ────────────────────────────────────────────────────────────

# BEFORE (current prompt_defaults.py):
#   - DEFAULT_VOICE_RULES: ~25 lines of generic guidance
#   - DEFAULT_IDEA_SHARPENER_PROMPT: ~30 lines
#   - DEFAULT_TEMPLATE_INSTRUCTIONS: dict with ~5 lines per template
#   - DEFAULT_SOCIAL_POST_RULES: ~10 lines
#   - DEFAULT_VIDEO_SCRIPT_RULES: ~6 lines
#   - DEFAULT_X_THREAD_RULES: ~8 lines
#
# AFTER (with agent skills):
#   - Skills loaded from /skills/ directory (or embedded as constants)
#   - Each skill is 100-200 lines of structured, enforceable rules
#   - Voice profile REPLACES default voice rules when present
#   - Editor skills run as a second pass with scoring + pass/fail logic

# ─── File Structure ──────────────────────────────────────────────────────────

# /skills/
#   AGENT_SKILL_ARCHITECTURE.md    — How the system works (reference only)
#   IDEA_SHARPENER_SKILL.md        — Step 1 for all content types
#   NEWSLETTER_DRAFTER_SKILL.md    — Newsletter drafting rules + templates
#   NEWSLETTER_EDITOR_SKILL.md     — Newsletter quality gate + scoring
#   SOCIAL_POST_DRAFTER_SKILL.md   — X/LinkedIn/Meta post rules
#   SOCIAL_POST_EDITOR_SKILL.md    — Post quality gate + three filters
#   X_THREAD_DRAFTER_SKILL.md      — Thread structure + arc patterns
#   VIDEO_CONVERTER_SKILL.md       — Newsletter → video script conversion
#   CONTENT_EDITOR_SKILL.md        — Universal quality gate (threads, video, etc.)

# ─── Loading Skills ──────────────────────────────────────────────────────────

# Option A: Load from files at startup
#
# import os
# SKILLS_DIR = os.path.join(os.path.dirname(__file__), "..", "skills")
#
# def load_skill(name: str) -> str:
#     path = os.path.join(SKILLS_DIR, f"{name}.md")
#     with open(path) as f:
#         return f.read()
#
# IDEA_SHARPENER_SKILL = load_skill("IDEA_SHARPENER_SKILL")
# NEWSLETTER_DRAFTER_SKILL = load_skill("NEWSLETTER_DRAFTER_SKILL")
# etc.

# Option B: Embed as constants (current approach, just much longer)
# This is fine for now. The key change is the CONTENT, not the loading mechanism.

# ─── Key Changes to content_pipeline.py ──────────────────────────────────────

# 1. SYSTEM PROMPT ASSEMBLY ORDER
#
# BEFORE:
#   system_prompt = f"""You are a content strategist and idea sharpener.
#   Product Context:
#   - Name: {product.name}
#   - Brand Voice: {product.brand_voice}
#   {voice_rules}"""
#
# AFTER:
#   system_prompt = f"""
#   {IDEA_SHARPENER_SKILL}
#
#   <voice_profile>
#   {voice_profile_text or DEFAULT_VOICE_RULES}
#   </voice_profile>
#
#   Product Context:
#   - Name: {product.name}
#   - Target Audience: {product.target_audience}
#   """
#
# The skill goes FIRST (defines the agent's role and process).
# The voice profile goes SECOND (defines the constraints).
# Product context goes LAST (supplementary info).

# 2. VOICE PROFILE TAKES PRIORITY
#
# BEFORE: voice_rules = ps.get("voice_rules", DEFAULT_VOICE_RULES)
#         (always uses defaults as base)
#
# AFTER:  voice_profile_text = _get_full_voice_profile(voice_profile_id, db)
#         voice_rules = voice_profile_text if voice_profile_text else DEFAULT_VOICE_RULES
#         (voice profile REPLACES defaults, doesn't supplement them)

# 3. TEMPLATE SELECTION IS A COMMITMENT
#
# BEFORE: Sharpener says "Template D, expandable into A"
#         Drafter picks whatever feels right
#
# AFTER:  Sharpener picks ONE template with rationale
#         Drafter MUST follow that template's exact structure
#         If the template was wrong, the Editor catches it and the Sharpener re-runs

# 4. EDITOR RUNS AS A SECOND PASS
#
# BEFORE: Optional "voice check" step that's generic
#
# AFTER:  Mandatory Editor agent with:
#         - Structured scoring rubric (5 dimensions, each 1-5)
#         - Pass/fail threshold (22/25 to pass)
#         - Auto-fail conditions (banned words, wrong sign-off, 3+ AI fingerprints)
#         - Revision loop (if 18-21, return to Drafter with fix list)
#         - Hard floor (below 15 = error, idea needs resharpening)

# 5. CONTENT-TYPE SPECIFIC SKILLS
#
# BEFORE: One generic function per content type with inline rules
#
# AFTER:  Each content type has a Drafter skill AND an Editor skill
#         The Drafter skill defines structure, quality gates, and failure modes
#         The Editor skill defines scoring, pass/fail, and revision logic

# ─── Migration Steps ─────────────────────────────────────────────────────────

# Step 1: Add skill files to the backend (/skills/ directory)
# Step 2: Update load_prompt_set() to load skills alongside prompt overrides
# Step 3: Update content_pipeline.py to use new prompt assembly order
# Step 4: Update content_workflows.py to inject skills into system prompts
# Step 5: Add Editor pass after each Drafter in the pipeline
# Step 6: Add pass/fail logic with revision loop
# Step 7: Update _get_voice_context() to pass full style_rules text, not flat summary

# ─── Updated DEFAULT_VOICE_RULES ─────────────────────────────────────────────

# This replaces the current thin version. Only used when no voice profile exists.

UPDATED_DEFAULT_VOICE_RULES = """
VOICE RULES (mandatory for all content):

## Identity
You are writing as the content creator. First person. Their voice, not yours.

## Tone
Authentic and conversational, like talking to a smart friend.
Confident but not preachy. Engaging without being over-the-top.
Observational, not prescriptive — notice patterns, don't give orders.

## Writing Style
- Vary sentence length. Short sentences land hard. Let them.
- Be specific over abstract. Concrete details beat vague claims.
- Prefer active voice over passive.
- Use natural punctuation. Avoid excessive exclamation marks.
- Frame struggle as an energy problem, not a character flaw.
- When offering direction, use "might" and "could" over "should" and "must."

## NEVER Use These (AI Fingerprints)

Sentence structures to cut:
- "The truth is..." / "Here's the thing..." / "The reality is..."
- "Not X, but Y" / "Let's be honest..." / "In other words..."
- "It turns out..." / "Think about it..." / "At the end of the day..."
- "What if I told you..." / "Here's why this matters..."
- "Let that sink in" / "Read that again" / "Full stop"
- "This changes everything" / "Here's the part nobody's talking about"

Words to avoid:
- Journey, transform, unlock, navigate, unpack, dive into, lean into, tap into
- Harness, utilize, landscape, realm, robust, cutting-edge, straightforward
- Powerful (vague), incredibly, game-changer, groundbreaking
- Supercharge, future-proof, 10x

Patterns to avoid:
- Staccato lists: "No X. No Y. No Z." (rapid-fire fragments repeating structure 3+ times)
- Negation runway: "Not X. Not Y. [The real thing]." — just state the positive claim
- Generic transitions: "Somewhere along the way..." (fits any article about any topic)
- Engagement bait: "What do you think? Drop a comment!"

## The Meta-Rule
If a phrase could fit in any article about any topic, it's filler. Cut it.
"""

# ─── Updated DEFAULT_TEMPLATE_INSTRUCTIONS ───────────────────────────────────

UPDATED_TEMPLATE_INSTRUCTIONS = {
    "A": """TEMPLATE A: REFLECTIVE ESSAY

OPENING (no header):
- First person. Always. ("I've been noticing lately..." / "I caught myself doing something...")
- Drop into a specific, recognizable micro-moment within 3 sentences
- The moment should be specific and recognizable — something felt, observed, or behavioral

THE METAPHOR:
- Introduce ONE central metaphor
- Bold the metaphor introduction sentence
- Commit to it for the entire piece — no mixing, no competing metaphors
- The metaphor should be concrete (machine, tool, animal, physical object), not abstract

the mechanics (use this EXACT lowercase header):
- Unpack what's actually happening beneath the behavior
- Frame as energy cost, not character flaw
- Use language like: "what this is costing," "the labor of," "a byproduct of"
- No moral judgment. Observation only.

the weight (use this EXACT lowercase header):
- Extend the metaphor into lived experience
- SLOW DOWN here. Let the reader feel the texture.
- Don't rush to resolution. This section earns the closing.

CLOSE:
- 1-2 reflective questions (not directives)
- Sign-off from voice profile (exactly as specified, no additions)""",

    "B": """TEMPLATE B: PRACTICAL GUIDE

HOOK:
- Relatable scenario the audience recognizes ("Have you ever noticed..." / "We've all been there—")

THE INSIGHT:
- One bold, clear statement that reframes the problem
- Bold this line. It should stand alone.

THE FRAMEWORK:
- 3-5 clear, actionable steps
- Each step is concrete and doable, not abstract advice
- Use "Try this:" prompts for each step

CLOSE:
- Encouragement (not moralizing)
- Sign-off from voice profile""",

    "C": """TEMPLATE C: PERSONAL STORY

THE SCENE:
- A specific anecdote. First person, past tense.
- Sensory details — make the reader see it.

THE LESSON:
- Bridge from personal to universal
- Name the pattern others will recognize in their own experience

THE APPLICATION:
- Light touch. Questions over directives.
- Don't over-explain the lesson. Trust the reader.

CLOSE:
- Reflection or sign-off from voice profile""",

    "D": """TEMPLATE D: QUICK HIT

OBSERVATION:
- 2-3 sentences naming a common experience everyone recognizes

REFRAME:
- 2-3 sentences offering a different way to see it

INVITATION:
- 1-2 reflective questions

SIGN-OFF:
- From voice profile

NOTE: Quick Hits are SHORT. 3-5 paragraphs total. If the piece needs more room, the Sharpener should have chosen Template A or C."""
}
