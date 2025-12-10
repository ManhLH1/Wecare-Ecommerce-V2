import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const getEmployeData = async (req: NextApiRequest, res: NextApiResponse) => {
  const { user } = req.query;

  if (!user) {
    return res.status(400).json({ error: "customerId is required" });
  }

  const table = "crdfd_employees";
  const columns = "crdfd_employeeid,crdfd_name,cr1bb_emailcal,crdfd_phonenumber,cr1bb_chucvuvi,cr1bb_chucvutext,crdfd_phong";
  const filter = `statecode eq 0 and cr1bb_emailcal eq '${user}'`;

  const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;
  const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`;


  try {
    const token = await getAccessToken();
    const response = await axios.get(apiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    if (response.data.value && response.data.value.length > 0) {
      const customerData = response.data.value[0];
      res.status(200).json({
        customerId: customerData.crdfd_employeeid,
        email: customerData.cr1bb_emailcal,
        name: customerData.crdfd_name,  
        phone: customerData.crdfd_phonenumber,
        chucVuVi: customerData.cr1bb_chucvuvi,
        chucVuText: customerData.cr1bb_chucvutext,
        departmentId: customerData.crdfd_phong,
      });
    } else {
      res.status(404).json({ error: "Sale không tìm thấy" });
    }
  } catch (error) {

    res.status(500).json({ error: "Lỗi khi lấy dữ liệu" });
  }

};

export default getEmployeData;
