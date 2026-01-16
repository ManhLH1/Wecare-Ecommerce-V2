/**
 * Utility to compute delivery date following updated business logic (2025).
 *
 * New Priority (2025):
 * 1) Leadtime theo quận/huyện (sales setting) - KHÔNG áp dụng weekend reset
 * 2) Rule cho hàng thiếu tồn kho (CHỈ áp dụng weekend reset):
 *    - Kho HCM: +2 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
 *    - Kho Bình Định: +4 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
 * 3) Cut-off & weekend (CHỈ áp dụng cho hàng thiếu tồn):
 *    - Weekend reset: Thứ 7 sau 12:00 và Chủ nhật → coi như sáng Thứ 2
 * 4) Chủ nhật adjustment: Nếu leadtime rơi vào Chủ nhật → dời sang Thứ 2 (luôn áp dụng cho kho HCM)
 *
 * Legacy Priority (before 2025) - Keep for backward compatibility:
 * 1) Promotion lead time (promotion.cr1bb_leadtimepromotion * 12 hours)
 * 2) If customer is "Shop" -> var_leadtime_quanhuyen * 12 hours
 * 3) If requestedQty * unitConversion > theoreticalStock -> Today + productLeadtime (days)
 * 4) Default -> Today + 1 working day
 */
export type PromotionRecord = {
    cr1bb_leadtimepromotion?: string | number | null;
    cr1bb_phanloaichuongtrinh?: string | null;
    name?: string; // For checking Apollo/Kim Tín promotions
};

function addHours(base: Date, hours: number): Date {
    const d = new Date(base);
    d.setHours(d.getHours() + Math.round(hours));
    return d;
}

function addDays(base: Date, days: number): Date {
    // preserve time if base has specific time; when called with Today(), caller can pass midnight
    const d = new Date(base);
    d.setDate(d.getDate() + Math.round(days));
    return d;
}

// Add working days (skip weekends)
function addWorkingDays(base: Date, days: number): Date {
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
}

// Add working days but support fractional days (districtLeadtime in "ca", 1 ca = 12 hours)
// Count only hours that fall on working days (Mon-Fri). Weekend hours are skipped.
function addWorkingDaysWithFraction(base: Date, days: number, warehouseCode?: string): Date {
    const d = new Date(base);

    const totalHours = Math.round(days * 12);
    if (totalHours <= 0) return d;

    // For HCM warehouse: skip weekend hours (Mon-Fri only) — existing behavior
    if (warehouseCode === 'KHOHCM') {
        // If base falls on weekend, advance to next Monday keeping the same hour
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
            // Only count hours that fall on Mon-Fri
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                remainingHours--;
            } else {
                // If we hit weekend, fast-forward to next Monday at same hour
                if (dayOfWeek === 6) {
                    d.setDate(d.getDate() + 2);
                } else if (dayOfWeek === 0) {
                    d.setDate(d.getDate() + 1);
                }
            }
        }

        return d;
    }

    // For other warehouses (e.g., KHOBD): count hours continuously, do not skip weekends
    d.setHours(d.getHours() + totalHours);
    return d;
}

// Check if promotion is from Apollo or Kim Tín
function isApolloKimTinPromotion(promotion?: PromotionRecord | null): boolean {
    if (!promotion?.name) return false;
    const name = promotion.name.toLowerCase();
    return name.includes('apollo') || name.includes('kim tín');
}

// Get weekend reset time (next Monday morning)
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

// Apply Sunday adjustment for HCM warehouse
function applySundayAdjustment(resultDate: Date, warehouseCode?: string): Date {
    if (warehouseCode === 'KHOHCM' && resultDate.getDay() === 0) {
        // Sunday → Monday
        return addDays(resultDate, 1);
    }
    return resultDate;
}

