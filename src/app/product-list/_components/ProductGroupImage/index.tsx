import React, { useState, useEffect, useCallback, memo } from "react";
import Image from "next/image";
import axios from "axios";
import { Image as ImageIcon } from "lucide-react";
import { useDebounce } from 'use-debounce';
import { 
  ProductGroupImageProps, 
  SizeClasses, 
  ProductDataCache, 
  ProductGroupCacheMap 
} from "../../../../model/interface/ProductGroupImageProps";

// Cache cho product data và product group data
export const productDataCache: ProductDataCache = new Map();
export const productGroupCache: ProductGroupCacheMap = new Map();

// Cache cho URLs hình ảnh
const imageCache = new Map<string, string>();

// Thêm shimmer effect placeholder
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f6f7f8" offset="20%" />
      <stop stop-color="#edeef1" offset="50%" />
      <stop stop-color="#f6f7f8" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f6f7f8" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) => typeof window === 'undefined'
  ? Buffer.from(str).toString('base64')
  : window.btoa(str);

// Hàm preload hình ảnh
const preloadImage = (src: string) => {
  return new Promise<void>((resolve, reject) => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
  });
};

const ProductGroupImage: React.FC<ProductGroupImageProps> = memo(
  ({ productGroupId, parentGroup, imgUrl, size = "small", skipApiCall = false }) => {
    const [imageData, setImageData] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    const fetchImage = useCallback(async () => {
      if (!productGroupId) return;

      // Debug log để kiểm tra giá trị imgUrl
      console.log(`ProductGroupImage - productGroupId: ${productGroupId}, imgUrl: "${imgUrl}"`);

      // Kiểm tra cache trước
      if (imageCache.has(productGroupId)) {
        setImageData(imageCache.get(productGroupId)!);
        return;
      }

      setIsLoading(true);
      try {
        // Nếu có sẵn imgUrl, sử dụng nó (ưu tiên cao nhất)
        if (imgUrl && imgUrl.trim().length > 0) {
          console.log(`Using provided imgUrl for product group ${productGroupId}: ${imgUrl}`);
          imageCache.set(productGroupId, imgUrl);
          setImageData(imgUrl);
          // Preload hình ảnh
          await preloadImage(imgUrl);
          return;
        }

        // Chỉ gọi API getProductGroupById khi thực sự cần thiết
        // (khi không có imgUrl từ props và không có trong cache)
        if (skipApiCall) {
          console.log(`Skipping API call as requested for product group ${productGroupId}`);
          setImageData(null);
          return;
        }
        
        console.log(`No imgUrl provided, fetching image for product group ${productGroupId} from API`);
        const response = await axios.get(
          `/api/getProductGroupById?crdfd_productgroupid=${productGroupId}`
        );
        
        const url = response.data?.crdfd_image_url;
        if (url && typeof url === 'string' && url.trim().length > 0) {
          // Preload và xác thực url hợp lệ; nếu fail sẽ rơi vào catch
          await preloadImage(url);
          imageCache.set(productGroupId, url);
          setImageData(url);
        } else {
          // Không có url hợp lệ -> dùng placeholder
          setImageData(null);
        }
      } catch (error) {
        // Không log lỗi 404 ra console; fallback sang placeholder
        setImageData(null);
      } finally {
        setIsLoading(false);
      }
    }, [productGroupId, imgUrl, skipApiCall]);

    useEffect(() => {
      fetchImage();
    }, [fetchImage]);

    const handleImageError = useCallback(() => {
      // Không log lỗi; chuyển sang placeholder
      setImageError(true);
    }, []);

    const sizeClasses: SizeClasses = {
      small: "w-14 h-12",
      medium: "w-48 h-48",
      large: "w-64 h-64",
    };

    const containerClass = `relative ${sizeClasses[size]} overflow-hidden rounded-lg border bg-gradient-to-br from-gray-100 to-gray-200`;

    if (isLoading) {
      return (
        <div className={containerClass}>
          <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg"></div>
        </div>
      );
    }

    if (imageError || !imageData) {
      return (
        <div className={containerClass}>
          <Image
            src={"/images/no-image.png"}
            alt="No image"
            fill
            sizes="(max-width: 640px) 56px, (max-width: 1024px) 192px, 256px"
            placeholder="empty"
            className="transition-opacity duration-300 hover:opacity-90 mix-blend-multiply bg-white"
            style={{ 
              mixBlendMode: 'multiply',
              backgroundColor: 'white',
              isolation: 'isolate'
            }}
            priority={size !== 'small'}
            loading={size === 'small' ? 'lazy' : 'eager'}
            quality={size === 'small' ? 60 : 80}
          />
        </div>
      );
    }

    return (
      <div className={containerClass}>
        <Image
          src={imageData}
          alt={`Product group ${parentGroup || productGroupId}`}
          fill
          sizes="(max-width: 640px) 56px, (max-width: 1024px) 192px, 256px"
          placeholder="blur"
          blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`}
          priority={size !== 'small'}
          loading={size === 'small' ? 'lazy' : 'eager'}
          quality={size === 'small' ? 60 : 80}
          className="transition-opacity duration-300 hover:opacity-90 mix-blend-multiply bg-white"
          style={{ 
            mixBlendMode: 'multiply',
            backgroundColor: 'white',
            isolation: 'isolate'
          }}
          onError={handleImageError}
        />
      </div>
    );
  }
);

ProductGroupImage.displayName = "ProductGroupImage";

export default ProductGroupImage;
