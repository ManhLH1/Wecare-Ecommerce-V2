"use client";

import React from 'react';
import { Promotion, isPercentageDiscount } from '@/model/promotion';

interface PromotionBadgeProps {
  promotion: Promotion;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDiscount?: boolean;
}

/**
 * Hiển thị badge khuyến mãi
 */
export const PromotionBadge: React.FC<PromotionBadgeProps> = ({
  promotion,
  className = '',
  size = 'md',
  showDiscount = true
}) => {
  // Tính toán giá trị discount để hiển thị
  const getDiscountText = () => {
    if (!showDiscount) return null;
    
    const value = promotion.value2 || promotion.value;
    if (value === undefined || value === null) return null;

    if (isPercentageDiscount(promotion.vn)) {
      return `Giảm ${Number(value)}%`;
    }
    
    // Format tiền tệ
    const formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    });
    
    return `Giảm ${formatter.format(Number(value))}`;
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const discountText = getDiscountText();

  return (
    <div
      className={`
        inline-flex items-center gap-1
        bg-gradient-to-r from-red-500 to-orange-500
        text-white font-semibold rounded-full shadow-md
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* Icon giảm giá */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      
      {/* Text giảm giá */}
      {discountText && (
        <span>{discountText}</span>
      )}
      
      {/* Icon mũi tên nếu có nhiều mức */}
      {(promotion.value2 || promotion.value3) && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
    </div>
  );
};

/**
 * Badge hiển thị mức KM đang áp dụng (value1, value2, value3)
 */
export const PromotionLevelBadge: React.FC<{
  isValue2Applied: boolean;
  isValue3Applied: boolean;
  value?: number | string;
  value2?: number | string;
  value3?: number | string;
  vn?: string;
  className?: string;
}> = ({
  isValue2Applied,
  isValue3Applied,
  value,
  value2,
  value3,
  vn,
  className = ''
}) => {
  // Xác định level hiện tại
  let currentLevel = 1;
  let currentValue = value;

  if (isValue3Applied) {
    currentLevel = 3;
    currentValue = value3;
  } else if (isValue2Applied) {
    currentLevel = 2;
    currentValue = value2;
  }

  // Tạo text hiển thị
  const getLevelText = () => {
    if (currentValue === undefined || currentValue === null) return '';
    
    if (isPercentageDiscount(vn)) {
      return `${currentLevel}: Giảm ${Number(currentValue)}%`;
    }
    
    const formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    });
    
    return `${currentLevel}: ${formatter.format(Number(currentValue))}`;
  };

  const levelColors = {
    1: 'bg-gray-500',
    2: 'bg-blue-500',
    3: 'bg-green-500'
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className={`text-xs px-1.5 py-0.5 rounded text-white font-medium ${levelColors[currentLevel as keyof typeof levelColors]}`}>
        KM{currentLevel}
      </span>
      <span className="text-xs text-gray-600">
        {getLevelText()}
      </span>
    </div>
  );
};

/**
 * Badge hiển thị điều kiện số lượng
 */
export const QuantityConditionBadge: React.FC<{
  threshold?: number;
  cumulative?: boolean;
  className?: string;
}> = ({
  threshold,
  cumulative,
  className = ''
}) => {
  if (!threshold) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-1
        text-xs text-gray-600 bg-gray-100
        px-2 py-0.5 rounded
        ${className}
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      
      <span>
        {cumulative ? 'Tổng ' : ''}{threshold} sản phẩm
      </span>
      
      {cumulative && (
        <span className="text-gray-400">(Cộng dồn)</span>
      )}
    </div>
  );
};

/**
 * Badge hiển thị điều kiện tổng tiền
 */
export const TotalAmountConditionBadge: React.FC<{
  threshold?: number | string;
  currentAmount?: number;
  className?: string;
}> = ({
  threshold,
  currentAmount,
  className = ''
}) => {
  if (!threshold) return null;

  const thresholdNum = typeof threshold === 'string' ? parseFloat(threshold) : threshold;
  if (isNaN(thresholdNum) || thresholdNum <= 0) return null;

  const formatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  });

  const isThresholdMet = currentAmount !== undefined && currentAmount >= thresholdNum;
  const remaining = thresholdNum - (currentAmount || 0);

  return (
    <div
      className={`
        inline-flex flex-col gap-1
        text-xs p-2 rounded border
        ${isThresholdMet 
          ? 'bg-green-50 border-green-200 text-green-700' 
          : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }
        ${className}
      `}
    >
      <div className="flex items-center gap-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        
        <span>
          Áp dụng khi mua từ {formatter.format(thresholdNum)}
        </span>
      </div>

      {currentAmount !== undefined && !isThresholdMet && remaining > 0 && (
        <div className="flex items-center gap-1 text-orange-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          
          <span>
            Cần thêm {formatter.format(remaining)}
          </span>
        </div>
      )}

      {isThresholdMet && (
        <div className="flex items-center gap-1 text-green-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          
          <span>Đã đạt điều kiện!</span>
        </div>
      )}
    </div>
  );
};

export default PromotionBadge;
