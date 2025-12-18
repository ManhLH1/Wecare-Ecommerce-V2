'use client';

import { useEffect, useState } from 'react';
import { isTokenValid } from '../_utils/implicitAuthService';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

const AdminAuthGuard = ({ children }: AdminAuthGuardProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Kiểm tra token OAuth có hợp lệ không
        if (!isTokenValid()) {
          // Token không hợp lệ hoặc đã hết hạn, chuyển hướng về trang login
          window.location.href = '/admin-app/login';
          return;
        }

        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/admin-app/login';
      }
    };

    checkAuth();

    // Lắng nghe sự kiện storage để xử lý khi đăng xuất ở tab khác
    const handleStorageChange = (e: StorageEvent) => {
      if (
        (e.key === 'admin_app_dynamics_access_token' && !e.newValue) ||
        (e.key === 'admin_app_dynamics_token_expiry' && !e.newValue)
      ) {
        window.location.href = '/admin-app/login';
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (isLoading) {
    return (
      <div className="admin-app-loading-container">
        <div className="admin-app-loading-spinner"></div>
        <p className="admin-app-loading-text">Đang kiểm tra đăng nhập...</p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default AdminAuthGuard;

