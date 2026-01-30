import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";
import http from "http";
import https from "https";
import { createBackgroundJob, updateJobStatus, cleanupOldJobs } from "./_backgroundJobs";
import { createJobNotification } from "./_notifications";

// Background processing functions
async function processInventoryUpdatesInBackground(
  jobId: string,
  savedDetails: any[],
  warehouseName: string,
  isVatOrder: boolean,
  headers: any
) {
  updateJobStatus(jobId, 'running', {
    progress: { total: savedDetails.length, completed: 0, currentStep: 'Grouping products' }
  });

  try {
    console.log(`[Background Job ${jobId}] 🔄 Starting inventory updates for ${savedDetails.length} products...`);

    // Group products by productCode and warehouse for batch processing
    const inventoryGroups = new Map<string, Array<{product: any, quantity: number}>>();

    for (const savedProduct of savedDetails) {
      if (savedProduct.productCode && savedProduct.quantity > 0) {
        const key = `${savedProduct.productCode}::${warehouseName}`;
        if (!inventoryGroups.has(key)) {
          inventoryGroups.set(key, []);
        }
        inventoryGroups.get(key)!.push({
          product: savedProduct,
          quantity: savedProduct.quantity
        });
      }
    }

    updateJobStatus(jobId, 'running', {
      progress: {
        total: inventoryGroups.size,
        completed: 0,
        currentStep: `Processing ${inventoryGroups.size} product groups`
      }
    });

    const inventoryErrors: any[] = [];
    const INVENTORY_BATCH_SIZE = 3; // Process 3 different products at a time

    // Process inventory updates in parallel batches
    let processedCount = 0;
    const inventoryPromises: Promise<void>[] = [];

    for (const [groupKey, products] of inventoryGroups) {
      const inventoryPromise = (async () => {
        const [productCode] = groupKey.split('::');
        const firstProduct = products[0].product;

        try {
          const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);

          await updateInventoryAfterSale(
            productCode,
            totalQuantity,
            warehouseName,
            isVatOrder,
            headers,
            firstProduct.productGroupCode,
            false
          );

          console.log(`✅ [Background Job ${jobId}] Inventory updated: ${productCode} - ${totalQuantity}`);
        } catch (invError: any) {
          console.error(`❌ [Background Job ${jobId}] Inventory error for ${productCode}:`, invError);
          inventoryErrors.push({
            productCode: productCode,
            productName: firstProduct.productName,
            quantity: products.reduce((sum, p) => sum + p.quantity, 0),
            error: invError.message
          });
        }
      })();

      inventoryPromises.push(inventoryPromise);

      // If we've reached batch size, wait for current batch to complete before starting next
      if (inventoryPromises.length >= INVENTORY_BATCH_SIZE) {
        await Promise.allSettled(inventoryPromises);
        inventoryPromises.length = 0; // Clear array

        processedCount += INVENTORY_BATCH_SIZE;
        updateJobStatus(jobId, 'running', {
          progress: {
            total: inventoryGroups.size,
            completed: processedCount,
            currentStep: `Processed ${processedCount}/${inventoryGroups.size} product groups`
          }
        });
      }
    }

    // Wait for any remaining inventory updates
    if (inventoryPromises.length > 0) {
      await Promise.allSettled(inventoryPromises);
    }

    const result = {
      totalProducts: savedDetails.length,
      totalProductGroups: inventoryGroups.size,
      errors: inventoryErrors.length,
      errorDetails: inventoryErrors
    };

    const success = inventoryErrors.length === 0;
    updateJobStatus(jobId, success ? 'completed' : 'completed', { result });

    // Create notification for user
    createJobNotification(
      'Cập nhật tồn kho',
      jobId,
      success,
      success ? undefined : `${inventoryErrors.length} sản phẩm có lỗi cập nhật tồn kho`,
      undefined // userId - can be passed from request if needed
    );

    console.log(`✅ [Background Job ${jobId}] Inventory updates completed. Errors: ${inventoryErrors.length}`);

  } catch (error: any) {
    console.error(`❌ [Background Job ${jobId}] Critical error:`, error);
    updateJobStatus(jobId, 'failed', { error: error.message });
  }
}

async function processSaleOrderUpdatesInBackground(
  jobId: string,
  soId: string,
  headers: any
) {
  updateJobStatus(jobId, 'running', {
    progress: { total: 1, completed: 0, currentStep: 'Updating sale order delivery method' }
  });

  try {
    console.log(`[Background Job ${jobId}] 🔄 Updating sale order ${soId} delivery method...`);

    const soUpdateEndpoint = `${SALE_ORDERS_TABLE}(${soId}`;

    await apiClient.patch(
      soUpdateEndpoint,
      {
        crdfd_hinhthucgiaohang: 191920000, // "Giao 1 lần"
      },
      { headers }
    );

    updateJobStatus(jobId, 'completed', {
      result: { message: 'Sale order delivery method updated successfully' }
    });

    // Create notification for user
    createJobNotification(
      'Cập nhật đơn hàng',
      jobId,
      true,
      undefined,
      undefined // userId - can be passed from request if needed
    );

    console.log(`✅ [Background Job ${jobId}] Sale order update completed`);

  } catch (error: any) {
    console.error(`❌ [Background Job ${jobId}] Sale order update error:`, error);
    updateJobStatus(jobId, 'failed', { error: error.message });

    // Create notification for user
    createJobNotification(
      'Cập nhật đơn hàng',
      jobId,
      false,
      error.message,
      undefined // userId - can be passed from request if needed
    );
  }
}

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

const ORDERS_X_PROMOTION_TABLE = "crdfd_ordersxpromotions";

// Axios configuration for better performance and timeout handling
const DEFAULT_TIMEOUT = 60000; // 60 seconds per request (increased for complex operations)
const MAX_SOCKETS = 50;
const MAX_FREE_SOCKETS = 10;
const KEEP_ALIVE_MS = 50000; // 50 seconds

// Create axios instance with timeout and connection pooling
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  httpAgent: new http.Agent({
    keepAlive: true,
    keepAliveMsecs: KEEP_ALIVE_MS,
    maxSockets: MAX_SOCKETS,
    maxFreeSockets: MAX_FREE_SOCKETS,
    timeout: DEFAULT_TIMEOUT,
    scheduling: 'lifo'
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    keepAliveMsecs: KEEP_ALIVE_MS,
    maxSockets: MAX_SOCKETS,
    maxFreeSockets: MAX_FREE_SOCKETS,
    timeout: DEFAULT_TIMEOUT,
    scheduling: 'lifo'
  })
});
const SALE_ORDER_DETAILS_TABLE = "crdfd_saleorderdetails";
const SALE_ORDERS_TABLE = "crdfd_sale_orders";
const INVENTORY_TABLE = "cr44a_inventoryweshops";
const PRODUCT_TABLE = "crdfd_productses";
const KHO_BD_TABLE = "crdfd_kho_binh_dinhs";
const UNIT_CONVERSION_TABLE = "crdfd_unitconvertions";
const CUSTOMER_TABLE = "crdfd_customers";
const PROMOTION_TABLE = "crdfd_promotions";
const QUOTE_DETAIL_TABLE = "crdfd_baogiachitiets";
const PROVINCE_TABLE = "crdfd_tinhthanhs"; // Tỉnh/Thành
const DISTRICT_TABLE = "cr1bb_quanhuyens"; // Quận/Huyện

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OWNER_LOOKUP_CANDIDATES = [
  // Most likely custom lookup logical names
  "crdfd_ownerid",
  "crdfd_ownerid_customer",
  "cr44a_ownerid",
  "cr44a_ownerid_customer",
  "cr1bb_ownerid",
  "cr1bb_ownerid_customer",
] as const;

const CREATEDBY_LOOKUP_CANDIDATES = [
  "crdfd_createdby",
  "crdfd_createdby_customer",
  "cr44a_createdby",
  "cr44a_createdby_customer",
  "cr1bb_createdby",
  "cr1bb_createdby_customer",
] as const;

const SYSTEMUSER_TABLE = "systemusers";

function normalizeGuid(value: any): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  return GUID_PATTERN.test(str) ? str : null;
}

// Payment terms normalization copied from promotions.ts so we can validate promotions here.
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

