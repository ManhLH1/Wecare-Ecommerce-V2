import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getItem } from '@/utils/SecureStorage';

interface RelatedProduct {
  crdfd_productsid: string;
  crdfd_name: string;
  crdfd_fullname: string;
  crdfd_masanpham: string;
  cr1bb_giaban: string;
  crdfd_giatheovc: string;
  cr1bb_imageurlproduct: string | null;
  cr1bb_imageurl: string | null;
  crdfd_quycach: string;
  crdfd_chatlieu: string | null;
  crdfd_thuonghieu: string | null;
  _crdfd_productgroup_value: string;
  crdfd_manhomsp: string;
  crdfd_productgroup: string;
  crdfd_nhomsanphamtext: string;
}

interface UseRelatedProductsReturn {
  products: RelatedProduct[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache để lưu trữ sản phẩm liên quan
const relatedProductsCache = new Map<string, {
  products: RelatedProduct[];
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

export const useRelatedProducts = (product: any): UseRelatedProductsReturn => {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProductGroupId = useCallback((product: any): string | null => {
    return product._crdfd_productgroup_value || 
           product.crdfd_manhomsp || 
           product.crdfd_productgroup;
  }, []);

  const sortProducts = useCallback((products: RelatedProduct[]): RelatedProduct[] => {
    return products.sort((a, b) => {
      // Ưu tiên sản phẩm có hình ảnh
      const aHasImage = !!(a.cr1bb_imageurlproduct || a.cr1bb_imageurl);
      const bHasImage = !!(b.cr1bb_imageurlproduct || b.cr1bb_imageurl);
      if (aHasImage !== bHasImage) return bHasImage ? 1 : -1;
      
      // Ưu tiên sản phẩm có giá
      const aHasPrice = !!(a.cr1bb_giaban || a.crdfd_giatheovc);
      const bHasPrice = !!(b.cr1bb_giaban || b.crdfd_giatheovc);
      if (aHasPrice !== bHasPrice) return bHasPrice ? 1 : -1;
      
      // Sắp xếp theo tên
      return (a.crdfd_name || '').localeCompare(b.crdfd_name || '');
    });
  }, []);

  const fetchRelatedProducts = useCallback(async (forceRefresh = false) => {
    if (!product) return;

    // Kiểm tra xem người dùng đã đăng nhập chưa
    const userId = getItem("id");
    if (!userId) {
      setProducts([]);
      setError(null);
      return;
    }

    const productGroupId = getProductGroupId(product);
    if (!productGroupId) {
      setError("Không thể xác định nhóm sản phẩm");
      return;
    }

    // Kiểm tra cache
    const cacheKey = `${productGroupId}_${product.crdfd_productsid}`;
    const cached = relatedProductsCache.get(cacheKey);
    
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      setProducts(cached.products);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Thêm customerId để lấy giá chính xác (đã kiểm tra userId ở trên)
      const customerIdParam = `&customerId=${userId}`;
      
      const res = await axios.get(`/api/getProductData?product_group_Id=${productGroupId}${customerIdParam}`);
      
      let fetchedProducts = res.data || [];
      
      // Loại trừ sản phẩm hiện tại
      fetchedProducts = fetchedProducts.filter((p: RelatedProduct) => p.crdfd_productsid !== product.crdfd_productsid);
      
      // Sắp xếp sản phẩm
      const sortedProducts = sortProducts(fetchedProducts);
      
      // Lấy tối đa 8 sản phẩm liên quan
      const finalProducts = sortedProducts.slice(0, 8);
      
      // Lưu vào cache
      relatedProductsCache.set(cacheKey, {
        products: finalProducts,
        timestamp: Date.now()
      });
      
      
      setProducts(finalProducts);
    } catch (err: any) {
      console.error("Error fetching related products:", err);
      setError(
        err.response?.data?.message || 
        err.message || 
        "Không thể tải sản phẩm liên quan"
      );
    } finally {
      setIsLoading(false);
    }
  }, [product, getProductGroupId, sortProducts]);

  const refetch = useCallback(() => {
    fetchRelatedProducts(true);
  }, [fetchRelatedProducts]);

  useEffect(() => {
    fetchRelatedProducts();
  }, [fetchRelatedProducts]);

  // Cleanup cache khi component unmount
  useEffect(() => {
    return () => {
      // Có thể thêm logic cleanup cache nếu cần
    };
  }, []);

  return {
    products,
    isLoading,
    error,
    refetch
  };
};

// Utility function để clear cache
export const clearRelatedProductsCache = () => {
  relatedProductsCache.clear();
};

// Utility function để clear cache cho một sản phẩm cụ thể
export const clearRelatedProductsCacheForProduct = (productGroupId: string, productId: string) => {
  const cacheKey = `${productGroupId}_${productId}`;
  relatedProductsCache.delete(cacheKey);
}; 