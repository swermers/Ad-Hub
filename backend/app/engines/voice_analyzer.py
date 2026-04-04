"""Voice Analyzer — AI-assisted writing sample analysis.

Uses Claude to extract voice profile fields from writing samples.
Powers the "Analyze my writing" button in the Voice Profile Builder.

Usage:
    from app.engines.voice_analyzer import analyze_writing_samples

    result = await analyze_writing_samples(["sample paragraph 1", "sample paragraph 2"])
    # Returns: { tone_keywords, sentence_style, words_to_use, structural_observations, likely_anti_patterns }
"""

import json

from app.services.claude_client import call_claude

_ANALYSIS_SYSTEM = """You are a voice profile extraction expert. Given writing samples from a content creator, you analyze their natural writing patterns and extract structured voice profile data. Be specific and precise — generic observations are useless. Base everything on what you actually see in the samples, not assumptions."""

_ANALYSIS_PROMPT = """\
Analyze these writing samples and extract the creator's natural voice patterns.

Writing samples:
---
{samples_text}
---

Extract:
1. **Tone descriptors** — 3-5 adjectives that describe how this person sounds (based on evidence in the samples, not guesses)
2. **Sentence style** — one of: short_punchy, long_flowing, mixed, varied
3. **Vocabulary patterns** — words or phrases used repeatedly or characteristically
4. **Structural observations** — how pieces open, close, transition. Any signature moves.
5. **Anti-patterns** — what this writer would likely NEVER say, based on their style. Be specific.

Return ONLY a JSON object:
{{
    "tone_keywords": ["warm", "observational", "direct"],
    "sentence_style": "mixed",
    "words_to_use": ["notice", "pattern", "weight"],
    "structural_observations": "Opens in first person with a specific micro-moment. Uses lowercase section headers. Closes with reflective questions, never directives.",
    "likely_anti_patterns": ["Never uses 'journey' or 'transform'", "Avoids exclamation marks", "No staccato list patterns", "Doesn't moralize — uses 'might' over 'should'"]
}}"""


async def analyze_writing_samples(samples: list[str]) -> dict:
    """Analyze writing samples via Claude and extract voice profile fields.

    Returns structured data that can pre-fill voice profile sections.
    """
    samples_text = "\n\n---\n\n".join(samples)

    prompt = _ANALYSIS_PROMPT.format(samples_text=samples_text)
    result = await call_claude(prompt, system=_ANALYSIS_SYSTEM, max_tokens=2048, premium=True)

    raw = result["content"].strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3].rstrip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {
            "tone_keywords": [],
            "sentence_style": "mixed",
            "words_to_use": [],
            "structural_observations": "",
            "likely_anti_patterns": [],
            "error": "Failed to parse analysis results",
        }

    return {
        "tone_keywords": parsed.get("tone_keywords", []),
        "sentence_style": parsed.get("sentence_style", "mixed"),
        "words_to_use": parsed.get("words_to_use", []),
        "structural_observations": parsed.get("structural_observations", ""),
        "likely_anti_patterns": parsed.get("likely_anti_patterns", []),
    }
