'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useBatchProductData } from '../_hooks/useBatchProductData';
import { computeDeliveryDate } from '../../../utils/computeDeliveryDate';
import Dropdown from './Dropdown';
import { showToast } from '../../../components/ToastManager';

interface OptimizedProductEntryFormProps {
  customerCode?: string;
  customerId?: string;
  region?: string;
  vatText?: string;
  vatPercent?: number;
  warehouseName?: string;
  onProductSelect?: (productData: any) => void;
}

interface ProductData {
  productCode: string;
  units: Array<{
    id: string;
    name: string;
    conversionRate: number;
  }>;
  prices: any[];
  inventory: any;
  deliveryDate?: string;
}

export default function OptimizedProductEntryForm({
  customerCode,
  customerId,
  region,
  vatText,
  vatPercent,
  warehouseName,
  onProductSelect
}: OptimizedProductEntryFormProps) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const { fetchBatchData } = useBatchProductData();

  // Debounced product search to reduce API calls
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleProductSearch = useCallback((term: string) => {
    setSearchTerm(term);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (term.length >= 2) {
        // Fetch product data immediately when user types
        await loadProductData(term);
      }
    }, 300); // 300ms debounce
  }, []);

  const loadProductData = useCallback(async (productCode: string) => {
    if (!productCode) return;

    // Clear old product data TRƯỚC KHI load mới để đảm bảo luôn refresh
    setProductData(null);
    setLoading(true);
    try {
      const requests = [{
        productCode,
        customerCode,
        customerId,
        region,
        warehouseName,
        isVatOrder: vatText?.toLowerCase().includes('có vat'),
        quantity: 1
      }];

      const results = await fetchBatchData(requests);

      if (results.length > 0) {
        const data = results[0];

        // Calculate delivery date
        const deliveryDate = computeDeliveryDate({
          districtLeadtime: 1, // Default, can be enhanced
          var_input_soluong: quantity,
          var_selected_SP_tonkho: data.inventory?.theoreticalStock || 0,
          warehouseCode: warehouseName?.includes('HCM') ? 'KHOHCM' : 'KHOTINH',
        });

        const fullData: ProductData = {
          ...data,
          deliveryDate: deliveryDate.toISOString().split('T')[0]
        };

        setProductData(fullData);
        onProductSelect?.(fullData);
      }
    } catch (error) {
      console.error('Error loading product data:', error);
    } finally {
      setLoading(false);
    }
  }, [customerCode, customerId, region, warehouseName, vatText, quantity, fetchBatchData, onProductSelect]);

  const handleProductSelect = useCallback((productCode: string) => {
    setSelectedProduct(productCode);
    loadProductData(productCode);
  }, [loadProductData]);

  const handleUnitSelect = useCallback((unitName: string) => {
    setSelectedUnit(unitName);
  }, []);

  const availableUnits = useMemo(() => {
    return productData?.units.map(unit => ({
      value: unit.id,
      label: unit.name
    })) || [];
  }, [productData]);

  const selectedPrice = useMemo(() => {
    if (!productData?.prices.length) return null;
    // Logic to select best price based on customer group, etc.
    return productData.prices[0]; // Simplified
  }, [productData]);

  const inventoryStatus = useMemo(() => {
    if (!productData?.inventory) return 'Không có thông tin';
    const stock = productData.inventory.theoreticalStock || 0;
    return stock > 0 ? `${stock} có sẵn` : 'Hết hàng';
  }, [productData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="optimized-product-entry-form space-y-4">
      {/* Product Search */}
      <div className="form-group">
        <label className="block text-sm font-medium mb-1">Sản phẩm</label>
        <input
          type="text"
          placeholder="Nhập mã hoặc tên sản phẩm..."
          value={searchTerm}
          onChange={(e) => handleProductSearch(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
        {loading && <div className="text-sm text-wecare-blue mt-1">Đang tải...</div>}
      </div>

      {/* Selected Product Info */}
      {productData && (
        <>
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-lg mb-2">{productData.productCode}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Tồn kho:</span> {inventoryStatus}
              </div>
              <div>
                <span className="font-medium">Ngày giao:</span> {productData.deliveryDate}
              </div>
            </div>
          </div>

          {/* Unit Selection */}
          {availableUnits.length > 0 && (
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">Đơn vị</label>
              <Dropdown
                options={availableUnits}
                value={selectedUnit}
                onChange={handleUnitSelect}
                placeholder="Chọn đơn vị"
              />
            </div>
          )}

          {/* Price Info */}
          {selectedPrice && (
            <div className="bg-green-50 p-3 rounded-md">
              <div className="text-sm">
                <span className="font-medium">Giá:</span> {selectedPrice.price?.toLocaleString('vi-VN')} VND
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="form-group">
            <label className="block text-sm font-medium mb-1">Số lượng</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </>
      )}
    </div>
  );
}
