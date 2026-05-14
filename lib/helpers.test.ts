import { test } from "node:test";
import assert from "node:assert/strict";
import { eraLabel, slugify } from "./helpers";

test("eraLabel: known era keys map to human labels", () => {
  assert.equal(eraLabel("first_wave"), "First Wave");
  assert.equal(eraLabel("current"), "Current");
  assert.equal(eraLabel("proto"), "Proto");
  assert.equal(eraLabel("transitional"), "Transitional");
  // second_wave is labelled "Nu-Gaze" in the data
  assert.equal(eraLabel("second_wave"), "Nu-Gaze");
});

test("eraLabel: unknown era key returns the key as-is", () => {
  assert.equal(eraLabel("bogus"), "bogus");
  assert.equal(eraLabel(""), "");
});

test("slugify: lowercases and replaces non-alphanumerics with dashes", () => {
  assert.equal(slugify("My Bloody Valentine"), "my-bloody-valentine");
  assert.equal(slugify("UK!? / USA"), "uk-usa");
});

test("slugify: trims leading and trailing separators", () => {
  assert.equal(slugify("---trim---"), "trim");
});

test("slugify: collapses runs of separators into a single dash", () => {
  assert.equal(slugify("a   b   c"), "a-b-c");
});

test("slugify: strips apostrophes and quotes before collapsing", () => {
  // quotes are removed, not converted to dashes
  assert.equal(slugify("it's alive"), "its-alive");
  assert.equal(slugify('"hello"'), "hello");
});

test("slugify: empty input returns empty string", () => {
  assert.equal(slugify(""), "");
});
