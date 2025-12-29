/**
 * Utility to compute delivery date following canvas logic.
 *
 * Priority:
 * 1) Promotion lead time (promotion.cr1bb_leadtimepromotion * 12 hours) when applicable
 * 2) If customer is "Shop" -> var_leadtime_quanhuyen * 12 hours
 * 3) If requestedQty * unitConversion > theoreticalStock -> Today + productLeadtime (days)
 * 4) Default -> Today + 1 day
 */
export type PromotionRecord = {
    cr1bb_leadtimepromotion?: string | number | null;
    cr1bb_phanloaichuongtrinh?: string | null;
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

export function computeDeliveryDate(params: {
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
    const effectiveToday = today ?? new Date(new Date().setHours(0, 0, 0, 0));

    console.log('🎯 [Delivery Date Calculation] Starting calculation with params:', {
        promotion: promotion ? {
            leadtime: promotion.cr1bb_leadtimepromotion,
            phanloai: promotion.cr1bb_phanloaichuongtrinh
        } : null,
        varNganhNghe,
        var_leadtime_quanhuyen,
        var_input_soluong,
        var_selected_donvi_conversion,
        var_selected_SP_tonkho,
        var_selected_SP_leadtime,
        effectiveNow: effectiveNow.toLocaleString('vi-VN'),
        effectiveToday: effectiveToday.toLocaleDateString('vi-VN')
    });

    // Helper: parse promotion lead time to number if present and non-blank
    const promoLeadRaw = promotion?.cr1bb_leadtimepromotion;
    const promoLead = promoLeadRaw !== undefined && promoLeadRaw !== null && String(promoLeadRaw).trim() !== ''
        ? Number(promoLeadRaw)
        : undefined;
    const promoPhanLoai = promotion?.cr1bb_phanloaichuongtrinh;

    console.log('📋 [Delivery Date] Parsed promotion data:', { promoLead, promoPhanLoai });

    // 1) Promotion lead time (if present and phan loai is blank or 'Hãng')
    if (promoLead !== undefined && (promoPhanLoai === undefined || promoPhanLoai === null || promoPhanLoai === '' || promoPhanLoai === 'Hãng')) {
        const result = addHours(effectiveNow, promoLead * 12);
        console.log('✅ [Delivery Date] Applied PROMOTION LEAD TIME:', {
            promoLead,
            hours: promoLead * 12,
            from: effectiveNow.toLocaleString('vi-VN'),
            to: result.toLocaleString('vi-VN')
        });
        return result;
    }

    // 2) If customer is Shop -> use district leadtime * 12 hours
    if (varNganhNghe === 'Shop') {
        const result = addHours(effectiveNow, var_leadtime_quanhuyen * 12);
        console.log('🏪 [Delivery Date] Applied SHOP DISTRICT LEAD TIME:', {
            varNganhNghe,
            districtLeadtime: var_leadtime_quanhuyen,
            hours: var_leadtime_quanhuyen * 12,
            from: effectiveNow.toLocaleString('vi-VN'),
            to: result.toLocaleString('vi-VN')
        });
        return result;
    }

    // 3) Inventory check: requestedQty * conversion > theoreticalStock -> Today + product lead time (days)
    const requestedQty = var_input_soluong * var_selected_donvi_conversion;
    const theoreticalStock = var_selected_SP_tonkho ?? 0;
    const isOutOfStock = requestedQty > theoreticalStock;

    console.log('📦 [Delivery Date] Inventory check:', {
        requestedQty,
        theoreticalStock,
        isOutOfStock,
        productLeadtime: var_selected_SP_leadtime
    });

    if (isOutOfStock) {
        const result = addDays(effectiveToday, var_selected_SP_leadtime);
        console.log('⚠️ [Delivery Date] Applied OUT OF STOCK - PRODUCT LEAD TIME:', {
            requestedQty,
            theoreticalStock,
            productLeadtime: var_selected_SP_leadtime,
            from: effectiveToday.toLocaleDateString('vi-VN'),
            to: result.toLocaleDateString('vi-VN')
        });
        return result;
    }

    // 4) Default: Today + 1 day
    const result = addDays(effectiveToday, 1);
    console.log('📅 [Delivery Date] Applied DEFAULT (+1 day):', {
        from: effectiveToday.toLocaleDateString('vi-VN'),
        to: result.toLocaleDateString('vi-VN')
    });
    return result;
}


