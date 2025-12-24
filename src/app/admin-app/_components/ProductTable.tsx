'use client';

import { useMemo, useState } from 'react';

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
  promotionText?: string;
  invoiceSurcharge?: number;
  createdOn?: string;
  isModified?: boolean; // Flag để đánh dấu dòng đã sửa
  originalQuantity?: number; // Lưu số lượng gốc để so sánh
}

interface ProductTableProps {
  products: ProductItem[];
  setProducts: (products: ProductItem[]) => void;
  invoiceType?: number | null;
  vatChoice?: number | null;
  customerIndustry?: number | null;
  onDelete?: (product: ProductItem) => void; // Callback khi xóa sản phẩm
  onUpdate?: (product: ProductItem) => Promise<void>; // Callback khi update sản phẩm đã lưu
  soId?: string; // SO ID để update
  warehouseName?: string; // Warehouse name
  isVatOrder?: boolean; // Is VAT order
}

export default function ProductTable({ 
  products, 
  setProducts,
  invoiceType,
  vatChoice,
  customerIndustry,
  onDelete,
  onUpdate,
  soId,
  warehouseName,
  isVatOrder
}: ProductTableProps) {
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [editingQuantityValue, setEditingQuantityValue] = useState<string>('');
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    const productToDelete = products.find((p) => p.id === id);
    if (productToDelete) {
      // Gọi callback để parent component xử lý (cộng lại tồn kho)
      if (onDelete) {
        onDelete(productToDelete);
      }
      // Xóa sản phẩm khỏi danh sách
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const handleQuantityChange = (product: ProductItem, newQuantity: number) => {
    if (newQuantity <= 0) {
      return; // Không cho phép số lượng <= 0
    }

    // Tính lại các giá trị
    const newSubtotal = newQuantity * (product.discountedPrice || product.price);
    const newVatAmount = (newSubtotal * product.vat) / 100;
    const newTotalAmount = newSubtotal + newVatAmount;

    // Cập nhật sản phẩm
    const updatedProducts = products.map((p) => {
      if (p.id === product.id) {
        // Chỉ đánh dấu isModified cho SOD đã lưu (isSodCreated = true)
        // So sánh với originalQuantity (nếu có) hoặc quantity hiện tại
        const originalQty = p.originalQuantity !== undefined ? p.originalQuantity : p.quantity;
        const isModified = product.isSodCreated === true && newQuantity !== originalQty;
        
        return {
          ...p,
          quantity: newQuantity,
          subtotal: newSubtotal,
          vatAmount: newVatAmount,
          totalAmount: newTotalAmount,
          isModified: isModified,
          // Chỉ lưu originalQuantity lần đầu (khi chưa có) và chỉ cho SOD đã lưu
          originalQuantity: p.originalQuantity !== undefined 
            ? p.originalQuantity 
            : (product.isSodCreated === true ? p.quantity : undefined),
        };
      }
      return p;
    });

    setProducts(updatedProducts);
  };

  const handleQuantityEditStart = (product: ProductItem) => {
    setEditingQuantityId(product.id);
    setEditingQuantityValue(product.quantity.toString());
  };

  const handleQuantityEditEnd = (product: ProductItem) => {
    const newQuantity = parseFloat(editingQuantityValue) || product.quantity;
    if (newQuantity > 0 && newQuantity !== product.quantity) {
      handleQuantityChange(product, newQuantity);
    }
    setEditingQuantityId(null);
    setEditingQuantityValue('');
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent, product: ProductItem) => {
    if (e.key === 'Enter') {
      handleQuantityEditEnd(product);
    } else if (e.key === 'Escape') {
      setEditingQuantityId(null);
      setEditingQuantityValue('');
    }
  };

  const handleConfirmUpdate = async (product: ProductItem) => {
    if (!onUpdate || !product.isSodCreated) {
      return;
    }

    setUpdatingProductId(product.id);
    try {
      await onUpdate(product);
      // Sau khi update thành công, reset isModified và cập nhật originalQuantity
      const updatedProducts = products.map((p) => {
        if (p.id === product.id) {
          return {
            ...p,
            isModified: false,
            originalQuantity: p.quantity,
          };
        }
        return p;
      });
      setProducts(updatedProducts);
    } catch (error) {
      console.error('Error updating product:', error);
      // Revert lại số lượng về originalQuantity khi update thất bại
      const originalQty = product.originalQuantity ?? product.quantity;
      const revertedProducts = products.map((p) => {
        if (p.id === product.id) {
          // Tính lại các giá trị với số lượng gốc
          const originalSubtotal = originalQty * (p.discountedPrice || p.price);
          const originalVatAmount = (originalSubtotal * p.vat) / 100;
          const originalTotalAmount = originalSubtotal + originalVatAmount;
          
          return {
            ...p,
            quantity: originalQty,
            subtotal: originalSubtotal,
            vatAmount: originalVatAmount,
            totalAmount: originalTotalAmount,
            isModified: false, // Reset isModified vì đã revert
          };
        }
        return p;
      });
      setProducts(revertedProducts);
    } finally {
      setUpdatingProductId(null);
    }
  };

  const showSurchargeColumn = 
    invoiceType !== null && invoiceType !== undefined &&
    vatChoice === 191920001 &&
    customerIndustry === 191920004;

  // Sắp xếp theo thời gian add (createdOn) - mới nhất lên đầu
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      // Nếu không có createdOn, đặt xuống cuối
      if (!a.createdOn && !b.createdOn) return 0;
      if (!a.createdOn) return 1;
      if (!b.createdOn) return -1;
      
      // Sắp xếp theo thời gian (mới nhất lên đầu)
      const dateA = new Date(a.createdOn).getTime();
      const dateB = new Date(b.createdOn).getTime();
      return dateB - dateA; // Descending order
    });
  }, [products]);

  const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === '') return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          return dateStr;
        }
        return dateStr;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (product: ProductItem) => {
    const crmGuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sodCreated = product.isSodCreated
      ?? crmGuidPattern.test(product.id || '')
      ?? (product.id?.toLowerCase().startsWith('crdfd_') ?? false);
    
    return (
      <span className={`admin-app-table-status-badge ${sodCreated ? 'admin-app-status-success' : 'admin-app-status-pending'}`}>
        {sodCreated ? '✓' : '○'}
      </span>
    );
  };

  return (
    <div className="admin-app-table-compact-wrapper">
      <div className="admin-app-table-compact-header">
        <h3 className="admin-app-table-title">Danh sách sản phẩm</h3>
        {products.length > 0 && (
          <span className="admin-app-table-count">{products.length} sản phẩm</span>
        )}
      </div>
      
      <div className="admin-app-table-compact-container">
        <table className="admin-app-table-compact">
        <thead>
          <tr>
              <th style={{ width: '40px' }}>STT</th>
              <th style={{ width: '250px', minWidth: '200px' }}>SP</th>
              <th style={{ width: '80px' }}>ĐV</th>
              <th style={{ width: '70px' }}>SL</th>
              <th style={{ width: '100px' }}>Giá</th>
              {showSurchargeColumn && <th style={{ width: '80px' }}>Phụ phí</th>}
              <th style={{ width: '80px' }}>CK</th>
              <th style={{ width: '100px' }}>VAT</th>
              <th style={{ width: '120px' }}>Tổng</th>
              <th style={{ width: '60px' }}>TT</th>
              <th style={{ width: '60px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
                <td colSpan={showSurchargeColumn ? 11 : 10} className="admin-app-table-empty-compact">
                Chưa có đơn hàng
              </td>
            </tr>
          ) : (
              sortedProducts.map((product, idx) => {
              const isEditing = editingQuantityId === product.id;
              const isModified = product.isModified === true;
              const showConfirmButton = product.isSodCreated && isModified;
              
              return (
                <tr key={product.id} className={isModified ? 'admin-app-row-modified' : ''}>
                    <td className="admin-app-cell-center">{idx + 1}</td>
                    <td className="admin-app-cell-product-name" title={product.productName}>
                      {product.productName}
                      {isModified && (
                        <span className="admin-app-modified-badge" title="Dòng đã sửa">⚠️</span>
                      )}
                    </td>
                  <td>{product.unit}</td>
                  <td className="admin-app-cell-right">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editingQuantityValue}
                        onChange={(e) => setEditingQuantityValue(e.target.value)}
                        onBlur={() => handleQuantityEditEnd(product)}
                        onKeyDown={(e) => handleQuantityKeyDown(e, product)}
                        className="admin-app-quantity-input"
                        autoFocus
                        style={{
                          width: '60px',
                          textAlign: 'right',
                          padding: '2px 4px',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => handleQuantityEditStart(product)}
                        style={{
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          minWidth: '40px',
                        }}
                        title="Click để sửa số lượng"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f9ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {product.quantity}
                      </span>
                    )}
                  </td>
                  <td className="admin-app-cell-right">{product.price.toLocaleString('vi-VN')}</td>
                  {showSurchargeColumn && (
                      <td className="admin-app-cell-right">{product.surcharge.toLocaleString('vi-VN')}</td>
                  )}
                  <td className="admin-app-cell-right">
                    {product.discountPercent !== undefined && product.discountPercent !== null && product.discountPercent > 0
                      ? `${product.discountPercent}%`
                      : product.discountAmount !== undefined && product.discountAmount !== null && product.discountAmount > 0
                      ? product.discountAmount.toLocaleString('vi-VN')
                      : product.discount !== undefined && product.discount !== null && product.discount > 0
                      ? product.discount.toLocaleString('vi-VN')
                      : '-'}
                  </td>
                  <td className="admin-app-cell-right">{product.vat}%</td>
                    <td className="admin-app-cell-right admin-app-cell-total">{product.totalAmount.toLocaleString('vi-VN')}</td>
                    <td className="admin-app-cell-center" title={`Người duyệt: ${product.approver || '-'}\nNgày giao: ${formatDate(product.deliveryDate)}`}>
                      {getStatusBadge(product)}
                  </td>
                    <td className="admin-app-cell-center">
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                      {showConfirmButton && (
                        <button
                          className="admin-app-confirm-btn-compact"
                          onClick={() => handleConfirmUpdate(product)}
                          disabled={updatingProductId === product.id}
                          title="Xác nhận cập nhật"
                          style={{
                            padding: '2px 6px',
                            fontSize: '11px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: updatingProductId === product.id ? 'not-allowed' : 'pointer',
                            opacity: updatingProductId === product.id ? 0.6 : 1,
                          }}
                        >
                          {updatingProductId === product.id ? '...' : '✓'}
                        </button>
                      )}
                      <button
                        className="admin-app-delete-btn-compact"
                        onClick={() => handleDelete(product.id)}
                        title="Xóa"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

