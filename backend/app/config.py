from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    database_url: str = "sqlite:///./adhub.db"
    cors_origins: list[str] = ["http://localhost:3000"]
    chromadb_path: str = "./chroma_data"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
