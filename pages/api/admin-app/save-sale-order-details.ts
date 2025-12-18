import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SALE_ORDER_DETAILS_TABLE = "crdfd_saleorderdetails";
const SALE_ORDERS_TABLE = "crdfd_sale_orders";
const INVENTORY_TABLE = "cr44a_inventoryweshops";
const PRODUCT_TABLE = "crdfd_productses";
const KHO_BD_TABLE = "crdfd_kho_binh_dinhs";
const UNIT_CONVERSION_TABLE = "crdfd_unitconvertions";
const PROVINCE_TABLE = "crdfd_tinhthanhs"; // Tỉnh/Thành
const DISTRICT_TABLE = "cr1bb_quanhuyens"; // Quận/Huyện

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
    const endpoint = `${BASE_URL}${UNIT_CONVERSION_TABLE}?${query}`;

    console.log(`[Lookup UnitConversionId] Querying: ${endpoint}`);
    const response = await axios.get(endpoint, { headers });
    const results = response.data.value || [];
    
    if (results.length > 0) {
      const unitConversionId = results[0].crdfd_unitconvertionid;
      console.log(`[Lookup UnitConversionId] ✅ Found: ${unitConversionId} for productCode: ${safeCode}, unitName: ${safeUnitName}`);
      return unitConversionId;
    }
    
    console.log(`[Lookup UnitConversionId] ⚠️ No result found for productCode: ${safeCode}, unitName: ${safeUnitName}`);
  } catch (error: any) {
    console.error(`[Lookup UnitConversionId] ❌ Error:`, {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
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
      console.log(`[Calculate Delivery] Invalid base date: ${baseDeliveryDate}`);
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
        
        console.log(`[Calculate Delivery] Special logic applied - leadTimeHours: ${leadTimeHours}, shift: ${shift}, date: ${dateStr}`);
        return { deliveryDateNew: dateStr, shift };
      }
    }

    // Logic mặc định: Sử dụng baseDeliveryDate và tính ca dựa trên giờ
    const hour = baseDate.getHours();
    const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
    const dateStr = baseDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log(`[Calculate Delivery] Default logic - shift: ${shift}, date: ${dateStr}`);
    return { deliveryDateNew: dateStr, shift };
  } catch (error: any) {
    console.error(`[Calculate Delivery] ❌ Error calculating delivery date and shift:`, {
      error: error.message,
      productCode: product.productCode
    });
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
    console.log(`[Lookup TyleChuyenDoi] Skipping - no productCode`);
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
      const endpointByUnitId = `${BASE_URL}${UNIT_CONVERSION_TABLE}?${queryByUnitId}`;

      console.log(`[Lookup TyleChuyenDoi] Trying by unitId first: ${endpointByUnitId}`);
      try {
        const responseByUnitId = await axios.get(endpointByUnitId, { headers });
        const resultsByUnitId = responseByUnitId.data.value || [];
        
        if (resultsByUnitId.length > 0) {
          const giatrichuyenoi = resultsByUnitId[0].crdfd_giatrichuyenoi;
          console.log(`[Lookup TyleChuyenDoi] ✅ Found by unitId: ${giatrichuyenoi} for unitId: ${unitId}, productCode: ${productCode}`);
          return giatrichuyenoi ?? null;
        }
      } catch (err) {
        console.log(`[Lookup TyleChuyenDoi] Query by unitId failed, trying by productCode only...`);
      }
    }
    
    // Nếu có unitName, thử filter thêm theo unit name
    if (unitName) {
      const safeUnitName = unitName.trim().replace(/'/g, "''");
      filter += ` and crdfd_onvichuyenoitransfome eq '${safeUnitName}'`;
    }

    const columns = "crdfd_giatrichuyenoi,crdfd_onvichuyenoitransfome";
    const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$top=1`;
    const endpoint = `${BASE_URL}${UNIT_CONVERSION_TABLE}?${query}`;

    console.log(`[Lookup TyleChuyenDoi] Querying by productCode: ${endpoint}`);
    const response = await axios.get(endpoint, { headers });
    const results = response.data.value || [];
    
    if (results.length > 0) {
      const giatrichuyenoi = results[0].crdfd_giatrichuyenoi;
      console.log(`[Lookup TyleChuyenDoi] ✅ Found by productCode: ${giatrichuyenoi} for productCode: ${productCode}, unitName: ${unitName || 'N/A'}`);
      return giatrichuyenoi ?? null;
    }
    
    console.log(`[Lookup TyleChuyenDoi] ⚠️ No result found for productCode: ${productCode}, unitId: ${unitId || 'N/A'}, unitName: ${unitName || 'N/A'}`);
  } catch (error: any) {
    console.error(`[Lookup TyleChuyenDoi] ❌ Error looking up tyle chuyen doi:`, {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }

  return null;
}

// Helper function to update inventory after saving SOD
// This function uses optimistic locking: re-check inventory before update to prevent negative stock
async function updateInventoryAfterSale(
  productCode: string,
  quantity: number,
  warehouseName: string | undefined,
  headers: any
): Promise<void> {
  if (!productCode || !warehouseName) {
    console.log(`[Update Inventory] Skipping - missing productCode or warehouseName`, { productCode, warehouseName });
    return;
  }

  const safeCode = productCode.trim().replace(/'/g, "''");
  const safeWarehouse = warehouseName.trim().replace(/'/g, "''");

  console.log(`[Update Inventory] Starting update for product ${safeCode}, quantity: ${quantity}, warehouse: ${safeWarehouse}`);

  try {
    // 1. Update cr44a_inventoryweshops - cr44a_soluongtonlythuyet
    // Sử dụng cr44a_masanpham để query inventory
    // IMPORTANT: Re-check inventory right before update to prevent race condition
    let invFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
    if (safeWarehouse) {
      invFilter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
    }
    const invColumns = "cr44a_inventoryweshopid,cr44a_soluongtonlythuyet,cr1bb_vitrikhotext";
    const invQuery = `$select=${invColumns}&$filter=${encodeURIComponent(invFilter)}&$top=1`;
    const invEndpoint = `${BASE_URL}${INVENTORY_TABLE}?${invQuery}`;
    
    console.log(`[Update Inventory] Querying inventory with cr44a_masanpham:`, invEndpoint);
    const invResponse = await axios.get(invEndpoint, { headers });
    const invResults = invResponse.data.value || [];
    
    let invRecord = null;
    if (invResults.length > 0) {
      invRecord = invResults[0];
    } else if (safeWarehouse) {
      // Nếu không tìm thấy với warehouse filter, thử lại không có warehouse filter
      console.log(`[Update Inventory] No result with warehouse filter, trying without warehouse...`);
      const fallbackFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
      const fallbackQuery = `$select=${invColumns}&$filter=${encodeURIComponent(fallbackFilter)}&$top=1`;
      const fallbackEndpoint = `${BASE_URL}${INVENTORY_TABLE}?${fallbackQuery}`;
      const fallbackResponse = await axios.get(fallbackEndpoint, { headers });
      const fallbackResults = fallbackResponse.data.value || [];
      if (fallbackResults.length > 0) {
        console.log(`[Update Inventory] Found result without warehouse filter`);
        invRecord = fallbackResults[0];
      }
    }
    
    if (invRecord && invRecord.cr44a_inventoryweshopid) {
      // RE-CHECK: Get fresh inventory value right before update (optimistic locking)
      const currentStock = invRecord.cr44a_soluongtonlythuyet ?? 0;
      
      // Check if sufficient stock before updating
      if (currentStock < quantity) {
        const errorMessage = `Không đủ tồn kho! Sản phẩm ${productCode} có tồn kho: ${currentStock}, yêu cầu: ${quantity}`;
        console.error(`[Update Inventory] ❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const newStock = currentStock - quantity; // Đã check >= quantity ở trên nên không cần Math.max

      const updateInvEndpoint = `${BASE_URL}${INVENTORY_TABLE}(${invRecord.cr44a_inventoryweshopid})`;
      console.log(`[Update Inventory] Updating cr44a_inventoryweshops:`, {
        recordId: invRecord.cr44a_inventoryweshopid,
        currentStock,
        quantity,
        newStock,
        endpoint: updateInvEndpoint
      });

      await axios.patch(
        updateInvEndpoint,
        { cr44a_soluongtonlythuyet: newStock },
        { headers }
      );
      console.log(`[Update Inventory] ✅ Successfully updated cr44a_inventoryweshops: ${currentStock} -> ${newStock} for product ${safeCode}`);
    } else {
      console.log(`[Update Inventory] ⚠️ No inventory record found for product ${safeCode} in warehouse ${safeWarehouse}`);
    }

    // 2. Update crdfd_kho_binh_dinhs - crdfd_tonkholythuyet
    // RE-CHECK: Query fresh data right before update
    let khoBDFilter = `crdfd_masp eq '${safeCode}' and statecode eq 0`;
    if (safeWarehouse) {
      khoBDFilter += ` and crdfd_vitrikhofx eq '${safeWarehouse}'`;
    }
    const khoBDColumns = "crdfd_kho_binh_dinhid,crdfd_tonkholythuyet,crdfd_vitrikhofx";
    const khoBDQuery = `$select=${khoBDColumns}&$filter=${encodeURIComponent(khoBDFilter)}&$top=1`;
    const khoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}?${khoBDQuery}`;

    console.log(`[Update Inventory] Querying Kho Binh Dinh:`, khoBDEndpoint);
    const khoBDResponse = await axios.get(khoBDEndpoint, { headers });
    const khoBDResults = khoBDResponse.data.value || [];
    
    if (khoBDResults.length > 0) {
      const khoBDRecord = khoBDResults[0];
      // RE-CHECK: Get fresh inventory value right before update
      const currentStockBD = khoBDRecord.crdfd_tonkholythuyet ?? 0;
      
      // Check if sufficient stock before updating
      if (currentStockBD < quantity) {
        const errorMessage = `Không đủ tồn kho (Kho Bình Định)! Sản phẩm ${productCode} có tồn kho: ${currentStockBD}, yêu cầu: ${quantity}`;
        console.error(`[Update Inventory] ❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const newStockBD = currentStockBD - quantity; // Đã check >= quantity ở trên

      const updateKhoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}(${khoBDRecord.crdfd_kho_binh_dinhid})`;
      console.log(`[Update Inventory] Updating crdfd_kho_binh_dinhs:`, {
        recordId: khoBDRecord.crdfd_kho_binh_dinhid,
        currentStock: currentStockBD,
        quantity,
        newStock: newStockBD,
        endpoint: updateKhoBDEndpoint
      });

      await axios.patch(
        updateKhoBDEndpoint,
        { crdfd_tonkholythuyet: newStockBD },
        { headers }
      );
      console.log(`[Update Inventory] ✅ Successfully updated crdfd_kho_binh_dinhs: ${currentStockBD} -> ${newStockBD} for product ${safeCode}`);
    } else {
      console.log(`[Update Inventory] ⚠️ No Kho Binh Dinh record found for product ${safeCode} in warehouse ${safeWarehouse}`);
    }
  } catch (error: any) {
    console.error(`[Update Inventory] ❌ Error updating inventory for product ${safeCode}:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
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
    // Kiểm tra warehouseName có giá trị (không phải empty string, null, hoặc undefined)
    const hasWarehouseName = warehouseName && typeof warehouseName === 'string' && warehouseName.trim().length > 0;
    
    console.log(`[Save SOD] Inventory check - isNonVatOrder: ${isNonVatOrder}, warehouseName: "${warehouseName}", hasWarehouseName: ${hasWarehouseName}`);
    
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
          const endpoint = `${BASE_URL}${INVENTORY_TABLE}?${query}`;

          console.log(`[Check Inventory] Querying for product ${safeCode}, warehouse: ${safeWarehouse || 'none'}`);
          const response = await axios.get(endpoint, { headers });
          const results = response.data.value || [];
          const first = results[0];

          console.log(`[Check Inventory] Results count: ${results.length}`, {
            productCode: safeCode,
            warehouseName: safeWarehouse,
            found: !!first,
            theoreticalStock: first?.cr44a_soluongtonlythuyet,
            warehouseInRecord: first?.cr1bb_vitrikhotext,
          });

          // Nếu không tìm thấy với warehouse filter, thử lại không có warehouse filter
          if (!first && safeWarehouse) {
            console.log(`[Check Inventory] No result with warehouse filter, trying without warehouse...`);
            const fallbackFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
            const fallbackQuery = `$select=${columns}&$filter=${encodeURIComponent(fallbackFilter)}&$top=1`;
            const fallbackEndpoint = `${BASE_URL}${INVENTORY_TABLE}?${fallbackQuery}`;
            const fallbackResponse = await axios.get(fallbackEndpoint, { headers });
            const fallbackResults = fallbackResponse.data.value || [];
            const fallbackFirst = fallbackResults[0];

            if (fallbackFirst) {
              console.log(`[Check Inventory] Found result without warehouse filter:`, {
                theoreticalStock: fallbackFirst?.cr44a_soluongtonlythuyet,
                warehouseName: fallbackFirst?.cr1bb_vitrikhotext,
              });
              return fallbackFirst;
            }
          }

          return first || null;
        };

        try {
          const inventoryRecord = await queryInventory();
          const availableStock = inventoryRecord?.cr44a_soluongtonlythuyet ?? 0;

          console.log(`[Check Inventory] Final result for ${product.productName}:`, {
            productCode: safeCode,
            requestedQuantity: product.quantity,
            availableStock: availableStock,
            hasRecord: !!inventoryRecord,
          });

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
          console.error(`[Check Inventory] Error checking inventory for ${product.productName}:`, {
            error: invError.message,
            response: invError.response?.data,
            status: invError.response?.status,
          });
          // Continue if inventory check fails (might be network issue)
          // Nhưng log warning để biết có vấn đề
          console.warn(`[Check Inventory] ⚠️ Skipping inventory check for ${product.productName} due to error`);
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

      // Add unit reference if available
      // ID_Unit_Sp (crdfd_onvi) là lookup đến crdfd_unitconversions table
      // crdfd_onvionhang là lookup đến crdfd_unitses table
      // Từ buttonSave: ID_Unit_Sp: formData[@'Record Đơn vị'] - đây là Unit Conversion record
      // product.unitId là crdfd_unitconvertionid (từ units.ts)
      
      console.log(`[Save SOD] Unit info for product ${product.productCode}:`, {
        unitId: product.unitId,
        unit: product.unit,
        productCode: product.productCode
      });

      // Lookup unitId từ Unit Conversions nếu chưa có
      let finalUnitId = product.unitId;
      if (!finalUnitId && product.productCode && product.unit) {
        finalUnitId = await lookupUnitConversionId(product.productCode, product.unit, headers);
        console.log(`[Save SOD] Looked up unitId: ${finalUnitId} for productCode: ${product.productCode}, unit: ${product.unit}`);
      }

      if (finalUnitId) {
        // Set ID_Unit_Sp (crdfd_onvi) - lookup đến Unit Conversions
        payload[`crdfd_onvi@odata.bind`] = `/crdfd_unitconvertions(${finalUnitId})`;
        console.log(`[Save SOD] ✅ Setting crdfd_onvi (ID_Unit_Sp): ${finalUnitId} for product ${product.productCode}`);
      } else {
        console.log(`[Save SOD] ⚠️ No unitId found for product ${product.productCode}, unit: ${product.unit}`);
      }

      // Lookup và thêm crdfd_tylechuyenoi từ crdfd_unitconversions
      // crdfd_tylechuyenoi = crdfd_giatrichuyenoi từ Unit Conversion record
      const tyleChuyenDoi = await lookupTyleChuyenDoi(finalUnitId, product.productCode, product.unit, headers);
      if (tyleChuyenDoi !== null && tyleChuyenDoi !== undefined) {
        payload.crdfd_tylechuyenoi = tyleChuyenDoi;
        console.log(`[Save SOD] ✅ Setting crdfd_tylechuyenoi: ${tyleChuyenDoi} for product ${product.productCode}`);
      } else {
        console.log(`[Save SOD] ⚠️ No tyleChuyenDoi found for unitId: ${finalUnitId}, productCode: ${product.productCode}, unit: ${product.unit}`);
      }

      // Tính ngày giao mới (crdfd_exdeliverynew) và ca làm việc (cr1bb_ca) dựa trên lead time logic
      const { deliveryDateNew, shift } = await calculateDeliveryDateAndShift(
        product,
        products,
        customerIndustry,
        product.deliveryDate,
        headers
      );
      
      if (deliveryDateNew) {
        payload.crdfd_exdeliverynew = deliveryDateNew;
        console.log(`[Save SOD] ✅ Setting crdfd_exdeliverynew: ${deliveryDateNew} for product ${product.productCode}`);
      }
      
      if (shift !== null) {
        payload.cr1bb_ca = shift;
        console.log(`[Save SOD] ✅ Setting cr1bb_ca: ${shift === CA_SANG ? 'Ca sáng' : 'Ca chiều'} for product ${product.productCode}`);
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
          const updateEndpoint = `${BASE_URL}${SALE_ORDER_DETAILS_TABLE}(${product.id})`;
          console.log(`[Save SOD] Updating record ${product.id}:`, JSON.stringify(payload, null, 2));
          await axios.patch(updateEndpoint, payload, { headers });
          detailId = product.id;
          console.log(`[Save SOD] ✅ Successfully updated record ${product.id}`);
        } else {
          // Create new record
          const createEndpoint = `${BASE_URL}${SALE_ORDER_DETAILS_TABLE}`;
          console.log(`[Save SOD] Creating new record:`, JSON.stringify(payload, null, 2));
          const createResponse = await axios.post(createEndpoint, payload, {
            headers,
          });
          detailId = createResponse.data.crdfd_saleorderdetailid;
          console.log(`[Save SOD] ✅ Created record with ID: ${detailId}`);
        }

        savedDetails.push({ id: detailId, ...product });
      } catch (saveError: any) {
        console.error(`[Save SOD] ❌ Error saving product:`, {
          productCode: product.productCode,
          productName: product.productName,
          error: saveError.message,
          response: saveError.response?.data,
          status: saveError.response?.status,
          payload: JSON.stringify(payload, null, 2)
        });
        
        // Throw error để dừng và trả về lỗi cho client
        throw {
          message: `Error saving product ${product.productName || product.productCode || 'unknown'}`,
          details: saveError.response?.data?.error?.message || saveError.response?.data?.error || saveError.message,
          fullError: saveError.response?.data,
          product: {
            productCode: product.productCode,
            productName: product.productName,
            quantity: product.quantity
          }
        };
      }
    }

    // ============ CẬP NHẬT TỒN KHO SAU KHI LƯU SOD (CHỈ CHO ĐƠN KHÔNG VAT) ============
    if (isNonVatOrder && hasWarehouseName) {
      const trimmedWarehouseName = warehouseName.trim();
      console.log(`[Update Inventory] Starting inventory update for non-VAT order. Warehouse: ${trimmedWarehouseName}, Products count: ${products.length}`);
      
      // Chỉ cập nhật tồn kho cho các sản phẩm mới (không có id ban đầu)
      // và không thuộc các nhóm sản phẩm được phép
      const allowedProductGroupCodes = [
        "NSP-00027",
        "NSP-000872",
        "NSP-000409",
        "NSP-000474",
        "NSP-000873",
      ];

      let updateCount = 0;
      for (const product of products) {
        // Skip nếu là sản phẩm đã tồn tại (có id ban đầu)
        if (product.id) {
          console.log(`[Update Inventory] Skipping product ${product.productCode} - existing record (id: ${product.id})`);
          continue;
        }

        // Skip nếu thuộc nhóm sản phẩm được phép
        if (product.productGroupCode && allowedProductGroupCodes.includes(product.productGroupCode)) {
          console.log(`[Update Inventory] Skipping product ${product.productCode} - allowed product group: ${product.productGroupCode}`);
          continue;
        }

        // Cập nhật tồn kho với error handling
        if (product.productCode) {
          console.log(`[Update Inventory] Processing product: ${product.productCode}, quantity: ${product.quantity}`);
          try {
            await updateInventoryAfterSale(
              product.productCode,
              product.quantity,
              trimmedWarehouseName,
              headers
            );
            updateCount++;
          } catch (invError: any) {
            // Nếu không đủ tồn kho khi update, throw error để rollback
            console.error(`[Update Inventory] Failed to update inventory for ${product.productCode}:`, invError.message);
            // Re-throw để caller có thể xử lý
            throw new Error(`Không đủ tồn kho khi cập nhật: ${invError.message}`);
          }
        } else {
          console.log(`[Update Inventory] Skipping product - no productCode`);
        }
      }
      
      console.log(`[Update Inventory] Completed inventory update. Processed ${updateCount} products.`);
    } else {
      console.log(`[Update Inventory] Skipping inventory update - isNonVatOrder: ${isNonVatOrder}, warehouseName: ${warehouseName}, hasWarehouseName: ${hasWarehouseName}`);
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
    console.error("❌ Error saving sale order details:", error);

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

