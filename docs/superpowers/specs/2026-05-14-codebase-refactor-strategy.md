# Codebase refactor strategy

Synthesizes findings from a 4-agent parallel audit (architecture, code quality, test/QA, frontend/CSS) of /home/andrew/Code/projects/world_of_shoegaze. All four investigations converged on the same set of issues, which is a strong signal they're real.

## Codebase as it actually is

- **Page-as-loader, view-as-everything** — every `app/*/page.tsx` is a tiny Server Component that fetches via `lib/atlas-queries` and hands an `AtlasArtist[]` to a single Client Component in `components/views/`. Consistent and clean.
- **Two-layer lib** — pure utilities (`feed-filters`, `mood-families`, `graph-layout`, `atlas-similarity`, `helpers`) plus a thin Mongo data layer (`db.ts` + `atlas-queries.ts`, gated by `import "server-only"`). The pure layer is React-free and well-tested.
- **Single canonical type** — `AtlasArtist` (`lib/atlas-types.ts:32`) consistently used; `_id` stripped at the boundary.
- **Three legacy strata coexist** — `_legacy/*.jsx` (original mockup, archived), pre-Atlas `lib/data.ts` + `lib/types.ts` (in-memory dataset, half-vestigial), and the current Atlas-backed app. Atlas migration is functionally complete; the cleanup never happened.
- **One CSS file (1,160 lines)** — `app/globals.css` has grown organically across 5+ pivots. Reasonably section-banner'd at high level, but has dead classes, duplicate toolbar generations, and ~15 hardcoded color/overlay values that should be tokens.
- **Zero CI, zero ESLint config, no schema validation, no error boundaries.** Vercel auto-deploys every commit to `main` with no quality gate. `npm run build` does not run `tsc`.

## Top issues (convergent across audits)

### Dead weight (deletion, no behavior change)

| Item | File(s) | Confidence |
|---|---|---|
| `@supabase/ssr` + `@supabase/supabase-js` + `lib/supabase.ts` + `supabase/migrations/` | `package.json:16-17`, `lib/supabase.ts`, `supabase/` | Verified — zero importers in `app/` or `components/` |
| `components/AlbumArt.tsx` | (whole file) | Verified — only `_legacy/*.jsx` references it |
| Band-typed half of `lib/helpers.ts` | `bandHue`, `bandPalette`, `computeSimilarity`, `similarBands`, `eraRange`, `mockDiscography`, `findBand` | Verified — `lib/atlas-similarity.ts` already supersedes |
| `Band`, `Discography`, `Palette` in `lib/types.ts` | (after above) | Verified |
| Old toolbar v1 CSS | `app/globals.css:248-256` plus mobile overrides at `:492-495, 504` | Verified — `FeedToolbar` uses `.feed-toolbar2*` exclusively |
| `.wos-timeline-grid` | `app/globals.css:384` | Verified orphan |
| `subMoodCentroid` re-export | `lib/mood-families.ts:149` | Verified — `graph-layout.ts` re-implements inline instead |
| `FALLBACK_FAMILY` re-export | `lib/graph-layout.ts:102` | Verified orphan |
| `FilterState` re-export from `FeedToolbar.tsx:58` | "for convenience" — no consumer | Verified |
| README references to `/globe`, `/tonight`, `/drift`, Supabase | `README.md:31-93` | Verified — routes long deleted |
| Stale comments | `BandDetail.tsx:222` ("last revised"), `SiteNav.tsx:54` ("v0.1 · 11.05.2026"), `lib/feed-filters.ts:1-4` ("next task"), `lib/atlas-similarity.ts:2` ("Mirrors helpers.ts") | Verified |

### Duplication (consolidate to one canonical location)

| Pattern | Defined in | Canonical home |
|---|---|---|
| `refAlbum(artist)` | `feed-filters.ts:96`, `Feed.tsx:42`, `Timeline.tsx:9`, `BandDetail.tsx:19`, `Graph.tsx:25`, `GraphPanel.tsx:9` (with `??` vs `\|\|` drift) | new `lib/atlas-helpers.ts` |
| `paletteFor(moods)` | `Feed.tsx:33`, `BandDetail.tsx:10`, `Timeline.tsx:17`, `Graph.tsx:29`, `GraphPanel.tsx:13` | new `lib/atlas-helpers.ts` |
| `initials(name)` | `Feed.tsx:23`, `Timeline.tsx:23`, `Graph.tsx:34` | new `lib/atlas-helpers.ts` |
| `moodTag(label)` ≈ `slugify(s)` | `Feed.tsx:29`, `lib/helpers.ts:79` | one `slugify` |

### Quality gaps (everyone flagged, ordered by detection-value)

