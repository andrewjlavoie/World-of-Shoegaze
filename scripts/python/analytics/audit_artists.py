#!/usr/bin/env python3
"""Print fill-state of every artist doc in Atlas.

For each artist, mark which of (photo, album art, bandcamp, apple, spotify,
youtube) are populated. End with per-field coverage + a missing-items list
the curator can attack one field at a time.

Usage:
    cd scripts/python
    source .venv/bin/activate
    python -m analytics.audit_artists
    python -m analytics.audit_artists --summary
    python -m analytics.audit_artists --missing photo
"""

import argparse
import sys
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lib import db  # noqa: E402


# (machine-readable key, table header, predicate over artist doc)
FIELDS: list[tuple[str, str, Callable[[dict[str, Any]], bool]]] = [
    ("photo",    "PHOTO", lambda a: bool((a.get("photo") or {}).get("url"))),
    ("art",      "ART",   lambda a: any(
        (d.get("art") or {}).get("url") for d in a.get("discography", [])
    )),
    ("bandcamp", "BC",    lambda a: bool((a.get("listen") or {}).get("bandcamp"))),
    ("apple",    "APPLE", lambda a: bool((a.get("listen") or {}).get("apple"))),
    ("spotify",  "SPOT",  lambda a: bool((a.get("listen") or {}).get("spotify"))),
    ("youtube",  "YT",    lambda a: bool((a.get("listen") or {}).get("youtube"))),
]

FIELD_KEYS = {key for key, _, _ in FIELDS}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--summary", action="store_true", help="Skip per-artist rows; show only coverage + misses")
    ap.add_argument("--missing", help=f"Print only names missing this field. One of: {', '.join(sorted(FIELD_KEYS))}")
    args = ap.parse_args()

    if args.missing and args.missing not in FIELD_KEYS:
        print(f"unknown field '{args.missing}'. choose one of: {', '.join(sorted(FIELD_KEYS))}", file=sys.stderr)
        return 2

    coll = db.artists()
    artists = list(coll.find({}, sort=[("name", 1)]))

    totals = {key: 0 for key, _, _ in FIELDS}
    missing: dict[str, list[str]] = {key: [] for key, _, _ in FIELDS}

    for a in artists:
        for key, _, check in FIELDS:
            if check(a):
                totals[key] += 1
            else:
                missing[key].append(a["name"])

    # --missing path: just dump the names, one per line, nothing else.
    if args.missing:
        for name in missing[args.missing]:
            print(name)
        return 0

    name_w = max(30, max((len(a["name"]) for a in artists), default=30) + 2)
    headers = "  ".join(f"{label:^5}" for _, label, _ in FIELDS)
    row_w = name_w + len(headers) + 2

    # Per-artist table
    if not args.summary:
        print(f"\n{'ARTIST':<{name_w}}  {headers}")
        print("-" * row_w)
        for a in artists:
            marks = []
            for _, _, check in FIELDS:
                marks.append(f"{'✓' if check(a) else '·':^5}")
            print(f"{a['name']:<{name_w}}  {'  '.join(marks)}")
        print("-" * row_w)

    # Coverage
    n = len(artists)
    print(f"\n  {n} artists total\n")
    for key, label, _ in FIELDS:
        pct = (totals[key] / n * 100) if n else 0
        bar = _bar(pct)
        print(f"  {label:<6}  {totals[key]:>3}/{n}  {pct:5.1f}%  {bar}")

    # Missing breakdown
    any_misses = False
    for key, label, _ in FIELDS:
        miss = missing[key]
        if not miss:
            continue
        any_misses = True
        print(f"\n[ MISSING {label} — {len(miss)} ]")
        for name in miss:
            print(f"  · {name}")

    if not any_misses:
        print("\nNothing missing — every artist has every field populated.\n")

    return 0


def _bar(pct: float, width: int = 24) -> str:
    filled = round(pct / 100 * width)
    return "▰" * filled + "▱" * (width - filled)


if __name__ == "__main__":
    sys.exit(main())
