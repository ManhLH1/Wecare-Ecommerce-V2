import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getAccessToken } from '../getAccessToken';

const BASE_URL = 'https://wecare-ii.crm5.dynamics.com/api/data/v9.2/';
const INVENTORY_TABLE = 'cr44a_inventoryweshops';
const KHO_BD_TABLE = 'crdfd_kho_binh_dinhs';

interface UpdateInventoryRequest {
  productCode: string;
  quantity: number;
  warehouseName?: string;
  operation: 'subtract' | 'add' | 'reserve' | 'release' | 'final'; 
  // 'subtract' = trừ tồn kho trực tiếp (legacy, tạm thời vô hiệu hóa)
  // 'add' = cộng tồn kho trực tiếp (legacy, tạm thời vô hiệu hóa)
  // 'reserve' = giữ hàng (tăng ReservedQuantity) - dùng khi add sản phẩm vào đơn nháp
  // 'release' = giải phóng hàng (giảm ReservedQuantity) - dùng khi remove sản phẩm khỏi đơn nháp
  // 'final' = chốt đơn (atomic check và trừ CurrentInventory, giải phóng ReservedQuantity) - dùng khi hoàn tất đơn hàng
  isVatOrder?: boolean; // true = VAT order (Kho Bình Định), false = non-VAT (Inventory)
  skipStockCheck?: boolean; // true = bỏ qua kiểm tra tồn kho (cho đơn VAT và sản phẩm đặc biệt)
  productGroupCode?: string; // Mã nhóm sản phẩm để kiểm tra điều kiện đặc biệt
}

interface UpdateInventoryResponse {
  success: boolean;
  message: string;
  inventoryUpdated?: boolean;
  khoBDUpdated?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateInventoryResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  console.log('[Update Inventory] Request:', {
    productCode: req.body.productCode,
    quantity: req.body.quantity,
    operation: req.body.operation,
    isVatOrder: req.body.isVatOrder,
    warehouseName: req.body.warehouseName
  });

