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
  operation: 'subtract' | 'add'; // 'subtract' để trừ, 'add' để cộng
  isVatOrder?: boolean; // true = VAT order (Kho Bình Định), false = non-VAT (Inventory)
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

  try {
    const { productCode, quantity, warehouseName, operation, isVatOrder = false }: UpdateInventoryRequest = req.body;

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

    // 1. Update cr44a_inventoryweshops (for non-VAT orders)
    if (!isVatOrder) {
      try {
        let invFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
        if (safeWarehouse) {
          invFilter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
        }
        const invColumns = "cr44a_inventoryweshopid,cr44a_soluongtonlythuyet,cr1bb_vitrikhotext";
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
          const currentStock = invRecord.cr44a_soluongtonlythuyet ?? 0;
          
          // Check if sufficient stock when subtracting
          if (operation === 'subtract' && currentStock < quantity) {
            const errorMessage = `Không đủ tồn kho! Sản phẩm ${productCode} có tồn kho: ${currentStock}, yêu cầu: ${quantity}`;
            return res.status(400).json({ success: false, message: errorMessage });
          }

          const newStock = operation === 'subtract' 
            ? currentStock - quantity 
            : currentStock + quantity;

          const updateInvEndpoint = `${BASE_URL}${INVENTORY_TABLE}(${invRecord.cr44a_inventoryweshopid})`;

          await axios.patch(
            updateInvEndpoint,
            { cr44a_soluongtonlythuyet: newStock },
            { headers }
          );
          inventoryUpdated = true;
        }
      } catch (error: any) {
        // Continue to try Kho Binh Dinh even if inventory update fails
      }
    }

    // 2. Update crdfd_kho_binh_dinhs (for VAT orders)
    if (isVatOrder) {
      try {
        let khoBDFilter = `crdfd_masp eq '${safeCode}' and statecode eq 0`;
        if (safeWarehouse) {
          khoBDFilter += ` and crdfd_vitrikhofx eq '${safeWarehouse}'`;
        }
        const khoBDColumns = "crdfd_kho_binh_dinhid,crdfd_tonkholythuyet,crdfd_vitrikhofx";
        const khoBDQuery = `$select=${khoBDColumns}&$filter=${encodeURIComponent(khoBDFilter)}&$top=1`;
        const khoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}?${khoBDQuery}`;

        const khoBDResponse = await axios.get(khoBDEndpoint, { headers });
        const khoBDResults = khoBDResponse.data.value || [];
        
        if (khoBDResults.length > 0) {
          const khoBDRecord = khoBDResults[0];
          const currentStockBD = khoBDRecord.crdfd_tonkholythuyet ?? 0;
          
          // Check if sufficient stock when subtracting
          if (operation === 'subtract' && currentStockBD < quantity) {
            const errorMessage = `Không đủ tồn kho (Kho Bình Định)! Sản phẩm ${productCode} có tồn kho: ${currentStockBD}, yêu cầu: ${quantity}`;
            return res.status(400).json({ success: false, message: errorMessage });
          }

          const newStockBD = operation === 'subtract' 
            ? currentStockBD - quantity 
            : currentStockBD + quantity;

          const updateKhoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}(${khoBDRecord.crdfd_kho_binh_dinhid})`;

          await axios.patch(
            updateKhoBDEndpoint,
            { crdfd_tonkholythuyet: newStockBD },
            { headers }
          );
          khoBDUpdated = true;
        }
      } catch (error: any) {
        throw error;
      }
    }

    const message = operation === 'subtract' 
      ? `Đã trừ ${quantity} tồn kho cho sản phẩm ${productCode}`
      : `Đã cộng ${quantity} tồn kho cho sản phẩm ${productCode}`;

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

