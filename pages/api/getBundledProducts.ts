import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";
import { getAccessToken } from "./getAccessToken";
import { LRUCache } from "lru-cache";
import http from "http";
import https from "https";

// ======= Constants & Configurations =======
const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const DEFAULT_TIMEOUT = 60000;  // 60 seconds
const MAX_SOCKETS = 50;
const MAX_FREE_SOCKETS = 10;
const KEEP_ALIVE_MS = 50000;  // 50 seconds

// ======= Cache Configuration =======
const CACHE_CONFIG = {
  bundledProductsCache: {
    max: 1000,
    ttl: 1800000, // 30 minutes
    updateAgeOnGet: true,
    ttlAutopurge: true,
    allowStale: true,
  }
} as const;

// Initialize cache
const cache = new LRUCache(CACHE_CONFIG.bundledProductsCache);

// ======= Axios Configuration =======
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    "Prefer": "odata.maxpagesize"
  },
  timeout: DEFAULT_TIMEOUT,
  maxRedirects: 5,
  decompress: true,
  httpAgent: new http.Agent({
    keepAlive: true,
    keepAliveMsecs: KEEP_ALIVE_MS,
    maxSockets: MAX_SOCKETS,
    maxFreeSockets: MAX_FREE_SOCKETS,
    timeout: DEFAULT_TIMEOUT,
    scheduling: 'lifo'
  }),
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

// Optimized fetchWithRetry for bundled products
const fetchWithRetry = async (
  url: string,
  options: any,
  retries = 3,
  baseDelay = 1000
): Promise<any> => {
  const key = `request_${url}_${JSON.stringify(options)}`;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    return cachedResponse;
  }

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await api.get(url, options);
      cache.set(key, response);
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

// Add JSON parsing helper function
const parseNestedJson = (data: any[]) => {
  return data.map(product => {
    if (product.cr1bb_json_gia && typeof product.cr1bb_json_gia === 'string') {
      try {
        // Parse the nested JSON string
        const parsedJson = JSON.parse(product.cr1bb_json_gia);
        
        // Format each price item with all required fields
        product.cr1bb_json_gia = parsedJson.map((item: any) => ({
          crdfd_productsid: product.crdfd_productsid || null,
          crdfd_nhomsanphamtext: product.crdfd_nhomsanphamtext || null,
          crdfd_manhomsp: product.crdfd_manhomsp || null,
          crdfd_productgroupid: product._crdfd_productgroup_value || null,
          crdfd_unitname: product.crdfd_unitname || null,
          crdfd_cap1: item.crdfd_cap1 || null,
          crdfd_cap1name: item.crdfd_cap1name || null,
          crdfd_cap2: item.crdfd_cap2 || null,
          crdfd_cap2name: item.crdfd_cap2name || null,
          crdfd_cap3: item.crdfd_cap3 || null,
          crdfd_cap3name: item.crdfd_cap3name || null,
          crdfd_cap4: item.crdfd_cap4 || null,
          crdfd_cap4name: item.crdfd_cap4name || null,
          crdfd_cap5: item.crdfd_cap5 || null,
          crdfd_cap5name: item.crdfd_cap5name || null,
          crdfd_cap6: item.crdfd_cap6 || null,
          crdfd_cap6name: item.crdfd_cap6name || null,
          crdfd_cap7: item.crdfd_cap7 || null,
          crdfd_cap7name: item.crdfd_cap7name || null,
          crdfd_baogiachitietid: item.crdfd_baogiachitietid || null,
          crdfd_gia: item.crdfd_gia || 0,
          crdfd_trangthaihieuluc: item.crdfd_trangthaihieuluc || null,
          crdfd_trangthaihieulucname: item.crdfd_trangthaihieulucname || null,
          crdfd_sanpham: item.crdfd_sanpham || product.crdfd_productsid || null,
          crdfd_sanphamname: item.crdfd_sanphamname || product.crdfd_fullname || null,
          crdfd_onvi: item.crdfd_onvi || null,
          crdfd_onviname: item.crdfd_onviname || null,
          crdfd_onvichuan: item.crdfd_onvichuan || null,
          crdfd_pricingdeactive: item.crdfd_pricingdeactive || null,
          crdfd_pricingdeactivename: item.crdfd_pricingdeactivename || null,
          crdfd_onvichuantext: item.crdfd_onvichuantext || null,
          crdfd_sanphamtext: item.crdfd_sanphamtext || product.crdfd_fullname || null,
          cr1bb_nhomsanpham: item.cr1bb_nhomsanpham || product.crdfd_nhomsanphamtext || null,
          crdfd_nhomoituong: item.crdfd_nhomoituong || null,
          crdfd_nhomoituongname: item.crdfd_nhomoituongname || null,
          crdfd_manhomkh: item.crdfd_manhomkh || null,
          cr1bb_tennhomkh: item.cr1bb_tennhomkh || "",
          cr1bb_tylechuyenoi: item.cr1bb_tylechuyenoi || 1,
          crdfd_maonvi: item.crdfd_maonvi || null,
          crdfd_nhomoituongtext: item.crdfd_nhomoituongtext || null,
          crdfd_giatheovc: item.crdfd_giatheovc || item.crdfd_gia || 0,
          crdfd_manhomsanpham: item.crdfd_manhomsanpham || product.crdfd_manhomsp || null,
          cr3b9_loaibopromotionname: item.cr3b9_loaibopromotionname || null,
          cr3b9_nhombaogiachitietname: item.cr3b9_nhombaogiachitietname || null
        }));
      } catch (error) {
        console.error(`Error parsing cr1bb_json_gia for product ${product.crdfd_productsid}:`, error);
      }
    }
    return product;
  });
};

