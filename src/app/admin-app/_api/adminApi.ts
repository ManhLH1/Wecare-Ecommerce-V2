// Admin App API Service - Tách biệt khỏi dự án chính
import axios from 'axios';

const BASE_URL = '/api/admin-app';

export interface Customer {
  crdfd_customerid: string;
  crdfd_name: string;
  cr44a_st?: string;
  crdfd_phone2?: string;
}

export interface Product {
  crdfd_productsid: string;
  crdfd_name: string;
  crdfd_fullname?: string;
  crdfd_masanpham?: string;
  crdfd_unitname?: string;
  crdfd_gtgt?: number;
  crdfd_gtgt_option?: number;
}

export interface Unit {
  crdfd_unitsid: string;
  crdfd_name: string;
}

export interface SaleOrder {
  crdfd_sale_orderid: string;
  crdfd_name: string;
  crdfd_so_code?: string;
  crdfd_so_auto?: string;
  cr1bb_vattext?: string;
  crdfd_vat?: number;
}

export interface Warehouse {
  crdfd_khowecareid: string;
  crdfd_name: string;
  crdfd_makho?: string;
}

// Fetch customers with search
export const fetchCustomers = async (search?: string): Promise<Customer[]> => {
  try {
    const params = search ? { search } : {};
    const response = await axios.get(`${BASE_URL}/customers`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

// Fetch products with search
export const fetchProducts = async (search?: string): Promise<Product[]> => {
  try {
    const params = search ? { search } : {};
    const response = await axios.get(`${BASE_URL}/products`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Fetch units by product code (Mã SP)
export const fetchUnits = async (productCode?: string): Promise<Unit[]> => {
  try {
    const params = productCode ? { productCode } : {};
    const response = await axios.get(`${BASE_URL}/units`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching units:', error);
    throw error;
  }
};

// Fetch sale orders
export const fetchSaleOrders = async (customerId?: string): Promise<SaleOrder[]> => {
  try {
    const params = customerId ? { customerId } : {};
    const response = await axios.get(`${BASE_URL}/sale-orders`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching sale orders:', error);
    throw error;
  }
};

// Fetch warehouses by customer
export const fetchWarehouses = async (customerId?: string, customerCode?: string): Promise<Warehouse[]> => {
  try {
    const params: any = {};
    if (customerId) params.customerId = customerId;
    if (customerCode) params.customerCode = customerCode;
    const response = await axios.get(`${BASE_URL}/warehouses`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    throw error;
  }
};

