import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

interface BatchRequest {
  productCode: string;
  customerCode?: string;
  customerId?: string;
  region?: string;
  warehouseName?: string;
  isVatOrder?: boolean;
  quantity?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const requests: BatchRequest[] = req.body.requests;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: "requests array is required" });
    }

    // Limit batch size to prevent abuse
    if (requests.length > 10) {
      return res.status(400).json({ error: "Maximum 10 requests per batch" });
    }

    const headers = {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Process all requests in parallel
    const promises = requests.map(async (request, index) => {
      const {
        productCode,
        customerCode,
        customerId,
        region,
        warehouseName,
        isVatOrder = false,
        quantity = 1
      } = request;

      if (!productCode) {
        return { index, error: "productCode is required" };
      }

      // Create cache key for this specific request
      // Thêm timestamp để bust cache và đảm bảo inventory luôn được refresh
      const timestamp = Date.now();
      const cacheKey = getCacheKey("batch-product-data", {
        productCode,
        customerCode,
        customerId,
        region,
        warehouseName,
        isVatOrder,
        quantity,
        _t: timestamp, // Cache busting - luôn fetch mới khi chọn lại sản phẩm
      });

      const cachedResponse = getCachedResponse(cacheKey, true);
      if (cachedResponse !== undefined) {
        return { index, data: cachedResponse };
      }

      try {
        // Execute all API calls in parallel for this product
        const [unitsPromise, pricesPromise, inventoryPromise] = await Promise.allSettled([
          // 1. Get units for product
          axiosClient.get(`${BASE_URL}crdfd_unitconvertions?$select=crdfd_unitconvertionid,cr44a_masanpham,crdfd_onvichuyenoitransfome,crdfd_giatrichuyenoi,crdfd_onvichuan&$filter=statecode eq 0 and cr44a_masanpham eq '${productCode}'&$orderby=crdfd_onvichuyenoitransfome&$top=50`, { headers }),

          // 2. Get prices (simplified version - can be enhanced)
          customerCode ? axiosClient.get(`${BASE_URL}baogiachitiets?$select=crdfd_baogiachitietid,crdfd_gia,crdfd_nhomoituongtext&$filter=statecode eq 0 and crdfd_masp eq '${productCode}' and crdfd_makhachhang eq '${customerCode}'&$top=10`, { headers }) : Promise.resolve({ data: { value: [] } }),

          // 3. Get inventory if warehouse specified
          warehouseName ? axiosClient.get(`${BASE_URL}tontons?$filter=crdfd_masanpham eq '${productCode}' and crdfd_makho eq '${warehouseName}'&$top=1`, { headers }) : Promise.resolve({ data: { value: [] } })
        ]);

        const result = {
          productCode,
          units: unitsPromise.status === 'fulfilled' ? unitsPromise.value.data.value.map((u: any) => ({
            id: u.crdfd_unitconvertionid,
            name: u.crdfd_onvichuyenoitransfome,
            conversionRate: u.crdfd_giatrichuyenoi,
          })) : [],
          prices: pricesPromise.status === 'fulfilled' ? pricesPromise.value.data.value : [],
          inventory: inventoryPromise.status === 'fulfilled' ? inventoryPromise.value.data.value[0] : null,
        };

        // Cache the result
        setCachedResponse(cacheKey, result, true); // Short cache for product data

        return { index, data: result };

      } catch (error) {
        return { index, error: (error as Error).message };
      }
    });

    const results = await Promise.all(promises);

    // Sort results by original index to maintain order
    const sortedResults = results.sort((a, b) => a.index - b.index);

    res.status(200).json({
      results: sortedResults.map(({ index, ...rest }) => rest)
    });

  } catch (error: any) {
    console.error("Batch product data error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
