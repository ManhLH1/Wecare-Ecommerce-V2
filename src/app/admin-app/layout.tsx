'use client';

import './admin-app.css';
import AdminAuthGuard from './_components/AdminAuthGuard';
import { usePathname } from 'next/navigation';

export default function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin-app/login';

  // Không wrap login page với AuthGuard
  if (isLoginPage) {
    return (
      <div className="admin-app-container">
        {children}
      </div>
    );
  }

  return (
    <div className="admin-app-container">
      <AdminAuthGuard>
        {children}
      </AdminAuthGuard>
    </div>
  );
}

