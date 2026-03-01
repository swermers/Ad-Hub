import asyncio
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContentPiece, PlatformConnection, ScheduledPost

router = APIRouter()


class ScheduleCreate(BaseModel):
    content_id: str
    connection_id: str
    scheduled_at: datetime


class ScheduledPostResponse(BaseModel):
    id: str
    content_id: str
    connection_id: str
    scheduled_at: datetime
    posted_at: datetime | None
    platform_post_id: str | None
    status: str
    error: str | None
    created_at: datetime
    # Joined fields
    content_title: str | None = None
    content_body_preview: str | None = None
    platform: str | None = None
    platform_account_name: str | None = None

    model_config = {"from_attributes": True}


def _to_response(post: ScheduledPost) -> dict:
    """Convert a ScheduledPost to a response dict with joined fields."""
    return {
        "id": post.id,
        "content_id": post.content_id,
        "connection_id": post.connection_id,
        "scheduled_at": post.scheduled_at,
        "posted_at": post.posted_at,
        "platform_post_id": post.platform_post_id,
        "status": post.status,
        "error": post.error,
        "created_at": post.created_at,
        "content_title": post.content.title if post.content else None,
        "content_body_preview": (
            (post.content.body[:100] + "...")
            if post.content and len(post.content.body) > 100
            else (post.content.body if post.content else None)
        ),
        "platform": post.connection.platform if post.connection else None,
        "platform_account_name": (
            post.connection.platform_account_name if post.connection else None
        ),
    }


class PaginatedSchedule(BaseModel):
    items: list[ScheduledPostResponse]
    total: int


@router.get("", response_model=PaginatedSchedule)
def list_scheduled_posts(
    product_id: str | None = None,
    status: str | None = None,
    platform: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(ScheduledPost)

    if product_id:
        content_ids = (
            db.query(ContentPiece.id).filter(ContentPiece.product_id == product_id).subquery()
        )
        query = query.filter(ScheduledPost.content_id.in_(content_ids))

    if status:
        query = query.filter(ScheduledPost.status == status)

    if platform:
        conn_ids = (
            db.query(PlatformConnection.id)
            .filter(PlatformConnection.platform == platform)
            .subquery()
        )
        query = query.filter(ScheduledPost.connection_id.in_(conn_ids))

    total = query.count()
    posts = query.order_by(ScheduledPost.scheduled_at.desc()).offset(skip).limit(limit).all()
    items = [_to_response(p) for p in posts]
    return PaginatedSchedule(items=items, total=total)


@router.post("", response_model=ScheduledPostResponse, status_code=201)
def schedule_post(data: ScheduleCreate, db: Session = Depends(get_db)):
    # Validate content exists
    content = db.query(ContentPiece).filter(ContentPiece.id == data.content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Validate connection exists
    connection = (
        db.query(PlatformConnection).filter(PlatformConnection.id == data.connection_id).first()
    )
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    post = ScheduledPost(
        content_id=data.content_id,
        connection_id=data.connection_id,
        scheduled_at=data.scheduled_at,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _to_response(post)


@router.get("/{post_id}", response_model=ScheduledPostResponse)
def get_scheduled_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(ScheduledPost).filter(ScheduledPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    return _to_response(post)


@router.delete("/{post_id}", status_code=204)
def cancel_scheduled_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(ScheduledPost).filter(ScheduledPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    if post.status == "posted":
        raise HTTPException(status_code=400, detail="Cannot cancel a post that's already posted")
    db.delete(post)
    db.commit()


def _run_post_now(post_id: str):
    """Background task to post immediately."""
    from app.database import SessionLocal
    from app.engines.distribution import post_to_platform

    db = SessionLocal()
    try:
        post = db.query(ScheduledPost).filter(ScheduledPost.id == post_id).first()
        if post and post.status in ("scheduled", "failed"):
            asyncio.run(post_to_platform(db, post))
    except Exception:
        # Error is captured in post_to_platform
        pass
    finally:
        db.close()


@router.post("/{post_id}/post-now", response_model=ScheduledPostResponse)
def post_now(
    post_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    post = db.query(ScheduledPost).filter(ScheduledPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    if post.status == "posted":
        raise HTTPException(status_code=400, detail="Already posted")

    background_tasks.add_task(_run_post_now, post_id)
    return _to_response(post)
