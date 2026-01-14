// Simple debug script for delivery date calculation (browser console compatible)
console.log('🔍 SIMPLE DEBUG: Delivery Date Calculation\n');

// Helper functions (copied from computeDeliveryDate.ts)
function addWorkingDays(base, days) {
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

function getWeekendResetTime(orderTime) {
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

function applySundayAdjustment(resultDate, warehouseCode) {
    if (warehouseCode === 'KHOHCM' && resultDate.getDay() === 0) {
        // Sunday → Monday
        resultDate.setDate(resultDate.getDate() + 1);
    }
    return resultDate;
}

function isApolloKimTinPromotion(promotion) {
    if (!promotion?.name) return false;
    const name = promotion.name.toLowerCase();
    return name.includes('apollo') || name.includes('kim tín');
}

function computeDeliveryDateDebug(params) {
    console.log('🧮 [computeDeliveryDate] Starting calculation with params:', params);

    const {
        warehouseCode,
        orderCreatedOn,
        districtLeadtime,
        var_input_soluong = 0,
        var_selected_donvi_conversion = 1,
        var_selected_SP_tonkho = 0,
        promotion
    } = params;

    // Parse order creation time
    let orderTime = orderCreatedOn ? new Date(orderCreatedOn) : new Date();

    console.log('📅 [computeDeliveryDate] Order time parsed:', {
        orderTime: orderTime.toISOString(),
        orderDayOfWeek: orderTime.getDay(),
        orderHours: orderTime.getHours()
    });

    // NEW LOGIC (2025) - Priority 1: District leadtime
    if (districtLeadtime && districtLeadtime > 0) {
        console.log('🎯 [computeDeliveryDate] Using DISTRICT LEADTIME logic:', districtLeadtime);
        let result = addWorkingDays(orderTime, districtLeadtime);
        console.log('📅 [computeDeliveryDate] After addWorkingDays:', {
            result: result.toISOString(),
            resultDayOfWeek: result.getDay()
        });

        // Apply Sunday adjustment for HCM warehouse
        result = applySundayAdjustment(result, warehouseCode);
        console.log('📅 [computeDeliveryDate] After Sunday adjustment:', {
            result: result.toISOString(),
            resultDayOfWeek: result.getDay(),
            warehouseCode
        });

        console.log('✅ [computeDeliveryDate] DISTRICT LEADTIME result:', result.toISOString());
        return result;
    }

    // NEW LOGIC (2025) - Priority 2: Out of stock rules
    const requestedQty = var_input_soluong * var_selected_donvi_conversion;
    const theoreticalStock = var_selected_SP_tonkho ?? 0;
    const isOutOfStock = requestedQty > theoreticalStock;

    console.log('📦 [computeDeliveryDate] Stock check:', {
        requestedQty,
        theoreticalStock,
        isOutOfStock,
        warehouseCode
    });

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
            leadtimeCa = isApolloKimTinPromotion(promotion) ? 6 : 2;
            console.log('🏭 [computeDeliveryDate] HCM warehouse - leadtime:', {
                leadtimeCa,
                isApolloKimTin: isApolloKimTinPromotion(promotion),
                promotion: promotion?.name
            });
        } else if (warehouseCode === 'KHOBD') {
            leadtimeCa = isApolloKimTinPromotion(promotion) ? 6 : 4;
            console.log('🏭 [computeDeliveryDate] Bình Định warehouse - leadtime:', {
                leadtimeCa,
                isApolloKimTin: isApolloKimTinPromotion(promotion),
                promotion: promotion?.name
            });
        }

        if (leadtimeCa > 0) {
            let result = addWorkingDays(effectiveOrderTime, leadtimeCa);
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
            return result;
        }
    }

    // Default case
    console.log('📅 [computeDeliveryDate] Using DEFAULT logic (+1 working day)');
    const result = addWorkingDays(orderTime, 1);
    console.log('📅 [computeDeliveryDate] After addWorkingDays (default):', {
        result: result.toISOString(),
        resultDayOfWeek: result.getDay()
    });

    // Apply Sunday adjustment for HCM warehouse
    const finalResult = applySundayAdjustment(result, warehouseCode);
    console.log('📅 [computeDeliveryDate] After Sunday adjustment (final):', {
        finalResult: finalResult.toISOString(),
        finalResultDayOfWeek: finalResult.getDay(),
        warehouseCode
    });

    console.log('✅ [computeDeliveryDate] FINAL RESULT:', finalResult.toISOString());
    return finalResult;
}

// Test cases
const testCases = [
    {
        name: 'District Leadtime - Normal',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 2,
            orderCreatedOn: '2025-01-15T10:00:00', // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 50
        }
    },
    {
        name: 'Out of Stock - HCM Normal',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0,
            orderCreatedOn: '2025-01-15T10:00:00', // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5 // Out of stock
        }
    },
    {
        name: 'Out of Stock - Weekend Reset',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0,
            orderCreatedOn: '2025-01-18T14:00:00', // Saturday afternoon
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5 // Out of stock
        }
    }
];

// Run tests
testCases.forEach((test, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test ${index + 1}: ${test.name}`);
    console.log(`${'='.repeat(60)}`);

    const result = computeDeliveryDateDebug(test.params);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`🎯 RESULT: ${result.toISOString().split('T')[0]} (${dayNames[result.getDay()]})`);

    console.log(`${'='.repeat(60)}\n`);
});

console.log('🎯 DEBUG COMPLETE - Check logs above for calculation steps!');
