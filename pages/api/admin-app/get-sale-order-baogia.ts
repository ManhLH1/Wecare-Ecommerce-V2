import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SOBAOGIA_TABLE = "crdfd_sobaogias";

// Payment terms mapping used to normalize labels to keys (keep in sync with sale-orders.ts)
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

// Map Điều chỉnh GTGT OptionSet value to VAT percentage (for crdfd_ieuchinhgtgt)
const IEUCHINHGTGT_TO_VAT_MAP: Record<number, number> = {
  191920000: 0,   // 0%
  191920001: 5,   // 5%
  191920002: 8,   // 8%
  191920003: 10,  // 10%
};

const normalizePaymentTerm = (input?: string | number | null) : string | null => {
  // Treat null/undefined as missing; accept numeric 0 as valid input
  if (input === null || input === undefined) return null;
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
    const { customerId, sobaogiaId } = req.query;
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

    // Build filter: statecode eq 0 (Active records) AND Trạng thái báo giá = "Đang báo giá" (191920000)
    let filter = "statecode eq 0 and crdfd_trangthaibaogia eq 191920000";

    // Filter by customer ID if provided
    if (customerId && typeof customerId === "string") {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      if (isGuid) {
        filter += ` and _crdfd_khachhang_value eq ${customerId}`;
      } else {
        const safeCode = customerId.replace(/'/g, "''");
        filter += ` and crdfd_makhachhang eq '${safeCode}'`;
      }
    }

    // Filter by specific báo giá ID if provided
    if (sobaogiaId && typeof sobaogiaId === "string") {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sobaogiaId);
      if (isGuid) {
        filter += ` and crdfd_sobaogiaid eq ${sobaogiaId}`;
      }
    }

    // Select columns - Using lowercase for property names as per Dynamics Web API convention
    const columns = [
      "crdfd_sobaogiaid",           // ID
      "crdfd_name",                 // Mã đơn hàng
      "crdfd_soauto",               // SO auto
      "crdfd_socode",               // SO code
      "crdfd_tenonhang",            // Tên đơn hàng
      "crdfd_chietkhau",            // Chiết khấu %
      "crdfd_chietkhauvn",          // Chiết khấu VNĐ
      "crdfd_tienchietkhau",        // Tiền chiết khấu
      "crdfd_ghichu",               // Ghi chú
      "crdfd_ghichukh",             // Ghi chú KH
      "crdfd_gtgt",                 // GTGT
      "crdfd_tongtien",             // Tổng tiền
      "crdfd_tongtienkhongvat",     // Tổng tiền không VAT
      "crdfd_vat",                  // VAT
      "crdfd_vattext",              // VAT text
      "crdfd_tenpromotion",         // Tên Promotion
      "crdfd_trangthaibaogia",      // Trạng thái báo giá
      "crdfd_loaihoadon",           // Loại hóa đơn
      "crdfd_xuat_hoa_don",         // Xuất hóa đơn
      "crdfd_ieukhoanthanhtoan",    // Điều khoản thanh toán
      "_crdfd_chinhanhkh_value",     // Chi nhánh KH
      "_crdfd_khachhang_value",      // Khách hàng
      "_crdfd_nhanvienbanhang_value", // Nhân viên bán hàng
      "_crdfd_phaplykhachhang_value", // Pháp lý khách hàng
      "_crdfd_sobg_muakem_value",    // SOBG Mua kèm
      "_crdfd_tenthuongmai_value",   // Tên thương mại
      "statecode",
      "statuscode",
      "createdon",
      "modifiedon",
    ].join(",");

    // Expand:
    // - Customer (để lấy tên/mã khách hàng + rewards)
    // - SOD báo giá (để tránh FE gọi thêm sobg-details)
    const expandCustomer = "crdfd_Khachhang($select=crdfd_name,cr44a_makhachhang,crdfd_wecare_rewards)";
    const sobgDetailsNav = "crdfd_sodbaogia_Maonhang_crdfd_sobaogia";
    const sobgDetailsColumns = [
      "crdfd_sodbaogiaid",
      "createdon",
      "crdfd_name",
      "crdfd_Sanpham",
      "crdfd_onvi",
      "crdfd_soluong",
      "crdfd_ongia",
      "crdfd_giagoc",
      "crdfd_giack1",
      "crdfd_giack2",
      "crdfd_chietkhau",
      "crdfd_chietkhau2",
      "crdfd_chietkhauvn",
      "crdfd_tienchietkhau",
      "crdfd_ieuchinhgtgt",
      "crdfd_stton",
      "crdfd_ngaygiaodukien",
      "crdfd_duyetgia",
      "crdfd_Duyetgiasup",
      "crdfd_ghichu",
      "crdfd_phu_phi_hoa_don",
      "_crdfd_promotion_value",
      "crdfd_promotiontext",
      "_crdfd_sanpham_value",
      "crdfd_masanpham",
      "crdfd_manhomsanpham",
      "_crdfd_maonhang_value",
    ].join(",");
    const sobgDetailsFilter = "statecode eq 0";
    const sobgDetailsExpandProduct =
      "crdfd_Sanpham($select=crdfd_name,crdfd_fullname,crdfd_masanpham)";
    const expandDetails = `${sobgDetailsNav}($select=${sobgDetailsColumns};$filter=${encodeURIComponent(
      sobgDetailsFilter
    )};$expand=${sobgDetailsExpandProduct})`;
    const expand = `$expand=${expandCustomer},${expandDetails}`;

    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&${expand}&$orderby=createdon desc`;

    const endpoint = `${BASE_URL}${SOBAOGIA_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });

    // Transform the data
    const mapSobgDetail = (detail: any) => {
      // Lấy productCode từ expanded product hoặc từ field trực tiếp
      const productCode =
        detail.crdfd_Sanpham?.crdfd_masanpham ||
        detail.crdfd_masanpham ||
        "";

      // Lấy tên sản phẩm từ expanded product (ưu tiên fullname)
      const productName =
        detail.crdfd_Sanpham?.crdfd_fullname ||
        detail.crdfd_Sanpham?.crdfd_name ||
        detail.crdfd_name ||
        "";

      const vat = getVatFromIeuChinhGtgt(detail.crdfd_ieuchinhgtgt);

      // Tính toán giá đã giảm (giá CK 1 hoặc giá CK 2, ưu tiên giá CK 2)
      const giack2 = detail.crdfd_giack2 != null ? detail.crdfd_giack2 : 0;
      const giack1 = detail.crdfd_giack1 != null ? detail.crdfd_giack1 : 0;
      const discountedPrice =
        (giack2 > 0 ? giack2 : (giack1 > 0 ? giack1 : (detail.crdfd_ongia || detail.crdfd_giagoc || 0)));
      const quantity = detail.crdfd_soluong || 0;
      const subtotal = discountedPrice * quantity;
      const vatAmount = (subtotal * vat) / 100;
      const totalAmount = subtotal + vatAmount;

      return {
        id: detail.crdfd_sodbaogiaid || "",
        stt: detail.crdfd_stton || 0,
        productId: detail._crdfd_sanpham_value || "",
        productCode,
        productName,
        productGroupCode: detail.crdfd_manhomsanpham || "",
        unit: detail.crdfd_onvi || "",
        quantity,
        price: detail.crdfd_ongia || detail.crdfd_giagoc || 0,
        surcharge: detail.crdfd_phu_phi_hoa_don || 0,
        discount: detail.crdfd_tienchietkhau || 0,
        discountedPrice,
        vat,
        subtotal,
        vatAmount,
        totalAmount,
        approver: detail.crdfd_duyetgia || "",
        deliveryDate: detail.crdfd_ngaygiaodukien || "",
        note: detail.crdfd_ghichu || "",
        approvePrice: !!detail.crdfd_duyetgia,
        approveSupPrice: !!detail.crdfd_Duyetgiasup,
        discountPercent: detail.crdfd_chietkhau || 0,
        discountAmount: detail.crdfd_chietkhauvn || 0,
        promotionText: detail.crdfd_promotiontext || "",
        promotionId: detail._crdfd_promotion_value || undefined,
        invoiceSurcharge: detail.crdfd_phu_phi_hoa_don || 0,
        // Giữ raw field để FE normalize chiết khấu 2 như hiện tại
        crdfd_chietkhau2: detail.crdfd_chietkhau2 ?? null,
      };
    };

    const baogiaData = (response.data.value || []).map((item: any) => {
      const expandedDetails = Array.isArray(item[sobgDetailsNav]) ? item[sobgDetailsNav] : [];
      const mappedDetails = expandedDetails.map(mapSobgDetail);

      return {
        id: item.crdfd_sobaogiaid || "",
        name: item.crdfd_name || "",                    // Mã đơn hàng
        soAuto: item.crdfd_soauto || "",
        soCode: item.crdfd_socode || "",
        tenDonHang: item.crdfd_tenonhang || "",
        chietKhau: item.crdfd_chietkhau || 0,
        chietKhauVND: item.crdfd_chietkhauvn || 0,
        tienChietKhau: item.crdfd_tienchietkhau || 0,
        ghiChu: item.crdfd_ghichu || "",
        ghiChuKH: item.crdfd_ghichukh || "",
        gtgt: item.crdfd_gtgt || 0,
        tongTien: item.crdfd_tongtien || 0,
        tongTienKhongVAT: item.crdfd_tongtienkhongvat || 0,
        vat: item.crdfd_vat || null,
        vatText: item.crdfd_vattext || "",
        tenPromotion: item.crdfd_tenpromotion || "",
        trangThaiBaoGia: item.crdfd_trangthaibaogia || null,
        loaiHoaDon: item.crdfd_loaihoadon || null,
        xuatHoaDon: item.crdfd_xuat_hoa_don || false,

        // Payment terms processing (similar to sale-orders.ts)
        dieuKhoanThanhToan: (() => {
          // Try raw numeric option set value first
          let rawPaymentTerm: any = item.crdfd_ieukhoanthanhtoan ?? null;

          // If raw not present, try the OData formatted value and normalize to key
          const formattedPreferred = item["crdfd_ieukhoanthanhtoan@OData.Community.Display.V1.FormattedValue"];
          if ((rawPaymentTerm === null || rawPaymentTerm === undefined || rawPaymentTerm === "") &&
              formattedPreferred) {
            const formatted = String(formattedPreferred || "");
            // Try to find the key from the label
            const foundKey = Object.keys(PAYMENT_TERMS_MAP).find(
              (k) => PAYMENT_TERMS_MAP[k].toLowerCase() === formatted.toLowerCase()
            );
            rawPaymentTerm = foundKey || formatted;
          }

          // Ensure we return a normalized key where possible
          return normalizePaymentTerm(rawPaymentTerm) || rawPaymentTerm || null;
        })(),

        // Raw field for frontend compatibility
        crdfd_ieukhoanthanhtoan: item.crdfd_ieukhoanthanhtoan ?? null,
        crdfd_ieukhoanthanhtoan_raw: item.crdfd_ieukhoanthanhtoan ?? null,
        crdfd_ieukhoanthanhtoan_label:
          item["crdfd_ieukhoanthanhtoan@OData.Community.Display.V1.FormattedValue"] || null,

        crdfd_tongtien: item.crdfd_tongtien || 0, // Raw total amount field

        // Map lookups (using expanded values for customer, others just ID)
        chinhanhKH: {
          id: item._crdfd_chinhanhkh_value || null,
          name: "",
        },
        khachHang: {
          id: item._crdfd_khachhang_value || null,
          name: item.crdfd_Khachhang?.crdfd_name || "",
          maKhachHang: item.crdfd_Khachhang?.cr44a_makhachhang || "",
          rewards: item.crdfd_Khachhang?.crdfd_wecare_rewards || null,
        },
        nhanVienBanHang: {
          id: item._crdfd_nhanvienbanhang_value || null,
          name: "",
        },
        phapLyKhachHang: {
          id: item._crdfd_phaplykhachhang_value || null,
          name: "",
        },
        sobgMuaKem: {
          id: item._crdfd_sobg_muakem_value || null,
          name: "",
        },
        tenThuongMai: {
          id: item._crdfd_tenthuongmai_value || null,
          name: "",
        },

        statecode: item.statecode || 0,
        statuscode: item.statuscode || 0,
        createdon: item.createdon || "",
        modifiedon: item.modifiedon || "",

        // Include SOD báo giá trong response để FE không phải gọi thêm API
        details: mappedDetails,
        // Giữ key theo đúng relationship để tương thích nếu FE muốn đọc raw
        crdfd_sodbaogia_Maonhang_crdfd_sobaogia: mappedDetails,
      };
    });

    res.status(200).json(baogiaData);
  } catch (error: any) {
    console.error("Error fetching sale order báo giá:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error fetching sale order báo giá",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }

    res.status(500).json({
      error: "Error fetching sale order báo giá",
      details: error.message,
    });
  }
}
