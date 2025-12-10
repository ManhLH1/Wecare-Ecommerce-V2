import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

/**
 * API endpoint để lấy danh sách yêu cầu tuyển dụng từ Dynamics CRM
 * @param req - NextJS API Request
 * @param res - NextJS API Response
 * @returns Danh sách yêu cầu tuyển dụng đang mở và chưa hoàn thành
 */
const getRecruitmentRequests = async (req: NextApiRequest, res: NextApiResponse) => {
  // Cấu hình truy vấn CRM
  const recruitmentRequestTable = "crdfd_yeucautuyendungs"
  const selectedFields = "statecode,cr1bb_vitri,crdfd_vitritext,_crdfd_iaiem_value,cr1bb_trangthaiyeucau,cr1bb_hinhthuclamviec,crdfd_yeucautuyendungid";
  
  // Lọc: statecode = 0 (active) VÀ cr1bb_trangthaiyeucau khác 283640002
  const activeRequestsFilter = "statecode eq 0 and cr1bb_trangthaiyeucau eq 283640001";

  const query = `$select=${selectedFields}&$filter=${encodeURIComponent(activeRequestsFilter)}&$expand=crdfd_iaiem($select=crdfd_name)`;
  const crmApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${recruitmentRequestTable}?${query}`;

  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(crmApiEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });


    if (response.data.value && response.data.value.length > 0) {
      res.status(200).json(response.data.value);
    } else {
      res.status(404).json({ error: "Không tìm thấy yêu cầu tuyển dụng nào" });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách yêu cầu tuyển dụng" });
  }
};

export default getRecruitmentRequests; 