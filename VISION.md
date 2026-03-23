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

### Pricing & Cost Structure (Model C — Hybrid Tiers)

Absorb token costs into the subscription. The "unlimited feel" is worth more than
nickel-and-diming on API usage. Tokens are a rounding error relative to subscription price.

**Subscription Tiers:**

```
Starter — $199/month
├── 100 content generations/month
├── 2 platforms connected
├── Basic brand profile
├── Tokens included (built into price)

Pro — $399/month
├── 500 generations/month
├── Unlimited platforms
├── Full brand profile + image library sync
├── Ad management (bot runs their ads)
├── Tokens included

Agency — $999/month
├── Up to 10 client brands
├── Unlimited generations
├── White-label option
├── Tokens included
```

**Actual Cost Per Customer (API):**

```
Content Generation (Claude API)
├── Idea Sharpener call:           ~$0.02-0.05
├── Newsletter draft + edit:       ~$0.08-0.15
├── 5 social posts:                ~$0.05-0.10
├── X thread generation:           ~$0.03-0.06
├── Full weekly pipeline:          ~$0.20-0.40
├── Monthly (4 weeks):             ~$0.80-1.60

Ad Copy Generation
├── Bulk ad variations (20):       ~$0.15-0.30
├── Monthly ad refresh (4x):       ~$0.60-1.20

Research / Intelligence (Tier 5)
├── Competitor analysis:           ~$0.10-0.20
├── Niche trend scraping:          ~$0.05-0.10
├── Weekly intelligence brief:     ~$0.15-0.25
├── Monthly:                       ~$1.20-2.20

Image Generation (DALL-E/Flux)
├── Per image:                     ~$0.04-0.08
├── Monthly (20 images):           ~$0.80-1.60

B-roll Search (Pexels)
├── Free tier:                     200 requests/month
├── Effectively:                   $0

Whisper Transcription
├── Per minute of audio:           ~$0.006
├── Monthly (30 min of memos):     ~$0.18

TOTAL MONTHLY API COST PER CUSTOMER:  ~$3-7 typical
                                      ~$15-40 heavy user
```

At $299/month with $7 average API cost = **97% gross margin**.
Even heaviest user at $40/month = **87% margin**.

**Real costs to watch:**
1. Compute (hosting bot instances) — ~$20-50/customer/month on Railway/Fly
2. Your time (support, onboarding) — the real expense early on

Price for compute and time, not API tokens. Tokens are a rounding error.

### Ad Spend — Keep It Completely Separate

**Never touch their ad spend money.**

```
Your subscription fee = your revenue (platform + bot + tokens)
Their ad spend = goes directly to Meta/Google through their own ad accounts
```

You manage campaigns via API, but money flows from their payment method to Meta/Google
directly. This is how every ad management tool works (AdEspresso, Revealbot, Smartly).
You don't want the liability, the accounting complexity, or the regulatory burden of
handling ad spend.

---

## Ideal Customer Profile

The ideal customer has:
1. **Something to sell** (product, service, expertise)
2. **A brand voice** (even informal — they know how they talk)
3. **Visual assets** (or can easily create them — property photos, product shots)
4. **Ad budget** (even small — $500-2k/month)
5. **No time or expertise** to execute consistently

### Tier 1 — Best Fit (highest pain, fastest adoption)

Solo operators / small teams who are good at their craft but bad at marketing consistently:

- **Real estate agents** — Perfect fit. They have listings (visual content), a local niche,
  need consistent posting, and their biggest problem is time. They know what to say about
  a property but never get around to posting. Upload property photos, bot handles everything.
  They already spend money on marketing they hate (Zillow leads, generic Facebook ads) —
  you're replacing an expense they already have with something better.

- **Course creators / coaches** — Tons of ideas (voice memos from walks, podcast riffs)
  but struggle to turn those into a weekly content calendar. The voice memo → content week
  pipeline is literally built for this person.

