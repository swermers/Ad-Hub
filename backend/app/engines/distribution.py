"""Distribution engine — posts content to connected platforms.

Supports two modes:
- **Direct publish**: Posts immediately (legacy, lower organic reach on Meta).
- **Draft injection**: Creates unpublished drafts on the platform. The human
  approves via Telegram or dashboard, then publishes from the native UI
  (full organic reach) or triggers publish via API.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import ContentPiece, PlatformConnection, ScheduledPost

logger = logging.getLogger(__name__)


async def post_to_platform(
    db: Session,
    scheduled_post: ScheduledPost,
) -> dict:
    """Post content to the connected platform and update status."""
    connection = scheduled_post.connection
    content = scheduled_post.content

    scheduled_post.status = "posting"
    db.commit()

    try:
        result = await _dispatch_post(connection, content)

        scheduled_post.status = "posted"
        scheduled_post.posted_at = datetime.now(timezone.utc)
        scheduled_post.platform_post_id = result.get("platform_post_id")

        # Update content status
        content.status = "posted"
        db.commit()

        logger.info(
            "Posted content %s to %s: %s",
            content.id,
            connection.platform,
            result.get("platform_post_id"),
        )
        return result

    except Exception as e:
        scheduled_post.status = "failed"
        scheduled_post.error = str(e)
        db.commit()
        logger.error("Failed to post content %s to %s: %s", content.id, connection.platform, e)
        raise


async def inject_draft(
    db: Session,
    scheduled_post: ScheduledPost,
    scheduled_publish_time: int | None = None,
) -> dict:
    """Create an unpublished draft on the platform.

    The draft sits in Creator Studio / Meta Business Suite until the human
    publishes it. This avoids the API-posted reach penalty on Meta/Instagram.

    For Twitter (which has no draft API), the content stays in Iterant's
    approval queue — the human can copy-paste or we post on approval.
    """
    connection = scheduled_post.connection
    content = scheduled_post.content

    scheduled_post.status = "draft_injected"
    db.commit()

    try:
        result = await _dispatch_draft(connection, content, scheduled_publish_time)

        scheduled_post.platform_post_id = result.get("platform_post_id")
        scheduled_post.status = "draft_injected"
        content.status = "draft_injected"
        db.commit()

        logger.info(
            "Draft injected for content %s on %s: %s",
            content.id,
            connection.platform,
            result.get("platform_post_id"),
        )
        return result

    except Exception as e:
        scheduled_post.status = "failed"
        scheduled_post.error = str(e)
        db.commit()
        logger.error("Failed to inject draft for content %s on %s: %s", content.id, connection.platform, e)
        raise


async def publish_draft_post(
    db: Session,
    scheduled_post: ScheduledPost,
) -> dict:
    """Publish a previously injected draft. Called when human approves."""
    connection = scheduled_post.connection
    content = scheduled_post.content
    platform_post_id = scheduled_post.platform_post_id

    if not platform_post_id:
        raise ValueError("No platform post ID — draft was never injected")

    try:
        result = await _dispatch_publish(connection, platform_post_id)

        scheduled_post.status = "posted"
        scheduled_post.posted_at = datetime.now(timezone.utc)
        content.status = "posted"
        db.commit()

        logger.info(
            "Published draft %s for content %s on %s",
            platform_post_id,
            content.id,
            connection.platform,
        )
        return result

    except Exception as e:
        scheduled_post.status = "failed"
        scheduled_post.error = str(e)
        db.commit()
        logger.error("Failed to publish draft %s: %s", platform_post_id, e)
        raise


async def _dispatch_post(connection: PlatformConnection, content: ContentPiece) -> dict:
    """Route posting to the correct platform client."""
    platform = connection.platform

    if platform == "twitter":
        from app.services.twitter_client import TwitterClient

        client = TwitterClient(
            access_token=connection.access_token,
            access_token_secret=connection.refresh_token or "",
        )
        text = content.body
        # Truncate for Twitter's 280 char limit
        if len(text) > 280:
            text = text[:277] + "..."
        return client.post_tweet(text)

    elif platform == "meta":
        from app.services.meta_client import MetaClient

        client = MetaClient(
            access_token=connection.access_token,
            ad_account_id=connection.platform_account_id or "",
        )
        return await client.post_to_page(
            page_id=connection.platform_account_id or "",
            message=content.body,
        )

    elif platform == "linkedin":
        from app.services.linkedin_client import LinkedInClient

        client = LinkedInClient(
            access_token=connection.access_token,
            profile_id=connection.platform_account_id or "",
        )
        return await client.post_to_feed(text=content.body)

    else:
        raise ValueError(f"Unsupported platform: {platform}")


async def _dispatch_draft(
    connection: PlatformConnection,
    content: ContentPiece,
    scheduled_publish_time: int | None = None,
) -> dict:
    """Create an unpublished draft on the platform."""
    platform = connection.platform

    if platform == "meta":
        from app.services.meta_client import MetaClient

        client = MetaClient(
            access_token=connection.access_token,
            ad_account_id=connection.platform_account_id or "",
        )
        return await client.create_draft_post(
            page_id=connection.platform_account_id or "",
            message=content.body,
            scheduled_publish_time=scheduled_publish_time,
        )

    elif platform == "twitter":
        return {
            "platform_post_id": None,
            "published": False,
            "held_locally": True,
            "reason": "Twitter has no draft API — held for direct post on approval",
        }

    elif platform == "linkedin":
        from app.services.linkedin_client import LinkedInClient

        client = LinkedInClient(
            access_token=connection.access_token,
            profile_id=connection.platform_account_id or "",
        )
        return await client.create_draft_post(text=content.body)

    else:
        raise ValueError(f"Unsupported platform for drafts: {platform}")


async def _dispatch_publish(connection: PlatformConnection, platform_post_id: str) -> dict:
    """Publish a previously created draft on the platform."""
    platform = connection.platform

    if platform == "meta":
        from app.services.meta_client import MetaClient

        client = MetaClient(
            access_token=connection.access_token,
            ad_account_id=connection.platform_account_id or "",
        )
        return await client.publish_draft(platform_post_id)

    elif platform == "twitter":
        raise ValueError("Twitter drafts should be published via direct post, not publish_draft")

    elif platform == "linkedin":
        from app.services.linkedin_client import LinkedInClient

        client = LinkedInClient(
            access_token=connection.access_token,
            profile_id=connection.platform_account_id or "",
        )
        # LinkedIn drafts are held locally — post directly now
        return await client.post_to_feed(text=platform_post_id)  # post_id here is draft content

    else:
        raise ValueError(f"Unsupported platform for publish: {platform}")


async def collect_metrics_for_post(
    db: Session,
    scheduled_post: ScheduledPost,
) -> dict:
    """Fetch latest metrics from the platform for a posted piece of content."""
    if not scheduled_post.platform_post_id:
        return {}

    connection = scheduled_post.connection
    platform = connection.platform

    try:
        if platform == "twitter":
            from app.services.twitter_client import TwitterClient

            client = TwitterClient(
                access_token=connection.access_token,
                access_token_secret=connection.refresh_token or "",
            )
            return client.get_tweet_metrics(scheduled_post.platform_post_id)

        elif platform == "meta":
            from app.services.meta_client import MetaClient

            client = MetaClient(
                access_token=connection.access_token,
                ad_account_id=connection.platform_account_id or "",
            )
            return await client.get_post_insights(scheduled_post.platform_post_id)

        elif platform == "linkedin":
            from app.services.linkedin_client import LinkedInClient

            client = LinkedInClient(
                access_token=connection.access_token,
                profile_id=connection.platform_account_id or "",
            )
            return await client.get_post_metrics(scheduled_post.platform_post_id)

        return {}

    except Exception as e:
        logger.warning(
            "Failed to collect metrics for post %s: %s",
            scheduled_post.id,
            e,
        )
        return {}
