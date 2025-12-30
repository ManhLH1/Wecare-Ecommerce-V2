import { NextApiRequest, NextApiResponse } from "next";
import axiosClient from "./_utils/axiosClient";
import { getCacheKey, getCachedResponse, setCachedResponse } from "./_utils/cache";
import { deduplicateRequest, getDedupKey } from "./_utils/requestDeduplication";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const DISTRICT_TABLE = "crdfd_quanhuyens";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== "string") {
      return res.status(400).json({ error: "customerId parameter is required" });
    }

    // Check cache first
    const cacheKey = getCacheKey("districts", { customerId });
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse !== undefined) {
      return res.status(200).json(cachedResponse);
    }

    const headers = {
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Step 1: Fetch customer data to get district ID (crdfd_quanhuyen)
    const CUSTOMER_TABLE = "crdfd_customers";
    // Fetch customer and expand the related district (crdfd_Quanhuyen) so we get leadtime fields in one request
    // This mirrors the SQL: SELECT ... FROM crdfd_customer kh LEFT JOIN crdfd_quanhuyen qh ON kh.crdfd_quanhuyen = qh.crdfd_quanhuyenid
    const customerColumns = "crdfd_customerid,_crdfd_quanhuyen_value,crdfd_keyquanhuyen,crdfd_quanhuyencal";
    const customerExpand = "$expand=crdfd_Quanhuyen($select=crdfd_quanhuyenid,crdfd_name,cr1bb_leadtimetheoca,cr1bb_leadtimekhuvuc)";

    // Handle GUID vs string customer IDs properly for OData
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
    let customerFilter = "statecode eq 0";
    if (isGuid) {
      customerFilter += ` and crdfd_customerid eq ${customerId}`;
    } else {
      customerFilter += ` and crdfd_customerid eq '${String(customerId).replace(/'/g, "''")}'`;
    }

    const customerQuery = `$select=${customerColumns}&${customerExpand}&$filter=${encodeURIComponent(customerFilter)}&$top=1`;
    const customerEndpoint = `${BASE_URL}${CUSTOMER_TABLE}?${customerQuery}`;

    console.log("🔍 [API Districts] Fetching customer data for leadtime calculation:", customerId);

    let customerResponse;
    try {
      customerResponse = await deduplicateRequest(getDedupKey(CUSTOMER_TABLE, { customerId }), () =>
        axiosClient.get(customerEndpoint, { headers })
      );
    } catch (error: any) {
      // If customer not found or invalid query, return default leadtime values
      if (error.response?.status === 404 || error.response?.status === 400) {
        console.log('⚠️ [API Districts] Customer not found, returning default leadtime values:', customerId);
        const result = {
          customerId,
          leadtimeKhuVuc: 0,
          leadtimeTheoCa: 0,
          districtId: null,
          districtName: null,
          customerDistrictId: null
        };
        setCachedResponse(cacheKey, result);
        return res.status(200).json(result);
      }

      console.error('❌ [API Districts] Error fetching customer data:', error.message);
      throw error;
    }

    // Debug: log the raw response from Dynamics for troubleshooting
    try {
      console.log('📥 [API Districts] Dynamics customer response (truncated):', JSON.stringify(customerResponse.data).slice(0, 2000));
    } catch (e) {
      console.log('📥 [API Districts] Could not stringify customer response');
    }

    const customer = customerResponse.data.value[0];
    if (!customer) {
      console.log('⚠️ [API Districts] Customer not found:', customerId);
      console.log('📊 [API Districts] Dynamics response:', customerResponse.data);
      const result = {
        customerId,
        leadtimeKhuVuc: 0,
        leadtimeTheoCa: 0,
        districtId: null,
        districtName: null,
        customerDistrictId: null
      };
      setCachedResponse(cacheKey, result);
      return res.status(200).json(result);
    }

    // The Dynamics response may include the expanded navigation property `crdfd_Quanhuyen`
    // and the raw lookup value is in `_crdfd_quanhuyen_value`.
    const customerDistrictId = customer._crdfd_quanhuyen_value || customer.crdfd_quanhuyen || customer.crdfd_Quanhuyen?.crdfd_quanhuyenid;

    console.log('📊 [API Districts] Customer data:', {
      customerId,
      customerDistrictId,
      crdfd_keyquanhuyen: customer.crdfd_keyquanhuyen,
      crdfd_quanhuyencal: customer.crdfd_quanhuyencal,
      expandedDistrictPresent: !!customer.crdfd_Quanhuyen
    });

    // Step 2: Fetch district data using the customer's district ID
    let district = null;
    let leadtimeKhuVuc = 0;
    let leadtimeTheoCa = 0;

    if (customer.crdfd_Quanhuyen) {
      // Use expanded district data when available (matches SQL LEFT JOIN)
      district = customer.crdfd_Quanhuyen;
      leadtimeKhuVuc = district ? Number(district.cr1bb_leadtimekhuvuc) || 0 : 0;
      leadtimeTheoCa = district ? Number(district.cr1bb_leadtimetheoca) || 0 : 0;

      console.log('📊 [API Districts] Using expanded district data from customer response:', {
        customerId,
        districtId: district?.crdfd_quanhuyenid,
        districtName: district?.crdfd_name,
        cr1bb_leadtimekhuvuc: district?.cr1bb_leadtimekhuvuc,
        cr1bb_leadtimetheoca: district?.cr1bb_leadtimetheoca,
        parsed_leadtimeKhuVuc: leadtimeKhuVuc,
        parsed_leadtimeTheoCa: leadtimeTheoCa
      });
    } else if (customerDistrictId) {
      // Fallback: fetch district record separately if we only have lookup id
      const districtColumns = "crdfd_quanhuyenid,crdfd_name,cr1bb_leadtimekhuvuc,cr1bb_leadtimetheoca";
      const districtFilter = `crdfd_quanhuyenid eq ${customerDistrictId.startsWith("{") ? `'${customerDistrictId.replace(/'/g, "''")}'` : customerDistrictId}`;
      const districtQuery = `$select=${districtColumns}&$filter=${encodeURIComponent(districtFilter)}&$top=1`;
      const districtEndpoint = `${BASE_URL}${DISTRICT_TABLE}?${districtQuery}`;

      console.log("🔍 [API Districts] Fetching district data (fallback):", districtEndpoint);

      const districtResponse = await deduplicateRequest(getDedupKey(DISTRICT_TABLE, { customerDistrictId }), () =>
        axiosClient.get(districtEndpoint, { headers })
      );

      district = districtResponse.data.value[0];
      leadtimeKhuVuc = district ? Number(district.cr1bb_leadtimekhuvuc) || 0 : 0;
      leadtimeTheoCa = district ? Number(district.cr1bb_leadtimetheoca) || 0 : 0;

      console.log('📊 [API Districts] District data (fetched):', {
        customerId,
        districtId: district?.crdfd_quanhuyenid,
        districtName: district?.crdfd_name,
        cr1bb_leadtimekhuvuc: district?.cr1bb_leadtimekhuvuc,
        cr1bb_leadtimetheoca: district?.cr1bb_leadtimetheoca,
        parsed_leadtimeKhuVuc: leadtimeKhuVuc,
        parsed_leadtimeTheoCa: leadtimeTheoCa
      });
    } else {
      console.log('⚠️ [API Districts] Customer has no district assigned:', customerId);
    }

    const result = {
      customerId,
      leadtimeKhuVuc: leadtimeKhuVuc,
      leadtimeTheoCa: leadtimeTheoCa,
      districtId: district?.crdfd_quanhuyenid || null,
      districtName: district?.crdfd_name || null,
      customerDistrictId: customerDistrictId || null
    };

    console.log('✅ [API Districts] Final result:', result);

    // Cache the result
    setCachedResponse(cacheKey, result);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching district leadtime:", error);
    return res.status(500).json({
      error: "Failed to fetch district leadtime",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
