import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SODBG_DETAILS_TABLE = "crdfd_sodbaogias";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { detailId } = req.body;
    if (!detailId || typeof detailId !== "string") {
      return res.status(400).json({ error: "detailId is required" });
    }

    const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!GUID_PATTERN.test(detailId)) {
      return res.status(400).json({ error: "Invalid detailId format. Expected GUID." });
    }

    const token = await getAccessToken();
    if (!token) return res.status(401).json({ error: "Failed token" });

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    const endpoint = `${BASE_URL}${SODBG_DETAILS_TABLE}(${detailId})`;
    try {
      await axios.patch(endpoint, { statecode: 1 }, { headers });
    } catch (err: any) {
      console.error("Dynamics error during deactivate SOBG detail:", err.response?.data || err.message);
      const status = err.response?.status || 500;
      const details = err.response?.data || err.message;
      return res.status(status).json({ error: "Dynamics API error", details });
    }

    return res.status(200).json({ success: true, message: "Deactivated" });
  } catch (error: any) {
    console.error("Error deactivating SOBG detail:", error);
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: "Error deactivating detail",
        details: error.response.data || error.message,
      });
    }
    return res.status(500).json({ error: "Error deactivating detail", details: error.message });
  }
}


