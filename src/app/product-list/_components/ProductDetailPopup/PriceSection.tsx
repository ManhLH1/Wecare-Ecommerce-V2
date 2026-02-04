"use client";

import React, { useMemo } from 'react';
import { Promotion, isPercentageDiscount } from '@/model/promotion';
import { parsePromotionValue } from '@/utils/promotionUtils';
import { formatPrice } from '@/utils/format';

interface PriceSectionProps {
  basePrice: number;
  finalPrice: number;
  promotion?: {
    value?: number | string;
    value2?: number | string;
    value3?: number | string;
    vn?: string;
    congdonsoluong?: boolean;
    soluongapdung?: number;
    soluongapdungmuc3?: number;
    tongTienApDung?: number | string;
    productCodes?: string;
    name?: string;
    crdfd_conditions?: string;
  } | null;
  cartItems?: { crdfd_masanpham?: string; price: string | number; quantity?: number }[];
  currentQuantity?: number;
  showPrices?: boolean;
  className?: string;
}

/**
 * Hiển thị thông tin giá và promotion
 */
export const PriceSection: React.FC<PriceSectionProps> = ({
  basePrice,
  finalPrice,
  promotion = null,
  cartItems = [],
  currentQuantity = 0,
  showPrices = true,
  className = ''
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

  // Tính tổng giá trị cart cho promotion tongTienApDung
  const cartTotalForPromotion = useMemo(() => {
    if (!promotion?.tongTienApDung || !promotion?.productCodes) return 0;

    const codes = promotion.productCodes.split(',').map((c: string) => c.trim());
    const totalValue = (cartItems || [])
      .filter(p => codes.includes(p.crdfd_masanpham || ''))
      .reduce((sum, p) => sum + (parsePromotionValue(p.price) * (p.quantity || 1)), 0);

    return totalValue;
  }, [promotion, cartItems]);

  // Xác định mức KM hiện tại
  const getPromotionLevel = () => {
    if (!promotion) return 1;

    const value = parsePromotionValue(promotion.value);
    const value2 = parsePromotionValue(promotion.value2);
    const value3 = parsePromotionValue(promotion.value3);
    const quantityThreshold = promotion.soluongapdung || 0;
    const quantityThreshold3 = promotion.soluongapdungmuc3 || 0;
    const totalQty = currentQuantity + cartTotalForPromotion;

    if (quantityThreshold3 > 0 && totalQty >= quantityThreshold3 && value3 > 0) return 3;
    if (quantityThreshold > 0 && totalQty >= quantityThreshold && value2 > 0) return 2;
    return 1;
  };

  const promotionLevel = getPromotionLevel();

  // Get discount value for display
  const getDiscountValue = () => {
    if (!promotion) return null;
    if (promotionLevel === 3) return promotion.value3;
    if (promotionLevel === 2) return promotion.value2;
    return promotion.value;
  };

  const discountValue = getDiscountValue();

  // Tạo text hiển thị promotion
  const renderPromotionText = () => {
    if (!promotion || !discountValue) return null;

    const isPercent = isPercentageDiscount(promotion.vn);
    const formattedValue = isPercent 
      ? `${Number(discountValue)}%` 
      : formatPrice(Number(discountValue));

    return (
      <div className="flex items-center gap-1">
        <span className="text-green-600 font-medium">Giảm {formattedValue}</span>
        {promotionLevel > 1 && (
          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
            KM{promotionLevel}
          </span>
        )}
      </div>
    );
  };

  // Render total amount condition info
  const renderTotalAmountInfo = () => {
    if (!promotion?.tongTienApDung) return null;

    const thresholdNum = parsePromotionValue(promotion.tongTienApDung);
    const isMet = cartTotalForPromotion >= thresholdNum;
    const remaining = thresholdNum - cartTotalForPromotion;

    return (
      <div className={`mt-2 p-2 rounded text-xs ${isMet ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
        <div className="flex items-center gap-1">
          <span className="font-medium">Tổng giá trị: </span>
          <span>{formatPrice(cartTotalForPromotion)}</span>
        </div>
        {isMet ? (
          <div className="flex items-center gap-1 mt-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Đã đạt điều kiện giảm {isPercentageDiscount(promotion.vn) ? `${parsePromotionValue(promotion.value2)}%` : formatPrice(Number(promotion.value2))}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-0.5">
            <span>Cần thêm: </span>
            <span className="font-medium text-orange-600">{formatPrice(Math.max(0, remaining))}</span>
          </div>
        )}
      </div>
    );
  };

  if (!showPrices) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Base price */}
      {basePrice > 0 && (
        <div className="flex items-center">
          <span className="font-semibold min-w-[70px] lg:min-w-[90px] text-xs lg:text-sm">Giá gốc:</span>
          <span className="text-xs lg:text-sm">
            <span className="text-gray-500">{formatPrice(basePrice)}</span>
          </span>
        </div>
      )}

      {/* Promotion price */}
      {promotion && (
        <div className="flex items-center">
          <span className="font-semibold min-w-[70px] lg:min-w-[90px] text-xs lg:text-sm text-green-600">Giá KM:</span>
          <span className="text-xs lg:text-sm">
            <span className="text-green-600 font-bold">{formatPrice(finalPrice)}</span>
          </span>
        </div>
      )}

      {/* Discount info */}
      {discountAmount > 0 && (
        <div className="flex items-center">
          <span className="font-semibold min-w-[70px] lg:min-w-[90px] text-xs lg:text-sm text-gray-600">Giảm:</span>
          <span className="text-xs lg:text-sm text-green-600 font-medium">
            -{formatPrice(discountAmount)} (-{discountPercentage}%)
          </span>
        </div>
      )}

      {/* Promotion text */}
      {renderPromotionText()}

      {/* Total amount condition info */}
      {renderTotalAmountInfo()}
    </div>
  );
};

export default PriceSection;
