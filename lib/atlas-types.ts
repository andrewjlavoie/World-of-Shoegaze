// Atlas document shape — the canonical artist record stored in MongoDB.
// One document per artist. Discography embedded as a bounded array.
// Schema versioned so future shape changes can be migrated incrementally.

import type { EraKey } from "./types";

export interface Image {
  url: string;
  alt?: string;
  credit?: string;
}

export type AlbumKind = "LP" | "EP" | "single" | "comp";

export interface AtlasAlbum {
  slug: string; // unique within the artist's discography
  title: string;
  year: number;
  kind: AlbumKind;
  isReference?: boolean; // exactly one per artist should be true; absent = false
  note?: string;
  art?: Image;
}

export interface AtlasArtistListen {
  bandcamp?: string;
  spotify?: string;
  apple?: string;
  tidal?: string;
}

export interface AtlasArtist {
  schemaVersion: 1;
  slug: string; // unique; drives /band/[slug]
  name: string;
  country: string;
  era: EraKey;
  lat: number;
  lng: number;
  intensity: number; // 0-10
  subgenre: string;
  desc: string;
  moods: string[]; // mood keys (cf. lib/data.ts MOOD_COLORS)
  photo?: Image;
  discography: AtlasAlbum[];
  listen: AtlasArtistListen;
}
