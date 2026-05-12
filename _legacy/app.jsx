// World of Shoegaze — main app
// Navigable site: hash-based routing across the seven views.
// Homepage = the Explorer (Poster Grid). Click any band → Band Detail.
// From Band Detail → Drift Mode. A floating "shelf" toggles tone/density/motion/cards.

const { useState, useEffect, useCallback } = React;
const { PosterGrid, LibrarianList, Globe, BandDetail, Timeline, DriftMode, TonightsMood } = window;
const { BANDS } = window.WOS_DATA;

const ROUTES = [
  { key: "grid",     label: "Grid",     hash: "#/" },
  { key: "list",     label: "List",     hash: "#/list" },
  { key: "globe",    label: "Globe",    hash: "#/globe" },
  { key: "timeline", label: "Timeline", hash: "#/timeline" },
  { key: "tonight",  label: "Tonight",  hash: "#/tonight" },
];

function parseHash(h) {
  const s = (h || "").replace(/^#/, "").replace(/^\//, "");
  if (!s) return { view: "grid" };
  const [head, ...rest] = s.split("/");
  if (head === "band") return { view: "band", slug: rest.join("/") };
  if (head === "drift") return { view: "drift", slug: rest.join("/") };
  if (ROUTES.find(r => r.key === head)) return { view: head };
  return { view: "grid" };
}

const slugify = (n) => n.toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const findBand = (slug) => BANDS.find(b => slugify(b.name) === slug);

const SETTINGS_KEY = "wos.settings.v1";
const SETTINGS_DEFAULTS = { tone: "paper", density: "normal", motion: "slow", cardStyle: "poster" };
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    return s ? { ...SETTINGS_DEFAULTS, ...s } : SETTINGS_DEFAULTS;
  } catch { return SETTINGS_DEFAULTS; }
}

function App() {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  const [settings, setSettings] = useState(loadSettings);
  const [shelfOpen, setShelfOpen] = useState(false);

  useEffect(() => {
    const onHash = () => { setRoute(parseHash(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Esc backs out of Drift mode (the only chromeless view).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && route.view === "drift") history.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route.view]);

  useEffect(() => {
    document.body.setAttribute("data-tone", settings.tone);
    document.body.style.setProperty(
      "--motion",
      settings.motion === "snap" ? "200ms" : (settings.motion === "fast" ? "400ms" : "700ms"),
    );
    document.body.style.setProperty(
      "--density",
      settings.density === "tight" ? "0.85" : (settings.density === "loose" ? "1.25" : "1"),
    );
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);

  const openBand = useCallback((b) => {
    if (!b) return;
    location.hash = `#/band/${slugify(b.name)}`;
  }, []);

  const playBand = useCallback((b) => {
    if (!b) return;
    location.hash = `#/drift/${slugify(b.name)}`;
  }, []);

  const setS = (k, v) => setSettings(prev => ({ ...prev, [k]: v }));

  let body;
  switch (route.view) {
    case "list":     body = <LibrarianList density={settings.density} onOpen={openBand} />; break;
    case "globe":    body = <Globe density={settings.density} onOpen={openBand} />; break;
    case "timeline": body = <Timeline density={settings.density} onOpen={openBand} />; break;
    case "tonight":  body = <TonightsMood density={settings.density} onOpen={openBand} />; break;
    case "band": {
      const b = findBand(route.slug) || BANDS.find(x => x.name === "Slowdive");
      body = <BandDetail band={b} density={settings.density} onOpen={openBand} onPlay={playBand} />;
      break;
    }
    case "drift": {
      const b = findBand(route.slug) || BANDS.find(x => x.name === "Slowdive");
      body = <DriftMode band={b} density={settings.density} onExit={() => history.back()} />;
      break;
    }
    default:
      body = <PosterGrid density={settings.density} cardStyle={settings.cardStyle} onOpen={openBand} />;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "var(--paper, #ebe5d6)" }}>
      <SiteNav route={route} />
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {body}
      </div>
      <Shelf open={shelfOpen} setOpen={setShelfOpen} settings={settings} setS={setS} />
    </div>
  );
}

function SiteNav({ route }) {
  // Hide chrome in Drift mode — that view is supposed to be all-screen, no UI.
  if (route.view === "drift") return null;
  const here = route.view === "band" ? null : route.view;
  return (
    <nav
      className="wos"
      style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", gap: 18,
        padding: "10px 20px",
        background: "var(--paper)",
        borderBottom: "1px solid var(--rule)",
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        fontSize: 11,
      }}
    >
      <a href="#/" style={{ display: "flex", alignItems: "baseline", gap: 8, textDecoration: "none", color: "var(--ink)" }}>
        <span style={{ fontFamily: "Instrument Serif, serif", fontStyle: "italic", fontSize: 18, lineHeight: 1 }}>w</span>
        <span style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 10, color: "var(--ink-soft)" }}>world of shoegaze</span>
      </a>
      <span className="ascii-rule" style={{ color: "var(--ink-faint)" }}>//</span>
      <div style={{ display: "flex", gap: 14 }}>
        {ROUTES.map(r => (
          <a key={r.key} href={r.hash}
            style={{
              textDecoration: "none",
              color: here === r.key ? "var(--ink)" : "var(--ink-soft)",
              fontWeight: here === r.key ? 500 : 400,
              borderBottom: here === r.key ? "1px solid var(--accent)" : "1px solid transparent",
              paddingBottom: 2,
              letterSpacing: "0.04em",
            }}>
            {r.label.toLowerCase()}
          </a>
        ))}
      </div>
      <span style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>v0.1 · 11.05.2026</span>
    </nav>
  );
}

