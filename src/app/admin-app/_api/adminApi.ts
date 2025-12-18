// Admin App API Service - Tách biệt khỏi dự án chính
import axios from 'axios';

const BASE_URL = '/api/admin-app';

export interface Customer {
  crdfd_customerid: string;
  crdfd_name: string;
  cr44a_st?: string;
  crdfd_phone2?: string;
  cr44a_makhachhang?: string;
  crdfd_nganhnghe?: number; // Ngành nghề (OptionSet)
  crdfd_tinhthanh?: string; // Province ID
  crdfd_tinhthanh_name?: string; // Province name
  cr1bb_vungmien?: number; // Region OptionSet value
  cr1bb_vungmien_text?: string; // Region text (Miền Trung/Miền Nam)
}

export interface Product {
  crdfd_productsid: string;
  crdfd_name: string;
  crdfd_fullname?: string;
  crdfd_masanpham?: string;
  crdfd_unitname?: string;
  crdfd_onvichuantext?: string;
  crdfd_gtgt?: number;
  crdfd_gtgt_option?: number;
  cr1bb_banchatgiaphatra?: number; // Bản chất giá phát ra (OptionSet)
  crdfd_manhomsp?: string; // Mã nhóm sản phẩm
}

export interface Unit {
  crdfd_unitsid: string;
  crdfd_name: string;
  crdfd_giatrichuyenoi?: number;
  crdfd_onvichuan?: string;
  crdfd_onvichuantext?: string;
}

export interface AccountingStock {
  productCode: string;
  tenthuongmaitext?: string | null;
  accountingStock: number | null;
}

export interface SaleOrder {
  crdfd_sale_orderid: string;
  crdfd_name: string;
  crdfd_so_code?: string;
  crdfd_so_auto?: string;
  cr1bb_vattext?: string;
  crdfd_vat?: number;
  cr1bb_loaihoaon?: number | null; // Loại hóa đơn OptionSet value
  crdfd_loai_don_hang?: number | null; // Loại đơn hàng OptionSet value
}

export interface Warehouse {
  crdfd_khowecareid: string;
  crdfd_name: string;
  crdfd_makho?: string;
}

export interface InventoryInfo {
  productCode: string;
  warehouseName?: string | null;
  theoreticalStock: number; // Var_ton_kho_lythuyet_inventory (non VAT) hoặc tonkholythuyetbomuabd (VAT)
  actualStock: number | null;
}

export interface ProductPrice {
  price: number | null;
  unitName?: string;
  priceGroupText?: string;
  priceGroupName?: string;
  priceGroup?: string;
  giaFormat?: string;       // Gia_format từ Báo giá - chi tiết
  priceFormatted?: string;  // fallback tên khác nếu BE dùng
}

export interface Promotion {
  id: string;
  name: string;
  conditions?: string;
  type?: string;
  value?: string;
  value2?: string;
  value3?: string;
  valueWithVat?: string;
  valueNoVat?: string;
  valueBuyTogether?: string;
  vn?: string;
  startDate?: string;
  endDate?: string;
  promotionTypeText?: string;
  totalAmountCondition?: string;
  quantityCondition?: string;
  quantityConditionLevel3?: string;
  cumulativeQuantity?: string;
  paymentTerms?: string;
  paymentTermsLevel2?: string;
  paymentTermsLevel3?: string;
  saleInventoryOnly?: any;
  unitName?: string;
}

