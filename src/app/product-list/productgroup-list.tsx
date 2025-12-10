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
// Local lightweight loader (avoid full-page hero during inline suspense)
const InlineLoading = () => (
  <div className="w-full flex items-center justify-center py-6">
    <div className="w-6 h-6 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
  </div>
);
import Diacritics from "diacritics";
import { getItem } from "@/utils/SecureStorage";
import { ProductListProps } from "@/model/interface/ProductGroupListData";
import Pagination from "@mui/material/Pagination";
import dynamic from "next/dynamic";
import { IoMdClose } from "react-icons/io";
import { useRouter } from "next/navigation";
import AdvancedFilter from "./_components/AdvancedFilter";
import MobileFilterTags from "./_components/MobileFilterTags";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

// Lazy load components
const Breadcrumb = lazy(() => import("./_components/breadcrumbs"));
const ProductGroupImage = lazy(
  () => import("@/app/product-list/_components/ProductGroupImage")
);
const ProductGroupImageWithFallback = lazy(
  () => import("@/app/product-list/_components/ProductGroupImageWithFallback")
);
const ProductTable_index = lazy(
  () => import("./_components/product-table/index-product")
);

// Define interfaces for our data structure to match the API response
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

// Interface for filter options
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

// Tạo wrapper component để truyền dữ liệu sản phẩm trực tiếp
interface ModifiedProductTableProps {
  ID: string;
  products: ProductDetails[];
  initialQuantity: number;
  startIndex: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddToCart: (product: Products, quantity: number) => void;
  searchTerm: string;
  showPrices?: boolean;
  isPriceViewer?: boolean;
  customerSelectId?: string;
}

// Hàm xử lý giá từ cr1bb_json_gia
const extractPrice = (product: ProductDetails): number => {
  // Nếu có cr1bb_json_gia và là mảng
  if (
    product.cr1bb_json_gia &&
    Array.isArray(product.cr1bb_json_gia) &&
    product.cr1bb_json_gia.length > 0
  ) {
    // Tìm giá có hiệu lực
    const activePrice = product.cr1bb_json_gia.find(
      (item) =>
        item.crdfd_trangthaihieulucname === "Còn hiệu lực" ||
        item.crdfd_trangthaihieuluc === 191920000
    );

    if (activePrice && activePrice.crdfd_gia) {
      return parseFloat(activePrice.crdfd_gia);
    }

    // Nếu không tìm thấy giá có hiệu lực, lấy giá đầu tiên
    if (product.cr1bb_json_gia[0] && product.cr1bb_json_gia[0].crdfd_gia) {
      return parseFloat(product.cr1bb_json_gia[0].crdfd_gia);
    }
  }

  // Nếu không có cr1bb_json_gia hoặc không tìm thấy giá, kiểm tra các trường khác
  if (product.crdfd_gia && product.crdfd_gia > 0) {
    return product.crdfd_gia;
  }

  if (product.crdfd_giatheovc && product.crdfd_giatheovc > 0) {
    return product.crdfd_giatheovc;
  }

  if (typeof product.cr1bb_giaban === "number" && product.cr1bb_giaban > 0) {
    return product.cr1bb_giaban;
  }

  // Nếu cr1bb_giaban là string, thử trích xuất giá
  if (typeof product.cr1bb_giaban === "string") {
    const priceMatch = product.cr1bb_giaban.match(/\d+(\.\d+)?/);
    if (priceMatch && priceMatch[0]) {
      return parseFloat(priceMatch[0]);
    }
  }

  return 0; // Trả về 0 nếu không tìm thấy giá
};

