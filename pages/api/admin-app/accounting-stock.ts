import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const ACCOUNTING_STOCK_TABLE = "cr44a_tonkhoketoans";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCode, isVatOrder } = req.query;
    const token = await getAccessToken();

    if (!token) {
      return res.status(401).json({ error: "Failed to obtain access token" });
    }

    if (!productCode || typeof productCode !== "string" || !productCode.trim()) {
      return res
        .status(400)
        .json({ error: "productCode (Mã sản phẩm) is required" });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    const isVat =
      typeof isVatOrder === "string"
        ? isVatOrder === "true"
        : !!isVatOrder;

    // Tenthuongmaitext:
    // - Có VAT  => WECARE
    // - Không VAT => WESHOP (theo logic PowerApps)
    const thuongMaiText = isVat ? "WECARE" : "WESHOP";

    // Build filter
    const safeCode = productCode.trim().replace(/'/g, "''");
    const safeThuongMai = thuongMaiText.replace(/'/g, "''");
    const filter = `cr1bb_masanpham eq '${safeCode}' and cr1bb_tenthuongmaitext eq '${safeThuongMai}' and statecode eq 0`;

    const columns =
      "cr44a_tonkhoketoanid,cr1bb_masanpham,cr1bb_tenthuongmaitext,cr44a_tonlythuyet";

    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$top=1`;
    const endpoint = `${BASE_URL}${ACCOUNTING_STOCK_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });
    const first = (response.data.value || [])[0];

    const result = {
      productCode: first?.cr1bb_masanpham || productCode,
      tenthuongmaitext: first?.cr1bb_tenthuongmaitext || thuongMaiText,
      accountingStock: first?.cr44a_tonlythuyet ?? null,
    };

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error fetching accounting stock:", error);

    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: "Error fetching accounting stock",
        details:
          error.response.data?.error?.message ||
          error.response.data?.error ||
          error.message,
      });
    }

    res.status(500).json({
      error: "Error fetching accounting stock",
      details: error.message,
    });
  }
}

