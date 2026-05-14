import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampZoom,
  zoomAround,
  pointerMidpoint,
  pointerDistance,
  computeFitTransform,
  type Transform,
  type ZoomBounds,
  type WorldBounds,
} from "./use-pan-zoom";

const BOUNDS: ZoomBounds = { minZ: 0.5, maxZ: 4 };

// ---------------------------------------------------------------------------
// clampZoom
// ---------------------------------------------------------------------------

test("clampZoom: values within range pass through unchanged", () => {
  assert.equal(clampZoom(1, BOUNDS), 1);
  assert.equal(clampZoom(0.5, BOUNDS), 0.5);
  assert.equal(clampZoom(4, BOUNDS), 4);
});

test("clampZoom: values below minZ are clamped to minZ", () => {
  assert.equal(clampZoom(0.1, BOUNDS), 0.5);
  assert.equal(clampZoom(0, BOUNDS), 0.5);
});

test("clampZoom: values above maxZ are clamped to maxZ", () => {
  assert.equal(clampZoom(10, BOUNDS), 4);
  assert.equal(clampZoom(4.0001, BOUNDS), 4);
});

// ---------------------------------------------------------------------------
// zoomAround: focal point stability
// ---------------------------------------------------------------------------

test("zoomAround: world point under focal stays fixed after zoom in", () => {
  const tf: Transform = { z: 1, x: 0, y: 0 };
  const focal = { x: 100, y: 80 };
  const factor = 2;
  const result = zoomAround(tf, focal, factor, BOUNDS);

  // The world point under focal before zoom:
  const wpx = (focal.x - tf.x) / tf.z;
  const wpy = (focal.y - tf.y) / tf.z;

  // After zoom, mapping world point back to viewport should give focal.
  const backX = wpx * result.z + result.x;
  const backY = wpy * result.z + result.y;

  assert.ok(Math.abs(backX - focal.x) < 1e-9, `expected backX≈${focal.x}, got ${backX}`);
  assert.ok(Math.abs(backY - focal.y) < 1e-9, `expected backY≈${focal.y}, got ${backY}`);
});

test("zoomAround: world point under focal stays fixed after zoom out", () => {
  const tf: Transform = { z: 2, x: -50, y: -30 };
  const focal = { x: 200, y: 150 };
  const factor = 0.5;
  const result = zoomAround(tf, focal, factor, BOUNDS);

  const wpx = (focal.x - tf.x) / tf.z;
  const wpy = (focal.y - tf.y) / tf.z;
  const backX = wpx * result.z + result.x;
  const backY = wpy * result.z + result.y;

  assert.ok(Math.abs(backX - focal.x) < 1e-9, `expected backX≈${focal.x}, got ${backX}`);
  assert.ok(Math.abs(backY - focal.y) < 1e-9, `expected backY≈${focal.y}, got ${backY}`);
});

test("zoomAround: zoom is applied correctly", () => {
  const tf: Transform = { z: 1, x: 0, y: 0 };
  const result = zoomAround(tf, { x: 0, y: 0 }, 2, BOUNDS);
  assert.equal(result.z, 2);
});

// ---------------------------------------------------------------------------
// zoomAround: clamping
// ---------------------------------------------------------------------------

test("zoomAround: returns current transform unchanged when already at maxZ", () => {
  const tf: Transform = { z: 4, x: 10, y: 20 };
  const result = zoomAround(tf, { x: 100, y: 100 }, 10, BOUNDS);
  assert.deepEqual(result, tf);
});

test("zoomAround: returns current transform unchanged when already at minZ", () => {
  const tf: Transform = { z: 0.5, x: 10, y: 20 };
  const result = zoomAround(tf, { x: 100, y: 100 }, 0.01, BOUNDS);
  assert.deepEqual(result, tf);
});

test("zoomAround: clamps zoom to maxZ rather than exceeding it", () => {
  const tf: Transform = { z: 3, x: 0, y: 0 };
  const result = zoomAround(tf, { x: 0, y: 0 }, 10, BOUNDS);
  assert.equal(result.z, 4);
});

