import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const QUOTE_DETAIL_TABLE = "crdfd_baogiachitiets";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCode, unitId, region, isVatOrder } = req.query;
    if (!productCode || typeof productCode !== "string" || !productCode.trim()) {
      return res.status(400).json({ error: "productCode is required" });
    }

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

    // Active records with price, matching product code (and unit if provided)
    const safeCode = productCode.replace(/'/g, "''");
    const filters = [
      "statecode eq 0", // active
      "crdfd_pricingdeactive eq 191920001", // Pricing Active
      `crdfd_masanpham eq '${safeCode}'`,
      "(crdfd_gia ne null or cr1bb_giakhongvat ne null)",
    ];
    if (unitId && typeof unitId === "string" && unitId.trim()) {
      const safeUnit = unitId.replace(/'/g, "''");
      // Try both lookup and text field
      filters.push(`(crdfd_onvichuan eq '${safeUnit}' or crdfd_onvichuantext eq '${safeUnit}')`);
    }

    // Add region filter for non-VAT orders
    // For VAT orders (isVatOrder === 'true'), keep existing logic (no region filter)
    // For non-VAT orders (isVatOrder === 'false') with region, filter by crdfd_nhomoituongtext
    const isVatOrderBool = isVatOrder === "true";
    if (!isVatOrderBool && region && typeof region === "string" && region.trim()) {
      const safeRegion = region.replace(/'/g, "''");
      filters.push(`crdfd_nhomoituongtext eq '${safeRegion}'`);
    }

    const filter = filters.join(" and ");
    const columns =
      "crdfd_baogiachitietid,crdfd_masanpham,crdfd_gia,cr1bb_giakhongvat,crdfd_onvichuantext,crdfd_onvichuan";
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&$top=1`;

    const endpoint = `${BASE_URL}${QUOTE_DETAIL_TABLE}?${query}`;
    const response = await axios.get(endpoint, { headers });

    const first = response.data.value?.[0];
    const result = first
      ? {
        price: first.crdfd_gia ?? null,
        priceNoVat: first.cr1bb_giakhongvat ?? null,
        unitName: first.crdfd_onvichuantext || first.crdfd_onvichuan || undefined,
      }
      : { price: null, priceNoVat: null };

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error fetching product price:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error fetching product price",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }

    res.status(500).json({
      error: "Error fetching product price",
      details: error.message,
    });
  }
}

