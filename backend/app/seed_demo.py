"""
Seed demo data for guest/viewer accounts.

Creates a fully-specked demo product with pre-generated content so demo users
can explore the full UI without triggering any API calls.
"""

import json
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import (
    AdTemplate,
    AdVariation,
    BrandProfile,
    Campaign,
    CampaignAdVariation,
    CompetitorProfile,
    ContentPiece,
    EvidenceItem,
    HookPattern,
    IntelligenceBrief,
    IntelligenceConfig,
    PainPoint,
    PerformanceMetric,
    PlatformConnection,
    Product,
    ScheduledPost,
    Seed,
    TrendSignal,
)
from app.models.bulk_ads import OptimizationConfig, OptimizationLog
from app.models.campaign import AgentLog, SafetyGuardrail
from app.models.autonomous_loop import AutonomousLoopConfig
from app.models.content_prompts import ContentPromptSet

DEMO_PRODUCT_ID = "00000000-0000-4000-demo-000000000001"
DEMO_WORKSPACE_ID = "00000000-0000-4000-demo-00000000d3m0"
DEMO_WORKSPACE_SLUG = "demo"

_now = datetime.now(timezone.utc)
_day = timedelta(days=1)
_hour = timedelta(hours=1)


def _id():
    return str(uuid.uuid4())


