#!/usr/bin/env python3
"""Find album-art URLs for every album in every artist's discography.

Iterates `artists` in Atlas. For each album where `art.url` is unset, searches
Discogs for `{artist name} {album title}` (master release) and writes the
top hit's `cover_image` URL into the document.

Idempotent: skips albums that already have art. Safe to re-run.

Usage:
    cd scripts/python
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env   # then fill MONGODB_URI + DISCOGS_TOKEN
    python enrich_album_art.py [--limit N] [--force]
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import db, discogs  # noqa: E402


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

            label = f"  {artist['name']} — {album['title']} ({album['year']})"
            print(label, flush=True)

            try:
                cover, source = discogs.find_album_cover(artist["name"], album["title"])
            except Exception as e:
                print(f"    ! discogs error: {e}", flush=True)
                discogs.sleep(extra=2)
                continue

            if not cover:
                print("    · no match", flush=True)
                misses += 1
                discogs.sleep()
                continue

            coll.update_one(
                {"_id": artist["_id"]},
                {"$set": {f"discography.{i}.art": {
                    "url": cover,
                    "credit": "via Discogs",
                    **({"source": source} if source else {}),
                }}},
            )
            print(f"    ✓ {cover}", flush=True)
            updates += 1
            discogs.sleep()

            if args.limit and updates >= args.limit:
                print(f"\nLimit reached ({args.limit}). Stopping.")
                _summary(updates, misses)
                return 0

    _summary(updates, misses)
    return 0


def _summary(updates: int, misses: int) -> None:
    print(f"\nDone. updated={updates}  no_match={misses}")


if __name__ == "__main__":
    sys.exit(main())
