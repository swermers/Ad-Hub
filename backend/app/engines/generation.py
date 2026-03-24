import json

from app.engines.vectorstore import get_vectorstore
from app.services.claude_client import call_claude

# Template text constraints — max character counts per field.
# Used to instruct Claude to generate copy that fits each template's layout.
TEMPLATE_CONSTRAINTS = {
    "bold_hook": {"headline": 30, "body": 60, "cta": 20},
    "before_after": {"headline": 25, "body": 50, "cta": 18},
    "pain_solution": {"headline": 30, "body": 60, "cta": 20},
    "stat_proof": {"headline": 15, "body": 50, "cta": 18},
    "testimonial": {"headline": 40, "body": 60, "cta": 18},
    "gradient_card": {"headline": 30, "body": 55, "cta": 20},
    "minimal_clean": {"headline": 25, "body": 50, "cta": 18},
    "split_image": {"headline": 30, "body": 55, "cta": 18},
    "story_vertical": {"headline": 25, "body": 45, "cta": 18},
    "carousel_card": {"headline": 25, "body": 50, "cta": 18},
    "ugc_style": {"headline": 30, "body": 55, "cta": 20},
    # Video styles
    "swiss-bold": {"headline": 25, "body": 50, "cta": 18},
    "swiss-stack": {"headline": 30, "body": 60, "cta": 18},
    "swiss-type": {"headline": 20, "body": 45, "cta": 16},
    "swiss-grid": {"headline": 25, "body": 50, "cta": 18},
    "swiss-minimal": {"headline": 20, "body": 40, "cta": 16},
    "swiss-carousel": {"headline": 25, "body": 50, "cta": 18},
    "swiss-story": {"headline": 25, "body": 45, "cta": 18},
    "saas-demo": {"headline": 35, "body": 60, "cta": 20},
    "data-hype": {"headline": 40, "body": 30, "cta": 20},
    "social-proof": {"headline": 50, "body": 70, "cta": 22},
    "default": {"headline": 30, "body": 60, "cta": 20},
    "pas": {"headline": 25, "body": 50, "cta": 18},
    "kinetic": {"headline": 30, "body": 55, "cta": 18},
    "hand-drawn": {"headline": 25, "body": 50, "cta": 18},
    # Typography-heavy templates
    "editorial_stack": {"headline": 35, "body": 50, "cta": 18},
    "brand_hero": {"headline": 35, "body": 55, "cta": 18},
    "status_card": {"headline": 25, "body": 65, "cta": 18},
    "handwritten_quote": {"headline": 50, "body": 60, "cta": 16},
    "billboard": {"headline": 30, "body": 30, "cta": 18},
}


def _enforce_template_limits(piece_data: dict, template_type: str | None) -> dict:
    """Truncate fields to template limits as safety net."""
    if not template_type or template_type not in TEMPLATE_CONSTRAINTS:
        return piece_data
    tc = TEMPLATE_CONSTRAINTS[template_type]
    if piece_data.get("headline") and len(piece_data["headline"]) > tc["headline"]:
        piece_data["headline"] = piece_data["headline"][:tc["headline"] - 1] + "\u2026"
    if piece_data.get("body") and len(piece_data["body"]) > tc["body"]:
        piece_data["body"] = piece_data["body"][:tc["body"] - 1] + "\u2026"
    if piece_data.get("cta") and len(piece_data["cta"]) > tc["cta"]:
        piece_data["cta"] = piece_data["cta"][:tc["cta"] - 1] + "\u2026"
    return piece_data


