"use client";

import React from 'react';

interface ProductImageProps {
  imageUrl?: string;
  productName: string;
  className?: string;
}

/**
 * Component hiển thị hình ảnh sản phẩm
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  imageUrl,
  productName,
  className = ''
}) => {
  if (!imageUrl) {
    return (
      <div className={`relative w-full pt-[100%] ${className}`}>
        <div className="absolute top-0 left-0 w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">Không có hình ảnh</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full pt-[100%] ${className}`}>
      <img
        key={imageUrl}
        src={imageUrl}
        alt={productName}
        className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
        onError={(e) => {
          const imgElement = e.target as HTMLImageElement;
          imgElement.src = '/images/no-image.png';
        }}
        style={{ backgroundColor: '#f3f4f6' }}
      />
    </div>
  );
};

export default ProductImage;
