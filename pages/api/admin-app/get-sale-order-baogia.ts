import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SOBAOGIA_TABLE = "crdfd_sobaogias";

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

    // Build filter: statecode eq 0 (Active records)
    let filter = "statecode eq 0";

    // Filter by customer ID if provided
    if (customerId && typeof customerId === "string") {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      if (isGuid) {
        filter += ` and _crdfd_Khachhang_value eq ${customerId}`;
      } else {
        // If not GUID, might be customer code - adjust field name if needed
        const safeCode = customerId.replace(/'/g, "''");
        filter += ` and crdfd_makhachhang eq '${safeCode}'`;
      }
    }

    // Filter by specific báo giá ID if provided
    if (sobaogiaId && typeof sobaogiaId === "string") {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sobaogiaId);
      if (isGuid) {
        filter += ` and crdfd_SObaogiald eq ${sobaogiaId}`;
      }
    }

    // Select all columns from the images
    const columns = [
      "crdfd_SObaogiald",           // ID (Unique identifier, Required)
      "crdfd_Name",                 // Mã đơn hàng (Primary name column)
      "crdfd_SOauto",               // SO auto (Autonumber)
      "crdfd_SOcode",               // SO code
      "crdfd_Tenonhang",            // Tên đơn hàng
      "crdfd_Chietkhau",            // Chiết khấu % (Decimal)
      "crdfd_ChietkhauVN",          // Chiết khấu VNĐ (Decimal)
      "crdfd_Tienchietkhau",        // Tiền chiết khấu (Decimal)
      "crdfd_Ghichu",               // Ghi chú
      "crdfd_GhichuKH",             // Ghi chú KH
      "crdfd_GTGT",                 // GTGT (Decimal)
      "crdfd_Tongtien",             // Tổng tiền (Decimal)
      "crdfd_TongtienkhongVAT",     // Tổng tiền không VAT (Decimal)
      "crdfd_VAT",                  // VAT (Choice)
      "crdfd_VATtext",              // VAT text (Single line of text, calculated)
      "crdfd_TenPromotion",         // Tên Promotion (Multiple lines of text)
      "crdfd_Trangthaibaogia",      // Trạng thái báo giá (Choice)
      "crdfd_Loaihoadon",           // Loại hóa đơn (Choice)
      "crdfd_xuat_hoa_don",         // Xuất hóa đơn (Yes/no)
      "crdfd_dieukhoanthanhtoan",   // Điều khoản thanh toán (Choice)
      "crdfd_dieukhoanthanhtoanCAL", // Điều khoản thanh toán CAL (Single line of text)
      // Lookup fields - need to expand to get related data
      "_crdfd_ChinhanhKH_value",     // Chi nhánh KH (Lookup)
      "_crdfd_Khachhang_value",      // Khách hàng (Lookup, Required)
      "_crdfd_Nhanvienbanhang_value", // Nhân viên bán hàng (Lookup)
      "_crdfd_Phaplykhachhang_value", // Pháp lý khách hàng (Lookup)
      "_crdfd_SOBG_Muakem_value",    // SOBG Mua kèm (Lookup)
      "_crdfd_Tenthuongmai_value",   // Tên thương mại (Lookup, Required)
      "statecode",                   // Status
      "statuscode",                  // Status Reason
      "createdon",                   // Created date
      "modifiedon",                  // Modified date
    ].join(",");

    // Expand lookup fields to get related entity names
    // Note: Adjust relationship names based on actual Dynamics 365 schema
    // In OData, multiple expands are separated by comma in a single $expand parameter
    const expand = "$expand=crdfd_ChinhanhKH($select=crdfd_name),crdfd_Khachhang($select=crdfd_name,cr44a_makhachhang),crdfd_Nhanvienbanhang($select=fullname),crdfd_Phaplykhachhang($select=crdfd_name),crdfd_SOBG_Muakem($select=crdfd_name),crdfd_Tenthuongmai($select=crdfd_name)";

    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&${expand}&$orderby=createdon desc`;

    const endpoint = `${BASE_URL}${SOBAOGIA_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });

    // Transform the data to include expanded lookup values
    const baogiaData = (response.data.value || []).map((item: any) => ({
      id: item.crdfd_SObaogiald || "",
      name: item.crdfd_Name || "",                    // Mã đơn hàng
      soAuto: item.crdfd_SOauto || "",
      soCode: item.crdfd_SOcode || "",
      tenDonHang: item.crdfd_Tenonhang || "",
      chietKhau: item.crdfd_Chietkhau || 0,           // Chiết khấu %
      chietKhauVND: item.crdfd_ChietkhauVN || 0,      // Chiết khấu VNĐ
      tienChietKhau: item.crdfd_Tienchietkhau || 0,  // Tiền chiết khấu
      ghiChu: item.crdfd_Ghichu || "",
      ghiChuKH: item.crdfd_GhichuKH || "",
      gtgt: item.crdfd_GTGT || 0,                     // GTGT
      tongTien: item.crdfd_Tongtien || 0,             // Tổng tiền
      tongTienKhongVAT: item.crdfd_TongtienkhongVAT || 0, // Tổng tiền không VAT
      vat: item.crdfd_VAT || null,                     // VAT (Choice)
      vatText: item.crdfd_VATtext || "",              // VAT text
      tenPromotion: item.crdfd_TenPromotion || "",    // Tên Promotion
      trangThaiBaoGia: item.crdfd_Trangthaibaogia || null, // Trạng thái báo giá (Choice)
      loaiHoaDon: item.crdfd_Loaihoadon || null,      // Loại hóa đơn (Choice)
      xuatHoaDon: item.crdfd_xuat_hoa_don || false,  // Xuất hóa đơn (Yes/no)
      dieuKhoanThanhToan: item.crdfd_dieukhoanthanhtoan || null, // Điều khoản thanh toán (Choice)
      dieuKhoanThanhToanCAL: item.crdfd_dieukhoanthanhtoanCAL || "", // Điều khoản thanh toán CAL
      // Lookup fields
      chinhanhKH: {
        id: item._crdfd_ChinhanhKH_value || null,
        name: item.crdfd_ChinhanhKH?.crdfd_name || "",
      },
      khachHang: {
        id: item._crdfd_Khachhang_value || null,
        name: item.crdfd_Khachhang?.crdfd_name || "",
        maKhachHang: item.crdfd_Khachhang?.cr44a_makhachhang || "",
      },
      nhanVienBanHang: {
        id: item._crdfd_Nhanvienbanhang_value || null,
        name: item.crdfd_Nhanvienbanhang?.fullname || "",
      },
      phapLyKhachHang: {
        id: item._crdfd_Phaplykhachhang_value || null,
        name: item.crdfd_Phaplykhachhang?.crdfd_name || "",
      },
      sobgMuaKem: {
        id: item._crdfd_SOBG_Muakem_value || null,
        name: item.crdfd_SOBG_Muakem?.crdfd_name || "",
      },
      tenThuongMai: {
        id: item._crdfd_Tenthuongmai_value || null,
        name: item.crdfd_Tenthuongmai?.crdfd_name || "",
      },
      statecode: item.statecode || 0,
      statuscode: item.statuscode || 0,
      createdon: item.createdon || "",
      modifiedon: item.modifiedon || "",
    }));

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

