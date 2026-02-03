import { useState, useCallback, useRef } from 'react';

interface BatchProductRequest {
  productCode: string;
  customerCode?: string;
  customerId?: string;
  region?: string;
  warehouseName?: string;
  isVatOrder?: boolean;
  quantity?: number;
}

interface BatchProductData {
  productCode: string;
  units: Array<{
    id: string;
    name: string;
    conversionRate: number;
  }>;
  prices: any[];
  inventory: any;
  promotions?: any[];
}

interface UseBatchProductDataReturn {
  fetchBatchData: (requests: BatchProductRequest[]) => Promise<BatchProductData[]>;
  fetchBatchDataOptimistic: (requests: BatchProductRequest[]) => Promise<BatchProductData[]>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useBatchProductData(): UseBatchProductDataReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 🚀 LOCAL CACHE - Client-side cache for faster subsequent access
  const cacheRef = useRef<Map<string, BatchProductData>>(new Map());

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Generate cache key for client-side
  const getCacheKey = useCallback((request: BatchProductRequest): string => {
    return `${request.productCode}-${request.customerCode || ''}-${request.region || ''}-${request.warehouseName || ''}`;
  }, []);

  const fetchBatchData = useCallback(async (requests: BatchProductRequest[]): Promise<BatchProductData[]> => {
    if (requests.length === 0) return [];

    setLoading(true);
    setError(null);

    try {
      // 🚀 CHECK LOCAL CACHE FIRST
      const uncachedRequests: BatchProductRequest[] = [];
      const cachedResults: BatchProductData[] = [];

      for (const req of requests) {
        const cacheKey = getCacheKey(req);
        const cached = cacheRef.current.get(cacheKey);

        if (cached) {
          cachedResults.push(cached);
        } else {
          uncachedRequests.push(req);
        }
      }

      // Fetch uncached requests from API
      let apiResults: BatchProductData[] = [];
      if (uncachedRequests.length > 0) {
        const response = await fetch('/api/admin-app/batch-product-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: uncachedRequests }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        apiResults = data.results
          .filter((r: any) => !r.error)
          .map((r: any) => r.data);

        // 🚀 STORE IN LOCAL CACHE
        for (const result of apiResults) {
          const matchingRequest = uncachedRequests.find(r => r.productCode === result.productCode);
          if (matchingRequest) {
            const cacheKey = getCacheKey(matchingRequest);
            cacheRef.current.set(cacheKey, result);

            // Limit cache size (max 100 entries)
            if (cacheRef.current.size > 100) {
              const firstKey = cacheRef.current.keys().next().value as string;
              cacheRef.current.delete(firstKey);
            }
          }
        }
      }

      // Merge cached and fresh results, maintaining original order
      const resultMap = new Map<string, BatchProductData>();

      // Add cached results
      for (const result of cachedResults) {
        resultMap.set(result.productCode, result);
      }

      // Add fresh results (they override cached)
      for (const result of apiResults) {
        resultMap.set(result.productCode, result);
      }

      // Return results in same order as requests
      return requests.map(req => resultMap.get(req.productCode)).filter((v): v is BatchProductData => v !== undefined);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Batch product data fetch error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getCacheKey]);

  // 🚀 OPTIMISTIC FETCH - Returns cached data immediately if available
  const fetchBatchDataOptimistic = useCallback(async (requests: BatchProductRequest[]): Promise<BatchProductData[]> => {
    // Check local cache first
    const cachedResults: BatchProductData[] = [];

    for (const req of requests) {
      const cacheKey = getCacheKey(req);
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        cachedResults.push(cached);
      }
    }

    // Fetch fresh data in background (don't await)
    if (cachedResults.length < requests.length) {
      fetchBatchData(requests).catch(console.error);
    }

    return cachedResults;
  }, [getCacheKey, fetchBatchData]);

  return {
    fetchBatchData,
    fetchBatchDataOptimistic,
    loading,
    error,
    clearError,
  };
}