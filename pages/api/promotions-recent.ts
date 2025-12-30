import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const PROMOTION_TABLE = "crdfd_promotions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return res.status(500).json({ error: "Failed to obtain access token" });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    const columns = [
      "crdfd_promotionid",
      "crdfd_name",
      "crdfd_value_co_vat",
      "crdfd_vn",
      "cr1bb_urlimage",
      "crdfd_start_date",
      "crdfd_end_date",
      "crdfd_masanpham_multiple"
    ].join(",");

    // Fetch 5 newest promotions by start date (newest first)
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      "statecode eq 0 and crdfd_promotion_deactive eq 'Active'"
    )}&$orderby=crdfd_start_date desc&$top=1`;

    const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;
    const response = await axios.get(endpoint, { headers });
    const first = (response.data?.value || [])[0] || null;
    if (!first) {
      return res.status(200).json(null);
    }

    const item = {
      id: first.crdfd_promotionid,
      name: first.crdfd_name,
      valueWithVat: first.crdfd_value_co_vat || first.crdfd_value || "",
      vn: first.crdfd_vn || first.cr1bb_vn || "",
      image: first.cr1bb_urlimage || "",
      startDate: first.crdfd_start_date,
      endDate: first.crdfd_end_date,
      productCodes: first.crdfd_masanpham_multiple || ""
    };

    res.status(200).json(item);
  } catch (error: any) {
    console.error("Error fetching recent promotions:", error?.response?.data || error.message);
    res.status(500).json({ error: "Error fetching recent promotions", details: error?.message || error });
  }
}


