import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const getDataDathangSO = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { id, type, saleName } = req.query;
  const table = "crdfd_athangsos";
  const select = "$select=crdfd_idkhachhang,crdfd_idonvi,crdfd_idsanpham,crdfd_name,_cr1bb_khachhang_value,_cr1bb_onvi_value,crdfd_onvitext,_cr1bb_sanpham_value,crdfd_sanphamtext,crdfd_chieckhau,crdfd_ctkm,crdfd_soluong,crdfd_nguoitao,crdfd_ngaytao2,crdfd_giagoc,crdfd_giaexuat,crdfd_duyetgia,cr1bb_trangthaiduyetgia, statecode, crdfd_trangthaionhang";
  const orderby = "&$orderby=crdfd_ngaytao2 desc";
  let filter = "";
  if (id && type === 'sale') {
    filter = `&$filter=crdfd_nguoitao eq '${saleName}'  and statecode eq 0`;
  }else{
    filter = `&$filter=_cr1bb_khachhang_value eq '${id}' and statecode eq 0`;
  }
  
  const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${select}${filter}${orderby}`;

  try {
    const token = await getAccessToken();
    
    const response = await axios.get(apiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: 'odata.include-annotations="*"',
      },
    });

    const data = response.data.value;
    res.status(200).json(data);
    
  } catch (error: any) {
    res.status(500).json({ 
      error: "Error fetching data from CRM",
      details: error.message,
      status: error.response?.status
    });
  }
};

export default getDataDathangSO; 