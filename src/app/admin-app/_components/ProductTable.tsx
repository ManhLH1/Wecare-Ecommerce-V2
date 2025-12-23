'use client';

import { useState, useMemo } from 'react';

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

const ITEMS_PER_PAGE = 5;

export default function ProductTable({ 
  products, 
  setProducts,
  invoiceType,
  vatChoice,
  customerIndustry,
  onDelete
}: ProductTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return products.slice(start, start + ITEMS_PER_PAGE);
  }, [products, currentPage]);

  // Reset to page 1 if current page is out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

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
                <td colSpan={showSurchargeColumn ? 10 : 9} className="admin-app-table-empty-compact">
                Chưa có đơn hàng
              </td>
            </tr>
          ) : (
              paginatedProducts.map((product, idx) => {
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx;
              return (
                <tr key={product.id}>
                    <td className="admin-app-cell-product-name" title={product.productName}>
                      {product.productName}
                    </td>
                  <td>{product.unit}</td>
                  <td className="admin-app-cell-right">{product.quantity}</td>
                  <td className="admin-app-cell-right">{product.price.toLocaleString('vi-VN')}</td>
                  {showSurchargeColumn && (
                      <td className="admin-app-cell-right">{product.surcharge.toLocaleString('vi-VN')}</td>
                  )}
                  <td className="admin-app-cell-right">{product.discount.toLocaleString('vi-VN')}</td>
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

      {/* Pagination */}
      {products.length > ITEMS_PER_PAGE && (
        <div className="admin-app-pagination">
          <button
            className="admin-app-pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`admin-app-pagination-btn ${currentPage === page ? 'admin-app-pagination-active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            className="admin-app-pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

