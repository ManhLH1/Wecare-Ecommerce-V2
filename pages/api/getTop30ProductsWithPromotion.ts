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
  topProductsData: { max: 100, ttl: 1800000 }, // 30 phút
  promotionData: { max: 500, ttl: 1800000 }, // 30 phút
  productDetails: { max: 500, ttl: 1800000 }, // 30 phút
  priceDetails: { max: 500, ttl: 1800000 }, // 30 phút
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
  default: 25000,
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

// Circuit Breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private readonly threshold = 5;
  private readonly resetTimeout = 30000;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error("Circuit is open");
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

// Helper functions
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
};

const isTokenValid = (token: string): boolean => {
  return token.length > 0 && token !== 'undefined' && token !== 'null';
};

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
    throw error;
  }
};

// Tối ưu hóa việc lấy thông tin chi tiết sản phẩm
const getProductDetails = async (productId: string, headers: any) => {
  const cacheKey = `product_${productId}`;
  return getCachedData(
    cacheKey,
    'productDetails',
    async () => {
      const productTable = "crdfd_productses";
      const productSelect = [
        "cr1bb_imageurl",
        "crdfd_thuonghieu",
        "crdfd_quycach",
        "crdfd_hoanthienbemat",
        "crdfd_masanpham",
        "_crdfd_productgroup_value",
        "cr1bb_imageurlproduct",
        "crdfd_gtgt"
      ].join(",");
      const productFilter = `statecode eq 0 and crdfd_productsid eq '${productId}'`;
      const productQuery = `$select=${productSelect}&$filter=${encodeURIComponent(productFilter)}`;
      const productEndpoint = `${baseUrl}/${productTable}?${productQuery}`;
      
      const response = await axios.get(productEndpoint, { headers });
      return response.data.value[0] || {};
    }
  );
};

// Tối ưu hóa việc lấy thông tin giá
const getPriceDetails = async (productId: string, headers: any) => {
  const cacheKey = `price_${productId}`;
  return getCachedData(
    cacheKey,
    'priceDetails',
    async () => {
      const priceTable = "crdfd_baogiachitiets";
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
        `crdfd_nhomoituongtext eq 'Shop'`
      ].join(' and ');

      const query = `$select=${priceSelect}&$filter=${encodeURIComponent(filter)}&$orderby=crdfd_giatheovc asc&$top=1`;
      const priceEndpoint = `${baseUrl}/${priceTable}?${query}`;
      
      const response = await axios.get(priceEndpoint, { headers });
      return response.data.value[0] || {};
    }
  );
};

const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2";

