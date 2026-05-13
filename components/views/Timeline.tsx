"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ERAS, MOOD_COLORS } from "@/lib/data";
import type { AtlasArtist, AtlasAlbum } from "@/lib/atlas-types";
import type { EraKey } from "@/lib/types";

function refAlbum(artist: AtlasArtist): AtlasAlbum {
  return artist.discography.find((d) => d.isReference) || artist.discography[0];
}

function refAlbumYear(artist: AtlasArtist): number {
  return refAlbum(artist).year;
}

function artistHue(artist: AtlasArtist): number {
  if (!artist.moods.length) return 260;
  const mc = MOOD_COLORS[artist.moods[0]];
  return mc ? mc.hue : 260;
}

export function Timeline({ artists }: { artists: AtlasArtist[] }) {
  const router = useRouter();
  const [hover, setHover] = useState<AtlasArtist | null>(null);
  const [activeEra, setActiveEra] = useState<EraKey | null>(null);
  const [scrubYear, setScrubYear] = useState<number | null>(null);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = 1984; y <= 2025; y++) out.push(y);
    return out;
  }, []);

  const artistsByYear = useMemo(() => {
    const map: Record<number, AtlasArtist[]> = {};
    artists.forEach((a) => {
      if (activeEra && a.era !== activeEra) return;
      const y = refAlbumYear(a);
      (map[y] ||= []).push(a);
    });
    return map;
  }, [artists, activeEra]);

  const wave = useMemo(() => years.map((y) => (artistsByYear[y] || []).length), [years, artistsByYear]);
  const maxCount = Math.max(1, ...wave);

  const open = (a: AtlasArtist) => router.push(`/band/${a.slug}`);

  return (
    <div className="wos paper wos-paper-pad" style={{ width: "100%", minHeight: "100%" }}>
      <div style={{ position: "relative", zIndex: 2 }}>
        <header style={{ marginBottom: 24 }}>
          <div className="micro" style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <span>worldofshoegaze.com</span>
            <span className="ascii-rule">/</span>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>timeline</span>
            <span style={{ marginLeft: "auto" }}>view 05 / timeline</span>
          </div>
          <div className="rule-2" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
            <h1 className="wos-timeline-h1" style={{ fontSize: 64 }}>
              Forty years <span className="italic" style={{ color: "var(--accent)" }}>down.</span>
            </h1>
            <div className="small" style={{ color: "var(--ink-soft)", textAlign: "right" }}>
              <div className="italic serif" style={{ fontSize: 17 }}>The &lsquo;91 spike. The &lsquo;14 revival. The current wave still cresting.</div>
              <div className="micro" style={{ marginTop: 4 }}>each dot is an album · size = intensity · color = mood</div>
            </div>
          </div>
        </header>

        <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
          <button className={`chip ${!activeEra ? "is-active" : ""}`} onClick={() => setActiveEra(null)}>all eras</button>
          {ERAS.map((e) => (
            <button key={e.key} className={`chip ${activeEra === e.key ? "is-active" : ""}`} onClick={() => setActiveEra(activeEra === e.key ? null : e.key)}>
              <span>{e.label}</span>
              <span className="micro" style={{ opacity: 0.5 }}>{e.range}</span>
            </button>
          ))}
          {scrubYear && (
            <button className="chip" onClick={() => setScrubYear(null)} style={{ marginLeft: "auto" }}>scrubbing: <strong>{scrubYear}</strong> ✕</button>
          )}
        </div>

        <div className="wos-timeline-grid" style={{ marginBottom: 12 }}>
          <div />
          <div className="kicker">[ wave : albums per year ]</div>
          <div className="kicker">[ albums ]</div>
        </div>

        <div className="wos-timeline-grid" style={{ position: "relative" }}>
          <div style={{ position: "relative" }}>
            {years.map((y) => (
              <div key={y} onMouseEnter={() => setScrubYear(y)} style={{ height: 26, display: "flex", alignItems: "center", gap: 8, cursor: "ns-resize", color: scrubYear === y ? "var(--accent)" : (y % 5 === 0 ? "var(--ink)" : "var(--ink-faint)"), fontSize: y % 5 === 0 ? 13 : 11, fontWeight: y % 5 === 0 ? 500 : 400, letterSpacing: "0.05em" }}>
                <span style={{ width: 6, height: 1, background: scrubYear === y ? "var(--accent)" : "var(--rule)" }} />
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{y}</span>
              </div>
            ))}
          </div>

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

          <div style={{ position: "relative" }}>
            {years.map((y) => {
              const list = artistsByYear[y] || [];
              return (
                <div key={y} style={{ height: 26, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {list.map((a) => {
                    const h = artistHue(a);
                    const size = 6 + a.intensity * 1.6;
                    const isHover = hover && hover.slug === a.slug;
                    return (
                      <div
                        key={a.slug}
                        onMouseEnter={() => { setHover(a); setScrubYear(y); }}
                        onMouseLeave={() => setHover((cur) => (cur && cur.slug === a.slug ? null : cur))}
                        onClick={() => open(a)}
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
              <span>[ {refAlbumYear(hover)} · {hover.country} ]</span>
              <span>intensity {hover.intensity}/10</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{hover.name}</div>
            <div className="serif italic" style={{ fontSize: 18, marginTop: 2, color: "var(--ink-soft)" }}>{refAlbum(hover).title}</div>
            <p className="small" style={{ marginTop: 10, lineHeight: 1.5, color: "var(--ink-soft)" }}>&ldquo;{hover.desc}&rdquo;</p>
            <div className="micro" style={{ marginTop: 10, color: "var(--ink-faint)" }}>click → open band file →</div>
          </div>
        )}

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid var(--rule)" }}>
          <div className="ascii-rule" style={{ fontSize: 10 }}>= = = = = = = = = = = = = = = = = end = = = = = = = = = = = = = = = = =</div>
          <div className="micro" style={{ marginTop: 14 }}>scroll = move through time. hover a year = scrub.</div>
        </footer>
      </div>
    </div>
  );
}
