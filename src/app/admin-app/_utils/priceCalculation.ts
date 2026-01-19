/**
 * Price Calculation Utilities
 * Tách logic tính toán giá từ ProductEntryForm để tái sử dụng và dễ maintain
 */

export interface PriceCalculationParams {
  quantity: number;
  price: number;
  discountPercent?: number;
  promotionDiscountPercent?: number;
  vatPercent?: number;
}

export interface PriceCalculationResult {
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  discountedPrice: number;
  discountFactor: number;
}

/**
 * Tính toán giá sản phẩm với chiết khấu và VAT
 */
export function calculatePrices({
  quantity,
  price,
  discountPercent = 0,
  promotionDiscountPercent = 0,
  vatPercent = 0
}: PriceCalculationParams): PriceCalculationResult {
  // Tính chiết khấu
  const promoDiscountPct = discountPercent || promotionDiscountPercent || 0;
  const discountFactor = 1 - (promoDiscountPct > 0 ? promoDiscountPct / 100 : 0);
  const discountedPrice = price * discountFactor;
  const roundedDiscountedPrice = Math.round(discountedPrice);

  // Tính thành tiền
  const subtotal = quantity * roundedDiscountedPrice;

  // Tính VAT
  const vatAmount = Math.round(((subtotal * vatPercent) / 100) * 100) / 100;

  // Tổng tiền
  const totalAmount = subtotal + vatAmount;

  return {
    subtotal,
    vatAmount,
    totalAmount,
    discountedPrice: roundedDiscountedPrice,
    discountFactor
  };
}

/**
 * Tạo công thức tính toán để hiển thị tooltip
 */
export function generatePriceFormula({
  quantity,
  price,
  discountPercent = 0,
  promotionDiscountPercent = 0,
  vatPercent = 0,
  result
}: PriceCalculationParams & { result: PriceCalculationResult }): string {
  const promoDiscountPct = discountPercent || promotionDiscountPercent || 0;

  let formula = `CÔNG THỨC TÍNH THÀNH TIỀN\n`;
  formula += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  formula += `Số lượng: ${quantity.toLocaleString('vi-VN')}\n`;
  formula += `Giá đơn vị (sau chiết khấu, chưa VAT): ${result.discountedPrice.toLocaleString('vi-VN')} ₫\n\n`;
  formula += `Tính toán:\n`;
  formula += `${quantity.toLocaleString('vi-VN')} × ${result.discountedPrice.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${result.subtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return formula;
}

/**
 * Tạo công thức tính tổng tiền với VAT
 */
export function generateTotalFormula(result: PriceCalculationResult, vatPercent: number): string {
  const vatAmountCalc = result.vatAmount;

  let formula = `CÔNG THỨC TÍNH TỔNG TIỀN\n`;
  formula += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  formula += `Thành tiền: ${result.subtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
  formula += `VAT (${vatPercent}%): ${vatAmountCalc.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
  formula += `Tính toán:\n`;
  formula += `${result.subtotal.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + ${vatAmountCalc.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${result.totalAmount.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return formula;
}
