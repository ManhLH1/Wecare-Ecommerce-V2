import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useDebounce } from "use-debounce";
import Loading from "@/components/loading";
import { useMediaQuery } from "react-responsive";
import { useToast } from "@/hooks/useToast";
import { TOAST_MESSAGES } from "@/types/toast";
import Products from "@/model/Product";
import Image from "next/image";
import { getItem } from "@/utils/SecureStorage";
import {
  PurchasedProduct,
  PurchasedProductsListProps,
  QuantityState,
  ViewState,
  LocalState,
} from "../../../../model/interface/PurchasedProductsProps";
import { useRouter } from "next/navigation";
import { generateProductUrl } from "@/utils/urlGenerator";
import { useProductGroupHierarchy } from "@/hooks/useProductGroupHierarchy";

const PurchasedProductsList: React.FC<PurchasedProductsListProps> = ({
  onAddToCart,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [localProducts, setLocalProducts] = useState<PurchasedProduct[]>([]);
  const isMobile = useMediaQuery({ query: "(max-width: 640px)" });
  const [visibleItems, setVisibleItems] = useState(isMobile ? 2 : 5);
  const [showViewMore, setShowViewMore] = useState(true);
  const itemsPerLoad = isMobile ? 2 : 5;
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const router = useRouter();
  const { hierarchy } = useProductGroupHierarchy();
  const { success, error: showError } = useToast();

  const customerId = getItem("id");
  const userType = getItem("type");
  const isLoggedIn = getItem("isLoggedIn") === "true";

  useEffect(() => {
    setVisibleItems(isMobile ? 2 : 5);
  }, [isMobile]);

  const fetchPurchasedProducts = useCallback(async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `/api/getPurchasedProducts?customerId=${customerId}`
      );

      if (!response.data || !response.data.products) {
        throw new Error("Invalid data received from API");
      }

      const mappedProducts = response.data.products.map((product: any) => ({
        productId: product.productId || "",
        productName: product.productName || "",
        productCode: product.productCode || "",
        brand: product.brand || "",
        specification: product.specification || "",
        surfaceFinish: product.surfaceFinish || "",
        gia: product.gia ? parseFloat(product.gia) : 0,
        giatheovc: product.giatheovc ? parseFloat(product.giatheovc) : 0,
        onvichuantext: product.onvichuantext || "",
        don_vi_DH: product.don_vi_DH || "",
        imageUrl: product.imageUrl,
        imageUrlProduct: product.imageUrlProduct,
        _crdfd_onvi_value: product._crdfd_onvi_value || "",
        onvi_value: product.onvi_value || "",
        _crdfd_productgroup_value: product._crdfd_productgroup_value || "",
      }));

      const validProducts = mappedProducts.filter(
        (product: PurchasedProduct) => product.productId && product.productName
      );

      setLocalProducts(validProducts);
    } catch (error) {
      console.error(
        "Error fetching purchased products - fetchPurchasedProducts - line 86: ",
        error
      );
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to fetch purchased products")
      );
      setLocalProducts([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const debouncedFetchPurchasedProducts = useDebounce(
    fetchPurchasedProducts,
    300
  )[0];

  useEffect(() => {
    debouncedFetchPurchasedProducts();
  }, [debouncedFetchPurchasedProducts]);

  const isDisabled = useCallback(
    (product: PurchasedProduct) => {
      return !product.gia || userType === "sale" || !isLoggedIn || isAddingToCart;
    },
    [userType, isLoggedIn, isAddingToCart]
  );

  const toggleProductDetails = useCallback((productId: string) => {
    setOpenProduct((prev) => (prev === productId ? null : productId));
  }, []);

  const handleQuantityChange = useCallback(
    (productId: string, value: number) => {
      setQuantities((prev) => ({
        ...prev,
        [productId]: Math.max(1, value),
      }));
    },
    []
  );

  const convertToProduct = (purchasedProduct: PurchasedProduct): Products => {
    return {
      crdfd_name: purchasedProduct.productName,
      crdfd_productsid: purchasedProduct.productId,
      cr1bb_imageurl: purchasedProduct.imageUrl,
      cr1bb_imageurlproduct: purchasedProduct.imageUrlProduct,
      cr1bb_giaban: purchasedProduct.gia?.toString() || "0",
      crdfd_onvichuantext: purchasedProduct.onvichuantext || "",
      don_vi_DH: purchasedProduct.don_vi_DH || "",
      crdfd_thuonghieu: purchasedProduct.brand || "",
      crdfd_quycach: purchasedProduct.specification || "",
      crdfd_productgroup: "",
      _crdfd_productgroup_value: purchasedProduct._crdfd_productgroup_value || "",
      crdfd_nhomsanphamtext: "",
      crdfd_hoanthienbemat: purchasedProduct.surfaceFinish || "",
      crdfd_manhomsp: purchasedProduct.productCode || "",
      cr1bb_tylechuyenoi: "",
      unit: purchasedProduct.don_vi_DH || "",
      price: purchasedProduct.gia?.toString() || "0",
      priceChangeReason: "",
      crdfd_giatheovc: purchasedProduct.giatheovc?.toString() || "0",
      isPriceUpdated: false,
      crdfd_chatlieu: "",
      cr1bb_giaban_Bg: purchasedProduct.gia?.toString() || "0",
      cr1bb_nhomsanphamcha: "",
      crdfd_fullname: purchasedProduct.productName || "",
      crdfd_masanpham: purchasedProduct.productCode || "",
      _crdfd_onvi_value: purchasedProduct._crdfd_onvi_value || "",
      // Add these required fields:
      cr1bb_banchatgiaphatra: 0,
      crdfd_gtgt: 0,
      crdfd_gtgt_value: 0,
      cr1bb_giakhongvat: 0,
      crdfd_onvichuan: "",
      crdfd_onvi: "",
      crdfd_trangthaihieulucname: "",
      crdfd_trangthaihieuluc: 0,
    };
  };

  const handleAddToCart = useCallback(
    async (product: PurchasedProduct) => {
      try {
        setIsAddingToCart(true);
        const quantity = quantities[product.productId] || 1;
        const productDetail = convertToProduct(product);
        await onAddToCart(productDetail, quantity);
        success(TOAST_MESSAGES.SUCCESS.ADD_TO_CART);
        setQuantities((prev) => ({
          ...prev,
          [product.productId]: 1,
        }));
      } catch (err) {
        console.error("Error adding to cart:", err);
        showError(TOAST_MESSAGES.ERROR.ADD_TO_CART);
      } finally {
        setIsAddingToCart(false);
      }
    },
    [quantities, onAddToCart, success, showError]
  );

  const handleLoadMore = useCallback(() => {
    setVisibleItems((prev) => {
      const nextValue = prev + itemsPerLoad;
      if (nextValue >= localProducts.length) {
        setShowViewMore(false);
      }
      return nextValue;
    });
  }, [itemsPerLoad, localProducts.length]);

  const errorMessage = useMemo(() => {
    if (!error) return null;
    return (
      <div className="max-w-sm mx-auto mt-4 bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-red-100 text-red-700 px-3 py-2 text-sm font-semibold">
          Lỗi
        </div>
        <div className="p-3 text-sm">
          <p>Đã xảy ra lỗi: {error.message}</p>
        </div>
      </div>
    );
  }, [error]);

  const emptyState = useMemo(() => {
    if (loading || error || localProducts.length > 0) return null;
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Chưa có sản phẩm nào được mua trước đây</p>
      </div>
    );
  }, [loading, error, localProducts]);

  // Desktop view
  const renderProductCard = useCallback(
    (product: PurchasedProduct) => (
      <div className="bg-white rounded-lg border border-gray-200 hover:border-[#003C71] hover:shadow-md transition-all duration-300 group p-2 sm:p-3">
        <div className="relative w-full pt-[80%] sm:pt-[100%] overflow-hidden rounded-lg">
          <Image
            src={product.imageUrl || "/placeholder-image.jpg"}
            alt={product.productName}
            fill
            className="object-contain p-2"
            loading="lazy"
          />
        </div>

        <div className="p-1 sm:p-2 space-y-1 sm:space-y-2">
          <h3 className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-2 group-hover:text-gray-700 min-h-[32px] sm:min-h-[40px]">
            {product.productName}
          </h3>

          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-sm sm:text-base font-bold text-gray-700">
              {product.gia
                ? `${Number(product.gia).toLocaleString()}đ`
                : "Liên hệ CSKH"}
            </span>
            <span
              className="text-xs sm:text-sm text-gray-700 shrink-0 max-w-[60px] truncate relative group cursor-help"
              title={`${product.don_vi_DH ? `${product.don_vi_DH}` : ""}`}
            >
              {product.don_vi_DH ? `/${product.don_vi_DH}` : ""}
            </span>
          </div>

          {/* Nút Xem chi tiết */}
          <button
            onClick={() => {
              const masanpham = product.productCode || product.productId;
              // Lưu thông tin sản phẩm vào localStorage trước khi chuyển hướng
              localStorage.setItem("productDetail", JSON.stringify(product));
              
              // Generate new SEO-friendly URL with hierarchy
              const newUrl = generateProductUrl(product, hierarchy);
              router.push(newUrl);
            }}
            className="w-full px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-all duration-200"
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

          <button
            onClick={() => toggleProductDetails(product.productId)}
            className="text-[10px] sm:text-xs text-gray-500 hover:text-[#003C71] flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
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
            <span>
              {openProduct === product.productId
                ? "Ẩn thông tin"
                : "Xem thông tin"}
            </span>
          </button>

          {openProduct === product.productId && (
            <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs space-y-1 border-t pt-1">
              <p>
                <span className="font-medium">Thương hiệu:</span>{" "}
                {product.brand}
              </p>
              <p>
                <span className="font-medium">Quy cách:</span>{" "}
                {product.specification}
              </p>
              <p>
                <span className="font-medium">Hoàn thiện:</span>{" "}
                {product.surfaceFinish}
              </p>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 flex items-center border border-gray-200 rounded-md overflow-hidden">
              <button
                onClick={() =>
                  handleQuantityChange(
                    product.productId,
                    (quantities[product.productId] || 1) - 1
                  )
                }
                className="w-full h-6 flex items-center justify-center hover:bg-gray-50"
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
                className="w-full h-6 text-center focus:outline-none text-xs border-x border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={isDisabled(product)}
              />
              <button
                onClick={() =>
                  handleQuantityChange(
                    product.productId,
                    (quantities[product.productId] || 1) + 1
                  )
                }
                className="w-full h-6 flex items-center justify-center hover:bg-gray-50"
                disabled={isDisabled(product)}
              >
                <span className="text-gray-600">+</span>
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
      </div>
    ),
    [
      quantities,
      isDisabled,
      toggleProductDetails,
      handleQuantityChange,
      handleAddToCart,
      openProduct,
    ]
  );
  // Mobile view
  const renderMobileCard = useCallback(
    (product: PurchasedProduct) => (
      <>
        <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-lg">
          <Image
            src={product.imageUrl || "/placeholder-image.jpg"}
            alt={product.productName}
            fill
            className="object-contain p-1"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-sm font-medium text-gray-700 line-clamp-2">
              {product.productName}
            </h3>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sm font-bold text-gray-700">
              {product.gia
                ? `${Number(product.gia).toLocaleString()}đ`
                : "Liên hệ CSKH"}
            </span>
            <span className="text-xs text-gray-700">
              {product.don_vi_DH ? `/${product.don_vi_DH}` : ""}
            </span>
          </div>

          {/* Nút Xem chi tiết cho Mobile */}
          <button
            onClick={() => {
              const masanpham = product.productCode || product.productId;
              // Lưu thông tin sản phẩm vào localStorage trước khi chuyển hướng
              localStorage.setItem("productDetail", JSON.stringify(product));
              
              // Generate new SEO-friendly URL with hierarchy
              const newUrl = generateProductUrl(product, hierarchy);
              router.push(newUrl);
            }}
            className="w-full mt-2 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-all duration-200"
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

          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 flex items-center border border-gray-200 rounded-md overflow-hidden">
              <button
                onClick={() =>
                  handleQuantityChange(
                    product.productId,
                    (quantities[product.productId] || 1) - 1
                  )
                }
                className="w-full h-6 flex items-center justify-center hover:bg-gray-50"
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
                className="w-full h-6 text-center focus:outline-none text-xs border-x border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={isDisabled(product)}
              />
              <button
                onClick={() =>
                  handleQuantityChange(
                    product.productId,
                    (quantities[product.productId] || 1) + 1
                  )
                }
                className="w-full h-6 flex items-center justify-center hover:bg-gray-50"
                disabled={isDisabled(product)}
              >
                <span className="text-gray-600">+</span>
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
      </>
    ),
    [quantities, isDisabled, handleQuantityChange, handleAddToCart]
  );

  if (loading) return <Loading />;
  if (error) return errorMessage;
  if (!localProducts.length) return emptyState;

  return isMobile ? (
    <>
      <div className="py-4 px-4 bg-white drop-shadow-lg inset-shadow-3xs rounded-lg sm:space-y-2">
        {/* Mobile Content */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-base font-bold text-gray-700">
              SẢN PHẨM ĐÃ MUA
            </span>
          </div>
        </div>

        <div
          className={`grid ${
            isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-5"
          } gap-2 sm:gap-4`}
        >
          {localProducts.slice(0, visibleItems).map((product) => (
            <div
              key={product.productId}
              className={`${
                isMobile
                  ? "flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200"
                  : ""
              }`}
            >
              {isMobile ? renderMobileCard(product) : renderProductCard(product)}
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
      </div>
    </>
  ) : (
    <>
      <div className="py-4 px-4 bg-white drop-shadow-lg inset-shadow-3xs rounded-lg sm:space-y-2">
        {/* Content */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-base font-bold text-gray-700">
              SẢN PHẨM ĐÃ MUA
            </span>
          </div>
        </div>

        <div
          className={`grid ${
            isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-5"
          } gap-2 sm:gap-4`}
        >
          {localProducts.slice(0, visibleItems).map((product) => (
            <div
              key={product.productId}
              className={`${
                isMobile
                  ? "flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200"
                  : ""
              }`}
            >
              {isMobile ? renderMobileCard(product) : renderProductCard(product)}
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
      </div>
    </>
  );
};

export default React.memo(PurchasedProductsList);
