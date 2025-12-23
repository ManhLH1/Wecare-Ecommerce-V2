import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const CUSTOMER_TABLE = "crdfd_customers";
const WAREHOUSE_TABLE = "crdfd_khowecares";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customerId, customerCode } = req.query;
    
    if (!customerId && !customerCode) {
      return res.status(400).json({ error: "customerId or customerCode is required" });
    }

    // Check cache first
    const cacheKey = getCacheKey("warehouses", { customerId, customerCode });
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse !== undefined) {
      return res.status(200).json(cachedResponse);
    }

    const headers = {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Step 1: Get customer info with Vị trí kho and Vị trí kho phụ
    let customerFilter = "statecode eq 0";
    if (customerId && typeof customerId === "string") {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      if (isGuid) {
        customerFilter += ` and crdfd_customerid eq ${customerId}`;
      } else {
        customerFilter += ` and crdfd_customerid eq '${customerId}'`;
      }
    } else if (customerCode && typeof customerCode === "string") {
      customerFilter += ` and cr44a_makhachhang eq '${customerCode}'`;
    }

    const customerColumns = "crdfd_customerid,cr44a_makhachhang,wc001_VItrikho,cr1bb_vitrikhophu";
    const customerExpand = "$expand=wc001_VItrikho($select=crdfd_khowecareid,crdfd_name)";
    const customerQuery = `$select=${customerColumns}&$filter=${encodeURIComponent(customerFilter)}&${customerExpand}`;
    const customerEndpoint = `${BASE_URL}${CUSTOMER_TABLE}?${customerQuery}`;

    // Use deduplication
    const customerDedupKey = getDedupKey(`${CUSTOMER_TABLE}-warehouses`, { customerId, customerCode });
    const customerResponse = await deduplicateRequest(customerDedupKey, () =>
      axiosClient.get(customerEndpoint, { headers })
    );
    const customers = customerResponse.data.value || [];

    if (customers.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customers[0];
    const mainWarehouse = customer.wc001_VItrikho;
    const mainWarehouseName = mainWarehouse?.crdfd_name || "";
    
    // Get Vị trí kho phụ (multi-select field)
    // Multi-select picklist returns as array of option set values (numbers)
    // Map option set values to text: 283640000="Kho Bình Định", 283640001="Kho Khánh Hòa", 283640002="Kho Tp. Hồ Chí Minh"
    const optionSetMapping: { [key: string]: string } = {
      "283640000": "Kho Bình Định",
      "283640001": "Kho Khánh Hòa",
      "283640002": "Kho Tp. Hồ Chí Minh"
    };
    
    const subWarehousesRaw = customer.cr1bb_vitrikhophu;
    let subWarehouseNames: string[] = [];
    
    if (subWarehousesRaw) {
      if (Array.isArray(subWarehousesRaw)) {
        // Map option set values to text
        subWarehouseNames = subWarehousesRaw
          .map((w: any) => {
            const valueStr = String(w || '');
            // If it's an option set value (number), map to text
            if (optionSetMapping[valueStr]) {
              return optionSetMapping[valueStr];
            }
            // If already text, use directly
            if (typeof w === 'string') return w;
            if (w?.crdfd_name) return w.crdfd_name;
            return valueStr;
          })
          .filter(Boolean);
      } else if (typeof subWarehousesRaw === 'string') {
        subWarehouseNames = [subWarehousesRaw];
      } else if (typeof subWarehousesRaw === 'number') {
        const mapped = optionSetMapping[String(subWarehousesRaw)];
        if (mapped) subWarehouseNames = [mapped];
      }
    }

    // Step 2: Filter Kho WECARE
    // Logic: 'Tên kho' = Vị trí kho chính OR 'Tên kho' in danh sách Vị trí kho phụ
    let warehouseFilter = "statecode eq 0";
    
    const warehouseConditions: string[] = [];
    if (mainWarehouseName) {
      warehouseConditions.push(`crdfd_name eq '${mainWarehouseName.replace(/'/g, "''")}'`);
    }
    
    if (subWarehouseNames.length > 0) {
      const subConditions = subWarehouseNames
        .map(name => `crdfd_name eq '${name.replace(/'/g, "''")}'`)
        .join(' or ');
      warehouseConditions.push(`(${subConditions})`);
    }

    if (warehouseConditions.length === 0) {
      // If no warehouse conditions, return empty array
      return res.status(200).json([]);
    }

    warehouseFilter += ` and (${warehouseConditions.join(' or ')})`;

    const warehouseColumns = "crdfd_khowecareid,crdfd_name,crdfd_makho";
    const warehouseQuery = `$select=${warehouseColumns}&$filter=${encodeURIComponent(warehouseFilter)}&$orderby=crdfd_name&$top=500`;
    const warehouseEndpoint = `${BASE_URL}${WAREHOUSE_TABLE}?${warehouseQuery}`;

    // Use deduplication
    const warehouseDedupKey = getDedupKey(WAREHOUSE_TABLE, { mainWarehouseName, subWarehouseNames: subWarehouseNames.join(",") });
    const warehouseResponse = await deduplicateRequest(warehouseDedupKey, () =>
      axiosClient.get(warehouseEndpoint, { headers })
    );

    const warehouses = (warehouseResponse.data.value || []).map((item: any) => ({
      crdfd_khowecareid: item.crdfd_khowecareid || item.crdfd_khowecare_id || '',
      crdfd_name: item.crdfd_name || "",
      crdfd_makho: item.crdfd_makho || "",
    }));

    // Cache the result
    setCachedResponse(cacheKey, warehouses);

    res.status(200).json(warehouses);
  } catch (error: any) {
    console.error("Error fetching warehouses:", error);
    
    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      
      return res.status(error.response.status || 500).json({
        error: "Error fetching warehouses",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }
    
    res.status(500).json({
      error: "Error fetching warehouses",
      details: error.message,
    });
  }
}

