import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const getDanhSachCauHoi = async (req: NextApiRequest, res: NextApiResponse) => {
  const chuongTrinhId = req.query.chuongTrinhId as string;
  if (!chuongTrinhId) {
    return res.status(400).json({ error: "Thiếu thông tin ID chương trình đào tạo" });
  }

  const table = "crdfd_cauhoiaotaos";
  const columns = [
    "_cr1bb_danhsachkhoaaotao_value",
    "crdfd_cauhoi",
    "crdfd_apana",
    "crdfd_apanb",
    "crdfd_apanc",
    "crdfd_apand",
    "crdfd_apanung"
  ].join(",");

  const filter = `_cr1bb_danhsachkhoaaotao_value eq ${chuongTrinhId}`;
  const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;
  const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`;

  try {
    const crmToken = await getAccessToken();
    const response = await axios.get(apiEndpoint, {
      headers: {
        Authorization: `Bearer ${crmToken}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    if (response.data.value && response.data.value.length > 0) {
      

      // Xáo trộn câu hỏi và đáp án
      const shuffledQuestions = response.data.value
        .map((question: any) => {
          // Lưu đáp án đúng gốc (1,2,3,4)
          const originalAnswerNumber = parseInt(question.crdfd_apanung);
          
          // Tạo mảng các đáp án
          const answers = [
            { key: 1, value: question.crdfd_apana },
            { key: 2, value: question.crdfd_apanb },
            { key: 3, value: question.crdfd_apanc },
            { key: 4, value: question.crdfd_apand }
          ].filter(answer => answer.value); // Lọc bỏ các đáp án null/undefined

          // Xáo trộn đáp án
          for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
          }

          // Tìm vị trí mới của đáp án đúng sau khi xáo trộn
          const correctAnswerIndex = answers.findIndex(a => a.key === originalAnswerNumber);
          const newCorrectNumber = correctAnswerIndex + 1; // Chuyển từ index (0-based) sang số (1-based)

          return {
            ...question,
            crdfd_apana: answers[0]?.value || '',
            crdfd_apanb: answers[1]?.value || '',
            crdfd_apanc: answers[2]?.value || '',
            crdfd_apand: answers[3]?.value || '',
            crdfd_apanung: newCorrectNumber.toString() // Lưu đáp án đúng dưới dạng số (1,2,3,4)
          };
        })
        .sort(() => Math.random() - 0.5); // Xáo trộn thứ tự câu hỏi


      res.status(200).json(shuffledQuestions);
    } else {
      res.status(404).json({ error: "Không tìm thấy câu hỏi cho chương trình này" });
    }
  } catch (error: any) {
    console.error("[getDanhSachCauHoi] Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Lỗi khi lấy dữ liệu câu hỏi",
      debug: {
        chuongTrinhId,
        error: error.response?.data || error.message
      }
    });
  }
};

export default getDanhSachCauHoi; 