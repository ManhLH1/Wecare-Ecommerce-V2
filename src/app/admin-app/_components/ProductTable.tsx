'use client';

import { useMemo } from 'react';

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
}

interface ProductTableProps {
  products: ProductItem[];
  setProducts: (products: ProductItem[]) => void;
  invoiceType?: number | null;
  vatChoice?: number | null;
  customerIndustry?: number | null;
  onDelete?: (product: ProductItem) => void; // Callback khi xóa sản phẩm
}

export default function ProductTable({ 
  products, 
  setProducts,
  invoiceType,
  vatChoice,
  customerIndustry,
  onDelete
}: ProductTableProps) {

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
              return (
                <tr key={product.id}>
                    <td className="admin-app-cell-center">{idx + 1}</td>
                    <td className="admin-app-cell-product-name" title={product.productName}>
                      {product.productName}
                    </td>
                  <td>{product.unit}</td>
                  <td className="admin-app-cell-right">{product.quantity}</td>
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
                    <button
                        className="admin-app-delete-btn-compact"
                      onClick={() => handleDelete(product.id)}
                        title="Xóa"
                    >
                        ×
                    </button>
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

