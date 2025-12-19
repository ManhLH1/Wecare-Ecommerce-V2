import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const PROMOTION_TABLE = "crdfd_promotions";
const CUSTOMER_TABLE = "crdfd_customers";

const escapeODataValue = (value: string) => value.replace(/'/g, "''");

const resolveCustomerCodeFromPhone = async (phone: string, headers: Record<string, string>) => {
  const variants: string[] = [];
  const trimmed = phone.trim();
  const noSpace = trimmed.replace(/\s+/g, "");
  variants.push(trimmed, noSpace);
  // Try without leading 0
  if (noSpace.startsWith("0")) variants.push(noSpace.slice(1));
  // Try with +84 replacement
  if (noSpace.startsWith("0")) variants.push("+84" + noSpace.slice(1));
  if (noSpace.startsWith("84")) variants.push("+84" + noSpace.slice(2));
  // Try last 9-10 digits
  if (noSpace.length > 9) variants.push(noSpace.slice(-9));
  if (noSpace.length > 10) variants.push(noSpace.slice(-10));

  for (const v of variants) {
    const safe = escapeODataValue(v);
    const filter = `$filter=${encodeURIComponent(
      `(crdfd_phone2 eq '${safe}' or crdfd_phone eq '${safe}' or contains(crdfd_phone2,'${safe}') or contains(crdfd_phone,'${safe}'))`
    )}&$select=crdfd_makhachhang,cr44a_st&$top=1`;
    const endpoint = `${BASE_URL}${CUSTOMER_TABLE}?${filter}`;
    try {
      const response = await axios.get(endpoint, { headers });
      const item = response.data.value?.[0];
      if (item) {
        const code = item.crdfd_makhachhang || item.cr44a_st;
        if (code) {
          return code;
        }
      }
    } catch (e) {
      // continue to next variant
    }
  }

  return phone;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productCode, customerCode, customerCodes } = req.query;

    // productCode can be comma-separated; require at least one
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
      Prefer: "odata.maxpagesize=200",
    };

    const filters: string[] = [
      "statecode eq 0",
      "crdfd_promotion_deactive eq 'Active'",
    ];

    // Time window: start_date <= now AND (no end_date OR end_date >= now)
    const nowIso = new Date().toISOString();
    filters.push(`crdfd_start_date le ${nowIso}`);
    filters.push(`(crdfd_end_date ge ${nowIso} or crdfd_end_date eq null)`);

    // Support multiple product codes (comma separated)
    const productCodes = productCode
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (productCodes.length > 0) {
      const productFilter = productCodes
        .map((code) => `contains(crdfd_masanpham_multiple,'${escapeODataValue(code)}')`)
        .join(" or ");
      filters.push(`(${productFilter})`);
    }

    const customerCodesArray: string[] = [];
    if (customerCode && typeof customerCode === "string" && customerCode.trim()) {
      customerCodesArray.push(customerCode.trim());
    }
    if (customerCodes) {
      const codes = Array.isArray(customerCodes) ? customerCodes : [customerCodes];
      codes.forEach((code) => {
        if (typeof code === "string") {
          code
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
            .forEach((part) => customerCodesArray.push(part));
        }
      });
    }

    // Normalize customer codes: if a value looks like phone (digits only), try resolve to mã khách hàng
    const resolvedCustomerCodes: string[] = [];
    for (const code of customerCodesArray) {
      const isPhoneLike = /^[0-9]{6,}$/.test(code);
      if (isPhoneLike) {
        try {
          const resolved = await resolveCustomerCodeFromPhone(code, headers);
          resolvedCustomerCodes.push(resolved);
        } catch (e) {
          // Fallback to original if lookup fails
          resolvedCustomerCodes.push(code);
        }
      } else {
        resolvedCustomerCodes.push(code);
      }
    }

    if (resolvedCustomerCodes.length > 0) {
      const customerFilter = resolvedCustomerCodes
        .map((code) => {
          const safeCode = escapeODataValue(code);
          // Match exact token in comma-separated string without partial hits
          return (
            `cr3b9_ma_khachhang_apdung eq '${safeCode}'` +
            ` or contains(cr3b9_ma_khachhang_apdung,'${safeCode},')` +
            ` or contains(cr3b9_ma_khachhang_apdung,',${safeCode},')` +
            ` or contains(cr3b9_ma_khachhang_apdung,',${safeCode}')`
          );
        })
        .map((expr) => `(${expr})`)
        .join(" or ");
      filters.push(`(${customerFilter})`);
    }

    const columns = [
      "crdfd_promotionid",
      "crdfd_name",
      "crdfd_conditions",
      "crdfd_type",
      "crdfd_value",
      "crdfd_vn",
      "crdfd_start_date",
      "crdfd_end_date",
      "crdfd_multiple_tennhomsp",
      "crdfd_tensanpham_multiple",
      "crdfd_masanpham_multiple",
      "cr3b9_ma_khachhang_apdung",
      "cr1bb_tongtienapdung",
      "crdfd_promotiontypetext",
      "cr1bb_soluongapdung",
      "crdfd_soluongapdungmuc3",
      "cr1bb_congdonsoluong",
      "cr1bb_value2",
      "crdfd_value3",
      "cr3b9_valuemuakem",
      "crdfd_value_co_vat",
      "crdfd_value_khong_vat",
      "cr1bb_ieukhoanthanhtoanapdung",
      "cr1bb_ieukhoanthanhtoanapdungmuc3",
      "cr3b9_dieukhoanthanhtoanapdungmuc2",
      "cr1bb_manhomsp_multiple",
      "cr1bb_manhomspmuakem",
      "cr1bb_masanphammuakem",
      "crdfd_salehangton",
      "cr1bb_onvitinh",
    ].join(",");

    const query = `$select=${columns}&$filter=${encodeURIComponent(
      filters.join(" and ")
    )}&$orderby=crdfd_start_date desc`;

    const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;
    const response = await axios.get(endpoint, { headers });

    const promotions = (response.data.value || []).map((promo: any) => ({
      id: promo.crdfd_promotionid,
      name: promo.crdfd_name,
      conditions: promo.crdfd_conditions,
      type: promo.crdfd_type,
      value: promo.crdfd_value,
      value2: promo.cr1bb_value2,
      value3: promo.crdfd_value3,
      valueWithVat: promo.crdfd_value_co_vat,
      valueNoVat: promo.crdfd_value_khong_vat,
      valueBuyTogether: promo.cr3b9_valuemuakem,
      vn: promo.crdfd_vn,
      startDate: promo.crdfd_start_date,
      endDate: promo.crdfd_end_date,
      productNames: promo.crdfd_tensanpham_multiple,
      productCodes: promo.crdfd_masanpham_multiple,
      productGroupCodes: promo.cr1bb_manhomsp_multiple,
      buyTogetherGroupCodes: promo.cr1bb_manhomspmuakem,
      buyTogetherProductCodes: promo.cr1bb_masanphammuakem,
      customerCodes: promo.cr3b9_ma_khachhang_apdung,
      totalAmountCondition: promo.cr1bb_tongtienapdung,
      quantityCondition: promo.cr1bb_soluongapdung,
      quantityConditionLevel3: promo.crdfd_soluongapdungmuc3,
      cumulativeQuantity: promo.cr1bb_congdonsoluong,
      promotionTypeText: promo.crdfd_promotiontypetext,
      paymentTerms: promo.cr1bb_ieukhoanthanhtoanapdung,
      paymentTermsLevel3: promo.cr1bb_ieukhoanthanhtoanapdungmuc3,
      paymentTermsLevel2: promo.cr3b9_dieukhoanthanhtoanapdungmuc2,
      saleInventoryOnly: promo.crdfd_salehangton,
      unitName: promo.cr1bb_onvitinh,
    }));

    res.status(200).json(promotions);
  } catch (error: any) {
    console.error("Error fetching promotions:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error(
        "Error response data:",
        JSON.stringify(error.response.data, null, 2)
      );
      return res.status(error.response.status || 500).json({
        error: "Error fetching promotions",
        details:
          error.response.data?.error?.message ||
          error.response.data?.error ||
          error.message,
        fullError: error.response.data,
      });
    }

    res.status(500).json({
      error: "Error fetching promotions",
      details: error.message,
    });
  }
}

