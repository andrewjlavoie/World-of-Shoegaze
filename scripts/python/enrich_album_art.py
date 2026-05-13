#!/usr/bin/env python3
"""Find album-art URLs for every album in every artist's discography.

Primary source: iTunes Search API (free, no auth, returns Apple Music CDN URLs).
Fallback: Discogs (requires DISCOGS_TOKEN in .env; without one, Discogs returns
empty `cover_image` fields and we skip it).

Idempotent: skips albums that already have `art.url`. Safe to re-run.

Usage:
    cd scripts/python
    source .venv/bin/activate
    python enrich_album_art.py [--limit N] [--force] [--artist <slug>]
"""

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import db, discogs, itunes, musicbrainz  # noqa: E402


def fetch_cover(artist: str, album: str):
    """iTunes → MusicBrainz/CAA → Discogs (if DISCOGS_TOKEN). First hit wins."""
    try:
        url, source = itunes.find_album_cover(artist, album)
        if url:
            return url, source, "via iTunes"
    except Exception as e:
        print(f"    ! itunes error: {e}", flush=True)

    try:
        url, source = musicbrainz.find_album_cover(artist, album)
        if url:
            return url, source, "via Cover Art Archive"
    except Exception as e:
        print(f"    ! musicbrainz error: {e}", flush=True)

    if os.environ.get("DISCOGS_TOKEN"):
        try:
            url, source = discogs.find_album_cover(artist, album)
            if url:
                return url, source, "via Discogs"
        except Exception as e:
            print(f"    ! discogs error: {e}", flush=True)

    return None, None, None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Stop after N updates (0 = no limit)")
    ap.add_argument("--force", action="store_true", help="Re-enrich albums even if art.url is already set")
    ap.add_argument("--artist", help="Only process this artist slug")
    args = ap.parse_args()

    coll = db.artists()
    query = {}
    if args.artist:
        query["slug"] = args.artist

    updates = 0
    misses = 0
    for artist in coll.find(query):
        for i, album in enumerate(artist.get("discography", [])):
            if not args.force and (album.get("art") or {}).get("url"):
                continue

            print(f"  {artist['name']} — {album['title']} ({album['year']})", flush=True)

            url, source, credit = fetch_cover(artist["name"], album["title"])
            if not url:
                print("    · no match", flush=True)
                misses += 1
                itunes.sleep()
                continue

            coll.update_one(
                {"_id": artist["_id"]},
                {"$set": {f"discography.{i}.art": {
                    "url": url,
                    "credit": credit,
                    **({"source": source} if source else {}),
                }}},
            )
            print(f"    ✓ {url}", flush=True)
            updates += 1
            itunes.sleep()

            if args.limit and updates >= args.limit:
                print(f"\nLimit reached ({args.limit}). Stopping.", flush=True)
                _summary(updates, misses)
                return 0

    _summary(updates, misses)
    return 0


def _summary(updates: int, misses: int) -> None:
    print(f"\nDone. updated={updates}  no_match={misses}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
