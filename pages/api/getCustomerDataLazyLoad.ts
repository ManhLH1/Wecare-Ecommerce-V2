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

// Hàm fetchWithRetry cho axios
async function fetchWithRetry(url: string, config: any, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await axios.get(url, config);
    } catch (err: any) {
      // Retry nếu là lỗi mạng tạm thời (ECONNRESET hoặc ETIMEDOUT)
      if (
        i === retries ||
        !['ECONNRESET', 'ETIMEDOUT'].includes(err.code)
      ) throw err;
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

const fetchCustomerGroupData = async (customerId: string, token: string) => {
  const table = "cr1bb_groupkhs";
  const columns = "_cr1bb_khachhang_value,_cr1bb_nhomkhachhang_value,cr1bb_tenkh,cr1bb_tennhomkh";
  // GUID trong OData filter cần có dấu nháy đơn
  const filter = `_cr1bb_khachhang_value eq '${customerId}'`;
  const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;

  try {
    const response = await fetchWithRetry(`https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    // Create a Map to store unique customer groups by customerGroupId
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

const getCustomerDataLazyLoad = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Log incoming request để debug
    console.log('getCustomerDataLazyLoad - Incoming request query:', JSON.stringify(req.query, null, 2));
    console.log('getCustomerDataLazyLoad - Request method:', req.method);
    console.log('getCustomerDataLazyLoad - Request URL:', req.url);
    
    const customerId = req.query.customerId;
    const saleName = req.query.saleName;
    const search = req.query.search;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const skip = (page - 1) * pageSize;
    
    console.log('getCustomerDataLazyLoad - Parsed params:', {
      customerId,
      saleName,
      search,
      page,
      pageSize
    });
    
    // Validate customerId
    if (!customerId) {
      console.error('getCustomerDataLazyLoad - Missing customerId');
      return res.status(400).json({ error: "Customer ID is required" });
    }

    // Ensure customerId is a string
    const customerIdStr = Array.isArray(customerId)
      ? customerId[0]
      : String(customerId || '');

    console.log('getCustomerDataLazyLoad - customerIdStr after processing:', customerIdStr);

    // Kiểm tra nếu customerId là null, undefined, hoặc chuỗi "null"
    if (!customerIdStr || customerIdStr.trim() === '' || customerIdStr === 'null' || customerIdStr === 'undefined') {
      console.error('getCustomerDataLazyLoad - Invalid customerIdStr:', customerIdStr);
      return res.status(400).json({ 
        error: "Customer ID is required", 
        message: "Customer ID cannot be null or undefined. Please ensure you are logged in.",
        received: customerId 
      });
    }

    let allResults: customer[] = [];

    const customerTable = "crdfd_customers";
    const debtTable = "cr44a_nhacnos";
    // Thêm các trường cần thiết cho trường hợp customerIdStr.length <= 12
    const customerColumns =
      "crdfd_saleonline,crdfd_saledirect,crdfd_name,_crdfd_salename_value,crdfd_customerid,cr1bb_sptiemnangaconfirm,cr44a_st,crdfd_phone2,crdfd_address,cr44a_emailnguoinhanhoaon,crdfd_mst,cr1bb_ngunggiaodich,cr44a_makhachhang,crdfd_json_phan_hang_chu_ky_hien_tai,crdfd_json_phan_hang_chu_ky_truoc";
    const debtColumns =
      "cr1bb_hancongnonen,cr1bb_hanmuccongnonen,cr1bb_congnohomnay,cr1bb_congnoquahan,cr1bb_congnochuatoihan,createdon,cr1bb_ngaynhacno,cr1bb_ngaythongbao,cr1bb_tongcongno,cr44a_trangthainhacno,cr1bb_ieukhoanthanhtoan";
    let filter = "statecode eq 0 ";
    
    // Ensure saleName is a string and decode it
    const saleNameStr = Array.isArray(saleName) ? saleName[0] : (saleName ? String(saleName) : undefined);
    const searchStr = Array.isArray(search) ? search[0] : (search ? String(search) : undefined);
    
    console.log('getCustomerDataLazyLoad - saleNameStr (before decode):', saleNameStr);
    console.log('getCustomerDataLazyLoad - searchStr:', searchStr);
    
    // Decode saleName if it's URL encoded
    let decodedSaleName: string | undefined = saleNameStr;
    try {
      if (saleNameStr && saleNameStr !== 'undefined' && saleNameStr !== 'null' && saleNameStr.trim() !== '') {
        decodedSaleName = decodeURIComponent(saleNameStr);
        console.log('getCustomerDataLazyLoad - decodedSaleName:', decodedSaleName);
      } else {
        decodedSaleName = undefined;
      }
    } catch (e) {
      console.error('getCustomerDataLazyLoad - Error decoding saleName:', e);
      // If decoding fails, use original string if it exists
      decodedSaleName = (saleNameStr && saleNameStr !== 'undefined' && saleNameStr !== 'null') ? saleNameStr : undefined;
    }
    
    // Kiểm tra xem customerIdStr có phải là GUID không
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerIdStr);
    
    // Nếu có saleName, tìm khách hàng của sale đó
    if (decodedSaleName) {
      // Escape single quotes in the sale name
      const escapedSaleName = decodedSaleName.replace(/'/g, "''");
      
      // Nếu customerId là GUID, ưu tiên tìm theo _crdfd_salename_value
      if (isGuid) {
        // Tìm theo GUID của nhân viên sale HOẶC theo tên sale (crdfd_saleonline/crdfd_saledirect)
        // GUID trong OData filter cần có dấu nháy đơn
        filter += ` and (_crdfd_salename_value eq '${customerIdStr}' or crdfd_saleonline eq '${escapedSaleName}' or crdfd_saledirect eq '${escapedSaleName}')`;
      } else {
        // Tìm theo tên sale (crdfd_saleonline) HOẶC crdfd_saledirect
        filter += ` and (crdfd_saleonline eq '${escapedSaleName}' or crdfd_saledirect eq '${escapedSaleName}')`;
      }
    }
    else if (isGuid) {
      // Nếu là GUID, tìm trực tiếp theo _crdfd_salename_value (GUID của nhân viên sale)
      // GUID trong OData filter cần có dấu nháy đơn
      filter += ` and _crdfd_salename_value eq '${customerIdStr}'`;
    } else if (customerIdStr.length > 12) {
      // Nếu không phải GUID nhưng dài > 12, có thể là tên sale
      // Cho phép lọc theo tên sale (online hoặc direct)
      const escapedCustomerId = customerIdStr.replace(/'/g, "''");
      filter += ` and (crdfd_saleonline eq '${escapedCustomerId}' or crdfd_saledirect eq '${escapedCustomerId}')`;
    } else {
      // Tìm theo số điện thoại
      const escapedPhone = customerIdStr.replace(/'/g, "''");
      filter += ` and (cr44a_st eq '${escapedPhone}' or crdfd_phone2 eq '${escapedPhone}')`;
    }
    
    // Add search filter if provided
    if (searchStr && searchStr.trim() !== '' && searchStr !== 'undefined' && searchStr !== 'null') {
      const escapedSearch = searchStr.replace(/'/g, "''");
      filter += ` and contains(crdfd_name, '${escapedSearch}')`;
    }
    
    // Log để debug
    console.log('getCustomerDataLazyLoad - customerIdStr:', customerIdStr);
    console.log('getCustomerDataLazyLoad - decodedSaleName:', decodedSaleName);
    console.log('getCustomerDataLazyLoad - isGuid:', isGuid);
    console.log('getCustomerDataLazyLoad - filter:', filter);

    // Thêm log filter và endpoint để debug
    // Build query parts separately để tránh lỗi encoding
    const selectPart = `$select=${encodeURIComponent(customerColumns)}`;
    const filterPart = `$filter=${encodeURIComponent(filter)}`;
    const topPart = `$top=${pageSize}`;
    const orderbyPart = `$orderby=${encodeURIComponent('crdfd_name')}`;
    const expandPart = `$expand=${encodeURIComponent('crdfd_Quanhuyen($select=_cr1bb_salesonline_value)')}`;
    
    const queryParams = [
      selectPart,
      filterPart,
      topPart,
      orderbyPart,
      expandPart
    ].join('&');
    
    const customerApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${customerTable}?${queryParams}`;
    
    console.log('getCustomerDataLazyLoad - Filter string:', filter);
    console.log('getCustomerDataLazyLoad - API Endpoint:', customerApiEndpoint);
    console.log('getCustomerDataLazyLoad - Full URL length:', customerApiEndpoint.length);
    
    const token = await getAccessToken();

    if (!token) {
      return res.status(401).json({ error: "Failed to obtain access token" });
    }

    // Fetch customer data first
    let customerResponse;
    try {
      // Validate URL before making request
      try {
        new URL(customerApiEndpoint);
      } catch (urlError) {
        console.error('getCustomerDataLazyLoad - Invalid URL:', customerApiEndpoint);
        return res.status(400).json({ 
          error: "Invalid API endpoint URL",
          details: "Failed to construct valid URL"
        });
      }
      
      customerResponse = await axios.get(customerApiEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      });
      
    } catch (error) {
      console.error('getCustomerDataLazyLoad - Error fetching from CRM:', error);
      if (axios.isAxiosError(error)) {
        console.error('getCustomerDataLazyLoad - Error response:', JSON.stringify(error.response?.data, null, 2));
        console.error('getCustomerDataLazyLoad - Error status:', error.response?.status);
        console.error('getCustomerDataLazyLoad - Error config URL:', error.config?.url);
        
        // Return more detailed error information
        const errorDetails = error.response?.data || error.message;
        return res.status(error.response?.status || 500).json({
          error: "Error fetching data from CRM",
          details: errorDetails,
          filter: filter,
          endpoint: customerApiEndpoint
        });
      }
      return res.status(500).json({ error: "Internal server error" });
    }

    if (!customerResponse.data.value || !Array.isArray(customerResponse.data.value)) {
      console.log('getCustomerDataLazyLoad - Invalid response format:', customerResponse.data);
      return res.status(404).json({ error: "Invalid response format from customer API" });
    }

    console.log('getCustomerDataLazyLoad - Found customers:', customerResponse.data.value.length);

    if (customerResponse.data.value.length === 0) {
      console.log('getCustomerDataLazyLoad - No customers found with filter:', filter);
      return res.status(200).json({ 
        data: [], 
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });
    }
    
    if (customerIdStr.length > 12) {
      // Đơn giản hóa - chỉ trả về dữ liệu cơ bản mà không cần debt info
      allResults = customerResponse.data.value.map((item: any) => ({
        crdfd_customerid: item.crdfd_customerid,
        crdfd_name: item.crdfd_name,
        saleonline: item.crdfd_saleonline || "",
        saledirect: item.crdfd_saledirect || item._crdfd_salename_value || "",
        // Các field khác sẽ được thêm sau khi có đầy đủ data
        potentialProducts: [],
        sdt: "",
        crdfd_address: "",
        cr1bb_ngunggiaodich: null,
        customerGroups: [],
        debtInfo: {
          cr1bb_hancongnonen: null,
          cr1bb_hanmuccongnonen: null,
          cr1bb_congnohomnay: null,
          cr1bb_congnoquahan: null,
          cr1bb_congnochuatoihan: null,
          createdon: null,
          cr1bb_ngaynhacno: null,
          cr1bb_ngaythongbao: null,
          cr1bb_tongcongno: null,
          cr44a_trangthainhacno: null,
          cr44a_makhachhang: "",
          cr1bb_ieukhoanthanhtoan: "",
        },
        crdfd_json_phan_hang_chu_ky_hien_tai: null,
        crdfd_json_phan_hang_chu_ky_truoc: null,
      }));

      // Implement client-side pagination since CRM doesn't support $skip
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = allResults.slice(startIndex, endIndex);
      
      return res.status(200).json({
        data: paginatedResults,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalCount: allResults.length,
          totalPages: Math.ceil(allResults.length / pageSize),
          hasNextPage: endIndex < allResults.length,
          hasPreviousPage: page > 1
        }
      });
    } else {
      const customerData = customerResponse.data.value[0];
      
      // Kiểm tra xem customerData có tồn tại không
      if (!customerData) {
        console.log('getCustomerDataLazyLoad - No customer data found');
        return res.status(404).json({ error: "No customer found" });
      }
      
      const potentialProducts = customerData.cr1bb_sptiemnangaconfirm
        ? customerData.cr1bb_sptiemnangaconfirm.split(", ")
        : [];

      const mst =
        customerData.crdfd_mst === "0" || customerData.crdfd_mst == null
          ? ""
          : customerData.crdfd_mst;

      // GUID trong OData filter cần có dấu nháy đơn
      const debtFilter = `_cr44a_khachhang_value eq '${customerData.crdfd_customerid}'`;
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
      };

      return res.status(200).json({
        data: responseData,
        pagination: {
          currentPage: 1,
          pageSize: 1,
          totalCount: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });
    }
  } catch (error: any) {
    console.error('getCustomerDataLazyLoad - Unhandled error:', error);
    console.error('getCustomerDataLazyLoad - Error stack:', error?.stack);
    
    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        error: "Error fetching data",
        details: error.response?.data || error.message,
      });
    }
    
    // Log full error details
    const errorMessage = error?.message || String(error);
    console.error('getCustomerDataLazyLoad - Error message:', errorMessage);
    
    return res.status(500).json({ 
      error: "Internal server error",
      message: errorMessage,
      details: error?.toString()
    });
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

export default getCustomerDataLazyLoad;
