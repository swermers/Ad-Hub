"""Agent API Router — Endpoints designed for programmatic agent access.

These endpoints are what the OpenClaw agent on the Raspberry Pi calls
to interact with Ad-Hub's creative engine, campaign management, and
safety guardrails. All responses are JSON, designed for machine consumption.
"""

import json
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdVariation, ContentPiece, OptimizationConfig, OptimizationLog, Product
from app.models.campaign import AgentLog, Campaign, SafetyGuardrail
from app.permissions import deny_agent, require_human

router = APIRouter()

_task_status: dict[str, dict] = {}


# ─── Request / Response Models ────────────────────────────────────────────────


class TranscriptRequest(BaseModel):
    """Voice memo transcript → weekly content."""

    transcript: str
    product_id: str
    weekly_mix: list[dict] | None = None  # override default content calendar
    instructions: str | None = None


class CreativeBundleRequest(BaseModel):
    """Generate a complete creative package in one call."""

    product_id: str
    pain_point_text: str
    desired_outcome: str | None = None
    template_type: str = "pain_solution"
    platforms: list[str] = ["meta"]
    funnel_stage: str = "awareness"
    generate_image: bool = False
    aspect_ratio: str = "1:1"


class PerformanceReportRequest(BaseModel):
    """Ingest performance metrics from the agent."""

    campaign_id: str | None = None
    ad_variation_id: str | None = None
    platform: str
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    spend: float = 0.0
    ctr: float | None = None
    cpm: float | None = None
    roas: float | None = None
    collected_at: str | None = None  # ISO datetime, defaults to now


class CampaignCreateRequest(BaseModel):
    """Create a new campaign (requires approval for launch)."""

    product_id: str
    platform: str  # meta, google
    name: str
    objective: str = "traffic"
    daily_budget: float = 10.0
    lifetime_budget: float | None = None
    targeting_config: dict | None = None
    destination_url: str | None = None
    variation_ids: list[str] = []


class GuardrailRequest(BaseModel):
    """Create or update a safety guardrail."""

    product_id: str | None = None
    rule_type: str
    threshold_value: float
    action: str = "alert"
    cooldown_hours: int = 48
    enabled: bool = True


class ApprovalRequest(BaseModel):
    approved: bool


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    pieces_generated: int = 0
    content_brief: dict | None = None
    error: str | None = None


