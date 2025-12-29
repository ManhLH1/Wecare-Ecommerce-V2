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
  topProductGroupsData: { max: 10, ttl: 1800000 }, // 30 phút
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
  default: 45000,
  fetchData: 30000,
  cache: 35000, // Increased from 15000 to 35000 for complex data processing
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

const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2";

// Main API handler - Get top 20 product groups by order count in last 30 days using crdfd_manhomsp
const getTop20ProductGroupsByOrders = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method not allowed" });
    }

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

    // Tính thời gian 30 ngày trước
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const formattedDate = thirtyDaysAgo.toISOString();

    // Lấy tất cả sale order details trong 30 ngày qua
    const saleOrderDetails = await getCachedData(
      "topProductGroups_saleOrders",
      "topProductGroupsData",
      async () => {
        const table = "crdfd_saleorderdetails";
        const select = "$select=crdfd_saleorderdetailid,_crdfd_sanpham_value,_crdfd_socode_value";
        const filter = `$filter=statecode eq 0 and createdon ge ${formattedDate} and crdfd_giagoc ne null and crdfd_gia gt 0`;
        const orderBy = "$orderby=createdon desc";

        const query = `${select}&${filter}&${orderBy}&$top=5000`; // Limit to prevent timeout
        const initialEndpoint = `${baseUrl}/${table}?${query}`;
        let apiEndpoint = initialEndpoint;
        let allResults: Array<{
          crdfd_saleorderdetailid: string;
          _crdfd_sanpham_value: string;
          _crdfd_socode_value: string;
        }> = [];

        while (apiEndpoint) {
          const response = await axios.get(apiEndpoint, { headers });

          if (Array.isArray(response.data.value) && response.data.value.length > 0) {
            allResults = allResults.concat(response.data.value);
            apiEndpoint = response.data["@odata.nextLink"];

            // Safety limit to prevent excessive data processing
            if (allResults.length >= 10000) {
              logger.warn("Reached maximum limit of 10000 sale order details");
              break;
            }
          } else {
            break;
          }
        }

        return allResults;
      }
    );

    // Lấy unique product IDs từ sale order details
    const productIds = [...new Set(saleOrderDetails.map(item => item._crdfd_sanpham_value).filter(Boolean))];

    // Lấy thông tin sản phẩm theo batch để có product group IDs
    const productGroupsMap = await getCachedData(
      "topProductGroups_products",
      "topProductGroupsData",
      async () => {
        const productGroups: Record<string, string> = {};

        // Process in smaller batches of 20 to improve performance and reduce timeout risk
        const batchSize = 20;
        for (let i = 0; i < productIds.length; i += batchSize) {
          const batchProductIds = productIds.slice(i, i + batchSize);
          if (batchProductIds.length === 0) continue;

          const productTable = "crdfd_productses";
          const productSelect = "$select=crdfd_productsid,crdfd_manhomsp";
          const productFilter = batchProductIds.map(id => `crdfd_productsid eq '${id}'`).join(' or ');
          const productQuery = `${productSelect}&$filter=${encodeURIComponent(productFilter)}`;

          try {
            const productEndpoint = `${baseUrl}/${productTable}?${productQuery}`;
            const response = await withTimeout(
              axios.get(productEndpoint, { headers }),
              TIMEOUT_CONFIG.fetchData
            );

            if (response.data.value) {
              response.data.value.forEach((product: any) => {
                if (product.crdfd_manhomsp) {
                  productGroups[product.crdfd_productsid] = product.crdfd_manhomsp;
                }
              });
            }
          } catch (error) {
            logger.error(`Error fetching products batch ${Math.floor(i / batchSize) + 1}:`, error);
            // Continue with next batch instead of failing completely
          }
        }

        return productGroups;
      }
    );

    // Thống kê số đơn hàng theo mã nhóm sản phẩm từ crdfd_manhomsp
    const productGroupStats = saleOrderDetails.reduce((acc, curr) => {
      const productId = curr._crdfd_sanpham_value;
      const productGroupCode = productGroupsMap[productId]; // Đây là crdfd_manhomsp

      if (!productGroupCode) return acc;

      if (!acc[productGroupCode]) {
        acc[productGroupCode] = {
          productGroupCode: productGroupCode,
          orderCount: 0
        };
      }
      acc[productGroupCode].orderCount += 1;
      return acc;
    }, {} as Record<string, { productGroupCode: string; orderCount: number }>);

    // Chuyển đổi thành mảng và sắp xếp theo số đơn hàng giảm dần
    const sortedAllProductGroups = Object.values(productGroupStats).sort((a, b) => b.orderCount - a.orderCount);

    // Lấy thông tin chi tiết nhóm sản phẩm tuần tự cho tới khi có 20 nhóm có image
    const enrichedProductGroups: Array<any> = [];
    const maxToCheck = Math.min(sortedAllProductGroups.length, 150); // Optimized: 150 groups should be sufficient for top 20

    // First pass: Get groups with images (parallel processing for better performance)
    const concurrencyLimit = 5; // Process 5 requests at a time to avoid overwhelming the server

    for (let batchStart = 0; batchStart < maxToCheck && enrichedProductGroups.length < 20; batchStart += concurrencyLimit) {
      const batchEnd = Math.min(batchStart + concurrencyLimit, maxToCheck);
      const batch = sortedAllProductGroups.slice(batchStart, batchEnd);

      const batchPromises = batch.map(async (group) => {
        try {
          const productGroupData = await getCachedData(
            `productGroup_${group.productGroupCode}`,
            "topProductGroupsData",
            async () => {
              const table = "crdfd_productgroups";
              const select = "$select=crdfd_productgroupid,crdfd_productname,crdfd_image_url,crdfd_manhomsp";
              const filter = `$filter=crdfd_manhomsp eq '${group.productGroupCode}' and crdfd_image_url ne null`;

              const query = `${select}&${filter}`;
              const endpoint = `${baseUrl}/${table}?${query}`;

              const response = await withTimeout(
                axios.get(endpoint, { headers }),
                TIMEOUT_CONFIG.fetchData
              );
              return response.data.value[0] || null;
            }
          );

          const imageUrl = productGroupData?.crdfd_image_url ? String(productGroupData.crdfd_image_url).trim() : "";
          if (imageUrl) {
            return {
              productGroupCode: group.productGroupCode,
              productGroupId: productGroupData?.crdfd_productgroupid || '',
              productGroupName: productGroupData?.crdfd_productname || 'N/A',
              imageUrl,
              orderCount: group.orderCount
            };
          }
          return null;
        } catch (error) {
          logger.error(`Error fetching product group ${group.productGroupCode}:`, error);
          return null;
        }
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(result => result !== null);
        enrichedProductGroups.push(...validResults);

        // Break if we have enough groups
        if (enrichedProductGroups.length >= 20) break;
      } catch (error) {
        logger.error('Error in batch processing:', error);
        // Continue with next batch
      }
    }

    // Second pass: If still don't have enough, get groups without requiring images (for fallback)
    if (enrichedProductGroups.length < 20 && sortedAllProductGroups.length > enrichedProductGroups.length) {
      logger.warn(`Only found ${enrichedProductGroups.length} product groups with images. Adding fallback groups without image requirement.`);

      const existingCodes = new Set(enrichedProductGroups.map(g => g.productGroupCode));
      const remainingGroups = sortedAllProductGroups.filter(g => !existingCodes.has(g.productGroupCode));

      // Use parallel processing for fallback groups too
      const concurrencyLimit = 5;

      for (let batchStart = 0; batchStart < remainingGroups.length && enrichedProductGroups.length < 20; batchStart += concurrencyLimit) {
        const batchEnd = Math.min(batchStart + concurrencyLimit, remainingGroups.length);
        const batch = remainingGroups.slice(batchStart, batchEnd);

        const batchPromises = batch.map(async (group) => {
          try {
            const productGroupData = await getCachedData(
              `productGroup_fallback_${group.productGroupCode}`,
              "topProductGroupsData",
              async () => {
                const table = "crdfd_productgroups";
                const select = "$select=crdfd_productgroupid,crdfd_productname,crdfd_image_url,crdfd_manhomsp";
                const filter = `$filter=crdfd_manhomsp eq '${group.productGroupCode}'`;

                const query = `${select}&${filter}`;
                const endpoint = `${baseUrl}/${table}?${query}`;

                const response = await withTimeout(
                  axios.get(endpoint, { headers }),
                  TIMEOUT_CONFIG.fetchData
                );
                return response.data.value[0] || null;
              }
            );

            if (productGroupData) {
              const imageUrl = productGroupData.crdfd_image_url ? String(productGroupData.crdfd_image_url).trim() : "";
              return {
                productGroupCode: group.productGroupCode,
                productGroupId: productGroupData.crdfd_productgroupid || '',
                productGroupName: productGroupData.crdfd_productname || `Danh mục ${group.productGroupCode}`,
                imageUrl: imageUrl || '/placeholder-image.jpg', // Use actual placeholder image
                orderCount: group.orderCount,
                hasPlaceholderImage: !imageUrl // Flag to indicate this uses placeholder
              };
            }
            return null;
          } catch (error) {
            logger.error(`Error fetching fallback product group ${group.productGroupCode}:`, error);
            return null;
          }
        });

        try {
          const batchResults = await Promise.all(batchPromises);
          const validResults = batchResults.filter(result => result !== null);
          enrichedProductGroups.push(...validResults);

          // Break if we have enough groups
          if (enrichedProductGroups.length >= 20) break;
        } catch (error) {
          logger.error('Error in fallback batch processing:', error);
          // Continue with next batch
        }
      }
    }

    res.status(200).json(enrichedProductGroups);

  } catch (error) {
    logger.error("Error in getTop20ProductGroupsByOrders:", {
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

export default getTop20ProductGroupsByOrders;
