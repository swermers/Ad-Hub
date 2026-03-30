"""Tests for content pipeline endpoints — quick-expand, refine, and status updates."""

import os
from unittest.mock import AsyncMock, patch

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


def _create_product(name="Test Product"):
    res = client.post("/api/products", json={"name": name, "website_url": "https://example.com"})
    return res.json()


def _create_content(product_id, content_type="social_post", platform="twitter", status="draft"):
    db = TestSessionLocal()
    piece = ContentPiece(
        product_id=product_id,
        content_type=content_type,
        platform=platform,
        title="Test Ad Copy",
        body="This is a test ad body. Buy our product today!",
        hook="Did you know?",
        cta="Shop Now",
        funnel_stage="awareness",
        status=status,
    )
    db.add(piece)
    db.commit()
    db.refresh(piece)
    piece_id = piece.id
    db.close()
    return piece_id


# ─── Content Status Tests (review status) ────────────────────────────────────


def test_update_status_to_review():
    product = _create_product()
    piece_id = _create_content(product["id"])

    res = client.put(f"/api/content/{piece_id}/status", json={"status": "review"})
    assert res.status_code == 200
    assert res.json()["status"] == "review"


def test_update_status_from_review_to_approved():
    product = _create_product()
    piece_id = _create_content(product["id"])

    client.put(f"/api/content/{piece_id}/status", json={"status": "review"})
    res = client.put(f"/api/content/{piece_id}/status", json={"status": "approved"})
    assert res.status_code == 200
    assert res.json()["status"] == "approved"


def test_update_status_invalid():
    product = _create_product()
    piece_id = _create_content(product["id"])

    res = client.put(f"/api/content/{piece_id}/status", json={"status": "invalid_status"})
    assert res.status_code == 400


def test_status_transitions():
    """Test all valid status transitions."""
    product = _create_product()
    valid_statuses = ["draft", "review", "approved", "posted", "rejected"]

    for status in valid_statuses:
        piece_id = _create_content(product["id"])
        res = client.put(f"/api/content/{piece_id}/status", json={"status": status})
        assert res.status_code == 200, f"Failed to set status to {status}"
        assert res.json()["status"] == status


# ─── Pipeline Quick Expand Tests ──────────────────────────────────────────────


MOCK_QUICK_EXPAND_RESPONSE = {
    "content": """[
        {
            "content_type": "social_post",
            "platform": "twitter",
            "title": "Quick Take",
            "body": "Testing the quick expand pipeline - it works great!",
            "hook": "Here's the thing:",
            "cta": "Try it now",
            "funnel_stage": "awareness",
            "metadata": {"specificity_check": "concrete example", "tension_check": "old vs new", "stealable_line": "it works great"}
        },
        {
            "content_type": "social_post",
            "platform": "linkedin",
            "title": "Professional Take",
            "body": "We've been testing a new approach to content generation.",
            "hook": "Insight:",
            "cta": "Learn more",
            "funnel_stage": "awareness",
            "metadata": {}
        }
    ]""",
    "model": "claude-opus-4-6",
    "input_tokens": 100,
    "output_tokens": 200,
}