def _build_brand_constraints(brand_profile) -> str:
    """Build hard brand constraints from a BrandProfile object for injection into prompts."""
    if not brand_profile:
        return ""

    sections = []

    # Voice & Tone constraints
    voice_parts = []
    tone = _parse_json_field(brand_profile.tone_descriptors)
    if tone:
        voice_parts.append(f"Tone: {', '.join(tone)}")
    always = _parse_json_field(brand_profile.always_use_words)
    if always:
        voice_parts.append(f"ALWAYS use these words/phrases: {', '.join(always)}")
    never = _parse_json_field(brand_profile.never_use_words)
    if never:
        voice_parts.append(f"NEVER use these words/phrases: {', '.join(never)}")
    if brand_profile.sentence_style:
        style_map = {
            "short_punchy": "Use short, punchy sentences. No fluff.",
            "long_flowing": "Use longer, flowing sentences with a conversational rhythm.",
            "mixed": "Mix short punchy sentences with longer explanatory ones.",
        }
        voice_parts.append(style_map.get(brand_profile.sentence_style, ""))
    if voice_parts:
        sections.append("BRAND VOICE CONSTRAINTS (MANDATORY):\n" + "\n".join(f"- {p}" for p in voice_parts))

    # Writing samples for voice matching
    samples = _parse_json_field(brand_profile.writing_samples)
    if samples:
        sample_text = "\n---\n".join(samples[:5])
        sections.append(f"VOICE REFERENCE SAMPLES (match this writing style):\n{sample_text}")

    # Visual constraints
    visual_parts = []
    primary = _parse_json_field(brand_profile.primary_colors)
    secondary = _parse_json_field(brand_profile.secondary_colors)
    accent = _parse_json_field(brand_profile.accent_colors)
    if primary or secondary or accent:
        all_colors = {"primary": primary, "secondary": secondary, "accent": accent}
        visual_parts.append(f"Brand colors: {json.dumps({k: v for k, v in all_colors.items() if v})}")
    fonts = _parse_json_field(brand_profile.approved_fonts)
    if fonts:
        visual_parts.append(f"Approved fonts: {', '.join(fonts)}")
    if brand_profile.photography_style:
        visual_parts.append(f"Photography style: {brand_profile.photography_style}")
    if visual_parts:
        sections.append("VISUAL IDENTITY CONSTRAINTS:\n" + "\n".join(f"- {p}" for p in visual_parts))

    # Content rules
    rules_parts = []
    off_limits = _parse_json_field(brand_profile.off_limit_topics)
    if off_limits:
        rules_parts.append(f"OFF-LIMIT TOPICS (never mention): {', '.join(off_limits)}")
    claims_review = _parse_json_field(brand_profile.claims_need_review)
    if claims_review:
        rules_parts.append(f"Claims requiring legal review (avoid unless explicitly approved): {', '.join(claims_review)}")
    if brand_profile.hashtag_strategy:
        rules_parts.append(f"Hashtag strategy: {brand_profile.hashtag_strategy}")
    if brand_profile.emoji_usage:
        emoji_map = {"yes": "Emojis are encouraged", "limited": "Use emojis sparingly", "no": "Do NOT use emojis"}
        rules_parts.append(emoji_map.get(brand_profile.emoji_usage, ""))
    if brand_profile.cta_style:
        rules_parts.append(f"CTA style: {brand_profile.cta_style}")
    if brand_profile.regulatory_notes:
        rules_parts.append(f"REGULATORY CONSTRAINTS: {brand_profile.regulatory_notes}")
    if rules_parts:
        sections.append("CONTENT RULES (MANDATORY):\n" + "\n".join(f"- {p}" for p in rules_parts))

    # Paused topics
    paused = _parse_json_field(brand_profile.paused_topics)
    if paused:
        sections.append(f"PAUSED TOPICS (do NOT generate content about these): {', '.join(paused)}")

    if not sections:
        return ""

    return "\n\n".join(sections)


def _get_platform_rules(brand_profile, platform: str) -> str:
    """Get platform-specific rules from brand profile."""
    if not brand_profile:
        return ""
    rules_map = {
        "linkedin": brand_profile.linkedin_rules,
        "instagram": brand_profile.instagram_rules,
        "twitter": brand_profile.x_rules,
        "x": brand_profile.x_rules,
        "meta": brand_profile.meta_ads_rules,
        "facebook": brand_profile.meta_ads_rules,
    }
    rules = rules_map.get(platform, "")
    if rules:
        return f"\nPLATFORM-SPECIFIC RULES for {platform}:\n{rules}"
    return ""


