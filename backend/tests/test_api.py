"""Smoke tests for Ad-Hub backend API."""

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_adhub.db"
os.environ["ANTHROPIC_API_KEY"] = "test-key"

from app.database import Base, get_db
from app.main import app

# Create test database
test_engine = create_engine("sqlite:///./test_adhub.db", connect_args={"check_same_thread": False})


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


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


client = TestClient(app)


# --- Health ---


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# --- Products CRUD ---


def test_create_product():
    res = client.post(
        "/api/products",
        json={
            "name": "Newsletter Curator",
            "website_url": "https://example.com",
            "description": "Curate newsletters automatically",
            "target_audience": "Content creators",
            "pain_points": "Too many newsletters, not enough time",
            "differentiators": "AI-powered curation",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Newsletter Curator"
    assert data["status"] == "onboarding"
    assert data["id"]


def test_list_products():
    # Create two products
    client.post("/api/products", json={"name": "Product A"})
    client.post("/api/products", json={"name": "Product B"})

    res = client.get("/api/products")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


def test_list_products_pagination():
    for i in range(5):
        client.post("/api/products", json={"name": f"Product {i}"})

    res = client.get("/api/products?skip=2&limit=2")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 5
    assert len(data["items"]) == 2


def test_get_product():
    create_res = client.post("/api/products", json={"name": "Test Product"})
    product_id = create_res.json()["id"]

    res = client.get(f"/api/products/{product_id}")
    assert res.status_code == 200
    assert res.json()["name"] == "Test Product"


def test_get_product_not_found():
    res = client.get("/api/products/nonexistent-id")
    assert res.status_code == 404


def test_update_product():
    create_res = client.post("/api/products", json={"name": "Original Name"})
    product_id = create_res.json()["id"]

    res = client.put(f"/api/products/{product_id}", json={"name": "Updated Name"})
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Name"


def test_delete_product():
    create_res = client.post("/api/products", json={"name": "To Delete"})
    product_id = create_res.json()["id"]

    res = client.delete(f"/api/products/{product_id}")
    assert res.status_code == 204

    res = client.get(f"/api/products/{product_id}")
    assert res.status_code == 404


# --- Content ---


def _create_product_and_content():
    """Helper: create a product and a content piece."""
    product = client.post("/api/products", json={"name": "Test Product"}).json()
    # We can't easily create content without the generation endpoint,
    # so test content endpoints via the generation router mock below.
    return product["id"]


def test_list_content_empty():
    res = client.get("/api/content")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert data["items"] == []


def test_content_crud():
    """Test content operations by manually inserting via the DB."""
    from app.models import ContentPiece

    # Create a product first
    product = client.post("/api/products", json={"name": "Content Test"}).json()

    # Insert content directly through the DB
    db = TestSessionLocal()
    piece = ContentPiece(
        product_id=product["id"],
        content_type="social_post",
        platform="twitter",
        body="Test tweet content",
        hook="Did you know?",
        cta="Try it now",
        funnel_stage="awareness",
        status="draft",
    )
    db.add(piece)
    db.commit()
    db.refresh(piece)
    piece_id = piece.id
    db.close()

    # List content
    res = client.get("/api/content")
    assert res.status_code == 200
    assert res.json()["total"] == 1

    # Get single piece
    res = client.get(f"/api/content/{piece_id}")
    assert res.status_code == 200
    assert res.json()["body"] == "Test tweet content"

    # Update content
    res = client.put(f"/api/content/{piece_id}", json={"body": "Updated tweet"})
    assert res.status_code == 200
    assert res.json()["body"] == "Updated tweet"

    # Update status
    res = client.put(f"/api/content/{piece_id}/status", json={"status": "approved"})
    assert res.status_code == 200
    assert res.json()["status"] == "approved"

    # Invalid status
    res = client.put(f"/api/content/{piece_id}/status", json={"status": "invalid"})
    assert res.status_code == 400

    # Delete
    res = client.delete(f"/api/content/{piece_id}")
    assert res.status_code == 204


def test_content_filter_by_product():
    from app.models import ContentPiece

    p1 = client.post("/api/products", json={"name": "P1"}).json()
    p2 = client.post("/api/products", json={"name": "P2"}).json()

    db = TestSessionLocal()
    db.add(
        ContentPiece(
            product_id=p1["id"],
            content_type="social_post",
            platform="twitter",
            body="P1 tweet",
            funnel_stage="awareness",
        )
    )
    db.add(
        ContentPiece(
            product_id=p2["id"],
            content_type="ad_copy",
            platform="meta",
            body="P2 ad",
            funnel_stage="conversion",
        )
    )
    db.commit()
    db.close()

    res = client.get(f"/api/content?product_id={p1['id']}")
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["body"] == "P1 tweet"


# --- Generation endpoint (mock Claude) ---


def test_generate_endpoint_triggers():
    """Test that the generate endpoint accepts valid requests."""
    product = client.post(
        "/api/products",
        json={"name": "Gen Test", "website_url": "https://example.com"},
    ).json()

    res = client.post(
        f"/api/products/{product['id']}/generate",
        json={
            "content_types": ["social_post"],
            "platforms": ["twitter"],
            "count": 3,
            "funnel_stage": "awareness",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["task_id"]
    assert data["status"] == "pending"


def test_generate_status_not_found():
    product = client.post("/api/products", json={"name": "Gen Test"}).json()
    res = client.get(f"/api/products/{product['id']}/generate-status/fake-task-id")
    assert res.status_code == 404


# --- Ingestion endpoints ---


def test_crawl_requires_website_url():
    product = client.post("/api/products", json={"name": "No URL"}).json()
    res = client.post(f"/api/products/{product['id']}/crawl", json={"max_pages": 5})
    assert res.status_code == 400


def test_crawl_triggers_with_url():
    product = client.post(
        "/api/products",
        json={"name": "Has URL", "website_url": "https://example.com"},
    ).json()
    res = client.post(f"/api/products/{product['id']}/crawl", json={"max_pages": 5})
    assert res.status_code == 200
    assert res.json()["task_id"]


def test_brief_endpoint():
    """Test that brief endpoint returns 200 and schedules background task.
    The actual Claude API call happens asynchronously, so we just verify
    the endpoint responds correctly without waiting for completion."""
    product = client.post("/api/products", json={"name": "Brief Test"}).json()

    # Mock the background task to avoid calling Claude API
    with patch("app.routers.ingestion._run_brief_generation"):
        res = client.post(f"/api/products/{product['id']}/generate-brief")
        assert res.status_code == 200
        assert res.json()["product_id"] == product["id"]
