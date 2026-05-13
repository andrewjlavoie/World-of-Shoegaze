# Analytics scripts

**Read-only** reports against the Atlas `artists` collection. Anything that
mutates data belongs in `scripts/python/enrich_*.py` at the parent level —
this folder is exclusively for querying and printing.

Each script is self-contained, takes no required args, and prints to stdout.
Run from `scripts/python/` after activating the venv:

```bash
source .venv/bin/activate
python -m analytics.audit_artists
```

## Scripts

### `audit_artists.py`

Per-artist fill state across photo / album art / bandcamp / apple /
spotify / youtube, plus aggregate coverage and a list of missing items by
field. Use this to know exactly what's left for the manual curation pass.

```bash
python -m analytics.audit_artists                  # full table + summary
python -m analytics.audit_artists --missing photo  # just the names missing a photo
python -m analytics.audit_artists --summary        # skip per-artist rows
```
