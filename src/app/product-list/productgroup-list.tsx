"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import Image from "next/image";
import { useDebounce } from "use-debounce";
import Diacritics from "diacritics";
import { getItem } from "@/utils/SecureStorage";
import Pagination from "@mui/material/Pagination";
import Checkbox from "@mui/material/Checkbox";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";

// --- Types ---
interface ProductDetails {
  crdfd_name: string;
  crdfd_productsid: string;
  crdfd_fullname: string;
  crdfd_thuonghieu: string;
  crdfd_chatlieu: string;
  cr1bb_json_gia?: any[] | null;
  crdfd_gia?: number;
  cr1bb_imageurlproduct?: string;
  cr1bb_imageurl?: string;
  id?: string;
  cr1bb_giaban?: number | string;
  productCode?: string;
  productId?: string;
  crdfd_masanpham?: string;
}

interface ProductGroup {
  products: ProductDetails[];
  count: number;
}

interface PaginatedProductGroups {
  data: Record<string, ProductGroup>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalProducts?: number; // Tổng số sản phẩm thực tế
  };
}

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface AdvancedFilters {
  thuongHieu: string[];
  chatLieu: string[];
  priceRange: [number, number];
}

// --- Utility: extract price ---
const extractPrice = (product: ProductDetails): number => {
  if (
    product.cr1bb_json_gia &&
    Array.isArray(product.cr1bb_json_gia) &&
    product.cr1bb_json_gia.length > 0
  ) {
    const activePrice = product.cr1bb_json_gia.find(
      (item: any) =>
        item.crdfd_trangthaihieulucname === "Còn hiệu lực" ||
        item.crdfd_trangthaihieuluc === 191920000
    );
    if (activePrice && activePrice.crdfd_gia) return parseFloat(activePrice.crdfd_gia);
    if (product.cr1bb_json_gia[0] && product.cr1bb_json_gia[0].crdfd_gia)
      return parseFloat(product.cr1bb_json_gia[0].crdfd_gia);
  }
  if (product.crdfd_gia && product.crdfd_gia > 0) return product.crdfd_gia;
  if (typeof product.cr1bb_giaban === "number" && product.cr1bb_giaban > 0)
    return product.cr1bb_giaban;
  if (typeof product.cr1bb_giaban === "string") {
    const match = product.cr1bb_giaban.match(/\d+(\.\d+)?/);
    if (match) return parseFloat(match[0]);
  }
  return 0;
};

