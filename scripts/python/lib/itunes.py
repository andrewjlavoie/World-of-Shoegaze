"""iTunes Search API wrapper.

Free, no auth, no rate-limit headers (Apple suggests ~20 req/min to be safe).
Returns CDN URLs with size suffix in path — we swap `100x100bb` for `1200x1200bb`
to get a high-quality version.

Docs: https://performance-partners.apple.com/search-api
"""

import re
import time
from typing import Any

import requests

BASE = "https://itunes.apple.com/search"
USER_AGENT = "WorldOfShoegaze/0.1 (+https://github.com/andrewjlavoie/World-of-Shoegaze)"
DEFAULT_DELAY = 1.2  # ~50/min


def _norm(s: str) -> str:
    return "".join(c.lower() for c in s if c.isalnum())


def _bigger(url: str, target: str = "1200x1200bb") -> str:
    """Replace iTunes artwork size suffix with a high-res variant."""
    return re.sub(r"\d+x\d+bb(?=\.\w+$)", target, url)


def search_album(artist: str, album: str, country: str = "us") -> list[dict[str, Any]]:
    """Search iTunes for `{artist} {album}` as an album. Returns up to 10 hits."""
    r = requests.get(
        BASE,
        params={
            "term": f"{artist} {album}",
            "entity": "album",
            "country": country,
            "limit": 10,
        },
        headers={"User-Agent": USER_AGENT},
        timeout=15,
    )
    r.raise_for_status()
    return r.json().get("results", []) or []


def find_album_cover(artist: str, album: str) -> tuple[str | None, str | None]:
    """Returns (cover_url_high_res, apple_music_url) or (None, None).

    Matching: prefer a hit whose `collectionName` normalizes-equal to `album`
    AND whose `artistName` matches `artist`. Falls back to the first
    artwork-bearing hit by the same artist if no exact title match.
    """
    target_album = _norm(album)
    target_artist = _norm(artist)
    results = search_album(artist, album)

    fallback = None
    for hit in results:
        art = hit.get("artworkUrl100")
        if not art:
            continue
        coll = _norm(hit.get("collectionName", ""))
        art_name = _norm(hit.get("artistName", ""))
        # Apple sometimes returns "(Deluxe)" or "(Remastered)" suffixes —
        # accept if the target album is a prefix or substring.
        title_matches = coll == target_album or target_album in coll or coll in target_album
        artist_matches = target_artist in art_name or art_name in target_artist
        if title_matches and artist_matches:
            return _bigger(art), hit.get("collectionViewUrl")
        if fallback is None and artist_matches:
            fallback = (_bigger(art), hit.get("collectionViewUrl"))

    return fallback if fallback else (None, None)


def search_artist(artist: str, country: str = "us") -> list[dict[str, Any]]:
    """Search iTunes for `artist` as a musicArtist entity. Returns up to 5 hits."""
    r = requests.get(
        BASE,
        params={
            "term": artist,
            "entity": "musicArtist",
            "country": country,
            "limit": 5,
        },
        headers={"User-Agent": USER_AGENT},
        timeout=15,
    )
    r.raise_for_status()
    return r.json().get("results", []) or []


def find_artist_url(artist: str) -> tuple[str | None, str | None]:
    """Return (artistLinkUrl, None) for the best-matching musicArtist hit, or (None, None).

    Matching: first hit whose `artistName` normalises equal (or is a prefix/substring)
    to the input name. The ``artistLinkUrl`` is the public music.apple.com page.
    """
    target = _norm(artist)
    results = search_artist(artist)

    for hit in results:
        link = hit.get("artistLinkUrl")
        if not link:
            continue
        hit_name = _norm(hit.get("artistName", ""))
        if hit_name == target or target in hit_name or hit_name in target:
            return link, None

    return None, None


def sleep() -> None:
    time.sleep(DEFAULT_DELAY)
