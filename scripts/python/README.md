# Enrichment scripts

Programmatic data-entry over the `artists` collection in MongoDB Atlas.
Each script iterates artists (or their albums) and fills in missing fields by
hitting public APIs (Discogs, Wikipedia, etc).

All scripts are **idempotent** — they skip docs that already have the target
field. Use `--force` to re-enrich everything.

## Setup (once)

```bash
cd scripts/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: paste MONGODB_URI from the Next.js .env.local
# optionally register a Discogs token at discogs.com/settings/developers
```

## Scripts

### `enrich_album_art.py`

Fills `discography[].art.url` for every album. Hits the Discogs master-release
search; stores the first hit's cover image URL. With a Discogs token: ~60
calls/min. Without: ~25/min.

```bash
python enrich_album_art.py                 # all artists, all albums
python enrich_album_art.py --limit 20      # stop after 20 updates (for dry test)
python enrich_album_art.py --artist slowdive   # one artist
python enrich_album_art.py --force         # overwrite even already-populated art
```

### `enrich_band_photos.py`

Fills `photo.url` for each artist. Tries Wikipedia first (CC-licensed images,
real promo photos), falls back to Discogs's artist image.

```bash
python enrich_band_photos.py
python enrich_band_photos.py --artist slowdive
```

## Adding a new enrichment script

1. Drop a new `enrich_*.py` into this directory.
2. Use `from lib import db` for the Atlas connection.
3. Always check before writing (`if not args.force and existing_value: continue`).
4. Always rate-limit external calls.
5. Make it work on `--artist <slug>` for one-band testing.

## Notes

- The `cover_image` URLs returned by Discogs point to their CDN. They're hot-linkable
  but if you want long-term stability, run a separate `upload_to_r2.py` pass that
  downloads each URL and re-hosts in your own bucket.
- Wikipedia images are Commons-licensed — credit is required. The script writes
  `credit: "via Wikipedia"` but ideally we'd extract the photographer's name from
  the file metadata. TODO if/when needed.
- The matching is fuzzy. After a run, spot-check ~20 random artists in MongoDB
  Compass and adjust any obviously-wrong matches by hand. The schema makes manual
  edits easy.
