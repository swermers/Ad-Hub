"""Content-specific generation workflows — per-type skill sequences.

Instead of generating all content types in one monolithic Claude call,
each content type gets its own dedicated workflow with tailored prompts,
quality gates, and post-processing.

Skill sequences per content type:
  social_post (Twitter):  seed → draft → Post Sharpener (specificity/tension/stealable-line)
  social_post (LinkedIn): seed → draft → Professional Tone Gate
  social_post (Meta):     seed → draft → Story Hook Gate
  video_script:           seed/newsletter → Video Converter (breath-blocks)
  x_thread:               seed/newsletter → Thread Structurer (arc/pacing)
  video_ad:               seed → Ad Copy + video_style selection
  carousel:               seed → Slide Architect (hook→build→CTA arc)
  email:                  seed/newsletter → Email Formatter (subject/preview/body/CTA)
  newsletter:             handled by the existing Draft step (templates A-D)

Each function returns a list of ExpandedPiece-compatible dicts.
"""

import json

from app.engines.prompt_defaults import (
    DEFAULT_SOCIAL_POST_RULES,
    DEFAULT_VIDEO_SCRIPT_RULES,
    DEFAULT_X_THREAD_RULES,
)
from app.services.claude_client import call_claude


# ─── Social Post: Twitter ──────────────────────────────────────────────────

async def generate_twitter_post(
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Seed → Twitter post → Post Sharpener quality gate."""

    social_rules = prompt_set.get("social_post_rules", DEFAULT_SOCIAL_POST_RULES)
    source_text = draft.get("body", "") if draft else seed.get("seed", "")

    system_prompt = f"""You are a Twitter/X content specialist. You write posts that stop the scroll.

{product_context}

{voice_context}

{prompt_set.get("voice_rules", "")}

{social_rules}

TWITTER-SPECIFIC CONSTRAINTS:
- Maximum 280 characters for the full post
- No hashtags in the body text (add 1-2 at the end if needed)
- No emojis unless the brand voice specifically calls for them
- Write like a person, not a brand account"""

    user_prompt = f"""Source material:
Seed: {seed.get('seed', '')}
Heat lines: {json.dumps(seed.get('heat', []))}
Audience hook: {seed.get('audience_hook', '')}
{f"Newsletter excerpt: {source_text[:500]}" if draft else ""}

Write ONE Twitter/X post (max 280 chars).

Then run the Post Sharpener quality check on your own output:
1. SPECIFICITY: Does it contain at least one moment the reader can picture?
2. TENSION: Does it hold two ideas that pull against each other?
3. STEALABLE LINE: Is there a phrase someone would screenshot or share?

If any check fails, rewrite until all three pass.

Return ONLY a JSON object:
{{
    "title": "short label for this post",
    "body": "the full post text (max 280 chars)",
    "hook": "the opening line",
    "cta": null,
    "funnel_stage": "awareness",
    "quality_checks": {{
        "specificity": "what the reader sees — the concrete image or moment",
        "tension": "what pulls against what",
        "stealable_line": "the phrase worth screenshotting",
        "all_passed": true
    }}
}}"""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=1024)
    parsed = _parse_response(result, seed, "social_post", "twitter")

    # Enforce 280 char limit
    if len(parsed.get("body", "")) > 280:
        parsed["body"] = parsed["body"][:277] + "..."

    # Preserve quality checks in metadata
    if "quality_checks" in parsed:
        parsed.setdefault("metadata", {}).update(parsed.pop("quality_checks"))

    return parsed


# ─── Social Post: LinkedIn ─────────────────────────────────────────────────

async def generate_linkedin_post(
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Seed → LinkedIn post → Professional Tone Gate."""

    social_rules = prompt_set.get("social_post_rules", DEFAULT_SOCIAL_POST_RULES)
    source_text = draft.get("body", "") if draft else seed.get("seed", "")

    system_prompt = f"""You are a LinkedIn content specialist. You write thought-leadership posts that earn engagement.

{product_context}

{voice_context}

{prompt_set.get("voice_rules", "")}

{social_rules}

LINKEDIN-SPECIFIC RULES:
- 200-400 words. Enough depth to be valuable, short enough to read in 60 seconds.
- First line must hook. LinkedIn truncates after ~140 chars — that first line IS the ad.
- Use short paragraphs (1-2 sentences max). Wall of text = skip.
- End with a genuine question or invitation to share perspective.
- Professional but not corporate. First-person observations land harder than third-person advice.
- No hashtags in body. Add 3-5 relevant ones at the very end."""

    user_prompt = f"""Source material:
Seed: {seed.get('seed', '')}
Heat lines: {json.dumps(seed.get('heat', []))}
Audience hook: {seed.get('audience_hook', '')}
{f"Newsletter excerpt: {source_text[:800]}" if draft else ""}

Write ONE LinkedIn post (200-400 words).

Quality gate — check your output:
1. Does the first line create curiosity or tension?
2. Is there a specific story, example, or observation (not abstract advice)?
3. Would a professional share this because it makes THEM look thoughtful?

Return ONLY a JSON object:
{{
    "title": "short label",
    "body": "the full LinkedIn post",
    "hook": "the opening line (first ~140 chars)",
    "cta": "closing question or invitation",
    "funnel_stage": "awareness"
}}"""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=2048)
    return _parse_response(result, seed, "social_post", "linkedin")


