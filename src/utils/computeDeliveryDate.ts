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

// Add days with fraction support (24/7, no weekend skip)
// Used for: district leadtime (Rule 1) - IN-STOCK items
// 1 ca = 12 hours, count continuously including T7/CN
function addDaysWithFraction(base: Date, days: number): Date {
    const d = new Date(base);
    const totalHours = Math.round(days * 12);
    if (totalHours <= 0) return d;
    
    // Count hours continuously, do not skip weekends (24/7)
    d.setHours(d.getHours() + totalHours);
    return d;
}

// Add working days with fraction support (Mon-Fri only, skip weekends)
// Used for: out-of-stock items (Rule 2)
// 1 ca = 12 hours, count only Mon-Fri hours
function addWorkingDaysWithFraction(base: Date, days: number): Date {
    const d = new Date(base);

    const totalHours = Math.round(days * 12);
    if (totalHours <= 0) return d;

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

// Apply weekend adjustment for HCM warehouse:
// - If result falls on Saturday afternoon (>=12:00) or any Sunday,
//   push the result to next Monday at 08:00.
// - This preserves behavior where we allow weekend hours to be counted,
//   but ensures HCM deliveries are not scheduled on Sat afternoon or Sun.
function applySundayAdjustment(resultDate: Date, warehouseCode?: string): Date {
    if (warehouseCode === 'KHOHCM') {
        const day = resultDate.getDay(); // 0 = Sun, 6 = Sat
        const hour = resultDate.getHours();
        if (day === 0 || (day === 6 && hour >= 12)) {
            const daysToAdd = day === 0 ? 1 : 2; // Sun -> Mon (+1), Sat -> Mon (+2)
            const monday = new Date(resultDate);
            monday.setDate(resultDate.getDate() + daysToAdd);
            monday.setHours(8, 0, 0, 0); // set to 08:00 on Monday
            return monday;
        }
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

    // 🎯 INPUT ANALYSIS
    console.log('🎯 ===== TÍNH NGÀY GIAO HÀNG =====');
    console.log('📊 THÔNG TIN ĐẶT HÀNG:');
    console.log(`   📍 Kho: ${warehouseCode || 'Không xác định'}`);
    console.log(`   ⏰ Thời gian đặt: ${orderCreatedOn ? (typeof orderCreatedOn === 'string' ? orderCreatedOn : orderCreatedOn.toISOString()) : 'Bây giờ'}`);
    console.log(`   🏘️  Leadtime quận: ${districtLeadtime ? districtLeadtime + ' ca' : 'Không có'}`);
    console.log(`   👤 Loại khách: ${varNganhNghe || 'Không xác định'}`);
    console.log(`   📦 Số lượng: ${var_input_soluong} x ${var_selected_donvi_conversion} = ${var_input_soluong * var_selected_donvi_conversion}`);
    console.log(`   📈 Tồn kho: ${var_selected_SP_tonkho || 0}`);
    console.log(`   🎁 Khuyến mãi: ${promotion?.name || 'Không có'} ${promotion?.cr1bb_leadtimepromotion ? `(+${promotion.cr1bb_leadtimepromotion} ca)` : ''}`);

    const effectiveNow = now;
    const effectiveToday = today ?? new Date(new Date(effectiveNow).setHours(0, 0, 0, 0));

    // Parse order creation time
    let orderTime = effectiveNow;
    if (orderCreatedOn) {
        orderTime = typeof orderCreatedOn === 'string'
            ? new Date(orderCreatedOn)
            : orderCreatedOn;
    }

    // Pre-calc stock info (used by both district and out-of-stock logic)
    const requestedQty = var_input_soluong * var_selected_donvi_conversion;
    const theoreticalStock = var_selected_SP_tonkho ?? 0;

    // Determine out-of-stock per warehouse rules:
    // - For KHOHCM: shortage when requestedQty > theoreticalStock (so check SO doesn't exceed stock)
    //   This ensures we don't over-allocate inventory across multiple SOs
    // - For KHOBD: shortage when BD stock <= 0 OR requestedQty > BD_stock
    //   (Check both negative stock AND insufficient stock for this SO)
    // - For other warehouses: shortage when requestedQty > theoreticalStock
    let isOutOfStock = false;
    if (warehouseCode === 'KHOHCM') {
        // HCM: Check if this SO's nhu cầu vượt quá tồn kho sẵn có
        // This prevents overselling - ensure sum of all SOs doesn't exceed inventory
        isOutOfStock = requestedQty > theoreticalStock;
    } else if (warehouseCode === 'KHOBD') {
        const bdStock = theoreticalStock; // No separate BD var available; use provided stock
        // BD: Check both negative stock AND insufficient for this specific SO
        isOutOfStock = bdStock <= 0 || (requestedQty > bdStock);
    } else {
        isOutOfStock = requestedQty > theoreticalStock;
    }

    console.log('\n📊 PHÂN TÍCH TỒN KHO:');
    console.log(`   📦 Cần: ${requestedQty} | Có: ${theoreticalStock}`);
    console.log(`   ⚠️  Trạng thái: ${isOutOfStock ? 'HẾT HÀNG' : 'CÒN HÀNG'}`);
    console.log(`   🏭 Quy tắc kho: ${warehouseCode === 'KHOHCM' ? 'HCM (cần > tồn = hết)' : warehouseCode === 'KHOBD' ? 'BD (≤0 hoặc cần > tồn = hết)' : 'Khác (cần > tồn = hết)'}`);

    // NEW LOGIC (2025) - Priority 1: District leadtime
    // Behavior changed: if out-of-stock, add warehouse/promotion extra ca on top of districtLeadtime.
    if (districtLeadtime && districtLeadtime > 0) {
        console.log('\n🚀 LOGIC MỚI 2025 - ƯU TIÊN 1: LEADTIME QUẬN/HUYỆN');
        console.log(`   🏘️  Leadtime quận: ${districtLeadtime} ca`);

        if (isOutOfStock && warehouseCode) {
            console.log('   📦 Tình huống: HẾT HÀNG + Leadtime quận');
            console.log('   ➕ Thêm ca bổ sung cho hàng hết tồn...');

            // Determine extra ca for out-of-stock (respect promotion override for Apollo/Kim Tín)
            let extraCaForOutOfStock = 0;
            if (isApolloKimTinPromotion(promotion)) {
                const promoLeadRaw = promotion?.cr1bb_leadtimepromotion;
                const promoLeadNum = promoLeadRaw !== undefined && promoLeadRaw !== null ? Number(promoLeadRaw) : NaN;
                extraCaForOutOfStock = Number.isFinite(promoLeadNum) && promoLeadNum > 0 ? Math.round(promoLeadNum) : 6;
                console.log(`   🎯 Khuyến mãi Apollo/Kim Tín: +${extraCaForOutOfStock} ca`);
            } else if (warehouseCode === 'KHOHCM') {
                extraCaForOutOfStock = 2;
                console.log(`   🏭 Kho HCM: +${extraCaForOutOfStock} ca`);
            } else if (warehouseCode === 'KHOBD') {
                extraCaForOutOfStock = 4;
                console.log(`   🏭 Kho Bình Định: +${extraCaForOutOfStock} ca`);
            }
            
            // For out-of-stock items: NO weekend reset, calculate 24/7 directly
            // (Only in-stock orders get weekend reset special handling)
            const totalCa = districtLeadtime + extraCaForOutOfStock;
            console.log(`   📅 Tổng leadtime: ${totalCa} ca = ${districtLeadtime} (quận) + ${extraCaForOutOfStock} (bổ sung)`);
            console.log(`   ⏰ Không áp dụng Weekend Reset cho hàng HẾT HÀNG - Tính 24/7 trực tiếp`);
            
            // Kho HCM: Skip weekend (Mon-Fri only) | Kho BD: 24/7 calculation
            let result;
            if (warehouseCode === 'KHOHCM') {
                console.log(`   🏭 Kho HCM: Áp dụng Skip Weekend (chỉ tính Mon-Fri)`);
                result = addWorkingDaysWithFraction(orderTime, totalCa);
            } else {
                console.log(`   🏭 ${warehouseCode}: Tính 24/7 (không skip weekend)`);
                result = addDaysWithFraction(orderTime, totalCa);
            }

            // Apply Sunday adjustment for HCM warehouse
            result = applySundayAdjustment(result, warehouseCode);
            console.log(`   📆 NGÀY GIAO CUỐI CÙNG: ${result.toISOString().split('T')[0]} ${result.toLocaleTimeString('vi-VN')}`);
            console.log('   ✅ Hoàn thành tính toán');

            return result;
        } else {
            console.log('   📦 Tình huống: CÒN HÀNG + Leadtime quận');
            console.log('   ➖ Không áp dụng Weekend Reset');
            console.log('   📅 TÍNH 24/7 (T7/CN được tính)');

            // Not out-of-stock: district leadtime with 24/7 calculation (includes T7/CN)
            let result = addDaysWithFraction(orderTime, districtLeadtime);

            // Apply Sunday adjustment for HCM warehouse (district result may still fall on Sunday)
            result = applySundayAdjustment(result, warehouseCode);
            console.log(`   📆 NGÀY GIAO CUỐI CÙNG: ${result.toISOString().split('T')[0]} ${result.toLocaleTimeString('vi-VN')}`);
            console.log('   ✅ Hoàn thành tính toán');

            return result;
        }
    }

    // NEW LOGIC (2025) - Priority 2: Out of stock rules by warehouse
    // IMPORTANT: NO weekend reset for out-of-stock items - calculate 24/7 directly
    if (isOutOfStock && warehouseCode) {
        console.log('\n🚀 LOGIC MỚI 2025 - ƯU TIÊN 2: QUY TẮC HẾT HÀNG THEO KHO');
        console.log('   ⚠️  Không áp dụng Weekend Reset cho hàng HẾT HÀNG');

        let leadtimeCa = 0;

        if (warehouseCode === 'KHOHCM') {
            // Kho HCM: +2 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
            leadtimeCa = isApolloKimTinPromotion(promotion) ? 6 : 2;
            console.log(`   🏭 Kho HCM: ${leadtimeCa} ca ${isApolloKimTinPromotion(promotion) ? '(Khuyến mãi Apollo/Kim Tín)' : '(Bình thường)'}`);
        } else if (warehouseCode === 'KHOBD') {
            // Kho Bình Định: +4 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
            leadtimeCa = isApolloKimTinPromotion(promotion) ? 6 : 4;
            console.log(`   🏭 Kho Bình Định: ${leadtimeCa} ca ${isApolloKimTinPromotion(promotion) ? '(Khuyến mãi Apollo/Kim Tín)' : '(Bình thường)'}`);
        }

        if (leadtimeCa > 0) {
            // Kho HCM: Skip weekend (Mon-Fri only) | Kho BD: 24/7 calculation
            let result;
            if (warehouseCode === 'KHOHCM') {
                console.log(`   🏭 Kho HCM: Áp dụng Skip Weekend (chỉ tính Mon-Fri)`);
                result = addWorkingDaysWithFraction(orderTime, leadtimeCa);
            } else {
                console.log(`   🏭 ${warehouseCode}: Tính 24/7 (không skip weekend)`);
                result = addDaysWithFraction(orderTime, leadtimeCa);
            }
            // Apply Sunday adjustment for HCM warehouse
            result = applySundayAdjustment(result, warehouseCode);
            console.log(`   📆 NGÀY GIAO CUỐI CÙNG: ${result.toISOString().split('T')[0]} ${result.toLocaleTimeString('vi-VN')}`);
            console.log('   ✅ Hoàn thành tính toán');

            return result;
        }
    }

    // LEGACY LOGIC (before 2025) - Keep for backward compatibility
    console.log('\n🏗️  LOGIC CŨ (TRƯỚC 2025) - TƯƠNG THÍCH NGƯỢC');

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
        console.log('   🎯 Ưu tiên 1: Leadtime khuyến mãi');
        console.log(`   📅 Leadtime: ${promoLead} ca = ${promoLead * 12} giờ`);

        let result = addHours(effectiveNow, promoLead * 12);
        // Apply Sunday adjustment for HCM warehouse
        result = applySundayAdjustment(result, warehouseCode);
        console.log(`   📆 NGÀY GIAO CUỐI CÙNG: ${result.toISOString().split('T')[0]} ${result.toLocaleTimeString('vi-VN')}`);
        console.log('   ✅ Hoàn thành tính toán');

        return result;
    }

    // 2) If customer is "Shop" -> use district leadtime * 12 hours
    if (varNganhNghe === 'Shop') {
        console.log('   🏪 Ưu tiên 2: Khách hàng Shop');
        console.log(`   📅 Leadtime quận: ${var_leadtime_quanhuyen} ca = ${var_leadtime_quanhuyen * 12} giờ`);

        let result = addHours(effectiveNow, var_leadtime_quanhuyen * 12);
        // Apply Sunday adjustment for HCM warehouse
        result = applySundayAdjustment(result, warehouseCode);
        console.log(`   📆 NGÀY GIAO CUỐI CÙNG: ${result.toISOString().split('T')[0]} ${result.toLocaleTimeString('vi-VN')}`);
        console.log('   ✅ Hoàn thành tính toán');

        return result;
    }

    // 3) Inventory check: requestedQty * conversion > theoreticalStock -> Today + product lead time (days)
    if (isOutOfStock) {
        console.log('   📦 Ưu tiên 3: Hết hàng - Leadtime sản phẩm');
        console.log(`   📅 Leadtime sản phẩm: ${var_selected_SP_leadtime} ngày`);

        // Apply weekend reset for legacy out-of-stock logic
        let effectiveOrderTime = getWeekendResetTime(orderTime);
        console.log(`   ⏰ Áp dụng Weekend Reset: ${orderTime.toISOString()} → ${effectiveOrderTime.toISOString()}`);

        const result = addDays(effectiveToday, var_selected_SP_leadtime);
        console.log(`   📆 NGÀY GIAO CUỐI CÙNG: ${result.toISOString().split('T')[0]}`);
        console.log('   ✅ Hoàn thành tính toán');

        return result;
    }

    // 4) Default: Today + 1 working day (no weekend reset for in-stock items)
    console.log('   📦 Ưu tiên 4: Trường hợp mặc định');
    console.log('   📅 +1 ngày làm việc');

    const result = addWorkingDays(orderTime, 1);
    console.log(`   📆 Ngày giao trước điều chỉnh: ${result.toISOString().split('T')[0]} ${result.toLocaleTimeString('vi-VN')}`);

    // FINAL STEP: Apply Sunday adjustment for HCM warehouse (always, regardless of stock status)
    const finalResult = applySundayAdjustment(result, warehouseCode);
    console.log(`   📆 NGÀY GIAO CUỐI CÙNG: ${finalResult.toISOString().split('T')[0]} ${finalResult.toLocaleTimeString('vi-VN')}`);
    console.log('   ✅ Hoàn thành tính toán');

    return finalResult;
}


