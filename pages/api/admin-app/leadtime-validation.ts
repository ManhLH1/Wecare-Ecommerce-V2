import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

// Table names
const SO_TABLE = "crdfd_sale_orders";
const SOD_TABLE = "crdfd_saleorderdetails";
const SOBG_TABLE = "crdfd_sobaogias";
const SOBGD_TABLE = "crdfd_sodbaogias";
const PROMOTION_TABLE = "crdfd_promotions";
const CUSTOMER_TABLE = "crdfd_customers";

interface LeadtimeValidationResult {
  id: string;
  type: 'SO' | 'SOBG';
  soNumber: string;
  customerName: string;
  customerCode: string;
  industry: string;
  warehouse: string;
  createdOn: string;
  details: Array<{
    productName: string;
    productCode: string;
    quantity: number;
    unit: string;
    price: number;
    discountedPrice: number;
    promotionName?: string;
    promotionValue?: number;
    expectedDeliveryDate: string;
    calculatedDeliveryDate: string;
    deliveryDateMatch: boolean;
    priceIssues: string[];
    leadtimeIssues: string[];
  }>;
  hasIssues: boolean;
  issueCount: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      days = 7, // Check last N days
      limit = 50, // Limit results
      checkPrices = true,
      checkLeadtime = true
    } = req.query;

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

    // Calculate date range (last N days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[Leadtime Validation] Checking records from ${startDateStr} to ${endDateStr}`);

    // Get SO records with issues
    const soResults = await validateSOLeadtime(headers, startDateStr, endDateStr, parseInt(limit as string));
    const sobgResults = await validateSOBGLeadtime(headers, startDateStr, endDateStr, parseInt(limit as string));

    const allResults = [...soResults, ...sobgResults];
    const totalIssues = allResults.reduce((sum, result) => sum + result.issueCount, 0);

    res.status(200).json({
      success: true,
      summary: {
        totalRecords: allResults.length,
        totalIssues,
        dateRange: { start: startDateStr, end: endDateStr },
        checkedDays: days
      },
      results: allResults.slice(0, parseInt(limit as string))
    });

  } catch (error: any) {
    console.error("[Leadtime Validation] Error:", error);
    res.status(500).json({
      error: "Failed to validate leadtime",
      details: error.message
    });
  }
}

