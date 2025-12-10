import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";
import customer from "@/model/customer";

const getDieuKhoanThanhToanLabel = (value: number): string => {
  switch (value) {
    case 0:
      return "Thanh toán sau khi nhận hàng";
    case 14:
      return "Thanh toán 2 lần vào ngày 10 và 25";
    case 30:
      return "Thanh toán vào ngày 5 hàng tháng";
    case 283640000:
      return "Tiền mặt";
    case 283640001:
      return "Công nợ 7 ngày";
    case 283640002:
      return "Công nợ 30 ngày";
    case 283640003:
      return "Công nợ 45 ngày";
    case 283640004:
      return "Công nợ 60 ngày";
    case 283640005:
      return "Thanh toán trước khi nhận hàng";
    default:
      return "Không xác định";
  }
};

const fetchCustomerGroupData = async (customerId: string, token: string) => {
  const table = "cr1bb_groupkhs";
  const columns = "_cr1bb_khachhang_value,_cr1bb_nhomkhachhang_value,cr1bb_tenkh,cr1bb_tennhomkh";
  const filter = `_cr1bb_khachhang_value eq ${customerId}`;
  const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;

  try {
    const response = await axios.get(`https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    // Create a Map to store unique customer groups by customerGroupId
    const uniqueGroups = new Map();
    
    response.data.value?.forEach((item: any) => {
      const groupId = item._cr1bb_nhomkhachhang_value;
      if (!uniqueGroups.has(groupId)) {
        uniqueGroups.set(groupId, {
          customerId: item._cr1bb_khachhang_value,
          customerGroupId: groupId,
          customerName: item.cr1bb_tenkh,
          customerGroupName: item.cr1bb_tennhomkh,
        });
      }
    });

    return Array.from(uniqueGroups.values());
  } catch (error) {
    console.error("Error fetching customer group data:", error);
    return [];
  }
};

const getCustomerData = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const customerId = req.query.customerId;

    // Validate customerId
    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    // Ensure customerId is a string
    const customerIdStr = Array.isArray(customerId)
      ? customerId[0]
      : customerId;

    if (!customerIdStr) {
      return res.status(400).json({ error: "Invalid Customer ID format" });
    }

    let allResults: customer[] = [];

    const customerTable = "crdfd_customers";
    const debtTable = "cr44a_nhacnos";
    const customerColumns =
      "crdfd_customerid,crdfd_name,cr1bb_sptiemnangaconfirm,cr44a_st,crdfd_phone2,crdfd_address,cr44a_emailnguoinhanhoaon,crdfd_mst,_crdfd_salename_value,cr1bb_ngunggiaodich,cr44a_makhachhang,crdfd_json_phan_hang_chu_ky_hien_tai,crdfd_json_phan_hang_chu_ky_truoc,crdfd_wecare_rewards";
    const debtColumns =
      "cr1bb_hancongnonen,cr1bb_hanmuccongnonen,cr1bb_congnohomnay,cr1bb_congnoquahan,cr1bb_congnochuatoihan,createdon,cr1bb_ngaynhacno,cr1bb_ngaythongbao,cr1bb_tongcongno,cr44a_trangthainhacno,cr1bb_ieukhoanthanhtoan";
    let filter = "statecode eq 0 ";

    if (customerIdStr.length > 12) {
      filter += ` and (_crdfd_salename_value eq ${customerIdStr} or crdfd_customerid eq ${customerIdStr})`;
    } else {
      filter += ` and cr44a_st eq '${customerIdStr}' or crdfd_phone2 eq '${customerIdStr}'`;
    }

    const customerQuery = `$select=${customerColumns}&$filter=${encodeURIComponent(
      filter
    )}`;
    const customerApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${customerTable}?${customerQuery}&$expand=crdfd_Quanhuyen($select=_cr1bb_salesonline_value)`;

    const token = await getAccessToken();

    if (!token) {
      return res.status(401).json({ error: "Failed to obtain access token" });
    }

    // Fetch customer data first
    const customerResponse = await axios.get(customerApiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    if (!customerResponse.data.value || !Array.isArray(customerResponse.data.value)) {
      return res.status(404).json({ error: "Invalid response format from customer API" });
    }

    if (customerResponse.data.value.length === 0) {
      return res.status(404).json({ error: "No customer found" });
    }

    if (customerIdStr.length > 12) {
      allResults = await Promise.all(
        customerResponse.data.value.map(async (item: any) => {
          const debtFilter = `_cr44a_khachhang_value eq ${item.crdfd_customerid} and statecode eq 0 and cr44a_trangthaithanhtoan eq 799880000 and _cr44a_khachhang_value ne null`;
          const debtQuery = `$select=${debtColumns}&$filter=${encodeURIComponent(debtFilter)}&$orderby=createdon desc&$top=1`;
          const debtApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${debtTable}?${debtQuery}`;

          try {
            const [debtResponse, customerGroupData] = await Promise.all([
              axios.get(debtApiEndpoint, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  "OData-MaxVersion": "4.0",
                  "OData-Version": "4.0",
                },
              }),
              fetchCustomerGroupData(item.crdfd_customerid, token)
            ]);

            const debtData = debtResponse.data.value[0] || {};

            return {
              crdfd_customerid: item.crdfd_customerid,
              crdfd_name: item.crdfd_name,
              potentialProducts: item.cr1bb_sptiemnangaconfirm
                ? item.cr1bb_sptiemnangaconfirm.split(", ")
                : [],
              sdt: item.cr44a_st || "",
              crdfd_address: item.crdfd_address || "",
              saleonline: item.crdfd_Quanhuyen
                ? item.crdfd_Quanhuyen._cr1bb_salesonline_value
                : "",
              saledirect: item._crdfd_salename_value,
              cr1bb_ngunggiaodich: item.cr1bb_ngunggiaodich || null,
              customerGroups: customerGroupData.map(group => ({
                customerGroupId: group.customerGroupId,
                customerGroupName: group.customerGroupName
              })),
              debtInfo: {
                cr1bb_hancongnonen: debtData.cr1bb_hancongnonen,
                cr1bb_hanmuccongnonen: debtData.cr1bb_hanmuccongnonen,
                cr1bb_congnohomnay: debtData.cr1bb_congnohomnay,
                cr1bb_congnoquahan: debtData.cr1bb_congnoquahan,
                cr1bb_congnochuatoihan: debtData.cr1bb_congnochuatoihan,
                createdon: debtData.createdon,
                cr1bb_ngaynhacno: debtData.cr1bb_ngaynhacno,
                cr1bb_ngaythongbao: debtData.cr1bb_ngaythongbao,
                cr1bb_tongcongno: debtData.cr1bb_tongcongno,
                cr44a_trangthainhacno: debtData.cr44a_trangthainhacno,
                cr44a_makhachhang: item.cr44a_makhachhang,
                cr1bb_ieukhoanthanhtoan: getDieuKhoanThanhToanLabel(
                  debtData.cr1bb_ieukhoanthanhtoan
                ),
              },
              crdfd_json_phan_hang_chu_ky_hien_tai: parseJsonSafe(item.crdfd_json_phan_hang_chu_ky_hien_tai),
              crdfd_json_phan_hang_chu_ky_truoc: parseJsonSafe(item.crdfd_json_phan_hang_chu_ky_truoc),
              crdfd_wecare_rewards: parseJsonSafe(item.crdfd_wecare_rewards),
            };
          } catch (error) {
            return null;
          }
        })
      );

      // Filter out any null results from failed debt requests
      allResults = allResults.filter(
        (result): result is customer => result !== null
      );

      return res.status(200).json(allResults);
    } else {
      const customerData = customerResponse.data.value[0];
      const potentialProducts = customerData.cr1bb_sptiemnangaconfirm
        ? customerData.cr1bb_sptiemnangaconfirm.split(", ")
        : [];

      const mst =
        customerData.crdfd_mst === "0" || customerData.crdfd_mst == null
          ? ""
          : customerData.crdfd_mst;

      const debtFilter = `_cr44a_khachhang_value eq ${customerData.crdfd_customerid}`;
      const debtQuery = `$select=${debtColumns}&$filter=${encodeURIComponent(
        debtFilter
      )}&$orderby=createdon desc&$top=1`;
      const debtApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${debtTable}?${debtQuery}`;

      const [debtResponse, customerGroupData] = await Promise.all([
        axios.get(debtApiEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
          },
        }),
        fetchCustomerGroupData(customerData.crdfd_customerid, token)
      ]);

      const debtData = debtResponse.data.value[0] || {};

      const responseData = {
        customerId: customerData.crdfd_customerid,
        sdt: customerData.cr44a_st || "",
        crdfd_address: customerData.crdfd_address || "",
        email: customerData.cr44a_emailnguoinhanhoaon || "",
        mst: mst,
        name: customerData.crdfd_name,
        potentialProducts: potentialProducts,
        quanhuyen: [],
        cr1bb_ngunggiaodich: customerData.cr1bb_ngunggiaodich || null,
        customerGroups: customerGroupData.map(group => ({
          customerGroupId: group.customerGroupId,
          customerGroupName: group.customerGroupName
        })),
        cr44a_makhachhang: customerData.cr44a_makhachhang,
        debtInfo: {
          cr1bb_hancongnonen: debtData.cr1bb_hancongnonen,
          cr1bb_hanmuccongnonen: debtData.cr1bb_hanmuccongnonen,
          cr1bb_congnohomnay: debtData.cr1bb_congnohomnay,
          cr1bb_congnoquahan: debtData.cr1bb_congnoquahan,
          cr1bb_congnochuatoihan: debtData.cr1bb_congnochuatoihan,
          createdon: debtData.createdon,
          cr1bb_ngaynhacno: debtData.cr1bb_ngaynhacno,
          cr1bb_ngaythongbao: debtData.cr1bb_ngaythongbao,
          cr1bb_tongcongno: debtData.cr1bb_tongcongno,
          cr44a_trangthainhacno: debtData.cr44a_trangthainhacno,
          cr1bb_ieukhoanthanhtoan: getDieuKhoanThanhToanLabel(
            debtData.cr1bb_ieukhoanthanhtoan
          ),
        },
        crdfd_json_phan_hang_chu_ky_hien_tai: parseJsonSafe(customerData.crdfd_json_phan_hang_chu_ky_hien_tai),
        crdfd_json_phan_hang_chu_ky_truoc: parseJsonSafe(customerData.crdfd_json_phan_hang_chu_ky_truoc),
        crdfd_wecare_rewards: parseJsonSafe(customerData.crdfd_wecare_rewards),
      };

      return res.status(200).json(responseData);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        error: "Error fetching data",
        details: error.response?.data || error.message,
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Add helper function for safe JSON parsing
function parseJsonSafe(value: any) {
  if (!value) return null;
  try {
    if (typeof value === 'object') return value;
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export default getCustomerData;
