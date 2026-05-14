"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROUTES = [
  { key: "/", label: "feed" },
  { key: "/graph", label: "graph" },
  { key: "/timeline", label: "timeline" },
  { key: "/random", label: "random" },
];

export function SiteNav() {
  const path = usePathname();

  return (
    <nav className="wos wos-nav" aria-label="primary">
      <Link href="/" className="wos-nav-logo">
        <span className="wos-nav-logo-mark">w</span>
        <span className="wos-nav-logo-name">world of shoegaze</span>
      </Link>
      <span className="ascii-rule wos-nav-divider">//</span>
      <div className="wos-nav-routes">
        {ROUTES.map((r) => {
          const active = r.key === "/" ? path === "/" : path.startsWith(r.key);
          return (
            <Link key={r.key} href={r.key} className={`wos-nav-link${active ? " is-active" : ""}`}>
              {r.label}
            </Link>
          );
        })}
      </div>
      <span className="wos-nav-version">v0.1</span>
    </nav>
  );
}
