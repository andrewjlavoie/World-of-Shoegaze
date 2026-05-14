# Graph view implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/graph` route — a single zoomable, pannable atlas where 119 bands appear as album-art tiles in 8 implied mood gardens, no rings or labels. Hover/tap shows a side panel; click navigates to the band page.

**Architecture:** A Server Component (`app/graph/page.tsx`) fetches artists from MongoDB Atlas via the existing `getArtists()` query and passes them to a Client Component (`components/views/Graph.tsx`). The client builds a d3-force simulation that pulls each band toward its sub-mood centroid (strong) and family centroid (medium), runs ~300 ticks synchronously on mount, then renders tiles as absolutely-positioned `<button>` elements in a CSS-transformed pan/zoom container. `GraphPanel.tsx` shows band details on the side (desktop) or as a bottom drawer (mobile). A pure `lib/mood-families.ts` module owns the 8-family taxonomy and centroids; `lib/graph-layout.ts` owns the simulation. Both pure libs get unit tests via Node's built-in test runner (`node:test` via `tsx`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, MongoDB Atlas (existing), `d3-force` (new dep, ~30KB gzipped), `node:test` for unit testing pure logic, hand-rolled pan/zoom (mirrors `Globe.tsx` pattern), no canvas/SVG (HTML + CSS).

---

## File structure

**New files:**

| Path | Responsibility |
|---|---|
| `lib/mood-families.ts` | 8-family taxonomy: maps each raw mood key → family, family centroids in world coords, sub-mood offsets within each family. Pure, no React. |
| `lib/mood-families.test.ts` | Verifies all 21 raw moods map; centroids and offsets exist for every key. |
| `lib/graph-layout.ts` | `layoutPositions(artists, opts)` runs a d3-force simulation N ticks and returns `Map<slug, {x, y}>`. Pure, no React. |
| `lib/graph-layout.test.ts` | Verifies all artists get positions; positions are finite; output is deterministic for the same input. |
| `app/graph/page.tsx` | Server Component. `revalidate = 300`. Fetches `getArtists()`, renders `<Graph artists={artists} />`. |
| `components/views/Graph.tsx` | Client Component. Owns simulation, pan/zoom, hover/focus state. Renders tiles + controls + panel. |
| `components/views/GraphPanel.tsx` | Side panel (desktop) / bottom drawer (mobile). Two states: focused band card, or default atlas-intro. |

**Modified files:**

| Path | Change |
|---|---|
| `package.json` | Add `d3-force` + `@types/d3-force` deps; add `test` script. |
| `components/SiteNav.tsx` | Add `{ key: "/graph", label: "graph" }` between `feed` and `globe`. |
| `app/globals.css` | New section `Graph view` with `.gx-*` classes (canvas, world, tile, controls, compass, panel, drawer, focus states). |

---

## Task 1 — Add d3-force + test runner setup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install d3-force and types**

Run:
```bash
npm install d3-force
npm install -D @types/d3-force
```

Expected: both packages added; `package.json` updated; no audit errors blocking install.

- [ ] **Step 2: Add `test` script to package.json**

Edit `package.json` `scripts` block. Insert after `"typecheck"`. The script
points at the only test file that will exist after Task 2:

```json
"test": "tsx --test lib/mood-families.test.ts"
```

The full `scripts` block should now read:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "tsx --test lib/mood-families.test.ts",
  "seed": "tsx --env-file=.env.local scripts/seed.ts",
  "seed:export": "tsx scripts/export-seed-json.ts"
}
```

(The script will be expanded in Task 3 to include `lib/graph-layout.test.ts`.)

- [ ] **Step 3: Verify the test runner is wired**

`npm test` will fail right now (mood-families.test.ts doesn't exist yet),
so verify the toolchain via a temp smoke file invoked directly with npx:

```bash
cat > /tmp/wos-smoke.test.ts <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
test("tsx --test runs TS files", () => { assert.equal(1 + 1, 2); });
EOF
npx tsx --test /tmp/wos-smoke.test.ts
rm /tmp/wos-smoke.test.ts
```

Expected: `# pass 1`, exit 0. If this works, the runner is wired
correctly and `npm test` will succeed once Task 2 lands.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
Graph: add d3-force dependency + node:test runner

Adds d3-force (and @types/d3-force) for the upcoming /graph view's
force-directed mood-cluster layout. Adds an `npm test` script wired to
Node's built-in test runner via tsx — no Vitest/Jest, no new deps. Test
files for graph-layout and mood-families land in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Mood family taxonomy (`lib/mood-families.ts`)

**Files:**
- Create: `lib/mood-families.ts`
- Create: `lib/mood-families.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/mood-families.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MOOD_TO_BANDS } from "./data";
import {
  FAMILY_KEYS,
  FAMILY_LABELS,
  MOOD_FAMILIES,
  FAMILY_CENTROIDS,
  SUB_MOOD_OFFSETS,
  WORLD_BOUNDS,
} from "./mood-families";

test("FAMILY_KEYS has exactly 8 entries", () => {
  assert.equal(FAMILY_KEYS.length, 8);
});

test("every family in FAMILY_KEYS has a label and centroid", () => {
  for (const f of FAMILY_KEYS) {
    assert.ok(FAMILY_LABELS[f], `missing label for ${f}`);
    assert.ok(FAMILY_CENTROIDS[f], `missing centroid for ${f}`);
    const c = FAMILY_CENTROIDS[f];
    assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y), `non-finite centroid for ${f}`);
  }
});

test("every raw mood in lib/data.ts MOOD_TO_BANDS maps to a known family", () => {
  for (const mood of Object.keys(MOOD_TO_BANDS)) {
    const family = MOOD_FAMILIES[mood];
    assert.ok(family, `MOOD_FAMILIES missing entry for raw mood "${mood}"`);
    assert.ok(FAMILY_KEYS.includes(family), `family "${family}" for "${mood}" not in FAMILY_KEYS`);
  }
});

test("every raw mood has a sub-mood offset", () => {
  for (const mood of Object.keys(MOOD_TO_BANDS)) {
    const off = SUB_MOOD_OFFSETS[mood];
    assert.ok(off, `SUB_MOOD_OFFSETS missing entry for "${mood}"`);
    assert.ok(Number.isFinite(off.dx) && Number.isFinite(off.dy), `non-finite offset for "${mood}"`);
  }
});

test("every family centroid sits inside WORLD_BOUNDS", () => {
  for (const f of FAMILY_KEYS) {
    const c = FAMILY_CENTROIDS[f];
    assert.ok(c.x >= WORLD_BOUNDS.minX && c.x <= WORLD_BOUNDS.maxX, `${f} x out of bounds`);
    assert.ok(c.y >= WORLD_BOUNDS.minY && c.y <= WORLD_BOUNDS.maxY, `${f} y out of bounds`);
  }
});
```

- [ ] **Step 2: Verify the test fails**

Run:
```bash
npm test
```

Expected: failure — `Cannot find module './mood-families'` or similar.

- [ ] **Step 3: Implement `lib/mood-families.ts`**

Create `lib/mood-families.ts`:

```ts
// Mood family taxonomy + spatial layout for the graph view.
// 21 raw mood keys collapse into 8 family gardens. Each family has a
// centroid in unitless world coordinates (≈ 600×400 atlas), and each raw
// mood has an offset within its family so sub-mood clumps form inside.
//
// Pure module — no React, no I/O. Exists so the layout (lib/graph-layout.ts)
// and the panel UI can share the same source of truth.

export const FAMILY_KEYS = [
  "dreampop_bliss",
  "noise_chaos",
  "heavy_doom",
  "dark_gothic",
  "anthemic_yearning",
  "lofi_modern",
  "twee_strange",
  "japanese_gaze",
] as const;

export type FamilyKey = (typeof FAMILY_KEYS)[number];

export const FAMILY_LABELS: Record<FamilyKey, string> = {
  dreampop_bliss: "Dreampop & Bliss",
  noise_chaos: "Noise & Chaos",
  heavy_doom: "Heavy & Doom",
  dark_gothic: "Dark & Gothic",
  anthemic_yearning: "Anthemic & Yearning",
  lofi_modern: "Lo-fi & Modern",
  twee_strange: "Twee & Strange",
  japanese_gaze: "Japanese Gaze",
};

// Maps every raw mood key (cf. lib/data.ts MOOD_TO_BANDS) to a family.
export const MOOD_FAMILIES: Record<string, FamilyKey> = {
  // Dreampop & Bliss
  euphoric_bliss: "dreampop_bliss",
  ethereal_celestial: "dreampop_bliss",
  dream_pop_warmth: "dreampop_bliss",
  wistful_dreamers: "dreampop_bliss",
  ambient_drift: "dreampop_bliss",

  // Noise & Chaos
  noisy_chaotic: "noise_chaos",
  ecstatic_catharsis: "noise_chaos",
  volatile_violent: "noise_chaos",

  // Heavy & Doom
  hypnotic_heavy: "heavy_doom",
  apocalyptic_doom: "heavy_doom",
  muscular_brooding: "heavy_doom",
  sun_bleached_sludge: "heavy_doom",

  // Dark & Gothic
  dark_gothic: "dark_gothic",
  depressive_beauty: "dark_gothic",
  psychedelic_hypnotic: "dark_gothic",

  // Anthemic & Yearning
  yearning_anthemic: "anthemic_yearning",

  // Lo-fi & Modern
  lo_fi_bedroom: "lofi_modern",
  modern_anguish: "lofi_modern",

  // Twee & Strange
  nostalgic_jangly: "twee_strange",
  experimental_strange: "twee_strange",

  // Japanese Gaze
  japanese_gaze: "japanese_gaze",
};

// Family centroids in unitless world coordinates.
// Roughly arranged as the brainstorm "tight" mockup: top row (3),
// middle row (4), bottom row (1).
export const FAMILY_CENTROIDS: Record<FamilyKey, { x: number; y: number }> = {
  dreampop_bliss:    { x: 130, y: 130 },
  noise_chaos:       { x: 290, y: 110 },
  heavy_doom:        { x: 450, y: 130 },
  dark_gothic:       { x:  90, y: 250 },
  anthemic_yearning: { x: 250, y: 250 },
  lofi_modern:       { x: 380, y: 250 },
  twee_strange:      { x: 190, y: 350 },
  japanese_gaze:     { x: 490, y: 320 },
};

// Sub-mood offsets relative to the family centroid. Sub-clumps within
// a family land at (familyCentroid + subMoodOffset).
export const SUB_MOOD_OFFSETS: Record<string, { dx: number; dy: number }> = {
  // Dreampop & Bliss internals
  euphoric_bliss:       { dx: -30, dy: -10 },
  ethereal_celestial:   { dx:   0, dy: -30 },
  dream_pop_warmth:     { dx:  30, dy: -10 },
  wistful_dreamers:     { dx: -15, dy:  25 },
  ambient_drift:        { dx:  20, dy:  25 },

  // Noise & Chaos internals
  noisy_chaotic:        { dx: -20, dy:   0 },
  ecstatic_catharsis:   { dx:  10, dy:  15 },
  volatile_violent:     { dx:  20, dy: -10 },

  // Heavy & Doom internals
  hypnotic_heavy:       { dx: -20, dy: -15 },
  apocalyptic_doom:     { dx:  20, dy: -15 },
  muscular_brooding:    { dx: -15, dy:  20 },
  sun_bleached_sludge:  { dx:  20, dy:  20 },

  // Dark & Gothic internals
  dark_gothic:          { dx: -20, dy: -10 },
  depressive_beauty:    { dx:  15, dy: -10 },
  psychedelic_hypnotic: { dx:  -5, dy:  20 },

  // Anthemic & Yearning (single sub)
  yearning_anthemic:    { dx:   0, dy:   0 },

  // Lo-fi & Modern internals
  lo_fi_bedroom:        { dx: -20, dy:   0 },
  modern_anguish:       { dx:  20, dy:   0 },

  // Twee & Strange internals
  nostalgic_jangly:     { dx: -15, dy:   0 },
  experimental_strange: { dx:  15, dy:   0 },

  // Japanese Gaze (single sub)
  japanese_gaze:        { dx:   0, dy:   0 },
};

// Bounding box of all family centroids (with padding) — used for fit-all.
export const WORLD_BOUNDS = { minX: 50, maxX: 540, minY: 80, maxY: 380 };

// Fallback family for artists with no moods. Sits in the
// "miscellany" cluster (Twee & Strange — already an oddities catch-all).
export const FALLBACK_FAMILY: FamilyKey = "twee_strange";

/**
 * Returns the family for an artist's primary mood, or FALLBACK_FAMILY
 * when the artist has no moods or its primary mood is unknown.
 */
export function familyFor(primaryMood: string | undefined): FamilyKey {
  if (!primaryMood) return FALLBACK_FAMILY;
  return MOOD_FAMILIES[primaryMood] ?? FALLBACK_FAMILY;
}

/**
 * Resolves the absolute world coordinate where a given primary mood's
 * sub-cluster sits. Used as the "strong attractor" in the force layout
 * AND for seeding initial node positions before simulation.
 */
export function subMoodCentroid(primaryMood: string | undefined): { x: number; y: number } {
  const family = familyFor(primaryMood);
  const fc = FAMILY_CENTROIDS[family];
  const off = primaryMood ? SUB_MOOD_OFFSETS[primaryMood] ?? { dx: 0, dy: 0 } : { dx: 0, dy: 0 };
  return { x: fc.x + off.dx, y: fc.y + off.dy };
}
```

- [ ] **Step 4: Verify tests pass**

Run:
```bash
npm test
```

Expected: `# pass 5`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/mood-families.ts lib/mood-families.test.ts
git commit -m "$(cat <<'EOF'
Graph: mood family taxonomy + family centroids

lib/mood-families.ts collapses the 21 raw mood keys into 8 family
gardens (Dreampop & Bliss, Noise & Chaos, Heavy & Doom, Dark & Gothic,
Anthemic & Yearning, Lo-fi & Modern, Twee & Strange, Japanese Gaze).
Each family has a centroid in unitless world coords; each raw mood has
an offset relative to its family centroid so sub-mood clumps form
inside. Pure module — consumed by lib/graph-layout.ts and the upcoming
graph view.

Tests verify every raw mood maps to a known family, every family has a
centroid + label, and every centroid sits inside WORLD_BOUNDS.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Force layout (`lib/graph-layout.ts`)

**Files:**
- Create: `lib/graph-layout.ts`
- Create: `lib/graph-layout.test.ts`
- Modify: `package.json` (extend `test` script)

- [ ] **Step 0: Extend the test script to include the new test file**

Edit `package.json`. Update the `test` script to enumerate both test files:

```json
"test": "tsx --test lib/mood-families.test.ts lib/graph-layout.test.ts"
```

(After this change, `npm test` will fail until step 1 creates the file —
expected.)

- [ ] **Step 1: Write the failing tests**

