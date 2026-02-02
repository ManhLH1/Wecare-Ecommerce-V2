import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const PROMOTION_TABLE = "crdfd_promotions";
const CUSTOMER_TABLE = "crdfd_customers";

const escapeODataValue = (value: string) => value.replace(/'/g, "''");

// Payment terms mapping (key -> label) - keep in sync with frontend PAYMENT_TERMS_MAP
const PAYMENT_TERMS_MAP: Record<string, string> = {
  // Note: OptionSet value "0" corresponds to "Thanh toán sau khi nhận hàng" in CRM
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
  // If exact key exists
  if (PAYMENT_TERMS_MAP[t]) return t;
  // If input matches a label (case-insensitive), find the key
  const foundKey = Object.keys(PAYMENT_TERMS_MAP).find(
    (k) => PAYMENT_TERMS_MAP[k].toLowerCase() === t.toLowerCase()
  );
  if (foundKey) return foundKey;
  // If input contains digits only, try that
  const digits = t.replace(/\D/g, "");
  if (digits && PAYMENT_TERMS_MAP[digits]) return digits;
  // Fallback: return original normalized string
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

const resolveCustomerCodeFromPhone = async (phone: string, headers: Record<string, string>) => {
  const variants: string[] = [];
  const trimmed = phone.trim();
  const noSpace = trimmed.replace(/\s+/g, "");
  variants.push(trimmed, noSpace);
  // Try without leading 0
  if (noSpace.startsWith("0")) variants.push(noSpace.slice(1));
  // Try with +84 replacement
  if (noSpace.startsWith("0")) variants.push("+84" + noSpace.slice(1));
  if (noSpace.startsWith("84")) variants.push("+84" + noSpace.slice(2));
  // Try last 9-10 digits
  if (noSpace.length > 9) variants.push(noSpace.slice(-9));
  if (noSpace.length > 10) variants.push(noSpace.slice(-10));

  for (const v of variants) {
    const safe = escapeODataValue(v);
    const filter = `$filter=${encodeURIComponent(
      `(crdfd_phone2 eq '${safe}' or crdfd_phone eq '${safe}' or contains(crdfd_phone2,'${safe}') or contains(crdfd_phone,'${safe}'))`
    )}&$select=crdfd_makhachhang,cr44a_st&$top=1`;
    const endpoint = `${BASE_URL}${CUSTOMER_TABLE}?${filter}`;
    try {
      const response = await axios.get(endpoint, { headers });
      const item = response.data.value?.[0];
      if (item) {
        const code = item.crdfd_makhachhang || item.cr44a_st;
        if (code) {
          return code;
        }
      }
    } catch (e) {
      // continue to next variant
    }
  }

  return phone;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCode, customerCode, customerCodes, region, paymentTerms } = req.query;

    // productCode can be comma-separated; require at least one
    if (!productCode || typeof productCode !== "string" || !productCode.trim()) {
      return res.status(400).json({ error: "productCode is required" });
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
      Prefer: "odata.maxpagesize=200",
    };

    const filters: string[] = [
      "statecode eq 0",
      "crdfd_promotion_deactive eq 'Active'",
    ];

    // Time window: start_date <= now AND (no end_date OR end_date >= now)
    const nowIso = new Date().toISOString();
    filters.push(`crdfd_start_date le ${nowIso}`);
    filters.push(`(crdfd_end_date ge ${nowIso} or crdfd_end_date eq null)`);

    // Support multiple product codes (comma separated)
    const productCodes = productCode
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (productCodes.length > 0) {
      const productFilter = productCodes
        .map((code) => `contains(crdfd_masanpham_multiple,'${escapeODataValue(code)}')`)
        .join(" or ");
      filters.push(`(${productFilter})`);
    }

    const customerCodesArray: string[] = [];
    if (customerCode && typeof customerCode === "string" && customerCode.trim()) {
      customerCodesArray.push(customerCode.trim());
    }
    if (customerCodes) {
      const codes = Array.isArray(customerCodes) ? customerCodes : [customerCodes];
      codes.forEach((code) => {
        if (typeof code === "string") {
          code
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
            .forEach((part) => customerCodesArray.push(part));
        }
      });
    }

    // Normalize customer codes: if a value looks like phone (digits only), try resolve to mã khách hàng
    const resolvedCustomerCodes: string[] = [];
    for (const code of customerCodesArray) {
      const isPhoneLike = /^[0-9]{6,}$/.test(code);
      if (isPhoneLike) {
        try {
          const resolved = await resolveCustomerCodeFromPhone(code, headers);
          resolvedCustomerCodes.push(resolved);
        } catch (e) {
          // Fallback to original if lookup fails
          resolvedCustomerCodes.push(code);
        }
      } else {
        resolvedCustomerCodes.push(code);
      }
    }

    if (resolvedCustomerCodes.length > 0) {
      // Note: OData contains() can cause false positives with substring matches
      // (e.g., "KH-1766" matches "KH-17664"). We'll filter client-side for exact matches.
      // Use startswith/endswith for better precision where possible, but still need client-side filtering
      const customerFilter = resolvedCustomerCodes
        .map((code) => {
          const safeCode = escapeODataValue(code);
          // Use startswith/endswith for better precision, but still include contains as fallback
          // Client-side filtering will ensure exact token match
          return (
            `cr3b9_ma_khachhang_apdung eq '${safeCode}'` +
            ` or startswith(cr3b9_ma_khachhang_apdung,'${safeCode},')` +
            ` or endswith(cr3b9_ma_khachhang_apdung,',${safeCode}')` +
            ` or contains(cr3b9_ma_khachhang_apdung,',${safeCode},')`
          );
        })
        .map((expr) => `(${expr})`)
        .join(" or ");
      filters.push(`(${customerFilter})`);
    }

    const columns = [
      "crdfd_promotionid",
      "crdfd_name",
      "crdfd_conditions",
      "crdfd_type",
      "cr1bb_chietkhau2",
      "crdfd_value",
      "crdfd_vn",
      "crdfd_start_date",
      "crdfd_end_date",
      "crdfd_multiple_tennhomsp",
      "crdfd_tensanpham_multiple",
      "crdfd_masanpham_multiple",
      "cr3b9_ma_khachhang_apdung",
      "cr1bb_tongtienapdung",
      "crdfd_promotiontypetext",
      "cr1bb_soluongapdung",
      "crdfd_soluongapdungmuc3",
      "cr1bb_congdonsoluong",
      "cr1bb_value2",
      "crdfd_value3",
      "cr3b9_valuemuakem",
      "crdfd_value_co_vat",
      "crdfd_value_khong_vat",
      "cr1bb_ieukhoanthanhtoanapdung",
      "cr1bb_ieukhoanthanhtoanapdungmuc3",
      "cr3b9_dieukhoanthanhtoanapdungmuc2",
      "cr1bb_manhomsp_multiple",
      "cr1bb_manhomspmuakem",
      "cr1bb_masanphammuakem",
      "crdfd_salehangton",
      "cr1bb_onvitinh",
    ].join(",");

    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filters.join(" and ")
    )}&$orderby=crdfd_start_date desc`;

    const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;
    const response = await axios.get(endpoint, { headers });

    // Filter promotions by region if provided
    // Promotion names contain region in format: [MIỀN TRUNG] or [MIỀN NAM]
    let promotions = (response.data.value || []).map((promo: any) => ({
      id: promo.crdfd_promotionid,
      name: promo.crdfd_name,
      conditions: promo.crdfd_conditions,
      type: promo.crdfd_type,
      value: promo.crdfd_value,
      value2: promo.cr1bb_value2,
      chietKhau2: promo.cr1bb_chietkhau2,
      value3: promo.crdfd_value3,
      valueWithVat: promo.crdfd_value_co_vat,
      valueNoVat: promo.crdfd_value_khong_vat,
      valueBuyTogether: promo.cr3b9_valuemuakem,
      vn: promo.crdfd_vn,
      startDate: promo.crdfd_start_date,
      endDate: promo.crdfd_end_date,
      productNames: promo.crdfd_tensanpham_multiple,
      productCodes: promo.crdfd_masanpham_multiple,
      productGroupCodes: promo.cr1bb_manhomsp_multiple,
      buyTogetherGroupCodes: promo.cr1bb_manhomspmuakem,
      buyTogetherProductCodes: promo.cr1bb_masanphammuakem,
      customerCodes: promo.cr3b9_ma_khachhang_apdung,
      totalAmountCondition: promo.cr1bb_tongtienapdung,
      quantityCondition: promo.cr1bb_soluongapdung,
      quantityConditionLevel3: promo.crdfd_soluongapdungmuc3,
      cumulativeQuantity: promo.cr1bb_congdonsoluong,
      promotionTypeText: promo.crdfd_promotiontypetext,
      paymentTerms: promo.cr1bb_ieukhoanthanhtoanapdung,
      paymentTermsLevel3: promo.cr1bb_ieukhoanthanhtoanapdungmuc3,
      paymentTermsLevel2: promo.cr3b9_dieukhoanthanhtoanapdungmuc2,
      saleInventoryOnly: promo.crdfd_salehangton,
      unitName: promo.cr1bb_onvitinh,
    }));

    // Client-side filtering: Ensure exact customer code match (not substring)
    // This prevents "KH-1766" from matching "KH-17664"
    if (resolvedCustomerCodes.length > 0) {
      promotions = promotions.filter((promo: any) => {
        const customerCodesStr = promo.customerCodes || "";
        
        // If promotion has no customer codes specified, it applies to all customers - keep it
        if (!customerCodesStr || customerCodesStr.trim() === "") {
          return true;
        }
        
        // Split by comma and check for exact match
        const codesList = customerCodesStr.split(',').map((c: string) => c.trim()).filter(Boolean);
        
        // Check if any of the resolved customer codes exactly matches a code in the list
        return resolvedCustomerCodes.some((searchCode: string) => {
          return codesList.includes(searchCode);
        });
      });
    }

    // Filter by region if provided
    // Promotion names may contain region in format: [MIỀN TRUNG] or [MIỀN NAM]
    // If promotion has no region tag, it applies to all regions
    if (region && typeof region === "string" && region.trim()) {
      const regionLower = region.trim().toLowerCase();
      const normalizedRegion = regionLower.includes("miền trung") ? "MIỀN TRUNG" :
                               regionLower.includes("miền nam") ? "MIỀN NAM" : null;

      if (normalizedRegion) {
        promotions = promotions.filter((promo: any) => {
          const promoName = (promo.name || "").toUpperCase();
          // If promotion name contains a region tag, it must match the requested region
          if (promoName.includes("[MIỀN TRUNG]") || promoName.includes("[MIỀN NAM]")) {
            return promoName.includes(`[${normalizedRegion}]`);
          }
          // If promotion doesn't have region tag, include it (applies to all regions)
          return true;
        });
      }
    }

    // Filter out promotions with type "Order"
    promotions = promotions.filter((promo: any) => promo.type !== "Order");

    // Normalize and annotate promotions with applicability/payment-terms info.
    const requestedNormalized = paymentTerms && typeof paymentTerms === "string" && paymentTerms.trim()
      ? normalizePaymentTerm(paymentTerms)
      : null;

    promotions = promotions.map((promo: any) => {
      const promoPaymentTerms = promo.paymentTerms;
      // Parse multiple payment terms (comma-separated) into array
      const promoTermsArray = parsePaymentTerms(promoPaymentTerms);
      // Use first normalized term for display purposes
      const promoNormalized = promoTermsArray.length > 0 ? promoTermsArray[0] : null;
      let applicable = true;
      let paymentTermsMismatch = false;
      let warningMessage: string | undefined;

      if (requestedNormalized) {
        // If promotion has no payment terms restriction -> applicable
        if (!promoPaymentTerms || promoPaymentTerms.trim() === "") {
          applicable = true;
        } else if (isPaymentTermAllowed(requestedNormalized, promoTermsArray)) {
          // requested payment term is in the list of allowed terms
          applicable = true;
        } else {
          applicable = false;
          paymentTermsMismatch = true;
          // Build friendly labels for multiple payment terms
          const promoLabels = promoTermsArray
            .map((term) => PAYMENT_TERMS_MAP[term] || term)
            .join(" hoặc ");
          const orderLabel = PAYMENT_TERMS_MAP[requestedNormalized] || requestedNormalized;
          warningMessage = `Điều khoản thanh toán không khớp: chương trình yêu cầu "${promoLabels}", đơn hàng là "${orderLabel}"`;
        }
      } else {
        // No payment term provided by client -> treat as applicable
        applicable = true;
      }

      return {
        ...promo,
        paymentTermsNormalized: promoNormalized,
        applicable,
        paymentTermsMismatch,
        warningMessage,
      };
    });

    // Return annotated promotions array (backwards-compatible: still an array)
    res.status(200).json(promotions);
  } catch (error: any) {
    console.error("Error fetching promotions:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error(
        "Error response data:",
        JSON.stringify(error.response.data, null, 2)
      );
      return res.status(error.response.status || 500).json({
        error: "Error fetching promotions",
        details:
          error.response.data?.error?.message ||
          error.response.data?.error ||
          error.message,
        fullError: error.response.data,
      });
    }

    res.status(500).json({
      error: "Error fetching promotions",
      details: error.message,
    });
  }
}

