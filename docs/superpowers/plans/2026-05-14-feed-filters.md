# Feed filters implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Feed homepage's single-row toolbar with a richer multi-dimension filter mechanism: 4 dimensions (era / mood family / country / decade), all multi-select chips, hidden behind a `[filters]` button. Active filters appear as a removable chip strip below the toolbar. State lives in URL search params for shareable views and back-button support.

**Architecture:** A pure logic module `lib/feed-filters.ts` owns the `FilterState` type plus parse/build/apply/count functions. `Feed.tsx` becomes the URL-state hub (reads `useSearchParams`, derives state, fans out to children). Three new presentational components — `FeedToolbar`, `ActiveFilterStrip`, `FeedPanel` — receive state + onChange callbacks. The page wraps `<Feed>` in `<Suspense>` (required by Next.js for `useSearchParams`). Mobile collapses the panel to a bottom drawer with backdrop. All filter math is unit-tested via `node:test`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, MongoDB Atlas (existing), `node:test` via tsx for the pure logic tests, no new dependencies.

---

## File structure

**New:**

| Path | Responsibility |
|---|---|
| `lib/feed-filters.ts` | Pure filter logic: `FilterState`, `parseSearchParams`, `buildHref`, `applyFilters`, `dimensionCounts`, `decadeOf`, `activeCount`. |
| `lib/feed-filters.test.ts` | `node:test` units covering parse round-trip, AND-across / OR-within semantics, faceted counts, decade derivation. |
| `components/views/FeedToolbar.tsx` | Stateless: search input + `[filters · N]` button + 3 sort buttons. |
| `components/views/ActiveFilterStrip.tsx` | Stateless: removable chips per active dimension + `clear all` + result count. Hidden when nothing's active. |
| `components/views/FeedPanel.tsx` | Stateless (renders the 4 chip blocks + footer). Always mounted in DOM; `open` prop drives visibility via CSS. |

**Modified:**

| Path | Change |
|---|---|
| `components/views/Feed.tsx` | Drops the existing in-place toolbar; reads `useSearchParams`, derives `FilterState`, owns the panel-open local state, fans state down to Toolbar/Strip/Panel + cards. Calls `router.replace(buildHref(next))` on every state change. |
| `app/page.tsx` | Wraps `<Feed>` in `<Suspense>` (required by Next.js when child uses `useSearchParams`). |
| `app/globals.css` | New classes for the toolbar v2 (drops the old `.feed-toolbar-row`/`.feed-eras`), active strip, panel, and mobile drawer. Reuses existing `.chip` and `.btn`. |
| `package.json` | Extends `test` script to include `lib/feed-filters.test.ts`. |

---

## Task 1 — Filter types + parse + build

**Files:**
- Modify: `package.json` (extend `test` script)
- Create: `lib/feed-filters.ts` (initial — types + parse + build + helpers only)
- Create: `lib/feed-filters.test.ts` (initial — covers parse + build + decadeOf + activeCount)

- [ ] **Step 1: Extend the test script**

Edit `package.json`. Update the `test` script to include the new test file:

```json
"test": "tsx --test lib/mood-families.test.ts lib/graph-layout.test.ts lib/feed-filters.test.ts"
```

- [ ] **Step 2: Write the failing tests**

Create `lib/feed-filters.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_STATE,
  parseSearchParams,
  buildHref,
  decadeOf,
  activeCount,
} from "./feed-filters";

test("EMPTY_STATE has no selections, sort=name, search=''", () => {
  assert.equal(EMPTY_STATE.search, "");
  assert.equal(EMPTY_STATE.sort, "name");
  assert.deepEqual(EMPTY_STATE.era, []);
  assert.deepEqual(EMPTY_STATE.mood, []);
  assert.deepEqual(EMPTY_STATE.country, []);
  assert.deepEqual(EMPTY_STATE.decade, []);
});

test("parseSearchParams: empty input → EMPTY_STATE", () => {
  const s = parseSearchParams(new URLSearchParams(""));
  assert.deepEqual(s, EMPTY_STATE);
});

test("parseSearchParams: comma-separated values become arrays", () => {
  const s = parseSearchParams(new URLSearchParams("era=first_wave,nu_gaze&country=UK,USA"));
  assert.deepEqual(s.era, ["first_wave", "nu_gaze"]);
  assert.deepEqual(s.country, ["UK", "USA"]);
});

test("parseSearchParams: single value still becomes a one-element array", () => {
  const s = parseSearchParams(new URLSearchParams("mood=heavy_doom"));
  assert.deepEqual(s.mood, ["heavy_doom"]);
});

test("parseSearchParams: empty value is treated as empty array", () => {
  const s = parseSearchParams(new URLSearchParams("era="));
  assert.deepEqual(s.era, []);
});

test("parseSearchParams: invalid sort falls back to 'name'", () => {
  const s = parseSearchParams(new URLSearchParams("sort=bogus"));
  assert.equal(s.sort, "name");
});

test("parseSearchParams: valid sort is preserved", () => {
  const s = parseSearchParams(new URLSearchParams("sort=year"));
  assert.equal(s.sort, "year");
});

test("parseSearchParams: search string preserved", () => {
  const s = parseSearchParams(new URLSearchParams("search=slowdive"));
  assert.equal(s.search, "slowdive");
});

test("buildHref: empty state → '/'", () => {
  assert.equal(buildHref(EMPTY_STATE), "/");
});

test("buildHref: omits empty arrays and default sort", () => {
  const href = buildHref({ ...EMPTY_STATE, era: ["first_wave"] });
  assert.equal(href, "/?era=first_wave");
});

test("buildHref: includes non-default sort", () => {
  const href = buildHref({ ...EMPTY_STATE, sort: "year" });
  assert.equal(href, "/?sort=year");
});

test("buildHref: arrays joined with comma, in stable key order", () => {
  const state = { ...EMPTY_STATE, era: ["first_wave"], country: ["UK", "USA"], mood: ["heavy_doom"] };
  // Expected key order: search, sort, era, mood, country, decade
  assert.equal(buildHref(state), "/?era=first_wave&mood=heavy_doom&country=UK%2CUSA");
});

test("buildHref ↔ parseSearchParams round-trips for a typical filter set", () => {
  const state = {
    search: "slow",
    sort: "year" as const,
    era: ["first_wave"],
    mood: ["dreampop_bliss"],
    country: ["UK", "USA"],
    decade: ["1990s"],
  };
  const href = buildHref(state);
  // strip the leading "/?"
  const params = new URLSearchParams(href.slice(2));
  const parsed = parseSearchParams(params);
  assert.deepEqual(parsed, state);
});

test("decadeOf: rounds year down to decade label", () => {
  assert.equal(decadeOf(1991), "1990s");
  assert.equal(decadeOf(1990), "1990s");
  assert.equal(decadeOf(1989), "1980s");
  assert.equal(decadeOf(2024), "2020s");
  assert.equal(decadeOf(2000), "2000s");
});

test("activeCount: counts dimensions with non-empty selections", () => {
  assert.equal(activeCount(EMPTY_STATE), 0);
  assert.equal(activeCount({ ...EMPTY_STATE, era: ["first_wave"] }), 1);
  assert.equal(activeCount({ ...EMPTY_STATE, era: ["first_wave"], country: ["UK"] }), 2);
  // search and sort don't count toward active dimensions
  assert.equal(activeCount({ ...EMPTY_STATE, search: "x", sort: "year" }), 0);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: failure with `Cannot find module './feed-filters'`.

- [ ] **Step 4: Implement `lib/feed-filters.ts`**

Create `lib/feed-filters.ts`:

```ts
// Pure filter logic for the Feed view.
// FilterState is the single source of truth. URL search params parse into
// it; it builds back into a URL. applyFilters and dimensionCounts (next
// task) consume it without ever touching React.

