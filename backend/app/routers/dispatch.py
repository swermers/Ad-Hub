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
    """Process incoming Telegram updates.

    Handles two types of updates:
    1. Callback queries (inline button taps) — approve/reject/sharpen/publish
    2. Text messages — treated as idea submissions, run through the pipeline

    No auth required — Telegram sends updates directly. We validate by
    checking the chat_id matches our configured chat.
    """
    # Handle callback queries (button taps)
    callback_query = update.get("callback_query")
    if callback_query:
        return await _handle_telegram_callback(callback_query, db)

    # Handle text messages (idea submissions)
    message = update.get("message", {})
    text = message.get("text", "").strip()
    from_chat = str(message.get("chat", {}).get("id", ""))

    if not text or from_chat != settings.telegram_chat_id:
        return {"ok": True}

    # Commands
    if text.startswith("/"):
        return await _handle_telegram_command(text, from_chat, db)

    # Regular text = idea submission
    # Use the first active product as default context
    from app.models import Product
    product = db.query(Product).filter(Product.status == "active").first()
    if not product:
        bot = _get_bot()
        if bot:
            await bot.send_notification("No active products configured. Add a product first.")
        return {"ok": True}

    bot = _get_bot()
    if bot:
        await bot.send_notification(f"Running your idea through the pipeline...\n\n<i>{text[:200]}</i>")

    # Create a fake user context for the pipeline
    # (Telegram webhook bypasses auth — we use a system context)
    from app.engines.prompt_defaults import load_prompt_set
    from app.engines.content_pipeline import extract_content_brief, generate_weekly_content
    from app.models.brand_profile import BrandProfile

    prompt_set = load_prompt_set(product.id, db)
    brand_profile = db.query(BrandProfile).filter(BrandProfile.product_id == product.id).first()

    try:
        content_brief = await extract_content_brief(text, product, prompt_set=prompt_set)

        pieces = await generate_weekly_content(
            product=product,
            transcript=text,
            content_brief=content_brief,
            brand_profile=brand_profile,
            prompt_set=prompt_set,
        )

        # Save and send for approval
        for piece_data in pieces:
            ct = piece_data.get("content_type", "social_post")
            content_type_map = {"newsletter": "blog_draft", "video_script": "blog_draft", "x_thread": "social_post"}

            piece = ContentPiece(
                product_id=product.id,
                content_type=content_type_map.get(ct, ct),
                platform=piece_data.get("platform", "general"),
                title=piece_data.get("title", ""),
                body=piece_data.get("body", ""),
                hook=piece_data.get("hook"),
                cta=piece_data.get("cta"),
                funnel_stage=piece_data.get("funnel_stage", "awareness"),
                status="pending_approval",
                generation_metadata=piece_data.get("metadata"),
            )
            db.add(piece)
            db.flush()

            if bot:
                try:
                    await bot.send_approval_request(
                        content_id=piece.id,
                        scheduled_post_id=None,
                        platform=piece.platform,
                        title=piece.title,
                        body=piece.body,
                        hook=piece.hook,
                        cta=piece.cta,
                        content_type=piece.content_type,
                    )
                except Exception as e:
                    logger.warning("Failed to send piece to Telegram: %s", e)

        db.commit()

        _log_dispatch(db, "telegram_idea_submitted", product.id, "telegram", {
            "idea": text[:200],
            "pieces_generated": len(pieces),
            "seed": content_brief.get("seed", ""),
        })

    except Exception as e:
        logger.error("Telegram idea pipeline failed: %s", e)
        if bot:
            await bot.send_notification(f"Pipeline failed: {str(e)[:200]}")

    return {"ok": True}


async def _handle_telegram_callback(callback_query: dict, db: Session) -> dict:
    """Handle inline button taps."""
    callback_data = callback_query.get("data", "")
    from_chat = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))
    callback_id = callback_query.get("id", "")
    message_id = callback_query.get("message", {}).get("message_id")

    if from_chat != settings.telegram_chat_id:
        logger.warning("Telegram callback from unauthorized chat: %s", from_chat)
        return {"ok": True}

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


async def _handle_telegram_command(text: str, chat_id: str, db: Session) -> dict:
    """Handle /commands from Telegram."""
    bot = _get_bot()
    if not bot:
        return {"ok": True}

    cmd = text.split()[0].lower()

    if cmd == "/queue":
        pending = (
            db.query(ContentPiece)
            .filter(ContentPiece.status.in_(["pending_approval", "draft_injected"]))
            .order_by(ContentPiece.created_at.desc())
            .limit(5)
            .all()
        )
        if not pending:
            await bot.send_notification("No pending content in the queue.")
        else:
            lines = [f"<b>{len(pending)} pending items:</b>\n"]
            for p in pending:
                title = p.title or p.body[:40]
                lines.append(f"- <i>{title}</i> ({p.platform}, {p.status})")
            await bot.send_notification("\n".join(lines))

    elif cmd == "/kill":
        from app.models.campaign import Campaign
        campaigns = db.query(Campaign).filter(Campaign.status == "active").all()
        for c in campaigns:
            c.status = "paused"
        db.commit()
        await bot.send_notification(f"Kill switch activated. {len(campaigns)} campaigns paused.")

    elif cmd in ("/help", "/start"):
        await bot.send_notification(
            "<b>Clawd Bot Commands</b>\n\n"
            "Just text me an idea and I'll run it through the content pipeline.\n\n"
            "/queue — View pending approval items\n"
            "/kill — Emergency pause all campaigns\n"
            "/help — This message"
        )

    else:
        await bot.send_notification(f"Unknown command: {cmd}\nSend /help for available commands.")

    return {"ok": True}


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


