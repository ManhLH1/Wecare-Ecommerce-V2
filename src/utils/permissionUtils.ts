// Permission mapping cho phòng ban 191920005 (Phòng ban phát triển kinh doanh)
export const PERMISSION_MAPPING = {
  // Online Permissions - Sử dụng Item Price By Customer
  ONLINE_PERMISSIONS: [
    283640049, // Trưởng phòng Phát triển Kinh doanh
    283640073, // Trưởng nhóm Kinh doanh Online
    283640051, // Giám sát Kinh doanh Online
    283640056, // Chuyên viên Kinh doanh Online
    283640045, // Nhân viên Kinh doanh Online
    283640072, // Sales Admin Kinh doanh Online
  ],
  
  // Direct Permissions - Sử dụng Sale Order
  DIRECT_PERMISSIONS: [
    283640032, // Trưởng nhóm khu vực Kinh doanh bán lẻ
    283640033, // Giám sát vùng Kinh doanh bán lẻ
    283640034, // Nhân viên Kinh doanh bán lẻ
    283640089, // Quản lý Đội ngũ hiện trường
  ]
};

export const DEPARTMENT_ID = 191920005; // Phòng ban phát triển kinh doanh

export interface PermissionInfo {
  type: 'ONLINE' | 'DIRECT' | 'NONE';
  canViewPrice: boolean;
  canCreateOrder: boolean;
  salesFlow: 'ITEM_PRICE_BY_CUSTOMER' | 'SALE_ORDER' | 'NONE';
}

export const getPermissionByChucVu = (chucVuVi: number): PermissionInfo => {
  if (PERMISSION_MAPPING.ONLINE_PERMISSIONS.includes(chucVuVi)) {
    return {
      type: 'ONLINE',
      canViewPrice: true,
      canCreateOrder: false,
      salesFlow: 'ITEM_PRICE_BY_CUSTOMER'
    };
  }
  
  if (PERMISSION_MAPPING.DIRECT_PERMISSIONS.includes(chucVuVi)) {
    return {
      type: 'DIRECT',
      canViewPrice: true,
      canCreateOrder: true,
      salesFlow: 'SALE_ORDER'
    };
  }
  
  return {
    type: 'NONE',
    canViewPrice: false,
    canCreateOrder: false,
    salesFlow: 'NONE'
  };
};

export const isDepartmentWithSpecialPermission = (departmentId: number): boolean => {
  return departmentId === DEPARTMENT_ID;
}; 