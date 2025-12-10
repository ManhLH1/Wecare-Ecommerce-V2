import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";
import { LRUCache } from "lru-cache";
import pino from "pino";

// Khởi tạo logger
const logger = pino();

// Cấu hình cache
const CACHE_CONFIG = {
  accessToken: { max: 1, ttl: 3300000 }, // 55 phút
  customerData: { max: 100, ttl: 1800000 },
  productDetails: { max: 1000, ttl: 1800000 },
  priceDetails: { max: 1000, ttl: 1800000 },
};

// Khởi tạo cache
const caches: Record<string, LRUCache<string, any>> = Object.entries(
  CACHE_CONFIG
).reduce((acc, [key, config]) => {
  acc[key] = new LRUCache({ max: config.max, ttl: config.ttl });
  return acc;
}, {} as Record<string, LRUCache<string, any>>);

// Cấu hình timeout
const TIMEOUT_CONFIG = {
  default: 15000,
  fetchData: 20000,
  cache: 15000,
  token: 10000
};

// Memory monitoring
const MAX_MEMORY_USAGE = 1024; // MB
function checkMemoryUsage() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  if (used > MAX_MEMORY_USAGE) {
    Object.values(caches).forEach((cache) => cache.clear());
  }
}

// Helper functions
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
};

const getCachedData = async <T>(
  cacheKey: string,
  cacheName: string,
  fetchFn: () => Promise<T>,
  retries = 2
): Promise<T> => {
  checkMemoryUsage();
  const cache = caches[cacheName];
  if (!cache) throw new Error(`Cache ${cacheName} not found`);

  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData as T;

  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const data = await withTimeout(fetchFn(), TIMEOUT_CONFIG.cache);
      if (data) {
        cache.set(cacheKey, data);
      }
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        caches['accessToken'].delete('accessToken');
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      lastError = error;
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
      }
    }
  }
  throw lastError;
};

interface ProductInfo {
  productId: string;
  productName: string;
  productCode: string;
  productGroup: string;
  productGroupCode: string;
  productGroupId: string;
  _crdfd_productgroup_value: string;
  brand: string;
  specification: string;
  material: string;
  surfaceFinish: string;
  imageUrl: string;
  gia: number;
  giatheovc: number;
  onvi_value: string;
  onvichuantext: string;
  maonvi: string;
  tylechuyenoi: number;
  nhomoituongtext: string;
  don_vi_DH: string;
  _crdfd_onvi_value: string;
  crdfd_gtgt: number;
}

interface CustomerInfo {
  customerId: string;
  customerName: string;
  customerCode: string;
  customerGroup: string;
}

interface PriceInfo {
  gia: number;
  giatheovc: number;
  onvi_value: string;
  onvichuantext: string;
  maonvi: string;
  tylechuyenoi: number;
  nhomoituongtext: string;
  don_vi_DH: string;
  _crdfd_onvi_value: string;
}

