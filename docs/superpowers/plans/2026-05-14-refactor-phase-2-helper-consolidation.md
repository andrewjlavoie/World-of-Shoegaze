# Refactor Phase 2 — Helper consolidation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.
> Strategy doc: `docs/superpowers/specs/2026-05-14-codebase-refactor-strategy.md`
> Depends on: Phase 1 complete (Supabase + Band-typed helpers gone).

**Goal:** Consolidate `refAlbum`, `paletteFor`, `initials`, `moodTag` (which are duplicated 3-6× across `lib/feed-filters.ts` and the four view components, with `??` vs `\|\|` drift) into a single tested module `lib/atlas-helpers.ts`. Six files import from it instead.

**Architecture:** Pure module, no React. Tests via `node:test` like the other `lib/*.test.ts` files. Behavior identical to current — Phase 4 will add the runtime guard for empty discography.

**Tech Stack:** No new dependencies.

---

## File structure

| Action | Path |
|---|---|
| Create | `lib/atlas-helpers.ts` (refAlbum, paletteFor, initials, moodTag) |
| Create | `lib/atlas-helpers.test.ts` |
| Modify | `package.json` (extend `test` script) |
| Modify | `lib/feed-filters.ts` (drop local `refAlbum`, import from `atlas-helpers`) |
| Modify | `components/views/Feed.tsx` (drop locals, import) |
| Modify | `components/views/Timeline.tsx` (drop locals, import) |
| Modify | `components/views/BandDetail.tsx` (drop locals, import) |
| Modify | `components/views/Graph.tsx` (drop locals, import) |
| Modify | `components/views/GraphPanel.tsx` (drop locals, import) |

---

## Task 1 — Build the module + tests

**Files:** `lib/atlas-helpers.ts`, `lib/atlas-helpers.test.ts`, `package.json`

- [ ] **Step 1: Extend the test script**

Edit `package.json`. Update the `test` script:

```json
"test": "tsx --test lib/mood-families.test.ts lib/graph-layout.test.ts lib/feed-filters.test.ts lib/atlas-helpers.test.ts"
```

- [ ] **Step 2: Write the failing test file**

Create `lib/atlas-helpers.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AtlasArtist } from "./atlas-types";
import { refAlbum, paletteFor, initials, moodTag } from "./atlas-helpers";

function fakeArtist(opts: Partial<AtlasArtist> & { slug: string }): AtlasArtist {
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
    desc: opts.desc ?? "",
    moods: opts.moods ?? ["euphoric_bliss"],
    discography: opts.discography ?? [
      { slug: "ref", title: "Ref", year: 1992, kind: "LP", isReference: true },
    ],
    listen: opts.listen ?? {},
  };
}

test("refAlbum returns the reference album when one is flagged", () => {
  const a = fakeArtist({
    slug: "x",
    discography: [
      { slug: "a", title: "A", year: 1990, kind: "EP" },
      { slug: "b", title: "B", year: 1992, kind: "LP", isReference: true },
      { slug: "c", title: "C", year: 1995, kind: "LP" },
    ],
  });
  assert.equal(refAlbum(a)?.slug, "b");
});

test("refAlbum falls back to discography[0] when none flagged", () => {
  const a = fakeArtist({
    slug: "x",
    discography: [
      { slug: "a", title: "A", year: 1990, kind: "LP" },
      { slug: "b", title: "B", year: 1992, kind: "LP" },
    ],
  });
  assert.equal(refAlbum(a)?.slug, "a");
});

test("refAlbum returns undefined for empty discography", () => {
  // Behavior preserved from the existing duplicated implementations:
  // discography[0] on an empty array is undefined. Phase 4 will prevent
  // this state from ever existing via zod at the Mongo boundary.
  const a = fakeArtist({ slug: "x", discography: [] });
  assert.equal(refAlbum(a), undefined);
});

test("initials: two-word name → first two initials uppercased", () => {
  assert.equal(initials("Slowdive"), "SL");          // single-word fallback
  assert.equal(initials("My Bloody Valentine"), "MB");
  assert.equal(initials("The Cure"), "C");           // strips leading "The "
});

test("initials: 'The' prefix is stripped", () => {
  assert.equal(initials("The Jesus and Mary Chain"), "JA");
});

test("moodTag: lowercases and replaces non-alphanumerics with underscores", () => {
  assert.equal(moodTag("Heavy & Doom"), "heavy_doom");
  assert.equal(moodTag("UK / USA"), "uk_usa");
  assert.equal(moodTag("__leading--trailing__"), "leading_trailing");
});

test("paletteFor: derives hue from first mood when present", () => {
  // primary mood "euphoric_bliss" — actual hue depends on MOOD_COLORS
  const palette = paletteFor(["euphoric_bliss"]);
  assert.equal(typeof palette.hue, "number");
  assert.ok(palette.bg.startsWith("linear-gradient"));
  assert.equal(palette.fg, "#fff8e8");
});

test("paletteFor: falls back to default hue when moods empty or unknown", () => {
  const palette = paletteFor([]);
  assert.equal(palette.hue, 260);
});
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
npm test
```

