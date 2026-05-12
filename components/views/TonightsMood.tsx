"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BANDS } from "@/lib/data";
import { bandPalette, slugify } from "@/lib/helpers";
import type { Band } from "@/lib/types";

const MOODS = [
  { key: "weightless", label: "weightless", blurb: "drift. nothing too sharp.",          picks: ["Cocteau Twins", "Slowdive", "Mojave 3"] },
  { key: "heavy",      label: "heavy",      blurb: "a wall to lean on.",                 picks: ["My Bloody Valentine", "A Place to Bury Strangers", "Whirr"] },
  { key: "yearning",   label: "yearning",   blurb: "writing a letter you won't send.",   picks: ["Slowdive", "DIIV", "Beach House"] },
  { key: "ecstatic",   label: "ecstatic",   blurb: "loud, bright, alive.",               picks: ["Ride", "Lush", "Nothing"] },
  { key: "midnight",   label: "midnight",   blurb: "everyone else is asleep.",           picks: ["Have a Nice Life", "Slowdive", "Mazzy Star"] },
  { key: "first-snow", label: "first snow", blurb: "everything quiet and white.",        picks: ["Auburn Lull", "Cocteau Twins", "Mojave 3"] },
] as const;

export function TonightsMood() {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const active = picked || hover;
  const mood = MOODS.find((m) => m.key === active);
  const picks = useMemo<Band[]>(() => {
    if (!mood) return [];
    return mood.picks
      .map((name) => BANDS.find((b) => b.name === name))
      .filter((x): x is Band => Boolean(x));
  }, [mood]);

  return (
    <div className="wos paper wos-paper-pad" style={{ width: "100%", minHeight: "100%" }}>
      <header>
        <div className="micro" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>worldofshoegaze.com / tonight</span>
          <span>view 07 / tonight&apos;s mood</span>
        </div>
        <div className="rule-2" style={{ marginTop: 10 }} />
      </header>

      <div style={{ marginTop: 36, marginBottom: 24, maxWidth: 920 }}>
        <div className="kicker" style={{ marginBottom: 14 }}>[ a question, asked quietly ]</div>
        <h1 className="wos-tonight-h1" style={{ fontSize: 92, lineHeight: 0.95, letterSpacing: "-0.025em" }}>
          how do you<br />
          <span className="italic serif" style={{ color: "var(--accent)" }}>feel tonight</span>?
        </h1>
        <p className="serif" style={{ marginTop: 18, fontSize: 19, color: "var(--ink-soft)", maxWidth: 640, fontStyle: "italic" }}>
          Pick one. Three records will arrive — chosen by a person who has stayed up too late for twenty years.
          Tomorrow night the list resets.
        </p>
      </div>

      <div className="wos-mood-grid" style={{ marginTop: 32 }}>
        {MOODS.map((m, idx) => {
          const isActive = active === m.key;
          return (
            <button
              key={m.key}
              className="wos-mood-cell"
              onMouseEnter={() => setHover(m.key)}
              onMouseLeave={() => setHover((h) => (h === m.key ? null : h))}
              onClick={() => setPicked((p) => (p === m.key ? null : m.key))}
              style={{
                background: isActive ? "var(--ink)" : "var(--paper)",
                color: isActive ? "var(--paper)" : "var(--ink)",
                border: "none",
                padding: "28px 28px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background var(--motion-fast), color var(--motion-fast)",
                minHeight: 130,
                display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 18,
              }}
            >
              <div className="micro" style={{ color: isActive ? "rgba(255,255,255,0.5)" : "var(--ink-faint)" }}>
                [ {String(idx + 1).padStart(2, "0")} ]
              </div>
              <div>
                <div className="serif italic wos-mood-label" style={{ fontSize: 38, lineHeight: 1, marginBottom: 8 }}>{m.label}</div>
                <div className="small" style={{ color: isActive ? "rgba(255,255,255,0.7)" : "var(--ink-soft)" }}>{m.blurb}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ minHeight: 200, marginTop: 24 }}>
        {!mood && (
          <div style={{ textAlign: "center", color: "var(--ink-faint)", padding: "40px 0", fontSize: 13, letterSpacing: "0.08em" }}>
            hover a mood to peek · click to commit
          </div>
        )}

        {mood && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
              <div className="kicker">[ if you feel {mood.label} — start with these ]</div>
              <div className="micro">{picks.length} of three</div>
            </div>
            <div className="wos-picks-grid">
              {picks.map((b, i) => {
                const p = bandPalette(b.name);
                return (
                  <div key={b.name}
                    onClick={() => router.push(`/band/${slugify(b.name)}`)}
                    style={{
                      border: "1px solid var(--ink)",
                      background: "var(--paper-2)",
                      cursor: "pointer",
                      transition: "transform var(--motion-fast), box-shadow var(--motion-fast)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "6px 6px 0 var(--ink)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <div className="album-art" style={{ ["--art-bg" as string]: p.bg, ["--art-fg" as string]: "#fff8e8", aspectRatio: "1/1" } as React.CSSProperties}>
                      <span className="aa-marker">[#{i + 1} · {b.year}]</span>
                      <div className="aa-title">{b.album}</div>
                    </div>
                    <div style={{ padding: "14px 16px 16px", borderTop: "1px solid var(--ink)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <div style={{ fontSize: 18, fontWeight: 500 }}>{b.name}</div>
                        <div className="micro">{b.country}</div>
                      </div>
                      <div className="serif italic" style={{ fontSize: 16, color: "var(--ink-soft)" }}>{b.album}</div>
                      <p className="small" style={{ marginTop: 10, color: "var(--ink-soft)", lineHeight: 1.5 }}>&ldquo;{b.desc}&rdquo;</p>
                      <div className="micro" style={{ marginTop: 12, display: "flex", justifyContent: "space-between", color: "var(--ink-faint)" }}>
                        <span>start here →</span>
                        <span>intensity {b.intensity}/10</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="wos-tonight-actions" style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: "1px solid var(--rule)" }}>
              <div className="small italic serif" style={{ color: "var(--ink-soft)" }}>
                {picked ? "committed. headphones, please." : "still drifting. click a mood to commit."}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn" onClick={() => setPicked(null)}>[ start over ]</button>
                <button className="btn"
                  disabled={!picks.length}
                  onClick={() => picks[0] && router.push(`/drift/${slugify(picks[0].name)}`)}>
                  [ enter drift mode → ]
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <footer style={{ marginTop: 56, paddingTop: 24, borderTop: "1px solid var(--rule)" }}>
        <div className="ascii-rule" style={{ fontSize: 10 }}>= = = = = = = = = = = = = = = = = end = = = = = = = = = = = = = = = = =</div>
        <div className="micro" style={{ marginTop: 14, display: "flex", justifyContent: "space-between" }}>
          <span>mood picks rotate every 24 hrs · curated by hand · last edited 11.05.2026 03:14</span>
          <span>← back to <a href="/">grid</a></span>
        </div>
      </footer>
    </div>
  );
}
