import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const SOBG_ORDERS_X_PROMOTION_TABLE = "crdfd_sobaogiaxpromotions"; // SO báo giá x Promotion
const SOBG_DETAIL_TABLE = "crdfd_sodbaogias"; // SOD báo giá
const SOBG_HEADER_TABLE = "crdfd_sobaogias"; // SO báo giá

// Payment terms mapping used to normalize values
const PAYMENT_TERMS_MAP_SOBG: Record<string, string> = {
  "0": "Thanh toán sau khi nhận hàng",
  "14": "Thanh toán 2 lần vào ngày 10 và 25",
  "30": "Thanh toán vào ngày 5 hàng tháng",
  "283640000": "Tiền mặt",
  "283640001": "Công nợ 7 ngày",
  "191920001": "Công nợ 20 ngày",
  "283640002": "Công nợ 30 ngày",
  "283640003": "Công nợ 45 ngày",
  "283640004": "Công nợ 60 ngày",
  "283640005": "Thanh toán trước khi nhận hàng",
};

const normalizePaymentTermSOBG = (input?: any): string | null => {
  if (input === null || input === undefined || input === "") return null;
  const t = String(input).trim();
  if (t === "") return null;
  if (PAYMENT_TERMS_MAP_SOBG[t]) return t;
  const foundKey = Object.keys(PAYMENT_TERMS_MAP_SOBG).find(
    (k) => PAYMENT_TERMS_MAP_SOBG[k].toLowerCase() === t.toLowerCase()
  );
  if (foundKey) return foundKey;
  const digits = t.replace(/\D/g, "");
  if (digits && PAYMENT_TERMS_MAP_SOBG[digits]) return digits;
  return t;
};