# ─── Social Post: Meta (Facebook/Instagram) ────────────────────────────────

async def generate_meta_post(
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Seed → Meta post → Story Hook Gate."""

    social_rules = prompt_set.get("social_post_rules", DEFAULT_SOCIAL_POST_RULES)
    source_text = draft.get("body", "") if draft else seed.get("seed", "")

    system_prompt = f"""You are a Meta (Facebook/Instagram) content specialist. You write personal, story-driven posts.

{product_context}

{voice_context}

{prompt_set.get("voice_rules", "")}

{social_rules}

META-SPECIFIC RULES:
- 1-3 short paragraphs. Personal and conversational.
- Lead with a story, moment, or observation — not a claim.
- Write like you're talking to a friend at coffee, not presenting at a conference.
- Include a soft CTA or reflective question at the end.
- No hashtags. Meta's algorithm doesn't reward them like it used to."""

    user_prompt = f"""Source material:
Seed: {seed.get('seed', '')}
Heat lines: {json.dumps(seed.get('heat', []))}
{f"Newsletter excerpt: {source_text[:500]}" if draft else ""}

Write ONE Meta/Facebook post (1-3 paragraphs).

Quality gate — Story Hook Check:
- Does it open with a specific moment or scene?
- Can the reader picture themselves in the story?
- Does it feel like a real person wrote it, not a brand?

Return ONLY a JSON object:
{{
    "title": "short label",
    "body": "the full post",
    "hook": "the opening line",
    "cta": "closing question or soft CTA",
    "funnel_stage": "awareness"
}}"""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=1536)
    return _parse_response(result, seed, "social_post", "meta")


# ─── Video Script ──────────────────────────────────────────────────────────

async def generate_video_script(
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Seed/newsletter → Video Converter → breath-block talking points."""

    video_rules = prompt_set.get("video_script_rules", DEFAULT_VIDEO_SCRIPT_RULES)
    source_text = draft.get("body", "") if draft else seed.get("seed", "")

    system_prompt = f"""You are a video script specialist. You convert written content into spoken-word scripts.

{product_context}

{voice_context}

{prompt_set.get("voice_rules", "")}

{video_rules}

VIDEO CONVERTER RULES:
- Each "breath block" = ONE thought the speaker can deliver in a single breath (2-4 sentences).
- Simplify any sentence over 25 words.
- Keep strong lines and metaphors EXACTLY as written — don't water them down.
- Open with the hook from the source content.
- End with a closing question or call to action.
- Write for SPEAKING out loud, not reading silently. Test: would this sound natural said to a camera?
- Include a thumbnail concept that would make someone click."""

    user_prompt = f"""Source material:
Seed: {seed.get('seed', '')}
Heat lines: {json.dumps(seed.get('heat', []))}
{f"Newsletter body: {source_text[:1500]}" if draft else ""}

Convert this into a video script with breath blocks.

Return ONLY a JSON object:
{{
    "title": "video title",
    "body": "full script as flowing text (for display/editing)",
    "hook": "the opening hook line",
    "cta": "closing CTA",
    "funnel_stage": "awareness",
    "metadata": {{
        "blocks": ["breath block 1", "breath block 2", "..."],
        "thumbnail_concept": "description of a compelling thumbnail",
        "estimated_length": "2-3 minutes"
    }}
}}"""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=3072)
    return _parse_response(result, seed, "video_script", "general")