def seed_demo_data(db: Session, workspace_id: str | None = None):
    """Seed demo product and content in a separate demo workspace.

    Idempotent - skips if demo product already exists.
    """
    from app.models.workspace import Workspace
    from app.models.user import User

    existing = db.query(Product).filter(Product.id == DEMO_PRODUCT_ID).first()
    if existing:
        if existing.workspace_id == DEMO_WORKSPACE_ID:
            return  # Already seeded correctly
        # Wrong workspace — delete and re-seed
        db.delete(existing)
        db.commit()

    # ── Create dedicated demo workspace (separate from admin workspace) ──────
    demo_ws = db.query(Workspace).filter(Workspace.id == DEMO_WORKSPACE_ID).first()
    if not demo_ws:
        demo_ws = Workspace(
            id=DEMO_WORKSPACE_ID,
            name="Demo Workspace",
            slug=DEMO_WORKSPACE_SLUG,
            owner_email="guest@iterant.demo",
            tier="pro",
            max_products=1,
            max_generations_per_month=0,
        )
        db.add(demo_ws)
        db.flush()

    # Assign guest user to demo workspace (not admin workspace)
    guest_user = db.query(User).filter(User.email == "guest@iterant.demo").first()
    if guest_user and guest_user.workspace_id != DEMO_WORKSPACE_ID:
        guest_user.workspace_id = DEMO_WORKSPACE_ID
        db.flush()

    # ── Demo Product ─────────────────────────────────────────────────────────
    product = Product(
        id=DEMO_PRODUCT_ID,
        workspace_id=DEMO_WORKSPACE_ID,
        name="Bloom",
        website_url="https://getbloom.example",
        description=(
            "Bloom is an AI-powered plant care app that identifies plants from photos, "
            "diagnoses diseases, and sends personalized watering reminders. Built for "
            "busy plant parents who want thriving greenery without the guesswork."
        ),
        target_audience=(
            "Millennials and Gen Z plant enthusiasts (25-38), urban apartment dwellers "
            "who buy 3-8 houseplants per year. They follow plant influencers on Instagram "
            "and TikTok, browse r/houseplants, and feel guilty when plants die."
        ),
        pain_points=(
            "Over-watering or under-watering kills most houseplants. "
            "Generic care guides don't account for local climate or light conditions. "
            "Plant diseases go unnoticed until it's too late."
        ),
        differentiators=(
            "Real-time disease detection with 97% accuracy. "
            "Hyper-local watering schedules based on indoor humidity sensors. "
            "Community-driven plant swap marketplace."
        ),
        product_type="saas",
        brand_voice="Warm, encouraging, slightly playful. Think knowledgeable friend, not textbook.",
        brand_brief=(
            "Bloom makes plant care effortless. We believe everyone deserves a home that feels alive. "
            "Our tone is warm and supportive - we never shame someone for killing a plant. "
            "We celebrate small wins like a new leaf unfurling."
        ),
        brand_colors=json.dumps(["#2D6A4F", "#52B788", "#B7E4C7", "#FEFAE0", "#D4A373"]),
        brand_fonts=json.dumps(["DM Sans", "Fraunces"]),
        status="active",
        created_at=_now - 14 * _day,
    )
    db.add(product)
    db.flush()  # Flush product first so FK references resolve

    # ── Brand Profile ────────────────────────────────────────────────────────
    brand = BrandProfile(
        id=_id(),
        product_id=DEMO_PRODUCT_ID,
        tone_descriptors=json.dumps(["warm", "encouraging", "playful", "knowledgeable"]),
        always_use_words=json.dumps(["thriving", "plant parent", "green thumb", "bloom"]),
        never_use_words=json.dumps(["dead", "killed", "failed", "boring"]),
        sentence_style="conversational",
        primary_colors=json.dumps(["#2D6A4F", "#52B788"]),
        secondary_colors=json.dumps(["#B7E4C7", "#FEFAE0"]),
        accent_colors=json.dumps(["#D4A373"]),
        approved_fonts=json.dumps(["DM Sans", "Fraunces"]),
        photography_style="Bright, natural light. Real plants in real homes. Hands in frame for warmth.",
        approved_topics=json.dumps(["plant care tips", "seasonal guides", "plant identification", "home decor"]),
        off_limit_topics=json.dumps(["politics", "controversial diets", "religion"]),
        hashtag_strategy="3-5 hashtags per post. Mix branded (#BloomPlantCare) with community (#PlantParent #HousePlantClub)",
        emoji_usage="moderate",
        approved_emojis=json.dumps(["🌱", "🪴", "🌿", "💚", "✨", "☀️"]),
        cta_style="Soft and inviting. 'Try Bloom free' not 'BUY NOW'. Guide, don't push.",
        x_rules=json.dumps(["Keep under 200 chars", "1-2 hashtags max", "Thread long-form tips"]),
        instagram_rules=json.dumps(["Carousel for tips", "Reels for plant IDs", "Stories for polls"]),
        linkedin_rules=json.dumps(["Professional angle: workspace plants boost productivity"]),
        meta_ads_rules=json.dumps(["Lead with the plant photo", "Pain point in first line", "Social proof in body"]),
    )
    db.add(brand)

    # ── Content Pieces ───────────────────────────────────────────────────────
    content_data = [
        {
            "content_type": "social_post",
            "platform": "x",
            "title": "Awareness — Guilt Hook",
            "hook": "Your plant is trying to tell you something. That drooping monstera isn't judging you. But it is dying.",
            "body": "We surveyed 2,000 plant owners.\n\n73% water on a schedule they made up.\n42% have never checked their soil moisture.\n89% have killed at least one plant they genuinely loved.\n\nThe problem isn't you. It's that plant care advice was written for greenhouses, not apartments.\n\nBloom reads your room — light, humidity, temperature — and tells you exactly what each plant needs. No generic guides. No guilt.\n\nJust plants that actually thrive.",
            "cta": "Try Bloom free",
            "funnel_stage": "awareness",
            "status": "published",
        },
        {
            "content_type": "social_post",
            "platform": "x",
            "title": "Disease Detection Thread",
            "hook": "I pointed my phone at a yellowing leaf. Bloom told me exactly what was killing it.",
            "body": "Here's what happened next:\n\nBloom flagged early-stage root rot. Not 'maybe check the roots.' It said: 'Pythium root rot, 87% confidence. Likely caused by sitting water in the saucer.'\n\nIt gave me a 3-step recovery plan:\n1. Trim the black roots (showed me exactly which ones)\n2. Repot in a fast-draining mix (recommended a specific brand)\n3. Skip watering for 6 days, then resume at 60% of the old schedule\n\n4 weeks later, three new leaves.\n\nThe kicker? I almost threw this plant away the day before I scanned it.",
            "cta": "Download Bloom - link in bio",
            "funnel_stage": "consideration",
            "status": "published",
        },
        {
            "content_type": "social_post",
            "platform": "instagram",
            "title": "Monday Plant Check-in",
            "hook": "Happy Monday, plant parents! Quick 2-minute ritual that changed everything for my collection.",
            "body": "Every Monday morning, before coffee:\n\n1. Walk your shelf. Look at every plant for 5 seconds each.\n2. Touch the soil an inch deep. Dry = water. Damp = wait.\n3. Rotate anyone leaning hard toward the window — quarter turn.\n4. Mist your calatheas and ferns (skip the succulents, they hate it).\n5. Check for new growth. Celebrate it. Literally say 'nice.'\n\nThis took my survival rate from ~60% to 95% in six months.\n\nConsistency beats expertise every single time.",
            "cta": "Save this for next Monday",
            "funnel_stage": "awareness",
            "status": "published",
        },
        {
            "content_type": "social_post",
            "platform": "instagram",
            "title": "Before/After Plant Rescue",
            "hook": "3 months with Bloom: the glow-up is real.",
            "body": "Swipe to see the transformation.\n\nThis fiddle leaf fig was losing a leaf every single week. The owner was ready to put it on the curb.\n\nBloom diagnosed two problems at once:\n- Too much direct afternoon sun (west window, no filter)\n- Watering every Sunday regardless of soil moisture\n\nThe fix: moved it 4 feet from the window. Switched to moisture-based watering. That's it.\n\n12 weeks later: 9 new leaves, zero drops.\n\n2,847 plants rescued this month. This one's our favorite.",
            "cta": "Start your plant's glow-up - free trial in bio",
            "funnel_stage": "consideration",
            "status": "approved",
        },
        {
            "content_type": "social_post",
            "platform": "linkedin",
            "title": "Workspace Plants & Productivity",
            "hook": "Companies with office plants see 15% higher productivity. Here's why most get it wrong.",
            "body": "I've walked into Fortune 500 lobbies with $40,000 living walls that were 30% dead.\n\nThe problem is never budget. It's feedback loops.\n\nNobody in facilities management knows:\n- That the HVAC running 14 hours a day drops humidity to 22%\n- That the trendy ZZ plants by the north windows are fine, but the fiddle leafs by the conference room are starving for light\n- That the cleaning crew's Friday watering schedule is drowning the succulents\n\nWe built Bloom for homes. But enterprise teams started using it to save $15K+/year in plant replacement costs.\n\nOne facilities manager at a 400-person office told me: 'We replaced plants quarterly. Now we haven't replaced one in 8 months.'\n\nThe ROI on not killing plants is surprisingly compelling.",
            "cta": "Bloom for Teams - DM for early access",
            "funnel_stage": "awareness",
            "status": "published",
        },
        {
            "content_type": "ad_copy",
            "platform": "meta",
            "title": "Pain Point: Overwatering",
            "hook": "You're killing your plants with kindness.",
            "body": "Overwatering is the #1 reason houseplants die. Not neglect. Not bugs. Love.\n\nBloom uses your phone's sensors to read light, humidity, and soil conditions — then tells you exactly when to water each plant. Not Tuesday at 9am. When it actually needs it.\n\n97% accurate disease detection. Care schedules that adapt to your apartment, not a greenhouse in Florida.\n\n50,000+ plant parents switched from guessing to growing.",
            "cta": "Start Free Trial",
            "funnel_stage": "awareness",
            "status": "approved",
        },
        {
            "content_type": "ad_copy",
            "platform": "meta",
            "title": "Social Proof Ad",
            "hook": "\"I've kept a fern alive for 6 months. That's a personal record by 5 months.\"",
            "body": "Real review from a real Bloom user. Bloom uses AI to create care schedules personalized to each plant AND your specific environment — your apartment's light, your city's climate, your watering habits.\n\nIt's like having a botanist roommate who never judges you.\n\nRated 4.8/5 across 12,000+ reviews. 50,000+ plants rescued.",
            "cta": "Try Bloom Free",
            "funnel_stage": "consideration",
            "status": "approved",
        },
        {
            "content_type": "social_post",
            "platform": "x",
            "title": "Quick Tip: Light Levels",
            "hook": "\"Bright indirect light\" is the most useless care instruction ever written.",
            "body": "What does it even mean? Every plant tag says it. No plant tag defines it.\n\nHere's the truth: 'bright indirect' means 10,000-20,000 lux. Your north-facing window? 2,000 lux on a good day. That 'bright' corner of your living room? Probably 5,000.\n\nBloom measures actual lux levels through your phone camera and tells you in plain English: 'This spot works for your pothos. Move the orchid closer to the window.'\n\nStop interpreting. Start measuring.",
            "cta": "Check your light levels - free in Bloom",
            "funnel_stage": "awareness",
            "status": "draft",
        },
    ]

    content_ids = []
    for i, c in enumerate(content_data):
        cid = _id()
        content_ids.append(cid)
        db.add(ContentPiece(
            id=cid,
            product_id=DEMO_PRODUCT_ID,
            created_at=_now - (len(content_data) - i) * _day,
            **c,
        ))

    # ── Pain Points ──────────────────────────────────────────────────────────
    pain_points = [
        {"pain_point": "Overwatering kills plants but owners think they're helping", "desired_outcome": "Confidence that every watering is the right amount", "category": "frustration", "severity": 9},
        {"pain_point": "Generic care guides don't account for local conditions", "desired_outcome": "Personalized care that adapts to my exact environment", "category": "frustration", "severity": 8},
        {"pain_point": "Plant diseases go unnoticed until visible damage appears", "desired_outcome": "Early detection before leaves start dropping", "category": "fear", "severity": 8},
        {"pain_point": "Forgetting to water on busy weeks", "desired_outcome": "Automated reminders that actually know when to remind", "category": "frustration", "severity": 7},
        {"pain_point": "Not knowing which plants work for low-light apartments", "desired_outcome": "Curated plant recommendations for my specific space", "category": "confusion", "severity": 6},
    ]

    pain_point_ids = []
    for pp in pain_points:
        ppid = _id()
        pain_point_ids.append(ppid)
        db.add(PainPoint(id=ppid, product_id=DEMO_PRODUCT_ID, **pp))

    # ── Ad Variations ────────────────────────────────────────────────────────
    batch_id = _id()
    template_id = _id()
    db.add(AdTemplate(
        id=template_id,
        product_id=DEMO_PRODUCT_ID,
        name="Problem-Agitate-Solve",
        template_type="PAS",
        layout_config=json.dumps({"structure": ["pain_point", "agitation", "solution", "cta"]}),
    ))

    ad_variations = [
        {"headline": "Stop Overwatering Your Plants", "body": "You water with love. Your plant still dies. Bloom's AI knows exactly when each plant needs water - not a day too early, not a day too late.", "cta": "Try Free", "pain_point_idx": 0, "status": "live", "performance_score": 8.2},
        {"headline": "Your Plant Care Guide Is Wrong", "body": "Care guides assume you live in a greenhouse. You don't. Bloom adapts to YOUR home - your light, your humidity, your schedule.", "cta": "Get Bloom", "pain_point_idx": 1, "status": "live", "performance_score": 7.5},
        {"headline": "Catch Plant Disease Before It Spreads", "body": "By the time you see yellow leaves, the damage is done. Bloom's AI camera detects 200+ plant diseases at the earliest stage.", "cta": "Scan Free", "pain_point_idx": 2, "status": "live", "performance_score": 9.1},
        {"headline": "Never Forget to Water Again", "body": "Bloom tracks soil moisture and sends smart reminders. Not generic weekly alerts - actual 'your monstera needs water TODAY' notifications.", "cta": "Download Free", "pain_point_idx": 3, "status": "approved", "performance_score": 6.8},
    ]

    ad_var_ids = []
    for av in ad_variations:
        avid = _id()
        ad_var_ids.append(avid)
        db.add(AdVariation(
            id=avid,
            product_id=DEMO_PRODUCT_ID,
            batch_id=batch_id,
            template_id=template_id,
            pain_point_id=pain_point_ids[av["pain_point_idx"]],
            headline=av["headline"],
            body=av["body"],
            cta=av["cta"],
            status=av["status"],
            performance_score=av["performance_score"],
        ))

    # ── Campaign ─────────────────────────────────────────────────────────────
    campaign_id = _id()
    db.add(Campaign(
        id=campaign_id,
        product_id=DEMO_PRODUCT_ID,
        platform="meta",
        name="Spring Plant Season - Awareness",
        objective="traffic",
        status="active",
        daily_budget=25.0,
        total_spend=312.50,
        targeting_config=json.dumps({
            "age_range": "25-38",
            "interests": ["houseplants", "gardening", "home decor", "sustainability"],
            "locations": ["US", "CA", "UK", "AU"],
        }),
        destination_url="https://getbloom.example/start",
        start_date=_now - 12 * _day,
    ))

    for avid in ad_var_ids[:3]:
        db.add(CampaignAdVariation(
            id=_id(),
            campaign_id=campaign_id,
            ad_variation_id=avid,
            status="active",
        ))

    # ── Fake Platform Connection (for schedule display) ──────────────────────
    conn_x_id = _id()
    conn_ig_id = _id()
    db.add(PlatformConnection(
        id=conn_x_id,
        product_id=DEMO_PRODUCT_ID,
        platform="x",
        platform_account_name="@BloomPlantApp",
        access_token="demo_token",
        status="active",
    ))
    db.add(PlatformConnection(
        id=conn_ig_id,
        product_id=DEMO_PRODUCT_ID,
        platform="instagram",
        platform_account_name="@bloom.plants",
        access_token="demo_token",
        status="active",
    ))

    # ── Scheduled Posts ──────────────────────────────────────────────────────
    for i, cid in enumerate(content_ids[:4]):
        db.add(ScheduledPost(
            id=_id(),
            content_id=cid,
            connection_id=conn_x_id if i % 2 == 0 else conn_ig_id,
            scheduled_at=_now + (i + 1) * _day + 9 * _hour,
            status="scheduled" if i > 1 else "posted",
            posted_at=(_now - (2 - i) * _day) if i <= 1 else None,
            platform_post_id=f"demo_{i}" if i <= 1 else None,
        ))

    # ── Performance Metrics ──────────────────────────────────────────────────
    metrics_data = [
        {"platform": "x", "impressions": 14200, "clicks": 412, "likes": 287, "shares": 63, "comments": 41, "ctr": 2.9, "content_idx": 0},
        {"platform": "x", "impressions": 8900, "clicks": 234, "likes": 198, "shares": 45, "comments": 28, "ctr": 2.6, "content_idx": 1},
        {"platform": "instagram", "impressions": 22400, "clicks": 890, "likes": 1420, "shares": 210, "comments": 94, "ctr": 3.97, "content_idx": 2},
        {"platform": "instagram", "impressions": 18100, "clicks": 670, "likes": 1100, "shares": 180, "comments": 72, "ctr": 3.7, "content_idx": 3},
        {"platform": "linkedin", "impressions": 5600, "clicks": 189, "likes": 142, "shares": 38, "comments": 21, "ctr": 3.4, "content_idx": 4},
        {"platform": "meta", "impressions": 45000, "clicks": 1350, "likes": 0, "shares": 0, "comments": 0, "ctr": 3.0, "spend": 87.50, "conversions": 42, "content_idx": 5},
        {"platform": "meta", "impressions": 38000, "clicks": 1140, "likes": 0, "shares": 0, "comments": 0, "ctr": 3.0, "spend": 72.00, "conversions": 35, "content_idx": 6},
    ]

    for j, m in enumerate(metrics_data):
        cidx = m.pop("content_idx")
        db.add(PerformanceMetric(
            id=_id(),
            content_id=content_ids[cidx] if cidx < len(content_ids) else None,
            collected_at=_now - (len(metrics_data) - j) * _day,
            **m,
        ))

    # ── Seed Bank ────────────────────────────────────────────────────────────
    seeds = [
        {
            "seed": "People treat plant care like a binary - alive or dead. But there's a whole spectrum of 'thriving' that most plant owners never reach.",
            "heat": json.dumps(["high engagement potential", "relatable insight", "thread-worthy"]),
            "audience_hook": "Every plant owner who's said 'at least it's not dead' needs to hear this",
            "template_fit": "A",
            "weekly_theme": "Redefining Plant Success",
            "verdict": "Strong enough to build on",
            "source": "voice_memo",
            "status": "developing",
            "priority": 8,
        },
        {
            "seed": "The houseplant industry sells you the plant but not the knowledge. It's like selling someone a puppy with no care instructions.",
            "heat": json.dumps(["provocative angle", "industry critique", "shareable"]),
            "audience_hook": "Hot take that plant shops don't want you to hear",
            "template_fit": "B",
            "weekly_theme": "The Knowledge Gap",
            "verdict": "Strong enough to build on",
            "source": "voice_memo",
            "status": "parked",
            "priority": 7,
        },
        {
            "seed": "What if your plant could text you? That's basically what Bloom's notification system does - but backed by actual soil science.",
            "heat": json.dumps(["fun concept", "product tie-in", "visual potential"]),
            "audience_hook": "Imagine getting a DM from your monstera",
            "template_fit": "A",
            "weekly_theme": "Smart Home Meets Green Home",
            "verdict": "Strong enough to build on",
            "source": "voice_memo",
            "status": "parked",
            "priority": 6,
        },
    ]

    for s in seeds:
        db.add(Seed(id=_id(), product_id=DEMO_PRODUCT_ID, **s))

    # ── Trend Signals ────────────────────────────────────────────────────────
    trends = [
        {
            "title": "#PlantTok reaches 4.2B views",
            "summary": "Plant content on TikTok continues explosive growth. Short-form plant care tips and plant rescue videos drive highest engagement.",
            "source_type": "social_trend",
            "category": "content_format",
            "relevance_score": 9.2,
            "momentum": "rising",
            "volume": 4200,
            "status": "actionable",
            "suggested_angle": "Create short-form Bloom diagnosis videos showing instant plant disease identification",
        },
        {
            "title": "Indoor air quality awareness spike",
            "summary": "Post-pandemic interest in indoor air quality drives search volume for air-purifying plants up 34% YoY.",
            "source_type": "search_trend",
            "category": "market_shift",
            "relevance_score": 7.8,
            "momentum": "rising",
            "volume": 890,
            "status": "new",
            "suggested_angle": "Position Bloom as the tool that helps you choose AND maintain the best air-purifying plants for your space",
        },
    ]

    for t in trends:
        db.add(TrendSignal(id=_id(), product_id=DEMO_PRODUCT_ID, **t))

    # ── Hook Patterns ────────────────────────────────────────────────────────
    hooks = [
        {
            "pattern_name": "Counterintuitive Truth",
            "pattern_type": "contrarian",
            "description": "Challenge a common belief with data or unexpected insight",
            "example": "Your plant isn't thirsty. It's drowning.",
            "template": "[Common belief]. Actually, [surprising truth].",
            "source_platform": "x",
            "engagement_score": 8.7,
            "times_used": 3,
            "avg_performance": 2.8,
        },
        {
            "pattern_name": "Relatable Confession",
            "pattern_type": "vulnerability",
            "description": "Admit something the audience secretly relates to",
            "example": "I've killed 4 succulents. They're supposed to be unkillable.",
            "template": "I've [embarrassing plant fail]. [Why it's actually common].",
            "source_platform": "instagram",
            "engagement_score": 8.2,
            "times_used": 5,
            "avg_performance": 3.4,
        },
        {
            "pattern_name": "Specific Number",
            "pattern_type": "data_hook",
            "description": "Lead with a surprising statistic to stop the scroll",
            "example": "90% of houseplant deaths are caused by overwatering, not neglect.",
            "template": "[X]% of [audience] [surprising behavior/outcome].",
            "source_platform": "linkedin",
            "engagement_score": 7.9,
            "times_used": 2,
            "avg_performance": 3.1,
        },
    ]

    for h in hooks:
        db.add(HookPattern(id=_id(), product_id=DEMO_PRODUCT_ID, **h))

    # ── More Seeds (fill Seed Bank page) ────────────────────────────────────
    more_seeds = [
        {
            "seed": "Nobody talks about the grief of killing a plant. It's real. You invested time, money, hope. Then one day it's just... crispy.",
            "heat": json.dumps(["emotional resonance", "viral potential", "relatable"]),
            "audience_hook": "Every plant parent who's quietly mourned a fern",
            "template_fit": "C",
            "weekly_theme": "The Emotional Side of Plant Care",
            "verdict": "Strong enough to build on",
            "source": "voice_memo",
            "status": "developing",
            "priority": 9,
        },
        {
            "seed": "Your grandma kept plants alive for 40 years without an app. But she also had sunlight, patience, and didn't live in a north-facing studio apartment.",
            "heat": json.dumps(["generational humor", "sets up product need"]),
            "audience_hook": "The 'my grandma could do it why can't I' crowd",
            "template_fit": "D",
            "weekly_theme": "Modern Plant Parenting",
            "verdict": "Strong enough to build on",
            "source": "voice_memo",
            "status": "developing",
            "priority": 8,
        },
        {
            "seed": "Plant influencers make it look effortless. 200 plants, perfect light, zero brown tips. They don't show you the grow lights, the humidifiers, the 6am misting routine.",
            "heat": json.dumps(["behind the curtain", "relatable frustration"]),
            "audience_hook": "Anyone who's felt inadequate scrolling #PlantTok",
            "template_fit": "A",
            "weekly_theme": "Reality vs. Instagram",
            "verdict": "Strong enough to build on",
            "source": "voice_memo",
            "status": "parked",
            "priority": 7,
        },
        {
            "seed": "The best thing about plants is they don't care about your productivity system. They just need water, light, and to be left alone. Maybe we should take notes.",
            "heat": json.dumps(["philosophical angle", "crossover audience"]),
            "audience_hook": "Burnout crowd meets plant crowd",
            "template_fit": "A",
            "weekly_theme": "Plants as Self-Care",
            "verdict": "Strong enough to build on",
            "source": "voice_memo",
            "status": "parked",
            "priority": 6,
        },
        {
            "seed": "I ran the numbers: Americans spend $2.3B on houseplants annually but only $47M on plant care education. That's a 50:1 ratio of buying to learning.",
            "heat": json.dumps(["data-driven", "industry insight", "LinkedIn gold"]),
            "audience_hook": "The shocking economics of the houseplant industry",
            "template_fit": "B",
            "weekly_theme": "The Knowledge Gap",
            "verdict": "Strong enough to build on",
            "source": "research",
            "status": "developing",
            "priority": 8,
        },
        {
            "seed": "What if we positioned Bloom not as a plant app but as a 'home environment sensor' that happens to keep plants alive? The data we collect about light, humidity, temp is valuable beyond plants.",
            "heat": json.dumps(["strategic pivot", "product vision", "internal"]),
            "audience_hook": "For the team - product positioning brainstorm",
            "template_fit": "B",
            "weekly_theme": "Product Strategy",
            "verdict": "Needs sharpening",
            "source": "voice_memo",
            "status": "parked",
            "priority": 5,
        },
        {
            "seed": "Got a DM from a user: 'Bloom saved my late mother's orchid. It's the only living thing I have left from her.' This is why we build.",
            "heat": json.dumps(["emotional story", "testimonial", "brand moment"]),
            "audience_hook": "The emotional connection people have with inherited plants",
            "template_fit": "C",
            "weekly_theme": "Why We Build",
            "verdict": "Strong enough to build on",
            "source": "user_feedback",
            "status": "used",
            "priority": 10,
        },
        {
            "seed": "Controversial take: most plant subscription boxes are a scam. They send you plants that won't survive your conditions. Bloom should do a 'right plant for your space' recommendation engine.",
            "heat": json.dumps(["hot take", "product feature idea"]),
            "audience_hook": "Frustrated subscription box customers",
            "template_fit": "D",
            "weekly_theme": "Industry Disruption",
            "verdict": "Strong enough to build on",
            "source": "voice_memo",
            "status": "parked",
            "priority": 6,
        },
    ]

    for s in more_seeds:
        db.add(Seed(id=_id(), product_id=DEMO_PRODUCT_ID, **s))

    # ── Competitors (Intelligence page) ─────────────────────────────────────
    competitors = [
        {
            "name": "Planta",
            "website_url": "https://getplanta.com",
            "social_urls": json.dumps({"x": "@plaborPlanta", "instagram": "@getplanta"}),
            "description": "Freemium plant care app. Strong on reminders, weak on disease detection. 2M+ downloads.",
            "ad_count": 12,
            "longest_running_ad": json.dumps({"copy": "Never forget to water again. Smart reminders for every plant.", "first_seen": "2025-11-01", "days_active": 145}),
            "latest_snapshot": json.dumps({"headlines": ["Smart plant care", "Your plants will thank you"], "messaging_angles": ["convenience", "simplicity"], "ctas": ["Download Free", "Try Premium"]}),
        },
        {
            "name": "Greg",
            "website_url": "https://greg.app",
            "social_urls": json.dumps({"x": "@gregapp", "instagram": "@greg.app"}),
            "description": "Community-first plant app. Crowd-sourced care schedules. Strong Reddit presence but weaker tech.",
            "ad_count": 8,
            "longest_running_ad": json.dumps({"copy": "Join 1M+ plant parents. Care schedules that actually work.", "first_seen": "2025-09-15", "days_active": 192}),
            "latest_snapshot": json.dumps({"headlines": ["Community-powered plant care", "1M plants can't be wrong"], "messaging_angles": ["community", "social proof"], "ctas": ["Join Free", "See My Plants"]}),
        },
        {
            "name": "PictureThis",
            "website_url": "https://picturethisai.com",
            "social_urls": json.dumps({"x": "@PictureThisAI", "instagram": "@picturethisai"}),
            "description": "Plant ID leader. 100M+ downloads. Strong brand recognition but perceived as one-trick (ID only).",
            "ad_count": 24,
            "longest_running_ad": json.dumps({"copy": "Identify any plant instantly. Just snap a photo.", "first_seen": "2025-06-01", "days_active": 300}),
            "latest_snapshot": json.dumps({"headlines": ["Identify any plant", "What's that plant?"], "messaging_angles": ["curiosity", "instant answers"], "ctas": ["Snap to Identify", "Download Free"]}),
        },
    ]

    for comp in competitors:
        db.add(CompetitorProfile(id=_id(), product_id=DEMO_PRODUCT_ID, last_crawled_at=_now - 2 * _day, **comp))

    # ── Evidence Items (Intelligence page) ──────────────────────────────────
    evidence = [
        {"claim": "97% disease detection accuracy", "evidence_text": "Internal validation across 50,000 labeled plant images. Published methodology on blog.", "evidence_type": "benchmark", "source_name": "Bloom Internal Study", "credibility_score": 0.85, "freshness": "fresh", "verified": True, "times_used": 12},
        {"claim": "50,000+ active plant parents", "evidence_text": "Monthly active users as of March 2026. Includes free and paid tiers.", "evidence_type": "statistic", "source_name": "Bloom Analytics", "credibility_score": 0.95, "freshness": "fresh", "verified": True, "times_used": 8},
        {"claim": "Plants with reminders are 3.2x more likely to survive first year", "evidence_text": "Compared survival rates of plants with vs without scheduled care reminders across 12,000 user-tracked plants.", "evidence_type": "study", "source_name": "Bloom Data Science", "credibility_score": 0.8, "freshness": "fresh", "verified": True, "times_used": 5},
        {"claim": "Overwatering causes 90% of houseplant deaths", "evidence_text": "Royal Horticultural Society research on common houseplant mortality causes.", "evidence_type": "study", "source_name": "RHS", "source_url": "https://rhs.org.uk/research", "credibility_score": 0.9, "freshness": "recent", "verified": True, "times_used": 15},
        {"claim": "Indoor plants reduce stress by 37%", "evidence_text": "University of Hyogo study: active interaction with houseplants reduces psychological and physiological stress.", "evidence_type": "study", "source_name": "Journal of Physiological Anthropology", "credibility_score": 0.88, "freshness": "recent", "verified": True, "times_used": 3},
        {"claim": "Rated 4.8/5 across 12,000+ reviews", "evidence_text": "Aggregate rating across App Store (4.8, 8.4K reviews) and Play Store (4.7, 3.6K reviews).", "evidence_type": "review", "source_name": "App Store / Play Store", "credibility_score": 0.95, "freshness": "fresh", "verified": True, "times_used": 10},
        {"claim": "Office plants boost productivity 15%", "evidence_text": "University of Exeter study: enriched office spaces with plants increase productivity by 15%.", "evidence_type": "study", "source_name": "University of Exeter", "credibility_score": 0.85, "freshness": "dated", "verified": True, "times_used": 4},
        {"claim": "Plant replacement costs cut by 60%", "evidence_text": "Case study: 400-person tech company reduced quarterly plant replacement budget from $2,400 to $960 using Bloom for Teams.", "evidence_type": "testimonial", "source_name": "Bloom Case Study", "credibility_score": 0.75, "freshness": "fresh", "verified": False, "times_used": 2},
    ]

    for ev in evidence:
        db.add(EvidenceItem(id=_id(), product_id=DEMO_PRODUCT_ID, **ev))

    # ── Intelligence Brief (Intelligence page) ──────────────────────────────
    db.add(IntelligenceBrief(
        id=_id(),
        product_id=DEMO_PRODUCT_ID,
        title="Weekly Intelligence Brief — Week of March 24, 2026",
        period="weekly",
        summary="Strong week for organic content. Instagram carousel on plant rescue outperformed all paid ads. Competitor Planta launched a new 'Plant Scanner' feature that overlaps with our disease detection — monitor closely. #PlantTok trend continues to accelerate.",
        whats_working=json.dumps([
            {"insight": "Instagram carousels drive 3.4x more saves than single images", "data_point": "Avg 210 saves vs 62 for static posts", "recommendation": "Shift 60% of Instagram content to carousel format"},
            {"insight": "Pain-point-first hooks outperform benefit-first by 2.1x on X", "data_point": "2.9% CTR vs 1.4% CTR", "recommendation": "Lead with frustration, solve with product"},
            {"insight": "LinkedIn posts about office plants get 4x the engagement of personal plant posts", "data_point": "5,600 impressions avg vs 1,400", "recommendation": "Double down on B2B angle for LinkedIn"},
        ]),
        competitor_moves=json.dumps([
            {"competitor": "Planta", "action": "Launched Plant Scanner with AR overlay", "implication": "Direct competition with our disease detection. Their accuracy is likely lower but UX is flashy."},
            {"competitor": "Greg", "action": "Hit 1M users milestone, heavy PR push", "implication": "Community angle gaining traction. Consider community features in roadmap."},
            {"competitor": "PictureThis", "action": "Running $200K+/month in Meta ads", "implication": "They're buying growth aggressively. We should focus on organic + targeted paid."},
        ]),
        creative_recommendations=json.dumps([
            {"format": "Short-form video (15s plant rescue)", "reason": "#PlantTok trending, our rescue content resonates", "expected_impact": "3-5x reach vs static"},
            {"format": "Carousel: 5 plants you're definitely overwatering", "reason": "Listicles drive saves, saves drive algorithm", "expected_impact": "200+ saves per post"},
            {"format": "LinkedIn case study: office plant ROI", "reason": "B2B angle underexplored, high-value audience", "expected_impact": "Leads for Bloom for Teams"},
        ]),
        next_actions=json.dumps([
            {"action": "Create 3 plant rescue reels this week", "priority": "high", "rationale": "Capitalize on #PlantTok momentum"},
            {"action": "Monitor Planta Plant Scanner reviews", "priority": "medium", "rationale": "Understand accuracy claims and user sentiment"},
            {"action": "Draft LinkedIn case study from office customer data", "priority": "medium", "rationale": "B2B pipeline needs content"},
        ]),
        status="published",
        created_at=_now - 3 * _day,
    ))

    # ── More Trend Signals ────────────────────────────────────────────────────
    more_trends = [
        {"title": "\"Plant parent\" identity becoming mainstream", "summary": "Term 'plant parent' now used unironically in mainstream media. 2.1M Instagram posts. Identity-driven marketing outperforms feature-driven.", "source_type": "social_trend", "category": "audience_behavior", "relevance_score": 8.5, "momentum": "stable", "volume": 2100, "status": "actionable", "suggested_angle": "Lean into 'plant parent' identity in all copy. They don't want a tool, they want validation."},
        {"title": "Reddit r/plantclinic hits 1.5M members", "summary": "Fastest-growing plant subreddit. Users post sick plant photos asking for diagnosis — exactly what Bloom does automatically.", "source_type": "community_growth", "category": "market_shift", "relevance_score": 9.0, "momentum": "rising", "volume": 1500, "status": "actionable", "suggested_angle": "Target r/plantclinic users with 'instant diagnosis' messaging. They already want what we offer."},
        {"title": "Sustainability-driven plant buying up 28% YoY", "summary": "Consumers increasingly choose plants for air quality + sustainability signaling. 'Green home' is the new 'smart home'.", "source_type": "market_research", "category": "market_shift", "relevance_score": 7.2, "momentum": "rising", "volume": 650, "status": "new", "suggested_angle": "Add sustainability angle to ad copy. 'A greener home, literally.'"},
        {"title": "Short-form plant rescue content dominating Reels", "summary": "Before/after plant rescue videos averaging 2-5x more engagement than care tip posts. Raw, authentic style outperforms polished.", "source_type": "content_analysis", "category": "content_format", "relevance_score": 8.8, "momentum": "rising", "volume": 3200, "status": "actionable", "suggested_angle": "Shift Instagram strategy to rescue-format reels. Raw phone footage, not produced."},
    ]

    for t in more_trends:
        db.add(TrendSignal(id=_id(), product_id=DEMO_PRODUCT_ID, **t))

    # ── More Hook Patterns ──────────────────────────────────────────────────
    more_hooks = [
        {"pattern_name": "Permission to Fail", "pattern_type": "empathy", "description": "Give the audience permission to not be perfect", "example": "You don't need a green thumb. You need better data.", "template": "You don't need [perceived requirement]. You need [what you actually offer].", "source_platform": "instagram", "engagement_score": 8.5, "times_used": 4, "avg_performance": 3.2},
        {"pattern_name": "Before/After Reveal", "pattern_type": "transformation", "description": "Show dramatic transformation to create curiosity", "example": "3 months ago this fiddle leaf was dying. Swipe to see it now.", "template": "[Time ago] this [subject] was [bad state]. [Action to reveal].", "source_platform": "instagram", "engagement_score": 9.1, "times_used": 6, "avg_performance": 4.1},
        {"pattern_name": "Myth Buster", "pattern_type": "contrarian", "description": "Challenge widely-held belief with authority", "example": "Everything you know about watering succulents is wrong.", "template": "Everything you know about [topic] is wrong.", "source_platform": "x", "engagement_score": 8.0, "times_used": 2, "avg_performance": 2.9},
        {"pattern_name": "Insider Knowledge", "pattern_type": "authority", "description": "Share info that feels exclusive or expert-level", "example": "Plant shops won't tell you this: 70% of the plants they sell will die in your home.", "template": "[Authority] won't tell you this: [insider truth].", "source_platform": "x", "engagement_score": 8.9, "times_used": 3, "avg_performance": 3.6},
        {"pattern_name": "Simple Math", "pattern_type": "data_hook", "description": "Use simple arithmetic to make a compelling point", "example": "$40 plant + $0 care knowledge = $40 dead plant. Do the math.", "template": "$[cost] [thing] + $[cost] [missing piece] = [bad outcome]. Do the math.", "source_platform": "linkedin", "engagement_score": 7.6, "times_used": 1, "avg_performance": 2.7},
    ]

    for h in more_hooks:
        db.add(HookPattern(id=_id(), product_id=DEMO_PRODUCT_ID, **h))

    # ── Intelligence Config ─────────────────────────────────────────────────
    db.add(IntelligenceConfig(
        id=_id(),
        product_id=DEMO_PRODUCT_ID,
        competitor_monitoring_enabled=True,
        trend_detection_enabled=True,
        hook_analysis_enabled=True,
        evidence_gathering_enabled=True,
        weekly_brief_enabled=True,
        niche_keywords=json.dumps(["houseplant care", "plant app", "indoor gardening", "plant identification", "plant disease"]),
        subreddits=json.dumps(["r/houseplants", "r/plantclinic", "r/IndoorGarden", "r/proplifting"]),
        x_accounts_to_watch=json.dumps(["@getplanta", "@gregapp", "@PictureThisAI", "@TheSill", "@bloomscape"]),
        industry_vertical="consumer/plant-care",
        last_competitor_scan_at=_now - 2 * _day,
        last_trend_scan_at=_now - 1 * _day,
        last_hook_analysis_at=_now - 3 * _day,
        last_evidence_refresh_at=_now - 5 * _day,
        last_brief_generated_at=_now - 3 * _day,
    ))

    # ── Agent Logs (Agent page) ────────────────────────────────────────────
    agent_logs = [
        {"action_type": "content_generated", "resource_type": "content_piece", "details": json.dumps({"product": "Bloom", "count": 5, "platforms": ["x", "instagram"], "model": "claude-sonnet-4-6"}), "created_at": _now - 6 * _day},
        {"action_type": "content_generated", "resource_type": "content_piece", "details": json.dumps({"product": "Bloom", "count": 3, "platforms": ["linkedin", "meta"], "model": "claude-sonnet-4-6"}), "created_at": _now - 5 * _day},
        {"action_type": "campaign_created", "resource_type": "campaign", "details": json.dumps({"campaign": "Spring Plant Season", "platform": "meta", "budget": 25.0}), "approval_required": True, "approved": True, "approved_at": _now - 4 * _day, "created_at": _now - 5 * _day},
        {"action_type": "performance_ingested", "resource_type": "metrics", "details": json.dumps({"posts_tracked": 7, "impressions_total": 152200, "clicks_total": 4885}), "created_at": _now - 3 * _day},
        {"action_type": "optimization_run", "resource_type": "ad_variation", "details": json.dumps({"winner": "Catch Plant Disease Before It Spreads", "winner_ctr": 3.8, "paused": 1, "promoted": 1}), "created_at": _now - 2 * _day},
        {"action_type": "guardrail_triggered", "resource_type": "safety", "details": json.dumps({"rule": "max_daily_spend", "threshold": 50.0, "actual": 52.30, "action": "paused campaign"}), "created_at": _now - 1 * _day},
        {"action_type": "content_generated", "resource_type": "content_piece", "details": json.dumps({"product": "Bloom", "count": 7, "platforms": ["x", "instagram", "linkedin"], "weekly_cycle": True}), "created_at": _now - 12 * _hour},
        {"action_type": "intelligence_scan", "resource_type": "intelligence", "details": json.dumps({"competitors_scanned": 3, "trends_found": 2, "hooks_analyzed": 8, "brief_generated": True}), "created_at": _now - 6 * _hour},
    ]

    for al in agent_logs:
        db.add(AgentLog(id=_id(), **al))

    # ── Safety Guardrails (Agent page) ──────────────────────────────────────
    guardrails = [
        {"rule_type": "max_daily_spend", "threshold_value": 50.0, "action": "pause", "cooldown_hours": 24},
        {"rule_type": "max_cpm", "threshold_value": 30.0, "action": "alert", "cooldown_hours": 12},
        {"rule_type": "min_ctr", "threshold_value": 0.5, "action": "pause", "cooldown_hours": 48},
        {"rule_type": "max_posts_per_day", "threshold_value": 5.0, "action": "block", "cooldown_hours": 24},
    ]

    for g in guardrails:
        db.add(SafetyGuardrail(id=_id(), product_id=DEMO_PRODUCT_ID, **g))

    # ── Optimization Config + Logs (Optimizer page) ─────────────────────────
    db.add(OptimizationConfig(
        id=_id(),
        product_id=DEMO_PRODUCT_ID,
        min_impressions=500,
        max_cpm=30.0,
        min_ctr=0.5,
        winner_ctr_threshold=2.0,
        winner_budget_multiplier=2.0,
        check_interval_hours=6,
        enabled=True,
        auto_iterate=True,
        max_iterations=10,
        iterations_run=3,
    ))

    opt_logs = [
        {"action": "promoted", "reason": "CTR 3.8% exceeds winner threshold of 2.0%. Doubling daily budget.", "ad_variation_id": ad_var_ids[2] if len(ad_var_ids) > 2 else None, "metrics_snapshot": json.dumps({"impressions": 12400, "clicks": 471, "ctr": 3.8, "spend": 38.20}), "created_at": _now - 5 * _day},
        {"action": "paused", "reason": "CTR 0.3% below minimum threshold after 1,200 impressions.", "ad_variation_id": ad_var_ids[3] if len(ad_var_ids) > 3 else None, "metrics_snapshot": json.dumps({"impressions": 1200, "clicks": 4, "ctr": 0.3, "spend": 8.40}), "created_at": _now - 4 * _day},
        {"action": "promoted", "reason": "CTR 2.9% strong performer. Increasing budget 1.5x.", "ad_variation_id": ad_var_ids[0] if len(ad_var_ids) > 0 else None, "metrics_snapshot": json.dumps({"impressions": 8900, "clicks": 258, "ctr": 2.9, "spend": 28.50}), "created_at": _now - 2 * _day},
        {"action": "iteration_complete", "reason": "Round 3 complete. 2 winners, 1 paused. Overall CTR improved 1.8% to 3.2%.", "metrics_snapshot": json.dumps({"round": 3, "avg_ctr": 3.2, "total_spend": 312.50, "conversions": 77}), "created_at": _now - 1 * _day},
    ]

    for ol in opt_logs:
        db.add(OptimizationLog(id=_id(), product_id=DEMO_PRODUCT_ID, **ol))

    # ── Autonomous Loop Config (Agent page) ─────────────────────────────────
    db.add(AutonomousLoopConfig(
        id=_id(),
        product_id=DEMO_PRODUCT_ID,
        content_loop_enabled=True,
        ad_loop_enabled=True,
        feedback_loop_enabled=True,
        auto_publish_social=False,
        max_content_per_cycle=7,
        max_ads_per_cycle=10,
        active_platforms=json.dumps(["x", "instagram", "linkedin", "meta"]),
        preferred_post_times=json.dumps({"x": "09:00", "instagram": "12:00", "linkedin": "08:00"}),
        timezone="America/New_York",
        max_autonomous_daily_budget=50.0,
        winning_ctr_threshold=2.0,
        total_cycles_run=14,
        last_content_cycle_at=_now - 12 * _hour,
        last_ad_cycle_at=_now - 1 * _day,
        last_feedback_cycle_at=_now - 6 * _hour,
    ))

    # ── Content Prompt Set (Brand & Voice enrichment) ───────────────────────
    db.add(ContentPromptSet(
        id=_id(),
        product_id=DEMO_PRODUCT_ID,
        voice_rules="Write like a knowledgeable friend who happens to be a botanist. Never condescending. Always specific. Use data when available, anecdotes when not. Short sentences for hooks, longer for explanations.",
        idea_sharpener_prompt="Take this raw idea and find the ONE specific, surprising angle that would stop scrolling. Ground it in a real number, a real story, or a counterintuitive truth. Kill the generic.",
        template_instructions=json.dumps({
            "A": "Reflective essay. Personal observation to insight to takeaway. 200-300 words.",
            "B": "Practical guide. Problem, 3-5 steps, encouragement. Numbered lists. Be specific.",
            "C": "Personal story. Start in the action. Build emotion. Product as natural solution.",
            "D": "Quick hit. One sharp insight under 50 words. Fortune cookie meets plant science.",
        }),
        social_post_rules="X hooks max 280 chars. Instagram: hook first line, body next paragraph, CTA at end. LinkedIn: professional but warm, tie to business value.",
        x_thread_rules="Thread starter = most provocative take. Each tweet stands alone. 5-8 tweets max. End with CTA.",
        weekly_mix=json.dumps(["2x awareness", "2x consideration", "1x conversion", "1x community", "1x educational"]),
        system_prompt_intro="You are the voice of Bloom — an AI-powered plant care app. Warm, specific, data-informed, never condescending.",
    ))

    # ── More Performance Metrics (Analytics + Command Center) ───────────────
    more_metrics = [
        {"platform": "x", "impressions": 6200, "clicks": 186, "likes": 124, "shares": 31, "comments": 18, "ctr": 3.0, "content_idx": 7},
        {"platform": "meta", "impressions": 32000, "clicks": 960, "spend": 62.40, "conversions": 28, "ctr": 3.0, "content_idx": 5},
        {"platform": "instagram", "impressions": 28500, "clicks": 1140, "likes": 1890, "shares": 340, "comments": 112, "ctr": 4.0, "content_idx": 2},
        {"platform": "x", "impressions": 19800, "clicks": 594, "likes": 410, "shares": 89, "comments": 56, "ctr": 3.0, "content_idx": 0},
        {"platform": "linkedin", "impressions": 7800, "clicks": 312, "likes": 198, "shares": 52, "comments": 34, "ctr": 4.0, "content_idx": 4},
    ]

    for m in more_metrics:
        cidx = m.pop("content_idx")
        db.add(PerformanceMetric(
            id=_id(),
            content_id=content_ids[cidx] if cidx < len(content_ids) else None,
            collected_at=_now - 1 * _day,
            **m,
        ))

    # ── Additional Platform Connection (LinkedIn) ───────────────────────────
    db.add(PlatformConnection(
        id=_id(),
        product_id=DEMO_PRODUCT_ID,
        platform="linkedin",
        platform_account_name="Bloom Plant Care",
        access_token="demo_token",
        status="active",
    ))

    db.commit()
