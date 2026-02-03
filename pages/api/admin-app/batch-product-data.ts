import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";

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

interface BatchProductResult {
  productCode: string;
  units: Array<{ id: string; name: string; conversionRate: number }>;
  prices: any[];
  inventory: any;
  promotions?: any[];
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

    if (requests.length > 10) {
      return res.status(400).json({ error: "Maximum 10 requests per batch" });
    }

    const headers = {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Process all requests in parallel
    const promises = requests.map(async (request, index): Promise<{ index: number; data?: BatchProductResult; error?: string }> => {
      const {
        productCode,
        customerCode,
        region,
        warehouseName,
        isVatOrder = false,
      } = request;

      if (!productCode) {
        return { index, error: "productCode is required" };
      }

      const cacheKey = getCacheKey("batch-product-data", {
        productCode,
        customerCode,
        region,
        warehouseName,
        isVatOrder,
      });

      const cachedResponse = getCachedResponse(cacheKey, true);
      if (cachedResponse !== undefined) {
        return { index, data: cachedResponse };
      }

      try {
        // 🚀 PARALLEL API CALLS - Fetch all data simultaneously
        const [unitsResult, pricesResult, inventoryResult, promotionsResult] = await Promise.allSettled([
          // 1. Get units for product
          axiosClient.get(
            `${BASE_URL}crdfd_unitconvertions?$select=crdfd_unitconvertionid,cr44a_masanpham,crdfd_onvichuyenoitransfome,crdfd_giatrichuyenoi,crdfd_onvichuan&$filter=statecode eq 0 and cr44a_masanpham eq '${productCode}'&$orderby=crdfd_onvichuyenoitransfome&$top=50`,
            { headers }
          ),
          // 2. Get prices with customer groups - optimized query
          customerCode
            ? axiosClient.get(
                `${BASE_URL}crdfd_baogiachitiets?$select=crdfd_baogiachitietid,crdfd_masanpham,crdfd_gia,cr1bb_giakhongvat,crdfd_onvichuantext,crdfd_onvichuan,crdfd_nhomoituongtext,crdfd_discount_rate,crdfd_giatheovc&$filter=statecode eq 0 and crdfd_pricingdeactive eq 191920001 and crdfd_masanpham eq '${productCode}' and crdfd_makhachhang eq '${customerCode}'&$orderby=crdfd_giatheovc asc&$top=20`,
                { headers }
              )
            : Promise.resolve({ data: { value: [] } }),
          // 3. Get inventory from Kho Binh Dinh
          warehouseName
            ? axiosClient.get(
                `${BASE_URL}crdfd_kho_binh_dinhs?$select=crdfd_kho_binh_dinhid,crdfd_masp,cr1bb_tonkholythuyetbomua,cr1bb_soluonganggiuathang,crdfd_vitrikhofx&$filter=statecode eq 0 and crdfd_masp eq '${productCode}' and crdfd_vitrikhofx eq '${warehouseName}'&$top=1`,
                { headers }
              )
            : Promise.resolve({ data: { value: [] } }),
          // 4. Get promotions in parallel
          customerCode
            ? axiosClient.get(
                `${BASE_URL}crdfd_khuyenmais?$select=crdfd_khuyenmaiid,crdfd_ten,crdfd_loaikhuyenmai,crdfd_giatri,crdfd_donvi,crdfd_masanpham,crdfd_masp,crdfd_makhachhang&$filter=statecode eq 0 and crdfd_masanpham eq '${productCode}'&$top=10`,
                { headers }
              )
            : Promise.resolve({ data: { value: [] } }),
        ]);

        const units = unitsResult.status === 'fulfilled'
          ? unitsResult.value.data.value.map((u: any) => ({
              id: u.crdfd_unitconvertionid,
              name: u.crdfd_onvichuyenoitransfome,
              conversionRate: u.crdfd_giatrichuyenoi,
            }))
          : [];

        const prices = pricesResult.status === 'fulfilled'
          ? pricesResult.value.data.value.map((p: any) => ({
              id: p.crdfd_baogiachitietid,
              price: p.crdfd_gia,
              priceNoVat: p.cr1bb_giakhongvat,
              unitName: p.crdfd_onvichuantext || p.crdfd_onvichuan,
              priceGroupText: p.crdfd_nhomoituongtext,
              conversionRate: p.crdfd_giatheovc,
              discountRate: p.crdfd_discount_rate,
            }))
          : [];

        const inventory = inventoryResult.status === 'fulfilled'
          ? inventoryResult.value.data.value[0] || null
          : null;

        const promotions = promotionsResult.status === 'fulfilled'
          ? promotionsResult.value.data.value.map((p: any) => ({
              id: p.crdfd_khuyenmaiid,
              name: p.crdfd_ten,
              type: p.crdfd_loaikhuyenmai,
              value: p.crdfd_giatri,
              unit: p.crdfd_donvi,
            }))
          : [];

        const result: BatchProductResult = {
          productCode,
          units,
          prices,
          inventory,
          promotions,
        };

        // Cache the result (short TTL for product data - 1 minute)
        setCachedResponse(cacheKey, result, true);

        return { index, data: result };

      } catch (error) {
        console.error(`Error fetching batch data for ${productCode}:`, error);
        return { index, error: (error as Error).message };
      }
    });

    const results = await Promise.all(promises);
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
