import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SODBAOGIA_TABLE = "crdfd_sodbaogias"; // Bảng Detail
const INVENTORY_TABLE = "cr44a_inventoryweshops";
const PRODUCT_TABLE = "crdfd_productses";
// Theo metadata: crdfd_onvi trỏ tới crdfd_unitconvertions, không phải crdfd_units
const UNIT_CONVERSION_TABLE = "crdfd_unitconvertions";

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
            products,
        } = req.body;

        if (!sobgId) return res.status(400).json({ error: "sobgId is required" });
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "products array is required" });
        }

        const token = await getAccessToken();
        if (!token) return res.status(401).json({ error: "Failed token" });

        const headers = { Authorization: `Bearer ${token}` };

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

                await axios.post(`${BASE_URL}${SODBAOGIA_TABLE}`, entity, { headers });
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