1. **No runtime validation at the Mongo boundary** (`lib/atlas-queries.ts:21-30`). Bad doc → silent crash in `refAlbum().title`. Add zod parse + drop/warn on malformed.
2. **`npm run build` does not run `tsc`** — `package.json:7` is `"next build"`. Type errors ship to prod.
3. **No ESLint config** — `next lint` runs base mode only. `react-hooks/exhaustive-deps` is silent. The 6 inline `eslint-disable @next/next/no-img-element` comments are evidence — that's the *only* active rule, and it's being suppressed.
4. **No CI** — `.github/workflows/` empty. Every commit auto-deploys with zero gates.
5. **No `error.tsx` or `not-found.tsx`** — `band/[slug]` calls `notFound()`, falls through to default Next.js error UI.
6. **No pre-commit hook** — nothing runs before commit lands.
7. **`lib/db.ts:6`** throws at module import time on missing `MONGODB_URI` — preview deploys lacking the env var fail with cryptic errors instead of graceful degradation.
8. **`tsconfig.json` lacks `noUncheckedIndexedAccess`** — relevant given the Mongo boundary.

### Architectural opportunities (medium effort, real wins)

- **Split `lib/data.ts`** — extract `MOOD_COLORS`, `ERAS`, `ERA_ORDER` to `lib/taxonomy.ts` (the only live exports for the runtime app). Move `BANDS`, `RAW`, `DESC`, `BAND_MOODS`, `MOOD_TO_BANDS` next to `scripts/seed.ts` where they're actually used. Cuts ~180 lines from the client's dependency graph.
- **Convert `BandDetail` to a Server Component** — currently `"use client"` only for `router.push` on similar-band cards (`BandDetail.tsx:204`, swap for `<Link>`) and `useSettings()` re-render hack (unnecessary — Settings already updates CSS vars on `<body>`). Could halve JS shipped to `/band/*`.
- **Split `Graph.tsx` (339 lines)** — extract pan/zoom into `lib/use-pan-zoom.ts` (testable hook), tiles into `Graph/Tile.tsx`. View shrinks ~50%.
- **`SiteNav` inline → CSS class** — base nav styles are inline (`SiteNav.tsx:19-28`); mobile overrides at `globals.css:475-478` only work via `!important`. Move to `.wos-nav` rule, drop `!important`.

### Frontend / CSS specifics

- **Tokenize hardcoded colors** — `#fff8e8` appears 9 times, `rgba(8, 6, 12, 0.78)` (graph dark overlay) appears 6 times, `hsl(260, 55%, 38%)` is an inlined version of `--accent-2`. Add `--paper-warm` and `--gx-overlay`.
- **Use or remove `--gap-lg/md/sm`** — defined in `:root`, never consumed. All gaps are hardcoded px.
- **`--ink-faint` fails WCAG AA** — `#8a8275` on `#ebe5d6` ≈ 3.0:1 contrast at 10–11px (`.micro`, `.feed-handle-meta`, `.feed-active-count`). Terminal theme `#3d6a39` on `#0a0c08` ≈ 2.3:1.
- **Missing `<main>` landmark** in `app/layout.tsx`.
- **Graph buttons have no `:focus-visible`** — `.gx-page` is outside `.wos`, doesn't inherit the focus rule at `globals.css:228`.
- **Hover-stickiness gaps** — `.feed-menu:hover`, `.feed-act:hover`, `.feed-caption-name:hover`, `.wos a:hover` not wrapped in `@media (hover: hover)`. Will fire spuriously on iOS Safari after a tap.
- **6 `eslint-disable @next/next/no-img-element` comments** — Atlas covers are remote URLs. One `next.config.js` `remotePatterns` entry + `<Image>` migration removes all six.

## Phased plan (recommended sequencing)

Each phase is independently shippable. Lower numbers = lower risk + higher signal-to-effort.

### Phase 1 — Legacy purge (1 PR, ~30 min)

Pure deletion. No behavior change. Highest signal-to-effort ratio in the whole audit.

- Delete `lib/supabase.ts`, `supabase/migrations/`, both supabase packages from `package.json`
- Delete `components/AlbumArt.tsx`
- Delete Band-typed exports from `lib/helpers.ts` (`bandHue`, `bandPalette`, `computeSimilarity`, `similarBands`, `eraRange`, `mockDiscography`, `findBand`)
- Delete `Band`, `Discography`, `Palette` from `lib/types.ts`
- Delete dead CSS: `globals.css:248-256`, `:492-495, 504`, `:384`
- Delete unused re-exports: `subMoodCentroid` (mood-families), `FALLBACK_FAMILY` (graph-layout), `FilterState` from `FeedToolbar`
- Strip stale comments (BandDetail "last revised", SiteNav version, feed-filters "next task")
- Rewrite `README.md` to match current routes

