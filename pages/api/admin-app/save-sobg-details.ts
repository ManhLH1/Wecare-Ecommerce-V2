import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";
import { createBackgroundJob, updateJobStatus, cleanupOldJobs } from "./_backgroundJobs";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SODBAOGIA_TABLE = "crdfd_sodbaogias"; // Bảng Detail
const INVENTORY_TABLE = "cr44a_inventoryweshops";
const PRODUCT_TABLE = "crdfd_productses";
// Theo metadata: crdfd_onvi trỏ tới crdfd_unitconvertions, không phải crdfd_units
const UNIT_CONVERSION_TABLE = "crdfd_unitconvertions";
const EMPLOYEE_TABLE = "crdfd_employees";
const SYSTEMUSER_TABLE = "systemusers";
const PROMOTION_TABLE = "crdfd_promotions";
const KHO_BD_TABLE = "crdfd_kho_binh_dinhs";

// Batch lookup Product IDs
async function batchLookupProductIds(productCodes: string[], headers: any): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    if (!productCodes.length) return result;

    try {
        // Create filter for multiple product codes
        const safeCodes = productCodes.map(code => `'${code.trim().replace(/'/g, "''")}'`).join(',');
        const filter = `statecode eq 0 and crdfd_masanpham in (${safeCodes})`;
        const endpoint = `${PRODUCT_TABLE}?$select=crdfd_productsid,crdfd_masanpham&$filter=${encodeURIComponent(filter)}`;

        const res = await axios.get(`${BASE_URL}${endpoint}`, { headers });
        if (res.data.value && res.data.value.length > 0) {
            // Create lookup map
            const productMap = new Map<string, string>();
            res.data.value.forEach((item: any) => {
                if (item.crdfd_masanpham && item.crdfd_productsid) {
                    productMap.set(item.crdfd_masanpham.toLowerCase().trim(), item.crdfd_productsid);
                }
            });

            // Map back to input codes
            productCodes.forEach(code => {
                const normalizedCode = code.toLowerCase().trim();
                result.set(code, productMap.get(normalizedCode) || null);
            });
        } else {
            // No products found, set all to null
            productCodes.forEach(code => result.set(code, null));
        }
    } catch (e) {
        console.error("Batch lookup products failed:", e);
        // Set all to null on error
        productCodes.forEach(code => result.set(code, null));
    }
    return result;
}

