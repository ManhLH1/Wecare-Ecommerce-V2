import { NextApiRequest, NextApiResponse } from "next";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";
import PreOrders from "@/model/Pre-Orders";

const getPreOdersData = async (req: NextApiRequest, res: NextApiResponse) => {
  const id_khachhang = req.query.id_khachhang as string;
  const typeUserLogin = req.query.type_Login as string;

  const table = "crdfd_pre_orderses";
  const columns =
    "crdfd_pre_ordersid,crdfd_id_khachhang,crdfd_tenkhachhang,crdfd_so_dien_thoai,crdfd_tensanpham,crdfd_soluong,crdfd_onvi,crdfd_ongia,crdfd_thanhtien,crdfd_ngayaton,crdfd_trangthai,cr1bb_ly_do_sua_gia,cr1bb_phuongthucthanhtoan,crdfd_trangthaiduyetgia,crdfd_nguoitaoon,createdon,statecode";
  let filter = "statecode eq 0";
  if (typeUserLogin === "customer") {
    filter += ` and crdfd_id_khachhang eq '${id_khachhang}'`;
  } else {
    filter += ` and crdfd_idnhanviensaledirect eq '${id_khachhang}' or crdfd_idnhanviensaleonline eq '${id_khachhang}'`;
  }

  const filterQuery = `&$filter=${encodeURIComponent(filter)}`;
  const query = `$select=${columns}${filterQuery}`;
  const initialEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`;
  let apiEndpoint = initialEndpoint;
  let allResults: PreOrders[] = [];

  try {
    const token = await getAccessToken();
    while (apiEndpoint) {
      const response = await axios.get(apiEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      });

      if (
        Array.isArray(response.data.value) &&
        response.data.value.length > 0
      ) {
        allResults = allResults.concat(response.data.value);
        apiEndpoint = response.data["@odata.nextLink"];
      } else {
        break;
      }
    }

    // Sort results by crdfd_name
    allResults.sort((a, b) => {
      // Convert ngày tạo hàng từ chuỗi về kiểu Date để có thể so sánh
      const dateA = new Date(a.crdfd_ngayaton);
      const dateB = new Date(b.crdfd_ngayaton);

      // So sánh ngày theo thứ tự giảm dần (desc)
      return dateB.getTime() - dateA.getTime();
    });

    res.status(200).json(allResults);
  } catch (error) {
    console.error("Error fetching data - getPreOdersData - line 62:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
};

export default getPreOdersData;
