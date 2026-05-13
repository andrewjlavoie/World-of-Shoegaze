# Graph view — design

A new tab at `/graph` that renders the entire World of Shoegaze catalog as a
single zoomable, pannable atlas of mood gardens. Bands are arranged in 2D
space by similarity; their position alone communicates which scene they
belong to. No edges, no garden labels, no rings.

## Job to be done

Two overlapping jobs:

1. **Discover related bands** — pick a band you know, see its closest
   neighbors immediately. The graph "responds" when you focus on a tile.
2. **See scene structure** — recognize blackgaze, J-gaze, dreampop, and the
   other communities by where the bands cluster on the map. The structure
   is implied, not labeled.

Both are served by the same primary mechanic: similarity-driven proximity.
The user reading the band names sees the gardens emerge.

## Visual model

### Layout

A single force-simulated 2D canvas. Each band is a small album-art tile.
The simulation is run for a fixed budget of ticks on mount, then frozen —
positions are static after that. No live animation in the resting state.

### Density

The whole atlas should fit on one screen at default ("fit-all") zoom.
Clusters nearly touch — no large empty regions between gardens. Pan and
zoom are for inspection, not for navigation across deserts of whitespace.

### Mood families (the 8 gardens)

Bands are pulled toward a "family centroid" by their **primary mood**
(first entry in `artist.moods[]`). The 8 families consolidate the 21 raw
mood keys:

| Family | Raw moods folded in |
|---|---|
| Dreampop & Bliss | euphoric_bliss · ethereal_celestial · dream_pop_warmth · wistful_dreamers · ambient_drift |
| Noise & Chaos | noisy_chaotic · ecstatic_catharsis · volatile_violent |
| Heavy & Doom | hypnotic_heavy · apocalyptic_doom · muscular_brooding · sun_bleached_sludge |
| Dark & Gothic | dark_gothic · depressive_beauty · psychedelic_hypnotic |
| Anthemic & Yearning | yearning_anthemic |
| Lo-fi & Modern | lo_fi_bedroom · modern_anguish |
| Twee & Strange | nostalgic_jangly · experimental_strange |
| Japanese Gaze | japanese_gaze |

Within a family, bands are also pulled toward a **sub-cluster centroid**
keyed by the raw mood (so wistful sits beside wistful, ethereal beside
ethereal). Sub-cluster pull is stronger than family pull, so sub-mood
clumps form inside the loose family region.

Family centroids are placed in a fixed layout positioned to use the canvas
well — tight, no isolated gardens. Specific positions are tuning rather
than spec, but the shape resembles the brainstorm mockup
(`map-tight.html`):

- Top row: Dreampop & Bliss → Noise & Chaos → Heavy & Doom
- Middle row: Dark & Gothic → Anthemic & Yearning → Lo-fi & Modern → Japanese Gaze
- Bottom row: Twee & Strange

### Forces (d3-force)

Three simultaneous forces compose the layout:

| Force | Strength | Purpose |
|---|---|---|
| `forceX(subMoodCx)` + `forceY(subMoodCy)` | strong (~0.9) | Pull each band toward its sub-mood centroid |
| `forceX(familyCx)` + `forceY(familyCy)` | medium (~0.3) | Keep sub-clusters near their family region |
| `forceManyBody({strength: -8})` | light repulsion | Prevent overlap |
| `forceCollide(tileR + 1)` | hard | Strict no-overlap of tiles |

Tuning constants will need iteration. The simulation runs for a fixed
budget (~300 ticks, sync) on mount, then `simulation.stop()` — positions
become static state.

### Tile

- Square, **40px** at zoom 1.0 (CSS transform scales with map zoom).
- Default render: real album art (`<img>` from
  `artist.discography[].art.url` of the reference album) when set;
  fallback to a typographic mood-tinted square with band initials when
  not (same fallback the Feed uses).
- 1px subtle stroke `rgba(0,0,0,0.4)` for definition against the dark canvas.

### Empty space / canvas

- Background: same `#1a1814` ink-black gradient used in Drift and Globe.
- Faint star-field background pattern (CSS radial-gradients), shared with
  Globe — establishes "this is a separate map view, not the parchment one."
