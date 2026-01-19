'use client';

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { showToast } from '../../../components/ToastManager';

interface ProductItem {
  id: string;
  stt?: number;
  productCode?: string;
  productId?: string;
  productName: string;
  productGroupCode?: string;
  productCategoryLevel4?: string;
  unit: string;
  unitId?: string;
  quantity: number;
  price: number;
  surcharge: number;
  discount: number;
  discountedPrice: number;
  vat: number;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  approver: string;
  deliveryDate: string;
  isSodCreated?: boolean;
  warehouse?: string;
  note?: string;
  urgentOrder?: boolean;
  approvePrice?: boolean;
  approveSupPrice?: boolean;
  approveSupPriceId?: string;
  discountPercent?: number;
  discountAmount?: number;
  discount2?: number;
  discount2Enabled?: boolean;
  promotionText?: string;
  invoiceSurcharge?: number;
  createdOn?: string;
  isModified?: boolean;
  originalQuantity?: number;
}

interface VirtualizedProductTableProps {
  products: ProductItem[];
  setProducts: (products: ProductItem[]) => void;
  invoiceType?: number | null;
  vatChoice?: number | null;
  customerIndustry?: number | null;
  showSurchargeColumn?: boolean;
  showPromotionColumn?: boolean;
  onDeleteProduct?: (productId: string) => void;
  onEditProduct?: (product: ProductItem) => void;
  onSaveProduct?: (productId: string) => void;
  height?: number; // Height of the virtualized container
  itemHeight?: number; // Height of each row
}

