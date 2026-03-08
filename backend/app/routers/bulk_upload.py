import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product

router = APIRouter()

_task_status: dict[str, dict] = {}


class BulkUploadRequest(BaseModel):
    variation_ids: list[str]
    ad_set_id: str
    connection_id: str
    destination_url: str
    page_id: str


class BulkUploadStatusResponse(BaseModel):
    task_id: str
    status: str
    uploaded: int
    failed: int
    error: str | None = None


def _run_bulk_upload(
    task_id: str,
    product_id: str,
    variation_ids: list[str],
    ad_set_id: str,
    connection_id: str,
    destination_url: str,
    page_id: str,
):
    from app.database import SessionLocal
    from app.engines.bulk_upload import bulk_upload_to_facebook

    _task_status[task_id] = {"status": "running", "uploaded": 0, "failed": 0, "error": None}

    db = SessionLocal()
    try:
        result = asyncio.run(
            bulk_upload_to_facebook(
                db=db,
                product_id=product_id,
                variation_ids=variation_ids,
                ad_set_id=ad_set_id,
                connection_id=connection_id,
                destination_url=destination_url,
                page_id=page_id,
            )
        )
        _task_status[task_id] = {
            "status": "completed",
            "uploaded": result["uploaded"],
            "failed": result["failed"],
            "error": None,
        }
    except Exception as e:
        _task_status[task_id] = {"status": "failed", "uploaded": 0, "failed": 0, "error": str(e)}
    finally:
        db.close()


@router.post("/{product_id}/bulk-upload", response_model=BulkUploadStatusResponse)
def bulk_upload(
    product_id: str,
    data: BulkUploadRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "uploaded": 0, "failed": 0, "error": None}

    background_tasks.add_task(
        _run_bulk_upload,
        task_id,
        product_id,
        data.variation_ids,
        data.ad_set_id,
        data.connection_id,
        data.destination_url,
        data.page_id,
    )

    return BulkUploadStatusResponse(task_id=task_id, status="pending", uploaded=0, failed=0)


@router.get("/{product_id}/bulk-upload-status/{task_id}", response_model=BulkUploadStatusResponse)
def get_bulk_upload_status(product_id: str, task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return BulkUploadStatusResponse(task_id=task_id, **status)