// Batch lookup Unit Conversion IDs
async function batchLookupUnitConversionIds(
    productUnitPairs: Array<{ productCode: string; unitName: string }>,
    headers: any
): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    if (!productUnitPairs.length) return result;

    try {
        // Create filter for multiple combinations
        const conditions = productUnitPairs
            .filter(pair => pair.productCode && pair.unitName)
            .map(pair => {
                const safeCode = pair.productCode.trim().replace(/'/g, "''");
                const safeUnit = pair.unitName.trim().replace(/'/g, "''");
                return `(cr44a_masanpham eq '${safeCode}' and crdfd_onvichuyenoitransfome eq '${safeUnit}')`;
            });

        if (conditions.length === 0) {
            productUnitPairs.forEach(pair => result.set(`${pair.productCode}::${pair.unitName}`, null));
            return result;
        }

        const filter = `statecode eq 0 and (${conditions.join(' or ')})`;
        const endpoint = `${UNIT_CONVERSION_TABLE}?$select=crdfd_unitconvertionid,cr44a_masanpham,crdfd_onvichuyenoitransfome&$filter=${encodeURIComponent(filter)}`;

        const res = await axios.get(`${BASE_URL}${endpoint}`, { headers });
        if (res.data.value && res.data.value.length > 0) {
            // Create lookup map
            const unitMap = new Map<string, string>();
            res.data.value.forEach((item: any) => {
                if (item.cr44a_masanpham && item.crdfd_onvichuyenoitransfome && item.crdfd_unitconvertionid) {
                    const key = `${item.cr44a_masanpham.toLowerCase().trim()}::${item.crdfd_onvichuyenoitransfome.toLowerCase().trim()}`;
                    unitMap.set(key, item.crdfd_unitconvertionid);
                }
            });

            // Map back to input pairs
            productUnitPairs.forEach(pair => {
                const key = `${pair.productCode.toLowerCase().trim()}::${pair.unitName.toLowerCase().trim()}`;
                result.set(`${pair.productCode}::${pair.unitName}`, unitMap.get(key) || null);
            });
        } else {
            // No conversions found, set all to null
            productUnitPairs.forEach(pair => result.set(`${pair.productCode}::${pair.unitName}`, null));
        }
    } catch (e) {
        console.error("Batch lookup unit conversions failed:", e);
        // Set all to null on error
        productUnitPairs.forEach(pair => result.set(`${pair.productCode}::${pair.unitName}`, null));
    }
    return result;
}

// Legacy single lookup functions (for backward compatibility)
async function lookupProductId(productCode: string, headers: any): Promise<string | null> {
    const results = await batchLookupProductIds([productCode], headers);
    return results.get(productCode) || null;
}

async function lookupUnitConversionId(productCode: string, unitName: string, headers: any): Promise<string | null> {
    const results = await batchLookupUnitConversionIds([{ productCode, unitName }], headers);
    return results.get(`${productCode}::${unitName}`) || null;
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

// Cached promotion lookups to avoid repeated API calls
let promotionCache: Map<string, { id: string; name?: string } | null> = new Map();
let promotionValidationCache: Map<string, boolean> = new Map();

// Batch lookup promotions for multiple promotion texts
async function batchLookupPromotionsByText(
    promotionTexts: string[],
    headers: any
): Promise<Map<string, { id: string; name?: string } | null>> {
    const result = new Map<string, { id: string; name?: string } | null>();
    const uncachedTexts: string[] = [];

    // Check cache first
    promotionTexts.forEach(text => {
        const normalizedText = text.toLowerCase().trim();
        if (promotionCache.has(normalizedText)) {
            result.set(text, promotionCache.get(normalizedText)!);
        } else {
            uncachedTexts.push(text);
        }
    });

    if (uncachedTexts.length === 0) return result;

    try {
        // Create filter for multiple promotion texts
        const safeTexts = uncachedTexts.map(text => `'${text.trim().replace(/'/g, "''")}'`).join(',');
        const filter = `statecode eq 0 and crdfd_name in (${safeTexts})`;
        const query = `$select=crdfd_promotionid,crdfd_name,crdfd_masanpham_multiple&$filter=${encodeURIComponent(filter)}`;
        const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;

        const resp = await axios.get(endpoint, { headers });
        const rows = resp.data.value || [];

        // Create lookup map
        const promoMap = new Map<string, { id: string; name?: string }>();
        rows.forEach((row: any) => {
            if (row.crdfd_name && row.crdfd_promotionid) {
                const normalizedName = row.crdfd_name.toLowerCase().trim();
                promoMap.set(normalizedName, { id: row.crdfd_promotionid, name: row.crdfd_name });
                // Cache the result
                promotionCache.set(normalizedName, { id: row.crdfd_promotionid, name: row.crdfd_name });
            }
        });

        // Map back to input texts
        uncachedTexts.forEach(text => {
            const normalizedText = text.toLowerCase().trim();
            const found = promoMap.get(normalizedText);
            result.set(text, found || null);
            // Cache null results too to avoid repeated lookups
            if (!promotionCache.has(normalizedText)) {
                promotionCache.set(normalizedText, null);
            }
        });
    } catch (err) {
        console.warn('[Save SOBG] Batch lookup promotions by text failed:', (err as any)?.message || err);
        // Set all uncached to null
        uncachedTexts.forEach(text => {
            result.set(text, null);
            const normalizedText = text.toLowerCase().trim();
            if (!promotionCache.has(normalizedText)) {
                promotionCache.set(normalizedText, null);
            }
        });
    }

    return result;
}

// Batch find promotions for multiple product-code/promotion-text combinations
async function batchFindPromotionsForProducts(
    productPromotionPairs: Array<{ productCode?: string; promotionText?: string }>,
    headers: any
): Promise<Map<string, { id: string; name?: string } | null>> {
    const result = new Map<string, { id: string; name?: string } | null>();

    // First, collect all unique promotion texts for batch lookup
    const uniqueTexts = new Set<string>();
    productPromotionPairs.forEach(pair => {
        if (pair.promotionText) uniqueTexts.add(pair.promotionText);
    });

    // Batch lookup by text first
    const textResults = await batchLookupPromotionsByText(Array.from(uniqueTexts), headers);

    // Now handle broader searches for pairs that didn't match by text
    const remainingPairs: Array<{ pair: { productCode?: string; promotionText?: string }; key: string }> = [];

    productPromotionPairs.forEach((pair, index) => {
        const key = `${pair.productCode || ''}::${pair.promotionText || ''}`;
        if (pair.promotionText && textResults.get(pair.promotionText)) {
            result.set(key, textResults.get(pair.promotionText)!);
        } else {
            remainingPairs.push({ pair, key });
        }
    });

    if (remainingPairs.length > 0) {
        try {
            // Create broader filter for remaining pairs
            const orClauses: string[] = [];
            remainingPairs.forEach(({ pair }) => {
                const conditions: string[] = [];
                if (pair.productCode) {
                    const safeCode = String(pair.productCode).replace(/'/g, "''");
                    conditions.push(`contains(crdfd_masanpham_multiple,'${safeCode}')`);
                }
                if (pair.promotionText) {
                    const safeText = String(pair.promotionText).replace(/'/g, "''");
                    conditions.push(`contains(crdfd_name,'${safeText}')`);
                }
                if (conditions.length > 0) {
                    orClauses.push(`(${conditions.join(' or ')})`);
                }
            });

            if (orClauses.length > 0) {
                const baseFilter = "statecode eq 0";
                const select = "crdfd_promotionid,crdfd_name,crdfd_masanpham_multiple";
                const filterClause = `${baseFilter} and (${orClauses.join(" or ")})`;
                const query = `$select=${select}&$filter=${encodeURIComponent(filterClause)}`;
                const endpoint = `${BASE_URL}${PROMOTION_TABLE}?${query}`;

                const resp = await axios.get(endpoint, { headers });
                const rows = resp.data.value || [];

                // For each remaining pair, find the best match
                remainingPairs.forEach(({ pair, key }) => {
                    let bestMatch: { id: string; name?: string } | null = null;
                    let bestScore = 0;

                    rows.forEach((row: any) => {
                        let score = 0;
                        if (pair.productCode && row.crdfd_masanpham_multiple &&
                            row.crdfd_masanpham_multiple.toLowerCase().includes(pair.productCode.toLowerCase())) {
                            score += 2; // Product code match is highest priority
                        }
                        if (pair.promotionText && row.crdfd_name &&
                            row.crdfd_name.toLowerCase().includes(pair.promotionText.toLowerCase())) {
                            score += 1; // Text match is secondary
                        }

                        if (score > bestScore && row.crdfd_promotionid) {
                            bestScore = score;
                            bestMatch = { id: row.crdfd_promotionid, name: row.crdfd_name };
                        }
                    });

                    result.set(key, bestMatch);
                    // Cache the result
                    if (bestMatch && pair.promotionText) {
                        const normalizedText = pair.promotionText.toLowerCase().trim();
                        if (!promotionCache.has(normalizedText)) {
                            promotionCache.set(normalizedText, bestMatch);
                        }
                    }
                });
            } else {
                // No conditions, set all remaining to null
                remainingPairs.forEach(({ key }) => result.set(key, null));
            }
        } catch (err) {
            console.warn('[Save SOBG] Batch find promotions failed:', (err as any)?.message || err);
            remainingPairs.forEach(({ key }) => result.set(key, null));
        }
    }

    return result;
}

// Legacy single lookup functions (for backward compatibility)
async function lookupPromotionIdByText(promotionText: string, headers: any): Promise<string | null> {
    const results = await batchLookupPromotionsByText([promotionText], headers);
    const result = results.get(promotionText);
    return result ? result.id : null;
}

async function findPromotionForProduct(
    productCode: string | undefined,
    promotionText: string | undefined,
    headers: any
): Promise<{ id: string; name?: string } | null> {
    const results = await batchFindPromotionsForProducts([{ productCode, promotionText }], headers);
    const key = `${productCode || ''}::${promotionText || ''}`;
    return results.get(key) || null;
}

// Helper: validate that a promotion record is active and within start/end date window
async function isPromotionValid(promotionId: string, headers: any): Promise<boolean> {
    if (!promotionId) return false;
    try {
        const select = ["crdfd_promotionid", "crdfd_start_date", "crdfd_end_date", "crdfd_promotion_deactive", "statecode"];
        const endpoint = `${BASE_URL}${PROMOTION_TABLE}(${promotionId})?$select=${select.join(",")}`;
        const resp = await axios.get(endpoint, { headers });
        const promo = resp.data;
        if (!promo || !promo.crdfd_promotionid) return false;

        // Active statecode = 0
        if (promo.statecode !== undefined && Number(promo.statecode) !== 0) return false;

        // Promotion deactive flag (some systems use crdfd_promotion_deactive = 'Active'/'Inactive')
        if (promo.crdfd_promotion_deactive && String(promo.crdfd_promotion_deactive).toLowerCase() !== "active") {
            return false;
        }

        const now = new Date();
        if (promo.crdfd_start_date) {
            const start = new Date(promo.crdfd_start_date);
            if (isNaN(start.getTime())) {
                // ignore unparsable
            } else if (now < start) {
                return false;
            }
        }
        if (promo.crdfd_end_date) {
            const end = new Date(promo.crdfd_end_date);
            if (isNaN(end.getTime())) {
                // ignore unparsable
            } else if (now > end) {
                return false;
            }
        }

        return true;
    } catch (err: any) {
        console.warn('[Save SOBG] Could not validate promotion:', (err as any)?.message || err);
        return false;
    }
}

// Validate whether a promotion (by id) is applicable to the given order payment terms.
async function isPromotionApplicableToPaymentTerm(
    promotionId: string,
    requestedPaymentTerms: any,
    headers: any
): Promise<{ applicable: boolean; reason?: string }> {
    if (!promotionId) return { applicable: false, reason: "Missing promotionId" };
    try {
        // Helper: split multi-select values into normalized tokens
        const splitAndNormalize = (raw?: any): string[] => {
            if (raw === null || raw === undefined) return [];
            const s = String(raw).trim();
            if (s === "") return [];
            const tokens = s.split(/[,;|\/]+/).map(t => t.trim()).filter(Boolean);
            const normalized = tokens.map(tok => {
                // reuse simple normalization: keep numeric keys or lookups
                return tok;
            }).filter(Boolean) as string[];
            return normalized;
        };

        // If no order payment term provided, treat as applicable
        if (!requestedPaymentTerms && requestedPaymentTerms !== 0) {
            return { applicable: true };
        }

        const promoEndpoint = `${PROMOTION_TABLE}(${promotionId})?$select=cr1bb_ieukhoanthanhtoanapdung`;
        const resp = await axios.get(promoEndpoint, { headers });
        const promo = resp.data;
        const promoPayment = promo?.cr1bb_ieukhoanthanhtoanapdung;

        // If promotion has no payment-term restriction -> applicable
        if (!promoPayment || String(promoPayment).trim() === "") {
            return { applicable: true };
        }

        const promoTokens = splitAndNormalize(promoPayment);
        const requestedTokens = splitAndNormalize(requestedPaymentTerms);

        if (promoTokens.length === 0 && requestedTokens.length === 0) {
            const promoNorm = promoPayment;
            const reqNorm = requestedPaymentTerms;
            if (promoNorm && reqNorm && String(promoNorm) === String(reqNorm)) return { applicable: true };
            return { applicable: false, reason: `Promotion requires payment terms "${promoPayment}", order has "${requestedPaymentTerms}"` };
        }

        const intersection = promoTokens.filter(t => requestedTokens.includes(t));
        if (intersection.length > 0) {
            return { applicable: true };
        }

        return {
            applicable: false,
            reason: `Promotion requires payment terms "${promoPayment}", order has "${requestedPaymentTerms}"`
        };
    } catch (err: any) {
        console.error('[Save SOBG] Error validating promotion payment terms:', err?.message || err);
        return { applicable: false, reason: 'Error validating promotion payment terms' };
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Timeout handling for large datasets - return partial results if taking too long
    const TIMEOUT_MS = parseInt(process.env.SOBG_TIMEOUT_MS || '240000'); // 4 minutes default (Vercel limit is ~5 minutes)
    let timeoutReached = false;
    let responseSent = false;

    const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
            timeoutReached = true;
            if (!responseSent) {
                console.warn(`[Save SOBG] Timeout reached after ${TIMEOUT_MS}ms - returning partial results`);
                resolve(null);
            }
        }, TIMEOUT_MS);
    });

    try {
        // Wrap main processing logic in Promise.race with timeout
        const mainProcessingPromise = async () => {
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

        // ============ STEP 2: PREPARATION - Batch lookups for all products ============
        console.log(`[Save SOBG] Starting batch lookups for ${products.length} products`);

        // Collect all unique product codes and unit conversion pairs for batch processing
        const uniqueProductCodes = new Set<string>();
        const productUnitPairs: Array<{ productCode: string; unitName: string }> = [];

        products.forEach(product => {
            if (product.productCode) {
                uniqueProductCodes.add(product.productCode);
                if (product.unit) {
                    productUnitPairs.push({ productCode: product.productCode, unitName: product.unit });
                }
            }
        });

        // Batch lookup product IDs and unit conversions concurrently
        const [productIdMap, unitConversionMap] = await Promise.all([
            batchLookupProductIds(Array.from(uniqueProductCodes), headers),
            batchLookupUnitConversionIds(productUnitPairs, headers)
        ]);

        console.log(`[Save SOBG] Completed batch lookups - products: ${productIdMap.size}, units: ${unitConversionMap.size}`);

        // ============ STEP 3: VALIDATION - Check required fields before saving ============
        for (const product of products) {
            let unitConvId = undefined;
            // Get Unit Conversion ID from batch lookup
            if (product.productCode && product.unit) {
                unitConvId = unitConversionMap.get(`${product.productCode}::${product.unit}`) || undefined;
            }
            // If lookup failed but frontend provided unitId (unit conversion id), use it
            if (!unitConvId && product.unitId) {
                unitConvId = String(product.unitId).trim() || undefined;
            }

            // VALIDATION: Ensure crdfd_onvi (unit conversion) is available for all products
            if (!unitConvId) {
                return res.status(400).json({
                    error: `Sản phẩm ${product.productCode || product.productName || 'Unknown'} không có thông tin đơn vị (crdfd_onvi). Vui lòng kiểm tra unit/unitId.`,
                    details: {
                        productCode: product.productCode,
                        productName: product.productName,
                        unit: product.unit,
                        unitId: product.unitId
                    }
                });
            }
        }

        // Compute order total to validate promotion min-total conditions
        // Include both existing SOBG products and new products being added
        let existingOrderTotal = 0;
        try {
            // Fetch existing products from SOBG to calculate their total
            const existingProductsResp = await axios.get(`${BASE_URL}${SOD_TABLE}?$filter=_crdfd_maonhang_value eq ${sobgId} and statecode eq 0&$select=crdfd_tongtienkhongvat,crdfd_gtgt,crdfd_tongtien`, { headers });
            if (existingProductsResp.data?.value) {
                existingOrderTotal = existingProductsResp.data.value.reduce((sum: number, item: any) => {
                    const total = Number(item.crdfd_tongtien) || 0;
                    return sum + total;
                }, 0);
            }
        } catch (err) {
            console.warn('[Save SOBG] Could not fetch existing order total, using 0:', err?.message || err);
        }

        const newProductsTotalRaw = (products || []).reduce((s: number, p: any) => {
            const subtotal = p.subtotal ?? ((p.discountedPrice ?? p.price) * (p.quantity || 0));
            const vatAmount = p.vatAmount ?? Math.round((subtotal * (p.vat || 0)) / 100);
            const total = p.totalAmount ?? (subtotal + vatAmount);
            return s + (Number(total) || 0);
        }, 0);

        const orderTotal = Math.round((existingOrderTotal + newProductsTotalRaw) * 100) / 100;

        // Fetch effective payment terms from SOBG header (if present) for promotion validation
        let effectivePaymentTerms: any = undefined;
        try {
            const sobgResp = await axios.get(`${BASE_URL}${SODBAOGIA_TABLE}(${sobgId})?$select=crdfd_dieu_khoan_thanh_toan`, { headers });
            effectivePaymentTerms = sobgResp.data?.crdfd_dieu_khoan_thanh_toan;
        } catch (e) {
            // ignore - treat as no payment term restriction
        }

        // ============ STEP 4: SAVE DETAILS ============
        console.log(`[Save SOBG] Starting to save ${products.length} products`);

        let totalSaved = 0;
        let failedProducts: Array<{ productCode: string; error: string }> = [];
        const savedDetails: any[] = [];
        // Collect promotions to apply at header level (SOBG x Promotion)
        const promotionsToApplyMap: Map<string, { promotionId: string }> = new Map();
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

        // Prepare all products for concurrent processing
        const productProcessingTasks: Array<{
            product: any;
            index: number;
            productId?: string;
            unitConvId?: string;
            promotionId?: string | null;
            entity: any;
        }> = [];

        // Pre-compute promotion IDs for all products to avoid repeated API calls
        console.log(`[Save SOBG] Pre-computing promotion IDs for all products`);
        const promotionTasks: Array<{ product: any; index: number }> = products.map((product, index) => ({ product, index }));

        // Configurable concurrency limits (can be set via environment variables)
        // Increased batch sizes for better performance with large datasets (300+ products)
        const CONCURRENT_BATCH_SIZE = parseInt(process.env.SOBG_CONCURRENT_BATCH_SIZE || '50'); // Process N products concurrently (increased from 10)
        const PROMOTION_BATCH_SIZE = parseInt(process.env.SOBG_PROMOTION_BATCH_SIZE || '25'); // Process N promotions concurrently (increased from 5)
        const PATCH_BATCH_SIZE = parseInt(process.env.SOBG_PATCH_BATCH_SIZE || '25'); // Process N patches concurrently (increased from 5)
        const MAX_CONCURRENT_BATCHES = parseInt(process.env.SOBG_MAX_CONCURRENT_BATCHES || '3'); // Max concurrent batches to run in parallel

        // Process promotions in parallel batches with concurrency control
        const promotionResults: Array<{ index: number; promotionId: string | null }> = [];

        // Create all promotion batches
        const promotionBatches: Array<{ batchIndex: number; tasks: Array<{ product: any; index: number }> }> = [];
        for (let i = 0; i < promotionTasks.length; i += PROMOTION_BATCH_SIZE) {
            promotionBatches.push({
                batchIndex: Math.floor(i / PROMOTION_BATCH_SIZE),
                tasks: promotionTasks.slice(i, i + PROMOTION_BATCH_SIZE)
            });
        }

        // Process promotion batches with limited concurrency
        const processPromotionBatch = async (batch: { batchIndex: number; tasks: Array<{ product: any; index: number }> }) => {
            const batchPromises = batch.tasks.map(async ({ product, index }) => {
                let promotionId: string | null = null;

                try {
                    // Step 0: If frontend provided a promotionId, prefer it (frontend overrides server inference)
                    if (product.promotionId) {
                        promotionId = String(product.promotionId).replace(/^{|}$/g, '').trim();
                    }

                    // Step 1: Try to match against SOBG promotions previously selected/applied (crdfd_sobaogiaxpromotions)
                    if (!promotionId) {
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
                            promotionId = String(matched.promotionId).replace(/^{|}$/g, '').trim();
                        }
                    }

                    // Step 2: Nếu không tìm thấy trong SOBG promotions (và frontend không override), thử lookup từ promotionText của product
                    if (!promotionId && product.promotionText) {
                        promotionId = await lookupPromotionIdByText(product.promotionText, headers);
                    }

                    // Step 3: Fallback - lookup by productCode và promotionText trong promotions table
                    if (!promotionId) {
                        const inferred = await findPromotionForProduct(product.productCode, product.promotionText, headers);
                        if (inferred && inferred.id) {
                            promotionId = String(inferred.id).replace(/^{|}$/g, '').trim();
                        }
                    }

                    // Validate promotion if found
                    if (promotionId) {
                        try {
                            // Fetch promotion metadata for min-total and payment-terms
                            let promoData: any = null;
                            try {
                                const promoResp = await axios.get(`${BASE_URL}${PROMOTION_TABLE}(${promotionId})?$select=cr1bb_tongtienapdung,cr1bb_ieukhoanthanhtoanapdung`, { headers });
                                promoData = promoResp.data;
                            } catch (innerErr) {
                                // ignore, will still try basic active validation
                            }

                            // Validate min-total requirement (if any)
                            const minTotalReq = Number(promoData?.cr1bb_tongtienapdung) || 0;
                            if (minTotalReq > 0 && Number(orderTotal) < minTotalReq) {
                                promotionId = null;
                            }

                            // Validate payment term applicability (if still candidate)
                            if (promotionId) {
                                const promoCheck = await isPromotionApplicableToPaymentTerm(promotionId, effectivePaymentTerms, headers);
                                if (!promoCheck.applicable) {
                                    promotionId = null;
                                }
                            }

                            // Finally validate active/date window before binding
                            if (promotionId) {
                                const ok = await isPromotionValid(promotionId, headers);
                                if (!ok) {
                                    promotionId = null;
                                }
                            }
                        } catch (e) {
                            promotionId = null;
                        }
                    }
                } catch (e) {
                    promotionId = null;
                }

                return { index, promotionId };
            });

            const batchResults = await Promise.allSettled(batchPromises);
            return batchResults.map(result => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    // On error, return null promotionId
                    return { index: -1, promotionId: null }; // Will be filtered out
                }
            }).filter(r => r.index !== -1);
        };

        // Execute promotion batches with concurrency control
        const promotionBatchPromises: Promise<Array<{ index: number; promotionId: string | null }>>[] = [];
        for (let i = 0; i < promotionBatches.length; i += MAX_CONCURRENT_BATCHES) {
            const concurrentBatches = promotionBatches.slice(i, i + MAX_CONCURRENT_BATCHES);
            const batchPromises = concurrentBatches.map(batch => processPromotionBatch(batch));
            promotionBatchPromises.push(...batchPromises);

            // Wait for this wave of concurrent batches to complete before starting next wave
            if (promotionBatchPromises.length >= MAX_CONCURRENT_BATCHES) {
                const results = await Promise.allSettled(promotionBatchPromises.splice(0, MAX_CONCURRENT_BATCHES));
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        promotionResults.push(...result.value);
                    }
                });
            }
        }

        // Process remaining batches
        if (promotionBatchPromises.length > 0) {
            const results = await Promise.allSettled(promotionBatchPromises);
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    promotionResults.push(...result.value);
                }
            });
        }

        // Prepare all product entities for concurrent creation
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const promotionResult = promotionResults.find(r => r.index === i);
            const promotionId = promotionResult?.promotionId || null;

            let productId = product.productId;
            if (!productId && product.productCode) {
                productId = productIdMap.get(product.productCode) || undefined;
            }

            let unitConvId = undefined;
            if (product.productCode && product.unit) {
                unitConvId = unitConversionMap.get(`${product.productCode}::${product.unit}`) || undefined;
            }
            if (!unitConvId && product.unitId) {
                unitConvId = String(product.unitId).trim() || undefined;
            }

            // Compute canonical subtotal/vat/total to match UI 'Tổng' (subtotal + VAT)
            const computedSubtotalRaw = product.subtotal ?? ((product.discountedPrice ?? product.price) * (product.quantity || 0));
            const computedSubtotal = Math.round(computedSubtotalRaw * 100) / 100;
            const computedVatAmount = product.vatAmount ?? (Math.round(((computedSubtotal * (product.vat || 0)) / 100) * 100) / 100);
            const computedTotal = product.totalAmount ?? (Math.round(((computedSubtotal + computedVatAmount) * 100) / 1) / 100);

            // Compute deliveryDateNew and shift (ca) server-side if frontend didn't provide shift
            const { deliveryDateNew, shift } = await calculateDeliveryDateAndShift(product, products, customerIndustry, product.deliveryDate);

            // Map fields based on Metadata & Prediction (Vietnamese Schema)
            const entity: any = {
                "crdfd_Maonhang@odata.bind": `/crdfd_sobaogias(${sobgId})`,
                ...(productId ? { "crdfd_Sanpham@odata.bind": `/crdfd_productses(${productId})` } : {}),
                ...(unitConvId ? { "crdfd_onvi@odata.bind": `/crdfd_unitconvertions(${unitConvId})` } : {}),
                "crdfd_soluong": product.quantity,
                "crdfd_ongia": product.discountedPrice ?? product.price,
                "crdfd_ieuchinhgtgt": mapVatPercentToChoice(product.vat),
                "crdfd_gtgt": mapVatPercentToChoice(product.vat),
                "crdfd_tongtienkhongvat": computedSubtotal,
                ...(shift ? { "cr1bb_ca": shift } : {}),
                "crdfd_ngaygiaodukien": deliveryDateNew ? deliveryDateNew : formatDateForCRM(product.deliveryDate),
                "crdfd_chietkhau": product.discountPercent ? product.discountPercent / 100 : 0,
                "crdfd_chietkhauvn": product.discountAmount ?? 0,
                "crdfd_chietkhau2": product.discount2 ? product.discount2 / 100 : 0,
                "crdfd_giack1": product.originalPrice ?? product.price ?? 0,
                "crdfd_giack2": product.discountedPrice ?? product.price ?? 0,
                "crdfd_giagoc": product.originalPrice ?? product.price,
                "crdfd_phu_phi_hoa_don": product.surcharge || 0,
                "crdfd_stton": Number(product.stt) || 0,
                "crdfd_promotiontext": product.promotionText || "",
                "crdfd_ghichu": product.note || "",
                ...(promotionId ? { "crdfd_Promotion@odata.bind": `/crdfd_promotions(${promotionId})` } : {}),
            };

            // Map and set approval choice if provided/derivable.
            const mappedApproval = mapApprovalToChoice(product.approvePrice, product.approverChoiceValue || product.approverChoice);
            if (mappedApproval !== null) {
                entity["crdfd_duyetgia"] = mappedApproval;
            }

            // If SUP approver ID is provided, set lookup binding property
            if (product.approveSupPrice && product.approveSupPriceId) {
                entity[`cr1bb_duyetgiasup@odata.bind`] = `/crdfd_duyetgias(${product.approveSupPriceId})`;
            }

            productProcessingTasks.push({
                product,
                index: i,
                productId,
                unitConvId,
                promotionId,
                entity
            });
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

        // ============ PARALLEL BATCH PROCESSING ============
        console.log(`[Save SOBG] Starting parallel batch processing of ${productProcessingTasks.length} products`);
        const createdRecords: Array<{ recordId: string; product: any; entity: any }> = [];

        // Create all record creation batches
        const recordBatches: Array<{ batchIndex: number; tasks: Array<{ product: any; index: number; productId?: string; unitConvId?: string; promotionId?: string | null; entity: any }> }> = [];
        for (let i = 0; i < productProcessingTasks.length; i += CONCURRENT_BATCH_SIZE) {
            recordBatches.push({
                batchIndex: Math.floor(i / CONCURRENT_BATCH_SIZE),
                tasks: productProcessingTasks.slice(i, i + CONCURRENT_BATCH_SIZE)
            });
        }

        // Process record creation batch
        const processRecordBatch = async (batch: { batchIndex: number; tasks: Array<{ product: any; index: number; productId?: string; unitConvId?: string; promotionId?: string | null; entity: any }> }) => {
            console.log(`[Save SOBG] Processing batch ${batch.batchIndex + 1}/${recordBatches.length} (${batch.tasks.length} products)`);

            const batchPromises = batch.tasks.map(async (task) => {
                const { product, index, entity } = task;

                try {
                    // Use impersonation to set the correct createdby user
                    const createHeaders: any = { ...headers };
                    if (ownerSystemUserId) {
                        createHeaders['MSCRMCallerID'] = ownerSystemUserId;
                    }

                    const createResponse = await axios.post(`${BASE_URL}${SODBAOGIA_TABLE}`, entity, { headers: createHeaders });

                    // Get the created record ID from response headers
                    const createdRecordUrl = createResponse.headers['odata-entityid'] || createResponse.headers['location'];
                    let createdRecordId: string | null = null;

                    if (createdRecordUrl) {
                        const match = createdRecordUrl.match(/\(([a-f0-9-]+)\)/i);
                        if (match) {
                            createdRecordId = match[1];
                        }
                    }

                    if (createdRecordId) {
                        return { recordId: createdRecordId, product, entity, success: true };
                    } else {
                        throw new Error('Could not extract record ID from response');
                    }
                } catch (err: any) {
                    console.error(`Failed to create record for product ${product.productCode}:`, err?.response?.data || err.message);
                    return {
                        recordId: null,
                        product,
                        entity,
                        success: false,
                        error: err?.response?.data?.error?.message || err.message
                    };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            return batchResults.map(result => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    // Promise rejected
                    console.error('[Save SOBG] Batch promise rejected:', result.reason);
                    return {
                        recordId: null,
                        product: { productCode: 'unknown' },
                        entity: null,
                        success: false,
                        error: 'Batch processing error'
                    };
                }
            });
        };

        // Execute record batches with concurrency control
        const recordBatchPromises: Promise<Array<{ recordId: string | null; product: any; entity: any; success: boolean; error?: string }>>[] = [];
        for (let i = 0; i < recordBatches.length; i += MAX_CONCURRENT_BATCHES) {
            const concurrentBatches = recordBatches.slice(i, i + MAX_CONCURRENT_BATCHES);
            const batchPromises = concurrentBatches.map(batch => processRecordBatch(batch));
            recordBatchPromises.push(...batchPromises);

            // Wait for this wave of concurrent batches to complete before starting next wave
            if (recordBatchPromises.length >= MAX_CONCURRENT_BATCHES) {
                const results = await Promise.allSettled(recordBatchPromises.splice(0, MAX_CONCURRENT_BATCHES));
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        result.value.forEach(record => {
                            if (record.success && record.recordId) {
                                createdRecords.push({ recordId: record.recordId, product: record.product, entity: record.entity });
                                totalSaved++;

                                // collect info for frontend
                                savedDetails.push({
                                    productCode: record.product.productCode || null,
                                    productName: record.product.productName || null,
                                    id: record.recordId
                                });

                                // Collect promotionId for header-level promotions
                                try {
                                    const bound = record.entity['crdfd_Promotion@odata.bind'];
                                    if (bound && typeof bound === 'string') {
                                        const m = bound.match(/\(([^)]+)\)/);
                                        if (m && m[1]) {
                                            const pid = m[1];
                                            if (!promotionsToApplyMap.has(pid)) {
                                                promotionsToApplyMap.set(pid, { promotionId: pid });
                                            }
                                        }
                                    }
                                } catch (e) {
                                    /* ignore collection errors */
                                }
                            } else {
                                failedProducts.push({
                                    productCode: record.product.productCode,
                                    error: record.error || 'Unknown error'
                                });
                            }
                        });
                    }
                });
            }
        }

        // Process remaining batches
        if (recordBatchPromises.length > 0) {
            const results = await Promise.allSettled(recordBatchPromises);
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    result.value.forEach(record => {
                        if (record.success && record.recordId) {
                            createdRecords.push({ recordId: record.recordId, product: record.product, entity: record.entity });
                            totalSaved++;

                            // collect info for frontend
                            savedDetails.push({
                                productCode: record.product.productCode || null,
                                productName: record.product.productName || null,
                                id: record.recordId
                            });

                            // Collect promotionId for header-level promotions
                            try {
                                const bound = record.entity['crdfd_Promotion@odata.bind'];
                                if (bound && typeof bound === 'string') {
                                    const m = bound.match(/\(([^)]+)\)/);
                                    if (m && m[1]) {
                                        const pid = m[1];
                                        if (!promotionsToApplyMap.has(pid)) {
                                            promotionsToApplyMap.set(pid, { promotionId: pid });
                                        }
                                    }
                                }
                            } catch (e) {
                                /* ignore collection errors */
                            }
                        }
                    });
                }
            });
        }

        console.log(`[Save SOBG] Created ${createdRecords.length} records. Now performing batch updates...`);

        // ============ PARALLEL BATCH PATCH OPERATIONS ============
        if (createdRecords.length > 0 && ownerSystemUserId) {
            console.log(`[Save SOBG] Performing parallel batch owner/createdby updates for ${createdRecords.length} records`);

            // Create owner update batches
            const ownerBatches: Array<{ batchIndex: number; records: Array<{ recordId: string; product: any; entity: any }> }> = [];
            for (let i = 0; i < createdRecords.length; i += PATCH_BATCH_SIZE) {
                ownerBatches.push({
                    batchIndex: Math.floor(i / PATCH_BATCH_SIZE),
                    records: createdRecords.slice(i, i + PATCH_BATCH_SIZE)
                });
            }

            // Process owner updates in parallel batches
            const processOwnerBatch = async (batch: { batchIndex: number; records: Array<{ recordId: string; product: any; entity: any }> }) => {
                const ownerPromises = batch.records.map(async (record) => {
                    try {
                        await axios.patch(
                            `${BASE_URL}${SODBAOGIA_TABLE}(${record.recordId})`,
                            { "ownerid@odata.bind": `/systemusers(${ownerSystemUserId})` },
                            { headers }
                        );
                        return { recordId: record.recordId, success: true };
                    } catch (err: any) {
                        console.warn(`[Save SOBG] Could not set ownerid for ${record.recordId}:`, err.message);
                        return { recordId: record.recordId, success: false };
                    }
                });
                return await Promise.allSettled(ownerPromises);
            };

            // Execute owner batches with concurrency control
            const ownerBatchPromises: Promise<PromiseSettledResult<{ recordId: string; success: boolean }>[] >[] = [];
            for (let i = 0; i < ownerBatches.length; i += MAX_CONCURRENT_BATCHES) {
                const concurrentBatches = ownerBatches.slice(i, i + MAX_CONCURRENT_BATCHES);
                const batchPromises = concurrentBatches.map(batch => processOwnerBatch(batch));
                ownerBatchPromises.push(...batchPromises);

                // Wait for this wave of concurrent batches
                if (ownerBatchPromises.length >= MAX_CONCURRENT_BATCHES) {
                    await Promise.allSettled(ownerBatchPromises.splice(0, MAX_CONCURRENT_BATCHES));
                }
            }

            // Process remaining owner batches
            if (ownerBatchPromises.length > 0) {
                await Promise.allSettled(ownerBatchPromises);
            }

            // Batch createdby updates with parallel processing
            const CREATEDBY_CANDIDATES = [
                "crdfd_createdby",
                "crdfd_createdby_customer",
                "cr44a_createdby",
                "cr44a_createdby_customer",
                "cr1bb_createdby",
                "cr1bb_createdby_customer",
            ];

            // Try each createdby field candidate in parallel batches
            for (const fieldName of CREATEDBY_CANDIDATES) {
                const createdByBatches: Array<{ batchIndex: number; records: Array<{ recordId: string; product: any; entity: any }> }> = [];
                for (let i = 0; i < createdRecords.length; i += PATCH_BATCH_SIZE) {
                    createdByBatches.push({
                        batchIndex: Math.floor(i / PATCH_BATCH_SIZE),
                        records: createdRecords.slice(i, i + PATCH_BATCH_SIZE)
                    });
                }

                const processCreatedByBatch = async (batch: { batchIndex: number; records: Array<{ recordId: string; product: any; entity: any }> }) => {
                    const createdByPromises = batch.records.map(async (record) => {
                        try {
                            await axios.patch(
                                `${BASE_URL}${SODBAOGIA_TABLE}(${record.recordId})`,
                                { [`${fieldName}@odata.bind`]: `/systemusers(${ownerSystemUserId})` },
                                { headers }
                            );
                            return { recordId: record.recordId, success: true };
                        } catch (err: any) {
                            return { recordId: record.recordId, success: false };
                        }
                    });
                    return await Promise.allSettled(createdByPromises);
                };

                // Execute createdby batches with concurrency
                const createdByBatchPromises: Promise<PromiseSettledResult<{ recordId: string; success: boolean }>[] >[] = [];
                for (let i = 0; i < createdByBatches.length; i += MAX_CONCURRENT_BATCHES) {
                    const concurrentBatches = createdByBatches.slice(i, i + MAX_CONCURRENT_BATCHES);
                    const batchPromises = concurrentBatches.map(batch => processCreatedByBatch(batch));
                    createdByBatchPromises.push(...batchPromises);

                    // Wait for this wave and check success
                    if (createdByBatchPromises.length >= MAX_CONCURRENT_BATCHES) {
                        const results = await Promise.allSettled(createdByBatchPromises.splice(0, MAX_CONCURRENT_BATCHES));
                        const successful = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
                                                   .filter(r => r.status === 'fulfilled' && r.value.success).length;

                        if (successful > 0) {
                            console.log(`[Save SOBG] Set createdby using field ${fieldName} for ${successful} records`);
                            break; // Success with this field, no need to try other fields
                        }
                    }
                }

                // Process remaining createdby batches
                if (createdByBatchPromises.length > 0) {
                    const results = await Promise.allSettled(createdByBatchPromises);
                    const successful = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
                                               .filter(r => r.status === 'fulfilled' && r.value.success).length;

                    if (successful > 0) {
                        console.log(`[Save SOBG] Set createdby using field ${fieldName} for ${successful} records`);
                        break; // Success with this field, no need to try other fields
                    }
                }
            }
        }

        console.log(`[Save SOBG] Completed batch processing. Total saved: ${totalSaved}, Failed: ${failedProducts.length}`);

        // After saving all details, ensure header-level SOBG x Promotion records exist for each promotion used by details.
        if (promotionsToApplyMap.size > 0) {
            for (const [promoId] of promotionsToApplyMap) {
                try {
                    // Call internal apply promotion API which handles validation and creation
                    await axios.post(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/admin-app/apply-sobg-promotion-order`, {
                        sobgId,
                        promotionId: promoId,
                        promotionName: null,
                        promotionValue: null,
                        vndOrPercent: null,
                        chietKhau2: null,
                        productCodes: null,
                        productGroupCodes: null,
                        orderTotal
                    }, { headers });
                } catch (e: any) {
                    console.warn('[Save SOBG] Could not create header SOBG x Promotion for promotionId', promoId, (e?.response?.data || e?.message || e));
                }
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

            // Create background job for inventory updates if warehouse provided and we saved items
            const backgroundJobs: string[] = [];
            if (warehouseName && savedDetails.length > 0) {
                try {
                    const inventoryJobId = createBackgroundJob('inventory_update');
                    backgroundJobs.push(inventoryJobId);
                    // Run in background (fire and forget - don't await)
                    // Use setImmediate to ensure it runs after response is sent
                    setImmediate(() => {
                        processInventoryUpdatesInBackground(inventoryJobId, savedDetails, warehouseName, isVatOrder, headers)
                            .then(() => {
                                console.log(`[Save SOBG] Background inventory job ${inventoryJobId} completed successfully`);
                            })
                            .catch((err) => {
                                console.error('[Save SOBG] Background inventory job failed:', err);
                                updateJobStatus(inventoryJobId, 'failed', { error: err?.message || err });
                            });
                    });
                } catch (e) {
                    console.warn('[Save SOBG] Could not create background job for inventory:', (e as any)?.message || e);
                }
            }

            return res.status(200).json({ success: true, totalSaved, totalRequested: products.length, savedDetails, message: "OK", backgroundJobs });
        };

        // Execute main processing with timeout handling
        const result = await Promise.race([mainProcessingPromise(), timeoutPromise]);

        // If timeout was reached but response not sent yet, send partial results
        if (timeoutReached && !responseSent) {
            responseSent = true;
            return res.status(200).json({
                success: false,
                partialSuccess: true,
                timeout: true,
                message: `Processing timeout after ${TIMEOUT_MS}ms. Check background jobs for completion status.`
            });
        }

        // If main processing completed successfully, result is already sent
        // If timeout occurred, we already handled it above

    } catch (error: any) {
        console.error("System Error SOBG:", error);
        return res.status(500).json({ error: "Lỗi hệ thống", details: error.message });
    }
}

// Helper function to update inventory after saving SOBG (atomic updates)
// Re-check inventory right before update to prevent negative stock. Similar to SOD logic.
async function updateInventoryAfterSaleSOBG(
    productCode: string,
    quantity: number,
    warehouseName: string | undefined,
    isVatOrder: boolean,
    headers: any,
    productGroupCode?: string,
    skipStockCheck?: boolean
): Promise<void> {
    if (!productCode || !warehouseName) return;
    const safeCode = productCode.trim().replace(/'/g, "''");
    const safeWarehouse = warehouseName.trim().replace(/'/g, "''");
    try {
        if (!isVatOrder) {
            let invFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
            if (safeWarehouse) invFilter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
            const invColumns = "cr44a_inventoryweshopid,cr44a_soluongtonlythuyet,cr1bb_soluonglythuyetgiuathang,cr1bb_vitrikhotext";
            const invQuery = `$select=${invColumns}&$filter=${encodeURIComponent(invFilter)}&$top=1`;
            const invEndpoint = `${BASE_URL}${INVENTORY_TABLE}?${invQuery}`;
            const invResponse = await axios.get(invEndpoint, { headers });
            const invResults = invResponse.data.value || [];
            let invRecord: any = null;
            if (invResults.length > 0) invRecord = invResults[0];
            else if (safeWarehouse) {
                const fallbackFilter = `cr44a_masanpham eq '${safeCode}' and statecode eq 0`;
                const fallbackQuery = `$select=${invColumns}&$filter=${encodeURIComponent(fallbackFilter)}&$top=1`;
                const fallbackEndpoint = `${BASE_URL}${INVENTORY_TABLE}?${fallbackQuery}`;
                const fallbackResponse = await axios.get(fallbackEndpoint, { headers });
                const fallbackResults = fallbackResponse.data.value || [];
                if (fallbackResults.length > 0) invRecord = fallbackResults[0];
            }

            if (invRecord && invRecord.cr44a_inventoryweshopid) {
                const currentInventory = invRecord.cr44a_soluongtonlythuyet ?? 0;
                const reservedQuantity = invRecord.cr1bb_soluonglythuyetgiuathang ?? 0;
                const ALLOWED_PRODUCT_GROUPS = ['NSP-00027', 'NSP-000872', 'NSP-000409', 'NSP-000474', 'NSP-000873'];
                const isSpecialProduct = productGroupCode && ALLOWED_PRODUCT_GROUPS.includes(productGroupCode);
                if (!skipStockCheck && !isSpecialProduct && currentInventory < quantity) {
                    throw new Error(`Không đủ tồn kho để chốt đơn! Sản phẩm ${productCode} có tồn kho: ${currentInventory}, yêu cầu: ${quantity}`);
                }
                const newReservedQuantity = Math.max(0, reservedQuantity - quantity);
                let newCurrentInventory: number | undefined;
                if (!isSpecialProduct) newCurrentInventory = currentInventory - quantity;
                else newCurrentInventory = undefined;
                const updateInvEndpoint = `${BASE_URL}${INVENTORY_TABLE}(${invRecord.cr44a_inventoryweshopid})`;
                const updatePayload: any = { cr1bb_soluonglythuyetgiuathang: newReservedQuantity };
                if (newCurrentInventory !== undefined) updatePayload.cr44a_soluongtonlythuyet = newCurrentInventory;
                await axios.patch(updateInvEndpoint, updatePayload, { headers });
            }
        }

        if (isVatOrder) {
            let khoBDFilter = `crdfd_masp eq '${safeCode}' and statecode eq 0`;
            if (safeWarehouse) khoBDFilter += ` and crdfd_vitrikhofx eq '${safeWarehouse}'`;
            const khoBDColumns = "crdfd_kho_binh_dinhid,cr1bb_soluonganggiuathang,crdfd_vitrikhofx";
            const khoBDQuery = `$select=${khoBDColumns}&$filter=${encodeURIComponent(khoBDFilter)}&$top=1`;
            const khoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}?${khoBDQuery}`;
            const khoBDResponse = await axios.get(khoBDEndpoint, { headers });
            const khoBDResults = khoBDResponse.data.value || [];
            if (khoBDResults.length > 0) {
                const khoBDRecord = khoBDResults[0];
                const reservedQuantity = khoBDRecord.cr1bb_soluonganggiuathang ?? 0;
                const newReservedQuantity = Math.max(0, reservedQuantity - quantity);
                const updateKhoBDEndpoint = `${BASE_URL}${KHO_BD_TABLE}(${khoBDRecord.crdfd_kho_binh_dinhid})`;
                const updatePayload: any = { cr1bb_soluonganggiuathang: newReservedQuantity };
                await axios.patch(updateKhoBDEndpoint, updatePayload, { headers });
            }
        }
    } catch (err: any) {
        throw err;
    }
}

// Background processor for inventory updates (uses updateInventoryAfterSaleSOBG)
async function processInventoryUpdatesInBackground(
    jobId: string,
    savedDetails: any[],
    warehouseName: string | undefined,
    isVatOrder: boolean,
    headers: any
): Promise<void> {
    updateJobStatus(jobId, 'running', {
        progress: { total: savedDetails.length, completed: 0, currentStep: 'Grouping products' }
    });
    try {
        const inventoryGroups = new Map<string, Array<{ product: any, quantity: number }>>();
        for (const savedProduct of savedDetails) {
            if (savedProduct.productCode && savedProduct.quantity > 0) {
                const key = `${savedProduct.productCode}::${warehouseName}`;
                if (!inventoryGroups.has(key)) inventoryGroups.set(key, []);
                inventoryGroups.get(key)!.push({ product: savedProduct, quantity: savedProduct.quantity });
            }
        }

        const INVENTORY_BATCH_SIZE = 3;
        let processedCount = 0;
        const promises: Promise<void>[] = [];
        const inventoryErrors: any[] = [];

        for (const [groupKey, items] of inventoryGroups) {
            const p = (async () => {
                const [productCode] = groupKey.split('::');
                const firstProduct = items[0].product;
                try {
                    const totalQuantity = items.reduce((s, it) => s + it.quantity, 0);
                    await updateInventoryAfterSaleSOBG(productCode, totalQuantity, warehouseName, isVatOrder, headers, firstProduct.productGroupCode, false);
                } catch (err: any) {
                    inventoryErrors.push({
                        productCode,
                        productName: firstProduct.productName,
                        quantity: items.reduce((s, it) => s + it.quantity, 0),
                        error: err?.message || err
                    });
                }
            })();
            promises.push(p);
            if (promises.length >= INVENTORY_BATCH_SIZE) {
                await Promise.allSettled(promises);
                promises.length = 0;
                processedCount += INVENTORY_BATCH_SIZE;
                updateJobStatus(jobId, 'running', {
                    progress: { total: inventoryGroups.size, completed: processedCount, currentStep: `Processed ${processedCount}/${inventoryGroups.size} product groups` }
                });
            }
        }
        if (promises.length > 0) await Promise.allSettled(promises);
        const success = inventoryErrors.length === 0;
        updateJobStatus(jobId, success ? 'completed' : 'failed', { result: { totalGroups: inventoryGroups.size, errors: inventoryErrors }, error: success ? undefined : 'Some inventory updates failed' });
    } catch (err: any) {
        updateJobStatus(jobId, 'failed', { error: err?.message || err });
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