// Table row component for virtual scrolling
const ProductTableRow: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    products: ProductItem[];
    sortedProducts: ProductItem[];
    showSurchargeColumn: boolean;
    showPromotionColumn: boolean;
    editingQuantityId: string | null;
    editingQuantityValue: string;
    setEditingQuantityId: (id: string | null) => void;
    setEditingQuantityValue: (value: string) => void;
    handleQuantityEdit: (product: ProductItem) => void;
    handleQuantitySave: (product: ProductItem) => void;
    handleQuantityCancel: () => void;
    handleDeleteProduct: (productId: string) => void;
    onEditProduct?: (product: ProductItem) => void;
    onSaveProduct?: (productId: string) => void;
  };
}> = ({ index, style, data }) => {
  const {
    sortedProducts,
    showSurchargeColumn,
    showPromotionColumn,
    editingQuantityId,
    editingQuantityValue,
    setEditingQuantityId,
    setEditingQuantityValue,
    handleQuantityEdit,
    handleQuantitySave,
    handleQuantityCancel,
    handleDeleteProduct,
    onEditProduct,
    onSaveProduct,
  } = data;

  const product = sortedProducts[index];
  const isEditing = editingQuantityId === product.id;
  const isModified = product.isModified === true;
  const showConfirmButton = product.isSodCreated && isModified;

  return (
    <div style={style} className={`admin-app-virtual-row ${isModified ? 'admin-app-row-modified' : ''}`}>
      <div className="admin-app-virtual-row-content">
        <div className="admin-app-cell-center" style={{ width: '40px' }}>{index + 1}</div>

        <div className="admin-app-cell-product-name" style={{ width: '250px', minWidth: '200px' }} title={product.productName}>
          {product.productName}
          {isModified && (
            <span className="admin-app-modified-badge" title="Dòng đã sửa">⚠️</span>
          )}
        </div>

        <div style={{ width: '80px' }}>{product.unit}</div>

        <div className="admin-app-cell-right" style={{ width: '70px' }}>
          {isEditing ? (
            <input
              type="text"
              inputMode="decimal"
              value={editingQuantityValue}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                  setEditingQuantityValue(inputValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuantitySave(product);
                } else if (e.key === 'Escape') {
                  handleQuantityCancel();
                }
              }}
              onBlur={() => handleQuantitySave(product)}
              className="admin-app-input admin-app-input-compact admin-app-input-inline"
              autoFocus
              style={{ width: '100%', textAlign: 'right' }}
            />
          ) : (
            <span
              onClick={() => handleQuantityEdit(product)}
              className="admin-app-cell-clickable"
              title="Click để sửa số lượng"
            >
              {product.quantity?.toLocaleString('vi-VN') || '0'}
            </span>
          )}
        </div>

        <div className="admin-app-cell-right" style={{ width: '100px' }}>
          {product.price?.toLocaleString('vi-VN') || '0'}
        </div>

        {showSurchargeColumn && (
          <div className="admin-app-cell-right" style={{ width: '80px' }}>
            {product.surcharge?.toLocaleString('vi-VN') || '0'}
          </div>
        )}

        <div className="admin-app-cell-right" style={{ width: '80px' }}>
          {product.discount?.toLocaleString('vi-VN') || '0'}
        </div>

        <div className="admin-app-cell-right" style={{ width: '100px' }}>
          {product.vat?.toLocaleString('vi-VN') || '0'}
        </div>

        <div className="admin-app-cell-right admin-app-cell-total" style={{ width: '120px' }}>
          {product.totalAmount?.toLocaleString('vi-VN') || '0'}
        </div>

        <div className="admin-app-cell-center" style={{ width: '60px' }}>
          {product.isSodCreated ? (
            <span className="admin-app-status-saved" title="Đã lưu">✓</span>
          ) : (
            <span className="admin-app-status-pending" title="Chưa lưu">○</span>
          )}
        </div>

        <div className="admin-app-cell-center" style={{ width: '60px' }}>
          <div className="admin-app-action-buttons">
            {onEditProduct && (
              <button
                type="button"
                className="admin-app-btn admin-app-btn-icon admin-app-btn-small"
                onClick={() => onEditProduct(product)}
                title="Sửa sản phẩm"
              >
                ✏️
              </button>
            )}

            {showConfirmButton && onSaveProduct && (
              <button
                type="button"
                className="admin-app-btn admin-app-btn-icon admin-app-btn-small admin-app-btn-confirm"
                onClick={() => onSaveProduct(product.id)}
                title="Lưu thay đổi"
              >
                💾
              </button>
            )}

            <button
              type="button"
              className="admin-app-btn admin-app-btn-icon admin-app-btn-small admin-app-btn-danger"
              onClick={() => handleDeleteProduct(product.id)}
              title="Xóa sản phẩm"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function VirtualizedProductTable({
  products,
  setProducts,
  invoiceType,
  vatChoice,
  customerIndustry,
  showSurchargeColumn = false,
  showPromotionColumn = false,
  onDeleteProduct,
  onEditProduct,
  onSaveProduct,
  height = 400,
  itemHeight = 50,
}: VirtualizedProductTableProps) {
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [editingQuantityValue, setEditingQuantityValue] = useState('');

  // Sort products by creation date (newest first)
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aDate = a.createdOn ? new Date(a.createdOn).getTime() : 0;
      const bDate = b.createdOn ? new Date(b.createdOn).getTime() : 0;
      return bDate - aDate;
    });
  }, [products]);

  const handleQuantityEdit = useCallback((product: ProductItem) => {
    setEditingQuantityId(product.id);
    setEditingQuantityValue(product.quantity?.toString() || '0');
  }, []);

  const handleQuantitySave = useCallback((product: ProductItem) => {
    const newQuantity = parseFloat(editingQuantityValue) || 0;

    if (newQuantity <= 0) {
      showToast.warning('Số lượng phải lớn hơn 0');
      return;
    }

    setProducts(products.map(p =>
      p.id === product.id
        ? {
            ...p,
            quantity: newQuantity,
            isModified: true,
            originalQuantity: p.originalQuantity || p.quantity
          }
        : p
    ));

    setEditingQuantityId(null);
    setEditingQuantityValue('');
  }, [editingQuantityValue, products, setProducts]);

  const handleQuantityCancel = useCallback(() => {
    setEditingQuantityId(null);
    setEditingQuantityValue('');
  }, []);

  const handleDeleteProduct = useCallback((productId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      const updatedProducts = products.filter(p => p.id !== productId);
      setProducts(updatedProducts);
      onDeleteProduct?.(productId);
    }
  }, [products, setProducts, onDeleteProduct]);

  // Prepare data for virtual list
  const listData = useMemo(() => ({
    products,
    sortedProducts,
    showSurchargeColumn,
    showPromotionColumn,
    editingQuantityId,
    editingQuantityValue,
    setEditingQuantityId,
    setEditingQuantityValue,
    handleQuantityEdit,
    handleQuantitySave,
    handleQuantityCancel,
    handleDeleteProduct,
    onEditProduct,
    onSaveProduct,
  }), [
    products,
    sortedProducts,
    showSurchargeColumn,
    showPromotionColumn,
    editingQuantityId,
    editingQuantityValue,
    handleQuantityEdit,
    handleQuantitySave,
    handleQuantityCancel,
    handleDeleteProduct,
    onEditProduct,
    onSaveProduct,
  ]);

  if (products.length === 0) {
    return (
      <div className="admin-app-table-compact-container">
        <div className="admin-app-table-empty-compact">
          Chưa có đơn hàng
        </div>
      </div>
    );
  }

  return (
    <div className="admin-app-table-compact-container">
      {/* Fixed Header */}
      <div className="admin-app-virtual-header">
        <div className="admin-app-virtual-header-content">
          <div style={{ width: '40px' }}>STT</div>
          <div style={{ width: '250px', minWidth: '200px' }}>SP</div>
          <div style={{ width: '80px' }}>ĐV</div>
          <div style={{ width: '70px' }}>SL</div>
          <div style={{ width: '100px' }}>Giá</div>
          {showSurchargeColumn && <div style={{ width: '80px' }}>Phụ phí</div>}
          <div style={{ width: '80px' }}>CK</div>
          <div style={{ width: '100px' }}>VAT</div>
          <div style={{ width: '120px' }}>Tổng</div>
          <div style={{ width: '60px' }}>TT</div>
          <div style={{ width: '60px' }}>Action</div>
        </div>
      </div>

      {/* Virtualized Body */}
      <List
        height={height}
        itemCount={sortedProducts.length}
        itemSize={itemHeight}
        itemData={listData}
        className="admin-app-virtual-list"
      >
        {ProductTableRow}
      </List>

      {/* Summary Footer */}
      <div className="admin-app-table-summary">
        <div className="admin-app-summary-row">
          <span className="admin-app-summary-label">Tổng cộng:</span>
          <span className="admin-app-summary-value">
            {products.length} sản phẩm
          </span>
        </div>
      </div>
    </div>
  );
}
