import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const DISTRICT_TABLE = "crdfd_quanhuyens";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { keyAuto, name } = req.query;

    if ((!keyAuto || typeof keyAuto !== "string") && (!name || typeof name !== "string")) {
      return res.status(400).json({ error: "keyAuto or name parameter is required" });
    }

    // Check cache first
    const cacheKey = getCacheKey("districts", { keyAuto, name });
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse !== undefined) {
      return res.status(200).json(cachedResponse);
    }

    const headers = {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Build filter for active districts with matching key or name
    let filter = "statecode eq 0";
    if (keyAuto && typeof keyAuto === "string") {
      filter += ` and cr1bb_keyauto eq '${String(keyAuto).replace(/'/g, "''")}'`;
    } else if (name && typeof name === "string") {
      filter += ` and crdfd_name eq '${String(name).replace(/'/g, "''")}'`;
    }

    const columns = "crdfd_quanhuyenid,crdfd_name,cr1bb_leadtimetheoca";
    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$top=1`;
    const endpoint = `${BASE_URL}${DISTRICT_TABLE}?${query}`;

    console.log("🔍 [API Districts] endpoint:", endpoint);

    // Use deduplication for district queries
    const dedupKey = getDedupKey(DISTRICT_TABLE, { keyAuto });
    console.log('🔍 [API Districts] Fetching district for keyAuto:', keyAuto);
    console.log('🔍 [API Districts] Query endpoint:', endpoint);

    const response = await deduplicateRequest(dedupKey, () =>
      axiosClient.get(endpoint, { headers })
    );

    const district = response.data.value[0];
    const leadtime = district ? Number(district.cr1bb_leadtimetheoca) || 0 : 0;

    console.log('📊 [API Districts] Raw district data:', district);
    console.log('📊 [API Districts] Parsed leadtime:', leadtime);

    const result = {
      keyAuto,
      leadtime: leadtime,
      districtId: district?.crdfd_quanhuyenid || null,
      districtName: district?.crdfd_name || null
    };

    console.log('✅ [API Districts] Final result:', result);

    // Cache the result
    setCachedResponse(cacheKey, result);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching district leadtime:", error);
    return res.status(500).json({
      error: "Failed to fetch district leadtime",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
