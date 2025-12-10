import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";
import { getAccessToken } from "./getAccessToken";
import Products from "../../src/model/Product";
import { CustomerData } from "../../src/model/interface/CustomerData";
import { CustomerGroupData } from "../../src/model/interface/CustomerGroupData";
import { PricingData } from "../../src/model/interface/PricingData";
import { LRUCache } from "lru-cache";
import pLimit from "p-limit";
import http from "http";
import https from "https";

// ======= Constants & Configurations =======
const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const BATCH_SIZE = 100;
const CONCURRENT_REQUESTS = 3;
const limit = pLimit(CONCURRENT_REQUESTS);
const DEFAULT_TIMEOUT = 60000;  // 60 seconds
const MAX_SOCKETS = 50;
const MAX_FREE_SOCKETS = 10;
const KEEP_ALIVE_MS = 50000;  // 30 seconds

// ======= Cache Configuration =======
const CACHE_CONFIG = {
  accessToken: {
    max: 1,
    ttl: 3300000,
    updateAgeOnGet: true,
    ttlAutopurge: true,
    allowStale: true,
  },
  productData: {
    max: 1000,
    ttl: 1800000,
    updateAgeOnGet: true,
    ttlAutopurge: true,
    allowStale: true,
  },
  customerData: {
    max: 5000,
    ttl: 3600000,
    updateAgeOnGet: true,
    ttlAutopurge: true,
    allowStale: true,
  },
  pricingData: {
    max: 1000,
    ttl: 1800000,
    updateAgeOnGet: true,
    ttlAutopurge: true,
    allowStale: true,
  },
} as const;

// Initialize caches
const caches = new Map(
  Object.entries(CACHE_CONFIG).map(([key, config]) => [
    key,
    new LRUCache(config),
  ])
);

// ======= Axios Configuration =======
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    "Prefer": "odata.maxpagesize=500"  // Add pagination support
  },
  timeout: DEFAULT_TIMEOUT,  // Match with agent timeout
  maxRedirects: 5,
  decompress: true,
  // Configure HTTP Agent
  httpAgent: new http.Agent({
    keepAlive: true,
    keepAliveMsecs: KEEP_ALIVE_MS,
    maxSockets: MAX_SOCKETS,
    maxFreeSockets: MAX_FREE_SOCKETS,
    timeout: DEFAULT_TIMEOUT,
    scheduling: 'lifo'  // Last In First Out for better performance
  }),
  // Configure HTTPS Agent
  httpsAgent: new https.Agent({
    keepAlive: true,
    keepAliveMsecs: KEEP_ALIVE_MS,
    maxSockets: MAX_SOCKETS,
    maxFreeSockets: MAX_FREE_SOCKETS,
    timeout: DEFAULT_TIMEOUT,
    scheduling: 'lifo'
  })
});

// ======= Helper Functions =======
const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "OData-MaxVersion": "4.0",
  "OData-Version": "4.0",
});

const fetchWithRetry = async (
  url: string,
  options: any,
  retries = 3,
  baseDelay = 1000
): Promise<any> => {
  const key = `request_${url}_${JSON.stringify(options)}`;
  const cache = caches.get("productData");
  const cachedResponse = cache?.get(key);

  if (cachedResponse) {
    return cachedResponse;
  }

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await api.get(url, options);
      cache?.set(key, response);
      return response;
    } catch (error: any) {
      lastError = error;
      if (error.response?.status === 429) {
        const retryAfter = parseInt(
          error.response.headers["retry-after"] || "5"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      } else {
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelay * Math.pow(2, i))
        );
      }
    }
  }
  throw lastError;
};

