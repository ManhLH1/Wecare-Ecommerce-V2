import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const ORDERS_X_PROMOTION_TABLE = "crdfd_ordersxpromotions";
const SOD_TABLE = "crdfd_saleorderdetails";
const SALE_ORDERS_TABLE = "crdfd_sale_orders";

// Payment terms mapping used to normalize values
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

const normalizePaymentTerm = (input?: any): string | null => {
  if (input === null || input === undefined || input === "") return null;
  const t = String(input).trim();
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
 * API để áp dụng Promotion Order cho Sales Order
 * 
 * Body:
 * - soId: ID của Sales Order
 * - promotionId: ID của Promotion được chọn
 * - promotionName: Tên Promotion
 * - promotionValue: Giá trị chiết khấu
 * - vndOrPercent: "VNĐ" hoặc "%"
 * - chietKhau2: Có phải chiết khấu 2 không (true/false)
 * - productCodes: Danh sách mã sản phẩm áp dụng chiết khấu 2
 * - productGroupCodes: Danh sách mã nhóm SP áp dụng chiết khấu 2
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      soId,
      promotionId,
      promotionName,
      promotionValue,
      vndOrPercent,
      chietKhau2,
      productCodes,
      productGroupCodes,
    } = req.body;

    if (!soId) {
      return res.status(400).json({ error: "soId is required" });
    }

    if (!promotionId) {
      return res.status(400).json({ error: "promotionId is required" });
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

    // 0. Validate promotion conditions before applying
    let promoData: any = null;
    try {
      const promoEndpoint = `${BASE_URL}crdfd_promotions(${promotionId})?$select=cr1bb_tongtienapdung,crdfd_value,crdfd_vn,cr1bb_chietkhau2,crdfd_masanpham_multiple,cr1bb_manhomsp_multiple,cr1bb_ieukhoanthanhtoanapdung`;
      const promoResp = await axios.get(promoEndpoint, { headers });
      promoData = promoResp.data;
    } catch (err) {
      console.warn('[ApplyPromotion] Could not fetch promotion details for validation:', (err as any)?.message || err);
      return res.status(400).json({ error: "Không thể lấy thông tin promotion để kiểm tra điều kiện" });
    }

    // Check total amount condition - use UI-provided total (do NOT fetch SODs)
    // The UI must provide one of: `orderTotal`, `uiTotal`, `totalAmount`, or `crdfd_tongtien`.
    if (promoData && promoData.cr1bb_tongtienapdung !== null && promoData.cr1bb_tongtienapdung !== undefined) {
      const minTotal = Number(promoData.cr1bb_tongtienapdung) || 0;
      if (minTotal > 0) {
        const uiTotalRaw = req.body.orderTotal ?? req.body.uiTotal ?? req.body.totalAmount ?? req.body.crdfd_tongtien;
        if (uiTotalRaw === null || uiTotalRaw === undefined || uiTotalRaw === "") {
          return res.status(400).json({
            error: `Missing order total from UI to validate promotion minimum. Promotion requires ${minTotal.toLocaleString('vi-VN')}đ.`
          });
        }

        // Normalize UI total to number (accept strings with thousand separators)
        const uiTotalNum = typeof uiTotalRaw === "number"
          ? uiTotalRaw
          : Number(String(uiTotalRaw).replace(/[^\d.-]+/g, ""));

        if (isNaN(uiTotalNum)) {
          return res.status(400).json({
            error: `Invalid order total provided from UI for promotion validation.`
          });
        }

        if (uiTotalNum < minTotal) {
          return res.status(400).json({
            error: `Promotion "${promotionName}" yêu cầu đơn hàng tối thiểu ${minTotal.toLocaleString('vi-VN')}đ. Tổng tiền hiện tại (UI): ${Math.round(uiTotalNum).toLocaleString('vi-VN')}đ`
          });
        }
      }
    }

    // 1. Prepare effective promotion values (enrich from CRM if necessary)
    // Support both text and OptionSet numeric for vndOrPercent.
    const OPTION_PERCENT = "191920000";
    const OPTION_VND = "191920001";
    const vndOrPercentNormalized = vndOrPercent !== undefined && vndOrPercent !== null
      ? String(vndOrPercent).trim()
      : "";

    // Initialize effective values from request
    let effectiveChietKhau2 = Boolean(chietKhau2);
    let effectivePromotionValue = promotionValue;
    let effectiveVndOrPercent = vndOrPercentNormalized;
    let effectiveProductCodes = productCodes;
    let effectiveProductGroupCodes = productGroupCodes;

    // Try to fetch promotion record to get canonical values (if needed) - re-use promoData from validation
    if (!promoData) {
      try {
        const promoEndpoint = `${BASE_URL}crdfd_promotions(${promotionId})?$select=crdfd_value,crdfd_vn,cr1bb_chietkhau2,crdfd_masanpham_multiple,cr1bb_manhomsp_multiple,cr1bb_ieukhoanthanhtoanapdung`;
        const promoResp = await axios.get(promoEndpoint, { headers });
        promoData = promoResp.data;
        if (promoData) {
          if (!effectiveChietKhau2) {
            effectiveChietKhau2 = (promoData.cr1bb_chietkhau2 === 191920001) || Boolean(promoData.cr1bb_chietkhau2 === '191920001');
          }
          if (effectivePromotionValue === undefined || effectivePromotionValue === null) {
            const rawVal = promoData.crdfd_value;
            const parsed = typeof rawVal === 'number' ? rawVal : (rawVal ? Number(rawVal) : 0);
            effectivePromotionValue = !isNaN(parsed) ? parsed : effectivePromotionValue;
          }
          if (!effectiveVndOrPercent) {
            effectiveVndOrPercent = promoData.crdfd_vn;
          }
          if (!effectiveProductCodes && promoData.crdfd_masanpham_multiple) {
            effectiveProductCodes = promoData.crdfd_masanpham_multiple;
          }
          if (!effectiveProductGroupCodes && promoData.cr1bb_manhomsp_multiple) {
            effectiveProductGroupCodes = promoData.cr1bb_manhomsp_multiple;
          }
          // promoData may include applicable payment terms (multi-select); keep it available
          // as promoData.cr1bb_ieukhoanthanhtoanapdung
        }
      } catch (err) {
        console.warn('[ApplyPromotion] Could not fetch promotion details to enrich request (pre-create):', (err as any)?.message || err);
      }
    }

    // Special-case promotions: force apply as line-level discount (pre-VAT) for known promotion names
    const FORCE_PRE_VAT_PROMOTIONS = [
      "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1",
      "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA (New customer)",
      "[ALL] VOUCHER SINH NHẬT - 50.000Đ"
    ].map(s => s.toLowerCase());

    // Detect special promotions - for special promotions we will NOT update SODs (only header)
    let isSpecialPromotion = false;
    try {
      const promoNameNorm = String(promotionName || "").toLowerCase();
      isSpecialPromotion = FORCE_PRE_VAT_PROMOTIONS.some(p => promoNameNorm.includes(p));
      if (isSpecialPromotion) {
        // For special promotions, do NOT force chiết khấu 2 at line level; keep header creation only.
        console.log(`[ApplyPromotion] Detected special promotion "${promotionName}" - will apply as header-only.`);
      }
    } catch (e) {
      // ignore
    }

    // Determine loai (Tiền / Phần trăm)
    const isVnd = effectiveVndOrPercent === "VNĐ" || (typeof effectiveVndOrPercent === 'string' && effectiveVndOrPercent.toUpperCase() === "VND") || effectiveVndOrPercent === OPTION_VND;
    const loai = isVnd ? "Tiền" : "Phần trăm";

    console.log('[ApplyPromotion] Effective values:', {
      promotionId,
      promotionName,
      effectivePromotionValue,
      effectiveVndOrPercent,
      effectiveChietKhau2,
      isSpecialPromotion,
      loai
    });

    // Normalize value to store on Orders x Promotion / SO header:
    // - For percent types, store percentage number (e.g., 5)
    //   (if effectivePromotionValue is 0.05, convert to 5)
    // - For VNĐ types, store raw amount
    const computeStoreValue = (vndOrPercentRaw: any, val: any) => {
      const vRaw = vndOrPercentRaw !== undefined && vndOrPercentRaw !== null ? String(vndOrPercentRaw).trim() : "";
      const percentCodes = [OPTION_PERCENT, "%"];
      const isPercentType = percentCodes.includes(vRaw);
      const num = typeof val === 'number' ? val : (val ? Number(val) : 0);
      if (isNaN(num)) return 0;
      if (isPercentType) {
        // Store percent as decimal (e.g., 5 -> 0.05). If already decimal (0.05) keep it.
        return num > 1 ? num / 100 : num;
      }
      return num;
    };

    const chietKhau2ValueToStore = computeStoreValue(effectiveVndOrPercent, effectivePromotionValue);

    const ordersXPromotionPayload: any = {
      crdfd_name: promotionName || "Promotion Order",
      "crdfd_SO@odata.bind": `/crdfd_sale_orders(${soId})`,
      "crdfd_Promotion@odata.bind": `/crdfd_promotions(${promotionId})`,
      crdfd_type: "Order",
      crdfd_loai: loai,
      statecode: 0, // Active
    };

    // Only include crdfd_chieckhau2 when it's a non-zero value
    if (chietKhau2ValueToStore !== undefined && chietKhau2ValueToStore !== null && Number(chietKhau2ValueToStore) !== 0) {
      ordersXPromotionPayload.crdfd_chieckhau2 = chietKhau2ValueToStore;
    }

    // Before creating Orders x Promotion, check if a record for the same SO + Promotion already exists
    let createdOrderXPromotionId: string | undefined = undefined;
    try {
      const existingFilter = `_crdfd_so_value eq ${soId} and _crdfd_promotion_value eq ${promotionId} and crdfd_type eq 'Order' and statecode eq 0`;
      const existingQuery = `$filter=${encodeURIComponent(existingFilter)}&$select=crdfd_ordersxpromotionid`;
      const existingEndpoint = `${BASE_URL}${ORDERS_X_PROMOTION_TABLE}?${existingQuery}`;
      const existingResp = await axios.get(existingEndpoint, { headers });
      const existingItems = existingResp.data?.value || [];
      if (existingItems.length > 0) {
        createdOrderXPromotionId = existingItems[0].crdfd_ordersxpromotionid;
      }
    } catch (err) {
      console.warn('[ApplyPromotion] Failed to check existing Orders x Promotion:', (err as any)?.message || err);
    }

    // Extra safety: re-check total before creating Orders x Promotion using UI-provided total
    if (!createdOrderXPromotionId) {
      try {
        if (promoData && promoData.cr1bb_tongtienapdung !== null && promoData.cr1bb_tongtienapdung !== undefined) {
          const minTotalSafety = Number(promoData.cr1bb_tongtienapdung) || 0;
          if (minTotalSafety > 0) {
            const uiTotalRaw = req.body.orderTotal ?? req.body.uiTotal ?? req.body.totalAmount ?? req.body.crdfd_tongtien;
            if (uiTotalRaw === null || uiTotalRaw === undefined || uiTotalRaw === "") {
              return res.status(400).json({ error: `Missing order total from UI to validate promotion minimum (safety check).` });
            }
            const uiTotalNum = typeof uiTotalRaw === "number"
              ? uiTotalRaw
              : Number(String(uiTotalRaw).replace(/[^\d.-]+/g, ""));
            if (isNaN(uiTotalNum)) {
              return res.status(400).json({ error: "Invalid order total provided from UI for promotion safety validation." });
            }
            if (uiTotalNum < minTotalSafety) {
              return res.status(400).json({ error: `Promotion \"${promotionName}\" không được áp dụng vì đơn hàng chưa đạt điều kiện tổng tiền.` });
            }
          }
        }
      } catch (err: any) {
        console.error('[ApplyPromotion] Safety total re-check failed, aborting apply:', err?.message || err, err?.response?.data);
        return res.status(500).json({ error: "Lỗi khi kiểm tra lại tổng tiền đơn hàng trước khi áp dụng promotion" });
      }

      const createOrderXPromotionEndpoint = `${BASE_URL}${ORDERS_X_PROMOTION_TABLE}`;
      const createResponse = await axios.post(
        createOrderXPromotionEndpoint,
        ordersXPromotionPayload,
        { headers }
      );
      // Get the created record ID from response headers
      createdOrderXPromotionId = createResponse.headers["odata-entityid"]
        ?.match(/\(([^)]+)\)/)?.[1];
    }

    // 2. Special direct discount promotions - no header updates needed

    // 3. Nếu là chiết khấu 2 (chietKhau2 = true) và không phải direct discount promotion, cập nhật crdfd_chieckhau2 và giá trên các SOD matching
    let updatedSodCount = 0;
    // Before applying line-level chiết khấu 2, verify promotion's applicable payment terms (if any) match SO's payment term.
    let disallowedByPaymentTerms = false;
    if (effectiveChietKhau2 && !isSpecialPromotion) {
      try {
        const soEndpoint = `${BASE_URL}${SALE_ORDERS_TABLE}(${soId})?$select=crdfd_dieu_khoan_thanh_toan,crdfd_ieukhoanthanhtoan`;
        const soResp = await axios.get(soEndpoint, { headers });
        const soData = soResp.data || {};
        const soPaymentRaw = soData.crdfd_dieu_khoan_thanh_toan ?? soData.crdfd_ieukhoanthanhtoan;
        const promoPaymentRaw = promoData?.cr1bb_ieukhoanthanhtoanapdung;
        // Support multi-select payment terms: check intersection
        const splitAndNormalize = (raw?: any): string[] => {
          if (raw === null || raw === undefined) return [];
          const s = String(raw).trim();
          if (s === "") return [];
          const tokens = s.split(/[,;|\/]+/).map((t: string) => t.trim()).filter(Boolean);
          return tokens.map((tok: string) => normalizePaymentTerm(tok)).filter(Boolean) as string[];
        };
        const soTokens = splitAndNormalize(soPaymentRaw);
        const promoTokens = splitAndNormalize(promoPaymentRaw);
        if (promoTokens.length > 0 && soTokens.length > 0) {
          const intersect = promoTokens.filter(t => soTokens.includes(t));
          if (intersect.length === 0) {
            disallowedByPaymentTerms = true;
            console.log(`[ApplyPromotion] Promotion ${promotionId} chietKhau2 not applicable due to payment term mismatch (promo=${promoPaymentRaw} so=${soPaymentRaw})`);
          }
        } else if (promoPaymentRaw && String(promoPaymentRaw).trim() !== "" && soTokens.length === 0) {
          // Promotion restricts payment terms but SO has none -> disallow
          disallowedByPaymentTerms = true;
          console.log(`[ApplyPromotion] Promotion ${promotionId} chietKhau2 not applicable: SO missing payment term (promo=${promoPaymentRaw})`);
        }
      } catch (err: any) {
        console.warn('[ApplyPromotion] Failed to fetch SO for payment term check:', err?.message || err);
      }
    }

    if (effectiveChietKhau2 && !isSpecialPromotion && !disallowedByPaymentTerms) {
      try {
        // Lấy danh sách SOD của SO
        const sodFilters = [
          "statecode eq 0",
          `_crdfd_socode_value eq ${soId}`,
        ];

        const sodQuery = `$filter=${encodeURIComponent(
          sodFilters.join(" and ")
        )}&$select=crdfd_saleorderdetailid,crdfd_masanpham,crdfd_manhomsp`;

        const sodEndpoint = `${BASE_URL}${SOD_TABLE}?${sodQuery}`;
        const sodResponse = await axios.get(sodEndpoint, { headers });
        const sodList = sodResponse.data.value || [];

        // Normalize effective product codes/groups into arrays (trim, remove empties)
        const productCodeListRaw = effectiveProductCodes
          ? (Array.isArray(effectiveProductCodes) ? effectiveProductCodes : String(effectiveProductCodes).split(","))
          : [];
        const productCodeList = productCodeListRaw.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
        const productGroupCodeListRaw = effectiveProductGroupCodes
          ? (Array.isArray(effectiveProductGroupCodes) ? effectiveProductGroupCodes : String(effectiveProductGroupCodes).split(","))
          : [];
        const productGroupCodeList = productGroupCodeListRaw.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
        const productCodeListNorm = productCodeList.map(s => s.toUpperCase());
        const productGroupCodeListNorm = productGroupCodeList.map(s => s.toUpperCase());

        const percentCodesForCalc = [OPTION_PERCENT, "%"];
        const effectiveVndOrPercentStr = effectiveVndOrPercent !== undefined && effectiveVndOrPercent !== null ? String(effectiveVndOrPercent).trim() : "";
        const isPercentTypeForCalc = percentCodesForCalc.includes(effectiveVndOrPercentStr);
        let promotionValueForCalc = 0;
        {
          const rawNum = typeof effectivePromotionValue === 'number' ? effectivePromotionValue : (effectivePromotionValue ? Number(effectivePromotionValue) : 0);
          if (isNaN(rawNum)) {
            promotionValueForCalc = 0;
          } else if (isPercentTypeForCalc) {
            promotionValueForCalc = rawNum > 1 ? rawNum / 100 : rawNum;
          } else {
            promotionValueForCalc = rawNum;
          }
        }

        // Prepare SODs to update (match by product codes/groups if provided)
        const sodsToUpdate: any[] = [];
        for (const sod of sodList) {
          const sodProductCodeRaw = sod.crdfd_masanpham || '';
          const sodProductGroupCodeRaw = sod.crdfd_manhomsp || '';
          const sodProductCode = String(sodProductCodeRaw).trim().toUpperCase();
          const sodProductGroupCode = String(sodProductGroupCodeRaw).trim().toUpperCase();
          const matchesProduct = productCodeListNorm.length === 0 || productCodeListNorm.some((code: string) => sodProductCode.includes(code));
          const matchesGroup = productGroupCodeListNorm.length === 0 || productGroupCodeListNorm.some((code: string) => sodProductGroupCode.includes(code));
          if (productCodeListNorm.length === 0 && productGroupCodeListNorm.length === 0) {
            sodsToUpdate.push(sod);
          } else if (matchesProduct || matchesGroup) {
            sodsToUpdate.push(sod);
          }
        }
        const updatedSodIds = new Set<string>();
        console.log('[ApplyPromotion] SODs matched for update:', sodsToUpdate.length, 'soId=', soId, 'productCodes=', productCodeListNorm, 'productGroups=', productGroupCodeListNorm);
        for (const sod of sodsToUpdate) {
          try {
            const sodId = sod.crdfd_saleorderdetailid;
            if (updatedSodIds.has(sodId)) continue;
            const updated = await updateSodChietKhau2(
              sodId,
              promotionValueForCalc,
              effectiveVndOrPercent,
              headers
            );
            if (updated && (updated.success || updated.status === 204 || updated.status === 200)) {
              updatedSodCount++;
              updatedSodIds.add(sodId);
            }
          } catch (err: any) {
            console.error('[ApplyPromotion] Error updating single SOD:', sod?.crdfd_saleorderdetailid, err?.message || err);
          }
        }

        if (updatedSodCount > 0) {
          await recalculateOrderTotals(soId, headers);
        }
      } catch (err: any) {
        console.warn('[ApplyPromotion] SOD update block failed:', err?.message || err);
      }
    } else {
      // Not chiết khấu 2 or special promotion: skip SOD updates entirely.
      updatedSodCount = 0;
    }

    // Note: we intentionally skip updating Sale Order header fields (crdfd_chietkhau2)
    // because header-level discount storage is managed elsewhere or not desired.
    console.log('[ApplyPromotion] Skipping Sale Order header update for crdfd_chietkhau2 per configuration.');

    res.status(200).json({
      success: true,
      ordersXPromotionId: createdOrderXPromotionId,
      updatedSodCount,
      message: `Đã áp dụng promotion "${promotionName}" cho đơn hàng${chietKhau2 ? ` và cập nhật chiết khấu 2 cho ${updatedSodCount} sản phẩm` : ""}`,
    });
  } catch (error: any) {
    console.error("Error applying promotion order:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error applying promotion order",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
      });
    }

    res.status(500).json({
      error: "Error applying promotion order",
      details: error.message,
    });
  }
}

