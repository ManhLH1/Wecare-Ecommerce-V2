import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { crdfd_athangsoid, crdfd_trangthaionhang } = req.body;
    if (!crdfd_athangsoid || crdfd_trangthaionhang === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const token = await getAccessToken();
    const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2`;

    // Cập nhật trạng thái trong bảng athangso
    const updateAthangsoResponse = await axios.patch(
      `${apiEndpoint}/crdfd_athangsos(${crdfd_athangsoid})`,
      {
        crdfd_trangthaionhang: crdfd_trangthaionhang,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
          "If-Match": "*",
        },
      }
    );

    if (updateAthangsoResponse.status === 204 || updateAthangsoResponse.status === 200) {
      return res.status(200).json({ message: "Cập nhật trạng thái thành công" });
    } else {
      throw new Error(`Failed to update status`);
    }
  } catch (error: any) {
    console.error("Error updating status - updateHistoryOrderStatus: ", error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Lỗi khi cập nhật trạng thái";
    return res.status(error.response?.status || 500).json({ 
      message: errorMessage,
      details: error.response?.data || null
    });
  }
} 