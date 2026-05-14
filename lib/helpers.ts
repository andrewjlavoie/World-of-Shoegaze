import { ERAS } from "./taxonomy";

export function eraLabel(key: string): string {
  return ERAS.find((e) => e.key === key)?.label || key;
}

export const slugify = (n: string): string =>
  n
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