async function validateSOLeadtime(
  headers: any,
  startDate: string,
  endDate: string,
  limit: number
): Promise<LeadtimeValidationResult[]> {
  try {
    // Query SO records first
    const soFilter = `statecode eq 0 and createdon ge ${startDate} and createdon le ${endDate}T23:59:59Z`;
    const soSelect = `crdfd_sale_orderid,crdfd_name,crdfd_so_code,crdfd_so_auto,createdon,crdfd_ngaygiaodukientonghop,crdfd_exdeliverrydate,_crdfd_khachhang_value,_crdfd_kho_value`;
    const soQuery = `$select=${soSelect}&$filter=${encodeURIComponent(soFilter)}&$orderby=createdon desc&$top=${limit}`;

    const soResponse = await axios.get(`${BASE_URL}${SO_TABLE}?${soQuery}`, { headers });
    const soRecords = soResponse.data.value || [];

    const results: LeadtimeValidationResult[] = [];

    for (const so of soRecords) {
      try {
        // Get customer info
        let customerInfo = {};
        if (so._crdfd_khachhang_value) {
          try {
            const customerResponse = await axios.get(`${BASE_URL}${CUSTOMER_TABLE}(${so._crdfd_khachhang_value})?$select=crdfd_name,cr44a_makhachang,cr44a_st,crdfd_nganhnghe_text`, { headers });
            customerInfo = customerResponse.data;
          } catch (err) {
            console.warn('[SO Validation] Could not fetch customer info:', (err as Error).message);
          }
        }

        // Get warehouse info
        let warehouseInfo = {};
        if (so._crdfd_kho_value) {
          try {
            const warehouseResponse = await axios.get(`${BASE_URL}crdfd_warehous(${so._crdfd_kho_value})?$select=crdfd_makho,crdfd_tenkho`, { headers });
            warehouseInfo = warehouseResponse.data;
          } catch (err) {
            console.warn('[SO Validation] Could not fetch warehouse info:', (err as Error).message);
          }
        }

        // Get SOD details
        const sodFilter = `_crdfd_socode_value eq ${so.crdfd_sale_orderid} and statecode eq 0`;
        const sodSelect = `crdfd_saleorderdetailid,crdfd_tensanphamtext,crdfd_masanpham,crdfd_productnum,crdfd_onvionhang,crdfd_gia,crdfd_giagoc,crdfd_chieckhau,crdfd_ngaygiaodukientonghop,crdfd_exdeliverrydate,_crdfd_promotion_value`;
        const sodQuery = `$select=${sodSelect}&$filter=${encodeURIComponent(sodFilter)}&$expand=crdfd_promotion($select=crdfd_name,cr1bb_leadtimepromotion,cr1bb_phanloaichuongtrinh)`;

        const sodResponse = await axios.get(`${BASE_URL}${SOD_TABLE}?${sodQuery}`, { headers });
        const sodRecords = sodResponse.data.value || [];

        const details = sodRecords.map((sod: any) => {
          const priceIssues: string[] = [];
          const leadtimeIssues: string[] = [];

          // Check price issues
          if (sod.crdfd_gia && sod.crdfd_giagoc) {
            const discountPercent = sod.crdfd_chieckhau || 0;
            const expectedDiscountedPrice = sod.crdfd_giagoc * (1 - discountPercent / 100);

            if (Math.abs(sod.crdfd_gia - expectedDiscountedPrice) > 0.01) {
              priceIssues.push(`Giá chiết khấu không khớp: expected ${expectedDiscountedPrice}, got ${sod.crdfd_gia}`);
            }
          }

          // Check promotion leadtime
          const orderWithCustomer = { ...so, ...customerInfo, ...warehouseInfo };
          const expectedDeliveryDate = calculateExpectedDeliveryDate(orderWithCustomer, sod);
          const actualDeliveryDate = sod.crdfd_ngaygiaodukientonghop || sod.crdfd_exdeliverrydate;

          const deliveryDateMatch = expectedDeliveryDate === actualDeliveryDate;

          if (!deliveryDateMatch) {
            leadtimeIssues.push(`Ngày giao không khớp: expected ${expectedDeliveryDate}, got ${actualDeliveryDate}`);
          }

          return {
            productName: sod.crdfd_tensanphamtext || '',
            productCode: sod.crdfd_masanpham || '',
            quantity: sod.crdfd_productnum || 0,
            unit: sod.crdfd_onvionhang || '',
            price: sod.crdfd_giagoc || 0,
            discountedPrice: sod.crdfd_gia || 0,
            promotionName: sod.crdfd_promotion?.crdfd_name,
            promotionValue: sod.crdfd_promotion?.cr1bb_leadtimepromotion,
            expectedDeliveryDate,
            calculatedDeliveryDate: actualDeliveryDate || '',
            deliveryDateMatch,
            priceIssues,
            leadtimeIssues
          };
        });

        const hasIssues = details.some((d: any) =>
          d.priceIssues.length > 0 || d.leadtimeIssues.length > 0
        );

        if (hasIssues) {
          results.push({
            id: so.crdfd_sale_orderid,
            type: 'SO',
            soNumber: so.crdfd_so_code || so.crdfd_so_auto || so.crdfd_name || 'Unknown',
            customerName: (customerInfo as any).crdfd_name || '',
            customerCode: (customerInfo as any).cr44a_makhachang || (customerInfo as any).cr44a_st || '',
            industry: (customerInfo as any).crdfd_nganhnghe_text || '',
            warehouse: (warehouseInfo as any).crdfd_makho || (warehouseInfo as any).crdfd_tenkho || '',
            createdOn: so.createdon,
            details,
            hasIssues: true,
            issueCount: details.reduce((sum: number, d: any) => sum + d.priceIssues.length + d.leadtimeIssues.length, 0)
          });
        }
      } catch (err) {
        console.warn(`[SO Validation] Error processing SO ${so.crdfd_sale_orderid}:`, (err as Error).message);
      }
    }

    return results;

  } catch (error: any) {
    console.error('[SO Leadtime Validation] Error:', error);
    return [];
  }
}

