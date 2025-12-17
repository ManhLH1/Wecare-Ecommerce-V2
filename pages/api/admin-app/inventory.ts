import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const INVENTORY_TABLE = "cr44a_inventoryweshops";
const KHO_BD_TABLE = "crdfd_kho_binh_dinhs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCode, warehouseName, isVatOrder } = req.query;
    const token = await getAccessToken();

    if (!token) {
      return res.status(401).json({ error: "Failed to obtain access token" });
    }

    if (
      !productCode ||
      typeof productCode !== "string" ||
      !productCode.trim()
    ) {
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

    // Decide data source:
    // - Non VAT: Inventory Weshops (cr44a_inventoryweshops)
    // - VAT: Kho Bình Định (crdfd_kho_binh_dinhs) with field cr1bb_tonkholythuyetbomua
    const useKhoBinhDinh =
      typeof isVatOrder === "string"
        ? isVatOrder === "true"
        : !!isVatOrder;

    if (useKhoBinhDinh) {
      // Query Kho Bình Định
      let filter = `crdfd_masp eq '${productCode.trim()}' and statecode eq 0`;
      if (
        warehouseName &&
        typeof warehouseName === "string" &&
        warehouseName.trim()
      ) {
        const safeName = warehouseName.trim().replace(/'/g, "''");
        filter += ` and crdfd_vitrikhofx eq '${safeName}'`;
      }
      const columns =
        "crdfd_kho_binh_dinhid,crdfd_masp,cr1bb_tonkholythuyetbomua,crdfd_vitrikhofx";
      const query = `$select=${columns}&$filter=${encodeURIComponent(
        filter
      )}&$top=1`;
      const endpoint = `${BASE_URL}${KHO_BD_TABLE}?${query}`;
      const response = await axios.get(endpoint, { headers });
      const first = (response.data.value || [])[0];
      const result = {
        productCode: first?.crdfd_masp || productCode,
        warehouseName:
            first?.crdfd_vitrikhofx ||
          warehouseName ||
          null,
        theoreticalStock: first?.cr1bb_tonkholythuyetbomua ?? 0,
        actualStock: null,
      };
      return res.status(200).json(result);
    } else {
      // Inventory Weshops
      const safeCode = productCode.trim().replace(/'/g, "''");
      const safeWarehouse =
        warehouseName && typeof warehouseName === "string" && warehouseName.trim()
          ? warehouseName.trim().replace(/'/g, "''")
          : null;

      const queryInventory = async (preferCrdfd: boolean) => {
        const codeField = preferCrdfd ? "crdfd_masanpham" : "cr44a_masanpham";
        let filter = `${codeField} eq '${safeCode}' and statecode eq 0`;
        if (safeWarehouse) {
          filter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
        }
        const columns = preferCrdfd
          ? "cr44a_inventoryweshopid,crdfd_masanpham,cr44a_soluongtonlythuyet,cr44a_soluongtonthucte,cr1bb_vitrikhotext"
          : "cr44a_inventoryweshopid,cr44a_masanpham,cr44a_soluongtonlythuyet,cr44a_soluongtonthucte,cr1bb_vitrikhotext";
        const query = `$select=${columns}&$filter=${encodeURIComponent(
          filter
        )}&$top=1`;
        const endpoint = `${BASE_URL}${INVENTORY_TABLE}?${query}`;
        
        console.log(`[Inventory API] Querying: ${endpoint}`);
        const response = await axios.get(endpoint, { headers });
        const results = response.data.value || [];
        const first = results[0];
        
        console.log(`[Inventory API] Results count: ${results.length}`, {
          productCode: safeCode,
          warehouseName: safeWarehouse,
          found: !!first,
          theoreticalStock: first?.cr44a_soluongtonlythuyet,
          actualStock: first?.cr44a_soluongtonthucte,
        });
        
        // If no result with warehouse filter, try without warehouse filter
        if (!first && safeWarehouse) {
          console.log(`[Inventory API] No result with warehouse filter, trying without warehouse...`);
          const fallbackFilter = `${codeField} eq '${safeCode}' and statecode eq 0`;
          const fallbackQuery = `$select=${columns}&$filter=${encodeURIComponent(
            fallbackFilter
          )}&$top=1`;
          const fallbackEndpoint = `${BASE_URL}${INVENTORY_TABLE}?${fallbackQuery}`;
          const fallbackResponse = await axios.get(fallbackEndpoint, { headers });
          const fallbackResults = fallbackResponse.data.value || [];
          const fallbackFirst = fallbackResults[0];
          
          if (fallbackFirst) {
            console.log(`[Inventory API] Found result without warehouse filter:`, {
              theoreticalStock: fallbackFirst?.cr44a_soluongtonlythuyet,
              warehouseName: fallbackFirst?.cr1bb_vitrikhotext,
            });
            return {
              productCode:
                (preferCrdfd ? fallbackFirst?.crdfd_masanpham : fallbackFirst?.cr44a_masanpham) ||
                fallbackFirst?.cr44a_masanpham ||
                productCode,
              warehouseName: fallbackFirst?.cr1bb_vitrikhotext || warehouseName || null,
              theoreticalStock: fallbackFirst?.cr44a_soluongtonlythuyet ?? 0,
              actualStock: fallbackFirst?.cr44a_soluongtonthucte ?? 0,
            };
          }
        }
        
        return {
          productCode:
            (preferCrdfd ? first?.crdfd_masanpham : first?.cr44a_masanpham) ||
            first?.cr44a_masanpham ||
            productCode,
          warehouseName: first?.cr1bb_vitrikhotext || warehouseName || null,
          theoreticalStock: first?.cr44a_soluongtonlythuyet ?? 0,
          actualStock: first?.cr44a_soluongtonthucte ?? 0,
        };
      };

      try {
        const result = await queryInventory(true);
        return res.status(200).json(result);
      } catch (err: any) {
        const message: string | undefined =
          err?.response?.data?.error?.message || err?.message;
        const isPropertyError =
          err?.response?.status === 400 &&
          typeof message === "string" &&
          message.includes("Could not find a property named");
        if (isPropertyError) {
          // Retry with alternative field cr44a_masanpham
          const result = await queryInventory(false);
          return res.status(200).json(result);
        }
        throw err;
      }
    }
  } catch (error: any) {
    console.error("Error fetching inventory:", error);

    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: "Error fetching inventory",
        details:
          error.response.data?.error?.message ||
          error.response.data?.error ||
          error.message,
      });
    }

    res.status(500).json({
      error: "Error fetching inventory",
      details: error.message,
    });
  }
}


