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
        BrandProfile,
        Campaign,
        CampaignAdVariation,
        ContentPiece,
        CrawledPage,
        OptimizationConfig,
        OptimizationLog,
        PainPoint,
        PerformanceMetric,
        PlatformConnection,
        Product,
        RejectionFeedback,
        SafetyGuardrail,
        ScheduledPost,
        Seed,
        UploadedDocument,
        User,
    )

    Base.metadata.create_all(bind=engine)

    # Migrate: add new columns to existing tables if missing
    _add_column_if_missing("content_pieces", "template_type", "VARCHAR(50)")
    _add_column_if_missing("content_pieces", "aspect_ratio", "VARCHAR(10)")
    _add_column_if_missing("products", "brand_fonts", "TEXT")
    _add_column_if_missing("products", "reference_images", "TEXT")
    _add_column_if_missing("content_pieces", "image_url", "TEXT")

    # Seed default admin user if none exist
    from app.routers.auth import seed_default_admin
    db = SessionLocal()
    try:
        seed_default_admin(db)
    finally:
        db.close()


def _add_column_if_missing(table: str, column: str, col_type: str):
    """Safely add a column to an existing table if it doesn't exist."""
    insp = inspect(engine)
    existing = [c["name"] for c in insp.get_columns(table)]
    if column not in existing:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
        logger.info("Added column %s.%s", table, column)
