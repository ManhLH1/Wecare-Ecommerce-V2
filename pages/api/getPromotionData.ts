import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";
import { getAccessToken } from "./getAccessToken";
import { LRUCache } from "lru-cache";
import { CacheOptions } from "../../src/model/interface/CacheOptions";

// Add this interface at the top of the file after the imports
interface Promotion {
  crdfd_masanpham_multiple?: string;
  crdfd_value?: string;
  crdfd_vn?: string;
  crdfd_start_date?: string;
  crdfd_end_date?: string;
  crdfd_conditions?: string;
  _crdfd_promotion_value?: string;
  cr1bb_value2?: string;
  cr1bb_congdonsoluong?: boolean;
  cr1bb_soluongapdung?: number;
  crdfd_name?: string;
  cr1bb_urlimage?: string;
  crdfd_customergrouptext?: string;
  _crdfd_customergroup_value?: string;
  cr1bb_ieukhoanthanhtoanapdung?: string;
  crdfd_promotiontypetext?: string;
  crdfd_soluongapdungmuc3?: number;
  statecode?: number;
  cr3b9_tensanphammuakem?: string;
  cr1bb_masanphammuakem?: string;
  cr1bb_manhomsp_multiple?: string;
  cr1bb_manhomspmuakem?: string;
  crdfd_value3?: string;
  cr3b9_tennhomspmuakem?: string;
}

interface PromotionDetails {
  crdfd_name?: string;
  crdfd_conditions?: string;
  crdfd_multiple_manhomsp?: string;
  crdfd_multiple_tennhomsp?: string;
  crdfd_masanpham_multiple?: string;
  crdfd_tensanpham_multiple?: string;
  crdfd_type?: string;
  cr1bb_urlimage?: string;
  crdfd_customergrouptext?: string;
  _crdfd_customergroup_value?: string;
  cr1bb_ieukhoanthanhtoanapdung?: string;
  crdfd_promotiontypetext?: string;
  crdfd_soluongapdungmuc3?: number;
  statecode?: number;
  cr3b9_tensanphammuakem?: string;
  cr1bb_masanphammuakem?: string;
  cr1bb_manhomsp_multiple?: string;
  cr1bb_manhomspmuakem?: string;
  crdfd_value?: string;
  crdfd_vn?: string;
  cr1bb_value2?: string;
  crdfd_value3?: string;
  crdfd_start_date?: string;
  crdfd_end_date?: string;
  cr1bb_congdonsoluong?: boolean;
  cr1bb_soluongapdung?: number;
  _crdfd_promotion_value?: string;
  cr3b9_tennhomspmuakem?: string;
}

interface CustomerPromotion {
  _wc001_promotion_value?: string;
  crdfd_promotiontext?: string;
  crdfd_value?: string;
  cr1bb_vn?: string;
  cr1bb_urlimage?: string;
  crdfd_multiple_tennhomsp?: string;
  crdfd_tensanpham_multiple?: string;
  crdfd_conditions?: string;
  crdfd_name?: string;
  crdfd_customergrouptext?: string;
  _crdfd_customergroup_value?: string;
  cr1bb_ieukhoanthanhtoanapdung?: string;
  crdfd_promotiontypetext?: string;
  crdfd_soluongapdungmuc3?: number;
  statecode?: number;
  cr3b9_tensanphammuakem?: string;
  cr1bb_masanphammuakem?: string;
  cr1bb_manhomsp_multiple?: string;
  cr1bb_manhomspmuakem?: string;
  cr1bb_value2?: string;
  crdfd_value3?: string;
  crdfd_start_date?: string;
  crdfd_end_date?: string;
  cr1bb_congdonsoluong?: boolean;
  cr1bb_soluongapdung?: number;
  cr3b9_tennhomspmuakem?: string;
}

// Cache Configuration
const CACHE_CONFIG: Record<string, CacheOptions> = {
  accessToken: { max: 1, ttl: 3300000 }, // 55 minutes
  promotionData: { max: 500, ttl: 3600000 }, // 1 hour
};

// Initialize caches
const caches: Record<string, LRUCache<string, any>> = Object.entries(
  CACHE_CONFIG
).reduce((acc, [key, config]) => {
  acc[key] = new LRUCache({ max: config.max, ttl: config.ttl });
  return acc;
}, {} as Record<string, LRUCache<string, any>>);

// Helper Functions
const getCachedData = async <T>(
  cacheKey: string,
  cacheName: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  const cache = caches[cacheName];
  if (!cache) throw new Error(`Cache ${cacheName} not found`);

  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData as T;

  const data = await fetchFn();
  cache.set(cacheKey, data);
  return data;
};

