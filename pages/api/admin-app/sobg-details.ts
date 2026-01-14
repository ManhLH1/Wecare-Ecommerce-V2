import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SOBG_DETAILS_TABLE = "crdfd_sodbaogias";

// Map Điều chỉnh GTGT OptionSet value to VAT percentage (for crdfd_ieuchinhgtgt)
const IEUCHINHGTGT_TO_VAT_MAP: Record<number, number> = {
  191920000: 0,   // 0%
  191920001: 5,   // 5%
  191920002: 8,   // 8%
  191920003: 10,  // 10%
};

const getVatFromIeuChinhGtgt = (ieuchinhgtgtValue: number | null | undefined): number => {
  if (ieuchinhgtgtValue === null || ieuchinhgtgtValue === undefined) return 0;
  return IEUCHINHGTGT_TO_VAT_MAP[ieuchinhgtgtValue] ?? 0;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = Date.now();
  console.log(`[SOBG Details API] Started at ${new Date().toISOString()}`);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sobgId, customerId, region, quantity } = req.query;
    if (!sobgId || typeof sobgId !== "string") {
      return res.status(400).json({ error: "sobgId is required" });
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

    // Filter: Status = Active, SO Báo Giá ID = sobgId
    // Nếu có customerId, filter thêm theo khách hàng
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sobgId);
    let sobgIdFilter: string;
    if (isGuid) {
      // For GUID, use lookup value field format (lowercase)
      sobgIdFilter = `_crdfd_maonhang_value eq ${sobgId}`;
    } else {
      // For non-GUID, use field name with capital M (crdfd_Maonhang)
      sobgIdFilter = `crdfd_Maonhang eq '${sobgId.replace(/'/g, "''")}'`;
    }

    let filter = `statecode eq 0 and ${sobgIdFilter}`;
    
    // Note: Khách hàng không có trong SOD báo giá, chỉ có trong SO Báo Giá
    // Nên không filter theo customerId ở đây

    // Select các field cần thiết cho ProductItem - dựa trên SOD báo giá schema
    const columns = [
      "crdfd_sodbaogiaid",        // ID
      "createdon",
      "crdfd_name",               // Mã đơn hàng chi tiết
      "crdfd_Sanpham",            // Sản phẩm (lookup)
      "crdfd_onvi",               // Đơn vị
      "crdfd_soluong",            // Số lượng
      "crdfd_ongia",              // Đơn giá
      "crdfd_giagoc",             // Giá gốc
      "crdfd_giack1",             // Giá CK 1
      "crdfd_giack2",             // Giá CK 2
      "crdfd_chietkhau",          // Chiết khấu %
      "crdfd_chietkhau2",         // Chiết khấu 2 (%)
      "crdfd_chietkhauvn",        // Chiết khấu VNĐ
      "crdfd_tienchietkhau",      // Tiền chiết khấu
      "crdfd_ieuchinhgtgt",       // Điều chỉnh GTGT OptionSet để map sang VAT %
      "crdfd_dieuchinhgtgttext",  // Điều chỉnh GTGT Text
      "crdfd_gtgt",               // GTGT
      "crdfd_stton",              // Stt đơn
      "crdfd_ngaygiaodukien",     // Ngày giao dự kiến
      "crdfd_duyetgia",           // Duyệt giá
      "crdfd_Duyetgiasup",        // Duyệt giá sup
      "crdfd_ghichu",             // Ghi chú
      "crdfd_phu_phi_hoa_don",   // Phụ phí hoá đơn (%)
      "crdfd_Promotion",          // Promotion
      "_crdfd_promotion_value",   // Promotion lookup value (ID)
      "crdfd_promotiontext",      // Promotion text
      "_crdfd_sanpham_value",     // Product ID
      "crdfd_masanpham",          // Mã sản phẩm (productCode)
      "crdfd_manhomsanpham",      // Mã nhóm sản phẩm
      "_crdfd_maonhang_value",    // SO Báo Giá ID (lookup value)
    ].join(",");

    // Expand crdfd_Sanpham để lấy tên sản phẩm
    const expand = "$expand=crdfd_Sanpham($select=crdfd_name,crdfd_fullname,crdfd_masanpham)";
    
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&${expand}&$orderby=createdon desc`;

    const endpoint = `${BASE_URL}${SOBG_DETAILS_TABLE}?${query}`;

    console.log(`[SOBG Details API] Fetching SOBG details for sobgId: ${sobgId}`);
    const response = await axios.get(endpoint, { headers, timeout: 300000 });
    console.log(`[SOBG Details API] Fetched ${response.data.value?.length || 0} SOBG detail records in ${Date.now() - startTime}ms`);

    // Lookup productCode từ product ID nếu có
    const PRODUCT_TABLE = "crdfd_productses";
    const productIdToCodeMap = new Map<string, string>();

    // Lấy danh sách product IDs duy nhất
    const productIds = [...new Set(
      (response.data.value || [])
        .map((item: any) => item._crdfd_sanpham_value)
        .filter((id: any): id is string => !!id)
    )];

    // Batch lookup productCode cho tất cả product IDs trong một API call
    if (productIds.length > 0) {
      const productLookupStart = Date.now();
      console.log(`[SOBG Details API] Batch lookup ${productIds.length} product codes`);
      try {
        // Create OR filter for all product IDs
        const productIdFilters = productIds.map(id => `crdfd_productsid eq ${id}`).join(" or ");
        const productQuery = `$select=crdfd_productsid,crdfd_masanpham&$filter=(${productIdFilters})`;
        const productEndpoint = `${BASE_URL}${PRODUCT_TABLE}?${productQuery}`;
        const productResponse = await axios.get(productEndpoint, { headers, timeout: 300000 });
        const products = productResponse.data.value || [];

        // Build the map from the batch response
        products.forEach((product: any) => {
          if (product.crdfd_productsid && product.crdfd_masanpham) {
            productIdToCodeMap.set(product.crdfd_productsid, product.crdfd_masanpham);
          }
        });
        console.log(`[SOBG Details API] Product lookup completed in ${Date.now() - productLookupStart}ms, found ${products.length} products`);
      } catch (err) {
        console.error("Error in batch product lookup:", err);
        // Continue without product codes if batch lookup fails
      }
    }

    // Fetch current prices for all products to include unit price information
    const productCodes: string[] = [...new Set(
      (response.data.value || [])
        .map((item: any) => String(productIdToCodeMap.get(item._crdfd_sanpham_value) || item.crdfd_masanpham))
        .filter((code: any): code is string => !!code && code.trim())
    )] as string[];

    // Fetch current prices for all product codes (batch fetch to avoid multiple API calls)
    const currentPricesMap = new Map<string, any>();
    if (productCodes.length > 0) {
      const priceLookupStart = Date.now();
      console.log(`[SOBG Details API] Batch lookup prices for ${productCodes.length} product codes`);
      try {
        // Import the prices API logic inline to avoid circular imports
        const QUOTE_DETAIL_TABLE = "crdfd_baogiachitiets";
        const GROUP_KH_TABLE = "cr1bb_groupkhs";
        const CUSTOMER_TABLE = "crdfd_customers";

        // Helper function to get customer groups (copied from prices.ts)
        const getCustomerGroupsForPrices = async (customerId: string): Promise<string[]> => {
          try {
            const groupFilter = `_cr1bb_khachhang_value eq ${customerId}`;
            const groupQuery = `$select=cr1bb_tennhomkh&$filter=${encodeURIComponent(groupFilter)}`;
            const groupEndpoint = `${BASE_URL}${GROUP_KH_TABLE}?${groupQuery}`;
            const groupResponse = await axios.get(groupEndpoint, { headers, timeout: 300000 });
            return (groupResponse.data.value || [])
              .map((item: any) => item.cr1bb_tennhomkh)
              .filter((text: any): text is string => !!text && typeof text === "string");
          } catch (error) {
            console.error("Error fetching customer groups for prices:", error);
            return [];
          }
        };

        // Get customer groups if customerId is provided
        let customerGroups: string[] = [];
        if (customerId && typeof customerId === "string") {
          customerGroups = await getCustomerGroupsForPrices(customerId);
        }

        // Batch fetch prices for all product codes in a single API call
        try {
          const baseFilters = [
            "statecode eq 0", // active
            "crdfd_pricingdeactive eq 191920001", // Pricing Active
            "(crdfd_gia ne null or cr1bb_giakhongvat ne null)",
          ];

          // Create OR filter for all product codes
          const productCodeFilters = productCodes.map(code => {
            const safeCode = code.replace(/'/g, "''");
            return `crdfd_masanpham eq '${safeCode}'`;
          }).join(" or ");
          baseFilters.push(`(${productCodeFilters})`);

          // Filter by customer groups if available
          if (customerGroups.length > 0) {
            const groupFilters = customerGroups
              .map((group) => {
                const safeGroup = String(group).replace(/'/g, "''");
                return `crdfd_nhomoituongtext eq '${safeGroup}'`;
              })
              .join(" or ");
            baseFilters.push(`(${groupFilters})`);
          }

          const filter = baseFilters.join(" and ");
          const columns = "crdfd_baogiachitietid,crdfd_masanpham,crdfd_gia,cr1bb_giakhongvat,crdfd_onvichuantext,crdfd_onvichuan,crdfd_nhomoituongtext,crdfd_giatheovc,crdfd_onvi";
          const expand = "$expand=crdfd_onvi($select=crdfd_name,crdfd_onvichuyenoitransfome)";
          const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&${expand}&$orderby=crdfd_giatheovc asc`;

          const endpoint = `${BASE_URL}${QUOTE_DETAIL_TABLE}?${query}`;
          const priceResponse = await axios.get(endpoint, { headers, timeout: 300000 });
          const allPrices = priceResponse.data.value || [];

          // Group prices by product code
          const pricesByCode = new Map<string, any[]>();
          allPrices.forEach((item: any) => {
            const code = item.crdfd_masanpham;
            if (code) {
              if (!pricesByCode.has(code)) {
                pricesByCode.set(code, []);
              }
              const unitName =
                item.crdfd_onvi?.crdfd_onvichuyenoitransfome ||
                item.crdfd_onvi?.crdfd_name ||
                item.crdfd_onvichuantext ||
                item.crdfd_onvichuan ||
                undefined;

              pricesByCode.get(code)!.push({
                price: item.crdfd_gia ?? null,
                priceNoVat: item.cr1bb_giakhongvat ?? null,
                unitName: unitName,
                priceGroupText: item.crdfd_nhomoituongtext || undefined,
                crdfd_masanpham: code,
                crdfd_onvichuan: item.crdfd_onvichuan || undefined,
              });
            }
          });

          // Set current prices for each product code using the same flow as SO prices endpoint:
          // - Build effectivePrices (if region provided, prefer region rows per unit)
          // - Selection priority: region (cheapest per unit) -> customerGroups -> Shop -> first
          pricesByCode.forEach((prices, productCode) => {
            if (!prices || prices.length === 0) return;

            const normalizeStr = (v: any) =>
              (String(v ?? "").normalize ? String(v ?? "").normalize("NFC") : String(v ?? ""))
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

            // Build effectivePrices (respect region filter per unit)
            let effectivePrices = prices.slice();
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
                const regionEntries = group.filter((p: any) => {
                  const pg = p.priceGroupText || p.crdfd_nhomoituongtext || "";
                  return normalizeStr(pg) === safeRegionNorm || normalizeNoDiacritics(pg) === safeRegionNoDiac;
                });
                if (regionEntries.length > 0) {
                  rebuilt.push(...regionEntries);
                } else {
                  rebuilt.push(...group);
                }
              });

              // Sort by price per conversion factor ascending
              effectivePrices = rebuilt.sort((a: any, b: any) => {
                const va = Number(a.price ?? a.priceNoVat ?? 0) / (Number(a.crdfd_giatrichuyenoi ?? 1) || 1);
                const vb = Number(b.price ?? b.priceNoVat ?? 0) / (Number(b.crdfd_giatrichuyenoi ?? 1) || 1);
                return va - vb;
              });
            }

            // Choose preferred row
            let preferred: any = null;
            try {
              // 1) If region provided, prefer cheapest region candidate
              if (region && typeof region === "string" && region.trim()) {
                const safeRegionNorm = normalizeStr(region);
                const safeRegionNoDiac = normalizeNoDiacritics(region);
                const regionCandidates = effectivePrices.filter((p: any) => {
                  const pg = p.priceGroupText || p.crdfd_nhomoituongtext || "";
                  return normalizeStr(pg) === safeRegionNorm || normalizeNoDiacritics(pg) === safeRegionNoDiac;
                });
                if (regionCandidates.length > 0) {
                  preferred = regionCandidates.reduce((a: any, b: any) => {
                    const pa = Number(a.price ?? a.priceNoVat ?? 0) / (Number(a.crdfd_giatrichuyenoi ?? 1) || 1);
                    const pb = Number(b.price ?? b.priceNoVat ?? 0) / (Number(b.crdfd_giatrichuyenoi ?? 1) || 1);
                    return pb < pa ? b : a;
                  }, regionCandidates[0]);
                }
              }

              // 2) If no region preferred, try customerGroups
              if (!preferred && customerGroups && customerGroups.length > 0) {
                const groupSet = new Set(customerGroups.map((g) => normalizeStr(g)));
                preferred = effectivePrices.find((p: any) => groupSet.has(normalizeStr(p.priceGroupText || p.crdfd_nhomoituongtext || "")));
              }

              // 3) Fallback to Shop or first
              if (!preferred) {
                preferred = effectivePrices.find((p: any) => normalizeStr(p.priceGroupText || "") === "shop") || effectivePrices[0] || null;
              }
            } catch (e) {
              preferred = effectivePrices[0] || null;
            }

            currentPricesMap.set(productCode, {
              prices: effectivePrices,
              price: preferred?.price ?? effectivePrices[0]?.price ?? null,
              priceNoVat: preferred?.priceNoVat ?? effectivePrices[0]?.priceNoVat ?? null,
              unitName: preferred?.unitName ?? effectivePrices[0]?.unitName ?? undefined,
              priceGroupText: preferred?.priceGroupText ?? effectivePrices[0]?.priceGroupText ?? undefined,
            });
          });
          console.log(`[SOBG Details API] Price lookup completed in ${Date.now() - priceLookupStart}ms, found prices for ${pricesByCode.size} products`);
        } catch (err) {
          console.error("Error in batch price lookup:", err);
        }
      } catch (err) {
        console.error("Error fetching current prices:", err);
      }
    }

    // Transform data to match SaleOrderDetail interface
    const details = (response.data.value || []).map((item: any) => {
      // Lấy productCode từ expanded product hoặc từ field trực tiếp hoặc từ map
      const productCode = item.crdfd_Sanpham?.crdfd_masanpham 
        || item.crdfd_masanpham 
        || productIdToCodeMap.get(item._crdfd_sanpham_value) 
        || "";
      
      // Lấy tên sản phẩm từ expanded product
      const productName = item.crdfd_Sanpham?.crdfd_fullname 
        || item.crdfd_Sanpham?.crdfd_name 
        || item.crdfd_name 
        || "";
      
      const vat = getVatFromIeuChinhGtgt(item.crdfd_ieuchinhgtgt);
      
      // Tính toán giá đã giảm (giá CK 1 hoặc giá CK 2, ưu tiên giá CK 2)
      // Nếu không có giá trị (null/undefined), default = 0
      // Nếu có giá trị 0, vẫn dùng 0
      const giack2 = item.crdfd_giack2 != null ? item.crdfd_giack2 : 0;
      const giack1 = item.crdfd_giack1 != null ? item.crdfd_giack1 : 0;
      // Ưu tiên: giack2 > giack1 > đơn giá > giá gốc
      // Nếu cả giack2 và giack1 đều là 0 (hoặc null/undefined), dùng đơn giá hoặc giá gốc
      const discountedPrice = (giack2 > 0 ? giack2 : (giack1 > 0 ? giack1 : (item.crdfd_ongia || item.crdfd_giagoc || 0)));
      const quantity = item.crdfd_soluong || 0;
      const subtotal = discountedPrice * quantity;
      const vatAmount = (subtotal * vat) / 100;
      const totalAmount = subtotal + vatAmount;

      // Get current prices for this product
      const currentPrices = currentPricesMap.get(productCode);

      return {
        id: item.crdfd_sodbaogiaid,
        stt: item.crdfd_stton || 0,
        productId: item._crdfd_sanpham_value || "",
        productCode: productCode,
        productName: productName,
        productGroupCode: item.crdfd_manhomsanpham || "",
        unit: item.crdfd_onvi || "",
        quantity: quantity,
        // Display the original/unit price in the UI (`price`) and keep discounted unit in `discountedPrice`.
        // This ensures the table shows the same "Giá" as the entry form (original/display price).
        price: item.crdfd_ongia || item.crdfd_giagoc || 0,
        surcharge: 0, // Phụ phí hoá đơn có thể tính từ crdfd_phu_phi_hoa_don
        discount: item.crdfd_tienchietkhau || 0,
        discountedPrice: discountedPrice,
        vat: vat,
        subtotal: subtotal,
        vatAmount: vatAmount,
        totalAmount: totalAmount,
        approver: item.crdfd_duyetgia || "",
        deliveryDate: item.crdfd_ngaygiaodukien || "",
        note: item.crdfd_ghichu || "",
        urgentOrder: false, // Không có field này trong SOD báo giá
        approvePrice: !!item.crdfd_duyetgia,
        approveSupPrice: !!item.crdfd_Duyetgiasup,
        discountPercent: item.crdfd_chietkhau || 0,
        discountAmount: item.crdfd_chietkhauvn || 0,
        promotionText: item.crdfd_promotiontext || "",
        promotionId: item._crdfd_promotion_value || undefined,
        invoiceSurcharge: item.crdfd_phu_phi_hoa_don || 0,
        createdOn: item.createdon || "",
        // Include current prices information for unit price loading
        currentPrices: currentPrices || null,
      };
    });

    // Sort by STT descending
    details.sort((a: any, b: any) => (b.stt || 0) - (a.stt || 0));

    const totalTime = Date.now() - startTime;
    console.log(`[SOBG Details API] Completed successfully in ${totalTime}ms, returned ${details.length} records`);
    res.status(200).json(details);
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`[SOBG Details API] Failed after ${totalTime}ms:`, error);

    // Check for timeout specifically
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error("[SOBG Details API] Request timed out");
      return res.status(504).json({
        error: "Gateway Timeout",
        message: "The request took too long to complete. Please try again.",
        details: `Request timed out after ${totalTime}ms`,
      });
    }

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error fetching SOBG details",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
      });
    }

    res.status(500).json({
      error: "Error fetching SOBG details",
      details: error.message,
    });
  }
}