/**
 * Helper function to recalculate order totals after applying chiết khấu 2
 */
async function recalculateOrderTotals(soId: string, headers: Record<string, string>) {
  try {
    // Lấy tất cả SOD của đơn hàng
    const sodFilters = [
      "statecode eq 0",
      `_crdfd_madonhang_value eq ${soId}`,
    ];

    const sodQuery = `$filter=${encodeURIComponent(
      sodFilters.join(" and ")
    )}&$select=crdfd_saleorderdetailid,crdfd_giack2,crdfd_vat`;

    const sodEndpoint = `${BASE_URL}${SOD_TABLE}?${sodQuery}`;
    const sodResponse = await axios.get(sodEndpoint, { headers });
    const sodList = sodResponse.data.value || [];

    // Tính lại tổng
    let totalSubtotal = 0;
    let totalVatAmount = 0;
    let totalAmount = 0;

    for (const sod of sodList) {
      const quantity = Number(sod.crdfd_soluong) || 0;
      const unitPrice = Number(sod.crdfd_giack2) || 0; // Sử dụng giá sau chiết khấu 2
      const vatPercent = Number(sod.crdfd_vat) || 0;

      const lineSubtotal = quantity * unitPrice;
      const lineVat = (lineSubtotal * vatPercent) / 100;
      const lineTotal = lineSubtotal + lineVat;

      totalSubtotal += lineSubtotal;
      totalVatAmount += lineVat;
      totalAmount += lineTotal;
    }

    // Làm tròn
    const roundedSubtotal = Math.round(totalSubtotal);
    const roundedVat = Math.round(totalVatAmount);
    const roundedTotal = Math.round(totalAmount);

    // Cập nhật Sale Order với tổng mới
    const updatePayload = {
      crdfd_tongtien: roundedTotal,
      crdfd_tongtientruocthue: roundedSubtotal,
      crdfd_tienthue: roundedVat,
    };

    const updateEndpoint = `${BASE_URL}${SALE_ORDERS_TABLE}(${soId})`;
    await axios.patch(updateEndpoint, updatePayload, { headers });
  } catch (error) {
    console.error("Error recalculating order totals:", error);
    // Don't throw error to avoid breaking the promotion application
  }
}

