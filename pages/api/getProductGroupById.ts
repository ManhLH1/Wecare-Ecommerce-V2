import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";
import { getAccessToken } from "./getAccessToken";
import productGroup from "../../src/model/productGroup";
import { CustomerProductData } from "../../src/model/interface/CustomerProductData";
import { CacheOptions } from "../../src/model/interface/CacheOptions";
import { LRUCache } from "lru-cache";
import pino from "pino";

// Khởi tạo logger để ghi log chi tiết
const logger = pino();

// Cấu hình bộ nhớ đệm với thời gian sống (TTL) và kích thước tối đa
const CACHE_CONFIG: Record<string, CacheOptions> = {
  accessToken: { max: 1, ttl: 3300000 }, // 55 phút, giảm thời gian để tránh sử dụng token hết hạn
  productGroupData: { max: 100, ttl: 300000 }, // 5 phút
  customerData: { max: 1000, ttl: 3600000 }, // 1 giờ
};

// Khởi tạo các bộ nhớ đệm dựa trên cấu hình
const caches: Record<string, LRUCache<string, any>> = Object.entries(
  CACHE_CONFIG
).reduce((acc, [key, config]) => {
  acc[key] = new LRUCache({ max: config.max, ttl: config.ttl });
  return acc;
}, {} as Record<string, LRUCache<string, any>>);

// Thêm Rate Limiting
const rateLimit = {
  windowMs: 1 * 60 * 1000, // 15 phút
  max: 1000, // giới hạn 100 request mỗi IP trong 15 phút
};

// Thêm memory monitoring
const MAX_MEMORY_USAGE = 1048; // MB
function checkMemoryUsage() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  if (used > MAX_MEMORY_USAGE) {
    Object.values(caches).forEach((cache) => cache.clear());
  }
}

// Wrap các promise với timeout
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
};

// Add token validation helper
const isTokenValid = (token: string): boolean => {
  try {
    // Add basic token validation (you might want to add more checks)
    return token.length > 0 && token !== 'undefined' && token !== 'null';
  } catch (error) {
    return false;
  }
};

// Update the getCachedData function for token handling
const getCachedData = async <T>(
  cacheKey: string,
  cacheName: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  checkMemoryUsage();
  const cache = caches[cacheName];
  if (!cache) throw new Error(`Cache ${cacheName} not found`);

  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData as T;

  try {
    const data = await withTimeout(fetchFn(), 5000);
    if (data) {
      cache.set(cacheKey, data);
    }
    return data;
  } catch (error) {
    // If token related error, clear token cache
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      caches['accessToken'].delete('accessToken');
      throw new Error('Authentication failed. Token expired or invalid.');
    }
    throw error;
  }
};

// Triển khai Circuit Breaker để xử lý lỗi từ các API bên ngoài
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private readonly threshold = 5;
  private readonly resetTimeout = 30000; // 30 giây

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      try {
        // Attempt to refresh the token
        const newToken = await getCachedData<string>(
          "accessToken",
          "accessToken",
          getAccessToken
        );

        // Validate the new token
        if (!isTokenValid(newToken)) {
          throw new Error('Failed to obtain valid authentication token');
        }

        // Retry the operation with the new token
        return await fn();
      } catch (error) {
        throw new Error("Circuit is open and token refresh failed");
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      const timeSinceLastFailure = this.lastFailureTime
        ? Date.now() - this.lastFailureTime
        : 0;
      if (timeSinceLastFailure < this.resetTimeout) {
        return true;
      }
      this.reset();
    }
    return false;
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  private reset(): void {
    this.failures = 0;
    this.lastFailureTime = null;
  }
}

const circuitBreaker = new CircuitBreaker();

const API_CONFIG = {
  baseUrl: "https://wecare-ii.crm5.dynamics.com/api/data/v9.2",
};

