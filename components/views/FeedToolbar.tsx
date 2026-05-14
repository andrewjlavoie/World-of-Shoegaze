"use client";

import type { SortKey, FilterState } from "@/lib/feed-filters";

const SORT_OPTIONS: SortKey[] = ["name", "year", "intensity"];

export interface FeedToolbarProps {
  search: string;
  sort: SortKey;
  activeCount: number;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: SortKey) => void;
  onOpenFilters: () => void;
}

export function FeedToolbar({
  search,
  sort,
  activeCount,
  onSearchChange,
  onSortChange,
  onOpenFilters,
}: FeedToolbarProps) {
  return (
    <div className="feed-toolbar2">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="? search…"
        className="feed-toolbar2-search"
      />
      <button
        type="button"
        className="btn feed-toolbar2-filters"
        onClick={onOpenFilters}
        aria-label="open filters"
      >
        filters{activeCount > 0 && <span className="feed-toolbar2-badge">{activeCount}</span>}
      </button>
      <div className="feed-toolbar2-sort">
        {SORT_OPTIONS.map((k) => (
          <button
            key={k}
            type="button"
            className={`btn ${sort === k ? "is-active" : ""}`}
            onClick={() => onSortChange(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// Re-export FilterState so consumers can import from here too if convenient.
export type { FilterState };
