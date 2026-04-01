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
    ContentPiece,
    HookPattern,
    PainPoint,
    PerformanceMetric,
    PlatformConnection,
    Product,
    ScheduledPost,
    Seed,
    TrendSignal,
)

DEMO_PRODUCT_ID = "demo-00000000-0000-0000-0000-000000000001"
DEMO_WORKSPACE_SLUG = "default"

_now = datetime.now(timezone.utc)
_day = timedelta(days=1)
_hour = timedelta(hours=1)


def _id():
    return str(uuid.uuid4())


def seed_demo_data(db: Session, workspace_id: str | None):
    """Seed demo product and content. Idempotent - skips if demo product exists."""
    existing = db.query(Product).filter(Product.id == DEMO_PRODUCT_ID).first()
    if existing:
        return

    # ── Demo Product ─────────────────────────────────────────────────────────
    product = Product(
        id=DEMO_PRODUCT_ID,
        workspace_id=workspace_id,
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
            "title": "Overwatering Awareness",
            "hook": "Your plant isn't thirsty. It's drowning.",
            "body": "90% of houseplant deaths come from overwatering, not neglect.\n\nBloom's moisture sensor tells you exactly when your plant actually needs water - down to the hour.\n\nStop guessing. Start growing.",
            "cta": "Try Bloom free for 14 days",
            "funnel_stage": "awareness",
            "status": "published",
        },
        {
            "content_type": "social_post",
            "platform": "x",
            "title": "Disease Detection Thread",
            "hook": "I pointed my phone at a yellowing leaf and Bloom diagnosed root rot in 3 seconds.",
            "body": "Here's what happened next:\n\n1. Bloom told me exactly which roots to trim\n2. Recommended a recovery soil mix\n3. Set up a custom watering schedule for rehab\n\n4 weeks later? New growth everywhere.\n\nPlant ER, right in your pocket.",
            "cta": "Download Bloom - link in bio",
            "funnel_stage": "consideration",
            "status": "published",
        },
        {
            "content_type": "social_post",
            "platform": "instagram",
            "title": "Monday Plant Check-in",
            "hook": "Monday morning plant check-in 🌿",
            "body": "Happy Monday, plant parents!\n\nQuick 2-minute ritual that keeps your plants thriving all week:\n\n1. Walk your plant shelf\n2. Check soil moisture (or let Bloom do it)\n3. Rotate any that are leaning toward the light\n4. Mist your tropical babies\n\nSmall habits, big growth. Literally.",
            "cta": "Save this for next Monday",
            "funnel_stage": "awareness",
            "status": "published",
        },
        {
            "content_type": "social_post",
            "platform": "instagram",
            "title": "Before/After Plant Rescue",
            "hook": "3 months with Bloom: the glow-up is real 🪴✨",
            "body": "Swipe to see the transformation.\n\nThis fiddle leaf fig was dropping leaves every week. The owner was ready to give up.\n\nBloom diagnosed: too much direct sun + inconsistent watering.\n\nThe fix took 10 minutes to set up. Nature did the rest.\n\n2,847 plants rescued this month alone.",
            "cta": "Start your plant's glow-up - free trial in bio",
            "funnel_stage": "consideration",
            "status": "approved",
        },
        {
            "content_type": "social_post",
            "platform": "linkedin",
            "title": "Workspace Plants & Productivity",
            "hook": "Companies with office plants see 15% higher productivity. Here's why most get it wrong.",
            "body": "I've seen gorgeous office plant walls turn brown in 3 months.\n\nThe problem isn't commitment. It's information.\n\nNo one knows:\n- Which plants suit fluorescent lighting\n- How HVAC affects watering needs\n- When to rotate vs. when to leave alone\n\nWe built Bloom for plant parents at home, but teams are using it to keep their office jungles alive.\n\nOne facilities manager told us they cut plant replacement costs by 60%.\n\nTurns out, the secret to a green office isn't a green thumb. It's better data.",
            "cta": "Bloom for Teams - DM for early access",
            "funnel_stage": "awareness",
            "status": "published",
        },
        {
            "content_type": "ad_copy",
            "platform": "meta",
            "title": "Pain Point: Overwatering",
            "hook": "You're killing your plants with kindness.",
            "body": "Overwatering is the #1 reason houseplants die. Bloom tells you exactly when and how much to water - personalized to each plant in your home.\n\n97% accurate plant disease detection. Hyper-local care schedules. Zero guesswork.\n\nJoin 50,000+ plant parents who stopped guessing.",
            "cta": "Start Free Trial",
            "funnel_stage": "awareness",
            "status": "approved",
        },
        {
            "content_type": "ad_copy",
            "platform": "meta",
            "title": "Social Proof Ad",
            "hook": "\"I've kept a fern alive for 6 months. That's never happened before.\"",
            "body": "Real review from a real Bloom user.\n\nBloom uses AI to create personalized care schedules for every plant in your home. It knows your climate, your light levels, and your habits.\n\nRated 4.8 stars. 50,000+ plant rescues and counting.",
            "cta": "Try Bloom Free",
            "funnel_stage": "consideration",
            "status": "approved",
        },
        {
            "content_type": "social_post",
            "platform": "x",
            "title": "Quick Tip: Light Levels",
            "hook": "\"Bright indirect light\" is the most useless plant care instruction ever written.",
            "body": "What does it even mean?\n\nBloom measures actual lux levels through your phone camera and matches them to each plant's needs.\n\nNo more guessing if your north-facing window counts as \"bright.\"\n\nIt doesn't, btw. But your pothos will love it anyway.",
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

    db.commit()
