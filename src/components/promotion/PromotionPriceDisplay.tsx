"use client";

import React, { useMemo } from 'react';
import { Promotion, isPercentageDiscount } from '@/model/promotion';
import { PromotionBadge, PromotionLevelBadge, TotalAmountConditionBadge } from './PromotionBadge';

interface PriceDisplayProps {
  basePrice: number;
  finalPrice: number;
  currency?: string;
  locale?: string;
}

interface PromotionPriceDisplayProps {
  basePrice: number;
  finalPrice: number;
  promotion?: Promotion | null;
  isValue2Applied?: boolean;
  isValue3Applied?: boolean;
  showOriginalPrice?: boolean;
  showDiscountAmount?: boolean;
  showDiscountPercentage?: boolean;
  cartItemsTotalForPromotion?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Format price với tiền tệ Việt Nam
 */
export const formatPrice = (
  price: number,
  currency: string = 'VND',
  locale: string = 'vi-VN'
): string => {
  if (price === 0) return 'Liên hệ';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(price);
};

/**
 * Hiển thị giá đơn giản
 */
export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  basePrice,
  finalPrice,
  currency = 'VND',
  locale = 'vi-VN'
}) => {
  const hasDiscount = finalPrice < basePrice;

  return (
    <div className="inline-flex items-baseline gap-2">
      {hasDiscount && (
        <span className="text-sm text-gray-500 line-through">
          {formatPrice(basePrice, currency, locale)}
        </span>
      )}
      <span className={`font-bold ${hasDiscount ? 'text-green-600' : 'text-gray-900'}`}>
        {formatPrice(finalPrice, currency, locale)}
      </span>
    </div>
  );
};

/**
 * Hiển thị thông tin giá với promotion
 */
export const PromotionPriceDisplay: React.FC<PromotionPriceDisplayProps> = ({
  basePrice,
  finalPrice,
  promotion = null,
  isValue2Applied = false,
  isValue3Applied = false,
  showOriginalPrice = true,
  showDiscountAmount = true,
  showDiscountPercentage = true,
  cartItemsTotalForPromotion,
  className = '',
  size = 'md'
}) => {
  // Tính discount percentage
  const discountPercentage = useMemo(() => {
    if (basePrice <= 0) return 0;
    return Math.round(((basePrice - finalPrice) / basePrice) * 100);
  }, [basePrice, finalPrice]);

  // Tính discount amount
  const discountAmount = useMemo(() => {
    return basePrice - finalPrice;
  }, [basePrice, finalPrice]);

  // Size classes
  const sizeClasses = {
    sm: {
      original: 'text-xs',
      discount: 'text-xs',
      final: 'text-sm',
      badge: 'text-xs'
    },
    md: {
      original: 'text-sm',
      discount: 'text-sm',
      final: 'text-base',
      badge: 'text-sm'
    },
    lg: {
      original: 'text-base',
      discount: 'text-base',
      final: 'text-lg',
      badge: 'text-base'
    }
  };

  const sizes = sizeClasses[size];

  // Hiển thị discount badge
  const renderDiscountBadge = () => {
    if (!promotion) return null;
    return (
      <PromotionBadge
        promotion={promotion}
        size={size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg'}
        showDiscount={showDiscountPercentage}
      />
    );
  };

  // Hiển thị level badge
  const renderLevelBadge = () => {
    if (!promotion) return null;
    return (
      <PromotionLevelBadge
        isValue2Applied={isValue2Applied}
        isValue3Applied={isValue3Applied}
        value={promotion.value}
        value2={promotion.value2}
        value3={promotion.value3}
        vn={promotion.vn}
      />
    );
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* Original price */}
      {showOriginalPrice && basePrice > 0 && (
        <div className={`text-gray-500 ${sizes.original}`}>
          <span>Giá gốc: </span>
          <span className="line-through">{formatPrice(basePrice)}</span>
        </div>
      )}

      {/* Final price với discount badge */}
      <div className="flex items-center gap-2">
        {basePrice > 0 && (
          <span className={`text-gray-500 ${sizes.discount}`}>
            Giá KM: 
          </span>
        )}
        <span className={`font-bold text-green-600 ${sizes.final}`}>
          {formatPrice(finalPrice)}
        </span>
        {renderDiscountBadge()}
      </div>

      {/* Discount amount */}
      {showDiscountAmount && discountAmount > 0 && (
        <div className={`text-green-600 ${sizes.discount}`}>
          Tiết kiệm: {formatPrice(discountAmount)}
          {discountPercentage > 0 && (
            <span className="ml-1 text-gray-500">
              (-{discountPercentage}%)
            </span>
          )}
        </div>
      )}

      {/* Level badge */}
      {renderLevelBadge()}

      {/* Total amount condition badge */}
      {promotion?.tongTienApDung && (
        <TotalAmountConditionBadge
          threshold={promotion.tongTienApDung}
          currentAmount={cartItemsTotalForPromotion}
          className="mt-1"
        />
      )}
    </div>
  );
};

/**
 * Hiển thị thông tin tổng tiền với promotion
 */
export const PromotionTotalDisplay: React.FC<{
  unitPrice: number;
  quantity: number;
  finalUnitPrice: number;
  promotion?: Promotion | null;
  isValue2Applied?: boolean;
  className?: string;
}> = ({
  unitPrice,
  quantity,
  finalUnitPrice,
  promotion = null,
  isValue2Applied = false,
  className = ''
}) => {
  const originalTotal = unitPrice * quantity;
  const finalTotal = finalUnitPrice * quantity;
  const savings = originalTotal - finalTotal;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Thông tin đơn giá */}
      <PromotionPriceDisplay
        basePrice={unitPrice}
        finalPrice={finalUnitPrice}
        promotion={promotion}
        isValue2Applied={isValue2Applied}
        showOriginalPrice={true}
        showDiscountAmount={true}
        size="sm"
      />

      {/* Thông tin tổng tiền */}
      {savings > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tổng tiền:</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 line-through">
              {formatPrice(originalTotal)}
            </span>
            <span className="font-bold text-green-600">
              {formatPrice(finalTotal)}
            </span>
            <span className="text-green-600 text-xs">
              (-{formatPrice(savings)})
            </span>
          </div>
        </div>
      )}

      {savings === 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tổng tiền:</span>
          <span className="font-bold">
            {formatPrice(finalTotal)}
          </span>
        </div>
      )}
    </div>
  );
};

export default PromotionPriceDisplay;