import type { AtlasArtist } from "./atlas-types";

export type SortKey = "name" | "year" | "intensity";

const SORT_KEYS: readonly SortKey[] = ["name", "year", "intensity"] as const;

export interface FilterState {
  search: string;
  sort: SortKey;
  era: string[];      // era keys (cf. lib/data.ts ERAS)
  mood: string[];     // family keys (cf. lib/mood-families.ts FAMILY_KEYS)
  country: string[];  // raw country names from artist.country
  decade: string[];   // "1980s" | "1990s" | "2000s" | "2010s" | "2020s"
}

export const EMPTY_STATE: FilterState = {
  search: "",
  sort: "name",
  era: [],
  mood: [],
  country: [],
  decade: [],
};

export type DimensionKey = "era" | "mood" | "country" | "decade";

const DIMENSION_KEYS: readonly DimensionKey[] = ["era", "mood", "country", "decade"] as const;

/**
 * Read filter state from URLSearchParams. Unknown / empty values become
 * empty arrays. Unknown sort falls back to "name".
 */
export function parseSearchParams(
  params: URLSearchParams | { get(name: string): string | null },
): FilterState {
  const get = (k: string) => params.get(k) ?? "";
  const arr = (k: string): string[] => {
    const raw = get(k);
    if (!raw) return [];
    return raw.split(",").map((v) => v.trim()).filter(Boolean);
  };
  const sortRaw = get("sort");
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(sortRaw)
    ? (sortRaw as SortKey)
    : "name";
  return {
    search: get("search"),
    sort,
    era: arr("era"),
    mood: arr("mood"),
    country: arr("country"),
    decade: arr("decade"),
  };
}

/**
 * Serialize filter state to a URL pathname + query string. Empty arrays
 * and default sort are omitted. Key order is stable
 * (search, sort, era, mood, country, decade) so URLs are deterministic.
 */
export function buildHref(state: FilterState, basePath = "/"): string {
  const parts: string[] = [];
  if (state.search) parts.push(`search=${encodeURIComponent(state.search)}`);
  if (state.sort && state.sort !== "name") parts.push(`sort=${state.sort}`);
  for (const k of DIMENSION_KEYS) {
    const values = state[k];
    if (values.length === 0) continue;
    parts.push(`${k}=${values.map(encodeURIComponent).join("%2C")}`);
  }
  return parts.length === 0 ? basePath : `${basePath}?${parts.join("&")}`;
}

/**
 * Year → decade label. 1991 → "1990s", 2000 → "2000s".
 */
export function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

/**
 * Count of dimensions with at least one selection. Used to badge the
 * `[filters · N]` button. Search and sort don't count.
 */
export function activeCount(state: FilterState): number {
  let n = 0;
  for (const k of DIMENSION_KEYS) if (state[k].length > 0) n++;
  return n;
}
```

- [ ] **Step 5: Verify tests pass**

Run: `npm test`
Expected: all 14 new feed-filters tests pass + the existing 10 from prior tests = `# pass 24` (or whatever the total is — point is no failures).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add lib/feed-filters.ts lib/feed-filters.test.ts package.json
git commit -m "$(cat <<'EOF'
Feed filters: types + parse + build (lib/feed-filters.ts)

Pure module: FilterState type, parseSearchParams (URLSearchParams →
state, with comma-split arrays + sort fallback), buildHref (state →
deterministic /?key=v query, omitting empty/default values),
decadeOf(year) and activeCount(state) helpers.

URL ↔ state round-trips. Tests cover empty input, single + multi
values, invalid sort fallback, decade rounding, active dimension count.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — applyFilters + dimensionCounts

**Files:**
- Modify: `lib/feed-filters.ts` (add `applyFilters`, `dimensionCounts`)
- Modify: `lib/feed-filters.test.ts` (add tests for both)

- [ ] **Step 1: Append failing tests**

Append to `lib/feed-filters.test.ts`:

