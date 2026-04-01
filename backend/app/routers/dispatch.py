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
from app.models import ContentPiece, Product, ScheduledPost
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

    # Handle all message types
    message = update.get("message", {})
    from_chat = str(message.get("chat", {}).get("id", ""))

    if from_chat != settings.telegram_chat_id:
        return {"ok": True}

    # Voice memo → transcribe → treat as text idea
    voice = message.get("voice") or message.get("audio")
    if voice:
        text = await _handle_telegram_voice(voice, message, db)
        if not text:
            return {"ok": True}
        # Check if this voice reply is to a content preview (refinement)
        reply_to = message.get("reply_to_message")
        if reply_to:
            content_id = _extract_content_id_from_message(reply_to)
            if content_id:
                return await _handle_telegram_refinement(content_id, text, db)
        # Fall through to idea processing with transcribed text
    else:
        text = message.get("text", "").strip()

    if not text:
        return {"ok": True}

    # Commands
    if text.startswith("/"):
        return await _handle_telegram_command(text, from_chat, db)

    # Reply to a content preview = refinement feedback
    reply_to = message.get("reply_to_message")
    if reply_to:
        content_id = _extract_content_id_from_message(reply_to)
        if content_id:
            return await _handle_telegram_refinement(content_id, text, db)

    # Parse content type prefix if present
    # Supported formats:
    #   "x thread: my idea here"
    #   "thread: my idea"
    #   "post: my idea"
    #   "video: my idea"
    #   "newsletter: my idea"
    #   "my idea" (no prefix = generate all types)
    content_types, idea_text = _parse_telegram_message(text)

    # Use the first active product as default context
    from app.models import Product
    product = db.query(Product).filter(Product.status == "active").first()
    if not product:
        bot = _get_bot()
        if bot:
            await bot.send_notification("No active products configured. Add a product first.")
        return {"ok": True}

    bot = _get_bot()
    type_label = ", ".join(content_types) if content_types else "full pipeline"
    if bot:
        await bot.send_notification(
            f"Generating <b>{type_label}</b>...\n\n<i>{idea_text[:200]}</i>"
        )

    from app.engines.prompt_defaults import load_prompt_set
    from app.models.brand_profile import BrandProfile

    prompt_set = load_prompt_set(product.id, db)
    brand_profile = db.query(BrandProfile).filter(BrandProfile.product_id == product.id).first()

    try:
        # If specific content types requested, use targeted generation
        if content_types:
            pieces = await _generate_targeted_content(
                idea_text, product, content_types, prompt_set, brand_profile
            )
        else:
            # Full pipeline: sharpener → drafter → expand to all formats
            from app.engines.content_pipeline import extract_content_brief, generate_weekly_content
            content_brief = await extract_content_brief(idea_text, product, prompt_set=prompt_set)
            pieces = await generate_weekly_content(
                product=product,
                transcript=idea_text,
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
            "idea": idea_text[:200],
            "pieces_generated": len(pieces),
            "content_types": content_types,
        })

    except Exception as e:
        logger.error("Telegram idea pipeline failed: %s", e)
        if bot:
            await bot.send_notification(f"Pipeline failed: {str(e)[:200]}")

    return {"ok": True}


async def _handle_telegram_voice(voice: dict, message: dict, db) -> str | None:
    """Download and transcribe a Telegram voice memo.

    Returns the transcribed text, or None if transcription fails.
    """
    import io
    import httpx

    bot = _get_bot()
    if not bot:
        return None

    # Notify user we're transcribing
    caption = message.get("caption", "")
    if bot:
        await bot.send_notification("Transcribing your voice memo...")

    try:
        file_id = voice.get("file_id")
        if not file_id:
            return None

        # Step 1: Get the file path from Telegram
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/getFile",
                params={"file_id": file_id},
            )
            resp.raise_for_status()
            file_path = resp.json().get("result", {}).get("file_path")
            if not file_path:
                return None

            # Step 2: Download the audio file
            audio_resp = await client.get(
                f"https://api.telegram.org/file/bot{settings.telegram_bot_token}/{file_path}",
            )
            audio_resp.raise_for_status()
            audio_bytes = audio_resp.content

        # Step 3: Transcribe with Whisper
        import openai
        from app.config import settings as app_settings

        if not app_settings.openai_api_key:
            if bot:
                await bot.send_notification("OpenAI API key not configured — can't transcribe voice memos.")
            return None

        openai_client = openai.OpenAI(api_key=app_settings.openai_api_key)
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "voice.ogg"

        transcription = openai_client.audio.transcriptions.create(
            model=app_settings.whisper_model,
            file=audio_file,
            response_format="text",
        )

        transcript = transcription.strip() if isinstance(transcription, str) else str(transcription).strip()

        if not transcript:
            if bot:
                await bot.send_notification("Couldn't make out the audio. Try again?")
            return None

        # Show the transcript + any caption
        display = transcript
        if caption:
            display = f"{caption}\n\n{transcript}"
        if bot:
            await bot.send_notification(f"Transcribed:\n\n<i>{display[:500]}</i>")

        # Prepend caption as additional context if present
        if caption:
            return f"{caption}\n\n{transcript}"
        return transcript

    except Exception as e:
        logger.error("Voice transcription failed: %s", e)
        if bot:
            await bot.send_notification(f"Transcription failed: {str(e)[:200]}")
        return None


