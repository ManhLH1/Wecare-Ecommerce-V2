import { useState, useCallback, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  calculatePromotionPriceFull,
  parsePromotionValue,
  parseProductCodes,
  parsePromotionFromApi,
  CartItem
} from '../utils/promotionUtils';
import { Promotion } from '../model/promotion';

interface UsePromotionOptions {
  autoFetch?: boolean;
  customerId?: string;
}

interface UsePromotionReturn {
  // State
  promotions: Promotion[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchPromotions: (customerId: string) => Promise<void>;
  findPromotionForProduct: (
    productCode: string,
    productGroupCode?: string
  ) => Promotion | undefined;
  
  // Calculation helpers
  calculatePrice: (
    productCode: string,
    basePrice: number,
    quantity: number,
    cartItems?: CartItem[]
  ) => {
    finalPrice: number;
    appliedValue: number;
    isValue2Applied: boolean;
    isValue3Applied: boolean;
    promotion?: Promotion;
  };
  
  // Total amount helpers
  calculateCartTotalForPromotion: (
    promotion: Promotion,
    cartItems: CartItem[],
    currentProductCode?: string,
    currentProductPrice?: number,
    currentQuantity?: number
  ) => number;
}

export function usePromotion(options: UsePromotionOptions = {}): UsePromotionReturn {
  const { autoFetch = false, customerId: initialCustomerId } = options;

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch promotions từ API
  const fetchPromotions = useCallback(async (customerId: string) => {
    if (!customerId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/api/getPromotionDataNewVersion?id=${customerId}`);
      const promotionData = response.data;

      if (!promotionData || !Array.isArray(promotionData)) {
        setPromotions([]);
        return;
      }

      // Parse promotions từ response
      const allPromotions: Promotion[] = [];
      promotionData.forEach((group: any) => {
        if (group.promotions && Array.isArray(group.promotions)) {
          group.promotions.forEach((apiPromo: any) => {
            const parsed = parsePromotionFromApi(apiPromo);
            if (parsed.promotionId) {
              allPromotions.push(parsed as Promotion);
            }
          });
        }
      });

      setPromotions(allPromotions);
    } catch (err) {
      console.error('Error fetching promotions:', err);
      setError('Không thể tải dữ liệu khuyến mãi');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto fetch khi có customerId
  useEffect(() => {
    if (autoFetch && initialCustomerId) {
      fetchPromotions(initialCustomerId);
    }
  }, [autoFetch, initialCustomerId, fetchPromotions]);

  // Tìm promotion cho một sản phẩm
  const findPromotionForProduct = useCallback((
    productCode: string,
    productGroupCode?: string
  ): Promotion | undefined => {
    // Ưu tiên tìm theo productCode
    for (const promo of promotions) {
      if (promo.productCodes && promo.productCodes.includes(productCode)) {
        return promo;
      }
    }

    // Nếu không tìm thấy, tìm theo productGroupCode
    if (productGroupCode) {
      // Lưu ý: productGroupCodes trong Promotion type cần được parse từ API
      // Hiện tại logic này cần được mở rộng khi có dữ liệu
      return undefined;
    }

    return undefined;
  }, [promotions]);

  // Tính giá với promotion
  const calculatePrice = useCallback((
    productCode: string,
    basePrice: number,
    quantity: number,
    cartItems: CartItem[] = []
  ) => {
    const promotion = findPromotionForProduct(productCode);
    
    if (!promotion) {
      return {
        finalPrice: basePrice,
        appliedValue: 0,
        isValue2Applied: false,
        isValue3Applied: false,
        promotion: undefined
      };
    }

    // Tính tổng số lượng của promotion này trong cart
    const totalQuantity = cartItems
      .filter(item => item.promotionId === promotion.promotionId)
      .reduce((sum, item) => sum + item.quantity, 0);

    const result = calculatePromotionPriceFull(
      basePrice,
      {
        value: promotion.value ?? 0,
        value2: promotion.value2,
        value3: undefined,
        vn: promotion.vn,
        congdonsoluong: promotion.congdonsoluong,
        soluongapdung: promotion.soluongapdung,
        soluongapdungmuc3: undefined,
        tongTienApDung: promotion.tongTienApDung,
        productCodes: promotion.productCodes
      },
      totalQuantity,
      cartItems
    );

    return {
      ...result,
      promotion
    };
  }, [findPromotionForProduct]);

  // Tính tổng giá trị cart cho một promotion
  const calculateCartTotalForPromotion = useCallback((
    promotion: Promotion,
    cartItems: CartItem[],
    currentProductCode?: string,
    currentProductPrice?: number,
    currentQuantity: number = 0
  ) => {
    if (!promotion.productCodes || promotion.productCodes.length === 0) {
      return 0;
    }

    // Tính từ cart items
    const cartTotal = cartItems
      .filter(item => promotion.productCodes!.includes(item.productId))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Cộng thêm sản phẩm hiện tại nếu thuộc danh sách
    if (currentProductCode && promotion.productCodes.includes(currentProductCode) && currentProductPrice) {
      return cartTotal + (currentProductPrice * currentQuantity);
    }

    return cartTotal;
  }, []);

  return {
    promotions,
    loading,
    error,
    fetchPromotions,
    findPromotionForProduct,
    calculatePrice,
    calculateCartTotalForPromotion
  };
}

/**
 * Hook đơn giản để tính giá promotion cho một sản phẩm
 * Không cần fetch promotions, chỉ tính toán
 */
export function usePromotionCalculator(
  promotion: Promotion | null,
  basePrice: number,
  quantity: number,
  cartItems: CartItem[] = []
) {
  return useMemo(() => {
    if (!promotion) {
      return {
        finalPrice: basePrice,
        appliedValue: 0,
        isValue2Applied: false,
        isValue3Applied: false,
        discountAmount: 0
      };
    }

    const totalQuantity = cartItems
      .filter(item => item.promotionId === promotion.promotionId)
      .reduce((sum, item) => sum + item.quantity, 0);

    const result = calculatePromotionPriceFull(
      basePrice,
      {
        value: promotion.value ?? 0,
        value2: promotion.value2,
        value3: undefined,
        vn: promotion.vn,
        congdonsoluong: promotion.congdonsoluong,
        soluongapdung: promotion.soluongapdung,
        soluongapdungmuc3: undefined,
        tongTienApDung: promotion.tongTienApDung,
        productCodes: promotion.productCodes
      },
      totalQuantity,
      cartItems
    );

    return {
      ...result,
      discountAmount: basePrice - result.finalPrice
    };
  }, [promotion, basePrice, quantity, cartItems]);
}
