import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const PROMOTION_TABLE = "crdfd_promotions";
const ORDERS_X_PROMOTION_TABLE = "crdfd_ordersxpromotions";

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
 * API để lấy danh sách Promotion đặc biệt (Special Promotions)
 * Chỉ lấy những promotion đặc biệt mà khách hàng được áp dụng
 *
 * Query params:
 * - soId: ID của Sales Order để check promotion order đã áp dụng
 * - customerCode: Mã khách hàng để filter promotion (format: KH-XXXX)
 * - paymentTerms: Điều khoản thanh toán của đơn hàng
 */

interface SpecialPromotion {
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
 * Normalize chietKhau2 field to number (191920001 = Yes, 191920000 = No)
 */
const normalizeChietKhau2 = (value: any): number => {
  return value === true || value === 1 || value === '1' || value === 191920001 || value === '191920001'
    ? 191920001
    : 191920000;
};

/**
 * Validate and format query parameters
 */
const validateAndFormatQueryParams = (query: any) => {
  const {
    soId,
    customerCode,
    paymentTerms
  } = query;

  return {
    soId: soId ? String(soId).trim() : undefined,
    customerCode: customerCode ? String(customerCode).trim() : undefined,
    paymentTerms: paymentTerms ? normalizePaymentTerm(String(paymentTerms)) : null,
  };
};

/**
 * Fetch existing special promotion orders for a sales order
 */
const fetchExistingSpecialPromotionOrders = async (
  soId: string,
  specialPromotionIds: string[],
  headers: any
) => {
  try {
    const promotionIdFilters = specialPromotionIds.map(id => `_crdfd_promotion_value eq ${id}`).join(' or ');
    const filters = [
      "statecode eq 0", // Active
      `_crdfd_so_value eq ${soId}`,
      "crdfd_type eq 'Order'",
      `(${promotionIdFilters})`
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
    return (response.data.value || []).map((item: any) => ({
      id: item.crdfd_ordersxpromotionid,
      name: item.crdfd_name,
      promotionId: item._crdfd_promotion_value,
      type: item.crdfd_type,
    }));
  } catch (error) {
    console.warn("Error fetching existing special promotion orders:", error);
    return [];
  }
};

/**
 * Fetch special promotions from CRM
 */
const fetchSpecialPromotions = async (
  customerCode: string,
  headers: any
): Promise<SpecialPromotion[]> => {
  try {
    // CRM-side filters: active promotions only, active flag, type = Order.
    // For special promotions we want to only load promotions targeted to the customer
    // (cr3b9_ma_khachhang_apdung contains customerCode) and with crdfd_vn = 191920001.
    const filters: string[] = [
      "statecode eq 0",
      "crdfd_promotion_deactive eq 'Active'",
      "crdfd_type eq 'Order'",
      // ensure correct vnd code (191920001 for special promotions)
      "crdfd_vn eq 191920001"
    ];
    // If a customerCode is provided, request CRM to only return promotions that include that customer code
    // in cr3b9_ma_khachhang_apdung. Use contains() for substring match.
    if (customerCode && String(customerCode).trim() !== "") {
      const safe = escapeODataValue(String(customerCode).trim());
      filters.push(`contains(cr3b9_ma_khachhang_apdung,'${safe}')`);
    }

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
      "cr3b9_ma_khachhang_apdung",
      "crdfd_vndtext",
      "crdfd_start_date",
      "crdfd_end_date"
    ];

    const filterExpr = filters.length > 0 ? `&$filter=${encodeURIComponent(filters.join(" and "))}` : "";
    const query = `$select=${selectFields.join(",")}${filterExpr}&$orderby=crdfd_value desc`;

    const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;
    const response = await axios.get(endpoint, { headers });
    const rawItems = (response.data?.value || []);

    // Map raw items; because we already asked CRM to return only crdfd_vn = 191920001 and optionally
    // promotions that contain the customer code, we can map and return the list directly.
    const mapped = rawItems.map((promo: any) => ({
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
      customerCodes: promo.cr3b9_ma_khachhang_apdung || "",
      currencyText: promo.crdfd_vndtext || "",
      startDate: promo.crdfd_start_date,
      endDate: promo.crdfd_end_date,
    }));

    console.log(`[SpecialPromotions] Mapped special promotions count: ${mapped.length}`);
    return mapped;
  } catch (error) {
    console.warn("Error fetching special promotions:", error);
    return [];
  }
};

/**
 * Fetch raw CRM response for special promotions (used for debugging)
 */
const fetchSpecialPromotionsRaw = async (customerCode: string, headers: any) => {
  try {
    const filters = [
      "statecode eq 0",
      "crdfd_promotion_deactive eq 'Active'",
      "crdfd_type eq 'Order'",
      "crdfd_vndtext eq 'VNĐ'"
    ];

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
      "cr3b9_ma_khachhang_apdung",
      "crdfd_start_date",
      "crdfd_end_date"
    ];

    const filterExprRaw = filters.length > 0 ? `&$filter=${encodeURIComponent(filters.join(" and "))}` : "";
    const query = `$select=${selectFields.join(",")}${filterExprRaw}&$orderby=crdfd_value desc`;

    const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;
    const response = await axios.get(endpoint, { headers });
    return response.data;
  } catch (error) {
    console.warn("Error fetching raw special promotions:", error);
    throw error;
  }
};

