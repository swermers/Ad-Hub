# Iterant — Brand Style Guide

**Version:** 1.0
**Date:** March 2026
**Status:** Foundation

## 1. Brand Overview

### What is Iterant?

Iterant is an AI-powered ad generation and optimization platform. It takes a brand, breaks it down into its core elements — pain points, templates, copy angles — and generates hundreds of ad variations. It then tests them at scale, kills the losers, scales the winners, and feeds the results back into the next generation cycle.

The name comes from the Latin *iterare* — "to repeat, to do again." An iterant is the entity that iterates. Every cycle produces sharper, higher-performing ads than the last.

### Core Value Proposition

> "Every version better than the last."

Iterant automates the creative testing loop that performance marketers do manually. One brand in, infinite ad angles out, automatically optimized.

### Brand Personality

Iterant speaks like a precision instrument with a pulse. It's not cold — it's focused. Three words that define the brand:

- **Relentless** — the system never stops refining
- **Precise** — every decision is data-informed
- **Engineered** — this is a machine, not a toy

### What Iterant Is Not

- Not playful or whimsical — this is a serious growth tool
- Not corporate or stiff — it respects the operator's time with direct language
- Not flashy for the sake of it — every visual element earns its place

## 2. Brand Name & Taglines

### Primary Name

**Iterant** — always written with a lowercase "i" in body text and UI (`iterant`), or with a capital "I" at the start of sentences (`Iterant`). Never all-caps in running text.

### Logo Wordmark

The wordmark uses **Inter Bold (700)** at tight tracking (`letter-spacing: -0.02em`). Lowercase. The letterforms are clean, engineered, and unadorned.

### Approved Taglines

Use one tagline at a time. Never stack multiple taglines.

| Tagline | Use Case |
|---------|----------|
| Every version better than the last. | Primary — hero sections, landing pages, pitch decks |
| Test everything. Scale what works. | Product-focused — feature pages, onboarding |
| The iteration engine. | Compact — social bios, favicons, app store listings |
| Relentless refinement. | Premium — investor materials, brand partnerships |
| Generate. Test. Refine. Repeat. | Explanatory — ads, product tours, email headers |

### Subtitle / Descriptor

When a subtitle is needed beneath the wordmark or in navigation:

- `iteration engine` — in small uppercase tracked-out text
- Never use "platform," "tool," or "software" as descriptors

## 3. Logo

### The Mark

The Iterant mark is a stylized lowercase "i" embedded within a circular gradient ring. The circle represents the iteration loop — continuous, unbroken. The "i" is the system at the center, doing the work.

**Construction:**

