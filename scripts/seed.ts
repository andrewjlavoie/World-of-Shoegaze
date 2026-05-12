// One-shot seed: lib/data.ts → MongoDB Atlas `artists` collection.
// DESTRUCTIVE — drops existing artists collection before reinserting.
// After initial seed, ongoing enrichment goes through scripts/python/*.

import { MongoClient } from "mongodb";
import { BANDS, BAND_MOODS } from "../lib/data";
import { slugify } from "../lib/helpers";
import type { AtlasAlbum, AtlasArtist } from "../lib/atlas-types";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "wos";
if (!uri) {
  console.error("MONGODB_URI not set — populate .env.local first");
  process.exit(1);
}

function buildArtistDoc(band: typeof BANDS[number]): AtlasArtist {
  const refAlbum: AtlasAlbum = {
    slug: slugify(band.album),
    title: band.album,
    year: band.year,
    kind: "LP",
    isReference: true,
    note: "reference album",
  };
  return {
    schemaVersion: 1,
    slug: slugify(band.name),
    name: band.name,
    country: band.country,
    era: band.era,
    lat: band.lat,
    lng: band.lng,
    intensity: band.intensity,
    subgenre: band.subgenre,
    desc: band.desc,
    moods: BAND_MOODS[band.name] || [],
    discography: [refAlbum],
    listen: {},
  };
}

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  console.log(`Connected to ${dbName}`);

  try {
    const db = client.db(dbName);
    const artists = db.collection<AtlasArtist>("artists");

    const docs = BANDS.map(buildArtistDoc);

    // Wipe and reinsert. Indexes are recreated below.
    await artists.deleteMany({});
    if (docs.length) await artists.insertMany(docs);
    console.log(`Inserted ${docs.length} artists`);

    // Drop and recreate indexes idempotently.
    await artists.dropIndexes().catch(() => undefined);
    await artists.createIndex({ slug: 1 }, { unique: true });
    await artists.createIndex({ era: 1 });
    await artists.createIndex({ country: 1 });
    await artists.createIndex(
      { name: "text", subgenre: "text", country: "text", desc: "text" },
      { name: "artist_text" },
    );
    console.log("Indexes built: slug (unique), era, country, artist_text");

    const count = await artists.countDocuments();
    console.log(`Final count: ${count}`);
  } finally {
    await client.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