# ─── X Thread ──────────────────────────────────────────────────────────────

async def generate_x_thread(
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Seed/newsletter → Thread Structurer → paced tweet sequence."""

    thread_rules = prompt_set.get("x_thread_rules", DEFAULT_X_THREAD_RULES)
    source_text = draft.get("body", "") if draft else seed.get("seed", "")

    system_prompt = f"""You are an X/Twitter thread specialist. You structure ideas into compelling tweet sequences.

{product_context}

{voice_context}

{prompt_set.get("voice_rules", "")}

{thread_rules}

THREAD STRUCTURER RULES:
- Tweet 1 = the insight or hook. No "Thread:" or "1/" prefix. Just the idea.
- Each tweet MUST be under 280 characters.
- 5-8 tweets total. Quality over quantity.
- Each tweet should stand alone (someone might see just one in their feed) but build on the previous.
- Vary tweet structure: some short punchy, some slightly longer with an example.
- No hashtags in body tweets. No emojis.
- End with a question or invitation to engage.
- Arc: Hook → Context → Insight → Evidence/Example → Deeper implication → Close"""

    user_prompt = f"""Source material:
Seed: {seed.get('seed', '')}
Heat lines: {json.dumps(seed.get('heat', []))}
{f"Newsletter body: {source_text[:1500]}" if draft else ""}

Create an X/Twitter thread (5-8 tweets).

Quality gate — Thread Arc Check:
- Does tweet 1 make you want to read tweet 2?
- Is there a clear progression (not just 6 disconnected takes)?
- Would someone retweet tweet 1 on its own?

Return ONLY a JSON object:
{{
    "title": "thread label",
    "body": "tweet 1\\n\\ntweet 2\\n\\ntweet 3\\n...",
    "hook": "tweet 1 text",
    "cta": "final tweet text",
    "funnel_stage": "awareness",
    "metadata": {{
        "tweets": ["tweet 1", "tweet 2", "tweet 3", "..."]
    }}
}}"""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=2048)
    parsed = _parse_response(result, seed, "x_thread", "twitter")

    # Enforce 280 char limit per tweet
    tweets = parsed.get("metadata", {}).get("tweets", [])
    if tweets:
        parsed["metadata"]["tweets"] = [t[:280] for t in tweets]

    return parsed


# ─── Video Ad ──────────────────────────────────────────────────────────────

async def generate_video_ad(
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Seed → Video Ad copy + composition style selection."""

    source_text = draft.get("body", "") if draft else seed.get("seed", "")

    system_prompt = f"""You are a video ad creative director. You write punchy, visual ad copy for short-form video.

{product_context}

{voice_context}

{prompt_set.get("voice_rules", "")}

VIDEO AD CREATIVE RULES:
- Headline: 5-8 words max. Bold, attention-grabbing. This appears ON SCREEN.
- Body: 1-2 sentences supporting text. Secondary on-screen element.
- CTA: 2-4 words. Action verb + value.
- Pick the BEST video_style for this content:
  "pas" = pain-point content, "data-hype" = stats/numbers, "social-proof" = testimonials,
  "saas-demo" = product features, "kinetic" = energetic/punchy, "swiss-bold" = editorial statements,
  "swiss-stack" = layered typography, "default" = general/elegant
- Pick the best aspect_ratio: "9:16" for stories/reels, "1:1" for feed, "4:5" for portrait feed"""

    user_prompt = f"""Source material:
Seed: {seed.get('seed', '')}
{f"Newsletter excerpt: {source_text[:500]}" if draft else ""}

Create ONE video ad.

Return ONLY a JSON object:
{{
    "title": "ad label",
    "body": "on-screen supporting text (1-2 sentences)",
    "hook": "headline shown on screen (5-8 words)",
    "cta": "CTA text (2-4 words)",
    "funnel_stage": "awareness",
    "video_style": "style name",
    "video_config": {{"aspect_ratio": "1:1", "accent_color": "#6366f1"}}
}}"""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=1024)
    return _parse_response(result, seed, "video_ad", "general")