def _parse_json_field(value) -> list:
    """Safely parse a JSON string field into a list."""
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


CONTENT_TYPE_PROMPTS = {
    "social_post": {
        "twitter": "Write a Twitter/X post (max 280 characters). Make it punchy with a strong hook. Include 1-2 relevant hashtags.",
        "linkedin": "Write a LinkedIn post (200-400 words). Professional but conversational tone. Include a compelling opening line, key insight, and clear CTA.",
        "general": "Write a social media post that works across platforms. Engaging, concise, with a clear message.",
    },
    "ad_copy": {
        "meta": "Write a Meta/Facebook ad with: Headline (max 30 chars — punchy, no filler words), Primary Text (max 60 chars — one clear statement), Description (max 25 chars), and CTA button text (max 15 chars). Swiss minimalism: every word must earn its place.",
        "google": "Write a Google Search Ad with: 3 headlines (max 30 chars each), 2 descriptions (max 60 chars each). Be direct and concise.",
        "general": "Write ad copy with: Headline (max 30 chars — bold, direct), Body (max 60 chars — one powerful sentence), and CTA (max 15 chars). Less is more. Swiss design demands brevity.",
    },
    "carousel": {
        "meta": "Write a carousel ad for Instagram/Facebook with 5 slides. Each slide needs a punchy headline (max 25 chars). The first slide is the hook, middle slides build the story (problem, benefit, proof), and the last slide is the CTA. Return slide_headlines as pipe-delimited: 'Slide 1|Slide 2|Slide 3|Slide 4|Slide 5'. Also include a body (max 60 chars) and cta (max 15 chars).",
        "general": "Write a carousel ad with 5 slides. Each slide headline max 25 chars. Structure: Hook → Problem → Benefit → Proof → CTA. Return slide_headlines as pipe-delimited: 'Slide 1|Slide 2|Slide 3|Slide 4|Slide 5'. Also include body (max 60 chars) and cta (max 15 chars).",
    },
    "story": {
        "meta": "Write an Instagram/TikTok Story ad. Headline (max 20 chars — ultra punchy, stop-scroll). Body (max 50 chars). CTA (max 12 chars — action verb). This is a full-screen vertical format — every word must hit hard. Swiss minimalism: maximum impact, minimum words.",
        "general": "Write a Story/Reel ad. Headline (max 20 chars — stop-scroll energy). Body (max 50 chars). CTA (max 12 chars). Full-screen vertical, designed for thumb-stopping impact.",
    },
    "email": {
        "general": "Write a marketing email with: Subject line, Preview text (max 90 chars), Email body (3-5 short paragraphs), and CTA button text.",
    },
    "blog_draft": {
        "general": "Write a blog post outline with: Title, Introduction paragraph, 3-5 section headings with 2-3 bullet points each, and a conclusion with CTA.",
    },
}

FUNNEL_STAGE_CONTEXT = {
    "awareness": "The audience doesn't know about this product yet. Focus on the problem they face and hint at the solution.",
    "consideration": "The audience knows they have a problem and is evaluating solutions. Highlight unique differentiators and benefits.",
    "conversion": "The audience is ready to act. Focus on urgency, social proof, and a clear, compelling CTA.",
}


