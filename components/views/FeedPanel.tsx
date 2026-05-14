"use client";

import { useMemo } from "react";
import { ERAS } from "@/lib/data";
import { eraLabel } from "@/lib/helpers";
import { FAMILY_KEYS, FAMILY_LABELS, type FamilyKey } from "@/lib/mood-families";
import {
  buildHref,
  decadeOf,
  dimensionCounts,
  type DimensionKey,
  type FilterState,
} from "@/lib/feed-filters";
import type { AtlasArtist } from "@/lib/atlas-types";

const DECADES = ["1980s", "1990s", "2000s", "2010s", "2020s"];

/** All distinct countries in the dataset, sorted by frequency descending then alphabetical. */
function countryOptions(artists: AtlasArtist[]): string[] {
  const counts = new Map<string, number>();
  for (const a of artists) counts.set(a.country, (counts.get(a.country) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([country]) => country);
}

export interface FeedPanelProps {
  open: boolean;
  artists: AtlasArtist[];
  state: FilterState;
  onChange: (next: FilterState) => void;
  onClose: () => void;
}

function toggleValue(values: string[], v: string): string[] {
  return values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
}

export function FeedPanel({ open, artists, state, onChange, onClose }: FeedPanelProps) {
  const countries = useMemo(() => countryOptions(artists), [artists]);

  const counts = useMemo(
    () => ({
      era: dimensionCounts(
        artists,
        state,
        "era",
        ERAS.map((e) => e.key),
      ),
      mood: dimensionCounts(artists, state, "mood", [...FAMILY_KEYS]),
      country: dimensionCounts(artists, state, "country", countries),
      decade: dimensionCounts(artists, state, "decade", DECADES),
    }),
    [artists, state, countries],
  );

  const toggleDim = (dim: DimensionKey, v: string) => {
    onChange({ ...state, [dim]: toggleValue(state[dim], v) });
  };

  const clearAll = () => {
    onChange({ ...state, era: [], mood: [], country: [], decade: [] });
  };

  const previewHref = buildHref(state);

  return (
    <>
      {open && <div className="feed-panel-backdrop" onClick={onClose} aria-hidden="true" />}
      <div
        className={`feed-panel ${open ? "is-open" : ""}`}
        role="dialog"
        aria-label="Filters"
        aria-modal={open}
      >
        <div className="feed-panel-mobile-handle" />
        <div className="feed-panel-mobile-head">
          <span className="feed-panel-mobile-title">Filters</span>
          <button
            type="button"
            className="feed-panel-mobile-close"
            onClick={onClose}
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div className="feed-panel-grid">
          <Block
            label="era"
            selectedCount={state.era.length}
            options={ERAS.map((e) => ({
              value: e.key,
              label: e.label,
              count: counts.era.get(e.key) ?? 0,
            }))}
            selected={state.era}
            onToggle={(v) => toggleDim("era", v)}
          />

          <Block
            label="mood family"
            selectedCount={state.mood.length}
            options={FAMILY_KEYS.map((k) => ({
              value: k,
              label: FAMILY_LABELS[k as FamilyKey],
              count: counts.mood.get(k) ?? 0,
            }))}
            selected={state.mood}
            onToggle={(v) => toggleDim("mood", v)}
          />

          <Block
            label="country"
            selectedCount={state.country.length}
            options={countries.map((c) => ({
              value: c,
              label: c,
              count: counts.country.get(c) ?? 0,
            }))}
            selected={state.country}
            onToggle={(v) => toggleDim("country", v)}
            wide
          />

          <Block
            label="decade"
            selectedCount={state.decade.length}
            options={DECADES.map((d) => ({ value: d, label: d, count: counts.decade.get(d) ?? 0 }))}
            selected={state.decade}
            onToggle={(v) => toggleDim("decade", v)}
            wide
          />
        </div>

        <div className="feed-panel-foot">
          <span className="feed-panel-url" title={previewHref}>
            URL: <code>{previewHref}</code>
          </span>
          <div className="feed-panel-foot-buttons">
            <button type="button" className="btn" onClick={clearAll}>
              clear all
            </button>
            <button type="button" className="btn is-active" onClick={onClose}>
              done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

interface BlockOption {
  value: string;
  label: string;
  count: number;
}

interface BlockProps {
  label: string;
  selectedCount: number;
  options: BlockOption[];
  selected: string[];
  onToggle: (value: string) => void;
  wide?: boolean;
}

function Block({ label, selectedCount, options, selected, onToggle, wide }: BlockProps) {
  return (
    <div className={`feed-panel-block ${wide ? "is-wide" : ""}`}>
      <div className="feed-panel-block-head">
        <span className="kicker">[ {label} ]</span>
        {selectedCount > 0 && (
          <span className="feed-panel-block-count">{selectedCount} selected</span>
        )}
      </div>
      <div className="feed-panel-block-chips">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              className={`chip ${active ? "is-active" : ""}`}
              onClick={() => onToggle(o.value)}
              aria-pressed={active}
            >
              <span>{o.label}</span>
              <span className="feed-panel-chip-count">{o.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
