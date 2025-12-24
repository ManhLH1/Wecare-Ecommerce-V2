import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const PRODUCT_TABLE = "crdfd_productses";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { search } = req.query;
    
    // Minimum search length: require at least 2 characters to avoid expensive queries
    const MIN_SEARCH_LENGTH = 2;
    const searchTerm = search && typeof search === "string" ? search.trim() : "";
    
    // Early return for empty or too short search terms
    if (!searchTerm || searchTerm.length < MIN_SEARCH_LENGTH) {
      return res.status(200).json([]);
    }
    
    // Check cache first
    const cacheKey = getCacheKey("products", { search: searchTerm });
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse !== undefined) {
      return res.status(200).json(cachedResponse);
    }

    const headers = {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Prefer: "odata.maxpagesize=500",
    };

    // Build optimized filter
    // Priority: 1) Exact match on masanpham (fastest), 2) startswith (can use index), 3) contains (slower)
    let filter = "statecode eq 0";
    
    // Escape single quotes to avoid breaking the OData filter
    const safeSearchTerm = searchTerm.replace(/'/g, "''");
    
    // Check if search looks like a product code (mostly numeric/alphanumeric, short length)
    const looksLikeProductCode = /^[A-Z0-9-]+$/i.test(searchTerm) && searchTerm.length <= 20;
    
    if (looksLikeProductCode) {
      // For product-code-like searches, prioritize exact match and startswith
      // Exact match on masanpham first (fastest with index)
      filter += ` and (crdfd_masanpham eq '${safeSearchTerm}'` +
        ` or startswith(crdfd_masanpham, '${safeSearchTerm}')` +
        ` or startswith(crdfd_name, '${safeSearchTerm}')` +
        ` or startswith(crdfd_fullname, '${safeSearchTerm}')` +
        ` or contains(crdfd_name, '${safeSearchTerm}')` +
        ` or contains(crdfd_fullname, '${safeSearchTerm}'))`;
    } else {
      // For text searches, use startswith first (better performance than contains)
      // then fallback to contains for partial matches
      filter += ` and (startswith(crdfd_name, '${safeSearchTerm}')` +
        ` or startswith(crdfd_fullname, '${safeSearchTerm}')` +
        ` or startswith(crdfd_masanpham, '${safeSearchTerm}')` +
        ` or contains(crdfd_name, '${safeSearchTerm}')` +
        ` or contains(crdfd_fullname, '${safeSearchTerm}')` +
        ` or contains(crdfd_masanpham, '${safeSearchTerm}'))`;
    }

    // Use crdfd_gtgt and cr1bb_banchatgiaphatra (Bản chất giá phát ra)
    // Add crdfd_manhomsp for product group code
    const columns =
      "crdfd_productsid,crdfd_name,crdfd_fullname,crdfd_masanpham,crdfd_unitname,crdfd_gtgt,cr1bb_banchatgiaphatra,crdfd_manhomsp";
    
    // Reduced limit for dropdown search (100 is sufficient)
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&$orderby=crdfd_name&$top=100`;

    const endpoint = `${BASE_URL}${PRODUCT_TABLE}?${query}`;

    // Use deduplication for product queries
    const dedupKey = getDedupKey(PRODUCT_TABLE, { search: searchTerm });
    const response = await deduplicateRequest(dedupKey, () =>
      axiosClient.get(endpoint, { headers })
    );

    const products = (response.data.value || []).map((item: any) => ({
      crdfd_productsid: item.crdfd_productsid,
      crdfd_name: item.crdfd_name || "",
      crdfd_fullname: item.crdfd_fullname || "",
      crdfd_masanpham: item.crdfd_masanpham || "",
      crdfd_unitname: item.crdfd_unitname || "",
      crdfd_gtgt: item.crdfd_gtgt ?? null,
      cr1bb_banchatgiaphatra: item.cr1bb_banchatgiaphatra ?? null,
      crdfd_manhomsp: item.crdfd_manhomsp || "",
    }));

    // Cache the result
    setCachedResponse(cacheKey, products);

    res.status(200).json(products);
  } catch (error: any) {
    console.error("Error fetching products:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));

      return res.status(error.response.status || 500).json({
        error: "Error fetching products",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }

    res.status(500).json({
      error: "Error fetching products",
      details: error.message,
    });
  }
}

