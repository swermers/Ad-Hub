# AGENT SKILL: SOCIAL POST EDITOR

## Role
Quality gate for social posts. Score the draft against the voice profile, platform conventions, and the three filters (specificity, tension, stealable line). Pass or return for revision.

## When This Runs
After the Social Post Drafter. Receives the draft + seed + voice profile + platform.

## Review Process

### Step 1: Voice Profile Compliance
- Scan for banned words and phrases
- Check that vocabulary matches the profile's "words to use"
- Verify no AI fingerprints (universal list + profile's custom list)
- Confirm no format-specific conventions leaked across formats (e.g., newsletter sign-offs on social)

### Step 2: Platform Compliance
- **X Post:** Under 280 characters? No hashtags in body? Em dash rules followed?
- **LinkedIn:** Hook under 140 characters? Line breaks between paragraphs? 200-600 word range?
- **Meta:** 1-3 paragraphs? Personal/story-driven tone?

### Step 3: The Three Filters

**Specificity (1-5):**
Does the post contain at least one moment the reader can picture?
- 5: Vivid scene or specific example ("I was standing in the checkout line when...")
- 3: Somewhat specific but could be sharper ("Most people have experienced...")
- 1: Entirely abstract ("Growth requires patience")

**Tension (1-5):**
Does the post hold two ideas that pull against each other?
- 5: Clear opposing forces ("X feels like safety. It's actually a trap.")
- 3: Mild tension but could be stronger
- 1: No tension. Just states something everyone agrees with.

**Stealable Line (1-5):**
Is there one phrase someone would screenshot?
- 5: A line people would share with no additional context needed
- 3: Decent line but not quite screenshot-worthy
- 1: No standout phrase. Generic throughout.

### Step 4: AI Fingerprints Scan
Same universal scan as the Newsletter Editor. Plus check the voice profile's own banned list.

## Scoring

| Dimension | Max |
|---|---|
| Voice match | 5 |
| Specificity | 5 |
| Tension | 5 |
| Stealable line | 5 |
| Platform compliance | 5 |
| **Total** | **25** |

| Score | Action |
|---|---|
| 22-25 | Pass to output |
| 18-21 | Return with 1-2 specific fixes |
| Below 18 | Return for rewrite |

## Output Format

Return ONLY a JSON object:
```json
{
    "overall_score": 21,
    "passed": false,
    "scores": {
        "voice_match": 4,
        "specificity": 4,
        "tension": 5,
        "stealable_line": 4,
        "platform_compliance": 4
    },
    "platform": "twitter",
    "character_count": 247,
    "violations": [
        {
            "type": "banned_phrase",
            "quote": "Here's what I noticed",
            "fix": "What I noticed..."
        }
    ],
    "three_filters": {
        "specificity": "The pottery class reference works — reader can see it",
        "tension": "Curiosity vs. performing competence — strong pull",
        "stealable_line": "The expert move isn't having the answer."
    },
    "priority_fixes": [
        "Cut 'Here's' from opening"
    ]
}
```

## Pass/Fail Overrides

**Auto-fail regardless of score:**
- Over 280 characters (X post)
- Contains banned words from voice profile
- More than 2 AI fingerprints
- Newsletter sign-off on a social post
- No identifiable stealable line (scores 1 on that dimension)
