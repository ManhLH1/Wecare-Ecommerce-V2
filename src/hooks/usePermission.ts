import { useState, useEffect } from 'react';
import { getItem } from '@/utils/SecureStorage';
import { PermissionInfo, getPermissionByChucVu, isDepartmentWithSpecialPermission } from '@/utils/permissionUtils';

export const usePermission = () => {
  const [permission, setPermission] = useState<PermissionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = () => {
      try {
        const type = getItem('type');
        const departmentId = getItem('departmentId');
        const chucVuVi = getItem('chucVuVi');

        // Nếu không phải sale hoặc không có departmentId, không có permission đặc biệt
        if (type !== 'sale' || !departmentId) {
          setPermission(null);
          setIsLoading(false);
          return;
        }

        // Kiểm tra xem có phải phòng ban đặc biệt không
        if (isDepartmentWithSpecialPermission(parseInt(departmentId))) {
          const permissionInfo = getPermissionByChucVu(parseInt(chucVuVi));
          setPermission(permissionInfo);
        } else {
          setPermission(null);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setPermission(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, []);

  const canViewPrice = () => {
    return permission?.canViewPrice || false;
  };

  const canCreateOrder = () => {
    return permission?.canCreateOrder || false;
  };

  const getSalesFlow = () => {
    return permission?.salesFlow || 'NONE';
  };

  const isOnlinePermission = () => {
    return permission?.type === 'ONLINE';
  };

  const isDirectPermission = () => {
    return permission?.type === 'DIRECT';
  };

  const hasSpecialPermission = () => {
    return permission !== null;
  };

  return {
    permission,
    isLoading,
    canViewPrice,
    canCreateOrder,
    getSalesFlow,
    isOnlinePermission,
    isDirectPermission,
    hasSpecialPermission,
  };
}; 