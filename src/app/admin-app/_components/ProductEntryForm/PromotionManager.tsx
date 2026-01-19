'use client';

import React from 'react';

interface PromotionManagerProps {
  // Promotion data
  promotions: any[];
  promotionsLoading: boolean;
  selectedPromotion: any;
  promotionText: string;
  promotionId: string;

  // Form state
  isFormDisabled: boolean;
  hasSelectedProduct: boolean;

  // Callbacks
  onPromotionSelect: (promotion: any) => void;
  onOpenSpecialPromotions?: () => void;
  onOpenDiscount2?: () => void;
  enablePromotionAutoFetch?: boolean;
}

export default function PromotionManager({
  promotions,
  promotionsLoading,
  selectedPromotion,
  promotionText,
  promotionId,
  isFormDisabled,
  hasSelectedProduct,
  onPromotionSelect,
  onOpenSpecialPromotions,
  onOpenDiscount2,
  enablePromotionAutoFetch = false
}: PromotionManagerProps) {
  const handlePromotionSelect = (promotion: any) => {
    onPromotionSelect(promotion);
  };

  const getPromotionDisplayText = () => {
    if (!selectedPromotion) return promotionText || '';
    return `${selectedPromotion.name || selectedPromotion.cr1bb_tenchuongtrinh || ''} - ${selectedPromotion.cr1bb_machuongtrinh || ''}`;
  };

  const getPromotionDiscountPercent = () => {
    if (!selectedPromotion) return 0;

    // Try different field names for discount percentage
    return Number(
      selectedPromotion.cr1bb_chietkhau ||
      selectedPromotion.discount ||
      selectedPromotion.discountPercent ||
      selectedPromotion.value ||
      0
    );
  };

  const getPromotionType = () => {
    if (!selectedPromotion) return '';

    return selectedPromotion.cr1bb_phanloaichuongtrinh ||
           selectedPromotion.type ||
           selectedPromotion.loai ||
           '';
  };

  return (
    <div className="admin-app-form-section">
      <div className="admin-app-form-row">
        {/* Promotion Selection */}
        <div className="admin-app-field admin-app-field-promotion">
          <label className="admin-app-label">Chương trình khuyến mãi</label>
          <div className="admin-app-input-wrapper">
            <select
              className="admin-app-input admin-app-input-compact"
              value={promotionId}
              onChange={(e) => {
                const selectedPromo = promotions.find(p =>
                  (p.id || p.cr1bb_chuongtrinhkhuyenmaiid) === e.target.value
                );
                handlePromotionSelect(selectedPromo || null);
              }}
              disabled={isFormDisabled || promotionsLoading}
            >
              <option value="">-- Chọn chương trình KM --</option>
              {promotions.map((promo) => (
                <option
                  key={promo.id || promo.cr1bb_chuongtrinhkhuyenmaiid}
                  value={promo.id || promo.cr1bb_chuongtrinhkhuyenmaiid}
                >
                  {promo.name || promo.cr1bb_tenchuongtrinh || ''} - {promo.cr1bb_machuongtrinh || ''}
                </option>
              ))}
            </select>

            {/* Special Promotion Buttons */}
            <div className="admin-app-promotion-buttons">
              {onOpenSpecialPromotions && (
                <button
                  type="button"
                  className="admin-app-btn admin-app-btn-small admin-app-btn-secondary"
                  onClick={onOpenSpecialPromotions}
                  disabled={isFormDisabled}
                  title="Chương trình khuyến mãi đặc biệt"
                >
                  KM Đặc biệt
                </button>
              )}

              {onOpenDiscount2 && (
                <button
                  type="button"
                  className="admin-app-btn admin-app-btn-small admin-app-btn-secondary"
                  onClick={onOpenDiscount2}
                  disabled={isFormDisabled}
                  title="Chiết khấu 2"
                >
                  Chiết khấu 2
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Promotion Details */}
        {selectedPromotion && (
          <div className="admin-app-field admin-app-field-promotion-details">
            <div className="admin-app-promotion-info">
              <div className="admin-app-promotion-type">
                <strong>Loại:</strong> {getPromotionType()}
              </div>

              {getPromotionDiscountPercent() > 0 && (
                <div className="admin-app-promotion-discount">
                  <strong>Chiết khấu:</strong> {getPromotionDiscountPercent()}%
                </div>
              )}

              {selectedPromotion.conditions && (
                <div className="admin-app-promotion-conditions">
                  <strong>Điều kiện:</strong> {selectedPromotion.conditions}
                </div>
              )}

              {selectedPromotion.description && (
                <div className="admin-app-promotion-description">
                  <strong>Mô tả:</strong> {selectedPromotion.description}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