function Shelf({ open, setOpen, settings, setS }) {
  const swatch = (tone) => ({
    paper:    "linear-gradient(135deg, #ebe5d6 0%, #ebe5d6 50%, #8c2a23 50%, #8c2a23)",
    terminal: "linear-gradient(135deg, #0a0c08 0%, #0a0c08 50%, #aef4a0 50%, #aef4a0)",
    magenta:  "linear-gradient(135deg, #0e0814 0%, #0e0814 50%, #ff5eb8 50%, #ff5eb8)",
  })[tone];

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Tweaks"
        style={{
          position: "fixed", right: 18, bottom: 18, zIndex: 100,
          width: 44, height: 44,
          background: "var(--paper-2, #ddd5c2)",
          color: "var(--ink)",
          border: "1px solid var(--rule)",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 16, cursor: "pointer",
          letterSpacing: "0.12em",
          boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
        }}
      >⚙</button>

      {open && (
        <div
          className="wos"
          style={{
            position: "fixed", right: 18, bottom: 72, zIndex: 100,
            width: 260, padding: 18,
            background: "var(--paper)",
            border: "1px solid var(--ink)",
            color: "var(--ink)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 14 }}>
            <span className="kicker">[ tweaks ]</span>
            <span style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>persisted</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="kicker" style={{ marginBottom: 6 }}>// tone</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["paper", "terminal", "magenta"].map(t => (
                <button key={t} onClick={() => setS("tone", t)}
                  style={{
                    flex: 1, height: 36, cursor: "pointer",
                    background: swatch(t),
                    border: settings.tone === t ? "2px solid var(--ink)" : "1px solid var(--rule)",
                    color: "transparent", fontSize: 0, padding: 0,
                  }}
                  aria-label={t}
                />
              ))}
            </div>
            <div className="micro" style={{ marginTop: 4, color: "var(--ink-faint)" }}>{settings.tone}</div>
          </div>

          <ShelfRadio label="density" value={settings.density} options={["tight", "normal", "loose"]} onChange={v => setS("density", v)} />
          <ShelfRadio label="motion"  value={settings.motion}  options={["snap", "fast", "slow"]}     onChange={v => setS("motion", v)} />
          <ShelfRadio label="cards"   value={settings.cardStyle} options={["poster", "mini"]}         onChange={v => setS("cardStyle", v)} />

          <div className="ascii-rule" style={{ marginTop: 10, color: "var(--ink-faint)", fontSize: 10 }}>
            ============================
          </div>
          <div className="micro" style={{ marginTop: 8, color: "var(--ink-faint)", lineHeight: 1.5 }}>
            an honest mockup. thanks for being here.
          </div>
        </div>
      )}
    </>
  );
}

function ShelfRadio({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="kicker" style={{ marginBottom: 6 }}>// {label}</div>
      <div style={{ display: "flex", border: "1px solid var(--rule)" }}>
        {options.map((o, i) => (
          <button key={o}
            onClick={() => onChange(o)}
            className={`btn ${value === o ? "is-active" : ""}`}
            style={{
              flex: 1, border: "none",
              borderRight: i < options.length - 1 ? "1px solid var(--rule)" : "none",
              padding: "6px 4px",
            }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