# ─── Carousel ──────────────────────────────────────────────────────────────

async def generate_carousel(
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Seed → Slide Architect → hook→build→CTA arc."""

    source_text = draft.get("body", "") if draft else seed.get("seed", "")

    system_prompt = f"""You are a carousel content architect. You structure ideas into visual slide sequences.

{product_context}

{voice_context}

{prompt_set.get("voice_rules", "")}

SLIDE ARCHITECT RULES:
- 4-6 slides. Each slide headline max 25 characters.
- Slide 1: THE HOOK. Stop-scroll headline that creates curiosity.
- Slides 2-4: BUILD. Problem → Insight → Evidence/benefit. One idea per slide.
- Second-to-last slide: THE SHIFT. A surprising reframe or key takeaway.
- Final slide: THE CTA. Clear next step.
- Each slide must make the viewer want to swipe to the next one.
- Use pipe-delimited format for slide headlines in body field."""

    user_prompt = f"""Source material:
Seed: {seed.get('seed', '')}
Heat lines: {json.dumps(seed.get('heat', []))}
{f"Newsletter excerpt: {source_text[:800]}" if draft else ""}

Create ONE carousel (4-6 slides).

Quality gate — Slide Arc Check:
- Does slide 1 create enough curiosity to swipe?
- Does each slide advance the story (not repeat)?
- Is the CTA slide a natural conclusion?

Return ONLY a JSON object:
{{
    "title": "carousel label",
    "body": "Slide 1 Headline|Slide 2 Headline|Slide 3 Headline|Slide 4 Headline|CTA Slide",
    "hook": "slide 1 headline (the hook)",
    "cta": "final slide CTA text",
    "funnel_stage": "awareness",
    "video_style": "swiss-carousel",
    "video_config": {{"aspect_ratio": "1:1", "accent_color": "#6366f1"}},
    "metadata": {{
        "slide_headlines": ["Slide 1", "Slide 2", "Slide 3", "Slide 4", "CTA"]
    }}
}}"""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=1536)
    return _parse_response(result, seed, "carousel", "general")


# ─── Email ─────────────────────────────────────────────────────────────────

async def generate_email(
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Seed/newsletter → Email Formatter → subject/preview/body/CTA."""

    source_text = draft.get("body", "") if draft else seed.get("seed", "")

    system_prompt = f"""You are an email marketing specialist. You write emails that get opened and read.

{product_context}

{voice_context}

{prompt_set.get("voice_rules", "")}

EMAIL FORMATTER RULES:
- Subject line: 6-10 words. Create curiosity or urgency without clickbait.
- Preview text: Under 90 chars. Complements the subject, doesn't repeat it.
- Body: 3-5 short paragraphs. Conversational, scannable.
- One clear CTA. Don't dilute with multiple asks.
- P.S. line optional but effective — use for secondary hook or social proof.
- Write like a person emailing a colleague, not a newsletter blasting a list."""

    user_prompt = f"""Source material:
Seed: {seed.get('seed', '')}
Heat lines: {json.dumps(seed.get('heat', []))}
{f"Newsletter body: {source_text[:1500]}" if draft else ""}

Create ONE marketing email.

Return ONLY a JSON object:
{{
    "title": "email label",
    "body": "the full email body in markdown",
    "hook": "subject line",
    "cta": "CTA button text",
    "funnel_stage": "consideration",
    "metadata": {{
        "subject_line": "the subject line",
        "preview_text": "preview text under 90 chars"
    }}
}}"""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=2048)
    return _parse_response(result, seed, "email", "general")


