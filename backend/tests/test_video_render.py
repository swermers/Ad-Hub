"""Tests for video render endpoint and finalize video_config handling."""

import json
import os
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_adhub.db"
os.environ["ANTHROPIC_API_KEY"] = "test-key"

from app.database import Base, get_db
from app.main import app
from app.models import ContentPiece, Product
from app.permissions import get_current_user

test_engine = create_engine(
    "sqlite:///./test_adhub.db", connect_args={"check_same_thread": False}
)


@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    return {"id": "test-user-1", "role": "human", "email": "test@test.com", "workspace_id": None}


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


client = TestClient(app)


def _create_product(name="Test SaaS Product"):
    res = client.post("/api/products", json={"name": name, "website_url": "https://example.com"})
    return res.json()


def _create_video_content(product_id):
    """Create a ContentPiece with video_ad type and video config."""
    db = TestSessionLocal()
    piece = ContentPiece(
        product_id=product_id,
        content_type="video_ad",
        platform="instagram",
        title="Launch Your SaaS in 30 Days",
        body="Stop overthinking. Start shipping. Our platform handles the boring stuff so you can focus on what matters.",
        hook="Still building features nobody asked for?",
        cta="Start Free Trial",
        funnel_stage="awareness",
        status="draft",
        media_type="video",
        video_style="swiss-bold",
        video_config=json.dumps({
            "aspect_ratio": "1:1",
            "accent_color": "#FF6B35",
            "background_color": "#0f0f0e",
            "text_color": "#fafaf8",
        }),
        aspect_ratio="1:1",
    )
    db.add(piece)
    db.commit()
    db.refresh(piece)
    piece_id = piece.id
    db.close()
    return piece_id


# ─── Finalize with video_config Tests ────────────────────────────────────────


