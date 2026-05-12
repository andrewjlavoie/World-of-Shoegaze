"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROUTES = [
  { key: "/",         label: "feed" },
  { key: "/globe",    label: "globe" },
  { key: "/timeline", label: "timeline" },
  { key: "/tonight",  label: "tonight" },
];

export function SiteNav() {
  const path = usePathname();
  // Hide chrome in Drift mode — that view is supposed to be all-screen, no UI.
  if (path.startsWith("/drift/")) return null;

  return (
    <nav
      className="wos wos-nav"
      style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", gap: 18,
        padding: "12px 20px",
        background: "var(--paper)",
        borderBottom: "1px solid var(--rule)",
        boxShadow: "0 1px 0 var(--rule-soft), 0 6px 8px -8px rgba(0,0,0,0.08)",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 11,
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "baseline", gap: 8, textDecoration: "none", color: "var(--ink)" }}>
        <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontStyle: "italic", fontSize: 18, lineHeight: 1 }}>w</span>
        <span style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 10, color: "var(--ink-soft)" }}>
          world of shoegaze
        </span>
      </Link>
      <span className="ascii-rule wos-nav-divider" style={{ color: "var(--ink-faint)" }}>//</span>
      <div className="wos-nav-routes" style={{ display: "flex", gap: 14 }}>
        {ROUTES.map((r) => {
          const active = r.key === "/" ? path === "/" : path.startsWith(r.key);
          return (
            <Link key={r.key} href={r.key} style={{
              textDecoration: "none",
              color: active ? "var(--ink)" : "var(--ink-soft)",
              fontWeight: active ? 500 : 400,
              borderBottom: active ? "1px solid var(--accent)" : "1px solid transparent",
              paddingBottom: 2,
              letterSpacing: "0.04em",
            }}>
              {r.label}
            </Link>
          );
        })}
      </div>
      <span className="wos-nav-version" style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>v0.1 · 11.05.2026</span>
    </nav>
  );
}