async function validateSOBGLeadtime(
  headers: any,
  startDate: string,
  endDate: string,
  limit: number
): Promise<LeadtimeValidationResult[]> {
  try {
    // Query SOBG records first
    const sobgFilter = `statecode eq 0 and createdon ge ${startDate} and createdon le ${endDate}T23:59:59Z`;
    const sobgSelect = `crdfd_sobaogiaid,crdfd_name,crdfd_so_code,createdon,crdfd_ngaygiaodukien,_crdfd_khachhang_value,_crdfd_kho_value`;
    const sobgQuery = `$select=${sobgSelect}&$filter=${encodeURIComponent(sobgFilter)}&$orderby=createdon desc&$top=${limit}`;

    const sobgResponse = await axios.get(`${BASE_URL}${SOBG_TABLE}?${sobgQuery}`, { headers });
    const sobgRecords = sobgResponse.data.value || [];

    const results: LeadtimeValidationResult[] = [];

    for (const sobg of sobgRecords) {
      try {
        // Get customer info
        let customerInfo = {};
        if (sobg._crdfd_khachhang_value) {
          try {
            const customerResponse = await axios.get(`${BASE_URL}${CUSTOMER_TABLE}(${sobg._crdfd_khachhang_value})?$select=crdfd_name,cr44a_makhachang,cr44a_st,crdfd_nganhnghe_text`, { headers });
            customerInfo = customerResponse.data;
          } catch (err) {
            console.warn('[SOBG Validation] Could not fetch customer info:', (err as Error).message);
          }
        }

        // Get warehouse info
        let warehouseInfo = {};
        if (sobg._crdfd_kho_value) {
          try {
            const warehouseResponse = await axios.get(`${BASE_URL}crdfd_warehous(${sobg._crdfd_kho_value})?$select=crdfd_makho,crdfd_tenkho`, { headers });
            warehouseInfo = warehouseResponse.data;
          } catch (err) {
            console.warn('[SOBG Validation] Could not fetch warehouse info:', (err as Error).message);
          }
        }

        // Get SOBGD details
        const sobgdFilter = `_crdfd_sobaogiaid_value eq ${sobg.crdfd_sobaogiaid} and statecode eq 0`;
        const sobgdSelect = `crdfd_sodbaogiaid,crdfd_tensanpham,crdfd_masanpham,crdfd_soluong,crdfd_donvi,crdfd_ongia,crdfd_giack1,crdfd_giack2,crdfd_chietkhau,crdfd_ngaygiaodukien,_crdfd_promotion_value`;
        const sobgdQuery = `$select=${sobgdSelect}&$filter=${encodeURIComponent(sobgdFilter)}&$expand=crdfd_promotion($select=crdfd_name,cr1bb_leadtimepromotion,cr1bb_phanloaichuongtrinh)`;

        const sobgdResponse = await axios.get(`${BASE_URL}${SOBGD_TABLE}?${sobgdQuery}`, { headers });
        const sobgdRecords = sobgdResponse.data.value || [];

        const details = sobgdRecords.map((sobgd: any) => {
          const priceIssues: string[] = [];
          const leadtimeIssues: string[] = [];

          // Check price issues
          if (sobgd.crdfd_giack2 && sobgd.crdfd_giack1) {
            const discountPercent = sobgd.crdfd_chietkhau || 0;
            const expectedDiscountedPrice = sobgd.crdfd_giack1 * (1 - discountPercent / 100);

            if (Math.abs(sobgd.crdfd_giack2 - expectedDiscountedPrice) > 0.01) {
              priceIssues.push(`Giá chiết khấu không khớp: expected ${expectedDiscountedPrice}, got ${sobgd.crdfd_giack2}`);
            }
          }

          // Check leadtime
          const orderWithCustomer = { ...sobg, ...customerInfo, ...warehouseInfo };
          const expectedDeliveryDate = calculateExpectedDeliveryDate(orderWithCustomer, sobgd);
          const actualDeliveryDate = sobgd.crdfd_ngaygiaodukien;

          const deliveryDateMatch = expectedDeliveryDate === actualDeliveryDate;

          if (!deliveryDateMatch) {
            leadtimeIssues.push(`Ngày giao không khớp: expected ${expectedDeliveryDate}, got ${actualDeliveryDate}`);
          }

          return {
            productName: sobgd.crdfd_tensanpham || '',
            productCode: sobgd.crdfd_masanpham || '',
            quantity: sobgd.crdfd_soluong || 0,
            unit: sobgd.crdfd_donvi || '',
            price: sobgd.crdfd_giack1 || 0,
            discountedPrice: sobgd.crdfd_giack2 || 0,
            promotionName: sobgd.crdfd_promotion?.crdfd_name,
            promotionValue: sobgd.crdfd_promotion?.cr1bb_leadtimepromotion,
            expectedDeliveryDate,
            calculatedDeliveryDate: actualDeliveryDate || '',
            deliveryDateMatch,
            priceIssues,
            leadtimeIssues
          };
        });

        const hasIssues = details.some((d: any) =>
          d.priceIssues.length > 0 || d.leadtimeIssues.length > 0
        );

        if (hasIssues) {
          results.push({
            id: sobg.crdfd_sobaogiaid,
            type: 'SOBG',
            soNumber: sobg.crdfd_so_code || sobg.crdfd_name || 'Unknown',
            customerName: (customerInfo as any).crdfd_name || '',
            customerCode: (customerInfo as any).cr44a_makhachang || (customerInfo as any).cr44a_st || '',
            industry: (customerInfo as any).crdfd_nganhnghe_text || '',
            warehouse: (warehouseInfo as any).crdfd_makho || (warehouseInfo as any).crdfd_tenkho || '',
            createdOn: sobg.createdon,
            details,
            hasIssues: true,
            issueCount: details.reduce((sum: number, d: any) => sum + d.priceIssues.length + d.leadtimeIssues.length, 0)
          });
        }
      } catch (err) {
        console.warn(`[SOBG Validation] Error processing SOBG ${sobg.crdfd_sobaogiaid}:`, (err as Error).message);
      }
    }

    return results;

  } catch (error: any) {
    console.error('[SOBG Leadtime Validation] Error:', error);
    return [];
  }
}

