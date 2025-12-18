'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginWithPopup, loginWithDefaultAccount, isTokenValid, getStoredUser } from '../_utils/implicitAuthService';
import { showToast } from '../../../components/ToastManager';

export default function AdminLoginForm() {
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDefaultLoading, setIsDefaultLoading] = useState(false);
  const searchParams = useSearchParams();

  // Check if already logged in and handle URL error params
  useEffect(() => {
    try {
      // Kiểm tra error từ URL (OAuth callback error)
      const error = searchParams?.get('error');
      if (error) {
        setLoginError(decodeURIComponent(error));
      }

      // Kiểm tra nếu đã đăng nhập thì chuyển hướng về trang chính
      if (isTokenValid()) {
        window.location.href = '/admin-app';
        return;
      }
    } catch {}
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset messages và bắt đầu loading
    setLoginError('');
    setIsLoading(true);

    try {
      const result = await loginWithPopup();
      
      // Login thành công
      const user = result.user;
      showToast.success(`Đăng nhập thành công! Xin chào ${user.name || user.username}`);
      
      // Redirect về trang admin app
      window.location.href = '/admin-app';
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setLoginError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleDefaultLogin = async () => {
    // Reset messages và bắt đầu loading
    setLoginError('');
    setIsDefaultLoading(true);

    try {
      const result = await loginWithDefaultAccount();
      
      // Login thành công
      const user = result.user;
      showToast.success(`Đăng nhập thành công với account mặc định! Xin chào ${user.name || user.username}`);
      
      // Redirect về trang admin app
      window.location.href = '/admin-app';
    } catch (error: any) {
      console.error('Default login error:', error);
      const errorMessage = error.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setLoginError(errorMessage);
      setIsDefaultLoading(false);
    }
  };

  return (
    <div className="admin-app-login-container">
      <div className="admin-app-login-card">
        <div className="admin-app-login-header">
          <h1 className="admin-app-login-title">Admin Sale App</h1>
          <p className="admin-app-login-subtitle">Đăng nhập với Microsoft Account</p>
        </div>

        <form onSubmit={handleLogin} className="admin-app-login-form">
          <div className="admin-app-form-group">
            <p className="admin-app-login-description">
              Sử dụng tài khoản Microsoft của bạn để đăng nhập vào hệ thống Admin Sale App.
              Hệ thống sẽ mở cửa sổ đăng nhập Microsoft để xác thực.
            </p>
          </div>

          {loginError && (
            <div className="admin-app-error-message">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="admin-app-login-button"
            disabled={isLoading || isDefaultLoading}
          >
            {isLoading ? (
              <>
                <span className="admin-app-spinner"></span>
                Đang đăng nhập...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                  <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
                  <rect x="13" y="0" width="10" height="10" fill="#7FBA00"/>
                  <rect x="0" y="13" width="10" height="10" fill="#00A4EF"/>
                  <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
                </svg>
                Đăng nhập với Microsoft
              </>
            )}
          </button>

          <div className="admin-app-login-divider">
            <span className="admin-app-divider-line"></span>
            <span className="admin-app-divider-text">hoặc</span>
            <span className="admin-app-divider-line"></span>
          </div>

          <button
            type="button"
            onClick={handleDefaultLogin}
            className="admin-app-default-login-button"
            disabled={isLoading || isDefaultLoading}
          >
            {isDefaultLoading ? (
              <>
                <span className="admin-app-spinner"></span>
                Đang đăng nhập...
              </>
            ) : (
              <>
                🔑 Đăng nhập với account mặc định (admin1218/admin1218)
              </>
            )}
          </button>

          <div className="admin-app-login-note">
            <p className="admin-app-note-text">
              <strong>Lưu ý:</strong> Vui lòng cho phép popup trong trình duyệt để có thể đăng nhập với Microsoft.
              <br />
              <strong>Development:</strong> Sử dụng nút đăng nhập mặc định để test nhanh.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

