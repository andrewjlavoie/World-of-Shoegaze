// 07 — Tonight's Mood
// The discovery surface. "How do you feel?" → curated trio of bands.
// The thing you'd open on a Tuesday at 11pm without a destination.

const { useState: useStateTM, useMemo: useMemoTM } = React;
const { BANDS: BANDS_TM, BAND_MOODS: BM_TM, MOOD_COLORS: MC_TM } = window.WOS_DATA;
const { bandPalette: bandPaletteTM, bandHue: bandHueTM } = window.WOS;

const MOODS_TM = [
  { key: "weightless", label: "weightless",  blurb: "drift. nothing too sharp.",       picks: ["Cocteau Twins", "Slowdive", "Hammock"] },
  { key: "heavy",       label: "heavy",       blurb: "a wall to lean on.",              picks: ["My Bloody Valentine", "A Place to Bury Strangers", "Whirr"] },
  { key: "yearning",    label: "yearning",    blurb: "writing a letter you won't send.", picks: ["Slowdive", "DIIV", "Beach House"] },
  { key: "ecstatic",    label: "ecstatic",    blurb: "loud, bright, alive.",            picks: ["Ride", "Lush", "Nothing"] },
  { key: "midnight",    label: "midnight",    blurb: "everyone else is asleep.",        picks: ["Have a Nice Life", "Slowdive", "Grouper"] },
  { key: "first-snow",  label: "first snow",  blurb: "everything quiet and white.",     picks: ["Grouper", "Hammock", "Cocteau Twins"] },
];

function TonightsMood({ density = "normal", onOpen }) {
  const [picked, setPicked] = useStateTM(null);
  const [hover, setHover] = useStateTM(null);

  const active = picked || hover;
  const mood = MOODS_TM.find(m => m.key === active);
  const picks = useMemoTM(() => {
    if (!mood) return [];
    return mood.picks
      .map(name => BANDS_TM.find(b => b.name === name))
      .filter(Boolean);
  }, [mood]);

  return (
    <div className="wos paper" data-tone="paper" style={{ width: "100%", height: "100%", overflow: "auto", padding: "44px 56px 56px" }}>
      <header>
        <div className="micro" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>worldofshoegaze.com / tonight</span>
          <span>view 07 / tonight's mood</span>
        </div>
        <div className="rule-2" style={{ marginTop: 10 }} />
      </header>

      {/* The ask */}
      <div style={{ marginTop: 36, marginBottom: 24, maxWidth: 920 }}>
        <div className="kicker" style={{ marginBottom: 14 }}>[ a question, asked quietly ]</div>
        <h1 style={{ fontSize: 92, lineHeight: 0.95, letterSpacing: "-0.025em" }}>
          how do you<br />
          <span className="italic serif" style={{ color: "var(--accent)" }}>feel tonight</span>?
        </h1>
        <p className="serif" style={{ marginTop: 18, fontSize: 19, color: "var(--ink-soft)", maxWidth: 640, fontStyle: "italic" }}>
          Pick one. Three records will arrive — chosen by a person who has stayed up too late for twenty years.
          Tomorrow night the list resets.
        </p>
      </div>

      {/* Mood grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)", marginTop: 32 }}>
        {MOODS_TM.map(m => {
          const isActive = active === m.key;
          return (
            <button
              key={m.key}
              onMouseEnter={() => setHover(m.key)}
              onMouseLeave={() => setHover(h => h === m.key ? null : h)}
              onClick={() => setPicked(p => p === m.key ? null : m.key)}
              style={{
                background: isActive ? "var(--ink)" : "var(--paper)",
                color: isActive ? "var(--paper)" : "var(--ink)",
                border: "none",
                padding: "32px 28px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background var(--motion-fast), color var(--motion-fast)",
                minHeight: 160,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}
            >
              <div className="micro" style={{ color: isActive ? "rgba(255,255,255,0.5)" : "var(--ink-faint)" }}>
                [ {String(MOODS_TM.indexOf(m) + 1).padStart(2, "0")} ]
              </div>
              <div>
                <div className="serif italic" style={{ fontSize: 38, lineHeight: 1, marginBottom: 8 }}>{m.label}</div>
                <div className="small" style={{ color: isActive ? "rgba(255,255,255,0.7)" : "var(--ink-soft)" }}>{m.blurb}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* The reveal */}
      <div style={{ minHeight: 360, marginTop: 36 }}>
        {!mood && (
          <div style={{ textAlign: "center", color: "var(--ink-faint)", padding: "60px 0", fontSize: 13, letterSpacing: "0.08em" }}>
            hover a mood to peek · click to commit
          </div>
        )}

        {mood && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
              <div className="kicker">[ if you feel {mood.label} — start with these ]</div>
              <div className="micro">three of three</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
              {picks.map((b, i) => {
                const p = bandPaletteTM(b.name);
                return (
                  <div key={b.name}
                    onClick={() => onOpen && onOpen(b)}
                    style={{
                      border: "1px solid var(--ink)",
                      background: "var(--paper-2)",
                      cursor: "pointer",
                      transition: "transform var(--motion-fast), box-shadow var(--motion-fast)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "6px 6px 0 var(--ink)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <div className="album-art" style={{ "--art-bg": p.bg, "--art-fg": "#fff8e8", aspectRatio: "1/1" }}>
                      <span className="aa-marker">[#{i + 1} · {b.year}]</span>
                      <div className="aa-title">{b.album}</div>
                    </div>
                    <div style={{ padding: "14px 16px 16px", borderTop: "1px solid var(--ink)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <div style={{ fontSize: 18, fontWeight: 500 }}>{b.name}</div>
                        <div className="micro">{b.country}</div>
                      </div>
                      <div className="serif italic" style={{ fontSize: 16, color: "var(--ink-soft)" }}>{b.album}</div>
                      <p className="small" style={{ marginTop: 10, color: "var(--ink-soft)", lineHeight: 1.5 }}>"{b.desc}"</p>
                      <div className="micro" style={{ marginTop: 12, display: "flex", justifyContent: "space-between", color: "var(--ink-faint)" }}>
                        <span>start here →</span>
                        <span>intensity {b.intensity}/10</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: "1px solid var(--rule)" }}>
              <div className="small italic serif" style={{ color: "var(--ink-soft)" }}>
                {picked ? "committed. headphones, please." : "still drifting. click a mood to commit."}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn" onClick={() => setPicked(null)}>[ start over ]</button>
                <button className="btn btn-primary">[ enter drift mode → ]</button>
              </div>
            </div>
          </>
        )}
      </div>

      <footer style={{ marginTop: 56, paddingTop: 18, borderTop: "1px solid var(--rule)" }}>
        <div className="ascii-rule" style={{ fontSize: 10 }}>= = = = = = = = = = = = = = = = = end = = = = = = = = = = = = = = = = =</div>
        <div className="micro" style={{ marginTop: 14, display: "flex", justifyContent: "space-between" }}>
          <span>mood picks rotate every 24 hrs · curated by hand · last edited 11.05.2026 03:14</span>
          <span>← back to <a href="#">grid</a></span>
        </div>
      </footer>
    </div>
  );
}

window.TonightsMood = TonightsMood;