// --- API hook ---
const apiCache = new Map();
const useProductsData = (
  customerId: string | null,
  searchTerm: string,
  currentPage: number,
  advancedFilters?: AdvancedFilters,
  productGroupId?: string | null
) => {
  const [productsData, setProductsData] = useState<PaginatedProductGroups | null>(null);
  const [allLoadedGroups, setAllLoadedGroups] = useState<Record<string, ProductGroup>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProductsData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (customerId) params.append("customerId", customerId);
      if (searchTerm) params.append("searchTerm", searchTerm);
      if (productGroupId) params.append("product_group_Id", productGroupId);
      // Tăng pageSize để lấy đủ products (ước tính mỗi group có ~2-5 products)
      // Lấy 50 groups để đảm bảo có đủ ~100-250 products cho phân trang
      params.append("page", String(currentPage || 1));
      params.append("pageSize", "50"); // Tăng từ default 10 lên 50 groups
      if (advancedFilters) {
        if (advancedFilters.thuongHieu.length) params.append("filterThuongHieu", JSON.stringify(advancedFilters.thuongHieu));
        if (advancedFilters.chatLieu.length) params.append("filterChatLieu", JSON.stringify(advancedFilters.chatLieu));
        params.append("priceMin", String(advancedFilters.priceRange[0]));
        params.append("priceMax", String(advancedFilters.priceRange[1]));
      }
      const cacheKey = `/api/getProductsOnly?${params.toString()}`;
      const filterJsonGia = (data: any) => {
        if (!data || !data.data) return data;
        Object.keys(data.data).forEach((groupKey) => {
          const group = data.data[groupKey];
          if (group && Array.isArray(group.products)) {
            group.products = group.products.filter(
              (p: any) =>
                p.cr1bb_json_gia != null &&
                Array.isArray(p.cr1bb_json_gia) &&
                p.cr1bb_json_gia.length > 0
            );
          }
        });
        return data;
      };

      if (apiCache.has(cacheKey)) {
        const cached = apiCache.get(cacheKey);
        const filteredCached = filterJsonGia(JSON.parse(JSON.stringify(cached)));
        setProductsData(filteredCached);
        // Merge groups thay vì thay thế khi load thêm pages
        if (currentPage > 1) {
          setAllLoadedGroups((prev) => ({ ...prev, ...(filteredCached.data || {}) }));
        } else {
          setAllLoadedGroups(filteredCached.data || {});
        }
        setLoading(false);
        return;
      }

      const res = await axios.get(`/api/getProductsOnly?${params.toString()}`);
      if (res.data) {
        const processedData = filterJsonGia(res.data);
        apiCache.set(cacheKey, processedData);
        setProductsData(processedData);
        // Merge groups thay vì thay thế khi load thêm pages
        if (currentPage > 1) {
          setAllLoadedGroups((prev) => ({ ...prev, ...(processedData.data || {}) }));
        } else {
          setAllLoadedGroups(processedData.data || {});
        }
      } else {
        setProductsData(null);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [customerId, searchTerm, currentPage, advancedFilters, productGroupId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProductsData(), 200);
    return () => clearTimeout(timer);
  }, [fetchProductsData]);

  return { productsData, allLoadedGroups, loading, error, clearCache: () => apiCache.clear() };
};

