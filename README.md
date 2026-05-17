# World of Shoegaze

> A hand-maintained atlas of shoegaze. No accounts, no tracking. A love letter, written slowly.

**Live:** https://world-of-shoegaze.vercel.app
**Status:** v1.0
**Catalog:** ~120 hand-curated artists with album art, band photos, and listen-on links across Bandcamp / Spotify / Apple Music / Tidal.

A static-feeling reading experience over a real document database. Four views — feed, graph, timeline, random — over the same artist data, each surfacing a different way to wander the genre.

---

## Table of contents

- [What it is](#what-it-is)
- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Routes](#routes)
- [Data layer](#data-layer)
- [Components](#components)
- [Theming system](#theming-system)
- [Image pipeline](#image-pipeline)
- [Quality gates](#quality-gates)
- [Testing](#testing)
- [Scripts](#scripts)
- [Enrichment (Python)](#enrichment-python)
- [Deployment](#deployment)
- [Local development](#local-development)
- [Project history](#project-history)

---

## What it is

A music discovery atlas built around the conviction that good catalogs are written by hand. Every artist entry is curated: era classification, mood tags, intensity rating, country, subgenre, a one-line description, a canonical "reference album", and listen-on links across the major services.

Four lenses on the same data:

| View | URL | Surface |
|---|---|---|
| **Feed** | `/` | Instagrammy poster grid with multi-dimensional filtering (era × mood × country × decade), faceted live counts, URL-persistent state |
| **Graph** | `/graph` | Force-directed map of "mood gardens" — bands cluster by their primary mood family; pan/zoom; click for details |
| **Timeline** | `/timeline` | Chronological grid 1984–present, hover for details |
| **Random** | `/random` | Server redirect to a random band — for the "what's next" instinct |
| **Band detail** | `/band/[slug]` | Full band file: hero image, album art, intensity meter, mood tags, listen links, sounds-like grid |

Design language: monospace newspaper meets dark warm ink. Two display fonts (JetBrains Mono + Instrument Serif) with a four-theme system (`ink` dark, `paper` light cream, `terminal` dark green, `magenta` dark purple).

---

## Tech stack

### Runtime
- **Next.js 16** — App Router, Server Components by default, ISR via `export const revalidate`, `<Image>` optimization
- **React 19** — Server Components + Client Component islands where needed
- **TypeScript 5.6** — `strict: true` + `noUncheckedIndexedAccess: true`
- **Node 22** — required for the built-in `node:test` runner

### Data
- **MongoDB Atlas** — single `artists` collection of embedded-discography artist documents
- **`mongodb` 7.x driver** — used directly, no ORM, wrapped via `lib/db.ts` with a `globalThis`-cached client (HMR-safe)
- **`zod` 4.x** — schema validation at the Mongo boundary (`lib/atlas-schema.ts`); bad docs get logged + dropped instead of crashing in render

### Visualization
- **`d3-force`** — drives the graph view layout (`lib/graph-layout.ts`); bands repel each other and attract toward their mood family centroid

### Fonts
- **`next/font`** loads two display fonts at build time, no external requests:
  - **JetBrains Mono** — body copy, labels, the "monospace newspaper" feel
  - **Instrument Serif** — italic display for headlines, the "love letter" feel

### Quality
- **ESLint 10** (flat config) — `next/core-web-vitals` + `@typescript-eslint/recommended` + `react-hooks/recommended`
- **Prettier 3** — formatting enforced via `format:check`
- **`simple-git-hooks`** — pre-commit runs `format:check && lint && tsc --noEmit && test`
- **GitHub Actions** — same gate on every push to `main` and every PR (`.github/workflows/ci.yml`)
- **`tsx`** — TypeScript runner that powers the `node:test` test suite

### Why no…
- **CSS framework** — the ink-and-paper aesthetic is intentional and bespoke; living in one `app/globals.css` with CSS variables for theming is simpler than fighting Tailwind's defaults
- **State manager** — URL search params + React local state cover everything; the Feed filters live entirely in `?era=&mood=...`
- **ORM** — 120 documents through 3 query functions doesn't need one
- **CSS Modules** — at this scale, the cognitive overhead of import-per-component outweighs the encapsulation benefit; section banners in `globals.css` do the job

---

## Project layout

```
app/                            # App Router pages (Server Components by default)
  page.tsx                      # / → Feed
  graph/page.tsx                # /graph
  timeline/page.tsx             # /timeline
  random/page.tsx               # /random → 307 to a random /band/[slug]
  band/[slug]/page.tsx          # /band/:slug → BandDetail (SSG via generateStaticParams)
  band/[slug]/not-found.tsx     # branded fallback for unknown slugs
  layout.tsx                    # root shell: SiteNav, Shelf (settings), <main>
  error.tsx                     # branded fallback for runtime errors
  not-found.tsx                 # branded fallback for unknown routes
  globals.css                   # the single source of styling truth (~1,200 LOC)

components/                     # shared layout components
  SettingsProvider.tsx          # tone / density / motion + localStorage
  Shelf.tsx                     # cogwheel-triggered settings panel
  SiteNav.tsx                   # top nav (feed / graph / timeline / random)
  views/                        # one view module per route
    Feed.tsx                    # the feed (client; reads useSearchParams)
    FeedToolbar.tsx             # search + filters button + sort
    FeedPanel.tsx               # 4-dimension filter panel (era/mood/country/decade)
    ActiveFilterStrip.tsx       # removable chips below toolbar
    Graph/
      index.tsx                 # graph view shell (~155 LOC)
      Tile.tsx                  # per-artist button on the graph canvas
    GraphPanel.tsx              # right-side detail panel on graph hover
    Timeline.tsx                # year-grid timeline
    BandDetail.tsx              # band detail page (Server Component since v1.0)

lib/                            # pure logic + data boundary
  atlas-types.ts                # AtlasArtist / AtlasAlbum / Image types
  atlas-schema.ts               # zod schema + parseArtists() helper
  atlas-queries.ts              # getArtists / getArtistBySlug / getAllSlugs (server-only)
  db.ts                         # MongoClient wrapper (lazy URI check, HMR-safe cache)
  atlas-helpers.ts              # refAlbum, paletteFor, initials, moodTag
  atlas-similarity.ts           # computeSimilarityAtlas, similarArtists
  feed-filters.ts               # FilterState, parseSearchParams, buildHref, applyFilters
  graph-layout.ts               # d3-force layout for the graph view
  use-pan-zoom.ts               # custom hook + pure math for graph pan/zoom
  mood-families.ts              # mood → family lookup (8 families across 21 sub-moods)
  taxonomy.ts                   # live MOOD_COLORS, ERAS, ERA_ORDER
  helpers.ts                    # eraLabel, slugify
  types.ts                      # Settings, Tone, Density, Motion, MoodColor, Era
  *.test.ts                     # node:test suites for every pure module

scripts/                        # one-shot tooling
  seed.ts                       # initial Atlas seed
  export-seed-json.ts           # dump seed data to JSON
  seed-data.ts                  # legacy in-memory dataset (only used by the two above)
  seed-data.json                # generated snapshot
  python/                       # enrichment scripts (see below)

docs/superpowers/               # plans + specs from the development process
  specs/                        # design docs (feed filters, graph, refactor strategy)
  plans/                        # implementation plans (one per feature/phase)

eslint.config.mjs               # flat config
next.config.js                  # devIndicators off, images.remotePatterns
tsconfig.json                   # strict + noUncheckedIndexedAccess
.prettierrc                     # 100-col, double-quote, trailing-comma:all
.github/workflows/ci.yml        # lint + tsc + test + format:check on push/PR
```

---

## Routes

| Route | Type | Notes |
|---|---|---|
| `/` | Server (ISR `revalidate=300`) | wraps Client Feed in `<Suspense>` (required for `useSearchParams`) |
| `/graph` | Server (ISR) | wraps Client Graph |
| `/timeline` | Server (ISR) | wraps Client Timeline |
| `/random` | Server (`force-dynamic`) | picks a slug at request time, returns 307 redirect |
| `/band/[slug]` | Server (SSG via `generateStaticParams` + ISR) | BandDetail is a Server Component since v1.0 (zero client JS on the route) |

Every route is gated on data validation: `lib/atlas-queries.ts` routes every Mongo doc through `artistSchema.safeParse` (zod). Malformed docs are logged with `console.warn` and dropped — a single bad row doesn't take down the homepage.

---

## Data layer

### Document shape

`AtlasArtist` (`lib/atlas-types.ts`) — embedded-discography artist:

```ts
{
  schemaVersion: 1,
  slug: "slowdive",
  name: "Slowdive",
  country: "UK",
  era: "first_wave",       // proto | first_wave | transitional | second_wave | current
  lat: 51.0, lng: -1.0,    // unused as coords; positional hint for future map view
  intensity: 4,            // 0–10
  subgenre: "shoegaze",
  desc: "Reading dream-pop architects.",
  moods: ["wistful_dreamers"],   // raw mood keys; first is primary
  discography: [
    { slug: "souvlaki", title: "Souvlaki", year: 1993, kind: "LP",
      isReference: true,         // exactly one per artist (by convention)
      art: { url, alt?, credit? } },
    // ...
  ],
  listen: { bandcamp?, spotify?, apple?, tidal? },
  photo: { url, alt?, credit? } | null,
}
```

### Boundary validation

`lib/atlas-schema.ts` defines `artistSchema` (zod) that mirrors the type with runtime checks:

- `discography: z.array(albumSchema).min(1)` — at least one album
- `intensity: z.number().int().min(0).max(10)`
- `era: z.enum(ERA_KEYS)` — only valid era keys
- `moods: z.array(z.string())` — strings (empty array tolerated; some artists have none)

`parseArtists(docs)` runs each doc through `.safeParse`, drops the invalid ones with a `console.warn`, returns the validated array. `lib/atlas-queries.ts` wires this into `getArtists` and `getArtistBySlug`.

### Connection

`lib/db.ts` exposes a `getCollection<T>(name)` helper. The `MongoClient` is cached on `globalThis` to survive Next.js HMR. The `MONGODB_URI` check is **lazy** — no top-level throw — so preview deploys missing env vars fail gracefully into `app/error.tsx` instead of crashing at module import.

### Reading

Only three query functions, all `server-only`:

```ts
getArtists(): Promise<AtlasArtist[]>             // for / and /graph and /timeline
getArtistBySlug(slug): Promise<AtlasArtist|null> // for /band/[slug]
getAllSlugs(): Promise<string[]>                 // for generateStaticParams + /random
```

ISR is `revalidate = 300` (5 minutes) on every page so changes to Mongo propagate within ~5 min without a redeploy.

---

## Components

### Layout shell (`components/`)

- **`SettingsProvider`** — Context for tone/density/motion. Persists to `localStorage` under key `wos.settings.v2`. Hydrates after mount; SSR uses the default. Default in v1.0: `{ tone: "ink", density: "normal", motion: "slow" }`.
- **`Shelf`** — Cogwheel-triggered floating settings panel. Picks tone (4 swatches), density (3 radio), motion (3 radio).
- **`SiteNav`** — Top sticky nav with the four route links + version label. All styles in `.wos-nav*` CSS classes.

### Views (`components/views/`)

Each route's "view" is a Client Component (so it can read `useSearchParams`, manage local state, attach event listeners). The page Server Component fetches the data, hands it down as a prop, and wraps the view in `<Suspense>` when needed.

The Feed view in particular is interesting: it composes three small stateless sub-components (Toolbar, ActiveFilterStrip, Panel) and stays as the URL hub. Filter state lives in the URL via `router.replace(buildHref(state))` so views are shareable and back-button works. See `docs/superpowers/specs/2026-05-14-feed-filters-design.md` for the design rationale.

The Graph view splits across three files since v1.0 — pan/zoom math is extracted into a `usePanZoom` hook in `lib/use-pan-zoom.ts` with unit tests for the pure functions (`zoomAround`, `clampZoom`, `pointerMidpoint`, `pointerDistance`, `computeFitTransform`).

BandDetail is a Server Component (since v1.0) — zero client JS for `/band/*`. Similar-band cards use `<Link>`; theme switching still works because all elements inherit `var(--*)` from `<body>`, which `SettingsProvider` updates directly.

---

## Theming system

Four themes, switched via `data-tone` attribute on `<body>`:

| Tone | Bg | Text | Accent | Identity |
|---|---|---|---|---|
| `ink` (default) | warm near-black `#15110d` | warm cream `#f4ede4` | brighter oxblood `#d65a52` | Newspaper at night |
| `paper` | cream `#ebe5d6` | near-black `#16130d` | oxblood `#8c2a23` | Original light theme |
| `terminal` | green-black `#0a0c08` | green `#aef4a0` | yellow `#f4c84a` | CRT terminal |
| `magenta` | purple-black `#0e0814` | lavender `#e6d6ee` | hot pink `#ff5eb8` | After-hours |

All tokens are CSS variables on `:root` and `[data-tone="..."]` overrides in `app/globals.css`. Components read them through `var(--ink)`, `var(--accent)`, etc. — no hex literals in component code.

Contrast: all `--ink-faint` values are tuned to pass WCAG AA (~4.5:1) at small text sizes. Active chip/badge backgrounds get explicit text-color overrides per theme so they stay legible against the accent color.

Density and motion settings rescale spacing and animation duration via CSS variables (`--density`, `--motion`).

---

## Image pipeline

### Runtime — Next.js Image optimizer

`<Image>` from `next/image` is used everywhere images render. `next.config.js` configures `remotePatterns` for the actual hosts in the dataset:

- `**.mzstatic.com` (Apple iTunes Search album art)
- `coverartarchive.org` + `archive.org` + `**.archive.org` (Cover Art Archive)
- `**.wikipedia.org` + `**.wikimedia.org` (band photos)

Browsers get responsive sizes, AVIF/WebP, lazy-loading by default. Above-the-fold band photos use `priority` to skip lazy-loading.

### Build-time enrichment (Python)

See [Enrichment](#enrichment-python) — Python scripts in `scripts/python/` populate the `art`, `photo`, and `listen` fields by querying public APIs (iTunes Search, MusicBrainz, Cover Art Archive, Wikipedia). They write back to Atlas directly.

---

## Quality gates

The pipeline:

```
local edit
  ↓
pre-commit hook  (simple-git-hooks)
  ↓
  npm run format:check    — Prettier (drift fails)
  npm run lint            — ESLint (errors fail; warnings allowed)
  npx tsc --noEmit        — TypeScript strict + noUncheckedIndexedAccess
  npm test                — node:test suites
  ↓ ✓
git push origin main
  ↓
GitHub Actions CI         — same gate, can't bypass
  ↓ ✓
Vercel auto-deploy        — runs tsc + next build (with MONGODB_URI from env)
```

### ESLint (`eslint.config.mjs`)

Flat config. Extends:
- `@next/eslint-plugin-next` (`core-web-vitals` rules)
- `@typescript-eslint/eslint-plugin` (recommended subset)
- `eslint-plugin-react-hooks` (recommended)

Notable rule choices:
- `no-console`: only `warn` + `error` allowed (catches accidental `console.log` left in)
- `@typescript-eslint/no-unused-vars`: ignore `_`-prefixed (`warn` not `error`)
- `react-hooks/refs` and `react-hooks/set-state-in-effect`: downgraded to `warn` because the Graph view's pointer-event ref-sync and `SettingsProvider`'s localStorage-hydration are intentional patterns
- `@next/next/no-img-element`: `off` (all images are `<Image>` since v1.0)

### TypeScript (`tsconfig.json`)

- `strict: true`
- `noUncheckedIndexedAccess: true` — `arr[0]` returns `T | undefined`; callers must guard

### Prettier (`.prettierrc`)

100-col, double-quote, semicolons, `trailingComma: "all"`, `arrowParens: "always"`.

### Pre-commit

Runs the four gates locally before the commit lands. Installed via `simple-git-hooks` (lighter than husky, ~5 LOC in `package.json`). Auto-installs on `npm install` via `postinstall`.

### CI (`.github/workflows/ci.yml`)

Same four checks on every push to `main` and every PR, Node 22, `npm ci` for reproducibility. `npm run build` is intentionally **not** in CI — it needs `MONGODB_URI` and Vercel already handles real builds with the env var set.

---

## Testing

```bash
npm test
```

94 tests across 8 suites, all `node:test` via `tsx` (no Jest, no Vitest, zero runtime overhead). Suites:

| File | Coverage |
|---|---|
| `lib/feed-filters.test.ts` | URL ↔ state round-trip, all 4 filter dimensions, AND-across / OR-within, sort orderings, faceted counts |
| `lib/atlas-schema.test.ts` | zod accept/reject paths, parseArtists drop + warn |
| `lib/atlas-helpers.test.ts` | refAlbum (incl. empty discography), initials, moodTag, paletteFor |
| `lib/atlas-similarity.test.ts` | scoring branches, target exclusion, ordering, limit, self-exclusion |
| `lib/helpers.test.ts` | slugify (drives `/band/[slug]` routing), eraLabel |
| `lib/mood-families.test.ts` | data integrity, bounds, fallback |
| `lib/graph-layout.test.ts` | d3-force determinism, clustering, empty-moods fallback |
| `lib/use-pan-zoom.test.ts` | pure math: zoomAround, clampZoom, pointerMidpoint/Distance, computeFitTransform |

The discipline: every pure module in `lib/` has a co-located `.test.ts`. UI views aren't unit-tested (covered by the build + browser smoke during development).

---

## Scripts

```bash
npm run dev               # next dev (localhost:3000)
npm run build             # tsc --noEmit && next build
npm run start             # next start (production)
npm run lint              # eslint .
npm run typecheck         # tsc --noEmit
npm test                  # 94 tests across 8 suites
npm run format            # prettier --write .
npm run format:check      # prettier --check .

npm run seed              # tsx scripts/seed.ts (loads scripts/seed-data.ts into Atlas)
npm run seed:export       # tsx scripts/export-seed-json.ts (dumps seed to JSON)
```

`scripts/seed.ts` and `scripts/export-seed-json.ts` use the same Mongo connection as the runtime (`lib/db.ts`); seed data lives in `scripts/seed-data.ts` and is never bundled into the runtime app.

---

## Enrichment (Python)

`scripts/python/` is a Python-driven enrichment toolkit that populates `art`, `photo`, and `listen` fields on existing artist documents. Lives separately because it leans on `requests` + `pymongo` with venv-based dependency management.

| Script | What it does | Source |
|---|---|---|
| `enrich_album_art.py` | Populates `discography[].art` | iTunes Search → MusicBrainz + Cover Art Archive fallback |
| `enrich_band_photos.py` | Populates `photo` | Wikipedia REST API (with disambiguation handling) |
| `enrich_listen_links.py` | Populates `listen.bandcamp / spotify / apple / tidal` | Bandcamp scraping, Apple Music Search API, Spotify Web API |
| `test_connection.py` | Smoke-tests the Mongo connection | — |

See `scripts/python/README.md` for setup (`python -m venv .venv && pip install -r requirements.txt`).

Current enrichment coverage at v1.0:
- Album art: ~109/119
- Band photos: ~66/119
- Listen links: Apple Music ~117/119, Bandcamp ~116/119, Spotify partial, Tidal swap-in for YouTube

---

## Deployment

Vercel from `main`. Every push auto-deploys. Required env vars in the Vercel project settings:

- `MONGODB_URI` — Atlas connection string
- `MONGODB_DB` — database name (defaults to `worldofshoegaze`)

Atlas IP allowlist needs `0.0.0.0/0` because Vercel uses ephemeral IPs.

### Image optimization

Next's optimizer pre-fetches and re-encodes remote images on demand. No CDN config needed — Vercel handles it.

### Errors / not-found

Branded fallbacks: `app/error.tsx` for runtime errors, `app/not-found.tsx` for unknown routes, `app/band/[slug]/not-found.tsx` for unknown band slugs. All use the project's monospace-newspaper visual language.

---

## Local development

```bash
git clone https://github.com/andrewjlavoie/World-of-Shoegaze.git
cd world_of_shoegaze
npm install
```

`postinstall` hooks `simple-git-hooks` into your `.git/hooks/pre-commit` automatically. From here:

```bash
# Set up env
cat > .env.local <<EOF
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
MONGODB_DB=worldofshoegaze
EOF

# Dev server
npm run dev

# Or full prod build + start (closer to Vercel)
npm run build
npm run start
```

For mobile testing on your local network:

```bash
npm start -- -H 0.0.0.0 -p 3000
# then visit http://<your-ip>:3000 from the phone
```

---

## Project history

Built bottom-up across a series of features and refactors. Design docs and implementation plans for everything live in:

- `docs/superpowers/specs/` — design briefs (the "what / why")
- `docs/superpowers/plans/` — implementation plans (the "how", task-by-task)

Highlights:

| Doc | About |
|---|---|
| `specs/2026-05-13-graph-view-design.md` | Force-directed graph design (mood gardens) |
| `specs/2026-05-14-feed-filters-design.md` | Multi-dimensional feed filter design |
| `specs/2026-05-14-codebase-refactor-strategy.md` | 4-agent codebase audit synthesis |
| `plans/2026-05-14-refactor-INDEX.md` | Index of the 6-phase v1.0 refactor |

The v1.0 refactor (6 phases, ~37 commits) shipped, in order:

1. **Legacy purge** — Supabase scaffolding, `Band`-typed helpers, dead CSS, stale comments
2. **Helper consolidation** — `lib/atlas-helpers.ts` collapses 5 duplicates → 1
3. **Quality gates** — ESLint flat config, tsc-in-build, Prettier, pre-commit, GitHub Actions CI
4. **Data hardening** — zod at the Mongo boundary, lazy MONGODB_URI, `error.tsx` + `not-found.tsx`
5. **CSS + a11y** — color tokens, WCAG AA contrast, `<main>` landmark, focus rings, hover-media wraps
6. **Bigger refactors** — `lib/data.ts` split, `Graph.tsx` split, BandDetail → Server Component, `<img>` → `<Image>`

Then the dark-default theme (`ink`) landed as the v1.0 visual reset, with a `localStorage` migration so existing visitors got bumped to the new default on their next visit.

---

## License

Source code: MIT.
Curatorial content (artist descriptions, mood mappings, era classifications, the entire vibe): personal; please don't lift wholesale.
Album art / band photos: rights belong to their respective owners; sourced from publicly-available APIs (iTunes Search, MusicBrainz / Cover Art Archive, Wikipedia).

---

**Maintained by one obsessive.**