def test_finalize_video_ad_with_config():
    """Finalize a video_ad piece — video_config should be serialized, aspect_ratio extracted."""
    product = _create_product()

    res = client.post("/api/pipeline/finalize", json={
        "product_id": product["id"],
        "seed": {
            "seed": "SaaS launch campaign",
            "heat": ["Ship fast, iterate faster"],
            "audience_hook": "Indie hackers tired of boilerplate",
            "template_fit": "A",
            "weekly_theme": "Launch Week",
            "verdict": "Strong",
        },
        "pieces": [
            {
                "content_type": "video_ad",
                "platform": "instagram",
                "title": "Launch Your SaaS in 30 Days",
                "body": "Stop overthinking. Start shipping.",
                "hook": "Still building features nobody asked for?",
                "cta": "Start Free Trial",
                "funnel_stage": "awareness",
                "metadata": {},
                "video_style": "swiss-bold",
                "video_config": {
                    "aspect_ratio": "1:1",
                    "accent_color": "#FF6B35",
                },
            }
        ],
        "save_seed": True,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["pieces_saved"] == 1
    assert len(data["content_ids"]) == 1

    # Verify the saved piece in DB
    db = TestSessionLocal()
    piece = db.query(ContentPiece).filter(ContentPiece.id == data["content_ids"][0]).first()
    assert piece is not None
    assert piece.content_type == "video_ad"
    assert piece.media_type == "video"
    assert piece.video_style == "swiss-bold"
    assert piece.aspect_ratio == "1:1"
    # video_config should be JSON string in DB
    vc = json.loads(piece.video_config)
    assert vc["accent_color"] == "#FF6B35"
    db.close()


def test_finalize_video_ad_without_config():
    """Finalize a video_ad piece with no video_config — should not crash."""
    product = _create_product()

    res = client.post("/api/pipeline/finalize", json={
        "product_id": product["id"],
        "seed": {"seed": "test", "verdict": "ok"},
        "pieces": [
            {
                "content_type": "video_ad",
                "platform": "general",
                "title": "Test",
                "body": "Body",
                "cta": "CTA",
                "funnel_stage": "awareness",
                "metadata": {},
            }
        ],
        "save_seed": False,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["pieces_saved"] == 1

    db = TestSessionLocal()
    piece = db.query(ContentPiece).filter(ContentPiece.id == data["content_ids"][0]).first()
    assert piece.video_config is None
    assert piece.aspect_ratio is None
    assert piece.media_type == "video"
    db.close()


def test_finalize_carousel_type():
    """Finalize a carousel piece — media_type should be 'carousel'."""
    product = _create_product()

    res = client.post("/api/pipeline/finalize", json={
        "product_id": product["id"],
        "seed": {"seed": "test", "verdict": "ok"},
        "pieces": [
            {
                "content_type": "carousel",
                "platform": "instagram",
                "title": "5 Reasons to Switch",
                "body": "Reason 1|Reason 2|Reason 3|Reason 4|Reason 5",
                "cta": "Swipe to learn more",
                "funnel_stage": "consideration",
                "metadata": {},
                "video_style": "swiss-carousel",
                "video_config": {"aspect_ratio": "4:5", "accent_color": "#22c55e"},
            }
        ],
        "save_seed": False,
    })
    assert res.status_code == 200
    db = TestSessionLocal()
    piece = db.query(ContentPiece).filter(ContentPiece.id == res.json()["content_ids"][0]).first()
    assert piece.media_type == "carousel"
    assert piece.video_style == "swiss-carousel"
    assert piece.aspect_ratio == "4:5"
    db.close()


def test_finalize_mixed_content_types():
    """Finalize a batch with both text and video pieces."""
    product = _create_product()

    res = client.post("/api/pipeline/finalize", json={
        "product_id": product["id"],
        "seed": {"seed": "test", "verdict": "ok"},
        "pieces": [
            {
                "content_type": "social_post",
                "platform": "twitter",
                "title": "Quick take",
                "body": "Here's the thing about SaaS...",
                "funnel_stage": "awareness",
                "metadata": {},
            },
            {
                "content_type": "video_ad",
                "platform": "instagram",
                "title": "Video version",
                "body": "Same content, visual format",
                "cta": "Try it",
                "funnel_stage": "awareness",
                "metadata": {},
                "video_style": "pas",
                "video_config": {"aspect_ratio": "9:16", "accent_color": "#FF9500"},
            },
        ],
        "save_seed": False,
    })
    assert res.status_code == 200
    assert res.json()["pieces_saved"] == 2

    db = TestSessionLocal()
    pieces = db.query(ContentPiece).filter(
        ContentPiece.product_id == product["id"]
    ).order_by(ContentPiece.created_at).all()
    assert len(pieces) == 2
    assert pieces[0].media_type == "text"
    assert pieces[0].video_style is None
    assert pieces[1].media_type == "video"
    assert pieces[1].video_style == "pas"
    assert pieces[1].aspect_ratio == "9:16"
    db.close()


# ─── Video Render Endpoint Tests ─────────────────────────────────────────────


def test_render_start():
    """POST /api/video/render should return a task_id with pending status."""
    res = client.post("/api/video/render", json={
        "headline": "Launch Your SaaS",
        "body": "Stop overthinking. Start shipping.",
        "cta": "Start Free Trial",
        "video_style": "swiss-bold",
        "aspect_ratio": "1:1",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "pending"
    assert "task_id" in data


def test_render_invalid_style():
    """POST /api/video/render with invalid style should return 400."""
    res = client.post("/api/video/render", json={
        "headline": "Test",
        "body": "Body",
        "cta": "CTA",
        "video_style": "nonexistent-style",
    })
    assert res.status_code == 400
    assert "Invalid video_style" in res.json()["detail"]


def test_render_status_not_found():
    """GET /api/video/render/nonexistent should return 404."""
    res = client.get("/api/video/render/nonexistent-id")
    assert res.status_code == 404


def test_render_from_content():
    """POST /api/video/render-content/:id should accept a content piece and start render."""
    product = _create_product()
    piece_id = _create_video_content(product["id"])

    res = client.post(f"/api/video/render-content/{piece_id}", json={})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "pending"
    assert "task_id" in data


def test_render_from_content_not_found():
    """POST /api/video/render-content/nonexistent should return 404."""
    res = client.post("/api/video/render-content/nonexistent-id", json={})
    assert res.status_code == 404


def test_render_from_content_with_overrides():
    """Render from content with style/aspect overrides."""
    product = _create_product()
    piece_id = _create_video_content(product["id"])

    res = client.post(f"/api/video/render-content/{piece_id}", json={
        "video_style": "data-hype",
        "aspect_ratio": "9:16",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "pending"


def test_render_download_not_ready():
    """GET /api/video/render/:id/download before completion should return 400."""
    # First start a render to get a valid task_id
    res = client.post("/api/video/render", json={
        "headline": "Test",
        "body": "Body",
        "cta": "CTA",
        "video_style": "default",
    })
    task_id = res.json()["task_id"]

    # Try downloading immediately (still pending)
    res = client.get(f"/api/video/render/{task_id}/download")
    assert res.status_code == 400
    assert "not ready" in res.json()["detail"]


def test_render_poll_status():
    """GET /api/video/render/:id should return current task status."""
    res = client.post("/api/video/render", json={
        "headline": "Test",
        "body": "Body",
        "cta": "CTA",
        "video_style": "swiss-type",
    })
    task_id = res.json()["task_id"]

    status_res = client.get(f"/api/video/render/{task_id}")
    assert status_res.status_code == 200
    data = status_res.json()
    assert data["task_id"] == task_id
    assert data["status"] in ["pending", "rendering", "completed", "failed"]


# ─── Content List Filter Tests ───────────────────────────────────────────────


def test_content_list_includes_video_ad():
    """Video ad content should appear in content list."""
    product = _create_product()
    piece_id = _create_video_content(product["id"])

    res = client.get(f"/api/content?product_id={product['id']}")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 1
    video_piece = next((i for i in items if i["id"] == piece_id), None)
    assert video_piece is not None
    assert video_piece["content_type"] == "video_ad"
    assert video_piece["media_type"] == "video"
    assert video_piece["video_style"] == "swiss-bold"
