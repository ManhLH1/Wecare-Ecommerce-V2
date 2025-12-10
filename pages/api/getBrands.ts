import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import http from "http";
import https from "https";
import { getAccessToken } from "./getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
  },
  timeout: 60000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getAccessToken();

    // Fetch minimal product data for brands only
    const table = "crdfd_productses";
    const select = "$select=crdfd_thuonghieu&$filter=" + encodeURIComponent("statecode eq 0 and crdfd_thuonghieu ne null and crdfd_thuonghieu ne ''");

    const response = await api.get(`${table}?${select}&$top=5000`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const items: Array<{ crdfd_thuonghieu?: string }> = response.data?.value || [];

    // Build unique sorted brand list and filter out invalid ones
    const set = new Set<string>();
    for (const it of items) {
      const raw = (it.crdfd_thuonghieu || "").trim();
      if (!raw) continue;
      // Remove brands that are '_' or '.' or contain these characters
      if (raw === "_" || raw === "." || raw.includes("_") || raw.includes(".")) continue;
      set.add(raw);
    }
    const allBrands = Array.from(set).sort((a, b) => a.localeCompare(b));

    // Return only first 50 for payload size, but include total count
    const brands = allBrands.slice(0, 50);
    return res.status(200).json({ brands, total: allBrands.length });
  } catch (err: any) {
    return res.status(500).json({ error: true, message: err?.message || "Failed to load brands" });
  }
}


