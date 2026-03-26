"""Clawd Bot — Telegram interface for the human seat.

Sends content previews with inline approve/sharpen/reject buttons.
Receives callback queries and routes them to the approval pipeline.

Usage:
    from app.services.telegram_bot import ClawdBot
    bot = ClawdBot(token=settings.telegram_bot_token, chat_id=settings.telegram_chat_id)
    await bot.send_approval_request(content_piece, scheduled_post)
"""

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org"


class ClawdBot:
    """Lightweight Telegram Bot API client for sending approval requests."""

    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = chat_id
        self.base_url = f"{TELEGRAM_API}/bot{token}"

    async def send_message(self, text: str, reply_markup: dict | None = None) -> dict:
        """Send a text message to the configured chat."""
        async with httpx.AsyncClient() as client:
            payload: dict[str, Any] = {
                "chat_id": self.chat_id,
                "text": text,
                "parse_mode": "HTML",
            }
            if reply_markup:
                import json
                payload["reply_markup"] = json.dumps(reply_markup)

            resp = await client.post(f"{self.base_url}/sendMessage", data=payload)
            resp.raise_for_status()
            return resp.json()

    async def send_approval_request(
        self,
        content_id: str,
        scheduled_post_id: str | None,
        platform: str,
        title: str | None,
        body: str,
        hook: str | None = None,
        cta: str | None = None,
        content_type: str = "post",
    ) -> dict:
        """Send a content preview with approve/sharpen/reject buttons."""
        # Build preview message
        lines = []
        lines.append(f"<b>New {content_type} for {platform.upper()}</b>")
        lines.append("")
        if title:
            lines.append(f"<b>{title}</b>")
        if hook:
            lines.append(f"<i>Hook:</i> {hook}")
        lines.append("")
        # Truncate body for Telegram (4096 char limit)
        preview_body = body[:800] + "..." if len(body) > 800 else body
        lines.append(preview_body)
        if cta:
            lines.append("")
            lines.append(f"<b>CTA:</b> {cta}")

        text = "\n".join(lines)

        # Callback data format: action:content_id:scheduled_post_id
        sp_id = scheduled_post_id or "none"
        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "Approve", "callback_data": f"approve:{content_id}:{sp_id}"},
                    {"text": "Sharpen", "callback_data": f"sharpen:{content_id}:{sp_id}"},
                    {"text": "Reject", "callback_data": f"reject:{content_id}:{sp_id}"},
                ],
                [
                    {"text": "Approve & Publish Now", "callback_data": f"publish:{content_id}:{sp_id}"},
                ],
            ]
        }

        return await self.send_message(text, reply_markup=reply_markup)

    async def send_notification(self, message: str) -> dict:
        """Send a plain notification (guardrail alerts, status updates, etc.)."""
        return await self.send_message(message)

    async def answer_callback(self, callback_query_id: str, text: str) -> dict:
        """Acknowledge a callback query (removes the loading spinner)."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/answerCallbackQuery",
                data={
                    "callback_query_id": callback_query_id,
                    "text": text,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def edit_message(self, message_id: int, text: str) -> dict:
        """Edit a previously sent message (e.g., to show approval status)."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/editMessageText",
                data={
                    "chat_id": self.chat_id,
                    "message_id": message_id,
                    "text": text,
                    "parse_mode": "HTML",
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def set_webhook(self, webhook_url: str) -> dict:
        """Register a webhook URL with Telegram."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/setWebhook",
                data={"url": webhook_url},
            )
            resp.raise_for_status()
            return resp.json()
