import React, { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useMediaQuery } from 'react-responsive';
import { getItem } from '@/utils/SecureStorage';
import { formatPrice } from '@/utils/format';
import Loading from '@/components/loading';
import { useRouter } from "next/navigation";
import { generateProductUrl } from "@/utils/urlGenerator";
import { useProductGroupHierarchy } from "@/hooks/useProductGroupHierarchy";

interface Product {
  crdfd_tensanphamtext: string;
  total: number;
  productId: string;
  cr1bb_imageurl: string;
  cr1bb_imageurlproduct: string;
  crdfd_thuonghieu: string;
  crdfd_quycach: string;
  crdfd_hoanthienbemat: string;
  crdfd_masanpham: string;
  _crdfd_productgroup_value: string;
  crdfd_gtgt: number;
  cr1bb_giaban: number;
  crdfd_giatheovc: string;
  cr1bb_nhomsanpham: string;
  crdfd_onvi: string;
  _crdfd_onvi_value: string;
  crdfd_onvichuantext: string;
  crdfd_maonvi: string;
  cr1bb_tylechuyenoi: number;
  crdfd_nhomoituongtext: string;
  don_vi_DH: string;
  has_promotion: boolean;
  promotion: any | null;
  cr1bb_banchatgiaphatra?: number | null;
  crdfd_gtgt_value?: number | null;
  crdfd_gia?: number | null;
  cr1bb_giakhongvat?: number | null;
  cr1bb_json_gia?: any | null; // Added for cr1bb_json_gia
}

interface ProductsListProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  loading?: boolean;
  error?: Error | null;
}

