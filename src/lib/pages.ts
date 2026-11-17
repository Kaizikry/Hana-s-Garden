import { inStock, type Plant } from "../types";

/** The page number comes from the address, so anything out of range falls back to the nearest real page. */
export function paginate<T>(list: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(pages, Math.max(1, Math.floor(page) || 1));
  return { items: list.slice((current - 1) * size, current * size), page: current, pages };
}

/** Page numbers to show, with "…" for skipped runs once there are more than 7 pages. */
export function pageItems(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const near = [1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages);
  if (page <= 3) near.push(2, 3, 4);
  if (page >= pages - 2) near.push(pages - 3, pages - 2, pages - 1);
  const sorted = [...new Set(near)].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? ["…" as const, n] : [n]));
}

/** The Sheet keeps plants oldest first, so reversing puts new ones on page 1. Sold-out plants go last. */
export function shopOrder(plants: Plant[]): Plant[] {
  const newest = [...plants].reverse();
  return [...newest.filter(inStock), ...newest.filter((p) => !inStock(p))];
}
