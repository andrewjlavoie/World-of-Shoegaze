import { test } from "node:test";
import assert from "node:assert/strict";
import { MOOD_TO_BANDS } from "../scripts/seed-data";
import {
  FAMILY_KEYS,
  FAMILY_LABELS,
  MOOD_FAMILIES,
  FAMILY_CENTROIDS,
  SUB_MOOD_OFFSETS,
  WORLD_BOUNDS,
} from "./mood-families";

test("FAMILY_KEYS has exactly 8 entries", () => {
  assert.equal(FAMILY_KEYS.length, 8);
});

test("every family in FAMILY_KEYS has a label and centroid", () => {
  for (const f of FAMILY_KEYS) {
    assert.ok(FAMILY_LABELS[f], `missing label for ${f}`);
    assert.ok(FAMILY_CENTROIDS[f], `missing centroid for ${f}`);
    const c = FAMILY_CENTROIDS[f];
    assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y), `non-finite centroid for ${f}`);
  }
});

test("every raw mood in lib/data.ts MOOD_TO_BANDS maps to a known family", () => {
  for (const mood of Object.keys(MOOD_TO_BANDS)) {
    const family = MOOD_FAMILIES[mood];
    assert.ok(family, `MOOD_FAMILIES missing entry for raw mood "${mood}"`);
    assert.ok(FAMILY_KEYS.includes(family), `family "${family}" for "${mood}" not in FAMILY_KEYS`);
  }
});

test("every raw mood has a sub-mood offset", () => {
  for (const mood of Object.keys(MOOD_TO_BANDS)) {
    const off = SUB_MOOD_OFFSETS[mood];
    assert.ok(off, `SUB_MOOD_OFFSETS missing entry for "${mood}"`);
    assert.ok(
      Number.isFinite(off.dx) && Number.isFinite(off.dy),
      `non-finite offset for "${mood}"`,
    );
  }
});

test("every family centroid sits inside WORLD_BOUNDS", () => {
  for (const f of FAMILY_KEYS) {
    const c = FAMILY_CENTROIDS[f];
    assert.ok(c.x >= WORLD_BOUNDS.minX && c.x <= WORLD_BOUNDS.maxX, `${f} x out of bounds`);
    assert.ok(c.y >= WORLD_BOUNDS.minY && c.y <= WORLD_BOUNDS.maxY, `${f} y out of bounds`);
  }
});
