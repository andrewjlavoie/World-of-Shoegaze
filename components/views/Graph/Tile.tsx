"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { AtlasArtist } from "@/lib/atlas-types";
import { refAlbum, paletteFor, initials } from "@/lib/atlas-helpers";

interface TileProps {
  artist: AtlasArtist;
  position: { x: number; y: number };
  isFocused: boolean;
  isRelated: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

export function Tile({
  artist,
  position,
  isFocused,
  isRelated,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: TileProps) {
  const album = refAlbum(artist)!;
  const tileStyle: CSSProperties = {
    left: position.x,
    top: position.y,
    ["--art-bg" as string]: paletteFor(artist.moods).bg,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`gx-tile ${isFocused ? "is-focused" : ""} ${isRelated ? "is-related" : ""}`}
      style={tileStyle}
      aria-label={`${artist.name} — ${album.title}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {album.art?.url ? (
        <Image src={album.art.url} alt="" width={50} height={50} />
      ) : (
        <span className="gx-tile-fallback">{initials(artist.name)}</span>
      )}
    </button>
  );
}
