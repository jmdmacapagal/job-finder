// The daily cron runs every user in one function call, and friends often share searches.
// Caching each fetch for an hour means a feed is fetched once per run, not once per user,
// which keeps us within Jobicy's once-an-hour and Remotive's few-a-day asks, and saves JSearch quota.
const TTL_MS = 60 * 60 * 1000;

const entries = new Map<string, { at: number; value: Promise<unknown> }>();

/** Returns the cached result for `key` if it's under an hour old, otherwise calls `load`. Failures aren't cached. */
export function cached<T>(key: string, load: () => Promise<T>, now = Date.now()): Promise<T> {
  const hit = entries.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.value as Promise<T>;
  const value = load();
  entries.set(key, { at: now, value });
  value.catch(() => {
    if (entries.get(key)?.value === value) entries.delete(key);
  });
  return value;
}

export function clearSourceCache() {
  entries.clear();
}
