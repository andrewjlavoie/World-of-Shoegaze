// 05 — Timeline View
// Vertical timeline through the decades. Each album is a dot, sized by intensity,
// colored by primary mood. Scrub by year. Hover for the band.

const { useState: useStateTL, useMemo: useMemoTL, useRef: useRefTL, useEffect: useEffectTL } = React;
const { MOOD_COLORS: MC_TL, BANDS: BANDS_TL, BAND_MOODS: BM_TL, ERAS: ERAS_TL } = window.WOS_DATA;
const { bandHue: bandHueTL } = window.WOS;

function Timeline({ density = "normal", onOpen }) {
  const [hover, setHover] = useStateTL(null);
  const [activeEra, setActiveEra] = useStateTL(null);
  const [scrubYear, setScrubYear] = useStateTL(null);

  const years = useMemoTL(() => {
    const out = [];
    for (let y = 1984; y <= 2025; y++) out.push(y);
    return out;
  }, []);

  const bandsByYear = useMemoTL(() => {
    const map = {};
    BANDS_TL.forEach(b => {
      if (activeEra && b.era !== activeEra) return;
      (map[b.year] ||= []).push(b);
    });
    return map;
  }, [activeEra]);

  // Crests — count per year for the wave
  const wave = useMemoTL(() => {
    return years.map(y => (bandsByYear[y] || []).length);
  }, [years, bandsByYear]);

  const maxCount = Math.max(1, ...wave);

  return (
    <div className="wos paper" data-tone="paper" style={{ width: "100%", height: "100%", overflow: "auto", padding: "32px 36px 64px" }}>
      <div style={{ position: "relative", zIndex: 2 }}>
        <header style={{ marginBottom: 24 }}>
          <div className="micro" style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <span>worldofshoegaze.com</span>
            <span className="ascii-rule">/</span>
            <span><a href="#">grid</a></span>
            <span className="ascii-rule">·</span>
            <span><a href="#">list</a></span>
            <span className="ascii-rule">·</span>
            <span><a href="#">globe</a></span>
            <span className="ascii-rule">·</span>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>timeline</span>
            <span style={{ marginLeft: "auto" }}>view 05 / timeline</span>
          </div>
          <div className="rule-2" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
            <h1 style={{ fontSize: 64 }}>
              Forty years <span className="italic" style={{ color: "var(--accent)" }}>down.</span>
            </h1>
            <div className="small" style={{ color: "var(--ink-soft)", textAlign: "right" }}>
              <div className="italic serif" style={{ fontSize: 17 }}>The '91 spike. The '14 revival. The current wave still cresting.</div>
              <div className="micro" style={{ marginTop: 4 }}>each dot is an album · size = intensity · color = mood</div>
            </div>
          </div>
        </header>

        {/* Era filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
          <button className={`chip ${!activeEra ? "is-active" : ""}`} onClick={() => setActiveEra(null)}>all eras</button>
          {ERAS_TL.map(e => (
            <button key={e.key} className={`chip ${activeEra === e.key ? "is-active" : ""}`} onClick={() => setActiveEra(activeEra === e.key ? null : e.key)}>
              <span>{e.label}</span>
              <span className="micro" style={{ opacity: 0.5 }}>{e.range}</span>
            </button>
          ))}
          {scrubYear && (
            <button className="chip" onClick={() => setScrubYear(null)} style={{ marginLeft: "auto" }}>scrubbing: <strong>{scrubYear}</strong> ✕</button>
          )}
        </div>

        {/* The wave */}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 28, marginBottom: 12 }}>
          {/* Year axis */}
          <div />
          <div className="kicker">[ wave : albums per year ]</div>
          <div className="kicker">[ albums ]</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 28, position: "relative" }}>
          {/* Year column */}
          <div style={{ position: "relative" }}>
            {years.map(y => (
              <div key={y} onMouseEnter={() => setScrubYear(y)} style={{ height: 26, display: "flex", alignItems: "center", gap: 8, cursor: "ns-resize", color: scrubYear === y ? "var(--accent)" : (y % 5 === 0 ? "var(--ink)" : "var(--ink-faint)"), fontSize: y % 5 === 0 ? 13 : 11, fontWeight: y % 5 === 0 ? 500 : 400, letterSpacing: "0.05em" }}>
                <span style={{ width: 6, height: 1, background: scrubYear === y ? "var(--accent)" : "var(--rule)" }} />
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{y}</span>
              </div>
            ))}
          </div>

          {/* Wave bars */}
          <div style={{ position: "relative" }}>
            {years.map((y, i) => {
              const c = wave[i];
              const w = (c / maxCount) * 100;
              return (
                <div key={y} style={{ height: 26, display: "flex", alignItems: "center", paddingRight: 8 }}>
                  <div style={{ height: 14, width: `${w}%`, background: scrubYear === y ? "var(--accent)" : "var(--ink)", transition: "background var(--motion-fast)" }} />
                  <span className="micro" style={{ marginLeft: 8, color: "var(--ink-faint)" }}>{c || ""}</span>
                </div>
              );
            })}
          </div>

          {/* Dots column */}
          <div style={{ position: "relative" }}>
            {years.map(y => {
              const list = bandsByYear[y] || [];
              return (
                <div key={y} style={{ height: 26, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {list.map(b => {
                    const h = bandHueTL(b.name);
                    const size = 6 + b.intensity * 1.6;
                    const isHover = hover && hover.name === b.name;
                    return (
                      <div
                        key={b.name}
                        onMouseEnter={() => { setHover(b); setScrubYear(y); }}
                        onMouseLeave={() => setHover(h => h && h.name === b.name ? null : h)}
                        onClick={() => onOpen && onOpen(b)}
                        style={{
                          width: size, height: size,
                          background: `hsl(${h}, 55%, 42%)`,
                          cursor: "pointer",
                          transition: "transform var(--motion-fast)",
                          transform: isHover ? "scale(1.6)" : "scale(1)",
                          boxShadow: isHover ? `0 0 12px hsl(${h}, 65%, 50%)` : "none",
                          borderRadius: 0,
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover detail floats on the right */}
        {hover && (
          <div style={{
            position: "fixed",
            right: 36,
            bottom: 36,
            width: 320,
            background: "var(--paper-2)",
            border: "1px solid var(--ink)",
            padding: 16,
            zIndex: 10,
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}>
            <div className="micro" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>[ {hover.year} · {hover.country} ]</span>
              <span>intensity {hover.intensity}/10</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{hover.name}</div>
            <div className="serif italic" style={{ fontSize: 18, marginTop: 2, color: "var(--ink-soft)" }}>{hover.album}</div>
            <p className="small" style={{ marginTop: 10, lineHeight: 1.5, color: "var(--ink-soft)" }}>"{hover.desc}"</p>
            <div className="micro" style={{ marginTop: 10, color: "var(--ink-faint)" }}>click → open band file →</div>
          </div>
        )}

        <footer style={{ marginTop: 64, paddingTop: 18, borderTop: "1px solid var(--rule)" }}>
          <div className="ascii-rule" style={{ fontSize: 10 }}>= = = = = = = = = = = = = = = = = end = = = = = = = = = = = = = = = = =</div>
          <div className="micro" style={{ marginTop: 14 }}>scroll = move through time. hover a year = scrub.</div>
        </footer>
      </div>
    </div>
  );
}

window.Timeline = Timeline;
