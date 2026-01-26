import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  useRef,
} from "react";
import axios from "axios";
import { useDebounce } from "use-debounce";
import { Products } from "../../model/interface/ProductCartData";
import Diacritics from "diacritics";
import { getItem } from "@/utils/SecureStorage";
import { ProductListProps } from "@/model/interface/ProductGroupListData";
import Pagination from "@mui/material/Pagination";
import dynamic from "next/dynamic";
import AdvancedFilter from "./_components/AdvancedFilter";
import MobileFilterTags from "./_components/MobileFilterTags";
import ProductGroupImageWithFallback from "@/app/product-list/_components/ProductGroupImageWithFallback";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

// Lightweight inline loader
const InlineLoading = () => (
  <div className="w-full flex items-center justify-center py-6">
    <div className="w-6 h-6 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
  </div>
);

// --- Types (copied/adapted from original file) ---
interface ProductDetails {
  crdfd_name: string;
  crdfd_productsid: string;
  crdfd_fullname: string;
  crdfd_masanpham: string;
  _crdfd_productgroup_value: string;
  cr1bb_nhomsanphamcha: string;
  crdfd_manhomsp: string;
  crdfd_thuonghieu: string;
  crdfd_quycach: string;
  crdfd_chatlieu: string;
  crdfd_hoanthienbemat: string;
  cr1bb_giaban: number | string;
  crdfd_gtgt: number;
  cr1bb_imageurlproduct: string;
  cr1bb_imageurl: string;
  crdfd_nhomsanphamtext: string;
  cr1bb_json_gia: any[] | null;
  _crdfd_onvi_value?: string;
  crdfd_gia?: number;
  crdfd_giatheovc?: number;
  crdfd_onvichuan?: string;
  id?: string;
  cr1bb_banchatgiaphatra?: number | null;
  crdfd_gtgt_value?: number | null;
  cr1bb_giakhongvat?: number | null;
}

interface ProductGroup {
  products: ProductDetails[];
  count: number;
  priceRange: {
    min: number;
    max: number;
  };
}

