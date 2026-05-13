#!/usr/bin/env python3
"""Populate the `listen` field on each artist document.

Services:
  apple    — iTunes Search API (free, no auth). Always attempted.
  bandcamp — URL probe at https://{slug}.bandcamp.com/ (no auth). Always attempted.
  spotify  — Spotify Web API client-credentials flow. Requires env vars:
               SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
  youtube  — YouTube Data API v3. Requires env var:
               YOUTUBE_API_KEY

Idempotent: skips a sub-field that already has a non-empty value unless --force.
Partial enrichment runs compose correctly (each service writes its own subkey).

Usage:
    cd scripts/python
    source .venv/bin/activate
    python enrich_listen_links.py [--limit N] [--force] [--artist <slug>]
"""

import argparse
import base64
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import db, itunes  # noqa: E402

# ---------------------------------------------------------------------------
# Bandcamp
# ---------------------------------------------------------------------------

BANDCAMP_TIMEOUT = 5


def _bandcamp_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def find_bandcamp_url(artist_name: str) -> str | None:
    """Probe https://{slug}.bandcamp.com/ with a HEAD request.

    Returns the URL on HTTP 200, None otherwise (404 / timeout / redirect to
    generic bandcamp.com homepage).
    """
    slug = _bandcamp_slug(artist_name)
    if not slug:
        return None
    url = f"https://{slug}.bandcamp.com/"
    try:
        r = requests.head(url, timeout=BANDCAMP_TIMEOUT, allow_redirects=True)
    except requests.exceptions.RequestException:
        return None
    # A redirect to bandcamp.com root (or any bandcamp.com page without the
    # slug in the path) means the subdomain doesn't exist.
    final = r.url.rstrip("/")
    if r.status_code == 200 and slug in final:
        return url
    return None


# ---------------------------------------------------------------------------
# Spotify
# ---------------------------------------------------------------------------

_spotify_token: str | None = None
_spotify_token_expiry: float = 0.0


def _spotify_access_token() -> str | None:
    global _spotify_token, _spotify_token_expiry
    client_id = os.environ.get("SPOTIFY_CLIENT_ID")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None

    if _spotify_token and time.time() < _spotify_token_expiry - 30:
        return _spotify_token

    creds = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    try:
        r = requests.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            headers={"Authorization": f"Basic {creds}"},
            timeout=15,
        )
        r.raise_for_status()
    except Exception as e:
        print(f"    ! spotify token error: {e}", flush=True)
        return None
    data = r.json()
    _spotify_token = data.get("access_token")
    _spotify_token_expiry = time.time() + data.get("expires_in", 3600)
    return _spotify_token


def find_spotify_url(artist_name: str) -> str | None:
    token = _spotify_access_token()
    if not token:
        return None
    try:
        r = requests.get(
            "https://api.spotify.com/v1/search",
            params={"q": artist_name, "type": "artist", "limit": 1},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        r.raise_for_status()
    except Exception as e:
        print(f"    ! spotify search error: {e}", flush=True)
        return None
    items: list[dict[str, Any]] = (
        r.json().get("artists", {}).get("items") or []
    )
    if not items:
        return None
    return items[0].get("external_urls", {}).get("spotify")


# ---------------------------------------------------------------------------
# YouTube
# ---------------------------------------------------------------------------


def find_youtube_url(artist_name: str) -> str | None:
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        return None
    try:
        r = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "q": artist_name,
                "type": "channel",
                "part": "snippet",
                "maxResults": 1,
                "key": api_key,
            },
            timeout=15,
        )
        r.raise_for_status()
    except Exception as e:
        print(f"    ! youtube search error: {e}", flush=True)
        return None
    items: list[dict[str, Any]] = r.json().get("items") or []
    if not items:
        return None
    channel_id = items[0].get("id", {}).get("channelId")
    if not channel_id:
        return None
    return f"https://www.youtube.com/channel/{channel_id}"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=0, help="Stop after N artist updates (0 = no limit)")
    ap.add_argument("--force", action="store_true", help="Re-enrich even if a listen field is already set")
    ap.add_argument("--artist", help="Only process this artist slug")
    args = ap.parse_args()

    has_spotify = bool(os.environ.get("SPOTIFY_CLIENT_ID") and os.environ.get("SPOTIFY_CLIENT_SECRET"))
    has_youtube = bool(os.environ.get("YOUTUBE_API_KEY"))
    print(f"Services: apple=yes  bandcamp=yes  spotify={'yes' if has_spotify else 'no (set SPOTIFY_CLIENT_ID/SECRET)'}  youtube={'yes' if has_youtube else 'no (set YOUTUBE_API_KEY)'}", flush=True)
    print(flush=True)

    coll = db.artists()
    query: dict[str, Any] = {}
    if args.artist:
        query["slug"] = args.artist

    artist_updates = 0
    field_updates: dict[str, int] = {"apple": 0, "bandcamp": 0, "spotify": 0, "youtube": 0}

    for artist in coll.find(query):
        name: str = artist["name"]
        listen: dict[str, str] = artist.get("listen") or {}
        print(f"  {name}", flush=True)

        service_sets: dict[str, str] = {}

        # --- Apple Music ---
        if args.force or not listen.get("apple"):
            try:
                url, _ = itunes.find_artist_url(name)
            except Exception as e:
                print(f"    ! itunes error: {e}", flush=True)
                url = None
            if url:
                service_sets["apple"] = url
                print(f"    apple  ✓ {url}", flush=True)
            else:
                print("    apple  · no match", flush=True)
            itunes.sleep()
        else:
            print(f"    apple  ~ already set", flush=True)

        # --- Bandcamp ---
        if args.force or not listen.get("bandcamp"):
            url = find_bandcamp_url(name)
            if url:
                service_sets["bandcamp"] = url
                print(f"    bandcamp ✓ {url}", flush=True)
            else:
                print("    bandcamp · no match", flush=True)
        else:
            print(f"    bandcamp ~ already set", flush=True)

        # --- Spotify ---
        if has_spotify and (args.force or not listen.get("spotify")):
            url = find_spotify_url(name)
            if url:
                service_sets["spotify"] = url
                print(f"    spotify  ✓ {url}", flush=True)
            else:
                print("    spotify  · no match", flush=True)

        # --- YouTube ---
        if has_youtube and (args.force or not listen.get("youtube")):
            url = find_youtube_url(name)
            if url:
                service_sets["youtube"] = url
                print(f"    youtube  ✓ {url}", flush=True)
            else:
                print("    youtube  · no match", flush=True)

        # Write each service sub-field independently so partial runs compose.
        for service, service_url in service_sets.items():
            coll.update_one(
                {"_id": artist["_id"]},
                {"$set": {f"listen.{service}": service_url}},
            )
            field_updates[service] += 1

        if service_sets:
            artist_updates += 1

        if args.limit and artist_updates >= args.limit:
            print(f"\nLimit reached ({args.limit}). Stopping.", flush=True)
            break

    _summary(field_updates)
    return 0


def _summary(field_updates: dict[str, int]) -> None:
    print("\nDone.", flush=True)
    for service, count in field_updates.items():
        print(f"  {service:10s} {count:4d} new URLs written", flush=True)


if __name__ == "__main__":
    sys.exit(main())
