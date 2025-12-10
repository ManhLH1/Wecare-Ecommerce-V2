import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const trainingLogin = async (req: NextApiRequest, res: NextApiResponse) => {
  const { user } = req.query;

  if (!user) {
    return res.status(400).json({ error: "Email is required" });
  }

  const table = "crdfd_employees";
  const columns = "crdfd_employeeid,crdfd_name,cr1bb_emailcal,crdfd_phonenumber";
  // Chỉ kiểm tra statecode và email, không kiểm tra phòng ban
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
      const employeeData = response.data.value[0];
      res.status(200).json({
        employeeId: employeeData.crdfd_employeeid,
        email: employeeData.cr1bb_emailcal,
        name: employeeData.crdfd_name,
        phone: employeeData.crdfd_phonenumber,
      });
    } else {
      res.status(404).json({ error: "Không tìm thấy nhân viên" });
    }
  } catch (error) {
    console.error("Training login error:", error);
    res.status(500).json({ error: "Lỗi khi xác thực đăng nhập" });
  }
};

export default trainingLogin; 