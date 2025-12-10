"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import axios from "axios";
import InlineSpinner from "@/components/InlineSpinner";
import { useMediaQuery } from "react-responsive";
import { useToast } from "@/hooks/useToast";
import { TOAST_MESSAGES } from "@/types/toast";
import Products from "@/model/Product";
import Image from "next/image";
import { getItem } from "@/utils/SecureStorage";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
 TopProductsListProps,
} from "../../../../model/interface/TopProductsProps";
import { generateProductUrl } from "@/utils/urlGenerator";
import { useProductGroupHierarchy } from "@/hooks/useProductGroupHierarchy";

interface TopProductPromotion {
  name: string;
  conditions: string;
  value: string;
  value2?: string;
  soluongcondon?: string;
  soluongapdung?: string;
  type: string;
  vn: string;
  promotionId?: string;
  adjustedValue?: string;
  congdonsoluong?: boolean;
  start_date?: string;
  end_date?: string;
  appliedValue?: string;
  isValue2Applied?: boolean;
}

interface TopProduct {
  productId: string;
  crdfd_tensanphamtext: string;
  cr1bb_giaban: string | number;
  cr1bb_imageurl?: string;
  don_vi_DH?: string;
  crdfd_thuonghieu?: string;
  crdfd_quycach?: string;
  _crdfd_productgroup_value?: string;
  crdfd_nhomoituongtext?: string;
  crdfd_hoanthienbemat?: string;
  crdfd_masanpham?: string;
  promotion?: TopProductPromotion;
  crdfd_onvichuantext?: string;
  cr1bb_tylechuyenoi?: string;
  crdfd_giatheovc?: string;
  _crdfd_onvi_value?: string;
  crdfd_gtgt?: number;
}

interface CartPromotion {
  crdfd_value: string;
  cr1bb_vn: string;
  crdfd_name: string;
  value: string;
  value2?: string;
  soluongcondon?: string;
  soluongapdung?: number;
  type: string;
  vn: string;
  promotionId?: string;
  adjustedValue?: string;
  congdonsoluong?: boolean;
  start_date?: string;
  end_date?: string;
  name: string;
  conditions: string;
  appliedValue?: string;
  isValue2Applied?: boolean;
  selectedValue?: string;
}

interface Product extends Omit<Products, 'promotion'> {
  isApplyPromotion?: boolean;
  hasPromotion?: boolean;
  originalPrice?: number;
  promotionType?: string;
  promotion?: CartPromotion;
  soluongapdung?: number;
  soluongcondon?: number;
  promotionId?: string;
}