async def generate_content_batch(
    product,
    content_types: list[str],
    platforms: list[str],
    count: int = 5,
    funnel_stage: str = "awareness",
    instructions: str | None = None,
    brand_profile=None,
    template_type: str | None = None,
) -> list[dict]:
    """Generate a batch of content pieces using RAG + Claude."""

    # Get relevant context from vector store
    vs = get_vectorstore()
    search_query = f"{product.name} {product.description} marketing content"
    rag_results = vs.query(product.id, search_query, n_results=5)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    # Build brand context
    brand_brief = ""
    if product.brand_brief:
        try:
            brief = json.loads(product.brand_brief)
            brand_brief = json.dumps(brief, indent=2)
        except json.JSONDecodeError:
            brand_brief = product.brand_brief

    # Build brand constraints from structured profile
    brand_constraints = _build_brand_constraints(brand_profile)

    system_prompt = f"""You are an expert marketing content creator. You create high-quality, engaging content that drives results.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Pain Points: {product.pain_points or "Not specified"}
Differentiators: {product.differentiators or "Not specified"}

{f"Brand Brief: {brand_brief}" if brand_brief else ""}

{brand_constraints}

Funnel Stage: {funnel_stage}
{FUNNEL_STAGE_CONTEXT.get(funnel_stage, "")}

{f"Product Knowledge Context: {rag_context}" if rag_context else ""}

IMPORTANT: Only use factual information from the provided context. Do not invent features or claims.
{f"IMPORTANT: Follow ALL brand voice constraints and content rules above. They are mandatory, not suggestions." if brand_constraints else ""}"""

    # Add template constraints to the prompt if a template is specified
    template_constraint_text = ""
    if template_type and template_type in TEMPLATE_CONSTRAINTS:
        tc = TEMPLATE_CONSTRAINTS[template_type]
        template_constraint_text = f"""

CRITICAL — Template Text Constraints for "{template_type}":
- Headline: MAXIMUM {tc['headline']} characters (this is a HARD limit — text will be cut off if longer)
- Body: MAXIMUM {tc['body']} characters
- CTA: MAXIMUM {tc['cta']} characters
Write punchy, concise copy that fits these limits exactly. Count your characters."""

    all_pieces = []

    for content_type in content_types:
        for platform in platforms:
            type_prompts = CONTENT_TYPE_PROMPTS.get(content_type, {})
            type_instruction = type_prompts.get(
                platform,
                type_prompts.get("general", f"Write {content_type} content for {platform}."),
            )

            platform_rules = _get_platform_rules(brand_profile, platform)

            user_prompt = f"""{type_instruction}
{platform_rules}

Generate {count} unique variations. Each should take a different angle or hook.

{f"Additional instructions: {instructions}" if instructions else ""}

IMPORTANT COPY CONSTRAINTS for ad_copy, carousel, and story:
- hook/headline: MAX 30 characters. Bold, direct, no filler words.
- body: MAX 60 characters. One powerful statement.
- cta: MAX 15 characters. Action verb + value.
- For carousel: include "slide_headlines" as pipe-delimited string ("Slide 1|Slide 2|Slide 3|Slide 4|Slide 5")
- Every word must earn its place. Swiss minimalism: less is more.
{template_constraint_text}

Return your response as a JSON array with this structure:
[
    {{
        "title": "short title/label for this piece",
        "body": "the full content text",
        "hook": "the opening hook or headline (max 30 chars for ads)",
        "cta": "the call to action (max 15 chars for ads)",
        "slide_headlines": "optional — pipe-delimited slide headlines for carousel format"
    }}
]

Return ONLY the JSON array, no additional text or markdown formatting."""

            result = await call_claude(user_prompt, system=system_prompt)

            # Parse the response
            try:
                text = result["content"].strip()
                if text.startswith("```"):
                    text = text.split("\n", 1)[1].rsplit("```", 1)[0]
                pieces = json.loads(text)
            except (json.JSONDecodeError, IndexError):
                pieces = [
                    {
                        "title": "Generated Content",
                        "body": result["content"],
                        "hook": None,
                        "cta": None,
                    }
                ]

            for piece in pieces:
                piece_meta = {
                    "model": result["model"],
                    "input_tokens": result["input_tokens"],
                    "output_tokens": result["output_tokens"],
                    "funnel_stage": funnel_stage,
                }
                # Store carousel slide headlines in metadata if present
                if piece.get("slide_headlines"):
                    piece_meta["slide_headlines"] = piece["slide_headlines"]
                piece_dict = {
                    "content_type": content_type,
                    "platform": platform,
                    "title": piece.get("title"),
                    "body": piece.get("body", ""),
                    "hook": piece.get("hook"),
                    "cta": piece.get("cta"),
                    "metadata": json.dumps(piece_meta),
                }
                # Enforce template character limits as safety net
                _enforce_template_limits(piece_dict, template_type)
                all_pieces.append(piece_dict)

    return all_pieces


