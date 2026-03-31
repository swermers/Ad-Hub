import json
import logging
import os
import re
import uuid
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "screenshots")


async def crawl_website(start_url: str, max_pages: int = 20) -> list[dict]:
    """Crawl a website starting from start_url, extracting text content.

    Uses httpx (HTTP client) by default. Falls back gracefully if a page
    can't be fetched. For JS-heavy sites, Playwright can be used instead
    (requires `playwright install chromium`).
    """
    domain = urlparse(start_url).netloc
    visited: set[str] = set()
    results: list[dict] = []
    queue = [start_url]
    all_colors: set[str] = set()
    all_fonts: set[str] = set()

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=15.0,
        headers={"User-Agent": "Iterant-Crawler/0.1"},
    ) as client: