import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SOBG_ORDERS_X_PROMOTION_TABLE = "crdfd_sobaogiaxpromotions"; // SO báo giá x Promotion
const SOBG_DETAIL_TABLE = "crdfd_sodbaogias"; // SOD báo giá
const SOBG_HEADER_TABLE = "crdfd_sobaogias"; // SO báo giá

/**
 * API để áp dụng Promotion Order cho SO Báo Giá (SOBG)
 *
 * Body:
 * - sobgId: ID của SO Báo Giá
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
      sobgId,
      promotionId,
      promotionName,
      promotionValue,
      vndOrPercent,
      chietKhau2,
      productCodes,
      productGroupCodes,
    } = req.body;

    if (!sobgId) {
      return res.status(400).json({ error: "sobgId is required" });
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

    // 1. Tạo record SO báo giá x Promotion
    // Tính Loại và Chiết khấu theo logic PowerApps:
    // Loại: If(VND_Percent='VNĐ/% (Promotion)'.VNĐ,"Tiền","Phần trăm")
    // Chiết khấu: If(VND_Percent='VNĐ/% (Promotion)'.VNĐ,ValuePromotion,ValuePromotion/100)
    const loai = vndOrPercent === "VNĐ" ? "Tiền" : "Phần trăm";
    // Store raw promotion value as-is (e.g., 5 => store 5). Calculation uses vndOrPercent at runtime.
    const chietKhau2ValueToStore = promotionValue || 0;

    const sobgOrdersXPromotionPayload: any = {
      crdfd_name: promotionName || "Promotion Order",
      "crdfd_SObaogia@odata.bind": `/crdfd_sobaogias(${sobgId})`,
      "crdfd_Promotion@odata.bind": `/crdfd_promotions(${promotionId})`,
      crdfd_type: "Order",
      crdfd_loai: loai,
      // NOTE: crdfd_chieckhau2 is NOT a field on crdfd_sobaogiaxpromotions in CRM metadata.
      // The SOD (crdfd_sodbaogias) records will receive crdfd_chieckhau2 when applying chiết khấu 2.
      statecode: 0, // Active
    };

    const createOrderXPromotionEndpoint = `${BASE_URL}${SOBG_ORDERS_X_PROMOTION_TABLE}`;
    const createResponse = await axios.post(
      createOrderXPromotionEndpoint,
      sobgOrdersXPromotionPayload,
      { headers }
    );

    // Get the created record ID from response headers
    const createdOrderXPromotionId = createResponse.headers["odata-entityid"]
      ?.match(/\(([^)]+)\)/)?.[1];

    // If chietKhau2 flag not provided or false in request, try to fetch promotion record to determine real flag/value/product filters
    let effectiveChietKhau2 = Boolean(chietKhau2);
    let effectivePromotionValue = promotionValue;
    let effectiveVndOrPercent = vndOrPercent;
    let effectiveProductCodes = productCodes;
    let effectiveProductGroupCodes = productGroupCodes;

    let promoData: any = null;
    if (!effectiveChietKhau2 || !effectiveProductCodes) {
      try {
        const promoEndpoint = `${BASE_URL}crdfd_promotions(${promotionId})?$select=crdfd_value,crdfd_vn,cr1bb_chietkhau2,crdfd_masanpham_multiple,cr1bb_manhomsp_multiple`;
        const promoResp = await axios.get(promoEndpoint, { headers });
        promoData = promoResp.data;
        if (promoData) {
          // Determine flag (Dynamics stores OptionSet number for chietkhau2)
          if (!effectiveChietKhau2) {
            effectiveChietKhau2 = (promoData.cr1bb_chietkhau2 === 191920001) || Boolean(promoData.cr1bb_chietkhau2 === '191920001');
          }
          if (!effectivePromotionValue) {
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
        console.warn('[ApplySOBGPromotion] Could not fetch promotion details to enrich request:', (err as any)?.message || err);
      }
    }

    // Special-case promotions that should always reduce price BEFORE VAT on SOBG
    const FORCE_PRE_VAT_PROMOTIONS_SOBG = [
      "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1",
      "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA (New customer)",
      "[ALL] VOUCHER SINH NHẬT - 50.000Đ"
    ].map(s => s.toLowerCase());

    try {
      const promoNameNorm = String(promotionName || "").toLowerCase();
      if (FORCE_PRE_VAT_PROMOTIONS_SOBG.some(p => promoNameNorm.includes(p))) {
        effectiveChietKhau2 = true;
        if (!effectiveVndOrPercent && promoData?.crdfd_vn) {
          effectiveVndOrPercent = promoData.crdfd_vn;
        }
        if ((effectivePromotionValue === undefined || effectivePromotionValue === null) && promoData?.crdfd_value) {
          effectivePromotionValue = promoData.crdfd_value;
        }
        console.log(`[ApplySOBGPromotion] Forcing pre-VAT line discount for promotion "${promotionName}"`);
      }
    } catch (e) {
      // ignore
    }

    // 2. Special direct discount promotions - no header updates needed

    // 3. Nếu là chiết khấu 2 (chietKhau2 = true) và không phải direct discount promotion, cập nhật crdfd_chieckhau2 và giá trên các SOD báo giá matching
    let updatedSodCount = 0;
    if (effectiveChietKhau2) {
      // Lấy danh sách SOD báo giá của SOBG
      const sodFilters = [
        "statecode eq 0",
        `_crdfd_maonhang_value eq ${sobgId}`,
      ];

      const sodQuery = `$filter=${encodeURIComponent(
        sodFilters.join(" and ")
      )}&$select=crdfd_sodbaogiaid,crdfd_masanpham,crdfd_manhomsanpham`;

      const sodEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}?${sodQuery}`;
      const sodResponse = await axios.get(sodEndpoint, { headers });
      const sodList = sodResponse.data.value || [];

      // Filter SOD báo giá matching productCodes or productGroupCodes
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
      // chietKhau2Value đã được tính: VNĐ thì là số tiền, % thì là decimal (0.05 = 5%)

      // Chuẩn bị danh sách SOD báo giá cần cập nhật
      const sodsToUpdate: any[] = [];
      const debugMatchDetails: any[] = [];
      for (let idx = 0; idx < sodList.length; idx++) {
        const sod = sodList[idx];
        const sodProductCodeRaw = sod.crdfd_masanpham || '';
        const sodProductGroupCodeRaw = sod.crdfd_manhomsanpham || '';
        const sodProductCode = String(sodProductCodeRaw).trim().toUpperCase();
        const sodProductGroupCode = String(sodProductGroupCodeRaw).trim().toUpperCase();

        // Check if SOD báo giá matches any product code or product group code (case-insensitive, contains)
        const matchesProduct = productCodeListNorm.length === 0 || productCodeListNorm.some((code: string) => sodProductCode.includes(code));
        const matchesGroup = productGroupCodeListNorm.length === 0 || productGroupCodeListNorm.some((code: string) => sodProductGroupCode.includes(code));

        if (productCodeListNorm.length === 0 && productGroupCodeListNorm.length === 0) {
          sodsToUpdate.push(sod);
        } else if (matchesProduct || matchesGroup) {
          sodsToUpdate.push(sod);
        }

        // Collect debug info for first 50 items
        if (idx < 50) {
          debugMatchDetails.push({
            id: sod.crdfd_sodbaogiaid,
            sodProductCode: sodProductCodeRaw,
            sodProductGroupCode: sodProductGroupCodeRaw,
            matchesProduct,
            matchesGroup
          });
        }
      }
      // Cập nhật từng SOD báo giá với crdfd_chieckhau2
      for (const sod of sodsToUpdate) {
        try {
          const sodId = sod.crdfd_sodbaogiaid;
          const updated = await updateSodBaoGiaChietKhau2(
            sodId,
            promotionId, // bind promotion lookup on SOD báo giá
            promotionValue,
            vndOrPercent,
            headers
          );
          updatedSodCount++;
        } catch (err: any) {
          console.error('[ApplySOBGPromotion] Error updating single SOD báo giá:', sod?.crdfd_sodbaogiaid, err?.message || err);
        }
      }

      // Sau khi cập nhật chiết khấu 2, tính lại tổng đơn hàng SOBG
      if (updatedSodCount > 0) {
        await recalculateSOBGTotals(sobgId, headers);
      }
    }

    res.status(200).json({
      success: true,
      sobgOrdersXPromotionId: createdOrderXPromotionId,
      updatedSodCount,
      message: `Đã áp dụng promotion "${promotionName}" cho SO báo giá${chietKhau2 ? ` và cập nhật chiết khấu 2 cho ${updatedSodCount} sản phẩm` : ""}`,
    });
  } catch (error: any) {
    console.error("Error applying SOBG promotion order:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error applying SOBG promotion order",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
      });
    }

    res.status(500).json({
      error: "Error applying SOBG promotion order",
      details: error.message,
    });
  }
}

/**
 * Helper function to recalculate SOBG totals after applying chiết khấu 2
 */
