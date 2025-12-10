import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Loading from "@/components/loading";
import axios from "axios";

interface ProductImageProps {
  productGroupId: string;
  productName: string;
  className?: string;
  imageUrl?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({ 
  productGroupId, 
  productName,
  className = "w-16 h-16 object-cover rounded mr-4",
  imageUrl
}) => {
  const [imageData, setImageData] = useState<string | null>(imageUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const fetchProductGroupImage = useCallback(async () => {
    // If we already have an imageUrl, don't fetch from product group
    if (imageUrl && imageUrl.trim().length > 0) {
      setImageData(imageUrl);
      setImageError(false);
      return;
    }

    if (!productGroupId) return;
    setIsLoading(true);
    try {
      console.log(`Fetching image for product group ${productGroupId} from API (cart)`);
      const response = await axios.get(
        `/api/getProductGroupById?crdfd_productgroupid=${productGroupId}`
      );
      if (response.data && response.data.crdfd_image_url) {
        setImageData(response.data.crdfd_image_url);
        setImageError(false);
      } else {
        console.warn(`No image data for product group ${productGroupId}`);
        setImageError(true);
      }
    } catch (error) {
      console.error(
        `Error fetching image for product group ${productGroupId}:`,
        error
      );
      setImageError(true);
    } finally {
      setIsLoading(false);
    }
  }, [productGroupId, imageUrl]);

  useEffect(() => {
    fetchProductGroupImage();
  }, [fetchProductGroupImage]);

  useEffect(() => {
    // Update imageData when imageUrl prop changes
    if (imageUrl) {
      setImageData(imageUrl);
      setImageError(false);
    }
  }, [imageUrl]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loading />
      </div>
    );
  }

  if (imageError || !imageData) {
    return (
      <Image
        src={"/@no-image.png"}
        alt={productName}
        width={64}
        height={64}
        className={className}
      />
    );
  }

  return (
    <Image
      src={imageData}
      alt={productName}
      width={64}
      height={64}
      className={className}
      onError={() => setImageError(true)}
    />
  );
}; 