function calculateExpectedDeliveryDate(order: any, detail: any): string {
  // Use the same logic as computeDeliveryDate.ts
  // Simplified version for audit purposes
  try {
    const orderTime = new Date(order.createdon);
    const warehouseCode = extractWarehouseCode(order.crdfd_makho || order.crdfd_tenkho);

    // Apply weekend reset logic (same as computeDeliveryDate)
    const effectiveOrderTime = getWeekendResetTime(orderTime);

    // District leadtime (if available - currently not implemented in DB)
    // TODO: Add district leadtime lookup from customer district mapping
    if (order.districtLeadtime && order.districtLeadtime > 0) {
      let result = addWorkingDays(effectiveOrderTime, order.districtLeadtime);
      result = applySundayAdjustment(result, warehouseCode);
      return result.toISOString().split('T')[0];
    }

    // Check if this is a Shop industry order
    const isShopIndustry = order.crdfd_nganhnghe_text?.toLowerCase().includes('shop') ||
                          order.crdfd_nganhnghe === 191920001;

    // Out of stock logic (simplified - assume out of stock if we need to check)
    // In real audit, we would need inventory data
    const isOutOfStock = true; // Assume checking for out of stock cases

    if (isOutOfStock && warehouseCode) {
      let leadtimeCa = 0;

      if (warehouseCode === 'KHOHCM') {
        leadtimeCa = isApolloKimTinPromotion(detail.crdfd_promotion?.crdfd_name) ? 6 : 2;
      } else if (warehouseCode === 'KHOBD') {
        leadtimeCa = isApolloKimTinPromotion(detail.crdfd_promotion?.crdfd_name) ? 6 : 4;
      }

      if (leadtimeCa > 0) {
        let result = addWorkingDays(effectiveOrderTime, leadtimeCa);
        result = applySundayAdjustment(result, warehouseCode);
        return result.toISOString().split('T')[0];
      }
    }

    // Legacy Shop logic (same as backend)
    if (isShopIndustry) {
      // This would need the same complex logic as backend
      // For audit purposes, we'll use a simplified approach
      const result = addWorkingDays(effectiveOrderTime, 2); // Simplified
      return result.toISOString().split('T')[0];
    }

    // Default: +1 working day
    const result = addWorkingDays(effectiveOrderTime, 1);
    return result.toISOString().split('T')[0];

  } catch (error) {
    console.error('[Calculate Expected Date] Error:', error);
    return '';
  }
}

// Helper functions (same as computeDeliveryDate.ts)
function addWorkingDays(base: Date, days: number): Date {
  const d = new Date(base);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function getWeekendResetTime(orderTime: Date): Date {
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
}

function applySundayAdjustment(resultDate: Date, warehouseCode?: string): Date {
  if (warehouseCode === 'KHOHCM' && resultDate.getDay() === 0) {
    // Sunday → Monday
    return addDays(resultDate, 1);
  }
  return resultDate;
}

function extractWarehouseCode(warehouseName?: string): string | undefined {
  if (!warehouseName) return undefined;

  const name = warehouseName.toLowerCase().trim();

  if (name.includes('hồ chí minh') || name.includes('hcm') || name.includes('sài gòn')) {
    return 'KHOHCM';
  }
  if (name.includes('bình định') || name.includes('bd')) {
    return 'KHOBD';
  }

  const codeMatch = warehouseName.match(/^([A-Z]{3,}[0-9]*)/i);
  if (codeMatch) {
    return codeMatch[1].toUpperCase();
  }

  return undefined;
}

function isApolloKimTinPromotion(promotionName?: string): boolean {
  if (!promotionName) return false;
  const name = promotionName.toLowerCase();
  return name.includes('apollo') || name.includes('kim tín');
}
