# Ad-Hub Vision: Two-Seat Architecture (Human + Bot)

## Core Concept

A closed-loop content and ad automation platform with two distinct access roles:
- **Human seat** — configuration, creative direction, approvals
- **Bot seat** — autonomous execution, optimization, self-improvement

The human's job reduces to **taste and direction**. The bot handles all execution, monitoring, and optimization.

---

## Human Seat (Dashboard + Telegram)

### Content Side
- Drop in voice memos, sample writing, brand reference material
- System distills and maintains a **brand voice profile** from samples
- Voice profile automatically updates the generation pipeline (Idea Sharpener, Content Generator, Post Sharpener, Editor)
- Feed ideas via Telegram or dashboard

### Platform Keys & Connections
- Connect API keys: X, Meta, LinkedIn, ad platforms
- Set per-platform budgets and spend limits
- Manage brand images, website assets, preferred ad imagery

### Approvals & Oversight
- Approve/reject content and ads via **Telegram quick-reply** or dashboard
- View analytics, adjust spend, pause campaigns
- Reschedule, redirect, or kill anything at any time

---

## Bot Seat (Dedicated Claude Agent — Scoped Access)

### Permissions
- **Can**: generate, schedule, publish, monitor, optimize, iterate
- **Cannot**: change API keys, modify budgets, alter platform connections, access billing

### Autonomous Content Loop
1. Receive idea (from Telegram voice memo or seed bank)
2. Idea Sharpener → extract seed, heat, audience hook
3. Newsletter draft → Editor pass
4. Content Generator → platform-specific posts
5. Post Sharpener → final polish
6. Schedule across platforms
7. Monitor performance → learn → iterate

### Autonomous Ad Loop
1. Research pain points from website + analytics
2. Generate ad variations (copy + creative)
3. Deploy to ad platforms via API
4. Monitor performance metrics
5. Self-improvement: read results, adjust angles, pause losers, scale winners
6. Auto-iterate within guardrails

### Self-Improvement
- Reads all content performance data
- Identifies winning patterns (hooks, formats, angles)
- Adjusts future generation based on what's working
- Stays within human-set guardrails and budget caps

---

## Business Model

### Per-Customer Isolation
- Each subscriber gets their own dedicated bot instance
- Bot only sees that customer's data, keys, and analytics
- Clean multi-tenancy with strict permission boundaries

### Hosting Options
- **Hosted by us**: subscription includes compute + bot instance
- **Hardware included**: subscription package with dedicated infrastructure
- Either way, customer just connects their keys and starts feeding ideas

### Value Prop
> "You think, we execute."
>
> Feed your ideas and voice. Approve what you like. The bot handles everything else —
> content creation, ad deployment, optimization, and continuous improvement.

---

## What Already Exists (Built)

1. Audio upload + Whisper transcription
2. Video generation with motion (hand-drawn composition + b-roll search)
3. One-click publish from Content Studio
4. Seed Bank (model, API, UI, sidebar nav)
5. Content generation pipeline (Idea Sharpener → Generator → Review)
6. Ad bulk generation + template system
7. Platform connections (X, LinkedIn, Meta)
8. Analytics + Command Center
9. Optimizer with auto-iterate
10. Agent system with approvals + guardrails + kill switch
11. Platform-specific preview component (X, LinkedIn, Meta, Substack)

## What Needs Building

### Tier 1 — Polish the Core Loop ✓
- [x] Content Studio UX overhaul (wizard transitions, visual hierarchy, week-grid calendar)
- [x] B-roll auto-suggestion (auto-query Pexels on generation)
- [x] Platform-specific preview in review step
- [x] Video preview integration in review step
- [x] Polish pass (interaction states, accessibility, empty states, micro-interactions)

### Tier 2 — Telegram Agent (Clawd Bot)
- [ ] Telegram bot integration (python-telegram-bot)
- [ ] Conversation flow: bot sends draft, human replies "sharpen" or "approved"
- [ ] Approval queue syncs between Telegram and web dashboard
- [ ] Schedule reminders with quick-reply buttons
- [ ] Reschedule negotiation

### Tier 3 — Premium Polish
- [ ] Empty states, loading skeletons, micro-animations
- [ ] Dashboard home page with content week at a glance
- [ ] Notification system (in-app + Telegram)

### Tier 4 — Two-Seat Architecture
- [ ] Brand voice ingestion + distillation system
- [ ] Bot permission layer (scoped API access, no config mutations)
- [ ] Autonomous loop wiring (Sharpener → Generator → Sharpener → Schedule → Monitor → Iterate)
- [ ] Per-customer bot instance isolation
- [ ] Subscription/billing infrastructure

### Tier 5 — Marketing Intelligence Layer (Bot as Strategic Partner)

The bot doesn't just execute — it **researches, learns, and advises**. This is what turns
it from an automation tool into a marketing partner that never sleeps.

**Autonomous Research Loops:**
- [ ] **Competitor monitoring** — crawl competitor sites, social feeds, Meta Ad Library.
      Track which angles they run, which ads have been live longest (longevity = winning),
      what hooks and CTAs they use
- [ ] **Niche trend detection** — monitor Reddit, X, forums, review sites for emerging
      pain points, complaints, desires in the customer's vertical. Surface trends before
      they're saturated
- [ ] **Hook & copy pattern analysis** — scrape top-performing posts in the niche
      (viral tweets, high-engagement LinkedIn posts), reverse-engineer structural patterns.
      Not copying — learning *why* they work (tension, specificity, open loops, etc.)
