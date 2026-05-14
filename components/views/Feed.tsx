"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ERAS, MOOD_COLORS } from "@/lib/data";
import { eraLabel } from "@/lib/helpers";
import type { AtlasArtist, AtlasAlbum } from "@/lib/atlas-types";

type SortKey = "name" | "year" | "intensity";

function initials(name: string): string {
  const words = name.replace(/^The\s+/i, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function moodTag(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function paletteFor(moods: string[]) {
  const h = moods.length && MOOD_COLORS[moods[0]] ? MOOD_COLORS[moods[0]].hue : 260;
  return {
    bg: `linear-gradient(135deg, hsl(${h}, 55%, 35%), hsl(${(h + 35) % 360}, 60%, 22%))`,
    fg: "#fff8e8",
    hue: h,
  };
}

function refAlbum(artist: AtlasArtist): AtlasAlbum {
  return artist.discography.find((d) => d.isReference) || artist.discography[0];
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

function FeedCard({ artist, idx }: { artist: AtlasArtist; idx: number }) {
  const router = useRouter();
  const palette = paletteFor(artist.moods);
  const album = refAlbum(artist);
  const slug = artist.slug;
  const albumArtStyle: CSSProperties = {
    ["--art-bg" as string]: palette.bg,
    ["--art-fg" as string]: palette.fg,
  } as CSSProperties;

  return (
    <article className="feed-card fadeup" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
      <header className="feed-head">
        <Link href={`/band/${slug}`} className="feed-avatar" style={{ background: palette.bg, color: palette.fg }}>
          <span>{initials(artist.name)}</span>
        </Link>
        <Link href={`/band/${slug}`} className="feed-handle" aria-label={artist.name}>
          <div className="feed-handle-name">{artist.name}</div>
          <div className="feed-handle-meta">
            <span>{eraLabel(artist.era).toLowerCase()}</span>
            <span className="ascii-rule">·</span>
            <span>{artist.country}</span>
          </div>
        </Link>
        <button
          className="feed-menu"
          aria-label="more"
          onClick={(e) => { e.preventDefault(); router.push(`/band/${slug}`); }}
        >⋯</button>
      </header>

      <Link href={`/band/${slug}`} className="feed-art" aria-label={`${album.title} cover`}>
        {album.art?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.art.url} alt={`${album.title} cover`} className="feed-art-img" />
        ) : (
          <div className="album-art" style={albumArtStyle}>
            <span className="aa-marker">[{album.year}]</span>
            <div className="aa-title">{album.title}</div>
          </div>
        )}
      </Link>

      <div className="feed-actions">
        <Link href={`/band/${slug}`} className="feed-act" aria-label="open band">↗</Link>
        <span className="feed-act-spacer" />
        <span className="feed-act-year micro">[{album.year}]</span>
      </div>

      <div className="feed-intensity">
        <span className="kicker">intensity</span>
        <IntensityBar value={artist.intensity} />
        <span className="micro">{artist.intensity}/10</span>
      </div>

      <div className="feed-caption">
        <Link href={`/band/${slug}`} className="feed-caption-name">{artist.name}</Link>
        <span className="feed-caption-album">
          {" "}<span className="serif italic">{album.title}</span>
        </span>
        <p className="feed-caption-note serif italic">&ldquo;{artist.desc}&rdquo;</p>
      </div>

      <div className="feed-tags">
        {artist.moods.slice(0, 5).map((m) => {
          const mc = MOOD_COLORS[m];
          if (!mc) return null;
          return (
            <span key={m} className="feed-tag" style={{ color: `hsl(${mc.hue}, 55%, 38%)` }}>
              #{moodTag(mc.label)}
            </span>
          );
        })}
        <span className="feed-tag" style={{ color: "var(--ink-faint)" }}>
          #{moodTag(artist.subgenre)}
        </span>
      </div>
    </article>
  );
}

export function Feed({ artists }: { artists: AtlasArtist[] }) {
  const [search, setSearch] = useState("");
  const [activeEra, setActiveEra] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    let res = artists.filter((a) => {
      if (s) {
        const refTitle = refAlbum(a).title.toLowerCase();
        if (!a.name.toLowerCase().includes(s)
          && !refTitle.includes(s)
          && !a.country.toLowerCase().includes(s)
          && !a.subgenre.toLowerCase().includes(s)) return false;
      }
      if (activeEra && a.era !== activeEra) return false;
      return true;
    });
    const sorters: Record<SortKey, (a: AtlasArtist, b: AtlasArtist) => number> = {
      name: (a, b) => a.name.replace(/^The /i, "").localeCompare(b.name.replace(/^The /i, "")),
      year: (a, b) => refAlbum(b).year - refAlbum(a).year,
      intensity: (a, b) => b.intensity - a.intensity,
    };
    return res.sort(sorters[sortBy]);
  }, [artists, search, activeEra, sortBy]);

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
              {filtered.length} of {artists.length} entries · scroll like it&rsquo;s 2012
            </div>
          </div>
        </header>

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

        <div className="feed-stream">
          {filtered.map((a, i) => <FeedCard key={a.slug} artist={a} idx={i} />)}
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
