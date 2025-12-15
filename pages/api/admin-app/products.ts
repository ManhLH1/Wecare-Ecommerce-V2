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
      const searchTerm = search.trim();
      filter += ` and (contains(crdfd_name, '${searchTerm}') or contains(crdfd_fullname, '${searchTerm}') or contains(crdfd_masanpham, '${searchTerm}'))`;
    }

    const columns =
      "crdfd_productsid,crdfd_name,crdfd_fullname,crdfd_masanpham,crdfd_unitname";
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
    }));

    res.status(200).json(products);
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      error: "Error fetching products",
      details: error.message,
    });
  }
}

