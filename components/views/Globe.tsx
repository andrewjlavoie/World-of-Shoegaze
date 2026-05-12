"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BANDS, ERAS, SCENES } from "@/lib/data";
import { eraLabel, slugify } from "@/lib/helpers";
import type { Band, EraKey, Scene } from "@/lib/types";

function project(lat: number, lng: number, rotLng: number, rotLat: number) {
  const φ = (lat * Math.PI) / 180;
  const λ = ((lng + rotLng) * Math.PI) / 180;
  let x = Math.cos(φ) * Math.sin(λ);
  let y = Math.sin(φ);
  let z = Math.cos(φ) * Math.cos(λ);
  const ψ = (rotLat * Math.PI) / 180;
  const ny = y * Math.cos(ψ) - z * Math.sin(ψ);
  const nz = y * Math.sin(ψ) + z * Math.cos(ψ);
  y = ny; z = nz;
  return { x, y, z, visible: z > -0.05 };
}

// Hand-tuned continent sub-regions: 35 patches building up recognizable
// continents (Alaska, Greenland, Iberia, Japan, Indonesia, Madagascar all
// distinct). Each entry is [centerLat, centerLng, latSpread, lngSpread, density].
function generateLandPoints(): [number, number][] {
  const regions: [number, number, number, number, number][] = [
    // North America
    [65, -150, 7, 18, 60],   // Alaska
    [60, -118, 8, 22, 110],  // Canada west
    [55, -90,  9, 22, 130],  // Canada central
    [50, -65,  7, 22, 90],   // Eastern Canada
    [42, -100, 8, 22, 150],  // USA central
    [35, -86,  7, 18, 110],  // USA south
    [25, -100, 6, 12, 70],   // Mexico
    [12, -85,  4, 7,  40],   // Central America
    [73, -40,  7, 18, 60],   // Greenland

    // South America
    [3,  -65,  8, 12, 80],   // North S.A.
    [-8, -55, 12, 15, 130],  // Brazil
    [-25,-62,  9, 9,  90],   // Argentina north
    [-45,-68, 12, 6,  60],   // Patagonia

    // Europe
    [55, 25,   8, 18, 100],  // Eastern Europe
    [48, 10,   5, 15, 90],   // Central Europe
    [42, 13,   4, 9,  45],   // Italy
    [40, -2,   4, 6,  45],   // Iberia
    [55, -2,   5, 4,  50],   // UK / Ireland
    [65, 20,   5, 17, 70],   // Scandinavia

    // Africa
    [25, 18,   10, 22, 180],  // North Africa
    [5,  18,   12, 18, 170],  // Central Africa
    [-15,25,   10, 18, 150],  // S. Africa
    [-20,47,   6, 3,  40],    // Madagascar

    // Asia
    [60, 95,   10, 45, 200],  // Siberia
    [45, 85,   7, 28, 140],   // Central Asia
    [35, 65,   6, 15, 80],    // West Asia / Iran
    [25, 47,   7, 11, 70],    // Middle East / Arabia
    [35, 105,  10, 18, 180],  // China
    [22, 78,   9, 9,  130],   // India
    [16, 102,  5, 8,  70],    // SE Asia mainland
    [-3, 115,  6, 16, 110],   // Indonesia / Borneo
    [13, 122,  7, 3,  35],    // Philippines
    [37, 138,  7, 3,  45],    // Japan

    // Australia & NZ
    [-25,134,  9, 14, 130],   // Australia
    [-42,172,  6, 3,  35],    // NZ

    // Antarctica
    [-80,0,    4, 170, 70],
  ];

  let s = 17;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const pts: [number, number][] = [];
  regions.forEach(([lat, lng, latS, lngS, n]) => {
    for (let i = 0; i < n; i++) {
      pts.push([lat + (rnd() - 0.5) * 2 * latS, lng + (rnd() - 0.5) * 2 * lngS]);
    }
  });
  return pts;
}

const LAND_POINTS = generateLandPoints();

const ERA_COLORS: Record<EraKey, string> = {
  proto: "#9bb8e0",
  first_wave: "#e8c468",
  transitional: "#e08a5b",
  second_wave: "#d966a0",
  current: "#6fe0c8",
};

interface HoverData { x: number; y: number; bands: Band[]; }

const ZOOM_MIN = 0.8;
const ZOOM_MAX = 3;