export interface SaleOrderDetail {
  id: string;
  stt: number;
  productName: string;
  unit: string;
  quantity: number;
  price: number;
  surcharge: number;
  discount: number;
  discountedPrice: number;
  vat: number;
  totalAmount: number;
  approver: string;
  deliveryDate: string;
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

// Fetch accounting stock (Tồn kho kế toán)
export const fetchAccountingStock = async (
  productCode?: string,
  isVatOrder?: boolean
): Promise<AccountingStock | null> => {
  if (!productCode) return null;
  try {
    const params: any = { productCode, isVatOrder };
    const response = await axios.get(`${BASE_URL}/accounting-stock`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching accounting stock:', error);
    return null;
  }
};

// Fetch inventory (tồn kho lý thuyết) by product code + warehouse name
export const fetchInventory = async (
  productCode?: string,
  warehouseName?: string,
  isVatOrder?: boolean
): Promise<InventoryInfo | null> => {
  if (!productCode) return null;
  try {
    const params: Record<string, string> = { productCode };
    if (warehouseName) params.warehouseName = warehouseName;
    if (isVatOrder !== undefined) params.isVatOrder = String(isVatOrder);
    const response = await axios.get(`${BASE_URL}/inventory`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return null;
  }
};

// Fetch price by product code (with customer + unit to mirror PowerApps filters on Báo giá - chi tiết)
export const fetchProductPrice = async (
  productCode?: string,
  customerCode?: string,
  unitId?: string,
  region?: string,
  isVatOrder?: boolean
): Promise<ProductPrice | null> => {
  if (!productCode) return null;
  try {
    const params: Record<string, string> = { productCode };
    if (customerCode) params.customerCode = customerCode;
    if (unitId) params.unitId = unitId;
    if (region) params.region = region;
    if (isVatOrder !== undefined) params.isVatOrder = String(isVatOrder);
    const response = await axios.get(`${BASE_URL}/prices`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching product price:', error);
    return null;
  }
};

export const fetchProductPromotions = async (
  productCode?: string,
  customerCode?: string
): Promise<Promotion[]> => {
  if (!productCode) return [];
  try {
    const params: Record<string, string> = { productCode };
    if (customerCode) {
      params.customerCode = customerCode;
    }
    const response = await axios.get(`${BASE_URL}/promotions`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return [];
  }
};

// Fetch Sale Order Details by SO ID (formData equivalent)
export const fetchSaleOrderDetails = async (
  soId?: string
): Promise<SaleOrderDetail[]> => {
  if (!soId) return [];
  try {
    const params = { soId };
    const response = await axios.get(`${BASE_URL}/sale-order-details`, { params });
    // Sort by STT descending (already sorted by API, but ensure it here too)
    const details = response.data || [];
    return details.sort((a: SaleOrderDetail, b: SaleOrderDetail) => (b.stt || 0) - (a.stt || 0));
  } catch (error) {
    console.error('Error fetching sale order details:', error);
    return [];
  }
};

// Save Sale Order Details (create/update)
export interface SaveSaleOrderDetailsRequest {
  soId: string;
  warehouseName?: string;
  isVatOrder?: boolean;
  customerIndustry?: number | null;
  products: Array<{
    id?: string;
    productId?: string;
    productCode?: string;
    productName: string;
    productGroupCode?: string;
    productCategoryLevel4?: string;
    unitId?: string;
    unit: string;
    quantity: number;
    price: number;
    discountedPrice?: number;
    originalPrice?: number;
    vat: number;
    vatAmount: number;
    subtotal: number;
    totalAmount: number;
    stt: number;
    deliveryDate?: string;
    note?: string;
    urgentOrder?: boolean;
    approvePrice?: boolean;
    approveSupPrice?: boolean;
    approveSupPriceId?: string;
    approver?: string;
    discountPercent?: number;
    discountAmount?: number;
    promotionText?: string;
    invoiceSurcharge?: number;
  }>;
}

export interface SaveSaleOrderDetailsResponse {
  success: boolean;
  message: string;
  savedDetails: any[];
  totalAmount: number;
}

export const saveSaleOrderDetails = async (
  data: SaveSaleOrderDetailsRequest
): Promise<SaveSaleOrderDetailsResponse> => {
  try {
    const response = await axios.post(`${BASE_URL}/save-sale-order-details`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error saving sale order details:', error);
    if (error.response?.data) {
      throw new Error(error.response.data.details || error.response.data.error || 'Failed to save sale order details');
    }
    throw error;
  }
};

