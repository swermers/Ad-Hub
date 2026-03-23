import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import create_tables
from app.middleware import AuthMiddleware
from app.routers import (
    analytics,
    auth,
    bulk_generator,
    bulk_upload,
    connections,
    content,
    generation,
    image_gen,
    ingestion,
    optimizer,
    pain_points,
    products,
    schedule,
    templates,
)

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

app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(ingestion.router, prefix="/api/products", tags=["ingestion"])
app.include_router(generation.router, prefix="/api/products", tags=["generation"])
app.include_router(content.router, prefix="/api/content", tags=["content"])
app.include_router(connections.router, prefix="/api/connections", tags=["connections"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["schedule"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(pain_points.router, prefix="/api/products", tags=["pain-points"])
app.include_router(bulk_generator.router, prefix="/api/products", tags=["bulk-generator"])
app.include_router(bulk_upload.router, prefix="/api/products", tags=["bulk-upload"])
app.include_router(optimizer.router, prefix="/api/products", tags=["optimizer"])
app.include_router(image_gen.router, prefix="/api/products", tags=["image-gen"])


# Serve uploaded files (screenshots, references, generated images, etc.)
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.2.0"}
