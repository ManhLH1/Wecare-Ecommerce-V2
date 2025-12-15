import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";
import customer from "@/model/customer";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const CUSTOMER_TABLE = "crdfd_customers";

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
  const filter = `_cr1bb_khachhang_value eq '${customerId}'`;
  const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;

  try {
    const response = await axios.get(`${BASE_URL}${table}?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    const uniqueGroups = new Map();
    
    if (!response?.data?.value) return [];
    response.data.value.forEach((item: any) => {
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
    return [];
  }
};

const getAllCustomers = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Log incoming request để debug
    console.log('getAllCustomers - Incoming request query:', JSON.stringify(req.query, null, 2));
    console.log('getAllCustomers - Request URL:', req.url);
    
    const customerId = req.query.customerId;
    const saleName = req.query.saleName;
    const search = req.query.search;

    // customerId là optional - nếu không có sẽ lấy tất cả khách hàng
    const customerIdStr = customerId
      ? (Array.isArray(customerId) ? customerId[0] : String(customerId))
      : null;

    // Nếu customerId là 'null' hoặc 'undefined' thì coi như không có
    const hasValidCustomerId = customerIdStr && 
      customerIdStr.trim() !== '' && 
      customerIdStr !== 'null' && 
      customerIdStr !== 'undefined';

    const customerColumns =
      "crdfd_saleonline,crdfd_saledirect,crdfd_name,_crdfd_salename_value,crdfd_customerid,cr1bb_sptiemnangaconfirm,cr44a_st,crdfd_phone2,crdfd_address,cr44a_emailnguoinhanhoaon,crdfd_mst,cr1bb_ngunggiaodich,cr44a_makhachhang,crdfd_json_phan_hang_chu_ky_hien_tai,crdfd_json_phan_hang_chu_ky_truoc";
    const debtColumns =
      "cr1bb_hancongnonen,cr1bb_hanmuccongnonen,cr1bb_congnohomnay,cr1bb_congnoquahan,cr1bb_congnochuatoihan,createdon,cr1bb_ngaynhacno,cr1bb_ngaythongbao,cr1bb_tongcongno,cr44a_trangthainhacno,cr1bb_ieukhoanthanhtoan";
    
    let filter = "statecode eq 0";

    // Xử lý saleName
    const saleNameStr = Array.isArray(saleName) ? saleName[0] : (saleName ? String(saleName) : undefined);
    let decodedSaleName: string | undefined = saleNameStr;
    try {
      if (saleNameStr && saleNameStr !== 'undefined' && saleNameStr !== 'null' && saleNameStr.trim() !== '') {
        decodedSaleName = decodeURIComponent(saleNameStr);
      } else {
        decodedSaleName = undefined;
      }
    } catch (e) {
      decodedSaleName = (saleNameStr && saleNameStr !== 'undefined' && saleNameStr !== 'null') ? saleNameStr : undefined;
    }

    // Xử lý search
    const searchStr = Array.isArray(search) ? search[0] : (search ? String(search) : undefined);

    // Xây dựng filter - chỉ thêm filter customerId nếu có
    if (hasValidCustomerId && customerIdStr) {
      // Kiểm tra xem customerIdStr có phải là GUID không
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerIdStr);

      if (decodedSaleName) {
        const escapedSaleName = decodedSaleName.replace(/'/g, "''");
        if (isGuid) {
          filter += ` and (_crdfd_salename_value eq '${customerIdStr}' or crdfd_saleonline eq '${escapedSaleName}' or crdfd_saledirect eq '${escapedSaleName}')`;
        } else {
          filter += ` and (crdfd_saleonline eq '${escapedSaleName}' or crdfd_saledirect eq '${escapedSaleName}')`;
        }
      } else if (isGuid) {
        filter += ` and _crdfd_salename_value eq '${customerIdStr}'`;
      } else if (customerIdStr.length > 12) {
        const escapedCustomerId = customerIdStr.replace(/'/g, "''");
        filter += ` and (crdfd_saleonline eq '${escapedCustomerId}' or crdfd_saledirect eq '${escapedCustomerId}')`;
      } else {
        const escapedPhone = customerIdStr.replace(/'/g, "''");
        filter += ` and (cr44a_st eq '${escapedPhone}' or crdfd_phone2 eq '${escapedPhone}')`;
      }
    } else if (decodedSaleName) {
      // Nếu chỉ có saleName mà không có customerId
      const escapedSaleName = decodedSaleName.replace(/'/g, "''");
      filter += ` and (crdfd_saleonline eq '${escapedSaleName}' or crdfd_saledirect eq '${escapedSaleName}')`;
    }

    // Thêm search filter nếu có
    if (searchStr && searchStr.trim() !== '' && searchStr !== 'undefined' && searchStr !== 'null') {
      const escapedSearch = searchStr.replace(/'/g, "''");
      filter += ` and contains(crdfd_name, '${escapedSearch}')`;
    }

    // Log filter để debug
    console.log('getAllCustomers - Final filter:', filter);
    console.log('getAllCustomers - hasValidCustomerId:', hasValidCustomerId);
    console.log('getAllCustomers - customerIdStr:', customerIdStr);
    console.log('getAllCustomers - decodedSaleName:', decodedSaleName);
    console.log('getAllCustomers - searchStr:', searchStr);

    // Validate filter trước khi gọi API
    if (!filter || filter.trim() === '') {
      console.error('getAllCustomers - Empty filter');
      return res.status(400).json({ error: "Invalid filter" });
    }

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

    // Build query để lấy tất cả khách hàng
    const selectPart = `$select=${encodeURIComponent(customerColumns)}`;
    const filterPart = `$filter=${encodeURIComponent(filter)}`;
    const orderbyPart = `$orderby=${encodeURIComponent('crdfd_name')}`;
    const expandPart = `$expand=${encodeURIComponent('crdfd_Quanhuyen($select=_cr1bb_salesonline_value)')}`;
    
    const queryParams = [
      selectPart,
      filterPart,
      orderbyPart,
      expandPart
    ].join('&');

    // Lấy tất cả khách hàng bằng cách loop qua các trang
    let allCustomers: any[] = [];
    let apiEndpoint = `${BASE_URL}${CUSTOMER_TABLE}?${queryParams}`;

    console.log('getAllCustomers - API Endpoint:', apiEndpoint);

    while (apiEndpoint) {
      try {
        const response = await axios.get(apiEndpoint, { headers });
        
        if (response.data?.value && Array.isArray(response.data.value)) {
          allCustomers = allCustomers.concat(response.data.value);
          console.log(`getAllCustomers - Fetched ${response.data.value.length} customers, total: ${allCustomers.length}`);
        }

        // Lấy nextLink để tiếp tục lấy trang tiếp theo
        apiEndpoint = response.data["@odata.nextLink"] || null;
      } catch (error: any) {
        console.error('getAllCustomers - Error fetching customers:', error);
        if (axios.isAxiosError(error)) {
          const errorDetails = error.response?.data;
          console.error('getAllCustomers - Error response:', JSON.stringify(errorDetails, null, 2));
          console.error('getAllCustomers - Error status:', error.response?.status);
          console.error('getAllCustomers - Error config URL:', error.config?.url);
          console.error('getAllCustomers - Filter used:', filter);
          
          // Trả về lỗi chi tiết hơn
          return res.status(error.response?.status || 500).json({
            error: "Error fetching data from CRM",
            details: errorDetails || error.message,
            filter: filter,
            endpoint: apiEndpoint,
            message: errorDetails?.error?.message || errorDetails?.message || "Unknown error"
          });
        }
        return res.status(500).json({ error: "Internal server error" });
      }
    }

    // Nếu không có khách hàng nào
    if (allCustomers.length === 0) {
      return res.status(200).json({ 
        data: [], 
        totalCount: 0
      });
    }

    // Xử lý dữ liệu khách hàng - giới hạn số lượng request đồng thời để tránh quá tải
    const BATCH_SIZE = 10; // Xử lý 10 khách hàng mỗi lần
    const processedCustomers: any[] = [];
    
    for (let i = 0; i < allCustomers.length; i += BATCH_SIZE) {
      const batch = allCustomers.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (item: any) => {
        const potentialProducts = item.cr1bb_sptiemnangaconfirm
          ? item.cr1bb_sptiemnangaconfirm.split(", ")
          : [];

        const mst =
          item.crdfd_mst === "0" || item.crdfd_mst == null
            ? ""
            : item.crdfd_mst;

        // Lấy thông tin công nợ
        const debtTable = "cr44a_nhacnos";
        const debtFilter = `_cr44a_khachhang_value eq '${item.crdfd_customerid}'`;
        const debtQuery = `$select=${debtColumns}&$filter=${encodeURIComponent(
          debtFilter
        )}&$orderby=createdon desc&$top=1`;
        const debtApiEndpoint = `${BASE_URL}${debtTable}?${debtQuery}`;

        let debtData = {};
        try {
          const debtResponse = await axios.get(debtApiEndpoint, { headers });
          debtData = debtResponse.data.value[0] || {};
        } catch (error) {
          console.error('Error fetching debt data for customer:', item.crdfd_customerid);
        }

        // Lấy thông tin nhóm khách hàng
        const customerGroupData = await fetchCustomerGroupData(item.crdfd_customerid, token);

        return {
          customerId: item.crdfd_customerid,
          sdt: item.cr44a_st || "",
          crdfd_address: item.crdfd_address || "",
          email: item.cr44a_emailnguoinhanhoaon || "",
          mst: mst,
          name: item.crdfd_name,
          potentialProducts: potentialProducts,
          quanhuyen: [],
          cr1bb_ngunggiaodich: item.cr1bb_ngunggiaodich || null,
          customerGroups: customerGroupData.map((group: any) => ({
            customerGroupId: group.customerGroupId,
            customerGroupName: group.customerGroupName
          })),
          cr44a_makhachhang: item.cr44a_makhachhang,
          saleonline: item.crdfd_saleonline || "",
          saledirect: item.crdfd_saledirect || "",
          debtInfo: {
            cr1bb_hancongnonen: (debtData as any).cr1bb_hancongnonen,
            cr1bb_hanmuccongnonen: (debtData as any).cr1bb_hanmuccongnonen,
            cr1bb_congnohomnay: (debtData as any).cr1bb_congnohomnay,
            cr1bb_congnoquahan: (debtData as any).cr1bb_congnoquahan,
            cr1bb_congnochuatoihan: (debtData as any).cr1bb_congnochuatoihan,
            createdon: (debtData as any).createdon,
            cr1bb_ngaynhacno: (debtData as any).cr1bb_ngaynhacno,
            cr1bb_ngaythongbao: (debtData as any).cr1bb_ngaythongbao,
            cr1bb_tongcongno: (debtData as any).cr1bb_tongcongno,
            cr44a_trangthainhacno: (debtData as any).cr44a_trangthainhacno,
            cr1bb_ieukhoanthanhtoan: getDieuKhoanThanhToanLabel(
              (debtData as any).cr1bb_ieukhoanthanhtoan
            ),
          },
          crdfd_json_phan_hang_chu_ky_hien_tai: parseJsonSafe(item.crdfd_json_phan_hang_chu_ky_hien_tai),
          crdfd_json_phan_hang_chu_ky_truoc: parseJsonSafe(item.crdfd_json_phan_hang_chu_ky_truoc),
        };
        })
      );
      processedCustomers.push(...batchResults);
      console.log(`getAllCustomers - Processed batch ${Math.floor(i / BATCH_SIZE) + 1}, total: ${processedCustomers.length}`);
    }

    return res.status(200).json({
      data: processedCustomers,
      totalCount: processedCustomers.length
    });

  } catch (error: any) {
    console.error('getAllCustomers - Unhandled error:', error);
    
    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        error: "Error fetching data",
        details: error.response?.data || error.message,
      });
    }
    
    return res.status(500).json({ 
      error: "Internal server error",
      message: error?.message || String(error),
    });
  }
};

// Helper function for safe JSON parsing
function parseJsonSafe(value: any) {
  if (!value) return null;
  try {
    if (typeof value === 'object') return value;
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export default getAllCustomers;

