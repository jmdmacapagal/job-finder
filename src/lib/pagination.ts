export const PAGE_SIZE = 20;

/** Reads a 1-based page number from a search param, falling back to 1 for anything invalid. */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Inclusive row range for Supabase's `.range(from, to)`. */
export function pageRange(page: number, size = PAGE_SIZE): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1];
}

export function totalPages(count: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / size));
}
