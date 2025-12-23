import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

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
      // CurrentInventory = cr1bb_tonkholythuyetbomua (hoặc crdfd_tonkholythuyet)
      // ReservedQuantity = cr1bb_soluonganggiuathang (cột giữ hàng ở Kho Bình Định)
      // AvailableToSell = CurrentInventory - ReservedQuantity
      let filter = `crdfd_masp eq '${productCode.trim()}' and statecode eq 0`;
      if (
        warehouseName &&
        typeof warehouseName === "string" &&
        warehouseName.trim()
      ) {
        const safeName = warehouseName.trim().replace(/'/g, "''");
        filter += ` and crdfd_vitrikhofx eq '${safeName}'`;
      }
      // Query với cr1bb_tonkholythuyetbomua (CurrentInventory) và cr1bb_soluonganggiuathang (ReservedQuantity)
      const columns =
        "crdfd_kho_binh_dinhid,crdfd_masp,cr1bb_tonkholythuyetbomua,crdfd_tonkholythuyet,cr1bb_soluonganggiuathang,crdfd_vitrikhofx";
      const query = `$select=${columns}&$filter=${encodeURIComponent(
        filter
      )}&$top=1`;
      const endpoint = `${BASE_URL}${KHO_BD_TABLE}?${query}`;
      
      // Use deduplication
      const dedupKey = getDedupKey(KHO_BD_TABLE, { productCode, warehouseName });
      const response = await deduplicateRequest(dedupKey, () =>
        axiosClient.get(endpoint, { headers })
      );
      const first = (response.data.value || [])[0];
      
      // CurrentInventory = cr1bb_tonkholythuyetbomua (ưu tiên), fallback về crdfd_tonkholythuyet
      let currentInventory = first?.cr1bb_tonkholythuyetbomua ?? 0;
      if (currentInventory === 0 && first?.crdfd_tonkholythuyet) {
        currentInventory = first.crdfd_tonkholythuyet ?? 0;
      }
      // ReservedQuantity = cr1bb_soluonganggiuathang (cột giữ hàng ở Kho Bình Định)
      let reservedQuantity = first?.cr1bb_soluonganggiuathang ?? 0;
      
      const availableToSell = currentInventory - reservedQuantity;
      
      const result = {
        productCode: first?.crdfd_masp || productCode,
        warehouseName:
            first?.crdfd_vitrikhofx ||
          warehouseName ||
          null,
        theoreticalStock: currentInventory, // CurrentInventory
        actualStock: null,
        reservedQuantity: reservedQuantity, // Số lượng đang giữ đơn
        availableToSell: availableToSell, // AvailableToSell = CurrentInventory - ReservedQuantity
      };
      
      // Cache the result
      setCachedResponse(cacheKey, result, true);
      
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
        // CurrentInventory = cr44a_soluongtonlythuyet
        // ReservedQuantity = cr1bb_soluonglythuyetgiuathang (cột giữ hàng ở inventory)
        const columns = preferCrdfd
          ? "cr44a_inventoryweshopid,crdfd_masanpham,cr44a_soluongtonlythuyet,cr44a_soluongtonthucte,cr1bb_soluonglythuyetgiuathang,cr1bb_vitrikhotext"
          : "cr44a_inventoryweshopid,cr44a_masanpham,cr44a_soluongtonlythuyet,cr44a_soluongtonthucte,cr1bb_soluonglythuyetgiuathang,cr1bb_vitrikhotext";
        const query = `$select=${columns}&$filter=${encodeURIComponent(
          filter
        )}&$top=1`;
        const endpoint = `${BASE_URL}${INVENTORY_TABLE}?${query}`;
        
        // Use deduplication
        const dedupKey = getDedupKey(INVENTORY_TABLE, { productCode, warehouseName, preferCrdfd });
        const response = await deduplicateRequest(dedupKey, () =>
          axiosClient.get(endpoint, { headers })
        );
        const results = response.data.value || [];
        const first = results[0];
        
        // If no result with warehouse filter, try without warehouse filter
        if (!first && safeWarehouse) {
          const fallbackFilter = `${codeField} eq '${safeCode}' and statecode eq 0`;
          const fallbackQuery = `$select=${columns}&$filter=${encodeURIComponent(
            fallbackFilter
          )}&$top=1`;
          const fallbackEndpoint = `${BASE_URL}${INVENTORY_TABLE}?${fallbackQuery}`;
          
          // Use deduplication
          const fallbackDedupKey = getDedupKey(INVENTORY_TABLE, { productCode, preferCrdfd, fallback: true });
          const fallbackResponse = await deduplicateRequest(fallbackDedupKey, () =>
            axiosClient.get(fallbackEndpoint, { headers })
          );
          const fallbackResults = fallbackResponse.data.value || [];
          const fallbackFirst = fallbackResults[0];
          
          if (fallbackFirst) {
            const theoretical = fallbackFirst?.cr44a_soluongtonlythuyet ?? 0;
            // ReservedQuantity = cr1bb_soluonglythuyetgiuathang (cột giữ hàng ở inventory)
            const reserved = fallbackFirst?.cr1bb_soluonglythuyetgiuathang ?? 0;
            const available = theoretical - reserved;
            
            const fallbackResult = {
              productCode:
                (preferCrdfd ? fallbackFirst?.crdfd_masanpham : fallbackFirst?.cr44a_masanpham) ||
                fallbackFirst?.cr44a_masanpham ||
                productCode,
              warehouseName: fallbackFirst?.cr1bb_vitrikhotext || warehouseName || null,
              theoreticalStock: theoretical,
              actualStock: fallbackFirst?.cr44a_soluongtonthucte ?? 0,
              reservedQuantity: reserved,
              availableToSell: available,
            };
            
            // Cache the fallback result
            setCachedResponse(cacheKey, fallbackResult, true);
            
            return fallbackResult;
          }
        }
        
        const theoretical = first?.cr44a_soluongtonlythuyet ?? 0;
        // ReservedQuantity = cr1bb_soluonglythuyetgiuathang (cột giữ hàng ở inventory)
        const reserved = first?.cr1bb_soluonglythuyetgiuathang ?? 0;
        const available = theoretical - reserved;
        
        const result = {
          productCode:
            (preferCrdfd ? first?.crdfd_masanpham : first?.cr44a_masanpham) ||
            first?.cr44a_masanpham ||
            productCode,
          warehouseName: first?.cr1bb_vitrikhotext || warehouseName || null,
          theoreticalStock: theoretical,
          actualStock: first?.cr44a_soluongtonthucte ?? 0,
          reservedQuantity: reserved,
          availableToSell: available,
        };
        
        // Cache the result
        setCachedResponse(cacheKey, result, true);
        
        return result;
      };

      try {
        const result = await queryInventory(true);
        // Cache already set in queryInventory
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