interface PaginatedProductGroups {
  data: Record<string, ProductGroup>;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalGroups: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface AdvancedFilters {
  thuongHieu: string[];
  quyCach: string[];
  hoanThien: string[];
  chatLieu: string[];
  donVi: string[];
  priceRange: [number, number];
}

// --- Utility: extract price (copied) ---
const extractPrice = (product: ProductDetails): number => {
  if (
    product.cr1bb_json_gia &&
    Array.isArray(product.cr1bb_json_gia) &&
    product.cr1bb_json_gia.length > 0
  ) {
    const activePrice = product.cr1bb_json_gia.find(
      (item) =>
        item.crdfd_trangthaihieulucname === "Còn hiệu lực" ||
        item.crdfd_trangthaihieuluc === 191920000
    );

    if (activePrice && activePrice.crdfd_gia) {
      return parseFloat(activePrice.crdfd_gia);
    }

    if (product.cr1bb_json_gia[0] && product.cr1bb_json_gia[0].crdfd_gia) {
      return parseFloat(product.cr1bb_json_gia[0].crdfd_gia);
    }
  }

  if (product.crdfd_gia && product.crdfd_gia > 0) {
    return product.crdfd_gia;
  }

  if (product.crdfd_giatheovc && product.crdfd_giatheovc > 0) {
    return product.crdfd_giatheovc;
  }

  if (typeof product.cr1bb_giaban === "number" && product.cr1bb_giaban > 0) {
    return product.cr1bb_giaban;
  }

  if (typeof product.cr1bb_giaban === "string") {
    const priceMatch = product.cr1bb_giaban.match(/\d+(\.\d+)?/);
    if (priceMatch && priceMatch[0]) {
      return parseFloat(priceMatch[0]);
    }
  }

  return 0;
};

// --- API cache and hook (copied/adapted) ---
const apiCache = new Map();

const useProductsData = (
  customerId: string | null,
  searchTerm: string,
  groupName: string,
  groupName_cha: string,
  currentPage: number,
  isMobileView: boolean,
  productGroupId: string | null,
  refreshTimestamp: number = Date.now(),
  advancedFilters?: AdvancedFilters
) => {
  const [productsData, setProductsData] =
    useState<PaginatedProductGroups | null>(null);
  const [allLoadedGroups, setAllLoadedGroups] = useState<
    Record<string, ProductGroup>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const doiTuong = getItem("customerGroupIds");
  const groupsPerPage = 10;

  const fetchProductsData = useCallback(async () => {
    const storedId = getItem("id");

    try {
      setLoading(true);
      let apiUrl = "/api/getProductsOnly";
      const params = new URLSearchParams();

      if (customerId || storedId) {
        params.append("customerId", customerId || storedId || "");
      }

      if (searchTerm) {
        const aiKeywordsForAPI = localStorage.getItem(
          "imageSearch:aiKeywordsForAPI"
        );
        if (aiKeywordsForAPI) {
          params.append("keywords", aiKeywordsForAPI);
          localStorage.removeItem("imageSearch:aiKeywordsForAPI");
        } else {
          params.append("searchTerm", searchTerm);
        }
      }

      if (groupName) params.append("groupName", groupName);
      if (groupName_cha) params.append("parentGroup", groupName_cha);
      if (productGroupId) params.append("product_group_Id", productGroupId);
      if (doiTuong) params.append("doiTuong", doiTuong);
      params.append("page", currentPage.toString());
      params.append("pageSize", groupsPerPage.toString());

      if (advancedFilters) {
        if (advancedFilters.thuongHieu.length > 0) {
          params.append(
            "filterThuongHieu",
            JSON.stringify(advancedFilters.thuongHieu)
          );
        }
        if (advancedFilters.quyCach.length > 0) {
          params.append("filterQuyCach", JSON.stringify(advancedFilters.quyCach));
        }
        if (advancedFilters.hoanThien.length > 0) {
          params.append(
            "filterHoanThien",
            JSON.stringify(advancedFilters.hoanThien)
          );
        }
        if (advancedFilters.chatLieu.length > 0) {
          params.append("filterChatLieu", JSON.stringify(advancedFilters.chatLieu));
        }
        if (advancedFilters.donVi.length > 0) {
          params.append("filterDonVi", JSON.stringify(advancedFilters.donVi));
        }
        if (
          advancedFilters.priceRange[0] > 0 ||
          advancedFilters.priceRange[1] < 10000000
        ) {
          params.append("priceMin", advancedFilters.priceRange[0].toString());
          params.append("priceMax", advancedFilters.priceRange[1].toString());
        }
      }

      if (refreshTimestamp) {
        params.append("ts", refreshTimestamp.toString());
      }

      const cacheKey = `/api/getProductsOnly?${params.toString()}`;
      if (apiCache.has(cacheKey)) {
        const cachedData = apiCache.get(cacheKey);
        setProductsData(cachedData);
        if (isMobileView && currentPage > 1) {
          setAllLoadedGroups((prev) => ({ ...prev, ...cachedData.data }));
        } else {
          setAllLoadedGroups(cachedData.data);
        }
        setLoading(false);
        return;
      }

      const response = await axios.get(`/api/getProductsOnly?${params.toString()}`);

      if (response.data && response.data.data && response.data.pagination) {
        const processedData = response.data;

        Object.keys(processedData.data).forEach((groupKey) => {
          const group = processedData.data[groupKey];
          if (group.products && Array.isArray(group.products)) {
            group.products.sort((a: ProductDetails, b: ProductDetails) => {
              const priceA = extractPrice(a);
              const priceB = extractPrice(b);
              if ((priceA > 0 && priceB > 0) || (priceA === 0 && priceB === 0)) {
                return 0;
              }
              return priceA > 0 ? -1 : 1;
            });
          }
        });

        apiCache.set(cacheKey, processedData);
        setProductsData(processedData);
        if (isMobileView && currentPage > 1) {
          setAllLoadedGroups((prev) => ({ ...prev, ...processedData.data }));
        } else {
          setAllLoadedGroups(processedData.data);
        }
      } else {
        setProductsData(null);
      }
    } catch (error) {
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [
    customerId,
    searchTerm,
    groupName,
    groupName_cha,
    currentPage,
    isMobileView,
    productGroupId,
    refreshTimestamp,
    advancedFilters,
  ]);

  const debouncedFetchData = useDebounce(fetchProductsData, 300)[0];

  useEffect(() => {
    debouncedFetchData();
    const clearCacheInterval = setInterval(() => {
      apiCache.clear();
    }, 5 * 60 * 1000);
    return () => {
      clearInterval(clearCacheInterval);
    };
  }, [debouncedFetchData, refreshTimestamp]);

  const clearCache = useCallback(() => {
    apiCache.clear();
  }, []);

  return {
    productsData,
    allLoadedGroups,
    loading,
    error,
    clearCache,
  };
};

// --- Hook to get customerId (copied) ---
const useCustomerId = () => {
  const [customerId, setCustomerId] = useState<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("customerId");
    if (id && url.pathname === "/product-list") {
      setCustomerId(id);
    } else {
      const check = getItem("temple");
      const Idlogin = getItem("id");
      if (check === "my" && Idlogin) {
        setCustomerId(Idlogin);
      }
    }
  }, []);
  return customerId;
};

// --- Product card UI for grid ---
const ProductCard: React.FC<{
  product: ProductDetails;
  hasAccess: boolean;
}> = ({ product, hasAccess }) => {
  const price = extractPrice(product);
  const displayPrice =
    price > 0 ? price.toLocaleString("vi-VN") + " đ" : "Liên hệ CSKH";
  const img =
    (product.cr1bb_imageurl && product.cr1bb_imageurl.trim()) ||
    (product.cr1bb_imageurlproduct && product.cr1bb_imageurlproduct.trim()) ||
    "/placeholder-image.jpg";

  return (
    <div className="bg-white border rounded-lg shadow-sm p-3 flex flex-col">
      <div className="w-full h-40 bg-white flex items-center justify-center overflow-hidden rounded-md">
        <img
          src={img}
          alt={product.crdfd_name || product.crdfd_fullname || "product"}
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="mt-3 flex-1 flex flex-col items-center text-center">
        <div className="text-sm font-medium text-gray-800 line-clamp-2 w-full">
          {product.crdfd_name || product.crdfd_fullname}
        </div>
        <div className="mt-2 text-blue-600 font-semibold">{displayPrice}</div>
        <div className="mt-3 flex items-center justify-between w-full">
          <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded">Xem</button>
          <button className="text-sm border border-gray-200 px-3 py-1 rounded text-gray-700">Thêm</button>
        </div>
      </div>
    </div>
  );
};

// --- Main replacement component with left filters + grid ---
const ProductGroupListV2: React.FC<ProductListProps> = (props) => {
  const {
    searchTerm,
    selectedProductGroup,
    breadcrumb: initialBreadcrumb,
    onAddToCart,
    customerSelectId,
    isPriceViewer = false,
  } = props;

  const router = (typeof window !== "undefined" ? (window as any).nextRouter : null) || undefined;
  const customerId = useCustomerId();
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    thuongHieu: [],
    quyCach: [],
    hoanThien: [],
    chatLieu: [],
    donVi: [],
    priceRange: [0, 10000000],
  });
  const [filterOptions, setFilterOptions] = useState({
    thuongHieu: [] as FilterOption[],
    quyCach: [] as FilterOption[],
    hoanThien: [] as FilterOption[],
    chatLieu: [] as FilterOption[],
    donVi: [] as FilterOption[],
    priceRange: { min: 0, max: 10000000 },
  });

  const { productsData, allLoadedGroups, loading, error, clearCache } =
    useProductsData(
      customerId,
      searchTerm || "",
      "",
      "",
      currentPage,
      isMobile,
      null,
      Date.now(),
      advancedFilters
    );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Flatten products for grid
  const productList: ProductDetails[] = useMemo(() => {
    const data = productsData ? productsData.data : allLoadedGroups;
    if (!data) return [];
    return Object.values(data).flatMap((g) => (g.products ? g.products : []));
  }, [productsData, allLoadedGroups]);

  // Build basic filter options from data (small, quick)
  useEffect(() => {
    const brands = new Map<string, number>();
    const materials = new Map<string, number>();
    let minPrice = Infinity;
    let maxPrice = 0;

    productList.forEach((p) => {
      if (p.crdfd_thuonghieu) {
        brands.set(p.crdfd_thuonghieu, (brands.get(p.crdfd_thuonghieu) || 0) + 1);
      }
      if (p.crdfd_chatlieu) {
        materials.set(p.crdfd_chatlieu, (materials.get(p.crdfd_chatlieu) || 0) + 1);
      }
      const price = extractPrice(p);
      if (price > 0) {
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
      }
    });

    setFilterOptions({
      thuongHieu: Array.from(brands.entries()).map(([value, count]) => ({ value, label: value, count })),
      quyCach: [],
      hoanThien: [],
      chatLieu: Array.from(materials.entries()).map(([value, count]) => ({ value, label: value, count })),
      donVi: [],
      priceRange: {
        min: minPrice === Infinity ? 0 : Math.floor(minPrice),
        max: maxPrice === 0 ? 10000000 : Math.ceil(maxPrice),
      },
    });
  }, [productList]);

  const handleFilterChange = (filterType: string, value: any) => {
    setAdvancedFilters((prev) => ({ ...prev, [filterType]: value }));
    setCurrentPage(1);
    clearCache();
  };

  if (error) {
    return <div className="p-4 bg-red-50 text-red-700">Error: {error.message}</div>;
  }

  return (
    <div className="container-fluid px-0 productlist">
      <div className="w-full mx-auto px-2 py-4 text-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left sidebar filters */}
          <aside className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="bg-white p-3 rounded-lg shadow-sm border sticky top-24">
              <h3 className="text-lg font-semibold mb-2">Bộ lọc</h3>
              <AdvancedFilter
                filterOptions={filterOptions}
                selectedFilters={advancedFilters}
                onFilterChange={handleFilterChange}
                onPriceChange={(v) => handleFilterChange("priceRange", v)}
                onClearFilters={() => {
                  setAdvancedFilters({
                    thuongHieu: [],
                    quyCach: [],
                    hoanThien: [],
                    chatLieu: [],
                    donVi: [],
                    priceRange: [filterOptions.priceRange.min, filterOptions.priceRange.max],
                  });
                  clearCache();
                }}
                allProducts={productList}
                filteredProductsCount={productList.length}
                onSearchProduct={(term: string) => {
                  const t = term.trim();
                  if (t) {
                    const toSlug = (str: string) =>
                      str
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/\p{Diacritic}/gu, "")
                        .replace(/[đĐ]/g, "d")
                        .replace(/[^a-z0-9\s]/g, "")
                        .replace(/\s+/g, "-");
                    const slug = toSlug(t);
                    const encoded = encodeURIComponent(t);
                    window.location.href = `/san-pham/${slug}?search=${encoded}`;
                  }
                }}
              />
            </div>
          </aside>

          {/* Main grid */}
          <main className="flex-1 lg:min-w-0">
            {/* Top sort bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                Hiển thị {productList.length} sản phẩm
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 mr-2">Sắp xếp:</span>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  onChange={(e) => {
                    const v = e.target.value;
                    // Very basic client-side sort (newest / best / price)
                    if (v === "price_desc") {
                      productList.sort((a, b) => extractPrice(b) - extractPrice(a));
                    } else if (v === "price_asc") {
                      productList.sort((a, b) => extractPrice(a) - extractPrice(b));
                    } else if (v === "new") {
                      // keep as-is (API should handle)
                    } else if (v === "popular") {
                      // fallback
                    }
                    // force re-render
                    setCurrentPage((p) => p + 0);
                  }}
                >
                  <option value="new">Mới nhất</option>
                  <option value="popular">Bán chạy</option>
                  <option value="price_desc">Giá cao đến thấp</option>
                  <option value="price_asc">Giá thấp đến cao</option>
                </select>
              </div>
            </div>

            {/* Mobile filter & tags */}
            <div className="lg:hidden mb-4">
              <MobileFilterTags
                filterOptions={filterOptions}
                selectedFilters={advancedFilters}
                onFilterChange={handleFilterChange}
                onPriceChange={(v) => handleFilterChange("priceRange", v)}
                onClearFilters={() => {
                  setAdvancedFilters({
                    thuongHieu: [],
                    quyCach: [],
                    hoanThien: [],
                    chatLieu: [],
                    donVi: [],
                    priceRange: [filterOptions.priceRange.min, filterOptions.priceRange.max],
                  });
                  clearCache();
                }}
                filteredProductsCount={productList.length}
              />
            </div>

            {loading && !productList.length ? (
              <InlineLoading />
            ) : productList.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center mt-4">
                <p className="text-gray-600">Không tìm thấy sản phẩm phù hợp.</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {productList.map((p) => (
                    <ProductCard key={p.crdfd_productsid || p.id} product={p} hasAccess={true} />
                  ))}
                </div>

                {/* Desktop pagination */}
                {!isMobile && productsData && productsData.pagination.totalPages > 1 && (
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
      </div>
    </div>
  );
};

export default ProductGroupListV2;


