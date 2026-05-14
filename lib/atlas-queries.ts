// Server-side query helpers against the artists collection.
// All callers run on the server (Server Components / Route Handlers) — never
// import this from a "use client" module or the Mongo driver leaks into the
// client bundle.

import "server-only";
import { getCollection } from "./db";
import type { AtlasArtist } from "./atlas-types";
import { artistSchema, parseArtists, type ParsedArtist } from "./atlas-schema";

// Sanity: ParsedArtist must be structurally compatible with AtlasArtist
// so existing consumers (Feed, Graph, Timeline, BandDetail) stay happy.
const _typeCheck = (x: ParsedArtist): AtlasArtist => x;
void _typeCheck;

/**
 * `_id` carries an `ObjectId`, which can't cross the server→client boundary.
 * Strip it so anything we hand to a Client Component is plain JSON.
 */
function stripId(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = doc;
  return rest;
}

export async function getArtists(): Promise<AtlasArtist[]> {
  const coll = await getCollection<Record<string, unknown>>("artists");
  const docs = await coll.find({}).sort({ name: 1 }).toArray();
  return parseArtists(docs.map(stripId));
}

export async function getArtistBySlug(slug: string): Promise<AtlasArtist | null> {
  const coll = await getCollection<Record<string, unknown>>("artists");
  const doc = await coll.findOne({ slug });
  if (!doc) return null;
  const result = artistSchema.safeParse(stripId(doc));
  if (!result.success) {
    console.warn(
      `[atlas-schema] dropping invalid artist doc (slug=${slug}):`,
      result.error.flatten().fieldErrors,
    );
    return null;
  }
  return result.data;
}

export async function getAllSlugs(): Promise<string[]> {
  const coll = await getCollection<Record<string, unknown>>("artists");
  const docs = await coll.find({}, { projection: { slug: 1, _id: 0 } }).toArray();
  return docs
    .map((d) => d["slug"])
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}
