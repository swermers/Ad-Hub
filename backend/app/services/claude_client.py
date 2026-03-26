import anthropic

from app.config import settings

_client: anthropic.AsyncAnthropic | None = None
_sync_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


def _get_sync_client() -> anthropic.Anthropic:
    global _sync_client
    if _sync_client is None:
        _sync_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _sync_client


async def call_claude(
    prompt: str,
    system: str | None = None,
    max_tokens: int = 4096,
    premium: bool = False,
) -> dict:
    """Call Claude API (async). Use in FastAPI route handlers.

    Set premium=True to use the premium model (Opus) for tasks
    that need better nuance — social copy, idea sharpening, etc.
    """
    client = _get_client()
    model = settings.claude_model_premium if premium else settings.claude_model

    kwargs: dict = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        kwargs["system"] = system

    message = await client.messages.create(**kwargs)

    return {
        "content": message.content[0].text,
        "model": message.model,
        "input_tokens": message.usage.input_tokens,
        "output_tokens": message.usage.output_tokens,
    }


def call_claude_sync(
    prompt: str,
    system: str | None = None,
    max_tokens: int = 4096,
    images: list[dict] | None = None,
    premium: bool = False,
) -> dict:
    """Call Claude API (sync). Use in background tasks / threads
    to avoid event loop conflicts with AsyncAnthropic.

    Set premium=True to use the premium model (Opus).
    If `images` is provided, sends a multipart vision request.
    Each image dict should have: {"media_type": "image/png", "data": "<base64>"}
    """
    client = _get_sync_client()
    model = settings.claude_model_premium if premium else settings.claude_model

    # Build message content — text-only or multipart with images
    if images:
        content: list[dict] = []
        for img in images:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": img["media_type"],
                    "data": img["data"],
                },
            })
        content.append({"type": "text", "text": prompt})
        messages = [{"role": "user", "content": content}]
    else:
        messages = [{"role": "user", "content": prompt}]

    kwargs: dict = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system:
        kwargs["system"] = system

    message = client.messages.create(**kwargs)

    return {
        "content": message.content[0].text,
        "model": message.model,
        "input_tokens": message.usage.input_tokens,
        "output_tokens": message.usage.output_tokens,
    }
