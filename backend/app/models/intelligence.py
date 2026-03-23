"""
Marketing Intelligence Layer — Tier 5 data models.

The bot doesn't just execute — it researches, learns, and advises.
These models support competitor monitoring, trend detection, hook pattern
analysis, evidence gathering, and weekly intelligence briefings.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CompetitorProfile(Base):
    """A tracked competitor for a given product/brand."""

    __tablename__ = "competitor_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    website_url: Mapped[str | None] = mapped_column(Text)
    social_urls: Mapped[str | None] = mapped_column(Text)  # JSON: {"x": "...", "linkedin": "...", "instagram": "..."}
    meta_ad_library_url: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)

    # Latest crawl results
    last_crawled_at: Mapped[datetime | None] = mapped_column(DateTime)
    latest_snapshot: Mapped[str | None] = mapped_column(Text)  # JSON: {headlines, offers, ctas, messaging_angles}
    ad_count: Mapped[int] = mapped_column(Integer, default=0)  # Number of active ads spotted
    longest_running_ad: Mapped[str | None] = mapped_column(Text)  # JSON: {copy, first_seen, days_active}

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class TrendSignal(Base):
    """An emerging trend or pain point detected from online sources."""

    __tablename__ = "trend_signals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    # What was detected
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # reddit, x, forum, review_site, news
    source_url: Mapped[str | None] = mapped_column(Text)
    source_snippet: Mapped[str | None] = mapped_column(Text)  # Relevant excerpt

    # Classification
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # pain_point, desire, complaint, question, opportunity
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0-1, how relevant to the product
    momentum: Mapped[str] = mapped_column(String(20), default="stable")  # rising, stable, declining
    volume: Mapped[int] = mapped_column(Integer, default=1)  # How many mentions detected

    # Whether the human has seen / acted on this
    status: Mapped[str] = mapped_column(String(20), default="new")  # new, reviewed, actioned, dismissed
    suggested_angle: Mapped[str | None] = mapped_column(Text)  # AI-suggested content/ad angle

    detected_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class HookPattern(Base):
    """A reverse-engineered hook/copy pattern from top-performing content."""

    __tablename__ = "hook_patterns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    # The pattern
    pattern_name: Mapped[str] = mapped_column(String(200), nullable=False)  # e.g. "Open Loop Question"
    pattern_type: Mapped[str] = mapped_column(String(50), nullable=False)  # hook, cta, structure, angle, format
    description: Mapped[str] = mapped_column(Text, nullable=False)  # Why it works
    example: Mapped[str] = mapped_column(Text, nullable=False)  # Real example from top content
    template: Mapped[str | None] = mapped_column(Text)  # Fill-in-the-blank template: "[Number] reasons why [topic] is..."

    # Source & performance
    source_platform: Mapped[str] = mapped_column(String(30), nullable=False)  # x, linkedin, meta_ads, instagram
    source_url: Mapped[str | None] = mapped_column(Text)
    engagement_score: Mapped[float] = mapped_column(Float, default=0.0)  # Normalized 0-1
    times_used: Mapped[int] = mapped_column(Integer, default=0)  # How many times we've used this pattern
    avg_performance: Mapped[float | None] = mapped_column(Float)  # Our CTR when using this pattern

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class EvidenceItem(Base):
    """A piece of evidence (stat, study, review, testimonial) to back ad claims."""

    __tablename__ = "evidence_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    # The evidence
    claim: Mapped[str] = mapped_column(Text, nullable=False)  # The claim this evidence supports
    evidence_text: Mapped[str] = mapped_column(Text, nullable=False)  # The actual stat/quote/finding
    evidence_type: Mapped[str] = mapped_column(String(50), nullable=False)  # statistic, study, review, testimonial, benchmark
    source_name: Mapped[str | None] = mapped_column(String(300))  # "G2", "Trustpilot", "HubSpot State of Marketing 2026"
    source_url: Mapped[str | None] = mapped_column(Text)

    # Quality
    credibility_score: Mapped[float] = mapped_column(Float, default=0.5)  # 0-1
    freshness: Mapped[str] = mapped_column(String(20), default="recent")  # fresh (< 3mo), recent (< 1yr), dated (> 1yr)
    times_used: Mapped[int] = mapped_column(Integer, default=0)

    verified: Mapped[bool] = mapped_column(Boolean, default=False)  # Human-verified

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class IntelligenceBrief(Base):
    """A periodic intelligence summary generated for the human seat."""

    __tablename__ = "intelligence_briefs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    # Brief content
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    period: Mapped[str] = mapped_column(String(20), nullable=False)  # weekly, monthly, ad_hoc
    summary: Mapped[str] = mapped_column(Text, nullable=False)  # Main summary paragraph

    # Structured sections (all JSON)
    whats_working: Mapped[str | None] = mapped_column(Text)  # JSON: [{insight, data_point, recommendation}]
    competitor_moves: Mapped[str | None] = mapped_column(Text)  # JSON: [{competitor, action, implication}]
    trend_alerts: Mapped[str | None] = mapped_column(Text)  # JSON: [{trend, relevance, suggested_action}]
    evidence_found: Mapped[str | None] = mapped_column(Text)  # JSON: [{claim, evidence, source}]
    creative_recommendations: Mapped[str | None] = mapped_column(Text)  # JSON: [{format, reason, expected_impact}]
    next_actions: Mapped[str | None] = mapped_column(Text)  # JSON: [{action, priority, rationale}]

    # Meta
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, published, archived
    read_at: Mapped[datetime | None] = mapped_column(DateTime)  # When the human read it

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class ResearchCache(Base):
    """Cached research results to avoid redundant API calls / scraping."""

    __tablename__ = "research_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    cache_key: Mapped[str] = mapped_column(String(500), nullable=False, index=True)  # e.g. "competitor:acme:website:2026-03-23"
    cache_type: Mapped[str] = mapped_column(String(50), nullable=False)  # competitor_crawl, trend_scan, hook_analysis, evidence_search
    data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON blob of cached results
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class IntelligenceConfig(Base):
    """Per-product configuration for the intelligence layer."""

    __tablename__ = "intelligence_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # Master switches
    competitor_monitoring_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    trend_detection_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    hook_analysis_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_gathering_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    weekly_brief_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Frequency (hours between runs)
    competitor_scan_interval_hours: Mapped[int] = mapped_column(Integer, default=24)
    trend_scan_interval_hours: Mapped[int] = mapped_column(Integer, default=12)
    hook_analysis_interval_hours: Mapped[int] = mapped_column(Integer, default=48)
    evidence_refresh_interval_hours: Mapped[int] = mapped_column(Integer, default=72)

    # Niche context for trend detection
    niche_keywords: Mapped[str | None] = mapped_column(Text)  # JSON: ["keyword1", "keyword2"]
    subreddits: Mapped[str | None] = mapped_column(Text)  # JSON: ["r/SaaS", "r/marketing"]
    x_accounts_to_watch: Mapped[str | None] = mapped_column(Text)  # JSON: ["@competitor1", "@influencer"]
    industry_vertical: Mapped[str | None] = mapped_column(String(100))  # e.g. "real_estate", "education", "ecommerce"

    # State tracking
    last_competitor_scan_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_trend_scan_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_hook_analysis_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_evidence_refresh_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_brief_generated_at: Mapped[datetime | None] = mapped_column(DateTime)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
