// Request deduplication to prevent duplicate concurrent requests
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const REQUEST_TIMEOUT = 10000; // 10 seconds - cleanup old pending requests

// Cleanup old pending requests periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > REQUEST_TIMEOUT) {
      pendingRequests.delete(key);
    }
  }
}, 5000); // Check every 5 seconds

/**
 * Deduplicate concurrent requests with the same key
 * @param key - Unique key for the request
 * @param requestFn - Function that returns a promise
 * @returns Promise that resolves to the request result
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if there's already a pending request with this key
  const existing = pendingRequests.get(key);
  if (existing) {
    // Return the existing promise
    return existing.promise;
  }

  // Create new request
  const promise = requestFn()
    .then((result) => {
      // Remove from pending requests on success
      pendingRequests.delete(key);
      return result;
    })
    .catch((error) => {
      // Remove from pending requests on error
      pendingRequests.delete(key);
      throw error;
    });

  // Store the pending request
  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
  });

  return promise;
}

/**
 * Generate a deduplication key from endpoint and params
 */
export function getDedupKey(endpoint: string, params?: Record<string, any>): string {
  const sortedParams = params
    ? Object.keys(params)
        .sort()
        .map((key) => `${key}=${String(params[key])}`)
        .join("&")
    : "";
  return `dedup:${endpoint}${sortedParams ? `?${sortedParams}` : ""}`;
}

