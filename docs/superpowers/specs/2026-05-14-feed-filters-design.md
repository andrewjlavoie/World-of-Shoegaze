# Feed filters — design

Adds a richer multi-dimensional filter mechanism to the homepage Feed (`/`).
Replaces the current single-row era chips + sort buttons with a hidden
filter panel covering four dimensions: era, mood family, country, decade.
Active filters appear as a removable chip strip below the toolbar. State
lives in URL search params so filtered views are shareable and the back
button works.

## Job to be done

The Feed today only filters by era (single-select) and sorts by name / year /
intensity. As the catalog grows, users want to slice on more dimensions —
"show me 80s UK first-wave" or "Japanese current-era stuff" — without having
to scroll the whole feed.

The catch: the homepage is the primary surface and shouldn't drown in
chrome. Filters need to be **discoverable when wanted, invisible when not**,
and **mobile-friendly**.

## Visual model

### Default state

```
┌─ The Feed. ─────────────────────────────────────────┐
│  ════════════════════════════════════════════════   │
│  [ ? search…                       ] [filters] [name][year][intensity]
│                                                     │
│  ↓ feed cards                                       │
└─────────────────────────────────────────────────────┘
```

A single toolbar row: search input + `[filters]` button + 3 sort buttons.
That's it. No filter chips visible.

### When filters are active

```
│  [ ? search…                       ] [filters · 2] [name][year][intensity]
│  ACTIVE  era · First Wave ✕   country · UK + USA ✕   clear all   38 of 119
│                                                     │
│  ↓ feed cards (filtered)                            │
```

A second row appears below the toolbar: removable chips per active filter
(`era · First Wave ✕`), a `clear all` link, and the result count
(`38 of 119`). The `[filters]` button shows a count badge of how many
dimensions have selections.

### Panel (expanded)

When the user clicks `[filters]`, a panel opens:

- **Desktop (≥720px)**: inline below the toolbar, pushing feed cards down.
- **Mobile (<720px)**: bottom drawer slides up over the cards (with a
  semi-transparent backdrop).

Panel layout — 4 dimension blocks, each a labeled chip group:

```
┌─ Filter panel ──────────────────────────────────────┐
│  [ era ]  1 selected         [ mood family ]        │
│  Proto · [First Wave] ·       Dreampop · Noise ·    │
│  Transitional · Nu-Gaze ·     Heavy · Dark ·        │
│  Current                      Anthemic · Lo-fi ·    │
│                               Twee · Japanese       │
│                                                     │
│  [ country ]  2 selected                            │
│  [UK] · [USA] · Japan · France · Germany · Sweden · │
│  Canada · South Korea · Norway · Netherlands ·      │
│  Mexico · Brazil · Estonia · Peru · New Zealand     │
│                                                     │
│  [ decade ]                                         │
│  1980s · 1990s · 2000s · 2010s · 2020s              │
│                                                     │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─       │
│  URL: /?era=first_wave&country=UK,USA               │
│                          [clear all] [apply & close]│
└─────────────────────────────────────────────────────┘
```

Each chip shows its option label + a small live count
(`UK · 42`) showing how many bands match if you toggle that chip on
**within the current filter set on every other dimension** (faceted
search semantics). Selected chips have the oxblood active style.

## Dimensions

Four dimensions, all multi-select chips with live counts:

| Dimension | Source | Options | Layout |
|---|---|---|---|
| **Era** | `artist.era` | 5: Proto, First Wave, Transitional, Nu-Gaze, Current (cf. `lib/data.ts` `ERAS`) | Half-width grid block |
| **Mood family** | derived from `artist.moods[0]` via `lib/mood-families.ts` `familyFor()` | 8 family labels (cf. `FAMILY_LABELS`) | Half-width grid block |
| **Country** | `artist.country` | ~15 unique values, sorted by frequency descending then alphabetical | Full-width block |
| **Decade** | derived from `refAlbum(artist).year` (rounded down to nearest 10) | 5: 1980s, 1990s, 2000s, 2010s, 2020s | Full-width block |

