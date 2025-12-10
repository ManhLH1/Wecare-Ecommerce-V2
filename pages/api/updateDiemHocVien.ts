import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";
import { getAccessToken } from "./getAccessToken";

const updateDiemHocVien = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH") {
    console.error("Invalid method:", req.method);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { danhSachKhoaDaoTaoId, score } = req.body;

  // Validate input
  if (!danhSachKhoaDaoTaoId) {
    console.error("Missing danhSachKhoaDaoTaoId");
    return res.status(400).json({ error: "Missing danhSachKhoaDaoTaoId" });
  }

  if (score === undefined || score === null) {
    console.error("Missing score");
    return res.status(400).json({ error: "Missing score" });
  }

  if (typeof score !== 'number' || isNaN(score)) {
    console.error("Invalid score type:", typeof score);
    return res.status(400).json({ error: "Score must be a number" });
  }

  if (score < 0 || score > 100) {
    console.error("Score out of range:", score);
    return res.status(400).json({ error: "Score must be between 0 and 100" });
  }

  // Format score to 2 decimal places
  const formattedScore = Number(score.toFixed(2));

  // Determine training result based on score (assuming passing score is 50)
  const trainingResult = score >= 50 ? 191920000 : 191920001; // 191920000 = Pass, 191920001 = Fail

  // Get current date and format it for Dynamics CRM
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().split('.')[0] + 'Z';  // Format: YYYY-MM-DDTHH:mm:ssZ

  try {
    const token = await getAccessToken();

    // First, get the ketquadaotao record based on the lookup relationship
    const fetchEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/crdfd_ketquadaotaos?$filter=_crdfd_danhsachkhoadaotao_value eq '${danhSachKhoaDaoTaoId}'&$select=crdfd_ketquadaotaoid&$orderby=createdon desc`;
    
    const fetchResponse = await axios({
      method: 'GET',
      url: fetchEndpoint,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json"
      }
    });

    if (!fetchResponse.data || !fetchResponse.data.value || fetchResponse.data.value.length === 0) {
      throw new Error("No matching training result record found");
    }

    const ketQuaDaoTaoId = fetchResponse.data.value[0].crdfd_ketquadaotaoid;

    // Now update the record using the correct ID
    const updateEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/crdfd_ketquadaotaos(${ketQuaDaoTaoId})`;

    // Format data with required fields
    const updateData = {
      crdfd_ngaynopbai: formattedDate,
      crdfd_ketqua: trainingResult,
      crdfd_sodiem: formattedScore
    };

    const response = await axios({
      method: 'PATCH',
      url: updateEndpoint,
      data: updateData,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "If-Match": "*",
        "Accept": "application/json",
        "Prefer": "return=minimal"
      }
    });

    // Dynamics CRM usually returns 204 No Content for successful PATCH
    if (response.status === 204) {
      res.status(200).json({
        message: "Training result updated successfully",
        data: {
          danhSachKhoaDaoTaoId,
          ketQuaDaoTaoId,
          score: formattedScore,
          result: trainingResult === 191920000 ? "Đạt" : "Không đạt",
          submissionDate: formattedDate
        }
      });
    } else {
      console.error("Unexpected response status:", response.status);
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error: unknown) {
    console.error("Error in updateDiemHocVien:", error);
    
    if (error instanceof AxiosError) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        response: {
          data: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: JSON.stringify(error.response?.headers, null, 2)
        },
        request: {
          method: error.config?.method,
          url: error.config?.url,
          data: error.config?.data,
          headers: JSON.stringify(error.config?.headers, null, 2)
        }
      };
      
      console.error("Axios error details:", errorDetails);

      res.status(error.response?.status || 500).json({
        error: "Error updating training result",
        details: errorDetails
      });
    } else if (error instanceof Error) {
      console.error("Standard error:", error.message);
      res.status(500).json({
        error: "Error updating training result",
        details: error.message
      });
    } else {
      console.error("Unknown error type:", error);
      res.status(500).json({
        error: "An unknown error occurred while updating training result"
      });
    }
  }
};

export default updateDiemHocVien; 