def generate_content_batch_sync(
    product,
    content_types: list[str],
    platforms: list[str],
    count: int = 5,
    funnel_stage: str = "awareness",
    instructions: str | None = None,
    brand_profile=None,
    template_type: str | None = None,
) -> list[dict]:
    """Sync version of generate_content_batch for background threads."""
    from app.services.claude_client import call_claude_sync

    vs = get_vectorstore()
    search_query = f"{product.name} {product.description} marketing content"
    rag_results = vs.query(product.id, search_query, n_results=5)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    brand_brief = ""
    if product.brand_brief:
        try:
            brief = json.loads(product.brand_brief)
            brand_brief = json.dumps(brief, indent=2)
        except json.JSONDecodeError:
            brand_brief = product.brand_brief

    # Build brand constraints from structured profile
    brand_constraints = _build_brand_constraints(brand_profile)

    system_prompt = f"""You are an expert marketing content creator. You create high-quality, engaging content that drives results.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Pain Points: {product.pain_points or "Not specified"}
Differentiators: {product.differentiators or "Not specified"}

{f"Brand Brief: {brand_brief}" if brand_brief else ""}

{brand_constraints}

Funnel Stage: {funnel_stage}
{FUNNEL_STAGE_CONTEXT.get(funnel_stage, "")}

{f"Product Knowledge Context: {rag_context}" if rag_context else ""}

IMPORTANT: Only use factual information from the provided context. Do not invent features or claims.
{f"IMPORTANT: Follow ALL brand voice constraints and content rules above. They are mandatory, not suggestions." if brand_constraints else ""}"""

    # Add template constraints to the prompt if a template is specified
    template_constraint_text = ""
    if template_type and template_type in TEMPLATE_CONSTRAINTS:
        tc = TEMPLATE_CONSTRAINTS[template_type]
        template_constraint_text = f"""

CRITICAL — Template Text Constraints for "{template_type}":
- Headline: MAXIMUM {tc['headline']} characters (this is a HARD limit — text will be cut off if longer)
- Body: MAXIMUM {tc['body']} characters
- CTA: MAXIMUM {tc['cta']} characters
Write punchy, concise copy that fits these limits exactly. Count your characters."""

    all_pieces = []

    for content_type in content_types:
        for platform in platforms:
            type_prompts = CONTENT_TYPE_PROMPTS.get(content_type, {})
            type_instruction = type_prompts.get(
                platform,
                type_prompts.get("general", f"Write {content_type} content for {platform}."),
            )

            platform_rules = _get_platform_rules(brand_profile, platform)

            user_prompt = f"""{type_instruction}
{platform_rules}

Generate {count} unique variations. Each should take a different angle or hook.

{f"Additional instructions: {instructions}" if instructions else ""}

IMPORTANT COPY CONSTRAINTS for ad_copy, carousel, and story:
- hook/headline: MAX 30 characters. Bold, direct, no filler words.
- body: MAX 60 characters. One powerful statement.
- cta: MAX 15 characters. Action verb + value.
- For carousel: include "slide_headlines" as pipe-delimited string ("Slide 1|Slide 2|Slide 3|Slide 4|Slide 5")
- Every word must earn its place. Swiss minimalism: less is more.
{template_constraint_text}

Return your response as a JSON array with this structure:
[
    {{
        "title": "short title/label for this piece",
        "body": "the full content text",
        "hook": "the opening hook or headline (max 30 chars for ads)",
        "cta": "the call to action (max 15 chars for ads)",
        "slide_headlines": "optional — pipe-delimited slide headlines for carousel format"
    }}
]

Return ONLY the JSON array, no additional text or markdown formatting."""

            result = call_claude_sync(user_prompt, system=system_prompt)

            try:
                text = result["content"].strip()
                if text.startswith("```"):
                    text = text.split("\n", 1)[1].rsplit("```", 1)[0]
                pieces = json.loads(text)
            except (json.JSONDecodeError, IndexError):
                pieces = [
                    {
                        "title": "Generated Content",
                        "body": result["content"],
                        "hook": None,
                        "cta": None,
                    }
                ]

            for piece in pieces:
                piece_meta = {
                    "model": result["model"],
                    "input_tokens": result["input_tokens"],
                    "output_tokens": result["output_tokens"],
                    "funnel_stage": funnel_stage,
                }
                if piece.get("slide_headlines"):
                    piece_meta["slide_headlines"] = piece["slide_headlines"]
                piece_dict = {
                    "content_type": content_type,
                    "platform": platform,
                    "title": piece.get("title"),
                    "body": piece.get("body", ""),
                    "hook": piece.get("hook"),
                    "cta": piece.get("cta"),
                    "metadata": json.dumps(piece_meta),
                }
                # Enforce template character limits as safety net
                _enforce_template_limits(piece_dict, template_type)
                all_pieces.append(piece_dict)

    return all_pieces


