"use client";

import React, { useCallback, useEffect, useState } from 'react';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Component chọn số lượng sản phẩm
 */
export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onQuantityChange,
  min = 0,
  max = 9999,
  disabled = false,
  className = ''
}) => {
  const [inputWidth, setInputWidth] = useState('2ch');

  // Cập nhật độ rộng input khi số lượng thay đổi
  useEffect(() => {
    const newWidth = `${Math.max(2, quantity.toString().length)}ch`;
    setInputWidth(newWidth);
  }, [quantity]);

  const handleDecrease = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > min) {
      onQuantityChange(quantity - 1);
    }
  }, [quantity, min, onQuantityChange]);

  const handleIncrease = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity < max) {
      onQuantityChange(quantity + 1);
    }
  }, [quantity, max, onQuantityChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      const clampedValue = Math.max(min, Math.min(max, value));
      onQuantityChange(clampedValue);
    }
  }, [min, max, onQuantityChange]);

  return (
    <div className={`quantity-controls flex items-center justify-between gap-1 lg:gap-3 ${className}`}>
      <button
        className="w-8 h-8 lg:w-12 lg:h-12 flex items-center justify-center text-gray-700 hover:text-gray-900 border border-gray-300 rounded transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleDecrease}
        disabled={disabled || quantity <= min}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      
      <input
        type="number"
        className="w-16 lg:flex-1 lg:min-w-0 px-1 lg:px-3 py-1 lg:py-2 text-center text-sm lg:text-base font-medium text-gray-700 rounded border border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        value={quantity === 0 ? 0 : quantity.toString().replace(/^0+/, "")}
        onChange={handleInputChange}
        min={min}
        max={max}
        inputMode="numeric"
        disabled={disabled}
        style={{ width: inputWidth }}
      />
      
      <button
        className="w-8 h-8 lg:w-12 lg:h-12 flex items-center justify-center text-gray-700 hover:text-gray-900 border border-gray-300 rounded transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleIncrease}
        disabled={disabled || quantity >= max}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  );
};

export default QuantitySelector;
