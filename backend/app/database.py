import logging

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

logger = logging.getLogger(__name__)

from app.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

_engine_kwargs: dict = {"echo": False}
if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Postgres connection pool settings for production
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20
    _engine_kwargs["pool_pre_ping"] = True

engine = create_engine(settings.database_url, **_engine_kwargs)

# Enable WAL mode and foreign keys for SQLite
if _is_sqlite:

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from app.models import (  # noqa: F401
        AdTemplate,
        AdVariation,
        AgentAPIKey,
        AgentLog,
        AutonomousLoopConfig,
        BrandProfile,
        Campaign,
        CampaignAdVariation,
        CompetitorProfile,
        ContentPiece,
        ContentPromptSet,
        ContentTypeWorkflow,
        CrawledPage,
        EvidenceItem,
        HookPattern,
        IntelligenceBrief,
        IntelligenceConfig,
        OptimizationConfig,
        OptimizationLog,
        PainPoint,
        PerformanceMetric,
        PlatformConnection,
        Product,
        RejectionFeedback,
        ResearchCache,
        SafetyGuardrail,
        ScheduledPost,
        Seed,
        StyleGuide,
        TrendSignal,
        UploadedDocument,
        Subscription,
        UsageRecord,
        User,
        VoiceProfile,
        Workspace,
    )

    Base.metadata.create_all(bind=engine)

    # Migrate: add new columns to existing tables if missing
    _add_column_if_missing("content_pieces", "template_type", "VARCHAR(50)")
    _add_column_if_missing("content_pieces", "aspect_ratio", "VARCHAR(10)")
    _add_column_if_missing("products", "brand_fonts", "TEXT")
    _add_column_if_missing("products", "reference_images", "TEXT")
    _add_column_if_missing("content_pieces", "image_url", "TEXT")
    _add_column_if_missing("products", "workspace_id", "VARCHAR(36)")
    _add_column_if_missing("users", "workspace_id", "VARCHAR(36)")
    _add_column_if_missing("agent_api_keys", "workspace_id", "VARCHAR(36)")
    _add_column_if_missing("content_pieces", "voice_profile_id", "VARCHAR(36)")
    _add_column_if_missing("seeds", "voice_profile_id", "VARCHAR(36)")
    _add_column_if_missing("voice_profiles", "product_id", "VARCHAR(36)")
    _add_column_if_missing("voice_profiles", "quality_score", "INTEGER DEFAULT 0")
    _add_column_if_missing("voice_profiles", "style_guide_id", "VARCHAR(36)")

    # Make product_id nullable for profile-only content generation
    _make_column_nullable("content_pieces", "product_id")
    _make_column_nullable("seeds", "product_id")

    # Widen seed columns that Claude overflows (was VARCHAR, now TEXT)
    _widen_column("seeds", "template_fit", "VARCHAR(50)")
    _widen_column("seeds", "verdict", "TEXT")
    _widen_column("seeds", "subject_line", "TEXT")
    _widen_column("seeds", "weekly_theme", "TEXT")

    # Seed default workspace, admin user, and demo data
    from app.routers.auth import seed_default_admin
    from app.seed_demo import seed_demo_data
    from app.engines.workflow_defaults import seed_v1_workflows
    from app.models.workspace import Workspace
    db = SessionLocal()
    try:
        _seed_default_workspace(db)
        seed_default_admin(db)
        # Seed v1 workflow defaults so evolution engine has a baseline
        seed_v1_workflows(db)
        # Seed demo product for guest/viewer accounts
        ws = db.query(Workspace).first()
        seed_demo_data(db, workspace_id=ws.id if ws else None)
    finally:
        db.close()


def _seed_default_workspace(db):
    """Create a default workspace if none exist, and assign orphan products/users to it."""
    from app.models.workspace import Workspace
    from app.models.user import User
    from app.models.product import Product

    existing = db.query(Workspace).first()
    if existing:
        return  # Workspaces already exist

    ws = Workspace(
        name="Default Workspace",
        slug="default",
        owner_email="admin@iterant.local",
        tier="pro",
        max_products=10,
        max_generations_per_month=1000,
    )
    db.add(ws)
    db.flush()

    # Assign orphan products and users to the default workspace
    db.query(Product).filter(Product.workspace_id.is_(None)).update(
        {"workspace_id": ws.id}, synchronize_session=False
    )
    db.query(User).filter(User.workspace_id.is_(None)).update(
        {"workspace_id": ws.id}, synchronize_session=False
    )
    db.commit()
    logger.info("Created default workspace %s and assigned orphan records", ws.id)


def _add_column_if_missing(table: str, column: str, col_type: str):
    """Safely add a column to an existing table if it doesn't exist."""
    insp = inspect(engine)
    existing = [c["name"] for c in insp.get_columns(table)]
    if column not in existing:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
        logger.info("Added column %s.%s", table, column)


def _make_column_nullable(table: str, column: str):
    """Make an existing column nullable (PostgreSQL only, no-op on SQLite)."""
    if not _is_sqlite:
        insp = inspect(engine)
        cols = {c["name"]: c for c in insp.get_columns(table)}
        if column in cols and not cols[column].get("nullable", True):
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN {column} DROP NOT NULL"))
            logger.info("Made %s.%s nullable", table, column)


def _widen_column(table: str, column: str, new_type: str):
    """Widen an existing column type (PostgreSQL only, no-op on SQLite)."""
    if not _is_sqlite:
        with engine.begin() as conn:
            try:
                conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE {new_type}"))
                logger.info("Widened %s.%s to %s", table, column, new_type)
            except Exception:
                pass  # Column already correct type or doesn't exist
