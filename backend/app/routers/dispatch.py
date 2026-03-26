"""Dispatch Router — Telegram webhook + approval-driven publishing.

Handles:
1. Telegram webhook callbacks (approve/sharpen/reject/publish)
2. Manual dispatch triggers from the dashboard
3. Draft injection for pending content
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import ContentPiece, ScheduledPost
from app.models.campaign import AgentLog
from app.permissions import get_current_user, require_human

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Request Models ───────────────────────────────────────────────────────────


class DispatchAction(BaseModel):
    """Manual approval action from the dashboard."""
    action: str  # approve, reject, sharpen, publish
    content_id: str
    scheduled_post_id: str | None = None
    feedback: str | None = None  # For sharpen: what to improve


class TelegramWebhookSetup(BaseModel):
    webhook_url: str


# ─── Telegram Webhook (receives callbacks from Clawd Bot) ─────────────────────


@router.post("/telegram/webhook")
async def telegram_webhook(update: dict, db: Session = Depends(get_db)):
    """Process incoming Telegram updates (callback queries from inline buttons).

    This endpoint is called by Telegram when a user taps an inline button.
    No auth required — Telegram sends updates directly. We validate by
    checking the chat_id matches our configured chat.
    """
    callback_query = update.get("callback_query")
    if not callback_query:
        return {"ok": True}

    callback_data = callback_query.get("data", "")
    from_chat = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))
    callback_id = callback_query.get("id", "")
    message_id = callback_query.get("message", {}).get("message_id")

    # Verify the callback is from our authorized chat
    if from_chat != settings.telegram_chat_id:
        logger.warning("Telegram callback from unauthorized chat: %s", from_chat)
        return {"ok": True}

    # Parse callback data: action:content_id:scheduled_post_id
    parts = callback_data.split(":")
    if len(parts) < 3:
        return {"ok": True}

    action, content_id, sp_id = parts[0], parts[1], parts[2]
    scheduled_post_id = sp_id if sp_id != "none" else None

    result = await _handle_dispatch_action(
        db=db,
        action=action,
        content_id=content_id,
        scheduled_post_id=scheduled_post_id,
        source="telegram",
    )

    # Acknowledge the callback and update the message
    bot = _get_bot()
    if bot:
        status_emoji = {"approve": "Approved", "reject": "Rejected", "sharpen": "Sharpening...", "publish": "Published"}.get(action, action)
        await bot.answer_callback(callback_id, f"{status_emoji}")

        if message_id:
            content = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
            title = content.title or content.body[:50] if content else "Content"
            await bot.edit_message(
                message_id,
                f"<b>{status_emoji}</b>\n\n<i>{title}</i>\n\nAction: {action} via Telegram",
            )

    return {"ok": True, "result": result}


# ─── Dashboard Dispatch (manual approval from web UI) ─────────────────────────


@router.post("/action", dependencies=[Depends(require_human)])
async def dispatch_action(
    data: DispatchAction,
    db: Session = Depends(get_db),
):
    """Approve, reject, sharpen, or publish content from the dashboard."""
    result = await _handle_dispatch_action(
        db=db,
        action=data.action,
        content_id=data.content_id,
        scheduled_post_id=data.scheduled_post_id,
        feedback=data.feedback,
        source="dashboard",
    )
    return result


# ─── Send to Telegram for Approval ────────────────────────────────────────────


@router.post("/send-for-approval/{content_id}")
async def send_for_approval(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Push a content piece to Telegram for approval.

    Can be triggered manually or by the autonomous loop.
    """
    content = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Find associated scheduled post if any
    scheduled_post = (
        db.query(ScheduledPost)
        .filter(ScheduledPost.content_id == content_id)
        .first()
    )

    bot = _get_bot()
    if not bot:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")

    result = await bot.send_approval_request(
        content_id=content.id,
        scheduled_post_id=scheduled_post.id if scheduled_post else None,
        platform=content.platform,
        title=content.title,
        body=content.body,
        hook=content.hook,
        cta=content.cta,
        content_type=content.content_type,
    )

    # Update status
    content.status = "pending_approval"
    db.commit()

    return {
        "sent": True,
        "content_id": content.id,
        "telegram_message_id": result.get("result", {}).get("message_id"),
    }


# ─── Batch Send Pending Content ───────────────────────────────────────────────


