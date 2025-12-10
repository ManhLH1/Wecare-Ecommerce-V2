export interface ProductGroupImageProps {
  productGroupId: string;
  parentGroup?: string;
  imgUrl?: string;
  size?: "small" | "medium" | "large";
  skipApiCall?: boolean; // Thêm prop để kiểm soát việc gọi API
}

export interface SizeClasses {
  small: string;
  medium: string;
  large: string;
}

export interface ImageState {
  imageData: string | null;
  isLoading: boolean;
  imageError: boolean;
}

export interface ProductGroupCache {
  crdfd_image_url?: string;
  _crdfd_nhomsanphamcha_value?: string | string[];
}

// Type cho cache maps
export type ProductDataCache = Map<string, any>;
export type ProductGroupCacheMap = Map<string, ProductGroupCache>; 