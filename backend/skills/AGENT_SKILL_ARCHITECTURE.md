# ITERANT AGENT SKILL ARCHITECTURE

## How This Works

Every content type in Iterant follows a multi-agent pipeline. Each agent has ONE job and passes structured output to the next. The voice profile is the dominant constraint — it overrides generic defaults at every stage.

```
IDEA → SHARPENER → DRAFTER → EDITOR → OUTPUT
                      ↓          ↓
               (type-specific) (type-specific)
                      ↓          ↓
              Voice profile enforced at both stages
```

## The Three Layers

### Layer 1: Voice Profile (User-Provided)
The voice profile is the source of truth. It defines:
- How the creator sounds (tone, vocabulary, sentence style)
- What they never say (banned words, phrases, patterns)
- What they always use (signature language, structural preferences)
- Writing samples that demonstrate the voice

**The voice profile is NOT supplementary context. It is the primary constraint.**

### Layer 2: Content Type Skill (System-Provided)
Each content type has its own agent skill that defines:
- Structural requirements (format, length, sections)
- Quality gates (what must be true before output passes)
- Platform conventions (character limits, formatting rules)
- Adaptation rules (how the voice flexes for the platform)

### Layer 3: Generic Defaults (Fallback Only)
Generic voice rules and templates exist ONLY for users who haven't uploaded a voice profile. The moment a voice profile exists, it replaces — not supplements — the generic defaults.

## Prompt Assembly Order

When building a system prompt for any agent, assemble in this order:

```
1. ROLE DEFINITION (what this agent does)
2. VOICE PROFILE (full text — this is the dominant constraint)
3. CONTENT TYPE SKILL (structural rules for this format)
4. QUALITY GATES (what must be true before output passes)
5. OUTPUT FORMAT (exact JSON structure expected)
```

The voice profile goes BEFORE the content type skill because the model weights earlier instructions more heavily. Voice consistency matters more than structural perfection.

## The Pipeline Per Content Type

### Newsletter
```
Idea Sharpener → Newsletter Drafter → Newsletter Editor → Output
```

### Social Post (X, LinkedIn, Meta)
```
Idea Sharpener → Post Drafter (platform-specific) → Post Editor → Output
```

### X Thread
```
Idea Sharpener → Thread Drafter → Thread Editor → Output
```

### Video Script
```
Newsletter Draft → Video Converter → Video Editor → Output
(requires newsletter as source — never generated from seed alone)
```

### Carousel
```
Idea Sharpener → Carousel Drafter → Carousel Editor → Output
```

### Email
```
Newsletter Draft → Email Adapter → Email Editor → Output
(requires newsletter as source)
```

## Voice Profile Integration

### How voice profiles feed into prompts

The `_get_voice_context()` function currently builds a flat string from structured fields. This is lossy — it strips the voice profile's structure and reduces it to labels.

**Better approach:** Pass the voice profile's `style_rules` field (which contains the full markdown guide) as a block within the system prompt, wrapped in clear delimiters:

```
<voice_profile>
{profile.style_rules}
</voice_profile>
```

If the user uploaded a markdown voice guide (like Trail Notes did), `style_rules` should contain the FULL guide text, not a summary. The structured fields (tone_keywords, words_to_avoid, etc.) serve as quick-reference metadata for the UI — the `style_rules` field is what the model actually reads.

### Voice Profile Minimum Requirements

For the pipeline to produce <1% error output, the voice profile MUST include:

1. **Identity** — Who is this person? What do they do?
2. **Tone** — How do they sound? (warm, direct, clinical, playful, etc.)
3. **Vocabulary rules** — Words to use, words to avoid, banned phrases
4. **Structural preferences** — How they organize content (templates, sections, sign-offs)
5. **Writing samples** — At least 2-3 paragraphs showing the voice in action
6. **Anti-patterns** — What does BAD output for this voice look like?

If any of these are missing, the pipeline should flag it during profile setup — not silently produce generic output.

## Evolution Over Time

Voice profiles should evolve as the user refines their voice. Two mechanisms:

1. **User edits:** Direct updates to the voice profile through the UI or API
2. **Editor feedback loop:** When the Editor agent flags recurring issues, those patterns should be surfaced to the user as suggested voice profile updates (e.g., "Your last 5 newsletters all had em dashes flagged. Want to add 'no em dashes' to your voice profile?")

The second mechanism is future work but the architecture should support it.
