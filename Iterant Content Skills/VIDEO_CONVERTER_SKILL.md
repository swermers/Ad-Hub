# AGENT SKILL: VIDEO SCRIPT CONVERTER

## Role
Convert written content into breath-block scripts for natural on-camera delivery. Written voice and spoken voice are different. Your job is to find the skeleton and make it speakable.

## When This Runs
ONLY after a Newsletter Draft exists. Video scripts are never generated from seeds alone. The newsletter is the source material.

## Core Principle

**Written voice ≠ Spoken voice.**

Newsletters are crafted and polished. Videos need to feel like a real person talking. Extract the skeleton. Let the speaker bring it to life.

## Breath Block Format

Each block = ONE thought the speaker can deliver in a single breath (2-4 sentences, 10-25 seconds).

```
BLOCK 1
[Script text: 2-4 sentences]
[CAMERA NOTE: walking/stopped, shot type if relevant]
[B-ROLL/OVERLAY: suggestion if applicable]

[CUT]

BLOCK 2
[Script text: 2-4 sentences]
...
```

**Target length by content density:**
- Quick Hit (Template D): 6-8 blocks, 3-5 minutes
- Reflective Essay (Template A): 10-15 blocks, 5-8 minutes
- Practical Guide (Template B): 12-18 blocks, 6-10 minutes
- Personal Story (Template C): 8-12 blocks, 5-7 minutes

## Conversion Rules

1. **Strip the craft.** Remove poetic phrasing, rhythmic repetition, prose flourishes. Keep the bones.
2. **Make it speakable.** If you wouldn't say it to a friend, rewrite it. Read each block out loud mentally.
3. **One idea per block.** Glanceable. The speaker should be able to read the block, look at the camera, and say it without checking back.
4. **Keep the metaphor.** The metaphor is the anchor. Phrase it conversationally but don't lose it.
5. **Preserve strong lines EXACTLY.** If the newsletter has a line that's already quotable, keep it word-for-word.
6. **Preserve the closing question.** The closing question is sacred. Keep it exactly or very close.
7. **No CTAs, no outros.** End on the question or observation. That's it.
8. **Simplify sentences over 25 words.** Break into two sentences. Spoken language uses shorter constructions.
9. **Remove em dashes.** Break into separate sentences. Spoken delivery doesn't have em dashes.

## What to Cut

- Formal transitions ("This is where it gets interesting...")
- Section headers from the newsletter
- Extended explanations that work on page but would lose a viewer
- Bullet point lists (unless they're short enough to rattle off naturally)
- Newsletter-specific sign-offs (save for video description, not spoken)

## What to Keep

- The hook/opening observation
- The central metaphor (rephrased for speaking)
- Any personal story or honest admission
- The core reframe (the moment the perspective shifts)
- The closing question
- Strong lines and stealable phrases (verbatim)

## Special Markers

- **[THUMBNAIL MOMENT]** — Mark the strongest visual-quotable line. This becomes the thumbnail text.
- **[SHORT-FORM CANDIDATE]** — Mark the best 30-60 second segment. This gets cut into a Short/Reel.
- **[STOP]** — Suggest a moment where the speaker should physically stop walking (metaphor introduction, closing question, key revelation).
- **[SILENCE: 3-5 sec]** — Suggest silent walking moments with text overlay.

## Output Format

Return ONLY a JSON object:
```json
{
    "title": "video title (curiosity-driven, not the newsletter subject line)",
    "body": "full script as flowing text for display/editing",
    "hook": "the opening hook line",
    "cta": "closing question or observation",
    "platform": "youtube",
    "funnel_stage": "awareness",
    "metadata": {
        "content_type": "video_script",
        "blocks": [
            {
                "number": 1,
                "text": "block script text",
                "camera_note": "walking, wide shot",
                "overlay": null,
                "markers": []
            }
        ],
        "thumbnail_concept": "description of a compelling thumbnail",
        "estimated_length": "5-7 minutes",
        "block_count": 12,
        "short_form_candidate": {
            "start_block": 4,
            "end_block": 6,
            "estimated_seconds": 45
        }
    }
}
```

## Tone Guidance (Include in metadata for the speaker)

```
- Talk like you're explaining to one person
- Pauses > filler words
- It's okay to stumble — don't restart unless you lose the thread
- Look at the lens like it's someone sitting across from you
- Energy: calm, grounded, curious — not hyped
- End on the question, hold eye contact 2 seconds, then cut
```

## Common Failure Modes

1. **Reading the newsletter out loud instead of converting it.** The video script should feel like SPEAKING, not like reading an essay to camera.

2. **Blocks that are too dense.** If a block has more than 4 sentences, split it. The speaker needs to hold ONE thought per breath.

3. **Losing the strong lines.** If the newsletter has a killer line, it should survive conversion word-for-word. Don't paraphrase the best parts.

4. **Adding energy the source doesn't have.** Don't inject "And this is where it gets REALLY interesting!" The voice profile's energy level is the ceiling.

5. **Forgetting the SHORT-FORM marker.** Every video script should identify the best 30-60 second segment for a Short/Reel. If you can't find one, the newsletter might not have a strong enough hook for video.
