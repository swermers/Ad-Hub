"""
Video Render Router
-------------------
Server-side video rendering via Remotion. Kicks off a background render
task and exposes polling + download endpoints.

POST /api/video/render     → Start a render job (returns task_id)
GET  /api/video/render/{id} → Poll render status
GET  /api/video/render/{id}/download → Download rendered video
POST /api/video/render-content/{content_id} → Render from saved ContentPiece
"""

import json
import logging
import os
import subprocess
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.permissions import get_current_user
from app.models import ContentPiece

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── In-memory task store ───────────────────────────────────────────────────

_render_tasks: dict[str, dict] = {}

# ─── Paths ──────────────────────────────────────────────────────────────────

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent  # backend/
PROJECT_ROOT = BACKEND_DIR.parent                             # Ad-Hub/
FRONTEND_DIR = PROJECT_ROOT / "frontend"
RENDER_SCRIPT = FRONTEND_DIR / "scripts" / "render-video.mjs"
UPLOADS_DIR = BACKEND_DIR / "uploads" / "videos"

# Aspect ratio → pixel dimensions
ASPECT_DIMS = {
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
    "9:16": (1080, 1920),
}

# Styles that force a specific aspect ratio
FORCED_ASPECTS = {
    "swiss-story": "9:16",
    "social-proof": "9:16",
}

VALID_STYLES = {
    "default", "swiss-bold", "swiss-stack", "swiss-type", "swiss-grid",
    "swiss-minimal", "swiss-carousel", "swiss-story", "pas", "kinetic",
    "hand-drawn", "saas-demo", "data-hype", "social-proof", "image-overlay",
}


# ─── Request / Response Models ──────────────────────────────────────────────

class RenderRequest(BaseModel):
    headline: str
    body: str
    cta: str
    video_style: str = "default"
    aspect_ratio: str = "1:1"
    background_color: str = "#0f0f0e"
    text_color: str = "#fafaf8"
    accent_color: str = "#FF9500"
    screenshot_url: str | None = None
    slide_headlines: str | None = None
    codec: str = "h264"  # "h264" (mp4) or "vp8" (webm)


class RenderFromContentRequest(BaseModel):
    video_style: str | None = None   # override saved style
    aspect_ratio: str | None = None  # override saved aspect
    codec: str = "h264"


class RenderStatusResponse(BaseModel):
    task_id: str
    status: str  # "pending" | "rendering" | "completed" | "failed"
    progress: float | None = None  # 0-100
    video_url: str | None = None
    error: str | None = None
    duration_ms: int | None = None


# ─── Background render worker ──────────────────────────────────────────────

def _run_render(task_id: str, render_input: dict):
    """Execute the Node.js render script in a subprocess."""
    _render_tasks[task_id]["status"] = "rendering"

    try:
        result = subprocess.run(
            ["node", str(RENDER_SCRIPT), json.dumps(render_input)],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            cwd=str(FRONTEND_DIR),
        )

        if result.returncode != 0:
            stderr = result.stderr.strip()
            stdout = result.stdout.strip()
            error_msg = stderr or stdout or "Render process failed"
            logger.error("Render failed for task %s: %s", task_id, error_msg)
            _render_tasks[task_id].update({
                "status": "failed",
                "error": error_msg[:500],
            })
            return

        # Parse output JSON from the render script
        output = json.loads(result.stdout.strip().split("\n")[-1])

        if output.get("success"):
            output_path = output["outputPath"]
            filename = os.path.basename(output_path)
            _render_tasks[task_id].update({
                "status": "completed",
                "video_url": f"/uploads/videos/{filename}",
                "output_path": output_path,
                "duration_ms": output.get("durationMs"),
            })
            logger.info(
                "Render completed for task %s in %dms",
                task_id,
                output.get("durationMs", 0),
            )
        else:
            _render_tasks[task_id].update({
                "status": "failed",
                "error": output.get("error", "Unknown render error"),
            })

    except subprocess.TimeoutExpired:
        _render_tasks[task_id].update({
            "status": "failed",
            "error": "Render timed out after 5 minutes",
        })
    except Exception as e:
        logger.exception("Unexpected error in render task %s", task_id)
        _render_tasks[task_id].update({
            "status": "failed",
            "error": str(e)[:500],
        })