/**
 * Helper function to update crdfd_chieckhau2 and crdfd_giack2 on a SOD record
 * Cập nhật crdfd_chieckhau2 và tính lại crdfd_giack2 dựa trên giá gốc
 */
async function updateSodChietKhau2(
  sodId: string,
  promotionValue: number,
  vndOrPercent: string,
  headers: Record<string, string>
) {
  const updatePayload: any = {};

  // Store raw promotion value into crdfd_chieckhau2 (decimal for percent)
  updatePayload.crdfd_chieckhau2 = promotionValue || 0;

  // Calculate discount for price computation using vndOrPercent:
  // - If percent ('%'), convert promotionValue (e.g., 5) -> 0.05 for calculation
  // - If VNĐ, use promotionValue directly as amount to subtract
  let chietKhau2ForCalc: number;
  const vndOrPercentNorm = vndOrPercent !== undefined && vndOrPercent !== null ? String(vndOrPercent).trim() : "";
  // promotionValue for percent types is stored as decimal (e.g., 0.05). Do not divide again.
  if (vndOrPercentNorm === "%" || vndOrPercentNorm === "191920000") {
    chietKhau2ForCalc = (promotionValue || 0);
  } else {
    chietKhau2ForCalc = promotionValue || 0;
  }

  // Try to compute crdfd_giack2 from base price BEFORE VAT.
  // Fetch giagoc (preferred) and gia (fallback) and VAT info to compute price-without-VAT when needed.
  const getSodEndpoint = `${BASE_URL}${SOD_TABLE}(${sodId})?$select=crdfd_giagoc,crdfd_vat,crdfd_ieuchinhgtgt`;
  let sodData: any = null;
  try {
    const sodResponse = await axios.get(getSodEndpoint, { headers });
    sodData = sodResponse.data;
  } catch (err: any) {
    console.warn('[ApplyPromotion][updateSodChietKhau2] failed to fetch SOD for price, will still write chietkhau2:', sodId, err?.message || err);
  }

  // Determine VAT percent (prefer crdfd_vat, otherwise map from crdfd_ieuchinhgtgt)
  let vatPercent = 0;
  if (sodData) {
    if (sodData.crdfd_vat !== undefined && sodData.crdfd_vat !== null) {
      vatPercent = Number(sodData.crdfd_vat) || 0;
    } else if (sodData.crdfd_ieuchinhgtgt !== undefined && sodData.crdfd_ieuchinhgtgt !== null) {
      const IEUCHINHGTGT_TO_VAT_MAP: Record<number, number> = {
        191920000: 0,
        191920001: 5,
        191920002: 8,
        191920003: 10,
      };
      vatPercent = IEUCHINHGTGT_TO_VAT_MAP[Number(sodData.crdfd_ieuchinhgtgt)] ?? 0;
    }
  }

  // Base price before VAT: prefer crdfd_giagoc; otherwise derive from crdfd_gia by removing VAT
  let basePriceBeforeVat = 0;
  if (sodData) {
    if (sodData.crdfd_giagoc && Number(sodData.crdfd_giagoc) > 0) {
      basePriceBeforeVat = Number(sodData.crdfd_giagoc);
    } else if (sodData.crdfd_gia && Number(sodData.crdfd_gia) > 0) {
      const priceWithVat = Number(sodData.crdfd_gia);
      if (vatPercent > 0) {
        basePriceBeforeVat = priceWithVat / (1 + vatPercent / 100);
      } else {
        basePriceBeforeVat = priceWithVat;
      }
    }
  }

  if (basePriceBeforeVat && basePriceBeforeVat > 0) {
    let giaCK2: number;
    if (vndOrPercentNorm === "%" || vndOrPercentNorm === "191920000") {
      // Percent - chietKhau2ForCalc is decimal (e.g., 0.05)
      giaCK2 = basePriceBeforeVat * (1 - chietKhau2ForCalc);
    } else {
      // VNĐ - subtract absolute amount from base before VAT
      giaCK2 = Math.max(0, basePriceBeforeVat - chietKhau2ForCalc);
    }
    // Store price after discount as crdfd_giack2 (unit price before VAT)
    updatePayload.crdfd_giack2 = giaCK2;
  }

  const updateEndpoint = `${BASE_URL}${SOD_TABLE}(${sodId})`;
  try {
    const resp = await axios.patch(updateEndpoint, updatePayload, { headers });
    return { success: true, status: resp.status, data: resp.data || null };
  } catch (err: any) {
    console.error('[ApplyPromotion][updateSodChietKhau2] failed patch SOD', sodId, err?.response?.data || err?.message || err);
    return { success: false, error: err?.response?.data || err?.message || String(err) };
  }
}

