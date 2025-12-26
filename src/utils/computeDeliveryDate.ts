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

    // Helper: parse promotion lead time to number if present and non-blank
    const promoLeadRaw = promotion?.cr1bb_leadtimepromotion;
    const promoLead = promoLeadRaw !== undefined && promoLeadRaw !== null && String(promoLeadRaw).trim() !== ''
        ? Number(promoLeadRaw)
        : undefined;
    const promoPhanLoai = promotion?.cr1bb_phanloaichuongtrinh;

    // 1) Promotion lead time (if present and phan loai is blank or 'Hãng')
    if (promoLead !== undefined && (promoPhanLoai === undefined || promoPhanLoai === null || promoPhanLoai === '' || promoPhanLoai === 'Hãng')) {
        // original logic multiplies by 12 and uses TimeUnit.Hours
        return addHours(effectiveNow, promoLead * 12);
    }

    // 2) If customer is Shop -> use district leadtime * 12 hours
    if (varNganhNghe === 'Shop') {
        return addHours(effectiveNow, var_leadtime_quanhuyen * 12);
    }

    // 3) Inventory check: requestedQty * conversion > theoreticalStock -> Today + product lead time (days)
    if ((var_input_soluong * var_selected_donvi_conversion) > (var_selected_SP_tonkho ?? 0)) {
        return addDays(effectiveToday, var_selected_SP_leadtime);
    }

    // 4) Default: Today + 1 day
    return addDays(effectiveToday, 1);
}


