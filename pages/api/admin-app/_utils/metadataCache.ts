/**
 * Metadata Cache for infrequently changing data
 * Provides longer TTL caching for Units, Warehouses, and other metadata
 */

import { LRUCache } from "lru-cache";

// Metadata cache with longer TTL for data that changes infrequently
const metadataCache = new LRUCache<string, any>({
  max: 200, // Smaller cache size since metadata is less varied
  ttl: 30 * 60 * 1000, // 30 minutes TTL (much longer than regular cache)
  updateAgeOnGet: true,
});

// Global metadata cache for shared data across requests
const globalMetadataCache = new LRUCache<string, any>({
  max: 50, // Very small cache for truly global data
  ttl: 60 * 60 * 1000, // 1 hour TTL
  updateAgeOnGet: true,
});

// Cache statistics
let metadataHits = 0;
let metadataMisses = 0;
let metadataTotalRequests = 0;

/**
 * Get cached metadata response
 */
export function getCachedMetadata(key: string, useGlobal = false): any | undefined {
  metadataTotalRequests++;
  const cache = useGlobal ? globalMetadataCache : metadataCache;
  const result = cache.get(key);

  if (result !== undefined) {
    metadataHits++;
  } else {
    metadataMisses++;
  }

  return result;
}

/**
 * Set cached metadata response
 */
export function setCachedMetadata(
  key: string,
  value: any,
  useGlobal = false,
  customTTL?: number
): void {
  const cache = useGlobal ? globalMetadataCache : metadataCache;
  if (customTTL) {
    cache.set(key, value, { ttl: customTTL });
  } else {
    cache.set(key, value);
  }
}

/**
 * Generate metadata cache key
 */
export function getMetadataCacheKey(table: string, params?: Record<string, any>): string {
  const sortedParams = params
    ? Object.keys(params)
        .sort()
        .map((key) => `${key}=${String(params[key])}`)
        .join("&")
    : "";
  return `metadata-${table}${sortedParams ? `?${sortedParams}` : ""}`;
}

/**
 * Clear metadata cache for specific patterns
 */
export function clearMetadataCachePattern(pattern: string): void {
  const keysToDelete: string[] = [];

  for (const key of metadataCache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }

  for (const key of globalMetadataCache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => {
    metadataCache.delete(key);
    globalMetadataCache.delete(key);
  });
}

/**
 * Get metadata cache statistics
 */
export function getMetadataCacheStats() {
  const hitRate = metadataTotalRequests > 0 ? (metadataHits / metadataTotalRequests) * 100 : 0;
  return {
    metadataHits,
    metadataMisses,
    metadataTotalRequests,
    metadataHitRate: Math.round(hitRate * 100) / 100,
    metadataCacheSize: metadataCache.size,
    globalMetadataCacheSize: globalMetadataCache.size,
  };
}

/**
 * Background cleanup for expired metadata entries
 */
export function cleanupExpiredMetadata(): void {
  // Force cleanup by accessing all keys (LRU cache handles TTL internally)
  const keys = Array.from(metadataCache.keys());
  keys.forEach(key => metadataCache.get(key));

  const globalKeys = Array.from(globalMetadataCache.keys());
  globalKeys.forEach(key => globalMetadataCache.get(key));
}

/**
 * Preload common metadata (can be called on server startup)
 */
export function preloadCommonMetadata(): void {
  // This can be used to preload frequently accessed metadata
  // For now, we'll let it build naturally through requests
}

/**
 * Metadata cache wrapper for API endpoints
 * Automatically handles caching for metadata endpoints
 */
export async function withMetadataCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  useGlobal = false,
  forceRefresh = false
): Promise<T> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCachedMetadata(cacheKey, useGlobal);
    if (cached !== undefined) {
      return cached;
    }
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result
  setCachedMetadata(cacheKey, data, useGlobal);

  return data;
}
