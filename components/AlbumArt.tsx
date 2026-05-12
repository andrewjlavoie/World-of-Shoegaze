import { bandPalette } from "@/lib/helpers";
import type { Band } from "@/lib/types";
import type { CSSProperties } from "react";

export function AlbumArt({ band, style }: { band: Band; style?: CSSProperties }) {
  const p = bandPalette(band.name);
  const css = { "--art-bg": p.bg, "--art-fg": p.fg, ...(style || {}) } as CSSProperties;
  return (
    <div className="album-art" style={css}>
      <span className="aa-marker">[{band.year}]</span>
      <div className="aa-title">{band.album}</div>
    </div>
  );
}