def _build_pain_points_prompts(product, count: int):
    """Build prompts for pain point research (shared)."""
    vs = get_vectorstore()
    search_query = f"{product.name} {product.description} customer pain points problems frustrations"
    rag_results = vs.query(product.id, search_query, n_results=5)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    system_prompt = f"""You are a market research expert. You deeply understand customer psychology, pain points, and buying motivations.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Known Pain Points: {product.pain_points or "Not specified"}
Differentiators: {product.differentiators or "Not specified"}

{f"Product Knowledge Context: {rag_context}" if rag_context else ""}"""

    user_prompt = f"""Research and generate {count} specific pain points that the target audience experiences.
These will be used to create ad copy, so make them vivid and emotionally resonant.

For each pain point, also provide the desired outcome (what they wish they had instead).

Categorize each as one of: frustration, fear, desire, objection
Rate severity from 1-10 (10 = most painful).

Return ONLY a JSON array:
[
    {{
        "pain_point": "specific pain point description",
        "desired_outcome": "what they wish they had instead",
        "category": "frustration|fear|desire|objection",
        "severity": 8,
        "target_segment": "optional specific segment this applies to"
    }}
]

Make pain points specific, not generic. Use the language your target audience would use.
Return ONLY the JSON array, no additional text."""

    return user_prompt, system_prompt


def _parse_pain_points(result: dict) -> list[dict]:
    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return [{"pain_point": result["content"], "desired_outcome": "", "category": "frustration", "severity": 5}]


async def research_pain_points(product, count: int = 20) -> list[dict]:
    """Async version for route handlers."""
    user_prompt, system_prompt = _build_pain_points_prompts(product, count)
    result = await call_claude(user_prompt, system=system_prompt)
    return _parse_pain_points(result)


def research_pain_points_sync(product, count: int = 20) -> list[dict]:
    """Sync version for background threads."""
    from app.services.claude_client import call_claude_sync
    user_prompt, system_prompt = _build_pain_points_prompts(product, count)
    result = call_claude_sync(user_prompt, system=system_prompt)
    return _parse_pain_points(result)


