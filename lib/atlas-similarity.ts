// Similarity ranking adapted for AtlasArtist documents.
// Mirrors lib/helpers.ts#computeSimilarity but typed for the Atlas shape.

import { ERA_ORDER } from "./data";
import type { AtlasArtist } from "./atlas-types";

export function computeSimilarityAtlas(a: AtlasArtist, b: AtlasArtist): number {
  if (a.slug === b.slug) return -Infinity;
  let score = 0;

  const shared = a.moods.filter((m) => b.moods.includes(m));
  score += shared.length * 12;

  const eraDist = Math.abs(ERA_ORDER.indexOf(a.era) - ERA_ORDER.indexOf(b.era));
  if (eraDist === 0) score += 4;
  else if (eraDist === 1) score += 2;

  const intDist = Math.abs(a.intensity - b.intensity);
  if (intDist === 0) score += 3;
  else if (intDist === 1) score += 2;
  else if (intDist === 2) score += 1;

  if (a.country === b.country) score += 1;
  return score;
}

export function similarArtists(target: AtlasArtist, pool: AtlasArtist[], n = 6): AtlasArtist[] {
  return pool
    .map((other) => ({ artist: other, score: computeSimilarityAtlas(target, other) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.artist);
}