/**
 * Annotate promotions with payment terms applicability
 */
const annotateWithPaymentTerms = (promotions: SpecialPromotion[], requestedPaymentTerms: string | null) => {
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
        const orderLabel = PAYMENT_TERMS_MAP[requestedPaymentTerms] || requestedPaymentTerms;
        warningMessage = `Điều khoản thanh toán không khớp: chương trình yêu cầu "${promoLabels}", đơn hàng là "${orderLabel}"`;
      }
    }

    return {
      ...p,
      paymentTermsNormalized: promoNormalized,
      applicable,
      paymentTermsMismatch,
      warningMessage
    };
  });
};

/**
 * Handle API errors
 */
const handleApiError = (error: any, res: NextApiResponse) => {
  console.error("Error fetching special promotion orders:", error);

  if (error.response) {
    console.error("Error response status:", error.response.status);
    console.error("Error response data:", JSON.stringify(error.response.data, null, 2));

    return res.status(error.response.status || 500).json({
      error: "Error fetching special promotion orders",
      details: error.response.data?.error?.message || error.response.data?.error || error.message,
    });
  }

  res.status(500).json({
    error: "Error fetching special promotion orders",
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
    const { soId, customerCode, paymentTerms } = validatedParams;

    // Require customer code for special promotions
    if (!customerCode) {
      return res.status(400).json({
        error: "customerCode is required for special promotions"
      });
    }

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

    // Step 3: Fetch special promotions for the customer
    const specialPromotions = await fetchSpecialPromotions(customerCode, headers);
    const debugMode = String(req.query.debug || "").toLowerCase() === "1" || String(req.query.debug || "").toLowerCase() === "true";
    let rawCrmResponse: any = undefined;
    if (debugMode) {
      try {
        rawCrmResponse = await fetchSpecialPromotionsRaw(customerCode, headers);
      } catch (err) {
        rawCrmResponse = { error: String((err as any)?.message || err) };
      }
    }

    // Step 4: Annotate with payment terms applicability
    const annotatedPromotions = annotateWithPaymentTerms(specialPromotions, paymentTerms);

    // Step 5: Filter to only applicable promotions
    const applicablePromotions = annotatedPromotions.filter(p => p.applicable);

    // Step 6: Check existing applications if soId provided
    let existingSpecialPromotionOrders: any[] = [];
    let hasExistingSpecialPromotionOrder = false;

    if (soId && applicablePromotions.length > 0) {
      const specialPromotionIds = applicablePromotions.map(p => p.id);
      existingSpecialPromotionOrders = await fetchExistingSpecialPromotionOrders(soId, specialPromotionIds, headers);
      hasExistingSpecialPromotionOrder = existingSpecialPromotionOrders.length > 0;
    }

    // Step 7: Return response
    res.status(200).json({
      existingSpecialPromotionOrders,
      hasExistingSpecialPromotionOrder,
      specialPromotions: applicablePromotions,
      totalCount: applicablePromotions.length,
      ...(debugMode ? { crmRawResponse: rawCrmResponse } : {})
    });

  } catch (error: any) {
    handleApiError(error, res);
  }
}
