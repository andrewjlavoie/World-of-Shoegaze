"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { layoutPositions } from "@/lib/graph-layout";
import { WORLD_BOUNDS } from "@/lib/mood-families";
import type { AtlasArtist } from "@/lib/atlas-types";
import { similarArtists } from "@/lib/atlas-similarity";
import { usePanZoom } from "@/lib/use-pan-zoom";
import { GraphPanel } from "../GraphPanel";
import { Tile } from "./Tile";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.3;
const FIT_MARGIN = 40;

export function Graph({ artists }: { artists: AtlasArtist[] }) {
  const positions = useMemo(() => layoutPositions(artists), [artists]);
  const router = useRouter();

  // `(hover: hover)` is true on devices with a real mouse pointer. On
  // touch-only devices we use a tap-to-focus then tap-again-to-navigate
  // pattern — set on mount only.
  const supportsHoverRef = useRef<boolean>(true);
  useEffect(() => {
    supportsHoverRef.current = window.matchMedia("(hover: hover)").matches;
  }, []);

  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

  const focused = useMemo(
    () => (focusedSlug ? artists.find((a) => a.slug === focusedSlug) : undefined),
    [focusedSlug, artists],
  );

  const relatedSlugs = useMemo(() => {
    if (!focused) return new Set<string>();
    return new Set(similarArtists(focused, artists, 6).map((a) => a.slug));
  }, [focused, artists]);

  const onTileEnter = useCallback((a: AtlasArtist) => {
    if (supportsHoverRef.current) setFocusedSlug(a.slug);
  }, []);

  const onTileLeave = useCallback(() => {
    // Don't clear on leave — the panel stays until the user defocuses
    // (background click) or moves to another tile. This avoids flicker
    // when the cursor crosses gaps between tiles.
  }, []);

  const onTileClick = useCallback(
    (a: AtlasArtist) => {
      // On hover-capable devices: click navigates immediately.
      // On touch: first tap focuses, second tap on the same tile navigates.
      if (supportsHoverRef.current || focusedSlug === a.slug) {
        router.push(`/band/${a.slug}`);
      } else {
        setFocusedSlug(a.slug);
      }
    },
    [focusedSlug, router],
  );

  const { transform, isAnimating, isDragging, viewportRef, worldRef, bind, fitAll, zoomBy } =
    usePanZoom({
      zoomMin: ZOOM_MIN,
      zoomMax: ZOOM_MAX,
      zoomStep: ZOOM_STEP,
      fitMargin: FIT_MARGIN,
      world: WORLD_BOUNDS,
    });

  // Esc dismisses focus; 0/+/- are handled by usePanZoom's keyboard listener.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusedSlug(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Clear focus when clicking the background (not a tile).
  const onViewportPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".gx-tile")) setFocusedSlug(null);
      bind.onPointerDown(e);
    },
    [bind],
  );

  const worldStyle: CSSProperties = {
    width: 600,
    height: 400,
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.z})`,
  };

  return (
    <div className={`gx-page has-panel ${focused ? "has-focus" : ""}`}>
      <div className="gx-stars" />
      <div className="gx-compass">an atlas</div>

      <div className="gx-legend" aria-hidden="true">
        <div>
          <span className="gx-legend-key">hover</span> related bands light up
        </div>
        <div>
          <span className="gx-legend-key">drag</span> pan <span className="gx-legend-sep">·</span>{" "}
          <span className="gx-legend-key">scroll</span> zoom
        </div>
        <div>
          <span className="gx-legend-key">click</span> open band file
        </div>
      </div>

      <button
        className="gx-reset"
        onClick={fitAll}
        title="Fit all"
        aria-label="Fit all to viewport"
      >
        ↺ fit all
      </button>

      <div className="gx-controls">
        <button
          className="gx-ctl"
          onClick={() => zoomBy(ZOOM_STEP)}
          title="Zoom in"
          aria-label="Zoom in"
        >
          ＋
        </button>
        <button
          className="gx-ctl"
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          title="Zoom out"
          aria-label="Zoom out"
        >
          －
        </button>
      </div>

      <div
        ref={viewportRef}
        className={`gx-viewport ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={onViewportPointerDown}
        onPointerMove={bind.onPointerMove}
        onPointerUp={bind.onPointerUp}
        onPointerCancel={bind.onPointerCancel}
      >
        <div
          ref={worldRef}
          className={`gx-world ${isAnimating ? "is-animating" : ""}`}
          style={worldStyle}
        >
          {artists.map((a) => {
            const pos = positions.get(a.slug);
            if (!pos) return null;
            return (
              <Tile
                key={a.slug}
                artist={a}
                position={pos}
                isFocused={focusedSlug === a.slug}
                isRelated={relatedSlugs.has(a.slug)}
                onMouseEnter={() => onTileEnter(a)}
                onMouseLeave={onTileLeave}
                onClick={() => onTileClick(a)}
              />
            );
          })}
        </div>
      </div>

      <GraphPanel artist={focused ?? null} />
    </div>
  );
}
