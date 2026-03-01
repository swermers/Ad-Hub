"""Phase 2 tests — connections, schedule, and analytics endpoints."""

import os
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_adhub.db"
os.environ["ANTHROPIC_API_KEY"] = "test-key"
os.environ["SCHEDULER_ENABLED"] = "false"

from app.database import Base, get_db
from app.main import app
from app.models import ContentPiece, ScheduledPost

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
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


client = TestClient(app)


def _create_product(name="Test Product"):
    res = client.post("/api/products", json={"name": name, "website_url": "https://example.com"})
    return res.json()


def _create_connection(product_id, platform="twitter"):
    res = client.post(
        "/api/connections",
        json={
            "product_id": product_id,
            "platform": platform,
            "access_token": "test-token-123",
            "platform_account_name": f"@test_{platform}",
        },
    )
    return res.json()


def _create_content(product_id):
    db = TestSessionLocal()
    piece = ContentPiece(
        product_id=product_id,
        content_type="social_post",
        platform="twitter",
        title="Test Tweet",
        body="This is a test tweet body for scheduling.",
        funnel_stage="awareness",
        status="approved",
    )
    db.add(piece)
    db.commit()
    db.refresh(piece)
    piece_id = piece.id
    db.close()
    return piece_id


# --- Connections ---


def test_create_connection():
    product = _create_product()
    res = client.post(
        "/api/connections",
        json={
            "product_id": product["id"],
            "platform": "twitter",
            "access_token": "tok_123",
            "platform_account_name": "@myhandle",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["platform"] == "twitter"
    assert data["platform_account_name"] == "@myhandle"
    assert data["status"] == "active"


def test_list_connections():
    product = _create_product()
    _create_connection(product["id"], "twitter")
    _create_connection(product["id"], "meta")

    res = client.get("/api/connections")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_list_connections_by_product():
    p1 = _create_product("P1")
    p2 = _create_product("P2")
    _create_connection(p1["id"], "twitter")
    _create_connection(p2["id"], "meta")

    res = client.get(f"/api/connections?product_id={p1['id']}")
    assert res.status_code == 200
    conns = res.json()
    assert len(conns) == 1
    assert conns[0]["platform"] == "twitter"


def test_get_connection():
    product = _create_product()
    conn = _create_connection(product["id"])

    res = client.get(f"/api/connections/{conn['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == conn["id"]


def test_get_connection_not_found():
    res = client.get("/api/connections/nonexistent")
    assert res.status_code == 404


def test_delete_connection():
    product = _create_product()
    conn = _create_connection(product["id"])

    res = client.delete(f"/api/connections/{conn['id']}")
    assert res.status_code == 204

    res = client.get(f"/api/connections/{conn['id']}")
    assert res.status_code == 404


# --- Schedule ---


def test_schedule_post():
    product = _create_product()
    conn = _create_connection(product["id"])
    content_id = _create_content(product["id"])

    res = client.post(
        "/api/schedule",
        json={
            "content_id": content_id,
            "connection_id": conn["id"],
            "scheduled_at": "2026-04-01T12:00:00",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "scheduled"
    assert data["content_title"] == "Test Tweet"
    assert data["platform"] == "twitter"


def test_schedule_post_content_not_found():
    product = _create_product()
    conn = _create_connection(product["id"])

    res = client.post(
        "/api/schedule",
        json={
            "content_id": "nonexistent",
            "connection_id": conn["id"],
            "scheduled_at": "2026-04-01T12:00:00",
        },
    )
    assert res.status_code == 404


def test_list_scheduled_posts():
    product = _create_product()
    conn = _create_connection(product["id"])
    c1 = _create_content(product["id"])
    c2 = _create_content(product["id"])

    client.post(
        "/api/schedule",
        json={"content_id": c1, "connection_id": conn["id"], "scheduled_at": "2026-04-01T12:00:00"},
    )
    client.post(
        "/api/schedule",
        json={"content_id": c2, "connection_id": conn["id"], "scheduled_at": "2026-04-02T12:00:00"},
    )

    res = client.get("/api/schedule")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


def test_list_scheduled_posts_filter_status():
    product = _create_product()
    conn = _create_connection(product["id"])
    content_id = _create_content(product["id"])

    client.post(
        "/api/schedule",
        json={
            "content_id": content_id,
            "connection_id": conn["id"],
            "scheduled_at": "2026-04-01T12:00:00",
        },
    )

    res = client.get("/api/schedule?status=scheduled")
    assert res.json()["total"] == 1

    res = client.get("/api/schedule?status=posted")
    assert res.json()["total"] == 0


def test_get_scheduled_post():
    product = _create_product()
    conn = _create_connection(product["id"])
    content_id = _create_content(product["id"])

    created = client.post(
        "/api/schedule",
        json={
            "content_id": content_id,
            "connection_id": conn["id"],
            "scheduled_at": "2026-04-01T12:00:00",
        },
    ).json()

    res = client.get(f"/api/schedule/{created['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]


def test_cancel_scheduled_post():
    product = _create_product()
    conn = _create_connection(product["id"])
    content_id = _create_content(product["id"])

    created = client.post(
        "/api/schedule",
        json={
            "content_id": content_id,
            "connection_id": conn["id"],
            "scheduled_at": "2026-04-01T12:00:00",
        },
    ).json()

    res = client.delete(f"/api/schedule/{created['id']}")
    assert res.status_code == 204


def test_cancel_posted_post_fails():
    product = _create_product()
    conn = _create_connection(product["id"])
    content_id = _create_content(product["id"])

    # Create and manually mark as posted
    db = TestSessionLocal()
    post = ScheduledPost(
        content_id=content_id,
        connection_id=conn["id"],
        scheduled_at=datetime(2026, 4, 1, 12, 0, 0, tzinfo=timezone.utc),
        status="posted",
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    post_id = post.id
    db.close()

    res = client.delete(f"/api/schedule/{post_id}")
    assert res.status_code == 400


def test_post_now():
    product = _create_product()
    conn = _create_connection(product["id"])
    content_id = _create_content(product["id"])

    created = client.post(
        "/api/schedule",
        json={
            "content_id": content_id,
            "connection_id": conn["id"],
            "scheduled_at": "2026-04-01T12:00:00",
        },
    ).json()

    with patch("app.routers.schedule._run_post_now"):
        res = client.post(f"/api/schedule/{created['id']}/post-now")
    assert res.status_code == 200
    assert res.json()["status"] == "scheduled"


# --- Analytics ---


def test_analytics_overview_empty():
    res = client.get("/api/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["total_impressions"] == 0
    assert data["posts_tracked"] == 0
    assert data["period_days"] == 30


def test_analytics_overview_with_days():
    res = client.get("/api/analytics/overview?days=7")
    assert res.status_code == 200
    assert res.json()["period_days"] == 7


def test_top_performers_empty():
    res = client.get("/api/analytics/top-performers")
    assert res.status_code == 200
    assert res.json() == []


def test_content_metrics_not_found():
    res = client.get("/api/analytics/content/nonexistent")
    assert res.status_code == 404


def test_content_metrics_empty():
    product = _create_product()
    content_id = _create_content(product["id"])

    res = client.get(f"/api/analytics/content/{content_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["total_impressions"] == 0
    assert data["platforms"] == []


def test_analytics_collect():
    res = client.post("/api/analytics/collect")
    assert res.status_code == 200
    assert res.json()["collected"] == 0
