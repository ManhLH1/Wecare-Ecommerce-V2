import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SODBAOGIA_TABLE = "crdfd_sodbaogias"; // Bảng Detail
const INVENTORY_TABLE = "cr44a_inventoryweshops";
const PRODUCT_TABLE = "crdfd_productses";
// Theo metadata: crdfd_onvi trỏ tới crdfd_unitconvertions, không phải crdfd_units
const UNIT_CONVERSION_TABLE = "crdfd_unitconvertions";
const EMPLOYEE_TABLE = "crdfd_employees";
const SYSTEMUSER_TABLE = "systemusers";
const PROMOTION_TABLE = "crdfd_promotions";

// Helper lookup Product
async function lookupProductId(productCode: string, headers: any): Promise<string | null> {
    if (!productCode) return null;
    try {
        const safeCode = productCode.trim().replace(/'/g, "''");
        const endpoint = `${PRODUCT_TABLE}?$select=crdfd_productsid&$filter=statecode eq 0 and crdfd_masanpham eq '${safeCode}'&$top=1`;
        const res = await axios.get(`${BASE_URL}${endpoint}`, { headers });
        if (res.data.value && res.data.value.length > 0) {
            return res.data.value[0].crdfd_productsid;
        }
    } catch (e) {
        console.error("Lookup product failed:", e);
    }
    return null;
}

// Helper lookup Unit Conversion
// Cần tìm conversion id dựa trên product code và unit name (frontend gửi unit name hoặc unitId bảng unit??)
// Frontend SalesOrderForm thường gửi unitId của bảng Unit (nếu có). 
// Nếu SOBG yêu cầu link tới Unit Conversion, ta phải tìm Unit Conversion record.
async function lookupUnitConversionId(productCode: string, unitName: string, headers: any): Promise<string | null> {
    if (!productCode || !unitName) return null;
    try {
        const safeCode = productCode.trim().replace(/'/g, "''");
        const safeUnitName = unitName.trim().replace(/'/g, "''");

        // Filter: Product Code (cr44a_masanpham) AND Unit Name (crdfd_onvichuyenoitransfome)
        const filter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0 and crdfd_onvichuyenoitransfome eq '${safeUnitName}'`;
        const endpoint = `${UNIT_CONVERSION_TABLE}?$select=crdfd_unitconvertionid&$filter=${encodeURIComponent(filter)}&$top=1`;

        const res = await axios.get(`${BASE_URL}${endpoint}`, { headers });
        if (res.data.value && res.data.value.length > 0) {
            return res.data.value[0].crdfd_unitconvertionid;
        }
    } catch (e) {
        console.error("Lookup unit conversion failed:", e);
    }
    return null;
}

// Helper function to lookup systemuser ID from username or email
async function lookupSystemUserId(
    headers: any,
    username?: string,
    email?: string
): Promise<string | null> {
    if (!username && !email) return null;

    try {
        let filter = '';
        if (username) {
            const safeUsername = username.trim().replace(/'/g, "''");
            filter = `domainname eq '${safeUsername}'`;
        } else if (email) {
            const safeEmail = email.trim().replace(/'/g, "''");
            filter = `internalemailaddress eq '${safeEmail}'`;
        }

        if (!filter) return null;

        const query = `$select=systemuserid,domainname,internalemailaddress&$filter=${encodeURIComponent(filter)}&$top=1`;
        const endpoint = `${BASE_URL}${SYSTEMUSER_TABLE}?${query}`;

        const response = await axios.get(endpoint, { headers });
        const results = response.data.value || [];

        if (results.length > 0) {
            return results[0].systemuserid;
        }
    } catch (error: any) {
        console.error('[Save SOBG] Error looking up systemuser:', error.message);
        console.error('[Save SOBG] Full error:', error.response?.data || error);
    }

    return null;
}

// Helper function to lookup employee ID from email
async function lookupEmployeeByEmail(
    headers: any,
    email?: string
): Promise<string | null> {
    if (!email) return null;

    try {
        const safeEmail = email.trim().replace(/'/g, "''");

        const filter = `cr1bb_emailcal eq '${safeEmail}' and statecode eq 0`;
        const query = `$select=crdfd_employeeid,crdfd_name,cr1bb_emailcal&$filter=${encodeURIComponent(filter)}&$top=1`;
        const endpoint = `${BASE_URL}${EMPLOYEE_TABLE}?${query}`;

        const response = await axios.get(endpoint, { headers });
        const results = response.data.value || [];

        if (results.length > 0) {
            return results[0].crdfd_employeeid;
        } else {
            console.warn('[Save SOBG] ⚠️ No employee found with email:', safeEmail);
        }
    } catch (error: any) {
        console.error('[Save SOBG] Error looking up employee by email:', error.message);
        console.error('[Save SOBG] Full error:', error.response?.data || error);
    }

    return null;
}

// Helper: try to find a promotion by product code or promotion text
async function findPromotionForProduct(
    productCode: string | undefined,
    promotionText: string | undefined,
    headers: any
): Promise<{ id: string; name?: string } | null> {
    try {
        const baseFilter = "statecode eq 0";
        const orClauses: string[] = [];
        if (productCode) {
            const safeCode = String(productCode).replace(/'/g, "''");
            orClauses.push(`contains(crdfd_masanpham_multiple,'${safeCode}')`);
        }
        if (promotionText) {
            const safeText = String(promotionText).replace(/'/g, "''");
            orClauses.push(`crdfd_name eq '${safeText}'`);
            orClauses.push(`contains(crdfd_name,'${safeText}')`);
        }
        if (orClauses.length === 0) return null;

        const select = "crdfd_promotionid,crdfd_name,crdfd_masanpham_multiple";
        const filterClause = `${baseFilter} and (${orClauses.join(" or ")})`;
        const query = `$select=${select}&$filter=${encodeURIComponent(filterClause)}&$top=1`;
        const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;
        const resp = await axios.get(endpoint, { headers });
        const rows = resp.data.value || [];
        if (rows.length > 0) {
            return { id: rows[0].crdfd_promotionid, name: rows[0].crdfd_name };
        }
    } catch (err) {
        console.warn('[Save SOBG] Could not lookup promotion by product/text:', (err as any)?.message || err);
    }
    return null;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const {
            sobgId,
            warehouseName,
            isVatOrder,
            customerIndustry,
            userInfo,
            products,
        } = req.body;

        if (!sobgId) return res.status(400).json({ error: "sobgId is required" });
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "products array is required" });
        }

        const token = await getAccessToken();
        if (!token) return res.status(401).json({ error: "Failed token" });

        const headers = { Authorization: `Bearer ${token}` };

        // Log userInfo received from frontend

        // Lookup systemuser ID from userInfo email for owner/createdby
        // Note: ownerid in Dynamics 365 can only reference systemuser or team, not custom employee entities
        let ownerSystemUserId: string | null = null;
        if (userInfo && userInfo.email) {
            ownerSystemUserId = await lookupSystemUserId(headers, undefined, userInfo.email);
            if (!ownerSystemUserId) {
                console.warn('[Save SOBG] ⚠️ Could not find systemuser with email:', userInfo.email);
            }
        } else {
            console.warn('[Save SOBG] ⚠️ No userInfo provided or missing email');
        }

        // ============ STEP 1: CHECK INVENTORY (Read-only) ============
        const isNonVatOrder = !isVatOrder;
        const hasWarehouseName = warehouseName && typeof warehouseName === 'string' && warehouseName.trim().length > 0;

        if (isNonVatOrder && hasWarehouseName) {
            const allowedGroups = ["NSP-00027", "NSP-000872", "NSP-000409", "NSP-000474", "NSP-000873"];
            for (const product of products) {
                if (product.productGroupCode && allowedGroups.includes(product.productGroupCode)) continue;

                const safeCode = (product.productCode || "").trim().replace(/'/g, "''");
                const safeWarehouse = warehouseName.trim().replace(/'/g, "''");

                let filter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
                if (safeWarehouse) filter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;

                const invRes = await axios.get(`${BASE_URL}${INVENTORY_TABLE}?$select=cr44a_soluongtonlythuyet&$filter=${encodeURIComponent(filter)}&$top=1`, { headers });
                let stock = 0;
                if (invRes.data.value && invRes.data.value.length > 0) stock = invRes.data.value[0].cr44a_soluongtonlythuyet ?? 0;
                else {
                    // Fallback
                    if (safeWarehouse) {
                        const fbRes = await axios.get(`${BASE_URL}${INVENTORY_TABLE}?$select=cr44a_soluongtonlythuyet&$filter=cr44a_masanpham eq '${safeCode}' and statecode eq 0&$top=1`, { headers });
                        if (fbRes.data.value && fbRes.data.value.length > 0) stock = fbRes.data.value[0].cr44a_soluongtonlythuyet ?? 0;
                    }
                }

                if (product.quantity > stock) {
                    return res.status(400).json({
                        error: `Sản phẩm ${product.productCode} không đủ tồn kho! Tồn: ${stock}, Yêu cầu: ${product.quantity}`,
                        details: { productCode: product.productCode, requested: product.quantity, available: stock }
                    });
                }
            }
        }

        // ============ STEP 2: SAVE DETAILS ============
        let totalSaved = 0;
        let failedProducts = [];
        const savedDetails: any[] = [];
        // Fetch existing SOBG x Promotion records for this SOBG (if any)
        let sobgPromotions: Array<{
            promotionId?: string;
            productCodes?: string;
            productGroupCodes?: string;
            vndOrPercent?: string;
            value?: number;
            name?: string;
        }> = [];
        try {
            const promoFilter = `_crdfd_sobaogia_value eq ${sobgId} and statecode eq 0`;
            const promoSelect = `_crdfd_promotion_value,crdfd_masanpham_multiple,cr1bb_manhomsp_multiple,crdfd_vn,crdfd_value,crdfd_name`;
            const promoEndpoint = `${BASE_URL}crdfd_sobaogiaxpromotions?$filter=${encodeURIComponent(promoFilter)}&$select=${promoSelect}`;
            const promoResp = await axios.get(promoEndpoint, { headers });
            const promoRows = promoResp.data.value || [];
            sobgPromotions = promoRows.map((r: any) => ({
                promotionId: r._crdfd_promotion_value,
                productCodes: r.crdfd_masanpham_multiple,
                productGroupCodes: r.cr1bb_manhomsp_multiple,
                vndOrPercent: r.crdfd_vn,
                value: r.crdfd_value,
                name: r.crdfd_name
            }            ));
        } catch (err: any) {
            console.warn('[Save SOBG] Could not fetch SOBG promotions:', (err as any)?.message || err);
        }

        // Helper constants for shift OptionSet values (match CRM)
        const CA_SANG = 283640000; // "Ca sáng"
        const CA_CHIEU = 283640001; // "Ca chiều"
        // Helper to calculate delivery date and shift similar to save-sale-order-details logic
        async function calculateDeliveryDateAndShift(
            product: any,
            allProducts: any[],
            customerIndustry: number | undefined,
            baseDeliveryDate: string | undefined
        ): Promise<{ deliveryDateNew: string | null; shift: number | null }> {
            try {
                const baseDate = baseDeliveryDate
                    ? new Date(baseDeliveryDate.split('/').reverse().join('-'))
                    : new Date();
                if (isNaN(baseDate.getTime())) return { deliveryDateNew: null, shift: null };

                // Special logic for Shop industry (191920001) - same heuristics as SO save
                if (customerIndustry === 191920001) {
                    const thietBiNuoc = allProducts.filter(p =>
                        p.productCategoryLevel2 === "Thiết bị nước" || p.productCategoryLevel4 === "Ống cứng PVC"
                    );
                    const thietBiDien = allProducts.filter(p => p.productCategoryLevel2 === "Thiết bị điện");
                    const vatTuKimKhi = allProducts.filter(p => p.productCategoryLevel2 === "Vật tư kim khí");

                    const sumThietBiNuoc = thietBiNuoc.reduce((s, p) => s + (p.totalAmount || 0), 0);
                    const countThietBiNuoc = thietBiNuoc.reduce((s, p) => s + (p.quantity || 0), 0);
                    const sumOngCung = allProducts.filter(p => p.productCategoryLevel4 === "Ống cứng PVC").reduce((s, p) => s + (p.totalAmount || 0), 0);
                    const sumThietBiDien = thietBiDien.reduce((s, p) => s + (p.totalAmount || 0), 0);
                    const countKimKhi = vatTuKimKhi.reduce((s, p) => s + (p.quantity || 0), 0);

                    let leadTimeHours = 0;
                    let shouldApplySpecialLogic = false;
                    if (thietBiNuoc.length > 0 && ((countThietBiNuoc >= 50 && sumThietBiNuoc >= 100000000) || sumOngCung >= 100000000)) {
                        shouldApplySpecialLogic = true;
                        leadTimeHours = (sumThietBiNuoc >= 200000000 || sumOngCung >= 200000000) ? 24 : 12;
                    } else if (thietBiDien.length > 0 && sumThietBiDien >= 200000000) {
                        shouldApplySpecialLogic = true;
                        leadTimeHours = 12;
                    } else if (vatTuKimKhi.length > 0 && countKimKhi >= 100) {
                        shouldApplySpecialLogic = true;
                        leadTimeHours = 12;
                    }

                    if (shouldApplySpecialLogic) {
                        const newDate = new Date(baseDate);
                        newDate.setHours(newDate.getHours() + leadTimeHours);
                        const hour = newDate.getHours();
                        const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
                        const dateStr = newDate.toISOString().split('T')[0];
                        return { deliveryDateNew: dateStr, shift };
                    }
                }

                // Default: use baseDeliveryDate hour to determine shift
                const hour = baseDate.getHours();
                const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
                const dateStr = baseDate.toISOString().split('T')[0];
                return { deliveryDateNew: dateStr, shift };
            } catch (e) {
                return { deliveryDateNew: null, shift: null };
            }
        }

        for (const product of products) {
            try {
                let productId = product.productId;
                if (!productId && product.productCode) {
                    productId = await lookupProductId(product.productCode, headers) || undefined;
                }

                let unitConvId = undefined;
                // Lookup Unit Conversion ID using productCode and unit (name)
                if (product.productCode && product.unit) {
                    unitConvId = await lookupUnitConversionId(product.productCode, product.unit, headers) || undefined;
                }
                // If lookup failed but frontend provided unitId (unit conversion id), use it
                if (!unitConvId && product.unitId) {
                    unitConvId = String(product.unitId).trim() || undefined;
                }

                // Compute canonical subtotal/vat/total to match UI 'Tổng' (subtotal + VAT)
                const computedSubtotal = product.subtotal ?? ((product.discountedPrice ?? product.price) * (product.quantity || 0));
                const computedVatAmount = product.vatAmount ?? Math.round((computedSubtotal * (product.vat || 0)) / 100);
                const computedTotal = product.totalAmount ?? (computedSubtotal + computedVatAmount);

                // Compute deliveryDateNew and shift (ca) server-side if frontend didn't provide shift
                const { deliveryDateNew, shift } = await calculateDeliveryDateAndShift(product, products, customerIndustry, product.deliveryDate);

                // Map fields based on Metadata & Prediction (Vietnamese Schema)
                const entity: any = {
                    // Lookup Header: Metadata says 'crdfd_Maonhang'
                    "crdfd_Maonhang@odata.bind": `/crdfd_sobaogias(${sobgId})`,

                    // Lookup Product: Metadata says 'crdfd_Sanpham'
                    ...(productId ? { "crdfd_Sanpham@odata.bind": `/crdfd_productses(${productId})` } : {}),

                    // Lookup Unit: Metadata says 'crdfd_onvi' -> 'crdfd_unitconvertions'
                    ...(unitConvId ? { "crdfd_onvi@odata.bind": `/crdfd_unitconvertions(${unitConvId})` } : {}),

                    // NOTE: Do NOT set ownerid/createdby here during CREATE
                    // Dynamics 365 may not allow setting owner during creation
                    // We will PATCH after creation instead

                    // Data fields (Mapped from Metadata)
                    "crdfd_soluong": product.quantity,
                    // Price mapping: lưu `crdfd_ongia` = đơn giá hiển thị (sau chiết khấu nếu có),
                    // và `crdfd_giagoc` = giá gốc (original price) để tránh bị đảo ngược khi hiển thị sau khi lưu.
                    "crdfd_ongia": product.discountedPrice ?? product.price,
                    // Map VAT percent -> OptionSet value for CRM (crdfd_gtgt)
                    "crdfd_ieuchinhgtgt": mapVatPercentToChoice(product.vat),
                    "crdfd_gtgt": mapVatPercentToChoice(product.vat),
                    // Ensure saved totals match UI 'Tổng' calculations
                    "crdfd_tongtienkhongvat": computedSubtotal, // Total exclude VAT
                    // "crdfd_thanhtien": product.totalAmount, // Field not found in metadata. Skip.

                    // Name (Common field)
                    // "crdfd_name": product.productName || "SOBG Detail",

                    // NEW FIELDS
                    // Use computed delivery date if available, and set shift (ca) from calculation
                    ...(shift ? { "cr1bb_ca": shift } : {}),
                    "crdfd_ngaygiaodukien": deliveryDateNew ? deliveryDateNew : formatDateForCRM(product.deliveryDate),
                    "crdfd_chietkhau": product.discountPercent ? product.discountPercent / 100 : 0,
                    "crdfd_chietkhauvn": product.discountAmount ?? 0,
                    "crdfd_chietkhau2": product.discount2 ? product.discount2 / 100 : 0,
                    // Keep legacy/auxiliary fields: giack1 = giá gốc, giack2 = giá sau chiết khấu (nếu schema uses these)
                    "crdfd_giack1": product.originalPrice ?? product.price ?? 0,
                    "crdfd_giack2": product.discountedPrice ?? product.price ?? 0,
                    // Ensure crdfd_giagoc (giá gốc) is set to originalPrice
                    "crdfd_giagoc": product.originalPrice ?? product.price,
                    "crdfd_phu_phi_hoa_don": product.surcharge || 0,

                    // MISSING FIELDS FROM POWER APPS REQUIREMENTS
                    // NOTE: schema logical name is `crdfd_stton` (Whole number) in CRM
                    "crdfd_stton": Number(product.stt) || 0,
                    // Approval fields in CRM:
                    // - `crdfd_duyetgia` is a Choice (OptionSet) stored as Int32. We will map and set it below if available.
                    // - `Duyet gia sup` is a Lookup on a separate table; do NOT send boolean/int for lookup.
                    "crdfd_promotiontext": product.promotionText || "",
                    "crdfd_ghichu": product.note || "",
                };

                // Map and set approval choice if provided/derivable.
                const mappedApproval = mapApprovalToChoice(product.approvePrice, product.approverChoiceValue || product.approverChoice);
                if (mappedApproval !== null) {
                    entity["crdfd_duyetgia"] = mappedApproval;
                }

                // If SUP approver ID is provided, set lookup binding property used elsewhere in repo (`cr1bb_duyetgiasup@odata.bind`)
                // This avoids sending a non-existent `crdfd_duyetgiasup` attribute.
                if (product.approveSupPrice && product.approveSupPriceId) {
                    entity[`cr1bb_duyetgiasup@odata.bind`] = `/crdfd_duyetgias(${product.approveSupPriceId})`;
                }
                // Promotion lookup: prefer product.promotionId or product.promotion from frontend
                const promoCandidate = product.promotionId ?? product.promotion;
                if (promoCandidate) {
                    const normalizedPromoId = String(promoCandidate).replace(/^{|}$/g, '').trim();
                    if (normalizedPromoId) {
                        entity[`crdfd_Promotion@odata.bind`] = `/crdfd_promotions(${normalizedPromoId})`;
                    }
                } else {
                    // Priority A: try to match against SOBG promotions previously selected/applied (crdfd_sobaogiaxpromotions)
                    try {
                        const prodCode = (product.productCode || '').toString().trim().toUpperCase();
                        const prodGroup = (product.productGroupCode || '').toString().trim().toUpperCase();
                        let matched = null as any;
                        for (const sp of (sobgPromotions || [])) {
                            const codesRaw = sp.productCodes || '';
                            const groupsRaw = sp.productGroupCodes || '';
                            const codes = Array.isArray(codesRaw) ? codesRaw : String(codesRaw).split(',').map((c: any) => String(c || '').trim().toUpperCase()).filter(Boolean);
                            const groups = Array.isArray(groupsRaw) ? groupsRaw : String(groupsRaw).split(',').map((c: any) => String(c || '').trim().toUpperCase()).filter(Boolean);
                            const matchProduct = codes.length === 0 || (prodCode && codes.some((c: string) => prodCode.includes(c)));
                            const matchGroup = groups.length === 0 || (prodGroup && groups.some((g: string) => prodGroup.includes(g)));
                            if ((codes.length === 0 && groups.length === 0) || matchProduct || matchGroup) {
                                if (sp.promotionId) {
                                    matched = sp;
                                    break;
                                }
                            }
                        }
                        if (matched && matched.promotionId) {
                            entity[`crdfd_Promotion@odata.bind`] = `/crdfd_promotions(${String(matched.promotionId).replace(/^{|}$/g,'').trim()})`;
                        } else {
                            // Fallback: look up by promotionText/productCode directly in promotions table
                            const inferred = await findPromotionForProduct(product.productCode, product.promotionText || product.promotionText, headers);
                            if (inferred && inferred.id) {
                                entity[`crdfd_Promotion@odata.bind`] = `/crdfd_promotions(${String(inferred.id).replace(/^{|}$/g,'').trim()})`;
                            }
                        }
                    } catch (e) {
                        // ignore inference errors
                    }
                }

                // Use impersonation to set the correct createdby user
                // MSCRMCallerID header tells Dynamics 365 to create the record as if this user did it
                const createHeaders: any = { ...headers };
                if (ownerSystemUserId) {
                    createHeaders['MSCRMCallerID'] = ownerSystemUserId;
                }

                const createResponse = await axios.post(`${BASE_URL}${SODBAOGIA_TABLE}`, entity, { headers: createHeaders });

                // Get the created record ID from response headers
                const createdRecordUrl = createResponse.headers['odata-entityid'] || createResponse.headers['location'];
                let createdRecordId: string | null = null;

                if (createdRecordUrl) {
                    // Extract GUID from URL: .../crdfd_sodbaogias(guid)
                    const match = createdRecordUrl.match(/\(([a-f0-9-]+)\)/i);
                    if (match) {
                        createdRecordId = match[1];
                    }
                }

                // PATCH to set owner and createdby if we have ownerSystemUserId and createdRecordId
                if (ownerSystemUserId && createdRecordId) {

                    try {
                        // Set ownerid to systemuser
                        await axios.patch(
                            `${BASE_URL}${SODBAOGIA_TABLE}(${createdRecordId})`,
                            { "ownerid@odata.bind": `/systemusers(${ownerSystemUserId})` },
                            { headers }
                        );
                    } catch (ownerError: any) {
                        console.warn('[Save SOBG] ⚠️ Could not set ownerid:', ownerError.message);
                        console.warn('[Save SOBG] Error details:', ownerError.response?.data);
                    }

                    // Try to set createdby (may not be settable, but try custom fields)
                    // Try multiple possible field names since the exact name may vary
                    const CREATEDBY_CANDIDATES = [
                        "crdfd_createdby",
                        "crdfd_createdby_customer",
                        "cr44a_createdby",
                        "cr44a_createdby_customer",
                        "cr1bb_createdby",
                        "cr1bb_createdby_customer",
                    ];

                    let createdBySuccess = false;
                    for (const fieldName of CREATEDBY_CANDIDATES) {
                        try {
                            await axios.patch(
                                `${BASE_URL}${SODBAOGIA_TABLE}(${createdRecordId})`,
                                { [`${fieldName}@odata.bind`]: `/systemusers(${ownerSystemUserId})` },
                                { headers }
                            );
                            createdBySuccess = true;
                            break;
                        } catch (err: any) {
                            // Continue to next candidate
                        }
                    }

                    if (!createdBySuccess) {
                        console.warn('[Save SOBG] ⚠️ Could not set createdby with any field name');
                    }
                }
                // If create didn't bind promotion for any reason, attempt explicit PATCH of promotion lookup
                if (createdRecordId && entity && entity['crdfd_Promotion@odata.bind']) {
                    try {
                        await axios.patch(
                            `${BASE_URL}${SODBAOGIA_TABLE}(${createdRecordId})`,
                            { "crdfd_Promotion@odata.bind": entity['crdfd_Promotion@odata.bind'] },
                            { headers }
                        );
                    } catch (promoPatchErr: any) {
                        console.warn('[Save SOBG] ⚠️ Could not patch promotion lookup on SOD báo giá:', createdRecordId, promoPatchErr?.message || promoPatchErr);
                    }
                }

                totalSaved++;
                // collect info for frontend to mark items saved and avoid duplicate saves
                savedDetails.push({
                    productCode: product.productCode || null,
                    productName: product.productName || null,
                    id: createdRecordId || null
                });

            } catch (err: any) {
                console.error(`Failed to save product ${product.productName}:`, err?.response?.data || err.message);
                failedProducts.push({
                    productCode: product.productCode,
                    error: err?.response?.data?.error?.message || err.message
                });
            }
        }

        if (failedProducts.length > 0) {
            return res.status(200).json({
                success: false,
                partialSuccess: totalSaved > 0,
                totalSaved,
                totalFailed: failedProducts.length,
                failedProducts,
                savedDetails,
                totalRequested: products.length,
                message: `Lưu ${totalSaved} sản phẩm thành công. ${failedProducts.length} thất bại.`
            });
        }

        return res.status(200).json({ success: true, totalSaved, totalRequested: products.length, savedDetails, message: "OK" });

    } catch (error: any) {
        console.error("System Error SOBG:", error);
        return res.status(500).json({ error: "Lỗi hệ thống", details: error.message });
    }
}

function mapVatPercentToChoice(percent: number): number {
    switch (percent) {
        case 0: return 191920000;
        case 5: return 191920001;
        case 8: return 191920002;
        case 10: return 191920003;
        default: return 191920000;
    }
}

function mapShiftToChoice(shift: any): number | null {
    if (!shift) return null;
    const s = String(shift).toLowerCase().trim();
    if (s.includes("sáng") || s === "ca sáng" || s === "morning") return 283640000;
    if (s.includes("chiều") || s === "ca chiều" || s === "afternoon") return 283640001;

    // Check if valid number
    if (Number(shift) === 283640000) return 283640000;
    if (Number(shift) === 283640001) return 283640001;

    return null;
}

// Map approval input to CRM Choice (OptionSet) values.
// crdfd_duyetgia is a Choice field whose valid values are the OptionSet integers.
// Strategy:
// - If frontend provides `product.approverChoiceValue` (numeric), use it.
// - If `approvePrice` is truthy but no choice provided, use a safe default (first OptionSet value).
// - If `approvePrice` is falsy, do not set the field (return null) to avoid sending invalid 0.
const DEFAULT_APPROVAL_CHOICE = 191920000;
function mapApprovalToChoice(approveFlag: any, approverChoiceValue?: any): number | null {
    // If explicit numeric choice provided by frontend, use it
    if (approverChoiceValue !== undefined && approverChoiceValue !== null && approverChoiceValue !== '') {
        const n = Number(approverChoiceValue);
        if (!isNaN(n)) return Math.trunc(n);
    }

    // If approveFlag is truthy, return default option value
    if (approveFlag === true || String(approveFlag).toLowerCase() === 'true' || Number(approveFlag) > 0) {
        return DEFAULT_APPROVAL_CHOICE;
    }

    // Otherwise do not set the choice (null)
    return null;
}

function formatDateForCRM(dateStr: any): string | null {
    if (!dateStr) return null;
    try {
        // Handle dd/mm/yyyy format
        if (typeof dateStr === 'string' && dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime()) || date.getFullYear() < 1900) return null;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return null;
    }
}