Expected: failure with `Cannot find module './atlas-helpers'`.

- [ ] **Step 4: Implement `lib/atlas-helpers.ts`**

Create `lib/atlas-helpers.ts`:

```ts
import type { AtlasArtist, AtlasAlbum } from "./atlas-types";
import { MOOD_COLORS } from "./data";

const DEFAULT_HUE = 260;
const FG = "#fff8e8";

export interface Palette {
  hue: number;
  bg: string;
  fg: string;
}

/**
 * Returns the artist's reference album, or the first album if none is
 * flagged, or undefined if the discography is empty.
 *
 * Empty discography is undefined behavior in the schema (Phase 4 will
 * enforce non-empty at the Mongo boundary). Until then, callers that
 * assume an album exists will throw on .title — same as today.
 */
export function refAlbum(artist: AtlasArtist): AtlasAlbum | undefined {
  return artist.discography.find((d) => d.isReference) ?? artist.discography[0];
}

/**
 * Two-character monogram for an artist name. Strips a leading "The ".
 * Single-word names get their first two letters; multi-word get first
 * letter of first two words.
 */
export function initials(name: string): string {
  const words = name.replace(/^The\s+/i, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * URL-safe / class-safe lowercased token. Differs from slugify (which
 * uses '-') by joining with underscores — kept for compatibility with
 * the existing #hashtag styling in the Feed cards.
 */
export function moodTag(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Color palette derived from the artist's primary mood. Returns the hue
 * (degrees), a CSS gradient background, and a foreground that contrasts
 * against the gradient.
 */
export function paletteFor(moods: string[]): Palette {
  const primary = moods[0];
  const hue = primary && MOOD_COLORS[primary] ? MOOD_COLORS[primary].hue : DEFAULT_HUE;
  return {
    hue,
    bg: `linear-gradient(135deg, hsl(${hue}, 55%, 35%), hsl(${(hue + 35) % 360}, 60%, 22%))`,
    fg: FG,
  };
}
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all 8 new tests pass.

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add lib/atlas-helpers.ts lib/atlas-helpers.test.ts package.json
git commit -m "$(cat <<'EOF'
Refactor: lib/atlas-helpers.ts (refAlbum, paletteFor, initials, moodTag)

New pure module gathering the four helpers that were previously
duplicated across Feed.tsx, Timeline.tsx, BandDetail.tsx, Graph.tsx,
GraphPanel.tsx, and lib/feed-filters.ts (with subtle ?? vs || drift
on refAlbum). Tests cover refAlbum's empty-discography case explicitly
to document the current behavior — Phase 4 will eliminate that case
via zod validation at the Mongo boundary.

Consumers migrated in the next commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Migrate `lib/feed-filters.ts`

**Files:** `lib/feed-filters.ts`

- [ ] **Step 1: Replace the local `refAlbum` definition**

Open `lib/feed-filters.ts`. Find the local `function refAlbum(a: AtlasArtist) { ... }`. Delete the function. Add to the imports at the top:

```ts
import { refAlbum } from "./atlas-helpers";
```

- [ ] **Step 2: Verify**

```bash
npm test && npx tsc --noEmit
```

Expected: all tests pass (including the existing 38 in `feed-filters.test.ts` + 8 new in `atlas-helpers.test.ts`).

- [ ] **Step 3: Commit**

```bash
git add lib/feed-filters.ts
git commit -m "Refactor: feed-filters uses lib/atlas-helpers#refAlbum

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Migrate `components/views/Feed.tsx`

