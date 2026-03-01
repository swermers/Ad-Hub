from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    database_url: str = "sqlite:///./adhub.db"
    cors_origins: list[str] = ["http://localhost:3000"]
    chromadb_path: str = "./chroma_data"

    # X/Twitter API
    twitter_client_id: str = ""
    twitter_client_secret: str = ""
    twitter_bearer_token: str = ""

    # Meta/Facebook Ads API
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_access_token: str = ""

    # Scheduler
    scheduler_enabled: bool = True
    scheduler_interval_minutes: int = 1
    metrics_collection_interval_minutes: int = 60

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
