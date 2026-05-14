import Link from "next/link";
import type { CSSProperties } from "react";
import { ERAS, MOOD_COLORS } from "@/lib/taxonomy";
import { eraLabel } from "@/lib/helpers";
import type { AtlasAlbum, AtlasArtist } from "@/lib/atlas-types";
import { refAlbum, paletteFor } from "@/lib/atlas-helpers";

function AlbumCover({
  album,
  palette,
  style,
}: {
  album: AtlasAlbum;
  palette: ReturnType<typeof paletteFor>;
  style?: CSSProperties;
}) {
  if (album.art?.url) {
    return (
      <img
        src={album.art.url}
        alt={`${album.title} cover`}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          objectFit: "cover",
          display: "block",
          ...style,
        }}
      />
    );
  }
  const css = {
    ["--art-bg" as string]: palette.bg,
    ["--art-fg" as string]: palette.fg,
    ...style,
  } as CSSProperties;
  return (
    <div className="album-art" style={css}>
      <span className="aa-marker">[{album.year}]</span>
      <div className="aa-title">{album.title}</div>
    </div>
  );
}

const LISTEN_ORDER: Array<{
  key: keyof AtlasArtist["listen"];
  svc: string;
  note: string;
  primary?: boolean;
}> = [
  { key: "bandcamp", svc: "Bandcamp", note: "buy + stream", primary: true },
  { key: "spotify", svc: "Spotify", note: "stream" },
  { key: "apple", svc: "Apple Music", note: "stream" },
  { key: "tidal", svc: "Tidal", note: "hi-fi stream" },
];

