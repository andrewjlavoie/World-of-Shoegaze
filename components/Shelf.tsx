"use client";

import { useState } from "react";
import { DENSITY_OPTIONS, MOTION_OPTIONS, TONE_OPTIONS, useSettings } from "./SettingsProvider";
import type { Density, Motion, Tone } from "@/lib/types";

const SWATCH: Record<Tone, string> = {
  ink: "linear-gradient(135deg, #15110d 0%, #15110d 50%, #d65a52 50%, #d65a52)",
  paper: "linear-gradient(135deg, #ebe5d6 0%, #ebe5d6 50%, #8c2a23 50%, #8c2a23)",
  terminal: "linear-gradient(135deg, #0a0c08 0%, #0a0c08 50%, #aef4a0 50%, #aef4a0)",
  magenta: "linear-gradient(135deg, #0e0814 0%, #0e0814 50%, #ff5eb8 50%, #ff5eb8)",
};

export function Shelf() {
  const [open, setOpen] = useState(false);
  const { settings, setOne } = useSettings();

  return (
    <>
      <button
        className="shelf-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="open settings"
        aria-expanded={open}
        title="Tweaks"
      >
        ⚙
      </button>

      {open && (
        <div className="wos shelf-panel">
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 14 }}>
            <span className="kicker">[ tweaks ]</span>
            <span style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>persisted</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="kicker" style={{ marginBottom: 6 }}>
              // tone
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setOne("tone", t)}
                  style={{
                    flex: 1,
                    height: 36,
                    cursor: "pointer",
                    background: SWATCH[t],
                    border: settings.tone === t ? "2px solid var(--ink)" : "1px solid var(--rule)",
                    color: "transparent",
                    fontSize: 0,
                    padding: 0,
                  }}
                  aria-label={t}
                />
              ))}
            </div>
          </div>

          <RadioRow<Density>
            label="density"
            value={settings.density}
            options={DENSITY_OPTIONS}
            onChange={(v) => setOne("density", v)}
          />
          <RadioRow<Motion>
            label="motion"
            value={settings.motion}
            options={MOTION_OPTIONS}
            onChange={(v) => setOne("motion", v)}
          />

          <div
            className="ascii-rule"
            style={{ marginTop: 12, color: "var(--ink-faint)", fontSize: 10 }}
          >
            ============================
          </div>
          <div
            className="micro"
            style={{ marginTop: 12, color: "var(--ink-faint)", lineHeight: 1.5 }}
          >
            an honest mockup. thanks for being here.
          </div>
        </div>
      )}
    </>
  );
}

function RadioRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="kicker" style={{ marginBottom: 6 }}>
        // {label}
      </div>
      <div style={{ display: "flex", border: "1px solid var(--rule)" }}>
        {options.map((o, i) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`btn ${value === o ? "is-active" : ""}`}
            style={{
              flex: 1,
              border: "none",
              borderRight: i < options.length - 1 ? "1px solid var(--rule)" : "none",
              padding: "6px 4px",
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
