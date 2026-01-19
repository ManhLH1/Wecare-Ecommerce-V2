import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { productsCache } from '@/utils/cache';

// Add CSS animations
const dropdownStyles = `
  @keyframes slideInFromLeft {
    0% {
      opacity: 0;
      transform: translateX(-20px) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  
  @keyframes fadeIn {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  
  .dropdown-enter {
    animation: slideInFromLeft 0.3s ease-out;
  }
  
  .fade-in {
    animation: fadeIn 0.2s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = dropdownStyles;
  document.head.appendChild(styleSheet);
}

// Helper: robustly extract price from various shapes
const extractPrice = (p: any): number | null => {
  const direct = p?.cr1bb_giaban ?? p?.giaban ?? p?.price ?? p?.crdfd_price;
  const toNum = (v: any) => {
    if (v === null || v === undefined) return NaN;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  let n = toNum(direct);
  if (Number.isFinite(n) && n > 0) return n;

  // Try nested json price
  let priceJson: any = p?.cr1bb_json_gia ?? p?.json_gia ?? p?.prices;
  try {
    if (typeof priceJson === 'string') priceJson = JSON.parse(priceJson);
  } catch {}

  const candidates: any[] = Array.isArray(priceJson) ? priceJson : [priceJson];
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    const cand = c.crdfd_gia ?? c.basePrice ?? c.gia ?? c.price ?? c.crdfd_giatheovc ?? c.priceWithVAT;
    n = toNum(cand);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
};

interface JDStyleCategorySidebarProps {
  categoryGroups: any[];
  categoryHierarchy?: any;
  loadingCategory: boolean;
  onCategorySelect: (group: any) => void;
  getIcon: (groupName: string) => React.ReactNode;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

// Get subcategories from real API data
const getSubcategories = (categoryId: string, categoryHierarchy: any) => {
  if (!categoryHierarchy?.byLevel?.["2"]) return [];
  
  // Giữ nguyên thứ tự từ API (đã sắp xếp theo CSV)
  return categoryHierarchy.byLevel["2"]
    .filter((item: any) => item._crdfd_nhomsanphamcha_value === categoryId);
};


// Enhanced icon function for subcategories - consistent with homepage
const getIcon = (groupName: string) => {
  const normalized = groupName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d");

  // Máy móc & Thiết bị công nghiệp
  if (normalized.includes("may moc") || normalized.includes("maymoc"))
    return "⚙️";
  if (
    normalized.includes("thiet bi cong nghiep") ||
    normalized.includes("thietbicongnghiep")
  )
    return "🏭";
  if (
    normalized.includes("thiet bi") &&
    !normalized.includes("van chuyen") &&
    !normalized.includes("bao ho")
  )
    return "🔧";

  // Thiết bị vận chuyển
  if (
    normalized.includes("thiet bi van chuyen") ||
    normalized.includes("vanchuyen") ||
    normalized.includes("van chuyen")
  ) {
    return "🚚";
  }

  // Bảo hộ lao động
  if (
    normalized.includes("bao ho") ||
    normalized.includes("an toan") ||
    normalized.includes("lao dong")
  ) {
    return "🛡️";
  }

  // Bao bì & Đóng gói
  if (normalized.includes("bao bi") || normalized.includes("dong goi")) {
    return "📦";
  }

  // Phụ tùng thay thế
  if (normalized.includes("phu tung") || normalized.includes("thay the")) {
    return "🔧";
  }

  // Vật tư tiêu hao
  if (
    normalized.includes("vat tu tieu hao") ||
    normalized.includes("tieu hao")
  ) {
    return "♻️";
  }

  // Kim khí & Phụ kiện
  if (normalized.includes("kim khi") || normalized.includes("phu kien")) {
    return "📦";
  }

  // Công cụ - Dụng cụ
  if (normalized.includes("cong cu") || normalized.includes("dung cu")) {
    return "🔨";
  }

  // Hóa chất
  if (normalized.includes("hoa chat") || normalized.includes("hoachat")) {
    return "🧪";
  }

  // Điện & Điện tử
  if (normalized.includes("dien") || normalized.includes("dien tu")) {
    return "⚡";
  }

  // Nhà máy & Xưởng
  if (normalized.includes("nha may") || normalized.includes("xuong")) {
    return "🏭";
  }

  // Lưu kho & Vận chuyển
  if (normalized.includes("luu kho") || normalized.includes("kho hang")) {
    return "🚚";
  }

  // Default icon
  return "📋";
};

const JDStyleCategorySidebar: React.FC<JDStyleCategorySidebarProps> = ({
  categoryGroups,
  categoryHierarchy,
  loadingCategory,
  onCategorySelect,
  getIcon,
  isCollapsed = false,
  onToggle,
}) => {
  const router = useRouter();
  const [hoveredCategory, setHoveredCategory] = useState<any | null>(null);
  const [hoveredSubcategory, setHoveredSubcategory] = useState<any | null>(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isRightPanelHovered, setIsRightPanelHovered] = useState(false);
  const [isMouseInDropdown, setIsMouseInDropdown] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Navigate to product detail page
  const handleProductClick = (product: any) => {
    console.log('Product click:', product);
    console.log('crdfd_masanpham:', product.crdfd_masanpham);
    console.log('crdfd_productsid:', product.crdfd_productsid);
    
    // Store product data in localStorage for the product detail page
    localStorage.setItem('productDetail', JSON.stringify(product));
    console.log('Product data stored in localStorage:', product);
    
    if (product.crdfd_masanpham) {
      const url = `/san-pham/chi-tiet/${product.crdfd_masanpham}`;
      console.log('Navigating to:', url);
      router.push(url);
    } else if (product.crdfd_productsid) {
      const url = `/san-pham/chi-tiet/${product.crdfd_productsid}`;
      console.log('Navigating to:', url);
      router.push(url);
    } else {
      console.error('No valid product ID found for navigation');
    }
  };

  // Preload products function
  const preloadProducts = async (subcategory: any) => {
    try {
      const storedId = localStorage.getItem('id') || '';
      const customerId = storedId;
      const doiTuong = localStorage.getItem('customerGroupIds') || '';
      
      const params = new URLSearchParams();
      if (customerId) {
        params.append('customerId', customerId);
      }
      if (doiTuong) {
        params.append('doiTuong', doiTuong);
      }
      params.append('product_group_Id', subcategory.crdfd_productgroupid);
      params.append('page', '1');
      params.append('pageSize', '10');
      
      const response = await fetch(`/api/getProductsOnly?${params.toString()}`);
      const data = await response.json();
      
      // Extract products from the API response structure
      let extractedProducts: any[] = [];
      if (data.data && typeof data.data === 'object') {
        Object.values(data.data).forEach((group: any) => {
          if (group.products && Array.isArray(group.products)) {
            extractedProducts.push(...group.products);
          }
        });
      }
      
      // Cache the results
      productsCache.set(subcategory.crdfd_productgroupid, extractedProducts);
      console.log(`Preloaded ${extractedProducts.length} products for ${subcategory.crdfd_productname}`);
    } catch (error) {
      console.error('Error preloading products:', error);
    }
  };
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear timeout function
  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Clear subcategory timeout function
  const clearSubHoverTimeout = () => {
    if (subHoverTimeoutRef.current) {
      clearTimeout(subHoverTimeoutRef.current);
      subHoverTimeoutRef.current = null;
    }
  };

  // Handle mouse enter on category
  const handleCategoryMouseEnter = (category: any) => {
    clearHoverTimeout();
    setHoveredCategory(category);
    setIsDropdownVisible(true);
    
    // Preload products for the first subcategory to improve perceived performance
    if (category.children && category.children.length > 0) {
      const firstSubcategory = category.children[0];
      const cacheKey = firstSubcategory.crdfd_productgroupid;
      
      // Only preload if not already cached
      if (!productsCache.has(cacheKey)) {
        // Preload in background without showing loading state
        preloadProducts(firstSubcategory);
      }
    }
  };

  // Handle mouse leave with delay
  const handleCategoryMouseLeave = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      // Only close if not hovering dropdown and not hovering any subcategory
      if (!isRightPanelHovered && !hoveredSubcategory && !isMouseInDropdown) {
        setHoveredCategory(null);
        setHoveredSubcategory(null);
        setIsDropdownVisible(false);
      }
    }, 500); // Increased delay to prevent accidental closing
  };

  // Handle mouse enter on dropdown
  const handleDropdownMouseEnter = () => {
    clearHoverTimeout();
    clearSubHoverTimeout(); // Also clear subcategory timeout
    setIsMouseInDropdown(true);
  };

  // Handle mouse enter on right panel specifically
  const handleRightPanelMouseEnter = () => {
    clearHoverTimeout();
    clearSubHoverTimeout(); // Keep subcategory content visible
    setIsRightPanelHovered(true);
  };

  // Handle mouse leave on right panel
  const handleRightPanelMouseLeave = () => {
    setIsRightPanelHovered(false);
  };

  // Handle mouse leave on dropdown
  const handleDropdownMouseLeave = () => {
    setIsMouseInDropdown(false);
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      // Only close if no subcategory is being hovered and mouse is not in dropdown
      if (!hoveredSubcategory && !isMouseInDropdown) {
        setHoveredCategory(null);
        setHoveredSubcategory(null);
        setIsDropdownVisible(false);
        setIsRightPanelHovered(false);
      }
    }, 400); // Increased delay for better UX
  };

  // Handle subcategory click to load products
  const handleSubcategoryClick = async (subcategory: any) => {
    clearSubHoverTimeout();
    clearHoverTimeout();
    setHoveredSubcategory(subcategory);
    
    // Check cache first
    const cacheKey = subcategory.crdfd_productgroupid;
    const cached = productsCache.get(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log(`Using cached products for ${subcategory.crdfd_productname}`);
      setProducts(cached);
      setLoadingProducts(false);
      return;
    }
    
    // Clear previous products and show loading
    setProducts([]);
    setLoadingProducts(true);
    try {
      console.log(`Fetching products for subcategory: ${subcategory.crdfd_productname} (ID: ${subcategory.crdfd_productgroupid})`);
      console.log(`Subcategory productCount: ${subcategory.productCount}`);
      
      // Get customer ID and doiTuong like in productgroup-list.tsx
      const storedId = localStorage.getItem('id') || '';
      const customerId = storedId;
      const doiTuong = localStorage.getItem('customerGroupIds') || '';
      
      const params = new URLSearchParams();
      if (customerId) {
        params.append('customerId', customerId);
      }
      if (doiTuong) {
        params.append('doiTuong', doiTuong);
      }
      params.append('product_group_Id', subcategory.crdfd_productgroupid);
      params.append('page', '1');
      params.append('pageSize', '10');
      
      const response = await fetch(`/api/getProductsOnly?${params.toString()}`);
      const data = await response.json();
      
      console.log(`API Response for ${subcategory.crdfd_productname}:`, data);
      
      // Extract products from the API response structure
      let extractedProducts: any[] = [];
      if (data.data && typeof data.data === 'object') {
        // Flatten all products from all groups
        Object.values(data.data).forEach((group: any) => {
          if (group.products && Array.isArray(group.products)) {
            extractedProducts.push(...group.products);
          }
        });
      }
      
      console.log(`Received ${extractedProducts.length} products for ${subcategory.crdfd_productname}`);
      
      // Cache the results
      productsCache.set(cacheKey, extractedProducts);
      setProducts(extractedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Handle subcategory mouse leave
  const handleSubcategoryMouseLeave = () => {
    clearSubHoverTimeout();
    subHoverTimeoutRef.current = setTimeout(() => {
      // Only hide subcategory if not hovering over right panel
      if (!isRightPanelHovered) {
        setHoveredSubcategory(null);
      }
    }, 1000); // Even longer delay for subcategory to prevent auto-close
  };

  // Cleanup on unmount
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Click outside the component, close dropdown
        setIsDropdownVisible(false);
        setHoveredCategory(null);
        setHoveredSubcategory(null);
        setProducts([]);
        clearHoverTimeout();
        clearSubHoverTimeout();
      }
    };

    // Add event listener when dropdown is visible
    if (isDropdownVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownVisible]);

  useEffect(() => {
    return () => {
      clearHoverTimeout();
      clearSubHoverTimeout();
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        ref={sidebarRef}
        className="w-64 bg-white border border-gray-200 rounded-lg shadow-sm"
        onMouseLeave={handleCategoryMouseLeave}
      >
        <div className="px-2 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Danh mục sản phẩm</h3>
            {onToggle && (
              <button
                onClick={onToggle}
                className="bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded p-1.5 shadow-sm hover:shadow-md transition-all duration-200"
                title={isCollapsed ? "Hiện danh mục" : "Ẩn danh mục"}
              >
                {isCollapsed ? (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="px-1 py-2">
          {loadingCategory ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, idx) => (
                <div key={idx} className="animate-pulse flex items-center px-1 py-2">
                  <div className="w-6 h-6 bg-gray-200 rounded mr-3"></div>
                  <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {categoryGroups
                .map((group) => {
                  // Tính tổng số subcategory và sản phẩm cho mỗi category
                  const subcategories = getSubcategories(group.crdfd_productgroupid, categoryHierarchy);
                  const totalSubcategories = subcategories.length;
                  const totalProducts = subcategories.reduce((sum: number, sub: any) => sum + (sub.productCount || 0), 0);
                  
                  return {
                    ...group,
                    totalSubcategories,
                    totalProducts
                  };
                })
                // Giữ nguyên thứ tự từ API (đã sắp xếp theo CSV), chỉ lấy top 10
                .slice(0, 10)
                .map((group, idx) => (
                <div
                  key={group.crdfd_productgroupid || idx}
                  className="relative"
                  onMouseEnter={() => handleCategoryMouseEnter(group)}
                >
                  <button
                    onClick={() => onCategorySelect(group)}
                    className="w-full flex items-center px-1 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <span className="text-gray-500 mr-2 group-hover:text-cyan-600 transition-colors text-lg">
                      {getIcon(group.crdfd_productname)}
                    </span>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                      {group.crdfd_productname}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bridge Area - Invisible area to help with mouse movement */}
      {isDropdownVisible && (
        <div 
          className="absolute left-64 top-0 w-16 h-full z-40"
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
        />
      )}

      {/* Dropdown Menu - JD Style */}
      {hoveredCategory && categoryHierarchy && isDropdownVisible && (
        <div 
          ref={dropdownRef}
          className="absolute left-64 top-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl min-h-full backdrop-blur-sm max-w-[calc(100vw-20px)] transform transition-all duration-300 ease-out opacity-100 scale-100"
          style={{
            animation: 'slideInFromLeft 0.3s ease-out'
          }}
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
        >
          {/* Extended hover area at the top */}
          <div 
            className="absolute -top-8 left-0 w-full h-8 z-10"
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
          />
          {/* Extended hover area on the left */}
          <div 
            className="absolute -left-16 top-0 w-16 h-full z-10"
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
          />
          {/* Extended hover area on the right */}
          <div 
            className="absolute -right-8 top-0 w-8 h-full z-10"
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
          />
          <div className="flex h-[650px] overflow-hidden rounded-2xl w-[calc(80vw-256px)] max-w-[960px] min-w-[560px] sm:min-w-[480px]">
            {/* Left Panel - Subcategories List */}
            <div className="w-[256px] sm:w-[288px] bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0">
              <div className="px-1 py-3 sm:px-2 sm:py-4">
                {/* Header */}
                <div className="flex items-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-gray-200">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-600 mr-2 sm:mr-3 shadow-sm">
                    <span className="text-white text-lg sm:text-xl">
                      {getIcon(hoveredCategory.crdfd_productname)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      {hoveredCategory.crdfd_productname}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {(() => {
                        const subcategories = getSubcategories(hoveredCategory.crdfd_productgroupid, categoryHierarchy);
                        const totalProducts = subcategories.reduce((sum: number, sub: any) => sum + (sub.productCount || 0), 0);
                        return `${subcategories.length} nhóm • ${totalProducts.toLocaleString()} sản phẩm`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Subcategories List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getSubcategories(hoveredCategory.crdfd_productgroupid, categoryHierarchy).map((subcategory: any, idx: number) => (
                    <button
                      key={subcategory.crdfd_productgroupid || idx}
                      onClick={() => handleSubcategoryClick(subcategory)}
                      onMouseLeave={handleSubcategoryMouseLeave}
                      disabled={loadingProducts}
                      className={`w-full flex flex-col items-center p-2 sm:p-3 text-center transition-all duration-200 rounded-lg group border ${
                        hoveredSubcategory?.crdfd_productgroupid === subcategory.crdfd_productgroupid
                          ? "bg-cyan-600 text-white border-cyan-600 shadow-md"
                          : "text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      } ${loadingProducts ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105'}`}
                    >
                      {/* Icon */}
                      <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg mb-2 ${
                        hoveredSubcategory?.crdfd_productgroupid === subcategory.crdfd_productgroupid
                          ? "bg-white shadow-sm"
                          : "bg-gray-100 group-hover:bg-cyan-100"
                      }`}>
                        <span className={`text-lg sm:text-xl transition-colors ${
                          hoveredSubcategory?.crdfd_productgroupid === subcategory.crdfd_productgroupid
                            ? "text-cyan-600"
                            : "text-gray-500 group-hover:text-cyan-600"
                        }`}>
                          {getIcon(subcategory.crdfd_productname)}
                        </span>
                      </div>
                      
                      {/* Text Content */}
                      <div className="w-full">
                        <span className="text-xs sm:text-sm font-semibold block truncate mb-1">
                          {subcategory.crdfd_productname}
                        </span>
                        {loadingProducts && hoveredSubcategory?.crdfd_productgroupid === subcategory.crdfd_productgroupid ? (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          subcategory.productCount !== undefined && subcategory.productCount > 0 && (
                            <span className="text-xs text-gray-500">
                              {subcategory.productCount.toLocaleString()} sản phẩm
                            </span>
                          )
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Products or Subcategory Info */}
            <div 
              className="flex-1 bg-white overflow-y-auto min-w-0"
              onMouseEnter={handleRightPanelMouseEnter}
              onMouseLeave={handleRightPanelMouseLeave}
            >
              <div className="p-4 sm:p-5 md:p-6">
                {hoveredSubcategory ? (
                  <>
                    {/* Subcategory Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-600 mr-3 shadow-sm">
                          <span className="text-white text-lg">
                            {getIcon(hoveredSubcategory.crdfd_productname)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 mb-1">
                            {hoveredSubcategory.crdfd_productname}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Danh sách sản phẩm chi tiết
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-white bg-cyan-600 px-4 py-2 rounded-full shadow-sm font-medium">
                          {products.length.toLocaleString()} sản phẩm
                        </div>
                        <button
                          onClick={() => onCategorySelect(hoveredSubcategory)}
                          onMouseEnter={handleRightPanelMouseEnter}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Xem tất cả
                        </button>
                      </div>
                    </div>

                    {/* Main Content - Dynamic Layout */}
                    <div className={`grid grid-cols-1 gap-6 mb-6 ${(() => {
                      // Lấy danh sách thương hiệu từ các sản phẩm
                      const brands = [...new Set(products
                        .map((p: any) => p.crdfd_thuonghieu)
                        .filter(Boolean)
                        .slice(0, 8)
                      )];
                      return brands.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-1';
                    })()}`}>
                      {/* Left Column - Products */}
                      <div className={(() => {
                        // Lấy danh sách thương hiệu từ các sản phẩm
                        const brands = [...new Set(products
                          .map((p: any) => p.crdfd_thuonghieu)
                          .filter(Boolean)
                          .slice(0, 8)
                        )];
                        return brands.length > 0 ? 'lg:col-span-2' : 'lg:col-span-1';
                      })()}>
                        <h5 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          Sản phẩm
                        </h5>
                        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {loadingProducts ? (
                        <div className="col-span-2">
                          <div className="grid grid-cols-2 gap-3">
                            {/* Enhanced loading skeleton */}
                            {[...Array(8)].map((_, index) => (
                              <div key={index} className="flex flex-col items-center p-4 rounded-lg border border-gray-200 bg-white animate-pulse">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg mb-3"></div>
                                <div className="w-full h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-2"></div>
                                <div className="w-3/4 h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : products.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-gray-400 text-sm">Không có sản phẩm nào</div>
                        </div>
                      ) : (
                        products.slice(0, 10).map((product, idx) => (
                        <button
                          key={product.crdfd_productsid || idx}
                          onClick={() => handleProductClick(product)}
                          onMouseEnter={handleRightPanelMouseEnter}
                          className="w-full flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-all duration-200 group border border-gray-200 hover:border-cyan-300 hover:shadow-md bg-white hover:scale-105"
                        >
                          {/* Product Image */}
                          <div className="w-20 h-20 bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden shadow-sm border border-gray-100">
                            {product.cr1bb_imageurl || product.cr1bb_imageurlproduct ? (
                              <img
                                src={product.cr1bb_imageurl || product.cr1bb_imageurlproduct}
                                alt={product.crdfd_name}
                                className="w-full h-full object-contain rounded-lg"
                              />
                            ) : (
                              <span className="text-gray-400 text-3xl">
                                {getIcon(product.crdfd_name)}
                              </span>
                            )}
                          </div>

                           {/* Product Info */}
                           <div className="text-center w-full">
                             <h4 className="text-sm font-medium text-gray-800 leading-tight mb-2" style={{
                               display: '-webkit-box',
                               WebkitLineClamp: 2,
                               WebkitBoxOrient: 'vertical',
                               overflow: 'hidden'
                             }}>
                               {product.crdfd_name}
                             </h4>
                             
                             {/* Product Price */}
                             <div className="mt-auto">
                               {(() => {
                                 const price = extractPrice(product);
                                 return price ? (
                                   <div className="text-sm font-bold text-cyan-600">
                                     {new Intl.NumberFormat('vi-VN', {
                                       style: 'currency',
                                       currency: 'VND'
                                     }).format(price)}
                                   </div>
                                 ) : (
                                   <div className="text-xs text-gray-400 italic">
                                     Liên hệ để biết giá
                                   </div>
                                 );
                               })()}
                             </div>
                           </div>
                        </button>
                      ))
                      )}
                        </div>
                      </div>

                      {/* Right Column - Brands */}
                      {(() => {
                        // Lấy danh sách thương hiệu từ các sản phẩm
                        const brands = [...new Set(products
                          .map((p: any) => p.crdfd_thuonghieu)
                          .filter(Boolean)
                          .slice(0, 8)
                        )];
                        
                        // Chỉ hiển thị khi có thương hiệu
                        if (brands.length === 0) return null;
                        
                        return (
                          <div className="lg:col-span-1">
                            <h5 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Thương hiệu nổi bật
                            </h5>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {brands.map((brand: string, idx: number) => (
                                <button
                                  key={idx}
                                  className="w-full bg-white hover:bg-gray-50 rounded-lg p-3 text-center transition-all duration-200 cursor-pointer border border-gray-200 hover:border-cyan-300 hover:shadow-sm"
                                  title={brand}
                                >
                                  <div className="text-sm font-medium text-gray-700 truncate">
                                    {brand}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Default view - show subcategories overview */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-600 mr-2 sm:mr-3 shadow-sm">
                          <span className="text-white text-sm sm:text-lg">
                            {getIcon(hoveredCategory.crdfd_productname)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                            {hoveredCategory.crdfd_productname}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Chọn nhóm sản phẩm để xem chi tiết
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-white bg-cyan-600 px-3 py-1 rounded-full shadow-sm">
                          {getSubcategories(hoveredCategory.crdfd_productgroupid, categoryHierarchy).length} nhóm sản phẩm
                        </div>
                        <button
                          onClick={() => onCategorySelect(hoveredCategory)}
                          onMouseEnter={handleRightPanelMouseEnter}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-xs flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Xem tất cả
                        </button>
                      </div>
                    </div>
                    
                    {/* Main Content - Dynamic Layout */}
                    <div className={`grid grid-cols-1 gap-6 ${(() => {
                      // Lấy danh sách thương hiệu từ tất cả subcategories
                      const allSubcategories = getSubcategories(hoveredCategory.crdfd_productgroupid, categoryHierarchy);
                      const brands = [...new Set(allSubcategories
                        .map((sub: any) => sub.crdfd_thuonghieu)
                        .filter(Boolean)
                        .slice(0, 8)
                      )];
                      return brands.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-1';
                    })()}`}>
                      {/* Left Column - Info */}
                      <div className={(() => {
                        // Lấy danh sách thương hiệu từ tất cả subcategories
                        const allSubcategories = getSubcategories(hoveredCategory.crdfd_productgroupid, categoryHierarchy);
                        const brands = [...new Set(allSubcategories
                          .map((sub: any) => sub.crdfd_thuonghieu)
                          .filter(Boolean)
                          .slice(0, 8)
                        )];
                        return brands.length > 0 ? 'lg:col-span-2' : 'lg:col-span-1';
                      })()}>
                        <div className="text-center py-8 sm:py-12">
                          <div className="relative mb-6">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-cyan-100 rounded-2xl flex items-center justify-center shadow-sm">
                              <span className="text-2xl sm:text-3xl text-cyan-600">
                                {getIcon(hoveredCategory.crdfd_productname)}
                              </span>
                            </div>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">
                            Khám phá sản phẩm
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                            Hover vào nhóm sản phẩm bên trái để xem danh sách sản phẩm chi tiết
                          </p>
                        </div>
                      </div>

                      {/* Right Column - Brands */}
                      {(() => {
                        // Lấy danh sách thương hiệu từ tất cả subcategories
                        const allSubcategories = getSubcategories(hoveredCategory.crdfd_productgroupid, categoryHierarchy);
                        const brands = [...new Set(allSubcategories
                          .map((sub: any) => sub.crdfd_thuonghieu)
                          .filter(Boolean)
                          .slice(0, 8)
                        )];
                        
                        // Chỉ hiển thị khi có thương hiệu từ subcategories
                        if (brands.length === 0) return null;
                        
                        return (
                          <div className="lg:col-span-1">
                            <h5 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Thương hiệu nổi bật
                            </h5>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {brands.map((brand: any, idx: number) => (
                                <button
                                  key={idx}
                                  className="w-full bg-white hover:bg-gray-50 rounded-lg p-3 text-center transition-all duration-200 cursor-pointer border border-gray-200 hover:border-cyan-300 hover:shadow-sm"
                                  title={brand}
                                >
                                  <div className="text-sm font-medium text-gray-700 truncate">
                                    {brand}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Footer with view all button */}
                    <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const subcategories = getSubcategories(hoveredCategory.crdfd_productgroupid, categoryHierarchy);
                            const totalProducts = subcategories.reduce((sum: number, sub: any) => sum + (sub.productCount || 0), 0);
                            return (
                              <>
                                Tổng cộng <span className="font-semibold text-gray-700">{subcategories.length}</span> danh mục con • 
                                <span className="font-semibold text-gray-700 ml-1">{totalProducts.toLocaleString()}</span> sản phẩm
                              </>
                            );
                          })()}
                        </div>
                        <button
                          onClick={() => onCategorySelect(hoveredCategory)}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-6 rounded-lg font-semibold transition-colors duration-200 shadow-sm text-sm"
                        >
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            Xem tất cả {hoveredCategory.crdfd_productname}
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JDStyleCategorySidebar;

