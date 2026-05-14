"use client";

import type { AtlasArtist } from "@/lib/atlas-types";

export function Graph({ artists }: { artists: AtlasArtist[] }) {
  return (
    <div style={{ padding: 32, color: "var(--ink)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
      Graph view — {artists.length} artists loaded.
    </div>
  );
}
