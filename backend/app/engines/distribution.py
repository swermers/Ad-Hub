"""Distribution engine — posts content to connected platforms."""

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

    else:
        raise ValueError(f"Unsupported platform: {platform}")


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

        return {}

    except Exception as e:
        logger.warning(
            "Failed to collect metrics for post %s: %s",
            scheduled_post.id,
            e,
        )
        return {}
