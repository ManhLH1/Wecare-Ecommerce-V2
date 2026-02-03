'use client';

import React, { useEffect, Suspense, lazy } from 'react';
import './admin-app.css';
import AdminAuthGuard from './_components/AdminAuthGuard';
import QueryProvider from './_components/QueryProvider';
import { preloadCriticalStyles } from './_utils/lazyStyles';
import { usePathname } from 'next/navigation';

// 🚀 LAZY LOAD - Code splitting cho heavy components
const SalesOrderFormWrapper = lazy(
  () => import('./_components/SalesOrderFormWrapper'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="admin-app-spinner admin-app-spinner-medium mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    ),
  }
);

// Loading skeleton for heavy pages
const PageSkeleton = () => (
  <div className="admin-app-container">
    <div className="admin-app-main">
      <div className="admin-app-form-section p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin-app/login' || pathname === '/admin-app/oauth-callback';

  // Preload critical styles on mount
  useEffect(() => {
    if (!isLoginPage) {
      preloadCriticalStyles();
    }
  }, [isLoginPage]);

  // Không wrap login page và oauth-callback với AuthGuard
  if (isLoginPage) {
    return (
      <QueryProvider>
        <div className="admin-app-container">
          {children}
        </div>
      </QueryProvider>
    );
  }

  return (
    <QueryProvider>
      <div className="admin-app-container">
        <AdminAuthGuard>
          {/* 🚀 SUSPENSE - Enable lazy loading */}
          <Suspense fallback={<PageSkeleton />}>
            {children}
          </Suspense>
        </AdminAuthGuard>
      </div>
    </QueryProvider>
  );
}

