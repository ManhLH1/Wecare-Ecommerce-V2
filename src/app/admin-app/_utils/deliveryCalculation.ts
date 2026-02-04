/**
 * Delivery Date Calculation Utilities
 * Tách logic tính toán ngày giao hàng từ ProductEntryForm
 */

export interface DeliveryCalculationParams {
  productCode: string;
  quantity: number;
  inventoryTheoretical: number;
  districtLeadtime?: number;
  warehouseCode?: string;
  customerIndustry?: number;
  customerName?: string;
  selectedPromotion?: any;
  productLeadTime?: number;
  conversionFactor?: number;
  urgentOrder?: boolean;
}

/**
 * Xác định loại ngành nghề khách hàng (Shop hay khác)
 */
export function determineCustomerIndustry(
  customerIndustry?: number,
  customerName?: string
): string | undefined {
  // Common heuristic: customerIndustry option value may indicate Shop (value 5 in PowerApps canvas),
  // also fallback to customerName containing 'shop'
  if (typeof customerIndustry === 'number') {
    // If option-set uses small integers for industry, check for 5 (Shop) or specific known code 191920004
    if (customerIndustry === 5 || customerIndustry === 191920004) {
      return 'Shop';
    }
  }
  if (customerName && String(customerName).toLowerCase().includes('shop')) {
    return 'Shop';
  }
  return undefined;
}

/**
 * Tính toán ngày giao hàng theo logic business
 */
export function calculateDeliveryDate(params: DeliveryCalculationParams): Date {
  const {
    productCode,
    quantity,
    inventoryTheoretical,
    districtLeadtime = 0,
    warehouseCode,
    customerIndustry,
    customerName,
    selectedPromotion,
    productLeadTime = 0,
    conversionFactor = 1,
    urgentOrder = false
  } = params;

  const today = new Date();

  // 1. Promotion lead time (promotion lead * 12 hours) when applicable
  const promo = selectedPromotion;
  const promoLeadRaw =
    promo?.cr1bb_leadtimepromotion ??
    promo?.leadtime ??
    promo?.leadTime ??
    promo?.lead_time ??
    promo?.value; // fallback - some APIs embed numeric in value

  const promoRecord = {
    cr1bb_leadtimepromotion: promoLeadRaw,
    cr1bb_phanloaichuongtrinh: (promo as any)?.phânLoai || (promo as any)?.type || undefined,
  };

  // Determine varNganhNghe ("Shop" or other)
  const varNganhNghe = determineCustomerIndustry(customerIndustry, customerName);

  // Product lead time (days) - try common fields from selectedProduct
  const currentProductLeadTime = productLeadTime;

  // Unit conversion factor
  const currentConversionFactor = conversionFactor;

  // Calculate delivery date following canvas logic:
  // 1) Promotion lead time (promotion lead * 12 hours) when applicable
  // 2) If customer is Shop -> district leadtime * 12 hours (we approximate using customerIndustry or name)
  // 3) If requestedQty * conversion > theoreticalStock -> Today + productLeadtime (days)
  // 4) Default Today + 1 day

  try {
    // Promotion lead time
    if (promoRecord.cr1bb_leadtimepromotion && Number(promoRecord.cr1bb_leadtimepromotion) > 0) {
      const promoLeadHours = Number(promoRecord.cr1bb_leadtimepromotion) * 12; // Convert to hours
      const deliveryDate = new Date(today.getTime() + promoLeadHours * 60 * 60 * 1000);
      return deliveryDate;
    }

    // Shop customer: district leadtime * 12 hours
    if (varNganhNghe === 'Shop' && districtLeadtime && districtLeadtime > 0) {
      const districtLeadHours = districtLeadtime * 12; // Convert to hours
      const deliveryDate = new Date(today.getTime() + districtLeadHours * 60 * 60 * 1000);
      return deliveryDate;
    }

    // Check if requested quantity exceeds available stock
    const requestedQty = quantity * currentConversionFactor;
    if (requestedQty > inventoryTheoretical) {
      // If product lead time > 0, use it; otherwise use warehouse default
      if (currentProductLeadTime > 0) {
        const deliveryDate = new Date(today);
        deliveryDate.setDate(today.getDate() + currentProductLeadTime);
        return deliveryDate;
      }
      // Fallback: use warehouse-based leadtime for out-of-stock items
      // KHOHCM: +2 days, KHOBD: +4 days, others: +2 days
      const warehouseLeadTime = (warehouseCode === 'KHOBD') ? 4 : 2;
      const deliveryDate = new Date(today);
      deliveryDate.setDate(today.getDate() + warehouseLeadTime);
      return deliveryDate;
    }

    // Urgent order: same day delivery
    if (urgentOrder) {
      return today;
    }

    // Default: Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;

  } catch (error) {
    console.error('Error calculating delivery date:', error);
    // Fallback to tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }
}

/**
 * Format date to dd/mm/yyyy string
 */
export function formatDateToDisplay(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Convert dd/mm/yyyy string to ISO date string for input[type="date"]
 */
export function formatDisplayDateToIso(displayDate?: string): string {
  if (!displayDate) return '';
  const parts = displayDate.split('/');
  if (parts.length !== 3) return '';
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return '';
  return `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/**
 * Convert ISO date string to dd/mm/yyyy display format
 */
export function formatIsoToDisplay(isoDate?: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';
  const [yyyy, mm, dd] = parts;
  if (!dd || !mm || !yyyy) return '';
  return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy.padStart(4, '0')}`;
}
