import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse, shouldCacheResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const CUSTOMER_TABLE = "crdfd_customers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { search } = req.query;

    // Check cache first
    const cacheKey = getCacheKey("customers", { search });
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse !== undefined) {
      return res.status(200).json(cachedResponse);
    }

    const headers = {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Build filter
    let filter = "statecode eq 0";
    if (search && typeof search === "string" && search.trim()) {
      const searchTerm = search.trim().replace(/'/g, "''");
      filter += ` and (contains(crdfd_name, '${searchTerm}') or contains(cr44a_st, '${searchTerm}') or contains(crdfd_phone2, '${searchTerm}'))`;
    }

    const columns = "crdfd_customerid,crdfd_name,cr44a_st,crdfd_phone2,cr44a_makhachhang,crdfd_nganhnghe,crdfd_keyquanhuyen,_crdfd_tinhthanh_value";
    const expand = "$expand=crdfd_Tinhthanh($select=crdfd_tinhthanhid,crdfd_name,new_vungmienfx)";
    const query = `$select=${columns}&${expand}&$filter=${encodeURIComponent(
      filter
    )}&$orderby=crdfd_name&$top=100`;
    const endpoint = `${BASE_URL}${CUSTOMER_TABLE}?${query}`;

    // Use deduplication for customer queries
    const dedupKey = getDedupKey(CUSTOMER_TABLE, { search });
    const response = await deduplicateRequest(dedupKey, () =>
      axiosClient.get(endpoint, { headers })
    );

    const customers = (response.data.value || []).map((item: any) => ({
      crdfd_customerid: item.crdfd_customerid,
      crdfd_name: item.crdfd_name || "",
      cr44a_st: item.cr44a_st || "",
      crdfd_phone2: item.crdfd_phone2 || "",
      cr44a_makhachhang: item.cr44a_makhachhang || "",
      crdfd_nganhnghe: item.crdfd_nganhnghe ?? null,
      crdfd_keyquanhuyen: item.crdfd_keyquanhuyen || "",
      crdfd_tinhthanh: item._crdfd_tinhthanh_value || null,
      crdfd_tinhthanh_name: item.crdfd_Tinhthanh?.crdfd_name || "",
      cr1bb_vungmien: item.crdfd_Tinhthanh?.new_vungmienfx || null,
      cr1bb_vungmien_text: item.crdfd_Tinhthanh?.new_vungmienfx || "",
    }));

    // Log customers with district keys for debugging
    const customersWithDistrictKeys = customers.filter((c: any) => c.crdfd_keyquanhuyen);

    // Cache the result only if it should be cached
    if (shouldCacheResponse(200, customers)) {
      setCachedResponse(cacheKey, customers);
    }

    res.status(200).json(customers);
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      error: "Error fetching customers",
      details: error.message,
    });
  }
}

