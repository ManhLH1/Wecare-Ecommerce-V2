'use client';

import React from 'react';
import { calculatePrices, generatePriceFormula, generateTotalFormula } from '../../_utils/priceCalculation';

interface PricingEngineProps {
  // Price inputs
  price: number;
  setPrice: (value: number) => void;
  approvePrice: number | null;
  setApprovePrice: (value: number | null) => void;
  approveSupPrice: number | null;
  setApproveSupPrice: (value: number | null) => void;

  // Discount inputs
  discountRate: number | null;
  setDiscountRate: (value: number | null) => void;
  discountPercent: number;
  setDiscountPercent: (value: number) => void;
  discountAmount: number;
  setDiscountAmount: (value: number) => void;

  // VAT inputs
  vatPercent: number;
  setVatPercent: (value: number) => void;
  vatAmount: number;
  setVatAmount: (value: number) => void;

  // Quantity and calculated values
  quantity: number;
  setQuantity: (value: number) => void;
  subtotal: number;
  setSubtotal: (value: number) => void;
  totalAmount: number;
  setTotalAmount: (value: number) => void;

  // Promotion data
  promotionDiscountPercent: number;
  selectedPromotion: any;

  // Price data from API
  selectedPrice: any;
  allPrices: any[];
  priceWithVat: number | null;
  priceNoVat: number | null;
  finalPrice: number | null;
  apiUnitName?: string;
  apiPriceGroupText?: string;

  // Form state
  isFormDisabled: boolean;
  hasSelectedProduct: boolean;
  priceEntryMethod: 'manual' | 'auto';

  // Callbacks
  onPriceChange?: (price: number) => void;
  onDiscountChange?: (discount: number) => void;
}