const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// ======= Data Fetching Functions =======
const fetchCustomerDataOptimized = async (
  customerId: string,
  token: string
): Promise<CustomerData | null> => {
  const cacheKey = `customer_${customerId}`;
  const cache = caches.get("customerData");
  const cachedData = cache?.get(cacheKey);

  if (cachedData) {
    return cachedData as CustomerData;
  }

  const table = "crdfd_customers";
  const columns =
    "crdfd_customerid,crdfd_name,cr1bb_sptiemnangaconfirm,cr44a_st,crdfd_address,cr44a_emailnguoinhanhoaon,crdfd_mst";
  const filter =
    customerId.length < 12
      ? `statecode eq 0 and cr44a_st eq '${customerId}'`
      : `statecode eq 0 and crdfd_customerid eq '${customerId}'`;
  const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;

  const response = await fetchWithRetry(`${table}?${query}`, {
    headers: getHeaders(token),
  });

  const customerData = response.data.value[0];
  if (!customerData) return null;

  const result = {
    customerId: customerData.crdfd_customerid,
    phone: customerData.cr44a_st || null,
    diachi: customerData.crdfd_address || "",
    email: customerData.cr44a_emailnguoinhanhoaon || "",
    mst:
      customerData.crdfd_mst == 0 || customerData.crdfd_mst == null
        ? ""
        : customerData.crdfd_mst,
    name: customerData.crdfd_name,
    potentialProducts: customerData.cr1bb_sptiemnangaconfirm
      ? customerData.cr1bb_sptiemnangaconfirm
          .split(",")
          .map((item: string) => item.trim())
      : [],
  };

  cache?.set(cacheKey, result);
  return result;
};

const fetchCustomerGroupDataOptimized = async (
  customerId: string,
  token: string
): Promise<CustomerGroupData[]> => {
  const cacheKey = `customerGroup_${customerId}`;
  const cache = caches.get("customerData");
  const cachedData = cache?.get(cacheKey);

  if (cachedData) {
    return cachedData as CustomerGroupData[];
  }

  const table = "cr1bb_groupkhs";
  const columns =
    "_cr1bb_khachhang_value,_cr1bb_nhomkhachhang_value,cr1bb_tenkh,cr1bb_tennhomkh";
  const filter = `_cr1bb_khachhang_value eq '${customerId}' and not contains(cr1bb_tennhomkh, 'nhà máy')`;
  const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;

  const response = await fetchWithRetry(`${table}?${query}`, {
    headers: getHeaders(token),
  });

  const result =
    response.data.value?.map((item: any) => ({
      customerId: item._cr1bb_khachhang_value,
      customerGroupId: item._cr1bb_nhomkhachhang_value,
      customerName: item.cr1bb_tenkh,
      customerGroupName: item.cr1bb_tennhomkh,
    })) || [];

  cache?.set(cacheKey, result);
  return result;
};

const fetchQuoteDetailsDataOptimized = async (
  groupData: CustomerGroupData[],
  filterId: string,
  token: string
): Promise<PricingData[]> => {
  const cacheKey = `quoteDetails_${JSON.stringify(groupData)}_${filterId}`;
  const cache = caches.get("pricingData");
  const cachedData = cache?.get(cacheKey);

  if (cachedData) {
    return cachedData as PricingData[];
  }

  const table = "crdfd_baogiachitiets";
  const columns =
    "_crdfd_nhomoituong_value,crdfd_gia,cr1bb_nhomsanpham,crdfd_nhomoituongtext," +
    "crdfd_sanphamtext,_crdfd_sanpham_value,crdfd_masanpham,crdfd_maonvi,crdfd_onvi," +
    "crdfd_onvichuantext,crdfd_onvichuan,_crdfd_onvi_value,crdfd_giatheovc,cr1bb_tylechuyenoi";

  const customerGroupFilter = groupData
    .map((group) => `_crdfd_nhomoituong_value eq '${group.customerGroupId}'`)
    .join(" or ");

  let filter = `crdfd_pricingdeactive eq 191920001 and crdfd_trangthaihieuluc ne 191920001 and statecode eq 0 and crdfd_gia ne null`;
  if (customerGroupFilter) filter += ` and (${customerGroupFilter})`;
  if (filterId) filter += ` and cr1bb_nhomsanpham eq '${filterId}'`;

  const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;

  const response = await fetchWithRetry(`${table}?${query}`, {
    headers: getHeaders(token),
  });

  const result =
    response.data.value?.map((item: any) => ({
      customerGroupId: item._crdfd_nhomoituong_value,
      crdfd_nhomoituongtext: item.crdfd_nhomoituongtext,
      sanPhamId: item._crdfd_sanpham_value,
      gia: item.crdfd_gia,
      crdfd_maonvi: item.crdfd_maonvi,
      crdfd_onvichuantext: item.crdfd_onvichuantext,
      don_vi_DH: item.crdfd_onvichuan,
      _crdfd_onvi_value: item._crdfd_onvi_value,
      crdfd_giatheovc: item.crdfd_giatheovc,
      cr1bb_tylechuyenoi: item.cr1bb_tylechuyenoi,
    })) || [];

  cache?.set(cacheKey, result);
  return result;
};

