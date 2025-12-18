'use client';

interface ProductItem {
  id: string;
  stt?: number;
  productName: string;
  unit: string;
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
}

interface ProductTableProps {
  products: ProductItem[];
  setProducts: (products: ProductItem[]) => void;
  invoiceType?: number | null; // Loại hóa đơn OptionSet value (cr1bb_loaihoaon)
  vatChoice?: number | null;   // VAT OptionSet value (191920000 = Có VAT, 191920001 = Không VAT)
  customerIndustry?: number | null; // Ngành nghề OptionSet value (191920004 = Shop bán lẻ)
}

export default function ProductTable({ 
  products, 
  setProducts,
  invoiceType,
  vatChoice,
  customerIndustry 
}: ProductTableProps) {
  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  // Tính toán điều kiện ẩn/hiện cột Phụ phí
  // Điều kiện: Loại hóa đơn = "Hộ kinh doanh" AND VAT = "Không VAT" AND Ngành nghề = "Shop"
  // VAT "Không VAT" = 191920001
  // Ngành nghề "Shop" = 191920004 (Shop bán lẻ)
  // Loại hóa đơn "Hộ kinh doanh" - cần xác định OptionSet value (có thể là một giá trị cụ thể)
  // Tạm thời kiểm tra invoiceType có giá trị (không null/undefined)
  const showSurchargeColumn = 
    invoiceType !== null && invoiceType !== undefined && // Có Loại hóa đơn (cần xác định giá trị "Hộ kinh doanh")
    vatChoice === 191920001 && // VAT = Không VAT
    customerIndustry === 191920004; // Ngành nghề = Shop bán lẻ

  const totalColumns = showSurchargeColumn ? 14 : 13;

  // Format date to dd/mm/yyyy
  const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === '') return '-';
    
    try {
      // Try parsing as ISO date (2025-12-17)
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // If not a valid date, check if already in dd/mm/yyyy format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          return dateStr;
        }
        return dateStr; // Return as-is if can't parse
      }
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr; // Return as-is if error
    }
  };

  return (
    <div className="admin-app-section">
      <h3 className="admin-app-section-title">Danh sách sản phẩm</h3>
      <div className="admin-app-table-container">
        <table className="admin-app-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên sản phẩm</th>
            <th>Đơn vị</th>
            <th>Số lượng</th>
            <th>Giá</th>
            {showSurchargeColumn && (
              <th title="Phụ phí">Phụ phí...</th>
            )}
            <th>Chiết khấu</th>
            <th>Giá đã CK</th>
            <th>VAT</th>
            <th>Tổng tiền</th>
            <th>Người duyệt</th>
            <th>Ngày giao</th>
            <th>Trạng thái SOD</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={totalColumns} className="admin-app-table-empty">
                Chưa có đơn hàng
              </td>
            </tr>
          ) : (
            products.map((product, index) => {
              // Prefer explicit flag; fallback to CRM Guid or prefixed id detection
              const crmGuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              const sodCreated = product.isSodCreated
                ?? crmGuidPattern.test(product.id || '')
                ?? (product.id?.toLowerCase().startsWith('crdfd_') ?? false);
              const statusStyle = {
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '12px',
                backgroundColor: sodCreated ? '#dcfce7' : '#fff7ed',
                color: sodCreated ? '#166534' : '#9a3412',
                fontSize: '12px',
                fontWeight: 600,
                border: sodCreated ? '1px solid #bbf7d0' : '1px solid #fed7aa',
              };

              return (
                <tr key={product.id}>
                  <td>{index + 1}</td>
                  <td>{product.productName}</td>
                  <td>{product.unit}</td>
                  <td className="admin-app-cell-right">{product.quantity}</td>
                  <td className="admin-app-cell-right">{product.price.toLocaleString('vi-VN')}</td>
                  {showSurchargeColumn && (
                    <td title="Phụ phí" className="admin-app-cell-right">{product.surcharge.toLocaleString('vi-VN')}</td>
                  )}
                  <td className="admin-app-cell-right">{product.discount.toLocaleString('vi-VN')}</td>
                  <td className="admin-app-cell-right">{product.discountedPrice.toLocaleString('vi-VN')}</td>
                  <td className="admin-app-cell-right">{product.vat}%</td>
                  <td className="admin-app-cell-right">{product.totalAmount.toLocaleString('vi-VN')}</td>
                  <td>{product.approver || '-'}</td>
                  <td>{formatDate(product.deliveryDate)}</td>
                  <td>
                    <span style={statusStyle}>
                      {sodCreated ? 'Đã tạo SOD' : 'Chưa tạo'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="admin-app-delete-btn"
                      onClick={() => handleDelete(product.id)}
                    >
                      Xóa
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