def _extract_content_id_from_message(reply_msg: dict) -> str | None:
    """Extract content_id from a bot message the user is replying to.

    We embed a hidden link (adhub://content/{id}) in approval messages,
    and also check callback_data in inline keyboards.
    """
    import re

    # Check message text for hidden adhub:// link
    msg_text = reply_msg.get("text", "") or ""
    # Also check entities for URL type
    for entity in reply_msg.get("entities", []):
        if entity.get("type") == "text_link":
            url = entity.get("url", "")
            match = re.search(r"adhub://content/([a-f0-9-]+)", url)
            if match:
                return match.group(1)

    # Check inline keyboard callback data
    markup = reply_msg.get("reply_markup", {})
    for row in markup.get("inline_keyboard", []):
        for btn in row:
            cb = btn.get("callback_data", "")
            # Format: action:content_id:scheduled_post_id
            parts = cb.split(":")
            if len(parts) >= 2 and parts[1] and parts[1] != "none":
                return parts[1]

    return None


async def _handle_telegram_refinement(content_id: str, feedback: str, db) -> dict:
    """Refine a content piece based on reply feedback.

    User replies to a bot message with something like:
    - "make the hook stronger"
    - "rewrite tweet 3 to be punchier"
    - "too long, cut it in half"
    - "add more tension"

    We send the existing content + feedback to Claude and replace it.
    """
    piece = db.query(ContentPiece).filter(ContentPiece.id == content_id).first()
    if not piece:
        bot = _get_bot()
        if bot:
            await bot.send_notification("Content not found — it may have been deleted.")
        return {"ok": True}

    bot = _get_bot()
    if bot:
        await bot.send_notification(f"Refining...\n\n<i>{feedback[:150]}</i>")

    # Load context
    from app.services.claude_client import call_claude

    # Parse existing metadata
    meta = {}
    if piece.generation_metadata:
        try:
            meta = json.loads(piece.generation_metadata)
        except (json.JSONDecodeError, TypeError):
            pass

    # Determine content format for the prompt
    content_type_label = "content"
    format_instruction = ""

    if meta.get("tweets"):
        content_type_label = "X thread"
        tweets = meta["tweets"]
        format_instruction = f"""This is an X thread with {len(tweets)} tweets.
Current tweets:
{chr(10).join(f"Tweet {i+1}: {t}" for i, t in enumerate(tweets))}

Return the refined version as a JSON object:
{{"body": "all tweets joined by double newlines", "hook": "first tweet text", "tweets": ["tweet 1", "tweet 2", ...]}}"""

    elif meta.get("blocks"):
        content_type_label = "video script"
        blocks = meta["blocks"]
        format_instruction = f"""This is a video script with {len(blocks)} breath blocks.
Current blocks:
{chr(10).join(f"Block {i+1}: {b}" for i, b in enumerate(blocks))}

Return the refined version as a JSON object:
{{"body": "all blocks joined by double newlines", "hook": "{piece.hook or ''}", "cta": "{piece.cta or ''}", "blocks": ["block 1", "block 2", ...]}}"""

    else:
        content_type_label = "social post" if piece.content_type == "social_post" else "content"
        format_instruction = f"""Return the refined version as a JSON object:
{{"body": "the refined content", "hook": "opening hook or null", "cta": "call to action or null"}}"""

    system_prompt = f"""You are a content editor. Refine the {content_type_label} based on the creator's feedback.
Keep the same voice and core idea. Apply the feedback precisely — don't over-edit or change things that weren't mentioned.
Platform: {piece.platform}
Return ONLY the JSON object, no markdown fences."""

    user_prompt = f"""Current {content_type_label}:

Title: {piece.title or ""}
Hook: {piece.hook or ""}
---
{piece.body}
---
CTA: {piece.cta or ""}

Creator feedback: {feedback}

{format_instruction}"""

    try:
        result = await call_claude(user_prompt, system=system_prompt, premium=True)

        raw = result["content"].strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        refined = json.loads(raw)

        # Update the piece
        piece.body = refined.get("body", piece.body)
        if refined.get("hook"):
            piece.hook = refined["hook"]
        if refined.get("cta"):
            piece.cta = refined["cta"]

        # Update structured metadata
        if refined.get("tweets"):
            meta["tweets"] = refined["tweets"]
        if refined.get("blocks"):
            meta["blocks"] = refined["blocks"]
        meta["last_refinement"] = feedback
        meta["refinement_model"] = result.get("model", "")
        piece.generation_metadata = json.dumps(meta)

        db.commit()

        # Send the refined version back
        if bot:
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

        _log_dispatch(db, "content_refined", content_id, "telegram", {
            "feedback": feedback[:200],
            "model": result.get("model", ""),
        })

    except Exception as e:
        logger.error("Refinement failed for %s: %s", content_id, e)
        if bot:
            await bot.send_notification(f"Refinement failed: {str(e)[:200]}")

    return {"ok": True}