- **E-commerce DTC brands (1-5 person teams)** — Know their product, have product photos,
  can't afford a marketing hire. Need ads on Meta, content on Instagram, email going out.
  Currently doing it manually or not at all.

- **Local service businesses (dentists, gyms, law firms, med spas)** — Have budget for
  ads but zero time or knowledge to run them. Currently paying an agency $2-5k/month for
  mediocre results. This tool at $200-500/month with better output is a no-brainer.

### Tier 2 — Great Fit (slightly more complex)

- **International schools like LAS** — Need multi-platform content in a polished brand
  voice, have a photo library, need admissions-focused ads running consistently. Currently
  have a 1-2 person marketing team that's overwhelmed.

- **SaaS companies (seed to Series A)** — Founders who know they need content marketing
  and paid acquisition but are focused on product. Maintain presence without hiring a
  content person.

- **Agencies themselves** — The sleeper hit. A small agency managing 10 clients could use
  the tool to run all 10 with one person instead of five. You'd be infrastructure for
  agencies, not competing with them.

### Who Is NOT a Good Fit (Yet)

- **Enterprise brands** — Too many approval layers, legal review, brand police. They need
  Sprinklr, not this.
- **People with no existing business** — No product, audience, or budget. The tool
  amplifies what exists.
- **Heavily regulated industries** — Pharma, financial services. Every piece of copy needs
  legal review. The bot can't navigate that yet.

---

## Adoption & Onboarding

### Hurdle #1 — API Keys (Biggest Friction)

**Recommendation: OAuth flows, not API key paste.**

Use OAuth so the client just clicks "Connect Facebook" and authorizes the app. They never
see an API key. Tokens stored per-tenant. This is how Buffer, Hootsuite, and every social
tool works.

Requires getting approved as a Meta/X/LinkedIn developer app — one-time hurdle for us,
not per-client.

- [ ] OAuth flow for Meta (Facebook + Instagram)
- [ ] OAuth flow for LinkedIn
- [ ] OAuth flow for X
- [ ] OAuth flow for Google Ads
- [ ] Per-tenant token storage with refresh handling

### Hurdle #2 — Trust ("Will the bot mess up my brand?")

The real adoption killer. Not technical setup — the fear of letting AI represent their
brand publicly. Solved by the Brand Profile System + Compliance Pipeline + Human Approval
Gate (see below).

### Hurdle #3 — Cost Clarity

Clients need to understand what they're paying for (your service) vs. what they're spending
(ad budgets on platforms). Keep these **completely separate** in all messaging and billing.

---

## Brand Profile System

First-class database entity, not just a text field. Structured fields for voice, visual,
and rules. This is the foundation everything else builds on.

**Captured during onboarding, enforced on every generation:**

```
Voice & Tone
├── Writing samples (5-10 real posts/emails they love)
├── Tone descriptors (warm / authoritative / playful / formal)
├── Words they ALWAYS use ("learners" not "students" for LAS)
├── Words they NEVER use (competitors' names, certain slang)
├── Sentence style (short punchy vs. long flowing)

Visual Identity
├── Logo files + usage rules (min size, clear space)
├── Brand colors (primary, secondary, accent — exact hex)
├── Approved fonts
├── Photography style guide (candid vs. posed, filters, mood)
├── Image library (approved photos — synced from cloud storage)
├── Template preferences (which ad templates match their brand)

Content Rules
├── Topics they cover vs. topics that are off-limits
├── Claims they can make vs. claims that need legal review
├── Hashtag strategy
├── Emoji usage (yes / no / which ones)
├── CTA style preferences
├── Regulatory constraints (education sector = specific rules)

Platform-Specific Rules
├── LinkedIn: formal, thought leadership tone
├── Instagram: visual-first, shorter copy
├── X: conversational, thread-friendly
├── Meta Ads: compliant with ad policies, no prohibited claims
```

---