// Main API handler
const getTop30ProductsWithPromotion = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { customerId } = req.query;

    // Get cached token or fetch new one
    let token = await getCachedData<string>(
      "accessToken",
      "accessToken",
      getAccessToken
    );  

    if (!isTokenValid(token)) {
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

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Use circuit breaker for data fetching
    const top30Products = await circuitBreaker.execute(async () => {
      return await getCachedData(
        "top30Products",
        "topProductsData",
        async () => {
          const table = "crdfd_saleorderdetails";
          
          // Tính thời gian 2 tuần trước
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          const formattedDate = twoWeeksAgo.toISOString();

          const select = "$select=crdfd_tensanphamtext,_crdfd_sanpham_value";
          const filter = `$filter=statecode eq 0 and createdon ge ${formattedDate} and crdfd_giagoc ne null and crdfd_gia gt 0`;
          
          const query = `${select}&${filter}`;
          const initialEndpoint = `${baseUrl}/${table}?${query}`;
          let apiEndpoint = initialEndpoint;
          let allResults: { crdfd_tensanphamtext: string; _crdfd_sanpham_value: string }[] = [];

          while (apiEndpoint) {
            const response = await axios.get(apiEndpoint, { headers });

            if (Array.isArray(response.data.value) && response.data.value.length > 0) {
              allResults = allResults.concat(response.data.value);
              apiEndpoint = response.data["@odata.nextLink"];
            } else {
              break;
            }
          }

          // Xử lý thống kê
          const productStats = allResults.reduce((acc, curr) => {
            const { crdfd_tensanphamtext, _crdfd_sanpham_value } = curr;
            if (!acc[crdfd_tensanphamtext]) {
              acc[crdfd_tensanphamtext] = {
                count: 0,
                productId: _crdfd_sanpham_value
              };
            }
            acc[crdfd_tensanphamtext].count += 1;
            return acc;
          }, {} as Record<string, { count: number; productId: string }>);

          // Chuyển đổi thành mảng và sắp xếp
          return Object.entries(productStats)
            .map(([name, data]) => ({
              crdfd_tensanphamtext: name,
              total: data.count,
              productId: data.productId
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 30);
        }
      );
    });

    // Lấy tất cả thông tin khuyến mãi
    const promotionData = await circuitBreaker.execute(async () => {
      return await getCachedData(
        `promotions_all`,
        "promotionData",
        async () => {
          const promotionTable = "crdfd_promotions";
          const promotionColumns = [
            "crdfd_name",
            "crdfd_conditions",
            "crdfd_tensanpham_multiple",
            "crdfd_type",
            "crdfd_vn",
            "crdfd_value",
            "cr1bb_value2",
            "cr1bb_ieukhoanthanhtoanapdung",
            "crdfd_start_date",
            "crdfd_end_date",
            "cr1bb_congdonsoluong",
            "cr1bb_soluongapdung",
            "crdfd_type",
            "_crdfd_promotion_value",
            "crdfd_promotiontypetext",
          ].join(',');

          const promotionEndpoint = `${baseUrl}/${promotionTable}?$select=${promotionColumns}&$filter=statecode eq 0 and crdfd_promotion_deactive eq 'Active'`;
          const response = await axios.get(promotionEndpoint, { headers });
          return response.data.value || [];
        }
      );
    });

    // Kết hợp thông tin sản phẩm và khuyến mãi
    const productsWithPromotions = await Promise.all(top30Products.map(async product => {
      // Lấy thông tin chi tiết sản phẩm và giá
      const [productDetails, priceDetails] = await Promise.all([
        getProductDetails(product.productId, headers),
        getPriceDetails(product.productId, headers)
      ]);

      let promotionInfo: {
        has_promotion: boolean;
        promotion: null | {
          name: string;
          conditions: string;
          value: string;
          type: string;
          vn: string;
          discounted_price: number;
          productgroup_value: string;
          value2: string;
          ieukhoanthanhtoanapdung: string;
          start_date: string;
          end_date: string;
          congdonsoluong: string;
          soluongapdung: string;
          promotionId: string;
          promotiontypetext: string;    
        };
      } = {
        has_promotion: false,
        promotion: null
      };

      const matchingPromotions = promotionData.filter((promo: any) => {
        if (!promo.crdfd_tensanpham_multiple) return false;
        const promoProducts = promo.crdfd_tensanpham_multiple.split(',').map((p: string) => p.trim().toLowerCase());
        return promoProducts.includes(product.crdfd_tensanphamtext.toLowerCase());
      });

      // Lấy khuyến mãi có giá trị cao nhất
      const bestPromotion = matchingPromotions.reduce((best: any, current: any) => {
        const currentValue = parseFloat(current.crdfd_value) || 0;
        const bestValue = parseFloat(best?.crdfd_value) || 0;
        return currentValue > bestValue ? current : best;
      }, null);

      if (bestPromotion) {
        promotionInfo = {
          has_promotion: true,
          promotion: {
            name: bestPromotion.crdfd_name,
            conditions: bestPromotion.crdfd_conditions,
            value: bestPromotion.crdfd_value,
            type: bestPromotion.crdfd_type,
            vn: bestPromotion.crdfd_vn,
            productgroup_value: bestPromotion._crdfd_productgroup_value,
            value2: bestPromotion.cr1bb_value2,
            ieukhoanthanhtoanapdung: bestPromotion.cr1bb_ieukhoanthanhtoanapdung,
            start_date: bestPromotion.crdfd_start_date,
            end_date: bestPromotion.crdfd_end_date,
            congdonsoluong: bestPromotion.cr1bb_congdonsoluong,
            soluongapdung: bestPromotion.cr1bb_soluongapdung,   
            promotionId: bestPromotion._crdfd_promotion_value,
            promotiontypetext: bestPromotion.crdfd_promotiontypetext,
            discounted_price: bestPromotion.crdfd_type === 'Percent' 
              ? parseFloat(priceDetails.crdfd_gia) * (1 - parseFloat(bestPromotion.crdfd_value) / 100)
              : parseFloat(priceDetails.crdfd_gia) - parseFloat(bestPromotion.crdfd_value)
          }
        };
      }

      return {
        ...product,
        // Thông tin sản phẩm
        cr1bb_imageurl: productDetails.cr1bb_imageurl || '',
        cr1bb_imageurlproduct: productDetails.cr1bb_imageurlproduct || '',
        crdfd_thuonghieu: productDetails.crdfd_thuonghieu || '',
        crdfd_quycach: productDetails.crdfd_quycach || '',
        crdfd_hoanthienbemat: productDetails.crdfd_hoanthienbemat || '',
        crdfd_masanpham: productDetails.crdfd_masanpham || '',
        _crdfd_productgroup_value: productDetails._crdfd_productgroup_value || '',
        crdfd_gtgt: productDetails.crdfd_gtgt || 0,
        
        // Thông tin giá và đơn vị
        cr1bb_giaban: priceDetails.crdfd_gia || '',
        crdfd_giatheovc: priceDetails.crdfd_giatheovc || '',
        cr1bb_nhomsanpham: priceDetails.cr1bb_nhomsanpham || '',
        crdfd_onvi: priceDetails.crdfd_onvi || '',
        _crdfd_onvi_value: priceDetails._crdfd_onvi_value || '',
        crdfd_onvichuantext: priceDetails.crdfd_onvichuantext || '',
        crdfd_maonvi: priceDetails.crdfd_maonvi || '',
        cr1bb_tylechuyenoi: priceDetails.cr1bb_tylechuyenoi || '',
        crdfd_nhomoituongtext: priceDetails.crdfd_nhomoituongtext || '',
        don_vi_DH: priceDetails.crdfd_onvichuan || '',
        
        // Thông tin khuyến mãi
        ...promotionInfo
      };
    }));

    res.status(200).json(productsWithPromotions);
  } catch (error) {
    logger.error("Error in getTop30ProductsWithPromotion:", {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      query: req.query,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof Error && error.message.includes('Authentication failed')) {
      return res.status(401).json({ error: 'Authentication failed. Please try again.' });
    }

    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: axios.isAxiosError(error) ? error.response?.data : String(error)
    });
  }
};

export default getTop30ProductsWithPromotion; 