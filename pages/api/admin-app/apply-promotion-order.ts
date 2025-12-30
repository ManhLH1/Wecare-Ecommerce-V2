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
    const loai = vndOrPercent === "VNĐ" ? "Tiền" : "Phần trăm";
    const chietKhau2Value = vndOrPercent === "VNĐ" 
      ? (promotionValue || 0) 
      : ((promotionValue || 0) / 100);
    
    const ordersXPromotionPayload: any = {
      crdfd_name: promotionName || "Promotion Order",
      "crdfd_SO@odata.bind": `/crdfd_sale_orders(${soId})`,
      "crdfd_Promotion@odata.bind": `/crdfd_promotions(${promotionId})`,
      crdfd_type: "Order",
      crdfd_loai: loai,
      crdfd_chieckhau2: chietKhau2Value,
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

    // 2. Nếu là chiết khấu 2 (chietKhau2 = true), cập nhật crdfd_chieckhau2 và giá trên các SOD matching
    let updatedSodCount = 0;
    if (chietKhau2) {
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

      // Filter SOD matching productCodes or productGroupCodes
      const productCodeList = productCodes 
        ? (Array.isArray(productCodes) ? productCodes : productCodes.split(",")).map((c: string) => c.trim()).filter(Boolean)
        : [];
      const productGroupCodeList = productGroupCodes
        ? (Array.isArray(productGroupCodes) ? productGroupCodes : productGroupCodes.split(",")).map((c: string) => c.trim()).filter(Boolean)
        : [];

      // Tính toán giá trị chiết khấu 2 (đã được tính ở trên)
      // chietKhau2Value đã được tính: VNĐ thì là số tiền, % thì là decimal (0.05 = 5%)

      // Chuẩn bị danh sách SOD cần cập nhật
      const sodsToUpdate: any[] = [];
      for (const sod of sodList) {
        const sodProductCode = sod.crdfd_masanpham || "";
        const sodProductGroupCode = sod.crdfd_manhomsp || "";

        // Check if SOD matches any product code or product group code
        const matchesProduct = productCodeList.length === 0 || productCodeList.some((code: string) => sodProductCode.includes(code));
        const matchesGroup = productGroupCodeList.length === 0 || productGroupCodeList.some((code: string) => sodProductGroupCode.includes(code));

        // If either matches (or no filter provided), add to update list
        if (productCodeList.length === 0 && productGroupCodeList.length === 0) {
          // No filter - update all SOD
          sodsToUpdate.push(sod);
        } else if (matchesProduct || matchesGroup) {
          sodsToUpdate.push(sod);
        }
      }

      // Cập nhật từng SOD với crdfd_chieckhau2
      for (const sod of sodsToUpdate) {
        await updateSodChietKhau2(
          sod.crdfd_saleorderdetailsid,
          promotionValue,
          vndOrPercent,
          headers
        );
        updatedSodCount++;
      }

      // Sau khi cập nhật chiết khấu 2, tính lại tổng đơn hàng
      if (updatedSodCount > 0) {
        await recalculateOrderTotals(soId, headers);
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

  // Calculate chietkhau2 value based on VNĐ or %
  let chietKhau2Value: number;
  if (vndOrPercent === "%") {
    // Convert percentage to decimal (e.g., 5% -> 0.05)
    chietKhau2Value = (promotionValue || 0) / 100;
    updatePayload.crdfd_chieckhau2 = chietKhau2Value;
  } else {
    // VNĐ value - store as is
    chietKhau2Value = promotionValue || 0;
    updatePayload.crdfd_chieckhau2 = chietKhau2Value;
  }

  // Tính crdfd_giack2 dựa trên crdfd_chieckhau2
  // Cần lấy giá gốc (crdfd_giagoc) để tính giá sau chiết khấu 2
  const getSodEndpoint = `${BASE_URL}${SOD_TABLE}(${sodId})?$select=crdfd_giagoc,crdfd_gia`;
  const sodResponse = await axios.get(getSodEndpoint, { headers });
  const sodData = sodResponse.data;

  // Sử dụng crdfd_giagoc nếu có, nếu không thì dùng crdfd_gia
  const basePrice = sodData.crdfd_giagoc || sodData.crdfd_gia || 0;

  let giaCK2: number;
  if (vndOrPercent === "%") {
    // Chiết khấu theo %, tính giá sau chiết khấu
    giaCK2 = basePrice * (1 - chietKhau2Value);
  } else {
    // Chiết khấu VNĐ, trừ trực tiếp
    giaCK2 = Math.max(0, basePrice - chietKhau2Value);
  }

  updatePayload.crdfd_giack2 = giaCK2;

  const updateEndpoint = `${BASE_URL}${SOD_TABLE}(${sodId})`;
  await axios.patch(updateEndpoint, updatePayload, { headers });
}

