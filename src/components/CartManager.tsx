"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import { Products, CartItem as ImportedCartItem } from "@/model/interface/ProductCartData";
import { getItem, setItem } from "@/utils/SecureStorage";
import { Promotion as ImportedPromotion } from "@/utils/promotionUtils";

// Kiểm tra xem sản phẩm mua kèm có trong giỏ hàng hay không
const hasBundledProductInCart = (item: ImportedCartItem, allItems: ImportedCartItem[]): boolean => {
  // Kiểm tra các điều kiện cần thiết
  if (!item.promotion?.maSanPhamMuaKem) return true;
  
  // Danh sách mã sản phẩm mua kèm
  const bundledProductCodes = item.promotion.maSanPhamMuaKem.toString().split(',').map(code => code.trim());
  
  // Kiểm tra xem có ít nhất một sản phẩm mua kèm trong giỏ hàng không
  return allItems.some(cartItem => 
    cartItem.crdfd_productsid !== item.crdfd_productsid && // Không phải sản phẩm hiện tại
    cartItem.crdfd_masanpham && bundledProductCodes.includes(cartItem.crdfd_masanpham) // Mã sản phẩm nằm trong danh sách mua kèm
  );
};

// Hàm tính toán giá khuyến mãi
const calculatePromotionPrice = (product: ImportedCartItem, totalQuantity: number, promotion: NonNullable<ImportedCartItem["promotion"]>, allItems: ImportedCartItem[]) => {
  if (!promotion) {
    return parseFloat(product.price ?? "0");
  }

  // Kiểm tra xem có sản phẩm mua kèm trong giỏ hàng không
  if (promotion.maSanPhamMuaKem && !hasBundledProductInCart(product, allItems)) {
    return parseFloat(product.price ?? "0"); // Nếu không có sản phẩm mua kèm, không áp dụng khuyến mãi
  }
  
  // Nếu không phải khuyến mãi cộng dồn số lượng, trả về giá gốc
  if (!promotion.congdonsoluong || !promotion.soluongapdung) {
    return parseFloat(product.price ?? "0");
  }

  const basePrice = parseFloat(product.price ?? "0");

  // Xác định giá trị khuyến mãi dựa trên tổng số lượng
  let promotionValue;
  if (totalQuantity >= Number(promotion.soluongapdung ?? 0)) {
    // Nếu đạt điều kiện số lượng, ưu tiên sử dụng value2
    promotionValue = promotion.value2 ? Number(promotion.value2) : Number(promotion.value || 0);
  } else {
    // Nếu chưa đạt điều kiện số lượng, sử dụng value
    promotionValue = Number(promotion.value || 0);
  }

  // Kiểm tra loại khuyến mãi (giảm % hoặc giảm tiền trực tiếp)
  const isPercentDiscount = 
    String(promotion.vn) === "Percent" || 
    String(promotion.vn) === "191920000" || 
    String(promotion.cr1bb_vn) === "191920000" ||
    String(promotion.cr1bb_vn) === "Percent";
  
  // Tính giá sau khuyến mãi
  if (isPercentDiscount) {
    return Math.max(0, basePrice * (1 - promotionValue / 100));
  } else {
    return Math.max(0, basePrice - promotionValue);
  }
};

// Hàm cập nhật giá khuyến mãi cho nhóm sản phẩm
const updateGroupPromotionPrices = (items: ImportedCartItem[], groupId: string): ImportedCartItem[] => {
  const groupItems = items.filter(item => item.crdfd_productgroup === groupId && item.promotion);
  if (groupItems.length === 0) return items;
  const totalQuantity = groupItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const promotion = groupItems[0].promotion!;
  if (!promotion) return items;
  return items.map(item => {
    if (item.promotion && item.crdfd_productgroup === groupId) {
      const originalPrice = parseFloat(item.price ?? "0");
      const newPrice = calculatePromotionPrice(item, totalQuantity, promotion, items);
      const appliedValue = totalQuantity >= Number(promotion.soluongapdung ?? 0)
        ? (promotion.value2 !== undefined ? Number(promotion.value2) : Number(promotion.value))
        : Number(promotion.value);
      const discountAmount = originalPrice - newPrice;
      return {
        ...item,
        price: newPrice.toString(),
        displayPrice: newPrice.toString(),
        promotion: {
          ...item.promotion,
          discountAmount: discountAmount.toString(),
          appliedValue: appliedValue.toString(),
          isValue2Applied: totalQuantity >= Number(promotion.soluongapdung ?? 0) && !!promotion.value2
        }
      };
    }
    return item;
  });
};

// Hàm kiểm tra và cập nhật khuyến mãi cho tất cả nhóm sản phẩm
const checkAndUpdateAllGroupPromotions = (items: ImportedCartItem[]): ImportedCartItem[] => {
  const groupIds = [...new Set(items
    .filter(item => item.promotion && item.promotion.congdonsoluong && item.crdfd_productgroup)
    .map(item => item.crdfd_productgroup as string)
    .filter((id): id is string => id !== null && id !== undefined))];
  let updatedItems = [...items];
  groupIds.forEach(groupId => {
    updatedItems = updateGroupPromotionPrices(updatedItems, groupId);
  });
  return updatedItems;
};