**Verification:** `npm test && npx tsc --noEmit && npm run build` — all green; no behavior change in browser.

### Phase 2 — Helper consolidation (1 PR, ~45 min)

Create `lib/atlas-helpers.ts` exporting `refAlbum`, `paletteFor`, `initials`, `moodTag` (or fold the latter into `slugify`). Remove the 5+ duplicates across views. Resolves the `??` vs `||` drift in one place. Add a guard for empty `discography`.

**Verification:** `npm test && npm run build` + browser smoke — every view should render identically.

### Phase 3 — Quality gates (1 PR, ~1 hour)

The cheapest insurance available.

- Add `eslint.config.js` extending `next/core-web-vitals` + `@typescript-eslint/recommended`. Fix anything that surfaces; if too noisy, downgrade noisy rules to warn.
- Change `package.json` `"build"` to `"tsc --noEmit && next build"`.
- Add `noUncheckedIndexedAccess: true` to `tsconfig.json`. Fix the (probably few) call sites.
- Add `simple-git-hooks` pre-commit running `npm run typecheck && npm run lint && npm test`.
- Add `.github/workflows/ci.yml` running the same on PR + push.
- Add `.prettierrc` (even just `{}`).
- Add `.npmrc` with `engine-strict=true` if you want to pin Node.

**Verification:** Push the PR, watch CI go green; try to commit a deliberate type error and confirm pre-commit blocks.

### Phase 4 — Data layer hardening (1 PR, ~1 hour)

- Add zod (or valibot — lighter weight) schema for `AtlasArtist` + `AtlasAlbum`.
- Wrap `lib/atlas-queries.ts:stripId` in a parse step. Drop or warn on malformed docs.
- Replace `lib/db.ts:6` top-level throw with lazy validation at first call.
- Add `app/error.tsx` and `app/not-found.tsx`.
- Add a test for `lib/atlas-similarity.ts` (5 scoring branches, all pure).
- Add a test for `slugify` and any other live `lib/helpers.ts` exports.

**Verification:** Test suite grows; deliberately break a doc in Mongo and confirm the page doesn't crash.

### Phase 5 — CSS cleanup + a11y (1 PR, ~1 hour)

- Add `--paper-warm`, `--gx-overlay` tokens; replace 15+ hardcoded uses.
- Decide on `--gap-lg/md/sm` — adopt or delete.
- Move `SiteNav` base styles inline → `.wos-nav` CSS rule; remove `!important` from mobile overrides.
- Add `<main>` landmark in `app/layout.tsx`.
- Add `:focus-visible` rule for `.gx-page` buttons.
- Wrap remaining `:hover` styles in `@media (hover: hover)`.
- Bump `--ink-faint` toward WCAG AA — propose `#6e6757` for default theme, `#5e9059` for terminal.
- Reorganize `globals.css` with a top-of-file table of contents (no module split — overhead not worth it at this size).

**Verification:** Browser smoke desktop + mobile + terminal theme; Lighthouse a11y score before/after.

### Phase 6 — Optional bigger refactors

Defer until justified by need.

- Split `lib/data.ts` → `lib/taxonomy.ts` + `scripts/seed-data.ts`.
- Split `Graph.tsx` → `lib/use-pan-zoom.ts` + `Graph/index.tsx` + `Graph/Tile.tsx`.
- Convert `BandDetail` to a Server Component.
- Migrate remote `<img>` → Next `<Image>` with `remotePatterns` config; remove 6 eslint-disables.

## Recommendation

Run **Phases 1–5 in order**, one PR each, all probably one focused work session. Phase 6 only when you next touch those files for an actual feature.

Dollar-value ranking if you can only do one: **Phase 3 (quality gates)** — it's the only one that prevents future regressions. Phase 1 is the most satisfying (–500 LOC of weight), but it's a one-time win. Phase 3 keeps paying.

## Files central to this refactor

- `lib/atlas-queries.ts`, `lib/db.ts`, `lib/atlas-types.ts` (data boundary)
- `lib/data.ts`, `lib/types.ts`, `lib/helpers.ts` (legacy stratum to prune)
- `lib/supabase.ts`, `components/AlbumArt.tsx`, `supabase/` (delete entirely)
- `components/views/Feed.tsx`, `Graph.tsx`, `Timeline.tsx`, `BandDetail.tsx`, `GraphPanel.tsx` (consume `atlas-helpers`)
- `app/globals.css` (CSS surgery)
- `app/layout.tsx`, `app/error.tsx` (new), `app/not-found.tsx` (new)
- `package.json`, `tsconfig.json`, `eslint.config.js` (new), `.github/workflows/ci.yml` (new)
- `README.md` (rewrite)
