import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI, Type } from '@google/genai';

// Khởi tạo Gemini AI
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyD41Hg8Zg6A8q9qXQ2ekHwa_7XzmHVC2HM';
const genAI = new GoogleGenAI({ apiKey });

interface GeminiKeywords {
  productName: string;
  brand: string | null;
  specification: string | null;
  material: string | null;
  surfaceFinish: string | null;
  synonyms: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Kiểm tra API key
    if (!apiKey || apiKey === 'AIzaSyD41Hg8Zg6A8q9qXQ2ekHwa_7XzmHVC2HM') {
      console.warn('Using default API key, this might cause issues');
    }
    
    // Lấy file từ request body (đã được parse bởi Next.js)
    const { imageData, mimeType } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Không có dữ liệu hình ảnh nào được gửi' });
    }

    // imageData đã là base64 string từ frontend
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    // Phân tích hình ảnh với Gemini AI (sử dụng approach như v2)
    const model = 'gemini-2.5-flash';
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: `
Phân tích hình ảnh sản phẩm vật liệu xây dựng được cung cấp.
Phản hồi của bạn BẮT BUỘC phải ở định dạng JSON. Không thêm bất kỳ văn bản nào ngoài JSON.
Tất cả các giá trị (values) trong JSON phải là tiếng Việt.

- productName: Tên sản phẩm mô tả ngắn gọn bằng tiếng Việt.
- brand: Tên thương hiệu. Nếu không có, trả về null.
- specification: Quy cách chính (kích thước, loại). Nếu không rõ, trả về null.
- material: Vật liệu chính bằng tiếng Việt. Nếu không rõ, trả về null.
- surfaceFinish: Bề mặt hoàn thiện bằng tiếng Việt. Nếu không rõ, trả về null.
- synonyms: Một mảng gồm 3-5 từ khóa tìm kiếm liên quan, bằng tiếng Việt.
`,
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        productName: { type: Type.STRING },
        brand: { type: Type.STRING, nullable: true },
        specification: { type: Type.STRING, nullable: true },
        material: { type: Type.STRING, nullable: true },
        surfaceFinish: { type: Type.STRING, nullable: true },
        synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['productName', 'synonyms']
    };

    const result = await genAI.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });
    
    if (!result.text) {
      throw new Error('Không nhận được phản hồi từ AI');
    }
    
    const rawResponse = result.text.trim();
    const keywords: GeminiKeywords = JSON.parse(rawResponse);

    // Chỉ trả về keywords từ AI, chưa tìm kiếm sản phẩm
    return res.status(200).json({
      success: true,
      keywords,
    });

  } catch (error) {
    console.error('Error in searchProductsByImage:', error);
    return res.status(500).json({ 
      error: 'Đã xảy ra lỗi trong quá trình phân tích hình ảnh',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


// Cấu hình API để parse body
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
