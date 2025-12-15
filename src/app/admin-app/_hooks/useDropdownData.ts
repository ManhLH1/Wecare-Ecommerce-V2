'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchCustomers, fetchProducts, fetchUnits, fetchSaleOrders, fetchWarehouses } from '../_api/adminApi';
import type { Customer, Product, Unit, SaleOrder, Warehouse } from '../_api/adminApi';

export const useCustomers = (search?: string) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCustomers(search);
        setCustomers(data);
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
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProducts(search);
        setProducts(data);
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
    const loadUnits = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUnits(productCode);
        setUnits(data);
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
    const loadSaleOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load SO even if customerId is empty (load all SO)
        const data = await fetchSaleOrders(customerId || undefined);
        setSaleOrders(data);
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
    const loadWarehouses = async () => {
      if (!customerId && !customerCode) {
        setWarehouses([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchWarehouses(customerId, customerCode);
        setWarehouses(data);
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