const ProductsList: React.FC<ProductsListProps> = ({
  products,
  onAddToCart,
  loading = false,
  error = null
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const { hierarchy } = useProductGroupHierarchy();
  const [visibleItems, setVisibleItems] = useState(10);
  const [showViewMore, setShowViewMore] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isMobile = useMediaQuery({ maxWidth: 640 });
  const itemsPerLoad = 10;

  const userType = getItem("type");
  const userId = getItem("id");
  const isLoggedIn = useMemo(() => !!userId && !!userType, [userId, userType]);

  const router = useRouter();

  const isDisabled = useCallback(
    (product: Product) => {
      return !product.cr1bb_giaban || userType === "sale" || !isLoggedIn || isAddingToCart;
    },
    [userType, isLoggedIn, isAddingToCart]
  );

  const toggleProductDetails = useCallback((productId: string) => {
    setOpenProduct((prev) => (prev === productId ? null : productId));
  }, []);

  const handleQuantityChange = useCallback(
    (productId: string, value: number) => {
      setQuantities(prev => ({
        ...prev,
        [productId]: Math.max(1, value)
      }));
    },
    []
  );

  const handleAddToCart = useCallback(
    async (product: Product) => {
      try {
        setIsAddingToCart(true);
        const quantity = quantities[product.productId] || 1;
        const productWithVAT = {
          ...product,
          cr1bb_banchatgiaphatra: product.cr1bb_banchatgiaphatra ?? null,
          crdfd_gtgt_value: product.crdfd_gtgt_value ?? null,
          crdfd_gia: product.crdfd_gia ?? null,
          cr1bb_giakhongvat: product.cr1bb_giakhongvat ?? null,
          cr1bb_json_gia: product.cr1bb_json_gia ?? null, // Đảm bảo truyền cr1bb_json_gia
        };
        await onAddToCart(productWithVAT, quantity);
      } catch (error) {
        console.error("Error adding to cart:", error);
      } finally {
        setIsAddingToCart(false);
      }
    },
    [quantities, onAddToCart]
  );

  const renderPrice = useCallback((product: Product) => {
    if (!product.cr1bb_giaban) return "Liên hệ CSKH";

    const price = product.cr1bb_giaban;
    
    return (
      <div className="flex flex-col">
        <div className="flex items-baseline">
          <span className="text-xs sm:text-sm font-bold text-gray-700">
            {formatPrice(price)}
          </span>
          <span className="text-[10px] sm:text-xs text-gray-700 ml-0.5">
            /{product.don_vi_DH}
          </span>
        </div>
      </div>
    );
  }, []);

  const renderProductCard = useCallback(
    (product: Product) => (
      <div
        key={product.productId}
        className="relative bg-white rounded-lg border border-gray-200 hover:border-[#003C71] hover:shadow-md transition-all duration-300 group p-2 sm:p-3"
      >
        <div className="relative w-full pt-[80%] sm:pt-[100%] overflow-hidden rounded-lg">
          <Image
            src={/via\.placeholder\.com/i.test(product.cr1bb_imageurl || "") ? "/placeholder-image.jpg" : (product.cr1bb_imageurl || "/placeholder-image.jpg")}
            alt={product.crdfd_tensanphamtext}
            fill
            className="object-contain p-2"
            loading="lazy"
            quality={90}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        <div className="p-1 sm:p-2 space-y-1 sm:space-y-2">
          <h3 className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-2 group-hover:text-gray-700 min-h-[32px] sm:min-h-[40px]">
            {product.crdfd_tensanphamtext}
          </h3>

          <div className="flex items-baseline text-gray-700 min-h-[50px]">
            {renderPrice(product)}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleProductDetails(product.productId)}
              className="text-[10px] sm:text-xs text-gray-500 hover:text-[#003C71] flex items-center"
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
                {openProduct === product.productId ? "Ẩn thông tin" : "Xem thông tin"}
              </span>
            </button>
          </div>
        </div>

        {openProduct === product.productId && (
          <div className="mt-1 text-[10px] sm:text-xs space-y-1 border-t border-gray-100 pt-1">
            {product.crdfd_thuonghieu && (
              <div className="flex">
                <span className="font-medium text-gray-600 min-w-[70px] flex-shrink-0">Thương hiệu:</span>
                <span className="text-gray-800 flex-1">{product.crdfd_thuonghieu}</span>
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
                <span className="text-gray-700 flex-1">{product.crdfd_hoanthienbemat}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 flex items-center border border-gray-200 rounded-md overflow-hidden">
            <button
              onClick={() => handleQuantityChange(product.productId, (quantities[product.productId] || 1) - 1)}
              className="w-full h-6 flex items-center justify-center hover:bg-gray-50"
              disabled={isDisabled(product)}
            >
              <span className="text-gray-600">−</span>
            </button>
            <input
              type="number"
              min="1"
              value={quantities[product.productId] || 1}
              onChange={(e) => handleQuantityChange(product.productId, parseInt(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="w-full h-6 text-center focus:outline-none text-xs border-x border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={isDisabled(product)}
            />
            <button
              onClick={() => handleQuantityChange(product.productId, (quantities[product.productId] || 1) + 1)}
              className="w-full h-6 flex items-center justify-center hover:bg-gray-50"
              disabled={isDisabled(product)}
            >
              <span className="text-gray-600 font-bold text-lg leading-none">&#43;</span>
            </button>
          </div>
          <button
            onClick={() => {
              handleAddToCart(product);
            }}
            disabled={isDisabled(product)}
            className="group relative flex-1 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <span className="absolute inset-0 w-full h-full rounded-md border border-[#003C71] group-hover:bg-[#003C71]/10 transition-all duration-200 ease-out group-disabled:border-gray-200"></span>
            <span className="relative flex items-center gap-1.5 text-[#003C71] group-disabled:text-gray-400">
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
              <span>Thêm</span>
            </span>
          </button>
        </div>
      </div>
    ),
    [quantities, handleQuantityChange, handleAddToCart, isDisabled, renderPrice, openProduct, toggleProductDetails]
  );

  const handleLoadMore = useCallback(() => {
    setVisibleItems((prev) => {
      const nextValue = prev + itemsPerLoad;
      if (nextValue >= products.length) {
        setShowViewMore(false);
      }
      return nextValue;
    });
  }, [itemsPerLoad, products.length]);

  if (loading) return <Loading />;
  if (error) return (
    <div className="max-w-sm mx-auto mt-4 bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-red-100 text-red-700 px-3 py-2 text-sm font-semibold">Error</div>
      <div className="p-3 text-sm">
        <p>An error occurred: {error.message}</p>
      </div>
    </div>
  );

  const visibleProducts = products.slice(0, visibleItems);

  return (
    <div className={isDesktop ? "py-4 px-4 mt-4 bg-white drop-shadow-lg inset-shadow-3xs rounded-lg sm:space-y-2" : "w-full"}>
      <div className={isDesktop ? "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4" : "grid grid-cols-1 gap-3"}>
        {visibleProducts.map((product) => (
          <div key={product.productId}
            className="w-full max-w-full bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2 flex flex-row items-center gap-3 md:block md:gap-0 md:shadow-none md:rounded-lg md:border md:px-0 md:py-0 transition-all duration-200"
          >
            {/* Hình ảnh sản phẩm */}
            <div className="flex-shrink-0 w-20 h-20 relative md:w-full md:h-auto md:pt-[80%] md:relative">
              <Image
                src={/via\.placeholder\.com/i.test(product.cr1bb_imageurl || "") ? "/placeholder-image.jpg" : (product.cr1bb_imageurl || "/placeholder-image.jpg")}
                alt={product.crdfd_tensanphamtext}
                fill
                className="object-contain rounded-lg p-1 md:p-2"
                loading="lazy"
                quality={90}
                sizes="(max-width: 768px) 64px, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            {/* Thông tin sản phẩm */}
            <div className="flex-1 flex flex-col justify-between md:p-0">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 md:text-xs md:text-gray-700 md:mb-0 min-h-[32px] md:min-h-[40px]">
                {product.crdfd_tensanphamtext}
              </h3>
              <div className="flex items-baseline text-gray-700 mb-1 md:mb-0 min-h-[24px] md:min-h-[50px]">
                {renderPrice(product)}
              </div>
              {/* Nút Xem chi tiết */}
              <button
                onClick={() => {
                  const masanpham = product.crdfd_masanpham || product.productId;
                  // Lưu thông tin sản phẩm vào localStorage trước khi chuyển hướng
                  localStorage.setItem("productDetail", JSON.stringify(product));
                  
                  // Generate new SEO-friendly URL with hierarchy
                  const newUrl = generateProductUrl(product, hierarchy);
                  router.push(newUrl);
                }}
                className="w-full mb-2 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-all duration-200"
                style={{ minWidth: 0 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
              </button>
              {/* Nút và số lượng */}
              <div className="flex items-center gap-2 mt-1 md:mt-0">
                {/* Nút và số lượng */}
                <div className="flex items-center border border-gray-200 rounded-md overflow-hidden w-[90px] h-8">
                  <button
                    onClick={() => handleQuantityChange(product.productId, (quantities[product.productId] || 1) - 1)}
                    className="w-7 h-full flex items-center justify-center hover:bg-gray-50 text-lg"
                    disabled={isDisabled(product)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantities[product.productId] || 1}
                    onChange={(e) => handleQuantityChange(product.productId, parseInt(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-8 h-full text-center focus:outline-none text-xs border-x border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    disabled={isDisabled(product)}
                  />
                  <button
                    onClick={() => handleQuantityChange(product.productId, (quantities[product.productId] || 1) + 1)}
                    className="w-7 h-full flex items-center justify-center hover:bg-gray-50 text-lg font-bold leading-none"
                    disabled={isDisabled(product)}
                  >
                    &#43;
                  </button>
                </div>
                <button
                  onClick={() => { handleAddToCart(product); }}
                  disabled={isDisabled(product)}
                  className="flex-1 px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 bg-[#F5F9FF] text-[#003C71] border border-[#003C71] hover:bg-[#003C71] hover:text-white transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap md:relative md:px-2 md:py-1.5 md:bg-transparent md:text-[#003C71] md:border md:border-[#003C71] md:hover:bg-[#003C71]/10 md:hover:text-[#003C71]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h14l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Thêm
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showViewMore && products.length > visibleItems && (
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
    </div>
  );
};

export default React.memo(ProductsList); 