@router.post("/send-pending/{product_id}")
async def send_pending_for_approval(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Send all pending_approval content for a product to Telegram."""
    pending = (
        db.query(ContentPiece)
        .filter(
            ContentPiece.product_id == product_id,
            ContentPiece.status.in_(["draft", "pending_approval"]),
        )
        .order_by(ContentPiece.created_at.desc())
        .limit(10)
        .all()
    )

    bot = _get_bot()
    if not bot:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")

    sent_count = 0
    for content in pending:
        scheduled_post = (
            db.query(ScheduledPost)
            .filter(ScheduledPost.content_id == content.id)
            .first()
        )

        try:
            await bot.send_approval_request(
                content_id=content.id,
                scheduled_post_id=scheduled_post.id if scheduled_post else None,
                platform=content.platform,
                title=content.title,
                body=content.body,
                hook=content.hook,
                cta=content.cta,
                content_type=content.content_type,
            )
            content.status = "pending_approval"
            sent_count += 1
        except Exception as e:
            logger.error("Failed to send content %s to Telegram: %s", content.id, e)

    db.commit()
    return {"sent": sent_count, "total_pending": len(pending)}


# ─── Webhook Setup ────────────────────────────────────────────────────────────


@router.post("/telegram/setup-webhook", dependencies=[Depends(require_human)])
async def setup_telegram_webhook(data: TelegramWebhookSetup):
    """Register the Telegram webhook URL. Call once during deployment."""
    bot = _get_bot()
    if not bot:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")

    result = await bot.set_webhook(data.webhook_url)
    return result


# ─── Approval Queue (read-only, for dashboard) ───────────────────────────────


@router.get("/queue")
def approval_queue(
    product_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List content awaiting approval — displayed on dashboard and synced with Telegram."""
    q = db.query(ContentPiece).filter(
        ContentPiece.status.in_(["pending_approval", "draft_injected"])
    )
    if product_id:
        q = q.filter(ContentPiece.product_id == product_id)

    pieces = q.order_by(ContentPiece.created_at.desc()).limit(50).all()

    results = []
    for p in pieces:
        scheduled = (
            db.query(ScheduledPost)
            .filter(ScheduledPost.content_id == p.id)
            .first()
        )
        results.append({
            "content_id": p.id,
            "product_id": p.product_id,
            "platform": p.platform,
            "content_type": p.content_type,
            "title": p.title,
            "body": p.body[:200] + "..." if len(p.body) > 200 else p.body,
            "hook": p.hook,
            "cta": p.cta,
            "status": p.status,
            "scheduled_post_id": scheduled.id if scheduled else None,
            "scheduled_at": scheduled.scheduled_at.isoformat() if scheduled else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {"queue": results, "count": len(results)}


# ─── Internal Helpers ─────────────────────────────────────────────────────────


def _get_bot():
    """Get a configured ClawdBot instance, or None if not configured."""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return None
    from app.services.telegram_bot import ClawdBot
    return ClawdBot(token=settings.telegram_bot_token, chat_id=settings.telegram_chat_id)


async def _handle_dispatch_action(
    db: Session,
    action: str,
    content_id: str,
    scheduled_post_id: str | None = None,
    feedback: str | None = None,
    source: str = "dashboard",
) -> dict:
    """Core dispatch logic shared by Telegram webhook and dashboard."""
    content = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    scheduled_post = None
    if scheduled_post_id:
        scheduled_post = db.query(ScheduledPost).filter(ScheduledPost.id == scheduled_post_id).first()

    if action == "approve":
        content.status = "approved"

        # If there's a scheduled post, inject as draft on Meta
        if scheduled_post:
            from app.engines.distribution import inject_draft
            try:
                await inject_draft(db, scheduled_post)
            except Exception as e:
                logger.error("Draft injection failed for %s: %s", content_id, e)
                # Still mark approved even if injection fails

        _log_dispatch(db, "content_approved", content_id, source)
        return {"action": "approved", "content_id": content_id, "draft_injected": scheduled_post is not None}

    elif action == "publish":
        # Approve AND publish immediately
        content.status = "posted"

        if scheduled_post and scheduled_post.platform_post_id:
            # Draft was already injected — publish it
            from app.engines.distribution import publish_draft_post
            try:
                await publish_draft_post(db, scheduled_post)
            except Exception as e:
                logger.error("Publish failed for %s: %s", content_id, e)
                raise HTTPException(status_code=500, detail=f"Publish failed: {e}")
        elif scheduled_post:
            # No draft yet — post directly
            from app.engines.distribution import post_to_platform
            try:
                await post_to_platform(db, scheduled_post)
            except Exception as e:
                logger.error("Direct post failed for %s: %s", content_id, e)
                raise HTTPException(status_code=500, detail=f"Post failed: {e}")

        _log_dispatch(db, "content_published", content_id, source)
        return {"action": "published", "content_id": content_id}

    elif action == "reject":
        content.status = "rejected"

        if scheduled_post:
            scheduled_post.status = "cancelled"

        _log_dispatch(db, "content_rejected", content_id, source)
        return {"action": "rejected", "content_id": content_id}

    elif action == "sharpen":
        content.status = "draft"  # Send back to draft for re-generation

        # Trigger re-generation with feedback
        if feedback:
            meta = content.generation_metadata or "{}"
            try:
                meta_dict = json.loads(meta)
            except (json.JSONDecodeError, TypeError):
                meta_dict = {}
            meta_dict["sharpen_feedback"] = feedback
            content.generation_metadata = json.dumps(meta_dict)

        _log_dispatch(db, "content_sharpened", content_id, source, {"feedback": feedback})

        # Notify via Telegram that sharpening was requested
        bot = _get_bot()
        if bot and source != "telegram":
            await bot.send_notification(f"Content sharpened (from {source}): {content.title or content.body[:50]}")

        return {"action": "sharpened", "content_id": content_id, "feedback": feedback}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")


def _log_dispatch(db: Session, action_type: str, content_id: str, source: str, extra: dict | None = None):
    """Log dispatch actions for audit trail."""
    details = {"content_id": content_id, "source": source}
    if extra:
        details.update(extra)

    log = AgentLog(
        agent_id=f"dispatch-{source}",
        action_type=action_type,
        resource_type="content",
        resource_id=content_id,
        details=json.dumps(details),
        approval_required=False,
    )
    db.add(log)
    db.commit()