const fetchWithRetry = async (
  url: string,
  options: any,
  retries = 3,
  delay = 1000
) => {
  try {
    return await axios(url, options);
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

const getPromotionData = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, includeImage } = req.query;

  try {
    const token = await getCachedData<string>(
      "accessToken",
      "accessToken",
      getAccessToken
    );

    // If no ID provided or ID is "null", fetch top 30 products with promotions
    if (!id || id === "null") {
      const table = "crdfd_saleorderdetails";
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const formattedDate = twoWeeksAgo.toISOString();

      const select = "$select=crdfd_tensanphamtext,_crdfd_sanpham_value";
      const filter = `$filter=statecode eq 0 and createdon ge ${formattedDate} and crdfd_giagoc ne null and crdfd_gia gt 0`;
      const query = `${select}&${filter}`;
      const initialEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`;

      let apiEndpoint = initialEndpoint;
      let allResults: { crdfd_tensanphamtext: string; _crdfd_sanpham_value: string }[] = [];

      while (apiEndpoint) {
        const response = await fetchWithRetry(apiEndpoint, {
          headers: getHeaders(token),
        });

        if (Array.isArray(response.data.value) && response.data.value.length > 0) {
          allResults = allResults.concat(response.data.value);
          apiEndpoint = response.data["@odata.nextLink"];
        } else {
          break;
        }
      }

      // Get top 30 products
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

      const top30Products = Object.entries(productStats)
        .map(([name, data]) => ({
          crdfd_tensanphamtext: name,
          total: data.count,
          productId: data.productId
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 30);

      // Get promotions for these products
      const promotionTable = "crdfd_promotions";
      const promotionColumns = [
        includeImage === 'true' ? 'cr1bb_urlimage' : null,
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
        "statecode",
        "cr3b9_tensanphammuakem",
        "cr1bb_masanphammuakem",
        "cr1bb_manhomsp_multiple",
        "cr1bb_manhomspmuakem",
        "cr3b9_tennhomspmuakem"
      ].filter(Boolean).join(',');

      const promotionFilter = `statecode eq 0 and crdfd_promotion_deactive eq 'Active' `;
      const promotionEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${promotionTable}?$select=${promotionColumns}&$filter=${promotionFilter}`;

      const promotionResponse = await fetchWithRetry(promotionEndpoint, {
        headers: getHeaders(token),
      });

      const promotions = promotionResponse.data.value || [];

      // Map products with their promotions
      const productsWithPromotions = top30Products.map(product => {
        const matchingPromotion = promotions.find((promo: Promotion) => {
          if (!promo.crdfd_masanpham_multiple) return false;
          const promoProducts = promo.crdfd_masanpham_multiple.split(',').map((p: string) => p.trim().toLowerCase());
          return promoProducts.includes(product.crdfd_tensanphamtext.toLowerCase());
        });

        if (!matchingPromotion) {
          return {
            crdfd_tensanphamtext: product.crdfd_tensanphamtext,
            total: product.total,
            productId: product.productId,
            crdfd_name: product.crdfd_tensanphamtext,
            crdfd_value: "0",
            cr1bb_vn: "191920001",
            promotionId: "",
            value: "0",
            name: product.crdfd_tensanphamtext,
            vn: "191920001",
            crdfd_customergrouptext: "",
            _crdfd_customergroup_value: "",
            cr1bb_ieukhoanthanhtoanapdung: "",
            crdfd_promotiontypetext: "",
            crdfd_soluongapdungmuc3: 0,
            statecode: 0,
            cr3b9_tensanphammuakem: "",
            cr1bb_masanphammuakem: "",
            cr1bb_manhomsp_multiple: "",
            cr1bb_manhomspmuakem: "",
            cr1bb_urlimage: "",
            crdfd_conditions: "",
            value2: "",
            value3: "",
            congdonsoluong: false,
            soluongapdung: 0,
            cr3b9_tennhomspmuakem: ""
          };
        }

        return {
          crdfd_tensanphamtext: product.crdfd_tensanphamtext,
          total: product.total,
          productId: product.productId,
          crdfd_name: matchingPromotion.crdfd_name || product.crdfd_tensanphamtext,
          crdfd_value: matchingPromotion.crdfd_value || "0",
          cr1bb_vn: matchingPromotion.crdfd_vn || "191920001",
          // cr1bb_startdate: matchingPromotion.crdfd_start_date,
          // cr1bb_enddate: matchingPromotion.crdfd_end_date,
          crdfd_conditions: matchingPromotion.crdfd_conditions,
          promotionId: matchingPromotion._crdfd_promotion_value || "",
          value: matchingPromotion.crdfd_value || "0",
          value2: matchingPromotion.cr1bb_value2,
          value3: matchingPromotion.crdfd_value3,
          congdonsoluong: matchingPromotion.cr1bb_congdonsoluong,
          soluongapdung: matchingPromotion.cr1bb_soluongapdung,
          name: matchingPromotion.crdfd_name || product.crdfd_tensanphamtext,
          conditions: matchingPromotion.crdfd_conditions,
          vn: matchingPromotion.crdfd_vn || "191920001",
          cr1bb_urlimage: matchingPromotion.cr1bb_urlimage,
          crdfd_customergrouptext: matchingPromotion.crdfd_customergrouptext,
          _crdfd_customergroup_value: matchingPromotion._crdfd_customergroup_value,
          cr1bb_ieukhoanthanhtoanapdung: matchingPromotion.cr1bb_ieukhoanthanhtoanapdung,
          crdfd_promotiontypetext: matchingPromotion.crdfd_promotiontypetext,
          crdfd_soluongapdungmuc3: matchingPromotion.crdfd_soluongapdungmuc3,
          statecode: matchingPromotion.statecode,
          cr3b9_tensanphammuakem: matchingPromotion.cr3b9_tensanphammuakem,
          cr1bb_masanphammuakem: matchingPromotion.cr1bb_masanphammuakem,
          cr1bb_manhomsp_multiple: matchingPromotion.cr1bb_manhomsp_multiple,
          cr1bb_manhomspmuakem: matchingPromotion.cr1bb_manhomspmuakem,
          cr3b9_tennhomspmuakem: matchingPromotion.cr3b9_tennhomspmuakem
        };
      });

      return res.status(200).json(productsWithPromotions);
    }

    // If ID is provided, proceed with existing logic
    const cacheKey = `promotionData_${id}`;

    const fetchPromotionDetails = async (promotionId: string, token: string): Promise<PromotionDetails | null> => {
      const promotionTable = "crdfd_promotions";
      const promotionColumns = [
        includeImage === 'true' ? 'cr1bb_urlimage' : null,
        "crdfd_name",
        "crdfd_conditions",
        "crdfd_multiple_manhomsp",
        "crdfd_multiple_tennhomsp",
        "crdfd_masanpham_multiple",
        "crdfd_tensanpham_multiple",
        "crdfd_type",
        "crdfd_customergrouptext",
        "_crdfd_customergroup_value",
        "cr1bb_ieukhoanthanhtoanapdung",
        "crdfd_promotiontypetext",
        "crdfd_soluongapdungmuc3",
        "statecode",
        "cr3b9_tensanphammuakem",
        "cr1bb_masanphammuakem",
        "cr1bb_manhomsp_multiple",
        "cr1bb_manhomspmuakem",
        "crdfd_value",
        "crdfd_vn",
        "cr1bb_value2",
        "crdfd_value3",
        "crdfd_start_date",
        "crdfd_end_date",
        "cr1bb_congdonsoluong",
        "cr1bb_soluongapdung",
        "_crdfd_promotion_value",
        "cr3b9_tennhomspmuakem"
      ].filter(Boolean).join(',');

      const promotionEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${promotionTable}?$select=${promotionColumns}&$filter=statecode eq 0 and crdfd_promotion_deactive eq 'Active' and crdfd_promotionid eq '${promotionId}'`;

      const promotionResponse = await fetchWithRetry(promotionEndpoint, {
        headers: getHeaders(token),
      });
      return promotionResponse.data.value?.[0] || null;
    };

    const enrichPromotionData = async (data: CustomerPromotion[], token: string): Promise<CustomerPromotion[]> => {
      const promotionPromises = data.map(async (item) => {
        if (!item._wc001_promotion_value) return item;

        const promotionDetails = await fetchPromotionDetails(
          item._wc001_promotion_value || "",
          token
        );

        if (promotionDetails) {
          return {
            ...item,
            cr1bb_urlimage: promotionDetails.cr1bb_urlimage || "",
            crdfd_multiple_tennhomsp: promotionDetails.crdfd_multiple_tennhomsp || "",
            crdfd_tensanpham_multiple: promotionDetails.crdfd_tensanpham_multiple || "",
            crdfd_conditions: promotionDetails.crdfd_conditions || "",
            crdfd_name: promotionDetails.crdfd_name || "",
            crdfd_customergrouptext: promotionDetails.crdfd_customergrouptext || "",
            _crdfd_customergroup_value: promotionDetails._crdfd_customergroup_value || "",
            cr1bb_ieukhoanthanhtoanapdung: promotionDetails.cr1bb_ieukhoanthanhtoanapdung || "",
            crdfd_promotiontypetext: promotionDetails.crdfd_promotiontypetext || "",
            crdfd_soluongapdungmuc3: promotionDetails.crdfd_soluongapdungmuc3 || 0,
            statecode: promotionDetails.statecode || 0,
            cr3b9_tensanphammuakem: promotionDetails.cr3b9_tensanphammuakem || "",
            cr1bb_masanphammuakem: promotionDetails.cr1bb_masanphammuakem || "",
            cr1bb_manhomsp_multiple: promotionDetails.cr1bb_manhomsp_multiple || "",
            cr1bb_manhomspmuakem: promotionDetails.cr1bb_manhomspmuakem || "",
            crdfd_value: promotionDetails.crdfd_value || "",
            crdfd_vn: promotionDetails.crdfd_vn || "",
            cr1bb_value2: promotionDetails.cr1bb_value2 || "",
            crdfd_value3: promotionDetails.crdfd_value3 || "",
            crdfd_start_date: promotionDetails.crdfd_start_date || "",
            crdfd_end_date: promotionDetails.crdfd_end_date || "",
            cr1bb_congdonsoluong: promotionDetails.cr1bb_congdonsoluong || false,
            cr1bb_soluongapdung: promotionDetails.cr1bb_soluongapdung || 0,
            cr3b9_tennhomspmuakem: promotionDetails.cr3b9_tennhomspmuakem || ""
          };
        }
        return item;
      });

      return Promise.all(promotionPromises);
    };

    const containsExcludedTerms = (text: string | null, excludedTerms: string[]): boolean => {
      if (!text) return false;
      
      const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
      return excludedTerms.some(term => {
        const normalizedTerm = term.toLowerCase().replace(/\s+/g, ' ');
        const words = normalizedTerm.split(' ');
        const regex = new RegExp(words.join('\\s+'), 'i');
        return regex.test(normalizedText);
      });
    };

    const filterPromotionText = (data: CustomerPromotion[]): CustomerPromotion[] => {
      const excludedTerms = [
        "thanh toan truoc",
        "thanh toan ngay",
        "Thanh toán ngay",
        "Thanh toán trước",
        "Công nợ",
        "tt ngay"
      ];
      
      return data.filter(item => {
        const hasExcludedTermInPromotionText = containsExcludedTerms(item.crdfd_promotiontext || null, excludedTerms);
        const hasExcludedTermInName = containsExcludedTerms(item.crdfd_name || null, excludedTerms);
        const hasZeroValue = item.crdfd_value === "0";
        
        return !hasExcludedTermInPromotionText && !hasExcludedTermInName && !hasZeroValue;
      });
    };

    const promotionData = await getCachedData<CustomerPromotion[]>(
      cacheKey,
      "promotionData",
      async () => {
        const table = "crdfd_customerxpromotions";
        const columns =
          "_wc001_promotion_value,crdfd_promotiontext,crdfd_value,cr1bb_vn";
        const filter = `statecode eq 0 and crdfd_promotiondeactive eq 'Active' and _wc001_customer_value eq '${id}'`;
        const filterQuery = `&$filter=${encodeURIComponent(filter)}`;
        const query = `$select=${columns}${filterQuery}`;
        const initialEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`;

        let apiEndpoint = initialEndpoint;
        let allData: CustomerPromotion[] = [];

        while (apiEndpoint) {
          const response = await fetchWithRetry(apiEndpoint, {
            headers: getHeaders(token),
          });

          if (
            Array.isArray(response.data.value) &&
            response.data.value.length > 0
          ) {
            allData = [...allData, ...response.data.value];
            apiEndpoint = response.data["@odata.nextLink"];
          } else {
            break;
          }
        }

        const enrichedData = await enrichPromotionData(allData, token);
        return filterPromotionText(enrichedData);
      }
    );

    res.status(200).json(promotionData);
  } catch (error) {
    console.error("Error fetching promotion data", error);
    handleError(res, error as AxiosError);
  }
};

// Error Handling
const handleError = (res: NextApiResponse, error: AxiosError) => {
  if (error.response) {
    res.status(error.response.status).json({ error: error.response.data });
  } else if (error.request) {
    res.status(500).json({ error: "No response received from the server" });
  } else {
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "OData-MaxVersion": "4.0",
  "OData-Version": "4.0",
});

export default getPromotionData;