const fetchShopDataOptimized = async (
  token: string
): Promise<PricingData[]> => {
  const cacheKey = "shopData";
  const cache = caches.get("pricingData");
  const cachedData = cache?.get(cacheKey);

  if (cachedData) {
    return cachedData as PricingData[];
  }

  const table = "crdfd_baogiachitiets";
  const columns =
    "_crdfd_nhomoituong_value,crdfd_gia,cr1bb_nhomsanpham,crdfd_nhomoituongtext," +
    "crdfd_sanphamtext,_crdfd_sanpham_value,crdfd_masanpham,crdfd_maonvi,crdfd_onvi," +
    "crdfd_onvichuantext,crdfd_onvichuan,_crdfd_onvi_value,crdfd_giatheovc,cr1bb_tylechuyenoi";

  let filter = `crdfd_pricingdeactive eq 191920001 and crdfd_trangthaihieuluc ne 191920001 and statecode eq 0 and (crdfd_gia ne null or crdfd_giatheovc ne null)`;
  const query = `$select=${columns}&$filter=${encodeURIComponent(
    filter
  )}&$count=true`;

  let allRecords: PricingData[] = [];
  let url = `${table}?${query}`;

  while (url) {
    const response = await fetchWithRetry(url, { headers: getHeaders(token) });

    const batchRecords = response.data.value.map((item: any) => ({
      customerGroupId: item._crdfd_nhomoituong_value,
      crdfd_nhomoituongtext: item.crdfd_nhomoituongtext,
      sanPhamId: item._crdfd_sanpham_value,
      gia: item.crdfd_gia,
      crdfd_maonvi: item.crdfd_maonvi,
      crdfd_onvichuantext: item.crdfd_onvichuantext,
      don_vi_DH: item.crdfd_onvichuan,
      _crdfd_onvi_value: item._crdfd_onvi_value,
      crdfd_giatheovc: item.crdfd_giatheovc,
      cr1bb_tylechuyenoi: item.cr1bb_tylechuyenoi,
    }));

    allRecords = allRecords.concat(batchRecords);
    url = response.data["@odata.nextLink"] || null;
  }

  cache?.set(cacheKey, allRecords);
  return allRecords;
};

const fetchPricingDataOptimized = async (
  customerId: string | undefined,
  productGroupValue: string,
  token: string
): Promise<PricingData[]> => {
  if (customerId) {
    const groupData = await fetchCustomerGroupDataOptimized(customerId, token);
    return fetchQuoteDetailsDataOptimized(groupData, productGroupValue, token);
  }
  return fetchShopDataOptimized(token);
};

