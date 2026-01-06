import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

// Dataverse base URL
const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

// Entity set dataverse
const PRODUCT_ENTITY_SET = "crdfd_productses";

// ISR configuration - regenerate every 30 minutes
export const config = {
  unstable_runtimeISR: true,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get fresh token for each request
    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    const statecode = Array.isArray(req.query.statecode)
      ? req.query.statecode[0]
      : req.query.statecode ?? "0";

    const extraFilter = Array.isArray(req.query.filter)
      ? req.query.filter[0]
      : req.query.filter || "";

      let filter = `statecode eq ${statecode}`;
      if (extraFilter) filter += ` and (${extraFilter})`;

      // Use direct count query instead of iterating through pages for better performance
      const query = `?$select=crdfd_productsid&$filter=${filter}&$count=true&$top=1`;
      const endpoint = `${BASE_URL}${PRODUCT_ENTITY_SET}${query}`;

      const response = await axios.get(endpoint, { headers });

      // The @odata.count field contains the total count
      const count = response.data["@odata.count"] || 0;

      // Set ISR headers for caching
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');

    return res.status(200).json({ count, filter });
  } catch (error: any) {
    const status = error?.response?.status || 500;
    return res.status(status).json({
      message: "Failed to count products",
      error: error?.response?.data || error?.message || "Unknown error",
    });
  }
}
