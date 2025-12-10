import { ToastOptions } from 'react-toastify';

// Toast type definitions
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Custom toast options extending react-toastify options
export interface CustomToastOptions extends ToastOptions {
  // Custom duration in milliseconds
  duration?: number;
  // Custom position
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  // Custom theme
  theme?: 'light' | 'dark' | 'colored';
  // Custom icon
  customIcon?: React.ReactNode;
  // Custom action button
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast message interface
export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  options?: CustomToastOptions;
  timestamp: number;
}

// Toast context type
export interface ToastContextType {
  success: (message: string, options?: CustomToastOptions) => string | number;
  error: (message: string, options?: CustomToastOptions) => string | number;
  warning: (message: string, options?: CustomToastOptions) => string | number;
  info: (message: string, options?: CustomToastOptions) => string | number;
  custom: (message: string, options?: CustomToastOptions) => string | number;
  dismiss: () => void;
  dismissToast: (toastId: string | number) => void;
  promise: <T>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string;
      error: string;
    },
    options?: CustomToastOptions
  ) => Promise<T>;
}

// Common toast messages
export const TOAST_MESSAGES = {
  SUCCESS: {
    ADD_TO_CART: 'Thêm vào giỏ hàng thành công',
    REMOVE_FROM_CART: 'Đã xóa sản phẩm khỏi giỏ hàng',
    UPDATE_CART: 'Cập nhật giỏ hàng thành công',
    ORDER_SUCCESS: 'Đặt hàng thành công',
    LOGIN_SUCCESS: 'Đăng nhập thành công',
    LOGOUT_SUCCESS: 'Đăng xuất thành công',
    SAVE_SUCCESS: 'Lưu thành công',
    UPDATE_SUCCESS: 'Cập nhật thành công',
    DELETE_SUCCESS: 'Xóa thành công',
  },
  ERROR: {
    ADD_TO_CART: 'Không thể thêm sản phẩm vào giỏ hàng',
    REMOVE_FROM_CART: 'Không thể xóa sản phẩm khỏi giỏ hàng',
    UPDATE_CART: 'Không thể cập nhật giỏ hàng',
    ORDER_FAILED: 'Đặt hàng thất bại',
    LOGIN_FAILED: 'Đăng nhập thất bại',
    NETWORK_ERROR: 'Lỗi kết nối mạng',
    SERVER_ERROR: 'Lỗi máy chủ',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
    PERMISSION_DENIED: 'Không có quyền thực hiện',
    QUANTITY_INVALID: 'Số lượng phải lớn hơn 0',
  },
  WARNING: {
    CART_EMPTY: 'Giỏ hàng trống',
    STOCK_LOW: 'Sản phẩm sắp hết hàng',
    PRICE_CHANGED: 'Giá sản phẩm đã thay đổi',
    SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn',
    UNSAVED_CHANGES: 'Có thay đổi chưa được lưu',
  },
  INFO: {
    LOADING: 'Đang tải...',
    PROCESSING: 'Đang xử lý...',
    SAVING: 'Đang lưu...',
    UPDATING: 'Đang cập nhật...',
    DELETING: 'Đang xóa...',
  },
} as const;
