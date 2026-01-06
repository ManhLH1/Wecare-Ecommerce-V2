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
 * http://localhost:3000/api/admin-app/promotion-orders?customerCode=KH-4265&productCodes=SP-019397&productGroupCodes=NSP-000373
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
  productGroupCodes?: string;
}

interface AvailablePromotion {
  id: string;
  name: string;
  type: string;
  value: number;
  vndOrPercent: string;
  chietKhau2: boolean;
  productGroupCodes?: string;
  totalAmountCondition?: number;
  ieukhoanthanhtoanapdung?: any;
  startDate?: string;
  endDate?: string;
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
 * Check if promotion matches product groups (productCodes filtering removed for performance)
 */
const doesPromotionMatchProducts = (promo: AvailablePromotion, productCodes: string[], productGroups: string[]): boolean => {
  // Only check product group match (productCodes check removed for performance)
  const hasGroupMatch = productGroups.some(code =>
    promo.productGroupCodes && promo.productGroupCodes.includes(code)
  );

  return hasGroupMatch;
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
    "crdfd_promotion_deactive eq 'Active'"
  ];

  // Time window filter
  const nowIso = new Date().toISOString();
  filters.push(`crdfd_start_date le ${nowIso}`);

  // Special direct discount promotions that should be included regardless of customer code
  const DIRECT_DISCOUNT_PROMOTIONS = [
    "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1",
    "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA (New customer)",
    "[ALL] VOUCHER SINH NHẬT - 50.000Đ"
  ];

  // Build complex filter for regular promotions + special direct discount promotions
  let regularPromotionFilter = "(crdfd_type eq 'Order'";

  // Add customer code filter for regular Order type promotions
  if (customerCode && typeof customerCode === "string" && customerCode.trim()) {
    const safeCode = escapeODataValue(customerCode.trim());
    regularPromotionFilter += ` and (cr3b9_ma_khachhang_apdung eq '${safeCode}' or `;
    regularPromotionFilter += `contains(cr3b9_ma_khachhang_apdung,'${safeCode},') or `;
    regularPromotionFilter += `contains(cr3b9_ma_khachhang_apdung,',${safeCode},') or `;
    regularPromotionFilter += `contains(cr3b9_ma_khachhang_apdung,',${safeCode}'))`;
  }

  regularPromotionFilter += ")";

  // Special direct discount promotions (always included, regardless of customer code)
  const specialPromotionFilters = DIRECT_DISCOUNT_PROMOTIONS.map(name =>
    `(crdfd_name eq '${escapeODataValue(name)}' and crdfd_type eq 'Order')`
  ).join(" or ");

  // Combine regular and special promotion filters
  filters.push(`(${regularPromotionFilter} or ${specialPromotionFilters})`);

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

  // Special direct discount promotions that should always pass product filter
  const DIRECT_DISCOUNT_PROMOTIONS = [
    "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1",
    "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA (New customer)",
    "[ALL] VOUCHER SINH NHẬT - 50.000Đ"
  ].map(s => s.toLowerCase());

  const filtered = promotions.filter(promo => {
    // Always include special direct discount promotions
    if (promo.name && DIRECT_DISCOUNT_PROMOTIONS.some(specialName =>
      promo.name.toLowerCase().includes(specialName)
    )) {
      return true;
    }

    // For regular promotions, check product match
    const matches = doesPromotionMatchProducts(promo, productCodeList, productGroupList);
    return matches;
  });

  return filtered;
};

/**
 * Apply chietKhau2 filter and get max value promotions, including special direct discount promotions
 */
const getMaxValuePromotions = (promotions: AvailablePromotion[]): AvailablePromotion[] => {
  // Special direct discount promotions that should always be included
  const DIRECT_DISCOUNT_PROMOTIONS = [
    "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1",
    "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA (New customer)",
    "[ALL] VOUCHER SINH NHẬT - 50.000Đ"
  ].map(s => s.toLowerCase());

  // Separate direct discount promotions from regular promotions
  const directDiscountPromotions = promotions.filter(p =>
    p.name && DIRECT_DISCOUNT_PROMOTIONS.some(specialName =>
      p.name.toLowerCase().includes(specialName)
    )
  );

  // Filter remaining promotions that have chietKhau2 = true (regular line-level promotions)
  const regularPromotions = promotions.filter(p =>
    p.chietKhau2 && !directDiscountPromotions.some(ddp => ddp.id === p.id)
  );

  // Handle Dynamics CRM option set values for regular promotions
  // 191920000 = Percent, other values = VND
  const percentPromotions = regularPromotions.filter(p => {
    const vndOrPercentStr = String(p.vndOrPercent || '');
    return vndOrPercentStr === "%" || vndOrPercentStr === "191920000";
  });
  const vndPromotions = regularPromotions.filter(p => {
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

  // Always include direct discount promotions (they are handled differently now)
  if (directDiscountPromotions.length > 0) {
    result = [...result, ...directDiscountPromotions];
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

    // Step 3: Fetch existing promotion orders for the sales order
    const existingPromotionOrders = soId
      ? await fetchExistingPromotionOrders(soId, headers)
      : [];

    // Step 4: Build filters and fetch available promotions
    const filters = buildPromotionFilters(customerCode, totalAmount);
    let availablePromotions = await fetchAvailablePromotions(filters, headers);

    // Step 5: Filter by product codes/groups if provided
    availablePromotions = filterPromotionsByProducts(
      availablePromotions,
      productCodes,
      productGroupCodes
    );

    // Step 6: Annotate promotions with payment terms applicability (if provided in query)
    const requestedPaymentTerms = req.query?.paymentTerms ? normalizePaymentTerm(String(req.query.paymentTerms)) : null;
    availablePromotions = availablePromotions.map((p) => {
      const promoNormalized = normalizePaymentTerm(String(p.ieukhoanthanhtoanapdung || ''));
      let applicable = true;
      let paymentTermsMismatch = false;
      let warningMessage: string | undefined;
      if (requestedPaymentTerms) {
        if (!p.ieukhoanthanhtoanapdung || String(p.ieukhoanthanhtoanapdung).trim() === '') {
          applicable = true;
        } else if (promoNormalized === requestedPaymentTerms) {
          applicable = true;
        } else {
          applicable = false;
          paymentTermsMismatch = true;
          // Use friendly labels when possible
          const promoLabel = PAYMENT_TERMS_MAP[promoNormalized || String(p.ieukhoanthanhtoanapdung)] || String(p.ieukhoanthanhtoanapdung || '');
          const orderLabel = PAYMENT_TERMS_MAP[requestedPaymentTerms] || String(req.query.paymentTerms || '');
          warningMessage = `Điều khoản thanh toán không khớp: chương trình yêu cầu \"${promoLabel}\", đơn hàng là \"${orderLabel}\"`;
        }
      }
      return { ...p, paymentTermsNormalized: promoNormalized, applicable, paymentTermsMismatch, warningMessage };
    });

    // Step 7: Get max value promotions (apply chietKhau2 filter and max logic)
    const promotionOrderMax = getMaxValuePromotions(availablePromotions);

    // Step 8: Return response
    res.status(200).json({
      existingPromotionOrders,
      hasExistingPromotionOrder: existingPromotionOrders.length > 0,
      availablePromotions: promotionOrderMax,
      allPromotions: availablePromotions,
    });

  } catch (error: any) {
    handleApiError(error, res);
  }
}