test("zoomAround: clamps zoom to minZ rather than going below it", () => {
  const tf: Transform = { z: 1, x: 0, y: 0 };
  const result = zoomAround(tf, { x: 0, y: 0 }, 0.001, BOUNDS);
  assert.equal(result.z, 0.5);
});

// ---------------------------------------------------------------------------
// pointerMidpoint
// ---------------------------------------------------------------------------

test("pointerMidpoint: computes midpoint between two points", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 200 };
  const mid = pointerMidpoint(a, b);
  assert.equal(mid.x, 50);
  assert.equal(mid.y, 100);
});

test("pointerMidpoint: identical points give same point", () => {
  const p = { x: 42, y: 17 };
  const mid = pointerMidpoint(p, p);
  assert.equal(mid.x, 42);
  assert.equal(mid.y, 17);
});

// ---------------------------------------------------------------------------
// pointerDistance
// ---------------------------------------------------------------------------

test("pointerDistance: horizontal distance", () => {
  assert.equal(pointerDistance({ x: 0, y: 0 }, { x: 100, y: 0 }), 100);
});

test("pointerDistance: vertical distance", () => {
  assert.equal(pointerDistance({ x: 0, y: 0 }, { x: 0, y: 50 }), 50);
});

test("pointerDistance: Pythagorean triple", () => {
  assert.equal(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test("pointerDistance: symmetric (order doesn't matter)", () => {
  const a = { x: 10, y: 20 };
  const b = { x: 40, y: 60 };
  assert.equal(pointerDistance(a, b), pointerDistance(b, a));
});

// ---------------------------------------------------------------------------
// computeFitTransform
// ---------------------------------------------------------------------------

const WORLD: WorldBounds = { minX: 0, maxX: 600, minY: 0, maxY: 400 };

test("computeFitTransform: world center maps to viewport center", () => {
  const vpW = 800;
  const vpH = 600;
  const margin = 0;
  const tf = computeFitTransform(vpW, vpH, WORLD, margin, BOUNDS);

  // World center
  const wcx = (WORLD.minX + WORLD.maxX) / 2; // 300
  const wcy = (WORLD.minY + WORLD.maxY) / 2; // 200

  // After applying transform: world center should appear at viewport center
  const vx = wcx * tf.z + tf.x;
  const vy = wcy * tf.z + tf.y;

  assert.ok(Math.abs(vx - vpW / 2) < 1e-9, `expected world center at vpW/2=${vpW / 2}, got ${vx}`);
  assert.ok(Math.abs(vy - vpH / 2) < 1e-9, `expected world center at vpH/2=${vpH / 2}, got ${vy}`);
});

test("computeFitTransform: zoom is clamped to maxZ", () => {
  // Very large viewport → zoom would be huge → must be clamped.
  const tf = computeFitTransform(100000, 100000, WORLD, 0, BOUNDS);
  assert.equal(tf.z, BOUNDS.maxZ);
});

test("computeFitTransform: zoom is clamped to minZ", () => {
  // Tiny viewport → zoom would be tiny → must be clamped.
  const tf = computeFitTransform(5, 5, WORLD, 0, BOUNDS);
  assert.equal(tf.z, BOUNDS.minZ);
});

test("computeFitTransform: margin reduces effective viewport", () => {
  const vpW = 800;
  const vpH = 600;
  const tfNoMargin = computeFitTransform(vpW, vpH, WORLD, 0, BOUNDS);
  const tfWithMargin = computeFitTransform(vpW, vpH, WORLD, 40, BOUNDS);
  // Adding margin means less space → smaller (or equal) zoom.
  assert.ok(
    tfWithMargin.z <= tfNoMargin.z,
    `expected zoom with margin ≤ without, got ${tfWithMargin.z} vs ${tfNoMargin.z}`,
  );
});
