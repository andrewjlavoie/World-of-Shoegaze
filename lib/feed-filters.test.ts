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
