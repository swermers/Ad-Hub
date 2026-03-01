"""X/Twitter API v2 client wrapper using tweepy."""

import logging

import tweepy

logger = logging.getLogger(__name__)


class TwitterClient:
    """Wrapper around tweepy for X/Twitter API v2 operations."""

    def __init__(self, access_token: str, access_token_secret: str = ""):
        self.access_token = access_token
        self.access_token_secret = access_token_secret
        self._client: tweepy.Client | None = None

    def _get_client(self) -> tweepy.Client:
        if self._client is None:
            from app.config import settings

            self._client = tweepy.Client(
                consumer_key=settings.twitter_client_id,
                consumer_secret=settings.twitter_client_secret,
                access_token=self.access_token,
                access_token_secret=self.access_token_secret,
            )
        return self._client

    def post_tweet(self, text: str) -> dict:
        """Post a tweet and return the tweet data."""
        client = self._get_client()
        response = client.create_tweet(text=text)
        tweet_id = response.data["id"]
        logger.info("Posted tweet %s", tweet_id)
        return {
            "platform_post_id": str(tweet_id),
            "url": f"https://x.com/i/status/{tweet_id}",
        }

    def get_tweet_metrics(self, tweet_id: str) -> dict:
        """Fetch engagement metrics for a tweet."""
        client = self._get_client()
        response = client.get_tweet(
            tweet_id,
            tweet_fields=["public_metrics"],
        )
        if not response.data:
            return {}

        metrics = response.data.get("public_metrics", {})
        return {
            "impressions": metrics.get("impression_count", 0),
            "likes": metrics.get("like_count", 0),
            "shares": metrics.get("retweet_count", 0) + metrics.get("quote_count", 0),
            "comments": metrics.get("reply_count", 0),
            "clicks": metrics.get("url_link_clicks", 0),
        }

    def delete_tweet(self, tweet_id: str) -> bool:
        """Delete a tweet."""
        client = self._get_client()
        client.delete_tweet(tweet_id)
        return True

    def verify_credentials(self) -> dict:
        """Test the connection by fetching the authenticated user."""
        client = self._get_client()
        response = client.get_me(user_fields=["name", "username"])
        if response.data:
            return {
                "id": str(response.data.id),
                "name": response.data.name,
                "username": response.data.username,
            }
        return {}
