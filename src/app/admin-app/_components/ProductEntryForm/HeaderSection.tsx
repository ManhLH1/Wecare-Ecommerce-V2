'use client';

import React, { useState, useEffect } from 'react';
import Dropdown from '../Dropdown';
import { useLazyStyles } from '../../_utils/lazyStyles';

interface HeaderSectionProps {
  // Product selection
  productSearch: string;
  setProductSearch: (value: string) => void;
  selectedProduct: any;
  products: any[];
  productsLoading: boolean;
  productCode: string;
  setProductCode: (value: string) => void;
  setProduct: (product: any) => void;
  onProductGroupCodeChange?: (groupCode: string) => void;

  // Unit selection
  unit: string;
  setUnit: (value: string) => void;
  selectedUnit: any;
  units: any[];
  unitsLoading: boolean;
  unitId: string;
  setUnitId: (value: string) => void;

  // Warehouse selection
  warehouse: string;
  setWarehouse: (value: string) => void;
  selectedWarehouse: any;
  warehouses: any[];
  warehousesLoading: boolean;
  warehouseId: string;
  setWarehouseId: (value: string) => void;

  // Form state
  isFormDisabled: boolean;

  // Callbacks
  onProductSelect: (product: any) => void;
  onUnitSelect: (unit: any) => void;
  onWarehouseSelect: (warehouse: any) => void;
}

export default function HeaderSection({
  productSearch,
  setProductSearch,
  selectedProduct,
  products,
  productsLoading,
  productCode,
  setProductCode,
  setProduct,
  onProductGroupCodeChange,
  unit,
  setUnit,
  selectedUnit,
  units,
  unitsLoading,
  unitId,
  setUnitId,
  warehouse,
  setWarehouse,
  selectedWarehouse,
  warehouses,
  warehousesLoading,
  warehouseId,
  setWarehouseId,
  isFormDisabled,
  onProductSelect,
  onUnitSelect,
  onWarehouseSelect
}: HeaderSectionProps) {
  // Lazy load component-specific styles
  useLazyStyles('ProductEntryForm');

  // Product selection handler
  const handleProductSelect = (value: string, option?: any) => {
    if (!value || !option) {
      setProduct(null);
      setProductCode('');
      setProductSearch('');
      setUnitId('');
      setUnit('');
      onProductSelect(null);
      return;
    }

    const product = option.data;
    setProduct(product);
    setProductCode(product.crdfd_masanpham || '');
    setProductSearch(product.crdfd_name || '');

    // Reset unit when product changes
    setUnitId('');
    setUnit('');

    onProductSelect(product);
    onProductGroupCodeChange?.(product.crdfd_manhomsp);
  };

  // Unit selection handler
  const handleUnitSelect = (value: string, option?: any) => {
    if (!value || !option) {
      setUnitId('');
      setUnit('');
      onUnitSelect(null);
      return;
    }

    const unit = option.data;
    setUnitId(unit.crdfd_unitsid || '');
    setUnit(unit.crdfd_name || '');
    onUnitSelect(unit);
  };

  // Warehouse selection handler
  const handleWarehouseSelect = (value: string, option?: any) => {
    if (!value || !option) {
      setWarehouseId('');
      setWarehouse('');
      onWarehouseSelect(null);
      return;
    }

    const warehouse = option.data;
    setWarehouseId(warehouse.crdfd_khowecareid || '');
    setWarehouse(warehouse.crdfd_name || '');
    onWarehouseSelect(warehouse);
  };

  return (
    <div className="admin-app-form-section">
      <div className="admin-app-form-row">
        {/* Product Search */}
        <div className="admin-app-field admin-app-field-product">
          <label className="admin-app-label">Sản phẩm *</label>
          <Dropdown
            value={productSearch}
            onChange={handleProductSelect}
            options={products.map(p => ({
              value: p.crdfd_masanpham || p.crdfd_productsid,
              label: `${p.crdfd_masanpham || ''} - ${p.crdfd_name || ''}`,
              data: p
            }))}
            placeholder="Tìm kiếm sản phẩm..."
            loading={productsLoading}
            disabled={isFormDisabled}
            searchable
          />
        </div>

        {/* Unit Selection */}
        {selectedProduct && (
          <div className="admin-app-field admin-app-field-unit">
            <label className="admin-app-label">Đơn vị *</label>
            <Dropdown
              value={unit}
              onChange={handleUnitSelect}
              options={units.map(u => ({
                value: u.crdfd_unitsid,
                label: u.crdfd_name,
                data: u
              }))}
              placeholder="Chọn đơn vị..."
              loading={unitsLoading}
              disabled={isFormDisabled || !selectedProduct}
              searchable
            />
          </div>
        )}

        {/* Warehouse Selection */}
        <div className="admin-app-field admin-app-field-warehouse">
          <label className="admin-app-label">Kho *</label>
            <Dropdown
              value={warehouse}
              onChange={handleWarehouseSelect}
              options={warehouses.map(w => ({
                value: w.crdfd_khowecareid,
                label: `${w.crdfd_makho || ''} - ${w.crdfd_name || ''}`,
                data: w
              }))}
              placeholder="Chọn kho..."
              loading={warehousesLoading}
              disabled={isFormDisabled}
              searchable
            />
        </div>
      </div>
    </div>
  );
}
