import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
import axios from "axios";
import { Products } from "../../../../model/interface/ProductCartData";
import { CartItem } from "../../../../model/interface/ProductCartData";
import InlineSpinner from "@/components/InlineSpinner";
import Diacritics from "diacritics";
import { getItem } from "@/utils/SecureStorage";
import { useDebounce } from 'use-debounce';
import { productDataCache, productGroupCache } from "../ProductGroupImage";
import { ProductTableIndexProps, SortConfig, TableStyles, ColumnWidths } from "../../../../model/interface/ProductTableIndexProps";
import { useCart } from "@/components/CartManager";

const ProductDetailPopup = lazy(
  () => import("../ProductDetailPopup/ProductDetailPopup")
);

const ProductTable_index: React.FC<ProductTableIndexProps> = ({
  ID,
  searchTerm,
  initialQuantity,
  startIndex,
  totalPages,
  onPageChange,
  onAddToCart,
  usePreloadedData = false,
  preloadedData = [],
  isPriceViewer = false,
  customerSelectId,
}) => {
  const { cartItems } = useCart();
  const [currentPage, setCurrentPage] = useState(1);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [popupProductId, setPopupProductId] = useState<string | null>(null);
  const [allData, setAllData] = useState<Products[]>([]);
  const [loading, setLoading] = useState(!usePreloadedData);
  const [error, setError] = useState<Error | null>(null);
  const [popupProductdv, setPopupProductdv] = useState<string | null>(null);
  const [popupProductPrice, setPopupProductPrice] = useState<number | string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [isDesktop, setIsDesktop] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Products;
    direction: "ascending" | "descending";
  }>({
    key: "crdfd_quycach",
    direction: "descending",
  });
  const [isExpanded, setIsExpanded] = useState(false); // Trạng thái mở/thu gọn
  const [isShowingAll, setIsShowingAll] = useState(false);
  const [promotionData, setPromotionData] = useState<any[]>([]);
  const [promotionLoading, setPromotionLoading] = useState(true);

  // Các khai báo về classes cho các cột trong bảng
  const columnClasses =
    "px-3 py-2 whitespace-nowrap text-black overflow-hidden text-ellipsis";
  const columnWidths = {
    quyCach: "w-1/3 md:w-1/4",
    hoanThien: "w-1/3 md:w-1/4",
    gia: "w-1/3 md:w-1/4",
    // action: "w-1/7 hidden md:table-cell",
  };

  const tableStyles = {
    headerCell: "px-4 py-3 text-xs font-semibold text-gray-700 bg-gray-50 border-b cursor-pointer",
    row: "hover:bg-gray-50 cursor-pointer transition-colors duration-150 ease-in-out",
    cell: "px-4 py-3 text-sm",
  };

  const url = new URL(window.location.href).pathname;

  const useCustomerData = (customerId: string | null) => {
    const [potentialProducts, setPotentialProducts] = useState<string[]>([]);

    useEffect(() => {
      const fetchCustomerData = async () => {
        if (!customerId) return;
        try {
          const response = await axios.get(
            `/api/getCustomerData?customerId=${customerId}`
          );
          setPotentialProducts(response.data.potentialProducts);
        } catch (error) {
          console.error("Lỗi khi lấy dữ liệu khách hàng - useCustomerData - line 82 : ", error);
        }
      };
      fetchCustomerData();
    }, [customerId]);

    return potentialProducts;
  };

  const [debouncedSearchTerm] = useDebounce(searchTerm, 300); // Debounce 300ms

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize(); // Initialize on mount
    window.addEventListener("resize", handleResize); // Listen for resize events

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Sử dụng dữ liệu được truyền vào
  useEffect(() => {
    // Debug logging
    console.log('=== PRODUCT TABLE USEEFFECT DEBUG ===');
    console.log('preloadedData received:', preloadedData);
    console.log('preloadedData length:', preloadedData?.length || 0);
    console.log('debouncedSearchTerm:', debouncedSearchTerm);
    console.log('debouncedSearchTerm.trim():', debouncedSearchTerm.trim());
    console.log('=====================================');
    
    let filteredData = preloadedData;
    // Lọc theo searchTerm nếu có
    if (debouncedSearchTerm.trim() !== "") {
      console.log('Filtering by search term:', debouncedSearchTerm);
      filteredData = preloadedData.filter((item: Products) => {
        const searchString = Diacritics.remove(debouncedSearchTerm.toLowerCase());
        const itemName = Diacritics.remove(
          item.crdfd_name?.toLowerCase() || ""
        );
        const matches = itemName.includes(searchString);
        console.log(`Item "${item.crdfd_name}" matches "${debouncedSearchTerm}":`, matches);
        return matches;
      });
      console.log('Filtered data length:', filteredData.length);
    } else {
      console.log('No search term - using all preloadedData');
    }
    
    console.log('Final filteredData length:', filteredData.length);
    setAllData(filteredData);
    setLoading(false);
  }, [ID, debouncedSearchTerm, preloadedData]);

  const sortData = useCallback(
    (key: keyof Products) => {
      let direction: "ascending" | "descending" = "ascending";
      if (sortConfig.key === key && sortConfig.direction === "ascending") {
        direction = "descending";
      }

      const sortedData = [...allData].sort((a, b) => {
        let valueA = a[key] !== undefined && a[key] !== null ? a[key] : "";
        let valueB = b[key] !== undefined && b[key] !== null ? b[key] : "";

        // Xử lý đặc biệt cho trường giá bán
        if (key === "cr1bb_giaban") {
          // Chuyển đổi giá từ string sang number
          valueA = typeof valueA === "string" ? 
            parseFloat(valueA.replace(/[^\d.-]/g, '')) || 0 : 
            Number(valueA) || 0;
          
          valueB = typeof valueB === "string" ? 
            parseFloat(valueB.replace(/[^\d.-]/g, '')) || 0 : 
            Number(valueB) || 0;

          // Sort số
          return direction === "ascending" ? 
            (valueA as number) - (valueB as number) : 
            (valueB as number) - (valueA as number);
        }

        // Xử lý cho các trường khác
        if (typeof valueA === "number" && typeof valueB === "number") {
          return direction === "ascending" ? valueA - valueB : valueB - valueA;
        } 
        
        if (typeof valueA === "string" && typeof valueB === "string") {
          return direction === "ascending"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }

        return 0;
      });

      setAllData(sortedData);
      setSortConfig({ key, direction });
    },
    [allData, sortConfig]
  );

  const getSortArrow = (key: keyof Products) => {
    if (sortConfig.key === key) {
      return (
        <span style={{ fontSize: '1.5em' }}>
          {sortConfig.direction === "ascending" ? "↑" : "↓"}
        </span>
      );
    }
    return "";
  };

  const handleQuantityChange = useCallback(
    (productId: string, newQuantityOrDelta: number) => {
      setQuantities((prev) => {
        if (isNaN(newQuantityOrDelta)) {
          // Nếu newQuantityOrDelta là NaN, trả về NaN cho productId này
          return { ...prev, [productId]: 0 };
        }
        const currentQuantity = prev[productId] || 0;
        const newQuantity =
          typeof newQuantityOrDelta === "number" && newQuantityOrDelta >= 0
            ? newQuantityOrDelta
            : Math.max(0, currentQuantity + (newQuantityOrDelta || 0));

        return { ...prev, [productId]: newQuantity };
      });
    },
    []
  );
  const handleRowClick = useCallback((productId: string, dv: string, price: number | string) => {
    // Kiểm tra tất cả các điều kiện để xác định chính xác sản phẩm
    const isCurrentProduct = 
      popupProductId === productId && 
      popupProductdv === dv && 
      popupProductPrice === price;

    // Nếu đang mở đúng sản phẩm này thì đóng, ngược lại mở sản phẩm mới
    if (isCurrentProduct) {
      setPopupProductId(null);
      setPopupProductdv(null);
      setPopupProductPrice(null);
    } else {
      setPopupProductId(productId);
      setPopupProductdv(dv);
      setPopupProductPrice(price);
    }
  }, [popupProductId, popupProductdv, popupProductPrice]);

  const handleClosePopup = useCallback(() => {
    setPopupProductId(null);
    setPopupProductdv(null);
  }, []);

  const formatPrice = useCallback(
    (price: number | string | null | undefined): string => {
      if (
        price === null ||
        price === undefined ||
        price === ""
      ) {
        return "Liên hệ CSKH";
      }
      const numPrice = typeof price === "string" ? parseFloat(price) : price;
      if (isNaN(numPrice) || numPrice === 0) {
        return "Liên hệ CSKH";
      }
      return `${numPrice.toLocaleString()} đ`;
    },
    []
  );

  // Thêm hàm format tên sản phẩm
  const formatProductName = useCallback((name: string) => {
    if (!name) return '';
    
    const words = name.split(' ');
    const uniqueWords = new Set<string>();
    const result: string[] = [];
    
    words.forEach(word => {
      const lowerWord = word.toLowerCase();
      if (!uniqueWords.has(lowerWord)) {
        uniqueWords.add(lowerWord);
        result.push(word);
      }
    });
    
    return result.join(' ');
  }, []);

  // Lấy customerId từ localStorage
  const Idlogin = getItem("id");
  const typeLogin = getItem("type");
  const selectedCustomerId = getItem("selectedCustomerId");
  // Ưu tiên sử dụng customerSelectId từ props, sau đó mới dùng localStorage
  const customerId = customerSelectId || (isPriceViewer ? selectedCustomerId : (typeLogin === "sale" ? selectedCustomerId : Idlogin));

  // Fetch promotion data khi mount hoặc khi customerId thay đổi
  useEffect(() => {
    const fetchPromotionData = async () => {
      if (!customerId) {
        setPromotionLoading(false);
        setPromotionData([]);
        return;
      }
      try {
        setPromotionLoading(true);
        const response = await axios.get(`/api/getPromotionDataNewVersion?id=${customerId}`);
        setPromotionData(response.data || []);
      } catch (error) {
        console.error('Error fetching promotion data:', error);
        setPromotionData([]);
      } finally {
        setPromotionLoading(false);
      }
    };
    fetchPromotionData();
  }, [customerId, customerSelectId]);

  // Hàm tìm promotion phù hợp cho sản phẩm
  const findPromotionForProduct = useCallback((item: Products) => {
    let bestPromotion = null;
    let maxDiscount = 0;

    for (const group of promotionData) {
      if (!group.promotions) continue;
      for (const promo of group.promotions) {
        let isApplicable = false;
        let currentDiscount = 0;

        // Kiểm tra theo mã sản phẩm
        if (promo.productCodes) {
          const productCodes = promo.productCodes.split(',').map((code: string) => code.trim());
          if (productCodes.includes(item.crdfd_masanpham)) {
            isApplicable = true;
          }
        }
        // Kiểm tra theo mã nhóm
        if (!isApplicable && promo.productGroupCodes) {
          const groupCodes = promo.productGroupCodes.split(',').map((code: string) => code.trim());
          if (groupCodes.includes(item.crdfd_manhomsp)) {
            isApplicable = true;
          }
        }

        if (isApplicable) {
          const basePrice = parseFloat(item.cr1bb_giaban) || 0;
          const value = parseFloat(promo.value) || 0;
          
          // Tính giá trị giảm giá
          if (promo.vn === 191920000 || promo.cr1bb_vn === "%") {
            // Giảm theo %
            currentDiscount = basePrice * (value / 100);
          } else {
            // Giảm theo số tiền
            currentDiscount = value;
          }

          // Cập nhật promotion tốt nhất nếu giảm giá cao hơn
          if (currentDiscount > maxDiscount) {
            maxDiscount = currentDiscount;
            bestPromotion = {
              ...promo,
              promotionId: promo.promotion_id
            };
          }
        }
      }
    }
    return bestPromotion;
  }, [promotionData]);

  // Hàm tính giá KM 1
  const getPromotionPrice = useCallback((item: Products) => {
    const promo = findPromotionForProduct(item);
    if (!promo) return null;
    const basePrice = parseFloat(item.cr1bb_giaban) || 0;
    const value = parseFloat(promo.value) || 0;
    if (promo.vn === 191920000 || promo.cr1bb_vn === "%") {
      // Giảm theo %
      return basePrice * (1 - value / 100);
    } else {
      // Giảm theo số tiền
      return basePrice - value;
    }
  }, [findPromotionForProduct]);

  const handleCheckPromotion = useCallback(async (productId: string, productName: string) => {
    try {
      // Gọi API promotion-orders để kiểm tra promotion cho sản phẩm này
      const response = await axios.get('/api/admin-app/promotion-orders', {
        params: {
          productCodes: `SP-${productId}`,
          customerCode: customerId ? `KH-${customerId}` : undefined
        }
      });

      const data = response.data;
      let message = `Promotion cho sản phẩm "${productName}":\n\n`;

      if (data.availablePromotions && data.availablePromotions.length > 0) {
        message += `Có ${data.availablePromotions.length} promotion khả dụng:\n`;
        data.availablePromotions.forEach((promo: any, index: number) => {
          message += `${index + 1}. ${promo.name} - ${promo.value}${promo.vndOrPercent === '%' ? '%' : 'đ'}\n`;
        });
      } else {
        message += "Không có promotion khả dụng cho sản phẩm này.";
      }

      if (data.specialPromotions && data.specialPromotions.length > 0) {
        message += `\n\nPromotion đặc biệt:\n`;
        data.specialPromotions.forEach((promo: any, index: number) => {
          message += `${index + 1}. ${promo.name} - ${promo.value}${promo.vndOrPercent === '%' ? '%' : 'đ'}\n`;
        });
      }

      alert(message);
    } catch (error) {
      console.error('Error checking promotion:', error);
      alert('Có lỗi xảy ra khi kiểm tra promotion. Vui lòng thử lại.');
    }
  }, [customerId]);

  // Debug loading states
  
  if (loading || promotionLoading) {
    return <InlineSpinner />;
  }

  const toggleExpand = () => {
    setDisplayLimit(prev => prev + 10);
    setIsShowingAll(false);
  };

  const showAll = () => {
    setDisplayLimit(allData.length);
    setIsShowingAll(true);
  };

  const collapse = () => {
    setDisplayLimit(10);
    setIsShowingAll(false);
    
    // Find the closest parent element with the product list
    const productListElement = document.querySelector('[data-product-list]');
    if (productListElement) {
      productListElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const displayedData = allData.slice(0, displayLimit);
  
  // Debug logging
  console.log('=== PRODUCT TABLE DEBUG ===');
  console.log('allData:', allData);

  const renderDesktopView = () => (
    <div className="hidden md:block overflow-hidden bg-white rounded-lg shadow-sm" data-product-list>
      {isPriceViewer && (
        <div className="bg-purple-50 border-b border-purple-200 px-4 py-2">
          <div className="flex items-center gap-2 text-purple-800 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Chế độ xem giá - Giá hiển thị đã bao gồm khuyến mãi (nếu có)</span>
          </div>
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            {[
              "Tên sản phẩm",
              "Quy cách",
              "Hoàn thiện",
              "Giá bán",
              "Actions"
            ].map((header, index) => {
              const columnKeys: (keyof Products)[] = [
                "crdfd_name",
                "crdfd_quycach",
                "crdfd_hoanthienbemat",
                "cr1bb_giaban",
                "crdfd_productsid", // dummy key for Actions column
              ];
              return (
                <th
                  key={header}
                  className={`${tableStyles.headerCell} ${
                    index === 3 ? 'text-right' : 'text-left'
                  }`}
                  onClick={() => index < 4 ? sortData(columnKeys[index]) : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span>{header}</span>
                    <span className="text-gray-400">{getSortArrow(columnKeys[index])}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {displayedData.map((item) => {
            const promo = findPromotionForProduct(item);
            const promoPrice = getPromotionPrice(item);
            return (
              <React.Fragment key={`${item.crdfd_productsid}_${item._crdfd_onvi_value}`}>
                <tr
                  className={`${tableStyles.row} ${
                    popupProductId === item.crdfd_productsid &&
                    popupProductdv === item._crdfd_onvi_value &&
                    popupProductPrice === item.cr1bb_giaban
                      ? 'bg-blue-100 shadow-md relative z-10 border border-blue-200'
                      : ''
                  }`}
                  onClick={() => handleRowClick(item.crdfd_productsid, item._crdfd_onvi_value || '', item.cr1bb_giaban)}
                >
                  <td className={tableStyles.cell}>
                    <div className="break-words text-gray-700">
                      {formatProductName(item.crdfd_name || '')}
                    </div>
                  </td>
                  <td className={tableStyles.cell}>
                    <div className="break-words text-gray-700">
                      {item.crdfd_quycach || ""}
                    </div>
                  </td>
                  <td className={tableStyles.cell}>
                    <div className="break-words text-gray-700">
                      {item.crdfd_hoanthienbemat || ""}
                    </div>
                  </td>
                  <td className={`${tableStyles.cell} text-right`}>
                    <div className="font-medium text-gray-700">
                      {promoPrice !== null && formatPrice(item.cr1bb_giaban) !== "Liên hệ CSKH"
                        ? <span className="text-[#1677ff] font-bold">{formatPrice(Math.round(promoPrice))}</span>
                        : formatPrice(item.cr1bb_giaban)}
                    </div>
                    {promoPrice !== null && formatPrice(item.cr1bb_giaban) !== "Liên hệ CSKH" && (
                      <div className="text-xs text-gray-500 line-through">{formatPrice(item.cr1bb_giaban)}</div>
                    )}
                    {item.don_vi_DH && ((promoPrice !== null
                      ? formatPrice(Math.round(promoPrice))
                      : formatPrice(item.cr1bb_giaban)) !== "Liên hệ CSKH") && (
                      <div className="text-xs text-gray-500">
                        /{item.don_vi_DH}
                      </div>
                    )}
                  </td>
                  <td className={`${tableStyles.cell} text-center`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                        handleCheckPromotion(item.crdfd_productsid, item.crdfd_name || '');
                      }}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      title="Kiểm tra promotion cho sản phẩm này"
                    >
                      Promotion
                    </button>
                  </td>
                </tr>
                {popupProductId === item.crdfd_productsid &&
                  popupProductdv === item._crdfd_onvi_value &&
                  popupProductPrice === item.cr1bb_giaban && (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <div className="border-t">
                                                  <ProductDetailPopup
                          item={{
                            ...item,
                            crdfd_gtgt: item.crdfd_gtgt ?? 0,
                            unit: item.unit || '',
                            price: item.price || '',
                            priceChangeReason: item.priceChangeReason || '',
                            crdfd_giatheovc: (typeof item.crdfd_giatheovc === 'number' ? item.crdfd_giatheovc.toString() : (item.crdfd_giatheovc || '')),
                            isPriceUpdated: item.isPriceUpdated ?? false,
                            crdfd_thuonghieu: item.crdfd_thuonghieu || '',
                            crdfd_quycach: item.crdfd_quycach || '',
                            crdfd_hoanthienbemat: item.crdfd_hoanthienbemat || '',
                            crdfd_masanpham: item.crdfd_masanpham || '',
                            crdfd_chatlieu: item.crdfd_chatlieu || '',
                            crdfd_nhomsanphamtext: item.crdfd_nhomsanphamtext || '',
                            crdfd_productgroup: item.crdfd_productgroup || '',
                            cr1bb_giaban_Bg: item.cr1bb_giaban_Bg || '',
                            cr1bb_nhomsanphamcha: item.cr1bb_nhomsanphamcha || '',
                            crdfd_manhomsp: item.crdfd_manhomsp || '',
                            crdfd_onvichuantext: item.crdfd_onvichuantext || '',
                            _crdfd_onvi_value: item._crdfd_onvi_value || '',
                            cr1bb_tylechuyenoi: item.cr1bb_tylechuyenoi || '',
                            don_vi_DH: item.don_vi_DH || '',
                            cr1bb_imageurl: item.cr1bb_imageurl || '',
                            cr1bb_banchatgiaphatra: item.cr1bb_banchatgiaphatra ?? 0,
                            crdfd_gtgt_value: item.crdfd_gtgt_value ?? 0,
                            cr1bb_giakhongvat: item.cr1bb_giakhongvat ?? 0,
                            crdfd_onvichuan: item.crdfd_onvichuan || '',
                            crdfd_onvi: item.crdfd_onvi || '',
                            crdfd_trangthaihieulucname: item.crdfd_trangthaihieulucname || '',
                            crdfd_trangthaihieuluc: item.crdfd_trangthaihieuluc ?? 0,
                            cr1bb_imageurlproduct: item.cr1bb_imageurlproduct || '',
                            promotion: item.promotion
                              ? {
                                  crdfd_value: item.promotion.value || "",
                                  cr1bb_vn: item.promotion.cr1bb_vn || "",
                                  crdfd_name: item.promotion.name || "",
                                  soluongapdung: item.promotion.soluongapdung,
                                }
                              : undefined,
                          }}
                          quantity={quantities[item.crdfd_productsid] || 0}
                          onQuantityChange={(delta: number) =>
                            handleQuantityChange(item.crdfd_productsid, delta)
                          }
                          onAddToCart={onAddToCart as any}
                          onClose={handleClosePopup}
                          cartItems={cartItems as any}
                          isPriceViewer={isPriceViewer}
                        />
                        </div>
                      </td>
                    </tr>
                  )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderMobileView = () => (
    <div className="md:hidden space-y-2" data-product-list>
      {isPriceViewer && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mb-2">
          <div className="flex items-center gap-2 text-purple-800 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Chế độ xem giá - Giá hiển thị đã bao gồm khuyến mãi</span>
          </div>
        </div>
      )}
      <div className="bg-gray-50 rounded-t-lg border-b border-gray-200">
        <div className="flex justify-between items-center px-3 py-2.5">
          <div className="text-sm font-bold text-gray-700">Tên sản phẩm</div>
          <div className="text-sm font-bold text-gray-700 text-right">Giá</div>
        </div>
      </div>
      {displayedData.map((item) => {
        const promoPrice = getPromotionPrice(item);
        return (
          <div 
            key={`${item.crdfd_productsid}_${item._crdfd_onvi_value}`}
            className={`bg-white rounded-lg overflow-hidden ${
              popupProductId === item.crdfd_productsid &&
              popupProductdv === item._crdfd_onvi_value &&
              popupProductPrice === item.cr1bb_giaban
                ? 'bg-blue-100 border border-blue-200'
                : 'shadow-sm'
            }`}
          >
            <div
              className={`p-2.5 cursor-pointer transition-colors duration-150 ease-in-out ${
                popupProductId === item.crdfd_productsid &&
                popupProductdv === item._crdfd_onvi_value &&
                popupProductPrice === item.cr1bb_giaban
                  ? 'bg-blue-100'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleRowClick(item.crdfd_productsid, item._crdfd_onvi_value || '', item.cr1bb_giaban)}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 break-words">
                    {formatProductName(item.crdfd_name || '')}
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end">
                  {promoPrice !== null ? (
                    <>
                      <span className="text-[#1677ff] font-bold text-base">{formatPrice(Math.round(promoPrice))}</span>
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(item.cr1bb_giaban)}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium text-gray-700">{formatPrice(item.cr1bb_giaban)}</span>
                  )}
                  {item.don_vi_DH && ((promoPrice !== null
                    ? formatPrice(Math.round(promoPrice))
                    : formatPrice(item.cr1bb_giaban)) !== "Liên hệ CSKH") && (
                    <div className="text-xs text-gray-500">/{item.don_vi_DH}</div>
                  )}
                </div>
              </div>
              <div className="px-2.5 pb-2.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleCheckPromotion(item.crdfd_productsid, item.crdfd_name || '');
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Kiểm tra promotion cho sản phẩm này"
                >
                  Kiểm tra Promotion
                </button>
              </div>
            </div>

            {popupProductId === item.crdfd_productsid &&
              popupProductdv === item._crdfd_onvi_value &&
              popupProductPrice === item.cr1bb_giaban && (
                <div className="border-t">
                  <ProductDetailPopup
                    item={{
                      ...item,
                      crdfd_gtgt: item.crdfd_gtgt ?? 0,
                      unit: item.unit || '',
                      price: item.price || '',
                      priceChangeReason: item.priceChangeReason || '',
                      crdfd_giatheovc: (typeof item.crdfd_giatheovc === 'number' ? item.crdfd_giatheovc.toString() : (item.crdfd_giatheovc || '')),
                      isPriceUpdated: item.isPriceUpdated ?? false,
                      crdfd_thuonghieu: item.crdfd_thuonghieu || '',
                      crdfd_quycach: item.crdfd_quycach || '',
                      crdfd_hoanthienbemat: item.crdfd_hoanthienbemat || '',
                      crdfd_masanpham: item.crdfd_masanpham || '',
                      crdfd_chatlieu: item.crdfd_chatlieu || '',
                      crdfd_nhomsanphamtext: item.crdfd_nhomsanphamtext || '',
                      crdfd_productgroup: item.crdfd_productgroup || '',
                      cr1bb_giaban_Bg: item.cr1bb_giaban_Bg || '',
                      cr1bb_nhomsanphamcha: item.cr1bb_nhomsanphamcha || '',
                      crdfd_manhomsp: item.crdfd_manhomsp || '',
                      crdfd_onvichuantext: item.crdfd_onvichuantext || '',
                      _crdfd_onvi_value: item._crdfd_onvi_value || '',
                      cr1bb_tylechuyenoi: item.cr1bb_tylechuyenoi || '',
                      don_vi_DH: item.don_vi_DH || '',
                      cr1bb_imageurl: item.cr1bb_imageurl || '',
                      cr1bb_banchatgiaphatra: item.cr1bb_banchatgiaphatra ?? 0,
                      crdfd_gtgt_value: item.crdfd_gtgt_value ?? 0,
                      cr1bb_giakhongvat: item.cr1bb_giakhongvat ?? 0,
                      crdfd_onvichuan: item.crdfd_onvichuan || '',
                      crdfd_onvi: item.crdfd_onvi || '',
                      crdfd_trangthaihieulucname: item.crdfd_trangthaihieulucname || '',
                      crdfd_trangthaihieuluc: item.crdfd_trangthaihieuluc ?? 0,
                      cr1bb_imageurlproduct: item.cr1bb_imageurlproduct || '',
                      promotion: item.promotion
                        ? {
                            crdfd_value: item.promotion.value || "",
                            cr1bb_vn: item.promotion.cr1bb_vn || "",
                            crdfd_name: item.promotion.name || "",
                            soluongapdung: item.promotion.soluongapdung,
                          }
                        : undefined,
                    }}
                    quantity={quantities[item.crdfd_productsid] || 0}
                    onQuantityChange={(delta: number) =>
                      handleQuantityChange(item.crdfd_productsid, delta)
                    }
                    onAddToCart={onAddToCart as any}
                    onClose={handleClosePopup}
                    cartItems={cartItems as any}
                    isPriceViewer={isPriceViewer}
                  />
                </div>
              )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {isDesktop ? renderDesktopView() : renderMobileView()}

      <div className="flex justify-center mt-4 gap-3 text-sm pb-6">
        {!isShowingAll && allData.length > displayLimit && (
          <>
            <button
              onClick={toggleExpand}
              className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all duration-150 ease-in-out"
            >
              <svg
                className="w-4 h-4 mr-1.5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              +10 ({allData.length - displayLimit})
            </button>

            <button
              onClick={showAll}
              className="inline-flex items-center px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-md shadow-sm hover:bg-blue-100 hover:border-blue-300 active:bg-blue-200 transition-all duration-150 ease-in-out"
            >
              <svg
                className="w-4 h-4 mr-1.5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              Tất cả
            </button>
          </>
        )}

        {displayLimit > 10 && (
          <button
            onClick={collapse}
            className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all duration-150 ease-in-out"
          >
            <svg
              className="w-4 h-4 mr-1.5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            Thu gọn
          </button>
        )}
      </div>
    </>
  );
};

export default ProductTable_index;
