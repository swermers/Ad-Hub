import json

from app.engines.vectorstore import get_vectorstore
from app.services.claude_client import call_claude

CONTENT_TYPE_PROMPTS = {
    "social_post": {
        "twitter": "Write a Twitter/X post (max 280 characters). Make it punchy with a strong hook. Include 1-2 relevant hashtags.",
        "linkedin": "Write a LinkedIn post (200-400 words). Professional but conversational tone. Include a compelling opening line, key insight, and clear CTA.",
        "general": "Write a social media post that works across platforms. Engaging, concise, with a clear message.",
    },
    "ad_copy": {
        "meta": "Write a Meta/Facebook ad with: Headline (max 40 chars), Primary Text (max 125 chars), Description (max 30 chars), and CTA button text.",
        "google": "Write a Google Search Ad with: 3 headlines (max 30 chars each), 2 descriptions (max 90 chars each).",
        "general": "Write ad copy with: Headline, Body (2-3 sentences), and CTA.",
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

    system_prompt = f"""You are an expert marketing content creator. You create high-quality, engaging content that drives results.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Pain Points: {product.pain_points or "Not specified"}
Differentiators: {product.differentiators or "Not specified"}

{f"Brand Brief: {brand_brief}" if brand_brief else ""}

Funnel Stage: {funnel_stage}
{FUNNEL_STAGE_CONTEXT.get(funnel_stage, "")}

{f"Product Knowledge Context: {rag_context}" if rag_context else ""}

IMPORTANT: Only use factual information from the provided context. Do not invent features or claims."""

    all_pieces = []

    for content_type in content_types:
        for platform in platforms:
            type_prompts = CONTENT_TYPE_PROMPTS.get(content_type, {})
            type_instruction = type_prompts.get(
                platform,
                type_prompts.get("general", f"Write {content_type} content for {platform}."),
            )

            user_prompt = f"""{type_instruction}

Generate {count} unique variations. Each should take a different angle or hook.

{f"Additional instructions: {instructions}" if instructions else ""}

Return your response as a JSON array with this structure:
[
    {{
        "title": "short title/label for this piece",
        "body": "the full content text",
        "hook": "the opening hook or headline",
        "cta": "the call to action"
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
                all_pieces.append(
                    {
                        "content_type": content_type,
                        "platform": platform,
                        "title": piece.get("title"),
                        "body": piece.get("body", ""),
                        "hook": piece.get("hook"),
                        "cta": piece.get("cta"),
                        "metadata": json.dumps(
                            {
                                "model": result["model"],
                                "input_tokens": result["input_tokens"],
                                "output_tokens": result["output_tokens"],
                                "funnel_stage": funnel_stage,
                            }
                        ),
                    }
                )

    return all_pieces


async def research_pain_points(product, count: int = 20) -> list[dict]:
    """Use Claude to research and generate structured pain points for a product."""
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

    result = await call_claude(user_prompt, system=system_prompt)

    try:
        text = result["content"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        points = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        points = [{"pain_point": result["content"], "desired_outcome": "", "category": "frustration", "severity": 5}]

    return points


async def generate_ad_variations(
    product,
    template,
    pain_points: list,
    variations_per: int = 5,
    funnel_stage: str = "awareness",
) -> list[dict]:
    """Generate ad copy variations for each pain point using the template format."""
    vs = get_vectorstore()
    search_query = f"{product.name} {product.description} marketing ads"
    rag_results = vs.query(product.id, search_query, n_results=3)
    rag_context = "\n\n".join([r["text"] for r in rag_results]) if rag_results else ""

    brand_brief = ""
    if product.brand_brief:
        try:
            brief = json.loads(product.brand_brief)
            brand_brief = json.dumps(brief, indent=2)
        except json.JSONDecodeError:
            brand_brief = product.brand_brief

    template_instructions = {
        "before_after": "Create a Before/After style ad. The headline should describe the 'before' pain state. The body should describe the 'after' desired outcome with the product.",
        "pain_solution": "Create a Pain->Solution style ad. The headline should call out the pain point directly (e.g., 'Tired of X?'). The body should present the product as the solution.",
        "stat_proof": "Create a Stat/Social Proof style ad. The headline should be a compelling number or statistic. The body should provide context and credibility.",
    }

    template_type = template.template_type if hasattr(template, "template_type") else "pain_solution"
    template_instruction = template_instructions.get(template_type, template_instructions["pain_solution"])

    system_prompt = f"""You are an expert Facebook ad copywriter. You write concise, high-converting ad copy.

Product: {product.name}
Description: {product.description}
Target Audience: {product.target_audience or "General audience"}
Differentiators: {product.differentiators or "Not specified"}

{f"Brand Brief: {brand_brief}" if brand_brief else ""}

Funnel Stage: {funnel_stage}
{FUNNEL_STAGE_CONTEXT.get(funnel_stage, "")}

{f"Product Knowledge: {rag_context}" if rag_context else ""}

Ad Format: {template_instruction}

CONSTRAINTS:
- Headline: max 40 characters
- Body: max 125 characters
- CTA: max 30 characters (e.g., "Try Free", "Learn More", "Get Started")

Write copy that speaks directly to the pain point. Be specific, not generic."""

    all_variations = []

    for pp in pain_points:
        pain_text = pp.pain_point if hasattr(pp, "pain_point") else str(pp)
        outcome_text = pp.desired_outcome if hasattr(pp, "desired_outcome") else ""
        pp_id = pp.id if hasattr(pp, "id") else None

        user_prompt = f"""Pain Point: {pain_text}
Desired Outcome: {outcome_text}

Generate {variations_per} unique ad copy variations for this pain point.
Each variation should take a different angle, tone, or hook.

Return ONLY a JSON array:
[
    {{
        "headline": "max 40 chars",
        "body": "max 125 chars",
        "cta": "max 30 chars"
    }}
]

Return ONLY the JSON array, no additional text."""

        result = await call_claude(user_prompt, system=system_prompt)

        try:
            text = result["content"].strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            variations = json.loads(text)
        except (json.JSONDecodeError, IndexError):
            variations = [{"headline": "Check this out", "body": result["content"][:125], "cta": "Learn More"}]

        for v in variations:
            all_variations.append({
                "pain_point_id": pp_id,
                "headline": v.get("headline", "")[:255],
                "body": v.get("body", ""),
                "cta": v.get("cta", "Learn More")[:255],
            })

    return all_variations


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
