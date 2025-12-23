import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const QUOTE_DETAIL_TABLE = "crdfd_baogiachitiets";
const GROUP_KH_TABLE = "cr1bb_groupkhs"; // Group - KH
const CUSTOMER_TABLE = "crdfd_customers";

// Helper function to get customer ID from customerCode or customerId
async function getCustomerId(
  customerCode: string | undefined,
  customerId: string | undefined,
  headers: any
): Promise<string | null> {
  if (customerId) {
    // Validate GUID format
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidPattern.test(customerId)) {
      return customerId;
    }
  }

  if (!customerCode) {
    return null;
  }

  // Check cache first
  const cacheKey = getCacheKey(`customer-id`, { customerCode });
  const cached = getCachedResponse(cacheKey, true); // Use short cache (1 min)
  if (cached !== undefined) {
    return cached;
  }

  // Use deduplication to prevent concurrent requests
  const dedupKey = getDedupKey(`${CUSTOMER_TABLE}-id`, { customerCode });
  
  return deduplicateRequest(dedupKey, async () => {
    try {
      const safeCode = customerCode.replace(/'/g, "''");
      const customerFilter = `statecode eq 0 and cr44a_makhachhang eq '${safeCode}'`;
      const customerQuery = `$select=crdfd_customerid&$filter=${encodeURIComponent(customerFilter)}&$top=1`;
      const customerEndpoint = `${BASE_URL}${CUSTOMER_TABLE}?${customerQuery}`;
      const customerResponse = await axiosClient.get(customerEndpoint, { headers });
      const customer = customerResponse.data.value?.[0];

      const result = customer?.crdfd_customerid || null;
      
      // Cache the result
      setCachedResponse(cacheKey, result, true);
      
      return result;
    } catch (error: any) {
      console.error("❌ [Get Customer ID] Error:", {
        error: error.message,
        response: error.response?.data,
      });
      return null;
    }
  });
}
  
