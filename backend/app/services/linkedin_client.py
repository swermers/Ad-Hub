"""LinkedIn API client for posting content and collecting metrics.

Uses LinkedIn's Marketing API v2 (Community Management API).
Requires an access token with `w_member_social` scope for personal posts,
or `w_organization_social` for company page posts.
"""

import logging

import httpx

logger = logging.getLogger(__name__)

LINKEDIN_API_BASE = "https://api.linkedin.com/v2"
LINKEDIN_REST_BASE = "https://api.linkedin.com/rest"


class LinkedInClient:
    """Async LinkedIn API client for content publishing and metrics."""

    def __init__(self, access_token: str, profile_id: str = ""):
        self.access_token = access_token
        self.profile_id = profile_id  # URN like "urn:li:person:ABC123" or "urn:li:organization:123"
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                    "LinkedIn-Version": "202401",
                },
                timeout=30.0,
            )
        return self._client

    async def _get_profile_urn(self) -> str:
        """Get the author URN. Uses stored profile_id or fetches from /me."""
        if self.profile_id:
            # If already a URN, use as-is
            if self.profile_id.startswith("urn:li:"):
                return self.profile_id
            # Otherwise wrap as person URN
            return f"urn:li:person:{self.profile_id}"

        # Fetch from /me endpoint
        client = self._get_client()
        resp = await client.get(f"{LINKEDIN_API_BASE}/me")
        resp.raise_for_status()
        data = resp.json()
        self.profile_id = data.get("id", "")
        return f"urn:li:person:{self.profile_id}"

    # ─── Publishing ─────────────────────────────────────────────────────────

    async def post_to_feed(
        self,
        text: str,
        image_url: str | None = None,
        link_url: str | None = None,
    ) -> dict:
        """Publish a post to the user's LinkedIn feed.

        Returns: {"platform_post_id": str, "url": str, "published": True}
        """
        client = self._get_client()
        author = await self._get_profile_urn()

        # Build the share content
        specific_content: dict = {}
        if link_url:
            specific_content = {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "ARTICLE",
                    "media": [
                        {
                            "status": "READY",
                            "originalUrl": link_url,
                        }
                    ],
                }
            }
        else:
            specific_content = {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "NONE",
                }
            }

        payload = {
            "author": author,
            "lifecycleState": "PUBLISHED",
            "specificContent": specific_content,
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
        }

        resp = await client.post(f"{LINKEDIN_API_BASE}/ugcPosts", json=payload)
        resp.raise_for_status()

        post_id = resp.headers.get("x-restli-id", resp.json().get("id", ""))
        # Extract the activity ID for the URL
        activity_id = post_id.replace("urn:li:share:", "").replace("urn:li:ugcPost:", "")

        return {
            "platform_post_id": post_id,
            "url": f"https://www.linkedin.com/feed/update/{post_id}/",
            "published": True,
        }

    async def create_draft_post(
        self,
        text: str,
        image_url: str | None = None,
        link_url: str | None = None,
    ) -> dict:
        """Create a draft post (not published yet).

        LinkedIn doesn't have a native draft API, so we store the content
        locally and publish on demand. Returns a local reference.
        """
        # LinkedIn's API doesn't support drafts natively for UGC posts.
        # We return the content as a "draft" that can be published later.
        return {
            "platform_post_id": "",
            "url": "",
            "published": False,
            "draft_content": {
                "text": text,
                "image_url": image_url,
                "link_url": link_url,
            },
        }

    async def publish_draft(self, draft_content: dict) -> dict:
        """Publish a previously created draft by posting it now."""
        return await self.post_to_feed(
            text=draft_content.get("text", ""),
            image_url=draft_content.get("image_url"),
            link_url=draft_content.get("link_url"),
        )

    # ─── Metrics ────────────────────────────────────────────────────────────

    async def get_post_metrics(self, post_id: str) -> dict:
        """Fetch engagement metrics for a LinkedIn post.

        Returns normalized metrics dict compatible with PerformanceMetric model.
        """
        client = self._get_client()

        try:
            # LinkedIn Social Actions API
            encoded_id = post_id.replace(":", "%3A")
            resp = await client.get(
                f"{LINKEDIN_API_BASE}/socialActions/{encoded_id}"
            )
            resp.raise_for_status()
            data = resp.json()

            likes = data.get("likesSummary", {}).get("totalLikes", 0)
            comments = data.get("commentsSummary", {}).get("totalFirstLevelComments", 0)

            # LinkedIn doesn't expose impressions/clicks via this endpoint
            # for personal posts — would need LinkedIn Analytics API for org pages
            return {
                "impressions": 0,
                "clicks": 0,
                "likes": likes,
                "shares": 0,
                "comments": comments,
                "ctr": 0.0,
            }
        except httpx.HTTPStatusError as e:
            logger.warning("Failed to fetch LinkedIn metrics for %s: %s", post_id, e)
            return {
                "impressions": 0,
                "clicks": 0,
                "likes": 0,
                "shares": 0,
                "comments": 0,
                "ctr": 0.0,
            }

    # ─── Auth Verification ──────────────────────────────────────────────────

    async def verify_token(self) -> dict:
        """Verify the access token and return profile info."""
        client = self._get_client()
        resp = await client.get(f"{LINKEDIN_API_BASE}/me")
        resp.raise_for_status()
        data = resp.json()

        first = data.get("localizedFirstName", "")
        last = data.get("localizedLastName", "")

        return {
            "id": data.get("id", ""),
            "name": f"{first} {last}".strip(),
            "username": data.get("vanityName", data.get("id", "")),
        }

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
