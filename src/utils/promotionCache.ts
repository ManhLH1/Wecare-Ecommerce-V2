import { LRUCache } from "lru-cache";

// Cấu hình cache
const CACHE_CONFIG = {
  promotionData: { max: 500, ttl: 3600000 }, // 1 giờ
};

// Khởi tạo cache
const caches: Record<string, LRUCache<string, any>> = Object.entries(
  CACHE_CONFIG
).reduce((acc, [key, config]) => {
  acc[key] = new LRUCache({ max: config.max, ttl: config.ttl });
  return acc;
}, {} as Record<string, LRUCache<string, any>>);

// Helper function để lấy dữ liệu từ cache
export const getCachedData = async <T>(
  cacheKey: string,
  cacheName: string
): Promise<T | null> => {
  const cache = caches[cacheName];
  if (!cache) throw new Error(`Cache ${cacheName} not found`);

  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData as T;

  return null;
};

// Hàm chuẩn hóa mã sản phẩm
const normalizeCode = (code: string): string => {
  return code.trim().replace(/\s+/g, '');
};

// Hàm tìm kiếm promotion dựa trên mã nhóm sản phẩm và mã sản phẩm
export const findPromotion = (
  promotions: any[],
  productGroupCode: string,
  productCode: string,
  cr1bb_json_gia?: any[]
) => {
  // Skip promotions if cr3b9_loaibopromotionname is "yes"
  if (cr1bb_json_gia && Array.isArray(cr1bb_json_gia) && cr1bb_json_gia.length > 0) {
    const hasNoPromotion = cr1bb_json_gia.some((item: any) => 
      item.cr3b9_loaibopromotionname === "yes"
    );
    if (hasNoPromotion) return null;
  }

  // Tìm promotion theo mã sản phẩm
  const productPromotions = promotions.filter((promo) => {
    if (!promo.crdfd_masanpham_multiple) {
      return false;
    }
    
    // Chuẩn hóa chuỗi mã sản phẩm và tách thành mảng
    const codes = promo.crdfd_masanpham_multiple
      .split(/,\s*/) // Tách theo dấu phẩy và khoảng trắng
      .map(normalizeCode)
      .filter(Boolean);
    // Chuẩn hóa mã sản phẩm cần tìm
    const normalizedProductCode = normalizeCode(productCode);

    // Kiểm tra xem mã sản phẩm có tồn tại trong danh sách không
    const found = codes.some((code: string) => {
      const isMatch = code === normalizedProductCode;
      return isMatch;
    });

    if (found) {
      console.log('✅ Found matching product code in promotion:', promo.crdfd_name);
    }

    return found;
  });

  // Tìm promotion theo mã nhóm sản phẩm
  const groupPromotions = promotions.filter((promo) => {
    if (!promo.crdfd_multiple_manhomsp) {
      return false;
    }
    
    // Chuẩn hóa chuỗi mã nhóm và tách thành mảng
    const groupCodes = promo.crdfd_multiple_manhomsp
      .split(/,\s*/) // Tách theo dấu phẩy và khoảng trắng
      .map(normalizeCode)
      .filter(Boolean);

    // Chuẩn hóa mã nhóm cần tìm
    const normalizedGroupCode = normalizeCode(productGroupCode);

    // Kiểm tra xem mã nhóm có tồn tại trong danh sách không
    const found = groupCodes.some((code: string) => {
      const isMatch = code === normalizedGroupCode;
      return isMatch;
    });

    if (found) {
      console.log('✅ Found matching group code in promotion:', promo.crdfd_name);
    }

    return found;
  });


  // Ưu tiên promotion theo mã sản phẩm trước
  if (productPromotions.length > 0) {
    const selectedPromotion = productPromotions.reduce((prev, current) => {
      const prevValue = parseFloat(prev.crdfd_value || "0");
      const currentValue = parseFloat(current.crdfd_value || "0");
      return currentValue > prevValue ? current : prev;
    });
    return selectedPromotion;
  }

  // Nếu không có promotion theo mã sản phẩm, trả về promotion theo nhóm
  if (groupPromotions.length > 0) {
    const selectedPromotion = groupPromotions.reduce((prev, current) => {
      const prevValue = parseFloat(prev.crdfd_value || "0");
      const currentValue = parseFloat(current.crdfd_value || "0");
      return currentValue > prevValue ? current : prev;
    });
    return selectedPromotion;
  }

  return null;
}; 