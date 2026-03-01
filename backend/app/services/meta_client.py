"""Meta/Facebook Marketing API client using httpx."""

import logging

import httpx

logger = logging.getLogger(__name__)

META_GRAPH_URL = "https://graph.facebook.com/v21.0"


class MetaClient:
    """Wrapper for Meta Marketing API via direct HTTP calls."""

    def __init__(self, access_token: str, ad_account_id: str = ""):
        self.access_token = access_token
        self.ad_account_id = ad_account_id

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.access_token}"}

    async def post_to_page(self, page_id: str, message: str, link: str | None = None) -> dict:
        """Post to a Facebook page."""
        async with httpx.AsyncClient() as client:
            data: dict = {"message": message}
            if link:
                data["link"] = link

            resp = await client.post(
                f"{META_GRAPH_URL}/{page_id}/feed",
                headers=self._headers(),
                data=data,
            )
            resp.raise_for_status()
            result = resp.json()
            post_id = result.get("id", "")
            logger.info("Posted to Meta page %s: %s", page_id, post_id)
            return {
                "platform_post_id": post_id,
                "url": f"https://facebook.com/{post_id}",
            }

    async def create_ad_campaign(self, name: str, objective: str = "OUTCOME_TRAFFIC") -> dict:
        """Create an ad campaign."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{META_GRAPH_URL}/act_{self.ad_account_id}/campaigns",
                headers=self._headers(),
                data={
                    "name": name,
                    "objective": objective,
                    "status": "PAUSED",
                    "special_ad_categories": "[]",
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def create_ad_set(
        self,
        campaign_id: str,
        name: str,
        daily_budget: int,
        targeting: dict | None = None,
    ) -> dict:
        """Create an ad set within a campaign."""
        async with httpx.AsyncClient() as client:
            data = {
                "name": name,
                "campaign_id": campaign_id,
                "daily_budget": daily_budget,
                "billing_event": "IMPRESSIONS",
                "optimization_goal": "LINK_CLICKS",
                "status": "PAUSED",
                "targeting": str(targeting or {"geo_locations": {"countries": ["US"]}}),
            }
            resp = await client.post(
                f"{META_GRAPH_URL}/act_{self.ad_account_id}/adsets",
                headers=self._headers(),
                data=data,
            )
            resp.raise_for_status()
            return resp.json()

    async def create_ad_creative(
        self,
        name: str,
        page_id: str,
        headline: str,
        body: str,
        link_url: str,
        image_url: str | None = None,
    ) -> dict:
        """Create an ad creative."""
        async with httpx.AsyncClient() as client:
            object_story_spec = {
                "page_id": page_id,
                "link_data": {
                    "message": body,
                    "link": link_url,
                    "name": headline,
                },
            }
            if image_url:
                object_story_spec["link_data"]["picture"] = image_url

            resp = await client.post(
                f"{META_GRAPH_URL}/act_{self.ad_account_id}/adcreatives",
                headers=self._headers(),
                json={
                    "name": name,
                    "object_story_spec": object_story_spec,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def get_post_insights(self, post_id: str) -> dict:
        """Fetch engagement metrics for a page post."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{META_GRAPH_URL}/{post_id}/insights",
                headers=self._headers(),
                params={
                    "metric": "post_impressions,post_clicks,post_reactions_by_type_total",
                },
            )
            resp.raise_for_status()
            data = resp.json().get("data", [])

            metrics: dict = {
                "impressions": 0,
                "clicks": 0,
                "likes": 0,
                "shares": 0,
                "comments": 0,
            }
            for item in data:
                name = item.get("name", "")
                value = item.get("values", [{}])[0].get("value", 0)
                if name == "post_impressions":
                    metrics["impressions"] = value
                elif name == "post_clicks":
                    metrics["clicks"] = value
                elif name == "post_reactions_by_type_total" and isinstance(value, dict):
                    metrics["likes"] = sum(value.values())

            return metrics

    async def get_ad_insights(self, ad_id: str) -> dict:
        """Fetch ad performance insights."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{META_GRAPH_URL}/{ad_id}/insights",
                headers=self._headers(),
                params={
                    "fields": "impressions,clicks,spend,actions,ctr",
                },
            )
            resp.raise_for_status()
            data = resp.json().get("data", [{}])
            if not data:
                return {}

            row = data[0]
            conversions = 0
            for action in row.get("actions", []):
                if action.get("action_type") in ("lead", "purchase", "complete_registration"):
                    conversions += int(action.get("value", 0))

            return {
                "impressions": int(row.get("impressions", 0)),
                "clicks": int(row.get("clicks", 0)),
                "spend": float(row.get("spend", 0)),
                "ctr": float(row.get("ctr", 0)),
                "conversions": conversions,
            }

    async def verify_token(self) -> dict:
        """Test the connection by fetching token info."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{META_GRAPH_URL}/me",
                headers=self._headers(),
                params={"fields": "id,name"},
            )
            resp.raise_for_status()
            return resp.json()