export function Globe() {
  const router = useRouter();
  const [rotLng, setRotLng] = useState(20);
  const [rotLat, setRotLat] = useState(-8);
  const [activeEra, setActiveEra] = useState<EraKey | null>(null);
  const [hoverBand, setHoverBand] = useState<HoverData | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene>(SCENES[0]);
  const [paused, setPaused] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState({ w: 1200, h: 800 });

  // Active pointers — used to distinguish single-finger drag from two-finger pinch
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{ x: number; y: number; startLng: number; startLat: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = viewport.w <= 720;

  useEffect(() => {
    let raf: number;
    const tick = (t: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = t;
      const dt = t - lastTimeRef.current;
      lastTimeRef.current = t;
      if (!paused && !dragRef.current && !pinchRef.current) {
        setRotLng((r) => r + dt * 0.006);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  const bandsToShow = useMemo(() => BANDS.filter((b) => !activeEra || b.era === activeEra), [activeEra]);

  const projected = useMemo(() => {
    const result: Record<string, { p: ReturnType<typeof project>; bands: Band[] }> = {};
    bandsToShow.forEach((b) => {
      const p = project(b.lat, b.lng, rotLng, rotLat);
      if (!p.visible) return;
      const key = `${Math.round(b.lat / 3)}_${Math.round(b.lng / 3)}`;
      if (!result[key]) result[key] = { p, bands: [] };
      result[key].bands.push(b);
    });
    return Object.values(result);
  }, [bandsToShow, rotLng]);

  // Planet scales with viewport on mobile; zoom multiplies on top.
  const BASE = isMobile ? Math.min(viewport.w - 24, viewport.h - 220) : 520;
  const SIZE = Math.round(BASE * zoom);
  const R = SIZE / 2 - 14;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  const projectLand = (lat: number, lng: number) => {
    const p = project(lat, lng, rotLng, rotLat);
    return { ...p, sx: CX + p.x * R, sy: CY - p.y * R };
  };

  const open = (b: Band) => router.push(`/band/${slugify(b.name)}`);

  // Pointer handlers driving drag (1 finger / mouse) and pinch (2 fingers)
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragRef.current = { x: e.clientX, y: e.clientY, startLng: rotLng, startLat: rotLat };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      pinchRef.current = { startDist: dist, startZoom: zoom };
      dragRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const ratio = dist / pinchRef.current.startDist;
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchRef.current.startZoom * ratio));
      setZoom(next);
    } else if (dragRef.current && pointersRef.current.size === 1) {
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      setRotLng(dragRef.current.startLng + dx * 0.5);
      // Drag down → tilt forward (north pole rotates toward viewer).
      // Clamp to ±88° so the pole doesn't flip past the camera.
      const nextLat = dragRef.current.startLat - dy * 0.5;
      setRotLat(Math.max(-88, Math.min(88, nextLat)));
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
    else if (pointersRef.current.size === 1 && !dragRef.current) {
      // resume drag with remaining finger
      const remaining = Array.from(pointersRef.current.values())[0];
      dragRef.current = { x: remaining.x, y: remaining.y, startLng: rotLng, startLat: rotLat };
    }
  };

  const zoomBy = (factor: number) =>
    setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * factor)));

  return (
    <div className="wos" style={{ width: "100%", height: "calc(100vh - 50px)", overflow: "hidden", background: "linear-gradient(180deg, #07060c 0%, #0c0a18 100%)", color: "#d6d0c0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 80% 70%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 50% 10%, rgba(255,255,255,0.35), transparent), radial-gradient(1px 1px at 10% 80%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 90% 20%, rgba(255,255,255,0.25), transparent), radial-gradient(1px 1px at 65% 45%, rgba(255,255,255,0.2), transparent), radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.25), transparent)" }} />

      <header className="wos-globe-header" style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "20px 28px", zIndex: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="micro" style={{ color: "rgba(255,255,255,0.5)", display: "flex", gap: 12 }}>
          <span>worldofshoegaze.com</span>
          <span>/</span>
          <span style={{ color: "#fff" }}>globe</span>
        </div>
        <div className="micro wos-globe-header-meta" style={{ color: "rgba(255,255,255,0.4)" }}>view 03 / globe · drag to spin · pinch to zoom</div>
      </header>

      <button
        className="wos-globe-sidebar-btn"
        onClick={() => setSheetOpen(true)}
        aria-label="open scene report"
      >
        ◐ scene report
      </button>

      {/* zoom + pause cluster — vertical stack, bottom-right */}
      <div className="globe-fab-stack">
        <button className="globe-fab" onClick={() => zoomBy(1.3)} aria-label="zoom in" title="zoom in">＋</button>
        <button className="globe-fab" onClick={() => zoomBy(1 / 1.3)} aria-label="zoom out" title="zoom out">－</button>
        <button className="globe-fab globe-fab-pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? "play" : "pause"} title={paused ? "play" : "pause"}>
          {paused ? "▶" : "❚❚"}
        </button>
      </div>

      <div className="wos-globe-layout">
        <div className="wos-globe-stage">
          <div className="wos-globe-intro">
            <div className="serif italic" style={{ fontSize: 34, color: "#f4ede4", lineHeight: 1 }}>The genre <br />spreads across <br />the planet.</div>
            <div className="micro" style={{ marginTop: 14, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", lineHeight: 1.6 }}>
              Each light is a band, plotted at the city it came from. Filter by era and watch the wave move — UK in &lsquo;89, Boston in &lsquo;93, Tokyo for the next thirty years, Seoul lighting up around 2020.
            </div>
          </div>

          <svg
            width={SIZE} height={SIZE}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              cursor: dragRef.current ? "grabbing" : "grab",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            <defs>
              <radialGradient id="sphere-fill" cx="35%" cy="30%">
                <stop offset="0%" stopColor="#1a2540" />
                <stop offset="60%" stopColor="#0a0e1c" />
                <stop offset="100%" stopColor="#050710" />
              </radialGradient>
              <radialGradient id="atmosphere" cx="50%" cy="50%">
                <stop offset="85%" stopColor="rgba(120, 180, 240, 0)" />
                <stop offset="95%" stopColor="rgba(120, 180, 240, 0.25)" />
                <stop offset="100%" stopColor="rgba(120, 180, 240, 0)" />
              </radialGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx={CX} cy={CY} r={R + 8} fill="url(#atmosphere)" />
            <circle cx={CX} cy={CY} r={R} fill="url(#sphere-fill)" />

            <g stroke="rgba(255,255,255,0.04)" fill="none" strokeWidth="0.5">
              {[-60, -30, 0, 30, 60].map((lat) => {
                const r = R * Math.cos((lat * Math.PI) / 180);
                const phi = (lat * Math.PI) / 180;
                const cy = CY - R * Math.sin(phi) * Math.cos((rotLat * Math.PI) / 180);
                return <ellipse key={"par" + lat} cx={CX} cy={cy} rx={r} ry={Math.abs(r * Math.sin((rotLat * Math.PI) / 180)) + 0.5} />;
              })}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((lng, i) => {
                const points: string[] = [];
                for (let lat = -90; lat <= 90; lat += 10) {
                  const p = project(lat, lng, rotLng, rotLat);
                  if (p.visible) points.push(`${CX + p.x * R},${CY - p.y * R}`);
                }
                if (points.length < 2) return null;
                return <polyline key={"mer" + i} points={points.join(" ")} />;
              })}
            </g>

            {/* Land — two layers: a soft warm wash for continent silhouette,
                plus brighter cream dots on top for texture and definition. */}
            <g fill="rgba(220, 195, 145, 0.18)">
              {LAND_POINTS.map((pt, i) => {
                const p = projectLand(pt[0], pt[1]);
                if (!p.visible) return null;
                const fade = Math.max(0.35, p.z);
                const haloR = 3.2 + (zoom - 1) * 0.6;
                return <circle key={"halo" + i} cx={p.sx} cy={p.sy} r={haloR} opacity={fade * 0.6} />;
              })}
            </g>
            <g fill="rgba(245, 230, 200, 0.85)">
              {LAND_POINTS.map((pt, i) => {
                const p = projectLand(pt[0], pt[1]);
                if (!p.visible) return null;
                const fade = Math.max(0.45, p.z);
                const dotR = 1.4 + (zoom - 1) * 0.5;
                return <circle key={i} cx={p.sx} cy={p.sy} r={dotR} opacity={fade * 0.75} />;
              })}
            </g>

            <g filter="url(#glow)">
              {projected.map((g, i) => {
                const sx = CX + g.p.x * R;
                const sy = CY - g.p.y * R;
                const fade = Math.max(0, g.p.z);
                const eraSet = new Set(g.bands.map((b) => b.era));
                const dom = [...eraSet].sort((a, b) => g.bands.filter((x) => x.era === b).length - g.bands.filter((x) => x.era === a).length)[0];
                const color = ERA_COLORS[dom];
                const r = (1.6 + Math.min(g.bands.length, 8) * 0.7) * Math.max(1, zoom * 0.85);
                return (
                  <g key={i}>
                    <circle cx={sx} cy={sy} r={r * 2.2} fill={color} opacity={0.18 * fade} />
                    <circle
                      cx={sx} cy={sy} r={r} fill={color}
                      opacity={0.6 + 0.4 * fade}
                      onMouseEnter={() => setHoverBand({ x: sx, y: sy, bands: g.bands })}
                      onMouseLeave={() => setHoverBand(null)}
                      onClick={() => g.bands.length === 1 ? open(g.bands[0]) : setHoverBand({ x: sx, y: sy, bands: g.bands })}
                      style={{ cursor: "pointer" }}
                    />
                  </g>
                );
              })}
            </g>

            <g fill="rgba(255,255,255,0.85)" fontFamily="var(--font-jetbrains-mono), monospace" fontSize={Math.max(9, 9 * zoom * 0.7)} letterSpacing="0.1em">
              {SCENES.map((s, i) => {
                const p = project(s.lat, s.lng, rotLng, rotLat);
                if (!p.visible || p.z < 0.4) return null;
                const sx = CX + p.x * R;
                const sy = CY - p.y * R;
                return (
                  <g key={i} style={{ cursor: "pointer" }} onClick={() => setSelectedScene(s)}>
                    <line x1={sx} y1={sy} x2={sx + 12} y2={sy - 12} stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
                    <text x={sx + 14} y={sy - 12} textAnchor="start" style={{ textTransform: "uppercase" }}>{s.city.toUpperCase()}</text>
                  </g>
                );
              })}
            </g>
          </svg>

          {hoverBand && (
            <div style={{
              position: "absolute",
              left: `calc(50% + ${hoverBand.x - SIZE / 2 + 14}px)`,
              top: `calc(50% + ${hoverBand.y - SIZE / 2 - 60}px)`,
              background: "rgba(8,6,12,0.92)",
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "10px 12px",
              minWidth: 180,
              fontSize: 11,
              color: "#f4ede4",
              pointerEvents: "none",
              zIndex: 4,
            }}>
              <div className="micro" style={{ color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>{hoverBand.bands[0].country} · {hoverBand.bands.length} {hoverBand.bands.length === 1 ? "band" : "bands"}</div>
              {hoverBand.bands.slice(0, 4).map((b) => (
                <div key={b.name} style={{ marginBottom: 2 }}>
                  <span style={{ color: ERA_COLORS[b.era] }}>● </span>{b.name} <span style={{ opacity: 0.5 }}>· {b.year}</span>
                </div>
              ))}
              {hoverBand.bands.length > 4 && <div className="micro" style={{ color: "rgba(255,255,255,0.5)" }}>+{hoverBand.bands.length - 4} more</div>}
            </div>
          )}

          {/* era filter cluster — bottom-center */}
          <div className="wos-globe-controls" style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4, padding: 6, background: "rgba(8,6,12,0.65)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", maxWidth: "calc(100% - 120px)", zIndex: 4 }}>
            <button onClick={() => setActiveEra(null)} style={{ background: !activeEra ? "rgba(255,255,255,0.15)" : "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#f4ede4", padding: "8px 12px", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer" }}>all</button>
            {ERAS.map((e) => (
              <button key={e.key} onClick={() => setActiveEra(activeEra === e.key ? null : e.key)} style={{ background: activeEra === e.key ? ERA_COLORS[e.key] : "transparent", color: activeEra === e.key ? "#0a0612" : "#f4ede4", border: `1px solid ${activeEra === e.key ? ERA_COLORS[e.key] : "rgba(255,255,255,0.1)"}`, padding: "8px 12px", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ background: ERA_COLORS[e.key], width: 6, height: 6, display: "inline-block" }} />
                <span>{e.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`wos-globe-sidebar ${sheetOpen ? "is-open" : ""}`}>
          <button
            className="wos-globe-sidebar-close"
            onClick={() => setSheetOpen(false)}
            aria-label="close"
          >×</button>
          <div className="micro" style={{ color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>[ scene report ]</div>
          <h2 className="serif italic" style={{ color: "#f4ede4", fontSize: 42, lineHeight: 0.95 }}>{selectedScene.city}<span style={{ color: ERA_COLORS[selectedScene.era] }}>.</span></h2>
          <div className="micro" style={{ color: "rgba(255,255,255,0.5)", marginTop: 6, letterSpacing: "0.1em" }}>{selectedScene.country.toUpperCase()} · {eraLabel(selectedScene.era).toUpperCase()}</div>

          <p className="serif" style={{ fontSize: 19, lineHeight: 1.4, color: "#d6d0c0", marginTop: 18, marginBottom: 24 }}>
            &ldquo;{selectedScene.note}&rdquo;
          </p>

          <div className="micro" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", marginBottom: 12 }}>[ bands from here ]</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {BANDS.filter((b) => Math.abs(b.lat - selectedScene.lat) < 1.5 && Math.abs(b.lng - selectedScene.lng) < 1.5).map((b) => (
              <div key={b.name} onClick={() => open(b)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", fontSize: 13 }}>
                <span style={{ color: "#f4ede4" }}>{b.name}</span>
                <span style={{ color: "rgba(255,255,255,0.45)" }}>{b.year}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32 }}>
            <div className="micro" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", marginBottom: 12 }}>[ other scenes ]</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {SCENES.filter((s) => s.city !== selectedScene.city).map((s) => (
                <button key={s.city} onClick={() => setSelectedScene(s)} style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "12px 0", textAlign: "left", color: "#d6d0c0", fontFamily: "inherit", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{s.city}, <span style={{ color: "rgba(255,255,255,0.45)" }}>{s.country}</span></span>
                  <span style={{ background: ERA_COLORS[s.era], width: 6, height: 6 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
