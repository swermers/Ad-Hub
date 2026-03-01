from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContentPiece

router = APIRouter()


class ContentPieceResponse(BaseModel):
    id: str
    product_id: str
    content_type: str
    platform: str
    title: str | None
    body: str
    hook: str | None
    cta: str | None
    funnel_stage: str
    status: str
    generation_metadata: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContentUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    hook: str | None = None
    cta: str | None = None


class ContentStatusUpdate(BaseModel):
    status: str


@router.get("", response_model=list[ContentPieceResponse])
def list_content(
    product_id: str | None = None,
    status: str | None = None,
    platform: str | None = None,
    content_type: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(ContentPiece)
    if product_id:
        query = query.filter(ContentPiece.product_id == product_id)
    if status:
        query = query.filter(ContentPiece.status == status)
    if platform:
        query = query.filter(ContentPiece.platform == platform)
    if content_type:
        query = query.filter(ContentPiece.content_type == content_type)
    return query.order_by(ContentPiece.created_at.desc()).all()


@router.get("/{content_id}", response_model=ContentPieceResponse)
def get_content(content_id: str, db: Session = Depends(get_db)):
    piece = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Content not found")
    return piece


@router.put("/{content_id}", response_model=ContentPieceResponse)
def update_content(
    content_id: str, data: ContentUpdate, db: Session = Depends(get_db)
):
    piece = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
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
    content_id: str, data: ContentStatusUpdate, db: Session = Depends(get_db)
):
    piece = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Content not found")

    if data.status not in ("draft", "approved", "posted", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")

    piece.status = data.status
    db.commit()
    db.refresh(piece)
    return piece


@router.delete("/{content_id}", status_code=204)
def delete_content(content_id: str, db: Session = Depends(get_db)):
    piece = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Content not found")
    db.delete(piece)
    db.commit()