const updateProductPrices = (
  products: Products[],          // Mảng sản phẩm cần cập nhật giá
  priceMap: Map<string, PricingData[]>,  // Map chứa thông tin giá
  isCustomer: boolean           // Flag xác định có phải khách hàng không
): Products[] => {
  // Sử dụng flatMap để xử lý và làm phẳng kết quả
  return products.flatMap((product) => {
    const productPrices: PricingData[] = [];

    // Tìm tất cả giá liên quan đến sản phẩm trong priceMap
    priceMap.forEach((prices, key) => {
      if (key.startsWith(product.crdfd_productsid.toLowerCase())) {
        productPrices.push(...prices);
      }
    });
    
    // Lọc giá theo loại khách hàng
    const validPrices = isCustomer
      ? productPrices  // Nếu là khách hàng, lấy tất cả giá
      : productPrices.filter((price) => price.crdfd_nhomoituongtext === "Shop"); // Nếu không, chỉ lấy giá Shop

    // Xử lý trường hợp không có giá hợp lệ
    if (validPrices.length === 0) {
      if (!isCustomer) {
        // Trả về sản phẩm với giá trị mặc định cho khách Shop
        return [{
          ...product,
          isPriceUpdated: false,
          don_vi_DH: "",
          crdfd_onvichuantext: "",
          _crdfd_onvi_value: "",
          crdfd_giatheovc: "",
          cr1bb_tylechuyenoi: "",
          crdfd_nhomoituongtext: "Shop",
          customerGroupId: "",
        }];
      }
      return [product]; // Trả về sản phẩm gốc nếu là khách hàng
    }

    // Nhóm giá theo đơn vị
    const pricesByUnit = new Map<string, PricingData[]>();
    validPrices.forEach((price) => {
      const unitKey = price.don_vi_DH || "default";
      if (!pricesByUnit.has(unitKey)) {
        pricesByUnit.set(unitKey, []);
      }
      pricesByUnit.get(unitKey)!.push(price);
    });

    // Tìm giá thấp nhất cho mỗi đơn vị và tạo sản phẩm mới
    return Array.from(pricesByUnit.values()).map((prices) => {
      const lowestPrice = prices.reduce((lowest, current) =>
        current.crdfd_giatheovc < lowest.crdfd_giatheovc ? current : lowest
      );

      // Tạo đối tượng sản phẩm mới với giá đã cập nhật
      return {
        ...product,
        don_vi_DH: lowestPrice.don_vi_DH || product.don_vi_DH || "",
        isPriceUpdated: true,
        // Thêm kiểm tra null cho tất cả các chuyển đổi toString()
        crdfd_onvichuantext: lowestPrice.crdfd_onvichuantext || product.crdfd_onvichuantext || "",
        _crdfd_onvi_value: lowestPrice._crdfd_onvi_value || "",
        crdfd_giatheovc: lowestPrice.crdfd_giatheovc != null ? lowestPrice.crdfd_giatheovc.toString() : "",
        cr1bb_tylechuyenoi: lowestPrice.cr1bb_tylechuyenoi != null ? lowestPrice.cr1bb_tylechuyenoi.toString() : "",
        crdfd_nhomoituongtext: lowestPrice.crdfd_nhomoituongtext || "",
        customerGroupId: lowestPrice.customerGroupId || "",
      } as Products;
    });
  });
};

