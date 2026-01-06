import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const ORDERS_X_PROMOTION_TABLE = "crdfd_ordersxpromotions";
const SOD_TABLE = "crdfd_saleorderdetails";
const SALE_ORDERS_TABLE = "crdfd_sale_orders";

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

    // Try to fetch promotion record to get canonical values (if needed)
    let promoData: any = null;
    try {
      const promoEndpoint = `${BASE_URL}crdfd_promotions(${promotionId})?$select=crdfd_value,crdfd_vn,cr1bb_chietkhau2,crdfd_masanpham_multiple,cr1bb_manhomsp_multiple`;
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
      }
    } catch (err) {
      console.warn('[ApplyPromotion] Could not fetch promotion details to enrich request (pre-create):', (err as any)?.message || err);
    }

    // Special-case promotions: apply discount directly to SO crdfd_tongtienkhongvatnew instead of line items
    const DIRECT_DISCOUNT_PROMOTIONS = [
      "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1",
      "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA (New customer)",
      "[ALL] VOUCHER SINH NHẬT - 50.000Đ"
    ].map(s => s.toLowerCase());

    let isDirectDiscountPromotion = false;
    try {
      const promoNameNorm = String(promotionName || "").toLowerCase();
      if (DIRECT_DISCOUNT_PROMOTIONS.some(p => promoNameNorm.includes(p))) {
        isDirectDiscountPromotion = true;
        // Ensure we use promotion's stored type/value if available
        if (effectiveVndOrPercent === "" && promoData?.crdfd_vn) {
          effectiveVndOrPercent = promoData.crdfd_vn;
        }
        if ((effectivePromotionValue === undefined || effectivePromotionValue === null) && promoData?.crdfd_value) {
          effectivePromotionValue = promoData.crdfd_value;
        }
        console.log(`[ApplyPromotion] Applying direct discount to SO total for promotion "${promotionName}"`);
      }
    } catch (e) {
      // ignore
    }

    // Determine loai (Tiền / Phần trăm)
    const isVnd = effectiveVndOrPercent === "VNĐ" || (typeof effectiveVndOrPercent === 'string' && effectiveVndOrPercent.toUpperCase() === "VND") || effectiveVndOrPercent === OPTION_VND;
    const loai = isVnd ? "Tiền" : "Phần trăm";

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
      crdfd_chieckhau2: chietKhau2ValueToStore,
      statecode: 0, // Active
    };

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

    if (!createdOrderXPromotionId) {
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
    // Only apply line-level discounts for non-direct discount promotions
    if (!isDirectDiscountPromotion) {
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

      // Filter SOD matching productCodes or productGroupCodes
      // Normalize effective product codes/groups into arrays (trim, remove empties)
      const productCodeListRaw = effectiveProductCodes 
        ? (Array.isArray(effectiveProductCodes) ? effectiveProductCodes : String(effectiveProductCodes).split(","))
        : [];
      const productCodeList = productCodeListRaw.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
      const productGroupCodeListRaw = effectiveProductGroupCodes
        ? (Array.isArray(effectiveProductGroupCodes) ? effectiveProductGroupCodes : String(effectiveProductGroupCodes).split(","))
        : [];
      const productGroupCodeList = productGroupCodeListRaw.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
      // Normalize for case-insensitive matching
      const productCodeListNorm = productCodeList.map(s => s.toUpperCase());
      const productGroupCodeListNorm = productGroupCodeList.map(s => s.toUpperCase());

      // Tính toán giá trị chiết khấu 2 (đã được tính ở trên)
      // chietKhau2ValueToStore: VNĐ => số tiền, % => decimal (0.05)
      // Chuẩn hóa giá trị dùng để tính giá trên SOD (promotionValueForCalc):
      // - Nếu là percent: đảm bảo là decimal (0.05)
      // - Nếu là VNĐ: giữ nguyên số tiền
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

      // Force update: prepare list of all SODs to update (ignore productCodes filter)
      const sodsToUpdate: any[] = sodList.slice(); // clone full list
      // Track updated SOD ids to avoid double-updating in retry/final pass
      const updatedSodIds = new Set<string>();
      for (const sod of sodsToUpdate) {
        try {
          const sodId = sod.crdfd_saleorderdetailid;
          if (updatedSodIds.has(sodId)) {
            continue; // skip already-updated
          }
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

      // Sau khi cập nhật chiết khấu 2, tính lại tổng đơn hàng
      if (updatedSodCount > 0) {
        await recalculateOrderTotals(soId, headers);
      }
      // Nếu không cập nhật được SOD nào (ví dụ SOD mới vừa được lưu & chưa hiện trong query),
      // thử re-fetch 1 lần sau delay ngắn để bắt SOD mới.
      if (updatedSodCount === 0) {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const sodRespRetry = await axios.get(sodEndpoint, { headers });
          const sodListRetry = sodRespRetry.data.value || [];
          // Rebuild sodsToUpdate from retry list
          const sodsToUpdateRetry: any[] = [];
          for (const sod of sodListRetry) {
            const sodProductCodeRaw = sod.crdfd_masanpham || '';
            const sodProductGroupCodeRaw = sod.crdfd_manhomsp || '';
            const sodProductCode = String(sodProductCodeRaw).trim().toUpperCase();
            const sodProductGroupCode = String(sodProductGroupCodeRaw).trim().toUpperCase();
            const matchesProduct = productCodeListNorm.length === 0 || productCodeListNorm.some((code: string) => sodProductCode.includes(code));
            const matchesGroup = productGroupCodeListNorm.length === 0 || productGroupCodeListNorm.some((code: string) => sodProductGroupCode.includes(code));
            if (productCodeListNorm.length === 0 && productGroupCodeListNorm.length === 0) {
              sodsToUpdateRetry.push(sod);
            } else if (matchesProduct || matchesGroup) {
              sodsToUpdateRetry.push(sod);
            }
          }
          for (const sod of sodsToUpdateRetry) {
            try {
              const sodId = sod.crdfd_saleorderdetailid;
              if (updatedSodIds.has(sodId)) {
                continue; // skip already-updated
              }
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
              console.error('[ApplyPromotion] (retry) Error updating single SOD:', sod?.crdfd_saleorderdetailid, err?.message || err);
            }
          }
          if (updatedSodCount > 0) {
            await recalculateOrderTotals(soId, headers);
          }
        } catch (err: any) {
          console.warn('[ApplyPromotion] Retry fetch/update SOD failed:', err?.message || err);
        }
      }

      // Final pass: ensure ALL SOD records inside this SO are updated (catch any newly saved SODs)
      try {
        const sodFiltersFinal = [
          "statecode eq 0",
          `_crdfd_socode_value eq ${soId}`,
        ];
        const sodQueryFinal = `$filter=${encodeURIComponent(
          sodFiltersFinal.join(" and ")
        )}&$select=crdfd_saleorderdetailid,crdfd_masanpham,crdfd_manhomsp`;
        const sodEndpointFinal = `${BASE_URL}${SOD_TABLE}?${sodQueryFinal}`;
        const sodRespFinal = await axios.get(sodEndpointFinal, { headers });
        const sodListFinal = sodRespFinal.data.value || [];

        let finalUpdated = 0;
        for (const sod of sodListFinal) {
          try {
            const sodId = sod.crdfd_saleorderdetailid;
            if (updatedSodIds.has(sodId)) {
              continue; // skip already-updated
            }
            // Use promotionValueForCalc (decimal for percent) for calculation and effectiveVndOrPercent for type
            const updated = await updateSodChietKhau2(
              sodId,
              promotionValueForCalc,
              effectiveVndOrPercent,
              headers
            );
            if (updated && (updated.success || updated.status === 204 || updated.status === 200)) {
              finalUpdated++;
            }
          } catch (err: any) {
            console.error('[ApplyPromotion] (final pass) Error updating single SOD:', sod?.crdfd_saleorderdetailid, err?.message || err);
          }
        }

        if (finalUpdated > 0) {
          updatedSodCount += finalUpdated;
          await recalculateOrderTotals(soId, headers);
        }

      } catch (err: any) {
        console.warn('[ApplyPromotion] Final pass failed to update all SODs:', err?.message || err);
      }
      // Cập nhật trường crdfd_chieckhau2 trên Sale Order (header) để phản ánh promotionValue (raw)
      // Một số môi trường/metadata có thể dùng tên trường khác (crdfd_chietkhau2) — ghi cả hai để an toàn.
      try {
        const soUpdatePayload: any = {
          crdfd_chieckhau2: chietKhau2ValueToStore,
        };
        const soUpdateEndpoint = `${BASE_URL}${SALE_ORDERS_TABLE}(${soId})`;
        const soPatchResp = await axios.patch(soUpdateEndpoint, soUpdatePayload, { headers });
      } catch (err: any) {
        console.warn('[ApplyPromotion] Failed to update SO crdfd_chieckhau2/chietkhau2:', err?.message || err);
      }
    } // End of if (!isDirectDiscountPromotion)

    // No additional header updates needed for direct discount promotions

    const promotionType = isDirectDiscountPromotion ? "" : (effectiveChietKhau2 ? `cập nhật chiết khấu 2 cho ${updatedSodCount} sản phẩm` : "");
    res.status(200).json({
      success: true,
      ordersXPromotionId: createdOrderXPromotionId,
      updatedSodCount,
      message: `Đã áp dụng promotion "${promotionName}" cho đơn hàng${promotionType ? ` và ${promotionType}` : ""}`,
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
    )}&$select=crdfd_saleorderdetailid,crdfd_giack2,crdfd_soluong,crdfd_vat`;

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
  const getSodEndpoint = `${BASE_URL}${SOD_TABLE}(${sodId})?$select=crdfd_giagoc,crdfd_gia,crdfd_vat,crdfd_ieuchinhgtgt`;
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

