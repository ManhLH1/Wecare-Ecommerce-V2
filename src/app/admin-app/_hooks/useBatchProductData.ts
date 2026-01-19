import { useState, useEffect, useCallback } from 'react';

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
}

interface UseBatchProductDataReturn {
  fetchBatchData: (requests: BatchProductRequest[]) => Promise<BatchProductData[]>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useBatchProductData(): UseBatchProductDataReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchBatchData = useCallback(async (requests: BatchProductRequest[]): Promise<BatchProductData[]> => {
    if (requests.length === 0) return [];

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin-app/batch-product-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Process results and handle errors
      const results: BatchProductData[] = [];
      for (const result of data.results) {
        if (result.error) {
          console.warn(`Error fetching data for product ${requests[data.results.indexOf(result)]?.productCode}:`, result.error);
          // Return empty data for failed requests to maintain array length
          results.push({
            productCode: requests[data.results.indexOf(result)]?.productCode || '',
            units: [],
            prices: [],
            inventory: null,
          });
        } else {
          results.push(result.data);
        }
      }

      return results;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Batch product data fetch error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchBatchData,
    loading,
    error,
    clearError,
  };
}