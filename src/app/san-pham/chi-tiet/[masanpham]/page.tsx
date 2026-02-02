"use client";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState, useContext } from "react";
import Footer from "@/components/footer";
import { FaHome } from "react-icons/fa";
import JDStyleHeader from "@/components/JDStyleHeader";
import { useToast } from "@/hooks/useToast";
import { TOAST_MESSAGES } from "@/types/toast";
import axios from "axios";
import { getItem } from "@/utils/SecureStorage";
import { useCart } from "@/components/CartManager";
import { useRouter } from "next/navigation";
import RelatedProductsSection from "../_components/RelatedProductsSection";
import { useRelatedProducts } from "@/hooks/useRelatedProducts";
import { CartContext } from "@/components/CartGlobalManager";
import { generateProductUrl } from "@/utils/urlGenerator";



export default function ProductDetailPage({ params }: { params: any }) {
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [promotion, setPromotion] = useState<any>(null);
  const [isLoadingPromotion, setIsLoadingPromotion] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { cartItems, addToCart, updateQuantity, removeItem } = useCart();
  const { openCart } = useContext(CartContext);
  const router = useRouter();
  const { success, error } = useToast();
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [isLoadingTopProducts, setIsLoadingTopProducts] = useState(true);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(true);
  // Các hook cho sản phẩm mua kèm phải đặt ở đây (không đặt trong render)
  const [showBundledProductsModal, setShowBundledProductsModal] = useState(false);
  const [bundledProducts, setBundledProducts] = useState<any[]>([]);
  const [isLoadingBundledProducts, setIsLoadingBundledProducts] = useState(false);

  // Sử dụng custom hook cho sản phẩm liên quan
  const { products: relatedProducts, isLoading: isLoadingRelatedProducts, error: relatedProductsError, refetch: refetchRelatedProducts } = useRelatedProducts(product);

  useEffect(() => {
    const data = localStorage.getItem("productDetail");
    if (data) {
      const parsedProduct = JSON.parse(data);
      setProduct(parsedProduct);

      // Check if we should redirect to new SEO URL
      // Only redirect if we're accessing via old URL format
      const currentPath = window.location.pathname;
      if (currentPath.includes('/san-pham/chi-tiet/') || currentPath.match(/^\/SP-\d+$/)) {
        // Generate new SEO URL
        const newUrl = generateProductUrl(parsedProduct);

        // Only redirect if the new URL is different from current
        if (newUrl !== currentPath) {
          // Use replace to avoid adding to browser history
          window.history.replaceState(null, '', newUrl);
        }
      }
    }
  }, []);

  // Fetch promotion khi có product và đã đăng nhập
  useEffect(() => {
    const fetchPromotion = async () => {
      if (!product) return;
      const userId = getItem("id");
      if (!userId) return;
      setIsLoadingPromotion(true);
      try {
        const res = await axios.get(`/api/getPromotionDataNewVersion?id=${userId}`);
        const promotionData = res.data;
        if (!promotionData || !Array.isArray(promotionData)) return;
        // Tìm tất cả promotion hợp lệ
        let validPromotions: any[] = [];
        for (const group of promotionData) {
          if (!group.promotions) continue;
          for (const promo of group.promotions) {
            let isValid = false;
            if (promo.productCodes) {
              const codes = promo.productCodes.split(',').map((c: string) => c.trim());
              if (codes.includes(product.crdfd_masanpham)) isValid = true;
            }
            if (!isValid && promo.productGroupCodes) {
              const groupCodes = promo.productGroupCodes.split(',').map((c: string) => c.trim());
              if (groupCodes.includes(product.crdfd_manhomsp)) isValid = true;
            }
            if (isValid) {
              // Tính discountValue để chọn promotion tốt nhất
              const basePrice = getProductBasePrice(product);
              let discountValue = 0;
              if (promo.vn === 191920000) {
                discountValue = basePrice * (parseFloat(promo.value) / 100);
              } else {
                discountValue = parseFloat(promo.value);
              }
              validPromotions.push({ ...promo, discountValue });
            }
          }
        }
        // Chọn promotion giá trị cao nhất
        if (validPromotions.length > 0) {
          validPromotions.sort((a, b) => b.discountValue - a.discountValue);
          setPromotion(validPromotions[0]);
        }
      } catch (err) {
        // ignore
      } finally {
        setIsLoadingPromotion(false);
      }
    };
    fetchPromotion();
  }, [product]);

  // Helper: Lấy giá từ cr1bb_json_gia nếu có, nếu không thì lấy cr1bb_giaban
  const getProductBasePrice = (product: any): number => {
    // Ưu tiên lấy giá từ cr1bb_json_gia (nếu có và hợp lệ)
    if (product?.cr1bb_json_gia) {
      let giaArr = product.cr1bb_json_gia;
      if (typeof giaArr === 'string') {
        try {
          giaArr = JSON.parse(giaArr);
        } catch { }
      }
      if (Array.isArray(giaArr) && giaArr.length > 0) {
        // Lấy giá thấp nhất còn hiệu lực
        const valid = giaArr.filter((g: any) => g.crdfd_trangthaihieulucname === 'Còn hiệu lực' || g.crdfd_trangthaihieuluc === 191920000);
        const sorted = (valid.length > 0 ? valid : giaArr).sort((a: any, b: any) => {
          const pa = Number(a.crdfd_giatheovc || a.crdfd_gia || 0);
          const pb = Number(b.crdfd_giatheovc || b.crdfd_gia || 0);
          return pa - pb;
        });
        const price = Number(sorted[0]?.crdfd_giatheovc || sorted[0]?.crdfd_gia || 0);
        if (price > 0) return price;
      }
    }
    // Fallback: lấy cr1bb_giaban
    return Number(product?.cr1bb_giaban || 0);
  };

  // Thêm hàm tính tổng giá trị các sản phẩm thuộc productCodes (cho tongTienApDung)
  const getTotalProductValue = () => {
    if (!promotion?.productCodes || !promotion?.tongTienApDung) return 0;
    const codes = promotion.productCodes.split(',').map((c: string) => c.trim());
    // Tổng giá trị các sản phẩm trong giỏ hàng thuộc codes
    const cartTotal = cartItems
      .filter((cartItem: any) => codes.includes(cartItem.crdfd_masanpham))
      .reduce((sum: number, cartItem: any) => sum + (parseFloat(cartItem.price) * (cartItem.quantity || 1)), 0);
    // Giá trị sản phẩm hiện tại (nếu thuộc codes)
    const currentValue = codes.includes(product.crdfd_masanpham)
      ? getProductBasePrice(product) * quantity
      : 0;
    return cartTotal + currentValue;
  };

  // Thêm các hàm tính toán khuyến mãi giống ProductDetailPopup .tsx
  const parsePrice = (price: string | number | null | undefined): number => {
    if (typeof price === "number") return price;
    if (typeof price === "string") return parseFloat(price) || 0;
    return 0;
  };

  // Cộng dồn số lượng sản phẩm cùng promotionId trong giỏ hàng
  const getTotalPromotionQuantity = () => {
    if (!promotion) return 0;
    const promotionId = promotion.crdfd_promotionid || promotion.promotionId;
    const productCodes = (promotion.productCodes || "").split(",").map((c: string) => c.trim());
    return cartItems.reduce((total: number, cartItem: any) => {
      if (
        cartItem.promotion?.promotionId === promotionId &&
        cartItem.promotion?.congdonsoluong &&
        promotion.congdonsoluong &&
        productCodes.includes(cartItem.crdfd_masanpham)
      ) {
        return total + (cartItem.quantity || 0);
      }
      return total;
    }, 0);
  };

  // Sửa lại hàm tính giá khuyến mãi để ưu tiên tongTienApDung nếu có
  const calculateDiscountedPrice = (basePrice: number, promo: any, totalQty: number) => {
    if (!promo) return basePrice;
    // --- Ưu tiên logic tongTienApDung ---
    if (promo.tongTienApDung && promo.productCodes) {
      const totalValue = getTotalProductValue();
      const tongTienApDungNum = parseFloat(promo.tongTienApDung);
      let promotionValue = totalValue >= tongTienApDungNum ? promo.value2 : promo.value;
      if (promo.vn === 191920000) {
        return basePrice * (1 - parseFloat(promotionValue) / 100);
      } else {
        return basePrice - parseFloat(promotionValue);
      }
    }
    // --- Logic cũ theo số lượng ---
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
      finalPrice = basePrice * (1 - discountPercent / 100);
    } else {
      finalPrice = basePrice - parseFloat(promotionValue);
    }
    return Math.max(0, finalPrice);
  };

  // Sửa lại getPromotionDisplay để ưu tiên logic tongTienApDung
  const getPromotionDisplay = () => {
    if (!promotion) return null;
    const basePrice = getProductBasePrice(product);
    const totalPromotionQuantity = getTotalPromotionQuantity();
    // --- Ưu tiên logic tongTienApDung ---
    if (promotion.tongTienApDung && promotion.productCodes) {
      const totalProductValue = getTotalProductValue();
      const tongTienApDungNum = parseFloat(promotion.tongTienApDung);
      const isValue2Applied = totalProductValue >= tongTienApDungNum;
      const discountValue = isValue2Applied ? promotion.value2 : promotion.value;
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
        kmLabel,
        finalPrice: discountedPrice
      };
    }
    // --- Logic cũ theo số lượng ---
    let discountValue, conditionText, kmLabel;
    if (promotion.soluongapdungmuc3 && quantity + totalPromotionQuantity >= promotion.soluongapdungmuc3) {
      discountValue = promotion.value3;
      conditionText = `(Áp dụng cho đơn từ ${promotion.soluongapdungmuc3} ${product.don_vi_DH})`;
      kmLabel = "Giá KM 3";
    } else if (promotion.congdonsoluong && promotion.soluongapdung && quantity + totalPromotionQuantity >= promotion.soluongapdung) {
      discountValue = promotion.value2 || promotion.value;
      conditionText = `(Áp dụng cho đơn từ ${promotion.soluongapdung} ${product.don_vi_DH})`;
      kmLabel = "Giá KM 2";
    } else {
      discountValue = promotion.value;
      conditionText = promotion.congdonsoluong && promotion.soluongapdung
        ? `(Giảm thêm khi mua từ ${promotion.soluongapdung} ${product.don_vi_DH})`
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
      kmLabel,
      finalPrice
    };
  };



  // Fetch sản phẩm bán chạy
  useEffect(() => {
    const fetchTopProducts = async () => {
      // Đầu tiên, kiểm tra cache
      const cacheKey = 'topProductsCache';
      const cacheStr = sessionStorage.getItem(cacheKey);
      let cache: { data: any[]; timestamp: number } | null = null;
      if (cacheStr) {
        try { cache = JSON.parse(cacheStr); } catch { }
      }
      if (cache && Date.now() - cache.timestamp < 5 * 60 * 1000 && Array.isArray(cache.data) && cache.data.length > 0) {
        setTopProducts(cache.data);
        setIsLoadingTopProducts(false); // Không loading nếu có cache
        return;
      }
      setIsLoadingTopProducts(true);
      try {
        const res = await axios.get('/api/getTop30ProductsWithPromotion');
        const products = res.data || [];
        if (products.length > 0) {
          const topProductsData = products.slice(0, 5);
          setTopProducts(topProductsData);
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: topProductsData, timestamp: Date.now() }));
        }
      } catch (err) {
        // ignore
      } finally {
        setIsLoadingTopProducts(false);
      }
    };
    fetchTopProducts();
  }, []);

  // Fetch khuyến mãi mới
  useEffect(() => {
    const fetchPromotions = async () => {
      setIsLoadingPromotions(true);
      try {
        // Caching: 5 phút
        const cacheKey = 'promotionsCache';
        const cacheStr = sessionStorage.getItem(cacheKey);
        let cache: { data: any[]; timestamp: number } | null = null;
        if (cacheStr) {
          try { cache = JSON.parse(cacheStr); } catch { }
        }
        if (cache && Date.now() - cache.timestamp < 5 * 60 * 1000) {
          setPromotions(cache.data);
          setIsLoadingPromotions(false);
          return;
        }
        const res = await axios.get('/api/getPromotionDataNewVersion?id=fd9b248e-d610-ee11-8f6e-000d3a08d940');
        const promotionData = res.data || [];
        if (promotionData && Array.isArray(promotionData)) {
          let allPromotions: any[] = [];
          promotionData.forEach((group: any) => {
            if (group.promotions && Array.isArray(group.promotions)) {
              allPromotions = allPromotions.concat(group.promotions);
            }
          });
          const uniquePromotions = allPromotions.filter((promotion, index, self) => {
            const promotionId = promotion.crdfd_promotionid || promotion.promotionId;
            return index === self.findIndex(p => (p.crdfd_promotionid || p.promotionId) === promotionId);
          });
          const sortedPromotions = uniquePromotions
            .sort((a: any, b: any) => {
              const dateA = new Date(a.createdon || 0);
              const dateB = new Date(b.createdon || 0);
              return dateB.getTime() - dateA.getTime();
            })
            .slice(0, 3);
          setPromotions(sortedPromotions);
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: sortedPromotions, timestamp: Date.now() }));
        }
      } catch (err) {
        // ignore
      } finally {
        setIsLoadingPromotions(false);
      }
    };
    fetchPromotions();
  }, []);

  // Sử dụng custom hook đã xử lý việc fetch sản phẩm liên quan

  if (!product)
    return (
      <div className="p-8 text-center">Không tìm thấy thông tin sản phẩm.</div>
    );

  // Hàm format giá giống ProductDetailPopup
  const formatPrice = (price: string | number | null | undefined) => {
    if (!price || price === 0 || price === "0" || price === "null" || price === "undefined") {
      return "Liên hệ chăm sóc khách hàng";
    }
    const numPrice = parseFloat(price.toString());
    if (isNaN(numPrice) || numPrice === 0) {
      return "Liên hệ chăm sóc khách hàng";
    }
    return `${Math.round(numPrice).toLocaleString()} đ`;
  };

  const handleAddToCart = () => {
    if (quantity <= 0) {
      error(TOAST_MESSAGES.ERROR.QUANTITY_INVALID);
      return;
    }

    if (!product) {
      error("Không tìm thấy thông tin sản phẩm");
      return;
    }

    const userId = getItem("id");
    const userType = getItem("type");

    if (!userId || !userType) {
      error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng");
      return;
    }

    // Kiểm tra giá sản phẩm - sử dụng giá gốc, không phải giá đã giảm
    const originalPrice = getProductBasePrice(product);

    if (!originalPrice || originalPrice === 0) {
      error("Sản phẩm này hiện không có giá. Vui lòng liên hệ chăm sóc khách hàng để được báo giá.");
      return;
    }

    try {
      setIsAddingToCart(true);

      // Đảm bảo sản phẩm có đầy đủ các trường cần thiết cho interface Products
      const finalUnitPrice = (() => {
        if (promotion) {
          const display = getPromotionDisplay();
          if (display && typeof display.finalPrice === 'number') {
            return display.finalPrice;
          }
        }
        return originalPrice;
      })();
      const productToAdd = {
        ...product,
        crdfd_productsid: product.crdfd_productsid || product.productId || product.crdfd_masanpham,
        crdfd_name: product.crdfd_name || product.crdfd_fullname || product.crdfd_tensanphamtext,
        crdfd_fullname: product.crdfd_fullname || product.crdfd_name || product.crdfd_tensanphamtext,
        crdfd_masanpham: product.crdfd_masanpham || product.productId,
        // Sử dụng giá gốc cho cr1bb_giaban
        cr1bb_giaban: originalPrice?.toString() || "0",
        // Sử dụng giá đã giảm cho price (nếu có khuyến mãi)
        price: finalUnitPrice !== null && finalUnitPrice !== undefined ? finalUnitPrice.toString() : originalPrice?.toString() || "0",
        _crdfd_productgroup_value: product._crdfd_productgroup_value || product.crdfd_manhomsp || "",
        crdfd_thuonghieu: product.crdfd_thuonghieu || "",
        crdfd_quycach: product.crdfd_quycach || "",
        crdfd_hoanthienbemat: product.crdfd_hoanthienbemat || "",
        crdfd_nhomsanphamtext: product.crdfd_nhomsanphamtext || product.crdfd_nhomoituongtext || "",
        crdfd_chatlieu: product.crdfd_chatlieu || "",
        cr1bb_imageurl: product.cr1bb_imageurl || "",
        cr1bb_imageurlproduct: product.cr1bb_imageurlproduct || product.cr1bb_imageurl || "",
        don_vi_DH: product.don_vi_DH || product.crdfd_onvichuantext || "",
        crdfd_onvichuantext: product.crdfd_onvichuantext || product.don_vi_DH || "",
        _crdfd_onvi_value: product._crdfd_onvi_value || "",
        cr1bb_tylechuyenoi: product.cr1bb_tylechuyenoi || "",
        crdfd_gtgt: product.crdfd_gtgt || 0,
        promotion: promotion ? {
          ...promotion,
          promotionId: promotion.crdfd_promotionid || promotion.promotionId || "",
          value: promotion.value || promotion.crdfd_value || "0",
          cr1bb_vn: promotion.vn === 191920000 ? "%" : "đ",
          name: promotion.name || promotion.crdfd_name || "",
          conditions: promotion.conditions || "",
          discountAmount: promotion.vn === 191920000
            ? `${Math.round(originalPrice * (parseFloat(promotion.value) / 100))}`
            : `${promotion.value}`
        } : null,
        isApplyPromotion: !!promotion
      };

      addToCart(productToAdd, quantity);
      success(TOAST_MESSAGES.SUCCESS.ADD_TO_CART);

    } catch (err) {
      console.error("Lỗi khi thêm vào giỏ hàng:", err);
      error(TOAST_MESSAGES.ERROR.ADD_TO_CART);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const promoDisplay = getPromotionDisplay();

  // Chuẩn bị UI cho sản phẩm mua kèm (nút xem, modal, fetch API)
  const fetchBundledProducts = async (productCode: string) => {
    try {
      setIsLoadingBundledProducts(true);
      const response = await axios.get(`/api/getBundledProducts?productCode=${productCode}`);
      setBundledProducts(response.data);
    } catch (error) {
      // handle error
    } finally {
      setIsLoadingBundledProducts(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <JDStyleHeader
        cartItemsCount={cartItems.length}
        onSearch={() => { }}
        onCartClick={openCart}
      />

      <main className="max-w-7xl mx-auto px-4 pb-4 pt-32" style={{ marginTop: '95px' }}>
        {/* Breadcrumb */}
        <nav className="mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <FaHome className="w-4 h-4 mr-2" />
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => router.push("/san-pham")}>Sản phẩm</span>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium truncate">
              {product?.crdfd_name || product?.crdfd_fullname || product?.crdfd_tensanphamtext}
            </span>
          </div>
        </nav>

        {/* Main Product Layout - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Product Gallery */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-[13px]">
              {/* Main Product Image */}
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-50 relative">
                <img
                  src={((): string => {
                    const raw = product.cr1bb_imageurlproduct || product.cr1bb_imageurl || '';
                    if (/via\.placeholder\.com/i.test(raw)) return "/images/no-image.png";
                    return raw || "/images/no-image.png";
                  })()}
                  alt={product.crdfd_name}
                  className="w-full h-[330px] object-contain p-4"
                  onError={e => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/no-image.png";
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-[13px]">
              {/* Product Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                {product.crdfd_name || product.crdfd_fullname || product.crdfd_tensanphamtext}
              </h1>

              {/* Product Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                <div><span className="font-semibold">SKU:</span> {product.crdfd_masanpham}</div>
                <div><span className="font-semibold">Thương hiệu:</span> {product.crdfd_thuonghieu || "-"}</div>
                <div><span className="font-semibold">Đổi trả:</span> 10 ngày</div>
              </div>
              <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-2xl font-bold text-red-600">
                    {promotion && promoDisplay ? promoDisplay.discountedPrice : formatPrice(getProductBasePrice(product).toString())}
                  </span>
                  {promotion && promoDisplay && promoDisplay.discountedPrice !== promoDisplay.originalPrice && (
                    <span className="text-base text-gray-500 line-through">
                      {promoDisplay.originalPrice}
                    </span>
                  )}
                </div>
                {promotion && promoDisplay && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {promoDisplay.discountText}
                      </div>
                      <div className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {promoDisplay.kmLabel}
                      </div>
                    </div>
                    {promoDisplay.conditionText && (
                      <div className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded inline-block">
                        {promoDisplay.conditionText}
                      </div>
                    )}
                    <div className="text-xs text-gray-600">
                      Tiết kiệm: <span className="font-medium text-green-600">{formatPrice((getProductBasePrice(product) - promoDisplay.finalPrice) * quantity)}</span>
                    </div>
                  </div>
                )}
              </div>
              {getItem("id") && (
                <div className="mb-[5px]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Số lượng:</label>
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className="w-12 text-center border-0 focus:ring-0 text-sm"
                          value={quantity}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            setQuantity(isNaN(val) || val < 1 ? 1 : val);
                          }}
                          min="1"
                        />
                        <button
                          className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          onClick={() => setQuantity(q => q + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Tổng tiền</div>
                      <div className="text-lg font-bold text-blue-600">
                        {(() => {
                          let finalUnitPrice = getProductBasePrice(product);
                          if (promotion && promoDisplay && promoDisplay.finalPrice !== undefined) {
                            finalUnitPrice = promoDisplay.finalPrice;
                          }
                          return finalUnitPrice > 0
                            ? formatPrice((finalUnitPrice * quantity).toString())
                            : "Liên hệ chăm sóc khách hàng";
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                      onClick={handleAddToCart}
                      disabled={isLoadingPromotion || isAddingToCart}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                        </svg>
                        Thêm vào giỏ
                      </div>
                    </button>

                    <a
                      href="https://zalo.me/3642371097976835684"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Chat Zalo"
                      className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-lg transition-all duration-300 text-center"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat Zalo
                      </div>
                    </a>
                  </div>
                </div>
              )}

              {/* Product Description */}
              {product.crdfd_mota && (
                <div className="border-t border-gray-200 pt-[5px]">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Mô tả sản phẩm</h3>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                    <div className="text-gray-700 text-sm">
                      {product.crdfd_mota}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-[5px]">
          <RelatedProductsSection
            products={relatedProducts}
            isLoading={isLoadingRelatedProducts}
            error={relatedProductsError}
            onRetry={refetchRelatedProducts}
            currentProductName={product?.crdfd_name || product?.crdfd_fullname}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}