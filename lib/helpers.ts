import { BAND_MOODS, BANDS, ERA_ORDER, ERAS, MOOD_COLORS } from "./data";
import type { Band, Discography, Palette } from "./types";

export function bandHue(name: string): number {
  const moods = BAND_MOODS[name] || [];
  if (!moods.length) return 260;
  return MOOD_COLORS[moods[0]].hue;
}

export function bandPalette(name: string): Palette {
  const h = bandHue(name);
  return {
    bg: `linear-gradient(135deg, hsl(${h}, 55%, 35%), hsl(${(h + 35) % 360}, 60%, 22%))`,
    accent: `hsl(${h}, 75%, 65%)`,
    fg: "#fff8e8",
    hue: h,
  };
}

export function computeSimilarity(band: Band, other: Band): number {
  if (band.name === other.name) return -Infinity;
  let score = 0;
  const m1 = BAND_MOODS[band.name] || [];
  const m2 = BAND_MOODS[other.name] || [];
  const shared = m1.filter((m) => m2.includes(m));
  score += shared.length * 12;
  const eraDist = Math.abs(ERA_ORDER.indexOf(band.era) - ERA_ORDER.indexOf(other.era));
  if (eraDist === 0) score += 4;
  else if (eraDist === 1) score += 2;
  const intDist = Math.abs(band.intensity - other.intensity);
  if (intDist === 0) score += 3;
  else if (intDist === 1) score += 2;
  else if (intDist === 2) score += 1;
  if (band.country === other.country) score += 1;
  return score;
}

export function similarBands(band: Band, n = 6): Band[] {
  return BANDS
    .map((o) => ({ band: o, score: computeSimilarity(band, o) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.band);
}

export function eraLabel(key: string): string {
  return ERAS.find((e) => e.key === key)?.label || key;
}

export function eraRange(key: string): string {
  return ERAS.find((e) => e.key === key)?.range || "";
}

export function mockDiscography(band: Band): Discography[] {
  const y = band.year;
  const seed = band.name.length;
  const titles = [
    "Holding Our Breath",
    "Pygmalion",
    "Outside Your Room",
    "Just for a Day",
    band.album,
    "Star Roving",
    "everything is alive",
    "5 EP",
  ];
  const offsets = [-7, -3, 0, 4, 9];
  return offsets
    .map((off, i): Discography => ({
      title: i === 2 ? band.album : titles[(seed + i) % titles.length],
      year: y + off,
      kind: off === 0 ? "LP" : off < 0 ? "EP" : "LP",
      note: i === 2 ? "the canonical one" : "",
    }))
    .filter((d) => d.year >= 1980 && d.year <= 2025);
}

export const slugify = (n: string): string =>
  n.toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const findBand = (slug: string): Band | undefined =>
  BANDS.find((b) => slugify(b.name) === slug);
