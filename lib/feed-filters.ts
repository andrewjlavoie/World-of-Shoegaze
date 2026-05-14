// Pure filter logic for the Feed view.
// FilterState is the single source of truth. URL search params parse into
// it; it builds back into a URL. applyFilters and dimensionCounts (next
// task) consume it without ever touching React.

import type { AtlasArtist } from "./atlas-types";

export type SortKey = "name" | "year" | "intensity";

const SORT_KEYS: readonly SortKey[] = ["name", "year", "intensity"] as const;

export interface FilterState {
  search: string;
  sort: SortKey;
  era: string[];      // era keys (cf. lib/data.ts ERAS)
  mood: string[];     // family keys (cf. lib/mood-families.ts FAMILY_KEYS)
  country: string[];  // raw country names from artist.country
  decade: string[];   // "1980s" | "1990s" | "2000s" | "2010s" | "2020s"
}

export const EMPTY_STATE: FilterState = {
  search: "",
  sort: "name",
  era: [],
  mood: [],
  country: [],
  decade: [],
};

export type DimensionKey = "era" | "mood" | "country" | "decade";

const DIMENSION_KEYS: readonly DimensionKey[] = ["era", "mood", "country", "decade"] as const;

/**
 * Read filter state from URLSearchParams. Unknown / empty values become
 * empty arrays. Unknown sort falls back to "name".
 */
export function parseSearchParams(
  params: URLSearchParams | { get(name: string): string | null },
): FilterState {
  const get = (k: string) => params.get(k) ?? "";
  const arr = (k: string): string[] => {
    const raw = get(k);
    if (!raw) return [];
    return raw.split(",").map((v) => v.trim()).filter(Boolean);
  };
  const sortRaw = get("sort");
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(sortRaw)
    ? (sortRaw as SortKey)
    : "name";
  return {
    search: get("search"),
    sort,
    era: arr("era"),
    mood: arr("mood"),
    country: arr("country"),
    decade: arr("decade"),
  };
}

/**
 * Serialize filter state to a URL pathname + query string. Empty arrays
 * and default sort are omitted. Key order is stable
 * (search, sort, era, mood, country, decade) so URLs are deterministic.
 */
export function buildHref(state: FilterState, basePath = "/"): string {
  const parts: string[] = [];
  if (state.search) parts.push(`search=${encodeURIComponent(state.search)}`);
  if (state.sort && state.sort !== "name") parts.push(`sort=${state.sort}`);
  for (const k of DIMENSION_KEYS) {
    const values = state[k];
    if (values.length === 0) continue;
    parts.push(`${k}=${values.map(encodeURIComponent).join("%2C")}`);
  }
  return parts.length === 0 ? basePath : `${basePath}?${parts.join("&")}`;
}

/**
 * Year → decade label. 1991 → "1990s", 2000 → "2000s".
 */
export function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

/**
 * Count of dimensions with at least one selection. Used to badge the
 * `[filters · N]` button. Search and sort don't count.
 */
export function activeCount(state: FilterState): number {
  let n = 0;
  for (const k of DIMENSION_KEYS) if (state[k].length > 0) n++;
  return n;
}
