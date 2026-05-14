# Refactor Phase 4 — Data layer hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.
> Strategy doc: `docs/superpowers/specs/2026-05-14-codebase-refactor-strategy.md`
> Best after: Phases 1, 2, 3.

**Goal:** Close the silent-failure gaps at the Mongo boundary and around route errors. Today: a malformed Atlas document crashes silently inside `refAlbum().title` in the JSX render tree. Missing `MONGODB_URI` throws at module import time. `notFound()` falls through to the default Next.js error UI. After: docs are zod-parsed at the boundary (drop or warn on invalid), `db.ts` lazy-inits, `app/error.tsx` and `app/not-found.tsx` exist, and `lib/atlas-similarity.ts` + `slugify` get tests.

**Architecture:** Schema parse-at-boundary. Keep existing `AtlasArtist` type as the *consumer-facing* shape; the zod schema lives next to it and `getArtists()`/`getArtistBySlug()` route raw docs through it before returning.

**Tech Stack:** Adds `zod` (~9KB minified, tree-shakable).

---

## File structure

| Action | Path |
|---|---|
| Create | `lib/atlas-schema.ts` |
| Create | `lib/atlas-schema.test.ts` |
| Create | `lib/atlas-similarity.test.ts` |
| Create | `lib/helpers.test.ts` (just `slugify` and `eraLabel`) |
| Create | `app/error.tsx` |
| Create | `app/not-found.tsx` |
| Create | `app/band/[slug]/not-found.tsx` (route-level fallback) |
| Modify | `lib/atlas-queries.ts` (route docs through schema) |
| Modify | `lib/db.ts` (lazy-init the URI check) |
| Modify | `package.json` (add zod; extend `test` script with new test files) |

---

## Task 1 — Add zod schema for `AtlasArtist`

**Files:** `lib/atlas-schema.ts`, `lib/atlas-schema.test.ts`, `package.json`

- [ ] **Step 1: Install zod**

```bash
npm install zod
```

- [ ] **Step 2: Extend test script**

```json
"test": "tsx --test lib/mood-families.test.ts lib/graph-layout.test.ts lib/feed-filters.test.ts lib/atlas-helpers.test.ts lib/atlas-schema.test.ts lib/atlas-similarity.test.ts lib/helpers.test.ts"
```

- [ ] **Step 3: Write failing tests**

Create `lib/atlas-schema.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { artistSchema, parseArtists } from "./atlas-schema";

const validDoc = {
  schemaVersion: 1,
  slug: "slowdive",
  name: "Slowdive",
  country: "UK",
  era: "first_wave",
  lat: 51.0,
  lng: -1.0,
  intensity: 4,
  subgenre: "shoegaze",
  desc: "Reading dream-pop architects.",
  moods: ["wistful_dreamers"],
  discography: [
    { slug: "souvlaki", title: "Souvlaki", year: 1993, kind: "LP", isReference: true },
  ],
  listen: {},
};

test("artistSchema accepts a valid document", () => {
  const result = artistSchema.safeParse(validDoc);
  assert.equal(result.success, true);
});

test("artistSchema rejects empty discography", () => {
  const bad = { ...validDoc, discography: [] };
  const result = artistSchema.safeParse(bad);
  assert.equal(result.success, false);
});

test("artistSchema rejects empty moods", () => {
  const bad = { ...validDoc, moods: [] };
  const result = artistSchema.safeParse(bad);
  assert.equal(result.success, false);
});

test("artistSchema rejects unknown era keys", () => {
  const bad = { ...validDoc, era: "bogus" };
  const result = artistSchema.safeParse(bad);
  assert.equal(result.success, false);
});

test("artistSchema rejects intensity out of range", () => {
  const lo = artistSchema.safeParse({ ...validDoc, intensity: -1 });
  const hi = artistSchema.safeParse({ ...validDoc, intensity: 11 });
  assert.equal(lo.success, false);
  assert.equal(hi.success, false);
});

test("parseArtists drops invalid docs and returns the valid ones", () => {
  const docs = [
    validDoc,
    { ...validDoc, slug: "broken", discography: [] },
    { ...validDoc, slug: "alsogood" },
  ];
  const out = parseArtists(docs);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((a) => a.slug), ["slowdive", "alsogood"]);
});

test("parseArtists logs a warning for each dropped doc", () => {
  const original = console.warn;
  let warnCount = 0;
  console.warn = () => { warnCount++; };
  try {
    parseArtists([{ ...validDoc, slug: "x", discography: [] }]);
    assert.equal(warnCount, 1);
  } finally {
    console.warn = original;
  }
});
```