MOCK_SEED = {
    "seed": "Testing quick expand functionality",
    "heat": ["This is a strong line"],
    "audience_hook": "Content creators who want speed",
    "template_fit": "D",
    "subject_line": "Quick content generation",
    "metaphor": None,
    "weekly_theme": "Efficiency",
    "raw_ideas": ["idea 1"],
    "verdict": "Strong seed",
}


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_quick_expand_basic(mock_claude):
    mock_claude.return_value = MOCK_QUICK_EXPAND_RESPONSE
    product = _create_product()

    res = client.post(
        "/api/pipeline/quick-expand",
        json={
            "product_id": product["id"],
            "seed": MOCK_SEED,
            "platforms": ["twitter", "linkedin"],
            "content_types": ["social_post"],
            "include_video_script": False,
            "include_thread": False,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "pieces" in data
    assert len(data["pieces"]) == 2
    assert data["pieces"][0]["platform"] == "twitter"
    assert data["pieces"][1]["platform"] == "linkedin"


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_quick_expand_with_video_and_thread(mock_claude):
    mock_claude.return_value = MOCK_QUICK_EXPAND_RESPONSE
    product = _create_product()

    res = client.post(
        "/api/pipeline/quick-expand",
        json={
            "product_id": product["id"],
            "seed": MOCK_SEED,
            "platforms": ["twitter"],
            "content_types": ["social_post"],
            "include_video_script": True,
            "include_thread": True,
        },
    )
    assert res.status_code == 200
    # Verify Claude was called (endpoint works even if response doesn't match requested formats)
    mock_claude.assert_called_once()


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_quick_expand_product_not_found(mock_claude):
    res = client.post(
        "/api/pipeline/quick-expand",
        json={
            "product_id": "nonexistent-id",
            "seed": MOCK_SEED,
            "platforms": ["twitter"],
            "content_types": ["social_post"],
        },
    )
    assert res.status_code == 404


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_quick_expand_malformed_claude_response(mock_claude):
    """When Claude returns invalid JSON, endpoint should return empty pieces."""
    mock_claude.return_value = {"content": "This is not JSON at all"}
    product = _create_product()

    res = client.post(
        "/api/pipeline/quick-expand",
        json={
            "product_id": product["id"],
            "seed": MOCK_SEED,
            "platforms": ["twitter"],
            "content_types": ["social_post"],
        },
    )
    assert res.status_code == 200
    assert res.json()["pieces"] == []


# ─── Pipeline Refine Tests ────────────────────────────────────────────────────


MOCK_REFINE_RESPONSE = {
    "content": """{
        "title": "Refined Ad Copy",
        "body": "This is the refined, improved version of the ad.",
        "hook": "You won't believe this:",
        "cta": "Get Started Free"
    }""",
    "model": "claude-opus-4-6",
    "input_tokens": 100,
    "output_tokens": 150,
}


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_refine_basic(mock_claude):
    mock_claude.return_value = MOCK_REFINE_RESPONSE
    product = _create_product()
    piece_id = _create_content(product["id"])

    res = client.post(
        "/api/pipeline/refine",
        json={
            "content_id": piece_id,
            "instructions": "Make it shorter and punchier",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Refined Ad Copy"
    assert data["body"] == "This is the refined, improved version of the ad."
    assert data["hook"] == "You won't believe this:"
    assert data["cta"] == "Get Started Free"


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_refine_no_instructions(mock_claude):
    """Refine with no instructions should still work (uses default)."""
    mock_claude.return_value = MOCK_REFINE_RESPONSE
    product = _create_product()
    piece_id = _create_content(product["id"])

    res = client.post(
        "/api/pipeline/refine",
        json={"content_id": piece_id},
    )
    assert res.status_code == 200
    assert "title" in res.json()


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_refine_content_not_found(mock_claude):
    res = client.post(
        "/api/pipeline/refine",
        json={"content_id": "nonexistent-id", "instructions": "Improve it"},
    )
    assert res.status_code == 404


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_refine_malformed_response(mock_claude):
    """When Claude returns invalid JSON, should fallback to raw content."""
    mock_claude.return_value = {"content": "Just some plain text response"}
    product = _create_product()
    piece_id = _create_content(product["id"])

    res = client.post(
        "/api/pipeline/refine",
        json={"content_id": piece_id, "instructions": "Make it better"},
    )
    assert res.status_code == 200
    data = res.json()
    # Should fallback — title comes from original piece
    assert data["title"] is not None


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_refine_uses_premium_model(mock_claude):
    """Verify refine calls Claude with premium=True."""
    mock_claude.return_value = MOCK_REFINE_RESPONSE
    product = _create_product()
    piece_id = _create_content(product["id"])

    client.post(
        "/api/pipeline/refine",
        json={"content_id": piece_id, "instructions": "Improve it"},
    )
    mock_claude.assert_called_once()
    _, kwargs = mock_claude.call_args
    assert kwargs.get("premium") is True


# ─── Pipeline Sharpen Tests ───────────────────────────────────────────────────


MOCK_SHARPEN_RESPONSE = {
    "content": """{
        "seed": "The core idea refined",
        "heat": ["This line is fire"],
        "audience_hook": "For content creators",
        "template_fit": "A",
        "subject_line": "The subject",
        "metaphor": "Like a river",
        "weekly_theme": "Growth",
        "raw_ideas": ["idea 1", "idea 2"],
        "verdict": "Strong"
    }""",
    "model": "claude-sonnet-4-6",
    "input_tokens": 50,
    "output_tokens": 100,
}


@patch("app.routers.content_pipeline.call_claude", new_callable=AsyncMock)
def test_sharpen_basic(mock_claude):
    mock_claude.return_value = MOCK_SHARPEN_RESPONSE
    product = _create_product()

    res = client.post(
        "/api/pipeline/sharpen",
        json={
            "product_id": product["id"],
            "raw_text": "Some rough content idea about marketing",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["seed"] == "The core idea refined"
    assert len(data["heat"]) == 1
    assert data["template_fit"] == "A"
