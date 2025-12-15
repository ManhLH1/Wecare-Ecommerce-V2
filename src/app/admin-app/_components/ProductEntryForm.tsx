'use client';

import { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import { useProducts, useUnits, useWarehouses } from '../_hooks/useDropdownData';

interface ProductEntryFormProps {
  product: string;
  setProduct: (value: string) => void;
  unit: string;
  setUnit: (value: string) => void;
  warehouse: string;
  setWarehouse: (value: string) => void;
  customerId?: string;
  quantity: number;
  setQuantity: (value: number) => void;
  price: string;
  setPrice: (value: string) => void;
  subtotal: number;
  setSubtotal: (value: number) => void;
  vatPercent: number;
  setVatPercent: (value: number) => void;
  vatAmount: number;
  setVatAmount: (value: number) => void;
  totalAmount: number;
  setTotalAmount: (value: number) => void;
  stockQuantity: number;
  setStockQuantity: (value: number) => void;
  approvePrice: boolean;
  setApprovePrice: (value: boolean) => void;
  approveSupPrice: boolean;
  setApproveSupPrice: (value: boolean) => void;
  urgentOrder: boolean;
  setUrgentOrder: (value: boolean) => void;
  deliveryDate: string;
  setDeliveryDate: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  onAdd: () => void;
  onSave: () => void;
  onRefresh: () => void;
}

export default function ProductEntryForm({
  product,
  setProduct,
  unit,
  setUnit,
  warehouse,
  setWarehouse,
  customerId,
  quantity,
  setQuantity,
  price,
  setPrice,
  subtotal,
  setSubtotal,
  vatPercent,
  setVatPercent,
  vatAmount,
  setVatAmount,
  totalAmount,
  setTotalAmount,
  stockQuantity,
  setStockQuantity,
  approvePrice,
  setApprovePrice,
  approveSupPrice,
  setApproveSupPrice,
  urgentOrder,
  setUrgentOrder,
  deliveryDate,
  setDeliveryDate,
  note,
  setNote,
  onAdd,
  onSave,
  onRefresh,
}: ProductEntryFormProps) {
  const [productSearch, setProductSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [selectedProductCode, setSelectedProductCode] = useState<string | undefined>();

  // Fetch data for dropdowns
  const { products, loading: productsLoading } = useProducts(productSearch);
  const { units, loading: unitsLoading } = useUnits(selectedProductCode);
  const { warehouses, loading: warehousesLoading } = useWarehouses(customerId);

  // Sync product and unit with parent state
  useEffect(() => {
    if (product && !productId) {
      // If product is set from parent but productId is not, try to find it
      const found = products.find((p) => p.crdfd_name === product);
      if (found) {
        setProductId(found.crdfd_productsid);
      }
    }
  }, [product, productId, products]);

  useEffect(() => {
    if (unit && !unitId) {
      // If unit is set from parent but unitId is not, try to find it
      const found = units.find((u) => u.crdfd_name === unit);
      if (found) {
        setUnitId(found.crdfd_unitsid);
      }
    }
  }, [unit, unitId, units]);

  useEffect(() => {
    if (warehouse && !warehouseId) {
      // If warehouse is set from parent but warehouseId is not, try to find it
      const found = warehouses.find((w) => w.crdfd_name === warehouse);
      if (found) {
        setWarehouseId(found.crdfd_khowecareid);
      }
    }
  }, [warehouse, warehouseId, warehouses]);

  // Calculate subtotal when quantity or price changes
  const handleQuantityChange = (value: number) => {
    setQuantity(value);
    const priceNum = parseFloat(price) || 0;
    const newSubtotal = value * priceNum;
    setSubtotal(newSubtotal);
    const newVat = (newSubtotal * vatPercent) / 100;
    setVatAmount(newVat);
    setTotalAmount(newSubtotal + newVat);
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    const priceNum = parseFloat(value) || 0;
    const newSubtotal = quantity * priceNum;
    setSubtotal(newSubtotal);
    const newVat = (newSubtotal * vatPercent) / 100;
    setVatAmount(newVat);
    setTotalAmount(newSubtotal + newVat);
  };

  const handleVatChange = (value: number) => {
    setVatPercent(value);
    const newVat = (subtotal * value) / 100;
    setVatAmount(newVat);
    setTotalAmount(subtotal + newVat);
  };

  return (
    <div className="admin-app-section">
      <h3 className="admin-app-section-title">Thông tin sản phẩm</h3>
      {/* Product Entry Row */}
      <div className="admin-app-form-row">
        <div className="admin-app-field-group">
          <label className="admin-app-label">Sản phẩm không VAT</label>
          <Dropdown
            options={products.map((p) => ({
              value: p.crdfd_productsid,
              label: p.crdfd_name || p.crdfd_fullname || '',
              ...p,
            }))}
            value={productId}
            onChange={(value, option) => {
              setProductId(value);
              setProduct(option?.label || '');
              // Get product code from selected product
              const selectedProduct = products.find((p) => p.crdfd_productsid === value);
              setSelectedProductCode(selectedProduct?.crdfd_masanpham);
              // Reset unit when product changes
              setUnitId('');
              setUnit('');
            }}
            placeholder="Chọn sản phẩm"
            loading={productsLoading}
            searchable
            onSearch={setProductSearch}
            className="admin-app-input-wide"
          />
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">Vị trí kho</label>
          <Dropdown
            options={warehouses.map((w) => ({
              value: w.crdfd_khowecareid,
              label: w.crdfd_name,
              ...w,
            }))}
            value={warehouseId}
            onChange={(value, option) => {
              setWarehouseId(value);
              setWarehouse(option?.label || '');
            }}
            placeholder="Chọn vị trí kho"
            loading={warehousesLoading}
            disabled={!customerId}
          />
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">Đơn vị</label>
          <Dropdown
            options={units.map((u) => ({
              value: u.crdfd_unitsid,
              label: u.crdfd_name,
              ...u,
            }))}
            value={unitId}
            onChange={(value, option) => {
              setUnitId(value);
              setUnit(option?.label || '');
            }}
            placeholder="Chọn đơn vị"
            loading={unitsLoading}
          />
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">Số lượng</label>
          <div className="admin-app-input-wrapper">
            <input
              type="number"
              className="admin-app-input"
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <span className="admin-app-dropdown-arrow">▼</span>
          </div>
          <div className="admin-app-hint">SL theo kho: {stockQuantity}.</div>
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">Giá</label>
          <div className="admin-app-input-wrapper">
            <input
              type="text"
              className="admin-app-input"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="Giá"
            />
            <span className="admin-app-dropdown-arrow">▼</span>
          </div>
          <div className="admin-app-hint">Giá bình thường</div>
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">Thành tiền</label>
          <input
            type="text"
            className="admin-app-input admin-app-input-readonly"
            value={subtotal.toLocaleString('vi-VN')}
            readOnly
          />
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">VAT (%)</label>
          <div className="admin-app-input-wrapper">
            <input
              type="number"
              className="admin-app-input"
              value={vatPercent}
              onChange={(e) => handleVatChange(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <span className="admin-app-dropdown-arrow">▼</span>
          </div>
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">GTGT</label>
          <input
            type="text"
            className="admin-app-input admin-app-input-readonly"
            value={vatAmount.toLocaleString('vi-VN')}
            readOnly
          />
        </div>

        <div className="admin-app-field-group">
          <label className="admin-app-label">Tổng tiền</label>
          <input
            type="text"
            className="admin-app-input admin-app-input-readonly"
            value={totalAmount.toLocaleString('vi-VN')}
            readOnly
          />
        </div>
      </div>

      {/* Checkboxes and Additional Fields */}
      <div className="admin-app-form-row admin-app-form-row-checkboxes">
        <div className="admin-app-checkbox-group">
          <input
            type="checkbox"
            id="approvePrice"
            checked={approvePrice}
            onChange={(e) => setApprovePrice(e.target.checked)}
            className="admin-app-checkbox"
          />
          <label htmlFor="approvePrice" className="admin-app-checkbox-label">
            Duyệt giá
          </label>
        </div>

        <div className="admin-app-checkbox-group">
          <input
            type="checkbox"
            id="approveSupPrice"
            checked={approveSupPrice}
            onChange={(e) => setApproveSupPrice(e.target.checked)}
            className="admin-app-checkbox"
          />
          <label htmlFor="approveSupPrice" className="admin-app-checkbox-label">
            Duyệt giá SUP
          </label>
        </div>

        <div className="admin-app-checkbox-group">
          <input
            type="checkbox"
            id="urgentOrder"
            checked={urgentOrder}
            onChange={(e) => setUrgentOrder(e.target.checked)}
            className="admin-app-checkbox"
          />
          <label htmlFor="urgentOrder" className="admin-app-checkbox-label">
            Đơn hàng gấp
          </label>
        </div>
      </div>

      {/* Delivery Date and Note */}
      <div className="admin-app-form-row admin-app-form-row-actions">
        <div className="admin-app-field-group">
          <label className="admin-app-label">Ngày giao NM</label>
          <div className="admin-app-input-wrapper">
            <input
              type="text"
              className="admin-app-input"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              placeholder="dd/mm/yyyy"
            />
            <span className="admin-app-calendar-icon">📅</span>
          </div>
        </div>

        <div className="admin-app-field-group admin-app-field-group-note">
          <label className="admin-app-label">Ghi chú</label>
          <input
            type="text"
            className="admin-app-input admin-app-input-wide"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú"
          />
        </div>

        {/* Action Buttons */}
        <div className="admin-app-action-buttons">
          <button
            className="admin-app-action-btn admin-app-action-btn-add"
            onClick={onAdd}
            title="Thêm sản phẩm"
          >
            <span className="admin-app-action-icon">+</span>
          </button>
          <button
            className="admin-app-action-btn admin-app-action-btn-save"
            onClick={onSave}
            title="Lưu"
          >
            <span className="admin-app-action-icon">💾</span>
          </button>
          <button
            className="admin-app-action-btn admin-app-action-btn-refresh"
            onClick={onRefresh}
            title="Làm mới"
          >
            <span className="admin-app-action-icon">↻</span>
          </button>
        </div>
      </div>
    </div>
  );
}