# ─── Audio Transcription (Whisper) ────────────────────────────────────────────


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe an audio file using OpenAI Whisper.

    Accepts common audio formats: mp3, mp4, m4a, wav, webm, ogg, flac.
    Returns the transcript text ready to feed into the content pipeline.
    """
    import openai

    from app.config import settings

    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    allowed_types = {
        "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/wav",
        "audio/webm", "audio/ogg", "audio/flac", "audio/x-m4a",
        "video/mp4", "video/webm",  # some voice memo apps save as video
    }
    # Also check by extension since content_type can be unreliable
    allowed_extensions = {".mp3", ".mp4", ".m4a", ".wav", ".webm", ".ogg", ".flac"}

    ext = ""
    if file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""

    if file.content_type not in allowed_types and ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {file.content_type}. Use mp3, m4a, wav, webm, ogg, or flac.",
        )

    try:
        client = openai.OpenAI(api_key=settings.openai_api_key)
        audio_bytes = await file.read()

        # Whisper needs a file-like object with a name
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = file.filename or "audio.m4a"

        transcription = client.audio.transcriptions.create(
            model=settings.whisper_model,
            file=audio_file,
            response_format="text",
        )

        return {
            "transcript": transcription,
            "filename": file.filename,
            "duration_hint": f"{len(audio_bytes) / 1024:.0f} KB",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ─── System Status ────────────────────────────────────────────────────────────


@router.get("/status")
def system_status(db: Session = Depends(get_db)):
    """System health + active campaigns + pending actions.

    The agent calls this on startup and periodically to understand current state.
    """

    products = db.query(Product).filter(Product.status == "active").all()
    campaigns = db.query(Campaign).filter(Campaign.status.in_(["active", "paused"])).all()
    pending_approvals = (
        db.query(AgentLog)
        .filter(AgentLog.approval_required == True, AgentLog.approved == None)  # noqa: E711, E712
        .count()
    )
    active_guardrails = db.query(SafetyGuardrail).filter(SafetyGuardrail.enabled == True).count()  # noqa: E712

    # Recent agent actions (last 24h)
    recent_cutoff = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    recent_actions = (
        db.query(AgentLog)
        .filter(AgentLog.created_at >= recent_cutoff)
        .order_by(AgentLog.created_at.desc())
        .limit(20)
        .all()
    )

    return {
        "status": "ok",
        "products": [{"id": p.id, "name": p.name, "product_type": p.product_type} for p in products],
        "campaigns": [
            {
                "id": c.id,
                "name": c.name,
                "platform": c.platform,
                "status": c.status,
                "daily_budget": c.daily_budget,
                "total_spend": c.total_spend,
            }
            for c in campaigns
        ],
        "pending_approvals": pending_approvals,
        "active_guardrails": active_guardrails,
        "recent_actions": [
            {
                "id": a.id,
                "action_type": a.action_type,
                "resource_type": a.resource_type,
                "details": json.loads(a.details) if a.details else {},
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_actions
        ],
    }


# ─── Content from Transcript (Voice Memo Pipeline) ───────────────────────────


def _run_transcript_pipeline(
    task_id: str,
    product_id: str,
    transcript: str,
    weekly_mix: list[dict] | None,
    instructions: str | None,
):
    """Run the voice memo → content pipeline in a background thread."""
    from app.database import SessionLocal
    from app.engines.content_pipeline import generate_weekly_content_sync
    from app.models.brand_profile import BrandProfile

    _task_status[task_id] = {"status": "running", "pieces_generated": 0, "content_brief": None, "error": None}

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            _task_status[task_id] = {"status": "failed", "pieces_generated": 0, "error": "Product not found"}
            return

        # Load brand profile for constraint enforcement
        brand_profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()

        pieces = generate_weekly_content_sync(
            product=product,
            transcript=transcript,
            weekly_mix=weekly_mix,
            instructions=instructions,
            brand_profile=brand_profile,
        )

        # Save as ContentPiece records
        for piece_data in pieces:
            piece = ContentPiece(
                product_id=product_id,
                content_type=piece_data["content_type"],
                platform=piece_data["platform"],
                title=piece_data.get("title"),
                body=piece_data["body"],
                hook=piece_data.get("hook"),
                cta=piece_data.get("cta"),
                funnel_stage=piece_data.get("funnel_stage", "awareness"),
                status="draft",
                generation_metadata=piece_data.get("metadata"),
            )
            db.add(piece)

        # Log the agent action
        log = AgentLog(
            action_type="transcript_processed",
            resource_type="content",
            details=json.dumps({
                "transcript_length": len(transcript),
                "pieces_generated": len(pieces),
                "product_id": product_id,
            }),
        )
        db.add(log)
        db.commit()

        # Extract brief from metadata for response
        brief = None
        if pieces and pieces[0].get("metadata"):
            try:
                meta = json.loads(pieces[0]["metadata"])
                brief = {"weekly_theme": meta.get("weekly_theme", "")}
            except (json.JSONDecodeError, TypeError):
                pass

        _task_status[task_id] = {
            "status": "completed",
            "pieces_generated": len(pieces),
            "content_brief": brief,
            "error": None,
        }
    except Exception as e:
        _task_status[task_id] = {"status": "failed", "pieces_generated": 0, "error": str(e)}
    finally:
        db.close()


@router.post("/content-from-transcript", response_model=TaskStatusResponse)
def content_from_transcript(
    data: TranscriptRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Generate a week of content from a voice memo transcript.

    The agent sends the Whisper-transcribed text, and Ad-Hub generates
    a full content calendar (7 pieces across platforms).
    """

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "pieces_generated": 0, "content_brief": None, "error": None}

    background_tasks.add_task(
        _run_transcript_pipeline,
        task_id,
        data.product_id,
        data.transcript,
        data.weekly_mix,
        data.instructions,
    )

    return TaskStatusResponse(task_id=task_id, status="pending")


