"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Density, Motion, Settings, Tone } from "@/lib/types";

const DEFAULTS: Settings = { tone: "ink", density: "normal", motion: "slow" };
const KEY = "wos.settings.v2";

interface Ctx {
  settings: Settings;
  setOne: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings((s) => ({ ...s, ...parsed }));
      }
    } catch {}
  }, []);

  // Apply to document on every change.
  useEffect(() => {
    document.body.setAttribute("data-tone", settings.tone);
    document.body.style.setProperty(
      "--motion",
      settings.motion === "snap" ? "200ms" : settings.motion === "fast" ? "400ms" : "700ms",
    );
    document.body.style.setProperty(
      "--density",
      settings.density === "tight" ? "0.85" : settings.density === "loose" ? "1.25" : "1",
    );
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const setOne = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
  }, []);

  return <SettingsCtx.Provider value={{ settings, setOne }}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const v = useContext(SettingsCtx);
  if (!v) throw new Error("useSettings outside SettingsProvider");
  return v;
}

export const TONE_OPTIONS: Tone[] = ["ink", "paper", "terminal", "magenta"];
export const DENSITY_OPTIONS: Density[] = ["tight", "normal", "loose"];
export const MOTION_OPTIONS: Motion[] = ["snap", "fast", "slow"];