- Compass ornament top-left: `an atlas` in italic serif.
- No grid, no axes, no labels.

## Interaction

### Hover (desktop)

- Hovered tile: cream stroke `rgba(220,195,145,0.9)` + 1.5px drop-shadow glow
- Top-K similar bands (K=6, computed via existing
  `computeSimilarityAtlas`): subtle cream stroke at lower opacity, no glow
- All other tiles: opacity 0.45
- Side panel populates with the hovered band's details

### Click (desktop)

- Navigate to `/band/[slug]` (existing band detail page)

### Background click (desktop)

- Defocus: all tiles return to full opacity, side panel reverts to default
  "atlas" intro state

### Touch (mobile, < 720px viewport)

- No hover; first tap = same effect as hover (related-band brightening +
  bottom drawer slides up with band info)
- Second tap on the same tile = navigate to `/band/[slug]`
- Tap background or swipe drawer down = dismiss
- Esc also dismisses (works on desktop too)

### Pan & zoom

- **Drag** anywhere on the canvas (not on a tile) = pan
- **Scroll wheel** = zoom around cursor (matches macOS-natural direction)
- **Pinch** (touch) = zoom around midpoint
- **+/− buttons** (bottom-right floating cluster) = stepped zoom around viewport center
- **↺ fit-all** (top-right) = reset to fit-all view, smooth transition (~400ms)
- Zoom range: 0.5× to 4×
- Default state: fit-all

### Keyboard

- `Esc` — dismiss focused tile / drawer
- `0` — fit-all (alias for the reset button)
- `+` / `-` — zoom in / out

## Side panel content

When a tile is focused (hover or tap):

```
┌─ panel (right-side, 320px desktop / bottom drawer mobile) ─┐
│  [ album art, full width, 1:1 aspect ]                      │
│                                                             │
│  1993 · UK              intensity 4 / 10                    │
│  Slowdive               (italic serif, large)               │
│  Souvlaki               (italic serif, smaller)             │
│                                                             │
│  "The most emotionally resonant of the originals…"          │
│                                                             │
│  era       First Wave                                       │
│  subgenre  shoegaze                                         │
│                                                             │
│  [#euphoric bliss]  [#wistful dreamers]                     │
│                                                             │
│  → open band file       (CTA — links to /band/slug)         │
│                                                             │
│  [BC] [SP] [AM] [TI]    (mini listen-on chips)              │
└─────────────────────────────────────────────────────────────┘
```

Default state (no tile focused):

```
┌─────────────────────────────────────────────────────────────┐
│  an atlas of moods                                          │
│  ──────────                                                 │
│  119 bands.                                                 │
│  Tiles cluster by primary mood. Hover any tile.             │
│                                                             │
│  · drag to pan                                              │
│  · scroll/pinch to zoom                                     │
│  · click to open the band                                   │
└─────────────────────────────────────────────────────────────┘
```

## Architecture

### Routing

- New route: `app/graph/page.tsx`
- Add `feed · graph · globe · timeline · tonight` to `SiteNav.tsx`'s ROUTES (4 → 5 entries)

### Data flow

```
app/graph/page.tsx (Server Component)
  └─ getArtists() from lib/atlas-queries.ts
  └─ <Graph artists={artists} />

components/views/Graph.tsx (Client Component)
  ├─ useEffect on mount: build d3-force simulation, run 300 ticks, store positions
  ├─ pan/zoom state (transform: scale(z) translate(x,y))
  ├─ pointer event handlers for drag + pinch
  ├─ hover/focus state (which tile is active)
  ├─ <GraphTile /> per artist (absolutely positioned)
  └─ <GraphPanel artist={focused} />

components/views/GraphPanel.tsx (Client Component)
  - Side panel on desktop, bottom drawer on mobile
  - Default ("atlas intro") state when no artist focused

lib/mood-families.ts (pure)
  - MOOD_FAMILIES: Record<MoodKey, FamilyKey>
  - FAMILY_CENTROIDS: Record<FamilyKey, {x, y}>
  - SUB_MOOD_OFFSETS: Record<MoodKey, {dx, dy}> — relative to family centroid

lib/graph-layout.ts (pure)
  - buildSimulation(artists): returns d3-force simulation pre-configured
  - layoutPositions(artists): runs simulation N ticks, returns Map<slug, {x, y}>
```