export function computeDeliveryDate(params: {
    // New parameters (2025)
    warehouseCode?: string; // 'KHOHCM' | 'KHOBD'
    orderCreatedOn?: Date | string; // Order creation timestamp
    districtLeadtime?: number; // Leadtime theo quận/huyện (ca)

    // Legacy parameters (keep for backward compatibility)
    promotion?: PromotionRecord | null;
    varNganhNghe?: string | null; // "Shop" or other
    var_leadtime_quanhuyen?: number; // numeric leadtime (used *12 hours for Shop)
    var_input_soluong?: number; // requested quantity
    var_selected_donvi_conversion?: number; // 'Giá trị chuyển đổi (Chuyển đổi/chuẩn)'
    var_selected_SP_tonkho?: number; // 'Tồn kho lý thuyết (bỏ mua) - BD'
    var_selected_SP_leadtime?: number; // product lead time in days
    now?: Date; // optional override for testing; used for Now()
    today?: Date; // optional override for testing; used for Today()
}): Date {
    console.log('🧮 [computeDeliveryDate] Starting calculation with params:', {
        warehouseCode: params.warehouseCode,
        districtLeadtime: params.districtLeadtime,
        orderCreatedOn: params.orderCreatedOn,
        var_input_soluong: params.var_input_soluong,
        var_selected_SP_tonkho: params.var_selected_SP_tonkho,
        promotion: params.promotion?.name,
        varNganhNghe: params.varNganhNghe
    });
    const {
        // New params
        warehouseCode,
        orderCreatedOn,
        districtLeadtime,

        // Legacy params
        promotion,
        varNganhNghe,
        var_leadtime_quanhuyen = 0,
        var_input_soluong = 0,
        var_selected_donvi_conversion = 1,
        var_selected_SP_tonkho = 0,
        var_selected_SP_leadtime = 0,
        now = new Date(),
        today,
    } = params;

    const effectiveNow = now;
    const effectiveToday = today ?? new Date(new Date(effectiveNow).setHours(0, 0, 0, 0));

    // Parse order creation time
    let orderTime = effectiveNow;
    if (orderCreatedOn) {
        orderTime = typeof orderCreatedOn === 'string'
            ? new Date(orderCreatedOn)
            : orderCreatedOn;
    }

    console.log('📅 [computeDeliveryDate] Order time parsed:', {
        orderTime: orderTime.toISOString(),
        orderDayOfWeek: orderTime.getDay(),
        orderHours: orderTime.getHours()
    });

    // Pre-calc stock info (used by both district and out-of-stock logic)
    const requestedQty = var_input_soluong * var_selected_donvi_conversion;
    const theoreticalStock = var_selected_SP_tonkho ?? 0;

    // Determine out-of-stock per warehouse rules:
    // - For KHOHCM: shortage when theoreticalStock <= 0
    // - For KHOBD: shortage when BD stock <= 0 OR requestedQty - BD_stock > 0
    // - For other warehouses: shortage when requestedQty > theoreticalStock
    let isOutOfStock = false;
    if (warehouseCode === 'KHOHCM') {
        isOutOfStock = theoreticalStock <= 0;
    } else if (warehouseCode === 'KHOBD') {
        const bdStock = theoreticalStock; // No separate BD var available; use provided stock
        isOutOfStock = bdStock <= 0 || (requestedQty - bdStock) > 0;
    } else {
        isOutOfStock = requestedQty > theoreticalStock;
    }

    console.log('📦 [computeDeliveryDate] Stock check (pre):', {
        requestedQty,
        theoreticalStock,
        isOutOfStock,
        warehouseCode
    });

    // NEW LOGIC (2025) - Priority 1: District leadtime
    // Behavior changed: if out-of-stock, add warehouse/promotion extra ca on top of districtLeadtime.
    if (districtLeadtime && districtLeadtime > 0) {
        console.log('🎯 [computeDeliveryDate] Using DISTRICT LEADTIME logic (priority highest):', districtLeadtime);

        if (isOutOfStock && warehouseCode) {
            // Determine extra ca for out-of-stock (respect promotion override for Apollo/Kim Tín)
            let extraCaForOutOfStock = 0;
            if (isApolloKimTinPromotion(promotion)) {
                const promoLeadRaw = promotion?.cr1bb_leadtimepromotion;
                const promoLeadNum = promoLeadRaw !== undefined && promoLeadRaw !== null ? Number(promoLeadRaw) : NaN;
                extraCaForOutOfStock = Number.isFinite(promoLeadNum) && promoLeadNum > 0 ? Math.round(promoLeadNum) : 6;
            } else if (warehouseCode === 'KHOHCM') {
                extraCaForOutOfStock = 2;
            } else if (warehouseCode === 'KHOBD') {
                extraCaForOutOfStock = 4;
            }

            // For out-of-stock items, weekend reset IS applied before adding extra ca
            const effectiveOrderTime = getWeekendResetTime(orderTime);
            console.log('⏰ [computeDeliveryDate] District + Out-of-stock -> After weekend reset:', {
                originalTime: orderTime.toISOString(),
                effectiveTime: effectiveOrderTime.toISOString(),
                wasReset: effectiveOrderTime.getTime() !== orderTime.getTime()
            });

            const totalCa = districtLeadtime + extraCaForOutOfStock;
            let result = addWorkingDaysWithFraction(effectiveOrderTime, totalCa);
            console.log('📅 [computeDeliveryDate] After addWorkingDays (district + extra):', {
                totalCa,
                result: result.toISOString(),
                resultDayOfWeek: result.getDay()
            });

            // Apply Sunday adjustment for HCM warehouse
            result = applySundayAdjustment(result, warehouseCode);
            console.log('📅 [computeDeliveryDate] After Sunday adjustment (district + extra):', {
                result: result.toISOString(),
                resultDayOfWeek: result.getDay()
            });

            console.log('✅ [computeDeliveryDate] DISTRICT LEADTIME + OUT-OF-STOCK result:', result.toISOString());

            // LOG FINAL FORMULA AND REASON
            logFinalFormulaAndReason(params, result, {
                districtLeadtime,
                isOutOfStock: true,
                warehouseCode,
                leadtimeCa: extraCaForOutOfStock,
                isApolloKimTin: isApolloKimTinPromotion(promotion),
                weekendResetApplied: effectiveOrderTime.getTime() !== orderTime.getTime(),
                sundayAdjustmentApplied: applySundayAdjustment(new Date(result), warehouseCode).getTime() !== result.getTime()
            });

            return result;
        } else {
            // Not out-of-stock: original district leadtime behavior (no weekend reset)
            let result = addWorkingDaysWithFraction(orderTime, districtLeadtime);
            console.log('📅 [computeDeliveryDate] After addWorkingDays (district):', {
                result: result.toISOString(),
                resultDayOfWeek: result.getDay()
            });

            // Apply Sunday adjustment for HCM warehouse (district result may still fall on Sunday)
            result = applySundayAdjustment(result, warehouseCode);
            console.log('📅 [computeDeliveryDate] After Sunday adjustment (district):', {
                result: result.toISOString(),
                resultDayOfWeek: result.getDay(),
                warehouseCode
            });

            console.log('✅ [computeDeliveryDate] DISTRICT LEADTIME result (no extension):', result.toISOString());

            // LOG FINAL FORMULA AND REASON
            logFinalFormulaAndReason(params, result, {
                districtLeadtime,
                isOutOfStock: isOutOfStock,
                warehouseCode,
                weekendResetApplied: false,
                sundayAdjustmentApplied: applySundayAdjustment(new Date(result), warehouseCode).getTime() !== result.getTime()
            });

            return result;
        }
    }

    // NEW LOGIC (2025) - Priority 2: Out of stock rules by warehouse
    // IMPORTANT: Weekend reset CHỈ áp dụng cho out-of-stock items
    if (isOutOfStock && warehouseCode) {
        console.log('🚨 [computeDeliveryDate] OUT OF STOCK detected, applying rules for:', warehouseCode);

        // Apply weekend reset for out-of-stock items only
        let effectiveOrderTime = getWeekendResetTime(orderTime);
        console.log('⏰ [computeDeliveryDate] After weekend reset:', {
            originalTime: orderTime.toISOString(),
            effectiveTime: effectiveOrderTime.toISOString(),
            wasReset: effectiveOrderTime.getTime() !== orderTime.getTime()
        });

        let leadtimeCa = 0;

        if (warehouseCode === 'KHOHCM') {
            // Kho HCM: +2 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
            leadtimeCa = isApolloKimTinPromotion(promotion) ? 6 : 2;
            console.log('🏭 [computeDeliveryDate] HCM warehouse - leadtime:', {
                leadtimeCa,
                isApolloKimTin: isApolloKimTinPromotion(promotion),
                promotion: promotion?.name
            });
        } else if (warehouseCode === 'KHOBD') {
            // Kho Bình Định: +4 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
            leadtimeCa = isApolloKimTinPromotion(promotion) ? 6 : 4;
            console.log('🏭 [computeDeliveryDate] Bình Định warehouse - leadtime:', {
                leadtimeCa,
                isApolloKimTin: isApolloKimTinPromotion(promotion),
                promotion: promotion?.name
            });
        }

        if (leadtimeCa > 0) {
            let result = addWorkingDaysWithFraction(effectiveOrderTime, leadtimeCa);
            console.log('📅 [computeDeliveryDate] After addWorkingDays:', {
                result: result.toISOString(),
                resultDayOfWeek: result.getDay()
            });

            // Apply Sunday adjustment for HCM warehouse
            result = applySundayAdjustment(result, warehouseCode);
            console.log('📅 [computeDeliveryDate] After Sunday adjustment:', {
                result: result.toISOString(),
                resultDayOfWeek: result.getDay()
            });

            console.log('✅ [computeDeliveryDate] OUT OF STOCK result:', result.toISOString());

            // LOG FINAL FORMULA AND REASON
            logFinalFormulaAndReason(params, result, {
                districtLeadtime: 0,
                isOutOfStock: true,
                warehouseCode,
                leadtimeCa,
                isApolloKimTin: isApolloKimTinPromotion(promotion),
                weekendResetApplied: effectiveOrderTime.getTime() !== orderTime.getTime(),
                sundayAdjustmentApplied: applySundayAdjustment(new Date(result), warehouseCode).getTime() !== result.getTime()
            });

            return result;
        }
    }

    // LEGACY LOGIC (before 2025) - Keep for backward compatibility

    // Helper: parse promotion lead time to number if present and non-blank
    const promoLeadRaw = promotion?.cr1bb_leadtimepromotion;
    const promoLead = promoLeadRaw !== undefined && promoLeadRaw !== null && String(promoLeadRaw).trim() !== ''
        ? Number(promoLeadRaw)
        : undefined;
    const promoPhanLoai = promotion?.cr1bb_phanloaichuongtrinh;

    // 1) Promotion lead time (mirror Canvas logic)
    // If promotion selected AND promotion.cr1bb_leadtimepromotion is not blank
    // AND (phân loại is blank OR phân loại = 'Hãng') -> apply promo lead time (hours = value * 12)
    if (
        promotion &&
        promoLead !== undefined &&
        (
            promoPhanLoai === undefined ||
            promoPhanLoai === null ||
            String(promoPhanLoai).trim() === '' ||
            promoPhanLoai === 'Hãng'
        )
    ) {
        let result = addHours(effectiveNow, promoLead * 12);
        // Apply Sunday adjustment for HCM warehouse
        result = applySundayAdjustment(result, warehouseCode);
        return result;
    }

    // 2) If customer is "Shop" -> use district leadtime * 12 hours
    if (varNganhNghe === 'Shop') {
        let result = addHours(effectiveNow, var_leadtime_quanhuyen * 12);
        // Apply Sunday adjustment for HCM warehouse
        result = applySundayAdjustment(result, warehouseCode);
        return result;
    }

    // 3) Inventory check: requestedQty * conversion > theoreticalStock -> Today + product lead time (days)
    if (isOutOfStock) {
        // Apply weekend reset for legacy out-of-stock logic
        let effectiveOrderTime = getWeekendResetTime(orderTime);
        const result = addDays(effectiveToday, var_selected_SP_leadtime);
        return result;
    }

    // 4) Default: Today + 1 working day (no weekend reset for in-stock items)
    console.log('📅 [computeDeliveryDate] Using DEFAULT logic (+1 working day)');
    const result = addWorkingDays(orderTime, 1);
    console.log('📅 [computeDeliveryDate] After addWorkingDays (default):', {
        result: result.toISOString(),
        resultDayOfWeek: result.getDay()
    });

    // FINAL STEP: Apply Sunday adjustment for HCM warehouse (always, regardless of stock status)
    const finalResult = applySundayAdjustment(result, warehouseCode);
    console.log('📅 [computeDeliveryDate] After Sunday adjustment (final):', {
        finalResult: finalResult.toISOString(),
        finalResultDayOfWeek: finalResult.getDay(),
        warehouseCode
    });

    console.log('✅ [computeDeliveryDate] FINAL RESULT:', finalResult.toISOString());

    // LOG FINAL FORMULA AND REASON
    logFinalFormulaAndReason(params, finalResult, {
        districtLeadtime: 0,
        isOutOfStock: false,
        warehouseCode,
        leadtimeCa: 1, // Default +1 working day
        isApolloKimTin: false,
        weekendResetApplied: false,
        sundayAdjustmentApplied: applySundayAdjustment(new Date(finalResult), warehouseCode).getTime() !== finalResult.getTime()
    });

    return finalResult;
}