// Cấu hình timeout cho các loại request
const TIMEOUT_CONFIG = {
  default: 15000,      // 15s cho request thông thường
  fetchData: {
    single: 15000,     // 15s cho fetch một sản phẩm
    list: 20000,       // 20s cho fetch danh sách
    customer: 15000    // 15s cho customer data
  },
  cache: 15000,        // 15s cho cache operations
  token: 10000         // 10s cho token refresh
};

// Hàm chính để xử lý yêu cầu API
const getProductGroupById = async (req: NextApiRequest, res: NextApiResponse) => {
  const table = "crdfd_productgroups";
  const columns =
    "crdfd_productgroupid,_crdfd_nhomsanphamcha_value,crdfd_nhomsanphamchatext,crdfd_productname,cr1bb_giamin,cr1bb_giamax,crdfd_image_url,cr1bb_so_san_pham_co_gia,crdfd_cap1text,crdfd_cap2text,cr1bb_cap3text,cr1bb_cap4text, crdfd_chatlieu,crdfd_quycach,crdfd_thuonghieu,crdfd_hoanthienbemat,cr1bb_phanloai,crdfd_manhomsp";

  try {
    // Get fresh token
    let token = await getCachedData<string>(
      "accessToken",
      "accessToken",
      getAccessToken
    );

    // Validate token
    if (!isTokenValid(token)) {
      // Clear token cache and get new token
      caches['accessToken'].delete('accessToken');
      token = await getCachedData<string>(
        "accessToken",
        "accessToken",
        getAccessToken
      );
      
      if (!isTokenValid(token)) {
        throw new Error('Failed to obtain valid authentication token');
      }
    }

    const productGroupId = req.query.crdfd_productgroupid as string | undefined;
    const customerId = req.query.customerId as string | undefined;
    const cacheKey = `${productGroupId || "all_product_groups"}_${
      customerId || "no_customer"
    }`;

    // Lấy dữ liệu nhóm sản phẩm từ cache hoặc fetch mới
    const productGroupResult = await getCachedData(
      cacheKey,
      "productGroupData",
      async () => {
        let result: productGroup | productGroup[] | null;
        if (productGroupId) {
          // Sử dụng Circuit Breaker để fetch dữ liệu một nhóm sản phẩm
          result = await circuitBreaker.execute(() =>
            fetchSingleProductGroup(table, columns, token, productGroupId)
          );
        } else {
          // Sử dụng Circuit Breaker để fetch dữ liệu tất cả nhóm sản phẩm
          result = await circuitBreaker.execute(() =>
            fetchAllProductGroups(table, columns, token)
          );
        }

        // Nếu có customerId, lọc kết quả dựa trên dữ liệu khách hàng
        if (customerId && result) {
          const customerData = await circuitBreaker.execute(() =>
            fetchCustomerData(customerId, token)
          );
        }

        return result;
      }
    );

    if (productGroupResult) {
      res.status(200).json(productGroupResult);
    } else {
      res.status(404).json({ error: "Product group not found" });
    }
  } catch (error) {
    // Ghi log chi tiết về lỗi
    logger.error("Error in getProductGroupById:", {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      query: req.query, // Add query params to log
      timestamp: new Date().toISOString(),
    });

    if (error instanceof Error && error.message.includes('Authentication failed')) {
      // Clear token cache and attempt to get a new token
      caches['accessToken'].delete('accessToken');
      try {
        const newToken = await getCachedData<string>(
          "accessToken",
          "accessToken",
          getAccessToken
        );
        if (isTokenValid(newToken)) {
          // Retry the request with the new token
          const productGroupId = req.query.crdfd_productgroupid as string | undefined;
          const customerId = req.query.customerId as string | undefined;
          const cacheKey = `${productGroupId || "all_product_groups"}_${customerId || "no_customer"}`;
          
          // Clear the product group cache for this key
          caches['productGroupData'].delete(cacheKey);
          
          // Retry the request
          const result = await getCachedData(cacheKey, "productGroupData", async () => {
            if (productGroupId) {
              return await fetchSingleProductGroup(table, columns, newToken, productGroupId);
            } else {
              return await fetchAllProductGroups(table, columns, newToken);
            }
          });
          
          return res.status(200).json(result);
        }
      } catch (retryError) {
        logger.error("Failed to refresh token and retry request:", retryError);
      }
      return res.status(401).json({ error: 'Authentication failed. Please try again.' });
    }

    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
};

// Update fetchData function to handle 401 errors specifically
async function fetchData(
  endpoint: string,
  token: string
): Promise<productGroup | productGroup[]> {
  try {
    if (!isTokenValid(token)) {
      throw new Error('Invalid token provided to fetchData');
    }

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      timeout: TIMEOUT_CONFIG.default,
    });

    return Array.isArray(response.data.value)
      ? response.data.value
      : response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Error fetching data:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        endpoint
      });
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
    }
    throw error;
  }
}

