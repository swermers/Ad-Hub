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