/**
 * API để áp dụng Promotion Order cho SO Báo Giá (SOBG)
 *
 * Body:
 * - sobgId: ID của SO Báo Giá
 * - promotionId: ID của Promotion được chọn
 * - promotionName: Tên Promotion
 * - promotionValue: Giá trị chiết khấu
 * - vndOrPercent: "VNĐ" hoặc "%"
 * - chietKhau2: Có phải chiết khấu 2 không (true/false)
 * - productCodes: Danh sách mã sản phẩm áp dụng chiết khấu 2
 * - productGroupCodes: Danh sách mã nhóm SP áp dụng chiết khấu 2
 */
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
      promotionId,
      promotionName,
      promotionValue,
      vndOrPercent,
      chietKhau2,
      productCodes,
      productGroupCodes,
      orderTotal: orderTotalFromClient,
    } = req.body;

    if (!sobgId) {
      return res.status(400).json({ error: "sobgId is required" });
    }

    if (!promotionId) {
      return res.status(400).json({ error: "promotionId is required" });
    }

    const token = await getAccessToken();
    if (!token) {
      return res.status(401).json({ error: "Failed to obtain access token" });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // 0. Validate promotion conditions before applying
    let promoData: any = null;
    try {
      const promoEndpoint = `${BASE_URL}crdfd_promotions(${promotionId})?$select=cr1bb_tongtienapdung,crdfd_value,crdfd_vn,cr1bb_chietkhau2,crdfd_masanpham_multiple,cr1bb_manhomsp_multiple,cr1bb_ieukhoanthanhtoanapdung`;
      const promoResp = await axios.get(promoEndpoint, { headers });
      promoData = promoResp.data;
    } catch (err) {
      console.warn('[ApplySOBGPromotion] Could not fetch promotion details for validation:', (err as any)?.message || err);
      return res.status(400).json({ error: "Không thể lấy thông tin promotion để kiểm tra điều kiện" });
    }

    // Check total amount condition
    // CRITICAL: Calculate total ONLY for products matching promotion's product/group filters
    if (promoData && promoData.cr1bb_tongtienapdung !== null && promoData.cr1bb_tongtienapdung !== undefined) {
      const minTotal = Number(promoData.cr1bb_tongtienapdung) || 0;
      if (minTotal > 0) {
        try {
          // Get promotion's product and group filters
          const promoProductCodes = promoData.crdfd_masanpham_multiple;
          const promoGroupCodes = promoData.cr1bb_manhomsp_multiple;

          // Parse filter lists
          const parseCodeList = (input: any): string[] => {
            if (!input) return [];
            if (Array.isArray(input)) {
              return input.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
            }
            const str = String(input).trim();
            if (str === '') return [];
            try {
              const parsed = JSON.parse(str);
              if (Array.isArray(parsed)) {
                return parsed.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
              }
            } catch {
              // Not JSON, try comma/semicolon/pipe separator
            }
            return str.split(/[,;|\/]+/).map((c: string) => c.trim()).filter((c: string) => c !== '');
          };

          const productCodeList = parseCodeList(promoProductCodes);
          const productGroupCodeList = parseCodeList(promoGroupCodes);
          const productCodeListNorm = productCodeList.map(s => s.toUpperCase());
          const productGroupCodeListNorm = productGroupCodeList.map(s => s.toUpperCase());

          console.log('[ApplySOBGPromotion] Total validation filters:', {
            productCodeList,
            productGroupCodeList,
            minTotal
          });

          // Fetch all SODs with product/group info
          const sodFilters = [
            "statecode eq 0",
            `_crdfd_maonhang_value eq ${sobgId}`,
          ];
          const sodQuery = `$filter=${encodeURIComponent(sodFilters.join(" and "))}&$select=crdfd_ongia,crdfd_soluong,crdfd_masanpham,crdfd_manhomsanpham`;
          const sodEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}?${sodQuery}`;
          const sodResponse = await axios.get(sodEndpoint, { headers });
          const sodList = sodResponse.data.value || [];

          // Calculate total ONLY for matching products
          let currentTotal = 0;
          let matchedCount = 0;
          const hasNoFilters = productCodeListNorm.length === 0 && productGroupCodeListNorm.length === 0;

          for (const sod of sodList) {
            const sodProductCodeRaw = sod.crdfd_masanpham || '';
            const sodProductGroupCodeRaw = sod.crdfd_manhomsanpham || '';
            const sodProductCode = String(sodProductCodeRaw).trim().toUpperCase();
            const sodProductGroupCode = String(sodProductGroupCodeRaw).trim().toUpperCase();

            // Check if SOD matches promotion filters
            let isMatch = false;
            if (hasNoFilters) {
              // No filters = apply to all products
              isMatch = true;
            } else {
              const matchesProduct = productCodeListNorm.length > 0 &&
                sodProductCode !== '' &&
                productCodeListNorm.includes(sodProductCode);
              const matchesGroup = productGroupCodeListNorm.length > 0 &&
                sodProductGroupCode !== '' &&
                productGroupCodeListNorm.includes(sodProductGroupCode);
              isMatch = matchesProduct || matchesGroup;
            }

            if (isMatch) {
              const quantity = Number(sod.crdfd_soluong) || 0;
              const unitPrice = Number(sod.crdfd_ongia) || 0;
              const lineSubtotal = unitPrice * quantity;
              currentTotal += lineSubtotal;
              matchedCount++;
            }
          }

          console.log('[ApplySOBGPromotion] Total validation result:', {
            totalSODs: sodList.length,
            matchedSODs: matchedCount,
            currentTotal,
            minTotal,
            passes: currentTotal >= minTotal
          });

          if (currentTotal < minTotal) {
            return res.status(400).json({
              error: `Promotion "${promotionName}" yêu cầu tổng tiền sản phẩm áp dụng tối thiểu ${minTotal.toLocaleString('vi-VN')}đ. Tổng tiền hiện tại: ${Math.round(currentTotal).toLocaleString('vi-VN')}đ (${matchedCount} sản phẩm)`
            });
          }
        } catch (err: any) {
          console.error('[ApplySOBGPromotion] Could not calculate filtered total for validation:', {
            sobgId,
            error: err?.message || err,
            response: err?.response?.data,
            status: err?.response?.status
          });

          // If we can't calculate the total, log warning but allow the promotion to proceed
          console.warn('[ApplySOBGPromotion] Skipping total validation due to calculation error, allowing promotion to proceed');
        }
      }
    }

    // 1. Tạo record SO báo giá x Promotion
    // Tính Loại và Chiết khấu theo logic PowerApps:
    // Loại: If(VND_Percent='VNĐ/% (Promotion)'.VNĐ,"Tiền","Phần trăm")
    // Chiết khấu: If(VND_Percent='VNĐ/% (Promotion)'.VNĐ,ValuePromotion,ValuePromotion/100)
    const loai = vndOrPercent === "VNĐ" ? "Tiền" : "Phần trăm";
    // Store raw promotion value as-is (e.g., 5 => store 5). Calculation uses vndOrPercent at runtime.
    const chietKhau2ValueToStore = promotionValue || 0;

    const sobgOrdersXPromotionPayload: any = {
      crdfd_name: promotionName || "Promotion Order",
      "crdfd_SObaogia@odata.bind": `/crdfd_sobaogias(${sobgId})`,
      "crdfd_Promotion@odata.bind": `/crdfd_promotions(${promotionId})`,
      crdfd_type: "Order",
      crdfd_loai: loai,
      // NOTE: crdfd_chietkhau2 is NOT a field on crdfd_sobaogiaxpromotions in CRM metadata.
      // The SOD (crdfd_sodbaogias) records will receive crdfd_chietkhau2 when applying chiết khấu 2.
      statecode: 0, // Active
    };

    // Safety re-check before creating Orders x Promotion (prevent accidental create when condition not met)
    // CRITICAL: Also filter by product/group codes like main validation
    try {
      if (promoData && promoData.cr1bb_tongtienapdung !== null && promoData.cr1bb_tongtienapdung !== undefined) {
        const minTotalCheck = Number(promoData.cr1bb_tongtienapdung) || 0;
        if (minTotalCheck > 0) {
          // Get promotion filters
          const promoProductCodes = promoData.crdfd_masanpham_multiple;
          const promoGroupCodes = promoData.cr1bb_manhomsp_multiple;

          // Parse filter lists (reuse logic from main validation)
          const parseCodeList = (input: any): string[] => {
            if (!input) return [];
            if (Array.isArray(input)) {
              return input.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
            }
            const str = String(input).trim();
            if (str === '') return [];
            try {
              const parsed = JSON.parse(str);
              if (Array.isArray(parsed)) {
                return parsed.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
              }
            } catch {
              // Not JSON, try comma/semicolon/pipe separator
            }
            return str.split(/[,;|\/]+/).map((c: string) => c.trim()).filter((c: string) => c !== '');
          };

          const productCodeList = parseCodeList(promoProductCodes);
          const productGroupCodeList = parseCodeList(promoGroupCodes);
          const productCodeListNorm = productCodeList.map(s => s.toUpperCase());
          const productGroupCodeListNorm = productGroupCodeList.map(s => s.toUpperCase());

          const sodFiltersCheck = [
            "statecode eq 0",
            `_crdfd_maonhang_value eq ${sobgId}`,
          ];
          const sodQueryCheck = `$filter=${encodeURIComponent(sodFiltersCheck.join(" and "))}&$select=crdfd_ongia,crdfd_soluong,crdfd_masanpham,crdfd_manhomsanpham`;
          const sodEndpointCheck = `${BASE_URL}${SOBG_DETAIL_TABLE}?${sodQueryCheck}`;
          const sodRespCheck = await axios.get(sodEndpointCheck, { headers });
          const sodListCheck = sodRespCheck.data.value || [];

          let currentTotalCheck = 0;
          const hasNoFilters = productCodeListNorm.length === 0 && productGroupCodeListNorm.length === 0;

          for (const sod of sodListCheck) {
            const sodProductCodeRaw = sod.crdfd_masanpham || '';
            const sodProductGroupCodeRaw = sod.crdfd_manhomsanpham || '';
            const sodProductCode = String(sodProductCodeRaw).trim().toUpperCase();
            const sodProductGroupCode = String(sodProductGroupCodeRaw).trim().toUpperCase();

            // Check if SOD matches promotion filters
            let isMatch = false;
            if (hasNoFilters) {
              isMatch = true;
            } else {
              const matchesProduct = productCodeListNorm.length > 0 &&
                sodProductCode !== '' &&
                productCodeListNorm.includes(sodProductCode);
              const matchesGroup = productGroupCodeListNorm.length > 0 &&
                sodProductGroupCode !== '' &&
                productGroupCodeListNorm.includes(sodProductGroupCode);
              isMatch = matchesProduct || matchesGroup;
            }

            if (isMatch) {
              const quantity = Number(sod.crdfd_soluong) || 0;
              const unitPrice = Number(sod.crdfd_ongia) || 0;
              const lineSubtotal = unitPrice * quantity;
              currentTotalCheck += lineSubtotal;
            }
          }

          if (currentTotalCheck < minTotalCheck) {
            return res.status(400).json({ error: `Promotion \"${promotionName}\" không được áp dụng vì tổng tiền sản phẩm áp dụng chưa đạt điều kiện.` });
          }
        }
      }
    } catch (err: any) {
      console.warn('[ApplySOBGPromotion] Safety total re-check failed, allowing apply to proceed. Error:', err?.message || err, err?.response?.data);
      // Do NOT abort apply when safety check fails due to transient errors (network/token/etc).
      // Continue to create the Orders x Promotion record to avoid blocking the user.
    }

    // Check if a SOBG x Promotion record already exists for this SOBG + Promotion
    let createdOrderXPromotionId: string | undefined = undefined;
    try {
      const existingFilter = `_crdfd_sobaogia_value eq ${sobgId} and _crdfd_promotion_value eq ${promotionId} and crdfd_type eq 'Order' and statecode eq 0`;
      const existingQuery = `$filter=${encodeURIComponent(existingFilter)}&$select=crdfd_sobaogiaxpromotionid`;
      const existingEndpoint = `${BASE_URL}${SOBG_ORDERS_X_PROMOTION_TABLE}?${existingQuery}`;
      const existingResp = await axios.get(existingEndpoint, { headers });
      const existingItems = existingResp.data?.value || [];
      if (existingItems.length > 0) {
        createdOrderXPromotionId = existingItems[0].crdfd_sobaogiaxpromotionid;
        console.log(`[ApplySOBGPromotion] Found existing SOBG x Promotion for sobg=${sobgId} promotion=${promotionId} id=${createdOrderXPromotionId}`);
      } else {
        const createOrderXPromotionEndpoint = `${BASE_URL}${SOBG_ORDERS_X_PROMOTION_TABLE}`;
        const createResponse = await axios.post(
          createOrderXPromotionEndpoint,
          sobgOrdersXPromotionPayload,
          { headers }
        );
        // Get the created record ID from response headers
        createdOrderXPromotionId = createResponse.headers["odata-entityid"]
          ?.match(/\(([^)]+)\)/)?.[1];
      }
    } catch (err: any) {
      console.error('[ApplySOBGPromotion] Error checking/creating SOBG x Promotion:', err?.message || err, err?.response?.data);
      // If creation/check fails, continue — later logic depends on createdOrderXPromotionId possibly undefined
    }

    // CRITICAL FIX: ALWAYS fetch promotion details when ANY parameter is missing
    // This ensures CK2 is properly detected even when called from save-sobg-details.ts with null params
    let effectiveChietKhau2 = Boolean(chietKhau2);
    let effectivePromotionValue = promotionValue;
    let effectiveVndOrPercent = vndOrPercent;
    let effectiveProductCodes = productCodes;
    let effectiveProductGroupCodes = productGroupCodes;

    // Force fetch if ANY critical parameter is missing (not just when chietKhau2 is false)
    const needsFetch = !promoData ||
      chietKhau2 === null || chietKhau2 === undefined ||
      !promotionValue ||
      !vndOrPercent ||
      !productCodes;

    if (needsFetch) {
      try {
        const promoEndpoint = `${BASE_URL}crdfd_promotions(${promotionId})?$select=crdfd_value,crdfd_vn,cr1bb_chietkhau2,crdfd_masanpham_multiple,cr1bb_manhomsp_multiple,cr1bb_ieukhoanthanhtoanapdung`;
        const promoResp = await axios.get(promoEndpoint, { headers });
        promoData = promoResp.data;

        console.log('[ApplySOBGPromotion] Fetched promotion details:', {
          promotionId,
          cr1bb_chietkhau2: promoData?.cr1bb_chietkhau2,
          crdfd_value: promoData?.crdfd_value,
          crdfd_vn: promoData?.crdfd_vn,
          crdfd_masanpham_multiple: promoData?.crdfd_masanpham_multiple,
          cr1bb_manhomsp_multiple: promoData?.cr1bb_manhomsp_multiple
        });

        if (promoData) {
          // ALWAYS use fetched data to override null/missing request params
          // Determine flag (Dynamics stores OptionSet number for chietkhau2)
          const fetchedCK2 = (promoData.cr1bb_chietkhau2 === 191920001) || Boolean(promoData.cr1bb_chietkhau2 === '191920001');
          effectiveChietKhau2 = chietKhau2 !== null && chietKhau2 !== undefined ? Boolean(chietKhau2) : fetchedCK2;

          if (!effectivePromotionValue || effectivePromotionValue === 0) {
            const rawVal = promoData.crdfd_value;
            const parsed = typeof rawVal === 'number' ? rawVal : (rawVal ? Number(rawVal) : 0);
            effectivePromotionValue = !isNaN(parsed) ? parsed : 0;
          }

          if (!effectiveVndOrPercent) {
            effectiveVndOrPercent = promoData.crdfd_vn;
          }

          if (!effectiveProductCodes && promoData.crdfd_masanpham_multiple) {
            effectiveProductCodes = promoData.crdfd_masanpham_multiple;
          }

          if (!effectiveProductGroupCodes && promoData.cr1bb_manhomsp_multiple) {
            effectiveProductGroupCodes = promoData.cr1bb_manhomsp_multiple;
          }
        }
      } catch (err) {
        console.error('[ApplySOBGPromotion] ❌ CRITICAL: Could not fetch promotion details:', (err as any)?.message || err);
        // If we can't fetch promotion details, we cannot proceed safely
        throw new Error('Không thể lấy thông tin promotion từ CRM');
      }
    }

    // Special-case promotions that should always reduce price BEFORE VAT on SOBG
    const FORCE_PRE_VAT_PROMOTIONS_SOBG = [
      "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1",
      "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA (New customer)",
      "[ALL] VOUCHER SINH NHẬT - 50.000Đ"
    ].map(s => s.toLowerCase());

    // Detect special promotions - for SOBG special promotions should NOT write down to SOD báo giá (header only)
    let isSpecialPromotionSobg = false;
    try {
      const promoNameNorm = String(promotionName || "").toLowerCase();
      isSpecialPromotionSobg = FORCE_PRE_VAT_PROMOTIONS_SOBG.some(p => promoNameNorm.includes(p));
      if (isSpecialPromotionSobg) {
        console.log(`[ApplySOBGPromotion] Detected special promotion "${promotionName}" - will apply as header-only for SOBG.`);
      }
    } catch (e) {
      // ignore
    }

    // 2. Special direct discount promotions - no header updates needed

    // 3. Nếu là chiết khấu 2 (chietKhau2 = true) và không phải direct discount promotion, cập nhật crdfd_chietkhau2 và giá trên các SOD báo giá matching
    let updatedSodCount = 0;
    // Before applying line-level chiết khấu 2 for SOBG, verify promotion's payment terms (if any) match SOBG's payment term.
    let disallowedByPaymentTermsSobg = false;

    // DEBUG: Log CK2 decision factors
    console.log('[ApplySOBGPromotion] CK2 Decision Factors:', {
      effectiveChietKhau2,
      isSpecialPromotionSobg,
      promotionId,
      promotionName,
      promotionValue: effectivePromotionValue,
      vndOrPercent: effectiveVndOrPercent,
      productCodes: effectiveProductCodes,
      productGroupCodes: effectiveProductGroupCodes
    });

    if (effectiveChietKhau2 && !isSpecialPromotionSobg) {
      try {
        const sobgEndpoint = `${BASE_URL}${SOBG_HEADER_TABLE}(${sobgId})?$select=crdfd_dieu_khoan_thanh_toan,crdfd_ieukhoanthanhtoan`;
        const sobgResp = await axios.get(sobgEndpoint, { headers });
        const sobgData = sobgResp.data || {};
        const sobgPaymentRaw = sobgData.crdfd_dieu_khoan_thanh_toan ?? sobgData.crdfd_ieukhoanthanhtoan;
        const promoPaymentRaw = promoData?.cr1bb_ieukhoanthanhtoanapdung;
        const splitAndNormalizeSobg = (raw?: any): string[] => {
          if (raw === null || raw === undefined) return [];
          const s = String(raw).trim();
          if (s === "") return [];
          const tokens = s.split(/[,;|\/]+/).map((t: string) => t.trim()).filter(Boolean);
          return tokens.map((tok: string) => normalizePaymentTermSOBG(tok)).filter(Boolean) as string[];
        };
        const sobgTokens = splitAndNormalizeSobg(sobgPaymentRaw);
        const promoTokens = splitAndNormalizeSobg(promoPaymentRaw);

        console.log('[ApplySOBGPromotion] Payment Terms Check:', {
          sobgPaymentRaw,
          promoPaymentRaw,
          sobgTokens,
          promoTokens
        });

        if (promoTokens.length > 0 && sobgTokens.length > 0) {
          const intersect = promoTokens.filter(t => sobgTokens.includes(t));
          if (intersect.length === 0) {
            disallowedByPaymentTermsSobg = true;
            console.log(`[ApplySOBGPromotion] ❌ Promotion ${promotionId} chietKhau2 not applied due to payment term mismatch (promo=${promoPaymentRaw} sobg=${sobgPaymentRaw})`);
          } else {
            console.log(`[ApplySOBGPromotion] ✅ Payment terms matched:`, intersect);
          }
        } else if (promoPaymentRaw && String(promoPaymentRaw).trim() !== "" && sobgTokens.length === 0) {
          disallowedByPaymentTermsSobg = true;
          console.log(`[ApplySOBGPromotion] ❌ Promotion ${promotionId} chietKhau2 not applied: SOBG missing payment term (promo=${promoPaymentRaw})`);
        }
      } catch (err: any) {
        console.warn('[ApplySOBGPromotion] Failed to fetch SOBG for payment term check:', err?.message || err);
      }
    }

    if (effectiveChietKhau2 && !isSpecialPromotionSobg && !disallowedByPaymentTermsSobg) {
      // Lấy danh sách SOD báo giá của SOBG
      const sodFilters = [
        "statecode eq 0",
        `_crdfd_maonhang_value eq ${sobgId}`,
      ];

      const sodQuery = `$filter=${encodeURIComponent(
        sodFilters.join(" and ")
      )}&$select=crdfd_sodbaogiaid,crdfd_masanpham,crdfd_manhomsanpham`;

      const sodEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}?${sodQuery}`;
      const sodResponse = await axios.get(sodEndpoint, { headers });
      const sodList = sodResponse.data.value || [];

      // Filter SOD báo giá matching productCodes or productGroupCodes
      // Normalize effective product codes/groups into arrays (trim, remove empties)
      const productCodeListRaw = effectiveProductCodes
        ? (Array.isArray(effectiveProductCodes) ? effectiveProductCodes : String(effectiveProductCodes).split(","))
        : [];
      const productCodeList = productCodeListRaw.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
      const productGroupCodeListRaw = effectiveProductGroupCodes
        ? (Array.isArray(effectiveProductGroupCodes) ? effectiveProductGroupCodes : String(effectiveProductGroupCodes).split(","))
        : [];
      const productGroupCodeList = productGroupCodeListRaw.map((c: any) => String(c || '').trim()).filter((c: string) => c !== '');
      // Normalize for case-insensitive matching
      const productCodeListNorm = productCodeList.map(s => s.toUpperCase());
      const productGroupCodeListNorm = productGroupCodeList.map(s => s.toUpperCase());

      // DEBUG: Log promotion filters and first few SOD codes
      console.log('[ApplySOBGPromotion] ===== MATCHING DEBUG START =====');
      console.log('[ApplySOBGPromotion] Raw effectiveProductCodes:', effectiveProductCodes);
      console.log('[ApplySOBGPromotion] Raw effectiveProductGroupCodes:', effectiveProductGroupCodes);
      console.log('[ApplySOBGPromotion] Parsed productCodeList length:', productCodeList.length);
      console.log('[ApplySOBGPromotion] Parsed productGroupCodeList length:', productGroupCodeList.length);
      console.log('[ApplySOBGPromotion] Normalized productCodeListNorm length:', productCodeListNorm.length);
      console.log('[ApplySOBGPromotion] Normalized productGroupCodeListNorm length:', productGroupCodeListNorm.length);
      console.log('[ApplySOBGPromotion] First 20 promotion product codes:', productCodeListNorm.slice(0, 20));
      console.log('[ApplySOBGPromotion] First 10 promotion group codes:', productGroupCodeListNorm.slice(0, 10));
      console.log('[ApplySOBGPromotion] Total SODs to check:', sodList.length);
      console.log('[ApplySOBGPromotion] First 10 SOD codes:', sodList.slice(0, 10).map((s: any) => ({
        id: s.crdfd_sodbaogiaid,
        code: s.crdfd_masanpham,
        group: s.crdfd_manhomsanpham
      })));
      console.log('[ApplySOBGPromotion] ===== MATCHING DEBUG END =====');

      // Tính toán giá trị chiết khấu 2 (đã được tính ở trên)
      // chietKhau2Value đã được tính: VNĐ thì là số tiền, % thì là decimal (0.05 = 5%)

      // Chuẩn bị danh sách SOD báo giá cần cập nhật
      const sodsToUpdate: any[] = [];
      const debugMatchDetails: any[] = [];
      for (let idx = 0; idx < sodList.length; idx++) {
        const sod = sodList[idx];
        const sodProductCodeRaw = sod.crdfd_masanpham || '';
        const sodProductGroupCodeRaw = sod.crdfd_manhomsanpham || '';
        const sodProductCode = String(sodProductCodeRaw).trim().toUpperCase();
        const sodProductGroupCode = String(sodProductGroupCodeRaw).trim().toUpperCase();

        // Check if SOD's single product code/group exists in promotion's multiple codes list
        // Promotion has: crdfd_masanpham_multiple = "SP-001,SP-002,SP-003"
        // SOD has: crdfd_masanpham = "SP-001"
        // Match if SOD's code is in promotion's list

        // If promotion has NO filters (both empty), match all SODs
        const hasNoFilters = productCodeListNorm.length === 0 && productGroupCodeListNorm.length === 0;

        // Calculate matches for debugging
        const matchesProduct = productCodeListNorm.length > 0 &&
          sodProductCode !== '' &&
          productCodeListNorm.includes(sodProductCode);
        const matchesGroup = productGroupCodeListNorm.length > 0 &&
          sodProductGroupCode !== '' &&
          productGroupCodeListNorm.includes(sodProductGroupCode);

        if (hasNoFilters) {
          sodsToUpdate.push(sod);
        } else if (matchesProduct || matchesGroup) {
          sodsToUpdate.push(sod);
        }

        // Collect debug info for first 50 items
        if (idx < 50) {
          debugMatchDetails.push({
            id: sod.crdfd_sodbaogiaid,
            sodProductCode: sodProductCodeRaw,
            sodProductGroupCode: sodProductGroupCodeRaw,
            matchesProduct,
            matchesGroup
          });
        }
      }

      console.log('[ApplySOBGPromotion] SOD Matching Summary:', {
        totalSODs: sodList.length,
        matchedSODs: sodsToUpdate.length,
        productCodeFilters: productCodeList,
        productGroupCodeFilters: productGroupCodeList,
        debugMatchDetails: debugMatchDetails.slice(0, 10) // First 10 for brevity
      });

      // Cập nhật từng SOD báo giá với crdfd_chietkhau2
      // Tối ưu: update theo batch + giới hạn concurrency để tránh await tuần tự (rất chậm khi nhiều dòng)
      const UPDATE_BATCH_SIZE = 5;
      for (let i = 0; i < sodsToUpdate.length; i += UPDATE_BATCH_SIZE) {
        const batch = sodsToUpdate.slice(i, i + UPDATE_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (sod) => {
            const sodId = sod.crdfd_sodbaogiaid;
            if (!sodId) return { sodId, ok: false };
            const updated = await updateSodBaoGiaChietKhau2(
              sodId,
              promotionId, // bind promotion lookup on SOD báo giá
              promotionValue,
              vndOrPercent,
              headers
            );
            const ok = !!(updated && (updated.success || updated.status === 204 || updated.status === 200));
            return { sodId, ok };
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled') {
            if (r.value.ok) updatedSodCount++;
          } else {
            console.error('[ApplySOBGPromotion] Error updating SOD báo giá batch item:', r.reason?.message || r.reason);
          }
        }
      }

      console.log('[ApplySOBGPromotion] ✅ CK2 Update Complete:', {
        updatedSodCount,
        totalMatched: sodsToUpdate.length
      });

      // Sau khi cập nhật chiết khấu 2, tính lại tổng đơn hàng SOBG
      if (updatedSodCount > 0) {
        await recalculateSOBGTotals(sobgId, headers);
      }
    } else {
      // CK1: Tính lại tổng đơn hàng sau khi áp dụng chiết khấu 1
      if (!isSpecialPromotionSobg) {
        try {
          await recalculateSOBGTotalsForCK1(sobgId, effectivePromotionValue, effectiveVndOrPercent, headers);
        } catch (err: any) {
          // CK1 đã được ghi thành công, lỗi recalc không ảnh hưởng đến kết quả
          console.warn('[ApplySOBGPromotion] ⚠️ recalculateSOBGTotalsForCK1 failed (CK1 đã được ghi):', err?.message || err);
        }
      }
    }

    res.status(200).json({
      success: true,
      sobgOrdersXPromotionId: createdOrderXPromotionId,
      updatedSodCount,
      message: `Đã áp dụng promotion "${promotionName}" cho SO báo giá${effectiveChietKhau2 ? ` và cập nhật chiết khấu 2 cho ${updatedSodCount} sản phẩm` : ""}`,
    });
  } catch (error: any) {
    console.error("Error applying SOBG promotion order:", error);

    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status || 500).json({
        error: "Error applying SOBG promotion order",
        details: error.response.data?.error?.message || error.response.data?.error || error.message,
      });
    }

    res.status(500).json({
      error: "Error applying SOBG promotion order",
      details: error.message,
    });
  }
}

/**
 * Helper function to recalculate SOBG totals after applying chiết khấu 1 (CK1)
 * Tính lại tổng đơn hàng SOBG sau khi áp dụng CK1 từ tất cả Orders x Promotion (CK1)
 */
async function recalculateSOBGTotalsForCK1(
  sobgId: string,
  promotionValue: number,
  vndOrPercent: string,
  headers: Record<string, string>
) {
  try {
    // Fetch SOBG hiện tại để lấy tổng tiền
    const sobgEndpoint = `${BASE_URL}${SOBG_HEADER_TABLE}(${sobgId})?$select=crdfd_tongtien,crdfd_tongtienkhongvat`;
    const sobgResp = await axios.get(sobgEndpoint, { headers });
    const sobgData = sobgResp.data || {};
    let currentTotal = Number(sobgData.crdfd_tongtien) || 0;
    let currentSubtotal = Number(sobgData.crdfd_tongtienkhongvat) || 0;

    // Nếu không có tổng từ header, tính từ SODs
    if (!currentTotal || currentTotal === 0) {
      const sodFilters = [
        "statecode eq 0",
        `_crdfd_maonhang_value eq ${sobgId}`,
      ];
      const sodQuery = `$filter=${encodeURIComponent(sodFilters.join(" and "))}&$select=crdfd_ongia,crdfd_soluong`;
      const sodEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}?${sodQuery}`;
      const sodResponse = await axios.get(sodEndpoint, { headers });
      const sodList = sodResponse.data.value || [];

      currentTotal = 0;
      currentSubtotal = 0;
      for (const sod of sodList) {
        const quantity = Number(sod.crdfd_soluong) || 0;
        const unitPrice = Number(sod.crdfd_ongia) || 0;
        const lineSubtotal = unitPrice * quantity;
        currentSubtotal += lineSubtotal;
        currentTotal += lineSubtotal;
      }
    }

    // Fetch tất cả Orders x Promotion (CK1) của SOBG này và fetch promotion details
    const opQuery = `$filter=_crdfd_sobaogia_value eq ${sobgId} and crdfd_type eq 'Order' and statecode eq 0&$select=crdfd_loai,_crdfd_promotion_value`;
    const opEndpoint = `${BASE_URL}${SOBG_ORDERS_X_PROMOTION_TABLE}?${opQuery}`;
    const opResp = await axios.get(opEndpoint, { headers });
    const ck1Promotions = opResp.data.value || [];

    // Tính tổng CK1 từ tất cả promotions CK1
    // Lưu ý: SOBG không có field crdfd_chietkhau2 trong Orders x Promotion
    // Nên ta cần fetch từ promotion records để lấy giá trị
    let totalCK1Discount = 0;

    // Tính từ tất cả CK1 promotions (bao gồm promotion hiện tại vừa được tạo)
    // Fetch promotion details để lấy giá trị
    for (const op of ck1Promotions) {
      const promotionId = op._crdfd_promotion_value;
      if (!promotionId) continue;

      try {
        const promoEndpoint = `${BASE_URL}crdfd_promotions(${promotionId})?$select=crdfd_value,crdfd_vn,cr1bb_chietkhau2`;
        const promoResp = await axios.get(promoEndpoint, { headers });
        const promoData = promoResp.data;

        // Chỉ tính nếu là CK1 (không phải CK2)
        const isCK2 = promoData.cr1bb_chietkhau2 === 191920001 || String(promoData.cr1bb_chietkhau2) === '191920001';
        if (isCK2) continue; // Skip CK2

        const promoValue = Number(promoData.crdfd_value) || 0;
        const promoVn = promoData.crdfd_vn;
        const promoLoai = op.crdfd_loai || (promoVn === 191920000 ? "Phần trăm" : "Tiền");

        if (promoLoai === "Phần trăm") {
          const discountPercent = promoValue > 1 ? promoValue / 100 : promoValue;
          totalCK1Discount += currentTotal * discountPercent;
        } else {
          totalCK1Discount += promoValue;
        }
      } catch (err) {
        console.warn('[ApplySOBGPromotion][recalculateSOBGTotalsForCK1] Failed to fetch promotion details:', promotionId, err);
        // Continue với promotion khác
      }
    }

    // Tính lại tổng
    const newTotal = Math.max(0, currentTotal - totalCK1Discount);

    // Tính lại subtotal tỷ lệ (giữ nguyên tỷ lệ VAT)
    const ratio = currentTotal > 0 ? newTotal / currentTotal : 1;
    const newSubtotal = Math.round(currentSubtotal * ratio);

    // Update SOBG
    const updatePayload = {
      crdfd_tongtien: Math.round(newTotal),
      crdfd_tongtienkhongvat: newSubtotal,
    };

    const updateEndpoint = `${BASE_URL}${SOBG_HEADER_TABLE}(${sobgId})`;
    await axios.patch(updateEndpoint, updatePayload, { headers });

    console.log('[ApplySOBGPromotion][recalculateSOBGTotalsForCK1] ✅ Đã tính lại tổng SOBG cho CK1:', {
      sobgId,
      currentTotal,
      totalCK1Discount,
      newTotal,
      newSubtotal,
      ck1PromotionsCount: ck1Promotions.length
    });
  } catch (error) {
    console.error("Error recalculating SOBG totals for CK1:", error);
    throw error;
  }
}

