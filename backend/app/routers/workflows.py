"""Workflows Router — CRUD API for content-type workflows.

Manages versioned, per-content-type workflow configurations.
Each workflow stores per-step prompt overrides that customize
the multi-step generation flow for a specific content type.
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.engines.workflow_defaults import (
    WORKFLOW_TYPES,
    get_all_workflow_info,
    get_workflow_info,
)
from app.models.content_workflow import ContentTypeWorkflow
from app.permissions import get_current_user

router = APIRouter()


# ─── Request / Response Models ────────────────────────────────────────────

class WorkflowResponse(BaseModel):
    id: str
    product_id: str | None
    workflow_type: str
    version: int
    is_active: bool
    step_prompts: dict | None = None
    quality_gate_rules: dict | None = None
    total_pieces_generated: int
    avg_engagement_rate: float | None
    avg_impressions: float | None
    avg_clicks: float | None
    win_rate: float | None
    parent_version: int | None
    evolution_notes: str | None
    created_at: str
    updated_at: str


class WorkflowUpdateRequest(BaseModel):
    step_prompts: dict | None = None
    quality_gate_rules: dict | None = None
    is_active: bool | None = None


class WorkflowInfoResponse(BaseModel):
    workflow_type: str
    steps: dict[str, str]
    step_count: int
    quality_gates: list[str]


# ─── Helpers ──────────────────────────────────────────────────────────────

def _to_response(w: ContentTypeWorkflow) -> dict:
    return {
        "id": w.id,
        "product_id": w.product_id,
        "workflow_type": w.workflow_type,
        "version": w.version,
        "is_active": w.is_active,
        "step_prompts": json.loads(w.step_prompts) if w.step_prompts else None,
        "quality_gate_rules": json.loads(w.quality_gate_rules) if w.quality_gate_rules else None,
        "total_pieces_generated": w.total_pieces_generated or 0,
        "avg_engagement_rate": w.avg_engagement_rate,
        "avg_impressions": w.avg_impressions,
        "avg_clicks": w.avg_clicks,
        "win_rate": w.win_rate,
        "parent_version": w.parent_version,
        "evolution_notes": w.evolution_notes,
        "created_at": w.created_at.isoformat() if w.created_at else "",
        "updated_at": w.updated_at.isoformat() if w.updated_at else "",
    }


# ─── Endpoints ────────────────────────────────────────────────────────────

@router.get("/types", response_model=list[WorkflowInfoResponse])
def list_workflow_types():
    """List all available workflow types with their step descriptions."""
    return get_all_workflow_info()


@router.get("/types/{workflow_type}", response_model=WorkflowInfoResponse)
def get_workflow_type_info(workflow_type: str):
    """Get detailed info about a specific workflow type."""
    info = get_workflow_info(workflow_type)
    if not info:
        raise HTTPException(status_code=404, detail=f"Unknown workflow type: {workflow_type}")
    return info


@router.get("/{product_id}", response_model=list[WorkflowResponse])
def list_product_workflows(
    product_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all workflow customizations for a product."""
    workflows = (
        db.query(ContentTypeWorkflow)
        .filter(ContentTypeWorkflow.product_id == product_id)
        .order_by(ContentTypeWorkflow.workflow_type, ContentTypeWorkflow.version.desc())
        .all()
    )
    return [_to_response(w) for w in workflows]


@router.get("/{product_id}/{workflow_type}", response_model=WorkflowResponse | None)
def get_product_workflow(
    product_id: str,
    workflow_type: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get the active workflow for a product + type. Returns null if using defaults."""
    if workflow_type not in WORKFLOW_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown workflow type: {workflow_type}")

    workflow = (
        db.query(ContentTypeWorkflow)
        .filter(
            ContentTypeWorkflow.product_id == product_id,
            ContentTypeWorkflow.workflow_type == workflow_type,
            ContentTypeWorkflow.is_active == True,  # noqa: E712
        )
        .order_by(ContentTypeWorkflow.version.desc())
        .first()
    )
    if not workflow:
        return None
    return _to_response(workflow)


@router.put("/{product_id}/{workflow_type}", response_model=WorkflowResponse)
def update_product_workflow(
    product_id: str,
    workflow_type: str,
    data: WorkflowUpdateRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Update a workflow's step prompts. Creates a new version (old version stays for comparison).

    This is the manual evolution path — the auto-evolution engine does the same
    but based on performance data analysis.
    """
    if workflow_type not in WORKFLOW_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown workflow type: {workflow_type}")

    # Find current active version
    current = (
        db.query(ContentTypeWorkflow)
        .filter(
            ContentTypeWorkflow.product_id == product_id,
            ContentTypeWorkflow.workflow_type == workflow_type,
            ContentTypeWorkflow.is_active == True,  # noqa: E712
        )
        .order_by(ContentTypeWorkflow.version.desc())
        .first()
    )

    current_version = current.version if current else 0

    # Deactivate current version
    if current:
        current.is_active = False

    # Create new version
    new_workflow = ContentTypeWorkflow(
        product_id=product_id,
        workflow_type=workflow_type,
        version=current_version + 1,
        is_active=True if data.is_active is None else data.is_active,
        step_prompts=json.dumps(data.step_prompts) if data.step_prompts else (current.step_prompts if current else None),
        quality_gate_rules=json.dumps(data.quality_gate_rules) if data.quality_gate_rules else (current.quality_gate_rules if current else None),
        parent_version=current_version if current_version > 0 else None,
        evolution_notes="Manual update via API",
    )
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)

    return _to_response(new_workflow)


@router.delete("/{product_id}/{workflow_type}")
def reset_product_workflow(
    product_id: str,
    workflow_type: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Reset a product's workflow to defaults (deactivates all custom versions)."""
    if workflow_type not in WORKFLOW_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown workflow type: {workflow_type}")

    workflows = (
        db.query(ContentTypeWorkflow)
        .filter(
            ContentTypeWorkflow.product_id == product_id,
            ContentTypeWorkflow.workflow_type == workflow_type,
        )
        .all()
    )

    for w in workflows:
        w.is_active = False

    db.commit()

    return {"reset": True, "workflow_type": workflow_type, "versions_deactivated": len(workflows)}


@router.get("/{product_id}/{workflow_type}/history", response_model=list[WorkflowResponse])
def get_workflow_history(
    product_id: str,
    workflow_type: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get version history for a product's workflow (for evolution tracking)."""
    workflows = (
        db.query(ContentTypeWorkflow)
        .filter(
            ContentTypeWorkflow.product_id == product_id,
            ContentTypeWorkflow.workflow_type == workflow_type,
        )
        .order_by(ContentTypeWorkflow.version.desc())
        .all()
    )
    return [_to_response(w) for w in workflows]
