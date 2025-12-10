import React, { useCallback, useState, useEffect, useMemo } from "react";
import Products from "../../../../model/Product";
import { MESSAGES } from "@/constants/constants";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { getItem } from "@/utils/SecureStorage";
import { getCachedData, findPromotion } from "@/utils/promotionCache";
import Image from "next/image";
import BundledProductsModal from "../BundledProductsModal/BundledProductsModal";
import { useRouter } from "next/navigation";
import { generateProductUrl } from "@/utils/urlGenerator";
import { useProductGroupHierarchy } from "@/hooks/useProductGroupHierarchy";

interface ProductDetailPopupProps {
  item: Products;
  quantity: number;
  handleQuantityChange: (delta: number) => void;
  onAddToCart: (product: Products, quantity: number) => void;
  onClose: () => void;
  showPrices?: boolean;
  cartItems?: any[];
  onShowDetail?: (item: Products) => void;
  isPriceViewer?: boolean;
}

const ProductDetailPopup: React.FC<ProductDetailPopupProps> = ({
  item,
  quantity,
  handleQuantityChange,
  onAddToCart,
  onClose,
  showPrices = true,
  cartItems = [],
  onShowDetail,
  isPriceViewer = false,
}) => {
  // Khai báo tất cả các state
  const { hierarchy } = useProductGroupHierarchy();
  const [selectedPrice, setSelectedPrice] = useState<"regular" | "vc" | null>(null);
  const [promotion, setPromotion] = useState<any>(null);
  const [isLoadingPromotion, setIsLoadingPromotion] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [oldPrice, setOldPrice] = useState<string>("");
  const [inputWidth, setInputWidth] = useState("2ch");
  const [priceChangeReason, setPriceChangeReason] = useState("");
  const [showEditButton, setShowEditButton] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [currentDiscountedPrice, setCurrentDiscountedPrice] = useState<number>(0);
  const [totalPromotionQuantity, setTotalPromotionQuantity] = useState<number>(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [bundledProducts, setBundledProducts] = useState<Products[]>([]);
  const [showBundledProducts, setShowBundledProducts] = useState(false);
  const [isLoadingBundledProducts, setIsLoadingBundledProducts] = useState(false);
  const [showBundledProductsModal, setShowBundledProductsModal] = useState(false);

  // Khai báo các biến từ localStorage
  const Idlogin = useMemo(() => getItem("id"), []);
  const typeLogin = getItem("type");
  const selectedCustomerId = getItem("selectedCustomerId");
  const isLoggedIn = useMemo(() => !!Idlogin && !!typeLogin, [Idlogin, typeLogin]);

  const router = useRouter();

  // Các hàm callback
  const parsePrice = useCallback(
    (price: string | number | null | undefined): number => {
      if (typeof price === "number") return price;
      if (typeof price === "string") return parseFloat(price) || 0;
      return 0;
    },
    []
  );

  // Các computed values
  const shouldShowPrices = useMemo(() => showPrices , [showPrices]);

  const formatPrice = useCallback(
    (price: string | number | null | undefined): string => {
      if (!shouldShowPrices) {
        return "Liên hệ CSKH";
      }
      if (
        price === null ||
        price === undefined ||
        price === 0 ||
        price === ""
      ) {
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

    if (promo.vn === 191920000) {
      return (originalPrice * parseFloat(promotionValue)) / 100;
    } else if (promo.vn === 191920001) {
      return parseFloat(promotionValue);
    } else {
      return parseFloat(promotionValue);
    }
  }, [quantity]);

  const calculateDiscountedPrice = useCallback((originalPrice: number, promo: any, totalQty: number ) => {
    if (!promo) return originalPrice;
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
      const discountPercent = parseFloat(promotionValue);
      finalPrice = originalPrice * (1 - discountPercent / 100);
    } else {
      finalPrice = originalPrice - parseFloat(promotionValue);
    }
    return finalPrice;
  }, []);

  const notifySuccess = useCallback(() => {
    toast.success("Thêm giỏ hàng thành công", {
      position: "top-right",
      autoClose: 1200,
      hideProgressBar: false,
      closeOnClick: true,
      rtl: false,
      pauseOnFocusLoss: true,
      draggable: true,
      draggablePercent: 5,
      pauseOnHover: true,
      theme: "light",
    });
  }, []);

  const notifyError = useCallback(() => {
    toast.error("Số lượng không hợp lệ. Vui lòng nhập số lớn hơn 0.", {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      rtl: false,
      pauseOnFocusLoss: true,
      draggable: true,
      draggablePercent: 5,
      pauseOnHover: true,
      theme: "light",
    });
  }, []);

  // Các effects
  useEffect(() => {
    if (quantity === 0) {
      handleQuantityChange(1);
    }
  }, []);

  useEffect(() => {
    setShowEditButton(window.location.pathname.includes("/sale-orders") && isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    const updateInputWidth = () => {
      setInputWidth(
        window.innerWidth >= 1024 
          ? `${Math.max(128, Math.min(320, quantity.toString().length * 20))}px` 
          : 'auto'
      );
    };
    
    updateInputWidth();
    window.addEventListener('resize', updateInputWidth);
    
    return () => {
      window.removeEventListener('resize', updateInputWidth);
    };
  }, [quantity]);

  useEffect(() => {
    const basePrice = isEditing
      ? parsePrice(newPrice)
      : parsePrice(
        selectedPrice === "regular" ? item.cr1bb_giaban : item.crdfd_giatheovc
      );
    const totalQty = quantity + totalPromotionQuantity;
    const finalPrice = calculateDiscountedPrice(basePrice, promotion, totalQty);
    setCurrentDiscountedPrice(finalPrice);
  }, [
    isEditing,
    newPrice,
    selectedPrice,
    item.cr1bb_giaban,
    item.crdfd_giatheovc,
    calculateDiscountedPrice,
    parsePrice,
    promotion,
    quantity,
    totalPromotionQuantity
  ]);

  // Fetch promotion function
  const fetchPromotion = useCallback(async () => {
    try {
      setIsLoadingPromotion(true);
      let customerId = typeLogin === "sale" ? selectedCustomerId : Idlogin;

      if (!customerId) {
        setIsLoadingPromotion(false);
        return;
      }

      const response = await axios.get(`/api/getPromotionDataNewVersion?id=${customerId}`);
      const promotionData = response.data;

      if (!promotionData || !Array.isArray(promotionData)) {
        setIsLoadingPromotion(false);
        return;
      }

      // Lấy giá gốc để tính toán chiết khấu
      const originalPrice = parsePrice(
        selectedPrice === "regular" ? item.cr1bb_giaban : item.crdfd_giatheovc
      );

      // Tìm tất cả promotion phù hợp
      let validPromotions = [];
      for (const group of promotionData) {
        if (!group.promotions) continue;
        
        for (const promo of group.promotions) {
          let isValid = false;
          
          // Kiểm tra mã sản phẩm
          if (promo.productCodes) {
            const productCodes = promo.productCodes.split(',').map((code: string) => code.trim());
            if (productCodes.includes(item.crdfd_masanpham)) {
              isValid = true;
            }
          }

          // Kiểm tra mã nhóm sản phẩm nếu không tìm thấy theo mã sản phẩm
          if (!isValid && promo.productGroupCodes) {
            const groupCodes = promo.productGroupCodes.split(',').map((code: string) => code.trim());
            if (groupCodes.includes(item.crdfd_manhomsp)) {
              isValid = true;
            }
          }

          if (isValid) {
            validPromotions.push({
              ...promo,
              discountValue: calculateDiscountValue(promo, originalPrice),
              maSanPhamMuaKem: promo.maSanPhamMuaKem,
              tenSanPhamMuaKem: promo.tenSanPhamMuaKem
            });
          }
        }
      }

      // Sắp xếp theo giá trị chiết khấu giảm dần và lấy promotion có giá trị cao nhất
      if (validPromotions.length > 0) {
        validPromotions.sort((a, b) => b.discountValue - a.discountValue);
        const bestPromotion = validPromotions[0];
        setPromotion(bestPromotion);
      }
      setIsLoadingPromotion(false);

    } catch (error) {
      console.error("Error fetching promotion data:", error);
      setIsLoadingPromotion(false);
    }
  }, [Idlogin, item.crdfd_manhomsp, item.crdfd_masanpham, selectedCustomerId, typeLogin, selectedPrice, item.cr1bb_giaban, item.crdfd_giatheovc, calculateDiscountValue]);

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
      const totalQty = quantity + totalPromotionQuantity;
      const finalPrice = calculateDiscountedPrice(basePrice, promotion, totalQty);

      // Map promotion nếu cần
      const mappedPromotion = promotion
        ? {
            promotionId: promotion.promotionId || promotion.promotionID || promotion.id || "",
            crdfd_name: promotion.name || promotion.crdfd_name || "",
            vn: promotion.vn || promotion.cr1bb_vn || "",
            value: promotion.value,
            value2: promotion.value2,
            value3: promotion.value3,
            congdonsoluong: promotion.congdonsoluong,
            soluongapdung: promotion.soluongapdung,
            discountAmount: (basePrice - finalPrice).toString(),
            ...promotion,
          }
        : null;

      const productWithPromotion: any = {
        ...item,
        // Thông tin giá
        regularPrice: basePrice.toString(),
        price: finalPrice.toString(),
        displayPrice: finalPrice.toString(),
        hasPromotion: !!mappedPromotion,
        // Thông tin promotion
        promotion: mappedPromotion,
        promotionId: mappedPromotion?.promotionId,
        isApplyPromotion: !!mappedPromotion,
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
        } else {
          productWithPromotion.crdfd_giatheovc = newPrice;
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
            toast.error("Không thể thêm vào giỏ hàng. Vui lòng thử lại sau.", {
              position: "top-right",
              autoClose: 2000,
            });
          }
        } catch (error) {
          toast.error("Có lỗi xảy ra khi thêm vào giỏ hàng", {
            position: "top-right",
            autoClose: 2000,
          });
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
      calculateDiscountedPrice,
      formatPrice,
      onAddToCart,
      onClose,
      notifySuccess,
      notifyError,
      totalPromotionQuantity,
      isLoggedIn
    ]
  );

  useEffect(() => {
    const regularPrice = parsePrice(item.cr1bb_giaban);
    const vcPrice = parsePrice(item.crdfd_giatheovc);
    setSelectedPrice(regularPrice > 0 ? "regular" : vcPrice > 0 ? "vc" : null);
    fetchPromotion();
  }, [item.cr1bb_giaban, item.crdfd_giatheovc, parsePrice, fetchPromotion]);

  const handleEditPrice = useCallback(() => {
    setIsEditing(true);
    setPromotion(null); // Clear promotion when editing
    const currentPrice = selectedPrice === "regular" ? item.cr1bb_giaban : item.crdfd_giatheovc;
    setOldPrice(currentPrice || "0");
    setNewPrice(currentPrice || "0");
  }, [selectedPrice, item.cr1bb_giaban, item.crdfd_giatheovc]);

  const handleSavePrice = useCallback(() => {
    setIsEditing(false);
    setPriceChangeReason(priceChangeReason);
  }, [priceChangeReason]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setNewPrice("");
    setPriceChangeReason("");
    setPriceError("");
    fetchPromotion();
  }, [fetchPromotion]);
  
  const validatePrice = useCallback(
    (value: string) => {
      const currentPrice =
        selectedPrice === "regular" ? item.cr1bb_giaban : item.crdfd_giatheovc;
      if (value && parseFloat(value) > parseFloat(currentPrice)) {
        setPriceError("Giá mới không được lớn hơn giá hiện tại");
      } else {
        setPriceError("");
      }
    },
    [selectedPrice, item.cr1bb_giaban, item.crdfd_giatheovc]
  );

  const totalPrice = useMemo(
    () => currentDiscountedPrice * quantity,
    [currentDiscountedPrice, quantity]
  );

  const isBothPricesZero = useMemo(
    () =>
      parsePrice(item.cr1bb_giaban) === 0 &&
      parsePrice(item.crdfd_giatheovc) === 0,
    [item.cr1bb_giaban, item.crdfd_giatheovc, parsePrice]
  );

  // Thêm useEffect để gọi fetchPromotion khi component mount
  useEffect(() => {
    if (isLoggedIn && item) {
      fetchPromotion();
    }
  }, [isLoggedIn, item, fetchPromotion]);

  // Thêm hàm tính tổng giá trị các sản phẩm thuộc productCodes
  const getTotalProductValue = useCallback(() => {
    if (!promotion?.productCodes || !promotion?.tongTienApDung) return 0;
    const codes = promotion.productCodes.split(',').map((c: string) => c.trim());
    return cartItems
      .filter(cartItem => codes.includes(cartItem.crdfd_masanpham))
      .reduce((sum, cartItem) => sum + (parseFloat(cartItem.price) * (cartItem.quantity || 1)), 0);
  }, [promotion, cartItems]);

  // Sửa lại getPromotionDisplay để ưu tiên logic tongTienApDung
  const getPromotionDisplay = useCallback(() => {
    if (!promotion) return null;

    const basePrice = isEditing && newPrice 
      ? parseFloat(newPrice)
      : selectedPrice === "regular"
        ? parseFloat(item.cr1bb_giaban)
        : parseFloat(item.crdfd_giatheovc);

    // --- BẮT ĐẦU: Logic tongTienApDung ---
    if (promotion.tongTienApDung && promotion.productCodes) {
      const totalProductValue = getTotalProductValue();
      const tongTienApDungNum = typeof promotion.tongTienApDung === 'string'
        ? parseFloat(promotion.tongTienApDung)
        : promotion.tongTienApDung;
      const isValue2Applied = totalProductValue >= tongTienApDungNum;
      const discountValue = isValue2Applied
        ? promotion.value2
        : promotion.value;
      const kmLabel = isValue2Applied ? "Giá KM 2" : "Giá KM 1";
      const discountedPrice = promotion.vn === 191920000
        ? basePrice * (1 - parseFloat(discountValue) / 100)
        : basePrice - parseFloat(discountValue);
      const discountText = promotion.vn === 191920000
        ? `(-${discountValue}%)`
        : `(-${formatPrice(parseFloat(discountValue))})`;
      const conditionText = isValue2Applied
        ? `(Áp dụng khi tổng giá trị >= ${formatPrice(tongTienApDungNum)})`
        : `(Giảm thêm khi tổng giá trị < ${formatPrice(tongTienApDungNum)})`;
      return {
        originalPrice: formatPrice(basePrice),
        discountedPrice: formatPrice(discountedPrice),
        discountAmount: formatPrice(basePrice - discountedPrice),
        discountText,
        conditionText,
        kmLabel
      };
    }
    // --- KẾT THÚC: Logic tongTienApDung ---

    // ... giữ lại logic cũ cho các trường hợp khác ...
    let discountValue, conditionText, kmLabel;
    if (promotion.soluongapdungmuc3 && quantity + totalPromotionQuantity >= promotion.soluongapdungmuc3) {
      discountValue = promotion.value3;
      conditionText = `(Áp dụng cho đơn từ ${promotion.soluongapdungmuc3} ${item.don_vi_DH})`;
      kmLabel = "Giá KM 3";
    } else if (promotion.congdonsoluong && promotion.soluongapdung && quantity + totalPromotionQuantity >= promotion.soluongapdung) {
      discountValue = promotion.value2 || promotion.value;
      conditionText = `(Áp dụng cho đơn từ ${promotion.soluongapdung} ${item.don_vi_DH})`;
      kmLabel = "Giá KM 2";
    } else {
      discountValue = promotion.value;
      conditionText = promotion.congdonsoluong && promotion.soluongapdung
        ? `(Giảm thêm khi mua từ ${promotion.soluongapdung} ${item.don_vi_DH})`
        : "";
      kmLabel = "Giá KM 1";
    }

    const finalPrice = calculateDiscountedPrice(basePrice, promotion, quantity + totalPromotionQuantity);

    return {
      originalPrice: formatPrice(basePrice),
      discountedPrice: formatPrice(finalPrice),
      discountAmount: formatPrice(basePrice - finalPrice),
      discountText: promotion.vn === 191920000 
        ? `(-${discountValue}%)` 
        : `(-${formatPrice(parseFloat(discountValue))})`,
      conditionText,
      kmLabel
    };
  }, [promotion, quantity, totalPromotionQuantity, selectedPrice, item, calculateDiscountedPrice, formatPrice, isEditing, newPrice, getTotalProductValue]);

  // Update the useEffect to calculate total quantity by promotionId
  useEffect(() => {
    if (promotion) {
      try {
        const productCodes = (promotion.productCodes || "")
          .split(",")
          .map((code: string) => code.trim());

        const totalQty = cartItems.reduce((total: number, cartItem: any) => {
          if (
            cartItem.promotion?.promotionId === promotion.promotionId &&
            cartItem.promotion?.congdonsoluong &&
            promotion.congdonsoluong &&
            productCodes.includes(cartItem.crdfd_masanpham)
          ) {
            return total + (cartItem.quantity || 0);
          }
          return total;
        }, 0);
        
        setTotalPromotionQuantity(totalQty);
      } catch (error) {
        console.error('Error calculating promotion quantity:', error);
        setTotalPromotionQuantity(0);
      }
    }
  }, [promotion, cartItems]);

  const fetchBundledProducts = useCallback(async (productCode: string) => {
    try {
      setIsLoadingBundledProducts(true);
      const response = await axios.get(`/api/getBundledProducts?productCode=${productCode}`);
      setBundledProducts(response.data);
    } catch (error) {
      console.error("Error fetching bundled products:", error);
      toast.error("Không thể tải sản phẩm mua kèm", {
        position: "top-right",
        autoClose: 2000,
      });
    } finally {
      setIsLoadingBundledProducts(false);
    }
  }, []);

  const fetchBundledProductsByGroup = async (groupCode: string) => {
    try {
      // Gọi API lấy sản phẩm theo mã nhóm sản phẩm
      const response = await fetch(`/api/getBundledProducts?code=${groupCode}&type=group`);
      if (!response.ok) {
        throw new Error('Không thể lấy danh sách sản phẩm bán kèm theo nhóm');
      }
      const data = await response.json();
      setBundledProducts(data); // Cập nhật state với danh sách sản phẩm trả về
    } catch (error) {
      console.error('Lỗi khi lấy sản phẩm bán kèm theo nhóm:', error);
      setBundledProducts([]); // Có thể set rỗng hoặc hiển thị thông báo lỗi
    }
  };

  // Function to convert display text to slug
  const textToSlug = (text: string) => {
    return text.toLowerCase().normalize('NFD')
      .replace(/[ -6f]/g, '') // Remove accents
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
  };

  return (
    <div className="relative bg-white px-4 lg:px-8 py-4 lg:py-6 border border-gray-300 rounded-lg shadow-lg mx-auto w-[95%] lg:w-[90%] max-w-4xl mt-1.5 mb-1.5 hover:shadow-xl transition-all duration-300 ring-1 ring-gray-200/50 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
      <h1 className="text-xs lg:text-lg font-bold text-gray-800 mb-2 lg:mb-3 pb-1 border-b border-gray-200">
        {item.crdfd_name || ""}
      </h1>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Product Image */}
        <div className="w-full lg:w-1/4">
          {item.cr1bb_imageurlproduct ? (
            <div className="relative w-full aspect-square rounded-lg overflow-hidden">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
              <Image
                src={item.cr1bb_imageurlproduct}
                alt={item.crdfd_name || ""}
                fill
                quality={100}
                className={`object-cover ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoadingComplete={() => setIsImageLoading(false)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "./public/no-image.png";
                  setIsImageLoading(false);
                }}
              />
            </div>
          ) : (
            <div className="relative w-full aspect-square rounded-lg overflow-hidden">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
              <Image
                src={item.cr1bb_imageurl}
                alt={item.crdfd_name || ""}
                fill
                quality={100}
                className={`object-cover ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoadingComplete={() => setIsImageLoading(false)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/no-image.png";
                  setIsImageLoading(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <span className="col-span-2 text-[11px] lg:text-sm font-medium text-gray-600">
              Thương hiệu:
            </span>
            <span className="col-span-3 text-[11px] lg:text-sm text-gray-800">
              {item.crdfd_thuonghieu || "Chưa cập nhật"}
            </span>
            <span className="col-span-2 text-[11px] lg:text-sm font-medium text-gray-600">
              Quy cách:
            </span>
            <span className="col-span-3 text-[11px] lg:text-sm text-gray-800">
              {item.crdfd_quycach || "Chưa cập nhật"}
            </span>
            <span className="col-span-2 text-[11px] lg:text-sm font-medium text-gray-600">
              Hoàn thiện:
            </span>
            <span className="col-span-3 text-[11px] lg:text-sm text-gray-800">
              {item.crdfd_hoanthienbemat || "Chưa cập nhật"}
            </span>
          </div>

          {/* Phần giá */}
          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            {isBothPricesZero ? (
              <div className="flex items-center gap-2">
                <span className="text-xs lg:text-sm font-medium text-gray-600">Giá:</span>
                <span className="text-xs lg:text-sm text-blue-600 font-medium">{MESSAGES.PRODUCT.LIEN_HE_DE_DUOC_BAO_GIA}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs lg:text-sm font-medium text-gray-600 min-w-[60px]">Giá:</span>
                  <span className={`text-xs lg:text-sm ${promotion ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'}`}>
                    {formatPrice(selectedPrice === "regular" ? item.cr1bb_giaban : item.crdfd_giatheovc)}
                  </span>
                </div>

                {promotion && shouldShowPrices && (
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-xs lg:text-sm font-medium text-green-600 min-w-[60px]">
                        {getPromotionDisplay()?.kmLabel}:
                      </span>
                      <div className="flex-1">
                        <span className="text-xs lg:text-sm font-bold text-green-600">
                          {getPromotionDisplay()?.discountedPrice}
                        </span>
                         <span className="ml-2 text-[10px] lg:text-xs text-gray-500">
                           {getPromotionDisplay()?.discountText}
                           <span className="ml-1">
                             {getPromotionDisplay()?.conditionText}
                           </span>
                         </span>
                         
                         {/* Tên chương trình khuyến mãi */}
                         {promotion.name && (
                           <div className="mt-1 text-[10px] lg:text-xs text-blue-600 font-medium">
                             {promotion.name}
                           </div>
                         )}
                         
                         {/* Thời gian hiệu lực */}
                         {promotion.startDate && (
                           <div className="mt-0.5 text-[9px] lg:text-[10px] text-gray-500">
                             Từ ngày {new Date(promotion.startDate).toLocaleDateString('vi-VN')}
                             {promotion.endDate ? ` đến hết ngày ${new Date(promotion.endDate).toLocaleDateString('vi-VN')}` : ' đến khi có thông báo mới'}
                           </div>
                         )}

                        {promotion.congdonsoluong && (
                          <div className="mt-1.5 text-[10px] lg:text-xs text-gray-600 bg-gray-50 p-2 rounded-md">
                            {totalPromotionQuantity > 0 ? (
                              <>
                                <span className="font-medium">Đã có {totalPromotionQuantity} {item.don_vi_DH} trong giỏ hàng</span>
                                <span className="block mt-0.5 text-blue-600">
                                  {totalPromotionQuantity >= promotion.soluongapdung ? (
                                    "✓ Đã đạt KM2"
                                  ) : (quantity + totalPromotionQuantity) >= promotion.soluongapdung ? (
                                    `→ Sẽ đạt KM2 khi thêm ${quantity} ${item.don_vi_DH} này vào giỏ`
                                  ) : (
                                    `→ Cần thêm ${promotion.soluongapdung - (quantity + totalPromotionQuantity)} ${item.don_vi_DH} để đạt KM2`
                                  )}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium">Chưa có sản phẩm nào trong giỏ</span>
                                <span className="block mt-0.5 text-blue-600">
                                  {quantity >= promotion.soluongapdung ? (
                                    `→ Sẽ đạt KM2 khi thêm ${quantity} ${item.don_vi_DH} này vào giỏ`
                                  ) : (
                                    `→ Cần ${promotion.soluongapdung - quantity} ${item.don_vi_DH} để đạt KM2`
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {showEditButton && !isEditing && (
            <button
              className="mt-3 px-3 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-150 flex items-center gap-1"
              onClick={handleEditPrice}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
              </svg>
              Sửa giá
            </button>
          )}
        </div>

        {((typeLogin !== 'sale' || window.location.pathname === '/sale-orders')) && (
          <div className="flex flex-col gap-1 lg:gap-1.5 w-full lg:w-[250px] bg-gray-50/50 p-1 lg:p-3 rounded-lg border border-gray-100">
            <div className="quantity-controls flex items-center justify-between gap-1 lg:gap-3">
              <button
                className="w-8 h-8 lg:w-12 lg:h-12 flex items-center justify-center text-gray-700 hover:text-gray-900 border border-gray-300 rounded transition-colors hover:bg-gray-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleQuantityChange(-1 + quantity);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <input
                type="number"
                className="w-16 lg:flex-1 lg:min-w-0 px-1 lg:px-3 py-1 lg:py-2 text-center text-sm lg:text-base font-medium text-gray-700 rounded border border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={quantity === 0 ? 0 : quantity.toString().replace(/^0+/, "")}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                min="1"
                inputMode="numeric"
                style={{ width: inputWidth }}
              />
              <button
                className="w-8 h-8 lg:w-12 lg:h-12 flex items-center justify-center text-gray-700 hover:text-gray-900 border border-gray-300 rounded transition-colors hover:bg-gray-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleQuantityChange(1 + quantity);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>

            <div className="text-right border-t border-gray-200 pt-0.5 lg:pt-2">
              <p className="text-xs lg:text-base text-gray-700">
                Tổng: <span className="font-bold text-gray-900">{isBothPricesZero ? "Liên hệ" : `${formatPrice(totalPrice)}`}</span>
              </p>
            </div>

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
                handleSavePrice();
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

            {/* Nút Xem chi tiết */}
            <button
              className="w-full mt-2 px-2 lg:px-3 py-1 lg:py-2.5 text-xs lg:text-base font-medium rounded-md transition-colors bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center gap-1"
              onClick={() => {
                localStorage.setItem('productDetail', JSON.stringify(item));
                
                // Generate new SEO-friendly URL with hierarchy
                const newUrl = generateProductUrl(item, hierarchy);
                router.push(newUrl);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="lg:w-4 lg:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Xem chi tiết
            </button>

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
                      fetchBundledProductsByGroup(promotion.maNhomSPMuaKem);
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


      {isEditing && (
        <div className="mt-4 bg-gray-100 p-4 rounded-md">
          <div className="mb-3">
            <label
              htmlFor="newPrice"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Giá mới theo{" "}
              {selectedPrice === "regular"
                ? item.don_vi_DH
                : item.crdfd_onvichuantext}
              :
            </label>
            <div className="flex items-stretch w-full">
              <div className="flex-grow relative">
                <input
                  id="newPrice"
                  type="text"
                  value={newPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setNewPrice(value);
                      validatePrice(value);
                    }
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }}
                  inputMode="decimal"
                  className={`w-full px-3 py-2 text-xs border rounded-l-md focus:outline-none focus:ring-2 ${priceError
                      ? "border-red-500 focus:ring-red-500"
                      : "focus:ring-blue-500"
                    }`}
                  placeholder={`Nhập giá mới theo ${selectedPrice === "regular"
                      ? item.don_vi_DH
                      : item.crdfd_onvichuantext
                    }`}
                />
                {priceError && (
                  <p className="absolute text-xs text-red-500 mt-1">
                    {priceError}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center bg-gray-200 px-3 text-xs rounded-r-md whitespace-nowrap">
                <span>
                  đ /{" "}
                  {selectedPrice === "regular"
                    ? item.don_vi_DH
                    : item.crdfd_onvichuantext}
                </span>
              </div>
            </div>
          </div>

          {promotion && newPrice && !priceError && (
            <div className="mb-3">
              {/* <label className="block text-xs font-medium text-gray-700 mb-1">
                Giá khuyến mãi sẽ được áp dụng:
              </label> */}
              {/* <div className="flex items-center bg-green-50 p-2 rounded-md">
                <span className="text-xs text-green-600">
                  {formatPrice(currentDiscountedPrice)} đ /{" "}
                  {selectedPrice === "regular"
                    ? item.don_vi_DH
                    : item.crdfd_onvichuantext}
                </span>
                {promotion.cr1bb_vn === "%" ? (
                  <span className="ml-2 text-xs text-gray-500">
                    (Giảm {promotion.crdfd_value}%)
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-gray-500">
                    (Giảm {formatPrice(promotion.crdfd_value)}đ)
                  </span>
                )}
              </div> */}
            </div>
          )}

          <div className="mb-3">
            <label
              htmlFor="priceChangeReason"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Lý do thay đổi:
            </label>
            <input
              id="priceChangeReason"
              type="text"
              value={priceChangeReason}
              onChange={(e) => {
                const newValue = e.target.value.trimStart();
                setPriceChangeReason(newValue);
              }}
              onBlur={(e) => {
                setPriceChangeReason(e.target.value.trim());
              }}
              className="w-full px-3 py-2 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập lý do thay đổi giá"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              className="px-3 py-1 text-xs bg-gray-400 text-white rounded-md hover:bg-gray-500 transition duration-150"
              onClick={handleCancelEdit}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
      <ToastContainer limit={3} />
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
