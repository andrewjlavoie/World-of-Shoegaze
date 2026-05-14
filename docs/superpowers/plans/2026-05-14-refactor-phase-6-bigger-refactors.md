# Refactor Phase 6 — Bigger refactors (optional)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.
> Strategy doc: `docs/superpowers/specs/2026-05-14-codebase-refactor-strategy.md`
> Each task is independently shippable — pick whichever scratches an itch when you next touch the relevant area.

**Goal:** Four larger, optional refactors that pay off but aren't urgent. Defer until you next have a real reason to be in those files (a feature, a bug). Each task in this phase = its own PR.

**Architecture:** Each task is independent — they share no files. You can do one, three, or all four.

**Tech Stack:** No new dependencies (except remote image patterns are config, not code).

---

## Task list

| # | Refactor | Effort | When to do |
|---|---|---|---|
| 1 | Split `lib/data.ts` → `lib/taxonomy.ts` + `scripts/seed-data.ts` | ~30 min | When you next add an artist or change taxonomy |
| 2 | Split `Graph.tsx` → `lib/use-pan-zoom.ts` + `Graph/Tile.tsx` | ~1.5 hr | When you next change the graph view |
| 3 | Convert `BandDetail` to a Server Component | ~30 min | When the band-detail JS bundle is too big |
| 4 | Migrate `<img>` → Next `<Image>` (remote patterns) | ~30 min | Anytime — pure perf win |

---

## Task 1 — Split `lib/data.ts`

**Files:** `lib/data.ts`, `lib/taxonomy.ts` (new), `scripts/seed-data.ts` (new)

**Why:** `lib/data.ts` is a hybrid — it exports live taxonomy (`MOOD_COLORS`, `ERAS`, `ERA_ORDER`, used by every view) AND legacy seed arrays (`BANDS`, `RAW`, `DESC`, `BAND_MOODS`, `MOOD_TO_BANDS`, `RawBand` tuple type, used only by `scripts/seed.ts` and `scripts/export-seed-json.ts`). Cuts ~180 lines from the runtime app's dependency graph.

- [ ] **Step 1: Identify exact live exports**

```bash
grep -rn "from.*\"@/lib/data\"\\|from.*'@/lib/data'" app components --include="*.ts" --include="*.tsx"
```

Confirm only `MOOD_COLORS`, `ERAS`, `ERA_ORDER` are imported by `app/` and `components/`.

```bash
grep -rn "from.*\"\\.\\./lib/data\"\\|from.*'\\.\\./lib/data'" scripts --include="*.ts"
```

Confirm `BANDS`, `BAND_MOODS`, etc. are only used by scripts.

- [ ] **Step 2: Create `lib/taxonomy.ts`**

Cut the live exports (`MOOD_COLORS`, `ERAS`, `ERA_ORDER`, the `Era`/`MoodColor` types they depend on) out of `lib/data.ts` into a new file:

```ts
// Pure taxonomy — referenced at runtime by every view.
import type { Era, MoodColor } from "./types";

export const MOOD_COLORS: Record<string, MoodColor> = {
  // ...verbatim from lib/data.ts...
};

export const ERAS: Era[] = [
  // ...verbatim...
];

export const ERA_ORDER: string[] = ERAS.map((e) => e.key);
```

- [ ] **Step 3: Create `scripts/seed-data.ts`**

Move `BANDS`, `RAW`, `DESC`, `BAND_MOODS`, `MOOD_TO_BANDS`, `RawBand` from `lib/data.ts` here. Update `scripts/seed.ts` and `scripts/export-seed-json.ts` to import from `./seed-data` instead of `../lib/data`.

- [ ] **Step 4: Delete `lib/data.ts`**

If it's now empty (after cuts in Steps 2-3), delete it. Otherwise, finish moving its remaining exports to the right home.

- [ ] **Step 5: Update import paths across all consumers**

For each file in `app/` and `components/` that imported from `@/lib/data`, change to `@/lib/taxonomy`. Use Find & Replace if you trust it; otherwise verify by `grep`.

- [ ] **Step 6: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -5
```

In browser: confirm every view renders identically (mood colors, era labels intact).

- [ ] **Step 7: Commit**

```bash
git add lib/taxonomy.ts scripts/seed-data.ts scripts/seed.ts scripts/export-seed-json.ts \
  app components
git rm lib/data.ts  # if empty
git commit -m "$(cat <<'EOF'
Refactor: split lib/data.ts into lib/taxonomy.ts + scripts/seed-data.ts

lib/data.ts was a hybrid — live MOOD_COLORS/ERAS taxonomy used by
every view alongside legacy BANDS/RAW/DESC arrays only used by
scripts. Splits along that seam:

- lib/taxonomy.ts: live taxonomy, ~50 lines
- scripts/seed-data.ts: legacy seed arrays, ~180 lines, never reaches
  the runtime bundle

