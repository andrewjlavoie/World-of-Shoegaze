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