```ts
import type { AtlasArtist } from "./atlas-types";
import { applyFilters, dimensionCounts } from "./feed-filters";

function fakeArtist(opts: {
  slug: string;
  name?: string;
  country?: string;
  era?: AtlasArtist["era"];
  intensity?: number;
  subgenre?: string;
  moods?: string[];
  year?: number;
  album?: string;
}): AtlasArtist {
  return {
    schemaVersion: 1,
    slug: opts.slug,
    name: opts.name ?? opts.slug,
    country: opts.country ?? "UK",
    era: opts.era ?? "first_wave",
    lat: 0,
    lng: 0,
    intensity: opts.intensity ?? 5,
    subgenre: opts.subgenre ?? "shoegaze",
    desc: "",
    moods: opts.moods ?? ["euphoric_bliss"],
    discography: [{
      slug: "ref",
      title: opts.album ?? "Ref",
      year: opts.year ?? 1992,
      kind: "LP",
      isReference: true,
    }],
    listen: {},
  };
}

const SAMPLE: AtlasArtist[] = [
  fakeArtist({ slug: "slowdive",   country: "UK",  era: "first_wave",   intensity: 4, moods: ["wistful_dreamers"], year: 1993, album: "Souvlaki" }),
  fakeArtist({ slug: "ride",       country: "UK",  era: "first_wave",   intensity: 5, moods: ["euphoric_bliss"],   year: 1990, album: "Nowhere" }),
  fakeArtist({ slug: "deafheaven", country: "USA", era: "second_wave",  intensity: 9, moods: ["ecstatic_catharsis"], year: 2013, album: "Sunbather" }),
  fakeArtist({ slug: "wisp",       country: "USA", era: "current",      intensity: 4, moods: ["modern_anguish"],   year: 2024, album: "Pandora" }),
  fakeArtist({ slug: "kinoko",     country: "Japan", era: "second_wave", intensity: 5, moods: ["japanese_gaze"],    year: 2013, album: "eureka" }),
];

test("applyFilters: empty state returns all artists", () => {
  const out = applyFilters(SAMPLE, EMPTY_STATE);
  assert.equal(out.length, SAMPLE.length);
});

test("applyFilters: era filter (single value)", () => {
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, era: ["first_wave"] });
  assert.deepEqual(out.map((a) => a.slug), ["ride", "slowdive"]); // sorted by name
});

test("applyFilters: era filter (multiple values, OR)", () => {
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, era: ["first_wave", "current"] });
  assert.deepEqual(new Set(out.map((a) => a.slug)), new Set(["ride", "slowdive", "wisp"]));
});

test("applyFilters: country filter (multiple values, OR)", () => {
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, country: ["UK", "Japan"] });
  assert.deepEqual(new Set(out.map((a) => a.slug)), new Set(["ride", "slowdive", "kinoko"]));
});

test("applyFilters: decade filter via year-derived decade", () => {
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, decade: ["2010s"] });
  assert.deepEqual(new Set(out.map((a) => a.slug)), new Set(["deafheaven", "kinoko"]));
});

test("applyFilters: across dimensions = AND", () => {
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, era: ["first_wave"], country: ["UK"] });
  assert.deepEqual(new Set(out.map((a) => a.slug)), new Set(["ride", "slowdive"]));
});

test("applyFilters: search matches name (case-insensitive)", () => {
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, search: "DEAF" });
  assert.deepEqual(out.map((a) => a.slug), ["deafheaven"]);
});

test("applyFilters: search matches album title", () => {
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, search: "souvlaki" });
  assert.deepEqual(out.map((a) => a.slug), ["slowdive"]);
});

test("applyFilters: sort by year (descending)", () => {
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, sort: "year" });
  assert.deepEqual(out.map((a) => a.slug), ["wisp", "deafheaven", "kinoko", "slowdive", "ride"]);
});

test("applyFilters: sort by intensity (descending)", () => {
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, sort: "intensity" });
  assert.equal(out[0].slug, "deafheaven");
});

test("applyFilters: mood filter uses primary mood's family", () => {
  // wistful_dreamers + euphoric_bliss both map to dreampop_bliss family
  const out = applyFilters(SAMPLE, { ...EMPTY_STATE, mood: ["dreampop_bliss"] });
  assert.deepEqual(new Set(out.map((a) => a.slug)), new Set(["slowdive", "ride"]));
});

test("dimensionCounts: each option's count respects OTHER dimensions but probes its own", () => {
  // With era=first_wave already selected, country counts should only
  // include first_wave bands.
  const state = { ...EMPTY_STATE, era: ["first_wave"] };
  const counts = dimensionCounts(SAMPLE, state, "country", ["UK", "USA", "Japan"]);
  assert.equal(counts.get("UK"), 2);    // ride + slowdive
  assert.equal(counts.get("USA"), 0);    // deafheaven & wisp aren't first_wave
  assert.equal(counts.get("Japan"), 0);  // kinoko isn't first_wave
});

test("dimensionCounts: probing a dimension ignores its CURRENT selection", () => {
  // Even with country=UK already selected, USA count = "what if country were just USA"
  const state = { ...EMPTY_STATE, country: ["UK"] };
  const counts = dimensionCounts(SAMPLE, state, "country", ["UK", "USA"]);
  assert.equal(counts.get("UK"), 2);   // ride + slowdive
  assert.equal(counts.get("USA"), 2);   // deafheaven + wisp
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test`
Expected: the 13 new tests fail with `applyFilters is not a function` or similar.

- [ ] **Step 3: Add `applyFilters` and `dimensionCounts` to `lib/feed-filters.ts`**

Append to `lib/feed-filters.ts` (do not remove anything from Task 1):