Removes a transitive 180-line legacy import from every page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Split `Graph.tsx` (339 lines)

**Files:** `components/views/Graph.tsx` → `components/views/Graph/index.tsx` + `components/views/Graph/Tile.tsx`; `lib/use-pan-zoom.ts` + `lib/use-pan-zoom.test.ts` (new)

**Why:** `Graph.tsx` mixes three concerns: pan/zoom transform math (the meaty pure-logic part), pointer/touch event handling, tile rendering. The pan/zoom logic is unit-testable in isolation if it's a hook.

- [ ] **Step 1: Plan the split**

Re-read `Graph.tsx` end-to-end. Identify:
- **Pan/zoom state machine:** `transform` state, wheel/pinch zoom math, pointer drag math, clamping, the "fit-all" reset transition. → `lib/use-pan-zoom.ts`
- **Tile rendering:** the inner `<button>` per artist with album art + position. → `Graph/Tile.tsx`
- **Outer view:** the `<svg>` or `<div>` shell, hover state, panel coordination, `usePanZoom` consumer. → `Graph/index.tsx`

Sketch each module's surface (props/return types) before writing code. If unclear, **stop and reconsider** — the split is the value.

- [ ] **Step 2: Extract `usePanZoom` to `lib/use-pan-zoom.ts`**

Hook signature should be roughly:

```ts
interface PanZoomState {
  transform: { x: number; y: number; k: number };
  setTransform: (next: { x: number; y: number; k: number }) => void;
  reset: () => void;
  bind: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
  };
}

export function usePanZoom(options: { minK: number; maxK: number; ... }): PanZoomState
```

The pure math (zoom around a focal point, clamp, etc.) lives outside the hook as exported functions for testability.

- [ ] **Step 3: Test `usePanZoom`'s pure math**

`lib/use-pan-zoom.test.ts` covers `zoomAround(transform, point, factor)`, `clampTransform(transform, bounds)`, etc. Hook itself can stay untested at the React level — the math is what matters.

- [ ] **Step 4: Extract `Tile.tsx`**

Each tile is a `<button>` with album art background, name, hover handler, click → router.push(`/band/${slug}`). Props are `{ artist, position, isHovered, onHover }`.

- [ ] **Step 5: Slim `Graph/index.tsx`**

Should be ~100 lines: layout, hover state, panel toggle, `usePanZoom` consumer, `<Tile>` map. No transform math, no tile rendering details.

- [ ] **Step 6: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -5
```

In browser: pan, zoom, pinch on mobile, click-to-open, hover, fit-all reset. Should be identical to before.

- [ ] **Step 7: Commit (or split into 3 commits)**

```bash
git add lib/use-pan-zoom.ts lib/use-pan-zoom.test.ts \
  components/views/Graph/ package.json
git rm components/views/Graph.tsx
git commit -m "$(cat <<'EOF'
Refactor: split Graph.tsx into Graph/index + Tile + lib/use-pan-zoom

Graph.tsx was 339 lines mixing pan/zoom math, pointer event handling,
and tile rendering. Splits into:

- lib/use-pan-zoom.ts: hook + pure math (zoomAround, clampTransform)
  with unit tests
- components/views/Graph/Tile.tsx: per-artist button
- components/views/Graph/index.tsx: ~100-line outer shell

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Convert `BandDetail` to a Server Component

**Files:** `components/views/BandDetail.tsx`, `app/band/[slug]/page.tsx`

**Why:** `BandDetail` is `"use client"` only because of (a) `router.push()` for similar-band card navigation and (b) a `useSettings()` re-render trick that's unnecessary now that Settings updates CSS vars on `<body>`. Both are removable. Result: zero JS shipped for `/band/*` (except for any genuinely interactive sub-component, e.g., the listen-on dropdown if it has one).

- [ ] **Step 1: Audit interactivity**

Read `BandDetail.tsx`. For each `useState`, `useEffect`, `onClick`, etc., decide:
- Necessary client behavior → keep in a small Client Component island
- Removable → remove

Specifically:
- `useSettings()` consumer → remove. The body-level CSS var update already drives re-render of inheriting elements.
- Similar-band `onClick={() => router.push(...)}` → replace with `<Link href="/band/...">`.

- [ ] **Step 2: Rewrite as Server Component**

Drop `"use client"` from the top of the file. Replace `useRouter`/`useSettings` imports. Replace any `useState`/`useEffect`/`onClick` with their server equivalents (mostly: just delete and use `<Link>`).

If a section genuinely needs client interactivity (e.g., a copy-link button, a expand/collapse), extract it into a small `BandDetailListenButton.tsx` or similar `"use client"` island.

