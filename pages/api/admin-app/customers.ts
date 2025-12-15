import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

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
    const token = await getAccessToken();

    if (!token) {
      return res.status(401).json({ error: "Failed to obtain access token" });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Build filter
    let filter = "statecode eq 0";
    if (search && typeof search === "string" && search.trim()) {
      const searchTerm = search.trim();
      filter += ` and (contains(crdfd_name, '${searchTerm}') or contains(cr44a_st, '${searchTerm}') or contains(crdfd_phone2, '${searchTerm}'))`;
    }

    const columns = "crdfd_customerid,crdfd_name,cr44a_st,crdfd_phone2";
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&$orderby=crdfd_name&$top=100`;

    const endpoint = `${BASE_URL}${CUSTOMER_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });

    const customers = (response.data.value || []).map((item: any) => ({
      crdfd_customerid: item.crdfd_customerid,
      crdfd_name: item.crdfd_name || "",
      cr44a_st: item.cr44a_st || "",
      crdfd_phone2: item.crdfd_phone2 || "",
    }));

    res.status(200).json(customers);
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      error: "Error fetching customers",
      details: error.message,
    });
  }
}

