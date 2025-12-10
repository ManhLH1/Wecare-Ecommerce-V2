import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

// Dataverse base URL
const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

// Entity set dataverse
const PRODUCT_GROUP_ENTITY_SET = "crdfd_productgroups";
const token = await getAccessToken();
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "OData-MaxVersion": "4.0",
  "OData-Version": "4.0",
};
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const statecode = Array.isArray(req.query.statecode)
      ? req.query.statecode[0]
      : req.query.statecode ?? "0";

    const extraFilter = Array.isArray(req.query.filter)
      ? req.query.filter[0]
      : req.query.filter || "";

      let filter = `statecode eq ${statecode} and crdfd_sosanpham gt 0`;
      if (extraFilter) filter += ` and (${extraFilter})`;
      
      const query = `?$select=crdfd_productgroupid&$filter=${filter}&$count=true`;
      const endpoint = `${BASE_URL}${PRODUCT_GROUP_ENTITY_SET}${query}`;

      const response = await axios.get(endpoint, {
        headers: { ...headers, Prefer: "odata.maxpagesize=5000" },
      });

      const count =
        typeof response.data["@odata.count"] === "number"
          ? response.data["@odata.count"]
          : Array.isArray(response.data.value)
          ? response.data.value.length
          : 0;

      // console.log("Sum productgroups:", count);
    return res.status(200).json({ count, filter: filter });
  } catch (error: any) {
    const status = error?.response?.status || 500;
    return res.status(status).json({
      message: "Failed to count productgroups",
      error: error?.response?.data || error?.message || "Unknown error",
    });
  }
}