- [ ] **Step 3: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -10
```

Look at the build output for `/band/[slug]` — the JS bundle size should be much smaller (or absent if no client island remains).

In browser: navigate to `/band/slowdive`, click a similar-band card, switch themes via cogwheel and confirm the band-detail page reflects the theme change.

- [ ] **Step 4: Commit**

```bash
git add components/views/BandDetail.tsx app/band/[slug]/page.tsx
git commit -m "$(cat <<'EOF'
Refactor: BandDetail becomes a Server Component

useSettings() consumer was a re-render hack — Settings already drives
CSS vars on <body> which inheriting elements pick up automatically.
Similar-band router.push() becomes <Link>. Result: /band/* ships
zero client JS unless a small island is added later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — `<img>` → Next `<Image>` migration

**Files:** `next.config.js`, `components/views/Feed.tsx`, `Timeline.tsx`, `BandDetail.tsx`, `Graph.tsx`, `GraphPanel.tsx`

**Why:** Atlas album-art and band-photo URLs are remote (iTunes Search, MusicBrainz / Cover Art Archive, Wikipedia). Currently rendered as `<img>` with `// eslint-disable-next-line @next/next/no-img-element` comments. Migrating to `<Image>` enables Next's built-in optimization (responsive sizing, AVIF/WebP, lazy-loading) without shipping any new code.

If Phase 3 was done, the eslint-disables are already gone — but the `<img>` tags remain.

- [ ] **Step 1: Configure remote patterns**

Edit `next.config.js`. Add to `images.remotePatterns`:

```js
const nextConfig = {
  // ...existing...
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.mzstatic.com" },           // iTunes
      { protocol: "https", hostname: "coverartarchive.org" },        // CAA
      { protocol: "https", hostname: "**.wikipedia.org" },           // Wiki band photos
      { protocol: "https", hostname: "**.wikimedia.org" },
      // Add any other hosts seen in artist.photo.url / album.art.url
    ],
  },
};
```

Audit production data for unique hostnames first:

```bash
mongosh "$MONGODB_URI" --eval 'db.artists.aggregate([
  { $project: { urls: { $concatArrays: [["$photo.url"], "$discography.art.url"] } } },
  { $unwind: "$urls" },
  { $match: { urls: { $ne: null } } },
  { $project: { host: { $arrayElemAt: [{ $split: ["$urls", "/"] }, 2] } } },
  { $group: { _id: "$host" } }
])'
```

Add every host that appears.

- [ ] **Step 2: Migrate `<img>` tags**

For each occurrence in `Feed.tsx`, `Timeline.tsx`, `BandDetail.tsx`, `Graph.tsx`, `GraphPanel.tsx`:

```tsx
// Before:
<img src={album.art.url} alt={...} className="feed-art-img" />

// After:
import Image from "next/image";
<Image
  src={album.art.url}
  alt={...}
  width={400}
  height={400}
  className="feed-art-img"
  unoptimized={false}
/>
```

For aspect-ratio-flexible images, use `fill` + a positioned parent:

```tsx
<div style={{ position: "relative", aspectRatio: "1 / 1" }}>
  <Image src={album.art.url} alt={...} fill sizes="(max-width: 720px) 100vw, 400px" />
</div>
```

Use `priority` for the first 1-2 above-the-fold images to skip lazy-loading.

- [ ] **Step 3: Verify**

```bash
npm run lint && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

In browser: confirm images load (no broken thumbnails, no layout shift). Open Network tab — confirm `/_next/image` URLs are being served (not the raw remote URLs).

- [ ] **Step 4: Commit**

```bash
git add next.config.js components/views/
git commit -m "$(cat <<'EOF'
Perf: <img> → next/Image with remotePatterns

Configures Next's image optimizer for the four remote hosts we use
(mzstatic, coverartarchive, wikipedia, wikimedia). Migrates every
<img> in the views. Browser now gets responsive sizes + AVIF/WebP +
lazy-loading by default.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Acceptance per task (each independent)

**Task 1:** `lib/data.ts` deleted (or empty); views import from `lib/taxonomy.ts`; scripts import from `scripts/seed-data.ts`; build clean.

**Task 2:** `Graph.tsx` is now ~100 lines; pan/zoom math has tests; visual identical.

**Task 3:** `BandDetail.tsx` has no `"use client"` directive; build output shows minimal JS for `/band/*`; theme switch still works.

**Task 4:** All `<img>` tags in views are `<Image>`; Network tab shows `/_next/image` URLs; no layout shift.

---

## When to revisit

Phase 6 is intentionally optional. Trigger conditions:

- **Task 1**: next time you add an artist or change taxonomy
- **Task 2**: next time you touch the graph view (bug fix, new feature)
- **Task 3**: when the band-detail page becomes performance-sensitive
- **Task 4**: anytime; pure perf win
