// Generates scripts/seed-data.json — the same docs the seed script would
// insert, but as a plain JSON array. Drop into Compass via:
//   Connect to cluster → wos database → artists collection → ADD DATA → Import JSON
//
// (Compass needs the array of plain objects; that's exactly what this writes.)

import { writeFileSync } from "fs";
import { join } from "path";
import { BANDS, BAND_MOODS } from "./seed-data";
import { slugify } from "../lib/helpers";
import type { AtlasArtist, AtlasAlbum } from "../lib/atlas-types";

function buildArtistDoc(band: (typeof BANDS)[number]): AtlasArtist {
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

const docs = BANDS.map(buildArtistDoc);
const outPath = join(__dirname, "seed-data.json");
writeFileSync(outPath, JSON.stringify(docs, null, 2));
console.log(`Wrote ${docs.length} artist docs → ${outPath}`);
