// Force-directed layout for the graph view.
// Pure logic — runs a synchronous d3-force simulation for a fixed budget
// of ticks and returns final {x, y} per artist slug. No animation, no
// React, no I/O. The Graph component calls this once on mount and renders
// the static result.

import {
  forceCollide,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import type { AtlasArtist } from "./atlas-types";
import { FAMILY_CENTROIDS, type FamilyKey, familyFor, SUB_MOOD_OFFSETS } from "./mood-families";

export interface NodePos {
  x: number;
  y: number;
}

interface SimNode extends SimulationNodeDatum {
  slug: string;
  family: FamilyKey;
  familyX: number;
  familyY: number;
  subFamilyX: number;
  subFamilyY: number;
}

const DEFAULT_TICKS = 300;
const TILE_RADIUS = 30; // ≈ tile size 50px + breathing-room padding
const SUB_FORCE = 0.9; // strong attraction to sub-mood centroid
const FAMILY_FORCE = 0.3; // medium attraction to family centroid
const CHARGE = -8; // light universal repulsion

/**
 * Cheap deterministic hash of a string → small non-negative integer.
 * Used to seed initial positions so the simulation produces the same
 * layout on every call for the same input.
 */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function layoutPositions(
  artists: AtlasArtist[],
  opts: { ticks?: number } = {},
): Map<string, NodePos> {
  const ticks = opts.ticks ?? DEFAULT_TICKS;

  const nodes: SimNode[] = artists.map((a) => {
    const primary = a.moods[0];
    const family = familyFor(primary);
    const fc = FAMILY_CENTROIDS[family];
    const off = primary ? (SUB_MOOD_OFFSETS[primary] ?? { dx: 0, dy: 0 }) : { dx: 0, dy: 0 };
    const sx = fc.x + off.dx;
    const sy = fc.y + off.dy;
    const h = hashString(a.slug);
    // Seed positions near the sub-mood centroid with a small deterministic jitter.
    return {
      slug: a.slug,
      family,
      familyX: fc.x,
      familyY: fc.y,
      subFamilyX: sx,
      subFamilyY: sy,
      x: sx + ((h % 11) - 5),
      y: sy + (((h >> 4) % 11) - 5),
      vx: 0,
      vy: 0,
    };
  });

  const sim = forceSimulation<SimNode>(nodes)
    .force("subX", forceX<SimNode>((d) => d.subFamilyX).strength(SUB_FORCE))
    .force("subY", forceY<SimNode>((d) => d.subFamilyY).strength(SUB_FORCE))
    .force("famX", forceX<SimNode>((d) => d.familyX).strength(FAMILY_FORCE))
    .force("famY", forceY<SimNode>((d) => d.familyY).strength(FAMILY_FORCE))
    .force("charge", forceManyBody<SimNode>().strength(CHARGE))
    .force("collide", forceCollide<SimNode>(TILE_RADIUS))
    .alphaDecay(0.05)
    .stop();

  for (let i = 0; i < ticks; i++) sim.tick();

  const out = new Map<string, NodePos>();
  for (const n of nodes) {
    out.set(n.slug, { x: n.x ?? 0, y: n.y ?? 0 });
  }
  return out;
}
