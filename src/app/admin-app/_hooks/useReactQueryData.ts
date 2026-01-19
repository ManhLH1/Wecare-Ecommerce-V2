'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  fetchCustomers,
  fetchProducts,
  fetchUnits,
  fetchWarehouses,
  fetchSaleOrders,
  fetchSOBaoGia,
  Customer,
  Product,
  Unit,
  Warehouse,
  SaleOrder,
  SOBaoGia
} from '../_api/adminApi';

// Query keys
export const queryKeys = {
  customers: (search?: string) => ['customers', search || ''] as const,
  products: (search?: string) => ['products', search || ''] as const,
  units: (productCode?: string) => ['units', productCode || ''] as const,
  warehouses: (customerId?: string, customerCode?: string) =>
    ['warehouses', customerId || '', customerCode || ''] as const,
  saleOrders: (customerId?: string) => ['saleOrders', customerId || 'all'] as const,
  soBaoGia: (customerId?: string) => ['soBaoGia', customerId || 'all'] as const,
};

/**
 * Customers hook with React Query and prefetching
 */
export const useCustomersQuery = (search?: string) => {
  return useQuery({
    queryKey: queryKeys.customers(search),
    queryFn: () => fetchCustomers(search),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: search !== undefined, // Only run when search is defined (not just empty string)
  });
};

/**
 * Products hook with React Query and prefetching
 */
export const useProductsQuery = (search?: string) => {
  return useQuery({
    queryKey: queryKeys.products(search),
    queryFn: () => fetchProducts(search),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: search !== undefined, // Only run when search is defined
  });
};

/**
 * Units hook with React Query
 */
export const useUnitsQuery = (productCode?: string) => {
  return useQuery({
    queryKey: queryKeys.units(productCode),
    queryFn: () => fetchUnits(productCode),
    staleTime: 5 * 60 * 1000, // 5 minutes (units don't change often)
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!productCode, // Only run when productCode is provided
  });
};

/**
 * Warehouses hook with React Query
 */
export const useWarehousesQuery = (customerId?: string, customerCode?: string) => {
  return useQuery({
    queryKey: queryKeys.warehouses(customerId, customerCode),
    queryFn: () => fetchWarehouses(customerId, customerCode),
    staleTime: 5 * 60 * 1000, // 5 minutes (warehouses don't change often)
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!(customerId || customerCode), // Only run when we have customer info
  });
};

/**
 * Sale Orders hook with React Query
 */
export const useSaleOrdersQuery = (customerId?: string) => {
  return useQuery({
    queryKey: queryKeys.saleOrders(customerId),
    queryFn: () => fetchSaleOrders(customerId || undefined),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * SO Bao Gia hook with React Query
 */
export const useSOBaoGiaQuery = (customerId?: string) => {
  return useQuery({
    queryKey: queryKeys.soBaoGia(customerId),
    queryFn: () => fetchSOBaoGia(customerId || undefined),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Prefetch hook for customer and product data
 * Call this when user hovers over search fields to prefetch data
 */
export const usePrefetchData = () => {
  const queryClient = useQueryClient();

  const prefetchCustomers = (search?: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.customers(search),
      queryFn: () => fetchCustomers(search),
      staleTime: 60 * 1000,
    });
  };

  const prefetchProducts = (search?: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.products(search),
      queryFn: () => fetchProducts(search),
      staleTime: 60 * 1000,
    });
  };

  const prefetchUnits = (productCode: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.units(productCode),
      queryFn: () => fetchUnits(productCode),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchWarehouses = (customerId?: string, customerCode?: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.warehouses(customerId, customerCode),
      queryFn: () => fetchWarehouses(customerId, customerCode),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    prefetchCustomers,
    prefetchProducts,
    prefetchUnits,
    prefetchWarehouses,
  };
};

/**
 * Hook to prefetch data on hover for better UX
 */
export const useHoverPrefetch = () => {
  const { prefetchCustomers, prefetchProducts } = usePrefetchData();

  useEffect(() => {
    let customerTimeout: NodeJS.Timeout;
    let productTimeout: NodeJS.Timeout;

    const handleCustomerHover = () => {
      clearTimeout(customerTimeout);
      customerTimeout = setTimeout(() => {
        // Prefetch recent customers (empty search = get all recent)
        prefetchCustomers('');
      }, 100); // Small delay to avoid spam
    };

    const handleProductHover = () => {
      clearTimeout(productTimeout);
      productTimeout = setTimeout(() => {
        // Prefetch recent products
        prefetchProducts('');
      }, 100);
    };

    // These would be attached to search input hover events
    // For now, we'll prefetch on mount for demonstration
    handleCustomerHover();
    handleProductHover();

    return () => {
      clearTimeout(customerTimeout);
      clearTimeout(productTimeout);
    };
  }, [prefetchCustomers, prefetchProducts]);

  return null;
};
