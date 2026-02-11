import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const PROMOTION_TABLE = "crdfd_promotions";
const ORDERS_X_PROMOTION_TABLE = "crdfd_ordersxpromotions";
const SOBG_X_PROMOTION_TABLE = "crdfd_sobaogiaxpromotions";

const escapeODataValue = (value: string) => value.replace(/'/g, "''");

// Payment terms mapping (key -> label) - keep in sync with promotions API
const PAYMENT_TERMS_MAP: Record<string, string> = {
  "0": "Thanh toán sau khi nhận hàng",
  "14": "Thanh toán 2 lần vào ngày 10 và 25",
  "30": "Thanh toán vào ngày 5 hàng tháng",
  "283640000": "Tiền mặt",
  "283640001": "Công nợ 7 ngày",
  "191920001": "Công nợ 20 ngày",
  "283640002": "Công nợ 30 ngày",
  "283640003": "Công nợ 45 ngày",
  "283640004": "Công nợ 60 ngày",
  "283640005": "Thanh toán trước khi nhận hàng",
};

const normalizePaymentTerm = (input?: string | null) : string | null => {
  if (!input && input !== "") return null;
  const t = String(input || "").trim();
  if (t === "") return null;
  if (PAYMENT_TERMS_MAP[t]) return t;
  const foundKey = Object.keys(PAYMENT_TERMS_MAP).find(
    (k) => PAYMENT_TERMS_MAP[k].toLowerCase() === t.toLowerCase()
  );
  if (foundKey) return foundKey;
  const digits = t.replace(/\D/g, "");
  if (digits && PAYMENT_TERMS_MAP[digits]) return digits;
  return t;
};

/**
 * Parse multiple payment terms (comma-separated) into array of normalized terms
 * Ví dụ: "0,283640005" -> ["0", "283640005"]
 */
const parsePaymentTerms = (input?: string | null): string[] => {
  if (!input && input !== "") return [];
  const t = String(input || "").trim();
  if (t === "") return [];
  // Split by comma and normalize each term
  return t
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => normalizePaymentTerm(term) || term)
    .filter((term) => term !== "");
};

/**
 * Check if requested payment term is in the list of allowed payment terms
 */
const isPaymentTermAllowed = (
  requested: string | null,
  allowedTerms: string[]
): boolean => {
  if (!requested || allowedTerms.length === 0) return true;
  return allowedTerms.includes(requested);
};

/**
 * API để lấy danh sách Promotion loại "Order" (áp dụng cho toàn đơn hàng)
 * và kiểm tra xem đã có promotion order nào được áp dụng cho SO chưa
 *
 * Query params:
 * - soId: ID của Sales Order để check promotion order đã áp dụng
 * - customerCode: Mã khách hàng để filter promotion (format: KH-XXXX)
 * - totalAmount: Tổng tiền đơn hàng để filter promotion theo điều kiện
 * - productCodes: Danh sách mã sản phẩm (comma-separated, format: SP-XXXXXX)
 * - productGroupCodes: Danh sách mã nhóm sản phẩm (comma-separated, format: NSP-XXXXXX)
 *
 * Example API call:
 * http://localhost:8080/api/admin-app/promotion-orders?customerCode=KH-4265&productCodes=SP-019397&productGroupCodes=NSP-000373
 */

// ==================== INTERFACES ====================

interface PromotionOrder {
  id: string;
  name: string;
  promotionId: string;
  type: string;
  value?: number;
  vndOrPercent?: string;
  chietKhau2?: boolean;
  productCodes?: string;
  productGroupCodes?: string;
}