Create `lib/graph-layout.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AtlasArtist } from "./atlas-types";
import { layoutPositions } from "./graph-layout";
import { FAMILY_CENTROIDS, familyFor } from "./mood-families";

function fakeArtist(slug: string, primaryMood: string): AtlasArtist {
  return {
    schemaVersion: 1,
    slug,
    name: slug,
    country: "UK",
    era: "first_wave",
    lat: 0,
    lng: 0,
    intensity: 5,
    subgenre: "shoegaze",
    desc: "",
    moods: [primaryMood],
    discography: [
      { slug: "ref", title: "Ref", year: 1992, kind: "LP", isReference: true },
    ],
    listen: {},
  };
}

test("layoutPositions returns a position for every artist", () => {
  const artists = [
    fakeArtist("a", "euphoric_bliss"),
    fakeArtist("b", "wistful_dreamers"),
    fakeArtist("c", "apocalyptic_doom"),
  ];
  const positions = layoutPositions(artists);
  assert.equal(positions.size, 3);
  assert.ok(positions.has("a"));
  assert.ok(positions.has("b"));
  assert.ok(positions.has("c"));
});

test("layoutPositions output is finite (no NaN/Infinity)", () => {
  const artists = Array.from({ length: 50 }, (_, i) =>
    fakeArtist(`a${i}`, ["euphoric_bliss", "noisy_chaotic", "apocalyptic_doom", "yearning_anthemic"][i % 4]),
  );
  const positions = layoutPositions(artists);
  for (const [slug, pos] of positions) {
    assert.ok(Number.isFinite(pos.x), `${slug} x is not finite: ${pos.x}`);
    assert.ok(Number.isFinite(pos.y), `${slug} y is not finite: ${pos.y}`);
  }
});

test("layoutPositions is deterministic for the same input", () => {
  const artists = [
    fakeArtist("a", "euphoric_bliss"),
    fakeArtist("b", "noisy_chaotic"),
    fakeArtist("c", "apocalyptic_doom"),
  ];
  const p1 = layoutPositions(artists);
  const p2 = layoutPositions(artists);
  for (const slug of p1.keys()) {
    assert.equal(p1.get(slug)!.x, p2.get(slug)!.x, `${slug} x differs between runs`);
    assert.equal(p1.get(slug)!.y, p2.get(slug)!.y, `${slug} y differs between runs`);
  }
});

test("artists with the same family cluster within ~80 units of the family centroid", () => {
  const artists = Array.from({ length: 5 }, (_, i) =>
    fakeArtist(`heavy${i}`, "apocalyptic_doom"),
  );
  const positions = layoutPositions(artists);
  const fc = FAMILY_CENTROIDS[familyFor("apocalyptic_doom")];
  for (const [slug, pos] of positions) {
    const dist = Math.hypot(pos.x - fc.x, pos.y - fc.y);
    assert.ok(dist < 80, `${slug} ended up ${dist.toFixed(1)} units from centroid (expected < 80)`);
  }
});

test("artist with empty moods falls back to a family centroid (no NaN)", () => {
  const artist: AtlasArtist = { ...fakeArtist("orphan", ""), moods: [] };
  const positions = layoutPositions([artist]);
  const pos = positions.get("orphan")!;
  assert.ok(Number.isFinite(pos.x) && Number.isFinite(pos.y));
});
```

- [ ] **Step 2: Verify tests fail**

Run:
```bash
npm test
```

Expected: failure — `Cannot find module './graph-layout'`.

- [ ] **Step 3: Implement `lib/graph-layout.ts`**

Create `lib/graph-layout.ts`:

```ts
// Force-directed layout for the graph view.
// Pure logic — runs a synchronous d3-force simulation for a fixed budget
// of ticks and returns final {x, y} per artist slug. No animation, no
// React, no I/O. The Graph component calls this once on mount and renders
// the static result.

import {
  forceCollide,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import type { AtlasArtist } from "./atlas-types";
import {
  FALLBACK_FAMILY,
  FAMILY_CENTROIDS,
  type FamilyKey,
  familyFor,
  SUB_MOOD_OFFSETS,
} from "./mood-families";

export interface NodePos { x: number; y: number; }

interface SimNode extends SimulationNodeDatum {
  slug: string;
  family: FamilyKey;
  familyX: number;
  familyY: number;
  subFamilyX: number;
  subFamilyY: number;
}

const DEFAULT_TICKS = 300;
const TILE_RADIUS = 22;       // ≈ tile size 40px + collision padding
const SUB_FORCE = 0.9;         // strong attraction to sub-mood centroid
const FAMILY_FORCE = 0.3;      // medium attraction to family centroid
const CHARGE = -8;             // light universal repulsion

/**
 * Cheap deterministic hash of a string → small non-negative integer.
 * Used to seed initial positions so the simulation produces the same
 * layout on every call for the same input.
 */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function layoutPositions(
  artists: AtlasArtist[],
  opts: { ticks?: number } = {},
): Map<string, NodePos> {
  const ticks = opts.ticks ?? DEFAULT_TICKS;

  const nodes: SimNode[] = artists.map((a) => {
    const primary = a.moods[0];
    const family = familyFor(primary);
    const fc = FAMILY_CENTROIDS[family];
    const off = primary ? (SUB_MOOD_OFFSETS[primary] ?? { dx: 0, dy: 0 }) : { dx: 0, dy: 0 };
    const sx = fc.x + off.dx;
    const sy = fc.y + off.dy;
    const h = hashString(a.slug);
    // Seed positions near the sub-mood centroid with a small deterministic jitter.
    return {
      slug: a.slug,
      family,
      familyX: fc.x,
      familyY: fc.y,
      subFamilyX: sx,
      subFamilyY: sy,
      x: sx + ((h % 11) - 5),
      y: sy + (((h >> 4) % 11) - 5),
      vx: 0,
      vy: 0,
    };
  });

  const sim = forceSimulation<SimNode>(nodes)
    .force("subX", forceX<SimNode>((d) => d.subFamilyX).strength(SUB_FORCE))
    .force("subY", forceY<SimNode>((d) => d.subFamilyY).strength(SUB_FORCE))
    .force("famX", forceX<SimNode>((d) => d.familyX).strength(FAMILY_FORCE))
    .force("famY", forceY<SimNode>((d) => d.familyY).strength(FAMILY_FORCE))
    .force("charge", forceManyBody<SimNode>().strength(CHARGE))
    .force("collide", forceCollide<SimNode>(TILE_RADIUS))
    .alphaDecay(0.05)
    .stop();

  for (let i = 0; i < ticks; i++) sim.tick();

  const out = new Map<string, NodePos>();
  for (const n of nodes) {
    out.set(n.slug, { x: n.x ?? 0, y: n.y ?? 0 });
  }
  return out;
}

// Re-export FALLBACK_FAMILY at module level for any UI consumer that
// wants to know "this artist landed in the catch-all".
export { FALLBACK_FAMILY };
```

- [ ] **Step 4: Verify tests pass**

Run:
```bash
npm test
```

Expected: `# pass 10` (5 from mood-families + 5 from graph-layout).

If the cluster-distance test fails, the simulation didn't converge. The `< 80` threshold is generous; if it still fails, increase `DEFAULT_TICKS` to 500 and re-run.

- [ ] **Step 5: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/graph-layout.ts lib/graph-layout.test.ts package.json
git commit -m "$(cat <<'EOF'
Graph: force-directed layout (lib/graph-layout.ts)

layoutPositions(artists, opts) seeds each artist near its sub-mood
centroid (deterministic via slug hash), runs a d3-force simulation for
~300 ticks with strong sub-mood pull + medium family pull + light
repulsion + collision (no overlap), and returns a Map<slug, {x,y}>.
Synchronous, no animation; consumed by the Graph view on mount.

