import React, { useCallback, useState, useEffect, useMemo } from "react";
import Products from "../../../../model/Product";
import { MESSAGES } from "@/constants/constants";
import { useToast } from "@/hooks/useToast";
import { TOAST_MESSAGES } from "@/types/toast";
import axios from "axios";
import { getItem } from "@/utils/SecureStorage";
import { formatPrice, formatDiscountPercentage } from '@/utils/format';
import BundledProductsModal from '../BundledProductsModal/BundledProductsModal';
import { useRouter } from "next/navigation";

interface CartItem extends Products {
  quantity?: number;
  price: string;
}

interface ProductDetailPopupProps {
  item: Products;
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  onAddToCart: (product: Products, quantity: number) => void;
  onClose: () => void;
  showPrices?: boolean;
  cartItems?: CartItem[];
  isPriceViewer?: boolean;
}

const ProductDetailPopup: React.FC<ProductDetailPopupProps> = ({
  item,
  quantity,
  onQuantityChange,
  onAddToCart,
  onClose,
  showPrices = true,
  cartItems = [],
  isPriceViewer = false,
}) => {

  const router = useRouter();
  const [selectedPrice, setSelectedPrice] = useState<"regular" | "vc" | null>(null);
  const [promotion, setPromotion] = useState<any>(null);
  const [currentDiscountedPrice, setCurrentDiscountedPrice] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [newPrice, setNewPrice] = useState<string>("");
  const [oldPrice, setOldPrice] = useState<string>("");
  const [priceChangeReason, setPriceChangeReason] = useState<string>("");
  const [totalPromotionQuantity, setTotalPromotionQuantity] = useState<number>(0);
  const [bundledProducts, setBundledProducts] = useState<any[]>([]);
  const [isLoadingBundledProducts, setIsLoadingBundledProducts] = useState(false);
  const [showBundledProductsModal, setShowBundledProductsModal] = useState(false);
  const [inputWidth, setInputWidth] = useState("2ch");
  const [priceError, setPriceError] = useState("");
  const [isLoadingPromotion, setIsLoadingPromotion] = useState(false);

  const { success, error } = useToast();

  const notifySuccess = useCallback(() => {
    success(TOAST_MESSAGES.SUCCESS.ADD_TO_CART);
  }, [success]);

  const notifyError = useCallback(() => {
    error(TOAST_MESSAGES.ERROR.QUANTITY_INVALID);
  }, [error]);

  const Idlogin = useMemo(() => getItem("id"), []);
  const typeLogin = getItem("type");
  const selectedCustomerId = getItem("selectedCustomerId");
  const isLoggedIn = useMemo(() => !!Idlogin && !!typeLogin, [Idlogin, typeLogin]);
  const shouldShowPrices = useMemo(() => showPrices && isLoggedIn, [showPrices, isLoggedIn]);

  const parsePrice = useCallback(
    (price: string | number | null | undefined): number => {
      if (typeof price === "number") return price;
      if (typeof price === "string") return parseFloat(price) || 0;
      return 0;
    },
    []
  );
  const formatPrice = useCallback(
    (price: string | number | null | undefined): string => {
      if (!shouldShowPrices) {
        return "Liên hệ CSKHssss";
      }
      if (price === null || price === undefined || price === 0 || price === "") {
        return "Liên hệ để được báo giá";
      }
      const numPrice = typeof price === "string" ? parseFloat(price) : price;
      return isNaN(numPrice)
        ? "Liên hệ để được báo giá"
        : `${Math.round(numPrice).toLocaleString()} đ`;
    },
    [shouldShowPrices]
  );

  const calculateDiscountValue = useCallback((promo: any, originalPrice: number) => {
    // Xác định giá trị khuyến mãi dựa trên số lượng
    const getPromotionValue = () => {
      if (promo.congdonsoluong && promo.soluongapdung) {
        // Nếu có điều kiện số lượng, kiểm tra và áp dụng value tương ứng
        return quantity >= promo.soluongapdung ? (promo.value2 || promo.value) : promo.value;
      }
      // Nếu không có điều kiện số lượng, sử dụng value mặc định
      return promo.value;
    };

    const promotionValue = getPromotionValue();

    if (promo.vn === 191920001) {
      return parseFloat(promotionValue);
    } else if (promo.cr1bb_vn === "%") {
      const discountPercentage = parseFloat(promotionValue);
      return (originalPrice * discountPercentage) / 100;
    } else {
      return parseFloat(promotionValue);
    }
  }, [quantity]);

  // Hàm xác định giá trị khuyến mãi dựa trên tổng tiền
  const getPromotionValueByTotal = useCallback(() => {
    if (!promotion || !promotion.tongTienApDung || !promotion.productCodes) return promotion?.value;
    const codes = promotion.productCodes.split(',').map((c: string) => c.trim());
    // Tính tổng giá trị các sản phẩm này trong giỏ
    const totalValue = (cartItems || [])
      .filter(p => codes.includes(p.crdfd_masanpham))
      .reduce((sum, p) => sum + (parseFloat(p.price) * (p.quantity || 1)), 0);
    // Nếu sản phẩm hiện tại thuộc productCodes, cộng thêm giá trị hiện tại
    const currentValue = codes.includes(item.crdfd_masanpham)
      ? parseFloat(item.cr1bb_giaban) * quantity
      : 0;
    const tongTien = totalValue + currentValue;
    if (tongTien <= promotion.tongTienApDung) {
      return promotion.value;
    }
    return promotion.value2;
  }, [promotion, cartItems, item, quantity]);

  const calculateDiscountedPrice = useCallback((originalPrice: number, promo: any, qty: number) => {
    if (!promo) return originalPrice;
    if (promo.tongTienApDung && promo.productCodes) {
      const promotionValue = getPromotionValueByTotal();
      if (promo.vn === 191920000) {
        return originalPrice * (1 - parseFloat(promotionValue) / 100);
      } else {
        return originalPrice - parseFloat(promotionValue);
      }
    }
    // Xác định giá trị khuyến mãi dựa trên tổng số lượng
    const totalQty = qty + totalPromotionQuantity;
    let promotionValue;
    if (promo.soluongapdungmuc3 && totalQty >= promo.soluongapdungmuc3) {
      promotionValue = promo.value3;
    } else if (promo.congdonsoluong && promo.soluongapdung && totalQty >= promo.soluongapdung) {
      promotionValue = promo.value2 || promo.value;
    } else {
      promotionValue = promo.value;
    }
    let finalPrice;
    if (promo.vn === 191920000) {
      finalPrice = originalPrice * (1 - parseFloat(promotionValue) / 100);
    } else if (promo.vn === 191920001) {
      finalPrice = originalPrice - parseFloat(promotionValue);
    } else {
      finalPrice = originalPrice - parseFloat(promotionValue);
    }
    return finalPrice;
  }, [totalPromotionQuantity, getPromotionValueByTotal]);

  const getDiscountedPrice = useCallback(
    (originalPrice: number) => {
      if (promotion) {
        // Xác định giá trị khuyến mãi dựa trên tổng số lượng
        const totalQty = quantity + totalPromotionQuantity;
        let promotionValue;
        
        if (promotion.soluongapdungmuc3 && totalQty >= promotion.soluongapdungmuc3) {
          // Nếu đạt điều kiện mức 3, sử dụng value3
          promotionValue = promotion.value3;
        } else if (promotion.congdonsoluong && promotion.soluongapdung) {
          if (totalQty >= promotion.soluongapdung) {
            promotionValue = promotion.value2 || promotion.value;
          } else {
            promotionValue = promotion.value;
          }
        } else {
          promotionValue = promotion.value;
        }

        if (promotion.cr1bb_vn === "191920000") {
          // Giảm theo phần trăm
          const discountPercentage = parseFloat(promotionValue);
          const discountAmount = (originalPrice * discountPercentage) / 100;
          const finalPrice = originalPrice - discountAmount;
          return finalPrice;
        } else {
          // Giảm trực tiếp theo giá trị
          const discountAmount = parseFloat(promotionValue);
          const finalPrice = originalPrice - discountAmount;
          return finalPrice;
        }
      }
      return originalPrice;
    },
    [promotion, quantity, totalPromotionQuantity]
  );

  const fetchPromotion = useCallback(async () => {
    try {
      let customerId = typeLogin === "sale" ? selectedCustomerId : Idlogin;

      if (!customerId) {
        return;
      }

      const response = await axios.get(`/api/getPromotionDataNewVersion?id=${customerId}`);
      const promotionData = response.data;


      if (!promotionData || !Array.isArray(promotionData)) {
        return;
      }

      let foundPromotion = null;
      for (const group of promotionData) {
        if (!group.promotions) continue;
        
        for (const promo of group.promotions) {
          if (promo.productCodes) {
            const productCodes = promo.productCodes.split(',').map((code: string) => code.trim());
            if (productCodes.includes(item.crdfd_masanpham)) {
              foundPromotion = {
                ...promo,
                promotionId: promo.promotion_id,
                cr1bb_vn: promo.cr1bb_vn,
                value: promo.value,
                value2: promo.value2,
                value3: promo.value3,
                congdonsoluong: promo.congdonsoluong,
                soluongapdung: promo.soluongapdung,
                crdfd_value: promo.conditions || "0",
                crdfd_name: promo.name || ""
              };
              break;
            }
          }

          if (!foundPromotion && promo.productGroupCodes) {
            const groupCodes = promo.productGroupCodes.split(',').map((code: string) => code.trim());
            if (groupCodes.includes(item.crdfd_manhomsp)) {
              foundPromotion = {
                ...promo,
                promotionId: promo.promotion_id,
                cr1bb_vn: promo.cr1bb_vn,
                value: promo.value,
                value2: promo.value2,
                value3: promo.value3,
                congdonsoluong: promo.congdonsoluong,
                soluongapdung: promo.soluongapdung,
                crdfd_value: promo.conditions || "0",
                crdfd_name: promo.name || ""
              };
              break;
            }
          }
        }

        if (foundPromotion) break;
      }

      if (foundPromotion) {
      
        setPromotion(foundPromotion);
      } else {
        console.log('No matching promotion found for:', {
          manhomsp: item.crdfd_manhomsp,
          masanpham: item.crdfd_masanpham
        });
      }

    } catch (error) {
      console.error("Error fetching promotion data:", error);
    }
  }, [Idlogin, item.crdfd_manhomsp, item.crdfd_masanpham, selectedCustomerId, typeLogin]);

  const fetchBundledProducts = useCallback(async (productCode: string) => {
    try {
      setIsLoadingBundledProducts(true);
      // Split the product codes by comma and trim whitespace
      const productCodes = productCode.split(',').map(code => code.trim());
      // Use POST instead of GET to handle large number of product codes
      const response = await axios.post('/api/getBundledProducts', {
        productCodes: productCodes
      });
      if (response.data && Array.isArray(response.data)) {
        setBundledProducts(response.data);
      } else {
        setBundledProducts([]);
        console.warn('No bundled products found for codes:', productCodes);
      }
    } catch (err) {
      console.error("Error fetching bundled products:", err);
      error("Không thể tải sản phẩm mua kèm", {
        position: "top-right",
        autoClose: 2000,
      });
      setBundledProducts([]);
    } finally {
      setIsLoadingBundledProducts(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && item) {
      fetchPromotion();
    }
  }, [isLoggedIn, item, fetchPromotion]);

  useEffect(() => {
    const basePrice = isEditing && newPrice 
      ? parseFloat(newPrice)
      : parsePrice(
        selectedPrice === "regular" ? item.cr1bb_giaban : item.crdfd_giatheovc
      );

    let finalPrice = basePrice;
    if (promotion?.tongTienApDung) {
      // Tính tổng giá trị đơn hàng hiện tại (không bao gồm sản phẩm hiện tại)
      const codes = promotion.productCodes.split(',').map((c: string) => c.trim());
      const cartItemsTotal = (cartItems || []).reduce((sum, cartItem) => {
        if (!codes.includes(cartItem.crdfd_masanpham)) return sum;
        const itemPrice = parseFloat(cartItem.price);
        const itemQuantity = cartItem.quantity ? parseInt(cartItem.quantity.toString()) : 1;
        return sum + (itemPrice * itemQuantity);
      }, 0);

      // Thêm giá trị của sản phẩm hiện tại
      const currentProductValue = codes.includes(item.crdfd_masanpham)
        ? basePrice * quantity
        : 0;
      const totalValue = cartItemsTotal + currentProductValue;

      // Tính giá sau khuyến mãi dựa trên tổng giá trị
      if (totalValue >= parseFloat(promotion.tongTienApDung)) {
        if (promotion.vn === 191920000) {
          finalPrice = basePrice * (1 - parseFloat(promotion.value2) / 100);
        } else {
          finalPrice = basePrice - parseFloat(promotion.value2);
        }
      } else {
        if (promotion.vn === 191920000) {
          finalPrice = basePrice * (1 - parseFloat(promotion.value) / 100);
        } else {
          finalPrice = basePrice - parseFloat(promotion.value);
        }
      }
    }
    setCurrentDiscountedPrice(finalPrice);
  }, [
    selectedPrice,
    item.cr1bb_giaban,
    item.crdfd_giatheovc,
    parsePrice,
    promotion,
    isEditing,
    newPrice,
    quantity,
    cartItems,
    item
  ]);

  useEffect(() => {
    const regularPrice = parsePrice(item.cr1bb_giaban);
    const vcPrice = parsePrice(item.crdfd_giatheovc);
    setSelectedPrice(regularPrice > 0 ? "regular" : vcPrice > 0 ? "vc" : null);
  }, [item.cr1bb_giaban, item.crdfd_giatheovc, parsePrice]);

  const isBothPricesZero = useMemo(() => {
    return parsePrice(item.cr1bb_giaban) === 0 && parsePrice(item.crdfd_giatheovc) === 0;
  }, [item.cr1bb_giaban, item.crdfd_giatheovc, parsePrice]);

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Kiểm tra đăng nhập
      if (!isLoggedIn) {
        window.location.href = '/login';
        return;
      }

      // Xác định giá gốc
      const basePrice = isEditing && newPrice 
        ? parseFloat(newPrice)
        : selectedPrice === "regular"
          ? parseFloat(item.cr1bb_giaban)
          : parseFloat(item.crdfd_giatheovc);

      // Tính giá sau khuyến mãi
      let finalPrice = basePrice;
      if (promotion?.tongTienApDung) {
        // Tính tổng giá trị đơn hàng hiện tại (không bao gồm sản phẩm hiện tại)
        const codes = promotion.productCodes.split(',').map((c: string) => c.trim());
        const cartItemsTotal = (cartItems || []).reduce((sum, cartItem) => {
          if (!codes.includes(cartItem.crdfd_masanpham)) return sum;
          const itemPrice = parseFloat(cartItem.price);
          const itemQuantity = cartItem.quantity ? parseInt(cartItem.quantity.toString()) : 1;
          return sum + (itemPrice * itemQuantity);
        }, 0);

        // Thêm giá trị của sản phẩm hiện tại
        const currentProductValue = codes.includes(item.crdfd_masanpham)
          ? basePrice * quantity
          : 0;
        const totalValue = cartItemsTotal + currentProductValue;

        // Tính giá sau khuyến mãi dựa trên tổng giá trị
        if (totalValue >= parseFloat(promotion.tongTienApDung)) {
          if (promotion.vn === 191920000) {
            finalPrice = basePrice * (1 - parseFloat(promotion.value2) / 100);
          } else {
            finalPrice = basePrice - parseFloat(promotion.value2);
          }
        } else {
          if (promotion.vn === 191920000) {
            finalPrice = basePrice * (1 - parseFloat(promotion.value) / 100);
          } else {
            finalPrice = basePrice - parseFloat(promotion.value);
          }
        }
      }

      const productWithPromotion: any = {
        ...item,
        // Thông tin giá
        regularPrice: basePrice.toString(),
        price: finalPrice.toString(),
        displayPrice: finalPrice.toString(),
        hasPromotion: !!promotion,
        // Thông tin promotion
        promotion: promotion ? {
          ...promotion,
          promotionId: promotion.promotionId,
          value: promotion.value,
          value2: promotion.value2,
          value3: promotion.value3,
          congdonsoluong: promotion.congdonsoluong,
          soluongapdung: promotion.soluongapdung,
          vn: promotion.vn,
          cr1bb_vn: promotion.cr1bb_vn,
          discountAmount: (basePrice - finalPrice).toString()
        } : null,
        // Thông tin khác
        unit: selectedPrice === "regular" ? item.don_vi_DH : item.crdfd_onvichuantext,
        selectedPriceType: selectedPrice,
        // Thông tin hiển thị
        displayRegularPrice: formatPrice(basePrice),
        displayDiscountedPrice: formatPrice(finalPrice),
        displayDiscountAmount: formatPrice(basePrice - finalPrice)
      };

      // Nếu có chỉnh sửa giá
      if (isEditing) {
        if (selectedPrice === "regular") {
          productWithPromotion.cr1bb_giaban = newPrice;
          productWithPromotion.giagoc = newPrice;
        } else {
          productWithPromotion.crdfd_giatheovc = newPrice;
          productWithPromotion.giagoc = newPrice;
        }
        productWithPromotion.oldPrice = oldPrice;
        productWithPromotion.priceChangeReason = priceChangeReason;
      }

      if (quantity > 0) {
        try {
          if (typeof onAddToCart === 'function') {
            onAddToCart(productWithPromotion, quantity);
            notifySuccess();
            setTimeout(onClose, 1200);
          } else {
            error("Không thể thêm vào giỏ hàng. Vui lòng thử lại sau.");
          }
        } catch (err) {
          error(TOAST_MESSAGES.ERROR.ADD_TO_CART);
        }
      } else {
        notifyError();
      }
    },
    [
      item,
      promotion,
      isEditing,
      newPrice,
      selectedPrice,
      oldPrice,
      priceChangeReason,
      quantity,
      formatPrice,
      onAddToCart,
      onClose,
      notifySuccess,
      notifyError,
      isLoggedIn,
      cartItems
    ]
  );

  // Thêm hàm tính tổng giá trị các sản phẩm thuộc productCodes
  const getTotalProductValue = useCallback(() => {
    if (!promotion?.productCodes || !promotion?.tongTienApDung) return 0;
    const codes = promotion.productCodes.split(',').map((c: string) => c.trim());
    
    // Tính tổng giá trị từ giỏ hàng
    const cartItemsTotal = (cartItems || []).reduce((sum, cartItem) => {
      if (!codes.includes(cartItem.crdfd_masanpham)) return sum;
      const itemPrice = parseFloat(cartItem.price);
      const itemQuantity = cartItem.quantity ? parseInt(cartItem.quantity.toString()) : 1;
      return sum + (itemPrice * itemQuantity);
    }, 0);

    // Tính giá trị của sản phẩm hiện tại nếu nó thuộc danh sách sản phẩm
    const currentProductValue = codes.includes(item.crdfd_masanpham)
      ? (isEditing && newPrice 
          ? parseFloat(newPrice) 
          : parsePrice(selectedPrice === "regular" ? item.cr1bb_giaban : item.crdfd_giatheovc)) * quantity
      : 0;

    return cartItemsTotal + currentProductValue;
  }, [promotion, cartItems, item, quantity, isEditing, newPrice, selectedPrice, parsePrice]);

  // Cập nhật lại hàm xử lý thay đổi số lượng
  const handleQuantityChange = useCallback((newQuantity: number) => {
    if (newQuantity < 0) return;

    // Cập nhật số lượng thông qua prop
    onQuantityChange(newQuantity);

    // Tính toán lại giá khuyến mãi nếu có promotion dựa trên tổng tiền
    const basePrice = isEditing && newPrice 
      ? parseFloat(newPrice)
      : parsePrice(selectedPrice === "regular" ? item.cr1bb_giaban : item.crdfd_giatheovc);

    if (promotion?.tongTienApDung) {
      // Tính tổng giá trị đơn hàng hiện tại (không bao gồm sản phẩm hiện tại)
      const codes = promotion.productCodes.split(',').map((c: string) => c.trim());
      const cartItemsTotal = (cartItems || []).reduce((sum, cartItem) => {
        if (!codes.includes(cartItem.crdfd_masanpham)) return sum;
        const itemPrice = parseFloat(cartItem.price);
        const itemQuantity = cartItem.quantity ? parseInt(cartItem.quantity.toString()) : 1;
        return sum + (itemPrice * itemQuantity);
      }, 0);

      // Thêm giá trị của sản phẩm hiện tại
      const currentProductValue = codes.includes(item.crdfd_masanpham)
        ? basePrice * newQuantity
        : 0;
      const totalValue = cartItemsTotal + currentProductValue;

      // Tính giá sau khuyến mãi dựa trên tổng giá trị
      let finalPrice;
      if (totalValue >= parseFloat(promotion.tongTienApDung)) {
        if (promotion.vn === 191920000) {
          finalPrice = basePrice * (1 - parseFloat(promotion.value2) / 100);
        } else {
          finalPrice = basePrice - parseFloat(promotion.value2);
        }
      } else {
        if (promotion.vn === 191920000) {
          finalPrice = basePrice * (1 - parseFloat(promotion.value) / 100);
        } else {
          finalPrice = basePrice - parseFloat(promotion.value);
        }
      }
      setCurrentDiscountedPrice(finalPrice);
    } else {
      // Nếu không có promotion hoặc không phải promotion theo tổng tiền
      setCurrentDiscountedPrice(basePrice);
    }
  }, [promotion, cartItems, item, isEditing, newPrice, selectedPrice, parsePrice, onQuantityChange]);

  // Cập nhật các nút tăng/giảm số lượng để sử dụng handleQuantityChange
  const handleDecrease = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 0) {
      handleQuantityChange(quantity - 1);
    }
  }, [quantity, handleQuantityChange]);

  const handleIncrease = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleQuantityChange(quantity + 1);
  }, [quantity, handleQuantityChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      handleQuantityChange(value);
    }
  }, [handleQuantityChange]);

  // Thêm effect để cập nhật giá khi cartItems hoặc số lượng thay đổi
  useEffect(() => {
    if (promotion?.tongTienApDung) {
      const totalValue = getTotalProductValue();
      const basePrice = isEditing && newPrice 
        ? parseFloat(newPrice)
        : parsePrice(selectedPrice === "regular" ? item.cr1bb_giaban : item.crdfd_giatheovc);

      let finalPrice;
      if (totalValue >= parseFloat(promotion.tongTienApDung)) {
        if (promotion.vn === 191920000) {
          finalPrice = basePrice * (1 - parseFloat(promotion.value2) / 100);
        } else {
          finalPrice = basePrice - parseFloat(promotion.value2);
        }
      } else {
        if (promotion.vn === 191920000) {
          finalPrice = basePrice * (1 - parseFloat(promotion.value) / 100);
        } else {
          finalPrice = basePrice - parseFloat(promotion.value);
        }
      }
      setCurrentDiscountedPrice(finalPrice);
    }
  }, [quantity, cartItems, promotion, getTotalProductValue, isEditing, newPrice, selectedPrice, parsePrice, item]);

  // Tính tổng tiền
  const totalPrice = useMemo(() => {
    return currentDiscountedPrice * quantity;
  }, [currentDiscountedPrice, quantity]);

  // Cập nhật độ rộng input khi số lượng thay đổi
  useEffect(() => {
    const newWidth = `${Math.max(2, quantity.toString().length)}ch`;
    setInputWidth(newWidth);
  }, [quantity]);

  // Cập nhật UI để hiển thị thông tin khuyến mãi rõ ràng hơn
  const renderPromotionInfo = useCallback(() => {
    if (!promotion?.tongTienApDung) return null;

    const totalValue = getTotalProductValue();
    const tongTienApDungNum = parseFloat(promotion.tongTienApDung);
    const isValue2Applied = totalValue >= tongTienApDungNum;
    const remainingAmount = isValue2Applied ? 0 : tongTienApDungNum - totalValue;

    return (
      <div className="mt-2 space-y-1 p-2 bg-blue-50 rounded-md">
        <div className="text-[11px] lg:text-sm text-blue-700">
          <span className="font-medium">Tổng giá trị đơn hàng hiện tại: </span>
          {formatPrice(totalValue)}
        </div>
        <div className="text-[11px] lg:text-sm text-blue-700">
          <span className="font-medium">Mức giảm giá hiện tại: </span>
          {promotion.vn === 191920000 ? (
            <span className="text-green-600 font-medium">
              {isValue2Applied ? promotion.value2 : promotion.value}%
            </span>
          ) : (
            <span className="text-green-600 font-medium">
              Giảm {formatPrice(isValue2Applied ? promotion.value2 : promotion.value)}
            </span>
          )}
        </div>
        {!isValue2Applied && (
          <div className="text-[11px] lg:text-sm text-blue-700">
            <span className="font-medium">Cần thêm: </span>
            <span className="text-orange-600 font-medium">{formatPrice(remainingAmount)}</span>
            <span> để được giảm {promotion.vn === 191920000 ? `${promotion.value2}%` : formatPrice(promotion.value2)}</span>
          </div>
        )}
      </div>
    );
  }, [promotion, getTotalProductValue, formatPrice]);

  return (
    <div className="relative bg-white px-4 lg:px-8 py-4 lg:py-6 border border-gray-300 rounded-lg shadow-lg mx-auto w-[95%] lg:w-[90%] max-w-4xl mt-1.5 mb-1.5 hover:shadow-xl transition-all duration-300 ring-1 ring-gray-200/50 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Product Image Section */}
        <div className="w-full lg:w-1/3">
          {(() => {
            // Chỉ sử dụng cr1bb_imageurlproduct
            const imageUrl = item.cr1bb_imageurlproduct;
            
            if (!imageUrl) {
              return (
                <div className="relative w-full pt-[100%]">
                  <div className="absolute top-0 left-0 w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">Không có hình ảnh</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="relative w-full pt-[100%]">
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt={item.crdfd_name}
                  className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    const imgElement = e.target as HTMLImageElement;
                    imgElement.src = '/images/no-image.png';
                  }}
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
            );
          })()}
        </div>

        {/* Product Details Section */}
        <div className="w-full lg:w-2/3">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-800 mb-2">
            {item.crdfd_name}
          </h2>
          <div className="mt-0.5 lg:mt-1.5">
            {isBothPricesZero ? (
              <p className="text-xs lg:text-sm text-gray-700 flex items-center font-inter">
                <span className="font-semibold min-w-[70px] lg:min-w-[90px]">Giá:</span>
                <span className="text-blue-600">{MESSAGES.PRODUCT.LIEN_HE_DE_DUOC_BAO_GIA}</span>
              </p>
            ) : (
              <>
                {parsePrice(item.cr1bb_giaban) > 0 && (
                  <div className="grid gap-0.5">
                    {shouldShowPrices && (
                      <div className="flex items-center">
                        <span className="font-semibold min-w-[70px] lg:min-w-[90px] text-xs lg:text-sm">Giá gốc:</span>
                        <span className="text-xs lg:text-sm">
                          <span className="text-gray-500">{formatPrice(item.cr1bb_giaban)}</span>
                        </span>
                      </div>
                    )}

                    {promotion && shouldShowPrices && (
                      <div className="flex items-center">
                        <span className="font-semibold min-w-[70px] lg:min-w-[90px] text-xs lg:text-sm text-green-600">Giá KM:</span>
                        <span className="text-xs lg:text-sm">
                          <span className="text-green-600 font-bold">{formatPrice(currentDiscountedPrice)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {((typeLogin !== 'sale' || window.location.pathname === '/sale-orders')) && (
            <div className="flex flex-col gap-1 lg:gap-1.5 w-full lg:w-[280px] bg-gray-50/50 p-1 lg:p-3 rounded-lg border border-gray-100">
              <div className="quantity-controls flex items-center justify-between gap-1 lg:gap-3">
                <button
                  className="w-8 h-8 lg:w-12 lg:h-12 flex items-center justify-center text-gray-700 hover:text-gray-900 border border-gray-300 rounded transition-colors hover:bg-gray-100"
                  onClick={handleDecrease}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <input
                  type="number"
                  className="w-16 lg:flex-1 lg:min-w-0 px-1 lg:px-3 py-1 lg:py-2 text-center text-sm lg:text-base font-medium text-gray-700 rounded border border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={quantity === 0 ? 0 : quantity.toString().replace(/^0+/, "")}
                  onChange={handleInputChange}
                  min="1"
                  inputMode="numeric"
                  style={{ width: inputWidth }}
                />
                <button
                  className="w-8 h-8 lg:w-12 lg:h-12 flex items-center justify-center text-gray-700 hover:text-gray-900 border border-gray-300 rounded transition-colors hover:bg-gray-100"
                  onClick={handleIncrease}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 mt-2">
                <button
                  className="w-full px-2 lg:px-3 py-1.5 lg:py-2.5 text-xs lg:text-base font-medium rounded-md transition-colors text-white bg-cyan-600 hover:bg-cyan-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const code = item?.crdfd_masanpham || item?.crdfd_productsid;
                    if (code) {
                      // Store product data in localStorage for the product detail page
                      localStorage.setItem('productDetail', JSON.stringify(item));
                      router.push(`/san-pham/chi-tiet/${code}`);
                    }
                  }}
                >
                  Xem chi tiết
                </button>

                {!isPriceViewer && (
                  <button
                    className={`w-full px-2 lg:px-3 py-1 lg:py-2.5 text-xs lg:text-base font-medium rounded-md transition-colors text-white ${
                      quantity === 0 ||
                      isLoadingPromotion ||
                      (parsePrice(item.cr1bb_giaban) === 0 && parsePrice(item.crdfd_giatheovc) === 0) ||
                      (isEditing &&
                        (!priceChangeReason ||
                          !newPrice ||
                          newPrice === "" ||
                          priceError !== ""))
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-customBlue hover:bg-blue-700"
                    }`}
                    onClick={(e) => {
                      handleAddToCart(e);
                      handleQuantityChange(0);
                    }}
                    disabled={
                      quantity === 0 ||
                      isLoadingPromotion ||
                      (parsePrice(item.cr1bb_giaban) === 0 && parsePrice(item.crdfd_giatheovc) === 0) ||
                      (isEditing &&
                        (!priceChangeReason ||
                          !newPrice ||
                          newPrice === "" ||
                          priceError !== ""))
                    }
                  >
                    {isLoadingPromotion ? "Đang tải..." : "Thêm vào giỏ"}
                  </button>
                )}
              </div>

              <div className="text-right border-t border-gray-200 pt-0.5 lg:pt-2">
                <p className="text-xs lg:text-base text-gray-700">
                  Tổng: <span className="font-bold text-gray-900">{isBothPricesZero ? "Liên hệ" : `${formatPrice(totalPrice)}`}</span>
                </p>
              </div>


              {promotion && (promotion.maSanPhamMuaKem || promotion.maNhomSPMuaKem) && (
                <button
                  className={`w-full mt-2 px-2 lg:px-3 py-1 lg:py-2.5 text-xs lg:text-base font-medium rounded-md transition-colors ${
                    isLoadingBundledProducts
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                  onClick={() => {
                    setShowBundledProductsModal(true);
                    if (bundledProducts.length === 0) {
                      if (promotion.maSanPhamMuaKem) {
                        fetchBundledProducts(promotion.maSanPhamMuaKem);
                      } else if (promotion.maNhomSPMuaKem) {
                        fetchBundledProducts(promotion.maNhomSPMuaKem);
                      }
                    }
                  }}
                  disabled={isLoadingBundledProducts}
                >
                  {isLoadingBundledProducts
                    ? "Đang tải..."
                    : "Xem sản phẩm mua kèm"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <BundledProductsModal
        isOpen={showBundledProductsModal}
        onClose={() => setShowBundledProductsModal(false)}
        products={bundledProducts}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

export default ProductDetailPopup; 