/**
 * Utility to compute delivery date following updated business logic.
 *
 * New Priority (2025):
 * 1) Leadtime theo quận/huyện (sales setting)
 * 2) Rule cho hàng thiếu tồn kho:
 *    - Kho HCM: +2 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
 *    - Kho Bình Định: +4 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
 * 3) Cut-off & weekend:
 *    - Weekend reset: Thứ 7 sau 12:00 và Chủ nhật → coi như sáng Thứ 2
 *    - Chủ nhật: Nếu leadtime rơi vào Chủ nhật → dời sang Thứ 2 (chỉ kho HCM)
 *
 * Legacy Priority (before 2025):
 * 1) Promotion lead time (promotion.cr1bb_leadtimepromotion * 12 hours) when applicable
 * 2) If customer is "Shop" -> var_leadtime_quanhuyen * 12 hours
 * 3) If requestedQty * unitConversion > theoreticalStock -> Today + productLeadtime (days)
 * 4) Default -> Today + 1 day
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

    // Parse order creation time for weekend reset logic
    let effectiveOrderTime = effectiveNow;
    if (orderCreatedOn) {
        effectiveOrderTime = typeof orderCreatedOn === 'string'
            ? new Date(orderCreatedOn)
            : orderCreatedOn;
    }

    // Apply weekend reset logic
    effectiveOrderTime = getWeekendResetTime(effectiveOrderTime);

    // NEW LOGIC (2025) - Priority 1: District leadtime
    if (districtLeadtime && districtLeadtime > 0) {
        let result = addWorkingDays(effectiveOrderTime, districtLeadtime);

        // Apply Sunday adjustment for HCM warehouse
        result = applySundayAdjustment(result, warehouseCode);

        return result;
    }

    // NEW LOGIC (2025) - Priority 2: Out of stock rules by warehouse
    const requestedQty = var_input_soluong * var_selected_donvi_conversion;
    const theoreticalStock = var_selected_SP_tonkho ?? 0;
    const isOutOfStock = requestedQty > theoreticalStock;

    if (isOutOfStock && warehouseCode) {
        let leadtimeCa = 0;

        if (warehouseCode === 'KHOHCM') {
            // Kho HCM: +2 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
            leadtimeCa = isApolloKimTinPromotion(promotion) ? 6 : 2;
        } else if (warehouseCode === 'KHOBD') {
            // Kho Bình Định: +4 ca (bình thường), +6 ca (promotion Apollo, Kim Tín)
            leadtimeCa = isApolloKimTinPromotion(promotion) ? 6 : 4;
        }

        if (leadtimeCa > 0) {
            let result = addWorkingDays(effectiveOrderTime, leadtimeCa);

            // Apply Sunday adjustment for HCM warehouse
            result = applySundayAdjustment(result, warehouseCode);

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
        const result = addHours(effectiveNow, promoLead * 12);
        return result;
    }

    // 2) If customer is "Shop" -> use district leadtime * 12 hours
    if (varNganhNghe === 'Shop') {
        const result = addHours(effectiveNow, var_leadtime_quanhuyen * 12);
        return result;
    }

    // 3) Inventory check: requestedQty * conversion > theoreticalStock -> Today + product lead time (days)
    if (isOutOfStock) {
        const result = addDays(effectiveToday, var_selected_SP_leadtime);
        return result;
    }

    // 4) Default: Today + 1 working day
    const result = addWorkingDays(effectiveOrderTime, 1);

    return result;
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
            name: 'Weekend Reset - Saturday after 12:00',
            params: {
                districtLeadtime: 1,
                orderCreatedOn: new Date('2025-01-18T14:00:00'), // Saturday 2:00 PM
            },
            expected: '2025-01-21' // Monday + 1 working day = Tuesday
        },
        {
            name: 'Weekend Reset - Sunday',
            params: {
                districtLeadtime: 1,
                orderCreatedOn: new Date('2025-01-19T10:00:00'), // Sunday
            },
            expected: '2025-01-21' // Monday + 1 working day = Tuesday
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


