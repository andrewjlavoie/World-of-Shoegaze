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
  // Behavior preserved from existing duplicated implementations.
  // Phase 4 will prevent empty discography via zod at the Mongo boundary.
  const a = fakeArtist({ slug: "x", discography: [] });
  assert.equal(refAlbum(a), undefined);
});

test("initials: single-word name → first two letters uppercased", () => {
  assert.equal(initials("Slowdive"), "SL");
});

test("initials: multi-word name → first letter of first two words", () => {
  assert.equal(initials("My Bloody Valentine"), "MB");
});

test("initials: 'The' prefix is stripped", () => {
  assert.equal(initials("The Cure"), "CU"); // becomes single-word "Cure"
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

test("paletteFor: falls back to default hue when moods empty", () => {
  const palette = paletteFor([]);
  assert.equal(palette.hue, 260);
});
