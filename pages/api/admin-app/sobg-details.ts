import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SOBG_DETAILS_TABLE = "crdfd_sodbaogias";

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
    const { sobgId, customerId } = req.query;
    if (!sobgId || typeof sobgId !== "string") {
      return res.status(400).json({ error: "sobgId is required" });
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

    // Filter: Status = Active, SO Báo Giá ID = sobgId
    // Nếu có customerId, filter thêm theo khách hàng
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sobgId);
    let sobgIdFilter: string;
    if (isGuid) {
      // For GUID, use lookup value field format (lowercase)
      sobgIdFilter = `_crdfd_maonhang_value eq ${sobgId}`;
    } else {
      // For non-GUID, use field name with capital M (crdfd_Maonhang)
      sobgIdFilter = `crdfd_Maonhang eq '${sobgId.replace(/'/g, "''")}'`;
    }

    let filter = `statecode eq 0 and ${sobgIdFilter}`;
    
    // Note: Khách hàng không có trong SOD báo giá, chỉ có trong SO Báo Giá
    // Nên không filter theo customerId ở đây

    // Select các field cần thiết cho ProductItem - dựa trên SOD báo giá schema
    const columns = [
      "crdfd_sodbaogiaid",        // ID
      "createdon",
      "crdfd_name",               // Mã đơn hàng chi tiết
      "crdfd_Sanpham",            // Sản phẩm (lookup)
      "crdfd_onvi",               // Đơn vị
      "crdfd_soluong",            // Số lượng
      "crdfd_ongia",              // Đơn giá
      "crdfd_giagoc",             // Giá gốc
      "crdfd_giack1",             // Giá CK 1
      "crdfd_giack2",             // Giá CK 2
      "crdfd_chietkhau",          // Chiết khấu %
      "crdfd_chietkhau2",         // Chiết khấu 2 (%)
      "crdfd_chietkhauvn",        // Chiết khấu VNĐ
      "crdfd_tienchietkhau",      // Tiền chiết khấu
      "crdfd_ieuchinhgtgt",       // Điều chỉnh GTGT OptionSet để map sang VAT %
      "crdfd_dieuchinhgtgttext",  // Điều chỉnh GTGT Text
      "crdfd_gtgt",               // GTGT
      "crdfd_stton",              // Stt đơn
      "crdfd_ngaygiaodukien",     // Ngày giao dự kiến
      "crdfd_duyetgia",           // Duyệt giá
      "crdfd_Duyetgiasup",        // Duyệt giá sup
      "crdfd_ghichu",             // Ghi chú
      "crdfd_phu_phi_hoa_don",   // Phụ phí hoá đơn (%)
      "crdfd_Promotion",          // Promotion
      "crdfd_promotiontext",      // Promotion text
      "_crdfd_sanpham_value",     // Product ID
      "crdfd_masanpham",          // Mã sản phẩm (productCode)
      "crdfd_manhomsanpham",      // Mã nhóm sản phẩm
      "_crdfd_maonhang_value",    // SO Báo Giá ID (lookup value)
    ].join(",");

    // Expand crdfd_Sanpham để lấy tên sản phẩm
    const expand = "$expand=crdfd_Sanpham($select=crdfd_name,crdfd_fullname,crdfd_masanpham)";
    
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&${expand}&$orderby=createdon desc`;

    const endpoint = `${BASE_URL}${SOBG_DETAILS_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });

    // Lookup productCode từ product ID nếu có
    const PRODUCT_TABLE = "crdfd_productses";
    const productIdToCodeMap = new Map<string, string>();

    // Lấy danh sách product IDs duy nhất
    const productIds = [...new Set(
      (response.data.value || [])
        .map((item: any) => item._crdfd_sanpham_value)
        .filter((id: any): id is string => !!id)
    )];

    // Lookup productCode cho từng product ID
    if (productIds.length > 0) {
      try {
        for (const productId of productIds) {
          try {
            const productQuery = `$select=crdfd_productsid,crdfd_masanpham&$filter=crdfd_productsid eq ${productId}&$top=1`;
            const productEndpoint = `${BASE_URL}${PRODUCT_TABLE}?${productQuery}`;
            const productResponse = await axios.get(productEndpoint, { headers });
            const products = productResponse.data.value || [];
            if (products.length > 0 && products[0].crdfd_masanpham) {
              productIdToCodeMap.set(productId as string, products[0].crdfd_masanpham);
            }
          } catch (err) {
            // Silently fail individual product lookup
          }
        }
      } catch (err) {
        // Silently fail batch lookup
      }
    }

    // Transform data to match SaleOrderDetail interface
    const details = (response.data.value || []).map((item: any) => {
      // Lấy productCode từ expanded product hoặc từ field trực tiếp hoặc từ map
      const productCode = item.crdfd_Sanpham?.crdfd_masanpham 
        || item.crdfd_masanpham 
        || productIdToCodeMap.get(item._crdfd_sanpham_value) 
        || "";
      
      // Lấy tên sản phẩm từ expanded product
      const productName = item.crdfd_Sanpham?.crdfd_fullname 
        || item.crdfd_Sanpham?.crdfd_name 
        || item.crdfd_name 
        || "";
      
      const vat = getVatFromIeuChinhGtgt(item.crdfd_ieuchinhgtgt);
      
      // Tính toán giá đã giảm (giá CK 1 hoặc giá CK 2, ưu tiên giá CK 2)
      // Nếu không có giá trị (null/undefined), default = 0
      // Nếu có giá trị 0, vẫn dùng 0
      const giack2 = item.crdfd_giack2 != null ? item.crdfd_giack2 : 0;
      const giack1 = item.crdfd_giack1 != null ? item.crdfd_giack1 : 0;
      // Ưu tiên: giack2 > giack1 > đơn giá > giá gốc
      // Nếu cả giack2 và giack1 đều là 0 (hoặc null/undefined), dùng đơn giá hoặc giá gốc
      const discountedPrice = (giack2 > 0 ? giack2 : (giack1 > 0 ? giack1 : (item.crdfd_ongia || item.crdfd_giagoc || 0)));
      const quantity = item.crdfd_soluong || 0;
      const subtotal = discountedPrice * quantity;
      const vatAmount = (subtotal * vat) / 100;
      const totalAmount = subtotal + vatAmount;

      return {
        id: item.crdfd_sodbaogiaid,
        stt: item.crdfd_stton || 0,
        productId: item._crdfd_sanpham_value || "",
        productCode: productCode,
        productName: productName,
        productGroupCode: item.crdfd_manhomsanpham || "",
        unit: item.crdfd_onvi || "",
        quantity: quantity,
        price: item.crdfd_giagoc || item.crdfd_ongia || 0,
        surcharge: 0, // Phụ phí hoá đơn có thể tính từ crdfd_phu_phi_hoa_don
        discount: item.crdfd_tienchietkhau || 0,
        discountedPrice: discountedPrice,
        vat: vat,
        subtotal: subtotal,
        vatAmount: vatAmount,
        totalAmount: totalAmount,
        approver: item.crdfd_duyetgia || "",
        deliveryDate: item.crdfd_ngaygiaodukien || "",
        note: item.crdfd_ghichu || "",
        urgentOrder: false, // Không có field này trong SOD báo giá
        approvePrice: !!item.crdfd_duyetgia,
        approveSupPrice: !!item.crdfd_Duyetgiasup,
        discountPercent: item.crdfd_chietkhau || 0,
        discountAmount: item.crdfd_chietkhauvn || 0,
        promotionText: item.crdfd_promotiontext || "",
        invoiceSurcharge: item.crdfd_phu_phi_hoa_don || 0,
        createdOn: item.createdon || "",
      };
    });

    // Sort by STT descending
    details.sort((a: any, b: any) => (b.stt || 0) - (a.stt || 0));

    res.status(200).json(details);
  } catch (error: any) {
    console.error("Error fetching SOBG details:", error);
    
    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error fetching SOBG details",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
      });
    }

    res.status(500).json({
      error: "Error fetching SOBG details",
      details: error.message,
    });
  }
}

