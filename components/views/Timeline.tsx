"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ERAS } from "@/lib/taxonomy";
import type { AtlasArtist } from "@/lib/atlas-types";
import type { EraKey } from "@/lib/types";
import { refAlbum, paletteFor, initials } from "@/lib/atlas-helpers";

export function Timeline({ artists }: { artists: AtlasArtist[] }) {
  const router = useRouter();
  const [hover, setHover] = useState<AtlasArtist | null>(null);
  const [activeEra, setActiveEra] = useState<EraKey | null>(null);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = 1984; y <= 2025; y++) out.push(y);
    return out;
  }, []);

  const artistsByYear = useMemo(() => {
    const map: Record<number, AtlasArtist[]> = {};
    artists.forEach((a) => {
      if (activeEra && a.era !== activeEra) return;
      const y = refAlbum(a)!.year;
      (map[y] ||= []).push(a);
    });
    // Stable order inside each row: by intensity descending, then by name
    Object.values(map).forEach((list) =>
      list.sort((x, y) => y.intensity - x.intensity || x.name.localeCompare(y.name)),
    );
    return map;
  }, [artists, activeEra]);

  const total = useMemo(
    () => Object.values(artistsByYear).reduce((sum, l) => sum + l.length, 0),
    [artistsByYear],
  );

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 14,
            }}
          >
            <h1 className="wos-timeline-h1" style={{ fontSize: 64 }}>
              Forty years{" "}
              <span className="italic" style={{ color: "var(--accent)" }}>
                down.
              </span>
            </h1>
            <div className="small" style={{ color: "var(--ink-soft)", textAlign: "right" }}>
              <div className="italic serif" style={{ fontSize: 17 }}>
                The &lsquo;91 spike. The &lsquo;14 revival. The current wave still cresting.
              </div>
              <div className="micro" style={{ marginTop: 4 }}>
                each square is an album · hover for the file · click to open
              </div>
            </div>
          </div>
        </header>

        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 28,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            className={`chip ${!activeEra ? "is-active" : ""}`}
            onClick={() => setActiveEra(null)}
          >
            all eras
          </button>
          {ERAS.map((e) => (
            <button
              key={e.key}
              className={`chip ${activeEra === e.key ? "is-active" : ""}`}
              onClick={() => setActiveEra(activeEra === e.key ? null : e.key)}
            >
              <span>{e.label}</span>
              <span className="micro" style={{ opacity: 0.5 }}>
                {e.range}
              </span>
            </button>
          ))}
          <span className="micro" style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>
            {total} album{total === 1 ? "" : "s"}
          </span>
        </div>

        <div className="tl-grid">
          {years.map((y) => {
            const list = artistsByYear[y] || [];
            const isMajor = y % 5 === 0;
            const isEmpty = list.length === 0;
            return (
              <div key={y} className="tl-row-wrap" data-empty={isEmpty ? "1" : "0"}>
                <div
                  className={`tl-year ${isMajor ? "is-major" : ""} ${isEmpty ? "is-empty" : ""}`}
                >
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{y}</span>
                  {!isEmpty && <span className="tl-year-count micro">{list.length}</span>}
                </div>
                <div className="tl-row">
                  {list.map((a) => {
                    const album = refAlbum(a)!;
                    const h = paletteFor(a.moods).hue;
                    return (
                      <button
                        key={a.slug}
                        type="button"
                        className="tl-tile"
                        onMouseEnter={() => setHover(a)}
                        onMouseLeave={() =>
                          setHover((cur) => (cur && cur.slug === a.slug ? null : cur))
                        }
                        onClick={() => open(a)}
                        aria-label={`${a.name} — ${album.title}`}
                        style={{
                          background: `linear-gradient(135deg, hsl(${h}, 55%, 35%), hsl(${(h + 35) % 360}, 60%, 22%))`,
                        }}
                      >
                        {album.art?.url ? (
                          <img src={album.art.url} alt="" />
                        ) : (
                          <span className="tl-tile-fallback">{initials(a.name)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {hover && <HoverCard artist={hover} />}

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid var(--rule)" }}>
          <div className="ascii-rule" style={{ fontSize: 10 }}>
            = = = = = = = = = = = = = = = = = end = = = = = = = = = = = = = = = = =
          </div>
          <div className="micro" style={{ marginTop: 14 }}>
            scroll = move through time. hover any tile to see the file. tap on mobile to open.
          </div>
        </footer>
      </div>
    </div>
  );
}

function HoverCard({ artist }: { artist: AtlasArtist }) {
  const album = refAlbum(artist)!;
  const h = paletteFor(artist.moods).hue;
  return (
    <div className="tl-hover-card">
      <div
        className="tl-hover-art"
        style={{
          background: `linear-gradient(135deg, hsl(${h}, 55%, 35%), hsl(${(h + 35) % 360}, 60%, 22%))`,
        }}
      >
        {album.art?.url ? (
          <img src={album.art.url} alt="" />
        ) : (
          <span className="serif italic" style={{ color: "#fff8e8", fontSize: 22 }}>
            {album.title}
          </span>
        )}
      </div>
      <div className="tl-hover-body">
        <div
          className="micro"
          style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
        >
          <span>
            [ {album.year} · {artist.country} ]
          </span>
          <span>intensity {artist.intensity}/10</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 500 }}>{artist.name}</div>
        <div
          className="serif italic"
          style={{ fontSize: 18, marginTop: 2, color: "var(--ink-soft)" }}
        >
          {album.title}
        </div>
        <p className="small" style={{ marginTop: 10, lineHeight: 1.5, color: "var(--ink-soft)" }}>
          &ldquo;{artist.desc}&rdquo;
        </p>
        <div className="micro" style={{ marginTop: 10, color: "var(--ink-faint)" }}>
          click → open band file →
        </div>
      </div>
    </div>
  );
}
