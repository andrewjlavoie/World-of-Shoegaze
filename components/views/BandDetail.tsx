"use client";

import { useRouter } from "next/navigation";
import { AlbumArt } from "@/components/AlbumArt";
import { useSettings } from "@/components/SettingsProvider";
import { BAND_MOODS, ERAS, MOOD_COLORS } from "@/lib/data";
import { bandPalette, eraLabel, mockDiscography, similarBands, slugify } from "@/lib/helpers";
import type { Band } from "@/lib/types";

export function BandDetail({ band }: { band: Band }) {
  const router = useRouter();
  useSettings(); // re-render on settings change
  const palette = bandPalette(band.name);
  const moods = BAND_MOODS[band.name] || [];
  const similar = similarBands(band, 6);
  const disc = mockDiscography(band);

  const tint = `hsl(${palette.hue}, 22%, 92%)`;
  const accentSoft = `hsl(${palette.hue}, 55%, 38%)`;
  const eraInfo = ERAS.find((e) => e.key === band.era);
  const open = (b: Band) => router.push(`/band/${slugify(b.name)}`);
  const play = () => router.push(`/drift/${slugify(band.name)}`);

  return (
    <div className="wos paper" style={{ width: "100%", minHeight: "100%", background: tint, ["--accent" as string]: accentSoft } as React.CSSProperties}>
      <div className="wos-paper-pad" style={{ position: "relative", zIndex: 2, maxWidth: 1120, margin: "0 auto" }}>
        <div className="micro" style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <span>worldofshoegaze.com</span>
          <span className="ascii-rule">/</span>
          <span><a href="/">bands</a></span>
          <span className="ascii-rule">/</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{slugify(band.name)}</span>
          <span style={{ marginLeft: "auto" }}>view 04 / band detail</span>
        </div>
        <div className="rule-2" style={{ background: accentSoft }} />

        <div className="wos-band-hero" style={{ marginTop: 28 }}>
          <div className="wos-band-hero-art">
            <AlbumArt band={band} style={{ aspectRatio: "1/1" }} />
            <div className="micro" style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
              <span><em className="serif italic">{band.album}</em></span>
              <span>[{band.year}]</span>
            </div>
            <div className="micro" style={{ marginTop: 4, color: "var(--ink-faint)" }}>the canonical entry point</div>
            <button onClick={play} className="btn" style={{ marginTop: 14, width: "100%", padding: "10px 12px", background: accentSoft, color: "#fff8e8", borderColor: accentSoft }}>
              ▶ enter drift mode
            </button>
          </div>

          <div>
            <div className="kicker" style={{ marginBottom: 10 }}>// band file</div>
            <h1 className="wos-band-h1" style={{ fontSize: "clamp(54px, 8vw, 104px)", lineHeight: 0.9, letterSpacing: "-0.02em" }}>
              {band.name}<span className="italic" style={{ color: accentSoft }}>.</span>
            </h1>
            <p className="serif wos-band-quote" style={{ fontSize: 26, lineHeight: 1.3, marginTop: 18, color: "var(--ink)", maxWidth: "32ch" }}>
              &ldquo;{band.desc}&rdquo;
            </p>

            <div className="ascii-rule" style={{ marginTop: 28, marginBottom: 18, fontSize: 10 }}>=========================================================</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px 32px", fontSize: 12 }}>
              <div>
                <div className="kicker">[ from ]</div>
                <div style={{ marginTop: 4 }}>{band.country}</div>
              </div>
              <div>
                <div className="kicker">[ era ]</div>
                <div style={{ marginTop: 4 }}>{eraLabel(band.era)}{eraInfo ? ` (${eraInfo.range})` : ""}</div>
              </div>
              <div>
                <div className="kicker">[ subgenre ]</div>
                <div style={{ marginTop: 4 }}>{band.subgenre}</div>
              </div>
              <div>
                <div className="kicker">[ intensity ]</div>
                <div style={{ marginTop: 4, fontFamily: "var(--font-jetbrains-mono)", letterSpacing: 1 }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span key={i} style={{ color: i < band.intensity ? "var(--ink)" : "var(--rule)" }}>{i < band.intensity ? "█" : "░"}</span>
                  ))}
                  <span className="micro" style={{ marginLeft: 8 }}>{band.intensity} / 10</span>
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="kicker">[ feels like ]</div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {moods.map((m) => (
                    <span key={m} className="micro" style={{ background: `hsl(${MOOD_COLORS[m].hue}, 55%, 86%)`, color: `hsl(${MOOD_COLORS[m].hue}, 55%, 28%)`, padding: "4px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{MOOD_COLORS[m].label}</span>
                  ))}
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
            {[
              { svc: "Bandcamp", note: "buy + stream", primary: true },
              { svc: "Spotify", note: "stream" },
              { svc: "Apple Music", note: "stream" },
              { svc: "YouTube", note: "videos · live" },
            ].map((s) => (
              <a key={s.svc} href="#">
                <div className="kicker" style={{ color: s.primary ? accentSoft : "var(--ink-soft)" }}>{s.primary ? "// preferred" : "// alt"}</div>
                <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 24, fontStyle: "italic", marginTop: 4, color: "var(--ink)" }}>{s.svc}</div>
                <div className="micro" style={{ marginTop: 4 }}>{s.note} →</div>
              </a>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
            <div className="kicker">[ discography ]</div>
            <div className="rule" style={{ flex: 1 }} />
            <div className="micro">{disc.length} entries · LPs + EPs</div>
          </div>
          <div>
            {disc.map((d, i) => (
              <div key={i} className="wos-band-disco-row">
                <div className="micro">{String(i + 1).padStart(2, "0")}.</div>
                <div>
                  <span className="serif italic" style={{ fontSize: 20 }}>{d.title}</span>
                  {d.note && <span className="micro" style={{ marginLeft: 10, color: accentSoft }}>← {d.note}</span>}
                  <div className="micro wos-disco-kind-mobile" style={{ display: "none" }}>{d.kind}</div>
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
            <div className="micro italic serif">computed from shared mood, era, intensity, place</div>
          </div>
          <div className="wos-band-similar">
            {similar.map((b, i) => {
              const p = bandPalette(b.name);
              return (
                <div key={b.name} onClick={() => open(b)} style={{ cursor: "pointer", borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="micro">{String(i + 1).padStart(2, "0")} →</span>
                    <span className="micro" style={{ color: `hsl(${p.hue}, 55%, 38%)` }}>● {(BAND_MOODS[b.name] || [])[0]?.replace(/_/g, " ")}</span>
                  </div>
                  <AlbumArt band={b} />
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500 }}>{b.name}</div>
                  <div className="micro" style={{ marginTop: 2 }}>{b.album} · {b.year}</div>
                </div>
              );
            })}
          </div>
        </section>

        <footer style={{ marginTop: 72, paddingTop: 24, borderTop: "1px solid var(--rule)" }}>
          <div className="ascii-rule" style={{ fontSize: 10 }}>= = = = = = = = = = = = = = = = = end of file = = = = = = = = = = = = = = = = =</div>
          <div className="micro" style={{ marginTop: 14, lineHeight: 1.7, maxWidth: "60ch" }}>
            entry maintained by hand. corrections, missing albums, scene memories: <a href="mailto:notes@worldofshoegaze.com">notes@worldofshoegaze.com</a>. <br />
            last revised: 11.05.2026. <span className="italic serif">no analytics. no popups. thank you for visiting.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