interface AvailablePromotion {
  id: string;
  name: string;
  type: string;
  value: number;
  vndOrPercent: string;
  chietKhau2: boolean;
  productCodes?: string;
  productGroupCodes?: string;
  totalAmountCondition?: number;
  ieukhoanthanhtoanapdung?: any;
  startDate?: string;
  endDate?: string;
  // Annotations added by API processing
  paymentTermsNormalized?: string | null;
  applicable?: boolean;
  paymentTermsMismatch?: boolean;
  warningMessage?: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate request method
 */
const validateRequestMethod = (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
};

/**
 * Get and validate access token
 */
const getValidatedToken = async (res: NextApiResponse) => {
  const token = await getAccessToken();
  if (!token) {
    res.status(401).json({ error: "Failed to obtain access token" });
    return null;
  }
  return token;
};

/**
 * Parse and normalize promotion value
 */
const parsePromotionValue = (rawValue: any): number => {
  const parsed = typeof rawValue === 'number' ? rawValue : (rawValue ? Number(rawValue) : 0);
  return !isNaN(parsed) ? parsed : 0;
};

/**
 * Normalize chietKhau2 field to boolean
 */
const normalizeChietKhau2 = (value: any): boolean => {
  return value === true || value === 1 || value === '1' || value === 191920001 || value === '191920001';
};

/**
 * Parse comma-separated string into array of trimmed codes
 */
const parseCodesToArray = (codes: any): string[] => {
  if (!codes) return [];
  const codeArray = typeof codes === "string" ? codes.split(",") : codes;
  return codeArray.map((c: any) => String(c || '').trim()).filter(Boolean);
};

/**
 * Chuẩn hoá GUID (bỏ { }) và kiểm tra format để tránh gọi Dataverse với id rác gây 400
 */
const normalizeGuid = (id: any): string | null => {
  if (!id) return null;
  const s = String(id).trim().replace(/^{|}$/g, "");
  const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return guidRegex.test(s) ? s : null;
};

/**
 * Validate and format query parameters
 */
const validateAndFormatQueryParams = (query: any) => {
  const {
    soId,
    customerCode,
    totalAmount,
    productCodes,
    productGroupCodes
  } = query;

  // Log incoming request for debugging

  const validatedParams = {
    soId: validateSoId(soId),
    customerCode: validateCustomerCode(customerCode),
    totalAmount: validateTotalAmount(totalAmount),
    productCodes: validateProductCodes(productCodes),
    productGroupCodes: validateProductGroupCodes(productGroupCodes)
  };

  // Log validated parameters

  return validatedParams;
};

/**
 * Validate Sales Order ID
 */
const validateSoId = (soId: any): string | undefined => {
  if (!soId) return undefined;
  const soIdStr = String(soId).trim();
  return soIdStr ? soIdStr : undefined;
};

/**
 * Validate customer code
 */
const validateCustomerCode = (customerCode: any): string | undefined => {
  if (!customerCode) return undefined;
  const codeStr = String(customerCode).trim();
  // Basic validation for customer code format (e.g., KH-XXXX)
  if (codeStr && codeStr.startsWith('KH-')) {
    return codeStr;
  }
  return codeStr || undefined;
};

/**
 * Validate total amount
 */
const validateTotalAmount = (totalAmount: any): string | undefined => {
  if (!totalAmount) return undefined;
  const amountStr = String(totalAmount).trim();
  const amount = parseFloat(amountStr);
  if (!isNaN(amount) && amount >= 0) {
    return amountStr;
  }
  return undefined;
};

/**
 * Validate product codes (comma-separated)
 */
const validateProductCodes = (productCodes: any): any => {
  if (!productCodes) return undefined;
  const codes = parseCodesToArray(productCodes);
  // Validate each code format (e.g., SP-XXXXXX)
  const validCodes = codes.filter(code => code.startsWith('SP-'));
  return validCodes.length > 0 ? validCodes.join(',') : undefined;
};

/**
 * Validate product group codes (comma-separated)
 */
const validateProductGroupCodes = (productGroupCodes: any): any => {
  if (!productGroupCodes) return undefined;
  const codes = parseCodesToArray(productGroupCodes);
  // Validate each code format (e.g., NSP-XXXXXX)
  const validCodes = codes.filter(code => code.startsWith('NSP-'));
  return validCodes.length > 0 ? validCodes.join(',') : undefined;
};

/**
 * Check if promotion matches product codes or groups
 */
const doesPromotionMatchProducts = (promo: AvailablePromotion, productCodes: string[], productGroups: string[]): boolean => {
  const hasProductMatch = productCodes.some(code =>
    promo.productCodes && promo.productCodes.includes(code)
  );

  const hasGroupMatch = productGroups.some(code =>
    promo.productGroupCodes && promo.productGroupCodes.includes(code)
  );

  return hasProductMatch || hasGroupMatch;
};

// ==================== MAIN BUSINESS LOGIC ====================

/**
 * Fetch existing promotion orders for a sales order
 */
const fetchExistingPromotionOrders = async (
  soId: string,
  headers: any
): Promise<PromotionOrder[]> => {
  try {
    const filters = [
      "statecode eq 0", // Active
      `_crdfd_so_value eq ${soId}`,
      "crdfd_type eq 'Order'"
    ];

    const selectFields = [
      "crdfd_ordersxpromotionid",
      "crdfd_name",
      "_crdfd_promotion_value",
      "crdfd_type"
    ];

    const query = `$filter=${encodeURIComponent(filters.join(" and "))}&$select=${selectFields.join(",")}`;
    const endpoint = `${BASE_URL}${ORDERS_X_PROMOTION_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });
    const orders = (response.data.value || []).map((item: any) => ({
      id: item.crdfd_ordersxpromotionid,
      name: item.crdfd_name,
      promotionId: item._crdfd_promotion_value,
      type: item.crdfd_type,
    }));
    // Also fetch SOBG x Promotion records (SO báo giá x Promotion) to support SOBG context
    try {
      const sobgFilters = [
        "statecode eq 0",
        `_crdfd_sobaogia_value eq ${soId}`,
        "crdfd_type eq 'Order'"
      ];
      const sobgSelect = [
        "crdfd_sobaogiaxpromotionid",
        "crdfd_name",
        "_crdfd_promotion_value",
        "crdfd_type"
      ];
      const sobgQuery = `$filter=${encodeURIComponent(sobgFilters.join(" and "))}&$select=${sobgSelect.join(",")}`;
      const sobgEndpoint = `${BASE_URL}${SOBG_X_PROMOTION_TABLE}?${sobgQuery}`;
      const sobgResp = await axios.get(sobgEndpoint, { headers });
      const sobgOrders = (sobgResp.data.value || []).map((item: any) => ({
        id: item.crdfd_sobaogiaxpromotionid,
        name: item.crdfd_name,
        promotionId: item._crdfd_promotion_value,
        type: item.crdfd_type,
      }));
      // Merge (dedupe by promotionId)
      const combined = [...orders, ...sobgOrders];
      const uniqByPromotionIdMap: Record<string, PromotionOrder> = {};
      combined.forEach(o => {
        if (o.promotionId) {
          uniqByPromotionIdMap[String(o.promotionId)] = o;
        }
      });
      const uniqueOrders = Object.values(uniqByPromotionIdMap);
      return await enrichPromotionOrdersWithDetails(uniqueOrders, headers);
    } catch (e) {
      // if SOBG fetch fails, fallback to original orders
      return await enrichPromotionOrdersWithDetails(orders, headers);
    }
  } catch (error) {
    console.warn("Error fetching existing promotion orders:", error);
    return [];
  }
};

/**
 * Enrich promotion orders with promotion details
 */
const enrichPromotionOrdersWithDetails = async (
  promotionOrders: PromotionOrder[],
  headers: any
): Promise<PromotionOrder[]> => {
  if (promotionOrders.length === 0) return promotionOrders;

  try {
    const promotionIds = Array.from(new Set(
      promotionOrders.map(order => order.promotionId).filter(Boolean)
    ));

    if (promotionIds.length === 0) return promotionOrders;

    // Fetch promotion details in parallel
    const promoPromises = promotionIds.map(pid => {
      const selectFields = [
        "crdfd_promotionid",
        "crdfd_value",
        "crdfd_vn",
        "cr1bb_chietkhau2",
        "crdfd_masanpham_multiple",
        "cr1bb_manhomsp_multiple",
        "cr1bb_tongtienapdung",
        "cr1bb_ieukhoanthanhtoanapdung",
        "crdfd_start_date",
        "crdfd_end_date"
      ];

      const url = `${BASE_URL}${PROMOTION_TABLE}(${pid})?$select=${selectFields.join(",")}`;
      return axios.get(url, { headers }).then(r => r.data).catch(() => null);
    });

    const promoResults = await Promise.all(promoPromises);
    const promoById: Record<string, any> = {};

    promoResults.forEach((promo: any) => {
      if (promo && promo.crdfd_promotionid) {
        promoById[promo.crdfd_promotionid] = promo;
      }
    });

    return promotionOrders.map(order => {
      const promo = promoById[order.promotionId];
      if (!promo) return order;

      return {
        ...order,
        value: parsePromotionValue(promo.crdfd_value),
        vndOrPercent: promo.crdfd_vn,
        chietKhau2: normalizeChietKhau2(promo.cr1bb_chietkhau2),
        productCodes: promo.crdfd_masanpham_multiple,
        productGroupCodes: promo.cr1bb_manhomsp_multiple,
        totalAmountCondition: promo.cr1bb_tongtienapdung,
        ieukhoanthanhtoanapdung: promo.cr1bb_ieukhoanthanhtoanapdung,
        startDate: promo.crdfd_start_date,
        endDate: promo.crdfd_end_date,
      };
    });
  } catch (error) {
    console.warn('Error enriching promotion orders with details:', error);
    return promotionOrders;
  }
};

/**
 * Build filters for available promotions query
 */
const buildPromotionFilters = (
  customerCode?: string,
  totalAmount?: string
): string[] => {
  const filters = [
    "statecode eq 0", // Active
    "crdfd_promotion_deactive eq 'Active'",
  ];

  // Time window filter: start_date <= now AND (no end_date OR end_date >= now)
  const nowIso = new Date().toISOString();
  filters.push(`crdfd_start_date le ${nowIso}`);
  filters.push(`(crdfd_end_date ge ${nowIso} or crdfd_end_date eq null)`);

  // Customer code filter
  if (customerCode && typeof customerCode === "string" && customerCode.trim()) {
    const safeCode = escapeODataValue(customerCode.trim());
    filters.push(
      `(cr3b9_ma_khachhang_apdung eq '${safeCode}' or ` +
      `contains(cr3b9_ma_khachhang_apdung,'${safeCode},') or ` +
      `contains(cr3b9_ma_khachhang_apdung,',${safeCode},') or ` +
      `contains(cr3b9_ma_khachhang_apdung,',${safeCode}'))`
    );
  }

  // Total amount filter
  if (totalAmount && typeof totalAmount === "string") {
    const amount = parseFloat(totalAmount);
    if (!isNaN(amount) && amount > 0) {
      filters.push(
        `(cr1bb_tongtienapdung eq null or cr1bb_tongtienapdung le ${amount})`
      );
    }
  }

  return filters;
};

/**
 * Fetch available promotions from CRM
 */
const fetchAvailablePromotions = async (
  filters: string[],
  headers: any
): Promise<AvailablePromotion[]> => {
  const selectFields = [
    "crdfd_promotionid",
    "crdfd_name",
    "crdfd_type",
    "crdfd_value",
    "crdfd_vn",
    "cr1bb_chietkhau2",
    "crdfd_masanpham_multiple",
    "cr1bb_manhomsp_multiple",
    "cr1bb_tongtienapdung",
    "cr1bb_ieukhoanthanhtoanapdung",
    "crdfd_start_date",
    "crdfd_end_date"
  ];

  const query = `$select=${selectFields.join(",")}&$filter=${encodeURIComponent(
    filters.join(" and ")
  )}&$orderby=crdfd_value desc`;

  const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;
  const response = await axios.get(endpoint, { headers });

  return (response.data.value || []).map((promo: any) => ({
    id: promo.crdfd_promotionid,
    name: promo.crdfd_name,
    type: promo.crdfd_type,
    value: parsePromotionValue(promo.crdfd_value),
    vndOrPercent: promo.crdfd_vn,
    chietKhau2: normalizeChietKhau2(promo.cr1bb_chietkhau2),
    productCodes: promo.crdfd_masanpham_multiple,
    productGroupCodes: promo.cr1bb_manhomsp_multiple,
    totalAmountCondition: promo.cr1bb_tongtienapdung,
    ieukhoanthanhtoanapdung: promo.cr1bb_ieukhoanthanhtoanapdung,
    startDate: promo.crdfd_start_date,
    endDate: promo.crdfd_end_date,
  }));
};

/**
 * Filter promotions based on product codes and groups
 */
const filterPromotionsByProducts = (
  promotions: AvailablePromotion[],
  productCodes?: any,
  productGroups?: any
): AvailablePromotion[] => {
  if (!productCodes && !productGroups) return promotions;

  const productCodeList = parseCodesToArray(productCodes);
  const productGroupList = parseCodesToArray(productGroups);


  const filtered = promotions.filter(promo => {
    const matches = doesPromotionMatchProducts(promo, productCodeList, productGroupList);
    return matches;
  });

  return filtered;
};

/**
 * Apply chietKhau2 filter and get max value promotions
 */
const getMaxValuePromotions = (promotions: AvailablePromotion[]): AvailablePromotion[] => {
  // Filter only chietKhau2 = true promotions
  const chietKhau2Promotions = promotions.filter(p => p.chietKhau2);

  // Handle Dynamics CRM option set values
  // 191920000 = Percent, other values = VND
  const percentPromotions = chietKhau2Promotions.filter(p => {
    const vndOrPercentStr = String(p.vndOrPercent || '');
    return vndOrPercentStr === "%" || vndOrPercentStr === "191920000";
  });
  const vndPromotions = chietKhau2Promotions.filter(p => {
    const vndOrPercentStr = String(p.vndOrPercent || '');
    return vndOrPercentStr === "VNĐ" ||
           (vndOrPercentStr !== "%" && vndOrPercentStr !== "191920000");
  });

  let result: AvailablePromotion[] = [];

  // For percent type: get max value only
  if (percentPromotions.length > 0) {
    const maxPercentValue = Math.max(...percentPromotions.map(p => p.value || 0));
    result = percentPromotions.filter(p => p.value === maxPercentValue);
  }

  // For VND type: include all
  if (vndPromotions.length > 0) {
    result = [...result, ...vndPromotions];
  }
  return result;
};

/**
 * Handle API errors
 */
const handleApiError = (error: any, res: NextApiResponse) => {
  console.error("Error fetching promotion orders:", error);

  if (error.response) {
    console.error("Error response status:", error.response.status);
    console.error("Error response data:", JSON.stringify(error.response.data, null, 2));

    return res.status(error.response.status || 500).json({
      error: "Error fetching promotion orders",
      details: error.response.data?.error?.message || error.response.data?.error || error.message,
    });
  }

  res.status(500).json({
    error: "Error fetching promotion orders",
    details: error.message,
  });
};

// ==================== MAIN HANDLER ====================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validate request method
  if (!validateRequestMethod(req, res)) return;

  try {
    // Step 1: Validate and format query parameters
    const validatedParams = validateAndFormatQueryParams(req.query);
    const { soId, customerCode, totalAmount, productCodes, productGroupCodes } = validatedParams;

    // Step 2: Get access token
    const token = await getValidatedToken(res);
    if (!token) return;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Prefer: "odata.maxpagesize=200",
    };

    // If soId provided, prefer using totals/payment-terms stored on the SOBG header to avoid
    // mismatch between UI and server (frontend may compute totals differently).
    let effectiveTotalAmount: string | undefined = totalAmount;
    let headerPaymentTermNormalized: string | null = null;
    const soGuid = normalizeGuid(soId);
    if (soGuid) {
      try {
        const hdrEndpoint = `${BASE_URL}crdfd_sobaogias(${soGuid})?$select=crdfd_tongtiencovat,crdfd_tongtien,crdfd_tongtienkhongvat,crdfd_dieu_khoan_thanh_toan,crdfd_ieukhoanthanhtoan`;
        const hdrResp = await axios.get(hdrEndpoint, { headers });
        const hdr = hdrResp.data || {};
        const headerTotalNum = Number(hdr.crdfd_tongtiencovat ?? hdr.crdfd_tongtien ?? hdr.crdfd_tongtienkhongvat) || 0;
        if (headerTotalNum > 0) {
          effectiveTotalAmount = String(headerTotalNum);
        }
        const headerPaymentRaw = hdr.crdfd_dieu_khoan_thanh_toan ?? hdr.crdfd_ieukhoanthanhtoan;
        headerPaymentTermNormalized = headerPaymentRaw ? normalizePaymentTerm(String(headerPaymentRaw)) : null;
      } catch (err) {
        // If header fetch fails, fall back to provided totalAmount/paymentTerms
        console.warn('[promotion-orders] Could not fetch SOBG header to derive totals/payment-terms:', (err as any)?.message || err);
      }
    } else if (soId) {
      // Tại sao: soId không phải GUID hợp lệ → gọi Dataverse chắc chắn 400, chỉ log nhẹ rồi bỏ qua
      console.warn('[promotion-orders] Skip SOBG header fetch because soId is not a valid GUID:', soId);
    }

    // Step 3: Fetch existing promotion orders for the sales order
    const existingPromotionOrders = soId
      ? await fetchExistingPromotionOrders(soId, headers)
      : [];

    // Step 4: Build filters and fetch available promotions
    // Use effectiveTotalAmount (may have been overridden from SOBG header)
    const filters = buildPromotionFilters(customerCode, effectiveTotalAmount);
    const fetchedPromotions = await fetchAvailablePromotions(filters, headers);
    // Preserve full fetched list (before further narrowing) so we can surface
    // "special" promotions regardless of product code constraints.
    const allFetchedPromotions = fetchedPromotions.slice();
    // Narrow available promotions to those of type 'Order' for normal processing
    let availablePromotions = fetchedPromotions.filter(p => String(p.type || '').toLowerCase() === 'order');

    // Debug logging
    console.log(`Available promotions before filtering: ${availablePromotions.length}`);
    availablePromotions.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));

    // Step 5: Filter by product codes/groups if provided
    availablePromotions = filterPromotionsByProducts(
      availablePromotions,
      productCodes,
      productGroupCodes
    );

    // Debug logging
    console.log(`After product filtering: ${availablePromotions.length}`);
    availablePromotions.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));

    // Step 6: Annotate promotions with payment terms applicability (if provided in query)
    // Determine requested payment terms: prefer explicit query param; fallback to header value if present
    const requestedPaymentTerms = req.query?.paymentTerms
      ? normalizePaymentTerm(String(req.query.paymentTerms))
      : headerPaymentTermNormalized;

    const annotateWithPaymentTerms = (promotions: AvailablePromotion[]) => {
      return promotions.map((p) => {
        // Parse multiple payment terms (comma-separated) into array
        const promoTermsArray = parsePaymentTerms(p.ieukhoanthanhtoanapdung);
        // Use first normalized term for display purposes
        const promoNormalized = promoTermsArray.length > 0 ? promoTermsArray[0] : null;
        let applicable = true;
        let paymentTermsMismatch = false;
        let warningMessage: string | undefined;
        if (requestedPaymentTerms) {
          if (!p.ieukhoanthanhtoanapdung || String(p.ieukhoanthanhtoanapdung).trim() === '') {
            applicable = true;
          } else if (isPaymentTermAllowed(requestedPaymentTerms, promoTermsArray)) {
            // requested payment term is in the list of allowed terms
            applicable = true;
          } else {
            applicable = false;
            paymentTermsMismatch = true;
            // Use friendly labels for multiple payment terms
            const promoLabels = promoTermsArray
              .map((term) => PAYMENT_TERMS_MAP[term] || term)
              .join(" hoặc ");
            const orderLabel = PAYMENT_TERMS_MAP[requestedPaymentTerms] || String(req.query.paymentTerms || '');
            warningMessage = `Điều khoản thanh toán không khớp: chương trình yêu cầu \"${promoLabels}\", đơn hàng là \"${orderLabel}\"`;
          }
        }
        return { ...p, paymentTermsNormalized: promoNormalized, applicable, paymentTermsMismatch, warningMessage };
      });
    };

    // Annotate both the product-filtered promotions and the full fetched list
    availablePromotions = annotateWithPaymentTerms(availablePromotions);
    const allFetchedPromotionsAnnotated = annotateWithPaymentTerms(allFetchedPromotions);

    // Debug logging
    console.log(`After payment terms filtering: ${availablePromotions.length}`);
    availablePromotions.forEach(p => console.log(`- ${p.name} (ID: ${p.id}, applicable: ${p.applicable})`));

    // Step 7: Only consider promotions that are applicable for max-value selection
    const applicableAvailablePromotions = availablePromotions.filter(p => (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true'));
    // Step 7: Get max value promotions (apply chietKhau2 filter and max logic)
    const promotionOrderMax = getMaxValuePromotions(applicableAvailablePromotions);

    // Step 7b: Extract "special" promotions that should be shown regardless of product codes.
    // These promotions are identified by name and must be surfaced even when existingPromotionOrders exist.
    const SPECIAL_PROMOTION_NAMES = [
      "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1",
      "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA (New customer)",
      "[ALL] VOUCHER SINH NHẬT - 50.000Đ"
    ];

    // Match special promotions by case-insensitive substring to tolerate minor name differences
    let specialPromotions = allFetchedPromotionsAnnotated.filter(p => {
      const name = String(p.name || '').trim().toLowerCase();
      return SPECIAL_PROMOTION_NAMES.some(sp => name.includes(String(sp).trim().toLowerCase()));
    });

    // If some special promotions are missing from the initial fetch (due to filters like customerCode/totalAmount/time window),
    // explicitly query CRM for those promotion names and merge results.
    if (specialPromotions.length < SPECIAL_PROMOTION_NAMES.length) {
      try {
        const missingNames = SPECIAL_PROMOTION_NAMES.filter(n => !specialPromotions.some(p => String(p.name || '').trim() === n));
        if (missingNames.length > 0) {
        // Use contains(...) to find promotions that include the target name fragment (case-insensitive)
        const nameFilters = missingNames.map(n => `contains(tolower(crdfd_name),'${escapeODataValue(String(n).toLowerCase())}')`).join(' or ');
          // Keep basic active/time filters so we don't return inactive promotions
          const nowIso = new Date().toISOString();
          const extraFilter = `statecode eq 0 and crdfd_promotion_deactive eq 'Active' and (${nameFilters}) and crdfd_start_date le ${nowIso} and (crdfd_end_date ge ${nowIso} or crdfd_end_date eq null)`;
          const selectFields = [
            "crdfd_promotionid",
            "crdfd_name",
            "crdfd_type",
            "crdfd_value",
            "crdfd_vn",
            "cr1bb_chietkhau2",
            "crdfd_masanpham_multiple",
            "cr1bb_manhomsp_multiple",
            "cr1bb_tongtienapdung",
            "cr1bb_ieukhoanthanhtoanapdung",
            "crdfd_start_date",
            "crdfd_end_date"
          ];
          const extraQuery = `$select=${selectFields.join(",")}&$filter=${encodeURIComponent(extraFilter)}`;
          const extraEndpoint = `${BASE_URL}${PROMOTION_TABLE}?${extraQuery}`;
          const extraResp = await axios.get(extraEndpoint, { headers });
          const extraPromos = (extraResp.data.value || []).map((promo: any) => ({
            id: promo.crdfd_promotionid,
            name: promo.crdfd_name,
            type: promo.crdfd_type,
            value: parsePromotionValue(promo.crdfd_value),
            vndOrPercent: promo.crdfd_vn,
            chietKhau2: normalizeChietKhau2(promo.cr1bb_chietkhau2),
            productCodes: promo.crdfd_masanpham_multiple,
            productGroupCodes: promo.cr1bb_manhomsp_multiple,
            totalAmountCondition: promo.cr1bb_tongtienapdung,
            ieukhoanthanhtoanapdung: promo.cr1bb_ieukhoanthanhtoanapdung,
            startDate: promo.crdfd_start_date,
            endDate: promo.crdfd_end_date,
          }));

          // Annotate these extra promos with payment terms as earlier
          const extraAnnotated = annotateWithPaymentTerms(extraPromos);
          // Merge any missing ones
          for (const ep of extraAnnotated) {
            if (!specialPromotions.some(p => p.id === ep.id)) {
              specialPromotions.push(ep);
            }
          }
        }
      } catch (err: any) {
        console.warn('[promotion-orders] Could not fetch missing special promotions:', (err as any)?.message || err);
      }
    }

    // If there are available promotions that include chiết khấu 2 (line discounts),
    // do not surface special promotions (specials should not be shown when chietKhau2 promotions exist).
    const hasChietKhau2 = availablePromotions.some(p => Boolean(p.chietKhau2));
    if (hasChietKhau2) {
      specialPromotions = [];
    }

    // Debug logging
    console.log(`Final available promotions (max value): ${promotionOrderMax.length}`);
    promotionOrderMax.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));

    // Step 8: Return response (include `specialPromotions` for UI to show regardless of product filtering)
    res.status(200).json({
      existingPromotionOrders,
      hasExistingPromotionOrder: existingPromotionOrders.length > 0,
      availablePromotions: promotionOrderMax,
      allPromotions: availablePromotions,
      specialPromotions,
    });

  } catch (error: any) {
    handleApiError(error, res);
  }
}

