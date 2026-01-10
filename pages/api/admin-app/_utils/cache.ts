import { LRUCache } from "lru-cache";

// Response cache for API endpoints
// TTL: 5 minutes for most data, 1 minute for frequently changing data
const responseCache = new LRUCache<string, any>({
  max: 500, // Maximum number of entries
  ttl: 5 * 60 * 1000, // 5 minutes default TTL
  updateAgeOnGet: true, // Update TTL on access
});

// Short TTL cache for frequently changing data (1 minute)
const shortCache = new LRUCache<string, any>({
  max: 200,
  ttl: 60 * 1000, // 1 minute
  updateAgeOnGet: true,
});

// Cache statistics for monitoring
let cacheHits = 0;
let cacheMisses = 0;
let totalRequests = 0;

// Generate cache key from endpoint and query params
export function getCacheKey(endpoint: string, params?: Record<string, any>): string {
  const sortedParams = params
    ? Object.keys(params)
        .sort()
        .map((key) => `${key}=${String(params[key])}`)
        .join("&")
    : "";
  return `${endpoint}${sortedParams ? `?${sortedParams}` : ""}`;
}

// Get cached response
export function getCachedResponse(key: string, useShortCache = false): any | undefined {
  totalRequests++;
  const cache = useShortCache ? shortCache : responseCache;
  const result = cache.get(key);

  if (result !== undefined) {
    cacheHits++;
  } else {
    cacheMisses++;
  }

  return result;
}

// Set cached response
export function setCachedResponse(
  key: string,
  value: any,
  useShortCache = false,
  customTTL?: number
): void {
  const cache = useShortCache ? shortCache : responseCache;
  if (customTTL) {
    cache.set(key, value, { ttl: customTTL });
  } else {
    cache.set(key, value);
  }
}

// Clear cache for a specific key pattern
export function clearCachePattern(pattern: string): void {
  const keysToDelete: string[] = [];
  
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  
  for (const key of shortCache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach((key) => {
    responseCache.delete(key);
    shortCache.delete(key);
  });
}

// Clear all cache
export function clearAllCache(): void {
  responseCache.clear();
  shortCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  totalRequests = 0;
}

// Get cache statistics
export function getCacheStats() {
  const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
  return {
    cacheHits,
    cacheMisses,
    totalRequests,
    hitRate: Math.round(hitRate * 100) / 100,
    longCacheSize: responseCache.size,
    shortCacheSize: shortCache.size,
  };
}

// Selective caching - only cache successful responses
export function shouldCacheResponse(statusCode: number, data: any): boolean {
  // Don't cache error responses
  if (statusCode >= 400) return false;

  // Don't cache empty responses
  if (!data || (Array.isArray(data) && data.length === 0)) return false;

  return true;
}

