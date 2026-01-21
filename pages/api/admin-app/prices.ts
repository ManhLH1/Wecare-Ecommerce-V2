import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const QUOTE_DETAIL_TABLE = "crdfd_baogiachitiets";
const GROUP_KH_TABLE = "cr1bb_groupkhs"; // Group - KH
const CUSTOMER_TABLE = "crdfd_customers";

// Helper function to get customer info (ID and rewards) from customerCode or customerId
async function getCustomerInfo(
  customerCode: string | undefined,
  customerId: string | undefined,
  headers: any
): Promise<{ customerId: string | null; wecareRewards: string | null }> {
  if (customerId) {
    // Validate GUID format
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidPattern.test(customerId)) {
      // Valid GUID provided, but we still need to fetch rewards from DB
      // Continue to the deduplication logic below
    }
  }

  if (!customerCode && !customerId) {
    return { customerId: null, wecareRewards: null };
  }

  // Check cache first
  const cacheKey = getCacheKey(`customer-info`, { customerCode, customerId });
  const cached = getCachedResponse(cacheKey, true); // Use short cache (1 min)
  if (cached !== undefined) {
    return cached;
  }

  // Use deduplication to prevent concurrent requests
  const dedupKey = getDedupKey(`${CUSTOMER_TABLE}-info`, { customerCode, customerId });

  return deduplicateRequest(dedupKey, async () => {
    try {
      let customerFilter = "statecode eq 0";
      let customerQuery = "";

      if (customerId) {
        // If we have customerId, query directly
        customerFilter += ` and crdfd_customerid eq ${customerId}`;
        customerQuery = `$select=crdfd_customerid,crdfd_wecare_rewards&$filter=${encodeURIComponent(customerFilter)}&$top=1`;
      } else if (customerCode) {
        // If we have customerCode, query by code
        const safeCode = customerCode.replace(/'/g, "''");
        customerFilter += ` and cr44a_makhachhang eq '${safeCode}'`;
        customerQuery = `$select=crdfd_customerid,crdfd_wecare_rewards&$filter=${encodeURIComponent(customerFilter)}&$top=1`;
      }

      const customerEndpoint = `${BASE_URL}${CUSTOMER_TABLE}?${customerQuery}`;
      const customerResponse = await axiosClient.get(customerEndpoint, { headers });
      const customer = customerResponse.data.value?.[0];

      const result = {
        customerId: customer?.crdfd_customerid || null,
        wecareRewards: customer?.crdfd_wecare_rewards || null
      };

      // Cache the result
      setCachedResponse(cacheKey, result, true);

      return result;
      return { customerId: null, wecareRewards: null };
    } catch (error: any) {
      console.error("❌ [Get Customer Info] Error:", {
        error: error.message,
        response: error.response?.data,
      });
      return { customerId: null, wecareRewards: null };
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
    const { productCode, customerCode, customerId, region, quantity } = req.query;
    if (!productCode || typeof productCode !== "string" || !productCode.trim()) {
      return res.status(400).json({ error: "productCode is required" });
    }

    // Check cache for full response
    const cacheKey = getCacheKey("prices", {
      productCode,
      customerCode,
      customerId,
      region,
      quantity,
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

    // Step 1 & 2: Get customer info (ID and rewards) and groups in parallel when possible
    // If we have customerId (GUID), we can get groups immediately
    // Otherwise, we need to get customerId first, then groups
    let finalCustomerId: string | null = null;
    let customerWecareRewards: string | null = null;
    let customerGroups: string[] = [];

    if (customerId && typeof customerId === "string") {
      const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (guidPattern.test(customerId)) {
        // We have a valid GUID, can fetch both in parallel
        finalCustomerId = customerId;
        const customerInfo = await getCustomerInfo(
          undefined,
          customerId,
          headers
        );
        customerWecareRewards = customerInfo.wecareRewards;
        [customerGroups] = await Promise.all([
          getCustomerGroups(finalCustomerId, headers),
        ]);
      } else {
        // Not a GUID, need to resolve customerCode first
        const customerInfo = await getCustomerInfo(
          customerCode as string | undefined,
          customerId as string | undefined,
          headers
        );
        finalCustomerId = customerInfo.customerId;
        customerWecareRewards = customerInfo.wecareRewards;
        customerGroups = await getCustomerGroups(finalCustomerId, headers);
      }
    } else {
      // Need to get customerId from customerCode first
      const customerInfo = await getCustomerInfo(
        customerCode as string | undefined,
        undefined,
        headers
      );
      finalCustomerId = customerInfo.customerId;
      customerWecareRewards = customerInfo.wecareRewards;
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
      // Fallback: For orders without customer groups, try region filter (both exact region and "region Không VAT")
      // Include Shop as a fallback option as well.
      const safeRegion = region.replace(/'/g, "''");
      filters.push(
        `(crdfd_nhomoituongtext eq 'Shop' or crdfd_nhomoituongtext eq '${safeRegion}' or crdfd_nhomoituongtext eq '${safeRegion} Không VAT')`
      );
    }

    const filter = filters.join(" and ");
    // Expand lookup crdfd_onvi để lấy tên đơn vị và giá trị chuyển đổi
    // crdfd_onvi có thể là lookup đến crdfd_unitses hoặc crdfd_unitconversions
    // Cần expand để lấy cả crdfd_name (từ units), crdfd_onvichuyenoitransfome và crdfd_giatrichuyenoi (từ unit conversions)
    const columns =
      "crdfd_baogiachitietid,crdfd_masanpham,crdfd_gia,cr1bb_giakhongvat,crdfd_onvichuantext,crdfd_onvichuan,crdfd_nhomoituongtext,crdfd_giatheovc,crdfd_onvi,crdfd_discount_rate";
    // Order by crdfd_giatheovc asc to get cheapest price first (per unit)
    // BỎ $top=1 để lấy TẤT CẢ các dòng báo giá (theo các đơn vị khác nhau)
    // Expand lookup để lấy tên đơn vị - thử cả units và unit conversions
    // crdfd_onvi có thể là lookup đến crdfd_unitses (crdfd_name) hoặc crdfd_unitconversions (crdfd_onvichuyenoitransfome, crdfd_giatrichuyenoi)
    const expand = "$expand=crdfd_onvi($select=crdfd_name,crdfd_onvichuyenoitransfome,crdfd_giatrichuyenoi)";
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&${expand}&$orderby=crdfd_giatheovc asc`;

    const endpoint = `${BASE_URL}${QUOTE_DETAIL_TABLE}?${query}`;
    
    // Use deduplication for price queries
    const dedupKey = getDedupKey(QUOTE_DETAIL_TABLE, {
      productCode,
      customerGroups: customerGroups.join(","),
      region,
      quantity,
    });
    
    const response = await deduplicateRequest(dedupKey, () =>
      axiosClient.get(endpoint, { headers })
    );

    const allPrices = response.data.value || [];
    
    // Helper function to get discount rate from JSON based on wecare rewards
    const getDiscountRate = (discountRateJson: any, wecareRewards: string | null): number | null => {
      if (!discountRateJson || !wecareRewards) return null;

      try {
        let discountRates: any;
        if (typeof discountRateJson === 'string') {
          discountRates = JSON.parse(discountRateJson);
        } else {
          discountRates = discountRateJson;
        }

        // Normalize wecareRewards for matching (lowercase, trim)
        const normalizedRewards = wecareRewards.toLowerCase().trim();

        // Try exact match first
        if (discountRates[normalizedRewards] !== undefined) {
          return discountRates[normalizedRewards];
        }

        // Try case-insensitive match
        const keys = Object.keys(discountRates);
        const matchedKey = keys.find(key => key.toLowerCase().trim() === normalizedRewards);
        if (matchedKey) {
          return discountRates[matchedKey];
        }

        return null;
      } catch (error) {
        console.error("❌ [Parse Discount Rate] Error:", error);
        return null;
      }
    };

    // Trả về mảng tất cả các giá (mỗi giá theo 1 đơn vị)
    // Bao gồm crdfd_masanpham và crdfd_onvichuan trong mỗi item
    // Lấy tên đơn vị và giá trị chuyển đổi từ expanded lookup hoặc từ field text
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

      // Lấy giá trị chuyển đổi từ expanded lookup (từ unit conversions)
      const giatrichuyenoi = item.crdfd_onvi?.crdfd_giatrichuyenoi ?? 0;

      // Tính SL theo kho: Số lượng x crdfd_giatrichuyenoi
      const parsedQuantity = quantity && typeof quantity === "string" ? parseFloat(quantity) : 1;
      const slTheoKho = parsedQuantity * giatrichuyenoi;

      // Get discount rate based on customer's wecare rewards
      const discountRate = getDiscountRate(item.crdfd_discount_rate, customerWecareRewards);

      // Calculate final price: giakhongvat - (priceNoVat * discountRate)
      const priceNoVat = item.cr1bb_giakhongvat ?? null;
      const finalPrice = (priceNoVat !== null && discountRate !== null)
        ? priceNoVat - (priceNoVat * discountRate)
        : priceNoVat;

      return {
        crdfd_baogiachitietid: item.crdfd_baogiachitietid || undefined, // Thêm ID báo giá chi tiết
        priceNoVat: priceNoVat,
        finalPrice: finalPrice, // priceNoVat x discountRate
        unitName: unitName,
        priceGroupText: item.crdfd_nhomoituongtext || undefined,
        crdfd_masanpham: item.crdfd_masanpham || productCode, // Thêm mã sản phẩm
        crdfd_onvichuan: item.crdfd_onvichuan || undefined, // Thêm đơn vị chuẩn để map
        crdfd_giatrichuyenoi: giatrichuyenoi, // Giá trị chuyển đổi từ lookup hoặc field
        slTheoKho: slTheoKho, // SL theo kho = Số lượng x crdfd_giatrichuyenoi
        discountRate: discountRate, // Discount rate based on wecare rewards
      };
    });

    // Normalize helpers (used below)
    const normalizeStr = (v: any) =>
      (String(v ?? "").normalize
        ? String(v ?? "").normalize("NFC")
        : String(v ?? "")
      )
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const removeDiacritics = (s: string) =>
      s && s.normalize ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : s;

    const normalizeNoDiacritics = (v: any) =>
      removeDiacritics(String(v ?? ""))
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    // If region provided, for each unit prefer region-specific rows and drop Shop rows for that unit.
    // This prevents mixing Shop and region prices for the same unit (ambiguous UI mapping).
    let effectivePrices = prices;
    if (region && typeof region === "string" && region.trim()) {
      const safeRegionNorm = normalizeStr(region);
      const safeRegionNoDiac = normalizeNoDiacritics(region);

      const pricesByUnit = new Map<string, any[]>();
      for (const p of prices) {
        const unitKey = normalizeStr(p.unitName || p.crdfd_onvichuan || p.crdfd_onvichuantext || "default");
        if (!pricesByUnit.has(unitKey)) pricesByUnit.set(unitKey, []);
        pricesByUnit.get(unitKey)!.push(p);
      }

      const rebuilt: any[] = [];
      pricesByUnit.forEach((group) => {
        // Find region-specific entries in this unit group
        const regionEntries = group.filter((p: any) => {
          const pg = String(p.priceGroupText || p.crdfd_nhomoituongtext || "");
          return normalizeStr(pg) === safeRegionNorm || normalizeNoDiacritics(pg) === safeRegionNoDiac;
        });

        if (regionEntries.length > 0) {
          // Keep only region entries for this unit
          rebuilt.push(...regionEntries);
        } else {
          // Keep all original entries for this unit
          rebuilt.push(...group);
        }
      });

      // Sort rebuilt according to crdfd_giatheovc asc (keep cheapest per unit first)
      effectivePrices = rebuilt.sort((a: any, b: any) => {
        const va = Number(a.crdfd_giatheovc ?? a.price ?? 0);
        const vb = Number(b.crdfd_giatheovc ?? b.price ?? 0);
        return va - vb;
      });
    }

    // Backward compatibility & priority selection:
    // Choose the preferred price row using the following priority:
    // 1) If customerGroups exist: pick the first price whose crdfd_nhomoituongtext matches any group.
    // 2) Else if region provided: prefer a price matching the region (exact), then "<region> Không VAT", then "Shop".
    // 3) Else: fallback to the first returned row.
    const parsedQuantity = quantity && typeof quantity === "string" ? parseFloat(quantity) : 1;

    // Prefer selection using the processed `effectivePrices` array (region/customer-groups aware)
    let preferred: any = null;

    try {
      // If region is provided, prefer any price rows whose priceGroupText matches the region
      if (region && typeof region === "string" && region.trim()) {
        const safeRegionNorm = normalizeStr(region);
        const safeRegionNoDiac = normalizeNoDiacritics(region);

        // Debug: log received region and available price groups (helps troubleshoot mismatched values)
        try {
          console.debug("[Prices] region:", region, "normalized:", safeRegionNorm, "noDiac:", safeRegionNoDiac);
          console.debug(
            "[Prices] available price groups:",
            prices.map((p: any) => p.priceGroupText || p.crdfd_nhomoituongtext || null)
          );
        } catch (e) {
          /* ignore logging errors */
        }

        // Collect region-matching candidates (exact normalized or no-diacritics)
        const regionCandidates = effectivePrices.filter((p: any) => {
          const pg = p.priceGroupText || p.crdfd_nhomoituongtext || "";
          return normalizeStr(pg) === safeRegionNorm || normalizeNoDiacritics(pg) === safeRegionNoDiac;
        });

        if (regionCandidates.length > 0) {
          // Prefer a candidate that is already ordered by crdfd_giatheovc asc (prices was built in that order),
          // but also try to choose the one with the lowest price per conversion factor among region candidates.
          let best = regionCandidates[0];
          try {
            best = regionCandidates.reduce((a: any, b: any) => {
              const pa = Number(a.price ?? 0) / (Number(a.crdfd_giatrichuyenoi ?? 1) || 1);
              const pb = Number(b.price ?? 0) / (Number(b.crdfd_giatrichuyenoi ?? 1) || 1);
              return pb < pa ? b : a;
            }, regionCandidates[0]);
          } catch (e) {
            // ignore reduce errors, fallback to first
          }
          preferred = best;
        }
      }

      // If region-based selection didn't find anything, fall back to customer groups selection
      if (!preferred && customerGroups && customerGroups.length > 0) {
        const groupSet = new Set(customerGroups.map((g) => normalizeStr(g)));
        preferred = effectivePrices.find((p: any) => groupSet.has(normalizeStr(p.priceGroupText || "")));
      }

      if (!preferred) {
        // fallback: prefer Shop if present, otherwise first price
        preferred =
          effectivePrices.find((p: any) => String(p.priceGroupText || "").toLowerCase() === "shop") ||
          effectivePrices[0] ||
          null;
      }
    } catch (err) {
      preferred = effectivePrices[0] || null;
    }

    const first = preferred;

    const firstUnitName =
      first?.unitName ||
      first?.crdfd_onvichuantext ||
      first?.crdfd_onvichuan ||
      undefined;

    const firstGiatrichuyenoi = first?.crdfd_giatrichuyenoi ?? 0;
    const firstSlTheoKho = parsedQuantity * firstGiatrichuyenoi;

    const result = {
      // Object đầu tiên theo ưu tiên (backward compatibility)
      crdfd_baogiachitietid: first?.crdfd_baogiachitietid || undefined, // Thêm ID báo giá chi tiết
      priceNoVat: first?.priceNoVat ?? null,
      finalPrice: first?.finalPrice ?? null, // giakhongvat - (priceNoVat * discountRate)
      unitName: firstUnitName,
      priceGroupText: first?.priceGroupText || undefined,
      crdfd_masanpham: first?.crdfd_masanpham || productCode,
      crdfd_onvichuan: first?.crdfd_onvichuan || undefined,
      crdfd_giatrichuyenoi: firstGiatrichuyenoi,
      slTheoKho: firstSlTheoKho,
      discountRate: first?.discountRate ?? null,
      // Mảng tất cả các giá (theo các đơn vị khác nhau) - effective (region-prioritized)
      prices: effectivePrices,
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

