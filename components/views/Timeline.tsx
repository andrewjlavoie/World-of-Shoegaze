"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BANDS, ERAS } from "@/lib/data";
import { bandHue, slugify } from "@/lib/helpers";
import type { Band, EraKey } from "@/lib/types";

export function Timeline() {
  const router = useRouter();
  const [hover, setHover] = useState<Band | null>(null);
  const [activeEra, setActiveEra] = useState<EraKey | null>(null);
  const [scrubYear, setScrubYear] = useState<number | null>(null);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = 1984; y <= 2025; y++) out.push(y);
    return out;
  }, []);

  const bandsByYear = useMemo(() => {
    const map: Record<number, Band[]> = {};
    BANDS.forEach((b) => {
      if (activeEra && b.era !== activeEra) return;
      (map[b.year] ||= []).push(b);
    });
    return map;
  }, [activeEra]);

  const wave = useMemo(() => years.map((y) => (bandsByYear[y] || []).length), [years, bandsByYear]);
  const maxCount = Math.max(1, ...wave);

  const open = (b: Band) => router.push(`/band/${slugify(b.name)}`);

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
              const list = bandsByYear[y] || [];
              return (
                <div key={y} style={{ height: 26, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {list.map((b) => {
                    const h = bandHue(b.name);
                    const size = 6 + b.intensity * 1.6;
                    const isHover = hover && hover.name === b.name;
                    return (
                      <div
                        key={b.name}
                        onMouseEnter={() => { setHover(b); setScrubYear(y); }}
                        onMouseLeave={() => setHover((cur) => (cur && cur.name === b.name ? null : cur))}
                        onClick={() => open(b)}
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
              <span>[ {hover.year} · {hover.country} ]</span>
              <span>intensity {hover.intensity}/10</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{hover.name}</div>
            <div className="serif italic" style={{ fontSize: 18, marginTop: 2, color: "var(--ink-soft)" }}>{hover.album}</div>
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
