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
 * This endpoint mirrors `/promotion-orders` but is optimized for SOBG context.
 * Query params:
 * - sobgId
 * - customerCode
 * - totalAmount
 * - productCodes
 * - productGroupCodes
 * - paymentTerms
 */

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
  paymentTermsNormalized?: string | null;
  applicable?: boolean;
  paymentTermsMismatch?: boolean;
  warningMessage?: string;
}

const parsePromotionValue = (rawValue: any): number => {
  const parsed = typeof rawValue === 'number' ? rawValue : (rawValue ? Number(rawValue) : 0);
  return !isNaN(parsed) ? parsed : 0;
};

const normalizeChietKhau2 = (value: any): boolean => {
  return value === true || value === 1 || value === '1' || value === 191920001 || value === '191920001';
};

const parseCodesToArray = (codes: any): string[] => {
  if (!codes) return [];
  const codeArray = typeof codes === "string" ? codes.split(",") : codes;
  return codeArray.map((c: any) => String(c || '').trim()).filter(Boolean);
};

const validateSoId = (soId: any): string | undefined => {
  if (!soId) return undefined;
  const soIdStr = String(soId).trim();
  return soIdStr ? soIdStr : undefined;
};

const validateCustomerCode = (customerCode: any): string | undefined => {
  if (!customerCode) return undefined;
  const codeStr = String(customerCode).trim();
  if (codeStr && codeStr.startsWith('KH-')) {
    return codeStr;
  }
  return codeStr || undefined;
};

const validateTotalAmount = (totalAmount: any): string | undefined => {
  if (!totalAmount) return undefined;
  const amountStr = String(totalAmount).trim();
  const amount = parseFloat(amountStr);
  if (!isNaN(amount) && amount >= 0) {
    return amountStr;
  }
  return undefined;
};

const validateProductCodes = (productCodes: any): any => {
  if (!productCodes) return undefined;
  const codes = parseCodesToArray(productCodes);
  const validCodes = codes.filter(code => code.startsWith('SP-'));
  return validCodes.length > 0 ? validCodes.join(',') : undefined;
};

const validateProductGroupCodes = (productGroupCodes: any): any => {
  if (!productGroupCodes) return undefined;
  const codes = parseCodesToArray(productGroupCodes);
  const validCodes = codes.filter(code => code.startsWith('NSP-'));
  return validCodes.length > 0 ? validCodes.join(',') : undefined;
};

const doesPromotionMatchProducts = (promo: AvailablePromotion, productCodes: string[], productGroups: string[]): boolean => {
  const hasProductMatch = productCodes.some(code =>
    promo.productCodes && promo.productCodes.includes(code)
  );
  const hasGroupMatch = productGroups.some(code =>
    promo.productGroupCodes && promo.productGroupCodes.includes(code)
  );
  return hasProductMatch || hasGroupMatch;
};

const fetchExistingPromotionOrders = async (
  sobgId: string,
  headers: any
): Promise<any[]> => {
  try {
    const filters = [
      "statecode eq 0",
      `_crdfd_sobaogia_value eq ${sobgId}`,
      "crdfd_type eq 'Order'"
    ];
    const selectFields = [
      "crdfd_sobaogiaxpromotionid",
      "crdfd_name",
      "_crdfd_promotion_value",
      "crdfd_type"
    ];
    const query = `$filter=${encodeURIComponent(filters.join(" and "))}&$select=${selectFields.join(",")}`;
    const endpoint = `${BASE_URL}${SOBG_X_PROMOTION_TABLE}?${query}`;
    const resp = await axios.get(endpoint, { headers });
    const orders = (resp.data.value || []).map((item: any) => ({
      id: item.crdfd_sobaogiaxpromotionid,
      name: item.crdfd_name,
      promotionId: item._crdfd_promotion_value,
      type: item.crdfd_type,
    }));
    return orders;
  } catch (err) {
    console.warn("Error fetching existing SOBG promotion orders:", err);
    return [];
  }
};