```ts
import { familyFor } from "./mood-families";

function refAlbum(a: AtlasArtist) {
  return a.discography.find((d) => d.isReference) ?? a.discography[0];
}

function searchMatches(a: AtlasArtist, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystack = [
    a.name,
    refAlbum(a).title,
    a.country,
    a.subgenre,
    ...a.moods,
  ].join(" ").toLowerCase();
  return haystack.includes(needle);
}

function dimensionMatches(a: AtlasArtist, dim: DimensionKey, values: string[]): boolean {
  if (values.length === 0) return true;
  switch (dim) {
    case "era":
      return values.includes(a.era);
    case "mood": {
      const family = familyFor(a.moods[0]);
      return values.includes(family);
    }
    case "country":
      return values.includes(a.country);
    case "decade":
      return values.includes(decadeOf(refAlbum(a).year));
  }
}

function compareArtists(a: AtlasArtist, b: AtlasArtist, sort: SortKey): number {
  if (sort === "year") return refAlbum(b).year - refAlbum(a).year;
  if (sort === "intensity") return b.intensity - a.intensity;
  return a.name.replace(/^The /i, "").localeCompare(b.name.replace(/^The /i, ""));
}

/**
 * Apply every dimension AND-style. Within a dimension, values compose OR-style.
 * Returns a new sorted array; does not mutate input.
 */
export function applyFilters(artists: AtlasArtist[], state: FilterState): AtlasArtist[] {
  const out: AtlasArtist[] = [];
  for (const a of artists) {
    if (!searchMatches(a, state.search)) continue;
    if (!dimensionMatches(a, "era", state.era)) continue;
    if (!dimensionMatches(a, "mood", state.mood)) continue;
    if (!dimensionMatches(a, "country", state.country)) continue;
    if (!dimensionMatches(a, "decade", state.decade)) continue;
    out.push(a);
  }
  out.sort((x, y) => compareArtists(x, y, state.sort));
  return out;
}

/**
 * Faceted counts for each option in `dim`. The count for option V is
 * "how many bands match the current state with `dim` replaced by [V]".
 * Other dimensions stay as they are. Search applies. Sort doesn't matter.
 */
export function dimensionCounts(
  artists: AtlasArtist[],
  state: FilterState,
  dim: DimensionKey,
  options: string[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const value of options) {
    const probe: FilterState = { ...state, [dim]: [value] };
    out.set(value, applyFilters(artists, probe).length);
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all 27 tests pass (14 from Task 1 + 13 new).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/feed-filters.ts lib/feed-filters.test.ts
git commit -m "$(cat <<'EOF'
Feed filters: applyFilters + dimensionCounts

applyFilters: search + 4 dimensions (era / mood / country / decade) +
sort. Within a dimension, values compose OR. Across dimensions, AND.
Mood filter resolves family via lib/mood-families.ts familyFor().
Decade derives from reference album year.

dimensionCounts: faceted counts. For each option, computes "how many
bands match if this option were the only one selected in this
dimension, with all other dimensions unchanged." Search applies; sort
doesn't matter.

Tests cover OR-within / AND-across, sort orderings, search across
name+album+country+subgenre+moods, decade derivation, faceted-count
semantics.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — `FeedToolbar.tsx` component

**Files:**
- Create: `components/views/FeedToolbar.tsx`
- Modify: `app/globals.css` (new toolbar v2 classes; the existing `.feed-toolbar`/`.feed-toolbar-row`/`.feed-eras` get superseded — leave them for now so we don't break the current Feed mid-task)

- [ ] **Step 1: Create the component**

Create `components/views/FeedToolbar.tsx`:

```tsx
"use client";

import type { SortKey, FilterState } from "@/lib/feed-filters";

const SORT_OPTIONS: SortKey[] = ["name", "year", "intensity"];

export interface FeedToolbarProps {
  search: string;
  sort: SortKey;
  activeCount: number;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: SortKey) => void;
  onOpenFilters: () => void;
}

