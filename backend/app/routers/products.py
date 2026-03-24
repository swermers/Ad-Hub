import json
import os
import uuid as uuid_mod
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product
from app.permissions import deny_agent, get_current_user, scope_query

from app.engines.billing import UsageLimitExceeded, check_product_limit

router = APIRouter()

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "screenshots")
REFERENCE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "references")
GENERATED_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "generated")


class ProductCreate(BaseModel):
    name: str
    website_url: str | None = None
    description: str = ""
    target_audience: str = ""
    pain_points: str = ""
    differentiators: str = ""
    product_type: str = "other"


class ProductUpdate(BaseModel):
    name: str | None = None
    website_url: str | None = None
    description: str | None = None
    target_audience: str | None = None
    pain_points: str | None = None
    differentiators: str | None = None
    product_type: str | None = None
    status: str | None = None
    brand_colors: str | None = None


class ProductResponse(BaseModel):
    id: str
    name: str
    website_url: str | None
    description: str
    target_audience: str
    pain_points: str
    differentiators: str
    product_type: str
    brand_voice: str | None
    brand_brief: str | None
    brand_colors: str | None
    brand_fonts: str | None
    screenshots: str | None
    reference_images: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedProducts(BaseModel):
    items: list[ProductResponse]
    total: int


@router.get("", response_model=PaginatedProducts)
def list_products(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    query = scope_query(db.query(Product), Product, user)
    total = query.count()
    items = query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()
    return PaginatedProducts(items=items, total=total)


@router.post("", response_model=ProductResponse, status_code=201, dependencies=[Depends(deny_agent)])
def create_product(data: ProductCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    ws_id = user.get("workspace_id")

    # Check product limit
    if ws_id:
        try:
            check_product_limit(db, ws_id)
        except UsageLimitExceeded as e:
            raise HTTPException(status_code=403, detail=str(e))

    product = Product(**data.model_dump())
    product.workspace_id = ws_id
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    query = scope_query(db.query(Product), Product, user)
    product = query.filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductResponse, dependencies=[Depends(deny_agent)])
def update_product(product_id: str, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    product.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204, dependencies=[Depends(deny_agent)])
def delete_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()


@router.post("/{product_id}/screenshots")
async def upload_screenshot(product_id: str, file: UploadFile, db: Session = Depends(get_db)):
    """Upload a screenshot of the product/website for visual context."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "screenshot.png")[1] or ".png"
    filename = f"{uuid_mod.uuid4()}{ext}"
    filepath = os.path.join(SCREENSHOT_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    screenshot_path = f"/uploads/screenshots/{filename}"

    # Append to product's screenshots list
    existing = json.loads(product.screenshots) if product.screenshots else []
    existing.append(screenshot_path)
    product.screenshots = json.dumps(existing)
    product.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(product)

    return {"path": screenshot_path, "screenshots": existing}


@router.delete("/{product_id}/screenshots")
def delete_screenshot(product_id: str, path: str, db: Session = Depends(get_db)):
    """Remove a screenshot from the product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = json.loads(product.screenshots) if product.screenshots else []
    existing = [s for s in existing if s != path]
    product.screenshots = json.dumps(existing)
    product.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Delete file from disk
    full_path = os.path.join(os.path.dirname(SCREENSHOT_DIR), os.path.basename(os.path.dirname(path)), os.path.basename(path))
    if os.path.exists(full_path):
        os.remove(full_path)

    return {"screenshots": existing}


@router.post("/{product_id}/reference-images")
async def upload_reference_image(product_id: str, file: UploadFile, db: Session = Depends(get_db)):
    """Upload a reference/inspiration image for guiding visual style."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    os.makedirs(REFERENCE_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "reference.png")[1] or ".png"
    filename = f"{uuid_mod.uuid4()}{ext}"
    filepath = os.path.join(REFERENCE_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    ref_path = f"/uploads/references/{filename}"

    existing = json.loads(product.reference_images) if product.reference_images else []
    existing.append(ref_path)
    product.reference_images = json.dumps(existing)
    product.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(product)

    return {"path": ref_path, "reference_images": existing}


@router.delete("/{product_id}/reference-images")
def delete_reference_image(product_id: str, path: str, db: Session = Depends(get_db)):
    """Remove a reference image from the product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = json.loads(product.reference_images) if product.reference_images else []
    existing = [s for s in existing if s != path]
    product.reference_images = json.dumps(existing)
    product.updated_at = datetime.now(timezone.utc)
    db.commit()

    full_path = os.path.join(REFERENCE_DIR, os.path.basename(path))
    if os.path.exists(full_path):
        os.remove(full_path)

    return {"reference_images": existing}