Tests cover: every artist gets a position; finite outputs only;
deterministic across runs; bands within a family cluster within ~80
units of their centroid; empty moods fall back without producing NaN.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Skeleton route + nav link

**Files:**
- Create: `app/graph/page.tsx`
- Create: `components/views/Graph.tsx`
- Modify: `components/SiteNav.tsx`

- [ ] **Step 1: Create the Server Component page**

Create `app/graph/page.tsx`:

```tsx
import { Graph } from "@/components/views/Graph";
import { getArtists } from "@/lib/atlas-queries";

// ISR — match the other Atlas-backed pages.
export const revalidate = 300;

export default async function Page() {
  const artists = await getArtists();
  return <Graph artists={artists} />;
}
```

- [ ] **Step 2: Create the Client Component skeleton**

Create `components/views/Graph.tsx`:

```tsx
"use client";

import type { AtlasArtist } from "@/lib/atlas-types";

export function Graph({ artists }: { artists: AtlasArtist[] }) {
  return (
    <div style={{ padding: 32, color: "var(--ink)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
      Graph view — {artists.length} artists loaded.
    </div>
  );
}
```

- [ ] **Step 3: Add /graph to the site nav**

Edit `components/SiteNav.tsx`. Find the `ROUTES` array (top of file). Insert `{ key: "/graph", label: "graph" }` between `feed` and `globe`:

```ts
const ROUTES = [
  { key: "/",         label: "feed" },
  { key: "/graph",    label: "graph" },
  { key: "/globe",    label: "globe" },
  { key: "/timeline", label: "timeline" },
  { key: "/tonight",  label: "tonight" },
];
```

- [ ] **Step 4: Build to verify**

Run:
```bash
npm run build
```

Expected: build succeeds; output route table includes `/graph` with `Revalidate 5m`.

- [ ] **Step 5: Verify the route serves**

Start the prod server (or run dev):
```bash
PID=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oP 'pid=\K\d+'); [ -n "$PID" ] && kill "$PID" && sleep 1
nohup npm start -- -H 0.0.0.0 -p 3000 > /tmp/wos-prod.log 2>&1 &
until grep -q "Ready in" /tmp/wos-prod.log; do sleep 1; done
curl -s http://localhost:3000/graph | grep -oE "Graph view|119 artists" | head -2
```

Expected output includes `Graph view` and `119 artists` (assuming Atlas is reachable).

- [ ] **Step 6: Commit**

```bash
git add app/graph/page.tsx components/views/Graph.tsx components/SiteNav.tsx
git commit -m "$(cat <<'EOF'
Graph: route skeleton + nav link

app/graph/page.tsx is an async Server Component that fetches artists
from Atlas and hands them to <Graph artists={...} />. The Graph client
component currently just prints the artist count — tile rendering, pan,
zoom, hover, and panel land in subsequent commits.

SiteNav gains a "graph" link between feed and globe.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Render static tiles + canvas chrome

**Files:**
- Modify: `components/views/Graph.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add the graph CSS section**

Edit `app/globals.css`. Append this entire block at the end of the file (just before the closing of any final `}`, i.e. at the very bottom of the file):

```css
/* ------------------------------------------------------------------ */
/* Graph view — atlas of mood gardens                                 */
/* ------------------------------------------------------------------ */

.gx-page {
  position: relative;
  width: 100vw;
  height: calc(100vh - 50px);
  overflow: hidden;
  background: linear-gradient(180deg, #1a1814 0%, #100e0c 100%);
  color: #f4ede4;
  font-family: var(--font-jetbrains-mono), monospace;
}

/* Faint star-field, mirrors the Globe view background. */
.gx-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.30), transparent),
    radial-gradient(1px 1px at 80% 70%, rgba(255,255,255,0.25), transparent),
    radial-gradient(1px 1px at 50% 10%, rgba(255,255,255,0.28), transparent),
    radial-gradient(1px 1px at 10% 80%, rgba(255,255,255,0.25), transparent),
    radial-gradient(1px 1px at 90% 20%, rgba(255,255,255,0.20), transparent),
    radial-gradient(1px 1px at 65% 45%, rgba(255,255,255,0.18), transparent),
    radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.22), transparent);
}

/* Pan/zoom container — lives at viewport scale. The .gx-world inside
   gets transform: scale(z) translate(...) on user input. */
.gx-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.gx-viewport.is-dragging { cursor: grabbing; }

.gx-world {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
}

/* A tile = one artist. Absolutely positioned at the layout coords. */
.gx-tile {
  position: absolute;
  width: 40px;
  height: 40px;
  padding: 0;
  margin: -20px 0 0 -20px; /* center on its (x, y) */
  background: var(--art-bg, #2d3f5f);
  border: 1px solid rgba(0, 0, 0, 0.4);
  cursor: pointer;
  overflow: hidden;
  transition: transform 200ms var(--motion-ease), opacity 200ms var(--motion-ease), box-shadow 200ms var(--motion-ease), border-color 200ms var(--motion-ease);
  -webkit-tap-highlight-color: transparent;
}
.gx-tile img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.gx-tile-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 12px;
  font-weight: 500;
  color: #fff8e8;
  letter-spacing: 0.05em;
}

/* Compass ornament, top-left. */
.gx-compass {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 4;
  background: rgba(8, 6, 12, 0.78);
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-family: var(--font-instrument-serif), serif;
  font-style: italic;
  font-size: 12px;
  color: rgba(255, 248, 232, 0.85);
}
```

- [ ] **Step 2: Replace the Graph component with the static-tiles version**

Replace the contents of `components/views/Graph.tsx` with:

```tsx
"use client";

import { useMemo, type CSSProperties } from "react";
import { layoutPositions } from "@/lib/graph-layout";
import { MOOD_COLORS } from "@/lib/data";
import type { AtlasArtist, AtlasAlbum } from "@/lib/atlas-types";

function refAlbum(a: AtlasArtist): AtlasAlbum {
  return a.discography.find((d) => d.isReference) ?? a.discography[0];
}

function tileBg(moods: string[]): string {
  const hue = moods.length && MOOD_COLORS[moods[0]] ? MOOD_COLORS[moods[0]].hue : 260;
  return `linear-gradient(135deg, hsl(${hue}, 55%, 35%), hsl(${(hue + 35) % 360}, 60%, 22%))`;
}

function initials(name: string): string {
  const w = name.replace(/^The\s+/i, "").split(/\s+/).filter(Boolean);
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
}

export function Graph({ artists }: { artists: AtlasArtist[] }) {
  // Compute positions once — input doesn't change in the lifetime of the page.
  const positions = useMemo(() => layoutPositions(artists), [artists]);

  return (
    <div className="gx-page">
      <div className="gx-stars" />
      <div className="gx-compass">an atlas</div>

      <div className="gx-viewport">
        <div className="gx-world" style={{ width: 600, height: 400 }}>
          {artists.map((a) => {
            const pos = positions.get(a.slug);
            if (!pos) return null;
            const album = refAlbum(a);
            const tileStyle: CSSProperties = {
              left: pos.x,
              top: pos.y,
              ["--art-bg" as string]: tileBg(a.moods),
            } as CSSProperties;
            return (
              <button
                key={a.slug}
                type="button"
                className="gx-tile"
                style={tileStyle}
                aria-label={`${a.name} — ${album.title}`}
              >
                {album.art?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.art.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="gx-tile-fallback">{initials(a.name)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build to verify**

Run:
```bash
npm run build
```

Expected: build succeeds; `/graph` listed.

- [ ] **Step 4: Verify visually**

Restart prod (the kill-and-restart pattern) and curl the page:

```bash
PID=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oP 'pid=\K\d+'); [ -n "$PID" ] && kill "$PID" && sleep 1
nohup npm start -- -H 0.0.0.0 -p 3000 > /tmp/wos-prod.log 2>&1 &
until grep -q "Ready in" /tmp/wos-prod.log; do sleep 1; done
curl -s http://localhost:3000/graph | grep -cE "gx-tile|mzstatic|archive.org"
```

Expected: at least 119 (gx-tile classes) and ~100+ (image URLs from enrichment) on the line count.

If you have a browser, open http://localhost:3000/graph — you should see ~119 album-art tiles arranged in 8 loose clusters at the top-left of an otherwise dark page (the world is currently 600×400 and not yet pan/zoom-fit; that lands in Task 6).

- [ ] **Step 5: Commit**

```bash
git add components/views/Graph.tsx app/globals.css
git commit -m "$(cat <<'EOF'
Graph: render static tiles in mood-cluster positions