async function recalculateSOBGTotals(sobgId: string, headers: Record<string, string>) {
  try {
    // Lấy tất cả SOD báo giá của SOBG
    const sodFilters = [
      "statecode eq 0",
      `_crdfd_maonhang_value eq ${sobgId}`,
    ];

    const sodQuery = `$filter=${encodeURIComponent(
      sodFilters.join(" and ")
    )}&$select=crdfd_sodbaogiaid,crdfd_giack2,crdfd_soluong,crdfd_ieuchinhgtgt`;

    const sodEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}?${sodQuery}`;
    const sodResponse = await axios.get(sodEndpoint, { headers });
    const sodList = sodResponse.data.value || [];

    // Tính lại tổng
    let totalSubtotal = 0;
    let totalVatAmount = 0;
    let totalAmount = 0;

    for (const sod of sodList) {
      const quantity = Number(sod.crdfd_soluong) || 0;
      const unitPrice = Number(sod.crdfd_giack2) || 0; // Sử dụng giá sau chiết khấu 2
      const vatPercent = getVatFromIeuChinhGtgt(sod.crdfd_ieuchinhgtgt);

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

    // Cập nhật SOBG với tổng mới
    const updatePayload = {
      crdfd_tongtien: roundedTotal,
      crdfd_tongtienkhongvat: roundedSubtotal,
    };

    const updateEndpoint = `${BASE_URL}${SOBG_HEADER_TABLE}(${sobgId})`;
    await axios.patch(updateEndpoint, updatePayload, { headers });
  } catch (error) {
    console.error("Error recalculating SOBG totals:", error);
    // Don't throw error to avoid breaking the promotion application
  }
}

/**
 * Helper function to update crdfd_chieckhau2 and crdfd_giack2 on a SOD báo giá record
 * Cập nhật crdfd_chieckhau2 và tính lại crdfd_giack2 dựa trên giá gốc
 */
async function updateSodBaoGiaChietKhau2(
  sodId: string,
  promotionId: string | undefined,
  promotionValue: number,
  vndOrPercent: string,
  headers: Record<string, string>
) {
  const updatePayload: any = {};

  // Store raw promotion value into crdfd_chieckhau2 (as requested).
  updatePayload.crdfd_chieckhau2 = promotionValue || 0;
  // If promotionId provided, bind the lookup on the SOD báo giá
  if (promotionId) {
    const normalizedPromotionId = String(promotionId).replace(/^{|}$/g, '').trim();
    if (normalizedPromotionId) {
      updatePayload['crdfd_Promotion@odata.bind'] = `/crdfd_promotions(${normalizedPromotionId})`;
    }
  }

  // Calculate discount for price computation using vndOrPercent:
  // - If percent ('%'), convert promotionValue (e.g., 5) -> 0.05 for calculation
  // - If VNĐ, use promotionValue directly as amount to subtract
  let chietKhau2ForCalc: number;
  if (vndOrPercent === "%") {
    chietKhau2ForCalc = (promotionValue || 0) / 100;
  } else {
    chietKhau2ForCalc = promotionValue || 0;
  }

  // Tính crdfd_giack2 dựa trên giá gốc và chietKhau2ForCalc
  // Cần lấy giá gốc (crdfd_giagoc) để tính giá sau chiết khấu 2
  const getSodEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}(${sodId})?$select=crdfd_giagoc,crdfd_ongia`;
  const sodResponse = await axios.get(getSodEndpoint, { headers });
  const sodData = sodResponse.data;

  // Determine VAT percent and base price BEFORE VAT
  let vatPercent = 0;
  if (sodData) {
    if (sodData.crdfd_ieuchinhgtgt !== undefined && sodData.crdfd_ieuchinhgtgt !== null) {
      const IEUCHINHGTGT_TO_VAT_MAP: Record<number, number> = {
        191920000: 0,
        191920001: 5,
        191920002: 8,
        191920003: 10,
      };
      vatPercent = IEUCHINHGTGT_TO_VAT_MAP[Number(sodData.crdfd_ieuchinhgtgt)] ?? 0;
    }
  }

  // Base price before VAT: prefer crdfd_giagoc; otherwise derive from crdfd_ongia by removing VAT
  let basePriceBeforeVat = 0;
  if (sodData) {
    if (sodData.crdfd_giagoc && Number(sodData.crdfd_giagoc) > 0) {
      basePriceBeforeVat = Number(sodData.crdfd_giagoc);
    } else if (sodData.crdfd_ongia && Number(sodData.crdfd_ongia) > 0) {
      const priceWithVat = Number(sodData.crdfd_ongia);
      if (vatPercent > 0) {
        basePriceBeforeVat = priceWithVat / (1 + vatPercent / 100);
      } else {
        basePriceBeforeVat = priceWithVat;
      }
    }
  }

  let giaCK2: number = 0;
  if (basePriceBeforeVat && basePriceBeforeVat > 0) {
    if (vndOrPercent === "%") {
      // Percent - chietKhau2ForCalc is decimal (e.g., 0.05)
      giaCK2 = basePriceBeforeVat * (1 - chietKhau2ForCalc);
    } else {
      // VNĐ - subtract absolute amount from base before VAT
      giaCK2 = Math.max(0, basePriceBeforeVat - chietKhau2ForCalc);
    }
    updatePayload.crdfd_giack2 = giaCK2;
  }

  const updateEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}(${sodId})`;
  try {
    const resp = await axios.patch(updateEndpoint, updatePayload, { headers });
    return { success: true, status: resp.status };
  } catch (err: any) {
    console.error('[ApplySOBGPromotion][updateSodBaoGiaChietKhau2] failed patch SOD báo giá', sodId, err?.response?.data || err?.message || err);
    return { success: false, error: err?.response?.data || err?.message || String(err) };
  }
}

// Helper function to get VAT percentage from crdfd_ieuchinhgtgt OptionSet
const getVatFromIeuChinhGtgt = (ieuchinhgtgtValue: number | null | undefined): number => {
  if (ieuchinhgtgtValue === null || ieuchinhgtgtValue === undefined) return 0;
  const IEUCHINHGTGT_TO_VAT_MAP: Record<number, number> = {
    191920000: 0,   // 0%
    191920001: 5,   // 5%
    191920002: 8,   // 8%
    191920003: 10,  // 10%
  };
  return IEUCHINHGTGT_TO_VAT_MAP[ieuchinhgtgtValue] ?? 0;
};