def _build_ad_system_prompt(product, template, funnel_stage: str, rag_context: str, brand_profile=None) -> str:
    """Build the system prompt for ad variation generation (shared by async/sync)."""
    brand_brief = ""
    if product.brand_brief:
        try:
            brief = json.loads(product.brand_brief)
            brand_brief = json.dumps(brief, indent=2)
        except json.JSONDecodeError:
            brand_brief = product.brand_brief

    # Build brand constraints from structured profile
    brand_constraints = _build_brand_constraints(brand_profile)

    template_instructions = {
        "before_after": "Create a Before/After style ad. The headline should describe the 'before' pain state. The body should describe the 'after' desired outcome with the product.",
        "pain_solution": "Create a Pain->Solution style ad. The headline should call out the pain point directly (e.g., 'Tired of X?'). The body should present the product as the solution.",
        "stat_proof": "Create a Stat/Social Proof style ad. The headline should be a compelling number or statistic. The body should provide context and credibility.",
    }

    template_type = template.template_type if hasattr(template, "template_type") else "pain_solution"
    template_instruction = template_instructions.get(template_type, template_instructions["pain_solution"])

    # Extract brand colors from product
    brand_colors = []
    if product.brand_colors:
        try:
            brand_colors = json.loads(product.brand_colors)
        except (json.JSONDecodeError, TypeError):
            pass

    # Also try to pull colors from brand brief visual_identity
    brief_colors = []
    if brand_brief:
        try:
            brief_obj = json.loads(brand_brief) if isinstance(brand_brief, str) else brand_brief
            vi = brief_obj.get("visual_identity", {})
            brief_colors = vi.get("primary_colors", [])
        except (json.JSONDecodeError, TypeError, AttributeError):
            pass

    all_brand_colors = list(dict.fromkeys(brief_colors + brand_colors))

    color_instruction = ""
    if all_brand_colors:
        color_instruction = f"""
BRAND COLORS (use these for the ad visual styling):
{json.dumps(all_brand_colors[:6])}
For each variation, pick colors from this palette:
- backgroundColor: a dark or dominant brand color (or darken one for readability)
- textColor: a contrasting color for text readability (usually white or light)
- accentColor: a vibrant brand color for CTAs and highlights"""
    else:
        color_instruction = """
COLOR STYLING:
For each variation, suggest visually appealing colors:
- backgroundColor: the dominant background color (hex)
- textColor: text color for readability (hex)
- accentColor: accent color for CTAs and highlights (hex)"""

    return f"""You are an expert Facebook ad copywriter. You write concise, high-converting ad copy.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Differentiators: {product.differentiators or "Not specified"}

{f"Brand Brief: {brand_brief}" if brand_brief else ""}

{brand_constraints}

Funnel Stage: {funnel_stage}
{FUNNEL_STAGE_CONTEXT.get(funnel_stage, "")}

{f"Product Knowledge: {rag_context}" if rag_context else ""}

Ad Format: {template_instruction}
{color_instruction}

CONSTRAINTS:
- Headline: max {TEMPLATE_CONSTRAINTS.get(template_type, TEMPLATE_CONSTRAINTS["default"])["headline"]} characters
- Body: max {TEMPLATE_CONSTRAINTS.get(template_type, TEMPLATE_CONSTRAINTS["default"])["body"]} characters
- CTA: max {TEMPLATE_CONSTRAINTS.get(template_type, TEMPLATE_CONSTRAINTS["default"])["cta"]} characters (e.g., "Try Free", "Learn More", "Get Started")

{"CRITICAL — Template Text Constraints for " + repr(template_type) + ": these are HARD limits — text will be cut off if longer. Write punchy, concise copy that fits. Count your characters." if template_type and template_type in TEMPLATE_CONSTRAINTS else ""}

Write copy that speaks directly to the pain point. Be specific, not generic.
{f"IMPORTANT: Follow ALL brand voice constraints and content rules above. They are mandatory, not suggestions." if brand_constraints else ""}"""


def _build_ad_user_prompt(pain_text: str, outcome_text: str, variations_per: int) -> str:
    return f"""Pain Point: {pain_text}
Desired Outcome: {outcome_text}

Generate {variations_per} unique ad copy variations for this pain point.
Each variation should take a different angle, tone, or hook.

Return ONLY a JSON array:
[
    {{
        "headline": "max 40 chars",
        "body": "max 125 chars",
        "cta": "max 30 chars",
        "backgroundColor": "#hex color",
        "textColor": "#hex color",
        "accentColor": "#hex color"
    }}
]

Return ONLY the JSON array, no additional text."""


