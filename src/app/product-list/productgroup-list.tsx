// This file was replaced to point to the new v2 implementation.
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
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

// --- Types (simplified from v2) ---
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
  /* optional alternate identifiers used by other parts of the app */
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

// --- Utility: extract price (kept lightweight) ---
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

// --- Minimal API hook (adapted) ---
const apiCache = new Map();
const useProductsData = (
  customerId: string | null,
  searchTerm: string,
  currentPage: number,
  advancedFilters?: AdvancedFilters
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
      params.append("page", String(currentPage || 1));
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
        setAllLoadedGroups(filteredCached.data || {});
        setLoading(false);
        return;
      }

      const res = await axios.get(`/api/getProductsOnly?${params.toString()}`);
      if (res.data) {
        const processedData = filterJsonGia(res.data);
        apiCache.set(cacheKey, processedData);
        setProductsData(processedData);
        setAllLoadedGroups(processedData.data || {});
      } else {
        setProductsData(null);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [customerId, searchTerm, currentPage, advancedFilters]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProductsData(), 200);
    return () => clearTimeout(timer);
  }, [fetchProductsData]);

  return { productsData, allLoadedGroups, loading, error, clearCache: () => apiCache.clear() };
};

// --- Product card UI matching requested white bg and defined card size ---
const ProductCard: React.FC<{ product: ProductDetails }> = ({ product }) => {
  const price = extractPrice(product);
  const displayPrice = price > 0 ? price.toLocaleString("vi-VN") + " đ" : "Liên hệ CSKH";
  const img =
    (product.cr1bb_imageurl && product.cr1bb_imageurl.trim()) ||
    (product.cr1bb_imageurlproduct && product.cr1bb_imageurlproduct.trim()) ||
    "/placeholder-image.jpg";

  const handleProductClick = () => {
    // Save product data to localStorage
    localStorage.setItem("productDetail", JSON.stringify(product));

    // Use product code as URL slug for simplicity and reliability
    const productSlug = product.crdfd_masanpham || product.productCode || product.productId || product.id;
    if (productSlug) {
      window.location.href = `/${productSlug}`;
    } else {
      // Fallback to a generic product URL
      window.location.href = '/san-pham';
    }
  };

  // compute market/old price (try to find max in cr1bb_json_gia)
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

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm transform transition duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col h-full"
      onClick={handleProductClick}
    >
      <div className="p-3 relative flex-shrink-0">
        <div className="w-full aspect-square flex items-center justify-center overflow-hidden rounded-md relative bg-gray-50">
          <img src={img} alt={product.crdfd_name || product.crdfd_fullname || "product"} className="max-h-[90%] max-w-[90%] object-contain mix-blend-multiply" />

          {/* sale badge top-left */}
          {hasDiscount ? (
            <div className="absolute left-0 top-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg shadow-sm">
              -{discountPercent}%
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-3 pb-3 flex flex-col flex-1">
        <div className="text-xs font-medium text-gray-700 leading-snug line-clamp-2 mb-2 flex-1" title={product.crdfd_name || product.crdfd_fullname}>
          {product.crdfd_name || product.crdfd_fullname}
        </div>

        <div className="mt-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-orange-600 font-bold text-sm md:text-base">{displayPrice}</div>
            {hasDiscount ? (
              <div className="text-xs text-gray-400 line-through">{marketPrice.toLocaleString("vi-VN")}đ</div>
            ) : null}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className="w-3 h-3 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.173c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118L10 13.347l-3.383 2.456c-.784.57-1.838-.197-1.539-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.624 9.397c-.783-.57-.38-1.81.588-1.81h4.173a1 1 0 00.95-.69l1.286-3.97z" /></svg>
              ))}
            </div>
            <div className="text-[10px] text-gray-400">(3)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main component (replaces previous wrapper) ---
