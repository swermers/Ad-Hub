import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.routers import analytics, connections, content, generation, ingestion, products, schedule

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()

    # Start background scheduler
    scheduler = None
    if settings.scheduler_enabled:
        try:
            from app.engines.scheduler import start_scheduler

            scheduler = start_scheduler()
            logger.info("Background scheduler started")
        except Exception:
            logger.exception("Failed to start scheduler")

    yield

    # Shutdown scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")


app = FastAPI(title="Ad-Hub", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(ingestion.router, prefix="/api/products", tags=["ingestion"])
app.include_router(generation.router, prefix="/api/products", tags=["generation"])
app.include_router(content.router, prefix="/api/content", tags=["content"])
app.include_router(connections.router, prefix="/api/connections", tags=["connections"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["schedule"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}