def _parse_ad_variations(result: dict, pain_points_data: list[tuple]) -> list[dict]:
    """Parse Claude response into variation dicts. pain_points_data is list of (pp_id, result)."""
    all_variations = []
    for pp_id, res in pain_points_data:
        try:
            text = res["content"].strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            variations = json.loads(text)
        except (json.JSONDecodeError, IndexError):
            variations = [{"headline": "Check this out", "body": res["content"][:125], "cta": "Learn More"}]

        for v in variations:
            entry = {
                "pain_point_id": pp_id,
                "headline": v.get("headline", "")[:255],
                "body": v.get("body", ""),
                "cta": v.get("cta", "Learn More")[:255],
            }
            for color_key in ("backgroundColor", "textColor", "accentColor"):
                if v.get(color_key):
                    entry[color_key] = v[color_key]
            all_variations.append(entry)
    return all_variations


async def generate_ad_variations(
    product,
    template,
    pain_points: list,
    variations_per: int = 5,
    funnel_stage: str = "awareness",
    brand_profile=None,
) -> list[dict]:
    """Generate ad copy variations (async - for route handlers)."""
    vs = get_vectorstore()
    search_query = f"{product.name} {product.description} marketing ads"
    rag_results = vs.query(product.id, search_query, n_results=3)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    system_prompt = _build_ad_system_prompt(product, template, funnel_stage, rag_context, brand_profile)

    results = []
    for pp in pain_points:
        pain_text = pp.pain_point if hasattr(pp, "pain_point") else str(pp)
        outcome_text = pp.desired_outcome if hasattr(pp, "desired_outcome") else ""
        pp_id = pp.id if hasattr(pp, "id") else None

        user_prompt = _build_ad_user_prompt(pain_text, outcome_text, variations_per)
        result = await call_claude(user_prompt, system=system_prompt)
        results.append((pp_id, result))

    return _parse_ad_variations(None, results)


def generate_ad_variations_sync(
    product,
    template,
    pain_points: list,
    variations_per: int = 5,
    funnel_stage: str = "awareness",
    brand_profile=None,
) -> list[dict]:
    """Generate ad copy variations (sync - for background threads)."""
    from app.services.claude_client import call_claude_sync

    vs = get_vectorstore()
    search_query = f"{product.name} {product.description} marketing ads"
    rag_results = vs.query(product.id, search_query, n_results=3)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    system_prompt = _build_ad_system_prompt(product, template, funnel_stage, rag_context, brand_profile)

    results = []
    for pp in pain_points:
        pain_text = pp.pain_point if hasattr(pp, "pain_point") else str(pp)
        outcome_text = pp.desired_outcome if hasattr(pp, "desired_outcome") else ""
        pp_id = pp.id if hasattr(pp, "id") else None

        user_prompt = _build_ad_user_prompt(pain_text, outcome_text, variations_per)
        result = call_claude_sync(user_prompt, system=system_prompt)
        results.append((pp_id, result))

    return _parse_ad_variations(None, results)


async def analyze_winners(product, winners: list, losers: list) -> dict:
    """Analyze winning and losing ad variations to find patterns."""
    winner_data = [{"headline": w.headline, "body": w.body, "cta": w.cta, "score": w.performance_score} for w in winners]
    loser_data = [{"headline": l.headline, "body": l.body, "cta": l.cta} for l in losers]

    system_prompt = f"""You are a performance marketing analyst. Analyze ad performance patterns.

Product: {product.name}
Description: {product.description}"""

    user_prompt = f"""Analyze these winning and losing Facebook ads to find patterns.

WINNERS (high CTR, kept running):
{json.dumps(winner_data, indent=2)}

LOSERS (paused due to low performance):
{json.dumps(loser_data, indent=2)}

Return a JSON object with:
{{
    "winning_patterns": ["pattern 1", "pattern 2", ...],
    "losing_patterns": ["pattern 1", "pattern 2", ...],
    "recommended_angles": ["new angle to test 1", "new angle 2", ...],
    "recommended_templates": ["template suggestion 1", ...],
    "summary": "2-3 sentence summary of findings"
}}

Return ONLY the JSON object."""

    result = await call_claude(user_prompt, system=system_prompt)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        analysis = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        analysis = {
            "winning_patterns": [],
            "losing_patterns": [],
            "recommended_angles": ["Insufficient data for analysis"],
            "recommended_templates": [],
            "summary": result["content"],
        }

    return analysis
