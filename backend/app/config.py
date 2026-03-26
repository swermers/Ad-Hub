from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    claude_model: str = "claude-opus-4-6"
    database_url: str = "sqlite:///./adhub.db"
    cors_origins: list[str] = ["http://localhost:3000"]
    cors_origin_regex: str = r"https://ad-hub.*\.vercel\.app"
    chromadb_path: str = "./chroma_data"

    # X/Twitter API
    twitter_client_id: str = ""
    twitter_client_secret: str = ""
    twitter_bearer_token: str = ""

    # OpenAI (Image Generation + Whisper Transcription)
    openai_api_key: str = ""
    image_gen_model: str = "dall-e-3"
    image_gen_size: str = "1024x1024"
    whisper_model: str = "whisper-1"

    # Pexels (B-roll stock footage/images)
    pexels_api_key: str = ""

    # Meta/Facebook Ads API
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_access_token: str = ""

    # Stripe (Billing)
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_starter_price_id: str = ""
    stripe_pro_price_id: str = ""
    stripe_agency_price_id: str = ""
    app_url: str = "http://localhost:3000"  # For Stripe redirect URLs

    # Telegram (Clawd Bot)
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Auth
    auth_password: str = ""
    auth_secret: str = "change-me-in-production"

    # Scheduler
    scheduler_enabled: bool = True
    scheduler_interval_minutes: int = 1
    metrics_collection_interval_minutes: int = 60

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