## Brand Enforcement & Compliance Pipeline

Four layers between generation and publishing. Even if each layer is simple at launch,
having the pipeline in place means it can get smarter over time.

### Layer 1 — Generation Constraints

The brand profile becomes part of every prompt. Not as a suggestion — as **hard constraints**.
"You MUST use these colors. You MUST NOT use the word 'cheap'. Voice samples attached."

### Layer 2 — Post-Generation Compliance Check

After the bot generates, run a brand + policy compliance check before anything enters
the approval queue:

- [ ] Does it use approved colors/fonts?
- [ ] Does the copy match the voice profile? (compare against embeddings of writing samples)
- [ ] Does it contain any forbidden words/topics?
- [ ] Does it violate platform ad policies?
- [ ] Does it comply with industry-specific regulations?
- [ ] Flag anything that doesn't pass — with a reason

**Industry-Specific Compliance Rulesets:**
- [ ] Education — rules about targeting minors, enrollment claims, financial aid language
- [ ] Real estate — Fair Housing Act compliance, no discriminatory targeting
- [ ] Health/wellness — no medical claims without disclaimers
- [ ] General — Meta/Google/X ad policy checkers per platform

### Layer 3 — Human Approval Gate

Nothing goes live without approval (at least initially). Over time, the client can loosen:
- "Auto-publish social posts that pass compliance. Ads always need approval."
- Configurable per content type and per platform

### Layer 4 — Learning Loop (Rejection Feedback)

When a client rejects content, **capture why**:
- "Off-brand voice"
- "Wrong imagery"
- "Policy concern"
- "Too casual / too formal"
- "Other" (free text)

This data is gold for the self-improvement loop. Feed rejections back into the brand
profile automatically. Over time the bot learns: "they always reject carousel posts",
"they prefer shorter hooks", "never use that CTA style."

---

## Known Gaps & Mitigations

Being honest about where this can go wrong:

### 1. Visual Brand Consistency
Colors and fonts can be constrained, but ensuring imagery *feels* on-brand is subjective.
LAS wants warm, alpine, international-school imagery — not generic stock photos.
**Mitigation:** Per-client image library synced from cloud storage (Tier 6). Bot picks
from approved images first, only suggests stock when library is exhausted. Stock always
flagged for human review.

### 2. Voice Drift Over Time
The bot generates hundreds of pieces. Without active recalibration, it slowly drifts from
the brand voice.
**Mitigation:** Periodic voice audit — compare recent outputs against original samples.
Alert if similarity drops below threshold. Versioned voice profiles with rollback.

### 3. Context the Bot Can't Know
A school might have a PR situation, a sensitive event, a policy change that makes certain
content inappropriate. The bot doesn't know internal politics.
**Mitigation:** "Content pause" topics the client can add on the fly. Telegram command:
"pause anything about campus safety this week."

### 4. Platform Policy Compliance
Meta and Google have strict ad policies, especially for education, housing, and finance.
The bot needs to know these rules per-vertical.
**Mitigation:** Build a compliance ruleset per industry vertical. Education has specific
rules about targeting minors, making enrollment claims, etc. (See Compliance Pipeline above.)

### 5. Multi-Language / Multi-Market
A school like LAS has international audiences. Content might need to work across cultures.
**Mitigation:** Flag as Phase 2 concern, but architect the brand profile to support
locale-specific variants from the start.

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
- [x] Brand Profile system (database model, onboarding UI, generation pipeline integration)
- [x] Bot permission layer (User model, AgentAPIKey, role-based endpoint protection)
- [x] Autonomous loop wiring (content loop, ad loop, feedback loop — scheduler-driven)
- [x] Per-customer bot instance isolation (Workspace model, workspace-scoped queries, data boundaries)
- [x] Subscription/billing infrastructure (Stripe integration, tier limits, usage tracking)
- [ ] Demo mode (sandbox environment for prospects, no API keys required)

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