- [ ] **Step 4: Verify failure**

```bash
npm test
```

Expected: failure on `Cannot find module './atlas-schema'`.

- [ ] **Step 5: Implement `lib/atlas-schema.ts`**

```ts
import { z } from "zod";

const ERA_KEYS = ["proto", "first_wave", "transitional", "nu_gaze", "current"] as const;

const albumSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  kind: z.enum(["LP", "EP", "single", "comp", "demo"]).optional(),
  isReference: z.boolean().optional(),
  art: z.object({ url: z.string().url(), source: z.string().optional() }).optional(),
  note: z.string().optional(),
});

export const artistSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  country: z.string().min(1),
  era: z.enum(ERA_KEYS),
  lat: z.number(),
  lng: z.number(),
  intensity: z.number().int().min(0).max(10),
  subgenre: z.string().min(1),
  desc: z.string(),
  moods: z.array(z.string()).min(1),
  discography: z.array(albumSchema).min(1),
  listen: z.record(z.string(), z.union([z.string(), z.object({}).passthrough()])).optional(),
  // Image / enrichment fields are tolerated but not required:
  photo: z.object({ url: z.string().url(), source: z.string().optional() }).optional().nullable(),
});

export type ParsedArtist = z.infer<typeof artistSchema>;

/**
 * Parse an array of raw Mongo docs. Invalid docs are dropped with a
 * console.warn — the caller gets only valid artists. Loud-but-not-fatal
 * is the right posture for a curated dataset where one bad doc
 * shouldn't take down the homepage.
 */
export function parseArtists(docs: unknown[]): ParsedArtist[] {
  const out: ParsedArtist[] = [];
  for (const doc of docs) {
    const result = artistSchema.safeParse(doc);
    if (result.success) {
      out.push(result.data);
    } else {
      const slug = (doc as { slug?: unknown })?.slug;
      console.warn(
        `[atlas-schema] dropping invalid artist doc (slug=${String(slug ?? "<unknown>")}):`,
        result.error.flatten().fieldErrors,
      );
    }
  }
  return out;
}
```

**Important:** verify the schema fields match the actual `AtlasArtist` type in `lib/atlas-types.ts`. If types diverge (e.g., `listen` shape), update the schema to match — DO NOT silently change the data contract.

If the schema is too strict and rejects real production docs, soften the field that's rejecting them (e.g., make `lat`/`lng` optional if some docs lack them) rather than crash on real data.

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: all 7 new tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/atlas-schema.ts lib/atlas-schema.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Quality: zod schema for AtlasArtist

artistSchema parses raw Mongo docs into a validated shape.
parseArtists drops invalid docs with console.warn — loud but
non-fatal so one bad doc doesn't take down the homepage.

Wire-up to atlas-queries in next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Wire schema into `lib/atlas-queries.ts`

**Files:** `lib/atlas-queries.ts`

- [ ] **Step 1: Edit**

Replace the `getArtists` and `getArtistBySlug` implementations to route docs through `parseArtists` (or a single-doc variant). Pseudocode:

```ts
import { parseArtists, artistSchema } from "./atlas-schema";

export async function getArtists(): Promise<AtlasArtist[]> {
  const collection = await getCollection<unknown>("artists");
  const docs = await collection.find({}).toArray();
  return parseArtists(docs.map(stripId));
}

export async function getArtistBySlug(slug: string): Promise<AtlasArtist | null> {
  const collection = await getCollection<unknown>("artists");
  const doc = await collection.findOne({ slug });
  if (!doc) return null;
  const result = artistSchema.safeParse(stripId(doc));
  if (!result.success) {
    console.warn(`[atlas-queries] invalid doc for slug=${slug}`, result.error.flatten().fieldErrors);
    return null;
  }
  return result.data;
}
```

`AtlasArtist` and `ParsedArtist` should be structurally identical — confirm via `const _check: AtlasArtist = {} as ParsedArtist;` (assignability). If not, adjust the schema until they are; consider deriving `AtlasArtist` from the schema in a follow-up.

- [ ] **Step 2: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -5
```

Then in browser: confirm `/`, `/graph`, `/timeline`, `/band/slowdive` all render. Watch the server console for any unexpected `[atlas-schema] dropping invalid artist doc` warnings — if real production docs are rejected, soften the schema for that field.

- [ ] **Step 3: Commit**

```bash
git add lib/atlas-queries.ts
git commit -m "$(cat <<'EOF'
Quality: validate Mongo docs at the boundary

getArtists / getArtistBySlug now route through artistSchema.safeParse.
Bad docs get logged and dropped instead of silently crashing in
refAlbum().title later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Lazy-init `MONGODB_URI` in `lib/db.ts`

**Files:** `lib/db.ts`

- [ ] **Step 1: Edit**

Change the top-level throw to a lazy check inside the connect path:

```ts
function requireUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local for local dev or to your Vercel project env vars.",
    );
  }
  return uri;
}

// inside the connect function:
const uri = requireUri();
```

The throw still happens (eventually), but only when something actually tries to query Mongo — not at module-import time. This means `app/error.tsx` will catch the throw and show a graceful fallback instead of the cryptic build/runtime crash.

- [ ] **Step 2: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -5
```

Optionally: temporarily unset the env var locally and confirm the dev server starts without a crash (the homepage will then fail at fetch time, which `error.tsx` will catch in Task 4).

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "$(cat <<'EOF'
Quality: lazy-init MONGODB_URI check

Top-level throw broke preview deploys missing env vars with cryptic
errors during module import. Move the check into the connect path so
error.tsx (next commit) can catch and display a graceful fallback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Add `app/error.tsx` and `app/not-found.tsx`

**Files:** `app/error.tsx`, `app/not-found.tsx`, `app/band/[slug]/not-found.tsx`

- [ ] **Step 1: Create `app/error.tsx`**

```tsx
"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="wos paper wos-paper-pad" style={{ padding: 32, maxWidth: 640 }}>
      <h1 className="feed-h1">
        Something broke<span className="italic" style={{ color: "var(--accent)" }}>.</span>
      </h1>
      <p className="serif italic" style={{ marginTop: 12 }}>
        The page hit an error. Try reloading; if it persists, the data store may be down.
      </p>
      <button type="button" className="btn" onClick={() => reset()} style={{ marginTop: 16 }}>
        try again
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/not-found.tsx`**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wos paper wos-paper-pad" style={{ padding: 32, maxWidth: 640 }}>
      <h1 className="feed-h1">
        Not found<span className="italic" style={{ color: "var(--accent)" }}>.</span>
      </h1>
      <p className="serif italic" style={{ marginTop: 12 }}>
        Nothing lives at that URL.
      </p>
      <Link href="/" className="btn" style={{ marginTop: 16, display: "inline-block" }}>
        back to the feed
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/band/[slug]/not-found.tsx`** (route-level fallback for `notFound()` calls)

```tsx
import Link from "next/link";

export default function BandNotFound() {
  return (
    <div className="wos paper wos-paper-pad" style={{ padding: 32, maxWidth: 640 }}>
      <h1 className="feed-h1">
        Unknown band<span className="italic" style={{ color: "var(--accent)" }}>.</span>
      </h1>
      <p className="serif italic" style={{ marginTop: 12 }}>
        That slug doesn&rsquo;t exist in the catalog.
      </p>
      <Link href="/" className="btn" style={{ marginTop: 16, display: "inline-block" }}>
        back to the feed
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -5
```