// Component mới bọc lại ProductTable_index
const ModifiedProductTable: React.FC<ModifiedProductTableProps> = ({
  ID,
  products,
  isPriceViewer = false,
  customerSelectId,
  ...props
}) => {
  const [allData, setAllData] = useState<Products[]>([]);

  useEffect(() => {
    // Debug logging
    console.log('=== MODIFIED PRODUCT TABLE DEBUG ===');
    console.log('products received:', products);
    console.log('products length:', products?.length || 0);
    console.log('====================================');
    
    if (products && products.length > 0) {
      // Console log để kiểm tra dữ liệu products được truyền vào component
      // Tạo mảng để chứa các sản phẩm đã được xử lý
      let formattedProducts: Products[] = [];

      // Duyệt qua từng sản phẩm
      products.forEach((product: ProductDetails) => {
        // Kiểm tra xem sản phẩm có nhiều giá trong cr1bb_json_gia không
        if (
          product.cr1bb_json_gia &&
          Array.isArray(product.cr1bb_json_gia) &&
          product.cr1bb_json_gia.length > 1
        ) {
          // Nếu có nhiều giá, tạo một sản phẩm riêng cho mỗi giá
          product.cr1bb_json_gia.forEach((priceOption: any) => {
            // Log kiểm tra dữ liệu đầu vào
            // Chỉ xử lý các giá có hiệu lực
            if (
              priceOption.crdfd_trangthaihieulucname === "Còn hiệu lực" ||
              priceOption.crdfd_trangthaihieuluc === 191920000
            ) {
              const price =
                priceOption.crdfd_gia || priceOption.crdfd_giatheovc || 0;

              // Tạo sản phẩm mới với đơn vị và giá tương ứng
              const formattedProduct: Products = {
                crdfd_name: product.crdfd_name || product.crdfd_fullname || "",
                crdfd_productsid: product.crdfd_productsid || product.id || "",
                crdfd_fullname: product.crdfd_fullname || "",
                crdfd_masanpham: product.crdfd_masanpham || "",
                _crdfd_productgroup_value:
                  product._crdfd_productgroup_value || "",
                cr1bb_nhomsanphamcha: product.cr1bb_nhomsanphamcha || "",
                crdfd_manhomsp: product.crdfd_manhomsp || "",
                crdfd_thuonghieu: product.crdfd_thuonghieu || "",
                crdfd_quycach: product.crdfd_quycach || "",
                crdfd_chatlieu: product.crdfd_chatlieu || "",
                crdfd_hoanthienbemat: product.crdfd_hoanthienbemat || "",
                crdfd_nhomsanphamtext: product.crdfd_nhomsanphamtext || "",
                cr1bb_giaban: price.toString(),
                cr1bb_giaban_Bg: price.toString(),
                cr1bb_imageurl: product.cr1bb_imageurl || "",
                cr1bb_imageurlproduct: product.cr1bb_imageurlproduct || "",
                _crdfd_onvi_value: priceOption.crdfd_onvi || "default",
                don_vi_DH: priceOption.crdfd_onvichuan || "Đơn vị",
                crdfd_onvichuantext: priceOption.crdfd_onvichuan || "Đơn vị",
                unit: priceOption.crdfd_onvichuan || "Đơn vị",
                price: price.toString(),
                crdfd_giatheovc: priceOption.crdfd_giatheovc || price,
                priceChangeReason: "",
                isPriceUpdated: false,
                cr1bb_tylechuyenoi:
                  priceOption.cr1bb_tylechuyenoi?.toString() || "1",
                crdfd_productgroup: product._crdfd_productgroup_value || "",
                cr1bb_banchatgiaphatra:
                  priceOption.cr1bb_banchatgiaphatra ??
                  product.cr1bb_banchatgiaphatra ??
                  undefined,
                crdfd_gtgt_value:
                  priceOption.crdfd_gtgt_value ??
                  product.crdfd_gtgt_value ??
                  undefined,
                crdfd_gia:
                  priceOption.crdfd_gia ?? product.crdfd_gia ?? undefined,
                cr1bb_giakhongvat:
                  priceOption.cr1bb_giakhongvat ??
                  product.cr1bb_giakhongvat ??
                  undefined,
                cr1bb_json_gia: product.cr1bb_json_gia || [], // BỔ SUNG TRƯỜNG GIÁ CHI TIẾT
              };

              formattedProducts.push(formattedProduct);
            }
          });
        } else {
          // Nếu chỉ có một giá, xử lý như trước
          // Log kiểm tra dữ liệu đầu vào
          const price = extractPrice(product);

          // Get the unit from cr1bb_json_gia if available
          const unitFromJsonGia =
            product.cr1bb_json_gia &&
            Array.isArray(product.cr1bb_json_gia) &&
            product.cr1bb_json_gia.length > 0
              ? product.cr1bb_json_gia[0].crdfd_onvichuan
              : null;

          // Get the onvi value from cr1bb_json_gia if available
          const onviValueFromJsonGia =
            product.cr1bb_json_gia &&
            Array.isArray(product.cr1bb_json_gia) &&
            product.cr1bb_json_gia.length > 0
              ? product.cr1bb_json_gia[0].crdfd_onvi
              : null;

          const mainPrice =
            product.cr1bb_json_gia &&
            Array.isArray(product.cr1bb_json_gia) &&
            product.cr1bb_json_gia[0]
              ? product.cr1bb_json_gia[0]
              : {};

          const formattedProduct: Products = {
            crdfd_name: product.crdfd_name || product.crdfd_fullname || "",
            crdfd_productsid: product.crdfd_productsid || product.id || "",
            crdfd_fullname: product.crdfd_fullname || "",
            crdfd_masanpham: product.crdfd_masanpham || "",
            _crdfd_productgroup_value: product._crdfd_productgroup_value || "",
            cr1bb_nhomsanphamcha: product.cr1bb_nhomsanphamcha || "",
            crdfd_manhomsp: product.crdfd_manhomsp || "",
            crdfd_thuonghieu: product.crdfd_thuonghieu || "",
            crdfd_quycach: product.crdfd_quycach || "",
            crdfd_chatlieu: product.crdfd_chatlieu || "",
            crdfd_hoanthienbemat: product.crdfd_hoanthienbemat || "",
            crdfd_nhomsanphamtext: product.crdfd_nhomsanphamtext || "",
            cr1bb_giaban: price.toString(),
            cr1bb_giaban_Bg: price.toString(),
            cr1bb_imageurl: product.cr1bb_imageurl || "",
            cr1bb_imageurlproduct: product.cr1bb_imageurlproduct || "",
            _crdfd_onvi_value:
              onviValueFromJsonGia || product._crdfd_onvi_value || "",
            don_vi_DH: unitFromJsonGia || product.crdfd_onvichuan || "Đơn vị",
            crdfd_onvichuantext:
              unitFromJsonGia || product.crdfd_onvichuan || "Đơn vị",
            unit: unitFromJsonGia || product.crdfd_onvichuan || "Đơn vị",
            price: price.toString(),
            crdfd_giatheovc: product.crdfd_giatheovc || price,
            priceChangeReason: "",
            isPriceUpdated: false,
            cr1bb_tylechuyenoi: "1",
            crdfd_productgroup: product._crdfd_productgroup_value || "",
            cr1bb_banchatgiaphatra:
              mainPrice.cr1bb_banchatgiaphatra ??
              product.cr1bb_banchatgiaphatra ??
              undefined,
            crdfd_gtgt_value:
              mainPrice.crdfd_gtgt_value ??
              product.crdfd_gtgt_value ??
              undefined,
            crdfd_gia: mainPrice.crdfd_gia ?? product.crdfd_gia ?? undefined,
            cr1bb_giakhongvat:
              mainPrice.cr1bb_giakhongvat ??
              product.cr1bb_giakhongvat ??
              undefined,
            cr1bb_json_gia: product.cr1bb_json_gia || [], // BỔ SUNG TRƯỜNG GIÁ CHI TIẾT
          };

          formattedProducts.push(formattedProduct);
        }
      });

      // Debug final formatted products
      console.log('=== FORMATTED PRODUCTS DEBUG ===');
      console.log('formattedProducts length:', formattedProducts.length);
      console.log('formattedProducts:', formattedProducts);
      console.log('================================');
      
      setAllData(formattedProducts);
    } else {
      console.log('No products or products is empty');
      setAllData([]);
    }
  }, [products]);

  return (
    <Suspense fallback={<InlineLoading />}>
      <ProductTable_index
        {...props}
        ID={ID}
        usePreloadedData={true} // Flag để biết sử dụng dữ liệu có sẵn
        preloadedData={allData}
        customerSelectId={customerSelectId}
      />
    </Suspense>
  );
};

// Custom hook to get the customer ID
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

// Move the API cache to a higher level variable to access it
const apiCache = new Map();