const normalizePaymentTerm = (input?: string | null) : string | null => {
  if (!input && input !== "") return null;
  const t = String(input || "").trim();
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

// Helper function to get discountRate from product
function getDiscountRateFromPrices(product: any): number {
    try {
        // Use discountRate if already provided directly from frontend
        if (product.discountRate !== undefined && product.discountRate !== null) {
            return Number(product.discountRate) || 0;
        }

        return 0;
    } catch (error) {
        console.warn('[Get Discount Rate] Error extracting discountRate:', error);
        return 0;
    }
}

// Validate whether a promotion (by id) is applicable to the given order payment terms.
async function isPromotionApplicableToPaymentTerm(
  promotionId: string,
  requestedPaymentTerms: any,
  headers: any
): Promise<{ applicable: boolean; reason?: string }> {
  if (!promotionId) return { applicable: false, reason: "Missing promotionId" };
  try {
    // Helper: split multi-select values into normalized tokens
    const splitAndNormalize = (raw?: any) : string[] => {
      if (raw === null || raw === undefined) return [];
      const s = String(raw).trim();
      if (s === "") return [];
      const tokens = s.split(/[,;|\/]+/).map(t => t.trim()).filter(Boolean);
      const normalized = tokens.map(tok => normalizePaymentTerm(tok)).filter(Boolean) as string[];
      return normalized;
    };

    // If no order payment term provided, treat as applicable
    if (!requestedPaymentTerms && requestedPaymentTerms !== 0) {
      return { applicable: true };
    }

    const promoEndpoint = `${PROMOTION_TABLE}(${promotionId})?$select=cr1bb_ieukhoanthanhtoanapdung`;
    const resp = await apiClient.get(promoEndpoint, { headers });
    const promo = resp.data;
    const promoPayment = promo?.cr1bb_ieukhoanthanhtoanapdung;

    // If promotion has no payment-term restriction -> applicable
    if (!promoPayment || String(promoPayment).trim() === "") {
      return { applicable: true };
    }

    // Support multi-select promoPayment and requestedPaymentTerms: accept if any normalized token intersects
    const promoTokens = splitAndNormalize(promoPayment);
    const requestedTokens = splitAndNormalize(requestedPaymentTerms);

    // If either side has no normalized tokens, fall back to simple normalize equality
    if (promoTokens.length === 0 && requestedTokens.length === 0) {
      const promoNorm = normalizePaymentTerm(promoPayment);
      const reqNorm = normalizePaymentTerm(requestedPaymentTerms);
      if (promoNorm && reqNorm && String(promoNorm) === String(reqNorm)) return { applicable: true };
      return { applicable: false, reason: `Promotion requires payment terms "${promoPayment}", order has "${requestedPaymentTerms}"` };
    }

    const intersection = promoTokens.filter(t => requestedTokens.includes(t));
    if (intersection.length > 0) {
      return { applicable: true };
    }

    return {
      applicable: false,
      reason: `Promotion requires payment terms "${promoPayment}", order has "${requestedPaymentTerms}"`
    };
  } catch (err: any) {
    console.error('[Save SOD] Error validating promotion payment terms:', err?.message || err);
    // Fail-safe: treat as not applicable to avoid applying unknown promotion
    return { applicable: false, reason: 'Error validating promotion payment terms' };
  }
}

async function tryPatchCustomerLookup(
  saleOrderDetailId: string,
  lookupFieldName: string,
  customerId: string,
  headers: any
): Promise<boolean> {
  const endpoint = `${SALE_ORDER_DETAILS_TABLE}(${saleOrderDetailId})`;
  const payload: any = {
    [`${lookupFieldName}@odata.bind`]: `/${CUSTOMER_TABLE}(${customerId})`,
  };
  try {
    await apiClient.patch(endpoint, payload, { headers });
    return true;
  } catch (err: any) {
    // Ignore unknown field errors; do not fail the whole save flow.
    return false;
  }
}

// Helper function to lookup systemuser ID from username or email
async function lookupSystemUserId(
  headers: any,
  username?: string,
  email?: string
): Promise<string | null> {
  if (!username && !email) return null;

  try {
    let filter = '';
    if (username) {
      const safeUsername = username.trim().replace(/'/g, "''");
      filter = `domainname eq '${safeUsername}'`;
    } else if (email) {
      const safeEmail = email.trim().replace(/'/g, "''");
      filter = `internalemailaddress eq '${safeEmail}'`;
    }

    if (!filter) return null;

    const query = `$select=systemuserid,domainname,internalemailaddress&$filter=${encodeURIComponent(filter)}&$top=1`;
    const endpoint = `${SYSTEMUSER_TABLE}?${query}`;

    const response = await apiClient.get(endpoint, { headers });
    const results = response.data.value || [];

    if (results.length > 0) {
      return results[0].systemuserid;
    }
  } catch (error: any) {
    console.error('[Save SOD] Error looking up systemuser:', error.message);
  }

  return null;
}

// Helper function to set ownerid and createdbyid as systemuser
async function trySetOwnerAndCreatedBySystemUser(
  saleOrderDetailId: string,
  systemUserId: string | null,
  headers: any
): Promise<void> {
  if (!systemUserId) return;

  const endpoint = `${SALE_ORDER_DETAILS_TABLE}(${saleOrderDetailId})`;

  try {
    // Set ownerid (system field)
    await apiClient.patch(
      endpoint,
      { [`ownerid@odata.bind`]: `/${SYSTEMUSER_TABLE}(${systemUserId})` },
      { headers }
    );
    console.log('[Save SOD] ✅ Set ownerid to systemuser:', systemUserId);
  } catch (error: any) {
    console.warn('[Save SOD] ⚠️ Could not set ownerid:', error.message);
  }

  // Try to set createdby (may not be settable, but try custom fields)
  for (const f of CREATEDBY_LOOKUP_CANDIDATES) {
    try {
      await apiClient.patch(
        endpoint,
        { [`${f}@odata.bind`]: `/${SYSTEMUSER_TABLE}(${systemUserId})` },
        { headers }
      );
      console.log('[Save SOD] ✅ Set createdby to systemuser:', f, systemUserId);
      break;
    } catch (err: any) {
      // Continue to next candidate
    }
  }
}

async function trySetOwnerAndCreatedByCustomer(
  saleOrderDetailId: string,
  customerId: string | null,
  headers: any
): Promise<void> {
  if (!customerId) return;

  // Try owner lookup
  let ownerOk = false;
  for (const f of OWNER_LOOKUP_CANDIDATES) {
    ownerOk = await tryPatchCustomerLookup(saleOrderDetailId, f, customerId, headers);
    if (ownerOk) break;
  }

  // Try created-by lookup (custom; system createdby is not settable)
  let createdOk = false;
  for (const f of CREATEDBY_LOOKUP_CANDIDATES) {
    createdOk = await tryPatchCustomerLookup(saleOrderDetailId, f, customerId, headers);
    if (createdOk) break;
  }

  // Owner/createdby lookup may fail silently
}

// Helper function to set cr44a_Tensanpham lookup (additional product lookup field)
async function trySetTensanphamLookup(
  saleOrderDetailId: string,
  productId: string | null,
  headers: any
): Promise<void> {
  if (!productId) return;

  const endpoint = `${SALE_ORDER_DETAILS_TABLE}(${saleOrderDetailId})`;
  const payload: any = {
    [`cr44a_Tensanpham@odata.bind`]: `/crdfd_productses(${productId})`,
  };

  try {
    await apiClient.patch(endpoint, payload, { headers });
  } catch (err: any) {
    // Don't fail the whole save if this lookup field doesn't exist
  }
}

// Ca OptionSet values
const CA_SANG = 283640000; // "Ca sáng" (0:00 - 12:00)
const CA_CHIEU = 283640001; // "Ca chiều" (12:00 - 23:59)

// Helper function to calculate shift (ca) based on created on time and delivery date
function calculateShiftFromCreatedOnAndDeliveryDate(
  orderCreatedOn: string | undefined,
  deliveryDate: string | undefined
): number | null {
  if (!orderCreatedOn || !deliveryDate) {
    return null;
  }

  try {
    // Parse order creation time
    const createdDateTime = new Date(orderCreatedOn);
    if (isNaN(createdDateTime.getTime())) {
      console.warn('[Calculate Shift] Invalid orderCreatedOn format:', orderCreatedOn);
      return null;
    }

    // Parse delivery date (format: dd/mm/yyyy or YYYY-MM-DD)
    let deliveryDateObj: Date;
    if (deliveryDate.includes('/')) {
      // Format: dd/mm/yyyy
      const [day, month, year] = deliveryDate.split('/');
      deliveryDateObj = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    } else {
      // Format: YYYY-MM-DD
      deliveryDateObj = new Date(deliveryDate);
    }

    if (isNaN(deliveryDateObj.getTime())) {
      console.warn('[Calculate Shift] Invalid deliveryDate format:', deliveryDate);
      return null;
    }

    // Extract date part (YYYY-MM-DD) for comparison
    const createdDateStr = createdDateTime.toISOString().split('T')[0];
    const deliveryDateStr = deliveryDateObj.toISOString().split('T')[0];

    console.log('[Calculate Shift] Comparing dates:', {
      createdDateStr,
      deliveryDateStr,
      createdHour: createdDateTime.getHours()
    });

    // If delivery date is the same as created date, use the created time to determine shift
    if (createdDateStr === deliveryDateStr) {
      const createdHour = createdDateTime.getHours();
      const shift = (createdHour >= 0 && createdHour < 12) ? CA_SANG : CA_CHIEU;
      console.log('[Calculate Shift] Same day delivery - using created hour:', createdHour, '-> shift:', shift);
      return shift;
    }

    // If delivery date is different from created date, use default morning shift
    // This can be enhanced later with more complex logic if needed
    console.log('[Calculate Shift] Different day delivery - defaulting to morning shift');
    return CA_SANG;

  } catch (error: any) {
    console.warn('[Calculate Shift] Error calculating shift:', error.message);
    return null;
  }
}

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
    const endpoint = `${PRODUCT_TABLE}?${query}`;

    const response = await apiClient.get(endpoint, { headers });
    const products = response.data.value || [];

    if (products.length > 0) {
      return products[0].crdfd_productsid;
    }
  } catch (error) {
    // Silently fail product lookup
  }

  return null;
}

// Helper function to lookup unit conversion ID from productCode and unit name
async function lookupUnitConversionId(
  productCode: string,
  unitName: string,
  headers: any
): Promise<string | null> {
  if (!productCode || !unitName) {
    return null;
  }

  try {
    const safeCode = productCode.trim().replace(/'/g, "''");
    const safeUnitName = unitName.trim().replace(/'/g, "''");

    const filter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0 and crdfd_onvichuyenoitransfome eq '${safeUnitName}'`;
    const columns = "crdfd_unitconvertionid";
    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$top=1`;
    const endpoint = `${UNIT_CONVERSION_TABLE}?${query}`;

    const response = await apiClient.get(endpoint, { headers });
    const results = response.data.value || [];

    if (results.length > 0) {
      const unitConversionId = results[0].crdfd_unitconvertionid;
      return unitConversionId;
    }
  } catch (error: any) {
    // Silently fail unit conversion lookup
  }

  return null;
}

// Helper function to lookup quote detail ID from productCode and customerId
async function lookupQuoteDetailId(
  productCode: string | undefined,
  customerId: string | undefined,
  headers: any
): Promise<string | null> {
  if (!productCode) {
    return null;
  }

  try {
    const safeCode = productCode.trim().replace(/'/g, "''");

    // Build filter: match product code and active records
    let filter = `crdfd_masanpham eq '${safeCode}' and statecode eq 0`;

    // If customerId is provided, try to match by customer group
    if (customerId) {
      const safeCustomerId = customerId.trim().replace(/'/g, "''");
      // Lookup customer to get customer group
      try {
        const customerQuery = `$select=_crdfd_nhomoituong_value&$filter=crdfd_customersid eq ${safeCustomerId}`;
        const customerResponse = await apiClient.get(`${CUSTOMER_TABLE}?${customerQuery}`, { headers });
        const customers = customerResponse.data.value || [];

        if (customers.length > 0 && customers[0]._crdfd_nhomoituong_value) {
          const customerGroupId = customers[0]._crdfd_nhomoituong_value;
          filter += ` and _crdfd_nhomoituong_value eq ${customerGroupId}`;
        }
      } catch (customerError) {
        // Continue without customer group filter if lookup fails
        console.warn('[Lookup Quote Detail] Could not lookup customer group:', (customerError as Error).message);
      }
    }

    const columns = "crdfd_baogiachitietid,crdfd_masanpham,crdfd_gia,crdfd_ngaybaogia,crdfd_hieuluctoingay";
    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$orderby=crdfd_ngaybaogia desc&$top=1`;
    const endpoint = `${QUOTE_DETAIL_TABLE}?${query}`;

    const response = await apiClient.get(endpoint, { headers });
    const results = response.data.value || [];

    if (results.length > 0) {
      const quoteDetail = results[0];

      // Check if the quote is still valid (not expired)
      if (quoteDetail.crdfd_hieuluctoingay) {
        const expiryDate = new Date(quoteDetail.crdfd_hieuluctoingay);
        const now = new Date();
        if (expiryDate < now) {
          console.warn('[Lookup Quote Detail] Quote expired:', quoteDetail.crdfd_baogiachitietid);
          return null;
        }
      }

      return quoteDetail.crdfd_baogiachitietid;
    }
  } catch (error: any) {
    console.warn('[Lookup Quote Detail] Error looking up quote detail:', error.message);
  }

  return null;
}

// NEW LOGIC (2025): Calculate delivery date based on updated business rules
async function calculateDeliveryDateAndShift(
  product: SaleOrderDetailInput,
  allProducts: SaleOrderDetailInput[],
  customerIndustry: number | undefined,
  baseDeliveryDate: string | undefined,
  headers: any,
  warehouseCode?: string, // New parameter: KHOHCM | KHOBD
  orderCreatedOn?: string, // New parameter: Order creation timestamp
  districtLeadtime?: number // New parameter: Leadtime theo quận/huyện (ca)
): Promise<{ deliveryDateNew: string | null; shift: number | null }> {
  try {
    // Helper functions
    const addWorkingDays = (base: Date, days: number): Date => {
      const d = new Date(base);
      let added = 0;
      while (added < days) {
        d.setDate(d.getDate() + 1);
        const dayOfWeek = d.getDay();
        // Skip Saturday (6) and Sunday (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          added++;
        }
      }
      return d;
    };
    
    // Add working days but support fractional days (districtLeadtime in "ca", 1 ca = 12 hours)
    const addWorkingDaysWithFraction = (base: Date, days: number, warehouseCode?: string): Date => {
      const d = new Date(base);
      const totalHours = Math.round(days * 12);
      if (totalHours <= 0) return d;

      // HCM: skip weekend hours (Mon-Fri only)
      if (warehouseCode === 'KHOHCM') {
        const baseDay = d.getDay();
        if (baseDay === 6) {
          d.setDate(d.getDate() + 2);
        } else if (baseDay === 0) {
          d.setDate(d.getDate() + 1);
        }

        let remainingHours = totalHours;
        while (remainingHours > 0) {
          d.setHours(d.getHours() + 1);
          const dayOfWeek = d.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            remainingHours--;
          } else {
            if (dayOfWeek === 6) {
              d.setDate(d.getDate() + 2);
            } else if (dayOfWeek === 0) {
              d.setDate(d.getDate() + 1);
            }
          }
        }

        return d;
      }

      // Other warehouses (e.g., KHOBD): count hours continuously including weekends
      d.setHours(d.getHours() + totalHours);
      return d;
    };

    const getWeekendResetTime = (orderTime: Date): Date => {
      const d = new Date(orderTime);
      const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

      if ((dayOfWeek === 6 && d.getHours() >= 12) || dayOfWeek === 0) {
        // Saturday after 12:00 or Sunday → reset to Monday morning
        const daysToAdd = dayOfWeek === 6 ? 2 : 1; // Sat → Mon (+2), Sun → Mon (+1)
        d.setDate(d.getDate() + daysToAdd);
        d.setHours(8, 0, 0, 0); // Monday 8:00 AM
        return d;
      }
      return orderTime;
    };

    const applySundayAdjustment = (resultDate: Date, warehouseCode?: string): Date => {
      if (warehouseCode === 'KHOHCM') {
        const day = resultDate.getDay(); // 0 = Sun, 6 = Sat, 1 = Mon
        const hour = resultDate.getHours();
        // If result falls on Saturday afternoon (>=12:00) or any Sunday,
        // push the result to next Monday at 08:00.
        if (day === 0 || (day === 6 && hour >= 12)) {
          const daysToAdd = day === 0 ? 1 : 2;
          const monday = new Date(resultDate);
          monday.setDate(resultDate.getDate() + daysToAdd);
          monday.setHours(8, 0, 0, 0);
          return monday;
        }
        // If result is Monday but before business start (08:00), push to Monday 08:00
        if (day === 1 && hour < 8) {
          const mondayMorning = new Date(resultDate);
          mondayMorning.setHours(8, 0, 0, 0);
          return mondayMorning;
        }
      }
      return resultDate;
    };

    const isApolloKimTinPromotion = (product: SaleOrderDetailInput): boolean => {
      if (!product.promotionText) return false;
      const name = product.promotionText.toLowerCase();
      return name.includes('apollo') || name.includes('kim tín');
    };

    // Parse base date
    let orderTime = orderCreatedOn ? new Date(orderCreatedOn) : new Date();
    if (isNaN(orderTime.getTime())) {
      orderTime = new Date();
    }

    // NEW LOGIC (2025) - Priority 1: District leadtime
    // IMPORTANT: District leadtime KHÔNG áp dụng weekend reset
    if (districtLeadtime && districtLeadtime > 0) {
      // districtLeadtime is expressed in "ca" (shift units). Use fractional helper.
      let result = addWorkingDaysWithFraction(orderTime, districtLeadtime, warehouseCode);
      result = applySundayAdjustment(result, warehouseCode);

      const hour = result.getHours();
      const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
      const dateStr = result.toISOString().split('T')[0];

      return { deliveryDateNew: dateStr, shift };
    }

    // NEW LOGIC (2025) - Priority 2: Out of stock rules by warehouse
    // IMPORTANT: Weekend reset CHỈ áp dụng cho out-of-stock items
    const requestedQty = product.quantity || 0;
    const theoreticalStock = (product as any).theoreticalStock ?? 0;
    const isOutOfStock = requestedQty > theoreticalStock;

    if (isOutOfStock && warehouseCode) {
      // Apply weekend reset for out-of-stock items only
      let effectiveOrderTime = getWeekendResetTime(orderTime);

      let leadtimeCa = 0;

      if (warehouseCode === 'KHOHCM') {
        leadtimeCa = isApolloKimTinPromotion(product) ? 6 : 2;
      } else if (warehouseCode === 'KHOBD') {
        leadtimeCa = isApolloKimTinPromotion(product) ? 6 : 4;
      }

      if (leadtimeCa > 0) {
        // leadtimeCa is in "ca" -> use fractional helper
        let result = addWorkingDaysWithFraction(effectiveOrderTime, leadtimeCa, warehouseCode);
        result = applySundayAdjustment(result, warehouseCode);
        const hourRes = result.getHours();
        const shiftRes = (hourRes >= 0 && hourRes <= 12) ? CA_SANG : CA_CHIEU;
        return { deliveryDateNew: result.toISOString().split('T')[0], shift: shiftRes };
      }
    }

    // LEGACY LOGIC (below) - Keep for backward compatibility

    // LEGACY LOGIC (before 2025) - Keep for backward compatibility
    const baseDate = baseDeliveryDate
      ? new Date(baseDeliveryDate.split('/').reverse().join('-'))
      : new Date();

    if (isNaN(baseDate.getTime())) {
      return { deliveryDateNew: null, shift: null };
    }

    // Legacy Shop industry logic
    if (customerIndustry === 191920001) {
      // Calculate product categories
      const thietBiNuoc = allProducts.filter(p =>
        p.productCategoryLevel2 === "Thiết bị nước" || p.productCategoryLevel4 === "Ống cứng PVC"
      );
      const thietBiDien = allProducts.filter(p =>
        p.productCategoryLevel2 === "Thiết bị điện"
      );
      const vatTuKimKhi = allProducts.filter(p =>
        p.productCategoryLevel2 === "Vật tư kim khí"
      );

      const sumThietBiNuoc = thietBiNuoc.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const countThietBiNuoc = thietBiNuoc.reduce((sum, p) => sum + p.quantity, 0);
      const sumOngCung = allProducts
        .filter(p => p.productCategoryLevel4 === "Ống cứng PVC")
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const sumThietBiDien = thietBiDien.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const countKimKhi = vatTuKimKhi.reduce((sum, p) => sum + p.quantity, 0);

      let leadTimeHours = 0;
      let shouldApplySpecialLogic = false;

      // Thiết bị nước hoặc Ống cứng PVC
      if (thietBiNuoc.length > 0 &&
        ((countThietBiNuoc >= 50 && sumThietBiNuoc >= 100000000) || sumOngCung >= 100000000)) {
        shouldApplySpecialLogic = true;
        leadTimeHours = (sumThietBiNuoc >= 200000000 || sumOngCung >= 200000000) ? 24 : 12;
      }
      // Thiết bị điện
      else if (thietBiDien.length > 0 && sumThietBiDien >= 200000000) {
        shouldApplySpecialLogic = true;
        leadTimeHours = 12;
      }
      // Vật tư kim khí
      else if (vatTuKimKhi.length > 0 && countKimKhi >= 100) {
        shouldApplySpecialLogic = true;
        leadTimeHours = 12;
      }

      if (shouldApplySpecialLogic) {
        const newDate = new Date(baseDate);
        newDate.setHours(newDate.getHours() + leadTimeHours);

        const hour = newDate.getHours();
        const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
        const dateStr = newDate.toISOString().split('T')[0];

        return { deliveryDateNew: dateStr, shift };
      }
    }

    // Default logic: use base date and calculate shift based on hour
    let finalDate = new Date(baseDate);
    const hour = finalDate.getHours();
    let shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;

    // FINAL STEP: Apply Sunday adjustment for HCM warehouse (always, regardless of stock status)
    finalDate = applySundayAdjustment(finalDate, warehouseCode);

    // Recalculate shift if date changed due to Sunday adjustment
    if (finalDate.getDay() !== baseDate.getDay()) {
      const newHour = finalDate.getHours();
      shift = (newHour >= 0 && newHour <= 12) ? CA_SANG : CA_CHIEU;
    }

    const dateStr = finalDate.toISOString().split('T')[0];

    return { deliveryDateNew: dateStr, shift };
  } catch (error: any) {
    return { deliveryDateNew: null, shift: null };
  }
}

// Helper function to extract warehouse code from warehouse name
function extractWarehouseCode(warehouseName?: string): string | undefined {
  if (!warehouseName) return undefined;

  const name = warehouseName.toLowerCase().trim();

  // Map common warehouse names to codes
  if (name.includes('hồ chí minh') || name.includes('hcm') || name.includes('sài gòn')) {
    return 'KHOHCM';
  }
  if (name.includes('bình định') || name.includes('bd')) {
    return 'KHOBD';
  }

  // Try to extract from warehouse code pattern
  const codeMatch = warehouseName.match(/^([A-Z]{3,}[0-9]*)/i);
  if (codeMatch) {
    return codeMatch[1].toUpperCase();
  }

  return undefined;
}

// Helper function to lookup crdfd_giatrichuyenoi from crdfd_unitconversions table
async function lookupTyleChuyenDoi(
  unitId: string | undefined,
  productCode: string | undefined,
  unitName: string | undefined,
  headers: any
): Promise<number | null> {
  if (!productCode) {
    return null;
  }

  try {
    const safeCode = productCode.trim().replace(/'/g, "''");

    // Query unit conversion by productCode (cr44a_masanpham) - đây là cách chính xác nhất
    let filter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;

    // Nếu có unitId, thử query theo crdfd_unitconvertionid trước
    if (unitId) {
      const tryByUnitIdFilter = `crdfd_unitconvertionid eq '${unitId}' and statecode eq 0 and cr44a_masanpham eq '${safeCode}'`;
      const columns = "crdfd_giatrichuyenoi";
      const queryByUnitId = `$select=${columns}&$filter=${encodeURIComponent(tryByUnitIdFilter)}&$top=1`;
      const endpointByUnitId = `${UNIT_CONVERSION_TABLE}?${queryByUnitId}`;

      try {
        const responseByUnitId = await apiClient.get(endpointByUnitId, { headers });
        const resultsByUnitId = responseByUnitId.data.value || [];

        if (resultsByUnitId.length > 0) {
          const giatrichuyenoi = resultsByUnitId[0].crdfd_giatrichuyenoi;
          return giatrichuyenoi ?? null;
        }
      } catch (err) {
        // Try by productCode only
      }
    }

    // Nếu có unitName, thử filter thêm theo unit name
    if (unitName) {
      const safeUnitName = unitName.trim().replace(/'/g, "''");
      filter += ` and crdfd_onvichuyenoitransfome eq '${safeUnitName}'`;
    }

    const columns = "crdfd_giatrichuyenoi,crdfd_onvichuyenoitransfome";
    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$top=1`;
    const endpoint = `${UNIT_CONVERSION_TABLE}?${query}`;

    const response = await apiClient.get(endpoint, { headers });
    const results = response.data.value || [];

    if (results.length > 0) {
      const giatrichuyenoi = results[0].crdfd_giatrichuyenoi;
      return giatrichuyenoi ?? null;
    }
  } catch (error: any) {
    // Silently fail tyle chuyen doi lookup
  }

  return null;
}


// Helper function to update inventory after saving SOD (Bước 3: Chốt đơn - Hard Locking)
// This function uses atomic operation: re-check inventory right before update to prevent negative stock
// Sử dụng hệ thống giữ hàng: CurrentInventory và ReservedQuantity
async function updateInventoryAfterSale(
  productCode: string,
  quantity: number,
  warehouseName: string | undefined,
  isVatOrder: boolean,
  headers: any,
  productGroupCode?: string,
  skipStockCheck?: boolean
): Promise<void> {
  if (!productCode || !warehouseName) {
    return;
  }

  const safeCode = productCode.trim().replace(/'/g, "''");
  const safeWarehouse = warehouseName.trim().replace(/'/g, "''");

  try {
    // 1. Update cr44a_inventoryweshops (for non-VAT orders)
    if (!isVatOrder) {
      // IMPORTANT: Re-check inventory right before update to prevent race condition
      let invFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
      if (safeWarehouse) {
        invFilter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
      }
      // Query cả ReservedQuantity để release
      const invColumns = "cr44a_inventoryweshopid,cr44a_soluongtonlythuyet,cr1bb_soluonglythuyetgiuathang,cr1bb_vitrikhotext";
      const invQuery = `$select=${invColumns}&$filter=${encodeURIComponent(invFilter)}&$top=1`;
      const invEndpoint = `${INVENTORY_TABLE}?${invQuery}`;

      // RE-CHECK: Get fresh inventory value right before update (atomic operation)
      const invResponse = await apiClient.get(invEndpoint, { headers });
      const invResults = invResponse.data.value || [];

      let invRecord = null;
      if (invResults.length > 0) {
        invRecord = invResults[0];
      } else if (safeWarehouse) {
        // Nếu không tìm thấy với warehouse filter, thử lại không có warehouse filter
        const fallbackFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
        const fallbackQuery = `$select=${invColumns}&$filter=${encodeURIComponent(fallbackFilter)}&$top=1`;
        const fallbackEndpoint = `${INVENTORY_TABLE}?${fallbackQuery}`;
        const fallbackResponse = await apiClient.get(fallbackEndpoint, { headers });
        const fallbackResults = fallbackResponse.data.value || [];
        if (fallbackResults.length > 0) {
          invRecord = fallbackResults[0];
        }
      }

      if (invRecord && invRecord.cr44a_inventoryweshopid) {
        const currentInventory = invRecord.cr44a_soluongtonlythuyet ?? 0;
        const reservedQuantity = invRecord.cr1bb_soluonglythuyetgiuathang ?? 0;

        // Kiểm tra xem có cần bypass tồn kho không
        const ALLOWED_PRODUCT_GROUPS = ['NSP-00027', 'NSP-000872', 'NSP-000409', 'NSP-000474', 'NSP-000873'];
        const isSpecialProduct = productGroupCode && ALLOWED_PRODUCT_GROUPS.includes(productGroupCode);

        // Atomic check: CurrentInventory >= quantity (trừ khi skipStockCheck = true hoặc là sản phẩm đặc biệt)
        if (!skipStockCheck && !isSpecialProduct && currentInventory < quantity) {
          const errorMessage = `Không đủ tồn kho để chốt đơn! Sản phẩm ${productCode} có tồn kho: ${currentInventory}, yêu cầu: ${quantity}`;
          throw new Error(errorMessage);
        }

        if (skipStockCheck || isSpecialProduct) {
          console.log('[Save SOD] Skipping stock check for final (Inventory Weshops):', {
            productCode,
            skipStockCheck,
            isSpecialProduct,
            productGroupCode,
            currentInventory,
            quantity
          });
        }

        // ============ ATOMIC UPDATE: Trừ tồn kho lý thuyết VÀ tính lại số giữ tồn kho CÙNG LÚC ============
        // Đảm bảo cả 2 field được update trong cùng 1 PATCH request để tránh race condition
        // - CurrentInventory -= quantity (trừ tồn kho lý thuyết) - CHỈ cho sản phẩm thường
        // - ReservedQuantity -= quantity (tính lại số giữ tồn kho: giữ đặt = giữ đặt hàng - số lượng lên đơn)
        // Ví dụ: Giữ đặt 40, save đơn 20 → Giữ đặt còn lại 20 (40 - 20 = 20)
        // Với nhóm đặc biệt: KHÔNG trừ tồn kho lý thuyết, chỉ giải phóng ReservedQuantity
        const newReservedQuantity = Math.max(0, reservedQuantity - quantity);

        // Với nhóm đặc biệt: KHÔNG trừ tồn kho lý thuyết
        let newCurrentInventory: number | undefined;
        if (!isSpecialProduct) {
          // Sản phẩm thường: trừ tồn kho lý thuyết
          newCurrentInventory = currentInventory - quantity;
        } else {
          // Sản phẩm đặc biệt: giữ nguyên tồn kho lý thuyết
          newCurrentInventory = undefined; // Không update field này
          console.log(`[Save SOD] Nhóm đặc biệt ${productGroupCode} - Không trừ tồn kho lý thuyết, chỉ giải phóng ReservedQuantity`);
        }

        const updateInvEndpoint = `${INVENTORY_TABLE}(${invRecord.cr44a_inventoryweshopid})`;

        // ATOMIC OPERATION: Update field(s) trong cùng 1 request
        // Dynamics 365 đảm bảo tính nguyên tố (atomic) cho mỗi PATCH request
        const updatePayload: any = {
          cr1bb_soluonglythuyetgiuathang: newReservedQuantity // Tính lại số giữ tồn kho (luôn update)
        };

        // Chỉ update tồn kho lý thuyết nếu không phải sản phẩm đặc biệt
        if (newCurrentInventory !== undefined) {
          updatePayload.cr44a_soluongtonlythuyet = newCurrentInventory;
        }

        await apiClient.patch(
          updateInvEndpoint,
          updatePayload,
          { headers }
        );

        if (isSpecialProduct) {
          console.log(`✅ [Inventory Non-VAT] Nhóm đặc biệt - Chỉ giải phóng ReservedQuantity: ${productCode} - Giữ tồn: ${reservedQuantity} → ${newReservedQuantity} (Tồn kho lý thuyết giữ nguyên: ${currentInventory})`);
        } else {
          console.log(`✅ [Inventory Non-VAT] Atomic update: ${productCode} - Tồn kho: ${currentInventory} → ${newCurrentInventory}, Giữ tồn: ${reservedQuantity} → ${newReservedQuantity}`);
        }
      }
    }

    // 2. Update crdfd_kho_binh_dinhs (for VAT orders)
    // CurrentInventory = cr1bb_tonkholythuyetbomua (hoặc crdfd_tonkholythuyet)
    // ReservedQuantity = cr1bb_soluonganggiuathang (cột giữ hàng ở Kho Bình Định)
    if (isVatOrder) {
      // RE-CHECK: Query fresh data right before update (atomic operation)
      const conditions: Array<{
        field: string;
        operator: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'contains' | 'startswith' | 'endswith';
        value: any;
      }> = [
        { field: 'crdfd_masp', operator: 'eq', value: safeCode },
        { field: 'statecode', operator: 'eq', value: 0 }
      ];
      if (safeWarehouse) {
        conditions.push({ field: 'crdfd_vitrikhofx', operator: 'eq', value: safeWarehouse });
      }
      const khoBDFilter = conditions.map(({ field, operator, value }, index) => {
        let filterValue: string;
        if (typeof value === 'string') {
          filterValue = `'${value.replace(/'/g, "''")}'`;
        } else if (typeof value === 'boolean') {
          filterValue = value ? 'true' : 'false';
        } else {
          filterValue = String(value);
        }

        let conditionStr: string;
        switch (operator) {
          case 'contains':
            conditionStr = `contains(${field},${filterValue})`;
            break;
          case 'startswith':
            conditionStr = `startswith(${field},${filterValue})`;
            break;
          case 'endswith':
            conditionStr = `endswith(${field},${filterValue})`;
            break;
          default:
            conditionStr = `${field} ${operator} ${filterValue}`;
        }

        return conditionStr;
      }).join(' and ');
      // CHỈ query các cột cần thiết: ID, số lượng đang giữ hàng, vị trí kho
      // KHÔNG query tồn kho lý thuyết bỏ mua vì đơn VAT không cập nhật các cột này
      const khoBDColumns = "crdfd_kho_binh_dinhid,cr1bb_soluonganggiuathang,crdfd_vitrikhofx";
      const khoBDQuery = `$select=${khoBDColumns}&$filter=${encodeURIComponent(khoBDFilter)}&$top=1`;
      const khoBDEndpoint = `${KHO_BD_TABLE}?${khoBDQuery}`;

      // RE-CHECK: Get fresh inventory value right before update
      const khoBDResponse = await apiClient.get(khoBDEndpoint, { headers });
      const khoBDResults = khoBDResponse.data.value || [];

      if (khoBDResults.length > 0) {
        const khoBDRecord = khoBDResults[0];
        const reservedQuantity = khoBDRecord.cr1bb_soluonganggiuathang ?? 0;

        // ============ ĐƠN VAT: Chỉ cập nhật số lượng đang giữ hàng ============
        // Đơn VAT KHÔNG cập nhật tồn kho lý thuyết bỏ mua (cr1bb_tonkholythuyetbomua hoặc crdfd_tonkholythuyet)
        // Chỉ cập nhật ReservedQuantity -= quantity (giữ lại phần còn lại: giữ đặt = giữ đặt hàng - số lượng lên đơn)
        // Ví dụ: Giữ đặt 40, save đơn 20 → Giữ đặt còn lại 20 (40 - 20 = 20)
        const newReservedQuantity = Math.max(0, reservedQuantity - quantity);

        const updateKhoBDEndpoint = `${KHO_BD_TABLE}(${khoBDRecord.crdfd_kho_binh_dinhid})`;

        // CHỈ cập nhật ReservedQuantity, KHÔNG cập nhật tồn kho lý thuyết bỏ mua
        const updatePayload: any = {
          cr1bb_soluonganggiuathang: newReservedQuantity
        };

        await apiClient.patch(
          updateKhoBDEndpoint,
          updatePayload,
          { headers }
        );

        console.log(`✅ [Inventory VAT] Update: ${productCode} - Giữ tồn: ${reservedQuantity} → ${newReservedQuantity} (KHÔNG cập nhật tồn kho lý thuyết bỏ mua)`);
      }
    }
  } catch (error: any) {
    // Throw error để caller có thể xử lý (rollback SOD nếu cần)
    throw error;
  }
}

interface SaleOrderDetailInput {
  id?: string; // Existing record ID (for update)
  productId?: string; // Product record ID
  productCode?: string;
  productName: string;
  productCategoryLevel2?: string; // Cấp 2 NHSP (e.g., "Thiết bị nước", "Thiết bị điện", "Vật tư kim khí")
  productCategoryLevel4?: string; // Cấp 4 (e.g., "Ống cứng PVC", "Dây điện", "Cáp điện")
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
  discount2?: number;
  discountRate?: number; // Chiết khấu 2 (%)
  promotionText?: string;
  promotionId?: string;
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
      customerLoginId,
      customerId,
      userInfo,
      // Optional: payment terms of the sale order (string or option set value)
      paymentTerms,
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

    // Ensure we have order/payment terms to validate promotions.
    // If client didn't provide paymentTerms, fetch from the SO header to avoid false-positive applicabilities.
    let effectivePaymentTerms = paymentTerms;
    if ((effectivePaymentTerms === undefined || effectivePaymentTerms === null || effectivePaymentTerms === "") && soId) {
      try {
        const soResp = await apiClient.get(`${SALE_ORDERS_TABLE}(${soId})?$select=crdfd_dieu_khoan_thanh_toan`, { headers });
        const soData = soResp.data || {};
        effectivePaymentTerms = soData.crdfd_dieu_khoan_thanh_toan;
      } catch (err: any) {
        // If fetch fails, keep effectivePaymentTerms undefined so downstream logic treats as applicable by design.
        console.warn('[Save SOD] Could not fetch SO payment terms for promotion validation:', err?.message || err, err?.response?.data);
      }
    }

    // Customer id to stamp into lookup columns (owner/created by - lookup Customers)
    // Prefer login customerId, fallback to selected customerId if provided.
    const customerIdToStamp = normalizeGuid(customerLoginId) || normalizeGuid(customerId);

    // Lookup systemuser ID từ userInfo (ưu tiên dùng systemuser thay vì customer)
    // NOTE: Try email first (more reliable), then fallback to username if email lookup fails.
    let systemUserId: string | null = null;
    if (userInfo && (userInfo.username || userInfo.email)) {
      console.log('[Save SOD] 🔍 Looking up systemuser (email then username):', {
        email: userInfo.email,
        username: userInfo.username,
      });

      // Try email lookup first (matches SOBG behavior)
      if (userInfo.email) {
        systemUserId = await lookupSystemUserId(headers, undefined, userInfo.email);
      }

      // Fallback to username lookup if email lookup did not find a system user
      if (!systemUserId && userInfo.username) {
        systemUserId = await lookupSystemUserId(headers, userInfo.username, undefined);
      }

      if (systemUserId) {
        console.log('[Save SOD] ✅ Found systemuser:', {
          systemUserId,
          username: userInfo.username,
          email: userInfo.email
        });
      } else {
        console.warn('[Save SOD] ⚠️ Could not find systemuser:', {
          username: userInfo.username,
          email: userInfo.email
        });
      }
    }

    // ============ PROGRESS TRACKING ============
    const progress = {
      startTime: Date.now(),
      totalProducts: products.length,
      completedSteps: [] as string[],
      inventoryIssues: false,
      addStep: function(step: string) {
        this.completedSteps.push(`${new Date().toISOString()}: ${step}`);
        console.log(`[Save SOD Progress] ${step}`);
      }
    };

    progress.addStep(`Starting save operation for ${products.length} products`);

    // ============ KIỂM TRA TỒN KHO CHO ĐƠN HÀNG KHÔNG VAT ============
    const isNonVatOrder = !isVatOrder;
    // Kiểm tra warehouseName có giá trị (không phải empty string, null, hoặc undefined)
    const hasWarehouseName = warehouseName && typeof warehouseName === 'string' && warehouseName.trim().length > 0;

    progress.addStep('Completed inventory validation checks');

    if (isNonVatOrder && hasWarehouseName) {
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

        // Query inventory với fallback logic (giống inventory.ts)
        const safeCode = (product.productCode || "").trim().replace(/'/g, "''");
        const safeWarehouse = warehouseName?.trim().replace(/'/g, "''") || "";

        const queryInventory = async () => {
          // Thử query với warehouse filter trước
          let filter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
          if (safeWarehouse) {
            filter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
          }
          const columns = "cr44a_inventoryweshopid,cr44a_masanpham,cr44a_soluongtonlythuyet,cr1bb_vitrikhotext";
          const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$top=1`;
          const endpoint = `${INVENTORY_TABLE}?${query}`;

          const response = await apiClient.get(endpoint, { headers });
          const results = response.data.value || [];
          const first = results[0];

          // Nếu không tìm thấy với warehouse filter, thử lại không có warehouse filter
          if (!first && safeWarehouse) {
            const fallbackFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
            const fallbackQuery = `$select=${columns}&$filter=${encodeURIComponent(fallbackFilter)}&$top=1`;
            const fallbackEndpoint = `${INVENTORY_TABLE}?${fallbackQuery}`;
            const fallbackResponse = await apiClient.get(fallbackEndpoint, { headers });
            const fallbackResults = fallbackResponse.data.value || [];
            const fallbackFirst = fallbackResults[0];

            if (fallbackFirst) {
              return fallbackFirst;
            }
          }

          return first || null;
        };

        try {
          const inventoryRecord = await queryInventory();
          const availableStock = inventoryRecord?.cr44a_soluongtonlythuyet ?? 0;

          if (product.quantity > availableStock) {
            return res.status(400).json({
              error: "Không đủ tồn kho!",
              details: {
                productName: product.productName,
                productCode: product.productCode,
                requestedQuantity: product.quantity,
                availableStock: availableStock,
                unit: product.unit,
                warehouseName: safeWarehouse || 'N/A',
              },
            });
          }
        } catch (invError: any) {
          // Continue if inventory check fails (might be network issue)
        }
      }
    }

    // ============ FETCH ORDER CREATION TIME FOR SHIFT CALCULATION ============
    let orderCreatedOn: string | undefined;
    try {
      const soResp = await apiClient.get(`${SALE_ORDERS_TABLE}(${soId})?$select=createdon`, { headers });
      const soData = soResp.data || {};
      orderCreatedOn = soData.createdon;
      console.log('[Save SOD] Fetched order created on:', orderCreatedOn);
    } catch (err: any) {
      // Use current timestamp as fallback
      orderCreatedOn = new Date().toISOString();
      console.warn('[Save SOD] Could not fetch SO createdon, using current time:', err?.message || err);
    }

    // ============ PRE-FETCH LOOKUP DATA FOR ALL PRODUCTS ============
    console.log('[Save SOD] 🔍 Pre-fetching lookup data for all products...');

    // Extract unique product codes and unit combinations for batch lookups
    const productLookupRequests: Array<{productCode?: string, productName?: string, index: number}> = [];
    const unitLookupRequests: Array<{productCode: string, unit: string, index: number}> = [];
    const quoteLookupRequests: Array<{productCode?: string, index: number}> = [];

    products.forEach((product, index) => {
      // Collect product lookup requests
      if (!product.productId && (product.productCode || product.productName)) {
        productLookupRequests.push({
          productCode: product.productCode,
          productName: product.productName,
          index
        });
      }

      // Collect unit conversion lookup requests
      if (!product.unitId && product.productCode && product.unit) {
        unitLookupRequests.push({
          productCode: product.productCode,
          unit: product.unit,
          index
        });
      }

      // Collect quote detail lookup requests
      if (product.productCode && !product.quoteDetailId) {
        quoteLookupRequests.push({
          productCode: product.productCode,
          index
        });
      }
    });

    // Batch lookup all products in parallel
    const productLookupPromises = productLookupRequests.map(async (req) => {
      try {
        const productId = await lookupProductId(req.productCode, req.productName, headers);
        return { index: req.index, productId, success: true };
      } catch (error) {
        console.warn(`[Save SOD] Product lookup failed for index ${req.index}:`, error);
        return { index: req.index, productId: null, success: false };
      }
    });

    // Batch lookup all unit conversions in parallel
    const unitLookupPromises = unitLookupRequests.map(async (req) => {
      try {
        const unitId = await lookupUnitConversionId(req.productCode, req.unit, headers);
        return { index: req.index, unitId, success: true };
      } catch (error) {
        console.warn(`[Save SOD] Unit lookup failed for index ${req.index}:`, error);
        return { index: req.index, unitId: null, success: false };
      }
    });

    // Batch lookup all quote details in parallel
    const quoteLookupPromises = quoteLookupRequests.map(async (req) => {
      try {
        const quoteDetailId = await lookupQuoteDetailId(req.productCode, customerIdToStamp || undefined, headers);
        return { index: req.index, quoteDetailId, success: true };
      } catch (error) {
        console.warn(`[Save SOD] Quote detail lookup failed for index ${req.index}:`, error);
        return { index: req.index, quoteDetailId: null, success: false };
      }
    });

    // Execute all lookups in parallel
    const [productLookupResults, unitLookupResults, quoteLookupResults] = await Promise.all([
      Promise.allSettled(productLookupPromises),
      Promise.allSettled(unitLookupPromises),
      Promise.allSettled(quoteLookupPromises)
    ]);

    // Build lookup maps
    const productIdMap = new Map<number, string>();
    const unitIdMap = new Map<number, string>();
    const quoteDetailIdMap = new Map<number, string>();

    productLookupResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.productId) {
        productIdMap.set(result.value.index, result.value.productId);
      }
    });

    unitLookupResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.unitId) {
        unitIdMap.set(result.value.index, result.value.unitId);
      }
    });

    quoteLookupResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.quoteDetailId) {
        quoteDetailIdMap.set(result.value.index, result.value.quoteDetailId);
      }
    });

    console.log(`[Save SOD] ✅ Pre-fetched ${productIdMap.size} product IDs, ${unitIdMap.size} unit IDs, and ${quoteDetailIdMap.size} quote detail IDs`);
    progress.addStep(`Pre-fetched ${productIdMap.size} product IDs, ${unitIdMap.size} unit IDs, and ${quoteDetailIdMap.size} quote detail IDs`);

    // ============ VALIDATION - Check required fields before saving ============
    console.log('[Save SOD] 🔍 Validating required fields for all products...');

    for (let i = 0; i < products.length; i++) {
        const product = products[i];

        // Get final unit ID (from product.unitId or from lookup map)
        let finalUnitId = product.unitId;
        if (!finalUnitId) {
            finalUnitId = unitIdMap.get(i);
        }

        // VALIDATION: Ensure crdfd_onvi (unit conversion) is available for all products
        if (!finalUnitId) {
            return res.status(400).json({
                error: `Sản phẩm ${product.productCode || product.productName || 'Unknown'} không có thông tin đơn vị (crdfd_onvi). Vui lòng kiểm tra unit/unitId.`,
                details: {
                    productIndex: i,
                    productCode: product.productCode,
                    productName: product.productName,
                    unit: product.unit,
                    unitId: product.unitId,
                    lookupAttempted: !product.unitId, // true if we attempted lookup
                    validationFailed: true
                }
            });
        }
    }

    console.log('[Save SOD] ✅ All products passed validation - proceeding with save');
    progress.addStep('Validation completed - all products have required unit information');

    // ============ PATCH SALE ORDER DETAILS (PARALLEL PROCESSING) ============
    const savedDetails: any[] = [];
    const failedProducts: any[] = [];

    // Process products in parallel batches to avoid overwhelming the server
    // Pre-calculate order total (used to validate promotion min total conditions)
    const orderTotal = products.reduce((s, p) => {
      const subtotal = p.subtotal ?? ((p.discountedPrice ?? p.price) * (p.quantity || 0));
      const vatAmount = p.vatAmount ?? Math.round((subtotal * (p.vat || 0)) / 100);
      const total = p.totalAmount ?? (subtotal + vatAmount);
      return s + (Number(total) || 0);
    }, 0);

    // Promotion cache to avoid repeated promo fetches
    const promoCache: Record<string, any> = {};

    const BATCH_SIZE = 5; // Process 5 products at a time
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      console.log(`[Save SOD] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(products.length/BATCH_SIZE)} (${batch.length} products)`);

      // Process batch in parallel
      const batchPromises = batch.map(async (product, batchIndex) => {
        const globalIndex = i + batchIndex;
        const vatOptionSet = VAT_TO_IEUCHINHGTGT_MAP[product.vat] ?? 191920000;
        const gttgOptionSet = VAT_TO_GTGT_MAP[product.vat] ?? 191920000;

        // Determine delivery date field based on customer industry
        const deliveryDateField =
          customerIndustry === 191920001 // "Shop" ngành nghề
            ? product.deliveryDate
            : product.deliveryDate;

        // ============ CALCULATE SHIFT BASED ON CREATED ON AND DELIVERY DATE ============
        const shift = calculateShiftFromCreatedOnAndDeliveryDate(orderCreatedOn, product.deliveryDate);

        if (shift !== null) {
          console.log('[Save SOD] Calculated shift for product:', {
            productCode: product.productCode,
            productName: product.productName,
            shift: shift,
            orderCreatedOn: orderCreatedOn,
            deliveryDate: product.deliveryDate
          });
        }

        // Reference to Sale Order using Navigation property with @odata.bind
        // Field name is crdfd_SOcode (with capital S and O), not crdfd_socode
        // Ensure subtotal/vat/total use the same calculation as UI 'Tổng' cell:
        const computedSubtotal = product.subtotal ?? ((product.discountedPrice ?? product.price) * (product.quantity || 0));
        const computedVatAmount = product.vatAmount ?? Math.round((computedSubtotal * (product.vat || 0)) / 100);
        const computedTotal = product.totalAmount ?? (computedSubtotal + computedVatAmount);

        const payload: any = {
          [`crdfd_SOcode@odata.bind`]: `/crdfd_sale_orders(${soId})`,
          statecode: 0, // Set statecode = 0 (Active) để record có thể query được
          crdfd_tensanphamtext: product.productName,
          crdfd_productnum: product.quantity,
          // Save discounted price as `crdfd_gia` (đơn giá sau chiết khấu) and original price as `crdfd_giagoc` (đơn giá gốc)
          // so that reading code (sale-order-details) maps:
          // `price` -> crdfd_giagoc (đơn giá gốc)
          // `discountedPrice` -> crdfd_gia (đơn giá sau chiết khấu - hiển thị)
          crdfd_gia: product.discountedPrice ?? product.price,   // Đơn giá sau chiết khấu (hiển thị)
          crdfd_giagoc: product.originalPrice ?? product.price,  // Đơn giá gốc (trước chiết khấu)
          crdfd_ieuchinhgtgt: vatOptionSet,
          crdfd_stton: product.stt, // Stt đơn (correct field name)
          // Use computed values to guarantee 'Tổng' saved equals UI display (subtotal + VAT)
          crdfd_thue: computedVatAmount, // Thuế (GTGT amount)
          crdfd_tongtienchuavat: computedSubtotal,
          crdfd_tongtiencovat: computedTotal,
          crdfd_chieckhau: product.discountPercent ? product.discountPercent / 100 : undefined, // Chuyển từ phần trăm (4%) sang thập phân (0.04)
          crdfd_chieckhauvn: product.discountAmount ?? 0,
          // Secondary discount (Chiết khấu 2) stored as decimal (e.g., 0.05 for 5%)
          crdfd_chieckhau2 : product.discount2 ? product.discount2 / 100 : 0,
          crdfd_chietkhau_phanhang: getDiscountRateFromPrices(product),
          crdfd_phuphi_hoadon: product.invoiceSurcharge ?? 0,
          cr1bb_donhanggap: product.urgentOrder ?? false,
          crdfd_promotiontext: product.promotionText || "",
          // Set shift (ca) based on calculated delivery logic using created on and delivery date
          ...(shift !== null ? { cr1bb_ca: shift } : {}),
        };

        // Assume promotion will be applied unless a validation marks it skipped
        let promotionApplicableForThisProduct = !!product.promotionId; // Only applicable if promotionId exists

        // Set promotionId từ frontend (đã được validate và lookup từ phía client)
        if (product.promotionId) {
          const promotionIdClean = String(product.promotionId).replace(/^{|}$/g, '').trim();

          // Fetch promotion (cached) to validate min-total condition and payment terms
          try {
            let promoData: any = promoCache[promotionIdClean];
            if (!promoData) {
              const promoResp = await apiClient.get(`${PROMOTION_TABLE}(${promotionIdClean})?$select=cr1bb_tongtienapdung,cr1bb_ieukhoanthanhtoanapdung`, { headers });
              promoData = promoResp.data;
              promoCache[promotionIdClean] = promoData;
            }

            // Validate total amount condition (if promotion requires minimum)
            const minTotalReq = Number(promoData?.cr1bb_tongtienapdung) || 0;
            if (minTotalReq > 0 && Number(orderTotal) < minTotalReq) {
              // Skip applying promotion for this product (do not fail the whole save)
              promotionApplicableForThisProduct = false;
              console.log(`[Save SOD] Skipping promotion ${promotionIdClean} for product ${product.productCode} due to min total (${minTotalReq})`);
            }

            // Validate promotion applicability against order payment terms (if provided)
            if (promotionApplicableForThisProduct) {
              const promoCheck = await isPromotionApplicableToPaymentTerm(promotionIdClean, effectivePaymentTerms, headers);
              if (!promoCheck.applicable) {
                // Skip applying promotion for this product (do not fail the whole save)
                promotionApplicableForThisProduct = false;
                console.log(`[Save SOD] Skipping promotion ${promotionIdClean} for product ${product.productCode} due to payment term mismatch: ${promoCheck.reason}`);
              }
            }
          } catch (err: any) {
            return {
              success: false,
              product,
              error: `Lỗi khi kiểm tra chương trình khuyến mãi.`,
              fullError: err?.message || err
            };
          }

        // Set promotion lookup only if promotion was actually applied to this order and passed validations.
        // Defensive check: verify an Orders x Promotion record exists linking this SO and Promotion.
        try {
            if (promotionApplicableForThisProduct) {
            const existingFilter = `_crdfd_so_value eq ${soId} and _crdfd_promotion_value eq ${promotionIdClean} and crdfd_type eq 'Order' and statecode eq 0`;
            const existingQuery = `$filter=${encodeURIComponent(existingFilter)}&$select=crdfd_ordersxpromotionid`;
            const existingEndpoint = `${BASE_URL}${ORDERS_X_PROMOTION_TABLE}?${existingQuery}`;
            const existingResp = await apiClient.get(existingEndpoint, { headers });
            const existingItems = existingResp.data?.value || [];
            if (existingItems.length > 0) {
              payload[`crdfd_Promotion@odata.bind`] = `/crdfd_promotions(${promotionIdClean})`;
              payload.crdfd_promotiontext = product.promotionText || "";
              console.log(`[Save SOD] ✅ Set promotion lookup for product ${product.productCode}: crdfd_Promotion@odata.bind = /crdfd_promotions(${promotionIdClean})`);
            } else {
              // Try to create Orders x Promotion linking SO & Promotion if missing
              try {
                const createPayload: any = {
                  [`crdfd_SO@odata.bind`]: `/crdfd_sale_orders(${soId})`,
                  [`crdfd_Promotion@odata.bind`]: `/crdfd_promotions(${promotionIdClean})`,
                  crdfd_type: 'Order',
                  statecode: 0,
                  crdfd_name: `SO ${soId} - Promo ${promotionIdClean}`
                };
                // Prefer using product.discountPercent for crdfd_chieckhau2 when available
                if (product.discountPercent !== undefined && product.discountPercent !== null) {
                  // product.discountPercent is expected as percentage (e.g., 5 -> 5%)
                  createPayload.crdfd_chieckhau2 = Number(product.discountPercent) ? Number(product.discountPercent) / 100 : 0;
                  createPayload.crdfd_loaical = 'Phần trăm';
                } else {
                  // Otherwise fetch promotion details (value + vnd/percent) if available to persist correct fields.
                  try {
                    let promoDetails = promoCache[promotionIdClean];
                    if (!promoDetails) {
                      const promoRespDetail = await apiClient.get(`${PROMOTION_TABLE}(${promotionIdClean})?$select=crdfd_value,crdfd_vn,cr1bb_chietkhau2`, { headers });
                      promoDetails = promoRespDetail.data;
                      promoCache[promotionIdClean] = promoDetails;
                    }

                    // Normalize promotion value and type
                    const rawVal = Number(promoDetails?.crdfd_value ?? product.discount2 ?? 0) || 0;
                    const vndOrPercent = String(promoDetails?.crdfd_vn ?? '%').trim();

                    // crdfd_chieckhau2 on Orders x Promotion expects the numeric discount value:
                    // - If percent type, store decimal (e.g., 5% -> 0.05)
                    // - If VNĐ type, store absolute number
                    if (vndOrPercent.toUpperCase() === 'VNĐ' || vndOrPercent.toUpperCase() === 'VND') {
                      createPayload.crdfd_chieckhau2 = rawVal;
                      createPayload.crdfd_loaical = 'Tiền';
                    } else {
                      createPayload.crdfd_chieckhau2 = rawVal / 100;
                      createPayload.crdfd_loaical = 'Phần trăm';
                    }
                  } catch (err) {
                    // Fallback: if we can't fetch promo details, persist provided product.discount2 as percent decimal
                    if (product.discount2) {
                      createPayload.crdfd_chieckhau2 = product.discount2 ? product.discount2 / 100 : 0;
                      createPayload.crdfd_loaical = 'Phần trăm';
                    }
                  }
                }
                console.log('[Save SOD] Creating Orders x Promotion - payload:', JSON.stringify(createPayload));
                const createResp = await apiClient.post(`${BASE_URL}${ORDERS_X_PROMOTION_TABLE}`, createPayload, { headers });
                console.log('[Save SOD] Orders x Promotion create response status:', createResp.status, 'data:', createResp.data, 'headers:', createResp.headers);
                const createdId = createResp.data?.crdfd_ordersxpromotionid || createResp.headers?.['odata-entityid']?.match?.(/\(([^)]+)\)/)?.[1] || null;
                if (createdId) {
                  payload[`crdfd_Promotion@odata.bind`] = `/crdfd_promotions(${promotionIdClean})`;
                  payload.crdfd_promotiontext = product.promotionText || "";
                  console.log(`[Save SOD] ✅ Created Orders x Promotion (${createdId}) and set promotion lookup for product ${product.productCode}`);
                } else {
                  // Could not confirm creation, skip saving promotion lookup
                  console.warn(`[Save SOD] ⚠️ Orders x Promotion creation returned no id for SO=${soId}, promo=${promotionIdClean}`);
                  payload.crdfd_promotiontext = "";
                }
              } catch (createErr: any) {
                console.error(`[Save SOD] ❌ Failed to create Orders x Promotion for SO=${soId}, promo=${promotionIdClean}:`, createErr?.message || createErr);
                // Skip setting promotion to avoid write errors
                payload.crdfd_promotiontext = "";
              }
            }
          } else {
            // Skip applying promotion due to validation; ensure promotion fields are empty
            payload.crdfd_promotiontext = "";
            console.log(`[Save SOD] Promotion ${promotionIdClean} skipped for product ${product.productCode} (will not be saved on SOD)`);
          }
        } catch (err: any) {
          // On error, be conservative and skip setting promotion to avoid writing incorrect data
          console.error(`[Save SOD] Error checking Orders x Promotion existence:`, err?.message || err, err?.response?.data);
          payload.crdfd_promotiontext = "";
        }
        } else {
          // Ensure promotion fields are empty if no promotionId
          payload.crdfd_promotiontext = "";
        }

        // Add note (ghi chú) if available
        if (product.note) {
          payload.crdfd_notes = product.note;
        }

        // Add delivery date if available
        // CRM requires Edm.Date format (YYYY-MM-DD), not ISO string with time
        if (product.deliveryDate) {
          console.log('[Save SOD] Processing delivery date:', {
            productCode: product.productCode,
            deliveryDate: product.deliveryDate,
            deliveryDateType: typeof product.deliveryDate
          });

          let dateStr = '';
          // Parse date string (format: dd/mm/yyyy) to YYYY-MM-DD
          const dateParts = product.deliveryDate.split('/');
          console.log('[Save SOD] Date parts after split:', dateParts);

          if (dateParts.length === 3) {
            const [day, month, year] = dateParts;
            // Format as YYYY-MM-DD
            dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log('[Save SOD] Formatted date string:', dateStr);
          } else {
            // Try to parse as ISO string or other format
            const dateObj = new Date(product.deliveryDate);
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              dateStr = `${year}-${month}-${day}`;
              console.log('[Save SOD] Parsed from Date object:', dateStr);
            }
          }
          if (dateStr) {
            payload.crdfd_ngaygiaodukientonghop = dateStr;
            payload.crdfd_exdeliverrydate = dateStr;
            console.log('[Save SOD] Set payload.crdfd_ngaygiaodukientonghop:', dateStr);
            console.log('[Save SOD] Set payload.crdfd_exdeliverrydate:', dateStr);
          } else {
            console.log('[Save SOD] Failed to parse delivery date, dateStr is empty');
          }
        } else {
          console.log('[Save SOD] No delivery date provided for product:', product.productCode);
        }
        // Ensure CRM field is always set: try computed deliveryDateNew from server logic if available, then product.deliveryDate, else fallback next working day
        try {
          // If payload didn't set crm date above, compute fallback
          if (!payload.crdfd_ngaygiaodukientonghop) {
            // Try server-side compute (if available in scope)
            // Note: deliveryDateNew variable may not be present here; prefer product.deliveryDate if provided
            const crmFromProduct = (function() {
              try {
                if (!product.deliveryDate) return null;
                const parts = String(product.deliveryDate).split('/');
                if (parts.length === 3) {
                  const [day, month, year] = parts;
                  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                const d = new Date(product.deliveryDate);
                if (!isNaN(d.getTime())) {
                  const yy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  return `${yy}-${mm}-${dd}`;
                }
              } catch (e) {
                // ignore
              }
              return null;
            })();
            if (crmFromProduct) {
              payload.crdfd_ngaygiaodukientonghop = crmFromProduct;
              payload.crdfd_exdeliverrydate = crmFromProduct;
              console.log('[Save SOD] Fallback used product.deliveryDate for crm date:', crmFromProduct);
            } else {
              // fallback to next working day
              const nextWorkingDay = (base: Date) => {
                const d = new Date(base);
                d.setDate(d.getDate() + 1);
                while (d.getDay() === 0 || d.getDay() === 6) {
                  d.setDate(d.getDate() + 1);
                }
                return d;
              };
              const fb = nextWorkingDay(new Date());
              const y = fb.getFullYear();
              const m = String(fb.getMonth() + 1).padStart(2, '0');
              const dd = String(fb.getDate()).padStart(2, '0');
              const fallbackDateStr = `${y}-${m}-${dd}`;
              payload.crdfd_ngaygiaodukientonghop = fallbackDateStr;
              payload.crdfd_exdeliverrydate = fallbackDateStr;
              console.warn('[Save SOD] deliveryDate missing/invalid, using fallback next working day:', fallbackDateStr, 'product:', product.productCode);
            }
          }
        } catch (err) {
          console.error('[Save SOD] Error while applying fallback delivery date for product:', product.productCode, err);
        }

        // Get pre-fetched product ID (no additional API call needed)
        let finalProductId = product.productId;
        if (!finalProductId) {
          finalProductId = productIdMap.get(globalIndex);
        }

        // Get pre-fetched quote detail ID (no additional API call needed)
        let finalQuoteDetailId = (product as any).quoteDetailId;
        if (!finalQuoteDetailId) {
          finalQuoteDetailId = quoteDetailIdMap.get(globalIndex);
        }

        // Add product reference if available (using Navigation property)
        if (finalProductId) {
          payload[`crdfd_Sanpham@odata.bind`] = `/crdfd_productses(${finalProductId})`;
        }

        // Add quote detail reference if available (using Navigation property)
        if (finalQuoteDetailId) {
          // Save as lookup to Báo giá - chi tiết using SchemaName shown in CRM (case-sensitive)
          // Schema name on the field is `crdfd_Baogia_chitiet` so use it for @odata.bind
          payload[`crdfd_Baogia_chitiet@odata.bind`] = `/crdfd_baogiachitiets(${finalQuoteDetailId})`;
          // Attach to product object so the fast response includes the selected quote detail id
          try {
            (product as any).quoteDetailId = finalQuoteDetailId;
          } catch (e) {
            // ignore
          }
        }

        // Add unit reference if available
        // ID_Unit_Sp (crdfd_onvi) là lookup đến crdfd_unitconversions table
        // crdfd_onvionhang là lookup đến crdfd_unitses table
        // Từ buttonSave: ID_Unit_Sp: formData[@'Record Đơn vị'] - đây là Unit Conversion record
        // product.unitId là crdfd_unitconvertionid (từ units.ts)

        // Get pre-fetched unit ID (no additional API call needed)
        let finalUnitId = product.unitId;
        if (!finalUnitId) {
          finalUnitId = unitIdMap.get(globalIndex);
        }

        if (finalUnitId) {
          // Set ID_Unit_Sp (crdfd_onvi) - lookup đến Unit Conversions
          payload[`crdfd_onvi@odata.bind`] = `/crdfd_unitconvertions(${finalUnitId})`;
        }

        // Lookup và thêm crdfd_tylechuyenoi từ crdfd_unitconversions
        // crdfd_tylechuyenoi = crdfd_giatrichuyenoi từ Unit Conversion record
        const tyleChuyenDoi = await lookupTyleChuyenDoi(finalUnitId, product.productCode, product.unit, headers);
        if (tyleChuyenDoi !== null && tyleChuyenDoi !== undefined) {
          payload.crdfd_tylechuyenoi = tyleChuyenDoi;
        }


        // Add approver if available (crdfd_Nguoi_duyet_gia is lookup to Employee table)
        if (product.approver) {
          // product.approver now contains the Employee GUID
          payload['crdfd_Nguoi_duyet_gia@odata.bind'] = `/crdfd_employees(${product.approver})`;
        }

        // Add approval status
        if (product.approvePrice) {
          // Approval status already handled above
        }

        // Add SUP approval if available (using Navigation property)
        if (product.approveSupPrice && product.approveSupPriceId) {
          payload[`cr1bb_duyetgiasup@odata.bind`] = `/crdfd_duyetgias(${product.approveSupPriceId})`;
        }

        // Add Ca (shift) - default to null for now
        // payload.cr1bb_ca = null;

        let detailId: string;

        try {
          if (product.id) {
            // Update existing record
            const updateEndpoint = `${SALE_ORDER_DETAILS_TABLE}(${product.id})`;
            await apiClient.patch(updateEndpoint, payload, { headers });
            detailId = product.id;
          } else {
            // Create new record
            const createEndpoint = `${SALE_ORDER_DETAILS_TABLE}`;

            // Use impersonation to set the correct createdby user
            // MSCRMCallerID header tells Dynamics 365 to create the record as if this user did it
            const createHeaders: any = { ...headers };
            if (systemUserId) {
              createHeaders['MSCRMCallerID'] = systemUserId;
              console.log('[Save SOD] 🎭 Impersonating systemuser for creation:', systemUserId);
            } else {
              console.warn('[Save SOD] ⚠️ No systemUserId found for impersonation');
            }

            console.log('[Save SOD] 🚀 Sending POST to:', createEndpoint);
            console.log('[Save SOD] 🚀 Creation Headers:', JSON.stringify(createHeaders, null, 2));
            console.log('[Save SOD] 🚀 Payload:', JSON.stringify(payload, null, 2));

            const createResponse = await apiClient.post(createEndpoint, payload, {
              headers: createHeaders,
            });
            detailId = createResponse.data.crdfd_saleorderdetailid;
            console.log('[Save SOD] ✅ Created record ID:', detailId);
          }

          // Stamp owner/created-by: ưu tiên systemuser, fallback về customer
          if (systemUserId) {
            await trySetOwnerAndCreatedBySystemUser(detailId, systemUserId, headers);
          } else if (customerIdToStamp) {
            // Fallback: set customer nếu không tìm thấy systemuser
            await trySetOwnerAndCreatedByCustomer(detailId, customerIdToStamp, headers);
          }

          // Set cr44a_Tensanpham lookup (additional product lookup field)
          if (finalProductId) {
            await trySetTensanphamLookup(detailId, finalProductId, headers);
          }

          return { success: true, id: detailId, product };
        } catch (saveError: any) {
          console.error(`[Save SOD] ❌ Error saving product:`, {
            productCode: product.productCode,
            productName: product.productName,
            error: saveError.message,
            response: saveError.response?.data,
            status: saveError.response?.status,
            payload: JSON.stringify(payload, null, 2)
          });

          return {
            success: false,
            product,
            error: saveError.response?.data?.error?.message || saveError.response?.data?.error || saveError.message,
            fullError: saveError.response?.data
          };
        }
      });

      // Wait for all products in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const outcome = result.value;
          if (outcome.success) {
            savedDetails.push({ id: outcome.id, ...outcome.product });
          } else {
            failedProducts.push({
              productCode: outcome.product.productCode,
              productName: outcome.product.productName,
              quantity: outcome.product.quantity,
              error: outcome.error,
              fullError: outcome.fullError
            });
          }
        } else {
          // Promise rejected - this shouldn't happen with our error handling
          console.error('[Save SOD] Unexpected promise rejection:', result.reason);
          failedProducts.push({
            productCode: 'Unknown',
            productName: 'Unknown',
            quantity: 0,
            error: 'Unexpected error during parallel processing',
            fullError: result.reason
          });
        }
      });
    }

    progress.addStep(`Completed saving ${savedDetails.length} products (${failedProducts.length} failed)`);

    // ============ IMMEDIATE RESPONSE - FAST SUCCESS PATH ============
    // Nếu có sản phẩm thất bại trong việc save, trả về ngay lập tức
    if (failedProducts.length > 0) {
      const successCount = savedDetails.length;
      const failCount = failedProducts.length;
      const failedProductNames = failedProducts.map(p => p.productName || p.productCode).join(', ');

      return res.status(207).json({ // 207 Multi-Status
        success: false,
        partialSuccess: successCount > 0,
        message: `Đã lưu ${successCount}/${products.length} sản phẩm. ${failCount} sản phẩm thất bại: ${failedProductNames}`,
        savedDetails,
        failedProducts,
        totalRequested: products.length,
        totalSaved: successCount,
        totalFailed: failCount
      });
    }

    // ============ BACKGROUND PROCESSING SETUP ============
    // Tạo background jobs cho các operations còn lại (inventory + sale order updates)
    const backgroundJobIds: string[] = [];

    // Job cho inventory updates (nếu có)
    let inventoryJobId: string | null = null;
    if (hasWarehouseName && savedDetails.length > 0) {
      inventoryJobId = createBackgroundJob('inventory_update');
      backgroundJobIds.push(inventoryJobId);
    }

    // Job cho sale order updates (nếu có)
    let saleOrderJobId: string | null = null;
    const needsSaleOrderUpdate = customerIndustry === 191920001 && // "Shop"
      products.some(p => p.productCategoryLevel4 === "Dây điện" || p.productCategoryLevel4 === "Cáp điện");

    if (needsSaleOrderUpdate) {
      saleOrderJobId = createBackgroundJob('sale_order_update');
      backgroundJobIds.push(saleOrderJobId);
    }

    // ============ FAST RESPONSE - Return immediately ============
    const totalTime = Date.now() - progress.startTime;
    progress.addStep(`Fast response sent in ${totalTime}ms`);

    res.status(200).json({
      success: true,
      message: "Tạo đơn bán chi tiết thành công! Đang xử lý cập nhật tồn kho...",
      savedDetails,
      totalAmount: products.reduce((sum, p) => sum + p.totalAmount, 0),
      backgroundJobs: backgroundJobIds,
      performance: {
        totalTimeMs: totalTime,
        productsProcessed: savedDetails.length,
        productsFailed: failedProducts.length,
        totalRequested: products.length,
        progressSteps: progress.completedSteps,
        responseType: 'fast_response_with_background_processing'
      },
      info: backgroundJobIds.length > 0
        ? `Các tác vụ nền đang chạy: ${backgroundJobIds.join(', ')}. Kiểm tra trạng thái qua API /api/admin-app/job-status/[jobId]`
        : null
    });

    // ============ BACKGROUND PROCESSING - Run after response is sent ============

    // Background inventory processing
    if (inventoryJobId && hasWarehouseName && savedDetails.length > 0) {
      processInventoryUpdatesInBackground(
        inventoryJobId,
        savedDetails,
        warehouseName,
        !isNonVatOrder,
        headers
      );
    }

    // Background sale order processing
    if (saleOrderJobId && needsSaleOrderUpdate) {
      processSaleOrderUpdatesInBackground(
        saleOrderJobId,
        soId,
        headers
      );
    }

    // Clean up old jobs periodically
    cleanupOldJobs();

  } catch (error: any) {
    console.error("❌ Error saving sale order details:", error);

    // Check for timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('TIMEOUT')) {
      console.error("❌ Request timeout - operation took too long");
      return res.status(504).json({
        error: "Request timeout - operation took too long",
        details: "The request to save sale order details exceeded the timeout limit. Please try again with fewer products or contact support if the issue persists.",
        timeout: true,
      });
    }

    // Nếu là lỗi từ việc save product (đã được throw từ trong loop)
    if (error.message && error.details) {
      return res.status(400).json({
        error: error.message,
        details: error.details,
        fullError: error.fullError,
        product: error.product,
      });
    }

    // Nếu là lỗi từ axios/Dynamics API
    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error saving sale order details",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
        fullError: error.response.data,
      });
    }

    // Lỗi khác
    console.error("Unexpected error:", error);
    res.status(500).json({
      error: "Error saving sale order details",
      details: error.message || "Unknown error occurred",
    });
  }
}


