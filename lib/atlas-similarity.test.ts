import { test } from "node:test";
import assert from "node:assert/strict";
import type { AtlasArtist } from "./atlas-types";
import { computeSimilarityAtlas, similarArtists } from "./atlas-similarity";

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
    moods: opts.moods ?? ["wistful_dreamers"],
    discography: opts.discography ?? [
      { slug: "ref", title: "Ref", year: 1992, kind: "LP", isReference: true },
    ],
    listen: opts.listen ?? {},
  };
}

// ── computeSimilarityAtlas ──────────────────────────────────────────────────

test("computeSimilarityAtlas: same slug returns -Infinity (self-exclusion guard)", () => {
  const a = fakeArtist({ slug: "x" });
  const b = fakeArtist({ slug: "x" });
  assert.equal(computeSimilarityAtlas(a, b), -Infinity);
});

test("computeSimilarityAtlas: artists with identical attributes score > 0", () => {
  const a = fakeArtist({ slug: "x" });
  const b = fakeArtist({ slug: "y" }); // same defaults: era, country, moods, intensity
  const score = computeSimilarityAtlas(a, b);
  assert.ok(score > 0, `expected positive score, got ${score}`);
});

test("computeSimilarityAtlas: shared moods raise the score", () => {
  const base = fakeArtist({ slug: "x", moods: ["wistful_dreamers", "noise_chaos"] });
  // partial: shares one mood; all other attributes differ
  const partial = fakeArtist({
    slug: "y",
    era: "current",
    country: "Japan",
    moods: ["wistful_dreamers"],
    intensity: 9,
  });
  // none: shares no moods; all other attributes also differ
  const none = fakeArtist({
    slug: "z",
    era: "current",
    country: "Japan",
    moods: ["japanese_gaze"],
    intensity: 9,
  });
  assert.ok(
    computeSimilarityAtlas(base, partial) > computeSimilarityAtlas(base, none),
    "shared moods should yield higher score",
  );
});

test("computeSimilarityAtlas: same era scores higher than adjacent era", () => {
  const base = fakeArtist({ slug: "x", era: "first_wave", moods: [], intensity: 5 });
  const sameEra = fakeArtist({ slug: "y", era: "first_wave", moods: [], intensity: 5 });
  const adjEra = fakeArtist({ slug: "z", era: "transitional", moods: [], intensity: 5 });
  assert.ok(
    computeSimilarityAtlas(base, sameEra) > computeSimilarityAtlas(base, adjEra),
    "same era should outscore adjacent era",
  );
});

test("computeSimilarityAtlas: same intensity scores higher than intensity-1 apart", () => {
  const base = fakeArtist({ slug: "x", moods: [], intensity: 5 });
  const same = fakeArtist({ slug: "y", moods: [], intensity: 5 });
  const off1 = fakeArtist({ slug: "z", moods: [], intensity: 6 });
  assert.ok(
    computeSimilarityAtlas(base, same) > computeSimilarityAtlas(base, off1),
    "same intensity should outscore intensity-1 apart",
  );
});

test("computeSimilarityAtlas: same country adds to the score", () => {
  const base = fakeArtist({ slug: "x", country: "UK", moods: [], intensity: 5, era: "first_wave" });
  const sameCountry = fakeArtist({
    slug: "y",
    country: "UK",
    moods: [],
    intensity: 5,
    era: "first_wave",
  });
  const diffCountry = fakeArtist({
    slug: "z",
    country: "Japan",
    moods: [],
    intensity: 5,
    era: "first_wave",
  });
  assert.ok(
    computeSimilarityAtlas(base, sameCountry) > computeSimilarityAtlas(base, diffCountry),
    "same country should yield higher score",
  );
});

test("computeSimilarityAtlas: dissimilar artists score lower than similar ones", () => {
  const a = fakeArtist({
    slug: "x",
    era: "first_wave",
    country: "UK",
    moods: ["wistful_dreamers"],
    intensity: 4,
  });
  const close = fakeArtist({
    slug: "y",
    era: "first_wave",
    country: "UK",
    moods: ["wistful_dreamers"],
    intensity: 4,
  });
  const far = fakeArtist({
    slug: "z",
    era: "current",
    country: "Japan",
    moods: ["japanese_gaze"],
    intensity: 9,
  });
  assert.ok(computeSimilarityAtlas(a, far) < computeSimilarityAtlas(a, close));
});

// ── similarArtists ──────────────────────────────────────────────────────────

test("similarArtists: excludes the target itself (same slug filtered out)", () => {
  const target = fakeArtist({ slug: "target" });
  const pool = [
    fakeArtist({ slug: "a" }),
    fakeArtist({ slug: "b" }),
    target, // same slug — must be excluded
  ];
  const out = similarArtists(target, pool, 5);
  assert.ok(!out.some((a) => a.slug === "target"), "target slug should not appear in results");
});

test("similarArtists: respects the limit parameter", () => {
  const target = fakeArtist({ slug: "target" });
  const pool = Array.from({ length: 10 }, (_, i) => fakeArtist({ slug: `a${i}`, intensity: i }));
  const out = similarArtists(target, pool, 3);
  assert.ok(out.length <= 3, `expected ≤3 results, got ${out.length}`);
});

test("similarArtists: results are ordered by score descending", () => {
  const target = fakeArtist({
    slug: "target",
    era: "first_wave",
    moods: ["wistful_dreamers"],
    intensity: 5,
  });
  // "close" shares era + mood + intensity → high score
  const close = fakeArtist({
    slug: "close",
    era: "first_wave",
    moods: ["wistful_dreamers"],
    intensity: 5,
  });
  // "far" shares nothing → low score
  const far = fakeArtist({
    slug: "far",
    era: "current",
    country: "Japan",
    moods: ["japanese_gaze"],
    intensity: 1,
  });
  const out = similarArtists(target, [far, close], 2);
  assert.equal(out[0]?.slug, "close", "highest-similarity artist should be first");
});

test("similarArtists: only returns artists with score > 0", () => {
  const target = fakeArtist({
    slug: "target",
    moods: [],
    intensity: 5,
    era: "first_wave",
    country: "UK",
  });
  // Artist with intensity 8 and different era/country: intDist=3, eraDist=2 → score 0
  const zero = fakeArtist({
    slug: "zero",
    moods: [],
    intensity: 8,
    era: "current",
    country: "Japan",
  });
  const positive = fakeArtist({
    slug: "positive",
    moods: ["wistful_dreamers"],
    intensity: 5,
    era: "first_wave",
    country: "UK",
  });
  const out = similarArtists(target, [zero, positive], 5);
  assert.ok(!out.some((a) => a.slug === "zero"), "zero-score artist should be excluded");
  assert.ok(
    out.some((a) => a.slug === "positive"),
    "positive-score artist should be included",
  );
});

test("similarArtists: returns AtlasArtist objects (not score wrappers)", () => {
  const target = fakeArtist({ slug: "target" });
  const other = fakeArtist({ slug: "other" });
  const out = similarArtists(target, [other], 5);
  if (out.length > 0) {
    // The result should have AtlasArtist shape, not { artist, score }
    assert.ok("slug" in out[0]!, "result element should be an AtlasArtist with a slug");
    assert.ok(!("score" in out[0]!), "result element should not be a score wrapper");
  }
});
