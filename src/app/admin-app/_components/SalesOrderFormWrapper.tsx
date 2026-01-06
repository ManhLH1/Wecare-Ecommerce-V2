'use client';

import { useState, useEffect } from 'react';
import SalesOrderForm from './SalesOrderForm';
import SalesOrderBaoGiaForm from './SalesOrderBaoGiaForm';
import { getStoredUser, logout } from '../_utils/implicitAuthService';
import { useRouter } from 'next/navigation';

type FormType = 'SO' | 'SOBG';

export default function SalesOrderFormWrapper() {
  const [activeForm, setActiveForm] = useState<FormType>('SO');
  const [userInfo, setUserInfo] = useState<{ name?: string; username?: string; email?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return;

    const user = getStoredUser();
    setUserInfo(user);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/admin-app/login');
  };

  return (
    <div
      className={`admin-app-wrapper ${activeForm === 'SO' ? 'admin-app-mode-so' : 'admin-app-mode-sobg'
        }`}
    >
      {/* Header with Toggle, User Info, and Version */}
      <div className="admin-app-header">
        {/* Left Section: Brand & Title */}
        <div className="admin-app-header-left">
          <div className="admin-app-header-brand">
            <div className="admin-app-title">
              {activeForm === 'SO' ? 'Tạo đơn bán chi tiết' : 'Tạo đơn báo giá chi tiết'}
            </div>
            <span className="admin-app-badge admin-app-badge-version">V1.12</span>
          </div>
          <div className="admin-app-subtitle">
            {activeForm === 'SO' ? 'Đơn hàng bán hàng' : 'Đơn hàng báo giá'}
          </div>
        </div>

        {/* Right Section: Toggle & User */}
        <div className="admin-app-header-right">
          <div className="admin-app-form-toggle">
            <button
              onClick={() => setActiveForm('SO')}
              className={`admin-app-toggle-btn ${activeForm === 'SO' ? 'admin-app-toggle-btn-active' : ''}`}
              title="Sales Order"
            >
              SO
            </button>
            <button
              onClick={() => setActiveForm('SOBG')}
              className={`admin-app-toggle-btn ${activeForm === 'SOBG' ? 'admin-app-toggle-btn-active' : ''}`}
              title="Sales Order Báo Giá"
            >
              SOBG
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

      {/* Render Active Form */}
      {activeForm === 'SO' ? <SalesOrderForm hideHeader /> : <SalesOrderBaoGiaForm hideHeader />}
    </div>
  );
}

