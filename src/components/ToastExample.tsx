'use client';

import React from 'react';
import { useToast } from '@/hooks/useToast';
import { showToast } from '@/components/ToastManager';
import { TOAST_MESSAGES } from '@/types/toast';

// Example component showing how to use the toast system
const ToastExample: React.FC = () => {
  const toast = useToast();

  const handleSuccessToast = () => {
    toast.success(TOAST_MESSAGES.SUCCESS.ADD_TO_CART);
  };

  const handleErrorToast = () => {
    toast.error(TOAST_MESSAGES.ERROR.QUANTITY_INVALID);
  };

  const handleWarningToast = () => {
    toast.warning(TOAST_MESSAGES.WARNING.STOCK_LOW);
  };

  const handleInfoToast = () => {
    toast.info(TOAST_MESSAGES.INFO.LOADING);
  };

  const handleCustomToast = () => {
    toast.custom('Toast tùy chỉnh với thời gian hiển thị 5 giây', {
      autoClose: 5000,
      position: 'bottom-center',
    });
  };

  const handlePromiseToast = async () => {
    const promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.5 ? resolve('Thành công!') : reject('Thất bại!');
      }, 2000);
    });

    toast.promise(promise, {
      pending: 'Đang xử lý...',
      success: 'Hoàn thành thành công!',
      error: 'Có lỗi xảy ra!',
    });
  };

  // Direct usage without hook
  const handleDirectToast = () => {
    showToast.success('Toast trực tiếp từ showToast');
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Toast Examples</h2>
      
      <div className="space-y-3">
        <button
          onClick={handleSuccessToast}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Success Toast
        </button>
        
        <button
          onClick={handleErrorToast}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Error Toast
        </button>
        
        <button
          onClick={handleWarningToast}
          className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
        >
          Warning Toast
        </button>
        
        <button
          onClick={handleInfoToast}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Info Toast
        </button>
        
        <button
          onClick={handleCustomToast}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Custom Toast
        </button>
        
        <button
          onClick={handlePromiseToast}
          className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
        >
          Promise Toast
        </button>
        
        <button
          onClick={handleDirectToast}
          className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Direct Toast
        </button>
        
        <button
          onClick={() => toast.dismiss()}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
        >
          Dismiss All
        </button>
      </div>
    </div>
  );
};

export default ToastExample;
