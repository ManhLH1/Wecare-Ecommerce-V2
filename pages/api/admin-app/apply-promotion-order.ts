import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const ORDERS_X_PROMOTION_TABLE = "crdfd_ordersxpromotions";
const SOD_TABLE = "crdfd_saleorderdetailses";
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

    // 1. Tạo record Orders x Promotion
    // Tính Loại và Chiết khấu theo logic PowerApps:
    // Loại: If(VND_Percent='VNĐ/% (Promotion)'.VNĐ,"Tiền","Phần trăm")
    // Chiết khấu: If(VND_Percent='VNĐ/% (Promotion)'.VNĐ,ValuePromotion,ValuePromotion/100)
    // Hỗ trợ cả dạng text ("VNĐ" / "%") và OptionSet numeric ("191920001" / "191920000")
    const OPTION_PERCENT = "191920000";
    const OPTION_VND = "191920001";
    const vndOrPercentNormalized = vndOrPercent !== undefined && vndOrPercent !== null
      ? String(vndOrPercent).trim()
      : "";
    const isVnd =
      vndOrPercentNormalized === "VNĐ" ||
      vndOrPercentNormalized.toUpperCase() === "VND" ||
      vndOrPercentNormalized === OPTION_VND;
    const isPercent = vndOrPercentNormalized === "%" || vndOrPercentNormalized === OPTION_PERCENT;
    const loai = isVnd ? "Tiền" : "Phần trăm";
    // Store raw promotion value as-is (e.g., 5 => store 5). Calculation uses vndOrPercent at runtime.
    const chietKhau2ValueToStore = promotionValue || 0;
    
    const ordersXPromotionPayload: any = {
      crdfd_name: promotionName || "Promotion Order",
      "crdfd_SO@odata.bind": `/crdfd_sale_orders(${soId})`,
      "crdfd_Promotion@odata.bind": `/crdfd_promotions(${promotionId})`,
      crdfd_type: "Order",
      crdfd_loai: loai,
      crdfd_chieckhau2: chietKhau2ValueToStore,
      statecode: 0, // Active
    };

    const createOrderXPromotionEndpoint = `${BASE_URL}${ORDERS_X_PROMOTION_TABLE}`;
    const createResponse = await axios.post(
      createOrderXPromotionEndpoint,
      ordersXPromotionPayload,
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

    if (!effectiveChietKhau2 || !effectiveProductCodes) {
      try {
        const promoEndpoint = `${BASE_URL}crdfd_promotions(${promotionId})?$select=crdfd_value,crdfd_vn,cr1bb_chietkhau2,crdfd_masanpham_multiple,cr1bb_manhomsp_multiple`;
        const promoResp = await axios.get(promoEndpoint, { headers });
        const promoData = promoResp.data;
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
        console.warn('[ApplyPromotion] Could not fetch promotion details to enrich request:', (err as any)?.message || err);
      }
    }

    // 2. Nếu là chiết khấu 2 (chietKhau2 = true), cập nhật crdfd_chieckhau2 và giá trên các SOD matching
    let updatedSodCount = 0;
    if (effectiveChietKhau2) {
      // Lấy danh sách SOD của SO
      const sodFilters = [
        "statecode eq 0",
        `_crdfd_madonhang_value eq ${soId}`,
      ];

      const sodQuery = `$filter=${encodeURIComponent(
        sodFilters.join(" and ")
      )}&$select=crdfd_saleorderdetailsid,crdfd_masanpham,crdfd_manhomsp`;

      const sodEndpoint = `${BASE_URL}${SOD_TABLE}?${sodQuery}`;
      const sodResponse = await axios.get(sodEndpoint, { headers });
      const sodList = sodResponse.data.value || [];
      console.log('[ApplyPromotion] fetched sodList length:', sodList.length);
      try {
        console.log('[ApplyPromotion] sod sample:', (sodList || []).slice(0,10).map((s:any)=>({
          id: s.crdfd_saleorderdetailsid,
          productCode: s.crdfd_masanpham,
          productGroup: s.crdfd_manhomsp
        })));
      } catch(e) { /* ignore */ }

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

      console.log('[ApplyPromotion] effectiveProductCodes count:', productCodeList.length, 'effectiveProductGroupCodes count:', productGroupCodeList.length);
      // Normalize for case-insensitive matching
      const productCodeListNorm = productCodeList.map(s => s.toUpperCase());
      const productGroupCodeListNorm = productGroupCodeList.map(s => s.toUpperCase());

      // Tính toán giá trị chiết khấu 2 (đã được tính ở trên)
      // chietKhau2Value đã được tính: VNĐ thì là số tiền, % thì là decimal (0.05 = 5%)

      // Chuẩn bị danh sách SOD cần cập nhật
      const sodsToUpdate: any[] = [];
      const debugMatchDetails: any[] = [];
      for (let idx = 0; idx < sodList.length; idx++) {
        const sod = sodList[idx];
        const sodProductCodeRaw = sod.crdfd_masanpham || '';
        const sodProductGroupCodeRaw = sod.crdfd_manhomsp || '';
        const sodProductCode = String(sodProductCodeRaw).trim().toUpperCase();
        const sodProductGroupCode = String(sodProductGroupCodeRaw).trim().toUpperCase();

        // Check if SOD matches any product code or product group code (case-insensitive, contains)
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
            id: sod.crdfd_saleorderdetailsid,
            sodProductCode: sodProductCodeRaw,
            sodProductGroupCode: sodProductGroupCodeRaw,
            matchesProduct,
            matchesGroup
          });
        }
      }
      console.log('[ApplyPromotion] sodsToUpdate length:', sodsToUpdate.length, 'debugMatches:', debugMatchDetails.slice(0,20));

      // Cập nhật từng SOD với crdfd_chieckhau2
      console.log('[ApplyPromotion] sodsToUpdate count:', sodsToUpdate.length);
      for (const sod of sodsToUpdate) {
        try {
          const sodId = sod.crdfd_saleorderdetailsid;
          console.log('[ApplyPromotion] Updating SOD:', sodId, { productCode: sod.crdfd_masanpham, productGroup: sod.crdfd_manhomsp });
          const updated = await updateSodChietKhau2(
            sodId,
            promotionValue,
            vndOrPercent,
            headers
          );
          console.log('[ApplyPromotion] updateSodChietKhau2 result for', sodId, updated ? 'ok' : 'no-response');
          updatedSodCount++;
        } catch (err: any) {
          console.error('[ApplyPromotion] Error updating single SOD:', sod?.crdfd_saleorderdetailsid, err?.message || err);
        }
      }

      // Sau khi cập nhật chiết khấu 2, tính lại tổng đơn hàng
      if (updatedSodCount > 0) {
        await recalculateOrderTotals(soId, headers);
      }
      // Cập nhật trường crdfd_chieckhau2 trên Sale Order (header) để phản ánh promotionValue (raw)
      // Một số môi trường/metadata có thể dùng tên trường khác (crdfd_chietkhau2) — ghi cả hai để an toàn.
      try {
        const soUpdatePayload: any = {
          crdfd_chieckhau2: chietKhau2ValueToStore,
          crdfd_chietkhau2: chietKhau2ValueToStore,
        };
        const soUpdateEndpoint = `${BASE_URL}${SALE_ORDERS_TABLE}(${soId})`;
        const soPatchResp = await axios.patch(soUpdateEndpoint, soUpdatePayload, { headers });
        console.log('[ApplyPromotion] Updated SO crdfd_chieckhau2/chieckhau2:', chietKhau2ValueToStore, 'status', soPatchResp.status);
      } catch (err: any) {
        console.warn('[ApplyPromotion] Failed to update SO crdfd_chieckhau2/chietkhau2:', err?.message || err);
      }
    }

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
    )}&$select=crdfd_saleorderdetailsid,crdfd_giack2,crdfd_soluong,crdfd_vat`;

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

    console.log(`[Recalculate Order Totals] Updated SO ${soId}:`, {
      subtotal: roundedSubtotal,
      vat: roundedVat,
      total: roundedTotal
    });
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

  // Store raw promotion value into crdfd_chieckhau2 (as requested).
  updatePayload.crdfd_chieckhau2 = promotionValue || 0;

  // Calculate discount for price computation using vndOrPercent:
  // - If percent ('%'), convert promotionValue (e.g., 5) -> 0.05 for calculation
  // - If VNĐ, use promotionValue directly as amount to subtract
  let chietKhau2ForCalc: number;
  const vndOrPercentNorm = vndOrPercent !== undefined && vndOrPercent !== null ? String(vndOrPercent).trim() : "";
  if (vndOrPercentNorm === "%" || vndOrPercentNorm === "191920000") {
    chietKhau2ForCalc = (promotionValue || 0) / 100;
  } else {
    chietKhau2ForCalc = promotionValue || 0;
  }

  // Tính crdfd_giack2 dựa trên giá gốc và chietKhau2ForCalc
  // Cần lấy giá gốc (crdfd_giagoc) để tính giá sau chiết khấu 2
  const getSodEndpoint = `${BASE_URL}${SOD_TABLE}(${sodId})?$select=crdfd_giagoc,crdfd_gia`;
  const sodResponse = await axios.get(getSodEndpoint, { headers });
  const sodData = sodResponse.data;

  // Sử dụng crdfd_giagoc nếu có, nếu không thì dùng crdfd_gia
  const basePrice = sodData.crdfd_giagoc || sodData.crdfd_gia || 0;

  let giaCK2: number;
  if (vndOrPercentNorm === "%" || vndOrPercentNorm === "191920000") {
    // Chiết khấu theo %, chietKhau2ForCalc is decimal (e.g., 0.05)
    giaCK2 = basePrice * (1 - chietKhau2ForCalc);
  } else {
    // Chiết khấu VNĐ, trừ trực tiếp (chietKhau2ForCalc is absolute amount)
    giaCK2 = Math.max(0, basePrice - chietKhau2ForCalc);
  }

  updatePayload.crdfd_giack2 = giaCK2;

  const updateEndpoint = `${BASE_URL}${SOD_TABLE}(${sodId})`;
  try {
    const resp = await axios.patch(updateEndpoint, updatePayload, { headers });
    console.log('[ApplyPromotion][updateSodChietKhau2] patched SOD', sodId, 'status', resp.status);
    return { success: true, status: resp.status };
  } catch (err: any) {
    console.error('[ApplyPromotion][updateSodChietKhau2] failed patch SOD', sodId, err?.response?.data || err?.message || err);
    return { success: false, error: err?.response?.data || err?.message || String(err) };
  }
}

