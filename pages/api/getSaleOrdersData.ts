import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";
import SaleOrder from "@/model/saleOder";

const getSaleOrdersData = async (req: NextApiRequest, res: NextApiResponse) => {
  const id_khachhang = req.query.id_khachhang as string;

  const table_so = "crdfd_sale_orders";
  const columns_so =
    "crdfd_name,_crdfd_khachhang_value,crdfd_makhachhang,crdfd_ngaytaoonhang,crdfd_tongtien,crdfd_tongtienkhongvatnew,crdfd_dieu_khoan_thanh_toan,crdfd_tongtien,crdfd_gtgtnew,crdfd_trangthaixuatkho,crdfd_trangthaigiaonhan1,crdfd_so_auto,crdfd_so_code,cr1bb_key_so";
  const expand_table_sod = "crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O";
  const expand_columns_sod =
    "_crdfd_socode_value,crdfd_name,crdfd_masanpham,crdfd_tensanphamtext,crdfd_productnum,crdfd_onvionhang,crdfd_gia,crdfd_thue,crdfd_tongtienchuavat";
  // Build filter condition
  let filter = "statecode eq 0";
  const query_sod = `$select=${expand_columns_sod};$filter=${encodeURIComponent(
    filter
  )}`;
  if (id_khachhang) {
    filter += ` and _crdfd_khachhang_value eq '${id_khachhang}'`;
  }

  const filterQuery_so = `&$filter=${encodeURIComponent(filter)}`;
  const query_so = `$select=${columns_so}${filterQuery_so}`;
  const initialEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table_so}?${query_so}&$expand=${expand_table_sod}(${query_sod})`;
  let apiEndpoint = initialEndpoint;
  let allResults: SaleOrder[] = [];

  try {
    const token = await getAccessToken();
    while (apiEndpoint) {
      const response = await axios.get(apiEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      });

      if (
        Array.isArray(response.data.value) &&
        response.data.value.length > 0
      ) {
        allResults = allResults.concat(response.data.value);
        apiEndpoint = response.data["@odata.nextLink"];
      } else {
        break;
      }
    }

    // Sort results by crdfd_name
    allResults.sort((a, b) => {
      // Convert ngày tạo hàng từ chuỗi về kiểu Date để có thể so sánh
      const dateA = new Date(a.crdfd_ngaytaoonhang);
      const dateB = new Date(b.crdfd_ngaytaoonhang);

      // So sánh ngày theo thứ tự giảm dần (desc)
      return dateB.getTime() - dateA.getTime();
    });

    res.status(200).json(allResults);
  } catch (error) {
    console.error("Error fetching data - getSaleOrdersData - line 65:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
};

export default getSaleOrdersData;
