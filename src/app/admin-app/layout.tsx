'use client';

import React, { useEffect } from 'react';
import './admin-app.css'; // Restore critical styles synchronously to avoid FOUC / broken UI
import AdminAuthGuard from './_components/AdminAuthGuard';
import QueryProvider from './_components/QueryProvider';
import { preloadCriticalStyles } from './_utils/lazyStyles';
import { usePathname } from 'next/navigation';
import { Lexend } from 'next/font/google';
import { cn } from '@/lib/utils';

const lexend = Lexend({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-lexend',
});

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
        <div className={cn('admin-app-container', lexend.variable)}>
          {children}
        </div>
      </QueryProvider>
    );
  }

  return (
    <QueryProvider>
      <div className={cn('admin-app-container', lexend.variable)}>
        <AdminAuthGuard>
          {children}
        </AdminAuthGuard>
      </div>
    </QueryProvider>
  );
}