// Add function to fetch promotions directly from Dynamics
const fetchPromotionsFromDynamics = async (productCodes: string[], productGroupCodes: string[], token: string) => {
  try {
    const promotionTable = "crdfd_promotions";
    const promotionColumns = [
      "crdfd_name",
      "crdfd_conditions",
      "crdfd_multiple_manhomsp",
      "crdfd_multiple_tennhomsp",
      "crdfd_masanpham_multiple",
      "crdfd_tensanpham_multiple",
      "crdfd_type",
      "crdfd_customergrouptext",
      "_crdfd_customergroup_value",
      "crdfd_value",
      "crdfd_vn",
      "cr1bb_value2",
      "crdfd_value3", 
      "crdfd_start_date",
      "crdfd_end_date",
      "cr1bb_congdonsoluong",
      "cr1bb_soluongapdung",
      "cr1bb_ieukhoanthanhtoanapdung",
      "_crdfd_promotion_value",
      "crdfd_promotiontypetext",
      "crdfd_soluongapdungmuc3",
      "statuscode",
      "cr3b9_tensanphammuakem",
      "cr1bb_masanphammuakem",
      "cr1bb_manhomsp_multiple",
      "cr1bb_manhomspmuakem"
    ].join(",");

    // Create filters for product codes and group codes
    const productFilters = productCodes.map(code => 
      `contains(crdfd_masanpham_multiple,'${code.trim()}')`
    ).join(' or ');

    const groupFilters = productGroupCodes.map(code => 
      `contains(crdfd_multiple_manhomsp,'${code.trim()}')`
    ).join(' or ');

    // Combine filters
    const filter = [
      'statecode eq 0',
      'crdfd_promotion_deactive eq \'Active\'',
      'crdfd_type ne \'Order\'',
      `(${productFilters} or ${groupFilters})`
    ].join(' and ');

    const query = `$select=${promotionColumns}&$filter=${encodeURIComponent(filter)}`;
    const response = await api.get(`${promotionTable}?${query}`, {
      headers: getHeaders(token)
    });

    return response.data.value.map((promo: any) => ({
      name: promo.crdfd_name,
      conditions: promo.crdfd_conditions,
      productGroupCodes: promo.cr1bb_manhomsp_multiple,
      productGroupNames: promo.crdfd_multiple_tennhomsp,
      productCodes: promo.crdfd_masanpham_multiple,
      productNames: promo.crdfd_tensanpham_multiple,
      type: promo.crdfd_type,
      customerGroupText: promo.crdfd_customergrouptext,
      value: promo.crdfd_value,
      vn: promo.crdfd_vn,
      value2: promo.cr1bb_value2,
      value3: promo.crdfd_value3,
      congdonsoluong: promo.cr1bb_congdonsoluong,
      soluongapdung: promo.cr1bb_soluongapdung,
      startDate: promo.crdfd_start_date,
      endDate: promo.crdfd_end_date,
      status: promo.statuscode,
      promotionType: promo.crdfd_promotiontypetext,
      promotionId: promo._crdfd_promotion_value,
      ieuKhoanThanhToanApDung: promo.cr1bb_ieukhoanthanhtoanapdung,
      soluongapdungmuc3: promo.crdfd_soluongapdungmuc3,
      tenSanPhamMuaKem: promo.cr3b9_tensanphammuakem,
      maSanPhamMuaKem: promo.cr1bb_masanphammuakem,
      maNhomSPMultiple: promo.cr1bb_manhomsp_multiple,
      maNhomSPMuaKem: promo.cr1bb_manhomspmuakem
    }));
  } catch (error) {
    console.error('Error fetching promotions from Dynamics:', error);
    return [];
  }
};