// Log final formula and reason for delivery date calculation
function logFinalFormulaAndReason(
    params: any,
    finalResult: Date,
    calculationDetails: {
        districtLeadtime?: number;
        isOutOfStock?: boolean;
        warehouseCode?: string;
        leadtimeCa?: number;
        isApolloKimTin?: boolean;
        weekendResetApplied?: boolean;
        sundayAdjustmentApplied?: boolean;
    }
) {
    const {
        districtLeadtime,
        isOutOfStock,
        warehouseCode,
        leadtimeCa,
        isApolloKimTin,
        weekendResetApplied,
        sundayAdjustmentApplied
    } = calculationDetails;

    console.log('\n' + '='.repeat(80));
    console.log('📊 CÔNG THỨC TÍNH NGÀY GIAO CUỐI CÙNG');
    console.log('='.repeat(80));

    // Determine which logic was applied
    let appliedLogic = '';
    let formula = '';
    let reason = '';

    if (districtLeadtime && districtLeadtime > 0) {
        appliedLogic = '🎯 DISTRICT LEADTIME (Ưu tiên cao nhất)';
        formula = `Ngày tạo đơn + ${districtLeadtime} ca làm việc`;
        reason = `Có leadtime quận/huyện = ${districtLeadtime} ca. Luôn ưu tiên district leadtime trước.`;
    } else if (isOutOfStock && warehouseCode) {
        appliedLogic = '🚨 OUT OF STOCK RULES';
        const warehouseName = warehouseCode === 'KHOHCM' ? 'HCM' : 'Bình Định';
        const promotionText = isApolloKimTin ? ' (có promotion Apollo/Kim Tín)' : ' (bình thường)';
        formula = `Ngày tạo đơn ${weekendResetApplied ? '(đã reset weekend)' : ''} + ${leadtimeCa} ca làm việc`;
        reason = `Hết hàng tại kho ${warehouseName}${promotionText}. Áp dụng rules đặc biệt cho hàng thiếu tồn kho.`;
    } else {
        appliedLogic = '📅 DEFAULT CASE';
        formula = `Ngày tạo đơn + 1 ca làm việc`;
        reason = `Không có district leadtime và còn hàng trong kho. Áp dụng rule mặc định.`;
    }

    console.log(`🔍 LOGIC ÁP DỤNG: ${appliedLogic}`);
    console.log(`📐 CÔNG THỨC: ${formula}`);
    console.log(`💡 LÝ DO: ${reason}`);

    // Input parameters
    console.log('\n📥 THAM SỐ ĐẦU VÀO:');
    console.log(`   - Kho: ${warehouseCode || 'N/A'}`);
    console.log(`   - District Leadtime: ${districtLeadtime || 0} ca`);
    console.log(`   - Số lượng yêu cầu: ${params.var_input_soluong || 0}`);
    console.log(`   - Tồn kho: ${params.var_selected_SP_tonkho || 0}`);
    console.log(`   - Hết hàng: ${isOutOfStock ? 'Có' : 'Không'}`);
    if (params.promotion?.name) {
        console.log(`   - Promotion: ${params.promotion.name}`);
    }

    // Applied rules
    console.log('\n⚙️  RULES ĐƯỢC ÁP DỤNG:');
    if (weekendResetApplied) {
        console.log(`   ✅ Weekend Reset: Thứ 7 sau 12:00 hoặc Chủ nhật → Reset sang sáng Thứ 2`);
    } else {
        console.log(`   ❌ Weekend Reset: Không áp dụng (không phải out-of-stock)`);
    }

    if (sundayAdjustmentApplied) {
        console.log(`   ✅ Sunday Adjustment: Kết quả rơi vào Chủ nhật → Dời sang Thứ 2 (chỉ HCM)`);
    } else {
        console.log(`   ❌ Sunday Adjustment: Không áp dụng (không phải Chủ nhật hoặc không phải HCM)`);
    }

    // Final result
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const finalDayName = dayNames[finalResult.getDay()];
    const finalDateStr = finalResult.toLocaleDateString('vi-VN');

    // Calculate total working days (ca)
    // When out-of-stock, add warehouse-specific extra ca:
    //  - KHOHCM: +2 ca (or +6 ca if Apollo/Kim Tín promotion)
    //  - KHOBD:  +4 ca (or +6 ca if Apollo/Kim Tín promotion)
    let totalWorkingDays = 0;
    let extraCa = 0;
    if (isOutOfStock && warehouseCode) {
        if (isApolloKimTin) {
            // If promotion defines a leadtime (cr1bb_leadtimepromotion), use it (units = ca).
            // Fallback to 6 ca if promotion value is missing/invalid.
            const promoLeadRaw = params.promotion?.cr1bb_leadtimepromotion;
            const promoLeadNum = promoLeadRaw !== undefined && promoLeadRaw !== null ? Number(promoLeadRaw) : NaN;
            extraCa = Number.isFinite(promoLeadNum) && promoLeadNum > 0 ? Math.round(promoLeadNum) : 6;
        } else if (warehouseCode === 'KHOHCM') {
            extraCa = 2;
        } else if (warehouseCode === 'KHOBD') {
            extraCa = 4;
        }
    }

    if (districtLeadtime && districtLeadtime > 0) {
        // Include district leadtime and, if out-of-stock, add warehouse extra ca
        totalWorkingDays = districtLeadtime + (isOutOfStock ? extraCa : 0);
    } else if (isOutOfStock) {
        // Prefer explicit leadtimeCa when provided; otherwise derive from extraCa
        totalWorkingDays = (typeof leadtimeCa === 'number' && leadtimeCa > 0) ? leadtimeCa : (extraCa > 0 ? extraCa : 2);
    } else {
        totalWorkingDays = 2; // Default case (kept as current default)
    }

    console.log('\n🎯 KẾT QUẢ CUỐI CÙNG:');
    console.log(`   📅 Ngày giao: ${finalDateStr} (${finalDayName})`);
    console.log(`   ⏰ Thời gian: ${finalResult.toLocaleTimeString('vi-VN')}`);
    console.log(`   📊 ISO String: ${finalResult.toISOString()}`);
    console.log(`   🔢 Tổng số ca: ${totalWorkingDays} ca`);

    console.log('='.repeat(80) + '\n');
}