const getPriceDetails = async (productId: string, customerGroupCode: string, headers: any) => {
  const cacheKey = `price_${productId}_${customerGroupCode}`;
  
  const buildPriceQuery = () => {
    const priceSelect = [
      "_crdfd_nhomoituong_value",
      "crdfd_gia",
      "cr1bb_nhomsanpham",
      "crdfd_nhomoituongtext",
      "crdfd_sanphamtext",
      "_crdfd_sanpham_value",
      "crdfd_masanpham",
      "crdfd_maonvi",
      "crdfd_onvi",
      "crdfd_onvichuantext",
      "crdfd_onvichuan",
      "_crdfd_onvi_value",
      "crdfd_giatheovc",
      "cr1bb_tylechuyenoi"
    ].join(",");

    const filter = [
      `crdfd_pricingdeactive eq 191920001`,
      `crdfd_trangthaihieuluc ne 191920001`,
      `statecode eq 0`,
      `crdfd_gia ne null`,
      `_crdfd_sanpham_value eq '${productId}'`,
      `crdfd_nhomoituongtext eq '${customerGroupCode}'`
    ].join(' and ');

    return `$select=${priceSelect}&$filter=${encodeURIComponent(filter)}&$orderby=crdfd_giatheovc asc&$top=1`;
  };

  return getCachedData(
    cacheKey,
    'priceDetails',
    async () => {
      const query = buildPriceQuery();
      const priceEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/crdfd_baogiachitiets?${query}`;
      const response = await axios.get(priceEndpoint, { headers });
      return response.data.value[0] || null;
    }
  );
};

const fetchProductChunk = async (chunkFilter: string, headers: any, productColumns: string) => {
  const productsEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/crdfd_productses?$select=${productColumns}&$filter=${encodeURIComponent(chunkFilter)}`;
  const response = await axios.get(productsEndpoint, { headers });
  return response.data.value;
};

const getPurchasedProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { customerId, searchTerm } = req.query;

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // 1. Lấy thông tin khách hàng
    const customerTable = "crdfd_customers";
    const customerColumns = "crdfd_customerid,crdfd_name,cr44a_makhachhang";
    const customerFilter = `crdfd_customerid eq '${customerId}'`;
    const customerEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${customerTable}?$select=${customerColumns}&$filter=${encodeURIComponent(customerFilter)}`;

    const customerResponse = await axios.get(customerEndpoint, { headers });
    if (!customerResponse.data.value?.[0]) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // 2. Lấy thông tin nhóm đối tượng từ bảng cr1bb_groupkhs
    const customerGroupTable = "cr1bb_groupkhs";
    const customerGroupColumns = "cr1bb_groupkhid,cr1bb_name";
    const customerGroupFilter = `_cr1bb_khachhang_value eq '${customerId}'`;
    const customerGroupEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${customerGroupTable}?$select=${customerGroupColumns}&$filter=${encodeURIComponent(customerGroupFilter)}`;

    const customerGroupResponse = await axios.get(customerGroupEndpoint, { headers });
    const customerGroupCode = customerGroupResponse.data.value?.[0]?.cr1bb_manhom || 'Shop';

    const customerInfo: CustomerInfo = {
      customerId: customerResponse.data.value[0].crdfd_customerid,
      customerName: customerResponse.data.value[0].crdfd_name,
      customerCode: customerResponse.data.value[0].cr44a_makhachhang,
      customerGroup: customerGroupCode
    };

    // 2. Lấy danh sách sản phẩm đã mua từ bảng sale order details
    const sodTable = "crdfd_saleorderdetails";
    const sodColumns = "_crdfd_sanpham_value,crdfd_tensanphamtext,crdfd_nhomsanpham,crdfd_manhomsp";
    const sodFilter = `cr1bb_makhachhang eq '${customerInfo.customerCode}'  and statecode eq 0`;

    const sodEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${sodTable}?$select=${sodColumns}&$filter=${encodeURIComponent(sodFilter)}`;
    const sodResponse = await axios.get(sodEndpoint, { headers });

    // Get unique product IDs
    const productIds = sodResponse.data.value
      ? sodResponse.data.value
          .map((item: any) => item._crdfd_sanpham_value)
          .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)
      : [];

    if (productIds.length === 0) {
      return res.status(200).json({ 
        customer: customerInfo,
        products: [],
        total: 0
      });
    }

    // 3. Lấy thông tin sản phẩm từ bảng products
    const productsTable = "crdfd_productses";
    const productColumns = [
      "crdfd_productsid",
      "crdfd_name",
      "crdfd_masanpham",
      "crdfd_nhomsanphamtext",
      "crdfd_manhomsp",
      "crdfd_thuonghieu",
      "crdfd_quycach",
      "crdfd_chatlieu",
      "crdfd_hoanthienbemat",
      "_crdfd_productgroup_value",
      "cr1bb_imageurl",
      "crdfd_gtgt"
    ].join(",");

    // Break down large product ID filters into smaller chunks
    const CHUNK_SIZE = 10;
    const productChunks = [];
    for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
      const chunk = productIds.slice(i, i + CHUNK_SIZE);
      const chunkFilter = chunk.map((id: string) => `crdfd_productsid eq '${id}'`).join(" or ");
      productChunks.push(chunkFilter);
    }

    // Fetch products in chunks with concurrent requests
    const productPromises = productChunks.map(chunkFilter => 
      fetchProductChunk(chunkFilter, headers, productColumns)
    );
    const productResults = await Promise.all(productPromises);
    const allProducts = productResults.flat();

    // Fetch prices concurrently
    const pricePromises = productIds.map((productId: string) => 
      getPriceDetails(productId, customerInfo.customerGroup, headers)
        .then(priceDetails => ({ productId, priceDetails }))
        .catch(error => {
          logger.error(`Error fetching price for product ${productId}:`, error);
          return { productId, priceDetails: null };
        })
    );
    
    const priceResults = await Promise.all(pricePromises);
    const priceMap = new Map(
      priceResults
        .filter(result => result.priceDetails)
        .map(({ productId, priceDetails }) => [
          productId,
          {
            gia: priceDetails.crdfd_gia,
            giatheovc: priceDetails.crdfd_giatheovc,
            onvi_value: priceDetails._crdfd_onvi_value,
            onvichuantext: priceDetails.crdfd_onvichuantext,
            maonvi: priceDetails.crdfd_maonvi,
            tylechuyenoi: priceDetails.cr1bb_tylechuyenoi,
            nhomoituongtext: priceDetails.crdfd_nhomoituongtext,
            don_vi_DH: priceDetails.crdfd_onvichuan
          }
        ])
    );

    // 5. Combine product and price information
    const products: ProductInfo[] = allProducts.map((product: any) => {
      const priceInfo = (priceMap.get(product.crdfd_productsid) || {}) as PriceInfo;
      return {
        productId: product.crdfd_productsid,
        productName: product.crdfd_name || "",
        productCode: product.crdfd_masanpham || "",
        productGroup: product.crdfd_nhomsanphamtext || "",
        productGroupCode: product.crdfd_manhomsp || "",
        productGroupId: product._crdfd_productgroup_value || "",
        _crdfd_productgroup_value: product._crdfd_productgroup_value || "",
        brand: product.crdfd_thuonghieu || "",
        specification: product.crdfd_quycach || "",
        material: product.crdfd_chatlieu || "",
        surfaceFinish: product.crdfd_hoanthienbemat || "",
        imageUrl: product.cr1bb_imageurl || "",
        gia: priceInfo.gia || 0, 
        giatheovc: priceInfo.giatheovc || 0, 
        onvi_value: priceInfo.onvi_value || "",
        onvichuantext: priceInfo.onvichuantext || "",
        maonvi: priceInfo.maonvi || "",
        tylechuyenoi: priceInfo.tylechuyenoi || 0,
        nhomoituongtext: priceInfo.nhomoituongtext || "",
        don_vi_DH: priceInfo.don_vi_DH || "",
        _crdfd_onvi_value: priceInfo._crdfd_onvi_value || "",
        crdfd_gtgt: product.crdfd_gtgt || 0
      };
    });

    return res.status(200).json({
      customer: customerInfo,
      products,
      total: products.length,
      filtered: !!searchTerm
    });

  } catch (error) {
    console.error("Error fetching products - getPurchasedProducts - line 344:", error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      return res.status(status).json({
        error: "Error fetching products",
        details: error.response?.data
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export default getPurchasedProducts; 