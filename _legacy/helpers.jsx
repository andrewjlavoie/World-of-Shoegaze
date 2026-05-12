// Shared helpers — palette derivation, similarity, formatters.

const { MOOD_COLORS, MOOD_TO_BANDS, BANDS, BAND_MOODS, ERAS, SCENES } = window.WOS_DATA;

const ERA_ORDER = ["proto", "first_wave", "transitional", "second_wave", "current"];

// Derive a band's primary hue from its first mood
function bandHue(name) {
  const moods = BAND_MOODS[name] || [];
  if (!moods.length) return 260;
  return MOOD_COLORS[moods[0]].hue;
}

function bandPalette(name) {
  const h = bandHue(name);
  // Two-tone background derived from hue, plus a contrast fg
  return {
    bg: `linear-gradient(135deg, hsl(${h}, 55%, 35%), hsl(${(h + 35) % 360}, 60%, 22%))`,
    accent: `hsl(${h}, 75%, 65%)`,
    fg: "#fff8e8",
    hue: h,
  };
}

function albumArt(band, opts = {}) {
  const p = bandPalette(band.name);
  return (
    <div
      className="album-art"
      style={{ "--art-bg": p.bg, "--art-fg": p.fg, ...(opts.style || {}) }}
    >
      <span className="aa-marker">[{String(band.year)}]</span>
      <div className="aa-title">{band.album}</div>
    </div>
  );
}

function computeSimilarity(band, other) {
  if (band.name === other.name) return -Infinity;
  let score = 0;
  const m1 = BAND_MOODS[band.name] || [];
  const m2 = BAND_MOODS[other.name] || [];
  const shared = m1.filter(m => m2.includes(m));
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

function similarBands(band, n = 6) {
  return BANDS
    .map(o => ({ band: o, score: computeSimilarity(band, o) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(x => x.band);
}

function eraLabel(key) {
  return ERAS.find(e => e.key === key)?.label || key;
}

function eraRange(key) {
  return ERAS.find(e => e.key === key)?.range || "";
}

// Mock discography — generate 3-5 entries around the primary album.
function mockDiscography(band) {
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
  return offsets.map((off, i) => ({
    title: i === 2 ? band.album : titles[(seed + i) % titles.length],
    year: y + off,
    kind: off === 0 ? "LP" : (off < 0 ? "EP" : "LP"),
    note: i === 2 ? "the canonical one" : "",
  })).filter(d => d.year >= 1980 && d.year <= 2025);
}

window.WOS = { bandHue, bandPalette, albumArt, computeSimilarity, similarBands, eraLabel, eraRange, mockDiscography, ERA_ORDER };
