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
const CA_SANG = 283640000; // "Ca sáng"
const CA_CHIEU = 283640001; // "Ca chiều"

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

// Helper function to calculate delivery date and shift (Ca) based on lead time logic
// Logic từ buttonadd và code canvas.txt:
// 1. Nếu ngành nghề = "Shop": Tính từ lead time quận/huyện
// 2. Nếu không: Tính từ lead time sản phẩm hoặc mặc định 1 ngày
// 3. Có logic đặc biệt cho một số loại sản phẩm (Thiết bị nước, Thiết bị điện, Vật tư kim khí)
async function calculateDeliveryDateAndShift(
  product: SaleOrderDetailInput,
  allProducts: SaleOrderDetailInput[],
  customerIndustry: number | undefined,
  baseDeliveryDate: string | undefined,
  headers: any
): Promise<{ deliveryDateNew: string | null; shift: number | null }> {
  try {
    // Nếu không có baseDeliveryDate, sử dụng ngày hiện tại
    const baseDate = baseDeliveryDate
      ? new Date(baseDeliveryDate.split('/').reverse().join('-'))
      : new Date();

    if (isNaN(baseDate.getTime())) {
      return { deliveryDateNew: null, shift: null };
    }

    // Logic đặc biệt cho ngành nghề "Shop" (191920001)
    if (customerIndustry === 191920001) {
      // Tính tổng số lượng và giá trị theo từng loại sản phẩm
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

      // Logic cho Thiết bị nước hoặc Ống cứng PVC
      if (thietBiNuoc.length > 0 &&
        ((countThietBiNuoc >= 50 && sumThietBiNuoc >= 100000000) || sumOngCung >= 100000000)) {
        shouldApplySpecialLogic = true;
        if (sumThietBiNuoc >= 200000000 || sumOngCung >= 200000000) {
          leadTimeHours = 24;
        } else {
          leadTimeHours = 12;
        }
      }
      // Logic cho Thiết bị điện
      else if (thietBiDien.length > 0 && sumThietBiDien >= 200000000) {
        shouldApplySpecialLogic = true;
        leadTimeHours = 12;
      }
      // Logic cho Vật tư kim khí
      else if (vatTuKimKhi.length > 0 && countKimKhi >= 100) {
        shouldApplySpecialLogic = true;
        leadTimeHours = 12;
      }

      if (shouldApplySpecialLogic) {
        const newDate = new Date(baseDate);
        newDate.setHours(newDate.getHours() + leadTimeHours);

        const hour = newDate.getHours();
        const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;

        const dateStr = newDate.toISOString().split('T')[0]; // YYYY-MM-DD

        return { deliveryDateNew: dateStr, shift };
      }
    }

    // Logic mặc định: Sử dụng baseDeliveryDate và tính ca dựa trên giờ
    const hour = baseDate.getHours();
    const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
    const dateStr = baseDate.toISOString().split('T')[0]; // YYYY-MM-DD

    return { deliveryDateNew: dateStr, shift };
  } catch (error: any) {
    return { deliveryDateNew: null, shift: null };
  }
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
      let khoBDFilter = `crdfd_masp eq '${safeCode}' and statecode eq 0`;
      if (safeWarehouse) {
        khoBDFilter += ` and crdfd_vitrikhofx eq '${safeWarehouse}'`;
      }
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
      customerLoginId,
      customerId,
      userInfo,
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

    // ============ PRE-FETCH LOOKUP DATA FOR ALL PRODUCTS ============
    console.log('[Save SOD] 🔍 Pre-fetching lookup data for all products...');

    // Extract unique product codes and unit combinations for batch lookups
    const productLookupRequests: Array<{productCode?: string, productName?: string, index: number}> = [];
    const unitLookupRequests: Array<{productCode: string, unit: string, index: number}> = [];

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

    // Execute all lookups in parallel
    const [productLookupResults, unitLookupResults] = await Promise.all([
      Promise.allSettled(productLookupPromises),
      Promise.allSettled(unitLookupPromises)
    ]);

    // Build lookup maps
    const productIdMap = new Map<number, string>();
    const unitIdMap = new Map<number, string>();

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

    console.log(`[Save SOD] ✅ Pre-fetched ${productIdMap.size} product IDs and ${unitIdMap.size} unit IDs`);
    progress.addStep(`Pre-fetched ${productIdMap.size} product IDs and ${unitIdMap.size} unit IDs`);

    // ============ PATCH SALE ORDER DETAILS (PARALLEL PROCESSING) ============
    const savedDetails: any[] = [];
    const failedProducts: any[] = [];

    // Process products in parallel batches to avoid overwhelming the server
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
          crdfd_chieckhau: product.discountPercent ? product.discountPercent / 100 : 0, // Chuyển từ phần trăm (4%) sang thập phân (0.04)
          crdfd_chieckhauvn: product.discountAmount ?? 0,
          // Secondary discount (Chiết khấu 2) stored as decimal (e.g., 0.05 for 5%)
          crdfd_chieckhau2 : product.discount2 ? product.discount2 / 100 : 0,
          crdfd_phuphi_hoadon: product.invoiceSurcharge ?? 0,
          cr1bb_donhanggap: product.urgentOrder ?? false,
          crdfd_promotiontext: product.promotionText || "",
        };

        // Add note (ghi chú) if available
        if (product.note) {
          payload.crdfd_notes = product.note;
        }

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

        // Get pre-fetched product ID (no additional API call needed)
        let finalProductId = product.productId;
        if (!finalProductId) {
          finalProductId = productIdMap.get(globalIndex);
        }

        // Add product reference if available (using Navigation property)
        if (finalProductId) {
          payload[`crdfd_Sanpham@odata.bind`] = `/crdfd_productses(${finalProductId})`;
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

        // Tính ngày giao mới (crdfd_exdeliverrydate) và ca làm việc (cr1bb_ca) dựa trên lead time logic
        const { deliveryDateNew, shift } = await calculateDeliveryDateAndShift(
          product,
          products,
          customerIndustry,
          product.deliveryDate,
          headers
        );

            if (deliveryDateNew) {
          payload.crdfd_exdeliverrydate = deliveryDateNew;
        }

        if (shift !== null) {
          payload.cr1bb_ca = shift;
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