export function FeedToolbar({
  search,
  sort,
  activeCount,
  onSearchChange,
  onSortChange,
  onOpenFilters,
}: FeedToolbarProps) {
  return (
    <div className="feed-toolbar2">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="? search…"
        className="feed-toolbar2-search"
      />
      <button
        type="button"
        className="btn feed-toolbar2-filters"
        onClick={onOpenFilters}
        aria-label="open filters"
      >
        filters{activeCount > 0 && <span className="feed-toolbar2-badge">{activeCount}</span>}
      </button>
      <div className="feed-toolbar2-sort">
        {SORT_OPTIONS.map((k) => (
          <button
            key={k}
            type="button"
            className={`btn ${sort === k ? "is-active" : ""}`}
            onClick={() => onSortChange(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// Re-export FilterState so consumers can import from here too if convenient.
export type { FilterState };
```

- [ ] **Step 2: Add toolbar v2 CSS to `app/globals.css`**

Append at the end of the Feed section (find a sensible spot; the existing `.feed-toolbar` block is fine to leave alone — these are new classes):

```css
/* Feed toolbar v2 — search + filters button + sort buttons in one row. */
.feed-toolbar2 {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.feed-toolbar2-search {
  flex: 1 1 220px;
  min-width: 0;
}
.feed-toolbar2-filters {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.feed-toolbar2-badge {
  background: var(--accent);
  color: #fff8e8;
  padding: 1px 6px;
  font-size: 9px;
  border-radius: 999px;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 600;
}
[data-tone="terminal"] .feed-toolbar2-badge { color: #0a0c08; }
.feed-toolbar2-sort {
  display: flex;
  border: 1px solid var(--rule);
}
.feed-toolbar2-sort .btn {
  border: none;
  border-right: 1px solid var(--rule);
}
.feed-toolbar2-sort .btn:last-child { border-right: none; }

@media (max-width: 720px) {
  .feed-toolbar2 { gap: 6px; }
  .feed-toolbar2-sort { width: 100%; order: 99; }
  .feed-toolbar2-sort .btn { flex: 1; }
}
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -3`
Expected: typecheck clean. Build succeeds; the new component compiles even though nothing renders it yet.

- [ ] **Step 4: Commit**

```bash
git add components/views/FeedToolbar.tsx app/globals.css
git commit -m "$(cat <<'EOF'
Feed filters: FeedToolbar component

Stateless: receives search / sort / activeCount as props plus three
onChange callbacks. Renders a single-row toolbar — search input grows
to fill, [filters · N] button (badge shown only when N > 0), sort
button group. Mobile reflows the sort group to its own full-width
stretched row.

Wire-up to Feed.tsx happens in Task 6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — `ActiveFilterStrip.tsx` component

**Files:**
- Create: `components/views/ActiveFilterStrip.tsx`
- Modify: `app/globals.css` (new active-strip classes)

- [ ] **Step 1: Create the component**

Create `components/views/ActiveFilterStrip.tsx`:

```tsx
"use client";

import type { DimensionKey, FilterState } from "@/lib/feed-filters";
import { FAMILY_LABELS } from "@/lib/mood-families";
import { eraLabel } from "@/lib/helpers";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  era: "era",
  mood: "mood",
  country: "country",
  decade: "decade",
};

/** Human label for one filter value (era keys → "First Wave", etc.) */
function valueLabel(dim: DimensionKey, value: string): string {
  if (dim === "era") return eraLabel(value);
  if (dim === "mood") return FAMILY_LABELS[value as keyof typeof FAMILY_LABELS] ?? value;
  return value; // country and decade are already human-readable
}

export interface ActiveFilterStripProps {
  state: FilterState;
  total: number;       // total artists in dataset
  filtered: number;    // count after filtering
  onClearDimension: (dim: DimensionKey) => void;
  onClearAll: () => void;
}

const DIMENSIONS: DimensionKey[] = ["era", "mood", "country", "decade"];

export function ActiveFilterStrip({
  state,
  total,
  filtered,
  onClearDimension,
  onClearAll,
}: ActiveFilterStripProps) {
  const activeDims = DIMENSIONS.filter((d) => state[d].length > 0);
  if (activeDims.length === 0) return null;

  return (
    <div className="feed-active">
      <span className="feed-active-label">active</span>
      {activeDims.map((dim) => {
        const values = state[dim];
        const display = values.map((v) => valueLabel(dim, v)).join(" + ");
        return (
          <button
            key={dim}
            type="button"
            className="feed-active-chip"
            onClick={() => onClearDimension(dim)}
            aria-label={`clear ${DIMENSION_LABELS[dim]} filter`}
            title="click to clear"
          >
            {DIMENSION_LABELS[dim]} · {display}
          </button>
        );
      })}
      <button
        type="button"
        className="feed-active-clear"
        onClick={onClearAll}
      >
        clear all
      </button>
      <span className="feed-active-count">
        {filtered} of {total} results
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for the strip**

Append to `app/globals.css` (same Feed section):

```css
/* Active filter strip — appears between toolbar and feed when filters are active. */
.feed-active {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 10px;
  padding: 6px 0 14px;
}
.feed-active-label {
  color: var(--ink-soft);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 9px;
  margin-right: 2px;
}
.feed-active-chip {
  padding: 4px 8px;
  background: rgba(140, 42, 35, 0.10);
  color: var(--accent);
  border: none;
  font-family: inherit;
  font-size: 10px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.feed-active-chip::after { content: " ✕"; opacity: 0.55; margin-left: 4px; }
.feed-active-chip:hover { background: rgba(140, 42, 35, 0.18); }

.feed-active-clear {
  background: none;
  border: none;
  color: var(--ink-soft);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: var(--rule);
  font-family: inherit;
  font-size: 10px;
  padding: 0 6px;
}
.feed-active-clear:hover { color: var(--ink); text-decoration-color: var(--ink); }

.feed-active-count {
  margin-left: auto;
  color: var(--ink-faint);
  font-size: 10px;
}

@media (max-width: 720px) {
  .feed-active-count { margin-left: 0; flex-basis: 100%; }
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -3`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/views/ActiveFilterStrip.tsx app/globals.css
git commit -m "$(cat <<'EOF'
Feed filters: ActiveFilterStrip component

Renders a horizontal strip below the toolbar showing one removable
chip per active dimension (combined values: "country · UK + USA ✕"),
a "clear all" link, and a "N of M results" count on the right. Hidden
when no dimensions have selections (returns null).

Click-to-remove on a chip clears the entire dimension (matches the
mockup).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — `FeedPanel.tsx` component (desktop layout)

**Files:**
- Create: `components/views/FeedPanel.tsx`
- Modify: `app/globals.css` (new panel classes)

- [ ] **Step 1: Create the component**

Create `components/views/FeedPanel.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { ERAS } from "@/lib/data";
import { eraLabel } from "@/lib/helpers";
import { FAMILY_KEYS, FAMILY_LABELS, type FamilyKey } from "@/lib/mood-families";
import {
  buildHref,
  decadeOf,
  dimensionCounts,
  type DimensionKey,
  type FilterState,
} from "@/lib/feed-filters";
import type { AtlasArtist } from "@/lib/atlas-types";

const DECADES = ["1980s", "1990s", "2000s", "2010s", "2020s"];

/** All distinct countries in the dataset, sorted by frequency descending then alphabetical. */
function countryOptions(artists: AtlasArtist[]): string[] {
  const counts = new Map<string, number>();
  for (const a of artists) counts.set(a.country, (counts.get(a.country) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .map(([country]) => country);
}

export interface FeedPanelProps {
  open: boolean;
  artists: AtlasArtist[];
  state: FilterState;
  onChange: (next: FilterState) => void;
  onClose: () => void;
}

function toggleValue(values: string[], v: string): string[] {
  return values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
}

export function FeedPanel({ open, artists, state, onChange, onClose }: FeedPanelProps) {
  const countries = useMemo(() => countryOptions(artists), [artists]);

  const counts = useMemo(() => ({
    era:     dimensionCounts(artists, state, "era",     ERAS.map((e) => e.key)),
    mood:    dimensionCounts(artists, state, "mood",    FAMILY_KEYS as readonly string[] as string[]),
    country: dimensionCounts(artists, state, "country", countries),
    decade:  dimensionCounts(artists, state, "decade",  DECADES),
  }), [artists, state, countries]);

  const toggleDim = (dim: DimensionKey, v: string) => {
    onChange({ ...state, [dim]: toggleValue(state[dim], v) });
  };

  const clearAll = () => {
    onChange({ ...state, era: [], mood: [], country: [], decade: [] });
  };

  const previewHref = buildHref(state);

  return (
    <>
      {open && <div className="feed-panel-backdrop" onClick={onClose} aria-hidden="true" />}
      <div className={`feed-panel ${open ? "is-open" : ""}`} role="dialog" aria-label="Filters" aria-modal={open}>
        <div className="feed-panel-mobile-handle" />
        <div className="feed-panel-mobile-head">
          <span className="feed-panel-mobile-title">Filters</span>
          <button type="button" className="feed-panel-mobile-close" onClick={onClose} aria-label="close">×</button>
        </div>

        <div className="feed-panel-grid">
          <Block
            label="era"
            selectedCount={state.era.length}
            options={ERAS.map((e) => ({ value: e.key, label: e.label, count: counts.era.get(e.key) ?? 0 }))}
            selected={state.era}
            onToggle={(v) => toggleDim("era", v)}
          />

          <Block
            label="mood family"
            selectedCount={state.mood.length}
            options={FAMILY_KEYS.map((k) => ({
              value: k,
              label: FAMILY_LABELS[k as FamilyKey],
              count: counts.mood.get(k) ?? 0,
            }))}
            selected={state.mood}
            onToggle={(v) => toggleDim("mood", v)}
          />

          <Block
            label="country"
            selectedCount={state.country.length}
            options={countries.map((c) => ({ value: c, label: c, count: counts.country.get(c) ?? 0 }))}
            selected={state.country}
            onToggle={(v) => toggleDim("country", v)}
            wide
          />

          <Block
            label="decade"
            selectedCount={state.decade.length}
            options={DECADES.map((d) => ({ value: d, label: d, count: counts.decade.get(d) ?? 0 }))}
            selected={state.decade}
            onToggle={(v) => toggleDim("decade", v)}
            wide
          />
        </div>

        <div className="feed-panel-foot">
          <span className="feed-panel-url" title={previewHref}>URL: <code>{previewHref}</code></span>
          <div className="feed-panel-foot-buttons">
            <button type="button" className="btn" onClick={clearAll}>clear all</button>
            <button type="button" className="btn is-active" onClick={onClose}>done</button>
          </div>
        </div>
      </div>
    </>
  );
}

interface BlockOption { value: string; label: string; count: number; }

interface BlockProps {
  label: string;
  selectedCount: number;
  options: BlockOption[];
  selected: string[];
  onToggle: (value: string) => void;
  wide?: boolean;
}

function Block({ label, selectedCount, options, selected, onToggle, wide }: BlockProps) {
  return (
    <div className={`feed-panel-block ${wide ? "is-wide" : ""}`}>
      <div className="feed-panel-block-head">
        <span className="kicker">[ {label} ]</span>
        {selectedCount > 0 && <span className="feed-panel-block-count">{selectedCount} selected</span>}
      </div>
      <div className="feed-panel-block-chips">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              className={`chip ${active ? "is-active" : ""}`}
              onClick={() => onToggle(o.value)}
              aria-pressed={active}
            >
              <span>{o.label}</span>
              <span className="feed-panel-chip-count">{o.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add panel CSS**

Append to `app/globals.css`:

```css
/* Filter panel — desktop inline expansion below the toolbar. Always
   mounted; visibility driven by .is-open class so we get smooth
   transitions and consistent focus management. */
.feed-panel-backdrop {
  display: none;
}
.feed-panel {
  display: none;
  margin: 0 0 18px;
  padding: 16px 18px;
  background: var(--paper-2);
  border: 1px solid var(--ink);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 4px 4px 0 rgba(0, 0, 0, 0.04);
}
.feed-panel.is-open { display: block; }

.feed-panel-mobile-handle,
.feed-panel-mobile-head { display: none; }

.feed-panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 28px;
}

.feed-panel-block.is-wide { grid-column: 1 / -1; }

.feed-panel-block-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.feed-panel-block-count {
  color: var(--accent);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.feed-panel-block-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.feed-panel-block-chips .chip { font-size: 11px; padding: 4px 9px; }
.feed-panel-chip-count {
  opacity: 0.5;
  margin-left: 5px;
}
.chip.is-active .feed-panel-chip-count { opacity: 0.7; color: #fff8e8; }

.feed-panel-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--rule);
  font-size: 10px;
  gap: 12px;
  flex-wrap: wrap;
}
.feed-panel-url {
  color: var(--ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1 1 240px;
}
.feed-panel-url code { font-family: var(--font-jetbrains-mono), monospace; font-size: 10px; }
.feed-panel-foot-buttons { display: flex; gap: 8px; }
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -3`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/views/FeedPanel.tsx app/globals.css
git commit -m "$(cat <<'EOF'
Feed filters: FeedPanel component (desktop layout)

Always-mounted panel with .is-open driving visibility (display:none →
block) so we keep clean focus management. Renders 4 blocks via a small
local <Block /> sub-component:
  - era (5 options, half-width)
  - mood family (8, half-width)
  - country (~15, full-width — sorted by frequency desc then alpha)
  - decade (5, full-width)

Each chip shows live faceted count via dimensionCounts. Footer shows
the current URL preview + "clear all" + "done". Mobile drawer styles
(handle, backdrop, slide-up) land in Task 7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Wire `Feed.tsx` to URL state + Suspense in `app/page.tsx`

**Files:**
- Modify: `components/views/Feed.tsx` (replace existing toolbar with new components; read URL via useSearchParams)
- Modify: `app/page.tsx` (wrap in Suspense)

- [ ] **Step 1: Wrap `<Feed>` in `<Suspense>`**

Edit `app/page.tsx`. Replace its content with:

```tsx
import { Suspense } from "react";
import { Feed } from "@/components/views/Feed";
import { getArtists } from "@/lib/atlas-queries";

export const revalidate = 300;

export default async function Page() {
  const artists = await getArtists();
  return (
    <Suspense>
      <Feed artists={artists} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Replace `Feed.tsx` to use URL state + new sub-components**

Open `components/views/Feed.tsx`. Replace the file contents with:

```tsx
"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MOOD_COLORS } from "@/lib/data";
import { eraLabel } from "@/lib/helpers";
import {
  EMPTY_STATE,
  activeCount,
  applyFilters,
  buildHref,
  parseSearchParams,
  type DimensionKey,
  type FilterState,
  type SortKey,
} from "@/lib/feed-filters";
import { FeedToolbar } from "./FeedToolbar";
import { ActiveFilterStrip } from "./ActiveFilterStrip";
import { FeedPanel } from "./FeedPanel";
import type { AtlasArtist, AtlasAlbum } from "@/lib/atlas-types";

function initials(name: string): string {
  const words = name.replace(/^The\s+/i, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function moodTag(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function paletteFor(moods: string[]) {
  const h = moods.length && MOOD_COLORS[moods[0]] ? MOOD_COLORS[moods[0]].hue : 260;
  return {
    bg: `linear-gradient(135deg, hsl(${h}, 55%, 35%), hsl(${(h + 35) % 360}, 60%, 22%))`,
    fg: "#fff8e8",
    hue: h,
  };
}

function refAlbum(artist: AtlasArtist): AtlasAlbum {
  return artist.discography.find((d) => d.isReference) || artist.discography[0];
}

function IntensityBar({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 10, letterSpacing: 1, lineHeight: 1 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} style={{ color: i < value ? "var(--ink)" : "var(--rule)" }}>{i < value ? "▰" : "▱"}</span>
      ))}
    </span>
  );
}

function FeedCard({ artist, idx }: { artist: AtlasArtist; idx: number }) {
  const router = useRouter();
  const palette = paletteFor(artist.moods);
  const album = refAlbum(artist);
  const slug = artist.slug;
  const albumArtStyle: CSSProperties = {
    ["--art-bg" as string]: palette.bg,
    ["--art-fg" as string]: palette.fg,
  } as CSSProperties;

  return (
    <article className="feed-card fadeup" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
      <header className="feed-head">
        <Link href={`/band/${slug}`} className="feed-avatar" style={{ background: palette.bg, color: palette.fg }}>
          <span>{initials(artist.name)}</span>
        </Link>
        <Link href={`/band/${slug}`} className="feed-handle" aria-label={artist.name}>
          <div className="feed-handle-name">{artist.name}</div>
          <div className="feed-handle-meta">
            <span>{eraLabel(artist.era).toLowerCase()}</span>
            <span className="ascii-rule">·</span>
            <span>{artist.country}</span>
          </div>
        </Link>
        <button
          className="feed-menu"
          aria-label="more"
          onClick={(e) => { e.preventDefault(); router.push(`/band/${slug}`); }}
        >⋯</button>
      </header>

      <Link href={`/band/${slug}`} className="feed-art" aria-label={`${album.title} cover`}>
        {album.art?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.art.url} alt={`${album.title} cover`} className="feed-art-img" />
        ) : (
          <div className="album-art" style={albumArtStyle}>
            <span className="aa-marker">[{album.year}]</span>
            <div className="aa-title">{album.title}</div>
          </div>
        )}
      </Link>

      <div className="feed-actions">
        <Link href={`/band/${slug}`} className="feed-act" aria-label="open band">↗</Link>
        <span className="feed-act-spacer" />
        <span className="feed-act-year micro">[{album.year}]</span>
      </div>

      <div className="feed-intensity">
        <span className="kicker">intensity</span>
        <IntensityBar value={artist.intensity} />
        <span className="micro">{artist.intensity}/10</span>
      </div>

      <div className="feed-caption">
        <Link href={`/band/${slug}`} className="feed-caption-name">{artist.name}</Link>
        <span className="feed-caption-album">
          {" "}<span className="serif italic">{album.title}</span>
        </span>
        <p className="feed-caption-note serif italic">&ldquo;{artist.desc}&rdquo;</p>
      </div>

      <div className="feed-tags">
        {artist.moods.slice(0, 5).map((m) => {
          const mc = MOOD_COLORS[m];
          if (!mc) return null;
          return (
            <span key={m} className="feed-tag" style={{ color: `hsl(${mc.hue}, 55%, 38%)` }}>
              #{moodTag(mc.label)}
            </span>
          );
        })}
        <span className="feed-tag" style={{ color: "var(--ink-faint)" }}>
          #{moodTag(artist.subgenre)}
        </span>
      </div>
    </article>
  );
}

export function Feed({ artists }: { artists: AtlasArtist[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo<FilterState>(
    () => parseSearchParams(searchParams),
    [searchParams],
  );

  const [panelOpen, setPanelOpen] = useState(false);

  const filtered = useMemo(() => applyFilters(artists, state), [artists, state]);

  const update = useCallback(
    (next: FilterState) => router.replace(buildHref(next), { scroll: false }),
    [router],
  );

  const onSearchChange = useCallback(
    (search: string) => update({ ...state, search }),
    [state, update],
  );
  const onSortChange = useCallback(
    (sort: SortKey) => update({ ...state, sort }),
    [state, update],
  );
  const onClearDimension = useCallback(
    (dim: DimensionKey) => update({ ...state, [dim]: [] }),
    [state, update],
  );
  const onClearAll = useCallback(
    () => update(EMPTY_STATE),
    [update],
  );

  return (
    <div className="wos paper wos-paper-pad" style={{ width: "100%", minHeight: "100%" }}>
      <div className="feed-page">
        <header className="feed-page-head">
          <div className="micro" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>worldofshoegaze.com / feed</span>
            <span>view 01 / feed</span>
          </div>
          <div className="rule-2" style={{ marginTop: 10 }} />
          <div className="feed-page-title">
            <h1 className="feed-h1">
              The Feed<span className="italic" style={{ color: "var(--accent)" }}>.</span>
            </h1>
            <div className="small italic serif feed-page-tagline">
              {filtered.length} of {artists.length} entries · scroll like it&rsquo;s 2012
            </div>
          </div>
        </header>

        <FeedToolbar
          search={state.search}
          sort={state.sort}
          activeCount={activeCount(state)}
          onSearchChange={onSearchChange}
          onSortChange={onSortChange}
          onOpenFilters={() => setPanelOpen((o) => !o)}
        />

        <ActiveFilterStrip
          state={state}
          total={artists.length}
          filtered={filtered.length}
          onClearDimension={onClearDimension}
          onClearAll={onClearAll}
        />

        <FeedPanel
          open={panelOpen}
          artists={artists}
          state={state}
          onChange={update}
          onClose={() => setPanelOpen(false)}
        />

        <div className="feed-stream">
          {filtered.map((a, i) => <FeedCard key={a.slug} artist={a} idx={i} />)}
          {filtered.length === 0 && (
            <div className="feed-empty">
              <div className="kicker">[ nothing matches ]</div>
              <p className="serif italic">try fewer filters</p>
              {activeCount(state) > 0 && (
                <button type="button" className="btn" onClick={onClearAll} style={{ marginTop: 12 }}>
                  clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="feed-footer">
          <div className="ascii-rule" style={{ fontSize: 10 }}>================================ end of feed ================================</div>
          <div className="micro" style={{ marginTop: 14, display: "flex", justifyContent: "space-between" }}>
            <span>maintained by one obsessive</span>
            <span><a href="#">guestbook</a> · <a href="#">about</a> · <a href="#">rss</a></span>
          </div>
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + build**

Run:
```bash
npx tsc --noEmit && npm run build 2>&1 | tail -8
```
Expected: clean. The build output should still show `/` as a static page (not dynamic) — Suspense lets the page stay statically rendered while the inner Feed reads searchParams on the client.

- [ ] **Step 4: Restart prod and verify routes**

```bash
PID=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oP 'pid=\K\d+'); [ -n "$PID" ] && kill "$PID" && sleep 1
nohup npm start -- -H 0.0.0.0 -p 3000 > /tmp/wos-prod.log 2>&1 &
until grep -q "Ready in" /tmp/wos-prod.log 2>/dev/null; do sleep 1; done

# Default view
curl -s -o /dev/null -w "/ → %{http_code}\n" http://localhost:3000/

# Filtered view (the URL works server-side because of SSG + client-side filter)
curl -s -o /dev/null -w "/?era=first_wave → %{http_code}\n" "http://localhost:3000/?era=first_wave"

# Toolbar v2 + filters button rendered
curl -s http://localhost:3000/ | grep -oE "feed-toolbar2|filters" | sort | uniq -c
```

Expected: both routes 200; HTML contains `feed-toolbar2` and `filters` matches.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/views/Feed.tsx
git commit -m "$(cat <<'EOF'
Feed filters: wire URL state + new toolbar/strip/panel

Feed.tsx becomes a thin URL hub:
- reads useSearchParams() → parseSearchParams() → FilterState
- applyFilters(artists, state) once via useMemo
- fans state down to <FeedToolbar /> + <ActiveFilterStrip /> +
  <FeedPanel />, each with a single onChange callback
- writes back via router.replace(buildHref(next), { scroll: false })

Drops the in-place chip + sort row (replaced by FeedToolbar). The
empty state ("nothing matches") now also shows a "clear all filters"
button when filters are active.

app/page.tsx wraps <Feed> in <Suspense> as required by Next.js for
the useSearchParams hook.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Mobile drawer styles for the panel

**Files:**
- Modify: `app/globals.css` (add mobile-only `@media (max-width: 720px)` rules for the panel)

- [ ] **Step 1: Append mobile drawer styles**

Append to `app/globals.css`:

```css
/* Filter panel — mobile bottom drawer.
   Below 720px the inline panel becomes a fixed-bottom sheet that slides
   up when .is-open. A semi-opaque backdrop dims the feed behind it. */
@media (max-width: 720px) {
  .feed-panel-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(8, 6, 12, 0.45);
    z-index: 90;
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }

  .feed-panel {
    display: block;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    border: none;
    border-top: 1px solid var(--ink);
    border-radius: 12px 12px 0 0;
    max-height: 80vh;
    overflow-y: auto;
    transform: translateY(100%);
    transition: transform 320ms var(--motion-ease);
    z-index: 100;
    padding: 12px 16px 28px;
    box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.18);
  }
  .feed-panel.is-open { transform: translateY(0); }

  .feed-panel-mobile-handle {
    display: block;
    width: 36px;
    height: 4px;
    background: var(--rule);
    border-radius: 2px;
    margin: 0 auto 10px;
  }
  .feed-panel-mobile-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 12px;
  }
  .feed-panel-mobile-title {
    font-family: var(--font-instrument-serif), Georgia, serif;
    font-style: italic;
    font-size: 22px;
    color: var(--ink);
  }
  .feed-panel-mobile-close {
    background: none;
    border: none;
    color: var(--ink-soft);
    font-size: 22px;
    line-height: 1;
    padding: 4px 8px;
    cursor: pointer;
  }

  .feed-panel-grid { grid-template-columns: 1fr; gap: 16px; }
  .feed-panel-block.is-wide { grid-column: 1; }

  .feed-panel-foot {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .feed-panel-url { display: none; }
  .feed-panel-foot-buttons .btn { flex: 1; padding: 10px 12px; }
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build 2>&1 | tail -3`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
Feed filters: mobile bottom-drawer for the panel

Below 720px the filter panel becomes a fixed-bottom sheet that slides
up via translateY(100% → 0) when .is-open. A blurred backdrop covers
the feed; tapping it (or the × in the drawer head) closes the panel.

The panel-grid collapses to a single column; both wide blocks (country,
decade) become single-column. URL preview is hidden on mobile (too long
to fit). Footer buttons stretch full-width.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Acceptance + push

**Files:** none (verification + push)

- [ ] **Step 1: Final typecheck + tests + build**

Run:
```bash
npx tsc --noEmit && npm test && npm run build 2>&1 | tail -10
```
Expected: typecheck clean. Tests `# pass 27` (or whatever the actual cumulative count is — the point is no failures). Build succeeds; route table shows `/` as static (not dynamic).

- [ ] **Step 2: Restart prod**

```bash
PID=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oP 'pid=\K\d+'); [ -n "$PID" ] && kill "$PID" && sleep 1
nohup npm start -- -H 0.0.0.0 -p 3000 > /tmp/wos-prod.log 2>&1 &
until grep -q "Ready in" /tmp/wos-prod.log 2>/dev/null; do sleep 1; done
```

- [ ] **Step 3: Smoke-check the routes**

```bash
for r in / "/?era=first_wave" "/?country=UK,USA&sort=year" /graph /timeline /random /band/slowdive; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${r}")
  echo "${r} → ${CODE}"
done
```

Expected: every line ends in `200` or `307` (random redirects).

- [ ] **Step 4: Walk through acceptance manually**

In a desktop browser at http://localhost:3000 — verify the spec's acceptance criteria:

- Toolbar shows search + `[filters]` button + 3 sort buttons. No filters visible yet.
- Click `[filters]` → panel expands inline below the toolbar.
- Panel shows 4 blocks: era (5), mood family (8), country (~15), decade (5). Each chip has a count next to its label.
- Click a chip (e.g. "First Wave"): chip turns oxblood; URL updates to `/?era=first_wave`; active strip appears showing `era · First Wave ✕`; `[filters]` button shows badge `1`; result count updates; feed re-renders.
- Click another chip in a different dimension: AND filter, count updates, URL grows.
- Click two chips in the same dimension: OR filter (UK OR USA both included).
- Click the `era · First Wave ✕` chip in the active strip → era cleared, URL drops the `era=` param.
- Click "clear all" in the strip → everything cleared, strip vanishes, URL is `/`.
- Reload `?era=first_wave&country=UK` → state persists, chips render selected.
- Browser back / forward → walks through filter URLs.
- Search "slow" → matches shown; combine with filters works.
- Sort buttons reorder feed; selected sort persists in URL.

In a mobile-emulated browser (390 viewport) — additionally verify:
- `[filters]` button click slides up a bottom drawer with backdrop.
- Tap backdrop or × in drawer head closes it.
- Filter chips work the same; feed below is dimmed under the backdrop.

Fix anything that's broken before the final commit.

- [ ] **Step 5: Push**

```bash
git push origin main 2>&1 | tail -3
```

Expected: clean push to `origin/main`.

---

## Acceptance summary

After Task 8 you should have:

- A new `[filters · N]` button on the Feed homepage.
- 4-dimension filter panel: era, mood family, country, decade — all multi-select chips with live faceted counts.
- Active filter strip below the toolbar with removable chips + clear-all + result count.
- URL search params as the single source of truth (`/?era=first_wave&country=UK,USA`).
- Mobile bottom drawer for the panel.
- Filter logic 100% tested via `node:test`.
- No regressions on `/graph`, `/timeline`, `/random`, `/band/<slug>`.
