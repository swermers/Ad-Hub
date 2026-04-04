# Voice Profile Builder — Implementation Spec

## Overview

A guided, scored voice profile builder that walks users through defining their brand voice in 6 structured sections. Live quality scoring shows profile completeness. Works for personal brands AND product brands. Serves double duty as in-app onboarding and standalone lead capture tool.

**Goal:** Every user who generates content through Iterant has a voice profile strong enough to produce <1% error output. The builder makes that achievable without requiring the user to know what a "good" voice profile looks like.

---

## Two Deployment Modes

### Mode 1: In-App Onboarding (Primary)
- Lives at `/voice-profiles/new` or replaces the current voice profile creation flow
- Appears as Step 4 in the existing GettingStarted onboarding checklist
- User must be authenticated
- On completion, saves directly to the `voice_profiles` table via `POST /api/voice-profiles/`
- Profile quality score persists and displays on the profile card in the UI
- Content generation shows a quality warning if the active voice profile scores below 70%

### Mode 2: Standalone Lead Capture (Future)
- Lives at a public URL (e.g., `/voice` or separate subdomain)
- No authentication required
- On completion, user can export as `.md` file (free) or create an account to save + use it
- CTA after export: "Upload this profile to Iterant and generate a week of content"
- Captures email if user wants to save their progress

---

## The 6 Sections

Each section maps to existing `VoiceProfile` model fields. The builder provides guided prompts, examples, and tips to help users fill in each area with enough detail for the AI pipeline to match their voice.

### Section 1: Identity
**Prompt:** "Tell us who you are in 2-3 sentences. What do you do? Who do you help? What's your positioning?"
**Maps to:** `name`, `description`
**Tip:** "Be specific. 'Marketing consultant' is a role. 'I help B2B founders stop sounding like every other SaaS company' is an identity."
**Context switch (product mode):** "Describe the product or brand. What does it do? Who is it for? What's its positioning in the market?"

### Section 2: Tone & Stance
**Prompt:** "Pick 3-5 words that describe your voice when you're writing at your best. Then describe how you relate to your audience."
**Maps to:** `tone_keywords`, `sentence_style`
**Tip:** "Think about HOW you say things, not WHAT you say. Are you direct or gentle? Do you use humor? Are you formal or conversational?"
**Context switch (product mode):** "How does this brand communicate? What's the relationship with the customer — peer, authority, friend, advisor?"

### Section 3: Vocabulary Rules
**Prompt:** "List words and phrases you naturally use, and words you'd never say."
**Maps to:** `words_to_use`, `words_to_avoid`
**Tip:** "The 'avoid' list matters more than the 'use' list. Banning AI-coded words is the single fastest way to make AI output sound human."
**AI assist opportunity:** Pre-populate the "avoid" list with common AI-coded words (journey, transform, unlock, etc.) and let the user confirm or edit. This jumpstarts the most impactful section.

### Section 4: Structural Preferences
**Prompt:** "Describe how you typically open and close pieces. Do you have a sign-off? Header conventions? Formatting preferences?"
**Maps to:** `style_rules` (partial), `favorite_phrases`
**Tip:** "Sign-offs, opening patterns, and header styles are the conventions AI gets wrong most often. Be explicit here."
**Context switch (product mode):** "Does this brand have standard closings, CTAs, or formatting conventions? Any brand guidelines for content structure?"

### Section 5: Writing Samples
**Prompt:** "Paste 2-3 paragraphs of your best writing. This is what the AI will match against."
**Maps to:** `writing_samples`
**Tip:** "Samples are the most powerful input. The more the model can see what you actually sound like, the better it matches. Quality over quantity — your best work, not your most recent."
**AI assist opportunity:** After user pastes samples, run a Claude call to extract tone descriptors, sentence patterns, and vocabulary automatically. Pre-fill Sections 2 and 3 based on the analysis. The user then confirms or adjusts. This is the "bot doing it for them" path.

### Section 6: Anti-Patterns
**Prompt:** "Describe what makes content feel 'off' for your brand. What patterns should AI never produce in your voice?"
**Maps to:** `words_to_avoid` (extended), `style_rules` (partial)
**Tip:** "This is your safety net. Every pattern you name here becomes a hard constraint the AI checks against before outputting anything."
**AI assist opportunity:** Show common AI anti-patterns as checkboxes. User checks the ones they hate. Faster than writing them out.

---

## Scoring System

### Per-Section Scoring (0-5 each, 30 total)

