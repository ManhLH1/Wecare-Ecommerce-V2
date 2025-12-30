import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const PRODUCT_TABLE = "crdfd_productses";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { codes } = req.query;
    if (!codes) return res.status(400).json({ error: "codes query is required" });

    const codeList = Array.isArray(codes) ? codes.join(",") : String(codes);
    const productCodes = codeList.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 50);
    if (!productCodes.length) return res.status(400).json({ error: "no product codes provided" });

    const token = await getAccessToken();
    if (!token) return res.status(500).json({ error: "Failed to obtain access token" });

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Prefer: "odata.maxpagesize=5000",
    };

    const columns = [
      "crdfd_productsid",
      "crdfd_fullname",
      "crdfd_masanpham",
      "cr1bb_json_gia",
      "crdfd_gtgt",
      "cr1bb_imageurlproduct",
      "cr1bb_imageurl"
    ].join(",");

    const filters = productCodes.map(code => `crdfd_masanpham eq '${code.replace(/'/g, "''")}'`).join(" or ");
    const query = `$select=${columns}&$filter=${encodeURIComponent(`statecode eq 0 and (${filters})`)}`;
    const endpoint = `${BASE_URL}${PRODUCT_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });
    // Helper: recursively search object for numeric price with priority keys
    const findNumericPrice = (obj: any): number | null => {
      if (!obj || (typeof obj !== "object" && typeof obj !== "string")) return null;
      if (typeof obj === "string") {
        const n = Number(String(obj).replace(/[^\d.-]/g, ""));
        return Number.isNaN(n) ? null : n;
      }

      // prioritize common price keys
      const priorityKeys = [
        "price",
        "giaban",
        "cr1bb_giaban",
        "regularPrice",
        "gia",
        "crdfd_giatheovc",
        "crdfd_giath eovc",
        "value",
        "amount",
        "listPrice",
      ];

      for (const key of priorityKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const v = obj[key];
          const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
          if (!Number.isNaN(n)) return n;
        }
      }

      // deep search a few levels
      for (const k of Object.keys(obj)) {
        try {
          const child = obj[k];
          if (child && typeof child === "object") {
            const found = findNumericPrice(child);
            if (found !== null) return found;
          } else if (child !== undefined && child !== null) {
            const n = Number(String(child).replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(n) && n > 0) return n;
          }
        } catch (e) {
          continue;
        }
      }

      return null;
    };

    const items = (response.data?.value || []).map((p: any) => {
      let parsedPrice: number | null = null;
      let priceJsonParsed: any = null;
      let priceJsonFormatted: string | null = null;

      if (p.cr1bb_json_gia) {
        try {
          priceJsonParsed = typeof p.cr1bb_json_gia === "string" ? JSON.parse(p.cr1bb_json_gia) : p.cr1bb_json_gia;
          priceJsonFormatted = JSON.stringify(priceJsonParsed, null, 2);
          parsedPrice = findNumericPrice(priceJsonParsed);
        } catch (e) {
          priceJsonFormatted = String(p.cr1bb_json_gia);
        }
      }

      // Fallback to cr1bb_giaban field on product if present
      if ((parsedPrice === null || parsedPrice === 0) && p.cr1bb_giaban) {
        const n = Number(String(p.cr1bb_giaban).replace(/[^\d.-]/g, ""));
        if (!Number.isNaN(n)) parsedPrice = n;
      }

      return {
        id: p.crdfd_productsid,
        name: p.crdfd_fullname,
        code: p.crdfd_masanpham,
        price: parsedPrice,
        priceJson: p.cr1bb_json_gia,
        priceJsonParsed,
        priceJsonFormatted,
        vat: p.crdfd_gtgt,
        image: p.cr1bb_imageurlproduct || p.cr1bb_imageurl || "",
      };
    });

    res.status(200).json(items);
  } catch (error: any) {
    console.error("Error fetching products by codes:", error?.response?.data || error.message);
    res.status(500).json({ error: "Error fetching products", details: error?.message || error });
  }
}


