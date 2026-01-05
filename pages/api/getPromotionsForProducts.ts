import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";
import { LRUCache } from "lru-cache";

// Cache configuration
const promotionCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1800000, // 30 minutes
});

// Escape single quotes for OData
const escapeODataValue = (value: string) => value.replace(/'/g, "''");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCodes } = req.query;

    if (!productCodes || typeof productCodes !== "string" || !productCodes.trim()) {
      return res.status(400).json({ error: "productCodes parameter is required" });
    }

    // Check cache first
    const cacheKey = productCodes;
    const cachedResult = promotionCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    const token = await getAccessToken();
    if (!token) {
      return res.status(401).json({ error: "Failed to obtain access token" });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Prefer: "odata.maxpagesize=500",
    };

    const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2";

    // Split product codes and create filters
    const codes = productCodes.split(",").map(c => c.trim()).filter(Boolean);
    if (codes.length === 0) {
      return res.status(400).json({ error: "No valid product codes provided" });
    }

    // Build filter for active promotions within date range
    const nowIso = new Date().toISOString();
    const baseFilters = [
      "statecode eq 0",
      "crdfd_promotion_deactive eq 'Active'",
      `crdfd_start_date le ${nowIso}`,
      `(crdfd_end_date ge ${nowIso} or crdfd_end_date eq null)`
    ];

    // Create product code filters - check multiple fields
    const productFilters = codes.map(code =>
      `(contains(crdfd_masanpham_multiple,'${escapeODataValue(code)}') or ` +
      `contains(crdfd_tensanpham_multiple,'${escapeODataValue(code)}'))`
    );

    const allFilters = [...baseFilters, `(${productFilters.join(' or ')})`];

    const columns = [
      "crdfd_promotionid",
      "crdfd_name",
      "crdfd_conditions",
      "crdfd_type",
      "crdfd_value",
      "crdfd_vn",
      "crdfd_start_date",
      "crdfd_end_date",
      "crdfd_tensanpham_multiple",
      "crdfd_masanpham_multiple",
      "crdfd_promotiontypetext",
      "cr1bb_soluongapdung",
      "crdfd_value_co_vat",
      "crdfd_value_khong_vat"
    ].join(",");

    const query = `$select=${columns}&$filter=${encodeURIComponent(
      allFilters.join(" and ")
    )}&$orderby=crdfd_start_date desc`;

    const endpoint = `${baseUrl}/crdfd_promotions?${query}`;

    const response = await axios.get(endpoint, { headers });

    // Process promotions to create a map by product code
    const promotionsMap: Record<string, any[]> = {};

    const promotions = (response.data.value || []).map((promo: any) => ({
      id: promo.crdfd_promotionid,
      name: promo.crdfd_name,
      conditions: promo.crdfd_conditions,
      type: promo.crdfd_type,
      value: promo.crdfd_value,
      vn: promo.crdfd_vn,
      startDate: promo.crdfd_start_date,
      endDate: promo.crdfd_end_date,
      productNames: promo.crdfd_tensanpham_multiple,
      productCodes: promo.crdfd_masanpham_multiple,
      promotionTypeText: promo.crdfd_promotiontypetext,
      quantityCondition: promo.cr1bb_soluongapdung,
      valueWithVat: promo.crdfd_value_co_vat,
      valueNoVat: promo.crdfd_value_khong_vat,
    }));

    // Create mapping from product codes to promotions
    codes.forEach(code => {
      const matchingPromotions = promotions.filter((promo: any) => {
        const promoProductCodes = (promo.productCodes || "").split(",").map((c: string) => c.trim());
        return promoProductCodes.includes(code);
      });

      if (matchingPromotions.length > 0) {
        promotionsMap[code] = matchingPromotions;
      }
    });

    const result = {
      promotions: promotionsMap,
      totalPromotions: promotions.length,
      productCodesRequested: codes.length,
      productCodesWithPromotions: Object.keys(promotionsMap).length
    };

    // Cache the result
    promotionCache.set(cacheKey, result);

    res.status(200).json(result);

  } catch (error: any) {
    console.error("Error fetching promotions for products:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", error.response.data);
      return res.status(error.response.status || 500).json({
        error: "Error fetching promotions",
        details: error.response.data?.error?.message || error.message,
        fullError: error.response.data
      });
    }

    res.status(500).json({
      error: "Error fetching promotions",
      details: error.message,
    });
  }
}
