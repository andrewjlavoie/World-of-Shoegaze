"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlbumArt } from "@/components/AlbumArt";
import { BAND_MOODS, BANDS, ERAS, MOOD_COLORS } from "@/lib/data";
import { bandPalette, eraLabel, slugify } from "@/lib/helpers";
import type { Band } from "@/lib/types";

type SortKey = "name" | "year" | "intensity";

function initials(name: string): string {
  const words = name.replace(/^The\s+/i, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function moodTag(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function IntensityBar({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 10, letterSpacing: 1, lineHeight: 1 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} style={{ color: i < value ? "var(--ink)" : "var(--rule)" }}>{i < value ? "▰" : "▱"}</span>
      ))}
    </span>
  );
}

function FeedCard({ band, idx }: { band: Band; idx: number }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const palette = bandPalette(band.name);
  const moods = BAND_MOODS[band.name] || [];
  const slug = slugify(band.name);

  return (
    <article className="feed-card fadeup" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
      {/* IG-style handle row */}
      <header className="feed-head">
        <Link href={`/band/${slug}`} className="feed-avatar" style={{ background: palette.bg, color: palette.fg }}>
          <span>{initials(band.name)}</span>
        </Link>
        <Link href={`/band/${slug}`} className="feed-handle" aria-label={band.name}>
          <div className="feed-handle-name">{band.name}</div>
          <div className="feed-handle-meta">
            <span>{eraLabel(band.era).toLowerCase()}</span>
            <span className="ascii-rule">·</span>
            <span>{band.country}</span>
          </div>
        </Link>
        <button
          className="feed-menu"
          aria-label="more"
          onClick={(e) => { e.preventDefault(); router.push(`/band/${slug}`); }}
        >⋯</button>
      </header>

      {/* The square — the dominant visual */}
      <Link href={`/band/${slug}`} className="feed-art" aria-label={`${band.album} cover`}>
        <AlbumArt band={band} />
      </Link>

      {/* Actions */}
      <div className="feed-actions">
        <Link href={`/drift/${slug}`} className="feed-act" aria-label="enter drift">▶</Link>
        <button
          type="button"
          className={`feed-act ${liked ? "is-on" : ""}`}
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? "unlike" : "like"}
        >{liked ? "♥" : "♡"}</button>
        <Link href={`/band/${slug}`} className="feed-act" aria-label="sounds like">↗</Link>
        <button type="button" className="feed-act" aria-label="share">⤴</button>
        <span className="feed-act-spacer" />
        <span className="feed-act-year micro">[{band.year}]</span>
      </div>

      {/* Intensity row */}
      <div className="feed-intensity">
        <span className="kicker">intensity</span>
        <IntensityBar value={band.intensity} />
        <span className="micro">{band.intensity}/10</span>
      </div>

      {/* Caption */}
      <div className="feed-caption">
        <Link href={`/band/${slug}`} className="feed-caption-name">{band.name}</Link>
        <span className="feed-caption-album">
          {" "}<span className="serif italic">{band.album}</span>
        </span>
        <p className="feed-caption-note serif italic">&ldquo;{band.desc}&rdquo;</p>
      </div>

      {/* Hashtags = moods + subgenre */}
      <div className="feed-tags">
        {moods.slice(0, 5).map((m) => (
          <span key={m} className="feed-tag" style={{ color: `hsl(${MOOD_COLORS[m].hue}, 55%, 38%)` }}>
            #{moodTag(MOOD_COLORS[m].label)}
          </span>
        ))}
        <span className="feed-tag" style={{ color: "var(--ink-faint)" }}>
          #{moodTag(band.subgenre)}
        </span>
      </div>
    </article>
  );
}

export function Feed() {
  const [search, setSearch] = useState("");
  const [activeEra, setActiveEra] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    let res = BANDS.filter((b) => {
      if (s && !b.name.toLowerCase().includes(s) && !b.album.toLowerCase().includes(s)
        && !b.country.toLowerCase().includes(s) && !b.subgenre.toLowerCase().includes(s)) return false;
      if (activeEra && b.era !== activeEra) return false;
      return true;
    });
    const sorters: Record<SortKey, (a: Band, b: Band) => number> = {
      name: (a, b) => a.name.replace(/^The /i, "").localeCompare(b.name.replace(/^The /i, "")),
      year: (a, b) => b.year - a.year,
      intensity: (a, b) => b.intensity - a.intensity,
    };
    return res.sort(sorters[sortBy]);
  }, [search, activeEra, sortBy]);

  return (
    <div className="wos paper wos-paper-pad" style={{ width: "100%", minHeight: "100%" }}>
      <div className="feed-page">
        <header className="feed-page-head">
          <div className="micro" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>worldofshoegaze.com / feed</span>
            <span>view 01 / feed</span>
          </div>
          <div className="rule-2" style={{ marginTop: 10 }} />
          <div className="feed-page-title">
            <h1 className="feed-h1">
              The Feed<span className="italic" style={{ color: "var(--accent)" }}>.</span>
            </h1>
            <div className="small italic serif feed-page-tagline">
              {filtered.length} of {BANDS.length} entries · scroll like it&rsquo;s 2012
            </div>
          </div>
        </header>

        {/* toolbar */}
        <div className="feed-toolbar">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="? search…" />
          <div className="feed-toolbar-row">
            <div className="feed-eras">
              <button className={`chip ${!activeEra ? "is-active" : ""}`} onClick={() => setActiveEra(null)}>all</button>
              {ERAS.map((e) => (
                <button key={e.key} className={`chip ${activeEra === e.key ? "is-active" : ""}`} onClick={() => setActiveEra(activeEra === e.key ? null : e.key)}>{e.label}</button>
              ))}
            </div>
            <div className="feed-sort">
              {(["name", "year", "intensity"] as const).map((k) => (
                <button key={k} className={`btn ${sortBy === k ? "is-active" : ""}`} onClick={() => setSortBy(k)}>{k}</button>
              ))}
            </div>
          </div>
        </div>

        {/* the feed */}
        <div className="feed-stream">
          {filtered.map((b, i) => <FeedCard key={b.name} band={b} idx={i} />)}
          {filtered.length === 0 && (
            <div className="feed-empty">
              <div className="kicker">[ nothing matches ]</div>
              <p className="serif italic">try fewer filters</p>
            </div>
          )}
        </div>

        <footer className="feed-footer">
          <div className="ascii-rule" style={{ fontSize: 10 }}>================================ end of feed ================================</div>
          <div className="micro" style={{ marginTop: 14, display: "flex", justifyContent: "space-between" }}>
            <span>maintained by one obsessive</span>
            <span><a href="#">guestbook</a> · <a href="#">about</a> · <a href="#">rss</a></span>
          </div>
        </footer>
      </div>
    </div>
  );
}
