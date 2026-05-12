// 04 — Band Detail Page (Slowdive as the canonical example)
// Per-band palette derived from primary mood. Sounds Like. Discography. Listen-on (Bandcamp first).

const { useState: useStateD, useMemo: useMemoD } = React;
const { MOOD_COLORS: MC_D, BANDS: BANDS_D, BAND_MOODS: BM_D } = window.WOS_DATA;
const { bandHue: bandHueD, bandPalette: bandPaletteD, albumArt: albumArtD, similarBands: similarBandsD, eraLabel: eraLabelD, mockDiscography } = window.WOS;

function BandDetail({ band: bandProp, density = "normal", onOpen }) {
  const band = bandProp || BANDS_D.find(b => b.name === "Slowdive");
  const palette = bandPaletteD(band.name);
  const moods = BM_D[band.name] || [];
  const similar = similarBandsD(band, 6);
  const disc = mockDiscography(band);

  // Per-band tinted background
  const tint = `hsl(${palette.hue}, 22%, 92%)`;
  const accentSoft = `hsl(${palette.hue}, 55%, 38%)`;

  return (
    <div className="wos paper" data-tone="paper" style={{ width: "100%", height: "100%", overflow: "auto", background: tint, ["--accent"]: accentSoft }}>
      <div style={{ position: "relative", zIndex: 2, padding: "32px 44px 64px", maxWidth: 1120, margin: "0 auto" }}>
        {/* breadcrumb */}
        <div className="micro" style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <span>worldofshoegaze.com</span>
          <span className="ascii-rule">/</span>
          <span><a href="#">bands</a></span>
          <span className="ascii-rule">/</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{band.name.toLowerCase().replace(/\s+/g, "-")}</span>
          <span style={{ marginLeft: "auto" }}>view 04 / band detail</span>
        </div>
        <div className="rule-2" style={{ background: accentSoft }} />

        {/* Hero */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 36, marginTop: 28, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 28 }}>
            {albumArtD(band, { style: { aspectRatio: "1/1" } })}
            <div className="micro" style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
              <span><em className="serif italic">{band.album}</em></span>
              <span>[{band.year}]</span>
            </div>
            <div className="micro" style={{ marginTop: 4, color: "var(--ink-faint)" }}>the canonical entry point</div>
          </div>

          <div>
            <div className="kicker" style={{ marginBottom: 10 }}>// band file</div>
            <h1 style={{ fontSize: "clamp(54px, 8vw, 104px)", lineHeight: 0.9, letterSpacing: "-0.02em" }}>
              {band.name.split(" ").map((w, i, arr) => (
                <span key={i}>{w}{i < arr.length - 1 ? " " : ""}{i === arr.length - 1 ? <span className="italic" style={{ color: accentSoft }}>.</span> : null}</span>
              ))}
            </h1>
            <p className="serif" style={{ fontSize: 26, lineHeight: 1.3, marginTop: 18, color: "var(--ink)", maxWidth: "32ch" }}>
              "{band.desc}"
            </p>

            <div className="ascii-rule" style={{ marginTop: 28, marginBottom: 18, fontSize: 10 }}>=========================================================</div>

            {/* Metadata grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px 32px", fontSize: 12 }}>
              <div>
                <div className="kicker">[ from ]</div>
                <div style={{ marginTop: 4 }}>{band.country}</div>
              </div>
              <div>
                <div className="kicker">[ era ]</div>
                <div style={{ marginTop: 4 }}>{eraLabelD(band.era)} ({window.WOS_DATA.ERAS.find(e => e.key === band.era).range})</div>
              </div>
              <div>
                <div className="kicker">[ subgenre ]</div>
                <div style={{ marginTop: 4 }}>{band.subgenre}</div>
              </div>
              <div>
                <div className="kicker">[ intensity ]</div>
                <div style={{ marginTop: 4, fontFamily: "JetBrains Mono", letterSpacing: 1 }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span key={i} style={{ color: i < band.intensity ? "var(--ink)" : "var(--rule)" }}>{i < band.intensity ? "█" : "░"}</span>
                  ))}
                  <span className="micro" style={{ marginLeft: 8 }}>{band.intensity} / 10</span>
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="kicker">[ feels like ]</div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {moods.map(m => (
                    <span key={m} className="micro" style={{ background: `hsl(${MC_D[m].hue}, 55%, 86%)`, color: `hsl(${MC_D[m].hue}, 55%, 28%)`, padding: "4px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{MC_D[m].label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LISTEN ON */}
        <section style={{ marginTop: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
            <div className="kicker">[ listen elsewhere ]</div>
            <div className="rule" style={{ flex: 1 }} />
            <div className="micro italic serif">bandcamp first — money goes to the artists</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, border: "1px solid var(--rule)" }}>
            {[
              { svc: "Bandcamp", note: "buy + stream", primary: true },
              { svc: "Spotify", note: "stream" },
              { svc: "Apple Music", note: "stream" },
              { svc: "YouTube", note: "videos · live" },
            ].map((s, i) => (
              <a key={s.svc} href="#" style={{ display: "block", padding: "20px 18px", borderRight: i < 3 ? "1px solid var(--rule)" : "none", textDecoration: "none" }}>
                <div className="kicker" style={{ color: s.primary ? accentSoft : "var(--ink-soft)" }}>{s.primary ? "// preferred" : "// alt"}</div>
                <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 28, fontStyle: "italic", marginTop: 4, color: "var(--ink)" }}>{s.svc}</div>
                <div className="micro" style={{ marginTop: 4 }}>{s.note} →</div>
              </a>
            ))}
          </div>
        </section>

        {/* DISCOGRAPHY */}
        <section style={{ marginTop: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
            <div className="kicker">[ discography ]</div>
            <div className="rule" style={{ flex: 1 }} />
            <div className="micro">{disc.length} entries · LPs + EPs</div>
          </div>
          <div>
            {disc.map((d, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 80px", gap: 16, padding: "12px 6px", borderBottom: "1px solid var(--rule-soft)", alignItems: "baseline" }}>
                <div className="micro">{String(i + 1).padStart(2, "0")}.</div>
                <div>
                  <span className="serif italic" style={{ fontSize: 22 }}>{d.title}</span>
                  {d.note && <span className="micro" style={{ marginLeft: 10, color: accentSoft }}>← {d.note}</span>}
                </div>
                <div className="micro">{d.kind}</div>
                <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{d.year}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SOUNDS LIKE */}
        <section style={{ marginTop: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
            <div className="kicker">[ sounds like ]</div>
            <div className="rule" style={{ flex: 1 }} />
            <div className="micro italic serif">computed from shared mood, era, intensity, place</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {similar.map((b, i) => {
              const p = bandPaletteD(b.name);
              return (
                <div key={b.name} onClick={() => onOpen && onOpen(b)} style={{ cursor: "pointer", borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="micro">{String(i + 1).padStart(2, "0")} →</span>
                    <span className="micro" style={{ color: `hsl(${p.hue}, 55%, 38%)` }}>● {(BM_D[b.name] || [])[0]?.replace(/_/g, " ")}</span>
                  </div>
                  {albumArtD(b)}
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500 }}>{b.name}</div>
                  <div className="micro" style={{ marginTop: 2 }}>{b.album} · {b.year}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FOOTNOTE */}
        <footer style={{ marginTop: 72, paddingTop: 18, borderTop: "1px solid var(--rule)" }}>
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

window.BandDetail = BandDetail;
