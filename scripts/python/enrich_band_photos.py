#!/usr/bin/env python3
"""Find a band/artist photo for every artist that doesn't have one yet.

Strategy:
  1. Wikipedia REST API — fetch /page/summary/{title}. Most established bands
     have a Wikipedia page with `originalimage.source` (CC-licensed lead image).
  2. Fallback to Discogs artist image (lower quality but better than nothing).

Idempotent. Safe to re-run.

Usage:
    cd scripts/python
    source .venv/bin/activate
    python enrich_band_photos.py [--limit N] [--force] [--artist <slug>]
"""

import argparse
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import db, discogs  # noqa: E402

WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"
WIKIPEDIA_UA = "WorldOfShoegaze/0.1 (+https://github.com/andrewjlavoie/World-of-Shoegaze)"


def wikipedia_image(title: str) -> tuple[str | None, str | None]:
    """Returns (image_url, page_url) or (None, None)."""
    url = WIKIPEDIA_API + quote(title)
    try:
        r = requests.get(url, headers={"User-Agent": WIKIPEDIA_UA}, timeout=15)
    except Exception as e:
        print(f"    ! wikipedia error: {e}", flush=True)
        return None, None
    if r.status_code == 404:
        return None, None
    if r.status_code != 200:
        print(f"    ! wikipedia http {r.status_code}", flush=True)
        return None, None
    data: dict[str, Any] = r.json()
    if data.get("type") == "disambiguation":
        return None, None
    img = (data.get("originalimage") or {}).get("source") or (
        data.get("thumbnail") or {}
    ).get("source")
    page = (data.get("content_urls") or {}).get("desktop", {}).get("page")
    return img, page


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--artist", help="Only process this slug")
    args = ap.parse_args()

    coll = db.artists()
    query: dict[str, Any] = {}
    if args.artist:
        query["slug"] = args.artist

    updates = 0
    misses = 0
    for artist in coll.find(query):
        if not args.force and (artist.get("photo") or {}).get("url"):
            continue

        print(f"  {artist['name']}", flush=True)

        # Try Wikipedia first (real photos, CC-licensed).
        img, page = wikipedia_image(artist["name"])
        time.sleep(0.6)
        credit = "via Wikipedia"

        # Fallback: Discogs artist image.
        if not img:
            try:
                img, page = discogs.find_artist_image(artist["name"])
                credit = "via Discogs"
            except Exception as e:
                print(f"    ! discogs error: {e}", flush=True)
            discogs.sleep()

        if not img:
            print("    · no photo found", flush=True)
            misses += 1
            continue

        coll.update_one(
            {"_id": artist["_id"]},
            {"$set": {"photo": {
                "url": img,
                "alt": f"{artist['name']} promo photo",
                "credit": credit,
                **({"source": page} if page else {}),
            }}},
        )
        print(f"    ✓ {img}", flush=True)
        updates += 1

        if args.limit and updates >= args.limit:
            print(f"\nLimit reached ({args.limit}). Stopping.")
            break

    print(f"\nDone. updated={updates}  no_match={misses}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
