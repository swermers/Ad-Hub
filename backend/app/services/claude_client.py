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
) -> dict:
    """Call Claude API (async). Use in FastAPI route handlers."""
    client = _get_client()

    kwargs: dict = {
        "model": settings.claude_model,
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
) -> dict:
    """Call Claude API (sync). Use in background tasks / threads
    to avoid event loop conflicts with AsyncAnthropic."""
    client = _get_sync_client()

    kwargs: dict = {
        "model": settings.claude_model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
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