const ProductGroupList: React.FC<any> = ({ searchTerm, title, descriptionHtml }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({ thuongHieu: [], chatLieu: [], priceRange: [0, 10000000] });
  const [filterOptions, setFilterOptions] = useState<{ thuongHieu: FilterOption[]; chatLieu: FilterOption[]; priceRange: { min: number; max: number } }>({
    thuongHieu: [],
    chatLieu: [],
    priceRange: { min: 0, max: 10000000 },
  });
  const [sortMode, setSortMode] = useState<"new" | "popular" | "price_desc" | "price_asc">("new");

  const { productsData, allLoadedGroups, loading, error, clearCache } = useProductsData(
    null,
    searchTerm || "",
    currentPage,
    advancedFilters
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const productList: ProductDetails[] = useMemo(() => {
    const data = productsData ? productsData.data : allLoadedGroups;
    if (!data) return [];
    const list = Object.values(data).flatMap((g) => (g.products ? g.products : []));
    // include only products that have JSON price data (`cr1bb_json_gia`)
    let filtered = list.filter(
      (p) =>
        p.cr1bb_json_gia != null &&
        Array.isArray(p.cr1bb_json_gia) &&
        p.cr1bb_json_gia.length > 0
    );
    // apply client-side sort to filtered list
    if (sortMode === "price_desc") return filtered.sort((a, b) => extractPrice(b) - extractPrice(a));
    if (sortMode === "price_asc") return filtered.sort((a, b) => extractPrice(a) - extractPrice(b));
    // new / popular: keep as-is (API expected), fallback no-op
    return filtered;
  }, [productsData, allLoadedGroups, sortMode]);

  // Build simple filter options from loaded products
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
    clearCache();
  };

  if (error) return <div className="p-4 bg-red-50 text-red-700">Error: {error.message}</div>;

  return (
    <div className="container-fluid px-0 productlist">
      <div className="w-full mx-auto px-2 py-4 text-sm">
        {/* Breadcrumb + heading */}
        <div className="product-cate-body mb-4">
          <div className="container">
            <div className="breadcrumb flex items-center gap-3 text-sm mb-3">
              <a href="/" title="Trang chủ" className="text-blue-600">Trang chủ</a>
              <span className="text-gray-400">❯</span>
              <h1 className="text-lg font-semibold">
                <a href="#" className="text-gray-800">{title || "Danh mục sản phẩm"}</a>
              </h1>
            </div>
          </div>
        </div>



        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left filters */}
          <aside className="hidden lg:block lg:w-72 flex-shrink-0 sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto customize-scrollbar">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-orange-100 min-h-full">
              <h3 className="text-xl font-bold mb-4 text-orange-600 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Bộ lọc
              </h3>

              {/* Brand Filter */}
              <div className="mb-6">
                <div className="text-sm font-bold uppercase text-gray-700 mb-3 border-b pb-1 border-orange-200">Thương hiệu</div>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 customize-scrollbar">
                  {filterOptions.thuongHieu.map((f) => (
                    <label key={f.value} className="flex items-center cursor-pointer hover:bg-orange-50 rounded p-1 transition-colors">
                      <Checkbox
                        size="small"
                        checked={advancedFilters.thuongHieu.includes(f.value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...advancedFilters.thuongHieu, f.value]
                            : advancedFilters.thuongHieu.filter((v) => v !== f.value);
                          handleFilterChange("thuongHieu", next);
                        }}
                        sx={{
                          color: '#fdba74',
                          '&.Mui-checked': {
                            color: '#ea580c',
                          },
                          padding: '4px'
                        }}
                      />
                      <span className="text-sm text-gray-700 flex-1 ml-1">{f.label}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full">{f.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Material Filter */}
              <div className="mb-6">
                <div className="text-sm font-bold uppercase text-gray-700 mb-3 border-b pb-1 border-orange-200">Chất liệu</div>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1 customize-scrollbar">
                  {filterOptions.chatLieu.map((f) => (
                    <label key={f.value} className="flex items-center cursor-pointer hover:bg-orange-50 rounded p-1 transition-colors">
                      <Checkbox
                        size="small"
                        checked={advancedFilters.chatLieu.includes(f.value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...advancedFilters.chatLieu, f.value]
                            : advancedFilters.chatLieu.filter((v) => v !== f.value);
                          handleFilterChange("chatLieu", next);
                        }}
                        sx={{
                          color: '#fdba74',
                          '&.Mui-checked': {
                            color: '#ea580c',
                          },
                          padding: '4px'
                        }}
                      />
                      <span className="text-sm text-gray-700 flex-1 ml-1">{f.label}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full">{f.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="mb-4">
                <div className="text-sm font-bold uppercase text-gray-700 mb-3 border-b pb-1 border-orange-200">Khoảng giá</div>
                <div className="px-2 mb-2">
                  <Slider
                    value={advancedFilters.priceRange}
                    onChange={(e, newValue) => {
                      if (Array.isArray(newValue)) {
                        // Real-time UI update only, commit on change committed usually, but here we can't easily debounce strict slider controlled state without internal state.
                        // For simplicity in this demo, we update context directly or better: use local state for slider and commit on mouse up.
                        // But to keep it simple with existing hook, we'll just update. 
                        // Check performance. If slow, we need local state.
                        // Let's assume user drags and drops.
                      }
                    }}
                    onChangeCommitted={(e, newValue) => {
                      if (Array.isArray(newValue)) {
                        handleFilterChange("priceRange", newValue as [number, number]);
                      }
                    }}
                    min={filterOptions.priceRange.min}
                    max={filterOptions.priceRange.max}
                    valueLabelDisplay="auto"
                    sx={{
                      color: '#ea580c',
                      '& .MuiSlider-thumb': {
                        backgroundColor: '#fff',
                        border: '2px solid #ea580c',
                      },
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mb-3 font-medium">
                  <span>{advancedFilters.priceRange[0].toLocaleString()}đ</span>
                  <span>{advancedFilters.priceRange[1].toLocaleString()}đ</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Chip
                    label="< 2 triệu"
                    size="small"
                    onClick={() => handleFilterChange("priceRange", [0, 2000000])}
                    variant={advancedFilters.priceRange[1] <= 2000000 ? "filled" : "outlined"}
                    color={advancedFilters.priceRange[1] <= 2000000 ? "warning" : "default"}
                    clickable
                  />
                  <Chip
                    label="2 - 5 triệu"
                    size="small"
                    onClick={() => handleFilterChange("priceRange", [2000000, 5000000])}
                    variant={advancedFilters.priceRange[0] >= 2000000 && advancedFilters.priceRange[1] <= 5000000 ? "filled" : "outlined"}
                    color={advancedFilters.priceRange[0] >= 2000000 && advancedFilters.priceRange[1] <= 5000000 ? "warning" : "default"}
                    clickable
                  />
                  <Chip
                    label="> 5 triệu"
                    size="small"
                    onClick={() => handleFilterChange("priceRange", [5000000, 100000000])}
                    variant={advancedFilters.priceRange[0] >= 5000000 ? "filled" : "outlined"}
                    color={advancedFilters.priceRange[0] >= 5000000 ? "warning" : "default"}
                    clickable
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  startIcon={<span className="text-lg">×</span>}
                  onClick={() =>
                    setAdvancedFilters({
                      thuongHieu: [],
                      chatLieu: [],
                      priceRange: [filterOptions.priceRange.min, filterOptions.priceRange.max],
                    })
                  }
                >
                  Xóa tất cả bộ lọc
                </Button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 lg:min-w-0">
            {/* Top sort bar */}
            <div className="total-filter bg-white p-4 rounded-xl shadow-sm border border-orange-100 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="total-product text-sm font-bold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-6 bg-orange-500 rounded-sm inline-block"></span>
                Tất cả {productList.length} {title || "sản phẩm"}
              </div>
              <div className="orderby-product text-sm flex items-center gap-2">
                <span className="sort text-gray-500 mr-1 hidden sm:inline-block">Sắp xếp:</span>

                <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100">
                  <button
                    onClick={(e) => { e.preventDefault(); setSortMode("new") }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortMode === "new" ? "bg-white text-orange-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Mới nhất
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setSortMode("popular") }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortMode === "popular" ? "bg-white text-orange-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Bán chạy
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setSortMode("price_desc") }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortMode === "price_desc" ? "bg-white text-orange-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Giá cao → thấp
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setSortMode("price_asc") }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortMode === "price_asc" ? "bg-white text-orange-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Giá thấp → cao
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile quick filters */}
            <div className="lg:hidden mb-4">
              <div className="flex gap-2 overflow-x-auto">
                <button className="text-xs bg-gray-100 px-3 py-1 rounded">Bộ lọc</button>
                <button className="text-xs bg-gray-100 px-3 py-1 rounded">Thương hiệu</button>
                <button className="text-xs bg-gray-100 px-3 py-1 rounded">Khoảng giá</button>
              </div>
            </div>

            {/* Optional description (mimic product-desc with read-more) */}
            {descriptionHtml ? (
              <div className="product-desc content-read-more bg-white rounded-lg p-4 mb-4" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            ) : null}

            {loading && !productList.length ? (
              <div className="w-full flex items-center justify-center py-6"><div className="w-6 h-6 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" /></div>
            ) : productList.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center mt-4">
                <p className="text-gray-600">Không tìm thấy sản phẩm phù hợp.</p>
              </div>
            ) : (
              <div>
                <div className="box-product bg-white fix-height fix-height-hl p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {productList.map((p) => (
                      <ProductCard key={p.crdfd_productsid || p.id} product={p} />
                    ))}
                  </div>
                </div>

                {/* Pagination for desktop */}
                {productsData && productsData.pagination && productsData.pagination.totalPages > 1 && !isMobile && (
                  <div className="mt-4 flex justify-center">
                    <Pagination
                      count={productsData.pagination.totalPages}
                      page={productsData.pagination.currentPage}
                      onChange={(e, page) => {
                        setCurrentPage(page);
                        window.scrollTo(0, 0);
                      }}
                      color="primary"
                    />
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div >
    </div >
  );
};

export default ProductGroupList;