### Implementation tech

- **`d3-force`** for the layout (just the force module, ~30KB gzipped — not the whole D3).
- **HTML + CSS** for rendering. Each tile is an absolutely-positioned `<button>` containing an `<img>`. A wrapping container has `transform: scale(z) translate(x, y)` for zoom + pan.
- **No canvas, no SVG.** 119 DOM nodes is well within performance budgets, and image loading + accessibility (focus, alt text, aria) work out of the box with `<img>` and `<button>`.
- **Pan/zoom rolled by hand** (same pattern Globe.tsx already uses for the planet — pointer events + transform refs). No `panzoom` dependency.

### Server vs client

The route's page is a Server Component that fetches via the existing
`getArtists()` query. Everything inside the graph (simulation, pan/zoom,
hover/focus state) is client-side. No new server endpoints.

### Performance

- 119 tiles × album-art `<img>` = 119 image fetches on mount. The CDN is fast (Apple Music + archive.org), but we can use `loading="lazy"` to defer off-viewport images. `decoding="async"` on every tile.
- Force simulation runs synchronously for ~300 ticks on mount: takes <100ms in practice for this size. No need for animation; freeze and render.
- Re-running the simulation isn't needed — positions are deterministic for a given seed.
- Pan/zoom transforms are GPU-composited (CSS `transform`); no layout thrash.

### ISR

`revalidate = 300` (5 min, matching the other pages).

## States, edge cases, errors

- **No focused tile**: panel shows the default intro state (above).
- **Artist with empty `moods[]`**: place in a "miscellany" implicit cluster
  near the canvas center (rare in current data; add a fallback family
  `unfiled` mapping to the same centroid as Twee & Strange). Most artists
  have at least one mood.
- **Tile with no album art**: typographic fallback (existing pattern from
  Feed/BandDetail).
- **Atlas unreachable at build time**: build fails — same as `/` and other
  Atlas-backed pages.
- **Simulation doesn't converge**: 300 ticks is enough; if a future
  taxonomy makes that insufficient, increase the budget. The simulation
  always produces *some* valid layout — clusters might just be looser.
- **Window resize**: positions are computed in unitless world coordinates
  (~600×400 world units); CSS transform-scale handles fitting to viewport.
  No re-simulation on resize.

## Out of scope (deferred)

- **Filters** (era / country / search) — could overlay later but not in
  v1; the graph already gives a richer overview than filters help.
- **Live drag of tiles to rearrange** — interesting but adds significant
  state; static positions are clearer and more reliable.
- **Edge rendering** — explicitly rejected in brainstorm. Add never.
- **Animated transitions when filtering** — N/A without filters.
- **3D version** — N/A.
- **Saving custom views / shareable URLs** — defer.
- **A "compare two bands" mode** — defer.

## File checklist

New:

- `app/graph/page.tsx` — Server Component
- `components/views/Graph.tsx` — main client view
- `components/views/GraphPanel.tsx` — side panel / drawer
- `components/views/GraphTile.tsx` — single tile (might be inline in Graph if small)
- `lib/mood-families.ts` — taxonomy + centroids
- `lib/graph-layout.ts` — d3-force simulation builder + position computation

Modified:

- `components/SiteNav.tsx` — add `/graph` route between feed and globe
- `app/globals.css` — graph-specific classes (tile, panel, drawer, controls)
- `package.json` — add `d3-force` dependency

## Acceptance

- Visiting `/graph` renders all 119 bands as album-art tiles in 8 implied mood gardens, fit to one screen
- No rings, labels, or edges visible anywhere
- Hovering any tile populates the side panel with that band's data and dims unrelated tiles
- Clicking any tile navigates to that band's detail page
- Drag pans, scroll/pinch zooms, +/− buttons step zoom, ↺ resets to fit-all
- Mobile renders bottom drawer instead of side panel; tap-then-tap-again navigates
- Esc dismisses focus
- Page builds and prerenders cleanly with `npm run build`
- No regressions on existing routes
