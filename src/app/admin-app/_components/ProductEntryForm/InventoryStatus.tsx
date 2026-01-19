'use client';

import React from 'react';

interface InventoryStatusProps {
  // Inventory data
  inventoryTheoretical: number;
  inventoryReserved: number;
  inventoryAvailable: number;
  inventoryLoading: boolean;
  inventoryLoaded: boolean;

  // Accounting stock
  accountingStock: number | null;
  accountingStockLoading: boolean;

  // Stock quantity input
  stockQuantity: number;
  setStockQuantity: (value: number) => void;

  // Form state
  isFormDisabled: boolean;
  hasSelectedProduct: boolean;

  // Callbacks
  onInventoryReserved?: () => void;
  disableInventoryReserve?: boolean;
}

export default function InventoryStatus({
  inventoryTheoretical,
  inventoryReserved,
  inventoryAvailable,
  inventoryLoading,
  inventoryLoaded,
  accountingStock,
  accountingStockLoading,
  stockQuantity,
  setStockQuantity,
  isFormDisabled,
  hasSelectedProduct,
  onInventoryReserved,
  disableInventoryReserve = false
}: InventoryStatusProps) {
  const getInventoryStatusColor = () => {
    if (!inventoryLoaded || inventoryLoading) return '';
    if (inventoryTheoretical <= 0) return 'admin-app-inventory-out';
    if (inventoryTheoretical < 10) return 'admin-app-inventory-low';
    return 'admin-app-inventory-good';
  };

  const getInventoryStatusText = () => {
    if (!inventoryLoaded || inventoryLoading) return 'Đang tải...';
    if (inventoryTheoretical <= 0) return 'Hết hàng';
    if (inventoryTheoretical < 10) return 'Sắp hết';
    return 'Còn hàng';
  };

  return (
    <div className="admin-app-form-section">
      <div className="admin-app-form-row">
        {/* Inventory Status */}
        <div className="admin-app-field admin-app-field-inventory">
          <label className="admin-app-label">Tồn kho lý thuyết</label>
          <div className="admin-app-inventory-display">
            <span className={`admin-app-inventory-value ${getInventoryStatusColor()}`}>
              {inventoryLoading ? '...' : inventoryTheoretical?.toLocaleString('vi-VN') || '0'}
            </span>
            <span className="admin-app-inventory-status">
              {getInventoryStatusText()}
            </span>
          </div>
        </div>

        {/* Reserved Quantity (for VAT orders) */}
        {inventoryReserved !== undefined && (
          <div className="admin-app-field admin-app-field-reserved">
            <label className="admin-app-label">Đang giữ đơn</label>
            <span className="admin-app-inventory-value">
              {inventoryLoading ? '...' : inventoryReserved?.toLocaleString('vi-VN') || '0'}
            </span>
          </div>
        )}

        {/* Available to Sell (for VAT orders) */}
        {inventoryAvailable !== undefined && (
          <div className="admin-app-field admin-app-field-available">
            <label className="admin-app-label">Có thể bán</label>
            <span className="admin-app-inventory-value admin-app-inventory-available">
              {inventoryLoading ? '...' : inventoryAvailable?.toLocaleString('vi-VN') || '0'}
            </span>
          </div>
        )}

        {/* Accounting Stock */}
        <div className="admin-app-field admin-app-field-accounting">
          <label className="admin-app-label">Tồn kho kế toán</label>
          <span className="admin-app-inventory-value">
            {accountingStockLoading ? '...' : accountingStock?.toLocaleString('vi-VN') || '0'}
          </span>
        </div>

        {/* Manual Stock Quantity Input */}
        {hasSelectedProduct && (
          <div className="admin-app-field admin-app-field-stock-input">
            <label className="admin-app-label">SL tồn thực tế</label>
            <div className="admin-app-input-wrapper">
              <input
                type="number"
                className="admin-app-input admin-app-input-compact admin-app-input-small"
                value={stockQuantity || ''}
                onChange={(e) => setStockQuantity(Number(e.target.value) || 0)}
                placeholder="0"
                disabled={isFormDisabled}
                min="0"
              />
              {onInventoryReserved && !disableInventoryReserve && (
                <button
                  type="button"
                  className="admin-app-btn admin-app-btn-small admin-app-btn-secondary admin-app-btn-reserve"
                  onClick={onInventoryReserved}
                  disabled={isFormDisabled || inventoryLoading}
                  title="Giữ hàng trong kho"
                >
                  Giữ
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
