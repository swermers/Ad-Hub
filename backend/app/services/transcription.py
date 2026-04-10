"""Shared OpenAI Whisper transcription helper.

Centralises audio-to-text so that both the agent /transcribe endpoint
and the Telegram voice-memo handler use the same code.
"""

import io

import openai

from app.config import settings


def transcribe_audio_bytes(
    audio_bytes: bytes,
    filename: str = "audio.m4a",
) -> str:
    """Transcribe raw audio bytes using OpenAI Whisper.

    Returns the transcript text. Raises ValueError if the API key is
    not configured, or propagates openai errors on failure.
    """
    if not settings.openai_api_key:
        raise ValueError("OpenAI API key not configured")

    client = openai.OpenAI(api_key=settings.openai_api_key)
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcription = client.audio.transcriptions.create(
        model=settings.whisper_model,
        file=audio_file,
        response_format="text",
    )

    return transcription.strip() if isinstance(transcription, str) else str(transcription).strip()