- **Outer ring:** Circle with the brand gradient (deep orange → amber → warm gold)
- **Inner cutout:** Dark circle (#131315) creating the ring shape
- **Letterform:** The "i" (dot + stem) rendered in the same gradient, centered within the dark inner circle
- **Subtle crescent accent:** A warm shadow overlay on the lower portion of the ring adds depth

### Logo Versions

| Version | Usage |
|---------|-------|
| Full lockup (vertical) | Landing pages, hero sections, splash screens, pitch decks |
| Horizontal lockup | Navigation bars, email headers, document headers |
| Mark only | App icons, favicons, social avatars, loading states |
| Wordmark only | Inline text references, footer credits, minimal contexts |

### Logo Clear Space

Maintain clear space equal to the height of the "i" dot on all sides of the mark. No other elements should enter this zone.

### Logo Don'ts

- Never rotate the mark
- Never change the gradient colors
- Never place the mark on a busy or light background without a dark container
- Never stretch, squash, or distort the proportions
- Never add drop shadows, glows, or outlines
- Never separate the "i" from the ring
- Never recreate the mark in a different style

## 4. Color System

### Primary Palette

The Iterant color system is built around a dark environment with a warm amber signal color. The palette mirrors the experience of using the product: a focused, dark workspace where winning ads glow amber.

| Token | Hex | Role |
|-------|-----|------|
| --bg-primary | #131315 | App background, primary surfaces |
| --bg-secondary | #1A1A1D | Cards, elevated surfaces |
| --bg-tertiary | #201F21 | Input fields, recessed areas |
| --text-primary | #E5E1E4 | Primary text, headings |
| --text-secondary | #E5E1E4 at 70% | Secondary text, descriptions |
| --text-tertiary | #E5E1E4 at 40% | Hints, placeholders, metadata |
| --accent | #FF9500 | Primary actions, active states, winners |
| --accent-hover | #FF9500 at 90% | Hover states on accent elements |
| --accent-subtle | #FF9500 at 10% | Accent backgrounds, selected rows |
| --border | #FFFFFF at 5% | Default borders, dividers |
| --border-hover | #FFFFFF at 10% | Borders on hover |

### Brand Gradient

The logo gradient runs through three stops. Use it only on the logo mark and hero-level accent elements. Never on text, body backgrounds, or small UI components.

```
Linear gradient, bottom-left to top-right:
  0%   → #D94A1A  (deep orange)
  50%  → #FF9500  (amber)
  100% → #FFB836  (warm gold)
```

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| --success | #34C759 | Winning ads, positive metrics, approvals |
| --warning | #FF9F0A | Caution states, approaching thresholds |
| --danger | #FF453A | Losing ads, errors, budget alerts |
| --info | #5AC8FA | Informational states, neutral highlights |

### Color Usage Rules

1. **Amber means "this is working."** Winning ads, active states, primary CTAs, and positive signals all use `--accent`. It should feel like the system is highlighting what deserves attention.
2. **Dark means "focused workspace."** The dark palette isn't aesthetic — it's functional. Long sessions of reviewing ad variations are easier on a dark background.
3. **White space is dark space.** Breathing room in the UI uses the dark background, not literal white.
4. **Never use pure black (#000000).** Always use #131315 or darker tinted neutrals.
5. **Never use pure white (#FFFFFF) for text.** Use #E5E1E4 — it's softer and more refined.

## 5. Typography

### Font Stack

```
Primary: Inter
Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
Monospace: "JetBrains Mono", "Fira Code", monospace (for code, IDs, metrics)
```

### Type Scale

| Element | Size | Weight | Tracking | Usage |
|---------|------|--------|----------|-------|
| Page title | 24px | Bold (700) | -0.02em | Page headings (h1) |
| Section title | 18px | Semibold (600) | -0.01em | Section headings (h2) |
| Card title | 14px | Semibold (600) | 0 | Card and component headings |
| Body | 14px | Regular (400) | 0 | Default body text |
| Small / Meta | 12px | Regular (400) | 0 | Timestamps, IDs, secondary info |
| Label | 11px | Medium (500) | 0.1em | Navigation items, tags, badges |
| Overline | 11px | Medium (500) | 0.12em | Subtitles below brand name, plan labels |

### Typography Rules

1. **Labels use uppercase with wide tracking.** Navigation items, status badges, and system labels are set in 11px / 500 / tracking 0.1em / uppercase. This is a defining characteristic of the Iterant UI — it creates the "instrument panel" feel.
2. **Body text is never uppercase.** Only labels and overlines use caps.
3. **Headings are tight, body is open.** Headings use negative tracking for density; body text uses default tracking for readability.
4. **Never go below 11px.** Anything smaller is illegible on most screens.
5. **Metric numbers use tabular figures.** When displaying performance data, ad spend, CTR, or CPM, use `font-variant-numeric: tabular-nums` so columns align.

## 6. Spacing & Layout

### Spacing Scale

Based on a 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| --space-xs | 4px | Tight gaps within components |
| --space-sm | 8px | Between related elements |
| --space-md | 16px | Default component padding |
| --space-lg | 24px | Between sections |
| --space-xl | 32px | Major section breaks |
| --space-2xl | 48px | Page-level spacing |

### Layout Constants

| Element | Value |
|---------|-------|
| Sidebar width | 288px (72 x 4) |
| Top nav height | 80px |
| Content max-width | 1200px (6xl) |
| Content padding (horizontal) | 48px |
| Content padding (top) | 112px (nav height + breathing room) |
| Card border-radius | 12px |
| Button border-radius | 8px |
| Input border-radius | 8px |

### Glass Effect (Navigation)

```css
.glass-nav {
  background: rgba(19, 19, 21, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
```

Use sparingly — only on persistent navigation chrome. Never on cards, modals, or content areas.

## 7. Iconography

### Icon System

Iterant uses **Material Symbols Outlined** (variable font) for all UI icons.

- Default weight: 400
- Active/selected state: `font-variation-settings: 'FILL' 1` (filled variant)
- Size: 20px in navigation, 18px inline

### Icon Usage Rules

1. Icons always accompany text labels in navigation — never icon-only (except in dense toolbars).
2. Active nav items use the filled variant; inactive items use the outlined variant.
3. Icon color follows text color rules — `--text-secondary` for inactive, `--accent` for active.

## 8. Component Patterns

### Buttons

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Primary | #FF9500 | #2D1600 | None | Main actions: Generate, Upload, Save |
| Secondary | transparent | #E5E1E4 | white/10% | Secondary actions: Cancel, Back |
| Ghost | transparent | #E5E1E4/70% | None | Tertiary actions: links, toggles |
| Danger | #FF453A/10% | #FF453A | None | Destructive actions: Delete, Kill ad |

**Button states:**
- Hover: `opacity: 0.9` + slight lift (`transform: translateY(-1px)`)
- Active: `transform: scale(0.95)`
- Disabled: `opacity: 0.4`, no hover effect

### Cards

- Background: `#1A1A1D` or `white/5%`
- Border: `white/5%` at 1px
- Border-radius: 12px
- Padding: 16-24px
- Never nest cards inside cards

### Status Badges

Uppercase, tracked-out, small text on a subtle colored background:

```
Draft    → gray text on gray/10% bg
Approved → amber text on amber/10% bg
Live     → green text on green/10% bg
Paused   → orange text on orange/10% bg
Killed   → red text on red/10% bg
```

### Active Navigation Item

```css
.nav-active {
  background: rgba(255, 149, 0, 0.1);
  color: #FF9500;
  border-right: 2px solid #FF9500;
}
```

## 9. Motion & Animation

### Principles

- Motion is functional, not decorative
- Entrances use staggered fades (elements appear in sequence)
- Transitions use 200ms ease for state changes
- Active states use `scale(0.95)` for tactile feedback

### Entrance Animation

```css
.entrance-fade {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Stagger delay: 0.03s per item in lists, 0.15s base offset.

### Hover Lift

```css
.hover-lift {
  transition: transform 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
}
```

### Rules

1. Never use bounce or elastic easing
2. Never animate layout properties (width, height, top, left) — only transform and opacity
3. Respect `prefers-reduced-motion` — disable animations for users who request it
4. Loading states use subtle pulse animations, never spinners

## 10. Voice & Tone

### How Iterant Speaks

Iterant speaks like an engineer who respects your time. Short sentences. No hype. Let the results talk.

### Writing Principles

1. **Lead with the outcome.** "3 winners found overnight" not "Our AI analyzed your ad variations and identified top performers."
2. **Use numbers over adjectives.** "50 variations in 4 minutes" not "Generate tons of ads super fast."
3. **Be direct, not clever.** "Upload to Facebook" not "Launch your creatives into the wild."
4. **Use active voice.** "Iterant killed 12 underperformers" not "12 underperformers were identified for removal."
5. **Respect the operator.** The user is a performance marketer, not a beginner. Don't over-explain.

### Example Copy

**Good:**
- "50 variations. 3 winners. Found overnight."
- "Your best ad hasn't been made yet. Iterant will find it."
- "One brand. Infinite angles. Automatic optimization."
- "Generate → Test → Refine → Repeat."

**Bad:**
- "Supercharge your ad game with AI-powered creativity!" (hype)
- "Our revolutionary platform leverages cutting-edge artificial intelligence..." (corporate)
- "Ready to 10x your ROAS?" (cringe)

### Terminology

| Concept | Iterant Term | Never Say |
|---------|-------------|-----------|
| The product | Iterant | The platform, the tool, the app |
| Ad creative files | Variations | Creatives, assets, deliverables |
| Ad templates | Frameworks | Layouts, designs, canvases |
| Pain point research | Signals | Insights, data points |
| Optimization cycle | Refinement | Optimization pass, tuning |
| Removing bad ads | Killing | Pausing, deactivating, archiving |
| Scaling good ads | Scaling | Boosting, amplifying, promoting |
| Facebook/Meta upload | Launch | Deploy, publish, push |
| Performance data | Metrics | Analytics, stats, numbers |
| The AI system | The engine | The AI, the algorithm, the model |

## 11. Sub-Feature Naming

| Feature Name | Icon | Description |
|-------------|------|-------------|
| Studio | auto_awesome | Content creation workspace |
| Generator | layers | Bulk ad generation engine |
| Frameworks | dashboard | Template library |
| Signals | sensors | Pain point research |
| Launch | rocket_launch | Facebook upload |
| Refiner | speed | Auto-optimizer |
| Scanner | psychology | Market intelligence |
| Metrics | bar_chart | Performance data |
| Seeds | database | Content seeds |
| Console | terminal | Operator controls |
| Autopilot | smart_toy | Autonomous agent |
| Schedule | calendar_month | Post scheduling |
| Brand Profile | palette | Brand configuration |
| Settings | settings | Account settings |

## 12. App Hierarchy & Meta

### Page Titles

Format: `Iterant | [Page Name]`

### Navigation Placement

- **Top nav (left):** `iterant` wordmark in bold, 24px
- **Sidebar brand block:** Iterant in 18px bold amber (#FF9500), with `iteration engine` subtitle in 11px uppercase tracked-out muted text below
- **Sidebar plan label:** Pro Plan (or relevant tier) in 11px uppercase muted text

### Meta Description

> Iterant — the iteration engine for performance ads. Generate hundreds of ad variations, test at scale, and automatically optimize. Every version better than the last.

## 13. File & Asset Naming

### Conventions

- Logo files: `iterant-logo-[version]-[color].svg`
- Brand assets folder: `/brand/`
- Component screenshots: `iterant-[feature]-[state].png`

### Export Formats

| Asset | Format | Sizes |
|-------|--------|-------|
| Logo mark | SVG (primary), PNG | 16, 32, 64, 128, 256, 512px |
| Favicon | ICO, PNG | 16, 32, 48px |
| App icon | PNG | 180, 192, 512px |
| OG image | PNG | 1200x630px |
| Ad exports | PNG | 1080x1080, 1080x1920, 1200x628px |

## 14. Brand Architecture Summary

```
ITERANT
├── Name: iterant (lowercase in UI, Title Case in prose)
├── Tagline: "Every version better than the last."
├── Descriptor: iteration engine
├── Mark: "i" in gradient ring
├── Palette: Dark (#131315) + Amber (#FF9500) + Cream (#E5E1E4)
├── Font: Inter
├── Voice: Direct, numbers-first, operator-grade
└── Features: Studio, Generator, Frameworks, Signals, Launch,
    Refiner, Scanner, Metrics, Seeds, Console, Autopilot, Schedule
```

---

*This document is the single source of truth for the Iterant brand. All marketing materials, UI decisions, and copy should reference this guide. When in doubt, ask: "Does this feel like a precision instrument?" If yes, ship it.*