// Helper function to get customer groups (nhóm khách hàng) from cr1bb_groupkh
async function getCustomerGroups(
  customerId: string | null,
  headers: any
): Promise<string[]> {
  if (!customerId) {
    return [];
  }

  // Check cache first
  const cacheKey = getCacheKey(`customer-groups`, { customerId });
  const cached = getCachedResponse(cacheKey, true); // Use short cache (1 min)
  if (cached !== undefined) {
    return cached;
  }

  // Use deduplication to prevent concurrent requests
  const dedupKey = getDedupKey(`${GROUP_KH_TABLE}`, { customerId });
  
  return deduplicateRequest(dedupKey, async () => {
    try {
      // Filter: _cr1bb_khachhang_value eq customerId
      // Select: cr1bb_tennhomkh
      const groupFilter = `_cr1bb_khachhang_value eq ${customerId}`;
      const groupQuery = `$select=cr1bb_tennhomkh&$filter=${encodeURIComponent(groupFilter)}`;
      const groupEndpoint = `${BASE_URL}${GROUP_KH_TABLE}?${groupQuery}`;
      
      const groupResponse = await axiosClient.get(groupEndpoint, { headers });

      const groups = (groupResponse.data.value || [])
        .map((item: any) => item.cr1bb_tennhomkh)
        .filter((text: any): text is string => !!text && typeof text === "string");

      // Cache the result
      setCachedResponse(cacheKey, groups, true);
      
      return groups;
    } catch (error: any) {
      console.error("❌ [Get Customer Groups] Error:", {
        error: error.message,
        response: error.response?.data,
      });
      return [];
    }
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCode, customerCode, customerId, region } = req.query;
    if (!productCode || typeof productCode !== "string" || !productCode.trim()) {
      return res.status(400).json({ error: "productCode is required" });
    }

    // Check cache for full response
    const cacheKey = getCacheKey("prices", {
      productCode,
      customerCode,
      customerId,
      region,
    });
    const cachedResponse = getCachedResponse(cacheKey, true); // Use short cache (1 min)
    if (cachedResponse !== undefined) {
      return res.status(200).json(cachedResponse);
    }

    const headers = {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Step 1 & 2: Get customer ID and groups in parallel when possible
    // If we have customerId (GUID), we can get groups immediately
    // Otherwise, we need to get customerId first, then groups
    let finalCustomerId: string | null = null;
    let customerGroups: string[] = [];

    if (customerId && typeof customerId === "string") {
      const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (guidPattern.test(customerId)) {
        // We have a valid GUID, can fetch both in parallel
        finalCustomerId = customerId;
        [customerGroups] = await Promise.all([
          getCustomerGroups(finalCustomerId, headers),
        ]);
      } else {
        // Not a GUID, need to resolve customerCode first
        finalCustomerId = await getCustomerId(
          customerCode as string | undefined,
          customerId as string | undefined,
          headers
        );
        customerGroups = await getCustomerGroups(finalCustomerId, headers);
      }
    } else {
      // Need to get customerId from customerCode first
      finalCustomerId = await getCustomerId(
        customerCode as string | undefined,
        undefined,
        headers
      );
      customerGroups = await getCustomerGroups(finalCustomerId, headers);
    }

    // Step 3: Build price filters - get all prices by product code (không filter theo unitId và isVatOrder)
    const safeCode = productCode.replace(/'/g, "''");
    const filters = [
      "statecode eq 0", // active
      "crdfd_pricingdeactive eq 191920001", // Pricing Active
      `crdfd_masanpham eq '${safeCode}'`,
      "(crdfd_gia ne null or cr1bb_giakhongvat ne null)",
    ];

    // Step 4: Filter by customer groups (nhóm khách hàng) - priority
    // Không filter theo isVatOrder nữa, sẽ trả về tất cả giá
    if (customerGroups.length > 0) {
      // Filter by customer groups using crdfd_nhomoituongtext
      const groupFilters = customerGroups
        .map((group) => {
          const safeGroup = String(group).replace(/'/g, "''");
          return `crdfd_nhomoituongtext eq '${safeGroup}'`;
        })
        .join(" or ");
      filters.push(`(${groupFilters})`);
    } else if (region && typeof region === "string" && region.trim()) {
      // Fallback: For orders without customer groups, try region filter (cả VAT và không VAT)
      // Ưu tiên "Shop" nếu có
      const safeRegion = region.replace(/'/g, "''");
      filters.push(`(crdfd_nhomoituongtext eq 'Shop' or crdfd_nhomoituongtext eq '${safeRegion} Không VAT')`);
    }

    const filter = filters.join(" and ");
    // Expand lookup crdfd_onvi để lấy tên đơn vị
    // crdfd_onvi có thể là lookup đến crdfd_unitses hoặc crdfd_unitconversions
    // Cần expand để lấy cả crdfd_name (từ units) và crdfd_onvichuyenoitransfome (từ unit conversions)
    const columns =
      "crdfd_baogiachitietid,crdfd_masanpham,crdfd_gia,cr1bb_giakhongvat,crdfd_onvichuantext,crdfd_onvichuan,crdfd_nhomoituongtext,crdfd_giatheovc,crdfd_onvi";
    // Order by crdfd_giatheovc asc to get cheapest price first (per unit)
    // BỎ $top=1 để lấy TẤT CẢ các dòng báo giá (theo các đơn vị khác nhau)
    // Expand lookup để lấy tên đơn vị - thử cả units và unit conversions
    // crdfd_onvi có thể là lookup đến crdfd_unitses (crdfd_name) hoặc crdfd_unitconversions (crdfd_onvichuyenoitransfome)
    const expand = "$expand=crdfd_onvi($select=crdfd_name,crdfd_onvichuyenoitransfome)";
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&${expand}&$orderby=crdfd_giatheovc asc`;

    const endpoint = `${BASE_URL}${QUOTE_DETAIL_TABLE}?${query}`;
    
    // Use deduplication for price queries
    const dedupKey = getDedupKey(QUOTE_DETAIL_TABLE, {
      productCode,
      customerGroups: customerGroups.join(","),
      region,
    });
    
    const response = await deduplicateRequest(dedupKey, () =>
      axiosClient.get(endpoint, { headers })
    );

    const allPrices = response.data.value || [];
    
    // Trả về mảng tất cả các giá (mỗi giá theo 1 đơn vị)
    // Bao gồm crdfd_masanpham và crdfd_onvichuan trong mỗi item
    // Lấy tên đơn vị từ expanded lookup hoặc từ field text
    const prices = allPrices.map((item: any) => {
      // Ưu tiên lấy từ expanded lookup:
      // - crdfd_onvi.crdfd_onvichuyenoitransfome (từ unit conversions) - chính xác nhất
      // - crdfd_onvi.crdfd_name (từ units)
      // Nếu không có, lấy từ crdfd_onvichuantext hoặc crdfd_onvichuan
      const unitName = 
        item.crdfd_onvi?.crdfd_onvichuyenoitransfome ||  // Từ unit conversions (ưu tiên)
        item.crdfd_onvi?.crdfd_name ||                   // Từ units
        item.crdfd_onvichuantext || 
        item.crdfd_onvichuan || 
        undefined;
      
      return {
        price: item.crdfd_gia ?? null,
        priceNoVat: item.cr1bb_giakhongvat ?? null,
        unitName: unitName,
        priceGroupText: item.crdfd_nhomoituongtext || undefined,
        crdfd_masanpham: item.crdfd_masanpham || productCode, // Thêm mã sản phẩm
        crdfd_onvichuan: item.crdfd_onvichuan || undefined, // Thêm đơn vị chuẩn để map
      };
    });

    // Backward compatibility: Trả về cả object đầu tiên (để code cũ vẫn hoạt động)
    // VÀ mảng prices để code mới có thể xử lý nhiều đơn vị
    const first = allPrices[0];
    const firstUnitName = 
      first?.crdfd_onvi?.crdfd_onvichuyenoitransfome ||  // Từ unit conversions (ưu tiên)
      first?.crdfd_onvi?.crdfd_name ||                   // Từ units
      first?.crdfd_onvichuantext || 
      first?.crdfd_onvichuan || 
      undefined;
    
    const result = {
      // Object đầu tiên (backward compatibility)
      price: first?.crdfd_gia ?? null,
      priceNoVat: first?.cr1bb_giakhongvat ?? null,
      unitName: firstUnitName,
      priceGroupText: first?.crdfd_nhomoituongtext || undefined,
      crdfd_masanpham: first?.crdfd_masanpham || productCode,
      crdfd_onvichuan: first?.crdfd_onvichuan || undefined,
      // Mảng tất cả các giá (theo các đơn vị khác nhau)
      prices: prices,
    };

    // Cache the result
    setCachedResponse(cacheKey, result, true);

    res.status(200).json(result);
  } catch (error: any) {
    if (error.response) {
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