# ─── Telegram Idea Submission (text an idea → pipeline → approval) ────────────


class IdeaSubmission(BaseModel):
    """Submit an idea from Telegram or dashboard to run through the pipeline."""
    product_id: str
    idea: str  # The raw idea / concept / thought
    voice_profile_id: str | None = None
    content_types: list[str] | None = None  # ["x_thread", "social_post"] — defaults to all
    template_override: str | None = None


@router.post("/submit-idea")
async def submit_idea(
    data: IdeaSubmission,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Submit a raw idea and run it through the full content pipeline.

    This is the endpoint Telegram messages route to: you text an idea,
    the system runs Idea Sharpener → Drafter → Expand → saves as drafts,
    then sends each piece back to Telegram for approval.
    """
    from app.models import Product

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Run the pipeline (reuses existing pipeline logic)
    from app.engines.prompt_defaults import load_prompt_set
    from app.engines.content_pipeline import extract_content_brief, generate_weekly_content
    from app.models.brand_profile import BrandProfile

    prompt_set = load_prompt_set(data.product_id, db, voice_profile_id=data.voice_profile_id)
    brand_profile = db.query(BrandProfile).filter(BrandProfile.product_id == data.product_id).first()

    # Step 1: Sharpen the idea
    content_brief = await extract_content_brief(data.idea, product, prompt_set=prompt_set)

    # Step 2+3: Generate content (optionally filter weekly mix by requested types)
    weekly_mix = prompt_set.get("weekly_mix")
    if data.content_types:
        type_map = {
            "social_post": "social_post",
            "social": "social_post",
            "newsletter": "newsletter",
            "video_script": "video_script",
            "video": "video_script",
            "x_thread": "x_thread",
            "thread": "x_thread",
        }
        requested = {type_map.get(t, t) for t in data.content_types}
        weekly_mix = [item for item in (weekly_mix or []) if item.get("content_type") in requested]
        if not weekly_mix:
            # Build a simple mix from requested types
            weekly_mix = [
                {"day": "Today", "content_type": ct, "platform": "twitter" if ct == "x_thread" else "general", "purpose": f"Generated from idea"}
                for ct in requested
            ]

    if data.template_override:
        content_brief["template_fit"] = data.template_override

    pieces = await generate_weekly_content(
        product=product,
        transcript=data.idea,
        content_brief=content_brief,
        weekly_mix=weekly_mix,
        brand_profile=brand_profile,
        prompt_set=prompt_set,
    )

    # Save pieces and send to Telegram for approval
    saved_ids = []
    bot = _get_bot()

    for piece_data in pieces:
        ct = piece_data.get("content_type", "social_post")
        content_type_map = {"newsletter": "blog_draft", "video_script": "blog_draft", "x_thread": "social_post"}

        piece = ContentPiece(
            product_id=data.product_id,
            content_type=content_type_map.get(ct, ct),
            platform=piece_data.get("platform", "general"),
            title=piece_data.get("title", ""),
            body=piece_data.get("body", ""),
            hook=piece_data.get("hook"),
            cta=piece_data.get("cta"),
            funnel_stage=piece_data.get("funnel_stage", "awareness"),
            status="pending_approval",
            generation_metadata=piece_data.get("metadata"),
        )
        db.add(piece)
        db.flush()
        saved_ids.append(piece.id)

        # Send to Telegram if configured
        if bot:
            try:
                await bot.send_approval_request(
                    content_id=piece.id,
                    scheduled_post_id=None,
                    platform=piece.platform,
                    title=piece.title,
                    body=piece.body,
                    hook=piece.hook,
                    cta=piece.cta,
                    content_type=piece.content_type,
                )
            except Exception as e:
                logger.warning("Failed to send piece %s to Telegram: %s", piece.id, e)

    _log_dispatch(db, "idea_submitted", saved_ids[0] if saved_ids else "", "telegram" if bot else "dashboard", {
        "idea": data.idea[:200],
        "pieces_generated": len(saved_ids),
        "content_types": data.content_types,
        "seed": content_brief.get("seed", ""),
    })

    return {
        "pieces_generated": len(saved_ids),
        "content_ids": saved_ids,
        "seed": content_brief.get("seed", ""),
        "verdict": content_brief.get("verdict", ""),
        "sent_to_telegram": bot is not None,
    }


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
