import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const QUOTE_DETAIL_TABLE = "crdfd_baogiachitiets";
const GROUP_KH_TABLE = "cr1bb_groupkhs"; // Group - KH
const CUSTOMER_TABLE = "crdfd_customers";

// Helper function to get customer ID from customerCode or customerId
async function getCustomerId(
  customerCode: string | undefined,
  customerId: string | undefined,
  headers: any
): Promise<string | null> {
  if (customerId) {
    // Validate GUID format
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidPattern.test(customerId)) {
      return customerId;
    }
  }

  if (!customerCode) {
    return null;
  }

  try {
    const safeCode = customerCode.replace(/'/g, "''");
    const customerFilter = `statecode eq 0 and cr44a_makhachhang eq '${safeCode}'`;
    const customerQuery = `$select=crdfd_customerid&$filter=${encodeURIComponent(customerFilter)}&$top=1`;
    const customerEndpoint = `${BASE_URL}${CUSTOMER_TABLE}?${customerQuery}`;
    const customerResponse = await axios.get(customerEndpoint, { headers });
    const customer = customerResponse.data.value?.[0];

    if (!customer || !customer.crdfd_customerid) {
      return null;
    }

    return customer.crdfd_customerid;
  } catch (error: any) {
    console.error("❌ [Get Customer ID] Error:", {
      error: error.message,
      response: error.response?.data,
    });
    return null;
  }
}
  
// Helper function to get customer groups (nhóm khách hàng) from cr1bb_groupkh
async function getCustomerGroups(
  customerId: string | null,
  headers: any
): Promise<string[]> {
  if (!customerId) {
    return [];
  }

  try {
    // Filter: _cr1bb_khachhang_value eq customerId
    // Select: cr1bb_tennhomkh
    const groupFilter = `_cr1bb_khachhang_value eq ${customerId}`;
    const groupQuery = `$select=cr1bb_tennhomkh&$filter=${encodeURIComponent(groupFilter)}`;
    const groupEndpoint = `${BASE_URL}${GROUP_KH_TABLE}?${groupQuery}`;
    
    const groupResponse = await axios.get(groupEndpoint, { headers });

    const groups = (groupResponse.data.value || [])
      .map((item: any) => item.cr1bb_tennhomkh)
      .filter((text: any): text is string => !!text && typeof text === "string");

    return groups;
  } catch (error: any) {
    console.error("❌ [Get Customer Groups] Error:", {
      error: error.message,
      response: error.response?.data,
    });
    return [];
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCode, customerCode, customerId, region } = req.query;
    if (!productCode || typeof productCode !== "string" || !productCode.trim()) {
      return res.status(400).json({ error: "productCode is required" });
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

    // Step 1: Get customer ID from customerCode or customerId
    const finalCustomerId = await getCustomerId(
      customerCode as string | undefined,
      customerId as string | undefined,
      headers
    );

    // Step 2: Get customer groups (nhóm khách hàng) from cr1bb_groupkh
    const customerGroups = await getCustomerGroups(finalCustomerId, headers);

    // Step 3: Build price filters - get all prices by product code (không filter theo unitId và isVatOrder)
    const safeCode = productCode.replace(/'/g, "''");
    const filters = [
      "statecode eq 0", // active
      "crdfd_pricingdeactive eq 191920001", // Pricing Active
      `crdfd_masanpham eq '${safeCode}'`,
      "(crdfd_gia ne null or cr1bb_giakhongvat ne null)",
    ];

    // Step 4: Filter by customer groups (nhóm khách hàng) - priority
    // Không filter theo isVatOrder nữa, sẽ trả về tất cả giá
    if (customerGroups.length > 0) {
      // Filter by customer groups using crdfd_nhomoituongtext
      const groupFilters = customerGroups
        .map((group) => {
          const safeGroup = String(group).replace(/'/g, "''");
          return `crdfd_nhomoituongtext eq '${safeGroup}'`;
        })
        .join(" or ");
      filters.push(`(${groupFilters})`);
    } else if (region && typeof region === "string" && region.trim()) {
      // Fallback: For orders without customer groups, try region filter (cả VAT và không VAT)
      // Ưu tiên "Shop" nếu có
      const safeRegion = region.replace(/'/g, "''");
      filters.push(`(crdfd_nhomoituongtext eq 'Shop' or crdfd_nhomoituongtext eq '${safeRegion} Không VAT')`);
    }

    const filter = filters.join(" and ");
    const columns =
      "crdfd_baogiachitietid,crdfd_masanpham,crdfd_gia,cr1bb_giakhongvat,crdfd_onvichuantext,crdfd_onvichuan,crdfd_nhomoituongtext,crdfd_giatheovc";
    // Order by crdfd_giatheovc asc to get cheapest price first (per unit)
    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filter
    )}&$orderby=crdfd_giatheovc asc&$top=1`;

    const endpoint = `${BASE_URL}${QUOTE_DETAIL_TABLE}?${query}`;
    const response = await axios.get(endpoint, { headers });

    const first = response.data.value?.[0];
    const result = first
      ? {
        price: first.crdfd_gia ?? null,
        priceNoVat: first.cr1bb_giakhongvat ?? null,
        unitName: first.crdfd_onvichuantext || first.crdfd_onvichuan || undefined,
        priceGroupText: first.crdfd_nhomoituongtext || undefined,
      }
      : { price: null, priceNoVat: null };

    res.status(200).json(result);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: "Error fetching product price",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }

    res.status(500).json({
      error: "Error fetching product price",
      details: error.message,
    });
  }
}