- [ ] **Evidence gathering** — find stats, studies, customer reviews, G2/Trustpilot
      sentiment data to back up ad claims. "87% of teams report X" hits different than
      a generic claim
- [ ] **Ad creative benchmarking** — analyze what visual styles, formats, aspect ratios,
      and CTAs are performing in the customer's vertical right now

**Self-Improvement Cycle:**
1. Bot runs ads/content
2. Reads performance data
3. Researches *why* certain things worked (finds external evidence + patterns)
4. Generates hypotheses ("Hook pattern X is trending, our top performer used a similar
   structure — let's test 3 variations with fresh data points")
5. Creates new content informed by research
6. Deploys, measures, repeats

**What the Bot Surfaces to the Human:**
- Weekly intelligence briefing: "Here's what's working in your niche this week"
- Evidence-backed copy suggestions: "I found 3 stats that support your best-performing angle"
- Competitor alerts: "Competitor X just launched a new ad campaign targeting your audience"
- Trend signals: "This pain point is spiking on Reddit — consider testing an angle around it"
- Creative recommendations: "Carousel format is outperforming single-image by 2.3x in your
  niche right now"

**The human's role becomes:** taste, direction, and final approval.
**The bot's role becomes:** strategic marketing partner that researches, creates, deploys,
monitors, learns, and iterates — 24/7.

### Tier 6 — Brand Asset Library (Cloud Storage Sync)

Visual brand consistency is harder than copy consistency. Colors and fonts can be constrained,
but ensuring imagery *feels* on-brand is subjective. For LAS-style clients that want warm,
alpine, international-school imagery — not generic stock photos — the system needs a living
connection to their approved assets.

**Supported Connections:**
- [ ] **Google Drive** — sync a shared "Marketing Assets" folder
- [ ] **Dropbox** — sync a shared folder
- [ ] **OneDrive / SharePoint** — for enterprise/school IT setups
- [ ] **Notion media library** — for teams already using Notion as a hub
- [ ] **Direct upload** — fallback for clients without cloud storage

**Auto-Indexing & Tagging:**
- [ ] On sync, auto-tag all images using vision AI (campus, students, alps, events,
      headshots, logos, faculty, facilities, etc.)
- [ ] Client can organize folders by context: "Admissions" / "Campus Life" / "Alumni" /
      "Events Spring 2026"
- [ ] Tags + folder context combine for semantic search when the bot needs imagery
- [ ] New photos added to the folder auto-sync — photographer dumps event photos on Friday,
      bot has them available Monday
- [ ] Deleted or moved images auto-remove from the bot's index

**Image Selection Priority (Tiered):**
1. **Client's synced library** — tagged, indexed, always preferred
2. **Client's uploaded reference images** — already in the system from onboarding
3. **Stock b-roll (Pexels/Unsplash)** — flagged as "stock" in the review queue
4. **AI-generated imagery** — flagged as "AI-generated" in the review queue

The human always sees which tier the image came from and can swap it before approving.

**Why This Matters:**
- **Freshness** — most brands' social accounts feel stale because they reuse the same
  10 photos. With a synced drive, the bot always has fresh, authentic imagery
- **Zero friction** — no one has to manually upload, crop, or assign. Photographer drops
  photos in Drive, bot handles the rest
- **Authenticity** — content feels current and real because it literally is. Real campus
  photos from last week beat stock photos every time
- **Retention lever** — clients who connect their Drive and keep it stocked get dramatically
  better content, which increases engagement, which increases retention

### Tier 7 — Bot Memory, State & Backup Infrastructure

Each bot instance needs persistent memory to be effective. This isn't just about data
backup — it's about the bot retaining context, learning, and continuity across sessions.

**Per-Client Bot State (Stored in Database):**
- [ ] **Brand voice profile** — distilled from samples, evolves over time
- [ ] **Content performance history** — what worked, what didn't, pattern analysis
- [ ] **Audience insights** — learned preferences, engagement patterns, best posting times
- [ ] **Active campaign state** — what's running, what's scheduled, what's in review
- [ ] **Conversation history** — Telegram/dashboard interactions, approval patterns,
      client preferences ("they always reject carousel posts", "they prefer shorter hooks")
- [ ] **Research cache** — competitor intel, trend data, scraped insights with timestamps
- [ ] **Asset index** — synced image library metadata, tags, usage history

**Architecture:**
- All bot state lives in the **database** (PostgreSQL), not in the bot process itself
- Bot instances are **stateless workers** — they read state from DB, do work, write state back
- This means if a bot process crashes or restarts, it picks up exactly where it left off
- No data lives only in memory — everything meaningful gets persisted

**Backup & Redundancy:**
- [ ] Automated daily database backups (point-in-time recovery)
- [ ] Cross-region backup replication for disaster recovery
- [ ] Client data export — customers can request a full export of their bot's learned
      state (brand profile, insights, performance history)
- [ ] Versioned brand voice profiles — if a client's voice drifts, roll back to a
      previous version

**What This Means Practically:**
- The bot **never forgets** — every interaction, every performance result, every learned
  pattern is persisted
- Clients can **pause and resume** — take a month off, come back, bot remembers everything
- If infrastructure fails, recovery is automatic — no client loses their bot's accumulated
  intelligence
- The bot's "memory" is really just well-structured data in the database, queryable and
  auditable
