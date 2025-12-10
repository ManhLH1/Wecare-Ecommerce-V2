import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, crdfd_trangthaionhang } = req.body;

    if (!id || crdfd_trangthaionhang === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const token = await getAccessToken();
    const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2`;

    const response = await axios.patch(
      `${apiEndpoint}/crdfd_athangsos(${id})`,
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

    if (response.status === 204 || response.status === 200) {
      return res.status(200).json({ message: "Cập nhật trạng thái thành công" });
    } else {
      throw new Error(`Failed to update order status: ${response.status}`);
    }
  } catch (error: any) {
    console.error("Error updating order status - updateTrangThaiDonHang - line 42: ", error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Lỗi khi cập nhật trạng thái đơn hàng";
    return res.status(error.response?.status || 500).json({ 
      message: errorMessage,
      details: error.response?.data || null
    });
  }
} 