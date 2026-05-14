// Mood family taxonomy + spatial layout for the graph view.
// 21 raw mood keys collapse into 8 family gardens. Each family has a
// centroid in unitless world coordinates (≈ 600×400 atlas), and each raw
// mood has an offset within its family so sub-mood clumps form inside.
//
// Pure module — no React, no I/O. Exists so the layout (lib/graph-layout.ts)
// and the panel UI can share the same source of truth.

export const FAMILY_KEYS = [
  "dreampop_bliss",
  "noise_chaos",
  "heavy_doom",
  "dark_gothic",
  "anthemic_yearning",
  "lofi_modern",
  "twee_strange",
  "japanese_gaze",
] as const;

export type FamilyKey = (typeof FAMILY_KEYS)[number];

export const FAMILY_LABELS: Record<FamilyKey, string> = {
  dreampop_bliss: "Dreampop & Bliss",
  noise_chaos: "Noise & Chaos",
  heavy_doom: "Heavy & Doom",
  dark_gothic: "Dark & Gothic",
  anthemic_yearning: "Anthemic & Yearning",
  lofi_modern: "Lo-fi & Modern",
  twee_strange: "Twee & Strange",
  japanese_gaze: "Japanese Gaze",
};

// Maps every raw mood key (cf. lib/data.ts MOOD_TO_BANDS) to a family.
export const MOOD_FAMILIES: Record<string, FamilyKey> = {
  // Dreampop & Bliss
  euphoric_bliss: "dreampop_bliss",
  ethereal_celestial: "dreampop_bliss",
  dream_pop_warmth: "dreampop_bliss",
  wistful_dreamers: "dreampop_bliss",
  ambient_drift: "dreampop_bliss",

  // Noise & Chaos
  noisy_chaotic: "noise_chaos",
  ecstatic_catharsis: "noise_chaos",
  volatile_violent: "noise_chaos",

  // Heavy & Doom
  hypnotic_heavy: "heavy_doom",
  apocalyptic_doom: "heavy_doom",
  muscular_brooding: "heavy_doom",
  sun_bleached_sludge: "heavy_doom",

  // Dark & Gothic
  dark_gothic: "dark_gothic",
  depressive_beauty: "dark_gothic",
  psychedelic_hypnotic: "dark_gothic",

  // Anthemic & Yearning
  yearning_anthemic: "anthemic_yearning",

  // Lo-fi & Modern
  lo_fi_bedroom: "lofi_modern",
  modern_anguish: "lofi_modern",

  // Twee & Strange
  nostalgic_jangly: "twee_strange",
  experimental_strange: "twee_strange",

  // Japanese Gaze
  japanese_gaze: "japanese_gaze",
};

// Family centroids in unitless world coordinates.
// Roughly arranged as the brainstorm "tight" mockup: top row (3),
// middle row (4), bottom row (1).
export const FAMILY_CENTROIDS: Record<FamilyKey, { x: number; y: number }> = {
  dreampop_bliss:    { x: 130, y: 130 },
  noise_chaos:       { x: 290, y: 110 },
  heavy_doom:        { x: 450, y: 130 },
  dark_gothic:       { x:  90, y: 250 },
  anthemic_yearning: { x: 250, y: 250 },
  lofi_modern:       { x: 380, y: 250 },
  twee_strange:      { x: 190, y: 350 },
  japanese_gaze:     { x: 490, y: 320 },
};

// Sub-mood offsets relative to the family centroid. Sub-clumps within
// a family land at (familyCentroid + subMoodOffset).
export const SUB_MOOD_OFFSETS: Record<string, { dx: number; dy: number }> = {
  // Dreampop & Bliss internals
  euphoric_bliss:       { dx: -30, dy: -10 },
  ethereal_celestial:   { dx:   0, dy: -30 },
  dream_pop_warmth:     { dx:  30, dy: -10 },
  wistful_dreamers:     { dx: -15, dy:  25 },
  ambient_drift:        { dx:  20, dy:  25 },

  // Noise & Chaos internals
  noisy_chaotic:        { dx: -20, dy:   0 },
  ecstatic_catharsis:   { dx:  10, dy:  15 },
  volatile_violent:     { dx:  20, dy: -10 },

  // Heavy & Doom internals
  hypnotic_heavy:       { dx: -20, dy: -15 },
  apocalyptic_doom:     { dx:  20, dy: -15 },
  muscular_brooding:    { dx: -15, dy:  20 },
  sun_bleached_sludge:  { dx:  20, dy:  20 },

  // Dark & Gothic internals
  dark_gothic:          { dx: -20, dy: -10 },
  depressive_beauty:    { dx:  15, dy: -10 },
  psychedelic_hypnotic: { dx:  -5, dy:  20 },

  // Anthemic & Yearning (single sub)
  yearning_anthemic:    { dx:   0, dy:   0 },

  // Lo-fi & Modern internals
  lo_fi_bedroom:        { dx: -20, dy:   0 },
  modern_anguish:       { dx:  20, dy:   0 },

  // Twee & Strange internals
  nostalgic_jangly:     { dx: -15, dy:   0 },
  experimental_strange: { dx:  15, dy:   0 },

  // Japanese Gaze (single sub)
  japanese_gaze:        { dx:   0, dy:   0 },
};

// Bounding box of all family centroids (with padding) — used for fit-all.
export const WORLD_BOUNDS = { minX: 50, maxX: 540, minY: 80, maxY: 380 };

// Fallback family for artists with no moods. Sits in the
// "miscellany" cluster (Twee & Strange — already an oddities catch-all).
export const FALLBACK_FAMILY: FamilyKey = "twee_strange";

/**
 * Returns the family for an artist's primary mood, or FALLBACK_FAMILY
 * when the artist has no moods or its primary mood is unknown.
 */
export function familyFor(primaryMood: string | undefined): FamilyKey {
  if (!primaryMood) return FALLBACK_FAMILY;
  return MOOD_FAMILIES[primaryMood] ?? FALLBACK_FAMILY;
}

