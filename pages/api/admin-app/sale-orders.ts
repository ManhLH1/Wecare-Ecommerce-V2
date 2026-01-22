import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SALE_ORDER_TABLE = "crdfd_sale_orders";

// Payment terms mapping used to normalize labels to keys (keep in sync with promotions.ts)
const PAYMENT_TERMS_MAP: Record<string, string> = {
  "0": "Thanh toán sau khi nhận hàng",
  "14": "Thanh toán 2 lần vào ngày 10 và 25",
  "30": "Thanh toán vào ngày 5 hàng tháng",
  "283640000": "Tiền mặt",
  "283640001": "Công nợ 7 ngày",
  "191920001": "Công nợ 20 ngày",
  "283640002": "Công nợ 30 ngày",
  "283640003": "Công nợ 45 ngày",
  "283640004": "Công nợ 60 ngày",
  "283640005": "Thanh toán trước khi nhận hàng",
};

const normalizePaymentTerm = (input?: string | number | null) : string | null => {
  // Treat null/undefined as missing; accept numeric 0 as valid input
  if (input === null || input === undefined) return null;
  const t = String(input).trim();
  if (t === "") return null;
  if (PAYMENT_TERMS_MAP[t]) return t;
  const foundKey = Object.keys(PAYMENT_TERMS_MAP).find(
    (k) => PAYMENT_TERMS_MAP[k].toLowerCase() === t.toLowerCase()
  );
  if (foundKey) return foundKey;
  const digits = t.replace(/\D/g, "");
  if (digits && PAYMENT_TERMS_MAP[digits]) return digits;
  return t;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customerId } = req.query;
    
    // Check cache first (use short cache as sale orders change frequently)
    const cacheKey = getCacheKey("sale-orders", { customerId });
    const cachedResponse = getCachedResponse(cacheKey, true); // Use short cache (1 min)
    if (cachedResponse !== undefined) {
      return res.status(200).json(cachedResponse);
    }

    const headers = {
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

    // Select payment term field - prefer `crdfd_dieu_khoan_thanh_toan`
    const columns = "crdfd_sale_orderid,crdfd_name,crdfd_so_code,crdfd_so_auto,cr1bb_vattext,cr1bb_loaihoaon,crdfd_loai_don_hang,crdfd_dieu_khoan_thanh_toan,crdfd_tongtien,createdon";
    // Sort by Created On (createdon) descending as per Power BI logic
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&$orderby=createdon desc&$top=100`;

    const endpoint = `${BASE_URL}${SALE_ORDER_TABLE}?${query}`;

    // Use deduplication
    const dedupKey = getDedupKey(SALE_ORDER_TABLE, { customerId });
    const response = await deduplicateRequest(dedupKey, () =>
      axiosClient.get(endpoint, { headers })
    );

    const saleOrders = (response.data.value || []).map((item: any) => {
      // Try different possible field names for ID
      const id = item.crdfd_sale_orderid || item.crdfd_sale_orderid || item.crdfd_sale_order_id || '';


      // Prefer raw numeric option set value on the preferred field only.
      let rawPaymentTerm: any = item.crdfd_dieu_khoan_thanh_toan ?? null;

      // If raw not present, try the OData formatted value for either attribute and normalize to key
      const formattedPreferred = item["crdfd_dieu_khoan_thanh_toan@OData.Community.Display.V1.FormattedValue"];
      if ((rawPaymentTerm === null || rawPaymentTerm === undefined || rawPaymentTerm === "") &&
          formattedPreferred) {
        const formatted = String(formattedPreferred || "");
        rawPaymentTerm = normalizePaymentTerm(formatted) || formatted;
      }

      // Ensure we return a normalized key where possible (e.g., '0','14','283640005', etc.)
      const normalizedPaymentTerm = normalizePaymentTerm(rawPaymentTerm) || rawPaymentTerm || "";

      return {
        crdfd_sale_orderid: id,
        crdfd_name: item.crdfd_name || "",
        crdfd_so_code: item.crdfd_so_code || "",
        crdfd_so_auto: item.crdfd_so_auto || "",
        cr1bb_vattext: item.cr1bb_vattext || "",
        cr1bb_loaihoaon: item.cr1bb_loaihoaon ?? null,
        crdfd_loai_don_hang: item.crdfd_loai_don_hang ?? null, // Order type (VAT/Non-VAT)
        // Provide both fields used by frontend: raw/normalized key in either property
        // Provide both properties that frontend may read; normalize to choice value where possible
        // Normalized payment term key (preferred field only)
        crdfd_dieu_khoan_thanh_toan: normalizedPaymentTerm,
        // Raw value and label for the preferred field
        crdfd_dieu_khoan_thanh_toan_raw: item.crdfd_dieu_khoan_thanh_toan ?? null,
        crdfd_dieu_khoan_thanh_toan_label:
          item["crdfd_dieu_khoan_thanh_toan@OData.Community.Display.V1.FormattedValue"] ||
          null,
        crdfd_tongtien: item.crdfd_tongtien || 0, // Raw total amount field
        createdon: item.createdon || item.createdon || item.CreatedOn || item.created_on, // Creation date for business logic
      };
    });

    // Cache the result
    setCachedResponse(cacheKey, saleOrders, true);

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

