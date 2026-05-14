import { test } from "node:test";
import assert from "node:assert/strict";
import type { AtlasArtist } from "./atlas-types";
import { layoutPositions } from "./graph-layout";
import { FAMILY_CENTROIDS, familyFor } from "./mood-families";

function fakeArtist(slug: string, primaryMood: string): AtlasArtist {
  return {
    schemaVersion: 1,
    slug,
    name: slug,
    country: "UK",
    era: "first_wave",
    lat: 0,
    lng: 0,
    intensity: 5,
    subgenre: "shoegaze",
    desc: "",
    moods: [primaryMood],
    discography: [{ slug: "ref", title: "Ref", year: 1992, kind: "LP", isReference: true }],
    listen: {},
  };
}

test("layoutPositions returns a position for every artist", () => {
  const artists = [
    fakeArtist("a", "euphoric_bliss"),
    fakeArtist("b", "wistful_dreamers"),
    fakeArtist("c", "apocalyptic_doom"),
  ];
  const positions = layoutPositions(artists);
  assert.equal(positions.size, 3);
  assert.ok(positions.has("a"));
  assert.ok(positions.has("b"));
  assert.ok(positions.has("c"));
});

test("layoutPositions output is finite (no NaN/Infinity)", () => {
  const artists = Array.from({ length: 50 }, (_, i) =>
    fakeArtist(
      `a${i}`,
      ["euphoric_bliss", "noisy_chaotic", "apocalyptic_doom", "yearning_anthemic"][i % 4]!,
    ),
  );
  const positions = layoutPositions(artists);
  for (const [slug, pos] of positions) {
    assert.ok(Number.isFinite(pos.x), `${slug} x is not finite: ${pos.x}`);
    assert.ok(Number.isFinite(pos.y), `${slug} y is not finite: ${pos.y}`);
  }
});

test("layoutPositions is deterministic for the same input", () => {
  const artists = [
    fakeArtist("a", "euphoric_bliss"),
    fakeArtist("b", "noisy_chaotic"),
    fakeArtist("c", "apocalyptic_doom"),
  ];
  const p1 = layoutPositions(artists);
  const p2 = layoutPositions(artists);
  for (const slug of p1.keys()) {
    assert.equal(p1.get(slug)!.x, p2.get(slug)!.x, `${slug} x differs between runs`);
    assert.equal(p1.get(slug)!.y, p2.get(slug)!.y, `${slug} y differs between runs`);
  }
});

test("artists with the same family cluster within ~80 units of the family centroid", () => {
  const artists = Array.from({ length: 5 }, (_, i) => fakeArtist(`heavy${i}`, "apocalyptic_doom"));
  const positions = layoutPositions(artists);
  const fc = FAMILY_CENTROIDS[familyFor("apocalyptic_doom")];
  for (const [slug, pos] of positions) {
    const dist = Math.hypot(pos.x - fc.x, pos.y - fc.y);
    assert.ok(dist < 80, `${slug} ended up ${dist.toFixed(1)} units from centroid (expected < 80)`);
  }
});

test("artist with empty moods falls back to a family centroid (no NaN)", () => {
  const artist: AtlasArtist = { ...fakeArtist("orphan", ""), moods: [] };
  const positions = layoutPositions([artist]);
  const pos = positions.get("orphan")!;
  assert.ok(Number.isFinite(pos.x) && Number.isFinite(pos.y));
});
