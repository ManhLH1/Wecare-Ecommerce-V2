'use client';

import { Suspense } from 'react';
import AdminLoginForm from '../_components/AdminLoginForm';
import ToastManager from '../../../components/ToastManager';

function LoginContent() {
  return <AdminLoginForm />;
}

export default function AdminLoginPage() {
  return (
    <>
      <ToastManager />
      <Suspense fallback={
        <div className="admin-app-loading-container">
          <div className="admin-app-loading-spinner"></div>
          <p className="admin-app-loading-text">Đang tải...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </>
  );
}