Graph component now runs layoutPositions(artists) once via useMemo and
renders 119 absolutely-positioned <button> tiles inside a .gx-world
container. Each tile is a 40×40 album-art cover when art.url is set,
otherwise a colored fallback square with band initials.

Adds .gx-* CSS section: page background (ink-black gradient + faint
star-field), .gx-viewport pan/zoom shell, .gx-tile cosmetics, .gx-compass
ornament. The .gx-viewport doesn't actually pan/zoom yet — that's the
next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Pan + zoom + map controls

**Files:**
- Modify: `components/views/Graph.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add CSS for the floating controls**

Edit `app/globals.css`. Append at the end of the Graph view section (right after `.gx-compass` block):

```css
/* Map controls — bottom-right zoom cluster + top-right reset. */
.gx-controls {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gx-ctl {
  width: 36px;
  height: 36px;
  background: rgba(8, 6, 12, 0.78);
  color: #f4ede4;
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms;
}
.gx-ctl:hover { background: rgba(8, 6, 12, 0.92); }
.gx-ctl:active { transform: scale(0.94); }

.gx-reset {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 4;
  background: rgba(8, 6, 12, 0.78);
  color: #f4ede4;
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 6px 10px;
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms;
}
.gx-reset:hover { background: rgba(8, 6, 12, 0.92); }
```

- [ ] **Step 2: Replace `components/views/Graph.tsx` with the pan/zoom version**

Replace the entire file with:

```tsx
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { layoutPositions } from "@/lib/graph-layout";
import { WORLD_BOUNDS } from "@/lib/mood-families";
import { MOOD_COLORS } from "@/lib/data";
import type { AtlasArtist, AtlasAlbum } from "@/lib/atlas-types";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.3; // multiplier for +/- buttons
const FIT_MARGIN = 40; // px padding around content for fit-all

function refAlbum(a: AtlasArtist): AtlasAlbum {
  return a.discography.find((d) => d.isReference) ?? a.discography[0];
}

function tileBg(moods: string[]): string {
  const hue = moods.length && MOOD_COLORS[moods[0]] ? MOOD_COLORS[moods[0]].hue : 260;
  return `linear-gradient(135deg, hsl(${hue}, 55%, 35%), hsl(${(hue + 35) % 360}, 60%, 22%))`;
}

function initials(name: string): string {
  const w = name.replace(/^The\s+/i, "").split(/\s+/).filter(Boolean);
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
}

interface Transform { z: number; x: number; y: number; }

export function Graph({ artists }: { artists: AtlasArtist[] }) {
  const positions = useMemo(() => layoutPositions(artists), [artists]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState<Transform>({ z: 1, x: 0, y: 0 });
  const tfRef = useRef<Transform>(transform);
  tfRef.current = transform;

  // Pointer state — distinguishes single-finger drag from 2-finger pinch.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{ startX: number; startY: number; startTfX: number; startTfY: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number; cx: number; cy: number } | null>(null);

  /**
   * Compute the transform that fits the world bounds into the viewport
   * with FIT_MARGIN padding and centers it.
   */
  const computeFitAll = useCallback((): Transform => {
    const vp = viewportRef.current;
    if (!vp) return { z: 1, x: 0, y: 0 };
    const vw = vp.clientWidth - FIT_MARGIN * 2;
    const vh = vp.clientHeight - FIT_MARGIN * 2;
    const ww = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
    const wh = WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY;
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(vw / ww, vh / wh)));
    // Center the world in the viewport.
    const wcx = (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2;
    const wcy = (WORLD_BOUNDS.minY + WORLD_BOUNDS.maxY) / 2;
    const x = vp.clientWidth / 2 - wcx * z;
    const y = vp.clientHeight / 2 - wcy * z;
    return { z, x, y };
  }, []);

  // Set the initial fit-all transform synchronously after first layout
  // so there's no visible "snap" from default {z:1, x:0, y:0}.
  useLayoutEffect(() => {
    setTransform(computeFitAll());
  }, [computeFitAll]);

  // Re-fit on viewport resize.
  useEffect(() => {
    const onResize = () => setTransform(computeFitAll());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [computeFitAll]);

  /**
   * Zoom around a fixed point in viewport coords (vx, vy).
   * Keeps the world point under the cursor stable.
   */
  const zoomAt = useCallback((vx: number, vy: number, factor: number) => {
    const tf = tfRef.current;
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, tf.z * factor));
    if (next === tf.z) return;
    // World point under (vx, vy): wp = (vx - tf.x) / tf.z
    // After zoom: vx == wp * next + new_tf.x  →  new_tf.x = vx - wp * next
    const wpx = (vx - tf.x) / tf.z;
    const wpy = (vy - tf.y) / tf.z;
    setTransform({ z: next, x: vx - wpx * next, y: vy - wpy * next });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, factor);
  }, [zoomAt]);

  const fitAll = useCallback(() => setTransform(computeFitAll()), [computeFitAll]);

  // Pointer handlers attached to the viewport.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Don't start a drag if the click is on a tile (handled there).
    const target = e.target as HTMLElement;
    if (target.closest(".gx-tile")) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTfX: tfRef.current.x,
        startTfY: tfRef.current.y,
      };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      pinchRef.current = { startDist: dist, startZoom: tfRef.current.z, cx, cy };
      dragRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const ratio = dist / pinchRef.current.startDist;
      const target = pinchRef.current.startZoom * ratio;
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      // Convert screen midpoint to viewport-local coords.
      const vx = pinchRef.current.cx - rect.left;
      const vy = pinchRef.current.cy - rect.top;
      // Set zoom directly to target (clamped) anchored at the pinch center.
      const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, target));
      const tf = tfRef.current;
      const wpx = (vx - tf.x) / tf.z;
      const wpy = (vy - tf.y) / tf.z;
      setTransform({ z: clamped, x: vx - wpx * clamped, y: vy - wpy * clamped });
    } else if (dragRef.current && pointersRef.current.size === 1) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setTransform({
        z: tfRef.current.z,
        x: dragRef.current.startTfX + dx,
        y: dragRef.current.startTfY + dy,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
    else if (pointersRef.current.size === 1 && !dragRef.current) {
      const remaining = Array.from(pointersRef.current.values())[0];
      dragRef.current = {
        startX: remaining.x,
        startY: remaining.y,
        startTfX: tfRef.current.x,
        startTfY: tfRef.current.y,
      };
    }
  };

  // Wheel zoom around cursor. Use a non-passive listener to be able to preventDefault.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;
      // Negative deltaY = wheel up = zoom in. Standard "natural" feel.
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(vx, vy, factor);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const worldStyle: CSSProperties = {
    width: 600,
    height: 400,
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.z})`,
  };

  const isDragging = dragRef.current !== null;

  return (
    <div className="gx-page">
      <div className="gx-stars" />
      <div className="gx-compass">an atlas</div>

      <button className="gx-reset" onClick={fitAll} title="Fit all">↺ fit all</button>

      <div className="gx-controls">
        <button className="gx-ctl" onClick={() => zoomBy(ZOOM_STEP)} title="Zoom in">＋</button>
        <button className="gx-ctl" onClick={() => zoomBy(1 / ZOOM_STEP)} title="Zoom out">－</button>
      </div>

      <div
        ref={viewportRef}
        className={`gx-viewport ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={worldRef} className="gx-world" style={worldStyle}>
          {artists.map((a) => {
            const pos = positions.get(a.slug);
            if (!pos) return null;
            const album = refAlbum(a);
            const tileStyle: CSSProperties = {
              left: pos.x,
              top: pos.y,
              ["--art-bg" as string]: tileBg(a.moods),
            } as CSSProperties;
            return (
              <button
                key={a.slug}
                type="button"
                className="gx-tile"
                style={tileStyle}
                aria-label={`${a.name} — ${album.title}`}
              >
                {album.art?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={album.art.url} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="gx-tile-fallback">{initials(a.name)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build to verify**

Run:
```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Visual smoke test**

Restart prod and open http://localhost:3000/graph in a browser:
- Tiles should fit-to-page on load (whole atlas visible).
- Mouse wheel should zoom around the cursor.
- Drag (on background, not on a tile) should pan.
- ＋ / − buttons should step zoom around viewport center.
- ↺ fit all should reset.
- On mobile (or browser-emulated touch): pinch should zoom around pinch midpoint; drag should pan.

If any of these is broken, debug before moving on.

- [ ] **Step 5: Commit**

```bash
git add components/views/Graph.tsx app/globals.css
git commit -m "$(cat <<'EOF'
Graph: pan + zoom + map controls

Adds CSS-transform pan/zoom on .gx-world inside .gx-viewport. Pointer
handlers distinguish single-finger drag (pan) from 2-finger pinch (zoom
around midpoint). Wheel zooms around cursor. ＋ / − buttons (bottom
right) step-zoom around viewport center; ↺ fit all (top right) resets
to a transform that fits WORLD_BOUNDS into the viewport with margin.

Initial state is fit-all set via useLayoutEffect so there's no flash of
the {z:1, x:0, y:0} state. Window resize re-fits.

Zoom range 0.5–4×. tfRef mirrors transform state so wheel/pinch handlers
read the latest values without re-binding.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Hover/focus state + similarity highlighting + click navigation

**Files:**
- Modify: `components/views/Graph.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add focus-state CSS**

Edit `app/globals.css`. Append after the `.gx-tile-fallback { ... }` rule:

```css
/* Focus + similarity highlighting */
.gx-tile.is-focused {
  border-color: rgba(220, 195, 145, 0.9);
  box-shadow: 0 0 12px rgba(220, 195, 145, 0.55);
  z-index: 3;
  transform: scale(1.15);
}
.gx-tile.is-related {
  border-color: rgba(220, 195, 145, 0.55);
  z-index: 2;
}
.gx-page.has-focus .gx-tile:not(.is-focused):not(.is-related) {
  opacity: 0.45;
}
```

- [ ] **Step 2: Add focus + similarity logic to Graph.tsx**

Edit `components/views/Graph.tsx`. Make these changes:

**(a)** Add an import for `useRouter` and `similarArtists` near the existing imports:

```tsx
import { useRouter } from "next/navigation";
import { similarArtists } from "@/lib/atlas-similarity";
```

**(b)** Add new state + memo + handlers inside `Graph()`, just after `const positions = useMemo(...)`:

```tsx
const router = useRouter();
const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

// `(hover: hover)` is true on devices with a real mouse pointer. On
// touch-only devices we use a tap-to-focus then tap-again-to-navigate
// pattern — set on mount only.
const supportsHoverRef = useRef<boolean>(true);
useEffect(() => {
  supportsHoverRef.current = window.matchMedia("(hover: hover)").matches;
}, []);

const focused = useMemo(
  () => (focusedSlug ? artists.find((a) => a.slug === focusedSlug) : undefined),
  [focusedSlug, artists],
);

// Top-6 similar bands for the focused artist, by slug.
const relatedSlugs = useMemo(() => {
  if (!focused) return new Set<string>();
  return new Set(similarArtists(focused, artists, 6).map((a) => a.slug));
}, [focused, artists]);

const onTileEnter = (a: AtlasArtist) => {
  if (supportsHoverRef.current) setFocusedSlug(a.slug);
};
const onTileLeave = () => {
  // Don't clear on leave — the panel stays until the user defocuses
  // (background click) or moves to another tile. This avoids flicker
  // when the cursor crosses gaps between tiles.
};
const onTileClick = (a: AtlasArtist) => {
  // On hover-capable devices: click navigates immediately.
  // On touch: first tap focuses, second tap on the same tile navigates.
  if (supportsHoverRef.current || focusedSlug === a.slug) {
    router.push(`/band/${a.slug}`);
  } else {
    setFocusedSlug(a.slug);
  }
};
```

**(c)** Inside the existing `onPointerDown` handler, add a defocus when the pointer-down lands on the background (not on a tile). Find the early-return check `if (target.closest(".gx-tile")) return;` and JUST BEFORE it, add:

```tsx
// If the pointer-down is on the background, defocus.
if (!target.closest(".gx-tile")) setFocusedSlug(null);
```

So the full top of `onPointerDown` reads:

```tsx
const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".gx-tile")) setFocusedSlug(null);
  if (target.closest(".gx-tile")) return;
  // ... existing code follows
};
```

**(d)** Update the `.gx-page` className to include `has-focus` when focused:

Find the JSX line:
```tsx
<div className="gx-page">
```

Replace with:
```tsx
<div className={`gx-page ${focused ? "has-focus" : ""}`}>
```

**(e)** Update the `<button className="gx-tile">` JSX to wire focus state:

Find the existing `<button key={a.slug}` and update its className + add the handlers:

```tsx
<button
  key={a.slug}
  type="button"
  className={`gx-tile ${focusedSlug === a.slug ? "is-focused" : ""} ${relatedSlugs.has(a.slug) ? "is-related" : ""}`}
  style={tileStyle}
  aria-label={`${a.name} — ${album.title}`}
  onMouseEnter={() => onTileEnter(a)}
  onMouseLeave={onTileLeave}
  onClick={() => onTileClick(a)}
>
```

- [ ] **Step 3: Build to verify**

Run:
```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Visual smoke test**

Open http://localhost:3000/graph:
- Hover any tile (desktop): tile gains cream border + glow + 1.15× scale; ~6 similar tiles get a softer cream border; all other tiles fade to ~45% opacity.
- Click a tile (desktop): navigates to `/band/<slug>`.
- Tap a tile (touch): focuses the tile (you'll see no panel yet — that's Task 8). Tap again: navigates.
- Click anywhere on the dark background: defocuses; everything returns to full opacity.

- [ ] **Step 5: Commit**

```bash
git add components/views/Graph.tsx app/globals.css
git commit -m "$(cat <<'EOF'
Graph: hover focus + similarity highlight + click navigation

Hover any tile (desktop) → focus state. Top-6 similar bands (via
existing computeSimilarityAtlas) get a softer cream border; everything
else fades to 45% opacity. Click navigates to /band/<slug>.

Touch handling: first tap focuses, second tap on the same tile navigates
(supportsHover detected via matchMedia '(hover: hover)' on mount).
Background click on the canvas defocuses. Hover-leave intentionally
does NOT clear focus — keeps the panel stable as the cursor crosses
gaps between tiles. The panel itself lands in Task 8.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Side panel (`GraphPanel.tsx`) — desktop layout

**Files:**
- Create: `components/views/GraphPanel.tsx`
- Modify: `components/views/Graph.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add panel CSS (desktop layout)**

Edit `app/globals.css`. Append after the `.gx-controls` block (or anywhere in the Graph view section):

```css
/* Side panel — desktop right-side. Mobile drawer rules land in Task 9. */
.gx-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  background: rgba(8, 6, 12, 0.92);
  border-left: 1px solid rgba(255, 255, 255, 0.10);
  color: #f4ede4;
  padding: 18px 20px 22px;
  overflow-y: auto;
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 11px;
  z-index: 5;
}
.gx-panel-art {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--art-bg, #2d3f5f);
  display: flex;
  align-items: flex-end;
  padding: 14px;
  margin-bottom: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.gx-panel-art img { display: block; width: 100%; height: 100%; object-fit: cover; }
.gx-panel-art-title {
  font-family: var(--font-instrument-serif), serif;
  font-style: italic;
  font-size: 24px;
  line-height: 1;
  color: #fff8e8;
}
.gx-panel-meta {
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.55);
  font-size: 10px;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}
.gx-panel-name {
  font-family: var(--font-instrument-serif), serif;
  font-style: italic;
  font-size: 32px;
  line-height: 1;
  margin: 6px 0 4px;
  color: #fff8e8;
}
.gx-panel-album {
  font-family: var(--font-instrument-serif), serif;
  font-style: italic;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 14px;
}
.gx-panel-quote {
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.55;
  font-size: 12px;
  margin: 0 0 16px;
}
.gx-panel-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.gx-panel-key {
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 9px;
}
.gx-panel-val { color: rgba(255, 255, 255, 0.85); }
.gx-panel-moods {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 12px 0 18px;
}
.gx-panel-mood-chip {
  font-size: 9px;
  padding: 3px 7px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 248, 232, 0.9);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.gx-panel-cta {
  display: block;
  text-align: center;
  padding: 10px 14px;
  margin-top: 8px;
  background: hsl(260, 55%, 38%);
  color: #fff8e8;
  border: 1px solid hsl(260, 55%, 45%);
  text-decoration: none;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 10px;
  cursor: pointer;
}
.gx-panel-listen {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.gx-panel-listen a {
  flex: 1;
  text-align: center;
  padding: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.gx-panel-listen a:hover { background: rgba(255, 255, 255, 0.10); color: #f4ede4; }
.gx-panel-listen a[aria-disabled="true"] { opacity: 0.35; pointer-events: none; }

/* Default empty state */
.gx-panel-intro {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 40px;
}
.gx-panel-intro h2 {
  font-family: var(--font-instrument-serif), serif;
  font-style: italic;
  font-size: 28px;
  margin: 0;
  color: #fff8e8;
}
.gx-panel-intro p { margin: 0; line-height: 1.55; color: rgba(255, 248, 232, 0.78); font-size: 12px; }
.gx-panel-intro ul { margin: 0; padding-left: 16px; color: rgba(255, 255, 255, 0.55); font-size: 11px; line-height: 1.8; }

/* When the panel is showing, give the viewport room on desktop. */
@media (min-width: 720px) {
  .gx-page.has-panel .gx-viewport,
  .gx-page.has-panel .gx-stars { right: 320px; }
  .gx-page.has-panel .gx-compass { left: 14px; }
  .gx-page.has-panel .gx-reset { right: 334px; }
  .gx-page.has-panel .gx-controls { right: 334px; }
}
```

(Note: the `.gx-page.has-panel` rules tell the canvas to leave 320px on the right. Since the panel is *always* visible on desktop in this design, we'll set `has-panel` whenever the viewport is ≥ 720px.)

- [ ] **Step 2: Create `components/views/GraphPanel.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { MOOD_COLORS } from "@/lib/data";
import { eraLabel } from "@/lib/helpers";
import type { AtlasAlbum, AtlasArtist } from "@/lib/atlas-types";

function refAlbum(a: AtlasArtist): AtlasAlbum {
  return a.discography.find((d) => d.isReference) ?? a.discography[0];
}

function tileBg(moods: string[]): string {
  const hue = moods.length && MOOD_COLORS[moods[0]] ? MOOD_COLORS[moods[0]].hue : 260;
  return `linear-gradient(135deg, hsl(${hue}, 55%, 35%), hsl(${(hue + 35) % 360}, 60%, 22%))`;
}

const LISTEN_KEYS: Array<{ key: keyof AtlasArtist["listen"]; label: string }> = [
  { key: "bandcamp", label: "BC" },
  { key: "spotify",  label: "SP" },
  { key: "apple",    label: "AM" },
  { key: "tidal",    label: "TI" },
];

export function GraphPanel({ artist }: { artist: AtlasArtist | null }) {
  if (!artist) return <PanelIntro />;

  const album = refAlbum(artist);
  const artStyle: CSSProperties = {
    ["--art-bg" as string]: tileBg(artist.moods),
  } as CSSProperties;

  return (
    <aside className="gx-panel">
      <div className="gx-panel-art" style={artStyle}>
        {album.art?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.art.url} alt={`${album.title} cover`} />
        ) : (
          <div className="gx-panel-art-title">{album.title}</div>
        )}
      </div>

      <div className="gx-panel-meta">
        <span>{album.year} · {artist.country}</span>
        <span>intensity {artist.intensity} / 10</span>
      </div>
      <div className="gx-panel-name">{artist.name}</div>
      <div className="gx-panel-album">{album.title}</div>

      <p className="gx-panel-quote">&ldquo;{artist.desc}&rdquo;</p>

      <div className="gx-panel-row"><span className="gx-panel-key">era</span><span className="gx-panel-val">{eraLabel(artist.era)}</span></div>
      <div className="gx-panel-row"><span className="gx-panel-key">subgenre</span><span className="gx-panel-val">{artist.subgenre}</span></div>

      <div className="gx-panel-moods">
        {artist.moods.map((m) => {
          const mc = MOOD_COLORS[m];
          if (!mc) return null;
          return <span key={m} className="gx-panel-mood-chip">#{mc.label}</span>;
        })}
      </div>

      <Link className="gx-panel-cta" href={`/band/${artist.slug}`}>→ open band file</Link>

      <div className="gx-panel-listen">
        {LISTEN_KEYS.map(({ key, label }) => {
          const url = artist.listen[key];
          return (
            <a
              key={key}
              href={url || "#"}
              target={url ? "_blank" : undefined}
              rel={url ? "noopener noreferrer" : undefined}
              aria-disabled={!url}
            >
              {label}
            </a>
          );
        })}
      </div>
    </aside>
  );
}

function PanelIntro() {
  return (
    <aside className="gx-panel">
      <div className="gx-panel-intro">
        <h2>an atlas of moods</h2>
        <p>
          The whole catalog plotted by sound. Tiles cluster by primary mood —
          eight loose family gardens. Anyone who reads the names will see
          the gardens emerge.
        </p>
        <ul>
          <li>hover or tap a tile</li>
          <li>drag to pan, scroll or pinch to zoom</li>
          <li>click to open the band</li>
        </ul>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Mount the panel in Graph.tsx**

Edit `components/views/Graph.tsx`:

**(a)** Add import:
```tsx
import { GraphPanel } from "./GraphPanel";
```

**(b)** Add `has-panel` to the page className. Replace the existing `<div className={...}>` line:

```tsx
<div className={`gx-page has-panel ${focused ? "has-focus" : ""}`}>
```

**(c)** Mount `<GraphPanel>` inside the page, AFTER the closing `</div>` of `.gx-viewport` but BEFORE the closing `</div>` of `.gx-page`:

```tsx
<GraphPanel artist={focused ?? null} />
```

So the bottom of the JSX reads:

```tsx
      <div ref={viewportRef} className={...} ...>
        <div ref={worldRef} className="gx-world" style={worldStyle}>
          {/* tiles */}
        </div>
      </div>

      <GraphPanel artist={focused ?? null} />
    </div>
  );
}
```

- [ ] **Step 4: Build + smoke test**

```bash
npm run build
```

Expected: clean.

Restart prod, open `/graph`:
- Right-side panel (320px wide) is visible by default with the "an atlas of moods" intro.
- Hover any tile → panel populates with that band's data.
- Click "→ open band file" → navigates to `/band/<slug>`.
- BC/SP/AM/TI mini buttons link out to the artist's listen URLs (or are dimmed when missing).
- Click background → panel reverts to the intro state.

- [ ] **Step 5: Commit**

```bash
git add components/views/Graph.tsx components/views/GraphPanel.tsx app/globals.css
git commit -m "$(cat <<'EOF'
Graph: side panel with band card + atlas intro state

GraphPanel renders either the focused band's card (album art preview,
name, year/country, intensity, desc, era/subgenre rows, mood chips,
"open band file" CTA, BC/SP/AM/TI listen-on chips) or the default
"atlas of moods" intro state when nothing's focused.

Mounted permanently on desktop ≥ 720px, with .gx-page.has-panel CSS
shrinking the viewport to leave 320px on the right. Listen-on chips
gracefully no-op when the corresponding listen.{key} is missing.

Mobile drawer behavior (collapse to bottom sheet, slide on focus)
lands in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — Mobile bottom-drawer behavior

**Files:**
- Modify: `app/globals.css`
- Modify: `components/views/Graph.tsx`

- [ ] **Step 1: Add mobile drawer CSS**

Edit `app/globals.css`. Append at the end of the Graph section (after the `@media (min-width: 720px)` block):

```css
/* Mobile: panel becomes a bottom sheet that slides up when a tile is
   focused, dismissed by tapping the background or pressing Esc. */
@media (max-width: 720px) {
  .gx-panel {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    max-height: 70vh;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
    transform: translateY(100%);
    transition: transform 320ms var(--motion-ease);
    padding: 16px 16px 24px;
  }
  .gx-page.has-focus .gx-panel { transform: translateY(0); }

  /* Don't reserve right-side space on mobile — viewport fills the screen. */
  .gx-page.has-panel .gx-viewport,
  .gx-page.has-panel .gx-stars { right: 0; }
  .gx-page.has-panel .gx-reset,
  .gx-page.has-panel .gx-controls { right: 14px; }

  /* Smaller intro state — only shown when no tile focused, but it shouldn't
     occupy the screen since the panel is collapsed off-screen anyway. */
  .gx-panel-intro { margin-top: 0; }

  /* Slightly bigger touch targets on mobile. */
  .gx-ctl { width: 44px; height: 44px; font-size: 18px; }
}
```

- [ ] **Step 2: Smoke test mobile**

`npm run build`, restart prod, then in your browser open dev tools → toggle device emulation (iPhone or any 390-wide profile) → reload `/graph`:
- Default state: full-screen canvas with all tiles, no panel visible.
- Tap any tile: tile focuses + bottom drawer slides up with the band card.
- Tap on the background: drawer slides down.
- Tap a different tile: drawer stays up but contents update; old tile defocuses.
- Tap the same tile a second time: navigates to `/band/<slug>` (this is already wired in Task 7).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
Graph: mobile bottom-drawer for the side panel

Below 720px, .gx-panel becomes a fixed-bottom sheet that slides up via
transform: translateY(100% → 0) when .gx-page.has-focus. Tapping the
background defocuses → drawer slides back down. Tap-then-tap-again on
the same tile still navigates (logic already in onTileClick from
Task 7).

Floating controls bump to 44×44 on mobile for fingers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — Keyboard shortcuts + final polish + build verify

**Files:**
- Modify: `components/views/Graph.tsx`

- [ ] **Step 1: Add keyboard shortcut effect**

Edit `components/views/Graph.tsx`. Inside `Graph()` add this `useEffect` next to the others (after the resize effect):

```tsx
// Keyboard shortcuts: Esc dismisses focus; 0 fits all; +/- step zoom.
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    // Ignore when typing in an input/textarea/contenteditable somewhere.
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

    if (e.key === "Escape") setFocusedSlug(null);
    else if (e.key === "0") fitAll();
    else if (e.key === "+" || e.key === "=") zoomBy(ZOOM_STEP);
    else if (e.key === "-") zoomBy(1 / ZOOM_STEP);
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [fitAll, zoomBy]);
```

- [ ] **Step 2: Final typecheck + test + build**

Run:
```bash
npm run typecheck && npm test && npm run build
```

Expected: all three pass cleanly. Build output's route table should show `/graph` with `Revalidate 5m`.

- [ ] **Step 3: Manual acceptance walkthrough**

Restart prod and verify against the spec's acceptance checklist:

```bash
PID=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oP 'pid=\K\d+'); [ -n "$PID" ] && kill "$PID" && sleep 1
nohup npm start -- -H 0.0.0.0 -p 3000 > /tmp/wos-prod.log 2>&1 &
until grep -q "Ready in" /tmp/wos-prod.log; do sleep 1; done
```

In your browser, walk through:
- ✅ Visit `/graph` → 119 album-art tiles in 8 implied mood gardens, fit to one screen
- ✅ No rings, labels, or edges visible anywhere
- ✅ Hover a tile → side panel populates + unrelated tiles dim
- ✅ Click a tile → navigates to `/band/<slug>`
- ✅ Drag = pan; scroll/pinch = zoom; +/− buttons step zoom; ↺ resets to fit-all
- ✅ Mobile (390 viewport) renders bottom drawer; tap-then-tap-again navigates
- ✅ Esc dismisses focus; `0` resets fit-all; `+`/`-` step zoom
- ✅ Other routes (`/`, `/globe`, `/timeline`, `/tonight`, `/band/slowdive`) still work — quick sanity check by navigating to each

If anything is broken, fix it inline before the final commit.

- [ ] **Step 4: Commit**

```bash
git add components/views/Graph.tsx
git commit -m "$(cat <<'EOF'
Graph: keyboard shortcuts (Esc / 0 / +/-) + final polish

Esc dismisses focus, 0 fits all, + and - step zoom (matching the
floating ＋/－ buttons). Listener ignores keystrokes from inputs/
textareas/contenteditables.

Closes the v1 graph view per spec
docs/superpowers/specs/2026-05-13-graph-view-design.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Push**

```bash
git push origin main
```

Vercel will pick up the changes from this push and deploy.

---

## Acceptance summary

After Task 10 you should have:

- A new `/graph` route in the site nav between `feed` and `globe`.
- 119 album-art tiles arranged in 8 implied mood family clusters at default fit-all zoom.
- Pan (drag), zoom (wheel / pinch / ±), reset (↺), keyboard shortcuts (Esc / 0 / + / -).
- Hover (or tap on touch) reveals a side panel (desktop) or bottom drawer (mobile) with band details + listen-on links + open-band CTA.
- Click navigates to `/band/<slug>`.
- Background click defocuses.
- No regressions on other views.
- All tests pass; full prod build succeeds.

Mockups in `.superpowers/brainstorm/` (gitignored) document the design intent.
