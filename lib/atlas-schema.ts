import { z } from "zod";

// EraKey values from lib/types.ts
const ERA_KEYS = [
  "proto",
  "first_wave",
  "transitional",
  "second_wave",
  "current",
] as const;

// Image from lib/atlas-types.ts — url is a plain string (no URL format enforcement)
const imageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional(),
  credit: z.string().optional(),
});

// AlbumKind from lib/atlas-types.ts
const albumSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  kind: z.enum(["LP", "EP", "single", "comp"]),
  isReference: z.boolean().optional(),
  note: z.string().optional(),
  art: imageSchema.optional(),
});

// AtlasArtistListen from lib/atlas-types.ts — specific optional string fields
const listenSchema = z.object({
  bandcamp: z.string().optional(),
  spotify: z.string().optional(),
  apple: z.string().optional(),
  tidal: z.string().optional(),
});

export const artistSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  country: z.string().min(1),
  era: z.enum(ERA_KEYS),
  lat: z.number(),
  lng: z.number(),
  intensity: z.number().int().min(0).max(10),
  subgenre: z.string().min(1),
  desc: z.string(),
  moods: z.array(z.string()).min(1),
  photo: imageSchema.optional(),
  discography: z.array(albumSchema).min(1),
  listen: listenSchema,
});

export type ParsedArtist = z.infer<typeof artistSchema>;

export function parseArtists(docs: unknown[]): ParsedArtist[] {
  const out: ParsedArtist[] = [];
  for (const doc of docs) {
    const result = artistSchema.safeParse(doc);
    if (result.success) {
      out.push(result.data);
    } else {
      const slug = (doc as { slug?: unknown })?.slug;
      console.warn(
        `[atlas-schema] dropping invalid artist doc (slug=${String(slug ?? "<unknown>")}):`,
        result.error.flatten().fieldErrors,
      );
    }
  }
  return out;
}
