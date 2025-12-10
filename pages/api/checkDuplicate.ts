import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const checkDuplicate = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { hovaten, sdt, yeucautuyendungid } = req.body;

    // Validate required fields
    if (!hovaten || !sdt || !yeucautuyendungid) {
      return res.status(400).json({ 
        error: "Missing required fields",
        receivedData: req.body 
      });
    }

    const token = await getAccessToken();
    const table = "crdfd_thongtinungviens";
    const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}`;

    // Build filter for checking duplicates
    const filter = `$filter=crdfd_hovaten eq '${hovaten}' and crdfd_sdt eq '${sdt}' and _crdfd_yeucautuyendung_value eq '${yeucautuyendungid}'`;
    
    const response = await axios.get(`${apiEndpoint}?${filter}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      }
    });

    // Check if any records were found
    const isDuplicate = response.data.value.length > 0;

    return res.status(200).json({
      isDuplicate,
      count: response.data.value.length
    });

  } catch (error) {
    console.error('Error checking duplicates:', error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default checkDuplicate; 