// Hàm fetch tất cả nhóm sản phẩm với xử l phân trang
async function fetchAllProductGroups(
  table: string,
  columns: string,
  token: string
): Promise<productGroup[]> {
  const filter = "statecode eq 0 and cr1bb_so_san_pham_co_gia gt 0";
  const query = `$select=${columns}&$filter=${encodeURIComponent(
    filter
  )}&$orderby=crdfd_productname`;
  const endpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`;

  let allResults: productGroup[] = [];
  let apiEndpoint = endpoint;
  let pageCount = 0;
  const maxPages = 10; // Giới hạn số trang để tránh vòng lặp vô hạn

  while (apiEndpoint && pageCount < maxPages) {
    const results = (await fetchData(apiEndpoint, token)) as productGroup[];
    allResults = allResults.concat(results);
    apiEndpoint = (results as any)["@odata.nextLink"];
    pageCount++;
  }

  return allResults;
}

// Hàm fetch một nhóm sản phẩm cụ thể
async function fetchSingleProductGroup(
  table: string,
  columns: string,
  token: string,
  productGroupId: string,
  customerId?: string
): Promise<productGroup | null> {
  const endpoint = `${API_CONFIG.baseUrl}/${table}(${productGroupId})?$select=${columns}`;

  try {
    logger.info(`Fetching product group from: ${endpoint}`);
    const productGroup = (await fetchData(endpoint, token)) as productGroup;

    // Sửa lại phần logging để hiển thị đầy đủ thông tin
    logger.info("Product group data:", productGroup);

    if (productGroup.crdfd_image_url) {
      productGroup.crdfd_image_url = productGroup.crdfd_image_url.startsWith(
        "http"
      )
        ? productGroup.crdfd_image_url
        : `${API_CONFIG.baseUrl}/${productGroup.crdfd_image_url}`;
    }

    return productGroup;
  } catch (error) {
    logger.error("Error in fetchSingleProductGroup:", {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
      endpoint,
      productGroupId,
    });
    throw error;
  }
}

// Hàm fetch dữ liệu khách hàng với caching
async function fetchCustomerData(
  customerId: string,
  token: string
): Promise<CustomerProductData | null> {
  return getCachedData(
    `customerData_${customerId}`,
    "customerData",
    async () => {
      const table = "crdfd_customers";
      const columns = "crdfd_customerid,cr1bb_sptiemnangaconfirm";
      const filter =
        customerId.length < 12
          ? `statecode eq 0 and cr44a_st eq '${customerId}'`
          : `statecode eq 0 and crdfd_customerid eq '${customerId}'`;

      const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;
      const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`;

      try {
        const response = await axios.get(apiEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
          },
          timeout: TIMEOUT_CONFIG.fetchData.customer,
        });

        if (response.data.value && response.data.value.length > 0) {
          const customerData = response.data.value[0];
          return {
            customerId: customerData.crdfd_customerid,
            potentialProducts: customerData.cr1bb_sptiemnangaconfirm
              ? customerData.cr1bb_sptiemnangaconfirm
                  .split(",")
                  .map((item: string) => item.trim())
              : [],
          };
        }
      } catch (error) {
        logger.error("Error fetching customer data:", error);
      }

      return null;
    }
  );
}

export default getProductGroupById;