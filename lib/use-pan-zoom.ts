"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Transform {
  /** Zoom / scale factor. */
  z: number;
  /** Horizontal translation in px. */
  x: number;
  /** Vertical translation in px. */
  y: number;
}

export interface ZoomBounds {
  minZ: number;
  maxZ: number;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ---------------------------------------------------------------------------
// Pure math — exported for unit tests
// ---------------------------------------------------------------------------

/**
 * Clamp a zoom value within [bounds.minZ, bounds.maxZ].
 */
export function clampZoom(z: number, bounds: ZoomBounds): number {
  return Math.max(bounds.minZ, Math.min(bounds.maxZ, z));
}

/**
 * Zoom around a focal point in viewport-local coordinates (vx, vy).
 * The world point currently under (vx, vy) remains fixed after the zoom.
 *
 * Returns the updated Transform, or `current` unchanged if the factor
 * produces no movement (already at a clamped boundary).
 */
export function zoomAround(
  current: Transform,
  focal: { x: number; y: number },
  factor: number,
  bounds: ZoomBounds,
): Transform {
  const next = clampZoom(current.z * factor, bounds);
  if (next === current.z) return current;
  // World point under the focal pixel:  wp = (focal - tf.translate) / tf.z
  // After zoom, we want:  focal = wp * next + new_tf.translate
  //   → new_tf.translate = focal - wp * next
  const wpx = (focal.x - current.x) / current.z;
  const wpy = (focal.y - current.y) / current.z;
  return { z: next, x: focal.x - wpx * next, y: focal.y - wpy * next };
}

/**
 * Compute the midpoint of two pointer positions.
 */
export function pointerMidpoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Euclidean distance between two pointer positions.
 */
export function pointerDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Compute the transform that fits worldBounds inside the viewport
 * (viewportWidth × viewportHeight) with fitMargin px of padding.
 */
export function computeFitTransform(
  viewportWidth: number,
  viewportHeight: number,
  world: WorldBounds,
  fitMargin: number,
  bounds: ZoomBounds,
): Transform {
  const vw = viewportWidth - fitMargin * 2;
  const vh = viewportHeight - fitMargin * 2;
  const ww = world.maxX - world.minX;
  const wh = world.maxY - world.minY;
  const z = clampZoom(Math.min(vw / ww, vh / wh), bounds);
  const wcx = (world.minX + world.maxX) / 2;
  const wcy = (world.minY + world.maxY) / 2;
  const x = viewportWidth / 2 - wcx * z;
  const y = viewportHeight / 2 - wcy * z;
  return { z, x, y };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface PanZoomOptions {
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
  fitMargin: number;
  world: WorldBounds;
}

export interface PanZoomBindings {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export interface PanZoomState {
  transform: Transform;
  isAnimating: boolean;
  isDragging: boolean;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  worldRef: React.RefObject<HTMLDivElement | null>;
  bind: PanZoomBindings;
  fitAll: () => void;
  zoomBy: (factor: number) => void;
}

const FIT_ANIM_MS = 420;

export function usePanZoom(opts: PanZoomOptions): PanZoomState {
  const { zoomMin, zoomMax, zoomStep, fitMargin, world } = opts;
  const bounds: ZoomBounds = { minZ: zoomMin, maxZ: zoomMax };

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState<Transform>({ z: 1, x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  // Keep a ref so event handlers always see the latest transform without
  // stale closure issues.
  const tfRef = useRef<Transform>(transform);
  tfRef.current = transform;

  // Track live pointer positions.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  // Single-finger drag state.
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startTfX: number;
    startTfY: number;
  } | null>(null);

  // Two-finger pinch state.
  const pinchRef = useRef<{
    startDist: number;
    startZoom: number;
    cx: number;
    cy: number;
  } | null>(null);

  const getFitTransform = useCallback((): Transform => {
    const vp = viewportRef.current;
    if (!vp) return { z: 1, x: 0, y: 0 };
    return computeFitTransform(vp.clientWidth, vp.clientHeight, world, fitMargin, bounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, fitMargin, zoomMin, zoomMax]);

  // Apply fit synchronously after first layout to avoid the visible snap
  // from the default {z:1, x:0, y:0}.
  useLayoutEffect(() => {
    setTransform(getFitTransform());
  }, [getFitTransform]);

  // Re-fit on viewport resize.
  useEffect(() => {
    const onResize = () => setTransform(getFitTransform());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getFitTransform]);

  const zoomAt = useCallback(
    (vx: number, vy: number, factor: number) => {
      setTransform((tf) => zoomAround(tf, { x: vx, y: vy }, factor, bounds));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zoomMin, zoomMax],
  );

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
    setTransform(getFitTransform());
    window.setTimeout(() => setIsAnimating(false), FIT_ANIM_MS);
  }, [getFitTransform]);

  // Wheel zoom — must be a non-passive listener to call preventDefault.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(vx, vy, factor);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Keyboard: 0 = fit all; +/= zoom in; - zoom out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      if (e.key === "0") fitAll();
      else if (e.key === "+" || e.key === "=") zoomBy(zoomStep);
      else if (e.key === "-") zoomBy(1 / zoomStep);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fitAll, zoomBy, zoomStep]);

  // -------------------------------------------------------------------------
  // Pointer handlers
  // -------------------------------------------------------------------------

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
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
      const dist = pointerDistance(pts[0]!, pts[1]!);
      const mid = pointerMidpoint(pts[0]!, pts[1]!);
      pinchRef.current = {
        startDist: dist,
        startZoom: tfRef.current.z,
        cx: mid.x,
        cy: mid.y,
      };
      dragRef.current = null;
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchRef.current && pointersRef.current.size >= 2) {
        const pts = Array.from(pointersRef.current.values());
        const dist = pointerDistance(pts[0]!, pts[1]!);
        const ratio = dist / pinchRef.current.startDist;
        const target = pinchRef.current.startZoom * ratio;
        const vp = viewportRef.current;
        if (!vp) return;
        const rect = vp.getBoundingClientRect();
        const vx = pinchRef.current.cx - rect.left;
        const vy = pinchRef.current.cy - rect.top;
        const clamped = clampZoom(target, bounds);
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zoomMin, zoomMax],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
    } else if (pointersRef.current.size === 1 && !dragRef.current) {
      const remaining = Array.from(pointersRef.current.values())[0]!;
      dragRef.current = {
        startX: remaining.x,
        startY: remaining.y,
        startTfX: tfRef.current.x,
        startTfY: tfRef.current.y,
      };
    }
  }, []);

  const isDragging = dragRef.current !== null;

  return {
    transform,
    isAnimating,
    isDragging,
    viewportRef,
    worldRef,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    fitAll,
    zoomBy,
  };
}
