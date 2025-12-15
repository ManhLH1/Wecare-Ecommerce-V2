'use client';

interface ProductItem {
  id: string;
  productName: string;
  unit: string;
  quantity: number;
  price: number;
  surcharge: number;
  discount: number;
  discountedPrice: number;
  vat: number;
  totalAmount: number;
  approver: string;
  deliveryDate: string;
}

interface ProductTableProps {
  products: ProductItem[];
  setProducts: (products: ProductItem[]) => void;
}

export default function ProductTable({ products, setProducts }: ProductTableProps) {
  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
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
            <th>Phụ phí...</th>
            <th>Chiết khấu</th>
            <th>Giá đã CK</th>
            <th>VAT</th>
            <th>Tổng tiền</th>
            <th>Người duyệt</th>
            <th>Ngày giao</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={13} className="admin-app-table-empty">
                Chưa có đơn hàng
              </td>
            </tr>
          ) : (
            products.map((product, index) => (
              <tr key={product.id}>
                <td>{index + 1}</td>
                <td>{product.productName}</td>
                <td>{product.unit}</td>
                <td>{product.quantity}</td>
                <td>{product.price.toLocaleString('vi-VN')}</td>
                <td>{product.surcharge.toLocaleString('vi-VN')}</td>
                <td>{product.discount.toLocaleString('vi-VN')}</td>
                <td>{product.discountedPrice.toLocaleString('vi-VN')}</td>
                <td>{product.vat}%</td>
                <td>{product.totalAmount.toLocaleString('vi-VN')}</td>
                <td>{product.approver || '-'}</td>
                <td>{product.deliveryDate}</td>
                <td>
                  <button
                    className="admin-app-delete-btn"
                    onClick={() => handleDelete(product.id)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

