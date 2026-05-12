// 06 — Drift Mode
// Full-screen ambient — album art enormous, drifting lyrics in italic serif, no UI.
// For headphone listening at 2 AM. Reactive visuals tied to mock playback state.

const { useState: useStateDR, useEffect: useEffectDR, useRef: useRefDR } = React;
const { BANDS: BANDS_DR } = window.WOS_DATA;
const { bandPalette: bandPaletteDR } = window.WOS;

const DRIFT_LYRIC_LINES = [
  "the room is bigger now —",
  "and longer,",
  "i thought i was further along",
  "but the song",
  "is still the same shape as the room",
  "every word arrives late",
  "and then leaves again",
  "outside, headlights",
  "passing through the curtains slow",
  "we said we'd sleep when this was over —",
];

function DriftMode({ band: bandProp, density = "normal" }) {
  const band = bandProp || BANDS_DR.find(b => b.name === "Slowdive");
  const palette = bandPaletteDR(band.name);
  const [playing, setPlaying] = useStateDR(true);
  const [t, setT] = useStateDR(0); // 0..1 progress
  const [lineIdx, setLineIdx] = useStateDR(0);
  const [showChrome, setShowChrome] = useStateDR(false);
  const idleRef = useRefDR(null);

  useEffectDR(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT(prev => (prev + 0.0008) % 1);
    }, 40);
    return () => clearInterval(id);
  }, [playing]);

  useEffectDR(() => {
    const id = setInterval(() => {
      setLineIdx(i => (i + 1) % DRIFT_LYRIC_LINES.length);
    }, 5200);
    return () => clearInterval(id);
  }, []);

  const onMove = () => {
    setShowChrome(true);
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setShowChrome(false), 2200);
  };

  // Mock track info
  const trackTitle = ["Sing", "Alison", "When the Sun Hits", "Souvlaki Space Station"][Math.floor(t * 4) % 4];
  const trackNo = String(Math.floor(t * 4) + 1).padStart(2, "0");

  return (
    <div
      onMouseMove={onMove}
      style={{
        width: "100%", height: "100%", position: "relative", overflow: "hidden",
        background: "#06050a", color: "#f4ede4",
        fontFamily: "JetBrains Mono, monospace",
      }}
    >
      {/* Drift background — slow radial wash derived from band palette */}
      <div style={{
        position: "absolute", inset: 0,
        background: palette.bg,
        opacity: 0.55,
        transform: `scale(${1.05 + Math.sin(t * Math.PI * 2) * 0.04})`,
        transition: "transform 4s ease-in-out",
        filter: "blur(40px)",
      }} />

      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)" }} />

      {/* Album art — center, large */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: `translate(-50%, -50%) scale(${0.98 + Math.sin(t * Math.PI * 4) * 0.012})`,
        transition: "transform 2s ease-in-out",
        width: "min(56vh, 520px)", maxWidth: "62%",
        aspectRatio: "1/1",
        boxShadow: `0 30px 120px rgba(0,0,0,0.65), 0 0 200px ${palette.accent}55`,
      }}>
        <div className="album-art" style={{ "--art-bg": palette.bg, "--art-fg": "#fff8e8", width: "100%", height: "100%" }}>
          <span className="aa-marker">[{band.year}]</span>
          <div className="aa-title" style={{ fontSize: "min(4vh, 38px)" }}>{band.album}</div>
        </div>
      </div>

      {/* Drifting lyric — top half */}
      <div style={{
        position: "absolute",
        top: "12%", left: "50%",
        transform: "translateX(-50%)",
        width: "min(90vw, 720px)",
        textAlign: "center",
        fontFamily: "Instrument Serif, Georgia, serif",
        fontStyle: "italic",
        fontSize: "min(5vh, 38px)",
        lineHeight: 1.2,
        color: "rgba(255, 248, 232, 0.78)",
        opacity: 0.9,
        textShadow: "0 0 18px rgba(0,0,0,0.4)",
        animation: "drift-fade 5.2s ease-in-out infinite",
      }} key={lineIdx}>
        {DRIFT_LYRIC_LINES[lineIdx]}
      </div>

      <style>{`
        @keyframes drift-fade {
          0% { opacity: 0; transform: translateX(-50%) translateY(8px); }
          15% { opacity: 0.85; transform: translateX(-50%) translateY(0); }
          75% { opacity: 0.85; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }
      `}</style>

      {/* Floating dust motes */}
      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 28 }).map((_, i) => {
          const x = (i * 137 + Math.sin(t * Math.PI * 2 + i) * 40) % 1000;
          const y = (i * 71 + Math.cos(t * Math.PI * 2 + i * 0.7) * 30) % 700;
          return <circle key={i} cx={`${(x / 1000) * 100}%`} cy={`${(y / 700) * 100}%`} r={0.6 + (i % 3) * 0.4} fill={palette.accent} opacity={0.18 + (i % 4) * 0.08} />;
        })}
      </svg>

      {/* Bottom chrome — appears on mouse move, fades after idle */}
      <div style={{
        position: "absolute",
        bottom: 28, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        opacity: showChrome ? 1 : 0,
        transition: "opacity 600ms ease",
        pointerEvents: showChrome ? "auto" : "none",
      }}>
        <div style={{
          background: "rgba(8,6,12,0.7)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "14px 22px",
          minWidth: 480, maxWidth: "80%",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 11, letterSpacing: "0.12em" }}>
            <span style={{ color: "rgba(255,255,255,0.55)" }}>[ now drifting ]</span>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>2:14 AM · headphones recommended</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span className="serif italic" style={{ fontSize: 22 }}>{trackTitle}</span>
              <span style={{ marginLeft: 12, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{band.name} — {band.album}</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>{trackNo} / 09</div>
          </div>
          <div style={{ position: "relative", height: 2, background: "rgba(255,255,255,0.08)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${t * 100}%`, background: palette.accent }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 16, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
              <button onClick={() => setT(0)} style={{ background: "transparent", border: "none", color: "inherit", font: "inherit", cursor: "pointer" }}>◄◄</button>
              <button onClick={() => setPlaying(p => !p)} style={{ background: "transparent", border: "none", color: "#fff", font: "inherit", cursor: "pointer", fontSize: 12 }}>{playing ? "❚❚" : "▶"}</button>
              <button onClick={() => setT(t => (t + 0.25) % 1)} style={{ background: "transparent", border: "none", color: "inherit", font: "inherit", cursor: "pointer" }}>►►</button>
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
              press esc to leave
            </div>
          </div>
        </div>
      </div>

      {/* Always-visible tiny brand mark (top-left), barely there */}
      <div style={{ position: "absolute", top: 22, left: 24, fontSize: 9, letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", opacity: showChrome ? 0.7 : 0.25, transition: "opacity 600ms" }}>
        worldofshoegaze / drift
      </div>
    </div>
  );
}

window.DriftMode = DriftMode;
