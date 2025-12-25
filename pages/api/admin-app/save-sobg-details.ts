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
            console.log('[Save SOBG] 🔍 Searching systemuser by domainname:', safeUsername);
        } else if (email) {
            const safeEmail = email.trim().replace(/'/g, "''");
            filter = `internalemailaddress eq '${safeEmail}'`;
            console.log('[Save SOBG] 🔍 Searching systemuser by email:', safeEmail);
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
        console.log('[Save SOBG] 🔍 Searching employee by email (cr1bb_emailcal):', safeEmail);

        const filter = `cr1bb_emailcal eq '${safeEmail}' and statecode eq 0`;
        const query = `$select=crdfd_employeeid,crdfd_name,cr1bb_emailcal&$filter=${encodeURIComponent(filter)}&$top=1`;
        const endpoint = `${BASE_URL}${EMPLOYEE_TABLE}?${query}`;

        const response = await axios.get(endpoint, { headers });
        const results = response.data.value || [];

        if (results.length > 0) {
            console.log('[Save SOBG] ✅ Found employee:', {
                employeeId: results[0].crdfd_employeeid,
                employeeName: results[0].crdfd_name,
                email: results[0].cr1bb_emailcal
            });
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
        console.log('[Save SOBG] 📥 Received userInfo:', JSON.stringify(userInfo, null, 2));

        // Lookup systemuser ID from userInfo email for owner/createdby
        // Note: ownerid in Dynamics 365 can only reference systemuser or team, not custom employee entities
        let ownerSystemUserId: string | null = null;
        if (userInfo && userInfo.email) {
            console.log('[Save SOBG] 🔍 Looking up systemuser with email:', userInfo.email);
            ownerSystemUserId = await lookupSystemUserId(headers, undefined, userInfo.email);
            if (ownerSystemUserId) {
                console.log('[Save SOBG] ✅ Found systemuser for owner:', {
                    systemUserId: ownerSystemUserId,
                    email: userInfo.email
                });
            } else {
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
                    "crdfd_ongia": product.price, // Schema name typo: ongia
                    "crdfd_ieuchinhgtgt": mapVatPercentToChoice(product.vat),

                    "crdfd_gtgt": product.vatAmount, // GTGT Value
                    "crdfd_tongtienkhongvat": product.subtotal, // Total exclude VAT
                    // "crdfd_thanhtien": product.totalAmount, // Field not found in metadata. Skip.

                    // Name (Common field)
                    "crdfd_name": product.productName || "SOBG Detail",

                    // NEW FIELDS
                    "cr1bb_ca": mapShiftToChoice(product.shift),
                    "crdfd_ngaygiaodukien": formatDateForCRM(product.deliveryDate),
                    "crdfd_chietkhau": product.discount ? product.discount / 100 : 0,
                    "crdfd_chietkhauvn": product.discountVND || 0,
                    "crdfd_chietkhau2": product.discount2 ? product.discount2 / 100 : 0,
                    "crdfd_giack1": product.priceDiscount1 || 0,
                    "crdfd_giack2": product.priceDiscount2 || 0,
                    "crdfd_phu_phi_hoa_don": product.surcharge || 0,
                };

                console.log('[Save SOBG] 💾 Creating entity...');

                // Use impersonation to set the correct createdby user
                // MSCRMCallerID header tells Dynamics 365 to create the record as if this user did it
                const createHeaders: any = { ...headers };
                if (ownerSystemUserId) {
                    createHeaders['MSCRMCallerID'] = ownerSystemUserId;
                    console.log('[Save SOBG] 🎭 Impersonating systemuser for creation:', ownerSystemUserId);
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
                        console.log('[Save SOBG] ✅ Created record:', createdRecordId);
                    }
                }

                // PATCH to set owner and createdby if we have ownerSystemUserId and createdRecordId
                if (ownerSystemUserId && createdRecordId) {
                    console.log('[Save SOBG] 🔧 Patching ownerid and createdby:', {
                        recordId: createdRecordId,
                        ownerSystemUserId
                    });

                    try {
                        // Set ownerid to systemuser
                        await axios.patch(
                            `${BASE_URL}${SODBAOGIA_TABLE}(${createdRecordId})`,
                            { "ownerid@odata.bind": `/systemusers(${ownerSystemUserId})` },
                            { headers }
                        );
                        console.log('[Save SOBG] ✅ Set ownerid successfully');
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
                            console.log('[Save SOBG] ✅ Set createdby successfully using field:', fieldName);
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

                totalSaved++;

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
                message: `Lưu ${totalSaved} sản phẩm thành công. ${failedProducts.length} thất bại.`
            });
        }

        return res.status(200).json({ success: true, totalSaved, message: "OK" });

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
