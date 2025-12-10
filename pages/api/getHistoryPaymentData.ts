import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const getHistoryPaymentData = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing customer id" });
  }

  const table_tg = "cr44a_tienguichitiets";
  const columns_tg = "cr44a_sotien,cr1bb_phuongthucthanhtoan,cr44a_ngayhachtoan";
  let filter_tg = `statecode eq 0 and startswith(cr44a_sochungtutext, 'T') and cr44a_idoituong eq '${id}'`;
  const filterQuery_tg = `&$filter=${encodeURIComponent(filter_tg)}`;
  const orderByQuery_tg = `&$orderby=cr44a_ngayhachtoan desc`;
  const query_tg = `$select=${columns_tg}${filterQuery_tg}${orderByQuery_tg}`;

  const table_tm = "cr44a_tienmatchitiets";
  const columns_tm = "cr44a_sotien,cr1bb_phuongthucthanhtoan,cr44a_ngayhachtoan";
  let filter_tm = `statecode eq 0 and startswith(cr44a_sochungtutext, 'PT') and cr44a_idoituong eq '${id}'`;
  const filterQuery_tm = `&$filter=${encodeURIComponent(filter_tm)}`;
  const orderByQuery_tm = `&$orderby=cr44a_ngayhachtoan desc`;
  const query_tm = `$select=${columns_tm}${filterQuery_tm}${orderByQuery_tm}`;

  const initialEndpoint_tg = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table_tg}?${query_tg}`;
  const initialEndpoint_tm = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table_tm}?${query_tm}`;

  try {
    const token = await getAccessToken();

    const fetchData = async (endpoint: string) => {
      let allData: any[] = [];
      let apiEndpoint = endpoint;

      while (apiEndpoint) {
        const response = await axios.get(apiEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
          },
        });

        if (Array.isArray(response.data.value) && response.data.value.length > 0) {
          allData = [...allData, ...response.data.value];
          apiEndpoint = response.data["@odata.nextLink"];
        } else {
          break;
        }
      }

      return allData;
    };

    // Lấy dữ liệu từ cả hai bảng
    const [dataTG, dataTM] = await Promise.all([
      fetchData(initialEndpoint_tg),
      fetchData(initialEndpoint_tm),
    ]);

    // Gộp dữ liệu từ cả hai bảng
    const combinedData = [...dataTG, ...dataTM];

    // Cải thiện việc sắp xếp dữ liệu theo ngày hạch toán từ mới đến cũ
    combinedData.sort((a, b) => {
      // Xử lý các trường hợp khi ngày có thể là null hoặc không hợp lệ
      if (!a.cr44a_ngayhachtoan) return 1;
      if (!b.cr44a_ngayhachtoan) return -1;
      
      let dateA, dateB;
      
      try {
        // Sử dụng đúng định dạng ngày ISO để đảm bảo chính xác
        dateA = new Date(a.cr44a_ngayhachtoan);
        dateB = new Date(b.cr44a_ngayhachtoan);
        
        // Kiểm tra ngày hợp lệ
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        console.error("Lỗi khi chuyển đổi ngày:", error);
        return 0;
      }
    });

    // Trả dữ liệu về client
    res.status(200).json(combinedData);

  } catch (error) {
    console.error("Error fetching data - getHistoryPaymentData - line 68:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
};

export default getHistoryPaymentData;