@router.get("/content-from-transcript-status/{task_id}", response_model=TaskStatusResponse)
def get_transcript_status(task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatusResponse(task_id=task_id, **status)


# ─── Creative Bundle (One-Shot Ad Package) ────────────────────────────────────


def _run_creative_bundle(
    task_id: str,
    product_id: str,
    pain_point_text: str,
    desired_outcome: str,
    template_type: str,
    platforms: list[str],
    funnel_stage: str,
    generate_image: bool,
    aspect_ratio: str,
):
    """Generate a complete creative package: copy + optional image."""
    from app.database import SessionLocal
    from app.engines.generation import generate_content_batch_sync
    from app.models.brand_profile import BrandProfile

    _task_status[task_id] = {"status": "running", "pieces_generated": 0, "error": None}

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            _task_status[task_id] = {"status": "failed", "pieces_generated": 0, "error": "Product not found"}
            return

        # Load brand profile for constraint enforcement
        brand_profile = db.query(BrandProfile).filter(BrandProfile.product_id == product_id).first()

        # Generate ad copy variations
        instructions = f"Pain Point: {pain_point_text}"
        if desired_outcome:
            instructions += f"\nDesired Outcome: {desired_outcome}"
        instructions += f"\nAd Style: {template_type}"

        content_types = ["ad_copy"]
        pieces = generate_content_batch_sync(
            product=product,
            content_types=content_types,
            platforms=platforms,
            count=3,  # 3 variations per platform
            funnel_stage=funnel_stage,
            instructions=instructions,
            brand_profile=brand_profile,
        )

        # Save as ContentPiece records
        saved_ids = []
        for piece_data in pieces:
            piece = ContentPiece(
                product_id=product_id,
                content_type=piece_data["content_type"],
                platform=piece_data["platform"],
                title=piece_data.get("title"),
                body=piece_data["body"],
                hook=piece_data.get("hook"),
                cta=piece_data.get("cta"),
                funnel_stage=funnel_stage,
                template_type=template_type,
                aspect_ratio=aspect_ratio,
                status="draft",
                generation_metadata=piece_data.get("metadata"),
            )
            db.add(piece)
            db.flush()
            saved_ids.append(piece.id)

        # Optionally generate image for the first piece
        image_url = None
        if generate_image and pieces:
            try:
                from app.engines.image_gen import generate_ad_image

                first = pieces[0]
                image_url = generate_ad_image(
                    product=product,
                    headline=first.get("hook", ""),
                    body=first.get("body", ""),
                    cta=first.get("cta", ""),
                    aspect_ratio=aspect_ratio,
                )
                # Attach image to first content piece
                if image_url and saved_ids:
                    cp = db.query(ContentPiece).filter(ContentPiece.id == saved_ids[0]).first()
                    if cp:
                        cp.image_url = image_url
            except Exception:
                pass  # Image gen failure shouldn't fail the whole bundle

        # Log it
        log = AgentLog(
            action_type="content_generated",
            resource_type="content",
            details=json.dumps({
                "product_id": product_id,
                "pain_point": pain_point_text,
                "pieces_generated": len(pieces),
                "image_generated": image_url is not None,
                "content_ids": saved_ids,
            }),
        )
        db.add(log)
        db.commit()

        _task_status[task_id] = {
            "status": "completed",
            "pieces_generated": len(pieces),
            "content_ids": saved_ids,
            "image_url": image_url,
            "error": None,
        }
    except Exception as e:
        _task_status[task_id] = {"status": "failed", "pieces_generated": 0, "error": str(e)}
    finally:
        db.close()


@router.post("/creative-bundle")
def generate_creative_bundle(
    data: CreativeBundleRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Generate a complete creative package: ad copy variations + optional image.

    One call from the agent gets everything needed to launch an ad.
    """

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    task_id = str(uuid.uuid4())
    _task_status[task_id] = {"status": "pending", "pieces_generated": 0, "error": None}

    background_tasks.add_task(
        _run_creative_bundle,
        task_id,
        data.product_id,
        data.pain_point_text,
        data.desired_outcome or "",
        data.template_type,
        data.platforms,
        data.funnel_stage,
        data.generate_image,
        data.aspect_ratio,
    )

    return {"task_id": task_id, "status": "pending"}


@router.get("/creative-bundle-status/{task_id}")
def get_creative_bundle_status(task_id: str):
    status = _task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task_id, **status}


# ─── Campaign Management ─────────────────────────────────────────────────────


@router.post("/campaigns")
def create_campaign(data: CampaignCreateRequest, db: Session = Depends(get_db)):
    """Create a new campaign. Status starts as 'draft' — requires approval to go live."""

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check guardrails before creating
    guardrails = (
        db.query(SafetyGuardrail)
        .filter(
            SafetyGuardrail.enabled == True,  # noqa: E712
            SafetyGuardrail.rule_type == "campaign_spend_cap",
            ((SafetyGuardrail.product_id == data.product_id) | (SafetyGuardrail.product_id == None)),  # noqa: E711
        )
        .all()
    )

    for g in guardrails:
        if data.daily_budget > g.threshold_value:
            raise HTTPException(
                status_code=400,
                detail=f"Daily budget ${data.daily_budget} exceeds guardrail cap ${g.threshold_value}",
            )

    campaign = Campaign(
        product_id=data.product_id,
        platform=data.platform,
        name=data.name,
        objective=data.objective,
        daily_budget=data.daily_budget,
        lifetime_budget=data.lifetime_budget,
        targeting_config=json.dumps(data.targeting_config or {}),
        destination_url=data.destination_url,
        status="draft",
    )
    db.add(campaign)
    db.flush()

    # Log with approval required
    log = AgentLog(
        action_type="campaign_created",
        resource_type="campaign",
        resource_id=campaign.id,
        details=json.dumps({
            "product_id": data.product_id,
            "platform": data.platform,
            "name": data.name,
            "daily_budget": data.daily_budget,
            "objective": data.objective,
        }),
        approval_required=True,
    )
    db.add(log)
    db.commit()

    return {
        "id": campaign.id,
        "name": campaign.name,
        "status": campaign.status,
        "daily_budget": campaign.daily_budget,
        "approval_required": True,
        "message": "Campaign created as draft. Awaiting approval to launch.",
    }


@router.get("/campaigns")
def list_campaigns(product_id: str | None = None, status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Campaign)
    if product_id:
        q = q.filter(Campaign.product_id == product_id)
    if status:
        q = q.filter(Campaign.status == status)
    campaigns = q.order_by(Campaign.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "product_id": c.product_id,
            "platform": c.platform,
            "name": c.name,
            "objective": c.objective,
            "status": c.status,
            "daily_budget": c.daily_budget,
            "lifetime_budget": c.lifetime_budget,
            "total_spend": c.total_spend,
            "targeting_config": json.loads(c.targeting_config) if c.targeting_config else {},
            "destination_url": c.destination_url,
            "start_date": c.start_date.isoformat() if c.start_date else None,
            "end_date": c.end_date.isoformat() if c.end_date else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in campaigns
    ]


@router.put("/campaigns/{campaign_id}")
def update_campaign(campaign_id: str, data: dict, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    allowed = {"name", "objective", "daily_budget", "lifetime_budget", "targeting_config", "destination_url", "status"}
    for key, value in data.items():
        if key in allowed:
            if key == "targeting_config" and isinstance(value, dict):
                value = json.dumps(value)
            setattr(campaign, key, value)

    db.commit()
    return {"id": campaign.id, "status": campaign.status, "updated": True}


# ─── Performance Data Ingestion ───────────────────────────────────────────────


@router.post("/report-performance")
def report_performance(data: PerformanceReportRequest, db: Session = Depends(get_db)):
    """Ingest performance metrics from the agent.

    The agent pulls data from Meta/Google APIs and pushes it here
    for storage, analysis, and guardrail evaluation.
    """

    from app.models import PerformanceMetric

    collected = datetime.fromisoformat(data.collected_at) if data.collected_at else datetime.now(timezone.utc)

    metric = PerformanceMetric(
        content_id=data.ad_variation_id,  # reuse content_id field for variation tracking
        platform=data.platform,
        impressions=data.impressions,
        clicks=data.clicks,
        conversions=data.conversions,
        spend=data.spend,
        ctr=data.ctr or (data.clicks / data.impressions * 100 if data.impressions > 0 else 0),
        collected_at=collected,
    )
    db.add(metric)

    # Update campaign total spend if campaign_id provided
    if data.campaign_id:
        campaign = db.query(Campaign).filter(Campaign.id == data.campaign_id).first()
        if campaign:
            campaign.total_spend += data.spend

    # Check guardrails
    triggered = _check_guardrails(db, data)

    # Log
    log = AgentLog(
        action_type="performance_ingested",
        resource_type="campaign" if data.campaign_id else "ad_variation",
        resource_id=data.campaign_id or data.ad_variation_id,
        details=json.dumps({
            "impressions": data.impressions,
            "clicks": data.clicks,
            "conversions": data.conversions,
            "spend": data.spend,
            "guardrails_triggered": triggered,
        }),
    )
    db.add(log)
    db.commit()

    return {
        "recorded": True,
        "guardrails_triggered": triggered,
    }


def _check_guardrails(db: Session, data: PerformanceReportRequest) -> list[dict]:
    """Check if any guardrails are triggered by the incoming metrics."""

    triggered = []
    guardrails = db.query(SafetyGuardrail).filter(SafetyGuardrail.enabled == True).all()  # noqa: E712

    for g in guardrails:
        fired = False

        if g.rule_type == "max_cpc" and data.clicks > 0:
            cpc = data.spend / data.clicks
            if cpc > g.threshold_value:
                fired = True
                triggered.append({"rule": "max_cpc", "value": cpc, "threshold": g.threshold_value, "action": g.action})

        elif g.rule_type == "pause_no_conversions" and data.conversions == 0:
            if data.spend > g.threshold_value:
                fired = True
                triggered.append({
                    "rule": "pause_no_conversions",
                    "spend": data.spend,
                    "threshold": g.threshold_value,
                    "action": g.action,
                })

        elif g.rule_type == "min_roas" and data.roas is not None:
            if data.roas < g.threshold_value:
                fired = True
                triggered.append({
                    "rule": "min_roas",
                    "roas": data.roas,
                    "threshold": g.threshold_value,
                    "action": g.action,
                })

        if fired:
            g.last_triggered_at = datetime.now(timezone.utc)

    return triggered


# ─── Safety Guardrails ────────────────────────────────────────────────────────


@router.get("/guardrails")
def list_guardrails(product_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(SafetyGuardrail)
    if product_id:
        q = q.filter(
            (SafetyGuardrail.product_id == product_id) | (SafetyGuardrail.product_id == None)  # noqa: E711
        )
    guardrails = q.order_by(SafetyGuardrail.created_at.desc()).all()
    return [
        {
            "id": g.id,
            "product_id": g.product_id,
            "rule_type": g.rule_type,
            "threshold_value": g.threshold_value,
            "action": g.action,
            "cooldown_hours": g.cooldown_hours,
            "enabled": g.enabled,
            "last_triggered_at": g.last_triggered_at.isoformat() if g.last_triggered_at else None,
        }
        for g in guardrails
    ]


@router.post("/guardrails", dependencies=[Depends(deny_agent)])
def create_guardrail(data: GuardrailRequest, db: Session = Depends(get_db)):
    guardrail = SafetyGuardrail(
        product_id=data.product_id,
        rule_type=data.rule_type,
        threshold_value=data.threshold_value,
        action=data.action,
        cooldown_hours=data.cooldown_hours,
        enabled=data.enabled,
    )
    db.add(guardrail)

    log = AgentLog(
        action_type="guardrail_created",
        resource_type="guardrail",
        details=json.dumps({
            "rule_type": data.rule_type,
            "threshold_value": data.threshold_value,
            "action": data.action,
        }),
    )
    db.add(log)
    db.commit()

    return {"id": guardrail.id, "rule_type": guardrail.rule_type, "enabled": guardrail.enabled}


@router.put("/guardrails/{guardrail_id}", dependencies=[Depends(deny_agent)])
def update_guardrail(guardrail_id: str, data: dict, db: Session = Depends(get_db)):
    guardrail = db.query(SafetyGuardrail).filter(SafetyGuardrail.id == guardrail_id).first()
    if not guardrail:
        raise HTTPException(status_code=404, detail="Guardrail not found")

    allowed = {"threshold_value", "action", "cooldown_hours", "enabled"}
    for key, value in data.items():
        if key in allowed:
            setattr(guardrail, key, value)

    db.commit()
    return {"id": guardrail.id, "updated": True}


@router.delete("/guardrails/{guardrail_id}", dependencies=[Depends(deny_agent)])
def delete_guardrail(guardrail_id: str, db: Session = Depends(get_db)):
    guardrail = db.query(SafetyGuardrail).filter(SafetyGuardrail.id == guardrail_id).first()
    if not guardrail:
        raise HTTPException(status_code=404, detail="Guardrail not found")
    db.delete(guardrail)
    db.commit()
    return {"deleted": True}


# ─── Kill Switch ──────────────────────────────────────────────────────────────


@router.post("/kill-switch", dependencies=[Depends(require_human)])
def kill_switch(db: Session = Depends(get_db)):
    """EMERGENCY: Pause all active campaigns immediately.

    The agent or you triggers this via Telegram /pause_all command.
    """

    campaigns = db.query(Campaign).filter(Campaign.status == "active").all()
    paused_count = 0

    for c in campaigns:
        c.status = "paused"
        paused_count += 1

    log = AgentLog(
        action_type="kill_switch_activated",
        resource_type="campaign",
        details=json.dumps({"campaigns_paused": paused_count}),
    )
    db.add(log)
    db.commit()

    return {"paused": paused_count, "message": f"Kill switch activated. {paused_count} campaigns paused."}


# ─── Approvals ────────────────────────────────────────────────────────────────


@router.get("/pending-approvals")
def pending_approvals(db: Session = Depends(get_db)):
    """List actions awaiting human approval."""

    logs = (
        db.query(AgentLog)
        .filter(AgentLog.approval_required == True, AgentLog.approved == None)  # noqa: E711, E712
        .order_by(AgentLog.created_at.desc())
        .all()
    )

    return [
        {
            "id": l.id,
            "action_type": l.action_type,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": json.loads(l.details) if l.details else {},
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


@router.post("/approve/{log_id}", dependencies=[Depends(require_human)])
def approve_action(log_id: str, data: ApprovalRequest, db: Session = Depends(get_db)):
    """Approve or reject a pending agent action."""

    log = db.query(AgentLog).filter(AgentLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    log.approved = data.approved
    log.approved_at = datetime.now(timezone.utc)

    # If approving a campaign creation, update campaign status
    if data.approved and log.action_type == "campaign_created" and log.resource_id:
        campaign = db.query(Campaign).filter(Campaign.id == log.resource_id).first()
        if campaign:
            campaign.status = "pending_approval"  # Next step: agent launches on platform

    db.commit()

    return {
        "id": log.id,
        "approved": data.approved,
        "action_type": log.action_type,
        "message": "Approved" if data.approved else "Rejected",
    }


# ─── Agent Activity Log ──────────────────────────────────────────────────────


@router.get("/activity-log")
def activity_log(limit: int = 50, action_type: str | None = None, db: Session = Depends(get_db)):
    """Full audit trail of agent actions."""

    q = db.query(AgentLog)
    if action_type:
        q = q.filter(AgentLog.action_type == action_type)
    logs = q.order_by(AgentLog.created_at.desc()).limit(limit).all()

    return [
        {
            "id": l.id,
            "agent_id": l.agent_id,
            "action_type": l.action_type,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": json.loads(l.details) if l.details else {},
            "approval_required": l.approval_required,
            "approved": l.approved,
            "approved_at": l.approved_at.isoformat() if l.approved_at else None,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


# ─── B-Roll Stock Media Search ────────────────────────────────────────────────


@router.get("/broll/search")
async def search_broll(
    query: str = Query(..., description="Search term for b-roll (e.g. 'calm ocean waves')"),
    media_type: str = Query("photos", description="'photos' or 'videos'"),
    per_page: int = Query(10, ge=1, le=30),
    orientation: str = Query("landscape", description="landscape, portrait, or square"),
):
    """Search Pexels for stock photos/videos to use as b-roll in compositions."""
    from app.config import settings

    if not settings.pexels_api_key:
        raise HTTPException(status_code=503, detail="Pexels API key not configured")

    headers = {"Authorization": settings.pexels_api_key}
    base = "https://api.pexels.com"

    async with httpx.AsyncClient() as client:
        if media_type == "videos":
            resp = await client.get(
                f"{base}/videos/search",
                headers=headers,
                params={"query": query, "per_page": per_page, "orientation": orientation},
            )
        else:
            resp = await client.get(
                f"{base}/v1/search",
                headers=headers,
                params={"query": query, "per_page": per_page, "orientation": orientation},
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Pexels API error")

        data = resp.json()

    if media_type == "videos":
        results = [
            {
                "id": v["id"],
                "url": v["url"],
                "image": v.get("image", ""),
                "duration": v.get("duration"),
                "video_files": [
                    {"link": f["link"], "width": f.get("width"), "height": f.get("height"), "quality": f.get("quality")}
                    for f in v.get("video_files", [])[:3]
                ],
                "photographer": v.get("user", {}).get("name", ""),
            }
            for v in data.get("videos", [])
        ]
    else:
        results = [
            {
                "id": p["id"],
                "url": p["url"],
                "src": {
                    "original": p["src"]["original"],
                    "large": p["src"].get("large", ""),
                    "medium": p["src"].get("medium", ""),
                },
                "alt": p.get("alt", ""),
                "photographer": p.get("photographer", ""),
            }
            for p in data.get("photos", [])
        ]

    return {"query": query, "media_type": media_type, "total_results": data.get("total_results", 0), "results": results}