// ======= Main Handler =======
const getBundledProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  const startTime = performance.now();

  try {
    let productCodes: string[] = [];
    let type = "product";

    if (req.method === "POST") {
      productCodes = Array.isArray(req.body.productCodes)
        ? req.body.productCodes
        : [];
      type = req.body.type === "group" ? "group" : "product";
    } else {
      // fallback GET cũ (giữ lại nếu muốn backward compatible)
      const codeParam = req.query.code || req.query.productCode || "";
      const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;
      type = req.query.type === "group" ? "group" : "product";
      if (code) {
        productCodes = code.split(',').map((c: string) => c.trim()).filter((c: string) => c);
      }
    }

    if (!productCodes.length) {
      return res.status(400).json({
        error: "productCodes is required",
        message: "Please provide productCodes",
      });
    }

    const PRODUCT_COLUMNS = "crdfd_name,crdfd_productsid,crdfd_fullname,crdfd_masanpham," +
      "_crdfd_productgroup_value,cr1bb_nhomsanphamcha,crdfd_manhomsp,crdfd_thuonghieu," +
      "crdfd_quycach,crdfd_chatlieu,crdfd_hoanthienbemat,crdfd_nhomsanphamtext,crdfd_gtgt,cr1bb_imageurlproduct,cr1bb_imageurl," +
      "_crdfd_productgroup_value,crdfd_nhomsanphamtext,crdfd_unitname,crdfd_onvichuantext,cr1bb_json_gia";
  
    let filter = "";
    if (type === "group") {
      filter = `statecode eq 0 and (${productCodes.map((c: string) => `crdfd_manhomsp eq '${c}'`).join(' or ')})`;
    } else {
      filter = `statecode eq 0 and (${productCodes.map((c: string) => `crdfd_masanpham eq '${c}'`).join(' or ')})`;
    }
    const query = `$select=${PRODUCT_COLUMNS}&$filter=${encodeURIComponent(filter)}`;

    const token = await getAccessToken();
    const table = "crdfd_productses";
    const productsResponse = await fetchWithRetry(`${table}?${query}`, {
      headers: getHeaders(token)
    });

    // Parse the response
    const products = parseNestedJson(productsResponse.data.value);

    // Extract product codes and group codes for promotion fetching
    const productGroupCodes = products.map((p: any) => p.crdfd_manhomsp).filter(Boolean);

    // Fetch promotions directly from Dynamics
    const promotions = await fetchPromotionsFromDynamics(productCodes, productGroupCodes, token);

    // Add promotions to each product
    const productsWithPromotions = products.map((product: any) => {
      const productPromotions = promotions.filter((promo: any) => {
        // Skip promotions if cr3b9_loaibopromotionname is "yes"
        if (product.cr1bb_json_gia && Array.isArray(product.cr1bb_json_gia) && product.cr1bb_json_gia.length > 0) {
          const hasNoPromotion = product.cr1bb_json_gia.some((item: any) => 
            item.cr3b9_loaibopromotionname === "yes"
          );
          if (hasNoPromotion) return false;
        }

        const promoProductCodes = promo.productCodes?.split(',').map((code: string) => code.trim()) || [];
        const promoGroupCodes = promo.productGroupCodes?.split(',').map((code: string) => code.trim()) || [];
        return promoProductCodes.includes(product.crdfd_masanpham) || 
               promoGroupCodes.includes(product.crdfd_manhomsp);
      });

      // Create a new object with cr1bb_json_gia and promotions next to each other
      const { cr1bb_json_gia, ...restProduct } = product;
      return {
        ...restProduct,
        cr1bb_json_gia,
        promotions: productPromotions
      };
    });

    // Log performance metrics
    const duration = performance.now() - startTime;

    // Always return fresh data (disable cache)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).json(productsWithPromotions);
  } catch (error) {
    console.error("Error in getBundledProducts:", error);
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
const cleanupCache = () => {
  cache.clear();
};

// Add cleanup on process exit
process.on("beforeExit", cleanupCache);

export default getBundledProducts;