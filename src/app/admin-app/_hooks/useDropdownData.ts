'use client';

import { useCallback } from 'react';
import {
  useCustomersQuery,
  useProductsQuery,
  useUnitsQuery,
  useWarehousesQuery,
  useSaleOrdersQuery,
  useSOBaoGiaQuery,
  usePrefetchData
} from './useReactQueryData';
import type { Customer, Product, Unit, SaleOrder, Warehouse, SOBaoGia } from '../_api/adminApi';



export const useCustomers = (search?: string) => {
  const { prefetchCustomers } = usePrefetchData();
  const query = useCustomersQuery(search);

  // Prefetch on hover (this would be called from UI components)
  const prefetch = useCallback(() => {
    prefetchCustomers(search);
  }, [prefetchCustomers, search]);

  return {
    customers: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    prefetch,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};


export const useProducts = (search?: string) => {
  const { prefetchProducts } = usePrefetchData();
  const query = useProductsQuery(search);

  // Prefetch on hover
  const prefetch = useCallback(() => {
    prefetchProducts(search);
  }, [prefetchProducts, search]);

  return {
    products: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    prefetch,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};

export const useUnits = (productCode?: string) => {
  const query = useUnitsQuery(productCode);

  return {
    units: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};

export const useSaleOrders = (customerId?: string) => {
  const query = useSaleOrdersQuery(customerId);

  return {
    saleOrders: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};

export const useWarehouses = (customerId?: string, customerCode?: string) => {
  const query = useWarehousesQuery(customerId, customerCode);

  return {
    warehouses: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};

export const useSaleOrderBaoGia = (customerId?: string) => {
  const query = useSOBaoGiaQuery(customerId);

  return {
    soBaoGiaList: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};