# ─── Dispatcher ────────────────────────────────────────────────────────────

# Maps (content_type, platform) → generator function
WORKFLOW_REGISTRY: dict[tuple[str, str], callable] = {
    ("social_post", "twitter"): generate_twitter_post,
    ("social_post", "linkedin"): generate_linkedin_post,
    ("social_post", "meta"): generate_meta_post,
    ("social_post", "general"): generate_meta_post,  # fallback
    ("video_script", "general"): generate_video_script,
    ("x_thread", "twitter"): generate_x_thread,
    ("video_ad", "general"): generate_video_ad,
    ("carousel", "general"): generate_carousel,
    ("email", "general"): generate_email,
}


async def generate_content_by_type(
    content_type: str,
    platform: str,
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Dispatch to the appropriate content-specific workflow.

    Falls back to a generic generation if no specific workflow exists.
    """
    key = (content_type, platform)
    generator = WORKFLOW_REGISTRY.get(key)

    # Try content_type with "general" platform as fallback
    if generator is None:
        generator = WORKFLOW_REGISTRY.get((content_type, "general"))

    if generator is None:
        # Generic fallback for unknown content types
        return await _generate_generic(content_type, platform, seed, draft, product_context, voice_context, prompt_set)

    return await generator(seed, draft, product_context, voice_context, prompt_set)


async def _generate_generic(
    content_type: str,
    platform: str,
    seed: dict,
    draft: dict | None,
    product_context: str,
    voice_context: str,
    prompt_set: dict,
) -> dict:
    """Fallback generator for content types without a dedicated workflow."""

    source_text = draft.get("body", "") if draft else seed.get("seed", "")

    system_prompt = f"""You are a content creator generating {content_type} content for {platform}.

{product_context}

{voice_context}

{prompt_set.get("voice_rules", "")}"""

    user_prompt = f"""Source material:
Seed: {seed.get('seed', '')}
{f"Content: {source_text[:1000]}" if source_text else ""}

Generate ONE piece of {content_type} content for {platform}.

Return ONLY a JSON object:
{{
    "title": "short label",
    "body": "the full content",
    "hook": "opening line or headline",
    "cta": "call to action",
    "funnel_stage": "awareness"
}}"""

    result = await call_claude(user_prompt, system=system_prompt, max_tokens=2048)
    return _parse_response(result, seed, content_type, platform)


# ─── Helpers ───────────────────────────────────────────────────────────────

def _parse_response(result: dict, seed: dict, content_type: str, platform: str) -> dict:
    """Parse Claude's JSON response with safe fallback."""
    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        parsed = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        parsed = {
            "title": f"Generated {content_type}",
            "body": result.get("content", "Generation failed"),
            "hook": None,
            "cta": None,
        }

    # Ensure required fields
    parsed["content_type"] = content_type
    parsed["platform"] = platform
    parsed.setdefault("funnel_stage", "awareness")
    parsed.setdefault("metadata", {})
    parsed["metadata"]["model"] = result.get("model", "unknown")
    parsed["metadata"]["input_tokens"] = result.get("input_tokens", 0)
    parsed["metadata"]["output_tokens"] = result.get("output_tokens", 0)
    parsed["metadata"]["workflow"] = f"{content_type}_{platform}"

    return parsed
