"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { layoutPositions } from "@/lib/graph-layout";
import { WORLD_BOUNDS } from "@/lib/mood-families";
import type { AtlasArtist } from "@/lib/atlas-types";
import { similarArtists } from "@/lib/atlas-similarity";
import { refAlbum, paletteFor, initials } from "@/lib/atlas-helpers";
import { GraphPanel } from "./GraphPanel";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.3; // multiplier for +/- buttons
const FIT_MARGIN = 40; // px padding around content for fit-all

interface Transform {
  z: number;
  x: number;
  y: number;
}

export function Graph({ artists }: { artists: AtlasArtist[] }) {
  const positions = useMemo(() => layoutPositions(artists), [artists]);

  const router = useRouter();
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

  // `(hover: hover)` is true on devices with a real mouse pointer. On
  // touch-only devices we use a tap-to-focus then tap-again-to-navigate
  // pattern — set on mount only.
  const supportsHoverRef = useRef<boolean>(true);
  useEffect(() => {
    supportsHoverRef.current = window.matchMedia("(hover: hover)").matches;
  }, []);

  const focused = useMemo(
    () => (focusedSlug ? artists.find((a) => a.slug === focusedSlug) : undefined),
    [focusedSlug, artists],
  );

  // Top-6 similar bands for the focused artist, by slug.
  const relatedSlugs = useMemo(() => {
    if (!focused) return new Set<string>();
    return new Set(similarArtists(focused, artists, 6).map((a) => a.slug));
  }, [focused, artists]);

  const onTileEnter = (a: AtlasArtist) => {
    if (supportsHoverRef.current) setFocusedSlug(a.slug);
  };
  const onTileLeave = () => {
    // Don't clear on leave — the panel stays until the user defocuses
    // (background click) or moves to another tile. This avoids flicker
    // when the cursor crosses gaps between tiles.
  };
  const onTileClick = (a: AtlasArtist) => {
    // On hover-capable devices: click navigates immediately.
    // On touch: first tap focuses, second tap on the same tile navigates.
    if (supportsHoverRef.current || focusedSlug === a.slug) {
      router.push(`/band/${a.slug}`);
    } else {
      setFocusedSlug(a.slug);
    }
  };

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState<Transform>({ z: 1, x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const tfRef = useRef<Transform>(transform);
  tfRef.current = transform;

  // Pointer state — distinguishes single-finger drag from 2-finger pinch.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startTfX: number;
    startTfY: number;
  } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number; cx: number; cy: number } | null>(
    null,
  );

  /**
   * Compute the transform that fits the world bounds into the viewport
   * with FIT_MARGIN padding and centers it.
   */
  const computeFitAll = useCallback((): Transform => {
    const vp = viewportRef.current;
    if (!vp) return { z: 1, x: 0, y: 0 };
    const vw = vp.clientWidth - FIT_MARGIN * 2;
    const vh = vp.clientHeight - FIT_MARGIN * 2;
    const ww = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
    const wh = WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY;
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(vw / ww, vh / wh)));
    // Center the world in the viewport.
    const wcx = (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2;
    const wcy = (WORLD_BOUNDS.minY + WORLD_BOUNDS.maxY) / 2;
    const x = vp.clientWidth / 2 - wcx * z;
    const y = vp.clientHeight / 2 - wcy * z;
    return { z, x, y };
  }, []);

  // Set the initial fit-all transform synchronously after first layout
  // so there's no visible "snap" from default {z:1, x:0, y:0}.
  useLayoutEffect(() => {
    setTransform(computeFitAll());
  }, [computeFitAll]);

  // Re-fit on viewport resize.
  useEffect(() => {
    const onResize = () => setTransform(computeFitAll());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [computeFitAll]);

  /**
   * Zoom around a fixed point in viewport coords (vx, vy).
   * Keeps the world point under the cursor stable.
   */
  const zoomAt = useCallback((vx: number, vy: number, factor: number) => {
    const tf = tfRef.current;
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, tf.z * factor));
    if (next === tf.z) return;
    // World point under (vx, vy): wp = (vx - tf.x) / tf.z
    // After zoom: vx == wp * next + new_tf.x  →  new_tf.x = vx - wp * next
    const wpx = (vx - tf.x) / tf.z;
    const wpy = (vy - tf.y) / tf.z;
    setTransform({ z: next, x: vx - wpx * next, y: vy - wpy * next });
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, factor);
    },
    [zoomAt],
  );

  const fitAll = useCallback(() => {
    setIsAnimating(true);
    setTransform(computeFitAll());
    // Match the CSS transition duration. setTimeout is OK here — we're
    // explicitly synchronizing with a CSS transition, not coupling to
    // some external timer.
    window.setTimeout(() => setIsAnimating(false), 420);
  }, [computeFitAll]);

  // Pointer handlers attached to the viewport.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".gx-tile")) setFocusedSlug(null);
    if (target.closest(".gx-tile")) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTfX: tfRef.current.x,
        startTfY: tfRef.current.y,
      };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      // size === 2 guarantees pts[0] and pts[1] exist
      const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
      const cx = (pts[0]!.x + pts[1]!.x) / 2;
      const cy = (pts[0]!.y + pts[1]!.y) / 2;
      pinchRef.current = { startDist: dist, startZoom: tfRef.current.z, cx, cy };
      dragRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = Array.from(pointersRef.current.values());
      // size >= 2 guarantees pts[0] and pts[1] exist
      const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
      const ratio = dist / pinchRef.current.startDist;
      const target = pinchRef.current.startZoom * ratio;
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      // Convert screen midpoint to viewport-local coords.
      const vx = pinchRef.current.cx - rect.left;
      const vy = pinchRef.current.cy - rect.top;
      // Set zoom directly to target (clamped) anchored at the pinch center.
      const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, target));
      const tf = tfRef.current;
      const wpx = (vx - tf.x) / tf.z;
      const wpy = (vy - tf.y) / tf.z;
      setTransform({ z: clamped, x: vx - wpx * clamped, y: vy - wpy * clamped });
    } else if (dragRef.current && pointersRef.current.size === 1) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setTransform({
        z: tfRef.current.z,
        x: dragRef.current.startTfX + dx,
        y: dragRef.current.startTfY + dy,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
    else if (pointersRef.current.size === 1 && !dragRef.current) {
      // size === 1 guarantees the first value exists
      const remaining = Array.from(pointersRef.current.values())[0]!;
      dragRef.current = {
        startX: remaining.x,
        startY: remaining.y,
        startTfX: tfRef.current.x,
        startTfY: tfRef.current.y,
      };
    }
  };

  // Wheel zoom around cursor. Use a non-passive listener to be able to preventDefault.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;
      // Negative deltaY = wheel up = zoom in. Standard "natural" feel.
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(vx, vy, factor);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Keyboard shortcuts: Esc dismisses focus; 0 fits all; +/- step zoom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/contenteditable somewhere.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;

      if (e.key === "Escape") setFocusedSlug(null);
      else if (e.key === "0") fitAll();
      else if (e.key === "+" || e.key === "=") zoomBy(ZOOM_STEP);
      else if (e.key === "-") zoomBy(1 / ZOOM_STEP);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fitAll, zoomBy]);

  const worldStyle: CSSProperties = {
    width: 600,
    height: 400,
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.z})`,
  };

  const isDragging = dragRef.current !== null;

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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={worldRef}
          className={`gx-world ${isAnimating ? "is-animating" : ""}`}
          style={worldStyle}
        >
          {artists.map((a) => {
            const pos = positions.get(a.slug);
            if (!pos) return null;
            const album = refAlbum(a)!;
            const tileStyle: CSSProperties = {
              left: pos.x,
              top: pos.y,
              ["--art-bg" as string]: paletteFor(a.moods).bg,
            } as CSSProperties;
            return (
              <button
                key={a.slug}
                type="button"
                className={`gx-tile ${focusedSlug === a.slug ? "is-focused" : ""} ${relatedSlugs.has(a.slug) ? "is-related" : ""}`}
                style={tileStyle}
                aria-label={`${a.name} — ${album.title}`}
                onMouseEnter={() => onTileEnter(a)}
                onMouseLeave={onTileLeave}
                onClick={() => onTileClick(a)}
              >
                {album.art?.url ? (
                  <img src={album.art.url} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="gx-tile-fallback">{initials(a.name)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <GraphPanel artist={focused ?? null} />
    </div>
  );
}