  try {
    const { productCode, quantity, warehouseName, operation, isVatOrder = false, skipStockCheck = false, productGroupCode }: UpdateInventoryRequest = req.body;

    if (!productCode || !quantity || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'productCode và quantity (số dương) là bắt buộc' 
      });
    }

    // Get access token (same as other API routes)
    const token = await getAccessToken();
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized - Failed to obtain access token' });
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    };

    const safeCode = productCode.trim().replace(/'/g, "''");
    const safeWarehouse = warehouseName?.trim().replace(/'/g, "''");

    let inventoryUpdated = false;
    let khoBDUpdated = false;

    // ============ TẠM THỜI VÔ HIỆU HÓA CHỨC NĂNG TỰ ĐỘNG TRỪ/CỘNG TỒN KHO ============
    // Legacy operations 'subtract' và 'add' tạm thời vô hiệu hóa
    if (operation === 'subtract' || operation === 'add') {
      return res.status(200).json({
        success: true,
        message: `Chức năng tự động ${operation === 'subtract' ? 'trừ' : 'cộng'} tồn kho đã tạm thời vô hiệu hóa. Sử dụng 'reserve'/'release' cho đơn nháp hoặc 'final' cho chốt đơn.`,
        inventoryUpdated: false,
        khoBDUpdated: false,
      });
    }

    // ============ 1. Update cr44a_inventoryweshops (for non-VAT orders) ============
    if (!isVatOrder) {
      try {
        let invFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
        if (safeWarehouse) {
          invFilter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
        }
        // CurrentInventory = cr44a_soluongtonlythuyet
        // ReservedQuantity = cr1bb_soluonglythuyetgiuathang (cột giữ hàng ở inventory)
        const invColumns = "cr44a_inventoryweshopid,cr44a_soluongtonlythuyet,cr1bb_soluonglythuyetgiuathang,cr1bb_vitrikhotext";
        const invQuery = `$select=${invColumns}&$filter=${encodeURIComponent(invFilter)}&$top=1`;
        const invEndpoint = `${BASE_URL}${INVENTORY_TABLE}?${invQuery}`;
        
        const invResponse = await axios.get(invEndpoint, { headers });
        const invResults = invResponse.data.value || [];
        
        let invRecord = null;
        if (invResults.length > 0) {
          invRecord = invResults[0];
        } else if (safeWarehouse) {
          // Fallback: try without warehouse filter
          const fallbackFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
          const fallbackQuery = `$select=${invColumns}&$filter=${encodeURIComponent(fallbackFilter)}&$top=1`;
          const fallbackEndpoint = `${BASE_URL}${INVENTORY_TABLE}?${fallbackQuery}`;
          const fallbackResponse = await axios.get(fallbackEndpoint, { headers });
          const fallbackResults = fallbackResponse.data.value || [];
          if (fallbackResults.length > 0) {
            invRecord = fallbackResults[0];
          }
        }
        
        if (invRecord && invRecord.cr44a_inventoryweshopid) {
          const currentInventory = invRecord.cr44a_soluongtonlythuyet ?? 0;
          const reservedQuantity = invRecord.cr1bb_soluonglythuyetgiuathang ?? 0;
          const availableToSell = currentInventory - reservedQuantity;
          
          if (operation === 'reserve') {
            // Bước 1: Giữ hàng - Kiểm tra AvailableToSell >= quantity (trừ khi skipStockCheck = true)
            // Đơn VAT và sản phẩm đặc biệt: bỏ qua kiểm tra tồn kho
            const ALLOWED_PRODUCT_GROUPS = ['NSP-00027', 'NSP-000872', 'NSP-000409', 'NSP-000474', 'NSP-000873'];
            const isSpecialProduct = productGroupCode && ALLOWED_PRODUCT_GROUPS.includes(productGroupCode);
            
            if (!skipStockCheck && !isVatOrder && !isSpecialProduct && availableToSell < quantity) {
              const errorMessage = `Không đủ tồn kho để giữ! Sản phẩm ${productCode} có tồn kho khả dụng: ${availableToSell} (Tồn kho: ${currentInventory}, Đã giữ: ${reservedQuantity}), yêu cầu: ${quantity}`;
              console.error('[Update Inventory] Reserve failed - insufficient stock:', errorMessage);
              return res.status(400).json({ success: false, message: errorMessage });
            }
            
            if (skipStockCheck || isVatOrder || isSpecialProduct) {
              console.log('[Update Inventory] Skipping stock check for reserve (Inventory Weshops):', {
                productCode,
                skipStockCheck,
                isVatOrder,
                isSpecialProduct,
                productGroupCode
              });
            }
            
            // Update: ReservedQuantity += quantity
            // Làm tròn thành số nguyên vì field yêu cầu Int32
            const newReservedQuantity = Math.round(reservedQuantity + quantity);
            const updateInvEndpoint = `${BASE_URL}${INVENTORY_TABLE}(${invRecord.cr44a_inventoryweshopid})`;
            
            console.log('[Update Inventory] Reserving inventory (Inventory Weshops):', {
              productCode,
              currentReserved: reservedQuantity,
              quantityToReserve: quantity,
              newReserved: newReservedQuantity,
              endpoint: updateInvEndpoint
            });
            
            try {
              await axios.patch(
                updateInvEndpoint,
                { cr1bb_soluonglythuyetgiuathang: newReservedQuantity },
                { headers }
              );
              console.log('[Update Inventory] ✅ Successfully reserved inventory (Inventory Weshops)');
              inventoryUpdated = true;
            } catch (patchError: any) {
              console.error('[Update Inventory] ❌ Error updating ReservedQuantity (Inventory Weshops):', {
                error: patchError.message,
                response: patchError.response?.data,
                status: patchError.response?.status
              });
              throw patchError;
            }
          } else if (operation === 'release') {
            // Giải phóng hàng - ReservedQuantity -= quantity
            // Làm tròn thành số nguyên vì field yêu cầu Int32
            const newReservedQuantity = Math.max(0, Math.round(reservedQuantity - quantity));
            const updateInvEndpoint = `${BASE_URL}${INVENTORY_TABLE}(${invRecord.cr44a_inventoryweshopid})`;
            
            console.log('[Update Inventory] Releasing inventory (Inventory Weshops):', {
              productCode,
              currentReserved: reservedQuantity,
              quantityToRelease: quantity,
              newReserved: newReservedQuantity
            });
            
            try {
              await axios.patch(
                updateInvEndpoint,
                { cr1bb_soluonglythuyetgiuathang: newReservedQuantity },
                { headers }
              );
              console.log('[Update Inventory] ✅ Successfully released inventory (Inventory Weshops)');
              inventoryUpdated = true;
            } catch (patchError: any) {
              console.error('[Update Inventory] ❌ Error releasing ReservedQuantity (Inventory Weshops):', {
                error: patchError.message,
                response: patchError.response?.data,
                status: patchError.response?.status
              });
              throw patchError;
            }
          } else if (operation === 'final') {
            // Bước 3: Chốt đơn - Atomic check và trừ tồn kho
            // RE-CHECK: Get fresh inventory value right before update (optimistic locking)
            const freshResponse = await axios.get(invEndpoint, { headers });
            const freshResults = freshResponse.data.value || [];
            if (freshResults.length > 0) {
              const freshRecord = freshResults[0];
              const freshCurrentInventory = freshRecord.cr44a_soluongtonlythuyet ?? 0;
              const freshReservedQuantity = freshRecord.cr1bb_soluonglythuyetgiuathang ?? 0;
              
              // Kiểm tra xem có cần bypass tồn kho không
              const ALLOWED_PRODUCT_GROUPS = ['NSP-00027', 'NSP-000872', 'NSP-000409', 'NSP-000474', 'NSP-000873'];
              const isSpecialProduct = productGroupCode && ALLOWED_PRODUCT_GROUPS.includes(productGroupCode);
              
              // Atomic check: CurrentInventory >= quantity (trừ khi skipStockCheck = true hoặc là sản phẩm đặc biệt)
              if (!skipStockCheck && !isSpecialProduct && freshCurrentInventory < quantity) {
                const errorMessage = `Không đủ tồn kho để chốt đơn! Sản phẩm ${productCode} có tồn kho: ${freshCurrentInventory}, yêu cầu: ${quantity}`;
                return res.status(400).json({ success: false, message: errorMessage });
              }
              
              if (skipStockCheck || isSpecialProduct) {
                console.log('[Update Inventory] Skipping stock check for final (Inventory Weshops):', {
                  productCode,
                  skipStockCheck,
                  isSpecialProduct,
                  productGroupCode,
                  currentInventory: freshCurrentInventory,
                  quantity
                });
              }
              
              // Update: CurrentInventory -= quantity, ReservedQuantity -= quantity (giải phóng đặt giữ)
              // Với nhóm đặc biệt: KHÔNG trừ tồn kho lý thuyết, chỉ giải phóng ReservedQuantity
              const newReservedQuantity = Math.max(0, Math.round(freshReservedQuantity - quantity));
              
              // Với nhóm đặc biệt: KHÔNG trừ tồn kho lý thuyết
              let newCurrentInventory: number | undefined;
              if (!isSpecialProduct) {
                // Sản phẩm thường: trừ tồn kho lý thuyết
                newCurrentInventory = Math.round(freshCurrentInventory - quantity);
              } else {
                // Sản phẩm đặc biệt: giữ nguyên tồn kho lý thuyết
                newCurrentInventory = undefined; // Không update field này
                console.log(`[Update Inventory] Nhóm đặc biệt ${productGroupCode} - Không trừ tồn kho lý thuyết, chỉ giải phóng ReservedQuantity`);
              }
              
              const updateInvEndpoint = `${BASE_URL}${INVENTORY_TABLE}(${freshRecord.cr44a_inventoryweshopid})`;
              
              console.log('[Update Inventory] Finalizing order (Inventory Weshops):', {
                productCode,
                currentInventory: freshCurrentInventory,
                reservedQuantity: freshReservedQuantity,
                quantity,
                newCurrentInventory: newCurrentInventory ?? '(giữ nguyên)',
                newReservedQuantity,
                isSpecialProduct
              });
              
              try {
                // ATOMIC OPERATION: Update field(s) trong cùng 1 request
                const updatePayload: any = {
                  cr1bb_soluonglythuyetgiuathang: newReservedQuantity // Tính lại số giữ tồn kho (luôn update)
                };
                
                // Chỉ update tồn kho lý thuyết nếu không phải sản phẩm đặc biệt
                if (newCurrentInventory !== undefined) {
                  updatePayload.cr44a_soluongtonlythuyet = newCurrentInventory;
                }
                
                await axios.patch(
                  updateInvEndpoint,
                  updatePayload,
                  { headers }
                );
                
                if (isSpecialProduct) {
                  console.log(`[Update Inventory] ✅ Nhóm đặc biệt - Chỉ giải phóng ReservedQuantity: ${productCode} - Giữ tồn: ${freshReservedQuantity} → ${newReservedQuantity} (Tồn kho lý thuyết giữ nguyên: ${freshCurrentInventory})`);
                } else {
                  console.log('[Update Inventory] ✅ Successfully finalized order (Inventory Weshops)');
                }
                inventoryUpdated = true;
              } catch (patchError: any) {
                console.error('[Update Inventory] ❌ Error finalizing order (Inventory Weshops):', {
                  error: patchError.message,
                  response: patchError.response?.data,
                  status: patchError.response?.status
                });
                throw patchError;
              }
            }
          }
        }
      } catch (error: any) {
        // Continue to try Kho Binh Dinh even if inventory update fails
        if (operation === 'final') {
          throw error; // Re-throw for final operation
        }
      }
    }

    // ============ 2. Update crdfd_kho_binh_dinhs (for VAT orders) ============
    if (isVatOrder) {
      try {
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
        // CurrentInventory = cr1bb_tonkholythuyetbomua (hoặc crdfd_tonkholythuyet)
        // ReservedQuantity = cr1bb_soluonganggiuathang (cột giữ hàng ở Kho Bình Định)
        // AvailableToSell = CurrentInventory - ReservedQuantity
        const khoBDColumns = "crdfd_kho_binh_dinhid,cr1bb_tonkholythuyetbomua,crdfd_tonkholythuyet,cr1bb_soluonganggiuathang,crdfd_vitrikhofx";
        const khoBDQuery = `$select=${khoBDColumns}&$filter=${encodeURIComponent(khoBDFilter)}&$top=1`;
        const khoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}?${khoBDQuery}`;

        const khoBDResponse = await axios.get(khoBDEndpoint, { headers });
        let khoBDResults = khoBDResponse.data.value || [];
        
        // Fallback: nếu không tìm thấy với warehouse filter, thử lại không có warehouse filter
        if (khoBDResults.length === 0 && safeWarehouse) {
          const fallbackConditions: Array<{
            field: string;
            operator: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'contains' | 'startswith' | 'endswith';
            value: any;
          }> = [
            { field: 'crdfd_masp', operator: 'eq', value: safeCode },
            { field: 'statecode', operator: 'eq', value: 0 }
          ];
          const fallbackFilter = fallbackConditions.map(({ field, operator, value }, index) => {
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
          const fallbackQuery = `$select=${khoBDColumns}&$filter=${encodeURIComponent(fallbackFilter)}&$top=1`;
          const fallbackEndpoint = `${BASE_URL}${KHO_BD_TABLE}?${fallbackQuery}`;
          console.log('[Update Inventory] Fallback query (no warehouse filter):', fallbackEndpoint);
          
          try {
            const fallbackResponse = await axios.get(fallbackEndpoint, { headers });
            khoBDResults = fallbackResponse.data.value || [];
          } catch (fallbackError) {
            console.warn('[Update Inventory] Fallback query failed:', fallbackError);
          }
        }
        
        if (khoBDResults.length > 0) {
          const khoBDRecord = khoBDResults[0];
          // CurrentInventory = cr1bb_tonkholythuyetbomua (ưu tiên), fallback về crdfd_tonkholythuyet
          let currentInventory = khoBDRecord.cr1bb_tonkholythuyetbomua ?? 0;
          if (currentInventory === 0 && khoBDRecord.crdfd_tonkholythuyet) {
            currentInventory = khoBDRecord.crdfd_tonkholythuyet ?? 0;
          }
          // ReservedQuantity = cr1bb_soluonganggiuathang (cột giữ hàng ở Kho Bình Định)
          const reservedQuantity = khoBDRecord.cr1bb_soluonganggiuathang ?? 0;
          const availableToSell = currentInventory - reservedQuantity;
          
          console.log('[Update Inventory] Kho Binh Dinh results:', {
            found: true,
            recordId: khoBDRecord.crdfd_kho_binh_dinhid,
            currentInventory,
            reservedQuantity,
            availableToSell
          });
          
          if (operation === 'reserve') {
            // Bước 1: Giữ hàng - Kiểm tra AvailableToSell >= quantity (trừ khi skipStockCheck = true)
            // Đơn VAT và sản phẩm đặc biệt: bỏ qua kiểm tra tồn kho
            const ALLOWED_PRODUCT_GROUPS = ['NSP-00027', 'NSP-000872', 'NSP-000409', 'NSP-000474', 'NSP-000873'];
            const isSpecialProduct = productGroupCode && ALLOWED_PRODUCT_GROUPS.includes(productGroupCode);
            
            if (!skipStockCheck && !isVatOrder && !isSpecialProduct && availableToSell < quantity) {
              const errorMessage = `Không đủ tồn kho để giữ! Sản phẩm ${productCode} có tồn kho khả dụng: ${availableToSell} (Tồn kho: ${currentInventory}, Đã giữ: ${reservedQuantity}), yêu cầu: ${quantity}`;
              console.error('[Update Inventory] Reserve failed - insufficient stock:', errorMessage);
              return res.status(400).json({ success: false, message: errorMessage });
            }
            
            if (skipStockCheck || isVatOrder || isSpecialProduct) {
              console.log('[Update Inventory] Skipping stock check for reserve (Kho Bình Định):', {
                productCode,
                skipStockCheck,
                isVatOrder,
                isSpecialProduct,
                productGroupCode
              });
            }
            
            // Update: ReservedQuantity += quantity
            // Làm tròn thành số nguyên vì field yêu cầu Int32
            const newReservedQuantity = Math.round(reservedQuantity + quantity);
            const updateKhoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}(${khoBDRecord.crdfd_kho_binh_dinhid})`;
            
            console.log('[Update Inventory] Reserving inventory:', {
              productCode,
              currentReserved: reservedQuantity,
              quantityToReserve: quantity,
              newReserved: newReservedQuantity,
              endpoint: updateKhoBDEndpoint
            });
            
            try {
              await axios.patch(
                updateKhoBDEndpoint,
                { cr1bb_soluonganggiuathang: newReservedQuantity },
                { headers }
              );
              console.log('[Update Inventory] ✅ Successfully reserved inventory');
              khoBDUpdated = true;
            } catch (patchError: any) {
              console.error('[Update Inventory] ❌ Error updating ReservedQuantity:', {
                error: patchError.message,
                response: patchError.response?.data,
                status: patchError.response?.status
              });
              throw patchError;
            }
          } else if (operation === 'release') {
            // Giải phóng hàng - ReservedQuantity -= quantity
            // Làm tròn thành số nguyên vì field yêu cầu Int32
            const newReservedQuantity = Math.max(0, Math.round(reservedQuantity - quantity));
            const updateKhoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}(${khoBDRecord.crdfd_kho_binh_dinhid})`;
            
            console.log('[Update Inventory] Releasing inventory:', {
              productCode,
              currentReserved: reservedQuantity,
              quantityToRelease: quantity,
              newReserved: newReservedQuantity
            });
            
            try {
              await axios.patch(
                updateKhoBDEndpoint,
                { cr1bb_soluonganggiuathang: newReservedQuantity },
                { headers }
              );
              console.log('[Update Inventory] ✅ Successfully released inventory');
              khoBDUpdated = true;
            } catch (patchError: any) {
              console.error('[Update Inventory] ❌ Error releasing ReservedQuantity:', {
                error: patchError.message,
                response: patchError.response?.data,
                status: patchError.response?.status
              });
              throw patchError;
            }
          } else if (operation === 'final') {
            // Bước 3: Chốt đơn - Atomic check và trừ tồn kho
            // RE-CHECK: Get fresh inventory value right before update (optimistic locking)
            const freshResponse = await axios.get(khoBDEndpoint, { headers });
            const freshResults = freshResponse.data.value || [];
            if (freshResults.length > 0) {
              const freshRecord = freshResults[0];
              // CurrentInventory = cr1bb_tonkholythuyetbomua (ưu tiên), fallback về crdfd_tonkholythuyet
              let freshCurrentInventory = freshRecord.cr1bb_tonkholythuyetbomua ?? 0;
              if (freshCurrentInventory === 0 && freshRecord.crdfd_tonkholythuyet) {
                freshCurrentInventory = freshRecord.crdfd_tonkholythuyet ?? 0;
              }
              const freshReservedQuantity = freshRecord.cr1bb_soluonganggiuathang ?? 0;
              
              // Kiểm tra xem có cần bypass tồn kho không
              const ALLOWED_PRODUCT_GROUPS = ['NSP-00027', 'NSP-000872', 'NSP-000409', 'NSP-000474', 'NSP-000873'];
              const isSpecialProduct = productGroupCode && ALLOWED_PRODUCT_GROUPS.includes(productGroupCode);
              
              // Atomic check: CurrentInventory >= quantity (trừ khi skipStockCheck = true hoặc là sản phẩm đặc biệt)
              // Lưu ý: Đơn VAT thường không cần check tồn kho, nhưng vẫn check nếu không phải sản phẩm đặc biệt và không có skipStockCheck
              if (!skipStockCheck && !isSpecialProduct && freshCurrentInventory < quantity) {
                const errorMessage = `Không đủ tồn kho để chốt đơn! Sản phẩm ${productCode} có tồn kho: ${freshCurrentInventory}, yêu cầu: ${quantity}`;
                return res.status(400).json({ success: false, message: errorMessage });
              }
              
              if (skipStockCheck || isSpecialProduct || isVatOrder) {
                console.log('[Update Inventory] Skipping stock check for final (Kho Bình Định):', {
                  productCode,
                  skipStockCheck,
                  isVatOrder,
                  isSpecialProduct,
                  productGroupCode,
                  currentInventory: freshCurrentInventory,
                  quantity
                });
              }
              
              // Update: CurrentInventory -= quantity, ReservedQuantity -= quantity
              // Với nhóm đặc biệt: KHÔNG trừ tồn kho lý thuyết, chỉ giải phóng ReservedQuantity
              const newReservedQuantity = Math.max(0, Math.round(freshReservedQuantity - quantity));
              
              // Với nhóm đặc biệt: KHÔNG trừ tồn kho lý thuyết
              let newCurrentInventory: number | undefined;
              if (!isSpecialProduct) {
                // Sản phẩm thường: trừ tồn kho lý thuyết
                newCurrentInventory = Math.round(freshCurrentInventory - quantity);
              } else {
                // Sản phẩm đặc biệt: giữ nguyên tồn kho lý thuyết
                newCurrentInventory = undefined; // Không update field này
                console.log(`[Update Inventory] Nhóm đặc biệt ${productGroupCode} - Không trừ tồn kho lý thuyết (Kho Bình Định), chỉ giải phóng ReservedQuantity`);
              }
              
              const updateKhoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}(${freshRecord.crdfd_kho_binh_dinhid})`;
              
              console.log('[Update Inventory] Finalizing order (Kho Bình Định):', {
                productCode,
                currentInventory: freshCurrentInventory,
                reservedQuantity: freshReservedQuantity,
                quantity,
                newCurrentInventory: newCurrentInventory ?? '(giữ nguyên)',
                newReservedQuantity,
                isSpecialProduct
              });
              
              try {
                // ATOMIC OPERATION: Update field(s) trong cùng 1 request
                const updatePayload: any = {
                  cr1bb_soluonganggiuathang: newReservedQuantity // Tính lại số giữ tồn kho (luôn update)
                };
                
                // Chỉ update tồn kho lý thuyết nếu không phải sản phẩm đặc biệt
                if (newCurrentInventory !== undefined) {
                  // Update field CurrentInventory tương ứng
                  if (freshRecord.cr1bb_tonkholythuyetbomua !== undefined) {
                    updatePayload.cr1bb_tonkholythuyetbomua = newCurrentInventory;
                  } else if (freshRecord.crdfd_tonkholythuyet !== undefined) {
                    updatePayload.crdfd_tonkholythuyet = newCurrentInventory;
                  }
                }
                
                await axios.patch(
                  updateKhoBDEndpoint,
                  updatePayload,
                  { headers }
                );
                
                if (isSpecialProduct) {
                  console.log(`[Update Inventory] ✅ Nhóm đặc biệt - Chỉ giải phóng ReservedQuantity (Kho Bình Định): ${productCode} - Giữ tồn: ${freshReservedQuantity} → ${newReservedQuantity} (Tồn kho lý thuyết giữ nguyên: ${freshCurrentInventory})`);
                } else {
                  console.log('[Update Inventory] ✅ Successfully finalized order (Kho Bình Định)');
                }
                khoBDUpdated = true;
              } catch (patchError: any) {
                console.error('[Update Inventory] ❌ Error finalizing order (Kho Bình Định):', {
                  error: patchError.message,
                  response: patchError.response?.data,
                  status: patchError.response?.status
                });
                throw patchError;
              }
            }
          }
        } else {
          // Không tìm thấy record trong Kho Bình Định
          console.warn('[Update Inventory] ⚠️ No record found in Kho Binh Dinh:', {
            productCode,
            warehouseName: safeWarehouse,
            operation
          });
          
          if (operation === 'reserve' || operation === 'release' || operation === 'final') {
            // Với các operation này, cần có record để update
            const errorMessage = `Không tìm thấy sản phẩm ${productCode} trong Kho Bình Định${safeWarehouse ? ` (kho: ${safeWarehouse})` : ''}`;
            return res.status(404).json({ success: false, message: errorMessage });
          }
        }
      } catch (error: any) {
        throw error;
      }
    }

    // Build success message based on operation
    let message = '';
    if (operation === 'reserve') {
      message = `Đã giữ ${quantity} tồn kho cho sản phẩm ${productCode}`;
    } else if (operation === 'release') {
      message = `Đã giải phóng ${quantity} tồn kho cho sản phẩm ${productCode}`;
    } else if (operation === 'final') {
      message = `Đã chốt đơn và trừ ${quantity} tồn kho cho sản phẩm ${productCode}`;
    }

    return res.status(200).json({
      success: true,
      message,
      inventoryUpdated,
      khoBDUpdated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi cập nhật tồn kho',
    });
  }
}