**Files:** `components/views/Feed.tsx`

- [ ] **Step 1: Edit imports + delete local helpers**

Add to the imports near the top (alongside other `@/lib/*` imports):

```ts
import { initials, moodTag, paletteFor, refAlbum } from "@/lib/atlas-helpers";
```

Delete the four local functions: `initials`, `moodTag`, `paletteFor`, `refAlbum`. Keep `IntensityBar` and `FeedCard`.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -3
```

Then in a browser (`npm start`), confirm the Feed renders identically.

- [ ] **Step 3: Commit**

```bash
git add components/views/Feed.tsx
git commit -m "Refactor: Feed.tsx uses lib/atlas-helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Migrate `Timeline.tsx`, `BandDetail.tsx`, `Graph.tsx`, `GraphPanel.tsx`

**Files:** `components/views/Timeline.tsx`, `BandDetail.tsx`, `Graph.tsx`, `GraphPanel.tsx`

For each file:
- [ ] Add `import { ...whichever helpers it uses } from "@/lib/atlas-helpers";`
- [ ] Delete its local copies of `refAlbum`, `initials`, `paletteFor`, `moodTag` (only the ones it actually defines locally — names may vary slightly, e.g., `Timeline.tsx` has `artistHue`/`refAlbumYear`; check before deleting)
- [ ] Update call sites if the helper signature differs

**Important:** `Timeline.tsx` may have `artistHue(artist)` returning just the hue — replace with `paletteFor(artist.moods).hue`. `BandDetail.tsx` may have `tileBg(moods)` returning just the gradient string — replace with `paletteFor(moods).bg`. **Read each file first**, identify each duplicate by exact signature, replace one at a time.

- [ ] **Step 1: Migrate one file at a time, verifying after each**

After each file:
```bash
npx tsc --noEmit && npm run build 2>&1 | tail -3
```

- [ ] **Step 2: Browser smoke after all four**

```bash
PID=$(ss -tlnp 2>/dev/null | grep :3000 | grep -oP 'pid=\K\d+'); [ -n "$PID" ] && kill "$PID" && sleep 1
nohup npm start -- -H 0.0.0.0 -p 3000 > /tmp/wos-prod.log 2>&1 &
until grep -q "Ready in" /tmp/wos-prod.log 2>/dev/null; do sleep 1; done
for r in "/" "/graph" "/timeline" "/band/slowdive"; do
  echo "${r} → $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000${r})"
done
```

Open each page in a browser — confirm the album-art gradients, avatar initials, and tag styling all look identical to before.

- [ ] **Step 3: Single combined commit (or one per file — operator's choice)**

```bash
git add components/views/Timeline.tsx components/views/BandDetail.tsx components/views/Graph.tsx components/views/GraphPanel.tsx
git commit -m "$(cat <<'EOF'
Refactor: views consume lib/atlas-helpers

Removes the last duplicate copies of refAlbum, initials, paletteFor
across Timeline, BandDetail, Graph, GraphPanel. All four views now
import from the single source.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Final verify + push

- [ ] **Step 1: Confirm no remaining duplicates**

```bash
grep -rn "function refAlbum\\|const refAlbum\\|function initials\\|function paletteFor\\|function moodTag" \
  app components lib --include="*.ts" --include="*.tsx" | grep -v "lib/atlas-helpers"
```

Expected: empty (or matches only inside test files).

- [ ] **Step 2: Full check**

```bash
npx tsc --noEmit && npm test && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Push**

```bash
git push origin main 2>&1 | tail -3
```

---

## Acceptance

- New `lib/atlas-helpers.ts` exports `refAlbum`, `paletteFor`, `initials`, `moodTag`
- 8 new tests pass; existing tests unchanged
- Six files import from it; zero local duplicates remain
- All views render identically (browser smoke clean)
- `??` vs `\|\|` drift on `refAlbum` resolved (single canonical implementation)
