"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MOOD_COLORS } from "@/lib/data";
import { eraLabel } from "@/lib/helpers";
import { initials, moodTag, paletteFor, refAlbum } from "@/lib/atlas-helpers";
import {
  EMPTY_STATE,
  activeCount,
  applyFilters,
  buildHref,
  parseSearchParams,
  type DimensionKey,
  type FilterState,
  type SortKey,
} from "@/lib/feed-filters";
import { FeedToolbar } from "./FeedToolbar";
import { ActiveFilterStrip } from "./ActiveFilterStrip";
import { FeedPanel } from "./FeedPanel";
import type { AtlasArtist, AtlasAlbum } from "@/lib/atlas-types";

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
  const album = refAlbum(artist)!;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo<FilterState>(
    () => parseSearchParams(searchParams),
    [searchParams],
  );

  const [panelOpen, setPanelOpen] = useState(false);

  const filtered = useMemo(() => applyFilters(artists, state), [artists, state]);

  const update = useCallback(
    (next: FilterState) => router.replace(buildHref(next), { scroll: false }),
    [router],
  );

  const onSearchChange = useCallback(
    (search: string) => update({ ...state, search }),
    [state, update],
  );
  const onSortChange = useCallback(
    (sort: SortKey) => update({ ...state, sort }),
    [state, update],
  );
  const onClearDimension = useCallback(
    (dim: DimensionKey) => update({ ...state, [dim]: [] }),
    [state, update],
  );
  const onClearAll = useCallback(
    () => update(EMPTY_STATE),
    [update],
  );

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

        <FeedToolbar
          search={state.search}
          sort={state.sort}
          activeCount={activeCount(state)}
          onSearchChange={onSearchChange}
          onSortChange={onSortChange}
          onOpenFilters={() => setPanelOpen((o) => !o)}
        />

        <ActiveFilterStrip
          state={state}
          total={artists.length}
          filtered={filtered.length}
          onClearDimension={onClearDimension}
          onClearAll={onClearAll}
        />

        <FeedPanel
          open={panelOpen}
          artists={artists}
          state={state}
          onChange={update}
          onClose={() => setPanelOpen(false)}
        />

        <div className="feed-stream">
          {filtered.map((a, i) => <FeedCard key={a.slug} artist={a} idx={i} />)}
          {filtered.length === 0 && (
            <div className="feed-empty">
              <div className="kicker">[ nothing matches ]</div>
              <p className="serif italic">try fewer filters</p>
              {activeCount(state) > 0 && (
                <button type="button" className="btn" onClick={onClearAll} style={{ marginTop: 12 }}>
                  clear all filters
                </button>
              )}
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
