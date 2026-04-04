# ITERANT CONTENT PIPELINE MAP

## Every Content Type Has Its Own Pipeline

Each format is a different medium with different psychology, conventions, and definitions of quality. They share the Idea Sharpener and voice profile, but everything after that is format-specific.

```
                         ┌─── IDEA SHARPENER ───┐
                         │   (universal step 1)   │
                         │   finds the seed        │
                         └──────────┬──────────────┘
                                    │
                    ┌───────────────┼───────────────────────────────┐
                    │               │                               │
              ┌─────▼──────┐  ┌────▼─────┐                  ┌──────▼──────┐
              │  NEWSLETTER │  │  SOCIAL  │                  │   THREAD    │
              │   DRAFTER   │  │  DRAFTER │                  │   DRAFTER   │
              └─────┬───────┘  └────┬─────┘                  └──────┬──────┘
                    │               │                               │
              ┌─────▼───────┐  ┌────▼─────────────────┐     ┌──────▼──────┐
              │  NEWSLETTER │  │  PLATFORM-SPECIFIC   │     │   THREAD    │
              │   EDITOR    │  │   EDITORS            │     │   EDITOR    │
              └─────┬───────┘  │  ┌─────────────┐     │     └──────┬──────┘
                    │          │  │ X Post Editor│     │            │
                    │          │  ├─────────────┤     │            │
                    │          │  │LinkedIn Edit │     │            │
                    │          │  ├─────────────┤     │            │
                    │          │  │ Meta Editor  │     │            │
                    │          │  └─────────────┘     │            │
                    │          └───────┬──────────────┘            │
                    │                  │                            │
         ┌──────────┼──────────────────┼────────────────────────────┘
         │          │                  │
         ▼          ▼                  ▼
    ┌─────────┐ ┌────────┐      ┌──────────┐
    │  OUTPUT │ │ OUTPUT │      │  OUTPUT  │
    └─────────┘ └────────┘      └──────────┘


         DERIVED FORMATS (require newsletter as source):
         ┌──────────────────────────────────────────────┐
         │                                              │
    ┌────▼──────┐  ┌─────────────┐  ┌────────────────┐  │
    │   VIDEO   │  │   EMAIL     │  │  X ARTICLE     │  │
    │ CONVERTER │  │   ADAPTER   │  │  ADAPTER       │  │
    └────┬──────┘  └──────┬──────┘  └───────┬────────┘  │
         │                │                 │           │
    ┌────▼──────┐  ┌──────▼──────┐  ┌───────▼────────┐  │
    │   VIDEO   │  │   EMAIL     │  │   ARTICLE      │  │
    │   EDITOR  │  │   EDITOR    │  │   EDITOR       │  │
    └────┬──────┘  └──────┬──────┘  └───────┬────────┘  │
         │                │                 │           │
         ▼                ▼                 ▼           │
    ┌─────────┐    ┌──────────┐      ┌──────────┐      │
    │  OUTPUT │    │  OUTPUT  │      │  OUTPUT  │      │
    └─────────┘    └──────────┘      └──────────┘      │
                                                       │
         VISUAL FORMATS:                               │
         ┌─────────────────────────────────────────────┘
         │
    ┌────▼───────┐  ┌──────────────┐
    │  CAROUSEL  │  │  STORY/REEL  │
    │  DRAFTER   │  │   DRAFTER    │
    └────┬───────┘  └──────┬───────┘
         │                 │
    ┌────▼───────┐  ┌──────▼───────┐
    │  CAROUSEL  │  │  STORY/REEL  │
    │   EDITOR   │  │   EDITOR     │
    └────┬───────┘  └──────┬───────┘
         │                 │
         ▼                 ▼
    ┌─────────┐     ┌──────────┐
    │  OUTPUT │     │  OUTPUT  │
    └─────────┘     └──────────┘
```

## Complete Skill File Inventory

### Universal (shared across all types)
| Skill | File | Purpose |
|---|---|---|
| Architecture | `AGENT_SKILL_ARCHITECTURE.md` | How the system works |
| Idea Sharpener | `IDEA_SHARPENER_SKILL.md` | Seed extraction from raw ideas |
| Content Editor | `CONTENT_EDITOR_SKILL.md` | Universal quality gate (fallback) |

### Text-Based Content
| Skill | File | Purpose |
|---|---|---|
| Newsletter Drafter | `NEWSLETTER_DRAFTER_SKILL.md` | Long-form newsletter drafting |
| Newsletter Editor | `NEWSLETTER_EDITOR_SKILL.md` | Newsletter quality gate + scoring |
| LinkedIn Drafter | `LINKEDIN_POST_DRAFTER_SKILL.md` | LinkedIn post drafting |
| X Post Drafter | `SOCIAL_POST_DRAFTER_SKILL.md` | X post drafting (also covers Meta) |
| Social Post Editor | `SOCIAL_POST_EDITOR_SKILL.md` | Quality gate for all social posts |
| X Thread Drafter | `X_THREAD_DRAFTER_SKILL.md` | Thread structure + arc |
| Email Drafter | `EMAIL_DRAFTER_SKILL.md` | Marketing email drafting |

### Video Content
| Skill | File | Purpose |
|---|---|---|
| Video Converter | `VIDEO_CONVERTER_SKILL.md` | Newsletter → long-form video script |
| Story/Reel Drafter | `STORY_REEL_DRAFTER_SKILL.md` | Short-form vertical video scripts |

### Visual Content
| Skill | File | Purpose |
|---|---|---|
| Carousel Drafter | `CAROUSEL_DRAFTER_SKILL.md` | Swipeable slide sequences |

### Support Files
| File | Purpose |
|---|---|
| `PROMPT_DEFAULTS_MIGRATION.md` | How to integrate into existing codebase |
| `Trail-Notes-Brand-Voice-Guide-UPDATED.md` | Updated voice profile with loosened somatic rules |

## Why Each Format Is Different

| Format | Psychology | What "Good" Looks Like |
|---|---|---|
| **Newsletter** | Reader gave you their inbox. They want depth. | Extended metaphor, slow build, reflective close |
| **X Post** | 280 chars in a feed of noise. Stop the scroll. | Tension + stealable line. Done. |
| **LinkedIn** | Professional context. "See more" is the conversion. | Story + insight + conversation-starting close |
| **Meta/FB** | Personal feed. Story-driven. | Specific scene + soft reflection |
| **X Thread** | Sequential reveal. Each tweet earns the next. | Arc with progression. Tweet 1 = standalone hook. |
| **Carousel** | Visual + swipe. Each slide earns the next swipe. | 3-8 word headlines. Visual arc. Save-worthy. |
| **Story/Reel** | 1-2 seconds to stop scroll. Audio-first. | Pattern interrupt → one insight → landing line |
| **Video (long)** | 5-15 min conversation. Source = newsletter. | Breath blocks. Speakable. Metaphor preserved. |
| **Email** | Inbox competition. Subject line is everything. | 6-10 word subject. One CTA. Personal tone. |

## The Shared DNA

Despite being different formats, they all share:
1. **Voice profile** — the creator sounds like themselves everywhere
2. **Idea Sharpener** — the seed is the same; the expression differs
3. **AI fingerprint scanning** — universal banned patterns across all formats
4. **Editor pass** — every format gets a quality gate before output
5. **Three filters** — specificity, tension, stealable line (weighted differently per format)
