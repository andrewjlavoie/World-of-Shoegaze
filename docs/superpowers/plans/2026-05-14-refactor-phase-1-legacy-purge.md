# Refactor Phase 1 — Legacy purge

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.
> Strategy doc: `docs/superpowers/specs/2026-05-14-codebase-refactor-strategy.md`

**Goal:** Delete vestigial code from the pre-Atlas era — Supabase scaffolding, the `Band`-typed half of `lib/helpers.ts`, dead CSS classes from the old Feed toolbar, unused re-exports, and stale README/comments. Pure deletion. Zero behavior change.

**Architecture:** No new code. The criterion for every deletion is *"verified zero importers in the live app (`app/` + `components/` excluding `_legacy/`)"*. Tests, build, and browser smoke must remain green.

**Tech Stack:** No new dependencies. Removes 2.

---

## File structure

| Action | Path |
|---|---|
| Delete | `lib/supabase.ts` |
| Delete | `supabase/migrations/0001_init.sql` (and `supabase/` if empty) |
| Delete | `components/AlbumArt.tsx` |
| Modify | `lib/helpers.ts` (remove Band-typed exports) |
| Modify | `lib/types.ts` (remove `Band`, `Discography`, `Palette`) |
| Modify | `lib/mood-families.ts` (remove `subMoodCentroid` export) |
| Modify | `lib/graph-layout.ts` (remove `FALLBACK_FAMILY` re-export + unused import) |
| Modify | `components/views/FeedToolbar.tsx` (remove `FilterState` re-export) |
| Modify | `app/globals.css` (delete dead `.feed-toolbar*` and `.wos-timeline-grid` blocks) |
| Modify | `package.json` (remove supabase deps) |
| Modify | `README.md` (rewrite — strip references to removed routes + Supabase) |
| Modify | Stale comments in `BandDetail.tsx`, `SiteNav.tsx`, `lib/feed-filters.ts`, `lib/atlas-similarity.ts` |

---

## Task 1 — Delete Supabase

**Files:** `lib/supabase.ts`, `supabase/`, `package.json`

- [ ] **Step 1: Verify zero importers**

```bash
grep -rn "from.*supabase" app components lib --include="*.ts" --include="*.tsx" | grep -v "lib/supabase.ts"
```

Expected: empty output. If anything appears, **stop and escalate** — do not delete.

- [ ] **Step 2: Delete files**

```bash
rm lib/supabase.ts
rm -rf supabase/
```

- [ ] **Step 3: Remove dependencies from `package.json`**

Open `package.json`. Remove these lines from `"dependencies"`:

```json
"@supabase/ssr": "...",
"@supabase/supabase-js": "..."
```

- [ ] **Step 4: Reinstall to update lockfile**

```bash
npm install
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -3
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase.ts supabase/ package.json package-lock.json
git commit -m "$(cat <<'EOF'
Refactor: delete Supabase scaffolding

lib/supabase.ts had zero importers — Atlas migration is complete and
@supabase/ssr was only ever used by the dead file. Removes both
supabase packages and the supabase/migrations folder.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Delete `components/AlbumArt.tsx`

**Files:** `components/AlbumArt.tsx`

- [ ] **Step 1: Verify zero live importers**

```bash
grep -rn "AlbumArt" app components lib --include="*.ts" --include="*.tsx"
```

Expected: matches only inside `_legacy/` (if any). No live `app/` or `components/` matches.

- [ ] **Step 2: Delete file**

```bash
rm components/AlbumArt.tsx
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add components/AlbumArt.tsx
git commit -m "$(cat <<'EOF'
Refactor: delete unused AlbumArt component

components/AlbumArt.tsx consumed the legacy Band shape and had no
imports outside _legacy/. The four live album-art renderers (Feed,
Timeline, BandDetail, Graph) inline their own minimal markup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Prune Band-typed half of `lib/helpers.ts` + `lib/types.ts`

**Files:** `lib/helpers.ts`, `lib/types.ts`

- [ ] **Step 1: Verify which `lib/helpers.ts` exports have live callers**

```bash
for fn in eraLabel slugify bandHue bandPalette computeSimilarity similarBands eraRange mockDiscography findBand; do
  hits=$(grep -rn "\\b$fn\\b" app components lib --include="*.ts" --include="*.tsx" | grep -v "lib/helpers.ts" | wc -l)
  echo "$fn: $hits"
done
```

Expected: `eraLabel` and `slugify` have hits; the rest are zero.