// Helper function to convert CartItem to ProductCartData CartItem
const convertToProductCartData = (item: ImportedCartItem): ImportedCartItem => {
  return {
    ...item,
    crdfd_giatheovc: Number(item.crdfd_giatheovc) || 0,
    productId: item.crdfd_productsid,
    productName: item.crdfd_name,
    price: item.cr1bb_giaban.toString(),
    promotion: item.promotion ? {
      ...item.promotion,
      name: item.promotion.name || '',
      vn: typeof item.promotion.vn === 'string' ? parseInt(item.promotion.vn) || 0 : (item.promotion.vn || 0),
      value: item.promotion.value?.toString() || '',
      value2: item.promotion.value2?.toString() || '',
      value3: item.promotion.value3?.toString() || '',
      appliedValue: item.promotion.appliedValue?.toString() || '',
      discountAmount: item.promotion.discountAmount || '0',
      promotionId: item.promotion.promotionId || ''
    } : undefined
  };
};

// Define CartAction type
type CartAction =
  | { type: "ADD_TO_CART"; payload: { product: Products; quantity: number } }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "REMOVE_ITEM"; payload: { id: string } }
  | { type: "CLEAR_CART" }
  | { type: "UPDATE_PROMOTION_PRICES"; payload: { groupId: string } };

// Define CartItem interface (alias for clarity, but use the imported one)
type CartItem = ImportedCartItem;

// Cart reducer function
const cartReducer = (state: CartItem[], action: CartAction): CartItem[] => {
  switch (action.type) {
    case "ADD_TO_CART": {
      const { product, quantity } = action.payload;
      const existingItem = state.find(
        (item) => item.crdfd_productsid === product.crdfd_productsid
      );
      console.log("🔍 CartReducer ADD_TO_CART - Existing item:", existingItem);
      let newState;
      if (existingItem) {
        newState = state.map((item) =>
          item.crdfd_productsid === product.crdfd_productsid
            ? {
                ...item,
                quantity: item.quantity + quantity,
                promotion: item.promotion ? {
                  ...item.promotion,
                  soluongapdung: item.promotion.soluongapdung ?? product.promotion?.soluongapdung
                } : product.promotion,
                isApplyPromotion: item.isApplyPromotion || false,
                soluongapdung: item.promotion?.soluongapdung ?? product.promotion?.soluongapdung,
                soluongcondon: item.promotion?.soluongcondon ?? product.promotion?.soluongcondon,
                promotionId: item.promotion?.promotionId ?? product.promotion?.promotionId
              }
            : item
        );
      } else {
        const newItem = {
          ...product,
          quantity,
          promotion: product.promotion ? {
            ...product.promotion,
            soluongapdung: product.promotion.soluongapdung
          } : undefined
        };
        console.log("🔍 CartReducer ADD_TO_CART - New item:", newItem);
        newState = [...state, newItem];
      }
      const finalState = checkAndUpdateAllGroupPromotions(newState as CartItem[]);
      console.log("🔍 CartReducer ADD_TO_CART - Final state:", finalState);
      console.log("🔍 CartReducer ADD_TO_CART - Final state length:", finalState.length);
      return finalState;
    }
    case "UPDATE_QUANTITY": {
      const newState = state.map((item) =>
        item.crdfd_productsid === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );

      // Kiểm tra và cập nhật khuyến mãi cho tất cả nhóm sản phẩm
      return checkAndUpdateAllGroupPromotions(newState);
    }
    case "REMOVE_ITEM": {
      const newState = state.filter(
        (item) => item.crdfd_productsid !== action.payload.id
      );

      // Kiểm tra và cập nhật khuyến mãi cho tất cả nhóm sản phẩm
      return checkAndUpdateAllGroupPromotions(newState);
    }
    case "UPDATE_PROMOTION_PRICES": {
      return updateGroupPromotionPrices(state, action.payload.groupId);
    }
    case "CLEAR_CART":
      localStorage.removeItem("cartItems");
      return [];
    default:
      return state;
  }
};

// Define CartContext
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Products, quantity: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

// Create context with default value
export const CartContext = createContext<CartContextType & {
  getProductCartDataItems: () => ImportedCartItem[];
}>({
  cartItems: [],
  addToCart: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  getProductCartDataItems: () => []
});

// Hook to use CartContext
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// CartProvider component
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cartItems, dispatch] = useReducer(cartReducer, []);

  // Load cart items from localStorage on mount
  useEffect(() => {
    const savedCartItems = localStorage.getItem("cartItems");
    
    if (savedCartItems) {
      try {
        const parsedItems = JSON.parse(savedCartItems);

        
        parsedItems.forEach((item: CartItem) => {

          dispatch({
            type: "ADD_TO_CART",
            payload: { product: item, quantity: item.quantity },
          });
        });
      } catch (error) {
        localStorage.removeItem("cartItems");
      }
    } else {
      console.log('[CartProvider] No saved cart items found in localStorage');
    }
  }, []);

  // Save cart items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((product: Products, quantity: number) => {
    console.log("🔍 CartManager addToCart - Product:", product);
    console.log("🔍 CartManager addToCart - Product ID:", product.crdfd_productsid);
    console.log("🔍 CartManager addToCart - Quantity:", quantity);
    dispatch({ type: "ADD_TO_CART", payload: { product, quantity } });
  }, [cartItems.length]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { id } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
    localStorage.removeItem("cartItems");
  }, []);

  const getProductCartDataItems = useCallback(() => {
    return cartItems.map(convertToProductCartData);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{ 
        cartItems, 
        addToCart, 
        updateQuantity, 
        removeItem, 
        clearCart,
        getProductCartDataItems
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;
