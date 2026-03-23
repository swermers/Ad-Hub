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

### Tier 1 — Polish the Core Loop
- [ ] Content Studio UX overhaul (wizard transitions, visual hierarchy, week-grid calendar)
- [ ] B-roll auto-suggestion (auto-query Pexels on generation)
- [ ] Platform-specific preview in review step
- [ ] Video preview integration in review step

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