// ======= Main Handler =======
const getProductData = async (req: NextApiRequest, res: NextApiResponse) => {
  const startTime = performance.now();

  try {
    // Parse and normalize query parameters
    const params = {
      searchTerm: Array.isArray(req.query.searchTerm)
        ? req.query.searchTerm[0]
        : req.query.searchTerm || "",
      searchKey: Array.isArray(req.query.searchKey)
        ? req.query.searchKey[0]
        : req.query.searchKey || "",
      customerId: Array.isArray(req.query.customerId)
        ? req.query.customerId[0]
        : req.query.customerId || "",
      productGroupId: Array.isArray(req.query.product_group_Id)
        ? req.query.product_group_Id[0]
        : req.query.product_group_Id || "",
    };

    const token = await getAccessToken();
    
    const PRODUCT_COLUMNS =
    "crdfd_name,crdfd_productsid,crdfd_fullname,crdfd_masanpham," +
    "_crdfd_productgroup_value,cr1bb_nhomsanphamcha,crdfd_manhomsp,crdfd_thuonghieu," +
    "crdfd_quycach,crdfd_chatlieu,crdfd_hoanthienbemat,crdfd_nhomsanphamtext,crdfd_gtgt,cr1bb_imageurlproduct,cr1bb_imageurl," +
    "_crdfd_productgroup_value,crdfd_nhomsanphamtext,crdfd_unitname,crdfd_onvichuantext,cr1bb_json_gia";
  
    // Build product query
    const table = "crdfd_productses";
    let filter = "statecode eq 0";

    if (params.searchTerm && params.searchKey) {
      filter += ` and contains(${params.searchKey}, '${params.searchTerm}')`;
    }
    if (params.productGroupId) {
      filter += ` and _crdfd_productgroup_value eq '${params.productGroupId}'`;
    }

    const query = `$select=${PRODUCT_COLUMNS}&$filter=${encodeURIComponent(
      filter
    )}&$orderby=crdfd_nhomsanphamtext asc`;

    // Fetch products with timing
    const productsResponse = await fetchWithRetry(`${table}?${query}`, {
      headers: { ...api.defaults.headers, Authorization: `Bearer ${token}` },
    });

    // Transform product data
    const initialProducts = productsResponse.data.value.map((product: any) => ({
      ...product,
      isPriceUpdated: false,
      don_vi_DH: null,
      crdfd_onvichuantext: null,
      crdfd_giatheovc: null,
      cr1bb_tylechuyenoi: null,
      // Format cr1bb_json_gia: parse JSON nếu có, nếu lỗi thì trả về null
      cr1bb_json_gia: (() => {
        if (!product.cr1bb_json_gia) return null;
        try {
          return JSON.parse(product.cr1bb_json_gia);
        } catch (e) {
          return product.cr1bb_json_gia;
        }
      })(),
    }));

    if (!initialProducts.length) {
      return res.status(200).json([]);
    }

    const productGroupValue = initialProducts[0]?.crdfd_nhomsanphamtext;

    // Parallel fetch pricing and customer data
    const [pricingData, customerData] = await Promise.all([
      fetchPricingDataOptimized(params.customerId, productGroupValue, token),
      params.customerId
        ? fetchCustomerDataOptimized(params.customerId, token)
        : null,
    ]);

    // Create price lookup map
    const priceMap = new Map<string, PricingData[]>();
    pricingData.forEach((price) => {
      const key = `${price.sanPhamId.toLowerCase()}_${
        price.don_vi_DH || "default"
      }`;
      if (!priceMap.has(key)) {
        priceMap.set(key, []);
      }
      priceMap.get(key)!.push(price);
    });
    
    // Process products in parallel batches
    const processedProducts = await Promise.all(
      chunk<Products>(initialProducts, BATCH_SIZE).map((batch) =>
        limit(() => updateProductPrices(batch, priceMap, !!params.customerId))
      )
    );
    
    // Final filtering and sorting
    const updatedProducts = processedProducts.flat();
    const filteredProducts = updatedProducts.filter(
      (product) =>
        product.crdfd_giatheovc != null &&
        product.crdfd_giatheovc !== undefined &&
        product.crdfd_giatheovc !== ""
    );

    const sortedProducts = filteredProducts.sort((a, b) =>
      (a.crdfd_nhomsanphamtext?.toLowerCase() || "").localeCompare(
        b.crdfd_nhomsanphamtext?.toLowerCase() || ""
      )
    );

    // Log performance metrics
    const duration = performance.now() - startTime;
    
    return res.status(200).json(sortedProducts);
  } catch (error) {
    console.error("Error in getProductData - line 558:", error);
    handleError(res, error as AxiosError);
  }
};

// ======= Error Handling =======
const handleError = (res: NextApiResponse, error: AxiosError) => {

  if (error.response) {
    return res.status(error.response.status).json({
      error: error.response.data,
      message: "API request failed",
    });
  }

  if (error.request) {
    return res.status(500).json({
      error: "No response received from server",
      message: "Network error",
    });
  }

  return res.status(500).json({
    error: error.message,
    message: "Internal server error",
  });
};

// ======= Memory Management =======
const cleanupCaches = () => {
  caches.forEach((cache) => cache.clear());
};

// Add cleanup on process exit
process.on("beforeExit", cleanupCaches);

export default getProductData;