/**
 * Helper function to recalculate SOBG totals after applying chiết khấu 2
 */
async function recalculateSOBGTotals(sobgId: string, headers: Record<string, string>) {
  try {
    // Lấy tất cả SOD báo giá của SOBG
    const sodFilters = [
      "statecode eq 0",
      `_crdfd_maonhang_value eq ${sobgId}`,
    ];

    const sodQuery = `$filter=${encodeURIComponent(
      sodFilters.join(" and ")
    )}&$select=crdfd_sodbaogiaid,crdfd_giack2,crdfd_soluong,crdfd_ieuchinhgtgt`;

    const sodEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}?${sodQuery}`;
    const sodResponse = await axios.get(sodEndpoint, { headers });
    const sodList = sodResponse.data.value || [];

    // Tính lại tổng
    let totalSubtotal = 0;
    let totalVatAmount = 0;
    let totalAmount = 0;

    for (const sod of sodList) {
      const quantity = Number(sod.crdfd_soluong) || 0;
      const unitPrice = Number(sod.crdfd_giack2) || 0; // Sử dụng giá sau chiết khấu 2
      const vatPercent = getVatFromIeuChinhGtgt(sod.crdfd_ieuchinhgtgt);

      const lineSubtotal = quantity * unitPrice;
      const lineVat = (lineSubtotal * vatPercent) / 100;
      const lineTotal = lineSubtotal + lineVat;

      totalSubtotal += lineSubtotal;
      totalVatAmount += lineVat;
      totalAmount += lineTotal;
    }

    // Làm tròn
    const roundedSubtotal = Math.round(totalSubtotal);
    const roundedVat = Math.round(totalVatAmount);
    const roundedTotal = Math.round(totalAmount);

    // Cập nhật SOBG với tổng mới
    const updatePayload = {
      crdfd_tongtien: roundedTotal,
      crdfd_tongtienkhongvat: roundedSubtotal,
    };

    const updateEndpoint = `${BASE_URL}${SOBG_HEADER_TABLE}(${sobgId})`;
    await axios.patch(updateEndpoint, updatePayload, { headers });
  } catch (error) {
    console.error("Error recalculating SOBG totals:", error);
    // Don't throw error to avoid breaking the promotion application
  }
}

/**
 * Helper function to update crdfd_chietkhau2 and crdfd_giack2 on a SOD báo giá record
 * Cập nhật crdfd_chietkhau2 và tính lại crdfd_giack2 dựa trên giá gốc
 */
async function updateSodBaoGiaChietKhau2(
  sodId: string,
  promotionId: string | undefined,
  promotionValue: number,
  vndOrPercent: string,
  headers: Record<string, string>
) {
  const updatePayload: any = {};

  // CRITICAL FIX: Store crdfd_chietkhau2 in correct format based on vndOrPercent
  // - If '%': store as decimal (e.g., 5% → 0.05)
  // - If 'VNĐ': store as absolute amount (e.g., 50000)
  // This matches the format used in save-sobg-details.ts line 1079

  // Normalize vndOrPercent: handle both string and OptionSet values
  // OptionSet: 191920000 = %, 191920001 = VNĐ
  const vndOrPercentNorm = String(vndOrPercent || '').trim();
  const vndOrPercentNum = Number(vndOrPercent);
  const isPercent = vndOrPercentNorm === '%' || vndOrPercentNorm === '191920000' || vndOrPercentNum === 191920000;

  if (isPercent) {
    updatePayload.crdfd_chietkhau2 = (promotionValue || 0) / 100;
  } else {
    updatePayload.crdfd_chietkhau2 = promotionValue || 0;
  }

  // If promotionId provided, bind the lookup on the SOD báo giá
  if (promotionId) {
    const normalizedPromotionId = String(promotionId).replace(/^{|}$/g, '').trim();
    if (normalizedPromotionId) {
      updatePayload['crdfd_Promotion@odata.bind'] = `/crdfd_promotions(${normalizedPromotionId})`;
    }
  }

  // Calculate discount for price computation using vndOrPercent:
  // - If percent ('%'), convert promotionValue (e.g., 5) -> 0.05 for calculation
  // - If VNĐ, use promotionValue directly as amount to subtract
  let chietKhau2ForCalc: number;
  if (isPercent) { // Use the normalized 'isPercent' here
    chietKhau2ForCalc = (promotionValue || 0) / 100;
  } else {
    chietKhau2ForCalc = promotionValue || 0;
  }

  // Tính crdfd_giack2 dựa trên giá gốc và chietKhau2ForCalc
  // Cần lấy giá gốc (crdfd_giagoc) để tính giá sau chiết khấu 2
  const getSodEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}(${sodId})?$select=crdfd_giagoc,crdfd_ongia,crdfd_ieuchinhgtgt`;
  const sodResponse = await axios.get(getSodEndpoint, { headers });
  const sodData = sodResponse.data;

  // Determine VAT percent and base price BEFORE VAT
  let vatPercent = 0;
  if (sodData) {
    if (sodData.crdfd_ieuchinhgtgt !== undefined && sodData.crdfd_ieuchinhgtgt !== null) {
      const IEUCHINHGTGT_TO_VAT_MAP: Record<number, number> = {
        191920000: 0,
        191920001: 5,
        191920002: 8,
        191920003: 10,
      };
      vatPercent = IEUCHINHGTGT_TO_VAT_MAP[Number(sodData.crdfd_ieuchinhgtgt)] ?? 0;
    }
  }

  // Base price before VAT: prefer crdfd_giagoc; otherwise derive from crdfd_ongia by removing VAT
  let basePriceBeforeVat = 0;
  if (sodData) {
    if (sodData.crdfd_giagoc && Number(sodData.crdfd_giagoc) > 0) {
      basePriceBeforeVat = Number(sodData.crdfd_giagoc);
    } else if (sodData.crdfd_ongia && Number(sodData.crdfd_ongia) > 0) {
      const priceWithVat = Number(sodData.crdfd_ongia);
      if (vatPercent > 0) {
        basePriceBeforeVat = priceWithVat / (1 + vatPercent / 100);
      } else {
        basePriceBeforeVat = priceWithVat;
      }
    }
  }

  let giaCK2: number = 0;
  if (basePriceBeforeVat && basePriceBeforeVat > 0) {
    if (vndOrPercent === "%") {
      // Percent - chietKhau2ForCalc is decimal (e.g., 0.05)
      giaCK2 = basePriceBeforeVat * (1 - chietKhau2ForCalc);
    } else {
      // VNĐ - subtract absolute amount from base before VAT
      giaCK2 = Math.max(0, basePriceBeforeVat - chietKhau2ForCalc);
    }
    updatePayload.crdfd_giack2 = giaCK2;
  }

  console.log('[ApplySOBGPromotion][updateSodBaoGiaChietKhau2] Calculation:', {
    sodId,
    promotionValue,
    vndOrPercent,
    vatPercent,
    basePriceBeforeVat,
    chietKhau2ForCalc,
    giaCK2,
    updatePayload
  });

  const updateEndpoint = `${BASE_URL}${SOBG_DETAIL_TABLE}(${sodId})`;
  console.log('[ApplySOBGPromotion][updateSodBaoGiaChietKhau2] About to PATCH:', {
    endpoint: updateEndpoint,
    payload: updatePayload
  });

  try {
    const resp = await axios.patch(updateEndpoint, updatePayload, { headers });
    console.log('[ApplySOBGPromotion][updateSodBaoGiaChietKhau2] ✅ PATCH SUCCESS:', {
      sodId,
      status: resp.status,
      statusText: resp.statusText
    });
    return { success: true, status: resp.status };
  } catch (err: any) {
    console.error('[ApplySOBGPromotion][updateSodBaoGiaChietKhau2] ❌ PATCH FAILED:', {
      sodId,
      endpoint: updateEndpoint,
      payload: updatePayload,
      error: err?.response?.data || err?.message || err
    });
    return { success: false, error: err?.response?.data || err?.message || String(err) };
  }
}

// Helper function to get VAT percentage from crdfd_ieuchinhgtgt OptionSet
const getVatFromIeuChinhGtgt = (ieuchinhgtgtValue: number | null | undefined): number => {
  if (ieuchinhgtgtValue === null || ieuchinhgtgtValue === undefined) return 0;
  const IEUCHINHGTGT_TO_VAT_MAP: Record<number, number> = {
    191920000: 0,   // 0%
    191920001: 5,   // 5%
    191920002: 8,   // 8%
    191920003: 10,  // 10%
  };
  return IEUCHINHGTGT_TO_VAT_MAP[ieuchinhgtgtValue] ?? 0;
};
