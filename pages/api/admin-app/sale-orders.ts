import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SALE_ORDER_TABLE = "crdfd_sale_orders";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customerId } = req.query;
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

    // Build filter according to Power BI logic:
    // - Status = Active (statecode eq 0)
    // - Mã khách hàng = customerId (using _crdfd_khachhang_value for GUID or crdfd_makhachhang for text)
    // - Trạng thái giao nhận 1 = 'Chưa giao' (crdfd_trangthaigiaonhan1 eq 191920000)
    // - Active data = Active (crdfd_activedata eq false or crdfd_activedata eq 0)
    let filter = "statecode eq 0";
    
    // Filter by customer
    if (customerId && typeof customerId === "string") {
      // Validate if customerId is a GUID (Dynamics CRM format)
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      // GUIDs in OData filters should not have quotes
      if (isGuid) {
        filter += ` and _crdfd_khachhang_value eq ${customerId}`;
      } else {
        // For non-GUID values (mã khách hàng text), use crdfd_makhachhang
        filter += ` and crdfd_makhachhang eq '${customerId}'`;
      }
    }
    
    // Filter: Trạng thái giao nhận 1 = 'Chưa giao' (191920000)
    filter += ` and crdfd_trangthaigiaonhan1 eq 191920000`;
    
    // Filter: Active data = Active (0 = false = Active)
    filter += ` and crdfd_activedata eq false`;

    const columns = "crdfd_sale_orderid,crdfd_name,crdfd_so_code,crdfd_so_auto";
    // Sort by Created On (createdon) descending as per Power BI logic
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&$orderby=createdon desc&$top=100`;

    const endpoint = `${BASE_URL}${SALE_ORDER_TABLE}?${query}`;

    console.log('Fetching sale orders from:', endpoint);
    console.log('Filter:', filter);
    console.log('CustomerId:', customerId);

    const response = await axios.get(endpoint, { headers });

    console.log('Sale orders response count:', response.data.value?.length || 0);

    const saleOrders = (response.data.value || []).map((item: any) => {
      // Try different possible field names for ID
      const id = item.crdfd_sale_orderid || item.crdfd_sale_orderid || item.crdfd_sale_order_id || '';
      return {
        crdfd_sale_orderid: id,
        crdfd_name: item.crdfd_name || "",
        crdfd_so_code: item.crdfd_so_code || "",
        crdfd_so_auto: item.crdfd_so_auto || "",
      };
    });

    console.log('Mapped sale orders count:', saleOrders.length);

    res.status(200).json(saleOrders);
  } catch (error: any) {
    console.error("Error fetching sale orders:", error);
    
    // Log full error details for debugging
    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      console.error("Error response headers:", error.response.headers);
      
      return res.status(error.response.status || 500).json({
        error: "Error fetching sale orders",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }
    
    res.status(500).json({
      error: "Error fetching sale orders",
      details: error.message,
    });
  }
}

