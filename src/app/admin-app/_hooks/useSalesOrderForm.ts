'use client';

import { useState, useCallback } from 'react';

interface SalesOrderFormState {
  customer: string;
  customerId: string;
  customerCode: string;
  customerSearch: string;
  so: string;
  soId: string;
  isLoadingDetails: boolean;
  isSaving: boolean;
  isAdding: boolean;
  isOrderInfoCollapsed: boolean;
  productList: any[]; // You might want to type this properly
}

interface SalesOrderFormActions {
  setCustomer: (value: string) => void;
  setCustomerId: (value: string) => void;
  setCustomerCode: (value: string) => void;
  setCustomerSearch: (value: string) => void;
  setSo: (value: string) => void;
  setSoId: (value: string) => void;
  setIsLoadingDetails: (value: boolean) => void;
  setIsSaving: (value: boolean) => void;
  setIsAdding: (value: boolean) => void;
  setIsOrderInfoCollapsed: (value: boolean) => void;
  setProductList: (value: any[]) => void;
  resetForm: () => void;
}

const initialState: SalesOrderFormState = {
  customer: '',
  customerId: '',
  customerCode: '',
  customerSearch: '',
  so: '',
  soId: '',
  isLoadingDetails: false,
  isSaving: false,
  isAdding: false,
  isOrderInfoCollapsed: false,
  productList: [],
};

export const useSalesOrderForm = () => {
  const [state, setState] = useState<SalesOrderFormState>(initialState);

  const actions: SalesOrderFormActions = {
    setCustomer: useCallback((value: string) => setState(prev => ({ ...prev, customer: value })), []),
    setCustomerId: useCallback((value: string) => setState(prev => ({ ...prev, customerId: value })), []),
    setCustomerCode: useCallback((value: string) => setState(prev => ({ ...prev, customerCode: value })), []),
    setCustomerSearch: useCallback((value: string) => setState(prev => ({ ...prev, customerSearch: value })), []),
    setSo: useCallback((value: string) => setState(prev => ({ ...prev, so: value })), []),
    setSoId: useCallback((value: string) => setState(prev => ({ ...prev, soId: value })), []),
    setIsLoadingDetails: useCallback((value: boolean) => setState(prev => ({ ...prev, isLoadingDetails: value })), []),
    setIsSaving: useCallback((value: boolean) => setState(prev => ({ ...prev, isSaving: value })), []),
    setIsAdding: useCallback((value: boolean) => setState(prev => ({ ...prev, isAdding: value })), []),
    setIsOrderInfoCollapsed: useCallback((value: boolean) => setState(prev => ({ ...prev, isOrderInfoCollapsed: value })), []),
    setProductList: useCallback((value: any[]) => setState(prev => ({ ...prev, productList: value })), []),
    resetForm: useCallback(() => setState(initialState), []),
  };

  return {
    ...state,
    ...actions,
  };
};























