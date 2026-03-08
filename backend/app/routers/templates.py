import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdTemplate

router = APIRouter()


class TemplateCreate(BaseModel):
    product_id: str | None = None
    name: str
    template_type: str  # before_after, pain_solution, stat_proof
    layout_config: dict | None = None


class TemplateUpdate(BaseModel):
    name: str | None = None
    layout_config: dict | None = None


class TemplateResponse(BaseModel):
    id: str
    product_id: str | None
    name: str
    template_type: str
    layout_config: dict
    created_at: str
    updated_at: str


def _to_response(t: AdTemplate) -> dict:
    return {
        "id": t.id,
        "product_id": t.product_id,
        "name": t.name,
        "template_type": t.template_type,
        "layout_config": json.loads(t.layout_config) if t.layout_config else {},
        "created_at": t.created_at.isoformat(),
        "updated_at": t.updated_at.isoformat(),
    }


@router.get("", response_model=list[TemplateResponse])
def list_templates(product_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(AdTemplate)
    if product_id:
        query = query.filter(
            (AdTemplate.product_id == product_id) | (AdTemplate.product_id.is_(None))
        )
    templates = query.order_by(AdTemplate.created_at.desc()).all()
    return [_to_response(t) for t in templates]


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: str, db: Session = Depends(get_db)):
    t = db.query(AdTemplate).filter(AdTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return _to_response(t)


@router.post("", response_model=TemplateResponse)
def create_template(data: TemplateCreate, db: Session = Depends(get_db)):
    t = AdTemplate(
        product_id=data.product_id,
        name=data.name,
        template_type=data.template_type,
        layout_config=json.dumps(data.layout_config or {}),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _to_response(t)


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(template_id: str, data: TemplateUpdate, db: Session = Depends(get_db)):
    t = db.query(AdTemplate).filter(AdTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    if data.name is not None:
        t.name = data.name
    if data.layout_config is not None:
        t.layout_config = json.dumps(data.layout_config)
    db.commit()
    db.refresh(t)
    return _to_response(t)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, db: Session = Depends(get_db)):
    t = db.query(AdTemplate).filter(AdTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()