export function BandDetail({ artist, similar }: { artist: AtlasArtist; similar: AtlasArtist[] }) {
  const palette = paletteFor(artist.moods);
  const ref = refAlbum(artist)!;
  const tint = `hsl(${palette.hue}, 22%, 92%)`;
  const accentSoft = `hsl(${palette.hue}, 55%, 38%)`;
  const eraInfo = ERAS.find((e) => e.key === artist.era);

  return (
    <div
      className="wos paper"
      style={
        {
          width: "100%",
          minHeight: "100%",
          background: tint,
          ["--accent" as string]: accentSoft,
        } as CSSProperties
      }
    >
      <div
        className="wos-paper-pad"
        style={{ position: "relative", zIndex: 2, maxWidth: 1120, margin: "0 auto" }}
      >
        <div className="micro" style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <span>worldofshoegaze.com</span>
          <span className="ascii-rule">/</span>
          <span>
            <Link href="/">bands</Link>
          </span>
          <span className="ascii-rule">/</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{artist.slug}</span>
          <span style={{ marginLeft: "auto" }}>view 04 / band detail</span>
        </div>
        <div className="rule-2" style={{ background: accentSoft }} />

        <div className="wos-band-hero" style={{ marginTop: 28 }}>
          <div className="wos-band-hero-art">
            <AlbumCover album={ref} palette={palette} style={{ aspectRatio: "1/1" }} />
            <div
              className="micro"
              style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}
            >
              <span>
                <em className="serif italic">{ref.title}</em>
              </span>
              <span>[{ref.year}]</span>
            </div>
            <div className="micro" style={{ marginTop: 4, color: "var(--ink-faint)" }}>
              the canonical entry point
            </div>

            {artist.photo?.url && (
              <div style={{ marginTop: 18 }}>
                <img
                  src={artist.photo.url}
                  alt={artist.photo.alt || `${artist.name} photo`}
                  style={{ width: "100%", display: "block", border: "1px solid var(--rule)" }}
                />
                {artist.photo.credit && (
                  <div className="micro" style={{ marginTop: 6, color: "var(--ink-faint)" }}>
                    {artist.photo.credit}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="kicker" style={{ marginBottom: 10 }}>
              // band file
            </div>
            <h1
              className="wos-band-h1"
              style={{
                fontSize: "clamp(54px, 8vw, 104px)",
                lineHeight: 0.9,
                letterSpacing: "-0.02em",
              }}
            >
              {artist.name}
              <span className="italic" style={{ color: accentSoft }}>
                .
              </span>
            </h1>
            <p
              className="serif wos-band-quote"
              style={{
                fontSize: 26,
                lineHeight: 1.3,
                marginTop: 18,
                color: "var(--ink)",
                maxWidth: "32ch",
              }}
            >
              &ldquo;{artist.desc}&rdquo;
            </p>

            <div className="ascii-rule" style={{ marginTop: 28, marginBottom: 18, fontSize: 10 }}>
              =========================================================
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px 32px",
                fontSize: 12,
              }}
            >
              <div>
                <div className="kicker">[ from ]</div>
                <div style={{ marginTop: 4 }}>{artist.country}</div>
              </div>
              <div>
                <div className="kicker">[ era ]</div>
                <div style={{ marginTop: 4 }}>
                  {eraLabel(artist.era)}
                  {eraInfo ? ` (${eraInfo.range})` : ""}
                </div>
              </div>
              <div>
                <div className="kicker">[ subgenre ]</div>
                <div style={{ marginTop: 4 }}>{artist.subgenre}</div>
              </div>
              <div>
                <div className="kicker">[ intensity ]</div>
                <div
                  style={{
                    marginTop: 4,
                    fontFamily: "var(--font-jetbrains-mono)",
                    letterSpacing: 1,
                  }}
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span
                      key={i}
                      style={{ color: i < artist.intensity ? "var(--ink)" : "var(--rule)" }}
                    >
                      {i < artist.intensity ? "█" : "░"}
                    </span>
                  ))}
                  <span className="micro" style={{ marginLeft: 8 }}>
                    {artist.intensity} / 10
                  </span>
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="kicker">[ feels like ]</div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {artist.moods.map((m) => {
                    const mc = MOOD_COLORS[m];
                    if (!mc) return null;
                    return (
                      <span
                        key={m}
                        className="micro"
                        style={{
                          background: `hsl(${mc.hue}, 55%, 86%)`,
                          color: `hsl(${mc.hue}, 55%, 28%)`,
                          padding: "4px 8px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {mc.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section style={{ marginTop: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
            <div className="kicker">[ listen elsewhere ]</div>
            <div className="rule" style={{ flex: 1 }} />
            <div className="micro italic serif">bandcamp first — money goes to the artists</div>
          </div>
          <div className="wos-band-services">
            {LISTEN_ORDER.map((s) => {
              const url = artist.listen[s.key];
              return (
                <a
                  key={s.svc}
                  href={url || "#"}
                  target={url ? "_blank" : undefined}
                  rel={url ? "noopener noreferrer" : undefined}
                  aria-disabled={!url}
                  style={!url ? { opacity: 0.45, pointerEvents: "none" } : undefined}
                >
                  <div
                    className="kicker"
                    style={{ color: s.primary ? accentSoft : "var(--ink-soft)" }}
                  >
                    {s.primary ? "// preferred" : "// alt"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-instrument-serif), serif",
                      fontSize: 24,
                      fontStyle: "italic",
                      marginTop: 4,
                      color: "var(--ink)",
                    }}
                  >
                    {s.svc}
                  </div>
                  <div className="micro" style={{ marginTop: 4 }}>
                    {url ? `${s.note} →` : "not yet linked"}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <section style={{ marginTop: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
            <div className="kicker">[ discography ]</div>
            <div className="rule" style={{ flex: 1 }} />
            <div className="micro">{artist.discography.length} entries · LPs + EPs</div>
          </div>
          <div>
            {artist.discography.map((d, i) => (
              <div key={d.slug || i} className="wos-band-disco-row">
                <div className="micro">{String(i + 1).padStart(2, "0")}.</div>
                <div>
                  <span className="serif italic" style={{ fontSize: 20 }}>
                    {d.title}
                  </span>
                  {d.note && (
                    <span className="micro" style={{ marginLeft: 10, color: accentSoft }}>
                      ← {d.note}
                    </span>
                  )}
                </div>
                <div className="micro wos-disco-kind">{d.kind}</div>
                <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{d.year}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
            <div className="kicker">[ sounds like ]</div>
            <div className="rule" style={{ flex: 1 }} />
            <div className="micro italic serif">
              computed from shared mood, era, intensity, place
            </div>
          </div>
          <div className="wos-band-similar">
            {similar.map((a, i) => {
              const p = paletteFor(a.moods);
              const aRef = refAlbum(a)!;
              return (
                <Link
                  key={a.slug}
                  href={`/band/${a.slug}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    borderTop: "1px solid var(--rule)",
                    paddingTop: 12,
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}
                  >
                    <span className="micro">{String(i + 1).padStart(2, "0")} →</span>
                    <span className="micro" style={{ color: `hsl(${p.hue}, 55%, 38%)` }}>
                      ● {a.moods[0]?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <AlbumCover album={aRef} palette={p} />
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                  <div className="micro" style={{ marginTop: 2 }}>
                    {aRef.title} · {aRef.year}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <footer style={{ marginTop: 72, paddingTop: 24, borderTop: "1px solid var(--rule)" }}>
          <div className="ascii-rule" style={{ fontSize: 10 }}>
            = = = = = = = = = = = = = = = = = end of file = = = = = = = = = = = = = = = = =
          </div>
          <div className="micro" style={{ marginTop: 14, lineHeight: 1.7, maxWidth: "60ch" }}>
            entry maintained by hand. corrections, missing albums, scene memories:{" "}
            <a href="mailto:notes@worldofshoegaze.com">notes@worldofshoegaze.com</a>. <br />
            <span className="italic serif">no analytics. no popups. thank you for visiting.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
