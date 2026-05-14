"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { MOOD_COLORS } from "@/lib/data";
import { eraLabel } from "@/lib/helpers";
import type { AtlasAlbum, AtlasArtist } from "@/lib/atlas-types";

function refAlbum(a: AtlasArtist): AtlasAlbum {
  return a.discography.find((d) => d.isReference) ?? a.discography[0];
}

function tileBg(moods: string[]): string {
  const hue = moods.length && MOOD_COLORS[moods[0]] ? MOOD_COLORS[moods[0]].hue : 260;
  return `linear-gradient(135deg, hsl(${hue}, 55%, 35%), hsl(${(hue + 35) % 360}, 60%, 22%))`;
}

const LISTEN_KEYS: Array<{ key: keyof AtlasArtist["listen"]; label: string }> = [
  { key: "bandcamp", label: "BC" },
  { key: "spotify",  label: "SP" },
  { key: "apple",    label: "AM" },
  { key: "tidal",    label: "TI" },
];

export function GraphPanel({ artist }: { artist: AtlasArtist | null }) {
  if (!artist) return <PanelIntro />;

  const album = refAlbum(artist);
  const artStyle: CSSProperties = {
    ["--art-bg" as string]: tileBg(artist.moods),
  } as CSSProperties;

  return (
    <aside className="gx-panel">
      <div className="gx-panel-art" style={artStyle}>
        {album.art?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.art.url} alt={`${album.title} cover`} />
        ) : (
          <div className="gx-panel-art-title">{album.title}</div>
        )}
      </div>

      <div className="gx-panel-meta">
        <span>{album.year} · {artist.country}</span>
        <span>intensity {artist.intensity} / 10</span>
      </div>
      <div className="gx-panel-name">{artist.name}</div>
      <div className="gx-panel-album">{album.title}</div>

      <p className="gx-panel-quote">&ldquo;{artist.desc}&rdquo;</p>

      <div className="gx-panel-row"><span className="gx-panel-key">era</span><span className="gx-panel-val">{eraLabel(artist.era)}</span></div>
      <div className="gx-panel-row"><span className="gx-panel-key">subgenre</span><span className="gx-panel-val">{artist.subgenre}</span></div>

      <div className="gx-panel-moods">
        {artist.moods.map((m) => {
          const mc = MOOD_COLORS[m];
          if (!mc) return null;
          return <span key={m} className="gx-panel-mood-chip">#{mc.label}</span>;
        })}
      </div>

      <Link className="gx-panel-cta" href={`/band/${artist.slug}`}>→ open band file</Link>

      <div className="gx-panel-listen">
        {LISTEN_KEYS.map(({ key, label }) => {
          const url = artist.listen[key];
          return (
            <a
              key={key}
              href={url || "#"}
              target={url ? "_blank" : undefined}
              rel={url ? "noopener noreferrer" : undefined}
              aria-disabled={!url}
            >
              {label}
            </a>
          );
        })}
      </div>
    </aside>
  );
}

function PanelIntro() {
  return (
    <aside className="gx-panel">
      <div className="gx-panel-intro">
        <h2>an atlas of moods</h2>
        <p>
          The whole catalog plotted by sound. Tiles cluster by primary mood —
          eight loose family gardens. Anyone who reads the names will see
          the gardens emerge.
        </p>
        <ul>
          <li>hover or tap a tile</li>
          <li>drag to pan, scroll or pinch to zoom</li>
          <li>click to open the band</li>
        </ul>
      </div>
    </aside>
  );
}
