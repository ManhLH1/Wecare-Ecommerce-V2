'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchCustomers, fetchProducts, fetchUnits, fetchSaleOrders, fetchWarehouses, fetchSOBaoGia } from '../_api/adminApi';
import type { Customer, Product, Unit, SaleOrder, Warehouse, SOBaoGia } from '../_api/adminApi';

// Simple in-memory cache for API calls
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}



export const useCustomers = (search?: string) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = `customers-${search || ''}`;

    // Check cache first
    const cached = getCachedData<Customer[]>(cacheKey);
    if (cached) {
      setCustomers(cached);
      setLoading(false);
      return;
    }

    const loadCustomers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCustomers(search);
        setCustomers(data);
        setCachedData(cacheKey, data); // Cache the result
      } catch (err: any) {
        setError(err.message || 'Failed to load customers');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      loadCustomers();
    }, search ? 300 : 0);

    return () => clearTimeout(timer);
  }, [search]);

  return { customers, loading, error };
};


export const useProducts = (search?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = `products-${search || ''}`;

    // Check cache first
    const cached = getCachedData<Product[]>(cacheKey);
    if (cached) {
      setProducts(cached);
      setLoading(false);
      return;
    }

    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProducts(search);
        setProducts(data);
        setCachedData(cacheKey, data); // Cache the result
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      loadProducts();
    }, search ? 300 : 0);

    return () => clearTimeout(timer);
  }, [search]);

  return { products, loading, error };
};

export const useUnits = (productCode?: string) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = `units-${productCode || ''}`;

    // Check cache first
    const cached = getCachedData<Unit[]>(cacheKey);
    if (cached) {
      setUnits(cached);
      setLoading(false);
      return;
    }

    const loadUnits = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUnits(productCode);
        setUnits(data);
        setCachedData(cacheKey, data); // Cache the result
      } catch (err: any) {
        setError(err.message || 'Failed to load units');
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, [productCode]);

  return { units, loading, error };
};

export const useSaleOrders = (customerId?: string) => {
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = `saleorders-${customerId || 'all'}`;

    // Check cache first
    const cached = getCachedData<SaleOrder[]>(cacheKey);
    if (cached) {
      setSaleOrders(cached);
      setLoading(false);
      return;
    }

    const loadSaleOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load SO even if customerId is empty (load all SO)
        const data = await fetchSaleOrders(customerId || undefined);
        setSaleOrders(data);
        setCachedData(cacheKey, data); // Cache the result
      } catch (err: any) {
        console.error('Error loading sale orders:', err);
        setError(err.message || 'Failed to load sale orders');
        setSaleOrders([]);
      } finally {
        setLoading(false);
      }
    };

    // Load immediately
    loadSaleOrders();
  }, [customerId]);

  return { saleOrders, loading, error };
};

export const useWarehouses = (customerId?: string, customerCode?: string) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId && !customerCode) {
      setWarehouses([]);
      return;
    }

    const cacheKey = `warehouses-${customerId || ''}-${customerCode || ''}`;

    // Check cache first
    const cached = getCachedData<Warehouse[]>(cacheKey);
    if (cached) {
      setWarehouses(cached);
      setLoading(false);
      return;
    }

    const loadWarehouses = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWarehouses(customerId, customerCode);
        setWarehouses(data);
        setCachedData(cacheKey, data); // Cache the result
      } catch (err: any) {
        console.error('Error loading warehouses:', err);
        setError(err.message || 'Failed to load warehouses');
        setWarehouses([]);
      } finally {
        setLoading(false);
      }
    };

    loadWarehouses();
  }, [customerId, customerCode]);

  return { warehouses, loading, error };
};

export const useSaleOrderBaoGia = (customerId?: string) => {
  const [soBaoGiaList, setSoBaoGiaList] = useState<SOBaoGia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = `sobaogia-${customerId || 'all'}`;

    // Check cache first
    const cached = getCachedData<SOBaoGia[]>(cacheKey);
    if (cached) {
      setSoBaoGiaList(cached);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSOBaoGia(customerId || undefined);
        setSoBaoGiaList(data);
        setCachedData(cacheKey, data); // Cache the result
      } catch (err: any) {
        console.error('Error loading SO Bao Gia:', err);
        setError(err.message || 'Failed to load SO Bao Gia');
        setSoBaoGiaList([]);
      } finally {
        setLoading(false);
      }
    };

    // Load immediately
    loadData();
  }, [customerId]);

  return { soBaoGiaList, loading, error };
};
