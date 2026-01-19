// Cache utility with localStorage and expiration
const CACHE_EXPIRATION_HOURS = 3;
const CACHE_EXPIRATION_MS = CACHE_EXPIRATION_HOURS * 60 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export class LocalStorageCache {
  private prefix: string;

  constructor(prefix: string = 'wecare_cache') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}_${key}`;
  }

  set<T>(key: string, data: T): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.getKey(key), JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('[Cache] Failed to set cache item:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (!item) return null;

      const cacheItem: CacheItem<T> = JSON.parse(item);
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheItem.timestamp > CACHE_EXPIRATION_MS) {
        // Remove expired cache
        this.delete(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn('[Cache] Failed to get cache item:', error);
      // Clean up corrupted cache
      this.delete(key);
      return null;
    }
  }

  delete(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.warn('[Cache] Failed to delete cache item:', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[Cache] Failed to clear cache:', error);
    }
  }

  // Check if cache exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Create a singleton instance for products cache
export const productsCache = new LocalStorageCache('wecare_products');

// Generic fetch with cache function
export async function fetchWithCache<T>(
  cacheKey: string,
  ttlMs: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cache = new LocalStorageCache('wecare_fetch');

  // Check if we have cached data
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch new data
  const data = await fetchFn();

  // Cache the result
  cache.set(cacheKey, data);

  return data;
}