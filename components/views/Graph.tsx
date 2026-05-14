"use client";

import { useMemo, type CSSProperties } from "react";
import { layoutPositions } from "@/lib/graph-layout";
import { MOOD_COLORS } from "@/lib/data";
import type { AtlasArtist, AtlasAlbum } from "@/lib/atlas-types";

function refAlbum(a: AtlasArtist): AtlasAlbum {
  return a.discography.find((d) => d.isReference) ?? a.discography[0];
}

function tileBg(moods: string[]): string {
  const hue = moods.length && MOOD_COLORS[moods[0]] ? MOOD_COLORS[moods[0]].hue : 260;
  return `linear-gradient(135deg, hsl(${hue}, 55%, 35%), hsl(${(hue + 35) % 360}, 60%, 22%))`;
}

function initials(name: string): string {
  const w = name.replace(/^The\s+/i, "").split(/\s+/).filter(Boolean);
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
}

export function Graph({ artists }: { artists: AtlasArtist[] }) {
  // Compute positions once — input doesn't change in the lifetime of the page.
  const positions = useMemo(() => layoutPositions(artists), [artists]);

  return (
    <div className="gx-page">
      <div className="gx-stars" />
      <div className="gx-compass">an atlas</div>

      <div className="gx-viewport">
        <div className="gx-world" style={{ width: 600, height: 400 }}>
          {artists.map((a) => {
            const pos = positions.get(a.slug);
            if (!pos) return null;
            const album = refAlbum(a);
            const tileStyle: CSSProperties = {
              left: pos.x,
              top: pos.y,
              ["--art-bg" as string]: tileBg(a.moods),
            } as CSSProperties;
            return (
              <button
                key={a.slug}
                type="button"
                className="gx-tile"
                style={tileStyle}
                aria-label={`${a.name} — ${album.title}`}
              >
                {album.art?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.art.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="gx-tile-fallback">{initials(a.name)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
