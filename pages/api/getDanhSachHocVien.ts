import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const getDanhSachHocVien = async (req: NextApiRequest, res: NextApiResponse) => {
  const employeeId = req.query.employeeId as string;
  if (!employeeId) {
    return res.status(400).json({ error: "Thiếu thông tin ID nhân viên" });
  }

  try {
    const crmToken = await getAccessToken();
    
    // Lấy danh sách khóa đào tạo với thông tin học viên
    const selectFields = [
      "crdfd_danhsachkhoaaotaoid",
      "crdfd_chiphiuoctinh",
      "crdfd_linkbaigiang",
      "crdfd_madanhsachkhoahoc",
      "crdfd_makhoahoc",
      "crdfd_muctieuaotao",
      "crdfd_nguoihuongdan",
      "crdfd_noidungaotao",
      "statecode",
      "crdfd_trangthaikhoahoc",
      "_crdfd_tenkhoahoc_value",
      "crdfd_tongthoigiangio",
      "crdfd_oituong"
    ].join(",");

    const expandKetQuaDaoTao = [
      "crdfd_ketquadaotaoid",
      "_crdfd_danhsachkhoadaotao_value",
      "crdfd_ketqua",
      "crdfd_maketqua",
      "crdfd_ngaynopbai",
      "crdfd_ngaydangky",
      "statecode",
      "statuscode",
      "crdfd_sodiem",
      "_crdfd_tenhocvien_value",
      "crdfd_tenkhoahoc"
    ].join(",");

    const expandTenKhoaHoc = [
      "crdfd_thietlapkhoahocid",
      "crdfd_makhoahoc",
      "crdfd_muctieuaotao",
      "crdfd_noidungaotao",
      "crdfd_tenkhoahoc"
    ].join(",");

    const endpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/crdfd_danhsachkhoaaotaos?$select=${selectFields}&$expand=crdfd_ketquadaotao_Danhsachkhoadaotao_crdfd_danhsachkhoaaotao($select=${expandKetQuaDaoTao}),crdfd_Tenkhoahoc($select=${expandTenKhoaHoc})&$filter=statuscode eq 1 and crdfd_trangthaikhoahoc eq 191920001`;

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${crmToken}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    // Xử lý và trả về dữ liệu, chỉ lấy những record có ketQuaDaoTao
    const processedData = response.data.value
      .map((item: any) => ({
        ...item,
        ketQuaDaoTao: item.crdfd_ketquadaotao_Danhsachkhoadaotao_crdfd_danhsachkhoaaotao || [],
        tenKhoaHoc: item.crdfd_Tenkhoahoc || null
      }))
      .filter((item: any) => {
        // Chỉ lấy những record có ketQuaDaoTao không rỗng
        if (item.ketQuaDaoTao.length === 0) return false;
        
        // Kiểm tra từng kết quả đào tạo
        return item.ketQuaDaoTao.some((kq: any) => 
          // Chỉ lấy những record có statecode = 0
          kq.statecode === 0 &&
          (
            // Lấy những record có ngày nộp bài là null
            kq.crdfd_ngaynopbai === null ||
            // Hoặc có ngày nộp bài nhưng không đạt
            (kq.crdfd_ngaynopbai && kq.crdfd_ketqua === false)
          )
        );
      });

    res.status(200).json(processedData);

  } catch (error: any) {
    console.error("[getDanhSachHocVien] Error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Unauthorized - Phiên đăng nhập đã hết hạn" });
    }
    res.status(500).json({ 
      error: "Lỗi khi lấy dữ liệu danh sách học viên",
      debug: {
        employeeId,
        error: error.response?.data || error.message
      }
    });
  }
};

export default getDanhSachHocVien; 