def _build_render_input(
    headline: str,
    body: str,
    cta: str,
    video_style: str,
    aspect_ratio: str,
    background_color: str,
    text_color: str,
    accent_color: str,
    screenshot_url: str | None,
    slide_headlines: str | None,
    codec: str,
    task_id: str,
) -> dict:
    """Build the JSON input for the render script."""
    # Validate style
    if video_style not in VALID_STYLES:
        raise ValueError(f"Invalid video_style: {video_style}")

    # Apply forced aspect ratios
    effective_aspect = FORCED_ASPECTS.get(video_style, aspect_ratio)
    if effective_aspect not in ASPECT_DIMS:
        effective_aspect = "1:1"

    width, height = ASPECT_DIMS[effective_aspect]
    ext = "webm" if codec == "vp8" else "mp4"
    output_path = str(UPLOADS_DIR / f"{task_id}.{ext}")

    return {
        "compositionId": video_style,
        "props": {
            "headline": headline,
            "body": body,
            "cta": cta,
            "backgroundColor": background_color,
            "textColor": text_color,
            "accentColor": accent_color,
            "aspectRatio": effective_aspect,
            "screenshotUrl": screenshot_url,
            "slideHeadlines": slide_headlines,
        },
        "outputPath": output_path,
        "codec": codec,
        "width": width,
        "height": height,
    }


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/render", response_model=RenderStatusResponse)
async def start_render(
    data: RenderRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Start a video render job. Returns a task_id for polling."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    task_id = str(uuid.uuid4())

    try:
        render_input = _build_render_input(
            headline=data.headline,
            body=data.body,
            cta=data.cta,
            video_style=data.video_style,
            aspect_ratio=data.aspect_ratio,
            background_color=data.background_color,
            text_color=data.text_color,
            accent_color=data.accent_color,
            screenshot_url=data.screenshot_url,
            slide_headlines=data.slide_headlines,
            codec=data.codec,
            task_id=task_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    _render_tasks[task_id] = {"status": "pending", "error": None, "video_url": None}
    background_tasks.add_task(_run_render, task_id, render_input)

    return RenderStatusResponse(task_id=task_id, status="pending")


@router.post("/render-content/{content_id}", response_model=RenderStatusResponse)
async def render_from_content(
    content_id: str,
    data: RenderFromContentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Render a video from a saved ContentPiece. Uses stored video_style and video_config."""
    piece = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Content piece not found")

    # Parse video_config
    video_config = {}
    if piece.video_config:
        try:
            video_config = json.loads(piece.video_config)
        except json.JSONDecodeError:
            pass

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    task_id = str(uuid.uuid4())

    try:
        render_input = _build_render_input(
            headline=piece.title or piece.hook or "Untitled",
            body=piece.body,
            cta=piece.cta or "Learn More",
            video_style=data.video_style or piece.video_style or "default",
            aspect_ratio=data.aspect_ratio or video_config.get("aspect_ratio") or piece.aspect_ratio or "1:1",
            background_color=video_config.get("background_color", "#0f0f0e"),
            text_color=video_config.get("text_color", "#fafaf8"),
            accent_color=video_config.get("accent_color", "#FF9500"),
            screenshot_url=None,
            slide_headlines=None,
            codec=data.codec,
            task_id=task_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    _render_tasks[task_id] = {
        "status": "pending",
        "error": None,
        "video_url": None,
        "content_id": content_id,
    }
    background_tasks.add_task(_run_render, task_id, render_input)

    return RenderStatusResponse(task_id=task_id, status="pending")


@router.get("/render/{task_id}", response_model=RenderStatusResponse)
async def get_render_status(
    task_id: str,
    user: dict = Depends(get_current_user),
):
    """Poll the status of a render job."""
    task = _render_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Render task not found")

    return RenderStatusResponse(
        task_id=task_id,
        status=task["status"],
        video_url=task.get("video_url"),
        error=task.get("error"),
        duration_ms=task.get("duration_ms"),
    )


@router.get("/render/{task_id}/download")
async def download_rendered_video(
    task_id: str,
    user: dict = Depends(get_current_user),
):
    """Download the rendered video file."""
    task = _render_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Render task not found")

    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Render is {task['status']}, not ready for download")

    output_path = task.get("output_path")
    if not output_path or not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Rendered file not found")

    filename = os.path.basename(output_path)
    media_type = "video/webm" if filename.endswith(".webm") else "video/mp4"

    return FileResponse(
        output_path,
        media_type=media_type,
        filename=f"adhub-video-{task_id[:8]}.{filename.split('.')[-1]}",
    )
