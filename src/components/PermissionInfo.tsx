import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { getItem } from '@/utils/SecureStorage';
import { FaUserTie, FaEye, FaShoppingCart, FaInfoCircle, FaShieldAlt, FaUserCheck, FaUserLock } from 'react-icons/fa';

const getTypeColor = (type: string) => {
  switch (type) {
    case 'ONLINE':
      return 'border-blue-200 bg-blue-50';
    case 'DIRECT':
      return 'border-green-200 bg-green-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
};

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'ONLINE':
      return <span className="ml-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Online</span>;
    case 'DIRECT':
      return <span className="ml-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">Direct</span>;
    default:
      return <span className="ml-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">Không xác định</span>;
  }
};

const PermissionInfo: React.FC = () => {
  const { permission, isLoading, hasSpecialPermission } = usePermission();
  const userType = getItem('type');
  const userName = getItem('userName');
  const chucVuText = getItem('chucVuText');

  if (isLoading || userType !== 'sale' || !hasSpecialPermission()) {
    return null;
  }

  return (
    <div className={`rounded-xl border-2 shadow-sm p-6 mb-6 bg-white ${getTypeColor(permission?.type || '')} relative overflow-hidden`}> 
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FaInfoCircle className="text-blue-600 text-lg" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Thông tin quyền truy cập</h3>
          <p className="text-sm text-gray-500">Chi tiết quyền hạn của bạn</p>
        </div>
        {getTypeBadge(permission?.type || '')}
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaUserTie className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nhân viên</p>
              <p className="font-medium text-gray-800">{userName}</p>
            </div>
          </div>
          
          {chucVuText && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FaUserTie className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Chức vụ</p>
                <p className="font-medium text-gray-800">{chucVuText}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaEye className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Quyền xem giá</p>
              <p className={`font-medium ${permission?.canViewPrice ? 'text-green-700' : 'text-gray-500'}`}>
                {permission?.canViewPrice ? 'Được phép' : 'Không được phép'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FaShoppingCart className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Quyền đặt hàng</p>
              <p className={`font-medium ${permission?.canCreateOrder ? 'text-orange-700' : 'text-gray-500'}`}>
                {permission?.canCreateOrder ? 'Được phép' : 'Không được phép'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sales Flow */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <FaShieldAlt className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Luồng bán hàng</p>
            <p className="font-medium text-gray-800">
              {permission?.salesFlow === 'ITEM_PRICE_BY_CUSTOMER' && 'Xem giá theo khách hàng (Price by Customer)'}
              {permission?.salesFlow === 'SALE_ORDER' && 'Đặt hàng trực tiếp (Sale Order)'}
              {permission?.salesFlow === 'NONE' && 'Không xác định'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionInfo; 