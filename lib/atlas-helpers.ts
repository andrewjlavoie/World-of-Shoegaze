import type { AtlasArtist, AtlasAlbum } from "./atlas-types";
import { MOOD_COLORS } from "./data";

const DEFAULT_HUE = 260;
const FG = "#fff8e8";

export interface Palette {
  hue: number;
  bg: string;
  fg: string;
}

/**
 * Returns the artist's reference album, or the first album if none is
 * flagged, or undefined if the discography is empty.
 *
 * Empty discography is undefined behavior in the schema (Phase 4 will
 * enforce non-empty at the Mongo boundary). Until then, callers that
 * assume an album exists will throw on .title — same as today.
 */
export function refAlbum(artist: AtlasArtist): AtlasAlbum | undefined {
  return artist.discography.find((d) => d.isReference) ?? artist.discography[0];
}

/**
 * Two-character monogram for an artist name. Strips a leading "The ".
 * Single-word names get their first two letters; multi-word get first
 * letter of first two words.
 */
export function initials(name: string): string {
  const words = name.replace(/^The\s+/i, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  // length guards guarantee words[0] and words[1] are present; [0] on a non-empty string is safe
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/**
 * URL-safe / class-safe lowercased token. Differs from slugify (which
 * uses '-') by joining with underscores — kept for compatibility with
 * the existing #hashtag styling in the Feed cards.
 */
export function moodTag(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Color palette derived from the artist's primary mood. Returns the hue
 * (degrees), a CSS gradient background, and a foreground that contrasts
 * against the gradient.
 */
export function paletteFor(moods: string[]): Palette {
  const primary = moods[0];
  const hue = primary && MOOD_COLORS[primary] ? MOOD_COLORS[primary].hue : DEFAULT_HUE;
  return {
    hue,
    bg: `linear-gradient(135deg, hsl(${hue}, 55%, 35%), hsl(${(hue + 35) % 360}, 60%, 22%))`,
    fg: FG,
  };
}
