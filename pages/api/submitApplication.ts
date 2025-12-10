import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";
import { getAccessToken } from "./getAccessToken";

// Function to check for duplicate applications
async function checkDuplicateApplication(
  token: string,
  hovaten: string,
  sdt: string,
  yeucautuyendungid: string,
  tinhthanhid: string,
  worktype: string
) {
  const table = "crdfd_thongtinungviens";
  const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}`;
  
  try {
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

    // If any records are found, it means there's a duplicate
    return response.data.value.length > 0;
  } catch (error) {
    console.error('Error checking duplicates:', error);
    throw error;
  }
}

const submitApplication = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const applicationData = req.body;

    // Get the yeucautuyendungid from the odata.bind field
    const yeucautuyendungidMatch = applicationData["crdfd_Yeucautuyendung@odata.bind"]?.match(/\((.*?)\)/);
    const yeucautuyendungid = yeucautuyendungidMatch ? yeucautuyendungidMatch[1] : null;

    const tinhthanhidMatch = applicationData["crdfd_TinhThanh@odata.bind"]?.match(/\((.*?)\)/);
    const tinhthanhid = tinhthanhidMatch ? tinhthanhidMatch[1] : null;

    // Validate required fields - TẠM THỜI BỎ VALIDATE CĂN CƯỚC CÔNG DÂN
    if (!applicationData.crdfd_hovaten || !applicationData.crdfd_sdt || !yeucautuyendungid || !tinhthanhid) {
      return res.status(400).json({ 
        error: "Missing required fields",
        receivedData: applicationData 
      });
    }

    /* TẠM THỜI KHÔNG SỬ DỤNG - Comment validate căn cước công dân
    if (!applicationData.cr1bb_cancuoccongdan) {
      return res.status(400).json({ 
        error: "Missing required fields",
        message: "Căn cước công dân is required",
        receivedData: applicationData 
      });
    }
    */

    const token = await getAccessToken();

    // Check for duplicates
    const isDuplicate = await checkDuplicateApplication(
      token,
      applicationData.crdfd_hovaten,
      applicationData.crdfd_sdt,
      yeucautuyendungid,
      applicationData.crdfd_tinhthanhid,
      applicationData.crdfd_worktype?.toString()
    );

    if (isDuplicate) {
      return res.status(400).json({
        error: "Duplicate application",
        message: "An application with the same name, phone number, and position already exists"
      });
    }

    const table = "crdfd_thongtinungviens";
    const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}`;
    
    // Prepare the payload with correct data types
    const payload = {   
      "crdfd_hovaten": applicationData.crdfd_hovaten,
      "crdfd_email": applicationData.crdfd_email,
      "crdfd_sdt": applicationData.crdfd_sdt,
      "crdfd_ngaysinh": applicationData.crdfd_ngaysinh,
      "crdfd_ngayungtuyen": applicationData.crdfd_ngayungtuyen,
      "crdfd_kenhungtuyen": applicationData.crdfd_kenhungtuyen, 
      "crdfd_vitriungvien": applicationData.crdfd_vitriungvien,
      "crdfd_Yeucautuyendung@odata.bind": applicationData["crdfd_Yeucautuyendung@odata.bind"],
      "crdfd_cv": applicationData.crdfd_cv,
      "crdfd_hinhthuclamviec": applicationData.crdfd_hinhthuclamviec,
      "crdfd_iaiemlamviec@odata.bind": applicationData["crdfd_TinhThanh@odata.bind"],
      "crdfd_banbietthongtinquadau": applicationData.crdfd_banbietthongtinquadau,
      // TẠM THỜI KHÔNG GỬI DỮ LIỆU CĂN CƯỚC CÔNG DÂN
      // "cr1bb_cancuoccongdan": applicationData.cr1bb_cancuoccongdan
    };

    // TẠM THỜI KHÔNG GỬI ẢNH CĂN CƯỚC CÔNG DÂN
    /* 
    // Add image fields only if they exist and are not empty
    if (applicationData.cr1bb_cancuocmattruocurl) {
      (payload as any)["cr1bb_cancuocmattruocurl"] = applicationData.cr1bb_cancuocmattruocurl;
    }
    if (applicationData.cr1bb_cancuocmatsauurl) {
      (payload as any)["cr1bb_cancuocmatsauurl"] = applicationData.cr1bb_cancuocmatsauurl;
    }
    */

    console.log('Payload being sent to CRM:', JSON.stringify(payload, null, 2));

    const response = await axios.post(apiEndpoint, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Prefer': 'return=representation'
      }
    });

    return res.status(201).json({
      success: true,
      message: "Data submitted successfully",
      data: response.data
    });

  } catch (error) {
    console.error('Error details:', error);
    if (error instanceof AxiosError && error.response) {
      console.error('CRM Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
      return res.status(error.response.status).json({
        error: "CRM Error",
        details: error.response.data,
        request: error.response.config?.data,
        status: error.response.status,
        statusText: error.response.statusText
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default submitApplication;