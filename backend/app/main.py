from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.routers import content, generation, ingestion, products


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(title="Ad-Hub", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(ingestion.router, prefix="/api/products", tags=["ingestion"])
app.include_router(generation.router, prefix="/api/products", tags=["generation"])
app.include_router(content.router, prefix="/api/content", tags=["content"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}