const enrichPromotionOrdersWithDetails = async (
  promotionOrders: any[],
  headers: any
): Promise<AvailablePromotion[]> => {
  if (promotionOrders.length === 0) return promotionOrders as any;
  try {
    const promotionIds = Array.from(new Set(
      promotionOrders.map(order => order.promotionId).filter(Boolean)
    ));
    if (promotionIds.length === 0) return promotionOrders as any;
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
      if (promo && promo.crdfd_promotionid) promoById[promo.crdfd_promotionid] = promo;
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
    console.warn('Error enriching SOBG promotion orders with details:', error);
    return promotionOrders as any;
  }
};

const buildPromotionFilters = (
  customerCode?: string,
  totalAmount?: string
): string[] => {
  const filters = [
    "statecode eq 0",
    "crdfd_promotion_deactive eq 'Active'",
  ];
  const nowIso = new Date().toISOString();
  filters.push(`crdfd_start_date le ${nowIso}`);
  filters.push(`(crdfd_end_date ge ${nowIso} or crdfd_end_date eq null)`);
  if (customerCode && typeof customerCode === "string" && customerCode.trim()) {
    const safeCode = escapeODataValue(customerCode.trim());
    filters.push(
      `(cr3b9_ma_khachhang_apdung eq '${safeCode}' or ` +
      `contains(cr3b9_ma_khachhang_apdung,'${safeCode},') or ` +
      `contains(cr3b9_ma_khachhang_apdung,',${safeCode},') or ` +
      `contains(cr3b9_ma_khachhang_apdung,',${safeCode}'))`
    );
  }
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
  const query = `$select=${selectFields.join(",")}&$filter=${encodeURIComponent(filters.join(" and "))}&$orderby=crdfd_value desc`;
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

const getMaxValuePromotions = (promotions: AvailablePromotion[]): AvailablePromotion[] => {
  const chietKhau2Promotions = promotions.filter(p => p.chietKhau2);
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
  if (percentPromotions.length > 0) {
    const maxPercentValue = Math.max(...percentPromotions.map(p => p.value || 0));
    result = percentPromotions.filter(p => p.value === maxPercentValue);
  }
  if (vndPromotions.length > 0) {
    result = [...result, ...vndPromotions];
  }
  return result;
};

const handleApiError = (error: any, res: NextApiResponse) => {
  console.error("Error fetching SOBG promotion orders:", error);
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const validatedParams = {
      sobgId: validateSoId(req.query?.sobgId),
      customerCode: validateCustomerCode(req.query?.customerCode),
      totalAmount: validateTotalAmount(req.query?.totalAmount),
      productCodes: validateProductCodes(req.query?.productCodes),
      productGroupCodes: validateProductGroupCodes(req.query?.productGroupCodes),
    };

    const token = await getAccessToken();
    if (!token) return handleApiError(new Error('Failed to obtain token'), res);

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Prefer: "odata.maxpagesize=200",
    };

    // Prefer header totals/payment-terms stored on SOBG when available
    let effectiveTotalAmount: string | undefined = validatedParams.totalAmount;
    let headerPaymentTermNormalized: string | null = null;
    let headerTotalNum = 0;
    if (validatedParams.sobgId) {
      try {
        const hdrEndpoint = `${BASE_URL}crdfd_sobaogias(${validatedParams.sobgId})?$select=crdfd_tongtiencovat,crdfd_tongtien,crdfd_tongtienkhongvat,crdfd_dieu_khoan_thanh_toan,crdfd_ieukhoanthanhtoan`;
        const hdrResp = await axios.get(hdrEndpoint, { headers });
        const hdr = hdrResp.data || {};
        headerTotalNum = Number(hdr.crdfd_tongtiencovat ?? hdr.crdfd_tongtien ?? hdr.crdfd_tongtienkhongvat) || 0;
        if (headerTotalNum > 0) effectiveTotalAmount = String(headerTotalNum);
        const headerPaymentRaw = hdr.crdfd_dieu_khoan_thanh_toan ?? hdr.crdfd_ieukhoanthanhtoan;
        headerPaymentTermNormalized = headerPaymentRaw ? normalizePaymentTerm(String(headerPaymentRaw)) : null;
      } catch (err) {
        console.warn('[promotion-orders-sobg] Could not fetch SOBG header to derive totals/payment-terms:', (err as any)?.message || err);
      }
    }

    const existingPromotionOrders = validatedParams.sobgId ? await fetchExistingPromotionOrders(validatedParams.sobgId, headers) : [];

    const filters = buildPromotionFilters(validatedParams.customerCode, effectiveTotalAmount);
    const fetchedPromotions = await fetchAvailablePromotions(filters, headers);
    const allFetchedPromotions = fetchedPromotions.slice();
    let availablePromotions = fetchedPromotions.filter(p => String(p.type || '').toLowerCase() === 'order');

    availablePromotions = filterPromotionsByProducts(
      availablePromotions,
      validatedParams.productCodes,
      validatedParams.productGroupCodes
    );

    const requestedPaymentTerms = req.query?.paymentTerms ? normalizePaymentTerm(String(req.query.paymentTerms)) : headerPaymentTermNormalized;

    const annotateWithPaymentTerms = (promotions: AvailablePromotion[]) => {
      return promotions.map((p) => {
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
            const promoLabel = PAYMENT_TERMS_MAP[promoNormalized || String(p.ieukhoanthanhtoanapdung)] || String(p.ieukhoanthanhtoanapdung || '');
            const orderLabel = PAYMENT_TERMS_MAP[requestedPaymentTerms] || String(req.query.paymentTerms || '');
            warningMessage = `Điều khoản thanh toán không khớp: chương trình yêu cầu \"${promoLabel}\", đơn hàng là \"${orderLabel}\"`;
          }
        }
        return { ...p, paymentTermsNormalized: promoNormalized, applicable, paymentTermsMismatch, warningMessage };
      });
    };

    availablePromotions = annotateWithPaymentTerms(availablePromotions);
    const allFetchedPromotionsAnnotated = annotateWithPaymentTerms(allFetchedPromotions);

    // Debug/logging: surface effective totals & filters to help trace mismatches between UI and server
    try {
      console.log('[promotion-orders-sobg] effectiveTotalAmount=', effectiveTotalAmount, 'headerTotalNum=', headerTotalNum, 'validatedParams=', JSON.stringify(validatedParams));
    } catch (e) {
      // ignore
    }

    // Enforce server-side totalAmountCondition filtering as a safety-net (frontend also filters, but keep server authoritative)
    const totalNum = Number(effectiveTotalAmount || 0);
    availablePromotions = availablePromotions.filter((p) => {
      const cond = Number(p.totalAmountCondition || 0);
      if (!cond || isNaN(cond) || cond === 0) return true;
      return totalNum >= cond;
    });

    const applicableAvailablePromotions = availablePromotions.filter(p => (p.applicable === true) || (String(p.applicable).toLowerCase() === 'true'));
    const promotionOrderMax = getMaxValuePromotions(applicableAvailablePromotions);

    const SPECIAL_PROMOTION_NAMES = [
      "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1",
      "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA (New customer)",
      "[ALL] VOUCHER SINH NHẬT - 50.000Đ"
    ];

    let specialPromotions = allFetchedPromotionsAnnotated.filter(p => {
      const name = String(p.name || '').trim().toLowerCase();
      return SPECIAL_PROMOTION_NAMES.some(sp => name.includes(String(sp).trim().toLowerCase()));
    });

    if (specialPromotions.length < SPECIAL_PROMOTION_NAMES.length) {
      try {
        const missingNames = SPECIAL_PROMOTION_NAMES.filter(n => !specialPromotions.some(p => String(p.name || '').trim() === n));
        if (missingNames.length > 0) {
          const nameFilters = missingNames.map(n => `contains(tolower(crdfd_name),'${escapeODataValue(String(n).toLowerCase())}')`).join(' or ');
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
          const extraAnnotated = annotateWithPaymentTerms(extraPromos);
          for (const ep of extraAnnotated) {
            if (!specialPromotions.some(p => p.id === ep.id)) specialPromotions.push(ep);
          }
        }
      } catch (err: any) {
        console.warn('[promotion-orders-sobg] Could not fetch missing special promotions:', (err as any)?.message || err);
      }
    }

    const hasChietKhau2 = availablePromotions.some(p => Boolean(p.chietKhau2));
    if (hasChietKhau2) specialPromotions = [];

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


