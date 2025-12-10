import React, { useState, useCallback, memo } from "react";
import Image from "next/image";
import ProductGroupImage from "./ProductGroupImage";

interface ProductGroupImageWithFallbackProps {
  productGroupId: string;
  imgUrl?: string;
  fallbackImgUrl?: string;
  parentGroup?: string;
  size?: "small" | "medium" | "large";
  skipApiCall?: boolean;
}

const ProductGroupImageWithFallback: React.FC<ProductGroupImageWithFallbackProps> = memo(
  ({ 
    productGroupId, 
    imgUrl, 
    fallbackImgUrl, 
    parentGroup, 
    size = "small", 
    skipApiCall = false 
  }) => {
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(imgUrl || null);
    const [hasTriedFallback, setHasTriedFallback] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleImageError = useCallback(() => {
      console.log(`Image error for ${productGroupId}, current URL: ${currentImageUrl}`);
      
      // Nếu chưa thử fallback và có fallback URL
      if (!hasTriedFallback && fallbackImgUrl && fallbackImgUrl.trim().length > 0) {
        console.log(`Trying fallback image for ${productGroupId}: ${fallbackImgUrl}`);
        setCurrentImageUrl(fallbackImgUrl);
        setHasTriedFallback(true);
        setImageError(false);
      } else {
        // Đã thử fallback hoặc không có fallback, hiển thị placeholder
        console.log(`No more fallback options for ${productGroupId}`);
        setImageError(true);
      }
    }, [productGroupId, currentImageUrl, hasTriedFallback, fallbackImgUrl]);

    // Nếu có imgUrl từ props, sử dụng nó với fallback logic
    if (imgUrl && imgUrl.trim().length > 0) {
      const sizeClasses = {
        small: "w-14 h-12",
        medium: "w-48 h-48", 
        large: "w-64 h-64",
      };
      
      const containerClass = `relative ${sizeClasses[size]} overflow-hidden rounded-lg border bg-gradient-to-br from-gray-100 to-gray-200`;

      return (
        <div className={containerClass}>
          {!imageError ? (
            <Image
              src={currentImageUrl || imgUrl}
              alt={`Product group ${parentGroup || productGroupId}`}
              fill
              sizes="(max-width: 640px) 56px, (max-width: 1024px) 192px, 256px"
              className="transition-opacity duration-300 hover:opacity-90 mix-blend-multiply bg-white object-contain"
              style={{ 
                mixBlendMode: 'multiply',
                backgroundColor: 'white',
                isolation: 'isolate'
              }}
              priority={size !== 'small'}
              loading={size === 'small' ? 'lazy' : 'eager'}
              quality={size === 'small' ? 60 : 80}
              onError={handleImageError}
            />
          ) : (
            <Image
              src="/images/no-image.png"
              alt="No image"
              fill
              sizes="(max-width: 640px) 56px, (max-width: 1024px) 192px, 256px"
              className="transition-opacity duration-300 hover:opacity-90 mix-blend-multiply bg-white object-contain"
              style={{ 
                mixBlendMode: 'multiply',
                backgroundColor: 'white',
                isolation: 'isolate'
              }}
              priority={size !== 'small'}
              loading={size === 'small' ? 'lazy' : 'eager'}
              quality={size === 'small' ? 60 : 80}
            />
          )}
        </div>
      );
    }

    // Nếu không có imgUrl, sử dụng ProductGroupImage component
    return (
      <ProductGroupImage
        productGroupId={productGroupId}
        parentGroup={parentGroup || ""}
        size={size}
        skipApiCall={skipApiCall}
      />
    );
  }
);

ProductGroupImageWithFallback.displayName = "ProductGroupImageWithFallback";

export default ProductGroupImageWithFallback;