// --- Product Card Component (Modern Design) ---
const ProductCard: React.FC<{ product: ProductDetails; onAddToCart?: (product: any, quantity: number) => void }> = ({ product, onAddToCart }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const price = extractPrice(product);
  const displayPrice = price > 0 ? price.toLocaleString("vi-VN") + " đ" : "Liên hệ CSKH";
  const img =
    (product.cr1bb_imageurl && product.cr1bb_imageurl.trim()) ||
    (product.cr1bb_imageurlproduct && product.cr1bb_imageurlproduct.trim()) ||
    "/placeholder-image.jpg";

  const handleProductClick = () => {
    localStorage.setItem("productDetail", JSON.stringify(product));
    const productName = product.crdfd_fullname || product.crdfd_name || '';
    const productSlug = productName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    if (productSlug) {
      window.location.href = `/${productSlug}`;
    } else {
      window.location.href = '/san-pham';
    }
  };

  // Compute market/old price
  let marketPrice = 0;
  if (product.cr1bb_json_gia && Array.isArray(product.cr1bb_json_gia)) {
    const prices = product.cr1bb_json_gia
      .map((it: any) => {
        const v = it && (it.cr1bb_giakhongvat || it.crdfd_gia || it.crdfd_gia);
        if (typeof v === "string") {
          const m = v.match(/\d+(\.\d+)?/);
          return m ? parseFloat(m[0]) : 0;
        }
        return typeof v === "number" ? v : 0;
      })
      .filter(Boolean);
    if (prices.length) marketPrice = Math.max(...prices);
  }
  if (!marketPrice && typeof product.cr1bb_giaban === "number") marketPrice = product.cr1bb_giaban;
  if (!marketPrice && typeof product.cr1bb_giaban === "string") {
    const m = product.cr1bb_giaban.match(/\d+(\.\d+)?/);
    if (m) marketPrice = parseFloat(m[0]);
  }
  const hasDiscount = marketPrice > price && marketPrice > 0;
  const discountPercent = hasDiscount ? Math.round(((marketPrice - price) / marketPrice) * 100) : 0;

  // Mock rating (có thể lấy từ API sau)
  const rating = 4.5;
  const reviewCount = 128;


  const productName = product.crdfd_name || product.crdfd_fullname || "Sản phẩm";
  const productAlt = `${productName} - ${product.crdfd_thuonghieu || ""} - Wecare`;

  return (
    <div
      className="group bg-white border border-[#E9ECEF] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleProductClick}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#F8F9FA] flex-shrink-0">
        {!imageError && img !== "/placeholder-image.jpg" ? (
          <Image
            src={img}
            alt={productAlt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            className={`object-contain transition-transform duration-300 ${
              isHovered ? "scale-105" : "scale-100"
            }`}
            onError={() => setImageError(true)}
            loading="lazy"
            quality={85}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-gray-400 text-xs">Không có ảnh</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="bg-[#4CAF50] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
              -{discountPercent}%
            </span>
          )}
          {product.crdfd_thuonghieu && (
            <span className="bg-[#3492ab] text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm">
              {product.crdfd_thuonghieu}
            </span>
          )}
        </div>

        {/* Quick Actions (Hover) */}
        <div
          className={`absolute top-2 right-2 transition-all duration-200 ${
            isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Add to wishlist
            }}
            className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-[#3492ab] hover:text-white transition-colors"
            aria-label="Thêm vào yêu thích"
          >
            <FavoriteBorderIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Add to Cart Button (Hover) */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-2 bg-white/95 backdrop-blur-sm transition-all duration-200 ${
            isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAddToCart) {
                onAddToCart(product, 1);
              }
            }}
            className="w-full bg-[#3492ab] hover:bg-[#236E84] text-white font-medium text-sm py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShoppingCartIcon className="w-4 h-4" />
            <span>Thêm giỏ</span>
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-3 flex flex-col flex-1">
        {/* Product Name */}
        <h3 className="text-sm font-medium text-[#343A40] leading-tight line-clamp-2 mb-2 min-h-[2.25rem] group-hover:text-[#3492ab] transition-colors">
          {productName}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= Math.floor(rating)
                    ? "text-yellow-400 fill-current"
                    : star === Math.ceil(rating) && rating % 1 >= 0.5
                    ? "text-yellow-400 fill-current opacity-50"
                    : "text-gray-300"
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.173c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118L10 13.347l-3.383 2.456c-.784.57-1.838-.197-1.539-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.624 9.397c-.783-.57-.38-1.81.588-1.81h4.173a1 1 0 00.95-.69l1.286-3.97z" />
              </svg>
            ))}
          </div>
          <span className="text-[10px] text-[#6C757D]">({reviewCount})</span>
        </div>

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-bold text-[#3492ab]">{displayPrice}</span>
            {hasDiscount && (
              <span className="text-xs text-[#6C757D] line-through">
                {marketPrice.toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Filter Sidebar Component ---
const FilterSidebar: React.FC<{
  filterOptions: { thuongHieu: FilterOption[]; chatLieu: FilterOption[]; priceRange: { min: number; max: number } };
  advancedFilters: AdvancedFilters;
  onFilterChange: (type: keyof AdvancedFilters, value: any) => void;
  onResetFilters: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}> = ({ filterOptions, advancedFilters, onFilterChange, onResetFilters, isMobile = false, onClose }) => {
  const hasActiveFilters =
    advancedFilters.thuongHieu.length > 0 ||
    advancedFilters.chatLieu.length > 0 ||
    advancedFilters.priceRange[0] !== filterOptions.priceRange.min ||
    advancedFilters.priceRange[1] !== filterOptions.priceRange.max;

  const content = (
    <div className={`bg-white ${isMobile ? "h-full" : ""} p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#343A40] flex items-center gap-2">
          <FilterListIcon className="w-5 h-5 text-[#3492ab]" />
          Bộ lọc
        </h3>
        {isMobile && onClose && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mb-4 p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#343A40]">Đang áp dụng:</span>
            <button
              onClick={onResetFilters}
              className="text-xs text-[#3492ab] hover:text-[#236E84] font-medium"
            >
              Xóa tất cả
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {advancedFilters.thuongHieu.map((brand) => (
              <Chip
                key={brand}
                label={brand}
                size="small"
                onDelete={() => {
                  const next = advancedFilters.thuongHieu.filter((v) => v !== brand);
                  onFilterChange("thuongHieu", next);
                }}
                sx={{
                  backgroundColor: '#3492ab',
                  color: '#fff',
                  '& .MuiChip-deleteIcon': {
                    color: '#fff',
                    '&:hover': { color: '#C5E0E8' }
                  }
                }}
              />
            ))}
            {advancedFilters.chatLieu.map((material) => (
              <Chip
                key={material}
                label={material}
                size="small"
                onDelete={() => {
                  const next = advancedFilters.chatLieu.filter((v) => v !== material);
                  onFilterChange("chatLieu", next);
                }}
                sx={{
                  backgroundColor: '#3492ab',
                  color: '#fff',
                  '& .MuiChip-deleteIcon': {
                    color: '#fff',
                    '&:hover': { color: '#C5E0E8' }
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Brand Filter */}
      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase text-[#343A40] mb-2 pb-1.5 border-b border-[#E9ECEF]">
          Thương hiệu
        </h4>
        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto pr-1 customize-scrollbar">
          {filterOptions.thuongHieu.map((f) => (
            <label
              key={f.value}
              className="flex items-center cursor-pointer hover:bg-[#F8F9FA] rounded-md p-1.5 transition-colors"
            >
              <Checkbox
                size="small"
                checked={advancedFilters.thuongHieu.includes(f.value)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...advancedFilters.thuongHieu, f.value]
                    : advancedFilters.thuongHieu.filter((v) => v !== f.value);
                  onFilterChange("thuongHieu", next);
                }}
                sx={{
                  color: '#7FBACB',
                  '&.Mui-checked': {
                    color: '#3492ab',
                  },
                  padding: '2px'
                }}
              />
              <span className="text-xs text-[#343A40] flex-1 ml-1.5">{f.label}</span>
              <span className="text-[10px] bg-[#E9ECEF] text-[#6C757D] py-0.5 px-1.5 rounded-full font-medium">
                {f.count}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Material Filter */}
      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase text-[#343A40] mb-2 pb-1.5 border-b border-[#E9ECEF]">
          Chất liệu
        </h4>
        <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto pr-1 customize-scrollbar">
          {filterOptions.chatLieu.map((f) => (
            <label
              key={f.value}
              className="flex items-center cursor-pointer hover:bg-[#F8F9FA] rounded-md p-1.5 transition-colors"
            >
              <Checkbox
                size="small"
                checked={advancedFilters.chatLieu.includes(f.value)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...advancedFilters.chatLieu, f.value]
                    : advancedFilters.chatLieu.filter((v) => v !== f.value);
                  onFilterChange("chatLieu", next);
                }}
                sx={{
                  color: '#7FBACB',
                  '&.Mui-checked': {
                    color: '#3492ab',
                  },
                  padding: '2px'
                }}
              />
              <span className="text-xs text-[#343A40] flex-1 ml-1.5">{f.label}</span>
              <span className="text-[10px] bg-[#E9ECEF] text-[#6C757D] py-0.5 px-1.5 rounded-full font-medium">
                {f.count}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase text-[#343A40] mb-2 pb-1.5 border-b border-[#E9ECEF]">
          Khoảng giá
        </h4>
        <div className="px-1 mb-2">
          <Slider
            value={advancedFilters.priceRange}
            onChange={(e, newValue) => {
              if (Array.isArray(newValue)) {
                // Real-time update handled by onChangeCommitted
              }
            }}
            onChangeCommitted={(e, newValue) => {
              if (Array.isArray(newValue)) {
                onFilterChange("priceRange", newValue as [number, number]);
              }
            }}
            min={filterOptions.priceRange.min}
            max={filterOptions.priceRange.max}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${(value / 1000000).toFixed(1)}M đ`}
            sx={{
              color: '#3492ab',
              '& .MuiSlider-thumb': {
                backgroundColor: '#fff',
                border: '2px solid #3492ab',
                width: 20,
                height: 20,
                '&:hover': {
                  boxShadow: '0 0 0 8px rgba(52, 146, 171, 0.16)',
                }
              },
              '& .MuiSlider-track': {
                height: 4,
              },
              '& .MuiSlider-rail': {
                height: 4,
                opacity: 0.3,
              }
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-[#6C757D] mb-3 font-medium">
          <span>{advancedFilters.priceRange[0].toLocaleString("vi-VN")}đ</span>
          <span>{advancedFilters.priceRange[1].toLocaleString("vi-VN")}đ</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip
            label="< 2 triệu"
            size="small"
            onClick={() => onFilterChange("priceRange", [0, 2000000])}
            variant={advancedFilters.priceRange[1] <= 2000000 ? "filled" : "outlined"}
            sx={{
              ...(advancedFilters.priceRange[1] <= 2000000 ? {
                backgroundColor: '#3492ab',
                color: '#fff',
                '&:hover': { backgroundColor: '#236E84' }
              } : {
                borderColor: '#3492ab',
                color: '#3492ab',
                '&:hover': { backgroundColor: '#C5E0E8', borderColor: '#236E84' }
              })
            }}
            clickable
          />
          <Chip
            label="2 - 5 triệu"
            size="small"
            onClick={() => onFilterChange("priceRange", [2000000, 5000000])}
            variant={advancedFilters.priceRange[0] >= 2000000 && advancedFilters.priceRange[1] <= 5000000 ? "filled" : "outlined"}
            sx={{
              ...(advancedFilters.priceRange[0] >= 2000000 && advancedFilters.priceRange[1] <= 5000000 ? {
                backgroundColor: '#3492ab',
                color: '#fff',
                '&:hover': { backgroundColor: '#236E84' }
              } : {
                borderColor: '#3492ab',
                color: '#3492ab',
                '&:hover': { backgroundColor: '#C5E0E8', borderColor: '#236E84' }
              })
            }}
            clickable
          />
          <Chip
            label="> 5 triệu"
            size="small"
            onClick={() => onFilterChange("priceRange", [5000000, 100000000])}
            variant={advancedFilters.priceRange[0] >= 5000000 ? "filled" : "outlined"}
            sx={{
              ...(advancedFilters.priceRange[0] >= 5000000 ? {
                backgroundColor: '#3492ab',
                color: '#fff',
                '&:hover': { backgroundColor: '#236E84' }
              } : {
                borderColor: '#3492ab',
                color: '#3492ab',
                '&:hover': { backgroundColor: '#C5E0E8', borderColor: '#236E84' }
              })
            }}
            clickable
          />
        </div>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <div className="mt-4 pt-3 border-t border-[#E9ECEF]">
          <Button
            variant="outlined"
            fullWidth
            size="small"
            onClick={onResetFilters}
            sx={{
              borderColor: '#3492ab',
              color: '#3492ab',
              fontSize: '0.75rem',
              padding: '6px 16px',
              '&:hover': {
                borderColor: '#236E84',
                backgroundColor: '#C5E0E8',
              }
            }}
          >
            Xóa tất cả bộ lọc
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return content;
  }

  return (
    <aside className="lg:w-72 flex-shrink-0 sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto customize-scrollbar">
      <div className="bg-white rounded-lg shadow-sm border border-[#E9ECEF]">
        {content}
      </div>
    </aside>
  );
};

// --- Main Component ---
interface ProductGroupListProps {
  searchTerm?: string;
  title?: string;
  descriptionHtml?: string;
  productGroupId?: string | null;
  breadcrumb?: string[];
  onAddToCart?: (product: any, quantity: number) => void;
  customerSelectId?: string;
  searchKey?: string;
  selectedProductGroup?: string | null;
  selectedGroupImage?: string;
  selectedGroupMinPrice?: number | null;
  selectedGroupMaxPrice?: number | null;
  quantity?: number;
  initialBreadcrumb?: string[];
  isSidebarSearch?: boolean;
  isPriceViewer?: boolean;
  sortBy?: string;
  filterBy?: string;
  refreshTimestamp?: number;
}

const ProductGroupList: React.FC<ProductGroupListProps> = ({
  searchTerm = "",
  title,
  descriptionHtml,
  productGroupId = null,
  breadcrumb,
  onAddToCart,
  customerSelectId,
  ...otherProps
}) => {
  type SortMode = "price_desc" | "price_asc";

  const [currentPage, setCurrentPage] = useState(1); // Page từ API (theo groups)
  const [currentProductPage, setCurrentProductPage] = useState(1); // Page phân trang theo products
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [showLoadMore, setShowLoadMore] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    thuongHieu: [],
    chatLieu: [],
    priceRange: [0, 10000000],
  });
  const [filterOptions, setFilterOptions] = useState<{
    thuongHieu: FilterOption[];
    chatLieu: FilterOption[];
    priceRange: { min: number; max: number };
  }>({
    thuongHieu: [],
    chatLieu: [],
    priceRange: { min: 0, max: 10000000 },
  });
  const [sortMode, setSortMode] = useState<SortMode>("price_desc");
  
  // Số sản phẩm mỗi trang (theo yêu cầu)
  const PRODUCTS_PER_PAGE = 20;

  const { productsData, allLoadedGroups, loading, error, clearCache } = useProductsData(
    customerSelectId || null,
    searchTerm || "",
    currentPage,
    advancedFilters,
    productGroupId || null
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Danh sách tất cả products (đã filter và sort)
  const productList: ProductDetails[] = useMemo(() => {
    const data = productsData ? productsData.data : allLoadedGroups;
    if (!data) return [];
    const list = Object.values(data).flatMap((g) => (g.products ? g.products : []));
    let filtered = list.filter(
      (p) =>
        p.cr1bb_json_gia != null &&
        Array.isArray(p.cr1bb_json_gia) &&
        p.cr1bb_json_gia.length > 0
    );
    if (sortMode === "price_desc") return filtered.sort((a, b) => extractPrice(b) - extractPrice(a));
    if (sortMode === "price_asc") return filtered.sort((a, b) => extractPrice(a) - extractPrice(b));
    return filtered;
  }, [productsData, allLoadedGroups, sortMode]);

  // Tính toán phân trang theo products (20 sản phẩm/trang)
  const totalProductPages = Math.ceil(productList.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentProductPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const paginatedProductList = productList.slice(startIndex, endIndex);

  useEffect(() => {
    const brands = new Map<string, number>();
    const materials = new Map<string, number>();
    let minPrice = Infinity;
    let maxPrice = 0;
    productList.forEach((p) => {
      if (p.crdfd_thuonghieu) brands.set(p.crdfd_thuonghieu, (brands.get(p.crdfd_thuonghieu) || 0) + 1);
      if (p.crdfd_chatlieu) materials.set(p.crdfd_chatlieu, (materials.get(p.crdfd_chatlieu) || 0) + 1);
      const price = extractPrice(p);
      if (price > 0) {
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
      }
    });
    setFilterOptions({
      thuongHieu: Array.from(brands.entries()).map(([value, count]) => ({ value, label: value, count })),
      chatLieu: Array.from(materials.entries()).map(([value, count]) => ({ value, label: value, count })),
      priceRange: { min: minPrice === Infinity ? 0 : Math.floor(minPrice), max: maxPrice === 0 ? 10000000 : Math.ceil(maxPrice) },
    });
  }, [productList]);

  const handleFilterChange = (type: keyof AdvancedFilters, value: any) => {
    setAdvancedFilters((prev) => ({ ...prev, [type]: value }));
    setCurrentPage(1);
    setCurrentProductPage(1); // Reset về trang 1 khi filter
    clearCache();
  };

  const handleResetFilters = () => {
    setAdvancedFilters({
      thuongHieu: [],
      chatLieu: [],
      priceRange: [filterOptions.priceRange.min, filterOptions.priceRange.max],
    });
    setCurrentPage(1);
    setCurrentProductPage(1); // Reset về trang 1 khi reset filter
    clearCache();
  };

  const handleLoadMore = () => {
    if (productsData?.pagination && currentPage < productsData.pagination.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Xử lý khi sort mode thay đổi - reset về trang 1
  useEffect(() => {
    setCurrentProductPage(1);
  }, [sortMode]);

  // SEO: Generate structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": title || "Danh mục sản phẩm",
    "description": descriptionHtml ? descriptionHtml.replace(/<[^>]*>/g, "").substring(0, 200) : "",
    "itemListElement": productList.slice(0, 20).map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.crdfd_name || product.crdfd_fullname,
        "image": product.cr1bb_imageurl || product.cr1bb_imageurlproduct || "",
        "offers": {
          "@type": "Offer",
          "price": extractPrice(product),
          "priceCurrency": "VND",
          "availability": "https://schema.org/InStock",
        },
        "brand": {
          "@type": "Brand",
          "name": product.crdfd_thuonghieu || "Wecare",
        },
      },
    })),
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-[#C5E0E8] text-[#236E84] rounded-lg p-6 text-center">
          <p className="font-semibold">Lỗi: {error.message}</p>
          <p className="text-sm mt-2">Vui lòng thử lại sau.</p>
        </div>
      </div>
    );
  }

  const categoryTitle = title || "Danh mục sản phẩm";
  const categoryDescription = descriptionHtml
    ? descriptionHtml.replace(/<[^>]*>/g, "").substring(0, 400)
    : `Khám phá bộ sưu tập ${categoryTitle} chất lượng cao tại Wecare. Sản phẩm chính hãng, giá tốt, giao hàng nhanh.`;

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-[#F8F9FA]">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-[#E9ECEF]">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-xs" aria-label="Breadcrumb">
              <a
                href="/"
                title="Trang chủ"
                className="text-[#3492ab] hover:text-[#236E84] transition-colors font-medium"
              >
                Trang chủ
              </a>
              {breadcrumb && breadcrumb.length > 0 ? (
                breadcrumb.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <span className="text-[#6C757D]">/</span>
                    <span className={`${index === breadcrumb.length - 1 ? "text-[#343A40] font-medium" : "text-[#3492ab] hover:text-[#236E84]"} transition-colors`}>
                      {crumb}
                    </span>
                  </React.Fragment>
                ))
              ) : (
                <>
                  <span className="text-[#6C757D]">/</span>
                  <span className="text-[#343A40] font-medium">{categoryTitle}</span>
                </>
              )}
            </nav>
          </div>
        </div>

        <div className="w-full py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filter Sidebar (Desktop) */}
            <FilterSidebar
              filterOptions={filterOptions}
              advancedFilters={advancedFilters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />

            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-3">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="w-full bg-white border border-[#E9ECEF] rounded-lg px-3 py-2 flex items-center justify-between hover:bg-[#F8F9FA] transition-colors"
              >
                <span className="flex items-center gap-2 text-[#343A40] font-medium text-sm">
                  <FilterListIcon className="w-4 h-4 text-[#3492ab]" />
                  Bộ lọc
                </span>
                <span className="text-xs text-[#6C757D]">
                  {(advancedFilters.thuongHieu.length +
                    advancedFilters.chatLieu.length) > 0
                    ? `${advancedFilters.thuongHieu.length + advancedFilters.chatLieu.length} đã chọn`
                    : "Chọn bộ lọc"}
                </span>
              </button>
            </div>

            {/* Mobile Filter Drawer */}
            <Drawer
              anchor="right"
              open={mobileFilterOpen}
              onClose={() => setMobileFilterOpen(false)}
              PaperProps={{
                sx: { width: { xs: "100%", sm: "400px" } }
              }}
            >
              <FilterSidebar
                filterOptions={filterOptions}
                advancedFilters={advancedFilters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                isMobile={true}
                onClose={() => setMobileFilterOpen(false)}
              />
            </Drawer>

            {/* Main Content */}
            <main className="flex-1 lg:min-w-0">
              {/* Sort Bar */}
              <div className="bg-white rounded-lg shadow-sm border border-[#E9ECEF] p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs font-semibold text-[#343A40] flex items-center gap-1.5">
                  <span className="w-0.5 h-4 bg-[#3492ab] rounded-full"></span>
                  <span>
                    Tìm thấy <strong className="text-[#3492ab]">{productList.length}</strong> sản phẩm
                    {totalProductPages > 1 && (
                      <span className="text-[#6C757D] font-normal ml-1">
                        (Trang {currentProductPage}/{totalProductPages})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6C757D] hidden sm:inline-block">Sắp xếp:</span>
                  <div className="flex bg-[#F8F9FA] p-0.5 rounded-md border border-[#E9ECEF] gap-0.5">
                    {[
                      { key: "price_desc" as SortMode, label: "Giá cao → thấp" },
                      { key: "price_asc" as SortMode, label: "Giá thấp → cao" },
                    ].map((option: { key: SortMode; label: string }) => (
                      <button
                        key={option.key}
                        onClick={() => setSortMode(option.key)}
                        className={`px-3 py-1.5 rounded text-[10px] font-medium transition-all ${
                          sortMode === option.key
                            ? "bg-white text-[#3492ab] shadow-sm border border-[#E9ECEF]"
                            : "text-[#6C757D] hover:text-[#343A40]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              {loading && !productList.length ? (
                <div className="w-full flex items-center justify-center py-12">
                  <div className="w-10 h-10 rounded-full border-3 border-[#E9ECEF] border-t-[#3492ab] animate-spin" />
                </div>
              ) : productList.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <p className="text-[#6C757D] text-base mb-1">Không tìm thấy sản phẩm phù hợp.</p>
                  <p className="text-xs text-[#6C757D]">Vui lòng thử lại với bộ lọc khác.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                    {paginatedProductList.map((p) => (
                      <ProductCard key={p.crdfd_productsid || p.id} product={p} onAddToCart={onAddToCart} />
                    ))}
                  </div>

                  {/* Pagination theo products (20 sản phẩm/trang) */}
                  {totalProductPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <Pagination
                        count={totalProductPages}
                        page={currentProductPage}
                        onChange={(e, page) => {
                          setCurrentProductPage(page);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        sx={{
                          '& .MuiPaginationItem-root': {
                            color: '#6C757D',
                            fontSize: '0.875rem',
                            '&.Mui-selected': {
                              backgroundColor: '#3492ab',
                              color: '#fff',
                              '&:hover': {
                                backgroundColor: '#236E84',
                              }
                            },
                            '&:hover': {
                              backgroundColor: '#C5E0E8',
                            }
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Load More Groups từ API (nếu cần) */}
                  {productsData?.pagination && 
                   productsData.pagination.totalPages > currentPage && 
                   productList.length < PRODUCTS_PER_PAGE * totalProductPages && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={handleLoadMore}
                        className="bg-white border-2 border-[#3492ab] text-[#3492ab] font-medium text-sm px-6 py-2 rounded-lg hover:bg-[#3492ab] hover:text-white transition-all shadow-sm"
                      >
                        Tải thêm nhóm sản phẩm
                      </button>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductGroupList;