def _parse_telegram_message(text: str) -> tuple[list[str] | None, str]:
    """Parse a Telegram message for content type prefix.

    Returns (content_types, idea_text).
    If no prefix detected, returns (None, original_text) for full pipeline.

    Supported prefixes:
        "x thread: ..."   → ["x_thread"]
        "thread: ..."     → ["x_thread"]
        "post: ..."       → ["social_post"]
        "x post: ..."     → ["social_post"] (platform=twitter)
        "tweet: ..."      → ["social_post"] (platform=twitter)
        "video: ..."      → ["video_script"]
        "newsletter: ..."  → ["newsletter"]
        "all: ..."         → None (full pipeline)
    """
    prefix_map = {
        "x thread": ["x_thread"],
        "thread": ["x_thread"],
        "x post": ["social_post"],
        "tweet": ["social_post"],
        "post": ["social_post"],
        "social": ["social_post"],
        "video": ["video_script"],
        "video script": ["video_script"],
        "newsletter": ["newsletter"],
        "all": None,
    }

    lower = text.lower()
    for prefix, types in sorted(prefix_map.items(), key=lambda x: -len(x[0])):
        if lower.startswith(prefix + ":"):
            idea = text[len(prefix) + 1:].strip()
            return types, idea
        if lower.startswith(prefix + " :"):
            idea = text[len(prefix) + 2:].strip()
            return types, idea

    return None, text


