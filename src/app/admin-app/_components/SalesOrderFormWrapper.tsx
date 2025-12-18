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
    const user = getStoredUser();
    setUserInfo(user);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/admin-app/login');
  };

  return (
    <div className="admin-app-wrapper">
      {/* Header with Toggle, User Info, and Version */}
      <div className="admin-app-header">
        <div className="admin-app-header-left">
          <div className="admin-app-title">Admin App</div>
          <div className="admin-app-subtitle">
            {activeForm === 'SO' ? 'Quản lý đơn hàng bán hàng' : 'Quản lý đơn hàng báo giá'}
          </div>
          <div className="admin-app-version">
            <span className="admin-app-badge admin-app-badge-version">
              V0
            </span>
          </div>
        </div>
        <div className="admin-app-header-right">
          <div className="admin-app-form-toggle">
            <button
              onClick={() => setActiveForm('SO')}
              className={`admin-app-toggle-btn ${activeForm === 'SO' ? 'admin-app-toggle-btn-active' : ''}`}
            >
              SO
            </button>
            <button
              onClick={() => setActiveForm('SOBG')}
              className={`admin-app-toggle-btn ${activeForm === 'SOBG' ? 'admin-app-toggle-btn-active' : ''}`}
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
              >
                🚪
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