const TopProductsList: React.FC<TopProductsListProps> = ({
  products,
  onAddToCart,
  isSidebarSearch = false
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hierarchy } = useProductGroupHierarchy();
  const { success, error } = useToast();
  const isProductListPage = pathname === "/product-list";
  
  // Check if any search is active from either sidebar or the header
  const isSearchActive = isSidebarSearch || 
                        (searchParams && searchParams.get('searchTerm')) || 
                        (searchParams && searchParams.get('fullname')) || 
                        (searchParams && searchParams.get('product_group_Id'));

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [localProducts, setLocalProducts] = useState<TopProduct[]>(products || []);
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const [visibleItems, setVisibleItems] = useState(isDesktop ? 5 : 2);
  const [showViewMore, setShowViewMore] = useState(true);
  const itemsPerLoad = isDesktop ? 5 : 2;
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const userType = getItem("type");
  const userId = getItem("id");
  const isLoggedIn = useMemo(() => !!userId && !!userType, [userId, userType]);

  const isDisabled = useCallback(
    (product: TopProduct) => {
      return !product.cr1bb_giaban || userType === "sale" || !isLoggedIn || isAddingToCart;
    },
    [userType, isLoggedIn, isAddingToCart]
  );

  const toggleProductDetails = useCallback((productId: string) => {
    setOpenProduct((prev) => (prev === productId ? null : productId));
  }, []);

  const handleViewDetails = useCallback((product: TopProduct) => {
    const masanpham = product.crdfd_masanpham;
    localStorage.setItem("productDetail", JSON.stringify(product));
    
    // Generate new SEO-friendly URL with hierarchy
    const newUrl = generateProductUrl(product, hierarchy);
    router.push(newUrl);
  }, [router, hierarchy]);

  const handleQuantityChange = useCallback(
    (productId: string, value: number) => {
      const newQuantities = {
        ...quantities,
        [productId]: Math.max(1, value)
      };
      setQuantities(newQuantities);

      // Tìm sản phẩm được thay đổi số lượng
      const changedProduct = localProducts.find(p => p.productId === productId);
      if (changedProduct?.promotion?.promotionId) {
        const currentQuantity = newQuantities[productId] || 1;
        
        // Kiểm tra điều kiện áp dụng value2 cho sản phẩm hiện tại
        const value2 = Number(changedProduct.promotion.value2) || 0;
        const soluongapdung = Number(changedProduct.promotion.soluongapdung) || 0;
        const shouldApplyValue2 = value2 > 0 && soluongapdung > 0 && currentQuantity >= soluongapdung;

        // Cập nhật trạng thái khuyến mãi cho sản phẩm hiện tại
        setLocalProducts(prevProducts => 
          prevProducts.map(product => {
            if (product.productId === productId) {
              return {
                ...product,
                promotion: product.promotion ? {
                  ...product.promotion,
                  isValue2Applied: shouldApplyValue2,
                  appliedValue: shouldApplyValue2 ? product.promotion.value2 : product.promotion.value
                } : undefined
              };
            }
            return product;
          })
        );
      }
    },
    [quantities, localProducts]
  );

  const convertToProduct = useCallback((topProduct: TopProduct): Products => {
    if (!topProduct) {
      throw new Error("Invalid product data");
    }

    const priceValue = typeof topProduct.cr1bb_giaban === 'number' 
      ? topProduct.cr1bb_giaban.toString()
      : topProduct.cr1bb_giaban || "0";

    const originalPrice = Number(priceValue);

    // Promotion conversion
    let promotionData: Products["promotion"] = undefined;
    if (topProduct.promotion) {
      // Sử dụng appliedValue nếu có, nếu không thì dùng value
      const appliedValue = topProduct.promotion.appliedValue || topProduct.promotion.value || "0";
      const isValue2Applied = topProduct.promotion.isValue2Applied || false;
      
      promotionData = {
        crdfd_value: appliedValue,
        value: appliedValue,
        appliedValue: appliedValue,
        cr1bb_vn: topProduct.promotion.vn === "191920000" ? "%" : "đ",
        crdfd_name: topProduct.promotion.name || "",
        soluongapdung: topProduct.promotion.soluongapdung ? Number(topProduct.promotion.soluongapdung) : undefined,
        value2: topProduct.promotion.value2,
        isValue2Applied: isValue2Applied,
        vn: topProduct.promotion.vn,
        promotionId: topProduct.promotion.promotionId,
      } as any;
    }

    return {
      crdfd_name: topProduct.crdfd_tensanphamtext || '',
      unit: topProduct.don_vi_DH || '',
      price: priceValue,
      priceChangeReason: '',
      crdfd_giatheovc: topProduct.crdfd_giatheovc || '',
      isPriceUpdated: false,
      crdfd_thuonghieu: topProduct.crdfd_thuonghieu || '',
      crdfd_quycach: topProduct.crdfd_quycach || '',
      crdfd_chatlieu: '',
      crdfd_hoanthienbemat: topProduct.crdfd_hoanthienbemat || '',
      crdfd_nhomsanphamtext: topProduct.crdfd_nhomoituongtext || '',
      crdfd_productgroup: topProduct._crdfd_productgroup_value || '',
      crdfd_masanpham: topProduct.crdfd_masanpham || '',
      cr1bb_giaban: priceValue,
      cr1bb_giaban_Bg: priceValue,
      cr1bb_nhomsanphamcha: '',
      crdfd_manhomsp: topProduct.crdfd_masanpham || '',
      _crdfd_productgroup_value: topProduct._crdfd_productgroup_value || '',
      crdfd_fullname: topProduct.crdfd_tensanphamtext || '',
      crdfd_productsid: topProduct.productId,
      crdfd_onvichuantext: topProduct.crdfd_onvichuantext || '',
      _crdfd_onvi_value: topProduct._crdfd_onvi_value || '',
      cr1bb_tylechuyenoi: topProduct.cr1bb_tylechuyenoi || '',
      don_vi_DH: topProduct.don_vi_DH || '',
      oldPrice: undefined,
      cr1bb_imageurl: topProduct.cr1bb_imageurl || '',
      cr1bb_banchatgiaphatra: 0,
      crdfd_gtgt_value: 0,
      cr1bb_giakhongvat: 0,
      crdfd_onvichuan: '',
      crdfd_onvi: '',
      crdfd_trangthaihieulucname: '',
      crdfd_trangthaihieuluc: 0,
      cr1bb_imageurlproduct: topProduct.cr1bb_imageurl || '',
      cr1bb_json_gia: undefined,
      crdfd_gia: 0,
      soluongapdung: promotionData?.soluongapdung,
      soluongcondon: topProduct.promotion?.soluongcondon ? Number(topProduct.promotion.soluongcondon) : undefined,
      promotionId: topProduct.promotion?.promotionId,
      promotion: promotionData,
      promotions: undefined,
      crdfd_gtgt: topProduct.crdfd_gtgt ?? 0
    };
  }, []);

  const handleAddToCart = useCallback(
    async (product: TopProduct) => {
      try {
        setIsAddingToCart(true);
        const quantity = quantities[product.productId] || 1;

        // Xử lý promotion trước khi chuyển đổi sản phẩm
        let updatedProduct = { ...product };
        if (updatedProduct.promotion) {
          const baseValue = Number(updatedProduct.promotion.value) || 0;
          const value2 = Number(updatedProduct.promotion.value2) || 0;
          const soluongapdung = Number(updatedProduct.promotion.soluongapdung) || 0;
          const vn = updatedProduct.promotion.vn;

          // Kiểm tra điều kiện áp dụng value2
          let appliedValue = baseValue;
          let isValue2Applied = false;
          
          if (value2 > 0 && soluongapdung > 0 && quantity >= soluongapdung) {
            appliedValue = value2;
            isValue2Applied = true;
          }

          updatedProduct = {
            ...updatedProduct,
            promotion: {
              ...updatedProduct.promotion,
              appliedValue: appliedValue.toString(),
              isValue2Applied: isValue2Applied,
            } as any,
          };
        }
        
        const convertedProduct = convertToProduct(updatedProduct);
        await onAddToCart(convertedProduct, quantity);
        success(TOAST_MESSAGES.SUCCESS.ADD_TO_CART);
      } catch (err) {
        console.error("Error adding to cart:", err);
        error(TOAST_MESSAGES.ERROR.ADD_TO_CART);
      } finally {
        setIsAddingToCart(false);
      }
    },
    [quantities, onAddToCart, convertToProduct, success, error]
  );

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        const customerId = getItem("id");
        // Load dữ liệu song song
        const [topProductsResponse] = await Promise.all([
          axios.get("/api/getTop30ProductsWithPromotion", {
            params: {
              customerId: customerId,
            },
          }),
        ]);

        if (!topProductsResponse.data) {
          throw new Error("No data received from API");
        }
        setLocalProducts(
          Array.isArray(topProductsResponse.data)
            ? topProductsResponse.data
            : []
        );
      } catch (error) {
        console.error(
          "Error fetching top products - fetchTopProducts: ",
          error
        );
        setFetchError(
          error instanceof Error
            ? error
            : new Error("Failed to fetch top products")
        );
        setLocalProducts([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    if (!localProducts?.length) return [];
    return localProducts.slice(0, visibleItems);
  }, [localProducts, visibleItems]);

  const errorMessage = useMemo(() => {
    if (!fetchError) return null;
    return (
      <div className="max-w-sm mx-auto mt-4 bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-red-100 text-red-700 px-3 py-2 text-sm font-semibold">
          Error
        </div>
        <div className="p-3 text-sm">
          <p>An error occurred: {fetchError.message}</p>
        </div>
      </div>
    );
  }, [fetchError]);

  const headerSection = useMemo(
    () => (
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-base font-bold text-gray-700">
            SẢN PHẨM BÁN CHẠY
          </span>          
        </div>
      </div>
    ),
    []
  );

  const calculatePromotionPrice = useCallback(
    (originalPrice: number, promotion: any, quantity: number = 1) => {
      if (!promotion) return originalPrice;

      const price = Number(originalPrice);
      if (isNaN(price) || price <= 0) return originalPrice;

      // Lấy các giá trị khuyến mãi
      const baseValue = Number(promotion.value) || 0;
      const value2 = Number(promotion.value2) || 0;
      const soluongapdung = Number(promotion.soluongapdung) || 0;
      
      // Xác định giá trị khuyến mãi dựa trên số lượng
      let promotionValue = baseValue;
      
      // Nếu có value2 và đủ số lượng, áp dụng value2
      if (!isNaN(value2) && value2 > 0 && soluongapdung > 0 && quantity >= soluongapdung) {
        promotionValue = value2;
      }

      const vn = Number(promotion.vn);
      let finalPrice = price;

      switch (vn) {
        case 191920001: // Giảm trực tiếp
          finalPrice = price - promotionValue;
          break;
        case 191920000: // Giảm theo phần trăm
          finalPrice = price * (1 - promotionValue / 100);
          break;
        default:
          return originalPrice;
      }

      return Math.max(0, Math.round(finalPrice));
    },
    []
  );

  const renderPrice = useCallback((product: TopProduct) => {
    if (!product.cr1bb_giaban) return "Liên hệ CSKH";

    const originalPrice = Number(product.cr1bb_giaban);
    const quantity = quantities[product.productId] || 1;

    // Nếu chưa đăng nhập, chỉ hiển thị giá gốc
    if (!isLoggedIn) {
      return (
        <div className="flex flex-col">
          <div className="flex items-baseline">
            <span className="text-sm font-bold text-gray-700">
              {originalPrice.toLocaleString()}đ
            </span>
            <span className="text-xs text-gray-700 ml-1">
              /{product.don_vi_DH}
            </span>
          </div>
        </div>
      );
    }

    // Tính giá sau khuyến mãi
    let finalPrice = originalPrice;
    let promotionValue = 0;
    let isValue2Applied = false;

    if (product.promotion) {
      const baseValue = Number(product.promotion.value) || 0;
      const value2 = Number(product.promotion.value2) || 0;
      const soluongapdung = Number(product.promotion.soluongapdung) || 0;
      const vn = product.promotion.vn;

      // Xác định giá trị khuyến mãi dựa trên số lượng
      if (value2 > 0 && soluongapdung > 0 && quantity >= soluongapdung) {
        promotionValue = value2;
        isValue2Applied = true;
      } else {
        promotionValue = baseValue;
        isValue2Applied = false;
      }

      // Áp dụng khuyến mãi
      if (Number(vn) === 191920000) { // Giảm theo %
        finalPrice = Math.round(originalPrice * (1 - promotionValue / 100));
      } else { // Giảm trực tiếp
        finalPrice = Math.round(originalPrice - promotionValue);
      }

      return (
        <div className="flex flex-col space-y-2">
          <div className="flex items-baseline">
            <span className="text-sm font-bold text-green-600">
              {finalPrice.toLocaleString()}đ
            </span>
            <span className="text-xs text-gray-700 ml-1">
              /{product.don_vi_DH}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 line-through">
                {originalPrice.toLocaleString()}đ
              </span>
              <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">
                -
                {Number(vn) === 191920000
                  ? `${promotionValue}%`
                  : `${promotionValue.toLocaleString()}đ`}
              </span>
            </div>
            {value2 > 0 && soluongapdung > 0 && (
              <div className={`text-xs ${isValue2Applied ? 'text-green-600 bg-green-100' : 'text-blue-600 bg-blue-100'} px-2 py-1 rounded w-full`}>
                <div className="truncate">
                  {quantity > 0 ? `(${quantity}/${soluongapdung}) ` : ''}
                  Mua {soluongapdung}+: -
                  {Number(vn) === 191920000
                    ? `${value2}%`
                    : `${value2.toLocaleString()}đ`}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Hiển thị giá cho sản phẩm không có khuyến mãi
    return (
      <div className="flex flex-col">
        <div className="flex items-baseline">
          <span className="text-sm font-bold text-gray-700">
            {originalPrice.toLocaleString()}đ
          </span>
          <span className="text-xs text-gray-700 ml-1">
            /{product.don_vi_DH}
          </span>
        </div>
      </div>
    );
  }, [quantities, isLoggedIn]);

  const renderProductCard = useCallback(
    (product: TopProduct, index: number) => (
      <div
        key={product.productId}
        className="relative bg-white rounded-lg border border-gray-200 hover:border-[#003C71] hover:shadow-md transition-all duration-300 group p-4 min-w-[240px] w-full h-full flex flex-col"
      >
        {isLoggedIn && product.promotion && (
          <div className="absolute -right-1 -top-1 z-10">
            <div className="relative animate-bounce-gentle">
              <div className="bg-gradient-to-br from-red-500 to-red-600 text-white text-[9px] font-medium py-0.5 px-2 rounded-md relative overflow-hidden">
                <span className="relative z-10 drop-shadow-sm">SALE</span>
                {/* Shine effect */}
                <div className="absolute inset-0 w-full h-full">
                  <div className="absolute top-0 left-[-100%] h-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent transform skew-x-[25deg] animate-shine"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="relative w-full h-48 overflow-hidden rounded-lg flex-shrink-0">
          <Image
            src={/via\.placeholder\.com/i.test(product.cr1bb_imageurl || "") ? "/placeholder-image.jpg" : (product.cr1bb_imageurl || "/placeholder-image.jpg")}
            alt={product.crdfd_tensanphamtext}
            fill
            className="object-contain p-2"
            loading="lazy"
            quality={90}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
          />
        </div>

        <div className="flex-1 flex flex-col space-y-3 pt-3">
          <h3 className="text-sm font-medium text-gray-700 line-clamp-2 group-hover:text-gray-700 leading-tight flex-shrink-0">
            {product.crdfd_tensanphamtext}
          </h3>
          {/* <div className="text-[10px] text-red-600">Mã SP: {product.crdfd_masanpham || product.productId}</div> */}

          <div className="flex items-baseline text-gray-700 flex-shrink-0">
            {renderPrice(product)}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleProductDetails(product.productId)}
              className="text-[10px] sm:text-xs text-gray-500 hover:text-[#003C71] flex items-center "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 transform translate-y-[-10px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="transform translate-y-[-10px] leading-[0]">
                {" "}
                {openProduct === product.productId
                  ? "Ẩn thông tin"
                  : "Xem thông tin"}
              </span>
            </button>
          </div>
        </div>

        {openProduct === product.productId && (
          <div className="mt-1 text-[10px] sm:text-xs space-y-1 border-t border-gray-100 pt-1">
            {product.crdfd_thuonghieu && (
              <div className="flex">
                <span className="font-medium text-gray-600 min-w-[70px] flex-shrink-0">Thương hiệu:</span>
                <span className="text-gray-800 flex-1">
                  {product.crdfd_thuonghieu}
                </span>
              </div>
            )}
            {product.crdfd_quycach && (
              <div className="flex">
                <span className="font-medium text-gray-600 min-w-[70px] flex-shrink-0">Quy cách:</span>
                <span className="text-gray-700 flex-1">{product.crdfd_quycach}</span>
              </div>
            )}
            {product.crdfd_hoanthienbemat && (
              <div className="flex">
                <span className="font-medium text-gray-600 min-w-[70px] flex-shrink-0">Hoàn thiện:</span>
                <span className="text-gray-700 flex-1">
                  {product.crdfd_hoanthienbemat}
                </span>
              </div>
            )}
            {isLoggedIn && product.promotion && (
              <div className="mt-2 border-t border-gray-100 pt-1">
                <div className="font-medium text-gray-600">Chương trình KM:</div>
                <div className="text-blue-600 mt-0.5 pl-2">{product.promotion.name}</div>
                {product.promotion.value2 && product.promotion.soluongapdung && (
                  <div className="text-gray-600 mt-0.5 pl-2 text-xs">
                    Mua từ {product.promotion.soluongapdung} {product.don_vi_DH || 'sản phẩm'} để được giảm thêm {Number(product.promotion.vn) === 191920000 ? `${Number(product.promotion.value2)}%` : `${Number(product.promotion.value2).toLocaleString()}đ`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto space-y-3 pt-4">
          {/* View Details Button */}
          <button
            onClick={() => handleViewDetails(product)}
            className="w-full group relative px-3 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ease-out hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
          >
            <span className="flex items-center gap-1.5 text-gray-600 group-hover:text-gray-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>Xem chi tiết</span>
            </span>
          </button>

          {/* Add to Cart Section */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded-md overflow-hidden min-w-[120px]">
              <button
                onClick={() =>
                  handleQuantityChange(
                    product.productId,
                    (quantities[product.productId] || 1) - 1
                  )
                }
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 border-r border-gray-200"
                disabled={isDisabled(product)}
              >
                <span className="text-gray-600 text-sm">−</span>
              </button>
              <input
                type="number"
                min="1"
                value={quantities[product.productId] || 1}
                onChange={(e) =>
                  handleQuantityChange(
                    product.productId,
                    parseInt(e.target.value)
                  )
                }
                onFocus={(e) => e.target.select()}
                className="w-14 h-10 text-center focus:outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={isDisabled(product)}
              />
              <button
                onClick={() =>
                  handleQuantityChange(
                    product.productId,
                    (quantities[product.productId] || 1) + 1
                  )
                }
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 border-l border-gray-200"
                disabled={isDisabled(product)}
              >
                <span className="text-gray-600 text-sm">+</span>
              </button>
            </div>
            <button
              onClick={() => {
                handleAddToCart(product);
              }}
              disabled={isDisabled(product)}
              className="group relative flex-1 px-3 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed break-words min-h-[40px]"
            >
              <span className="absolute inset-0 w-full h-full rounded-md border border-[#003C71] group-hover:bg-[#003C71]/10 transition-all duration-200 ease-out group-disabled:border-gray-200"></span>
              <span className="relative flex items-center gap-1.5 text-[#003C71] group-disabled:text-gray-400 break-words text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h14l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    ),
    [
      quantities,
      handleQuantityChange,
      handleAddToCart,
      handleViewDetails,
      isDisabled,
      renderPrice,
      openProduct,
      toggleProductDetails,
    ]
  );

  const handleLoadMore = useCallback(() => {
    setVisibleItems((prev) => {
      const nextValue = prev + itemsPerLoad;
      if (nextValue >= (localProducts ? localProducts.length : 0)) {
        setShowViewMore(false);
      }
      return nextValue;
    });
  }, [itemsPerLoad, localProducts]);

  const isMobile = useMediaQuery({ query: "(max-width: 640px)" });

  const ITEMS_PER_PAGE = {
    initial: isMobile ? 2 : 10, // Show 2 items initially on mobile
    increment: isMobile ? 1 : 5, // Load 1 item at a time on mobile
  };

  // Thêm useEffect để cập nhật visibleItems khi thay đổi viewport
  useEffect(() => {
    setVisibleItems(isMobile ? 8 : 15);
  }, [isMobile]);

  // Hide component if on product list page or if search is active
  if (isProductListPage || isSearchActive) {
    return null;
  }

  if (loading) return <InlineSpinner />;
  if (fetchError) return errorMessage;

  return isDesktop ? (
    <>
      <div className="py-4 px-4 bg-gray-50 sm:space-y-2 lg:mr-3 mb-3">
        {headerSection}
        {fetchError ? (
          errorMessage
        ) : (
          <>
            <div
              className={`grid ${
                isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              } gap-4 sm:gap-6 auto-rows-fr`}
            >
              {visibleProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className={`${
                    isMobile
                      ? "flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200"
                      : ""
                  }`}
                >
                  {isMobile ? (
                    <>
                      <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={/via\.placeholder\.com/i.test(product.cr1bb_imageurl || "") ? "/placeholder-image.jpg" : (product.cr1bb_imageurl || "/placeholder-image.jpg")}
                          alt={product.crdfd_tensanphamtext}
                          fill
                          className="object-contain p-1"
                          loading="lazy"
                          quality={90}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority={false}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-sm font-medium text-gray-700 line-clamp-2">
                            {product.crdfd_tensanphamtext}
                          </h3>
                        </div>
                        <div className="mt-1 flex items-baseline gap-0.5 sm:gap-1">
                          {renderPrice(product)}
                        </div>
                        <div className="mt-auto space-y-3 pt-4">
                          {/* View Details Button for Mobile */}
                          <button
                            onClick={() => handleViewDetails(product)}
                            className="w-full group relative px-3 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ease-out hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
                          >
                            <span className="flex items-center gap-1.5 text-gray-600 group-hover:text-gray-800">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              <span>Xem chi tiết</span>
                            </span>
                          </button>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-gray-200 rounded-md overflow-hidden min-w-[120px]">
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    product.productId,
                                    (quantities[product.productId] || 1) - 1
                                  )
                                }
                                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 border-r border-gray-200"
                                disabled={isDisabled(product)}
                              >
                                <span className="text-gray-600">−</span>
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={quantities[product.productId] || 1}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    product.productId,
                                    parseInt(e.target.value)
                                  )
                                }
                                onFocus={(e) => e.target.select()}
                                className="w-14 h-10 text-center focus:outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={isDisabled(product)}
                              />
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    product.productId,
                                    (quantities[product.productId] || 1) + 1
                                  )
                                }
                                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 border-r border-gray-200"
                                disabled={isDisabled(product)}
                              >
                                <span className="text-gray-600 font-bold text-lg">+</span>
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                handleAddToCart(product);
                              }}
                              disabled={isDisabled(product)}
                              className="group relative flex-1 px-3 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed break-words min-h-[40px]"
                            >
                              <span className="absolute inset-0 w-full h-full rounded-md border border-[#003C71] group-hover:bg-[#003C71]/10 transition-all duration-200 ease-out group-disabled:border-gray-200"></span>
                              <span className="relative flex items-center gap-1.5 text-[#003C71] group-disabled:text-gray-400 break-words text-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 3h2l.4 2M7 13h14l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    renderProductCard(product, index)
                  )}
                </div>
              ))}
            </div>

            {showViewMore && localProducts.length > visibleItems && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium tracking-wide text-gray-700 hover:text-white transition-all duration-200 ease-out"
                >
                  <span className="absolute inset-0 w-full h-full rounded-full border border-[#04A1B3] group-hover:bg-[#04A1B3] transition-all duration-200 ease-out"></span>
                  <span className="relative flex items-center gap-1.5">
                    Xem thêm
                    <svg
                      className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-y-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  ) : (
    <>
      <div className="py-4 px-4 bg-gray-50 sm:space-y-2">
        {headerSection}
        {fetchError ? (
          errorMessage
        ) : (
          <>
            <div
              className={`grid ${
                isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              } gap-4 sm:gap-6 auto-rows-fr`}
            >
              {visibleProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className={`${
                    isMobile
                      ? "flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200"
                      : ""
                  }`}
                >
                  {isMobile ? (
                    <>
                      <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={/via\.placeholder\.com/i.test(product.cr1bb_imageurl || "") ? "/placeholder-image.jpg" : (product.cr1bb_imageurl || "/placeholder-image.jpg")}
                          alt={product.crdfd_tensanphamtext}
                          fill
                          className="object-contain p-1"
                          loading="lazy"
                          quality={90}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority={false}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-sm font-medium text-gray-700 line-clamp-2">
                            {product.crdfd_tensanphamtext}
                          </h3>
                        </div>
                        <div className="mt-1 flex items-baseline gap-0.5 sm:gap-1">
                          {renderPrice(product)}
                        </div>
                        <div className="mt-auto space-y-3 pt-4">
                          {/* View Details Button for Mobile */}
                          <button
                            onClick={() => handleViewDetails(product)}
                            className="w-full group relative px-3 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ease-out hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
                          >
                            <span className="flex items-center gap-1.5 text-gray-600 group-hover:text-gray-800">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              <span>Xem chi tiết</span>
                            </span>
                          </button>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-gray-200 rounded-md overflow-hidden min-w-[120px]">
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    product.productId,
                                    (quantities[product.productId] || 1) - 1
                                  )
                                }
                                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 border-r border-gray-200"
                                disabled={isDisabled(product)}
                              >
                                <span className="text-gray-600">−</span>
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={quantities[product.productId] || 1}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    product.productId,
                                    parseInt(e.target.value)
                                  )
                                }
                                onFocus={(e) => e.target.select()}
                                className="w-14 h-10 text-center focus:outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={isDisabled(product)}
                              />
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    product.productId,
                                    (quantities[product.productId] || 1) + 1
                                  )
                                }
                                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 border-r border-gray-200"
                                disabled={isDisabled(product)}
                              >
                                <span className="text-gray-600 font-bold text-lg">+</span>
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                handleAddToCart(product);
                              }}
                              disabled={isDisabled(product)}
                              className="group relative flex-1 px-3 py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed break-words min-h-[40px]"
                            >
                              <span className="absolute inset-0 w-full h-full rounded-md border border-[#003C71] group-hover:bg-[#003C71]/10 transition-all duration-200 ease-out group-disabled:border-gray-200"></span>
                              <span className="relative flex items-center gap-1.5 text-[#003C71] group-disabled:text-gray-400 break-words text-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 3h2l.4 2M7 13h14l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    renderProductCard(product, index)
                  )}
                </div>
              ))}
            </div>

            {showViewMore && localProducts.length > visibleItems && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium tracking-wide text-gray-700 hover:text-white transition-all duration-200 ease-out"
                >
                  <span className="absolute inset-0 w-full h-full rounded-full border border-[#04A1B3] group-hover:bg-[#04A1B3] transition-all duration-200 ease-out"></span>
                  <span className="relative flex items-center gap-1.5">
                    Xem thêm
                    <svg
                      className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-y-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default React.memo(TopProductsList);
      