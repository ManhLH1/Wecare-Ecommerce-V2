// Định nghĩa interfaces
export interface CartItem {
  promotionId?: string;
  quantity: number;
  price: number;
  productId: string;
  productName: string;
  promotedPrice?: number;  // Giá sau khuyến mãi
  isValue2Applied?: boolean;  // Có áp dụng value2 không
  appliedValue?: number;  // Giá trị khuyến mãi đang áp dụng
  crdfd_gtgt?: number;  // Giá trị gia tăng
  crdfd_gtgtsanpham?:number;
  crdfd_gtgt_value?:number;

}

export interface Promotion {
  promotionId: string;
  soluongapdung: number;
  value: number;
  value2?: number;
  congdonsoluong: boolean;
  vn: "191920000" | "191920001"; // 191920000: Giảm theo %, 191920001: Giảm theo số tiền
  tongTienApDung?: number; // Tổng tiền áp dụng cho khuyến mãi
  productCodes?: string[]; // Danh sách mã sản phẩm áp dụng khuyến mãi
}

// =========================================
// HELPER FUNCTIONS CHO PROMOTION
// =========================================

/**
 * Parse giá trị promotion từ string sang number
 * Xử lý các trường hợp: "5", "5%", "50000", 5
 */
export const parsePromotionValue = (
  value: string | number | undefined
): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Parse productCodes từ string (CRM) sang array
 * Input: "CODE1,CODE2,CODE3" hoặc "CODE1"
 */
export const parseProductCodes = (
  codes: string | undefined
): string[] => {
  if (!codes) return [];
  return codes.split(',').map(c => c.trim()).filter(Boolean);
};

/**
 * Check xem product có thuộc danh sách áp dụng không
 */
export const isProductApplicable = (
  productCode: string,
  applicableCodes: string[]
): boolean => {
  if (!applicableCodes || applicableCodes.length === 0) return true;
  return applicableCodes.some(code => 
    code.toLowerCase() === productCode.toLowerCase()
  );
};

/**
 * Tính tổng giá trị cart items theo product codes
 */