Then in browser:
- Visit `/band/this-does-not-exist` — confirm the route-level not-found renders (oxblood styling, not Next default).
- Visit `/totally-fake-route` — confirm the app-level not-found renders.

- [ ] **Step 5: Commit**

```bash
git add app/error.tsx app/not-found.tsx app/band/[slug]/not-found.tsx
git commit -m "$(cat <<'EOF'
Quality: error.tsx + not-found.tsx fallbacks

Replaces the default Next.js error UIs with branded oxblood-on-cream
fallbacks. Route-level not-found for /band/[slug] catches the existing
notFound() call. error.tsx logs to console and offers reset().

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Add tests for `lib/atlas-similarity.ts` and `slugify`

**Files:** `lib/atlas-similarity.test.ts`, `lib/helpers.test.ts`

- [ ] **Step 1: Write `lib/atlas-similarity.test.ts`**

Read `lib/atlas-similarity.ts` first to confirm the actual function signatures (likely `computeSimilarityAtlas(a, b)` and `similarArtists(target, all, limit)`). Then write tests covering:

- Identical artists → max similarity
- No shared moods → score affected by other dimensions only
- Shared era contributes to score
- Shared country contributes (if implemented)
- Intensity proximity contributes (if implemented)
- `similarArtists` excludes the target itself
- `similarArtists` returns at most `limit` results, ordered by score descending

(Reuse the `fakeArtist` helper pattern from `lib/feed-filters.test.ts`.)

- [ ] **Step 2: Write `lib/helpers.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { eraLabel, slugify } from "./helpers";

test("eraLabel: known keys map to human labels", () => {
  assert.equal(eraLabel("first_wave"), "First Wave");
  assert.equal(eraLabel("nu_gaze"), "Nu-Gaze");
  assert.equal(eraLabel("current"), "Current");
});

test("eraLabel: unknown key returns key as-is", () => {
  assert.equal(eraLabel("bogus"), "bogus");
});

test("slugify: lowercases and dashes non-alphanumerics", () => {
  assert.equal(slugify("My Bloody Valentine"), "my-bloody-valentine");
  assert.equal(slugify("UK!? / USA"), "uk-usa");
  assert.equal(slugify("___trim___"), "trim");
});

test("slugify: collapses runs of separators", () => {
  assert.equal(slugify("a   b   c"), "a-b-c");
});
```

- [ ] **Step 3: Verify both pass**

```bash
npm test
```

- [ ] **Step 4: Commit**

```bash
git add lib/atlas-similarity.test.ts lib/helpers.test.ts package.json
git commit -m "$(cat <<'EOF'
Quality: tests for atlas-similarity and slugify

atlas-similarity.test.ts covers the scoring branches (shared moods,
era, intensity) and the similarArtists ordering/limit semantics.
helpers.test.ts covers slugify (drives /band/[slug] routing — a
regression here is a silent 404 farm) and eraLabel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Push + verify

- [ ] **Step 1: Final check**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -5
```

- [ ] **Step 2: Push**

```bash
git push origin main 2>&1 | tail -3
```

Watch CI — all checks should be green.

---

## Acceptance

- `lib/atlas-schema.ts` parses Mongo docs; invalid ones drop with console.warn
- `lib/atlas-queries.ts` calls the schema for both list and single-doc fetches
- `lib/db.ts` no longer throws at module import time
- `app/error.tsx`, `app/not-found.tsx`, `app/band/[slug]/not-found.tsx` exist and render branded fallbacks
- New tests for `atlas-schema`, `atlas-similarity`, `helpers` all pass
- Test suite count increases by ~15 tests
- Browser smoke clean across all routes including the not-found fallbacks
