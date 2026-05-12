// 02 — Librarian List
// Dense Discogs-want-list table. Sortable columns. Hover-expand row description.

const { useState: useStateL, useMemo: useMemoL } = React;
const { MOOD_COLORS: MOOD_COLORS_L, BANDS: BANDS_L, BAND_MOODS: BAND_MOODS_L, ERAS: ERAS_L } = window.WOS_DATA;
const { eraLabel: eraLabelL } = window.WOS;

function IntensityDots({ value }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: 1 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} style={{ color: i < value ? "var(--ink)" : "var(--rule)" }}>{i < value ? "█" : "░"}</span>
      ))}
    </span>
  );
}

function LibrarianList({ density = "normal", onOpen }) {
  const [search, setSearch] = useStateL("");
  const [sort, setSort] = useStateL({ key: "name", dir: 1 });
  const [activeEra, setActiveEra] = useStateL(null);
  const [expanded, setExpanded] = useStateL(null);

  const filtered = useMemoL(() => {
    let res = BANDS_L.filter(b => {
      if (search) {
        const s = search.toLowerCase();
        if (!b.name.toLowerCase().includes(s) && !b.album.toLowerCase().includes(s) && !b.country.toLowerCase().includes(s) && !b.subgenre.toLowerCase().includes(s)) return false;
      }
      if (activeEra && b.era !== activeEra) return false;
      return true;
    });
    const accessors = {
      name: b => b.name.replace(/^The /i, "").toLowerCase(),
      album: b => b.album.toLowerCase(),
      year: b => b.year,
      era: b => window.WOS.ERA_ORDER.indexOf(b.era),
      country: b => b.country,
      intensity: b => b.intensity,
      subgenre: b => b.subgenre,
    };
    return res.sort((a, b) => {
      const av = accessors[sort.key](a);
      const bv = accessors[sort.key](b);
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
  }, [search, sort, activeEra]);

  const setSortKey = k => setSort(s => s.key === k ? { key: k, dir: -s.dir } : { key: k, dir: 1 });

  const rowPad = density === "tight" ? "4px 12px" : (density === "loose" ? "12px 16px" : "8px 14px");

  const columns = [
    { key: "name", label: "BAND", flex: 2 },
    { key: "album", label: "REFERENCE ALBUM", flex: 2.3 },
    { key: "year", label: "YR", w: 50 },
    { key: "era", label: "ERA", w: 110 },
    { key: "country", label: "FROM", w: 130 },
    { key: "subgenre", label: "SUBGENRE", flex: 2 },
    { key: "intensity", label: "INTENSITY", w: 130 },
  ];

  return (
    <div className="wos paper" data-tone="paper" style={{ width: "100%", height: "100%", overflow: "auto", padding: "32px 36px 64px" }}>
      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Header */}
        <header style={{ marginBottom: 24 }}>
          <div className="micro" style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <span>worldofshoegaze.com</span>
            <span className="ascii-rule">/</span>
            <span><a href="#">grid</a></span>
            <span className="ascii-rule">·</span>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>list</span>
            <span className="ascii-rule">·</span>
            <span><a href="#">globe</a></span>
            <span className="ascii-rule">·</span>
            <span><a href="#">timeline</a></span>
            <span style={{ marginLeft: "auto" }}>view 02 / librarian</span>
          </div>
          <div className="rule-2" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
            <h1 style={{ fontSize: 54 }}>
              The Catalog<span className="italic" style={{ color: "var(--accent)" }}>.</span>
            </h1>
            <div className="small" style={{ color: "var(--ink-soft)", textAlign: "right" }}>
              <div className="italic serif" style={{ fontSize: 17 }}>For building Discogs want-lists at 1AM.</div>
              <div className="micro" style={{ marginTop: 4 }}>sortable · searchable · enough metadata to make you feel insane</div>
            </div>
          </div>
        </header>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="? search any column..." />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className={`chip ${!activeEra ? "is-active" : ""}`} onClick={() => setActiveEra(null)}>all eras</button>
            {ERAS_L.map(e => (
              <button key={e.key} className={`chip ${activeEra === e.key ? "is-active" : ""}`} onClick={() => setActiveEra(activeEra === e.key ? null : e.key)}>{e.label}</button>
            ))}
          </div>
          <div className="micro" style={{ marginLeft: "auto" }}>{filtered.length} / {BANDS_L.length}</div>
        </div>

        {/* Table */}
        <div style={{ border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          {/* Header row */}
          <div style={{ display: "flex", padding: rowPad, borderBottom: "1px solid var(--ink)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", background: "var(--paper-2)" }}>
            {columns.map(c => (
              <button
                key={c.key}
                onClick={() => setSortKey(c.key)}
                style={{ flex: c.flex || `0 0 ${c.w}px`, textAlign: "left", background: "transparent", border: "none", padding: 0, font: "inherit", color: "var(--ink)", cursor: "pointer", letterSpacing: "inherit", textTransform: "inherit", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>{c.label}</span>
                <span style={{ color: sort.key === c.key ? "var(--accent)" : "var(--rule)" }}>{sort.key === c.key ? (sort.dir === 1 ? "▲" : "▼") : "◇"}</span>
              </button>
            ))}
            <div style={{ width: 16 }} />
          </div>

          {/* Rows */}
          {filtered.map((b, i) => {
            const open = expanded === b.name;
            const moods = BAND_MOODS_L[b.name] || [];
            return (
              <div
                key={b.name}
                onMouseEnter={() => setExpanded(b.name)}
                onMouseLeave={() => setExpanded(null)}
                onClick={() => onOpen && onOpen(b)}
                style={{
                  borderBottom: "1px solid var(--rule-soft)",
                  background: i % 2 === 0 ? "transparent" : "rgba(22,19,13,0.025)",
                  cursor: "pointer",
                  transition: "background var(--motion-fast)",
                }}
              >
                <div style={{ display: "flex", padding: rowPad, alignItems: "center", fontSize: 12 }}>
                  <div style={{ flex: 2, fontWeight: 500 }}>{b.name}</div>
                  <div style={{ flex: 2.3, fontStyle: "italic", fontFamily: "Instrument Serif, Georgia, serif", fontSize: 15 }}>{b.album}</div>
                  <div style={{ width: 50, color: "var(--ink-soft)" }}>{b.year}</div>
                  <div style={{ width: 110, color: "var(--ink-soft)" }}>{eraLabelL(b.era)}</div>
                  <div style={{ width: 130, color: "var(--ink-soft)" }}>{b.country}</div>
                  <div style={{ flex: 2, color: "var(--ink-soft)" }}>{b.subgenre}</div>
                  <div style={{ width: 130 }}><IntensityDots value={b.intensity} /></div>
                  <div style={{ width: 16, color: "var(--ink-faint)", textAlign: "right" }}>→</div>
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateRows: open ? "1fr" : "0fr",
                  transition: "grid-template-rows var(--motion) var(--motion-ease)",
                }}>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ padding: open ? "0 16px 16px 16px" : "0 16px", display: "flex", gap: 24, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, paddingLeft: 0 }}>
                        <div className="kicker" style={{ marginBottom: 6 }}>// field note</div>
                        <p className="serif italic" style={{ fontSize: 17, lineHeight: 1.4, margin: 0, color: "var(--ink)" }}>"{b.desc}"</p>
                      </div>
                      <div style={{ flex: "0 0 220px" }}>
                        <div className="kicker" style={{ marginBottom: 6 }}>moods</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {moods.map(m => (
                            <span key={m} className="micro" style={{ background: `hsl(${MOOD_COLORS_L[m].hue}, 60%, 88%)`, color: `hsl(${MOOD_COLORS_L[m].hue}, 55%, 28%)`, padding: "3px 6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{MOOD_COLORS_L[m].label}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="micro" style={{ marginTop: 14, display: "flex", justifyContent: "space-between" }}>
          <span>page 1 of 1 — every page has an end</span>
          <span>shift-click columns to multi-sort (not really)</span>
        </div>
      </div>
    </div>
  );
}

window.LibrarianList = LibrarianList;