export const calculateCartTotalByProductCodes = (
  cartItems: CartItem[],
  productCodes: string[]
): number => {
  return cartItems
    .filter(item => productCodes.includes(item.productId))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

// =========================================
// CORE CALCULATION FUNCTIONS
// =========================================

// Hàm tính tổng số lượng theo promotionId
export const getTotalQuantityByPromotion = (
  items: CartItem[],
  promotionId: string
): number => {
  return items
    .filter(item => item.promotionId === promotionId) 
    .reduce((total, item) => total + item.quantity, 0);
};

/**
 * Xác định giá trị khuyến mãi dựa trên số lượng
 * Returns: { promotionValue, isValue2Applied, isValue3Applied }
 */
export const getPromotionValueByQuantity = (
  totalQuantity: number,
  value: number,
  value2: number | undefined,
  value3: number | undefined,
  quantityThreshold: number | undefined,
  quantityThreshold3: number | undefined
): { promotionValue: number; isValue2Applied: boolean; isValue3Applied: boolean } => {
  let promotionValue = value;
  let isValue2Applied = false;
  let isValue3Applied = false;

  // Check mức 3 trước (ưu tiên cao nhất)
  if (quantityThreshold3 && totalQuantity >= quantityThreshold3 && value3 !== undefined) {
    promotionValue = value3;
    isValue3Applied = true;
  } 
  // Check mức 2
  else if (quantityThreshold && totalQuantity >= quantityThreshold && value2 !== undefined) {
    promotionValue = value2;
    isValue2Applied = true;
  }

  return { promotionValue, isValue2Applied, isValue3Applied };
};

/**
 * Áp dụng giá trị khuyến mãi vào giá gốc
 */
export const applyPromotionValue = (
  price: number,
  value: number,
  type: "191920000" | "191920001"
): number => {
  if (type === "191920000") { // Giảm theo %
    return Math.max(0, price * (1 - value / 100));
  } else { // Giảm theo số tiền
    return Math.max(0, price - value);
  }
};

/**
 * Tính giá sau khuyến mãi cho một sản phẩm
 * Hỗ trợ cả 2 loại: theo số lượng và theo tổng tiền
 */
export const calculatePromotionPrice = (
  basePrice: number,
  promotion: Promotion,
  totalQuantity: number,
  cartItems?: CartItem[]
): { 
  finalPrice: number;
  isValue2Applied: boolean;
  isValue3Applied: boolean;
  appliedValue: number;
} => {
  // Trường hợp không có điều kiện tổng tiền
  if (!promotion.tongTienApDung || !promotion.productCodes || !cartItems) {
    const { promotionValue, isValue2Applied, isValue3Applied } = getPromotionValueByQuantity(
      totalQuantity,
      promotion.value,
      promotion.value2,
      undefined, // value3
      promotion.soluongapdung,
      undefined  // quantityThreshold3
    );

    return {
      finalPrice: applyPromotionValue(basePrice, promotionValue, promotion.vn),
      isValue2Applied,
      isValue3Applied: false,
      appliedValue: promotionValue
    };
  }

  // Trường hợp có điều kiện tổng tiền (tongTienApDung)
  const totalProductValue = calculateCartTotalByProductCodes(cartItems, promotion.productCodes);
  const isValue2Applied = totalProductValue >= promotion.tongTienApDung;
  const promotionValue = isValue2Applied ? (promotion.value2 || promotion.value) : promotion.value;

  return {
    finalPrice: applyPromotionValue(basePrice, promotionValue, promotion.vn),
    isValue2Applied,
    isValue3Applied: false,
    appliedValue: promotionValue
  };
};

/**
 * Tính giá sau khuyến mãi với đầy đủ 3 mức (bao gồm value3)
 * Dùng cho ProductDetailPopup với logic đầy đủ
 */
export const calculatePromotionPriceFull = (
  basePrice: number,
  promotion: {
    value: number | string;
    value2?: number | string;
    value3?: number | string;
    vn?: string;
    congdonsoluong?: boolean;
    soluongapdung?: number;
    soluongapdungmuc3?: number;
    tongTienApDung?: number | string;
    productCodes?: string;
  },
  totalQuantity: number,
  cartItems?: { productId: string; price: string | number; quantity?: number }[]
): {
  finalPrice: number;
  appliedValue: number;
  isValue2Applied: boolean;
  isValue3Applied: boolean;
} => {
  const value = parsePromotionValue(promotion.value);
  const value2 = parsePromotionValue(promotion.value2);
  const value3 = parsePromotionValue(promotion.value3);
  const vn = promotion.vn === "191920000" ? "191920000" : "191920001";

  // Trường hợp có tongTienApDung
  if (promotion.tongTienApDung && promotion.productCodes && cartItems) {
    const codes = parseProductCodes(promotion.productCodes);
    const totalValue = calculateCartTotalByProductCodes(
      cartItems
        .filter(item => codes.includes(item.productId))
        .map(item => ({
          productId: item.productId,
          price: parsePromotionValue(item.price),
          quantity: item.quantity || 1,
          productName: '' // Required by CartItem but not used in calculation
        })),
      codes
    );
    const tongTienApDungNum = parsePromotionValue(promotion.tongTienApDung);
    const isValue2Applied = totalValue >= tongTienApDungNum;
    const promotionValue = isValue2Applied ? value2 : value;

    return {
      finalPrice: applyPromotionValue(basePrice, promotionValue, vn as "191920000" | "191920001"),
      appliedValue: promotionValue,
      isValue2Applied,
      isValue3Applied: false
    };
  }

  // Trường hợp theo số lượng (cộng dồn)
  const { promotionValue, isValue2Applied, isValue3Applied } = getPromotionValueByQuantity(
    totalQuantity,
    value,
    value2,
    value3,
    promotion.soluongapdung,
    promotion.soluongapdungmuc3
  );

  return {
    finalPrice: applyPromotionValue(basePrice, promotionValue, vn as "191920000" | "191920001"),
    appliedValue: promotionValue,
    isValue2Applied,
    isValue3Applied
  };
};

// =========================================
// CART UPDATE FUNCTIONS
// =========================================

// Hàm cập nhật khuyến mãi cho một sản phẩm
export const updateItemPromotion = (
  item: CartItem,
  totalQuantity: number,
  promotion: Promotion,
  cartItems?: CartItem[]
): CartItem => {
  const { finalPrice, isValue2Applied, isValue3Applied, appliedValue } = calculatePromotionPrice(
    item.price,
    promotion,
    totalQuantity,
    cartItems
  );

  return {
    ...item,
    promotedPrice: finalPrice,
    isValue2Applied,
    appliedValue
  };
};

// Hàm cập nhật khuyến mãi cho toàn bộ giỏ hàng
export const updateCartPromotions = (
  items: CartItem[],
  promotions: Promotion[]
): CartItem[] => {
  // Tạo map để truy cập promotion nhanh hơn
  const promotionMap = new Map(promotions.map(p => [p.promotionId, p]));
  
  // Tính tổng số lượng cho từng promotionId
  const quantityMap = new Map<string, number>();
  items.forEach(item => {
    if (!item.promotionId) return;
    const current = quantityMap.get(item.promotionId) || 0;
    quantityMap.set(item.promotionId, current + item.quantity);
  });
  
  // Cập nhật khuyến mãi cho từng sản phẩm
  return items.map(item => {
    if (!item.promotionId) return item;
    
    const promotion = promotionMap.get(item.promotionId);
    if (!promotion) return item;

    const totalQuantity = quantityMap.get(item.promotionId) || 0;
    return updateItemPromotion(item, totalQuantity, promotion);
  });
};

// Hàm thêm sản phẩm vào giỏ hàng với khuyến mãi
export const addToCartWithPromotion = (
  currentItems: CartItem[],
  newItem: CartItem,
  promotions: Promotion[]
): CartItem[] => {
  // Tìm sản phẩm đã tồn tại trong giỏ hàng
  const existingItemIndex = currentItems.findIndex(
    item => item.productId === newItem.productId && 
           item.promotionId === newItem.promotionId
  );

  let updatedItems: CartItem[];
  
  if (existingItemIndex >= 0) {
    // Cập nhật số lượng nếu sản phẩm đã tồn tại
    updatedItems = currentItems.map((item, index) => 
      index === existingItemIndex
        ? { ...item, quantity: item.quantity + newItem.quantity }
        : item
    );
  } else {
    // Thêm sản phẩm mới vào giỏ hàng
    updatedItems = [...currentItems, newItem];
  }

  // Cập nhật khuyến mãi cho toàn bộ giỏ hàng
  return updateCartPromotions(updatedItems, promotions);
};

// Hàm cập nhật số lượng sản phẩm trong giỏ hàng
export const updateCartItemQuantity = (
  items: CartItem[],
  productId: string,
  newQuantity: number,
  promotions: Promotion[]
): CartItem[] => {
  if (newQuantity < 0) return items;

  const updatedItems = items.map(item =>
    item.productId === productId
      ? { ...item, quantity: newQuantity }
      : item
  );

  // Nếu số lượng = 0, xóa sản phẩm khỏi giỏ hàng
  const filteredItems = updatedItems.filter(item => item.quantity > 0);

  // Cập nhật khuyến mãi cho toàn bộ giỏ hàng
  return updateCartPromotions(filteredItems, promotions);
};

// =========================================
// API RESPONSE PARSING HELPERS
// =========================================

/**
 * Parse promotion từ API response sang format chuẩn hóa
 * Đảm bảo backward compatibility với code hiện tại
 */
export const parsePromotionFromApi = (apiPromo: {
  promotion_id?: string;
  promotionId?: string;
  name?: string;
  value?: string | number;
  value2?: string | number;
  value3?: string | number;
  vn?: string;
  congdonsoluong?: boolean;
  soluongapdung?: number;
  soluongapdungmuc3?: number;
  tongTienApDung?: number | string;
  productCodes?: string;
  productGroupCodes?: string;
}): {
  promotionId: string;
  value: number;
  value2?: number;
  value3?: number;
  congdonsoluong: boolean;
  soluongapdung: number;
  vn: "191920000" | "191920001";
  tongTienApDung?: number;
  productCodes?: string[];
} => {
  return {
    promotionId: apiPromo.promotion_id || apiPromo.promotionId || '',
    value: parsePromotionValue(apiPromo.value),
    value2: apiPromo.value2 !== undefined ? parsePromotionValue(apiPromo.value2) : undefined,
    value3: apiPromo.value3 !== undefined ? parsePromotionValue(apiPromo.value3) : undefined,
    congdonsoluong: apiPromo.congdonsoluong || false,
    soluongapdung: apiPromo.soluongapdung || 0,
    vn: (apiPromo.vn === "191920000" ? "191920000" : "191920001") as "191920000" | "191920001",
    tongTienApDung: apiPromo.tongTienApDung 
      ? parsePromotionValue(apiPromo.tongTienApDung) 
      : undefined,
    productCodes: apiPromo.productCodes 
      ? parseProductCodes(apiPromo.productCodes)
      : undefined
  };
};

/**
 * Parse promotions từ API getPromotionDataNewVersion
 */
export const parsePromotionsFromNewVersionApi = (
  apiResponse: any[]
): { [customerGroupId: string]: Promotion[] } => {
  const result: { [customerGroupId: string]: Promotion[] } = {};

  apiResponse.forEach(group => {
    const promotions = (group.promotions || []).map(parsePromotionFromApi);
    result[group.customerGroupId] = promotions;
  });

  return result;
};