**Sort** stays as before — name / year / intensity, three buttons in the
toolbar (NOT in the panel).

**Search** stays as before — full-text against name + reference album
title + country + subgenre.

### Multi-select within a dimension = OR

Selecting `UK` and `USA` in country = bands from UK OR USA. Within a
dimension, options compose via union.

### Across dimensions = AND

A band must match every dimension that has a selection. So
`era=First Wave` + `country=UK,USA` = (First Wave era) AND (UK OR USA).

### "All" semantics

A dimension with **zero** selections = no constraint on that dimension
(equivalent to "all"). There's no explicit "all" chip — empty selection
*is* "all." Removing the last selected chip in a dimension reverts that
dimension to no-constraint.

## URL params

Filter and sort state live entirely in `searchParams`. Updating any
filter pushes a new URL via `router.replace()` (not `push` — back button
shouldn't add an entry per chip click). The Feed component reads
`useSearchParams()` and derives state from it.

URL shape:

```
/?era=first_wave,nu_gaze&mood=heavy_doom,noise_chaos
 &country=UK,USA&decade=1990s,2010s
 &search=slowdive&sort=year
```

- Each dimension is comma-separated values
- All keys are optional (omit means no constraint)
- Search is a single string
- Sort is one of `name | year | intensity` (default `name`)
- Decade values are `1980s | 1990s | 2000s | 2010s | 2020s`
- Country values are URL-encoded country names (`South%20Korea`)
- Mood values are family slugs from `FAMILY_KEYS` (`heavy_doom`, etc.)
- Era values are era keys from `lib/data.ts` (`first_wave`, etc.)

The panel footer prints the current URL at bottom-left (small monospace,
muted) so users can copy/share. Optional but on-brand.

## Live counts

Each chip shows a count: how many bands match the **current filter set**
if that chip's value is added to its dimension. Two semantic options
considered:

1. **"Total in dataset"** — UK shows `42` (all UK bands ever), regardless
   of other selections. Stable but misleading once you add filters.
2. **"Result if I add this"** — counts respect every other dimension's
   current selection. UK's count drops to `8` if you've also selected
   First Wave. **Picked option 2** — true faceted search; users see real
   consequences.

Within a dimension, the chip's count is computed *as if that chip's
dimension had only that one value selected*, with all OTHER dimensions
applied. So in the `country` block, each country's count = "how many
bands match [the rest of the active filters] AND are from that country."
Standard faceted search.

## Components

```
components/views/Feed.tsx                    (Client; receives artists prop)
  ├─ reads useSearchParams() → derives FilterState
  ├─ filtered = applyFilters(artists, state)
  ├─ <FeedToolbar
  │     state, search, sort
  │     onChange={(next) => router.replace(buildHref(next))}
  │     onOpenPanel={() => setPanelOpen(true)}
  │  />
  ├─ <ActiveFilterStrip state, results={filtered.length} onRemove />
  ├─ <FeedPanel
  │     open, state, artists, onChange, onClose
  │  />
  └─ feed cards (existing)

components/views/FeedToolbar.tsx             (new — search + filters btn + sort)
components/views/FeedPanel.tsx               (new — the expandable panel/drawer)
components/views/ActiveFilterStrip.tsx       (new — the "active · era · UK ✕" row)

lib/feed-filters.ts                          (new — pure)
  ├─ FilterState type
  ├─ parseSearchParams(URLSearchParams) → FilterState
  ├─ buildHref(FilterState) → string
  ├─ applyFilters(artists, state) → AtlasArtist[]
  └─ countByOption(artists, state, dimension) → Map<value, number>
```

The Feed becomes the data + URL hub. Toolbar / panel / strip are presentation
shells that take state + a single onChange callback. All filter math is in
`lib/feed-filters.ts` and pure (testable in `node:test`).

## Architecture

### Server vs client

Page (`app/page.tsx`) stays Server Component, fetches `getArtists()` once.
All filtering is client-side via `applyFilters` in `useMemo`. 119 records
× 4 dimensions × few clicks/sec — well within client budget.

### URL state vs local state

URL is the single source of truth for filter selections + sort + search.
`searchParams` flows in via `useSearchParams()`; updates flow out via
`router.replace(buildHref(...))`. Panel open/close is local React state
(not in URL — back button shouldn't open/close the panel).

### Panel mount strategy

Always mounted in DOM, animated open/close via CSS transform. Avoids
remount cost on every toggle and lets focus management work cleanly.

## States, edge cases, errors

- **No artists match**: feed shows the existing empty state ("nothing matches — try fewer filters") with a "clear all filters" link.
- **Filter value in URL doesn't exist** (e.g., user-edited `country=Atlantis`): silently ignored — that single value is dropped from the active selection. Other valid filters still apply.
- **Click a chip on a dimension that's disabled by upstream filters** (e.g., toggling `country=Japan` when current results = 0): the chip still works, just shows count `0` and the resulting feed is empty. No special UI.
- **Too many countries change**: `lib/feed-filters.ts` derives the country list dynamically from artists, so adding new countries to the dataset just appears as new chips. No code change needed.
- **No search results + active filters**: clearing search shows results based on filters. Clearing filters shows search results. Both clear → full feed.

## Out of scope (deferred)

- **Saved filter presets** — "remember this combination as a favorite"
- **Filter sharing UI** — explicit "copy link" button (URL bar already shows the link)
- **Sub-mood filter** (raw moods 1-21 instead of mood families) — too granular for a casual surface
- **Subgenre filter** — duplicates mood family in spirit; muddies the UX
- **Year range slider** — decade chips are simpler and good enough
- **Intensity filter** — dropped during brainstorm; can come back as a slider if requested
- **Server-side filtering / pagination** — N=119 is small; client-side is fine until much bigger

## File checklist

**New:**
- `lib/feed-filters.ts` — pure filter logic (parse / build / apply / count)
- `lib/feed-filters.test.ts` — `node:test` unit tests
- `components/views/FeedToolbar.tsx` — toolbar row
- `components/views/FeedPanel.tsx` — expandable panel / mobile drawer
- `components/views/ActiveFilterStrip.tsx` — removable chips strip

**Modified:**
- `components/views/Feed.tsx` — wire URL state, render Toolbar/Panel/Strip, plus already-present cards
- `app/globals.css` — new classes for the toolbar, active strip, panel, and mobile drawer. Reuse `.chip` / `.btn` for individual elements.
- `app/page.tsx` — wrap `<Feed>` in `<Suspense>` so `useSearchParams()` (used inside Feed) is allowed inside a Server Component child. Required by Next.js App Router for any client component that calls `useSearchParams`.

## Acceptance

- Toolbar shows search input + `[filters]` button (with badge count of active dimensions when > 0) + 3 sort buttons.
- Active-filter strip appears below toolbar only when at least one dimension has a selection. Each chip is removable via ✕. `clear all` clears every dimension. Result count `N of 119` shown.
- Clicking `[filters]` expands a panel:
  - Desktop: inline below the toolbar.
  - Mobile (<720px): bottom drawer with backdrop.
- Panel contains 4 chip blocks: era (5), mood family (8), country (~15), decade (5). All multi-select. All chips show live counts.
- Selecting a chip immediately updates the URL via `router.replace`, the active strip, and the feed.
- Reloading or sharing a URL with filter params restores the exact filter state.
- Back/forward in the browser walks through URL changes.
- Sort buttons work as today (name/year/intensity), state in URL too.
- Build clean, tests pass, no regressions on `/graph`, `/timeline`, `/random`, `/band/<slug>`.
