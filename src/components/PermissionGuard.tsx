import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { getItem } from '@/utils/SecureStorage';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: 'ONLINE' | 'DIRECT' | 'ANY';
  requiredSalesFlow?: 'ITEM_PRICE_BY_CUSTOMER' | 'SALE_ORDER' | 'ANY';
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermission = 'ANY',
  requiredSalesFlow = 'ANY',
  fallback
}) => {
  const { permission, isLoading, hasSpecialPermission } = usePermission();
  const userType = getItem('type');

  // Nếu đang loading, hiển thị loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Nếu không phải sale, cho phép truy cập (fallback về logic cũ)
  if (userType !== 'sale') {
    return <>{children}</>;
  }

  // Nếu không có permission đặc biệt, cho phép truy cập
  if (!hasSpecialPermission()) {
    return <>{children}</>;
  }

  // Kiểm tra permission type
  if (requiredPermission !== 'ANY' && permission?.type !== requiredPermission) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h3 className="font-bold">Không có quyền truy cập</h3>
            <p>Bạn không có quyền truy cập trang này.</p>
          </div>
        </div>
      </div>
    );
  }

  // Kiểm tra sales flow
  if (requiredSalesFlow !== 'ANY' && permission?.salesFlow !== requiredSalesFlow) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h3 className="font-bold">Không có quyền truy cập</h3>
            <p>Bạn không có quyền truy cập chức năng này.</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard; 