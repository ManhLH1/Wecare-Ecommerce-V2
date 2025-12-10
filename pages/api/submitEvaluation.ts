import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getAccessToken } from './getAccessToken';

interface EvaluationFormData {
  _crdfd_danhsachkhoadaotao_value: string;
  crdfd_tenkhoahoc: string;
  crdfd_nguoihuongdan: string;
  crdfd_giangvienchuanbivatochuctotkhong: string;
  crdfd_giangvienconhiettinhkhong: string;
  crdfd_giangvienkhuyenkhichthamgiakhong: string;
  crdfd_giangvienthongthaonoidungkhong: string;
  crdfd_giangvientrinhbaychuyennghiepkhong: string;
  crdfd_giangvientraloithoaangcauhoikhong: string;
  crdfd_nhanxetvegiangvien: string;
  crdfd_hoatongnhomphuhopkhong: string;
  crdfd_noidungchuongtrinhcohoplykhong: string;
  crdfd_thietbinghenhinonkhong: string;
  crdfd_thanhphanlop: string;
  crdfd_thoigianphanboukhong: string;
  crdfd_tailieuayunoidungkhong: string;
  crdfd_uthoigianthuctapkynangkhong: string;
  crdfd_gopycaitienkhoahoc: string;
  crdfd_gopynoidungcanbosung: string;
  crdfd_noidungkhongthichlydo: string;
  crdfd_anhgiachungvechuongtrinh: string;
  crdfd_anhgiachungvegiangvien: string;
  score: number;
}

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2";

// Helper function to convert string choice values to numbers
const convertChoiceToNumber = (value: string): number => {
  return parseInt(value, 10);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const formData: EvaluationFormData = req.body;

    // Prepare the data for the CRM API
    const crmData = {
      "crdfd_Danhsachkhoadaotao@odata.bind": `/crdfd_danhsachkhoaaotaos(${formData._crdfd_danhsachkhoadaotao_value})`,
      crdfd_giangvienchuanbivatochuctotkhong: convertChoiceToNumber(formData.crdfd_giangvienchuanbivatochuctotkhong),
      crdfd_giangvienconhiettinhkhong: convertChoiceToNumber(formData.crdfd_giangvienconhiettinhkhong),
      crdfd_giangvienkhuyenkhichthamgiakhong: convertChoiceToNumber(formData.crdfd_giangvienkhuyenkhichthamgiakhong),
      crdfd_giangvienthongthaonoidungkhong: convertChoiceToNumber(formData.crdfd_giangvienthongthaonoidungkhong),
      crdfd_giangvientrinhbaychuyennghiepkhong: convertChoiceToNumber(formData.crdfd_giangvientrinhbaychuyennghiepkhong),
      crdfd_giangvientraloithoaangcauhoikhong: convertChoiceToNumber(formData.crdfd_giangvientraloithoaangcauhoikhong),
      crdfd_nhanxetvegiangvien: formData.crdfd_nhanxetvegiangvien,
      crdfd_hoatongnhomphuhopkhong: convertChoiceToNumber(formData.crdfd_hoatongnhomphuhopkhong),
      crdfd_noidungchuongtrinhcohoplykhong: convertChoiceToNumber(formData.crdfd_noidungchuongtrinhcohoplykhong),
      crdfd_thietbinghenhinonkhong: convertChoiceToNumber(formData.crdfd_thietbinghenhinonkhong),
      crdfd_thanhphanlop: convertChoiceToNumber(formData.crdfd_thanhphanlop),
      crdfd_thoigianphanboukhong: convertChoiceToNumber(formData.crdfd_thoigianphanboukhong),
      crdfd_tailieuayunoidungkhong: convertChoiceToNumber(formData.crdfd_tailieuayunoidungkhong),
      crdfd_uthoigianthuctapkynangkhong: convertChoiceToNumber(formData.crdfd_uthoigianthuctapkynangkhong),
      crdfd_gopycaitienkhoahoc: formData.crdfd_gopycaitienkhoahoc,
      crdfd_gopynoidungcanbosung: formData.crdfd_gopynoidungcanbosung,
      crdfd_noidungkhongthichlydo: formData.crdfd_noidungkhongthichlydo,
      crdfd_anhgiachungvechuongtrinh: convertChoiceToNumber(formData.crdfd_anhgiachungvechuongtrinh),
      crdfd_anhgiachungvegiangvien: convertChoiceToNumber(formData.crdfd_anhgiachungvegiangvien),
      crdfd_ngaybatdau: new Date().toISOString(),
      crdfd_ngayketthuc: new Date().toISOString(),
    };

    // Get the access token
    const token = await getAccessToken();

    // Make the API call to your CRM system
    const response = await axios.post(
      `${BASE_URL}/crdfd_danhgiakhoahocs`,
      crmData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error submitting evaluation:', error.response?.data || error.message);
    return res.status(500).json({ 
      message: 'Error submitting evaluation',
      details: error.response?.data || error.message 
    });
  }
} 