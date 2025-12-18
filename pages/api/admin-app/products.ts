import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

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

    // Build filter - chỉ lấy sản phẩm không VAT (có thể cần điều chỉnh theo logic thực tế)
    let filter = "statecode eq 0";
    if (search && typeof search === "string" && search.trim()) {
      // Escape single quotes to avoid breaking the OData filter
      const searchTerm = search.trim().replace(/'/g, "''");
      filter +=
        ` and (contains(crdfd_name, '${searchTerm}')` +
        ` or contains(crdfd_fullname, '${searchTerm}')` +
        ` or contains(crdfd_masanpham, '${searchTerm}'))`;
    }

    // Use crdfd_gtgt and cr1bb_banchatgiaphatra (Bản chất giá phát ra)
    // Add crdfd_manhomsp for product group code
    const columns =
      "crdfd_productsid,crdfd_name,crdfd_fullname,crdfd_masanpham,crdfd_unitname,crdfd_gtgt,cr1bb_banchatgiaphatra,crdfd_manhomsp";
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&$orderby=crdfd_name&$top=200`;

    const endpoint = `${BASE_URL}${PRODUCT_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });

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

