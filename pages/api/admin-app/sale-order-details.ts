import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SALE_ORDER_DETAILS_TABLE = "crdfd_saleorderdetails";

// Map GTGT OptionSet value to VAT percentage (for crdfd_gtgt)
const GTGT_TO_VAT_MAP: Record<number, number> = {
  191920000: 0,   // 0%
  191920001: 5,   // 5%
  191920002: 8,   // 8%
  191920003: 10,  // 10%
};

// Map Điều chỉnh GTGT OptionSet value to VAT percentage (for crdfd_ieuchinhgtgt)
const IEUCHINHGTGT_TO_VAT_MAP: Record<number, number> = {
  191920000: 0,   // 0%
  191920001: 5,   // 5%
  191920002: 8,   // 8%
  191920003: 10,  // 10%
};

const getVatFromIeuChinhGtgt = (ieuchinhgtgtValue: number | null | undefined): number => {
  if (ieuchinhgtgtValue === null || ieuchinhgtgtValue === undefined) return 0;
  return IEUCHINHGTGT_TO_VAT_MAP[ieuchinhgtgtValue] ?? 0;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { soId } = req.query;
    if (!soId || typeof soId !== "string") {
      return res.status(400).json({ error: "soId is required" });
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

    // Filter theo canvas: Status = Active, Mã đơn hàng.Id = var_selected_id_donhang
    // Sort theo STT descending
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(soId);
    // Sử dụng _crdfd_socode_value như trong getSaleOrdersData.ts
    const soIdFilter = isGuid 
      ? `_crdfd_socode_value eq ${soId}`
      : `crdfd_socode eq '${soId.replace(/'/g, "''")}'`;

    const filter = `statecode eq 0 and ${soIdFilter}`;

    // Select các field cần thiết cho ProductItem - dựa trên getSaleOrdersData.ts và getTop30ProductsWithPromotion.ts
    const columns = [
      "crdfd_saleorderdetailid",
      "createdon",
      "crdfd_tensanphamtext",  // Từ getSaleOrdersData.ts
      "crdfd_onvionhang",      // Đơn vị từ getSaleOrdersData.ts
      "crdfd_productnum",      // Số lượng từ getSaleOrdersData.ts
      "crdfd_gia",
      "crdfd_phuphi_hoadon",
      "crdfd_chieckhau",
      "crdfd_giagoc",
      "crdfd_ieuchinhgtgt",    // Điều chỉnh GTGT OptionSet để map sang VAT %
      "crdfd_stton",           // Stt đơn
      "crdfd_tongtienchuavat", // Tổng tiền chưa VAT từ getSaleOrdersData.ts
      "crdfd_tongtiencovat",
      "crdfd_duyetgia",
      "crdfd_ngaygiaodukientonghop",
      "_crdfd_sanpham_value",  // Product ID từ getTop30ProductsWithPromotion.ts
    ].join(",");

    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&$orderby=createdon desc`;

    const endpoint = `${BASE_URL}${SALE_ORDER_DETAILS_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });

    const saleOrderDetails = (response.data.value || []).map((item: any) => ({
      id: item.crdfd_saleorderdetailid || "",
      stt: item.crdfd_stton || 0, // Stt đơn (correct field name)
      productName: item.crdfd_tensanphamtext || item.crdfd_tensanpham || "",
      unit: item.crdfd_onvionhang || item.crdfd_donvi || "",
      quantity: item.crdfd_productnum || item.crdfd_soluong || 0,
      price: item.crdfd_gia || 0,
      surcharge: item.crdfd_phuphi_hoadon || item.crdfd_phuphi || 0,
      discount: item.crdfd_chieckhau ? item.crdfd_chieckhau * 100 : 0, // Chuyển từ thập phân (0.04) sang phần trăm (4%)
      discountedPrice: item.crdfd_giagoc || item.crdfd_gia || 0,
      vat: getVatFromIeuChinhGtgt(item.crdfd_ieuchinhgtgt),
      totalAmount: item.crdfd_tongtiencovat || item.crdfd_tongtienchuavat || 0,
      approver: item.crdfd_duyetgia || "",
      deliveryDate: item.crdfd_ngaygiaodukientonghop || "",
    }));

    res.status(200).json(saleOrderDetails);
  } catch (error: any) {
    console.error("Error fetching sale order details:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error fetching sale order details",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }

    res.status(500).json({
      error: "Error fetching sale order details",
      details: error.message,
    });
  }
}