// Test function for delivery date calculations
export function testDeliveryDateCalculations() {
    console.log('🧪 Testing Delivery Date Calculations...');

    const testCases = [
        {
            name: 'District Leadtime Priority',
            params: {
                districtLeadtime: 2, // 2 working days
                now: new Date('2025-01-15T10:00:00'), // Wednesday
            },
            expected: '2025-01-17' // Friday (skip Thursday)
        },
        {
            name: 'District Leadtime - NO Weekend Reset',
            params: {
                districtLeadtime: 1,
                orderCreatedOn: new Date('2025-01-18T14:00:00'), // Saturday 2:00 PM
            },
            expected: '2025-01-20' // Saturday + 1 working day = Monday (NO weekend reset)
        },
        {
            name: 'Out of Stock HCM Normal',
            params: {
                warehouseCode: 'KHOHCM',
                var_input_soluong: 10,
                var_selected_donvi_conversion: 1,
                var_selected_SP_tonkho: 5, // Out of stock
                now: new Date('2025-01-15T10:00:00'),
            },
            expected: '2025-01-17' // +2 working days
        },
        {
            name: 'Out of Stock HCM Apollo Promotion',
            params: {
                warehouseCode: 'KHOHCM',
                var_input_soluong: 10,
                var_selected_donvi_conversion: 1,
                var_selected_SP_tonkho: 5, // Out of stock
                promotion: { name: 'Apollo Special Promotion' },
                now: new Date('2025-01-15T10:00:00'),
            },
            expected: '2025-01-23' // +6 working days
        },
        {
            name: 'Out of Stock Binh Dinh Normal',
            params: {
                warehouseCode: 'KHOBD',
                var_input_soluong: 10,
                var_selected_donvi_conversion: 1,
                var_selected_SP_tonkho: 5, // Out of stock
                now: new Date('2025-01-15T10:00:00'),
            },
            expected: '2025-01-21' // +4 working days
        },
        {
            name: 'Weekend Reset - Saturday after 12:00 (Out of Stock)',
            params: {
                warehouseCode: 'KHOHCM',
                var_input_soluong: 10,
                var_selected_donvi_conversion: 1,
                var_selected_SP_tonkho: 5, // Out of stock
                orderCreatedOn: new Date('2025-01-18T14:00:00'), // Saturday 2:00 PM
            },
            expected: '2025-01-21' // Monday + 2 working days = Wednesday
        },
        {
            name: 'Weekend Reset - Sunday (Out of Stock)',
            params: {
                warehouseCode: 'KHOHCM',
                var_input_soluong: 10,
                var_selected_donvi_conversion: 1,
                var_selected_SP_tonkho: 5, // Out of stock
                orderCreatedOn: new Date('2025-01-19T10:00:00'), // Sunday
            },
            expected: '2025-01-21' // Monday + 2 working days = Wednesday
        },
        {
            name: 'Sunday Adjustment HCM',
            params: {
                warehouseCode: 'KHOHCM',
                districtLeadtime: 1,
                orderCreatedOn: new Date('2025-01-17T10:00:00'), // Friday -> result Sunday
            },
            expected: '2025-01-21' // Monday (Sunday adjusted)
        },
        {
            name: 'Legacy Promotion Lead Time',
            params: {
                promotion: {
                    cr1bb_leadtimepromotion: 1.5,
                    cr1bb_phanloaichuongtrinh: 'Hãng'
                },
                now: new Date('2025-01-15T10:00:00'),
            },
            expected: '2025-01-15' // +18 hours = same day
        },
        {
            name: 'Shop Customer Legacy',
            params: {
                varNganhNghe: 'Shop',
                var_leadtime_quanhuyen: 2,
                now: new Date('2025-01-15T10:00:00'),
            },
            expected: '2025-01-15' // +24 hours = same day
        },
        {
            name: 'Out of Stock Legacy',
            params: {
                var_input_soluong: 10,
                var_selected_donvi_conversion: 1,
                var_selected_SP_tonkho: 5, // Out of stock
                var_selected_SP_leadtime: 3, // 3 days
                now: new Date('2025-01-15T10:00:00'),
            },
            expected: '2025-01-18' // +3 days
        },
        {
            name: 'Default Case',
            params: {
                now: new Date('2025-01-15T10:00:00'),
            },
            expected: '2025-01-16' // +1 working day
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach((testCase, index) => {
        try {
            const result = computeDeliveryDate(testCase.params);
            const resultDate = result.toISOString().split('T')[0];

            if (resultDate === testCase.expected) {
                console.log(`✅ Test ${index + 1}: ${testCase.name} - PASSED`);
                passed++;
            } else {
                console.log(`❌ Test ${index + 1}: ${testCase.name} - FAILED`);
                console.log(`   Expected: ${testCase.expected}, Got: ${resultDate}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ Test ${index + 1}: ${testCase.name} - ERROR: ${error}`);
            failed++;
        }
    });

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    return { passed, failed, total: testCases.length };
}