If any of the "expected zero" functions show hits, **stop and escalate** with the file:line so we can update the consumer instead of deleting.

- [ ] **Step 2: Rewrite `lib/helpers.ts`**

Replace the file contents with only the live exports:

```ts
import type { EraKey } from "./types";

const ERA_LABELS: Record<EraKey, string> = {
  proto: "Proto",
  first_wave: "First Wave",
  transitional: "Transitional",
  nu_gaze: "Nu-Gaze",
  current: "Current",
};

export function eraLabel(key: string): string {
  return ERA_LABELS[key as EraKey] ?? key;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
```

(Verify by reading the current `lib/helpers.ts` — if `eraLabel`'s actual implementation differs, **preserve the existing implementation** verbatim. Only delete the dead exports; do not rewrite the live ones.)

- [ ] **Step 3: Remove `Band`, `Discography`, `Palette` from `lib/types.ts`**

Read the file first. Identify the three type/interface declarations and delete only them. **Keep:** `EraKey`, `Tone`, `Density`, `Motion`, `Settings`, `MoodColor`, `Era` (these are live).

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm test && npm run build 2>&1 | tail -3
```

If TypeScript reports an unused import of the deleted types anywhere, follow the error to the import line and remove it.

- [ ] **Step 5: Commit**

```bash
git add lib/helpers.ts lib/types.ts
git commit -m "$(cat <<'EOF'
Refactor: drop Band-typed half of lib/helpers.ts

bandHue, bandPalette, computeSimilarity, similarBands, eraRange,
mockDiscography, findBand have no live callers — lib/atlas-similarity
already supersedes the similarity functions and the rest were tied to
the pre-Atlas Band shape. Also drop Band, Discography, Palette types.

eraLabel and slugify (the only live exports) remain.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Delete unused re-exports

**Files:** `lib/mood-families.ts`, `lib/graph-layout.ts`, `components/views/FeedToolbar.tsx`

- [ ] **Step 1: Verify each is truly unused**

```bash
grep -rn "subMoodCentroid" app components lib --include="*.ts" --include="*.tsx" | grep -v "lib/mood-families.ts"
grep -rn "FALLBACK_FAMILY" app components lib --include="*.ts" --include="*.tsx" | grep -v "lib/graph-layout.ts"
grep -rn "FilterState.*from.*FeedToolbar\\|FeedToolbar.*FilterState" app components --include="*.ts" --include="*.tsx"
```

Expected: all three empty.

- [ ] **Step 2: Edit `lib/mood-families.ts`**

Remove the `subMoodCentroid` export and any helper code only it used. Run tests after to confirm nothing in `lib/mood-families.test.ts` referenced it (if a test does, **leave the function** — tested code is not "dead").

- [ ] **Step 3: Edit `lib/graph-layout.ts`**

Remove the `export { FALLBACK_FAMILY }` re-export and its banner comment. If `FALLBACK_FAMILY` is also imported but unused inside the file, remove that import line too.

- [ ] **Step 4: Edit `components/views/FeedToolbar.tsx`**

Remove these lines at the bottom:

```ts
// Re-export FilterState so consumers can import from here too if convenient.
export type { FilterState };
```

Also remove `FilterState` from the import statement at the top if it's only used for the re-export.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && npm test && npm run build 2>&1 | tail -3
```

- [ ] **Step 6: Commit**

```bash
git add lib/mood-families.ts lib/graph-layout.ts components/views/FeedToolbar.tsx
git commit -m "$(cat <<'EOF'
Refactor: drop dead re-exports

subMoodCentroid was re-implemented inline in graph-layout.ts;
FALLBACK_FAMILY was exported "for any UI consumer that wants to
know" but no UI consumer materialized; FilterState was re-exported
from FeedToolbar "for convenience" with zero actual users.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Delete dead CSS

**Files:** `app/globals.css`

- [ ] **Step 1: Verify each class is orphaned**

```bash
for cls in feed-toolbar feed-toolbar-row feed-eras feed-sort wos-timeline-grid; do
  hits=$(grep -rn "\\\"[^\\\"]*\\b$cls\\b" components app --include="*.tsx" | grep -v "feed-toolbar2" | wc -l)
  echo "$cls: $hits"
done
```

Expected: every count is `0`.

- [ ] **Step 2: Read `app/globals.css` around lines 248-256, 384, 492-495, 504**

Identify and delete:
- The `.feed-toolbar`, `.feed-toolbar-row`, `.feed-eras`, `.feed-sort`, `.feed-sort .btn` block (~line 248-256)
- The `.wos-timeline-grid` rule (~line 384)
- Any `@media` overrides for those classes (~line 492-495, 504)

Be precise — only delete the verified-orphan rules. Leave everything else untouched.

- [ ] **Step 3: Verify**

```bash
npm run build 2>&1 | tail -3
```

Then in a browser at `http://localhost:3000/`, confirm the feed view still looks right.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
Refactor: drop dead CSS classes

.feed-toolbar*, .feed-eras, .feed-sort were the v1 toolbar styles —
superseded by .feed-toolbar2* in the recent feed-filters refactor and
verified to have zero TSX consumers. .wos-timeline-grid was an orphan
from the timeline restructure.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Strip stale comments

**Files:** `components/views/BandDetail.tsx`, `components/SiteNav.tsx`, `lib/feed-filters.ts`, `lib/atlas-similarity.ts`

- [ ] **Step 1: Edits**

- `components/views/BandDetail.tsx:222` — delete the hardcoded "last revised: 13.05.2026" string (or compute it from build time / git later — for now just remove).
- `components/SiteNav.tsx:54` — delete the `v0.1 · 11.05.2026` text or replace with a less time-sensitive marker.
- `lib/feed-filters.ts:1-4` — delete or update the file header. The parenthetical "and dimensionCounts (next task) consume it" is stale because the task is done.
- `lib/atlas-similarity.ts:2` — delete the "Mirrors lib/helpers.ts#computeSimilarity" comment (the helper is gone after Task 3).

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add components/views/BandDetail.tsx components/SiteNav.tsx lib/feed-filters.ts lib/atlas-similarity.ts
git commit -m "$(cat <<'EOF'
Refactor: strip stale comments / dates

Hardcoded "last revised" / version dates rot fast and provide no
runtime value. File header references to the now-removed
helpers.ts#computeSimilarity and the "next task" feed-filters comment
are obsolete.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Rewrite README

**Files:** `README.md`

- [ ] **Step 1: Read current `README.md`**

- [ ] **Step 2: Rewrite to match current state**

Targeted edits (do not full-rewrite — keep structure and tone):
- Remove every reference to `/globe`, `/tonight`, `/drift`, `Drift mode`, the Esc-to-leave-Drift hint
- Remove the Supabase migration recipe (`README.md:86` area)
- Confirm the "Routes" section lists exactly: `/`, `/graph`, `/timeline`, `/random`, `/band/[slug]`
- Confirm the "Data" section describes MongoDB Atlas (not Supabase)
- Update any "Next steps" / "Roadmap" that mentions removed features

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
Docs: README matches current routes + data layer

Strips stale references to /globe, /tonight, /drift (deleted views)
and the Supabase migration recipe (data layer is MongoDB Atlas now).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Final verify + push

- [ ] **Step 1: Full check**

```bash
npx tsc --noEmit && npm test && npm run build 2>&1 | tail -10
```

Expected: clean. All 38 tests pass. Build succeeds with same route table as before.

- [ ] **Step 2: Browser smoke**

```bash
PID=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oP 'pid=\K\d+'); [ -n "$PID" ] && kill "$PID" && sleep 1
nohup npm start -- -H 0.0.0.0 -p 3000 > /tmp/wos-prod.log 2>&1 &
until grep -q "Ready in" /tmp/wos-prod.log 2>/dev/null; do sleep 1; done
for r in "/" "/graph" "/timeline" "/random" "/band/slowdive"; do
  echo "${r} → $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000${r})"
done
```

Expected: every route 200 (or 307 for `/random`).

Open `/` in a browser — feed renders, filters work, no visual regression.

- [ ] **Step 3: Push**

```bash
git push origin main 2>&1 | tail -3
```

---

## Acceptance

- ~7 commits landed on `main`
- `lib/supabase.ts`, `supabase/`, `components/AlbumArt.tsx` gone
- `package.json` no longer lists `@supabase/*` dependencies
- `lib/helpers.ts` ≤ 20 lines (only `eraLabel` + `slugify`)
- `lib/types.ts` no longer has `Band`/`Discography`/`Palette`
- `app/globals.css` shrunk (no `.feed-toolbar*` v1 rules, no `.wos-timeline-grid`)
- All tests pass; build clean; routes return 200; visual no regression
- README accurately describes current routes + Atlas data layer
