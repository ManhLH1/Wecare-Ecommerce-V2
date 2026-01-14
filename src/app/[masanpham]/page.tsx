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
 import RelatedProductsSection from "@/app/san-pham/chi-tiet/_components/RelatedProductsSection";
 import { useRelatedProducts } from "@/hooks/useRelatedProducts";
 import { CartContext } from "@/components/CartGlobalManager";
 import { generateProductUrl } from "@/utils/urlGenerator";

 export default function ProductDetailPage({ params }: { params: any }) {
   const [product, setProduct] = useState<any>(null);
   const [quantity, setQuantity] = useState(1);
   const [mainImageIndex, setMainImageIndex] = useState(0);
   const [showStickyBar, setShowStickyBar] = useState(false);
   const [promotion, setPromotion] = useState<any>(null);
   const [isLoadingPromotion, setIsLoadingPromotion] = useState(false);
   const [isAddingToCart, setIsAddingToCart] = useState(false);
   const { cartItems, addToCart } = useCart();
   const { openCart } = useContext(CartContext);
   const router = useRouter();
   const { success, error } = useToast();
   const [promotions, setPromotions] = useState<any[]>([]);
   const [isLoadingPromotions, setIsLoadingPromotions] = useState(true);
   const [showSpecModal, setShowSpecModal] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const [overlaySize, setOverlaySize] = useState(0);

   const { products: relatedProducts, isLoading: isLoadingRelatedProducts, error: relatedProductsError, refetch: refetchRelatedProducts } = useRelatedProducts(product);

   useEffect(() => {
     const data = localStorage.getItem("productDetail");
     if (data) {
       const parsedProduct = JSON.parse(data);
       setProduct(parsedProduct);
       const currentPath = window.location.pathname;
       if (currentPath.includes('/san-pham/chi-tiet/') || currentPath.match(/^\/SP-\d+$/)) {
         const newUrl = generateProductUrl(parsedProduct);
         if (newUrl !== currentPath) {
           window.history.replaceState(null, '', newUrl);
         }
       }
     }
   }, []);

   useEffect(() => {
     setMainImageIndex(0);
   }, [product]);

   useEffect(() => {
     const onScroll = () => {
       try { setShowStickyBar(window.scrollY > 400); } catch {}
     };
     window.addEventListener("scroll", onScroll);
     return () => window.removeEventListener("scroll", onScroll);
   }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      try {
        const headerEl = document.querySelector('header');
        const h = headerEl ? (headerEl as HTMLElement).getBoundingClientRect().height : 0;
        setHeaderHeight(h || null);
      } catch {
        setHeaderHeight(null);
      }
    };
    // update on mount and after a short delay (in case header renders later)
    updateHeaderHeight();
    const id = window.setTimeout(updateHeaderHeight, 120);
    window.addEventListener('resize', updateHeaderHeight);
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!fullScreenMode) return;
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setOverlaySize(Math.max(200, Math.min(w - 80, h - 80)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [fullScreenMode]);

   useEffect(() => {
     const fetchPromotions = async () => {
       setIsLoadingPromotions(true);
       try {
         const cacheKey = 'promotionsCache';
         const cacheStr = sessionStorage.getItem(cacheKey);
         let cache: { data: any[]; timestamp: number } | null = null;
         if (cacheStr) {
           try { cache = JSON.parse(cacheStr); } catch {}
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

   if (!product) return <div className="p-8 text-center">Không tìm thấy thông tin sản phẩm.</div>;

   const getProductBasePrice = (product: any): number => {
    // Prefer explicit "giá chưa VAT" if provided in JSON price entries
    if (product?.cr1bb_json_gia) {
      let giaArr = product.cr1bb_json_gia;
      if (typeof giaArr === 'string') {
        try { giaArr = JSON.parse(giaArr); } catch {}
      }
      if (Array.isArray(giaArr) && giaArr.length > 0) {
        const valid = giaArr.filter((g: any) => g.crdfd_trangthaihieulucname === 'Còn hiệu lực' || g.crdfd_trangthaihieuluc === 191920000);
        const chosen = (valid.length > 0 ? valid : giaArr)[0];
        if (chosen) {
          // cr1bb_giakhongvat is catalog (chưa VAT)
          const khongVat = Number(chosen.cr1bb_giakhongvat || chosen.crdfd_giatheovc || chosen.crdfd_gia || 0);
          if (khongVat > 0) return khongVat;
        }
      }
    }
    // fallbacks: top-level cr1bb_giakhongvat or cr1bb_giaban
    if (product?.cr1bb_giakhongvat) return Number(product.cr1bb_giakhongvat);
    return Number(product?.cr1bb_giaban || 0);
   };

   const formatPrice = (price: string | number | null | undefined) => {
     if (!price || price === 0 || price === "0" || price === "null" || price === "undefined") return "Liên hệ chăm sóc khách hàng";
     const numPrice = parseFloat(price.toString());
     if (isNaN(numPrice) || numPrice === 0) return "Liên hệ chăm sóc khách hàng";
     return `${Math.round(numPrice).toLocaleString()} đ`;
   };

   const parsePrice = (price: string | number | null | undefined): number => {
     if (typeof price === "number") return price;
     if (typeof price === "string") return parseFloat(price) || 0;
     return 0;
   };

   const getTotalProductValue = () => {
     if (!promotion?.productCodes || !promotion?.tongTienApDung) return 0;
     const codes = promotion.productCodes.split(',').map((c: string) => c.trim());
     const cartTotal = cartItems
       .filter((cartItem: any) => codes.includes(cartItem.crdfd_masanpham))
       .reduce((sum: number, cartItem: any) => sum + (parseFloat(cartItem.price) * (cartItem.quantity || 1)), 0);
     const currentValue = codes.includes(product.crdfd_masanpham) ? getProductBasePrice(product) * quantity : 0;
     return cartTotal + currentValue;
   };

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

   const calculateDiscountedPrice = (basePrice: number, promo: any, totalQty: number) => {
     if (!promo) return basePrice;
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

   const getPromotionDisplay = () => {
     if (!promotion) return null;
     const basePrice = getProductBasePrice(product);
     const totalPromotionQuantity = getTotalPromotionQuantity();
     if (promotion.tongTienApDung && promotion.productCodes) {
       const totalProductValue = getTotalProductValue();
       const tongTienApDungNum = parseFloat(promotion.tongTienApDung);
       const isValue2Applied = totalProductValue >= tongTienApDungNum;
       const discountValue = isValue2Applied ? promotion.value2 : promotion.value;
       const kmLabel = isValue2Applied ? "Giá KM 2" : "Giá KM 1";
       const discountedPrice = promotion.vn === 191920000
         ? basePrice * (1 - parseFloat(discountValue) / 100)
         : basePrice - parseFloat(discountValue);
       const discountText = promotion.vn === 191920000 ? `(-${discountValue}%)` : `(-${formatPrice(parseFloat(discountValue))})`;
       const conditionText = isValue2Applied ? `(Áp dụng khi tổng giá trị >= ${formatPrice(tongTienApDungNum)})` : `(Giảm thêm khi tổng giá trị < ${formatPrice(tongTienApDungNum)})`;
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
       conditionText = promotion.congdonsoluong && promotion.soluongapdung ? `(Giảm thêm khi mua từ ${promotion.soluongapdung} ${product.don_vi_DH})` : "";
       kmLabel = "Giá KM 1";
     }
     const finalPrice = calculateDiscountedPrice(basePrice, promotion, quantity + totalPromotionQuantity);
     return {
       originalPrice: formatPrice(basePrice),
       discountedPrice: formatPrice(finalPrice),
       discountAmount: formatPrice(basePrice - finalPrice),
       discountText: promotion.vn === 191920000 ? `(-${discountValue}%)` : `(-${formatPrice(parseFloat(discountValue))})`,
       conditionText,
       kmLabel,
       finalPrice
     };
   };

   const handleAddToCart = () => {
     if (quantity <= 0) { error(TOAST_MESSAGES.ERROR.QUANTITY_INVALID); return; }
     if (!product) { error("Không tìm thấy thông tin sản phẩm"); return; }
     const userId = getItem("id");
     const userType = getItem("type");
     if (!userId || !userType) { error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng"); return; }
     const originalPrice = getProductBasePrice(product);
     if (!originalPrice || originalPrice === 0) { error("Sản phẩm này hiện không có giá. Vui lòng liên hệ chăm sóc khách hàng để được báo giá."); return; }
     try {
       setIsAddingToCart(true);
       const finalUnitPrice = (() => {
         if (promotion) {
           const display = getPromotionDisplay();
           if (display && typeof display.finalPrice === 'number') return display.finalPrice;
         }
         return originalPrice;
       })();
       const productToAdd = {
         ...product,
         crdfd_productsid: product.crdfd_productsid || product.productId || product.crdfd_masanpham,
         crdfd_name: product.crdfd_name || product.crdfd_fullname || product.crdfd_tensanphamtext,
         crdfd_fullname: product.crdfd_fullname || product.crdfd_name || product.crdfd_tensanphamtext,
         crdfd_masanpham: product.crdfd_masanpham || product.productId,
         cr1bb_giaban: originalPrice?.toString() || "0",
         price: finalUnitPrice !== null && finalUnitPrice !== undefined ? finalUnitPrice.toString() : originalPrice?.toString() || "0",
         cr1bb_imageurlproduct: product.cr1bb_imageurlproduct || product.cr1bb_imageurl || "",
         promotion: promotion ? {
           ...promotion,
           promotionId: promotion.crdfd_promotionid || promotion.promotionId || "",
           value: promotion.value || promotion.crdfd_value || "0",
           cr1bb_vn: promotion.vn === 191920000 ? "%" : "đ",
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
  // derive catalog (chưa VAT) and VAT-included price from cr1bb_json_gia if present
  let catalogPriceNum: number | null = null;
  let vatIncludedPriceNum: number | null = null;
  if (product?.cr1bb_json_gia) {
    let giaArr = product.cr1bb_json_gia;
    if (typeof giaArr === 'string') {
      try { giaArr = JSON.parse(giaArr); } catch {}
    }
    if (Array.isArray(giaArr) && giaArr.length > 0) {
      const valid = giaArr.filter((g: any) => g.crdfd_trangthaihieulucname === 'Còn hiệu lực' || g.crdfd_trangthaihieuluc === 191920000);
      const chosen = (valid.length > 0 ? valid : giaArr)[0];
      if (chosen) {
        if (chosen.cr1bb_giakhongvat) catalogPriceNum = Number(chosen.cr1bb_giakhongvat);
        if (chosen.crdfd_gia) vatIncludedPriceNum = Number(chosen.crdfd_gia);
      }
    }
  }
  // fallbacks to top-level fields
  if (catalogPriceNum === null && product?.cr1bb_giakhongvat) catalogPriceNum = Number(product.cr1bb_giakhongvat);
  if (vatIncludedPriceNum === null && product?.crdfd_gia) vatIncludedPriceNum = Number(product.crdfd_gia);
  const catalogPriceStr = catalogPriceNum ? formatPrice(catalogPriceNum) : (promoDisplay?.originalPrice || formatPrice(getProductBasePrice(product).toString()));
  const vatIncludedPriceStr = vatIncludedPriceNum ? formatPrice(vatIncludedPriceNum) : "";
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <style jsx global>{`
        [data-floating-zalo] { display: none !important; }
        .image-zoom-container { position: relative; overflow: hidden; }
        .image-zoom-container img { transition: transform 0.3s ease; }
        .image-zoom-container:hover img { transform: scale(1.1); }
      `}</style>
      <JDStyleHeader cartItemsCount={cartItems.length} onSearch={() => {}} onCartClick={openCart} />

      <main id="main" style={{ marginTop: '120px' }} className="w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 pb-28 sm:pb-4 pt-32">
        <nav className="mb-6">
          <div className="flex items-center text-sm text-gray-600">
            <FaHome className="w-4 h-4 mr-2" />
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => router.push("/san-pham")}>Sản phẩm</span>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium truncate">{product?.crdfd_name}</span>
          </div>
        </nav>

        {/* Main Product Layout - New Design */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - 65-70% */}
            <div className="lg:col-span-8 xl:col-span-9 order-2 lg:order-1">
              {/* Product Images Section */}
              <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                <div className="space-y-4">
                  {/* Main Image with Badges */}
                  <div className="relative image-zoom-container rounded-lg overflow-hidden bg-white border border-gray-200">
                    <img
                      src={((): string => {
                        const imgs: string[] = [];
                        if (product?.cr1bb_imageurlproduct) imgs.push(product.cr1bb_imageurlproduct);
                        if (product?.cr1bb_imageurl && product.cr1bb_imageurl !== product.cr1bb_imageurlproduct) imgs.push(product.cr1bb_imageurl);
                        const chosen = imgs[mainImageIndex] || imgs[0] || "/placeholder-image.jpg";
                        if (/via\.placeholder\.com/i.test(chosen)) return "/images/no-image.png";
                        return chosen;
                      })()}
                      alt={product.crdfd_name}
                      className="w-full h-[500px] lg:h-[600px] object-contain bg-white"
                      onError={e => { (e.target as HTMLImageElement).src = "/images/no-image.png"; }}
                    />

                    {/* Badges */}
                    <div className="absolute top-4 left-4 space-y-2">
                      <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        Hàng chính hãng
                      </div>
                      <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        Bảo hành 12 tháng
                      </div>
                    </div>

                    {/* Zoom Button */}
                    <button
                      onClick={() => setFullScreenMode(true)}
                      className="absolute bottom-4 right-4 bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </button>
                  </div>

                  {/* Thumbnail Gallery - Horizontal */}
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {(() => {
                      const thumbs: string[] = [];
                      if (product?.cr1bb_imageurlproduct) thumbs.push(product.cr1bb_imageurlproduct);
                      if (product?.cr1bb_imageurl && product.cr1bb_imageurl !== product.cr1bb_imageurlproduct) thumbs.push(product.cr1bb_imageurl);
                      while (thumbs.length < 4) thumbs.push("/placeholder-image.jpg");
                      return thumbs.slice(0, 4).map((src, idx) => {
                        const selected = idx === mainImageIndex;
                        return (
                          <button
                            key={idx}
                            onClick={() => setMainImageIndex(idx)}
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-white focus:outline-none transition-all border-2 ${
                              selected
                                ? 'border-yellow-500 ring-2 ring-yellow-200 scale-105'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <img
                              src={src}
                              className="w-full h-full object-contain p-2"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/images/no-image.png"; }}
                            />
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </section>

              {/* Product Information Sections */}
              <div className="space-y-8">
                {/* Quick Info */}
                <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{product.crdfd_name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div><span className="font-semibold">SKU:</span> {product.crdfd_masanpham || ""}</div>
                    <div><span className="font-semibold">Thương hiệu:</span> {product.crdfd_thuonghieu || ""}</div>
                    <div><span className="font-semibold">Đổi trả:</span> Trong 10 ngày</div>
                  </div>
                </section>

                {/* Mô tả ngắn nổi bật */}
                <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Đặc điểm nổi bật</h3>
                  <ul className="space-y-3">
                    {product.crdfd_mota ? (
                      <>
                        <li className="flex items-start">
                          <span className="text-yellow-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700 leading-relaxed">{product.crdfd_mota.split('.').slice(0,1).join('. ')}.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-yellow-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700 leading-relaxed">Sử dụng đầu cặp có khóa 13 mm dễ dàng tháo lắp mũi khoan</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-yellow-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700 leading-relaxed">Động cơ mạnh mẽ, hoạt động ổn định và bền bỉ</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-yellow-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700 leading-relaxed">Thiết kế ergonomic, cầm nắm thoải mái</span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start">
                          <span className="text-yellow-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700 leading-relaxed">Máy khoan thương hiệu uy tín với chất lượng đảm bảo</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-yellow-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700 leading-relaxed">Công suất mạnh mẽ, phù hợp cho nhiều loại công việc</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-yellow-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700 leading-relaxed">Thiết kế chắc chắn, dễ sử dụng</span>
                        </li>
                      </>
                    )}
                  </ul>
                </section>

                {/* Thông số kỹ thuật */}
                <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Thông số kỹ thuật</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Mã sản phẩm</span>
                        <span className="text-gray-900">{product?.crdfd_masanpham || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Quy cách</span>
                        <span className="text-gray-900">{product?.crdfd_quycach || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Thương hiệu</span>
                        <span className="text-gray-900">{product?.crdfd_thuonghieu || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Chất liệu</span>
                        <span className="text-gray-900">{product?.crdfd_chatlieu || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Hoàn thiện</span>
                        <span className="text-gray-900">{product?.crdfd_hoanthienbemat || "-"}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Công suất</span>
                        <span className="text-gray-900">{product?.crdfd_congsuat || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Tốc độ</span>
                        <span className="text-gray-900">{product?.crdfd_tocdo || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Kích thước</span>
                        <span className="text-gray-900">{product?.crdfd_kichthuoc || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Trọng lượng</span>
                        <span className="text-gray-900">{product?.crdfd_trongluong || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Xuất xứ</span>
                        <span className="text-gray-900">{product?.crdfd_xuatxu || "Đức"}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Vì sao nên mua */}
                <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Vì sao nên mua sản phẩm này?</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="bg-yellow-100 rounded-full p-2 mr-4 mt-1">
                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Chất lượng Đức - Uy tín toàn cầu</h4>
                        <p className="text-gray-600 mt-1">Sản phẩm nhập khẩu chính hãng từ Đức với công nghệ tiên tiến, đạt tiêu chuẩn châu Âu.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-yellow-100 rounded-full p-2 mr-4 mt-1">
                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Bảo hành chính hãng 12 tháng</h4>
                        <p className="text-gray-600 mt-1">Được bảo hành chính hãng với dịch vụ hậu mãi chuyên nghiệp trên toàn quốc.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-yellow-100 rounded-full p-2 mr-4 mt-1">
                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Giao hàng nhanh toàn quốc</h4>
                        <p className="text-gray-600 mt-1">Miễn phí giao hàng nội thành, giao hàng tận nơi trên toàn quốc trong 2-3 ngày.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Mô tả chi tiết */}
                {product.crdfd_mota && (
                  <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Mô tả chi tiết sản phẩm</h3>
                    <div className="text-gray-700 leading-relaxed prose max-w-none">{product.crdfd_mota}</div>
                  </section>
                )}

                {/* Sản phẩm tương tự */}
                <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <RelatedProductsSection
                    products={relatedProducts}
                    isLoading={isLoadingRelatedProducts}
                    error={relatedProductsError}
                    onRetry={refetchRelatedProducts}
                    currentProductName={product?.crdfd_name || product?.crdfd_fullname}
                  />
                </section>
              </div>
            </div>

            {/* Right Column - Sticky Sidebar - 30-35% */}
            <div className="lg:col-span-4 xl:col-span-3 order-1 lg:order-2">
              <div className="lg:sticky lg:top-24 space-y-6 tablet-sidebar">
                {/* Price & CTA Section */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  {/* Price Display */}
                  <div className="text-center mb-6">
                    {promotion && promoDisplay ? (
                      <>
                        <div className="text-4xl font-black text-yellow-600 mb-2">
                          {promoDisplay.discountedPrice}
                        </div>
                        {promoDisplay.discountedPrice !== promoDisplay.originalPrice && (
                          <div className="text-lg text-gray-500 line-through">
                            {promoDisplay.originalPrice}
                          </div>
                        )}
                        <div className="inline-block bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold mt-2">
                          {promoDisplay.discountText}
                        </div>
                      </>
                    ) : (
                      <div className="text-4xl font-black text-yellow-600 mb-2">
                        {formatPrice(getProductBasePrice(product).toString())}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mt-2">
                      {product?.don_vi_DH ? `Giá / ${product.don_vi_DH}` : ''}
                    </div>
                  </div>

                  {/* Price Details */}
                  <div className="space-y-2 text-sm text-gray-600 mb-6">
                    <div className="flex justify-between">
                      <span>Giá Catalog (chưa VAT):</span>
                      <span className="font-medium">{catalogPriceStr}</span>
                    </div>
                    {vatIncludedPriceStr && (
                      <div className="flex justify-between">
                        <span>Giá đã bao gồm VAT:</span>
                        <span className="font-medium">{vatIncludedPriceStr}</span>
                      </div>
                    )}
                  </div>

                  {/* Quantity Selector */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng:</label>
                    <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                      <button
                        className="px-4 py-2 text-gray-600 hover:bg-gray-50"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="w-20 text-center border-0 focus:ring-0 text-sm"
                        value={quantity}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          setQuantity(isNaN(val) || val < 1 ? 1 : val);
                        }}
                        min="1"
                      />
                      <button
                        className="px-4 py-2 text-gray-600 hover:bg-gray-50"
                        onClick={() => setQuantity(q => q + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Total Price */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-700">Tổng tiền:</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {(() => {
                          let finalUnitPrice = getProductBasePrice(product);
                          if (promotion && promoDisplay && promoDisplay.finalPrice !== undefined) finalUnitPrice = promoDisplay.finalPrice;
                          return finalUnitPrice > 0 ? formatPrice((finalUnitPrice * quantity).toString()) : "Liên hệ";
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-3 mb-6">
                    <button
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105"
                      onClick={handleAddToCart}
                      disabled={isLoadingPromotion || isAddingToCart}
                    >
                      {isAddingToCart ? "ĐANG THÊM..." : "MUA NGAY"}
                    </button>
                    <button
                      className="w-full bg-white border-2 border-yellow-500 text-yellow-700 font-semibold py-4 px-6 rounded-lg hover:bg-yellow-50 transition"
                      onClick={handleAddToCart}
                      disabled={isLoadingPromotion || isAddingToCart}
                    >
                      THÊM VÀO GIỎ
                    </button>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Miễn phí vận chuyển &gt; 1.000.000đ</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Giao hàng nhanh 2-3 ngày</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-purple-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Đổi trả trong 10 ngày</span>
                    </div>
                  </div>
                </div>

                {/* Trust Block */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 text-center">DỤNG CỤ VÀNG CAM KẾT</h4>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="bg-green-100 rounded-full p-3 mr-4">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Hàng chính hãng 100%</div>
                        <div className="text-sm text-gray-600">Nhập khẩu chính hãng từ Đức</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="bg-blue-100 rounded-full p-3 mr-4">
                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Bảo hành chính hãng</div>
                        <div className="text-sm text-gray-600">12 tháng bảo hành toàn diện</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="bg-orange-100 rounded-full p-3 mr-4">
                        <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Giao hàng toàn quốc</div>
                        <div className="text-sm text-gray-600">Miễn phí giao hàng tận nơi</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="bg-purple-100 rounded-full p-3 mr-4">
                        <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414 0l-8 8a1 1 0 001.414 1.414l8-8a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Hỗ trợ kỹ thuật</div>
                        <div className="text-sm text-gray-600">Tư vấn chuyên nghiệp 24/7</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hotline */}
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl p-6 text-center text-black">
                  <div className="text-lg font-bold mb-2">Hotline đặt hàng</div>
                  <div className="text-2xl font-black">1900 XXX XXX</div>
                  <div className="text-sm mt-2">Tư vấn miễn phí • 24/7</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showSpecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full overflow-auto max-h-[80vh] shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="text-lg font-semibold">Thông số kỹ thuật - {product?.crdfd_name}</div>
              <button className="text-sm text-gray-600" onClick={() => setShowSpecModal(false)}>Đóng</button>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-2 text-gray-600 w-1/3">Mã sản phẩm</td><td className="py-2 font-medium text-gray-900">{product?.crdfd_masanpham || "-"}</td></tr>
                  <tr><td className="py-2 text-gray-600">Quy cách</td><td className="py-2 font-medium text-gray-900">{product?.crdfd_quycach || "-"}</td></tr>
                  <tr><td className="py-2 text-gray-600">Thương hiệu</td><td className="py-2 font-medium text-gray-900">{product?.crdfd_thuonghieu || "-"}</td></tr>
                  <tr><td className="py-2 text-gray-600">Chất liệu</td><td className="py-2 font-medium text-gray-900">{product?.crdfd_chatlieu || "-"}</td></tr>
                  <tr><td className="py-2 text-gray-600">Hoàn thiện</td><td className="py-2 font-medium text-gray-900">{product?.crdfd_hoanthienbemat || "-"}</td></tr>
                  <tr><td className="py-2 text-gray-600">Công suất</td><td className="py-2 font-medium text-gray-900">{product?.crdfd_congsuat || "-"}</td></tr>
                  <tr><td className="py-2 text-gray-600">Tốc độ</td><td className="py-2 font-medium text-gray-900">{product?.crdfd_tocdo || "-"}</td></tr>
                  <tr><td className="py-2 text-gray-600">Kích thước</td><td className="py-2 font-medium text-gray-900">{product?.crdfd_kichthuoc || "-"}</td></tr>
                  <tr><td className="py-2 text-gray-600">Trọng lượng</td><td className="py-2 font-medium text-gray-900">{product?.crdfd_trongluong || "-"}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Mobile Sticky CTA - Enhanced Design */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl p-4 lg:hidden z-50 border-t-4 border-yellow-500">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 bg-white rounded-lg overflow-hidden border-2 border-gray-200 flex-shrink-0">
                <img
                  src={product?.cr1bb_imageurlproduct || product?.cr1bb_imageurl || "/placeholder-image.jpg"}
                  className="w-full h-full object-contain p-2"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/images/no-image.png"; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate text-gray-900">{product?.crdfd_name}</div>
                <div className="text-lg font-black text-yellow-600 mt-1">
                  {promotion && promoDisplay ? promoDisplay.discountedPrice : formatPrice(getProductBasePrice(product).toString())}
                </div>
                {promotion && promoDisplay && promoDisplay.discountedPrice !== promoDisplay.originalPrice && (
                  <div className="text-xs text-gray-500 line-through">{promoDisplay.originalPrice}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded-lg shadow-lg transform transition active:scale-95"
                onClick={handleAddToCart}
                disabled={isLoadingPromotion || isAddingToCart}
              >
                {isAddingToCart ? "ĐANG..." : "MUA NGAY"}
              </button>
              <button
                className="bg-white border-2 border-yellow-500 text-yellow-700 font-semibold py-3 px-4 rounded-lg hover:bg-yellow-50 transition"
                onClick={handleAddToCart}
                disabled={isLoadingPromotion || isAddingToCart}
              >
                THÊM GIỎ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Fullscreen Modal */}
      {fullScreenMode && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
          <div
            style={{ width: overlaySize, height: overlaySize }}
            className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center relative"
          >
            <img
              src={((): string => {
                const imgs: string[] = [];
                if (product?.cr1bb_imageurlproduct) imgs.push(product.cr1bb_imageurlproduct);
                if (product?.cr1bb_imageurl && product.cr1bb_imageurl !== product.cr1bb_imageurlproduct) imgs.push(product.cr1bb_imageurl);
                const chosen = imgs[mainImageIndex] || imgs[0] || "/placeholder-image.jpg";
                if (/via\.placeholder\.com/i.test(chosen)) return "/images/no-image.png";
                return chosen;
              })()}
              className="w-full h-full object-contain"
              alt={product?.crdfd_name}
              onError={e => { (e.target as HTMLImageElement).src = "/images/no-image.png"; }}
            />

            {/* Close button */}
            <button
              className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-full hover:bg-black/90 transition-colors"
              onClick={() => setFullScreenMode(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation arrows */}
            {(() => {
              const imgs: string[] = [];
              if (product?.cr1bb_imageurlproduct) imgs.push(product.cr1bb_imageurlproduct);
              if (product?.cr1bb_imageurl && product.cr1bb_imageurl !== product.cr1bb_imageurlproduct) imgs.push(product.cr1bb_imageurl);
              const hasMultiple = imgs.length > 1;

              if (!hasMultiple) return null;

              return (
                <>
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 text-white p-3 rounded-full hover:bg-black/90 transition-colors"
                    onClick={() => setMainImageIndex(idx => idx > 0 ? idx - 1 : imgs.length - 1)}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 text-white p-3 rounded-full hover:bg-black/90 transition-colors"
                    onClick={() => setMainImageIndex(idx => idx < imgs.length - 1 ? idx + 1 : 0)}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tablet Responsive - Move sidebar below on tablet */}
      <style jsx>{`
        @media (max-width: 1024px) and (min-width: 768px) {
          .tablet-sidebar {
            position: static !important;
            margin-top: 2rem;
          }
        }
        @media (max-width: 767px) {
          .mobile-sticky-cta {
            padding-bottom: 120px !important;
          }
        }
      `}</style>
    </div>
  );
 }


