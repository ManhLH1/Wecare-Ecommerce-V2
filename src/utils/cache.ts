export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getWithTTL<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const isExpired = Date.now() - parsed.timestamp > ttlMs;
    if (isExpired) return null;
    return parsed.data as T;
  } catch {
    return null;
  }
}

export function setWithTTL<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export async function fetchWithCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = getWithTTL<T>(key, ttlMs);
  if (cached) return cached;
  const data = await fetcher();
  setWithTTL<T>(key, data);
  return data;
}


