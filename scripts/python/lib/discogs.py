"""Thin wrapper around the Discogs search API.

Public docs: https://www.discogs.com/developers
Rate limits: 25 req/min unauthenticated, 60 req/min with a personal token.

We don't bother with OAuth — searches and master/release fetches work fine
with the simple token header.
"""

import os
import time
from typing import Any

import requests

USER_AGENT = "WorldOfShoegaze/0.1 (+https://github.com/andrewjlavoie/World-of-Shoegaze)"
BASE_URL = "https://api.discogs.com"

# Sleep between calls to stay under rate limit. With a token: 1.05s.
# Without: 2.5s (25/min is the unauth limit).
DEFAULT_DELAY = 1.05 if os.environ.get("DISCOGS_TOKEN") else 2.5


def _headers() -> dict[str, str]:
    h = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    token = os.environ.get("DISCOGS_TOKEN")
    if token:
        h["Authorization"] = f"Discogs token={token}"
    return h


def search(query: str, type_: str = "master") -> list[dict[str, Any]]:
    """Search Discogs. Returns the `results` array (possibly empty)."""
    r = requests.get(
        f"{BASE_URL}/database/search",
        params={"q": query, "type": type_, "per_page": 5},
        headers=_headers(),
        timeout=15,
    )
    r.raise_for_status()
    return r.json().get("results", []) or []


def find_album_cover(artist: str, album: str) -> tuple[str | None, str | None]:
    """Search for `{artist} {album}` as a master release. Returns (cover_url, source_url).

    Returns (None, None) if no match. The first hit is used — quality varies; users
    of this function should set a sensible per-call sleep and verify by sampling.
    """
    results = search(f"{artist} {album}", type_="master")
    for hit in results:
        cover = hit.get("cover_image") or hit.get("thumb")
        if cover and "spacer.gif" not in cover:
            uri = hit.get("uri") or ""
            page = f"https://www.discogs.com{uri}" if uri.startswith("/") else uri
            return cover, page
    return None, None


def find_artist_image(artist: str) -> tuple[str | None, str | None]:
    """Search for the artist on Discogs. Returns (image_url, source_url).

    Artist hits frequently have generic genre placeholders; we look for a
    `type=artist` hit with a non-spacer cover_image.
    """
    results = search(artist, type_="artist")
    for hit in results:
        cover = hit.get("cover_image") or hit.get("thumb")
        if cover and "spacer.gif" not in cover:
            uri = hit.get("uri") or ""
            page = f"https://www.discogs.com{uri}" if uri.startswith("/") else uri
            return cover, page
    return None, None


def sleep(extra: float = 0.0) -> None:
    time.sleep(DEFAULT_DELAY + extra)
