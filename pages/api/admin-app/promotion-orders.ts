import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const PROMOTION_TABLE = "crdfd_promotions";
const ORDERS_X_PROMOTION_TABLE = "crdfd_ordersxpromotions";

const escapeODataValue = (value: string) => value.replace(/'/g, "''");

/**
 * API để lấy danh sách Promotion loại "Order" (áp dụng cho toàn đơn hàng)
 * và kiểm tra xem đã có promotion order nào được áp dụng cho SO chưa
 * 
 * Query params:
 * - soId: ID của Sales Order để check promotion order đã áp dụng
 * - customerCode: Mã khách hàng để filter promotion
 * - totalAmount: Tổng tiền đơn hàng để filter promotion theo điều kiện
 * - productCodes: Danh sách mã sản phẩm (comma-separated) để filter promotion
 * - productGroupCodes: Danh sách mã nhóm sản phẩm (comma-separated) để filter promotion
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { soId, customerCode, totalAmount, productCodes, productGroupCodes } = req.query;

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

    // 1. Lấy danh sách promotion order đã áp dụng cho SO (nếu có soId)
    let existingPromotionOrders: any[] = [];
    if (soId && typeof soId === "string" && soId.trim()) {
      const existingFilters = [
        "statecode eq 0", // Active
        `_crdfd_so_value eq ${soId}`,
        "crdfd_type eq 'Order'",
      ];

      const existingQuery = `$filter=${encodeURIComponent(
        existingFilters.join(" and ")
      )}&$select=crdfd_ordersxpromotionid,crdfd_name,_crdfd_promotion_value,crdfd_type`;

      const existingEndpoint = `${BASE_URL}${ORDERS_X_PROMOTION_TABLE}?${existingQuery}`;
      
      try {
        const existingResponse = await axios.get(existingEndpoint, { headers });
        existingPromotionOrders = (existingResponse.data.value || []).map((item: any) => ({
          id: item.crdfd_ordersxpromotionid,
          name: item.crdfd_name,
          promotionId: item._crdfd_promotion_value,
          type: item.crdfd_type,
        }));
      } catch (error) {
        console.warn("Error fetching existing promotion orders:", error);
      }
    }

    // 2. Lấy danh sách Promotion loại "Order" có thể áp dụng
    const filters: string[] = [
      "statecode eq 0", // Active
      "crdfd_promotion_deactive eq 'Active'",
      "crdfd_type eq 'Order'", // Chỉ lấy promotion loại Order
    ];

    // Time window: start_date <= now
    const nowIso = new Date().toISOString();
    filters.push(`crdfd_start_date le ${nowIso}`);
    // No end_date filter as per PowerApps logic - it checks at usage time

    // Filter by customer code if provided
    if (customerCode && typeof customerCode === "string" && customerCode.trim()) {
      const safeCode = escapeODataValue(customerCode.trim());
      filters.push(
        `(cr3b9_ma_khachhang_apdung eq '${safeCode}' or ` +
        `contains(cr3b9_ma_khachhang_apdung,'${safeCode},') or ` +
        `contains(cr3b9_ma_khachhang_apdung,',${safeCode},') or ` +
        `contains(cr3b9_ma_khachhang_apdung,',${safeCode}'))`
      );
    }

    // Filter by total amount if provided
    if (totalAmount && typeof totalAmount === "string") {
      const amount = parseFloat(totalAmount);
      if (!isNaN(amount) && amount > 0) {
        // Promotion applies if totalAmountCondition is null OR totalAmount >= condition
        filters.push(
          `(cr1bb_tongtienapdung eq null or cr1bb_tongtienapdung le ${amount})`
        );
      }
    }

    const columns = [
      "crdfd_promotionid",
      "crdfd_name",
      "crdfd_type",
      "crdfd_value",
      "crdfd_vn",
      "cr1bb_chietkhau2", // Chiết khấu 2 field
      "crdfd_masanpham_multiple",
      "cr1bb_manhomsp_multiple",
      "cr1bb_tongtienapdung",
      "crdfd_start_date",
      "crdfd_end_date",
    ].join(",");

    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filters.join(" and ")
    )}&$orderby=crdfd_value desc`; // Order by value descending to get max first

    const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;
    const response = await axios.get(endpoint, { headers });

    // Filter promotions based on product codes/group codes if provided
    let availablePromotions = (response.data.value || []).map((promo: any) => ({
      id: promo.crdfd_promotionid,
      name: promo.crdfd_name,
      type: promo.crdfd_type,
      value: promo.crdfd_value,
      vndOrPercent: promo.crdfd_vn, // "VNĐ" or "%"
      chietKhau2: promo.cr1bb_chietkhau2, // 191920000 = No, 191920001 = Yes
      productCodes: promo.crdfd_masanpham_multiple,
      productGroupCodes: promo.cr1bb_manhomsp_multiple,
      totalAmountCondition: promo.cr1bb_tongtienapdung,
      startDate: promo.crdfd_start_date,
      endDate: promo.crdfd_end_date,
    }));

    // Filter by product codes/group codes if provided
    if (productCodes || productGroupCodes) {
      const productCodeList = productCodes 
        ? (typeof productCodes === "string" ? productCodes.split(",") : productCodes).map(c => c.trim()).filter(Boolean)
        : [];
      const productGroupCodeList = productGroupCodes
        ? (typeof productGroupCodes === "string" ? productGroupCodes.split(",") : productGroupCodes).map(c => c.trim()).filter(Boolean)
        : [];

      availablePromotions = availablePromotions.filter((promo: any) => {
        // Check if any product code matches
        const hasProductMatch = productCodeList.some(code => 
          promo.productCodes && promo.productCodes.includes(code)
        );
        
        // Check if any product group code matches
        const hasGroupMatch = productGroupCodeList.some(code =>
          promo.productGroupCodes && promo.productGroupCodes.includes(code)
        );

        return hasProductMatch || hasGroupMatch;
      });
    }

    // Get max value promotion (Promotion_Order_Max logic)
    // For % type: get the one with max value
    // For VNĐ type: include all
    const percentPromotions = availablePromotions.filter((p: any) => p.vndOrPercent === "%");
    const vndPromotions = availablePromotions.filter((p: any) => p.vndOrPercent === "VNĐ");
    
    let promotionOrderMax: any[] = [];
    if (percentPromotions.length > 0) {
      const maxPercentValue = Math.max(...percentPromotions.map((p: any) => p.value || 0));
      promotionOrderMax = percentPromotions.filter((p: any) => p.value === maxPercentValue);
    }
    promotionOrderMax = [...promotionOrderMax, ...vndPromotions];

    res.status(200).json({
      existingPromotionOrders,
      hasExistingPromotionOrder: existingPromotionOrders.length > 0,
      availablePromotions: promotionOrderMax,
      allPromotions: availablePromotions,
    });
  } catch (error: any) {
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
  }
}

