"""MusicBrainz + Cover Art Archive wrapper.

Both APIs are free and unauthenticated. MusicBrainz enforces a strict 1 req/sec
rate limit AND requires an identifying User-Agent (with contact info) — see
https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting

We search release-groups by `artist:"X" AND releasegroup:"Y"`, then ask
Cover Art Archive for the matched MBID's front cover.
"""

import time
from typing import Any

import requests

MB_BASE = "https://musicbrainz.org/ws/2"
CAA_BASE = "https://coverartarchive.org"
UA = "WorldOfShoegaze/0.1 (notes@worldofshoegaze.com)"

# MusicBrainz allows up to 1 req/sec for anonymous clients. Sleep a hair
# longer to stay safe across redirects.
RATE = 1.1


def _norm(s: str) -> str:
    return "".join(c.lower() for c in s if c.isalnum())


def search_release_group(artist: str, album: str) -> list[dict[str, Any]]:
    """Lucene-style query against MB's release-group index."""
    q = f'artist:"{artist}" AND releasegroup:"{album}"'
    r = requests.get(
        f"{MB_BASE}/release-group",
        params={"query": q, "fmt": "json", "limit": 5},
        headers={"User-Agent": UA, "Accept": "application/json"},
        timeout=20,
    )
    r.raise_for_status()
    return r.json().get("release-groups", []) or []


def caa_front_url(mbid: str) -> str | None:
    """Cover Art Archive's `/front` redirects to the actual image URL.

    Returns the resolved CDN URL, or None if the release-group has no art.
    `allow_redirects=False` so we can capture the Location header without
    downloading the image bytes.
    """
    r = requests.get(
        f"{CAA_BASE}/release-group/{mbid}/front",
        headers={"User-Agent": UA},
        timeout=15,
        allow_redirects=False,
    )
    if r.status_code in (301, 302, 307, 308):
        return r.headers.get("Location")
    if r.status_code == 200:
        # Some CAA responses serve the bytes directly; the canonical URL still works.
        return f"{CAA_BASE}/release-group/{mbid}/front"
    return None


def find_album_cover(artist: str, album: str) -> tuple[str | None, str | None]:
    """Returns (cover_url, source_url) or (None, None).

    Rate-limited internally: this call may take 1-2 seconds even when it
    misses. Caller doesn't need an extra sleep.
    """
    target_artist = _norm(artist)
    target_album = _norm(album)

    try:
        results = search_release_group(artist, album)
    except Exception:
        return None, None

    for rg in results:
        rg_title = _norm(rg.get("title", ""))
        credits = rg.get("artist-credit") or []
        rg_artist = _norm(credits[0].get("name", "")) if credits else ""
        title_matches = (
            rg_title == target_album
            or target_album in rg_title
            or rg_title in target_album
        )
        artist_matches = (
            bool(rg_artist) and (target_artist in rg_artist or rg_artist in target_artist)
        )
        if not (title_matches and artist_matches):
            continue

        # Respect MB's 1 req/sec before hitting CAA.
        time.sleep(RATE)
        cover = caa_front_url(rg["id"])
        if cover:
            return cover, f"https://musicbrainz.org/release-group/{rg['id']}"

    return None, None


def sleep() -> None:
    time.sleep(RATE)
