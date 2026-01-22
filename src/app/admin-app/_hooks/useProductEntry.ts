'use client';

import { useState, useCallback } from 'react';

interface ProductEntryState {
  product: string;
  productCode: string;
  productGroupCode: string;
  unit: string;
  unitId: string;
  warehouse: string;
  quantity: number;
  price: string;
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  stockQuantity: number;
  approvePrice: boolean;
  approveSupPrice: boolean;
  urgentOrder: boolean;
  deliveryDate: string;
  customerIndustry: number | null;
  customerDistrictKey: string;
  note: string;
  approver: string;
  priceEntryMethod: 'Nhập thủ công' | 'Theo chiết khấu';
  discountRate: string;
  discountPercent: number;
  discountAmount: number;
  promotionText: string;
  promotionId: string;
}

interface ProductEntryActions {
  setProduct: (value: string) => void;
  setProductCode: (value: string) => void;
  setProductGroupCode: (value: string) => void;
  setUnit: (value: string) => void;
  setUnitId: (value: string) => void;
  setWarehouse: (value: string) => void;
  setQuantity: (value: number) => void;
  setPrice: (value: string) => void;
  setSubtotal: (value: number) => void;
  setVatPercent: (value: number) => void;
  setVatAmount: (value: number) => void;
  setTotalAmount: (value: number) => void;
  setStockQuantity: (value: number) => void;
  setApprovePrice: (value: boolean) => void;
  setApproveSupPrice: (value: boolean) => void;
  setUrgentOrder: (value: boolean) => void;
  setDeliveryDate: (value: string) => void;
  setCustomerIndustry: (value: number | null) => void;
  setCustomerDistrictKey: (value: string) => void;
  setNote: (value: string) => void;
  setApprover: (value: string) => void;
  setPriceEntryMethod: (value: 'Nhập thủ công' | 'Theo chiết khấu') => void;
  setDiscountRate: (value: string) => void;
  setDiscountPercent: (value: number) => void;
  setDiscountAmount: (value: number) => void;
  setPromotionText: (value: string) => void;
  setPromotionId: (value: string) => void;
  resetProductEntry: () => void;
}

const initialState: ProductEntryState = {
  product: '',
  productCode: '',
  productGroupCode: '',
  unit: '',
  unitId: '',
  warehouse: '',
  quantity: 1,
  price: '',
  subtotal: 0,
  vatPercent: 0,
  vatAmount: 0,
  totalAmount: 0,
  stockQuantity: 0,
  approvePrice: false,
  approveSupPrice: false,
  urgentOrder: false,
  deliveryDate: '',
  customerIndustry: null,
  customerDistrictKey: '',
  note: '',
  approver: '',
  priceEntryMethod: 'Nhập thủ công',
  discountRate: '1',
  discountPercent: 0,
  discountAmount: 0,
  promotionText: '',
  promotionId: '',
};

export const useProductEntry = () => {
  const [state, setState] = useState<ProductEntryState>(initialState);

  const actions: ProductEntryActions = {
    setProduct: useCallback((value: string) => setState(prev => ({ ...prev, product: value })), []),
    setProductCode: useCallback((value: string) => setState(prev => ({ ...prev, productCode: value })), []),
    setProductGroupCode: useCallback((value: string) => setState(prev => ({ ...prev, productGroupCode: value })), []),
    setUnit: useCallback((value: string) => setState(prev => ({ ...prev, unit: value })), []),
    setUnitId: useCallback((value: string) => setState(prev => ({ ...prev, unitId: value })), []),
    setWarehouse: useCallback((value: string) => setState(prev => ({ ...prev, warehouse: value })), []),
    setQuantity: useCallback((value: number) => setState(prev => ({ ...prev, quantity: value })), []),
    setPrice: useCallback((value: string) => setState(prev => ({ ...prev, price: value })), []),
    setSubtotal: useCallback((value: number) => setState(prev => ({ ...prev, subtotal: value })), []),
    setVatPercent: useCallback((value: number) => setState(prev => ({ ...prev, vatPercent: value })), []),
    setVatAmount: useCallback((value: number) => setState(prev => ({ ...prev, vatAmount: value })), []),
    setTotalAmount: useCallback((value: number) => setState(prev => ({ ...prev, totalAmount: value })), []),
    setStockQuantity: useCallback((value: number) => setState(prev => ({ ...prev, stockQuantity: value })), []),
    setApprovePrice: useCallback((value: boolean) => setState(prev => ({ ...prev, approvePrice: value })), []),
    setApproveSupPrice: useCallback((value: boolean) => setState(prev => ({ ...prev, approveSupPrice: value })), []),
    setUrgentOrder: useCallback((value: boolean) => setState(prev => ({ ...prev, urgentOrder: value })), []),
    setDeliveryDate: useCallback((value: string) => setState(prev => ({ ...prev, deliveryDate: value })), []),
    setCustomerIndustry: useCallback((value: number | null) => setState(prev => ({ ...prev, customerIndustry: value })), []),
    setCustomerDistrictKey: useCallback((value: string) => setState(prev => ({ ...prev, customerDistrictKey: value })), []),
    setNote: useCallback((value: string) => setState(prev => ({ ...prev, note: value })), []),
    setApprover: useCallback((value: string) => setState(prev => ({ ...prev, approver: value })), []),
    setPriceEntryMethod: useCallback((value: 'Nhập thủ công' | 'Theo chiết khấu') => setState(prev => ({ ...prev, priceEntryMethod: value })), []),
    setDiscountRate: useCallback((value: string) => setState(prev => ({ ...prev, discountRate: value })), []),
    setDiscountPercent: useCallback((value: number) => setState(prev => ({ ...prev, discountPercent: value })), []),
    setDiscountAmount: useCallback((value: number) => setState(prev => ({ ...prev, discountAmount: value })), []),
    setPromotionText: useCallback((value: string) => setState(prev => ({ ...prev, promotionText: value })), []),
    setPromotionId: useCallback((value: string) => setState(prev => ({ ...prev, promotionId: value })), []),
    resetProductEntry: useCallback(() => setState(initialState), []),
  };

  return {
    ...state,
    ...actions,
  };
};




