// Main hook to get product data from the API
const useProductsData = (
  customerId: string | null,
  searchTerm: string,
  groupName: string,
  groupName_cha: string,
  currentPage: number,
  isMobileView: boolean,
  productGroupId: string | null,
  refreshTimestamp: number = Date.now(), // Add refreshTimestamp parameter with default value
  advancedFilters?: AdvancedFilters // Add filter parameters
) => {
  const [productsData, setProductsData] =
    useState<PaginatedProductGroups | null>(null);
  const [allLoadedGroups, setAllLoadedGroups] = useState<
    Record<string, ProductGroup>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const doiTuong = getItem("customerGroupIds");
  // Số lượng nhóm sản phẩm trên mỗi trang
  const groupsPerPage = 10;

  const fetchProductsData = useCallback(async () => {
    // Log that we're fetching with current timestamp

    const storedId = getItem("id");

    try {
      setLoading(true);

      // Build the API URL with query parameters
      let apiUrl = "/api/getProductsOnly";
      const params = new URLSearchParams();

      if (customerId || storedId) {
        params.append("customerId", customerId || storedId || "");
      }

      if (searchTerm) {
        console.log('=== PRODUCT GROUP LIST DEBUG ===');
        console.log('Search Term:', searchTerm);
        console.log('API URL:', apiUrl);
        console.log('Params before adding searchTerm:', params.toString());
        
        // Check if we have AI keywords for this search
        const aiKeywordsForAPI = localStorage.getItem('imageSearch:aiKeywordsForAPI');
        if (aiKeywordsForAPI) {
          console.log('Found AI keywords for API:', aiKeywordsForAPI);
          params.append("keywords", aiKeywordsForAPI);
          // Clear the AI keywords after using them
          localStorage.removeItem('imageSearch:aiKeywordsForAPI');
        } else {
          params.append("searchTerm", searchTerm);
        }
        
        console.log('Params after adding search params:', params.toString());
        console.log('================================');
      }

      if (groupName) {
        params.append("groupName", groupName);
      }

      if (groupName_cha) {
        params.append("parentGroup", groupName_cha);
      }

      // Add product group ID parameter if available
      if (productGroupId) {
        params.append("product_group_Id", productGroupId);
      }

      // Add doiTuong parameter
      if (doiTuong) {
        params.append("doiTuong", doiTuong);
      }

      // Add pagination parameters
      params.append("page", currentPage.toString());
      params.append("pageSize", groupsPerPage.toString());

      // Add advanced filter parameters if they exist
      if (advancedFilters) {
        
        if (advancedFilters.thuongHieu.length > 0) {
          params.append("filterThuongHieu", JSON.stringify(advancedFilters.thuongHieu));
        }
        if (advancedFilters.quyCach.length > 0) {
          params.append("filterQuyCach", JSON.stringify(advancedFilters.quyCach));
        }
        if (advancedFilters.hoanThien.length > 0) {
          params.append("filterHoanThien", JSON.stringify(advancedFilters.hoanThien));
        }
        if (advancedFilters.chatLieu.length > 0) {
          params.append("filterChatLieu", JSON.stringify(advancedFilters.chatLieu));
        }
        if (advancedFilters.donVi.length > 0) {
          params.append("filterDonVi", JSON.stringify(advancedFilters.donVi));
        }
        if (advancedFilters.priceRange[0] > 0 || advancedFilters.priceRange[1] < 10000000) {
          params.append("priceMin", advancedFilters.priceRange[0].toString());
          params.append("priceMax", advancedFilters.priceRange[1].toString());
        }
      }

      // Include refresh timestamp to intentionally bust memoization/cache when needed
      if (refreshTimestamp) {
        params.append("ts", refreshTimestamp.toString());
      }

      // Create a cache key based on the request
      const cacheKey = `${apiUrl}?${params.toString()}`;

      // Check if we have a cached response
      if (apiCache.has(cacheKey)) {
        const cachedData = apiCache.get(cacheKey);
        setProductsData(cachedData);

        // For mobile, we need to accumulate all loaded groups
        if (isMobileView && currentPage > 1) {
          setAllLoadedGroups((prev) => ({
            ...prev,
            ...cachedData.data,
          }));
        } else {
          setAllLoadedGroups(cachedData.data);
        }

        setLoading(false);
        return;
      }

      // Fetch from API if not cached
      const response = await axios.get(`${apiUrl}?${params.toString()}`);
      
      // Debug API response
      console.log('=== API RESPONSE DEBUG ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response data.data:', response.data?.data);
      console.log('Response data.pagination:', response.data?.pagination);
      console.log('==========================');
      
      if (response.data && response.data.data && response.data.pagination) {
        const processedData = response.data;

        // Sort products within each group
        Object.keys(processedData.data).forEach((groupKey) => {
          const group = processedData.data[groupKey];
          if (group.products && Array.isArray(group.products)) {
            // Sort products: products with prices first, then products without prices
            group.products.sort((a: ProductDetails, b: ProductDetails) => {
              const priceA = extractPrice(a);
              const priceB = extractPrice(b);

              // If both have prices or both don't have prices, maintain original order
              if (
                (priceA > 0 && priceB > 0) ||
                (priceA === 0 && priceB === 0)
              ) {
                return 0;
              }

              // Put products with prices first
              return priceA > 0 ? -1 : 1;
            });
          }
        });

        // Store in cache
        apiCache.set(cacheKey, processedData);
        
        // Debug processed data before setting state
        console.log('=== PROCESSED DATA DEBUG ===');
        console.log('processedData:', processedData);
        console.log('processedData.data:', processedData.data);
        console.log('Object.keys(processedData.data):', Object.keys(processedData.data));
        console.log('============================');
        
        setProductsData(processedData);

        // For mobile, we need to accumulate all loaded groups
        if (isMobileView && currentPage > 1) {
          setAllLoadedGroups((prev) => ({
            ...prev,
            ...processedData.data,
          }));
        } else {
          setAllLoadedGroups(processedData.data);
        }
      } else {
        console.error("Unexpected API response structure:", response.data);
        setProductsData(null);
      }
    } catch (error) {
      console.error("Error fetching products data:", error);
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
    groupsPerPage,
    isMobileView,
    productGroupId,
    refreshTimestamp,
    doiTuong,
    advancedFilters,
  ]);

  // Use debounce to avoid too many API calls
  const debouncedFetchData = useDebounce(fetchProductsData, 300)[0];

  useEffect(() => {
    debouncedFetchData();

    // Clear cache after some time
    const clearCacheInterval = setInterval(() => {
      apiCache.clear();
    }, 5 * 60 * 1000); // Clear cache every 5 minutes

    return () => {
      clearInterval(clearCacheInterval);
    };
  }, [debouncedFetchData, refreshTimestamp]);

  // Add a function to clear the cache directly
  const clearCache = useCallback(() => {
    apiCache.clear();
  }, []);

  return {
    productsData,
    allLoadedGroups,
    loading,
    error,
    clearCache, // Return the clearCache function
  };
};

const ProductGroupList: React.FC<ProductListProps> = ({
  searchTerm,
  selectedProductGroup,
  breadcrumb: initialBreadcrumb,
  onAddToCart,
  customerSelectId,
  isPriceViewer = false,
  sortBy = "name",
  filterBy = "all",
}) => {
  const router = useRouter();
  const customerId = useCustomerId();
  const [currentBreadcrumb, setCurrentBreadcrumb] = useState<string[]>([
    "TẤT CẢ SẢN PHẨM",
  ]);
  const [groupName, setGroupName] = useState<string>("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [groupName_cha, setGroupNameCha] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [urlCategoryLoading, setUrlCategoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [searchType, setSearchType] = useState("product");
  const [productGroupId, setProductGroupId] = useState<string | null>(null);

  // Advanced Filter States
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(true);
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
  const [filteredGroupsData, setFilteredGroupsData] = useState<Record<string, ProductGroup>>({});
  const [allProductsForFilter, setAllProductsForFilter] = useState<ProductDetails[]>([]);
  const [filterDataFetched, setFilterDataFetched] = useState(false);

  // Add a refresh timestamp state
  const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());
  // Mobile filter Sheet open state (for FAB control)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const groupsPerPage = 10; // Số nhóm sản phẩm trên một trang
  const lastProductRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Function to fetch all products for filter options (without pagination)
  const fetchAllProductsForFilter = useCallback(async () => {
    const storedId = getItem("id");
    const doiTuong = getItem("customerGroupIds");
    
    // Get the current URL to check for path-based filtering
    const urlPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isProductCategoryPage = urlPath.startsWith('/san-pham/') && urlPath !== '/san-pham/';
    
    // If we're on a product category page but productGroupId is not set yet, 
    // wait for the productGroupId to be set
    if (isProductCategoryPage && !productGroupId) {
      console.log('On category page but productGroupId not yet set, delaying filter data fetch');
      return [];
    }

    // If we have a search term, don't fetch all products for filter
    // The search results will be handled by the main API call
    if (searchTerm && searchTerm.trim()) {
      console.log('Search active, skipping filter data fetch to avoid loading all products');
      return [];
    }

    try {
      // Build the API URL for all products
      let apiUrl = "/api/getProductsOnly";
      const params = new URLSearchParams();

      if (customerId || storedId) {
        params.append("customerId", customerId || storedId || "");
      }

      if (groupName) {
        params.append("groupName", groupName);
      }

      if (groupName_cha) {
        params.append("parentGroup", groupName_cha);
      }

      // Check if we have a product group ID, either from state or URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlProductGroupId = urlParams.get('product_group_Id');
      
      const effectiveProductGroupId = productGroupId || urlProductGroupId;
      
      if (effectiveProductGroupId) {
        params.append("product_group_Id", effectiveProductGroupId);
        console.log(`Filtering for product group ID: ${effectiveProductGroupId}`);
      }

      if (doiTuong) {
        params.append("doiTuong", doiTuong);
      }

      // Request all data without pagination for filter options
      params.append("page", "1");
      params.append("pageSize", "5000"); // Very large number to get all data
      params.append("forFilter", "true"); // Special flag to bypass normal pagination

      const response = await axios.get(`${apiUrl}?${params.toString()}`);
      
      if (response.data && response.data.data) {
        const allProducts: ProductDetails[] = [];
        Object.values(response.data.data).forEach((group: any) => {
          if (group.products && Array.isArray(group.products)) {
            allProducts.push(...group.products);
          }
        });

        setAllProductsForFilter(allProducts);
        console.log("Fetched all products for filter:", allProducts.length);
        setFilterDataFetched(true); // Mark as fetched
        return allProducts;
      } else {
        console.warn('No data in filter API response');
      }
    } catch (error) {
      console.error("Error fetching all products for filter:", error);
    }
    return [];
  }, [searchTerm, groupName, groupName_cha, productGroupId, customerId]);

  // Get products data using our new API hook and pass currentPage and isMobile flag
  const { productsData, allLoadedGroups, loading, error, clearCache } =
    useProductsData(
      customerId,
      searchTerm,
      groupName,
      groupName_cha,
      currentPage,
      isMobile,
      productGroupId,
      refreshTimestamp,
      advancedFilters
    );

  // Hide advanced filter when searching to improve performance
  useEffect(() => {
    if (searchTerm && searchTerm.trim()) {
      setShowAdvancedFilter(false);
      setIsSearching(true);
      // Clear cache when searching to ensure fresh results
      clearCache();
    } else {
      setShowAdvancedFilter(true);
      setIsSearching(false);
    }
  }, [searchTerm, clearCache]);

  // Hide search loading when products are loaded or when there's no data
  useEffect(() => {
    if (isSearching && !loading) {
      // Hide loading when API call is complete, regardless of whether we have data or not
      setIsSearching(false);
    }
  }, [isSearching, loading]);

  const loadMoreData = useCallback(() => {
    if (loadingMore || currentPage >= totalPages) return;

    setLoadingMore(true);
    setCurrentPage((prevPage) => prevPage + 1);
  }, [loadingMore, currentPage, totalPages]);

  // Reset loading state when data is fetched
  useEffect(() => {
    if (productsData) {
      setLoadingMore(false);
      // Tắt trạng thái loading khi dữ liệu đã được tải
      setUrlCategoryLoading(false);
    }
  }, [productsData]);

  // Add event listener to handle sidebar product group selection
  useEffect(() => {
    const handleProductGroupSelected = (event: CustomEvent) => {
      if (event.detail && event.detail.productGroupId) {
        // Bật trạng thái loading khi chọn nhóm sản phẩm mới
        setUrlCategoryLoading(true);
        
        // Set the product group ID for API filtering
        setProductGroupId(event.detail.productGroupId);

        // Update breadcrumb if provided
        if (event.detail.breadcrumb) {
          setCurrentBreadcrumb(["TẤT CẢ SẢN PHẨM", event.detail.breadcrumb]);
        }

        // Reset filters and pagination
        setCurrentPage(1);
        setGroupName("");
        setGroupNameCha("");
      }
    };

    // Add event listener for the custom event
    window.addEventListener(
      "productGroupSelected",
      handleProductGroupSelected as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "productGroupSelected",
        handleProductGroupSelected as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim() !== "") {
      setCurrentBreadcrumb([`Kết quả tìm kiếm cho từ khóa "${searchTerm}"`]);
      setGroupName("");
      setGroupNameCha("");
    } else if (initialBreadcrumb && initialBreadcrumb.length > 0) {
      setCurrentBreadcrumb(["TẤT CẢ SẢN PHẨM", ...initialBreadcrumb]);
    } else {
      setCurrentBreadcrumb(["TẤT CẢ SẢN PHẨM"]);
    }
  }, [initialBreadcrumb, searchTerm]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const queryParams = new URL(window.location.href);
      const group = decodeURIComponent(
        queryParams.searchParams.get("group") || ""
      );
      const breadcrumb = decodeURIComponent(
        queryParams.searchParams.get("breadcrumb") || ""
      );
      const productGroupIdParam =
        queryParams.searchParams.get("product_group_Id");

      // Kiểm tra xem chúng ta có đang ở trang danh mục không (từ URL path)
      const urlPath = window.location.pathname;
      const isProductCategoryPage = urlPath.startsWith('/san-pham/') && urlPath !== '/san-pham/';

      // Nếu đang ở trang danh mục hoặc có productGroupId từ URL, bật trạng thái loading
      if (isProductCategoryPage || productGroupIdParam) {
        setUrlCategoryLoading(true);
      }

      const breadcrumbParts = breadcrumb.split("/");

      setGroupName(group);

      if (group) {
        setCurrentBreadcrumb((prev) => ["TẤT CẢ SẢN PHẨM", ...breadcrumbParts]);
      }

      // Set product group ID from URL if available
      if (productGroupIdParam) {
        setProductGroupId(productGroupIdParam);
      }
    }
  }, []);

  // Reset to page 1 when search params change
  useEffect(() => {
    // Reset về trang đầu tiên khi thay đổi điều kiện tìm kiếm
    setCurrentPage(1);
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [searchTerm, isMobile, groupName, groupName_cha, productGroupId]);

  // EARLY FETCH FOR FILTER DATA - Run as soon as component mounts
  useEffect(() => {
    // Don't fetch if already fetched
    if (filterDataFetched) {
      return;
    }
    
    // Get current URL path to check if we're on a specific product category page
    const urlPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isProductCategoryPage = urlPath.startsWith('/san-pham') && urlPath !== '/san-pham';
    
    // If we're on a category page but productGroupId is not set yet, 
    // wait for the productGroupId to be set by the [slug] page component
    if (isProductCategoryPage && !productGroupId) {
      console.log('On category page, waiting for productGroupId before fetching filter data');
      return;
    }
    
    // Get URL parameters to check for direct product_group_Id parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlProductGroupId = urlParams.get('product_group_Id');
    
    // If we have all the information we need, fetch the data
    console.log(`Fetching filter data with product group ID: ${productGroupId || urlProductGroupId || 'none'}`);
    fetchAllProductsForFilter();
    
    // Set a backup timer in case the immediate fetch fails
    const timer = setTimeout(() => {
      if (!filterDataFetched) {
        console.log('Retry fetching filter data');
        fetchAllProductsForFilter();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filterDataFetched, productGroupId, fetchAllProductsForFilter]);

  // Fetch all products for filter when component mounts or key params change
  // useEffect(() => {
  //   if (customerId !== null && !filterDataFetched) {
  //     // Immediately fetch all products for filter options
  //     fetchAllProductsForFilter();
  //   }
  // }, [customerId, searchTerm, groupName, groupName_cha, productGroupId, fetchAllProductsForFilter, filterDataFetched]);

  // Force immediate load of filter data when customerId is available
  // useEffect(() => {
  //   if (customerId !== null && allProductsForFilter.length === 0) {
  //     // Use setTimeout with 0 to ensure this runs after current execution stack
  //     setTimeout(() => {
  //       fetchAllProductsForFilter();
  //     }, 0);
  //   }
  // }, [customerId, fetchAllProductsForFilter]);

  // Build filter options from ALL products data (not just current page)
  useEffect(() => {
    const buildFilterOptions = async () => {
      
      // Use existing data if available, otherwise fetch it
      let allProducts = allProductsForFilter;
      if (allProducts.length === 0 && customerId !== null) {
        allProducts = await fetchAllProductsForFilter();
      }

      if (allProducts.length === 0) {
        return;
      }
      // Extract unique values for each filter category
      const thuongHieuMap = new Map<string, number>();
      const quyCachMap = new Map<string, number>();
      const hoanThienMap = new Map<string, number>();
      const chatLieuMap = new Map<string, number>();
      const donViMap = new Map<string, number>();
      let minPrice = Infinity;
      let maxPrice = 0;

      allProducts.forEach(product => {
        // Thương hiệu
        if (product.crdfd_thuonghieu && product.crdfd_thuonghieu.trim()) {
          const brand = product.crdfd_thuonghieu.trim();
          thuongHieuMap.set(brand, (thuongHieuMap.get(brand) || 0) + 1);
        }

        // Quy cách
        if (product.crdfd_quycach && product.crdfd_quycach.trim()) {
          const spec = product.crdfd_quycach.trim();
          quyCachMap.set(spec, (quyCachMap.get(spec) || 0) + 1);
        }

        // Hoàn thiện
        if (product.crdfd_hoanthienbemat && product.crdfd_hoanthienbemat.trim()) {
          const finish = product.crdfd_hoanthienbemat.trim();
          hoanThienMap.set(finish, (hoanThienMap.get(finish) || 0) + 1);
        }

        // Chất liệu
        if (product.crdfd_chatlieu && product.crdfd_chatlieu.trim()) {
          const material = product.crdfd_chatlieu.trim();
          chatLieuMap.set(material, (chatLieuMap.get(material) || 0) + 1);
        }

        // Đơn vị
        if (product.crdfd_onvichuan && product.crdfd_onvichuan.trim()) {
          const unit = product.crdfd_onvichuan.trim();
          donViMap.set(unit, (donViMap.get(unit) || 0) + 1);
        }

        // Price range
        const price = extractPrice(product);
        if (price > 0) {
          minPrice = Math.min(minPrice, price);
          maxPrice = Math.max(maxPrice, price);
        }
      });

      // Convert maps to FilterOption arrays and sort by count descending
      const createFilterOptions = (map: Map<string, number>): FilterOption[] =>
        Array.from(map.entries())
          .map(([value, count]) => ({ value, label: value, count }))
          .sort((a, b) => b.count - a.count);

      const filterOptionsResult = {
        thuongHieu: createFilterOptions(thuongHieuMap),
        quyCach: createFilterOptions(quyCachMap),
        hoanThien: createFilterOptions(hoanThienMap),
        chatLieu: createFilterOptions(chatLieuMap),
        donVi: createFilterOptions(donViMap),
        priceRange: {
          min: minPrice === Infinity ? 0 : Math.floor(minPrice),
          max: maxPrice === 0 ? 10000000 : Math.ceil(maxPrice),
        },
      };

      setFilterOptions(filterOptionsResult);

      // Update price range in advancedFilters if it's the default value
      if (advancedFilters.priceRange[0] === 0 && advancedFilters.priceRange[1] === 10000000) {
        setAdvancedFilters(prev => ({
          ...prev,
          priceRange: [
            minPrice === Infinity ? 0 : Math.floor(minPrice),
            maxPrice === 0 ? 10000000 : Math.ceil(maxPrice)
          ] as [number, number]
        }));
      }
    };

    // Build filter options immediately when we have product data
    if (allProductsForFilter.length > 0) {
      buildFilterOptions();
    }
  }, [allProductsForFilter, fetchAllProductsForFilter, advancedFilters, customerId]);

  // Apply advanced filters to the data (now handled by API, keep for backward compatibility)
  useEffect(() => {
    // Since filtering is now handled by the API, we don't need client-side filtering
    // Just clear any existing filtered data
    setFilteredGroupsData({});
  }, [productsData, allLoadedGroups, advancedFilters, isMobile]);

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    if (isMobile) {
      const observer = new IntersectionObserver(
        (entries) => {
          const target = entries[0];
          if (
            target.isIntersecting &&
            !loadingMore &&
            currentPage < totalPages
          ) {
            loadMoreData();
          }
        },
        {
          root: null,
          rootMargin: "0px",
          threshold: 0.1,
        }
      );

      const currentLoadingRef = loadingRef.current;
      if (currentLoadingRef) {
        observer.observe(currentLoadingRef);
      }

      return () => {
        if (currentLoadingRef) {
          observer.unobserve(currentLoadingRef);
        }
      };
    }
  }, [isMobile, loadingMore, currentPage, totalPages, loadMoreData]);

  // Advanced filter handlers
  const handleFilterChange = (filterType: string, value: any) => {
    // Show a brief loading indicator while refetching
    setIsLoading(true);
    setAdvancedFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
    
    // Reset to page 1 when filter changes
    setCurrentPage(1);
    
    // Clear cache to force fresh data with new filters
    clearCache();
    
    // Clear mobile accumulated data
    if (isMobile) {
      // Force reload of data for mobile
      setRefreshTimestamp(Date.now());
    }
    // Turn off loading shortly after to allow UI spinner to show
    setTimeout(() => setIsLoading(false), 400);
  };

  const handlePriceChange = (value: number[]) => {
    setIsLoading(true);
    setAdvancedFilters(prev => ({
      ...prev,
      priceRange: [value[0], value[1]] as [number, number],
    }));
    
    // Reset to page 1 when price filter changes
    setCurrentPage(1);
    
    // Clear cache to force fresh data with new filters
    clearCache();
    
    // Clear mobile accumulated data
    if (isMobile) {
      setRefreshTimestamp(Date.now());
    }
    setTimeout(() => setIsLoading(false), 400);
  };

  const handleClearFilters = () => {
    setIsLoading(true);
    setAdvancedFilters({
      thuongHieu: [],
      quyCach: [],
      hoanThien: [],
      chatLieu: [],
      donVi: [],
      priceRange: [filterOptions.priceRange.min, filterOptions.priceRange.max],
    });
    
    // Reset to page 1 when clearing filters
    setCurrentPage(1);
    
    // Clear cache to force fresh data
    clearCache();
    
    // Reset filter data fetched state to allow re-fetching if needed
    setFilterDataFetched(false);
    
    // Clear mobile accumulated data
    if (isMobile) {
      setRefreshTimestamp(Date.now());
    }
    setTimeout(() => setIsLoading(false), 400);
  };

  // Function to get the data to display (now comes filtered from API)
  const getDisplayData = () => {
    // Since API now handles filtering, we just return the paginated data
    return getPaginatedGroups();
  };

  // Get filtered products count
  const getFilteredProductsCount = () => {
    const displayData = getDisplayData();
    let count = 0;
    Object.values(displayData).forEach((group: any) => {
      if (group.products && Array.isArray(group.products)) {
        count += group.products.length;
      }
    });
    return count;
  };

  // Get all products for dynamic filtering
  const getAllProducts = () => {
    // Use allProductsForFilter for better filtering, fallback to current page data
    if (allProductsForFilter.length > 0) {
      return allProductsForFilter;
    }
    
    // Fallback to current page data if full data not available
    if (!productsData || !productsData.data) return [];
    
    const allProducts: any[] = [];
    Object.values(productsData.data).forEach((group: any) => {
      if (group.products && Array.isArray(group.products)) {
        allProducts.push(...group.products);
      }
    });
    return allProducts;
  };

  const toggleGroupPopup = useCallback(
    (groupName: string, event: React.MouseEvent) => {
      // Get the clicked element
      const clickedElement = event.currentTarget;

      setOpenGroup((prev) => {
        const isOpening = prev !== groupName;

        if (isOpening) {
          // Use setTimeout to ensure the content is expanded before scrolling
          setTimeout(() => {
            const elementRect = clickedElement.getBoundingClientRect();
            const absoluteElementTop = elementRect.top + window.pageYOffset;
            const middle =
              absoluteElementTop -
              window.innerHeight / 2 +
              elementRect.height / 2;

            window.scrollTo({
              top: middle,
              behavior: "smooth",
            });
          }, 100);
        }

        return prev === groupName ? null : groupName;
      });
    },
    []
  );

  const handleBreadcrumbClick = (index: number) => {
    if (currentBreadcrumb && index < currentBreadcrumb.length) {
      // For non-"Tất cả sản phẩm" levels, get the actual breadcrumb item
      const item = currentBreadcrumb[index];

      // Find the ID for this level
      const levelId = breadcrumbLevelIds[index];
      if (levelId) {
        // Update local state
        setProductGroupId(levelId);

        // Create a new breadcrumb array up to the clicked level
        const newBreadcrumb = currentBreadcrumb.slice(0, index + 1);
        setCurrentBreadcrumb(newBreadcrumb);

        // Reset pagination
        setCurrentPage(1);

        // Force cache clear
        clearCache();

        // Navigate to product group page with the selected ID
        const searchParams = new URLSearchParams();
        searchParams.set("product_group_Id", levelId);
        router.replace(`/san-pham?${searchParams.toString()}`);

        // Dispatch a custom event to notify other components
        const event = new CustomEvent("breadcrumbNavigation", {
          detail: {
            productGroupId: levelId,
            breadcrumb: item,
            breadcrumbPath: newBreadcrumb,
          },
        });
        window.dispatchEvent(event);
      } else {
        console.warn(
          `No product group ID found for breadcrumb level: "${item}"`
        );
        // If no ID found, try using text search
        if (item && !item.includes("Kết quả tìm kiếm")) {
          const searchParams = new URLSearchParams();
          searchParams.set("search", item);
          router.replace(`/san-pham?${searchParams.toString()}`);
        }
      }
    }
  };

  // Update the clearBreadcrumb function to set a new refresh timestamp
  const clearBreadcrumb = () => {
    // Clear the API cache first to ensure fresh data
    clearCache();

    // Reset all local state variables
    setProductGroupId(null);
    setGroupName("");
    setGroupNameCha("");
    setCurrentBreadcrumb(["TẤT CẢ SẢN PHẨM"]);
    setCurrentPage(1);
    setOpenGroup(null);
    setUrlCategoryLoading(false); // Tắt trạng thái loading khi xóa bộ lọc

    // Set a new refresh timestamp to force data reload
    setRefreshTimestamp(Date.now());

    // Use router.replace to update URL without full page reload
    router.replace("/san-pham");

    // Force a data reload by triggering a custom event
    const refreshEvent = new CustomEvent("forceDataRefresh", {
      detail: { timestamp: Date.now() },
    });
    window.dispatchEvent(refreshEvent);
  };

  useEffect(() => {
    if (productsData) {
      setTotalPages(productsData.pagination.totalPages);
    }
  }, [productsData]);

  const getPaginatedGroups = useCallback(() => {
    if (!productsData || !productsData.data) {
      return {};
    }

    if (isMobile) {
      // For mobile, return all accumulated groups from all pages loaded so far
      return allLoadedGroups;
    } else {
      // For desktop, return only the current page data
      return productsData.data;
    }
  }, [productsData, allLoadedGroups, isMobile]);

  const handlePageChange = useCallback(
    (event: React.ChangeEvent<unknown>, page: number) => {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    },
    []
  );

  useEffect(() => {
    const userName = getItem("userName");
    setHasAccess(!!userName);
  }, []);

  // Force load filter data when component mounts
  useEffect(() => {
    // Immediate load regardless of login status
    if (allProductsForFilter.length === 0) {
      // Get URL to check if we're on a specific product category page
      const urlPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isProductCategoryPage = urlPath.startsWith('/san-pham') && urlPath !== '/san-pham';
      
      // Only proceed if we're not on a category page or we already have the productGroupId
      if (!isProductCategoryPage || productGroupId) {
        fetchAllProductsForFilter();
        
        // Also set a backup timer in case the immediate call doesn't work
        const timer = setTimeout(() => {
          if (allProductsForFilter.length === 0) {
            fetchAllProductsForFilter();
          }
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [fetchAllProductsForFilter, allProductsForFilter, productGroupId]);

  // Update these functions for breadcrumb navigation
  const [breadcrumbLevelIds, setBreadcrumbLevelIds] = useState<string[]>([]);

  // Set up breadcrumb with associated IDs when it changes
  useEffect(() => {
    if (currentBreadcrumb && currentBreadcrumb.length > 0) {
      // When breadcrumb changes, fetch product group hierarchy to get IDs
      const fetchBreadcrumbIds = async () => {
        try {
          const response = await fetch("/api/getProductGroupHierarchy");
          const hierarchyData = await response.json();

          // Create a name-to-id and id-to-name maps
          const nameToIdMap = new Map();
          const idToNameMap = new Map();

          // Function to extract all groups from the hierarchical structure
          const extractGroups = (groups: any[]) => {
            groups.forEach((group) => {
              if (group.crdfd_productname && group.crdfd_productgroupid) {
                // Store with lowercase for case-insensitive matching
                nameToIdMap.set(
                  group.crdfd_productname.toLowerCase(),
                  group.crdfd_productgroupid
                );
                idToNameMap.set(
                  group.crdfd_productgroupid,
                  group.crdfd_productname
                );
              }
              if (group.children && group.children.length > 0) {
                extractGroups(group.children);
              }
            });
          };

          // Extract all groups from the hierarchy
          if (hierarchyData.hierarchy) {
            extractGroups(hierarchyData.hierarchy);
          }

          // Map breadcrumb names to IDs, with better error handling
          const breadcrumbIds = currentBreadcrumb.map((name) => {
            // Skip the first "TẤT CẢ SẢN PHẨM" entry
            if (name === "TẤT CẢ SẢN PHẨM" || name === "Tất cả sản phẩm") {
              return "";
            }

            // Try to find the ID with better matching
            const id = nameToIdMap.get(name.toLowerCase());
            if (!id) {
              console.warn(`Could not find ID for breadcrumb item: "${name}"`);

              // Try to find a partial match
              const possibleMatches = Array.from(nameToIdMap.entries()).filter(
                ([productName]) =>
                  productName.toLowerCase().includes(name.toLowerCase()) ||
                  name.toLowerCase().includes(productName.toLowerCase())
              );

              if (possibleMatches.length > 0) {
                return possibleMatches[0][1]; // Return the ID of the first match
              }
            }
            return id || "";
          });

          setBreadcrumbLevelIds(breadcrumbIds);

          // Check if we have a product group ID from URL
          const url = new URL(window.location.href);
          const productGroupIdParam = url.searchParams.get("product_group_Id");

          if (productGroupIdParam && idToNameMap.has(productGroupIdParam)) {
            const productGroupName = idToNameMap.get(productGroupIdParam);
          }
        } catch (error) {
          console.error(
            "Error fetching product group hierarchy for breadcrumb:",
            error
          );
        }
      };

      fetchBreadcrumbIds();
    } else {
      setBreadcrumbLevelIds([]);
    }
  }, [currentBreadcrumb]);

  // Update the forceDataRefresh event handler
  useEffect(() => {
    const handleForceDataRefresh = (event: CustomEvent) => {
      // The fetch will happen automatically because refreshTimestamp was changed
      // which is a dependency of the useProductsData hook

      // Show loading indicator temporarily
      setIsLoading(true);
      setUrlCategoryLoading(true); // Bật trạng thái loading khi làm mới dữ liệu
      setTimeout(() => setIsLoading(false), 500);
    };

    // Add event listener for the custom event
    window.addEventListener(
      "forceDataRefresh",
      handleForceDataRefresh as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "forceDataRefresh",
        handleForceDataRefresh as EventListener
      );
    };
  }, []);

  if (error) {
    return (
      <div className="max-w-sm mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-red-100 text-red-700 px-3 py-2 text-sm font-semibold">
          Error
        </div>
        <div className="p-3 text-sm">
          <p>An error occurred: {error.message}</p>
        </div>
      </div>
    );
  }

  // Hiển thị loading khi đang tải dữ liệu lần đầu hoặc khi đang lọc theo danh mục từ URL
  if ((loading && !productsData) || urlCategoryLoading) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center py-10">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600 text-center">
      {urlCategoryLoading ? "Đang lọc sản phẩm theo danh mục..." : "Đang tải dữ liệu..."}
      </p>
      </div>
    );
  }

  const groupsData = getPaginatedGroups();
  const hasProducts = productsData && Object.keys(groupsData).length > 0;

  return (
    <div className="container-fluid px-0 productlist">
      {/* Header with breadcrumb and filter toggle */}
      <div className="productlist-header pb-3">
        {/* Breadcrumb navigation */}
        {currentBreadcrumb && currentBreadcrumb.length > 1 ? (
          <div className="breadcrumb-container py-2">
            <nav
              aria-label="breadcrumb"
              className="w-full bg-white rounded-lg shadow-sm p-2 border-l-4 border-blue-500"
            >
              <ol className="breadcrumb mb-0 flex items-center flex-wrap">
                {/* Add Home/All Products as first item */}
                <li className="breadcrumb-item flex items-center">
                  <span
                    className="text-sm md:text-base px-2 py-1 rounded text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors duration-200 font-medium"
                    onClick={clearBreadcrumb}
                  >
                    Tất cả sản phẩm
                  </span>
                </li>

                {currentBreadcrumb
                  .filter(
                    (item: string) =>
                      item !== "TẤT CẢ SẢN PHẨM" && item !== "Tất cả sản phẩm"
                  )
                  .map((item: string, index: number) => {
                    // Find original index in the full breadcrumb array
                    const originalIndex = currentBreadcrumb.indexOf(item);

                    // Determine if this is the last item
                    const isLastItem =
                      index ===
                      currentBreadcrumb.filter(
                        (i: string) =>
                          i !== "TẤT CẢ SẢN PHẨM" && i !== "Tất cả sản phẩm"
                      ).length -
                        1;

                    // Get the product group ID for this level if available
                    const levelId = breadcrumbLevelIds[originalIndex] || "";

                    return (
                      <li
                        key={index}
                        className={`breadcrumb-item flex items-center`}
                        data-level-id={levelId}
                      >
                        <span
                          className={`text-sm md:text-base px-2 py-1 rounded ${
                            isLastItem
                              ? "font-semibold text-gray-800 bg-gray-100 px-3"
                              : "text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors duration-200"
                          }`}
                          onClick={
                            isLastItem
                              ? undefined
                              : () => handleBreadcrumbClick(originalIndex)
                          }
                          aria-current={isLastItem ? "page" : undefined}
                        >
                          {item}
                        </span>
                      </li>
                    );
                  })}
              </ol>
            </nav>
          </div>
        ) : null}

        {/* Desktop toggle for Advanced Filter - placed below breadcrumb */}
        <div className="hidden lg:flex justify-start mt-1">
          <Button
            variant="ghost"
            className="h-8 px-2 rounded-full border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1"
            onClick={() => setShowAdvancedFilter((prev) => !prev)}
          >
            <Filter size={14} />
            <span className="text-xs whitespace-nowrap">
              {showAdvancedFilter ? "Ẩn bộ lọc" : "Bộ lọc nâng cao"}
            </span>
          </Button>
        </div>
      </div>

      {/* Main content area with filter and products */}
      <div className="w-full mx-auto px-2 py-2 text-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Advanced Filter Sidebar (Desktop only) */}
          {showAdvancedFilter && (
            <div className="hidden lg:block lg:w-80 flex-shrink-0">
              <div className="bg-white p-3 rounded-lg shadow-sm border sticky top-24">
                <AdvancedFilter
                  filterOptions={filterOptions}
                  selectedFilters={advancedFilters}
                  onFilterChange={handleFilterChange}
                  onPriceChange={handlePriceChange}
                  onClearFilters={handleClearFilters}
                  allProducts={getAllProducts()}
                  filteredProductsCount={getFilteredProductsCount()}
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
                      router.push(`/san-pham/${slug}?search=${encoded}`);
                    } else {
                      // Clear: chỉ xoá query search tại chỗ, không redirect
                      const usp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                      usp.delete('search');
                      router.replace(`${typeof window !== 'undefined' ? window.location.pathname : '/san-pham'}?${usp.toString()}`);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Products List */}
          <div className="flex-1 lg:min-w-0">
            {/* Search Loading Indicator */}
            {isSearching && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                  <div className="text-sm font-medium text-blue-800">
                    Đang tìm kiếm sản phẩm...
                  </div>
                </div>
              </div>
            )}

            {/* No Search Results */}
            {searchTerm && !isSearching && !loading && productsData && 
             Object.keys(productsData.data || {}).length === 0 && (
              <div className="mb-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-yellow-600 mr-2">🔍</div>
                    <div className="text-sm font-medium text-yellow-800">
                      Không tìm thấy sản phẩm nào cho từ khóa &quot;{searchTerm}&quot;
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Clear search and go back to main products page
                      window.location.href = '/san-pham';
                    }}
                    className="flex items-center px-3 py-1 text-sm text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại
                  </button>
                </div>
              </div>
            )}
            {/* Mobile Filter Sheet (controlled by FAB) */}
            <div className="lg:hidden mb-4">
              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetContent
                  side="left"
                  className="w-full max-w-md p-0 flex flex-col"
                >
                  {/* <SheetHeader className="p-4 border-b">
                    <SheetTitle>Bộ lọc nâng cao</SheetTitle>
                  </SheetHeader> */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <AdvancedFilter
                      filterOptions={filterOptions}
                      selectedFilters={advancedFilters}
                      onFilterChange={handleFilterChange}
                      onPriceChange={handlePriceChange}
                      onClearFilters={handleClearFilters}
                      allProducts={getAllProducts()}
                      filteredProductsCount={getFilteredProductsCount()}
                      onSearchProduct={(term: string) => {
                        const usp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                        usp.set('search', term);
                        const newUrl = `${window.location.pathname}?${usp.toString()}`;
                        window.history.replaceState({}, '', newUrl);
                        const evt = new CustomEvent('productQuickSearch', { detail: { term } });
                        window.dispatchEvent(evt);
                      }}
                    />
                  </div>
                  <SheetFooter className="p-4 border-t bg-gray-50">
                    <SheetClose asChild>
                      <Button className="w-full" onClick={() => setMobileFilterOpen(false)}>Xem kết quả</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>

            {/* Mobile Floating Action Button (FAB) */}
            <button
              type="button"
              aria-label={mobileFilterOpen ? "Đóng bộ lọc" : "Mở bộ lọc"}
              onClick={() => setMobileFilterOpen((prev) => !prev)}
              className={`lg:hidden fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg border transition-all duration-200 flex items-center justify-center ${
                mobileFilterOpen
                  ? "bg-blue-600 border-blue-700 text-white"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <span
                className={`transition-transform duration-200 ${
                  mobileFilterOpen ? "rotate-90" : "rotate-0"
                }`}
              >
                <Filter size={20} />
              </span>
            </button>

            {/* Mobile Filter Tags - Always visible regardless of product status */}
            <MobileFilterTags
              filterOptions={filterOptions}
              selectedFilters={advancedFilters}
              onFilterChange={handleFilterChange}
              onPriceChange={handlePriceChange}
              onClearFilters={handleClearFilters}
              filteredProductsCount={getFilteredProductsCount()}
            />
            
            <div className="mt-2">
              {/* Product content area */}
              {(!productsData || Object.keys(groupsData).length === 0) ? (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center mt-4">
                  <p className="text-gray-600">Không tìm thấy sản phẩm nào phù hợp.</p>
                  <p className="text-sm text-gray-500 mt-2">Vui lòng thử lại với bộ lọc khác.</p>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  {Object.entries(getDisplayData()).map(
                    ([groupName, groupData], groupIndex, array) => {
                // Extract the first product to get group info
                const firstProduct = groupData.products[0] || {};
                const productGroupId =
                  firstProduct._crdfd_productgroup_value || "";
                
                // Tìm hình ảnh từ sản phẩm đầu tiên có hình ảnh trong nhóm
                // Ưu tiên cr1bb_imageurl trước, nếu lỗi thì fallback sang cr1bb_imageurlproduct
                let primaryImageUrl = "";
                let fallbackImageUrl = "";
                
                for (const product of groupData.products) {
                  // Ưu tiên cr1bb_imageurl trước
                  if (product.cr1bb_imageurl && product.cr1bb_imageurl.trim().length > 0) {
                    primaryImageUrl = product.cr1bb_imageurl;
                  }
                  // Fallback sang cr1bb_imageurlproduct nếu cr1bb_imageurl không có
                  if (product.cr1bb_imageurlproduct && product.cr1bb_imageurlproduct.trim().length > 0) {
                    fallbackImageUrl = product.cr1bb_imageurlproduct;
                  }
                  
                  // Nếu đã có cả primary và fallback, dừng lại
                  if (primaryImageUrl && fallbackImageUrl) {
                    break;
                  }
                }
                
                return (
                  <div
                    key={groupName}
                    className="bg-white shadow-sm rounded-lg overflow-hidden mb-1"
                  >
                    <div className="p-1 sm:p-4">
                      <div
                        className="flex rounded-lg p-2 items-center cursor-pointer"
                        onClick={(e) => toggleGroupPopup(groupName, e)}
                      >
                        <Suspense
                          fallback={
                            <div className="w-24 h-24 bg-gray-200 rounded-lg" />
                          }
                        >
                          <ProductGroupImageWithFallback
                            productGroupId={productGroupId}
                            imgUrl={primaryImageUrl}
                            fallbackImgUrl={fallbackImageUrl}
                            parentGroup={groupName}
                            size="small"
                            skipApiCall={!primaryImageUrl || primaryImageUrl.trim().length === 0}
                          />
                        </Suspense>
                        <div className="flex flex-col pl-2 w-full">
                          <h2 className="text-sm font-bold text-gray-700 mb-0">
                            {groupName}({groupData.count})
                          </h2>
                          <div className="text-blue-600 font-medium">
                            {(() => {
                              const prices = groupData.products.flatMap((p) =>
                                Array.isArray(p.cr1bb_json_gia)
                                  ? p.cr1bb_json_gia
                                      .map((g) => Number(g.crdfd_gia))
                                      .filter(
                                        (price) => !isNaN(price) && price > 0
                                      )
                                  : []
                              );
                              if (prices.length === 0) return "Liên hệ CSKH";
                              const min = Math.min(...prices);
                              const max = Math.max(...prices);
                              return min !== max
                                ? `${min.toLocaleString()} - ${max.toLocaleString()} VNĐ`
                                : `${min.toLocaleString()} VNĐ`;
                            })()}
                          </div>
                        </div>
                        <span
                          className={`ml-2 transition-transform ${
                            openGroup === groupName ? "rotate-180" : "rotate-0"
                          } flex items-center justify-center`}
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </span>
                      </div>

                      {openGroup === groupName && (
                        <div className="mt-2 p-2 bg-gray-100 rounded shadow-lg">
                          <div className="overflow-x-auto bg-white rounded shadow-sm">
                            {(() => {
                              // Debug logging
                              console.log('=== MODIFIED PRODUCT TABLE RENDER DEBUG ===');
                              console.log('searchTerm being passed:', searchTerm);
                              console.log('groupData.products length:', groupData.products.length);
                              console.log('==========================================');
                              
                              return (
                                <ModifiedProductTable
                                  ID={productGroupId}
                                  products={groupData.products}
                                  initialQuantity={1}
                                  startIndex={groupIndex * groupsPerPage + 1}
                                  totalPages={1}
                                  onPageChange={() => {}}
                                  onAddToCart={(product, quantity) => {
                                    if (onAddToCart) {
                                      onAddToCart(product, quantity);
                                    } else {
                                      console.warn(
                                        "Add to cart function not provided"
                                      );
                                    }
                                  }}
                                  searchTerm="" // Không filter thêm vì đã được filter từ API
                                  showPrices={hasAccess}
                                  isPriceViewer={isPriceViewer}
                                  customerSelectId={customerSelectId}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
                </div>
              )}
            </div>

            {/* Loading indicator at the bottom for infinite scrolling on mobile */}
            {isMobile && currentPage < totalPages && (
              <div ref={loadingRef} className="text-center py-4 my-2">
                {loadingMore ? (
                  <div className="animate-pulse">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mr-2"></div>
                      <span>Đang tải thêm...</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    Kéo xuống để tải thêm
                  </div>
                )}
              </div>
            )}

            {/* Pagination for desktop only */}
            {!isMobile &&
              productsData &&
              productsData.pagination.totalPages > 1 && (
                <div className="sm:mt-4 mt-2 flex justify-center">
                  <Pagination
                    count={productsData.pagination.totalPages}
                    page={productsData.pagination.currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    className="bg-transparent"
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductGroupList;
