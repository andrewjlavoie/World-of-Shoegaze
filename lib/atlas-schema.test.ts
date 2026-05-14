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
  discography: [{ slug: "souvlaki", title: "Souvlaki", year: 1993, kind: "LP", isReference: true }],
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

// Real production data has artists with moods: [] (mint-field, resplandor),
// so the schema accepts empty moods arrays. We still reject non-string items.
test("artistSchema accepts empty moods (real production data has empty arrays)", () => {
  const doc = { ...validDoc, moods: [] };
  const result = artistSchema.safeParse(doc);
  assert.equal(result.success, true);
});

test("artistSchema rejects moods with non-string items", () => {
  const bad = { ...validDoc, moods: [42] };
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
  // suppress warn output during the test
  const original = console.warn;
  console.warn = () => {};
  try {
    const out = parseArtists(docs);
    assert.equal(out.length, 2);
    assert.deepEqual(
      out.map((a) => a.slug),
      ["slowdive", "alsogood"],
    );
  } finally {
    console.warn = original;
  }
});

test("parseArtists logs a warning for each dropped doc", () => {
  const original = console.warn;
  let warnCount = 0;
  console.warn = () => {
    warnCount++;
  };
  try {
    parseArtists([{ ...validDoc, slug: "x", discography: [] }]);
    assert.equal(warnCount, 1);
  } finally {
    console.warn = original;
  }
});
