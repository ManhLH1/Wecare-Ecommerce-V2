'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchSaleOrders } from '../_api/adminApi';
import { showToast } from '../../../components/ToastManager';
import { getStoredUser } from '../_utils/implicitAuthService';
import { useRouter } from 'next/navigation';
import type { SaleOrder } from '../_api/adminApi';

interface SaleOrdersTableProps {
  saleOrders: SaleOrder[];
  onAddProduct: (soId: string, so: SaleOrder) => void;
}

const SaleOrdersTable: React.FC<SaleOrdersTableProps> = ({ saleOrders, onAddProduct }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const checkCanAddProduct = (createdOn?: string): boolean => {
    if (!createdOn || createdOn.trim() === '') {
      return true; // Allow if no date provided
    }

    try {
      const createdDate = new Date(createdOn);

      // Check if date is valid
      if (isNaN(createdDate.getTime())) {
        console.warn('Invalid createdOn date:', createdOn);
        return true; // Allow if date is invalid
      }

      const sevenHoursLater = new Date(createdDate);
      sevenHoursLater.setHours(sevenHoursLater.getHours() + 7);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const sevenHoursAfterDateStr = sevenHoursLater.toLocaleDateString('en-CA');
      const yesterdayDateStr = yesterday.toLocaleDateString('en-CA');
      // Debug: helpful when testing in browser console
      // eslint-disable-next-line no-console
      console.log('[SaleOrders] createdOn:', createdOn, 'sevenHoursLater:', sevenHoursLater.toISOString(), 'sevenHoursAfterDate:', sevenHoursAfterDateStr, 'yesterday:', yesterdayDateStr);

      const sevenDateOnly = new Date(sevenHoursLater.getFullYear(), sevenHoursLater.getMonth(), sevenHoursLater.getDate()).getTime();
      const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();

      // If (createdOn + 7h) is on or before yesterday (local date), do NOT allow adding products today
      if (sevenDateOnly <= yesterdayOnly) {
        return false;
      }

      // Otherwise allow
      return true;
    } catch (error) {
      console.error('Error parsing createdOn date:', createdOn, error);
      return true; // Allow on error
    }
  };

  return (
    <div className="admin-app-sale-orders-table">
      <table className="admin-app-table">
        <thead>
          <tr>
            <th className="admin-app-table-header">Mã SO</th>
            <th className="admin-app-table-header">Tên SO</th>
            <th className="admin-app-table-header">VAT</th>
            <th className="admin-app-table-header">Loại đơn hàng</th>
            <th className="admin-app-table-header">Ngày tạo</th>
            <th className="admin-app-table-header">Tổng tiền</th>
            <th className="admin-app-table-header">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {saleOrders.map((so) => {
            const canAddProduct = checkCanAddProduct(so.createdon);
            return (
              <tr key={so.crdfd_sale_orderid} className="admin-app-table-row">
                <td className="admin-app-table-cell">
                  {so.crdfd_so_code || so.crdfd_so_auto || 'N/A'}
                </td>
                <td className="admin-app-table-cell">{so.crdfd_name || 'N/A'}</td>
                <td className="admin-app-table-cell">
                  {so.cr1bb_vattext || `${so.crdfd_vat || 0}%`}
                </td>
                <td className="admin-app-table-cell">
                  {so.crdfd_loai_don_hang === 1 ? 'VAT' : so.crdfd_loai_don_hang === 0 ? 'Không VAT' : 'N/A'}
                </td>
                <td className="admin-app-table-cell">
                  {formatDate(so.createdon)}
                </td>
                <td className="admin-app-table-cell">
                  {so.crdfd_tongtien ? new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND'
                  }).format(so.crdfd_tongtien) : 'N/A'}
                </td>
                <td className="admin-app-table-cell">
                  <button
                    onClick={() => onAddProduct(so.crdfd_sale_orderid, so)}
                    disabled={!canAddProduct}
                    className={`admin-app-btn ${canAddProduct ? 'admin-app-btn-primary' : 'admin-app-btn-disabled'}`}
                    title={!canAddProduct ? 'không bổ sung sản phẩm vào SO cũ' : 'Thêm sản phẩm'}
                  >
                    Thêm SP
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {saleOrders.length === 0 && (
        <div className="admin-app-empty-state">
          <p>Không có đơn hàng nào</p>
        </div>
      )}
    </div>
  );
};

export default function AdminSaleOrdersPage() {
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ name?: string; username?: string; email?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const orders = await fetchSaleOrders();
        setSaleOrders(orders);

        const user = getStoredUser();
        setUserInfo(user);
      } catch (error) {
        console.error('Error loading sale orders:', error);
        showToast.error('Lỗi khi tải danh sách đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddProduct = (soId: string, so: SaleOrder) => {
    // Navigate to the main admin app with the selected SO
    router.push(`/admin-app?soId=${soId}`);
  };

  const handleLogout = () => {
    // Import logout function
    const { logout } = require('../_utils/implicitAuthService');
    logout();
    router.push('/admin-app/login');
  };

  if (loading) {
    return (
      <div className="admin-app-loading-container">
        <div className="admin-app-loading-spinner"></div>
        <p className="admin-app-loading-text">Đang tải danh sách đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="admin-app-sale-orders-page">
      {/* Header */}
      <div className="admin-app-header">
        <div className="admin-app-header-left">
          <div className="admin-app-header-brand">
            <div className="admin-app-title">Danh sách Sale Orders</div>
            <span className="admin-app-badge admin-app-badge-version">V1.0</span>
          </div>
          <div className="admin-app-subtitle">Quản lý đơn hàng bán hàng</div>
        </div>

        <div className="admin-app-header-right">
          <div className="admin-app-form-toggle">
            <button
              onClick={() => router.push('/admin-app')}
              className="admin-app-toggle-btn"
              title="Quay lại trang tạo đơn"
            >
              Tạo đơn
            </button>
          </div>
          {userInfo && (
            <div className="admin-app-user-info">
              <div className="admin-app-user-avatar">
                {(userInfo.name || userInfo.username || userInfo.email || 'U')[0].toUpperCase()}
              </div>
              <div className="admin-app-user-details">
                <div className="admin-app-user-name">{userInfo.name || userInfo.username || 'User'}</div>
                <div className="admin-app-user-email">{userInfo.email || userInfo.username || ''}</div>
              </div>
              <button
                className="admin-app-logout-btn"
                onClick={handleLogout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="admin-app-content">
        <div className="admin-app-section">
          <div className="admin-app-section-header">
            <h3 className="admin-app-section-title">Danh sách đơn hàng</h3>
            <p className="admin-app-section-description">
              Quản lý và thêm sản phẩm vào các đơn hàng. Lưu ý: Chỉ có thể thêm sản phẩm trong vòng 7 giờ kể từ ngày tạo đơn.
            </p>
          </div>
          <div className="admin-app-section-content">
            <SaleOrdersTable saleOrders={saleOrders} onAddProduct={handleAddProduct} />
          </div>
        </div>
      </div>

      {/* Info box explaining the business rule */}
      <div className="admin-app-info-box">
        <div className="admin-app-info-icon">ℹ️</div>
        <div className="admin-app-info-content">
          <strong>Quy tắc kinh doanh:</strong> Chỉ được thêm sản phẩm vào đơn hàng trong vòng 2 ngày kể từ ngày tạo đơn.
          Sau 2 ngày, không thể thêm sản phẩm mới vào đơn hàng nữa.
        </div>
      </div>
    </div>
  );
}