| Score | Criteria |
|---|---|
| 0 | Empty |
| 1 | Present but minimal (<30 chars) |
| 2 | Basic detail (30-80 chars) |
| 3 | Moderate detail (80-200 chars) |
| 4 | Good detail (200-400 chars) |
| 5 | Comprehensive (400+ chars with section-specific quality signals) |

### Section-Specific Quality Bonuses

- **Vocabulary Rules:** Bonus point if BOTH "use" and "avoid" lists are present
- **Writing Samples:** Bonus point if samples exceed 100 words
- **Anti-Patterns:** Bonus point if specific banned patterns are named (not just vague preferences)

### Overall Grades

| Percentage | Grade | Meaning |
|---|---|---|
| 90-100% | Production Ready | Profile has enough detail for <1% error output |
| 70-89% | Strong Foundation | Good coverage, output will be strong with occasional voice drift |
| 50-69% | Getting There | Basics covered but output will feel generic in spots |
| 30-49% | Needs Work | Not enough detail for reliable voice matching |
| 0-29% | Just Started | Fill in sections to build the profile |

### Score Persistence

- Store `quality_score` as a computed field on the `VoiceProfile` model (integer, 0-100)
- Recalculate on every profile update
- Display on profile cards in the voice profile list view
- Use in content generation warnings (see below)

---

## Content Generation Integration

### Quality Warnings

When a user triggers content generation and their active voice profile scores below 70%:

```
⚠ Your voice profile covers {score}% of the recommended areas.
Output quality improves significantly with a stronger profile.
[Strengthen Profile] [Generate Anyway]
```

When below 50%:

```
⚠ Your voice profile needs more detail for reliable voice matching.
We recommend adding {missing_sections} before generating.
[Strengthen Profile] [Generate Anyway]
```

### Profile Quality in Pipeline

The quality score should be passed to the content pipeline so agent skills can adjust behavior:

- **90-100%:** Full enforcement. Voice profile is the dominant constraint.
- **70-89%:** Full enforcement with softer quality gates (Editor pass threshold drops from 22 to 20).
- **50-69%:** Voice profile used as guidance, but generic defaults supplement gaps.
- **Below 50%:** Primarily generic defaults with voice profile as light seasoning. Output includes a metadata flag: `"voice_confidence": "low"`.

---

## AI-Assisted Profile Building

### Writing Sample Analysis (Priority Feature)

When a user pastes writing samples in Section 5, offer an "Analyze my writing" button that:

1. Sends samples to Claude with this prompt:

```
Analyze these writing samples and extract:
1. Tone descriptors (3-5 adjectives)
2. Sentence style (short_punchy, long_flowing, mixed, varied)
3. Vocabulary patterns (words/phrases used repeatedly)
4. Structural patterns (how pieces open, close, transition)
5. Anti-patterns (what this writer would likely never say based on their style)

Return ONLY JSON:
{
    "tone_keywords": ["warm", "observational", "direct"],
    "sentence_style": "mixed",
    "words_to_use": ["notice", "pattern", "weight"],
    "structural_observations": "Opens in first person. Closes with reflective questions.",
    "likely_anti_patterns": ["Never uses 'journey' or 'transform'. Avoids exclamation marks."]
}
```

2. Pre-fills Sections 2, 3, and 6 with the extracted data
3. User reviews and edits before confirming
4. Score updates reflect the AI-assisted content

This is the "bot does it for them" path. A user with good writing samples can get to 70%+ profile quality in under 2 minutes.

### Anti-Pattern Checklist (Quick Win)

Instead of a blank textarea for Section 6, show a checklist of common AI anti-patterns:

```
Common AI patterns to ban:
☐ "The truth is..." / "Here's the thing..."
☐ "Not X, but Y" structures
☐ "Let that sink in" / "Read that again"
☐ Journey, transform, unlock, navigate
☐ Staccato lists ("No X. No Y. No Z.")
☐ "What if I told you..."
☐ Forced engagement CTAs ("What do you think? Drop a comment!")
☐ Em dashes (in social posts)

Custom anti-patterns:
[textarea for additional patterns]
```

Checked items get added to `words_to_avoid` and `style_rules`. This is faster than expecting users to articulate patterns they dislike from scratch.

---

## Product Brand vs. Personal Brand

The builder adapts prompts based on context:

### Detection
- If the user navigates from a product page → product brand mode
- If the user navigates from voice profiles page → personal brand mode
- Toggle available at the top: "I'm building a voice for: [My personal brand] [A product/company]"

