import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const UNIT_CONVERSION_TABLE = "crdfd_unitconvertions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCode } = req.query; // Mã sản phẩm (Mã SP)
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

    // Build filter: Status = Active (statecode eq 0) and Mã SP = productCode
    let filter = "statecode eq 0";
    
    if (productCode && typeof productCode === "string" && productCode.trim()) {
      // Filter by Mã SP field (cr44a_masanpham)
      filter += ` and cr44a_masanpham eq '${productCode.trim()}'`;
    }

  // Select fields: get unit conversion info - crdfd_onvichuyenoitransfome is the unit name text field
  const columns = "crdfd_unitconvertionid,cr44a_masanpham,crdfd_onvichuyenoitransfome,crdfd_giatrichuyenoi,crdfd_onvichuan";
    
    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$orderby=crdfd_onvichuyenoitransfome&$top=500`;

    const endpoint = `${BASE_URL}${UNIT_CONVERSION_TABLE}?${query}`;

    console.log('Fetching units from:', endpoint);
    console.log('ProductCode:', productCode);
    console.log('Filter:', filter);

    const response = await axios.get(endpoint, { headers });

    // Map the response to get unit information
    const units = (response.data.value || [])
      .map((item: any) => {
        // crdfd_onvichuyenoitransfome is the unit name text field
        const unitName = item.crdfd_onvichuyenoitransfome || "";
        const unitId = item.crdfd_unitconvertionid || "";
        const giatrichuyenoi = item.crdfd_giatrichuyenoi || 0;
        const onvichuan = item.crdfd_onvichuan || "";
        return {
          crdfd_unitsid: unitId,
          crdfd_name: unitName,
          crdfd_giatrichuyenoi: item.crdfd_giatrichuyenoi,
          crdfd_onvichuan: item.crdfd_onvichuan,
        };
      })
      .filter((unit: any) => unit.crdfd_name) // Remove empty units
      .reduce((acc: any[], unit: any) => {
        // Remove duplicates by unit name (since we're using conversion ID as unit ID)
        if (!acc.find((u) => u.crdfd_name === unit.crdfd_name)) {
          acc.push(unit);
        }
        return acc;
      }, []);

    console.log('Units response count:', units.length);

    res.status(200).json(units);
  } catch (error: any) {
    console.error("Error fetching units:", error);
    
    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      
      return res.status(error.response.status || 500).json({
        error: "Error fetching units",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }
    
    res.status(500).json({
      error: "Error fetching units",
      details: error.message,
    });
  }
}

