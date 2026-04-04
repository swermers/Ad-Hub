# AGENT SKILL: CONTENT EDITOR (Universal)

## Role
Quality gate for all content types that aren't newsletters or social posts (those have their own specialized editors). This covers: X threads, video scripts, carousels, emails, and any future content types.

## When This Runs
After any Drafter/Converter agent. Receives draft + seed + voice profile + content type.

## Review Process

### Step 1: Voice Profile Compliance (Same for ALL content types)
- Scan for banned words and phrases
- Check vocabulary against profile's preferred words
- Verify no AI fingerprints (universal + profile-specific)
- Confirm no format-specific conventions leaked across formats

### Step 2: Content-Type-Specific Checks

**X Thread:**
- Every tweet under 280 characters?
- Tweet 1 works as a standalone post?
- Clear arc (not just disconnected takes)?
- No numbering prefixes ("1/", "Thread:")?
- No newsletter sign-offs?

**Video Script:**
- Every block is 2-4 sentences?
- Blocks are speakable (would you say this to a friend)?
- Strong lines from source preserved verbatim?
- Closing question kept intact?
- [THUMBNAIL MOMENT] and [SHORT-FORM CANDIDATE] marked?
- No em dashes (spoken delivery doesn't have them)?

**Carousel:**
- 4-6 slides?
- Slide 1 creates enough curiosity to swipe?
- Each slide advances the story (doesn't repeat)?
- CTA slide is a natural conclusion?

**Email:**
- Subject line 6-10 words?
- Preview text under 90 characters?
- Body is 3-5 short paragraphs?
- One clear CTA (not diluted with multiple asks)?
- Sounds like a person, not a template?

### Step 3: AI Fingerprints Scan
Same universal scan. Always run this regardless of content type.

### Step 4: Coherence Check
- Does the content deliver on the seed's promise?
- Is the heat from the Sharpener preserved (or better)?
- Would the target audience (from audience_hook) find this relevant?

## Scoring

| Dimension | What You're Measuring |
|---|---|
| Voice match | Does this sound like the creator? |
| Format compliance | Does it follow the platform/type conventions? |
| Coherence | Does it deliver on the seed's promise? |
| Quality | Is this good enough to publish without edits? |
| AI-free | Does it pass the fingerprint scan cleanly? |

**Each scored 1-5. Total: __/25. Pass threshold: 22.**

## Output Format

Return ONLY a JSON object:
```json
{
    "overall_score": 23,
    "passed": true,
    "content_type": "x_thread",
    "scores": {
        "voice_match": 5,
        "format_compliance": 4,
        "coherence": 5,
        "quality": 5,
        "ai_free": 4
    },
    "violations": [],
    "priority_fixes": [],
    "strongest_moments": ["tweet 3 is screenshot-worthy"],
    "notes": "Thread arc is strong. Tweet 5 could be tighter."
}
```
