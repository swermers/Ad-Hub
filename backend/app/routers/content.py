from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContentPiece
from app.models.brand_profile import RejectionFeedback
from app.permissions import get_current_user, scope_product_query

router = APIRouter()


class ContentPieceResponse(BaseModel):
    id: str
    product_id: str | None
    content_type: str
    platform: str
    title: str | None
    body: str
    hook: str | None
    cta: str | None
    funnel_stage: str
    status: str
    template_type: str | None
    aspect_ratio: str | None
    generation_metadata: str | None
    image_url: str | None
    media_type: str | None = None
    video_style: str | None = None
    video_config: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContentUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    hook: str | None = None
    cta: str | None = None
    generation_metadata: str | None = None


class ContentStatusUpdate(BaseModel):
    status: str


class PaginatedContent(BaseModel):
    items: list[ContentPieceResponse]
    total: int


@router.get("", response_model=PaginatedContent)
def list_content(
    product_id: str | None = None,
    status: str | None = None,
    platform: str | None = None,
    content_type: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    query = db.query(ContentPiece)
    query = scope_product_query(query, ContentPiece, user, db)
    if product_id:
        query = query.filter(ContentPiece.product_id == product_id)
    if status:
        query = query.filter(ContentPiece.status == status)
    if platform:
        query = query.filter(ContentPiece.platform == platform)
    if content_type:
        query = query.filter(ContentPiece.content_type == content_type)
    total = query.count()
    items = query.order_by(ContentPiece.created_at.desc()).offset(skip).limit(limit).all()
    return PaginatedContent(items=items, total=total)


@router.get("/{content_id}", response_model=ContentPieceResponse)
def get_content(content_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    piece = scope_product_query(db.query(ContentPiece), ContentPiece, user, db).filter(ContentPiece.id == content_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Content not found")
    return piece


@router.put("/{content_id}", response_model=ContentPieceResponse)
def update_content(content_id: str, data: ContentUpdate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    piece = scope_product_query(db.query(ContentPiece), ContentPiece, user, db).filter(ContentPiece.id == content_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Content not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(piece, key, value)

    db.commit()
    db.refresh(piece)
    return piece


@router.put("/{content_id}/status", response_model=ContentPieceResponse)
def update_content_status(
    content_id: str, data: ContentStatusUpdate, db: Session = Depends(get_db), user: dict = Depends(get_current_user),
):
    piece = scope_product_query(db.query(ContentPiece), ContentPiece, user, db).filter(ContentPiece.id == content_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Content not found")

    if data.status not in ("draft", "review", "approved", "posted", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")

    piece.status = data.status
    db.commit()
    db.refresh(piece)
    return piece


@router.delete("/{content_id}", status_code=204)
def delete_content(content_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    piece = scope_product_query(db.query(ContentPiece), ContentPiece, user, db).filter(ContentPiece.id == content_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Content not found")
    db.delete(piece)
    db.commit()


# ── Bulk Operations ───────────────────────────────────────────────────────────


class BulkDeleteRequest(BaseModel):
    content_ids: list[str]


class BulkDeleteResponse(BaseModel):
    deleted: int


class BulkFeedbackRequest(BaseModel):
    content_ids: list[str]
    reason: str  # off_brand_voice, wrong_tone, irrelevant_topic, poor_quality, other
    details: str | None = None


class BulkFeedbackResponse(BaseModel):
    recorded: int


@router.delete("", response_model=BulkDeleteResponse)
def bulk_delete_content(data: BulkDeleteRequest, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Delete multiple content pieces at once."""
    if not data.content_ids:
        return BulkDeleteResponse(deleted=0)

    base_query = scope_product_query(db.query(ContentPiece), ContentPiece, user, db)
    pieces = base_query.filter(ContentPiece.id.in_(data.content_ids)).all()

    for piece in pieces:
        db.delete(piece)
    db.commit()

    return BulkDeleteResponse(deleted=len(pieces))


@router.post("/bulk-feedback", response_model=BulkFeedbackResponse, status_code=201)
def bulk_rejection_feedback(data: BulkFeedbackRequest, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Record rejection feedback for multiple content pieces at once."""
    if not data.content_ids:
        return BulkFeedbackResponse(recorded=0)

    base_query = scope_product_query(db.query(ContentPiece), ContentPiece, user, db)
    pieces = base_query.filter(ContentPiece.id.in_(data.content_ids)).all()

    piece_map = {p.id: p for p in pieces}
    recorded = 0

    for content_id in data.content_ids:
        piece = piece_map.get(content_id)
        if piece:
            feedback = RejectionFeedback(
                product_id=piece.product_id or "",
                content_id=content_id,
                reason=data.reason,
                details=data.details,
            )
            db.add(feedback)
            recorded += 1

    db.commit()
    return BulkFeedbackResponse(recorded=recorded)
