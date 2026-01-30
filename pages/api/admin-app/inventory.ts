import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";
import { buildOptimizedInventoryQuery } from "./_utils/dynamicsQueryOptimizer";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const KHO_BD_TABLE = "crdfd_kho_binh_dinhs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCode, warehouseName } = req.query;
    
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
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Always use Kho Bình Định (crdfd_kho_binh_dinhs)
    // Use the provided warehouseName if available, otherwise default to "Kho Bình Định"
    const targetWarehouse = 
      warehouseName && typeof warehouseName === "string" && warehouseName.trim()
        ? warehouseName.trim()
        : "Kho Bình Định";

    // Use optimized query for Kho Bình Định with better filtering
    const { endpoint, headers: optimizedHeaders } = buildOptimizedInventoryQuery(
      productCode.trim(),
      targetWarehouse,
      true
    );

    // Use deduplication (try optimized query, fallback to legacy query on error)
    let first: any = null;
    try {
      const dedupKey = getDedupKey(KHO_BD_TABLE, { productCode, warehouseName });
      const response = await deduplicateRequest(dedupKey, () =>
        axiosClient.get(endpoint, { headers: { ...headers, ...optimizedHeaders } })
      );
      first = (response.data.value || [])[0];
    } catch (optErr) {
      console.warn('Optimized KHO_BD query failed, falling back to legacy query', optErr);
      // Legacy KHO_BD query (safer fallback)
      const conditions: Array<{
        field: string;
        operator: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'contains' | 'startswith' | 'endswith';
        value: any;
      }> = [
        { field: 'crdfd_masp', operator: 'eq', value: productCode.trim() },
        { field: 'statecode', operator: 'eq', value: 0 },
        { field: 'crdfd_vitrikhofx', operator: 'eq', value: targetWarehouse }
      ];
      const filter = conditions.map(({ field, operator, value }, index) => {
        let filterValue: string;
        if (typeof value === 'string') {
          filterValue = `'${value.replace(/'/g, "''")}'`;
        } else if (typeof value === 'boolean') {
          filterValue = value ? 'true' : 'false';
        } else {
          filterValue = String(value);
        }

        let conditionStr: string;
        switch (operator) {
          case 'contains':
            conditionStr = `contains(${field},${filterValue})`;
            break;
          case 'startswith':
            conditionStr = `startswith(${field},${filterValue})`;
            break;
          case 'endswith':
            conditionStr = `endswith(${field},${filterValue})`;
            break;
          default:
            conditionStr = `${field} ${operator} ${filterValue}`;
        }

        return conditionStr;
      }).join(' and ');
      const columns =
        "crdfd_kho_binh_dinhid,crdfd_masp,cr1bb_tonkholythuyetbomua,cr1bb_soluonganggiuathang,crdfd_vitrikhofx";
      const legacyQuery = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$top=1`;
      const legacyEndpoint = `${BASE_URL}${KHO_BD_TABLE}?${legacyQuery}`;

      const dedupKeyLegacy = getDedupKey(KHO_BD_TABLE, { productCode, warehouseName, legacy: true });
      const legacyResponse = await deduplicateRequest(dedupKeyLegacy, () =>
        axiosClient.get(legacyEndpoint, { headers })
      );
      first = (legacyResponse.data.value || [])[0];
    }
    
    // Inventory from cr1bb_tonkholythuyetbomua
    const currentInventory = first?.cr1bb_tonkholythuyetbomua ?? 0;
    
    // ReservedQuantity = cr1bb_soluonganggiuathang (cột giữ hàng ở Kho Bình Định)
    let reservedQuantity = first?.cr1bb_soluonganggiuathang ?? 0;
    
    const availableToSell = currentInventory - reservedQuantity;
    
    const result = {
      productCode: first?.crdfd_masp || productCode,
      warehouseName: first?.crdfd_vitrikhofx || targetWarehouse || null,
      theoreticalStock: currentInventory, // CurrentInventory
      actualStock: null,
      reservedQuantity: reservedQuantity, // Số lượng đang giữ đơn
      availableToSell: availableToSell, // AvailableToSell = CurrentInventory - ReservedQuantity
    };
    
    return res.status(200).json(result);
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


