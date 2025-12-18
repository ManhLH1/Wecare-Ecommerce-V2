'use client';

import { useEffect } from 'react';
import { handleOAuthCallback } from '../_utils/implicitAuthService';

export default function OAuthCallbackPage() {
  useEffect(() => {
    handleOAuthCallback();
  }, []);

  return (
    <div className="admin-app-loading-container">
      <div className="admin-app-loading-spinner"></div>
      <p className="admin-app-loading-text">Đang xử lý đăng nhập...</p>
    </div>
  );
}