### Prompt Adaptations

| Section | Personal Brand | Product Brand |
|---|---|---|
| Identity | "Who are you? What do you do?" | "What is this product? Who is it for?" |
| Tone | "How do you sound?" | "How does this brand communicate?" |
| Vocabulary | "Words you use/avoid" | "Brand vocabulary / banned terms" |
| Structure | "Your opening/closing patterns" | "Brand content conventions" |
| Samples | "Your best writing" | "Best brand content examples" |
| Anti-Patterns | "What feels off for you?" | "What's off-brand?" |

### Data Model
- Personal brand: `VoiceProfile` with `product_id = null`
- Product brand: `VoiceProfile` with `product_id = {product.id}`
- Resolution order in pipeline: explicit profile > product profile > user default (already implemented in `_get_voice_context()`)

---

## Database Changes

### Add to VoiceProfile model

```python
# New field
quality_score: Mapped[int] = mapped_column(Integer, default=0)  # 0-100, computed
```

### Score Computation

```python
def compute_voice_profile_score(profile: VoiceProfile) -> int:
    """Compute quality score (0-100) for a voice profile."""
    scores = {}

    # Section 1: Identity (name + description)
    identity_text = f"{profile.name or ''} {profile.description or ''}".strip()
    scores['identity'] = _score_text(identity_text)

    # Section 2: Tone (tone_keywords + sentence_style)
    tone_text = ""
    if profile.tone_keywords:
        try:
            keywords = json.loads(profile.tone_keywords)
            tone_text = " ".join(keywords)
        except: pass
    if profile.sentence_style:
        tone_text += f" {profile.sentence_style}"
    scores['tone'] = _score_text(tone_text)

    # Section 3: Vocabulary (words_to_use + words_to_avoid)
    vocab_text = ""
    for field in (profile.words_to_use, profile.words_to_avoid):
        if field:
            try:
                words = json.loads(field)
                vocab_text += " ".join(words) + " "
            except: pass
    has_both = bool(profile.words_to_use) and bool(profile.words_to_avoid)
    scores['vocabulary'] = min(_score_text(vocab_text) + (1 if has_both else 0), 5)

    # Section 4: Structure (style_rules + favorite_phrases)
    struct_text = profile.style_rules or ""
    if profile.favorite_phrases:
        try:
            phrases = json.loads(profile.favorite_phrases)
            struct_text += " " + " ".join(phrases)
        except: pass
    scores['structure'] = _score_text(struct_text)

    # Section 5: Writing Samples
    samples_text = ""
    if profile.writing_samples:
        try:
            samples = json.loads(profile.writing_samples)
            samples_text = " ".join(samples)
        except: pass
    word_count = len(samples_text.split())
    scores['samples'] = min(_score_text(samples_text) + (1 if word_count > 100 else 0), 5)

    # Section 6: Anti-Patterns (from words_to_avoid + style_rules anti-pattern sections)
    anti_text = ""
    if profile.words_to_avoid:
        try:
            avoid = json.loads(profile.words_to_avoid)
            anti_text = " ".join(avoid)
        except: pass
    if profile.style_rules and "never" in (profile.style_rules or "").lower():
        anti_text += " " + profile.style_rules
    scores['antipatterns'] = _score_text(anti_text)

    total = sum(scores.values())
    return round((total / 30) * 100)


def _score_text(text: str) -> int:
    length = len(text.strip())
    if length == 0: return 0
    if length < 30: return 1
    if length < 80: return 2
    if length < 200: return 3
    if length < 400: return 4
    return 5
```

### Auto-Compute on Save

In `voice_profiles.py` router, after any create or update:

```python
profile.quality_score = compute_voice_profile_score(profile)
db.commit()
```

---

## API Changes

### New Endpoint: Score Preview

```
POST /api/voice-profiles/score-preview
Body: { sections data (same as VoiceProfileCreate) }
Returns: { scores: {per_section}, total: int, percentage: int, grade: str, missing: [str] }
```

This lets the frontend show live scoring without saving to the database. Used during the builder flow.

### New Endpoint: AI Analysis

```
POST /api/voice-profiles/analyze-samples
Body: { writing_samples: ["sample 1 text", "sample 2 text"] }
Returns: {
    tone_keywords: ["warm", "direct"],
    sentence_style: "mixed",
    words_to_use: ["notice", "pattern"],
    structural_observations: "Opens in first person...",
    likely_anti_patterns: ["Avoids 'journey', 'transform'..."]
}
```

