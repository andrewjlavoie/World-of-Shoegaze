// Server-side query helpers against the artists collection.
// All callers run on the server (Server Components / Route Handlers) — never
// import this from a "use client" module or the Mongo driver leaks into the
// client bundle.

import "server-only";
import { getCollection } from "./db";
import type { AtlasArtist } from "./atlas-types";

export type ArtistDoc = AtlasArtist & { _id?: unknown };

/**
 * `_id` carries an `ObjectId`, which can't cross the server→client boundary.
 * Strip it so anything we hand to a Client Component is plain JSON.
 */
function stripId<T extends ArtistDoc>(doc: T): AtlasArtist {
  const { _id, ...rest } = doc;
  return rest;
}

export async function getArtists(): Promise<AtlasArtist[]> {
  const coll = await getCollection<ArtistDoc>("artists");
  const docs = await coll.find({}).sort({ name: 1 }).toArray();
  return docs.map(stripId);
}

export async function getArtistBySlug(slug: string): Promise<AtlasArtist | null> {
  const coll = await getCollection<ArtistDoc>("artists");
  const doc = await coll.findOne({ slug });
  return doc ? stripId(doc) : null;
}

export async function getAllSlugs(): Promise<string[]> {
  const coll = await getCollection<ArtistDoc>("artists");
  const docs = await coll.find({}, { projection: { slug: 1, _id: 0 } }).toArray();
  return docs.map((d) => d.slug);
}
