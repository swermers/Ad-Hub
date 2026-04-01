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
    agent,
    analytics,
    auth,
    autonomous_loop,
    billing,
    brand_profile,
    bulk_generator,
    bulk_upload,
    connections,
    content,
    content_pipeline,
    content_prompts,
    dispatch,
    generation,
    image_gen,
    ingestion,
    intelligence,
    optimizer,
    pain_points,
    products,
    schedule,
    seeds,
    templates,
    video_render,
    voice_profiles,
    workflows,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auth_secret == "change-me-in-production":
        logger.warning(
            "AUTH_SECRET is still set to the default value 'change-me-in-production'. "
            "Please set a secure AUTH_SECRET in your environment before deploying."
        )

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

    # Auto-register Telegram webhook if configured
    if settings.telegram_bot_token and settings.telegram_chat_id and settings.app_url:
        try:
            from app.services.telegram_bot import ClawdBot

            bot = ClawdBot(token=settings.telegram_bot_token, chat_id=settings.telegram_chat_id)
            webhook_url = f"{settings.app_url}/api/dispatch/telegram/webhook"
            result = await bot.set_webhook(webhook_url)
            logger.info("Telegram webhook registered: %s → %s", webhook_url, result)
        except Exception:
            logger.exception("Failed to register Telegram webhook")

    yield

    # Shutdown scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")


app = FastAPI(title="Iterant", version="0.2.0", lifespan=lifespan)

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
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(seeds.router, prefix="/api/seeds", tags=["seeds"])
app.include_router(brand_profile.router, prefix="/api/products", tags=["brand-profile"])
app.include_router(autonomous_loop.router, prefix="/api/products", tags=["autonomous-loop"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(intelligence.router, prefix="/api/products", tags=["intelligence"])
app.include_router(voice_profiles.router, prefix="/api/voice-profiles", tags=["voice-profiles"])
app.include_router(content_pipeline.router, prefix="/api/pipeline", tags=["content-pipeline"])
app.include_router(content_prompts.router, prefix="/api/products", tags=["content-prompts"])
app.include_router(dispatch.router, prefix="/api/dispatch", tags=["dispatch"])
app.include_router(video_render.router, prefix="/api/video", tags=["video-render"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])


# Serve uploaded files (screenshots, references, generated images, etc.)
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.2.0"}


# ─── Model Settings (in-app model selector) ─────────────────────────────────────

AVAILABLE_MODELS = [
    {"id": "claude-opus-4-6", "name": "Opus 4.6", "tier": "premium", "desc": "Best nuance, slower, higher cost"},
    {"id": "claude-sonnet-4-6", "name": "Sonnet 4.6", "tier": "standard", "desc": "Fast, good quality, lower cost"},
    {"id": "claude-haiku-4-5-20251001", "name": "Haiku 4.5", "tier": "fast", "desc": "Fastest, cheapest, lighter output"},
]


@app.get("/api/settings/models")
def get_model_settings():
    """Get current model configuration and available models."""
    return {
        "default_model": settings.claude_model,
        "premium_model": settings.claude_model_premium,
        "available_models": AVAILABLE_MODELS,
    }


from pydantic import BaseModel as _BaseModel  # noqa: E402


class _ModelSettingsUpdate(_BaseModel):
    default_model: str | None = None
    premium_model: str | None = None


@app.put("/api/settings/models")
def update_model_settings(data: _ModelSettingsUpdate):
    """Update which models are used for default and premium tasks.

    Changes take effect immediately (in-memory) and persist until restart.
    For permanent changes, set CLAUDE_MODEL and CLAUDE_MODEL_PREMIUM env vars.
    """
    valid_ids = {m["id"] for m in AVAILABLE_MODELS}

    if data.default_model:
        if data.default_model not in valid_ids:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Unknown model: {data.default_model}")
        settings.claude_model = data.default_model

    if data.premium_model:
        if data.premium_model not in valid_ids:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Unknown model: {data.premium_model}")
        settings.claude_model_premium = data.premium_model

    return {
        "default_model": settings.claude_model,
        "premium_model": settings.claude_model_premium,
        "message": "Model settings updated. Changes persist until server restart.",
    }
