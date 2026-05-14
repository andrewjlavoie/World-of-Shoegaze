"use client";

import type { DimensionKey, FilterState } from "@/lib/feed-filters";
import { FAMILY_LABELS } from "@/lib/mood-families";
import { eraLabel } from "@/lib/helpers";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  era: "era",
  mood: "mood",
  country: "country",
  decade: "decade",
};

/** Human label for one filter value (era keys → "First Wave", etc.) */
function valueLabel(dim: DimensionKey, value: string): string {
  if (dim === "era") return eraLabel(value);
  if (dim === "mood") return FAMILY_LABELS[value as keyof typeof FAMILY_LABELS] ?? value;
  return value; // country and decade are already human-readable
}

export interface ActiveFilterStripProps {
  state: FilterState;
  total: number;       // total artists in dataset
  filtered: number;    // count after filtering
  onClearDimension: (dim: DimensionKey) => void;
  onClearAll: () => void;
}

const DIMENSIONS: DimensionKey[] = ["era", "mood", "country", "decade"];

export function ActiveFilterStrip({
  state,
  total,
  filtered,
  onClearDimension,
  onClearAll,
}: ActiveFilterStripProps) {
  const activeDims = DIMENSIONS.filter((d) => state[d].length > 0);
  if (activeDims.length === 0) return null;

  return (
    <div className="feed-active">
      <span className="feed-active-label">active</span>
      {activeDims.map((dim) => {
        const values = state[dim];
        const display = values.map((v) => valueLabel(dim, v)).join(" + ");
        return (
          <button
            key={dim}
            type="button"
            className="feed-active-chip"
            onClick={() => onClearDimension(dim)}
            aria-label={`clear ${DIMENSION_LABELS[dim]} filter`}
            title="click to clear"
          >
            {DIMENSION_LABELS[dim]} · {display}
          </button>
        );
      })}
      <button
        type="button"
        className="feed-active-clear"
        onClick={onClearAll}
      >
        clear all
      </button>
      <span className="feed-active-count">
        {filtered} of {total} results
      </span>
    </div>
  );
}