async def _generate_targeted_content(
    idea: str,
    product,
    content_types: list[str],
    prompt_set: dict,
    brand_profile=None,
) -> list[dict]:
    """Generate only the requested content types — skip the full pipeline.

    Instead of going through idea sharpener → newsletter draft → expand,
    this directly generates the requested format from the raw idea.
    Much faster for single-format requests like 'x thread: my idea'.
    """
    from app.services.claude_client import call_claude

    voice_rules = prompt_set.get("voice_rules", "")
    social_rules = prompt_set.get("social_post_rules", "")
    video_rules = prompt_set.get("video_script_rules", "")
    x_thread_rules = prompt_set.get("x_thread_rules", "")
    system_intro = prompt_set.get("system_prompt_intro", "You are a content creator.")

    # Build type-specific rules
    type_rules = []
    for ct in content_types:
        if ct == "x_thread":
            type_rules.append(f"X THREAD RULES:\n{x_thread_rules}")
        elif ct == "social_post":
            type_rules.append(f"SOCIAL POST RULES:\n{social_rules}")
        elif ct == "video_script":
            type_rules.append(f"VIDEO SCRIPT RULES:\n{video_rules}")

    # Build brand constraints
    brand_constraints = ""
    if brand_profile:
        from app.engines.generation import _build_brand_constraints
        brand_constraints = _build_brand_constraints(brand_profile)

    system_prompt = f"""{system_intro}

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Brand Voice: {product.brand_voice or "Authentic and conversational."}

{brand_constraints}

{voice_rules}

{chr(10).join(type_rules)}"""

    # Build format spec per type
    format_specs = []
    for ct in content_types:
        if ct == "x_thread":
            format_specs.append("""Generate an X thread (5-8 tweets).
Return: {"content_type": "x_thread", "platform": "twitter", "title": "thread topic", "body": "tweet 1\\n\\ntweet 2\\n\\ntweet 3...", "hook": "the first tweet", "cta": "closing question", "tweets": ["tweet 1", "tweet 2", ...]}""")
        elif ct == "social_post":
            format_specs.append("""Generate a social post (Twitter-length, under 280 chars).
Return: {"content_type": "social_post", "platform": "twitter", "title": "post topic", "body": "the post text", "hook": "opening line", "cta": null, "specificity_check": "what the reader sees", "tension_check": "what pulls against what", "stealable_line": "the quotable phrase"}""")
        elif ct == "video_script":
            format_specs.append("""Generate a video script with breath blocks.
Return: {"content_type": "video_script", "platform": "general", "title": "video topic", "body": "full script as paragraphs", "hook": "opening hook", "cta": "closing CTA", "blocks": ["block 1", "block 2", ...]}""")
        elif ct == "newsletter":
            format_specs.append("""Generate a newsletter draft.
Return: {"content_type": "newsletter", "platform": "general", "title": "newsletter title", "body": "full newsletter in markdown", "hook": "subject line", "cta": "closing question", "subject": "email subject", "preview": "preview text under 10 words"}""")

    user_prompt = f"""Here's a raw idea from the creator:

---
{idea}
---

Generate ONLY the following content from this idea:
{chr(10).join(format_specs)}

Return a JSON array with one object per piece. Return ONLY the JSON array."""

    # Targeted generation uses premium model — these are the posts you'll publish
    result = await call_claude(user_prompt, system=system_prompt, max_tokens=4096, premium=True)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        pieces_raw = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        pieces_raw = []

    # Wrap single object in array
    if isinstance(pieces_raw, dict):
        pieces_raw = [pieces_raw]

    pieces = []
    for p in pieces_raw:
        meta = {
            "model": result["model"],
            "input_tokens": result["input_tokens"],
            "output_tokens": result["output_tokens"],
            "source": "telegram_targeted",
        }
        # Preserve structured data
        for key in ("tweets", "blocks", "subject", "preview", "specificity_check", "tension_check", "stealable_line"):
            if p.get(key):
                meta[key] = p[key]

        pieces.append({
            "content_type": p.get("content_type", content_types[0]),
            "platform": p.get("platform", "twitter" if content_types[0] in ("x_thread", "social_post") else "general"),
            "title": p.get("title", ""),
            "body": p.get("body", ""),
            "hook": p.get("hook"),
            "cta": p.get("cta"),
            "funnel_stage": p.get("funnel_stage", "awareness"),
            "metadata": json.dumps(meta),
        })

    return pieces


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

    elif cmd == "/setup":
        # /setup <url> <product name>
        # e.g. /setup https://example.com My Product Name
        # Can also reply to a photo/document with /setup to use it as brand guide
        parts = text.split(maxsplit=2)
        if len(parts) < 3:
            await bot.send_notification(
                "<b>Usage:</b> <code>/setup &lt;url&gt; &lt;product name&gt;</code>\n\n"
                "Example:\n"
                "<code>/setup https://myproduct.com My Product</code>\n\n"
                "This will crawl the website, extract brand identity, "
                "and set up the product automatically.\n\n"
                "<b>With brand guide:</b>\n"
                "Send a photo or PDF of your brand guide, then reply to it with:\n"
                "<code>/setup https://mysite.com My Brand</code>"
            )
        else:
            url = parts[1]
            name = parts[2]
            await bot.send_notification(
                f"Setting up <b>{name}</b>...\n"
                f"Crawling {url} and extracting brand identity.\n"
                "I'll message you when it's ready."
            )

            # Create product and run setup in background
            import threading
            import asyncio as _asyncio

            product = Product(
                name=name,
                website_url=url if url.startswith(("http://", "https://")) else f"https://{url}",
                status="onboarding",
            )
            db.add(product)
            db.commit()
            db.refresh(product)

            def _bg_setup():
                from app.database import SessionLocal
                from app.engines.ingestion import crawl_website
                from app.engines.vectorstore import get_vectorstore
                from app.models.brand_profile import BrandProfile
                from app.models.autonomous_loop import AutonomousLoopConfig
                from app.models.crawl import CrawledPage

                bg_db = SessionLocal()
                try:
                    crawl_url = product.website_url

                    # Crawl
                    pages = _asyncio.run(crawl_website(crawl_url, max_pages=15))
                    page_count = len(pages) if pages else 0

                    # Save pages
                    for page_data in pages:
                        bg_db.add(CrawledPage(
                            product_id=product.id,
                            url=page_data["url"],
                            title=page_data["title"],
                            content=page_data["content"],
                            page_type=page_data.get("page_type", "unknown"),
                        ))
                    bg_db.commit()

                    # Vector store
                    vs = get_vectorstore()
                    texts = [p["content"] for p in pages if p.get("content")]
                    metadatas = [
                        {"url": p["url"], "title": p.get("title", ""), "product_id": product.id}
                        for p in pages if p.get("content")
                    ]
                    if texts:
                        vs.add_documents(product.id, texts, metadatas)

                    # Generate brief
                    try:
                        from app.routers.ingestion import _run_brief_generation
                        _run_brief_generation(product.id)
                    except Exception:
                        pass  # Brief failure is non-fatal

                    # Auto-create brand profile + loop config
                    if not bg_db.query(BrandProfile).filter(
                        BrandProfile.product_id == product.id
                    ).first():
                        bg_db.add(BrandProfile(product_id=product.id))

                    if not bg_db.query(AutonomousLoopConfig).filter(
                        AutonomousLoopConfig.product_id == product.id
                    ).first():
                        bg_db.add(AutonomousLoopConfig(product_id=product.id))

                    # Mark product active
                    p = bg_db.query(Product).filter(Product.id == product.id).first()
                    if p:
                        p.status = "active"

                    bg_db.commit()

                    # Notify via Telegram
                    _asyncio.run(bot.send_notification(
                        f"<b>{name}</b> is ready!\n\n"
                        f"Crawled {page_count} pages\n"
                        f"Brand brief generated\n"
                        f"Brand profile created\n\n"
                        f"Send me an idea to start generating content, "
                        f"or enable the autonomous loop from the dashboard."
                    ))
                except Exception as e:
                    _asyncio.run(bot.send_notification(
                        f"Setup failed for {name}: {e}\n"
                        f"Product was created — try crawling manually from the dashboard."
                    ))
                finally:
                    bg_db.close()

            threading.Thread(target=_bg_setup, daemon=True).start()

    elif cmd in ("/help", "/start"):
        await bot.send_notification(
            "<b>Clawd Bot</b>\n\n"
            "<b>Quick generate:</b>\n"
            "<code>thread: your idea here</code>\n"
            "<code>post: your idea here</code>\n"
            "<code>tweet: your idea here</code>\n"
            "<code>video: your idea here</code>\n"
            "<code>newsletter: your idea here</code>\n\n"
            "<b>Full pipeline:</b>\n"
            "Text your idea with no prefix — generates all formats.\n\n"
            "<b>Refine:</b>\n"
            "Reply to any content preview with feedback:\n"
            "<i>\"make the hook stronger\"</i>\n"
            "<i>\"rewrite tweet 3\"</i>\n"
            "<i>\"too long, cut it in half\"</i>\n\n"
            "<b>Commands:</b>\n"
            "/setup &lt;url&gt; &lt;name&gt; — Set up a new product from URL\n"
            "/queue — View pending items\n"
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

    # Batch-fetch all scheduled posts in one query instead of N+1
    piece_ids = [p.id for p in pieces]
    scheduled_map = {}
    if piece_ids:
        scheduled_posts = (
            db.query(ScheduledPost)
            .filter(ScheduledPost.content_id.in_(piece_ids))
            .all()
        )
        scheduled_map = {sp.content_id: sp for sp in scheduled_posts}

    results = []
    for p in pieces:
        scheduled = scheduled_map.get(p.id)
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
