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
// Hàm tính tổng số lượng theo promotionId
export const getTotalQuantityByPromotion = (
  items: CartItem[],
  promotionId: string
): number => {
  return items
    .filter(item => item.promotionId === promotionId) 
    .reduce((total, item) => total + item.quantity, 0);
};

// Hàm tính giá sau khuyến mãi cho một sản phẩm
export const calculatePromotionPrice = (
  price: number,
  promotion: Promotion,
  totalQuantity: number,
  cartItems?: CartItem[] // Thêm tham số cartItems để tính tổng giá trị sản phẩm
): { 
  finalPrice: number;
  isValue2Applied: boolean;
  appliedValue: number;
} => {
  // Nếu không phải khuyến mãi cộng dồn
  if (!promotion.congdonsoluong) {
    const finalPrice = applyPromotionValue(price, promotion.value, promotion.vn);
    return {
      finalPrice,
      isValue2Applied: false,
      appliedValue: promotion.value
    };
  }

  // Xử lý logic cho tongTienApDung
  if (promotion.tongTienApDung && promotion.productCodes && cartItems) {
    // Tính tổng giá trị sản phẩm trong productCodes
    const totalProductValue = cartItems
      .filter(item => promotion.productCodes?.includes(item.productId))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Nếu tổng giá trị sản phẩm >= tongTienApDung thì áp dụng value 1, ngược lại áp dụng value
    const promotionValue = totalProductValue >= promotion.tongTienApDung ? 1 : promotion.value;

    return {
      finalPrice: applyPromotionValue(price, promotionValue, promotion.vn),
      isValue2Applied: false,
      appliedValue: promotionValue
    };
  }

  // Xác định giá trị khuyến mãi dựa trên tổng số lượng
  const isValue2Applied = totalQuantity >= promotion.soluongapdung;
  const promotionValue = isValue2Applied && promotion.value2
    ? promotion.value2
    : promotion.value;

  return {
    finalPrice: applyPromotionValue(price, promotionValue, promotion.vn),
    isValue2Applied,
    appliedValue: promotionValue
  };
};

// Hàm áp dụng giá trị khuyến mãi
const applyPromotionValue = (
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

// Hàm cập nhật khuyến mãi cho một sản phẩm
export const updateItemPromotion = (
  item: CartItem,
  totalQuantity: number,
  promotion: Promotion,
  cartItems?: CartItem[] // Thêm tham số cartItems
): CartItem => {
  const { finalPrice, isValue2Applied, appliedValue } = calculatePromotionPrice(
    item.price,
    promotion,
    totalQuantity,
    cartItems // Truyền cartItems vào calculatePromotionPrice
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