Calls Claude to analyze writing samples and extract voice profile fields. Used by the "Analyze my writing" button in Section 5.

### Modified Endpoint: Voice Profile Response

Add `quality_score` to all voice profile responses:

```json
{
    "id": "...",
    "name": "Trail Notes",
    "quality_score": 87,
    "quality_grade": "Strong Foundation",
    ...
}
```

---

## Frontend Components

### VoiceProfileBuilder (New Page Component)

**Location:** `frontend/src/app/voice-profiles/builder/page.tsx`

**Props/State:**
- `mode`: "personal" | "product"
- `productId`: string | null (if product mode)
- `activeSection`: 0-5 (which section is currently active)
- `data`: object with all 6 section values
- `scores`: computed per-section scores
- `isAnalyzing`: boolean (loading state for AI analysis)

**Key behaviors:**
- Sections displayed as a stepped flow (not tabs) with navigation dots showing completion status
- Live score meter updates as user types (debounced, client-side computation)
- "Analyze my writing" button appears in Section 5 after 50+ words pasted
- Anti-patterns section includes a checklist of common AI patterns plus a custom textarea
- "Export as Markdown" button (always available) downloads the profile as `.md`
- "Save Profile" button (authenticated users) saves to DB via API
- If coming from product context, pre-selects product mode and associates the profile

### VoiceProfileCard (Modified Existing Component)

Add quality score badge to voice profile cards in list view:

```
[Profile Name]                    [87% — Strong Foundation]
[Description]                     [●●●●○ — 4/5 sections complete]
```

### ContentGenerationWarning (New Component)

Inline warning that appears in Studio when active profile scores below 70%. Shows which sections need strengthening with direct links to the builder.

---

## File Inventory for Implementation

### New Files
```
frontend/src/app/voice-profiles/builder/page.tsx    — Main builder page
frontend/src/components/VoiceScoreMeter.tsx          — Circular score visualization
frontend/src/components/ContentGenerationWarning.tsx  — Quality warning for Studio
backend/app/engines/voice_scoring.py                 — Score computation logic
backend/app/engines/voice_analyzer.py                — AI writing sample analysis
```

### Modified Files
```
backend/app/models/voice_profile.py                  — Add quality_score field
backend/app/routers/voice_profiles.py                — Add score-preview, analyze-samples endpoints
                                                       Auto-compute score on create/update
backend/app/routers/content_pipeline.py              — Pass quality_score to pipeline context
frontend/src/app/studio/components/StudioParameters.tsx — Show quality warning
frontend/src/components/GettingStarted.tsx            — Link Step 4 to builder
```

### Agent Skill Files (from previous deliverable — add to backend)
```
backend/skills/AGENT_SKILL_ARCHITECTURE.md
backend/skills/IDEA_SHARPENER_SKILL.md
backend/skills/NEWSLETTER_DRAFTER_SKILL.md
backend/skills/NEWSLETTER_EDITOR_SKILL.md
backend/skills/SOCIAL_POST_DRAFTER_SKILL.md
backend/skills/SOCIAL_POST_EDITOR_SKILL.md
backend/skills/LINKEDIN_POST_DRAFTER_SKILL.md
backend/skills/X_THREAD_DRAFTER_SKILL.md
backend/skills/CAROUSEL_DRAFTER_SKILL.md
backend/skills/STORY_REEL_DRAFTER_SKILL.md
backend/skills/VIDEO_CONVERTER_SKILL.md
backend/skills/EMAIL_DRAFTER_SKILL.md
backend/skills/CONTENT_EDITOR_SKILL.md
backend/skills/PIPELINE_MAP.md
backend/skills/PROMPT_DEFAULTS_MIGRATION.md
```

---

## Implementation Priority

### Phase 1: Core Builder (Ship First)
1. VoiceProfileBuilder page with 6 guided sections
2. Client-side scoring (no API needed for score preview)
3. Save to DB with quality_score field
4. Quality score display on profile cards
5. "Export as Markdown" download

### Phase 2: AI Assist
6. Writing sample analysis endpoint
7. Auto-fill from sample analysis
8. Anti-pattern checklist with common AI patterns

### Phase 3: Pipeline Integration
9. Quality warning in Studio
10. Score-aware quality gates in content pipeline
11. Agent skill files integrated into prompt assembly

### Phase 4: Lead Capture (Separate Deploy)
12. Public-facing builder (no auth required)
13. Email capture on export
14. CTA to Iterant trial after export
