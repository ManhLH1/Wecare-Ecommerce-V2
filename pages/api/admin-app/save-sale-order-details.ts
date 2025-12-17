import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SALE_ORDER_DETAILS_TABLE = "crdfd_saleorderdetails";
const SALE_ORDERS_TABLE = "crdfd_sale_orders";
const INVENTORY_TABLE = "cr44a_inventoryweshops";
const PRODUCT_TABLE = "crdfd_productses";

// Map VAT percentage to Điều chỉnh GTGT OptionSet value
const VAT_TO_IEUCHINHGTGT_MAP: Record<number, number> = {
  0: 191920000,  // 0%
  5: 191920001,  // 5%
  8: 191920002,  // 8%
  10: 191920003, // 10%
};

// Map VAT percentage to Thuế GTGT OptionSet value
const VAT_TO_GTGT_MAP: Record<number, number> = {
  0: 191920000,  // 0%
  5: 191920001,  // 5%
  8: 191920002,  // 8%
  10: 191920003, // 10%
};

// Helper function to lookup product ID from product code or product name
async function lookupProductId(
  productCode: string | undefined,
  productName: string | undefined,
  headers: any
): Promise<string | null> {
  if (!productCode && !productName) {
    return null;
  }

  try {
    let filter = "statecode eq 0";
    
    if (productCode) {
      const safeCode = productCode.trim().replace(/'/g, "''");
      filter += ` and crdfd_masanpham eq '${safeCode}'`;
    } else if (productName) {
      const safeName = productName.trim().replace(/'/g, "''");
      filter += ` and (crdfd_name eq '${safeName}' or crdfd_fullname eq '${safeName}')`;
    }

    const columns = "crdfd_productsid";
    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$top=1`;
    const endpoint = `${BASE_URL}${PRODUCT_TABLE}?${query}`;

    const response = await axios.get(endpoint, { headers });
    const products = response.data.value || [];
    
    if (products.length > 0) {
      return products[0].crdfd_productsid;
    }
  } catch (error) {
    console.error("Error looking up product ID:", error);
  }

  return null;
}

interface SaleOrderDetailInput {
  id?: string; // Existing record ID (for update)
  productId?: string; // Product record ID
  productCode?: string;
  productName: string;
  unitId?: string;
  unit: string;
  quantity: number;
  price: number;
  discountedPrice?: number;
  originalPrice?: number;
  vat: number;
  vatAmount: number;
  subtotal: number;
  totalAmount: number;
  stt: number;
  deliveryDate?: string;
  note?: string;
  urgentOrder?: boolean;
  approvePrice?: boolean;
  approveSupPrice?: boolean;
  approver?: string;
  discountPercent?: number;
  discountAmount?: number;
  promotionText?: string;
  invoiceSurcharge?: number; // Phụ phí hoá đơn (%)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      soId,
      warehouseName,
      isVatOrder,
      customerIndustry,
      products,
    } = req.body;

    if (!soId) {
      return res.status(400).json({ error: "soId is required" });
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "products array is required" });
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

    // ============ KIỂM TRA TỒN KHO CHO ĐƠN HÀNG KHÔNG VAT ============
    const isNonVatOrder = !isVatOrder;
    if (isNonVatOrder && warehouseName) {
      // Check inventory for each product (excluding allowed product groups)
      const allowedProductGroupCodes = [
        "NSP-00027",
        "NSP-000872",
        "NSP-000409",
        "NSP-000474",
        "NSP-000873",
      ];

      for (const product of products) {
        // Skip check for allowed product groups
        if (product.productGroupCode && allowedProductGroupCodes.includes(product.productGroupCode)) {
          continue;
        }

        // Skip if product already has ID (existing record, not new)
        if (product.id) {
          continue;
        }

        // Query inventory
        const safeCode = (product.productCode || "").trim().replace(/'/g, "''");
        const safeWarehouse = warehouseName.trim().replace(/'/g, "''");
        const filter = `crdfd_masanpham eq '${safeCode}' and statecode eq 0 and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
        const columns = "cr44a_soluongtonlythuyet";
        const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$top=1`;
        const endpoint = `${BASE_URL}${INVENTORY_TABLE}?${query}`;

        try {
          const invResponse = await axios.get(endpoint, { headers });
          const invResults = invResponse.data.value || [];
          const inventoryRecord = invResults[0];
          const availableStock = inventoryRecord?.cr44a_soluongtonlythuyet ?? 0;

          if (product.quantity > availableStock) {
            return res.status(400).json({
              error: "Không đủ tồn kho!",
              details: {
                productName: product.productName,
                requestedQuantity: product.quantity,
                availableStock: availableStock,
                unit: product.unit,
              },
            });
          }
        } catch (invError: any) {
          console.error("Error checking inventory:", invError);
          // Continue if inventory check fails (might be network issue)
        }
      }
    }

    // ============ PATCH SALE ORDER DETAILS ============
    const savedDetails: any[] = [];

    for (const product of products) {
      const vatOptionSet = VAT_TO_IEUCHINHGTGT_MAP[product.vat] ?? 191920000;
      const gttgOptionSet = VAT_TO_GTGT_MAP[product.vat] ?? 191920000;

      // Determine delivery date field based on customer industry
      const deliveryDateField =
        customerIndustry === 191920001 // "Shop" ngành nghề
          ? product.deliveryDate
          : product.deliveryDate;

      // Reference to Sale Order using Navigation property with @odata.bind
      // Field name is crdfd_SOcode (with capital S and O), not crdfd_socode
      const payload: any = {
        [`crdfd_SOcode@odata.bind`]: `/crdfd_sale_orders(${soId})`,
        statecode: 0, // Set statecode = 0 (Active) để record có thể query được
        crdfd_tensanphamtext: product.productName,
        crdfd_productnum: product.quantity,
        crdfd_gia: product.discountedPrice ?? product.price,
        crdfd_giagoc: product.originalPrice ?? product.price,
        crdfd_ieuchinhgtgt: vatOptionSet,
        crdfd_stton: product.stt, // Stt đơn (correct field name)
        crdfd_thue: product.vatAmount, // Thuế (GTGT amount)
        crdfd_tongtienchuavat: product.subtotal,
        crdfd_tongtiencovat: product.totalAmount,
        crdfd_chieckhau: product.discountPercent ?? 0,
        crdfd_chieckhauvn: product.discountAmount ?? 0,
        crdfd_chieckhau2: 0,
        crdfd_phuphi_hoadon: product.invoiceSurcharge ?? 0,
        cr1bb_donhanggap: product.urgentOrder ?? false,
        crdfd_promotiontext: product.promotionText || "",
      };

      // Add delivery date if available
      // CRM requires Edm.Date format (YYYY-MM-DD), not ISO string with time
      if (product.deliveryDate) {
        let dateStr = '';
        // Parse date string (format: dd/mm/yyyy) to YYYY-MM-DD
        const dateParts = product.deliveryDate.split('/');
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          // Format as YYYY-MM-DD
          dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          // Try to parse as ISO string or other format
          const dateObj = new Date(product.deliveryDate);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
          }
        }
        if (dateStr) {
          payload.crdfd_ngaygiaodukientonghop = dateStr;
        }
      }

      // Lookup product ID từ product code hoặc product name nếu chưa có productId
      let finalProductId = product.productId;
      if (!finalProductId && (product.productCode || product.productName)) {
        finalProductId = await lookupProductId(product.productCode, product.productName, headers);
        console.log(`[Save SOD] Looked up product ID: ${finalProductId} for code: ${product.productCode}, name: ${product.productName}`);
      }

      // Add product reference if available (using Navigation property)
      if (finalProductId) {
        payload[`crdfd_Sanpham@odata.bind`] = `/crdfd_productses(${finalProductId})`;
        console.log(`[Save SOD] Setting product lookup: crdfd_Sanpham = ${finalProductId}`);
      }

      // Add unit reference if available (using Navigation property)
      if (product.unitId) {
        payload[`crdfd_onvionhang@odata.bind`] = `/crdfd_unitses(${product.unitId})`;
      }

      // Add approver if available
      if (product.approver) {
        // TODO: Lookup approver record ID from "Duyệt giá" table
        // payload.crdfd_duyetgia = approverRecordId;
      }

      // Add approval status
      if (product.approvePrice) {
        // TODO: Map approver to OptionSet value
        // payload.crdfd_duyetgia = mappedApprovalOptionSet;
      }

      // Add SUP approval if available (using Navigation property)
      if (product.approveSupPrice && product.approveSupPriceId) {
        payload[`cr1bb_duyetgiasup@odata.bind`] = `/crdfd_duyetgias(${product.approveSupPriceId})`;
      }

      // Add Ca (shift) - default to null for now
      // payload.cr1bb_ca = null;

      let detailId: string;

      if (product.id) {
        // Update existing record
        const updateEndpoint = `${BASE_URL}${SALE_ORDER_DETAILS_TABLE}(${product.id})`;
        console.log(`[Save SOD] Updating record ${product.id}:`, JSON.stringify(payload, null, 2));
        await axios.patch(updateEndpoint, payload, { headers });
        detailId = product.id;
      } else {
        // Create new record
        const createEndpoint = `${BASE_URL}${SALE_ORDER_DETAILS_TABLE}`;
        console.log(`[Save SOD] Creating new record:`, JSON.stringify(payload, null, 2));
        const createResponse = await axios.post(createEndpoint, payload, {
          headers,
        });
        detailId = createResponse.data.crdfd_saleorderdetailid;
        console.log(`[Save SOD] Created record with ID: ${detailId}`);
      }

      savedDetails.push({ id: detailId, ...product });
    }

   

    const soUpdateEndpoint = `${BASE_URL}${SALE_ORDERS_TABLE}(${soId})`;

    // Handle special case: Shop + Dây điện/Cáp điện → Giao 1 lần
    if (
      customerIndustry === 191920001 && // "Shop"
      products.some(
        (p) =>
          p.productCategoryLevel4 === "Dây điện" ||
          p.productCategoryLevel4 === "Cáp điện"
      )
    ) {
      await axios.patch(
        soUpdateEndpoint,
        {
          crdfd_hinhthucgiaohang: 191920000, // "Giao 1 lần"
        },
        { headers }
      );
    }

    res.status(200).json({
      success: true,
      message: "Tạo đơn bán chi tiết thành công!",
      savedDetails,
      totalAmount: products.reduce((sum, p) => sum + p.totalAmount, 0),
    });
  } catch (error: any) {
    console.error("Error saving sale order details:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error saving sale order details",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }

    res.status(500).json({
      error: "Error saving sale order details",
      details: error.message,
    });
  }
}

