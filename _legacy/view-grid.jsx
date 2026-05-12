// 01 — Poster Grid Explorer
// Album-art-forward, dense metadata, monospace archive feel.

const { useState, useMemo, useRef, useEffect } = React;
const { MOOD_COLORS, BANDS, BAND_MOODS, ERAS } = window.WOS_DATA;
const { albumArt, bandPalette, eraRange, similarBands } = window.WOS;

function PosterCard({ band, onClick, density }) {
  const moods = BAND_MOODS[band.name] || [];
  const [hover, setHover] = useState(false);
  return (
    <div
      className="poster-card"
      onClick={() => onClick && onClick(band)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer",
        borderTop: "1px solid var(--rule)",
        paddingTop: density === "tight" ? 8 : 14,
        display: "flex",
        flexDirection: "column",
        gap: density === "tight" ? 6 : 10,
      }}
    >
      <div style={{ position: "relative" }}>
        {albumArt(band, { style: { aspectRatio: "1/1" } })}
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.42)",
          opacity: hover ? 1 : 0,
          transition: "opacity var(--motion) var(--motion-ease)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: 14, color: "#fff8e8",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11, lineHeight: 1.5,
        }}>
          <div style={{ opacity: 0.7, fontSize: 9, letterSpacing: "0.2em", marginBottom: 8 }}>// FIELD NOTE</div>
          <div style={{ fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: 17, lineHeight: 1.25 }}>
            {band.desc}
          </div>
        </div>
      </div>
      <div className="small" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontWeight: 500 }}>{band.name}</span>
        <span className="micro" style={{ whiteSpace: "nowrap" }}>{band.year}</span>
      </div>
      <div className="micro" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{band.subgenre}</span>
        <span>{band.country}</span>
      </div>
      {density !== "tight" && (
        <div className="small" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {moods.slice(0, 2).map(m => (
            <span key={m} style={{ fontSize: 9, color: `hsl(${MOOD_COLORS[m].hue}, 60%, 38%)`, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {MOOD_COLORS[m].label}
            </span>
          )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={"sep" + i} className="micro">·</span>, el], [])}
        </div>
      )}
    </div>
  );
}

function PosterGrid({ density: dProp = "normal", cardStyle = "poster", onOpen }) {
  const [search, setSearch] = useState("");
  const [activeMood, setActiveMood] = useState(null);
  const [activeEra, setActiveEra] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const density = dProp;

  const filtered = useMemo(() => {
    let res = BANDS.filter(b => {
      if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.album.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeMood && !(BAND_MOODS[b.name] || []).includes(activeMood)) return false;
      if (activeEra && b.era !== activeEra) return false;
      return true;
    });
    const sorters = {
      name: (a, b) => a.name.replace(/^The /i, "").localeCompare(b.name.replace(/^The /i, "")),
      year: (a, b) => b.year - a.year,
      intensity: (a, b) => b.intensity - a.intensity,
    };
    return res.sort(sorters[sortBy] || sorters.name);
  }, [search, activeMood, activeEra, sortBy]);

  const cols = density === "tight" ? 6 : (density === "loose" ? 3 : 4);

  return (
    <div className="wos paper" data-tone="paper" style={{ width: "100%", height: "100%", overflow: "auto", padding: "32px 36px 64px" }}>
      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Header */}
        <header style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          <div className="micro" style={{ display: "flex", gap: 12 }}>
            <span>worldofshoegaze.com</span>
            <span className="ascii-rule">/</span>
            <span>an atlas</span>
            <span className="ascii-rule">/</span>
            <span>{BANDS.length} entries</span>
            <span style={{ marginLeft: "auto" }}>last updated: 11.05.2026</span>
          </div>
          <div className="rule-2" />
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "clamp(48px, 6vw, 86px)" }}>
              The World <span className="italic" style={{ color: "var(--accent)" }}>of</span> Shoegaze
            </h1>
            <div className="small" style={{ maxWidth: 320, color: "var(--ink-soft)", textAlign: "right" }}>
              Free forever. No accounts. No tracking. <br />
              <span className="italic serif">A love letter, written slowly.</span>
            </div>
          </div>
          <div className="rule" />
        </header>

        {/* Controls */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 240px", minWidth: 200 }}>
            <div className="kicker" style={{ marginBottom: 6 }}>[ search ]</div>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="band / album..." />
          </div>
          <div style={{ flex: "1 1 280px" }}>
            <div className="kicker" style={{ marginBottom: 6 }}>[ era ]</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ERAS.map(e => (
                <button key={e.key} className={`chip ${activeEra === e.key ? "is-active" : ""}`} onClick={() => setActiveEra(activeEra === e.key ? null : e.key)}>
                  <span>{e.label}</span><span className="micro" style={{ opacity: 0.55 }}>{e.range}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: "0 1 auto" }}>
            <div className="kicker" style={{ marginBottom: 6 }}>[ sort ]</div>
            <div style={{ display: "flex", gap: 0, border: "1px solid var(--rule)" }}>
              {["name", "year", "intensity"].map(k => (
                <button key={k} className={`btn ${sortBy === k ? "is-active" : ""}`} style={{ border: "none", borderRight: "1px solid var(--rule)" }} onClick={() => setSortBy(k)}>{k}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Mood row */}
        <div style={{ marginBottom: 28 }}>
          <div className="kicker" style={{ marginBottom: 8 }}>[ filter by feeling ]</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(MOOD_COLORS).map(([key, { hue, label }]) => {
              const active = activeMood === key;
              return (
                <button
                  key={key}
                  className={`chip ${active ? "is-active" : ""}`}
                  onClick={() => setActiveMood(active ? null : key)}
                  style={active ? { background: `hsl(${hue}, 55%, 40%)`, borderColor: `hsl(${hue}, 55%, 40%)` } : { borderColor: `hsl(${hue}, 45%, 65%)`, color: `hsl(${hue}, 50%, 32%)` }}
                >{label}</button>
              );
            })}
          </div>
        </div>

        <div className="micro" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
          <span>showing {filtered.length} / {BANDS.length}</span>
          <span className="ascii-rule">============================================================</span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: density === "tight" ? 14 : 24,
        }}>
          {filtered.map((b, i) => (
            <div key={b.name} className="fadeup" style={{ animationDelay: `${Math.min(i, 30) * 18}ms` }}>
              <PosterCard band={b} onClick={onOpen} density={density} />
            </div>
          ))}
        </div>

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid var(--rule)" }}>
          <div className="ascii-rule" style={{ fontSize: 10 }}>================================ end ================================</div>
          <div className="micro" style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
            <span>maintained by one obsessive</span>
            <span><a href="#">guestbook</a> · <a href="#">about</a> · <a href="#">rss</a> · <a href="#">ko-fi</a></span>
          </div>
        </footer>
      </div>
    </div>
  );
}

window.PosterGrid = PosterGrid;
