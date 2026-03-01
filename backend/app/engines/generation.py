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