export default function PricingEngine({
  price,
  setPrice,
  approvePrice,
  setApprovePrice,
  approveSupPrice,
  setApproveSupPrice,
  discountRate,
  setDiscountRate,
  discountPercent,
  setDiscountPercent,
  discountAmount,
  setDiscountAmount,
  vatPercent,
  setVatPercent,
  vatAmount,
  setVatAmount,
  quantity,
  setQuantity,
  subtotal,
  setSubtotal,
  totalAmount,
  setTotalAmount,
  promotionDiscountPercent,
  selectedPromotion,
  selectedPrice,
  allPrices,
  priceWithVat,
  priceNoVat,
  finalPrice,
  apiUnitName,
  apiPriceGroupText,
  isFormDisabled,
  hasSelectedProduct,
  priceEntryMethod,
  onPriceChange,
  onDiscountChange
}: PricingEngineProps) {
  // Calculate prices when inputs change
  React.useEffect(() => {
    if (!hasSelectedProduct || quantity <= 0) return;

    const result = calculatePrices({
      quantity,
      price,
      discountPercent,
      promotionDiscountPercent,
      vatPercent
    });

    setSubtotal(result.subtotal);
    setVatAmount(result.vatAmount);
    setTotalAmount(result.totalAmount);
  }, [quantity, price, discountPercent, promotionDiscountPercent, vatPercent, hasSelectedProduct]);

  const handlePriceChange = (value: number) => {
    setPrice(value);
    onPriceChange?.(value);
  };

  const handleDiscountPercentChange = (value: number) => {
    setDiscountPercent(value);
    onDiscountChange?.(value);
  };

  const priceFormula = hasSelectedProduct ? generatePriceFormula({
    quantity,
    price,
    discountPercent,
    promotionDiscountPercent,
    vatPercent,
    result: calculatePrices({
      quantity,
      price,
      discountPercent,
      promotionDiscountPercent,
      vatPercent
    })
  }) : '';

  const totalFormula = hasSelectedProduct ? generateTotalFormula(
    calculatePrices({
      quantity,
      price,
      discountPercent,
      promotionDiscountPercent,
      vatPercent
    }),
    vatPercent
  ) : '';

  return (
    <div className="admin-app-form-section">
      <div className="admin-app-form-row">
        {/* Quantity */}
        <div className="admin-app-field admin-app-field-quantity">
          <label className="admin-app-label">Số lượng *</label>
          <input
            type="number"
            className="admin-app-input admin-app-input-compact"
            value={quantity || ''}
            onChange={(e) => setQuantity(Number(e.target.value) || 0)}
            placeholder="0"
            disabled={isFormDisabled}
            min="0"
            step="1"
            required
          />
        </div>

        {/* Price Input */}
        <div className="admin-app-field admin-app-field-price">
          <label className="admin-app-label">Đơn giá *</label>
          <div className="admin-app-input-wrapper">
            <input
              type="number"
              className="admin-app-input admin-app-input-compact admin-app-input-money"
              value={price || ''}
              onChange={(e) => handlePriceChange(Number(e.target.value) || 0)}
              placeholder="0"
              disabled={isFormDisabled || priceEntryMethod === 'auto'}
              min="0"
              step="0.01"
              required
            />
            {selectedPrice && (
              <div className="admin-app-price-info">
                <span className="admin-app-price-group">{apiPriceGroupText}</span>
                {priceWithVat && (
                  <span className="admin-app-price-vat">
                    Có VAT: {priceWithVat.toLocaleString('vi-VN')} ₫
                  </span>
                )}
                {priceNoVat && (
                  <span className="admin-app-price-novat">
                    Không VAT: {priceNoVat.toLocaleString('vi-VN')} ₫
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Approve Price */}
        <div className="admin-app-field admin-app-field-approve-price">
          <label className="admin-app-label">Giá duyệt</label>
          <input
            type="number"
            className="admin-app-input admin-app-input-compact admin-app-input-money"
            value={approvePrice || ''}
            onChange={(e) => setApprovePrice(Number(e.target.value) || null)}
            placeholder="0"
            disabled={isFormDisabled}
            min="0"
            step="0.01"
          />
        </div>

        {/* Supplier Approve Price */}
        <div className="admin-app-field admin-app-field-sup-price">
          <label className="admin-app-label">Giá duyệt NCC</label>
          <input
            type="number"
            className="admin-app-input admin-app-input-compact admin-app-input-money"
            value={approveSupPrice || ''}
            onChange={(e) => setApproveSupPrice(Number(e.target.value) || null)}
            placeholder="0"
            disabled={isFormDisabled}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="admin-app-form-row">
        {/* Discount Rate */}
        <div className="admin-app-field admin-app-field-discount-rate">
          <label className="admin-app-label">Chiết khấu (%)</label>
          <input
            type="number"
            className="admin-app-input admin-app-input-compact admin-app-input-small"
            value={discountRate || ''}
            onChange={(e) => setDiscountRate(Number(e.target.value) || null)}
            placeholder="0"
            disabled={isFormDisabled}
            min="0"
            max="100"
            step="0.01"
          />
        </div>

        {/* Discount Percent */}
        <div className="admin-app-field admin-app-field-discount-percent">
          <label className="admin-app-label">Chiết khấu CT (%)</label>
          <input
            type="number"
            className="admin-app-input admin-app-input-compact admin-app-input-small"
            value={discountPercent || ''}
            onChange={(e) => handleDiscountPercentChange(Number(e.target.value) || 0)}
            placeholder="0"
            disabled={isFormDisabled}
            min="0"
            max="100"
            step="0.01"
          />
        </div>

        {/* VAT Percent */}
        <div className="admin-app-field admin-app-field-vat">
          <label className="admin-app-label">VAT (%)</label>
          <input
            type="number"
            className="admin-app-input admin-app-input-compact admin-app-input-small"
            value={vatPercent || ''}
            onChange={(e) => setVatPercent(Number(e.target.value) || 0)}
            placeholder="0"
            disabled={isFormDisabled}
            min="0"
            max="100"
            step="0.01"
          />
        </div>

        {/* Subtotal */}
        {hasSelectedProduct && (() => {
          const result = calculatePrices({
            quantity,
            price,
            discountPercent,
            promotionDiscountPercent,
            vatPercent
          });

          return (
            <div className="admin-app-field-compact admin-app-field-subtotal">
              <label className="admin-app-label-inline" title={priceFormula}>Thành tiền</label>
              <input
                type="text"
                className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money"
                value={result.subtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                readOnly
                title={priceFormula}
              />
            </div>
          );
        })()}

        {/* Total Amount */}
        {hasSelectedProduct && (() => {
          const result = calculatePrices({
            quantity,
            price,
            discountPercent,
            promotionDiscountPercent,
            vatPercent
          });

          return (
            <div className="admin-app-field-compact admin-app-field-total">
              <label className="admin-app-label-inline" title={totalFormula}>Tổng tiền</label>
              <input
                type="text"
                className="admin-app-input admin-app-input-compact admin-app-input-readonly admin-app-input-money admin-app-input-total"
                value={result.totalAmount.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                readOnly
                title={totalFormula}
              />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
