'use client';

import React, { useState, useEffect, useCallback } from 'react';
import OptimizedProductEntryForm from './OptimizedProductEntryForm';
import { useBatchProductData } from '../_hooks/useBatchProductData';
import { smartPreloader } from '../_utils/smartPreloader';
import { showToast } from '../../../components/ToastManager';

interface OptimizedSalesOrderFormProps {
  customerCode?: string;
  customerId?: string;
  region?: string;
  onOrderComplete?: (orderData: any) => void;
}

export default function OptimizedSalesOrderForm({
  customerCode,
  customerId,
  region,
  onOrderComplete
}: OptimizedSalesOrderFormProps) {
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { fetchBatchData, loading: batchLoading } = useBatchProductData();

  // Initialize smart preloading
  useEffect(() => {
    if (customerCode) {
      smartPreloader.preloadTopProducts({
        customerCode,
        region,
        preloadTopProducts: 8, // Preload more for sales orders
      });

      // Track customer usage for better preloading
      localStorage.setItem('last_customer_code', customerCode);
      localStorage.setItem('last_region', region || '');
    }
  }, [customerCode, region]);

  const handleProductSelect = useCallback((productData: any) => {
    // Track product usage for smart preloading
    smartPreloader.trackProductUsage(productData.productCode);

    // Add to order items
    setOrderItems(prev => {
      const existing = prev.find(item => item.productCode === productData.productCode);
      if (existing) {
        // Update existing item
        return prev.map(item =>
          item.productCode === productData.productCode
            ? { ...item, ...productData, quantity: (item.quantity || 1) + 1 }
            : item
        );
      } else {
        // Add new item
        return [...prev, { ...productData, quantity: 1 }];
      }
    });
  }, []);

  const handleQuantityChange = useCallback((productCode: string, quantity: number) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.productCode === productCode
          ? { ...item, quantity }
          : item
      )
    );
  }, []);

  const handleRemoveItem = useCallback((productCode: string) => {
    setOrderItems(prev => prev.filter(item => item.productCode !== productCode));
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    if (orderItems.length === 0) {
      showToast.warning('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare order data for submission
      const orderData = {
        customerCode,
        customerId,
        region,
        items: orderItems,
        totalAmount: orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        createdAt: new Date().toISOString(),
      };

      // Here you would normally call your save API
      // await saveSaleOrderDetails(orderData);

      onOrderComplete?.(orderData);
      showToast.success('Đơn hàng đã được tạo thành công!');

      // Clear order items after successful submission
      setOrderItems([]);

    } catch (error) {
      console.error('Error submitting order:', error);
      showToast.error('Lỗi khi tạo đơn hàng');
    } finally {
      setIsSubmitting(false);
    }
  }, [orderItems, customerCode, customerId, region, onOrderComplete]);

  const totalAmount = orderItems.reduce((sum, item) => sum + ((item.selectedPrice?.price || 0) * (item.quantity || 1)), 0);

  return (
    <div className="optimized-sales-order-form max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Tạo Đơn Hàng Bán</h2>
        <div className="text-sm text-gray-600">
          Khách hàng: {customerCode} | Khu vực: {region}
        </div>
      </div>

      {/* Product Entry Form */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Thêm Sản Phẩm</h3>
        <OptimizedProductEntryForm
          customerCode={customerCode}
          customerId={customerId}
          region={region}
          warehouseName="KHOHCM" // Default warehouse
          vatText="Không VAT"
          onProductSelect={handleProductSelect}
        />
      </div>

      {/* Order Items */}
      {orderItems.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Chi Tiết Đơn Hàng</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Sản phẩm</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Đơn vị</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Số lượng</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Giá</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Thành tiền</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Ngày giao</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orderItems.map((item) => (
                  <tr key={item.productCode}>
                    <td className="px-4 py-2 text-sm">{item.productCode}</td>
                    <td className="px-4 py-2 text-sm">{item.selectedUnit || 'Chưa chọn'}</td>
                    <td className="px-4 py-2 text-sm">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) => handleQuantityChange(item.productCode, Number(e.target.value))}
                        className="w-16 px-2 py-1 border rounded text-center"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {(item.selectedPrice?.price || 0).toLocaleString('vi-VN')} VND
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      {((item.selectedPrice?.price || 0) * (item.quantity || 1)).toLocaleString('vi-VN')} VND
                    </td>
                    <td className="px-4 py-2 text-sm">{item.deliveryDate}</td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => handleRemoveItem(item.productCode)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order Summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold">
                Tổng tiền: {totalAmount.toLocaleString('vi-VN')} VND
              </div>
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || batchLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Tạo Đơn Hàng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance Stats (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 rounded-lg text-xs">
          <h4 className="font-medium mb-2">Performance Stats</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>Preload Stats: {JSON.stringify(smartPreloader.getStats())}</div>
            <div>Batch Loading: {batchLoading ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
