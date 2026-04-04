"""Voice Profile Scoring — compute quality scores for voice profiles.

Implements the 6-section scoring system from the Voice Profile Builder spec.
Each section scores 0-5, with bonus points for quality signals.
Total is normalized to 0-100 percentage.

Usage:
    from app.engines.voice_scoring import compute_voice_profile_score, get_quality_grade

    score = compute_voice_profile_score(profile)
    grade = get_quality_grade(score)
"""

import json


def compute_voice_profile_score(profile) -> int:
    """Compute quality score (0-100) for a voice profile.

    Scores 6 sections at 0-5 each (30 max), then normalizes to 0-100.
    Bonus points for section-specific quality signals (capped at 5 per section).
    """
    scores = {}

    # Section 1: Identity (name + description)
    identity_text = f"{profile.name or ''} {profile.description or ''}".strip()
    scores["identity"] = _score_text(identity_text)

    # Section 2: Tone (tone_keywords + sentence_style)
    tone_text = ""
    if profile.tone_keywords:
        try:
            keywords = json.loads(profile.tone_keywords)
            tone_text = " ".join(keywords)
        except (json.JSONDecodeError, TypeError):
            pass
    if profile.sentence_style:
        tone_text += f" {profile.sentence_style}"
    scores["tone"] = _score_text(tone_text)

    # Section 3: Vocabulary (words_to_use + words_to_avoid)
    vocab_text = ""
    has_use = False
    has_avoid = False
    for field_name, field_val in [("use", profile.words_to_use), ("avoid", profile.words_to_avoid)]:
        if field_val:
            try:
                words = json.loads(field_val)
                if words:
                    vocab_text += " ".join(words) + " "
                    if field_name == "use":
                        has_use = True
                    else:
                        has_avoid = True
            except (json.JSONDecodeError, TypeError):
                pass
    # Bonus: +1 if BOTH use and avoid lists are present
    scores["vocabulary"] = min(_score_text(vocab_text) + (1 if has_use and has_avoid else 0), 5)

    # Section 4: Structure (style_rules + favorite_phrases)
    struct_text = profile.style_rules or ""
    if profile.favorite_phrases:
        try:
            phrases = json.loads(profile.favorite_phrases)
            if phrases:
                struct_text += " " + " ".join(phrases)
        except (json.JSONDecodeError, TypeError):
            pass
    scores["structure"] = _score_text(struct_text)

    # Section 5: Writing Samples
    samples_text = ""
    if profile.writing_samples:
        try:
            samples = json.loads(profile.writing_samples)
            if samples:
                samples_text = " ".join(samples)
        except (json.JSONDecodeError, TypeError):
            pass
    word_count = len(samples_text.split()) if samples_text.strip() else 0
    # Bonus: +1 if samples exceed 100 words
    scores["samples"] = min(_score_text(samples_text) + (1 if word_count > 100 else 0), 5)

    # Section 6: Anti-Patterns (derived from words_to_avoid + style_rules anti-pattern content)
    anti_text = ""
    if profile.words_to_avoid:
        try:
            avoid = json.loads(profile.words_to_avoid)
            if avoid:
                anti_text = " ".join(avoid)
        except (json.JSONDecodeError, TypeError):
            pass
    # Check if style_rules contains anti-pattern language
    style_lower = (profile.style_rules or "").lower()
    if any(keyword in style_lower for keyword in ("never", "avoid", "don't", "ban", "anti-pattern")):
        anti_text += " " + (profile.style_rules or "")
    # Bonus: +1 if specific banned patterns are named (not just vague preferences)
    has_specific_patterns = any(
        phrase in anti_text.lower()
        for phrase in ("here's the thing", "journey", "transform", "unlock", "let that sink in")
    )
    scores["antipatterns"] = min(_score_text(anti_text) + (1 if has_specific_patterns else 0), 5)

    total = sum(scores.values())
    return round((total / 30) * 100)


def compute_section_scores(profile) -> dict:
    """Compute per-section scores (for the score-preview endpoint).

    Returns a dict with section names, scores, and tips for improvement.
    """
    score = compute_voice_profile_score(profile)
    sections = {}

    # Re-compute individual sections for detailed breakdown
    identity_text = f"{profile.name or ''} {profile.description or ''}".strip()
    sections["identity"] = {"score": _score_text(identity_text), "max": 5}

    tone_text = ""
    if profile.tone_keywords:
        try:
            keywords = json.loads(profile.tone_keywords)
            tone_text = " ".join(keywords)
        except (json.JSONDecodeError, TypeError):
            pass
    sections["tone"] = {"score": _score_text(tone_text), "max": 5}

    vocab_text = ""
    for field_val in (profile.words_to_use, profile.words_to_avoid):
        if field_val:
            try:
                words = json.loads(field_val)
                if words:
                    vocab_text += " ".join(words) + " "
            except (json.JSONDecodeError, TypeError):
                pass
    sections["vocabulary"] = {"score": min(_score_text(vocab_text), 5), "max": 5}

    struct_text = profile.style_rules or ""
    sections["structure"] = {"score": _score_text(struct_text), "max": 5}

    samples_text = ""
    if profile.writing_samples:
        try:
            samples = json.loads(profile.writing_samples)
            if samples:
                samples_text = " ".join(samples)
        except (json.JSONDecodeError, TypeError):
            pass
    sections["samples"] = {"score": _score_text(samples_text), "max": 5}

    anti_text = ""
    if profile.words_to_avoid:
        try:
            avoid = json.loads(profile.words_to_avoid)
            if avoid:
                anti_text = " ".join(avoid)
        except (json.JSONDecodeError, TypeError):
            pass
    sections["antipatterns"] = {"score": _score_text(anti_text), "max": 5}

    # Identify missing/weak sections
    missing = [name for name, data in sections.items() if data["score"] <= 1]

    return {
        "sections": sections,
        "total": score,
        "percentage": score,
        "grade": get_quality_grade(score),
        "missing": missing,
    }


def get_quality_grade(score: int) -> str:
    """Map a quality score (0-100) to a human-readable grade."""
    if score >= 90:
        return "Production Ready"
    if score >= 70:
        return "Strong Foundation"
    if score >= 50:
        return "Getting There"
    if score >= 30:
        return "Needs Work"
    return "Just Started"


def get_voice_confidence(score: int) -> str:
    """Map quality score to pipeline confidence level.

    Used by content generation to adjust quality gate thresholds.
    """
    if score >= 90:
        return "high"
    if score >= 70:
        return "medium"
    if score >= 50:
        return "low"
    return "minimal"


def _score_text(text: str) -> int:
    """Score a text field 0-5 based on length/detail."""
    length = len(text.strip())
    if length == 0:
        return 0
    if length < 30:
        return 1
    if length < 80:
        return 2
    if length < 200:
        return 3
    if length < 400:
        return 4
    return 5
