'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { showToast } from '../../../components/ToastManager';
import { fetchPromotionOrders, fetchProductPromotions, fetchProductPromotionsBatch, PromotionOrderItem, Promotion } from '../_api/adminApi';

// Helper function để check percent-based promotion
const vndCodeEquals = (p: any, code: number) => {
  if (p === null || p === undefined) return false;
  // fetchProductPromotions trả về field `vn` (string) từ promotions.ts API
  const v = p.vn ?? p.vndOrPercent ?? p.crdfd_vn;
  // Xử lý null, undefined, và empty string - đều coi như không có giá trị
  if (v === undefined || v === null || v === '') return false;
  const vs = String(v).trim();
  // Dùng == để so sánh string vs number (vn có thể là "191920000" hoặc 191920000)
  // biome-ignore lint/style/useIsNan: <explanation>
  return vs == String(code);
};

interface ProductTableItem {
  id: string;
  stt?: number;
  productCode?: string;
  productId?: string;
  productName: string;
  productGroupCode?: string;
  productCategoryLevel4?: string;
  unit: string;
  unitId?: string;
  quantity: number;
  price: number;
  priceNoVat: number | null;
  surcharge: number;
  discount: number;
  discountedPrice: number;
  vat: number;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  approver: string;
  deliveryDate: string;
  isSodCreated?: boolean;
  warehouse?: string;
  note?: string;
  urgentOrder?: boolean;
  approvePrice?: boolean;
  approveSupPrice?: boolean;
  approveSupPriceId?: string;
  discountPercent?: number;
  discountAmount?: number;
  discount2?: number;
  discount2Enabled?: boolean;
  promotionText?: string;
  promotionId?: string; // ID của promotion được apply cho item này
  eligibleForPromotion?: boolean; // Item có đủ điều kiện promotion không (dựa trên productCode + total amount condition)
  invoiceSurcharge?: number;
  createdOn?: string;
  isModified?: boolean; // Flag để đánh dấu dòng đã sửa
  originalQuantity?: number; // Lưu số lượng gốc để so sánh
}

interface ProductTableProps {
  products: ProductTableItem[];
  setProducts: (products: ProductTableItem[]) => void;
  invoiceType?: number | null;
  vatChoice?: number | null;
  customerIndustry?: number | null;
  onDelete?: (product: ProductTableItem) => void; // Callback khi xóa sản phẩm
  onUpdate?: (product: ProductTableItem) => Promise<void>; // Callback khi update sản phẩm đã lưu
  /**
   * Reload lại danh sách từ backend sau khi deactivate detail.
   * Tại sao: list hiện tại có thể là dữ liệu expand/cache → cần refetch để sync.
   */
  onReloadAfterDeactivate?: () => Promise<void> | void;
  soId?: string; // SO ID để update
  warehouseName?: string; // Warehouse name
  isVatOrder?: boolean; // Is VAT order
  isSOBG?: boolean; // nếu true gọi API deactivate SOBG detail thay vì SOD
  customerCode?: string; // Customer code cho promotion calculation
  paymentTerms?: string; // Payment terms cho promotion calculation
  saleOrders?: Array<{ crdfd_sale_orderid: string; crdfd_ieukhoanthanhtoan?: string; crdfd_dieu_khoan_thanh_toan?: string }>; // Sale orders array để tìm selected SO cho promotion calculation
  onRecalculatePromotions?: (products: ProductTableItem[]) => Promise<ProductTableItem[]>; // Optional callback để recalculate promotions (dùng cho SOBG)
}

// ============================================================
// Hàm recalculate promotion eligibility cho TẤT CẢ items
// Called khi thay đổi quantity hoặc thêm item mới có promotion
// ============================================================
async function recalculatePromotionEligibility(
  currentProducts: ProductTableItem[],
  soIdValue: string,
  customerCodeValue: string,
  saleOrders: Array<{ crdfd_sale_orderid: string; crdfd_ieukhoanthanhtoan?: string; crdfd_dieu_khoan_thanh_toan?: string }> | undefined
): Promise<ProductTableItem[]> {
  if (!soIdValue || currentProducts.length === 0) return currentProducts;

  // Tìm selected SO từ saleOrders array
  const selectedSo = saleOrders?.find(so => so.crdfd_sale_orderid === soIdValue);
  const paymentTermsValue = selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan;

  console.debug('[ProductTable][RECALC] Starting recalculation:', {
    totalProducts: currentProducts.length,
    soId: soIdValue,
    customerCode: customerCodeValue,
    selectedSoFound: !!selectedSo,
    paymentTerms: paymentTermsValue,
  });

  // 1. Tìm items đã có promotion (eligibleForPromotion = true)
  const promoItems = currentProducts.filter(item => item.eligibleForPromotion);
  const nonPromoItems = currentProducts.filter(item => !item.eligibleForPromotion);

  // 2. Helper function: Tính tổng tiền từ các sản phẩm match với promotion
  // Chỉ tính tổng từ sản phẩm có productCode trong crdfd_masanpham_multiple
  // hoặc productGroupCode trong cr1bb_manhomsp_multiple của promotion
  const calculateTotalForPromotion = (
    products: ProductTableItem[],
    promotion: Promotion
  ): number => {
    const promoAny = promotion as any;
    const productCodesStr = promotion.productCodes || promoAny.crdfd_masanpham_multiple || '';
    const productGroupCodesStr = promotion.productGroupCodes || promoAny.cr1bb_manhomsp_multiple || '';

    // Parse danh sách mã sản phẩm và mã nhóm sản phẩm (comma-separated)
    const allowedProductCodes = productCodesStr
      .split(',')
      .map((c: string) => c.trim())
      .filter(Boolean);
    const allowedProductGroupCodes = productGroupCodesStr
      .split(',')
      .map((c: string) => c.trim())
      .filter(Boolean);

    // Nếu promotion không có điều kiện về sản phẩm/nhóm sản phẩm → tính tổng tất cả
    const hasProductFilter = allowedProductCodes.length > 0 || allowedProductGroupCodes.length > 0;

    return products.reduce((sum, item) => {
      // Kiểm tra item có match với promotion không
      const matchesProductCode = !hasProductFilter ||
        (item.productCode && allowedProductCodes.includes(item.productCode));
      const matchesProductGroupCode = !hasProductFilter ||
        (item.productGroupCode && allowedProductGroupCodes.includes(item.productGroupCode));

      // Chỉ tính tổng nếu item match với promotion
      if (matchesProductCode || matchesProductGroupCode) {
        const basePrice = item.price;
        const lineSubtotal = basePrice * (item.quantity || 0);
        const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
        return sum + lineSubtotal + lineVat;
      }
      return sum;
    }, 0);
  };

  // 2. Tính TỔNG TẤT CẢ items dùng BASE PRICE (giá gốc) để check điều kiện promotion
  // QUAN TRỌNG: Dùng price (giá gốc) để tính tổng, KHÔNG dùng discountedPrice
  // Vì điều kiện promotion (totalAmountCondition) áp dụng cho GIÁ TRỊ ĐƠN HÀNG GỐC,
  // sau đó mới tính discount cho từng item
  // LƯU Ý: Tổng này chỉ dùng cho fallback, mỗi promotion sẽ tính tổng riêng dựa trên sản phẩm match
  const totalOrderAmount = currentProducts.reduce((sum, item) => {
    // Dùng price (giá gốc), không phải discountedPrice
    const basePrice = item.price;
    const lineSubtotal = basePrice * (item.quantity || 0);
    const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
    console.debug('[ProductTable][RECALC] Item:', {
      productCode: item.productCode,
      productName: item.productName?.substring(0, 30),
      price: basePrice,                    // Giá gốc (dùng để tính tổng)
      discountedPrice: item.discountedPrice, // Giá sau CK (chỉ để reference)
      quantity: item.quantity,
      lineSubtotal,
      lineVat,
      lineTotal: lineSubtotal + lineVat,
      eligibleForPromotion: item.eligibleForPromotion,
    });
    return sum + lineSubtotal + lineVat;
  }, 0);

  console.debug('[ProductTable][RECALC] Summary:', {
    totalProducts: currentProducts.length,
    promoItemCount: promoItems.length,
    nonPromoItemCount: nonPromoItems.length,
    totalOrderAmount,  // Tổng tính từ BASE PRICE (giá gốc)
    // NOTE: Đây là tổng giá trị đơn hàng GỐC để check điều kiện promotion
    // Discount sẽ được áp dụng SAU KHI đủ điều kiện
  });
  const promotionalItemsTotal = totalOrderAmount;

  // Nếu không có promo items và không có non-promo items cần check, return
  if (promoItems.length === 0 && nonPromoItems.length === 0) {
    return currentProducts;
  }

      // 3. Fetch promotions cho TẤT CẢ items bằng fetchProductPromotions (cho cả CK1 và CK2)
      // 3. Fetch promotions cho TẤT CẢ items bằng fetchProductPromotions (cho cả CK1 và CK2)
      // 3. Fetch promotions cho TẤT CẢ items bằng fetchProductPromotions (cho cả CK1 và CK2)
      // 3. Fetch promotions cho TẤT CẢ items bằng fetchProductPromotions (cho cả CK1 và CK2)
  // Dùng promotions.ts API thay vì promotion-orders.ts
  try {
    // Collect tất cả items
    const allItems = [...nonPromoItems, ...promoItems];
    console.debug('[ProductTable][RECALC] All items for promotions:', {
      totalProducts: allItems.length,
      promoItems: promoItems.map(p => ({ code: p.productCode, name: p.productName?.substring(0, 20), eligible: p.eligibleForPromotion })),
      nonPromoItems: nonPromoItems.map(p => ({ code: p.productCode, name: p.productName?.substring(0, 20), eligible: p.eligibleForPromotion })),
    });

    // Tối ưu: gọi promotions 1 lần cho tất cả productCodes (tránh N request tuần tự)
    const uniqueCodes = Array.from(
      new Set(
        allItems
          .map((i) => i.productCode)
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      )
    );

    // Collect productGroupCodes từ allItems để filter promotions chính xác hơn
    const productGroupCodes = Array.from(
      new Set(
        allItems
          .map((i) => i.productGroupCode)
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      )
    );

    console.debug('[ProductTable][RECALC] Fetching promotions (batch):', {
      uniqueProducts: uniqueCodes.length,
      productGroupCodes: productGroupCodes.length,
      paymentTerms: paymentTermsValue,
    });

    const promotionsAll = await fetchProductPromotionsBatch(
      uniqueCodes,
      customerCodeValue || undefined,
      undefined, // region
      paymentTermsValue,
      productGroupCodes.length > 0 ? productGroupCodes : undefined
    );

    const promotionsByCode = new Map<string, Promotion[]>();
    for (const code of uniqueCodes) {
      // Giữ behavior hiện tại: backend filter dùng contains(), nên ở client cũng match theo substring
      promotionsByCode.set(
        code,
        (promotionsAll || []).filter((p) => String(p.productCodes || '').includes(code))
      );
    }

    const promotionMap = new Map<string, { discountPercent: number; promotionId: string }>();
    let promotionsFetched = 0;

    // Helper: normalize promotionId để so sánh an toàn
    const normalizePromotionId = (id: string | undefined | null): string =>
      (id ?? '').toString().trim().toLowerCase();

    // Helper: xác định item đang dùng VND-based promotion (chiết khấu theo tiền, không theo %)
    const isVndBasedItem = (item: ProductTableItem): boolean => {
      const pct = Number(item.discountPercent ?? 0) || 0;
      const amt = Number(item.discountAmount ?? item.discount ?? 0) || 0;
      // VND-based: không có % nhưng có số tiền chiết khấu
      return pct === 0 && amt > 0;
    };

    for (const item of allItems) {
      if (!item.productCode) continue;

      // Tôn trọng các dòng đang có khuyến mãi VND (discountAmount > 0, discountPercent = 0)
      // → KHÔNG áp dụng lại promotion % cho các dòng này
      if (isVndBasedItem(item)) {
        continue;
      }

      const promotions = promotionsByCode.get(item.productCode) || [];


      // Filter promotions: percent-based và meets total condition
      const candidates = promotions.filter(p => {
        const isPercent = vndCodeEquals(p, 191920000);
        // Xử lý null/undefined/string "null" đúng cách
        // Dùng ?? thay vì || để handle string "null" (vì "" ?? 0 = "" ≠ 0)
        const rawCond = p.totalAmountCondition ?? null;
        // Chỉ convert sang number nếu là giá trị truthy, ngược lại coi như 0
        const minTotal = rawCond !== null ? Number(rawCond) : 0;

        // QUAN TRỌNG: Tính tổng tiền chỉ từ các sản phẩm match với promotion
        // (có trong cr1bb_manhomsp_multiple hoặc crdfd_masanpham_multiple)
        const totalForThisPromotion = calculateTotalForPromotion(currentProducts, p);

        // Nếu minTotal = 0 hoặc NaN → coi như không có điều kiện tối thiểu → luôn đáp ứng
        const meetsTotal = !minTotal || minTotal === 0 || isNaN(minTotal) || totalForThisPromotion >= minTotal;
        return isPercent && meetsTotal;
      });

      console.debug('[ProductTable][RECALC] Filtered candidates for product:', {
        productCode: item.productCode,
        candidatesCount: candidates.length,
        totalOrderAmount,
        candidates: candidates.map(c => ({
          id: c.id,
          name: c.name?.substring(0, 30),
          value: c.value,
          valueWithVat: c.valueWithVat,
          minTotal: c.totalAmountCondition,
        })),
      });

      // Lấy promotion áp dụng cho item này:
      // - ƯU TIÊN: promotionId đang gắn trên item (người dùng đã chọn tay) nếu vẫn hợp lệ
      // - FALLBACK: promotion có giá trị cao nhất trong candidates
      if (candidates.length > 0) {
        const currentPromoIdNorm = normalizePromotionId(item.promotionId);

        // Thử tìm promotion khớp với promotionId hiện tại (tôn trọng lựa chọn của user)
        let chosenPromo =
          currentPromoIdNorm
            ? candidates.find(c => normalizePromotionId(c.id) === currentPromoIdNorm) || null
            : null;

        // Nếu không tìm thấy (hoặc item chưa có promotionId) → fallback chọn promotion tốt nhất
        if (!chosenPromo) {
          chosenPromo = candidates.reduce((best, current) => {
            // QUAN TRỌNG: promotions.ts trả về valueWithVat cho CK1 VAT
            // Dùng valueWithVat thay vì value khi value = 0
            const bestVal = Number(best.valueWithVat || best.value) || 0;
            const currVal = Number(current.valueWithVat || current.value) || 0;
            return currVal > bestVal ? current : best;
          }, candidates[0]);
        }

        // QUAN TRỌNG: Dùng valueWithVat thay vì value khi value = 0
        const discountPercent = Number(chosenPromo.valueWithVat || chosenPromo.value) || 0;

        promotionMap.set(item.productCode, {
          discountPercent,
          promotionId: chosenPromo.id
        });

        console.debug('[ProductTable][RECALC] Chosen promotion for product:', {
          productCode: item.productCode,
          promotionId: chosenPromo.id,
          name: chosenPromo.name?.substring(0, 40),
          discountPercent,
          fromExistingPromotionId: !!currentPromoIdNorm,
        });
      }

      promotionsFetched++;
    }

    console.debug('[ProductTable][RECALC] Final promotionMap:', {
      mapSize: promotionMap.size,
      totalProducts: allItems.length,
      promotionsFetched,
      promotions: Array.from(promotionMap.entries()).map(([code, info]) => ({
        productCode: code,
        discountPercent: info.discountPercent,
        promotionId: info.promotionId,
      })),
    });

    // 5. Update TẤT CẢ items dựa trên promotionMap
    // Logic đơn giản:
    // - Nếu item có trong promotionMap → ÁP DỤNG promotion
    // - Nếu item không có trong promotionMap → LOẠI BỎ promotion
    let updatedCount = 0;
    let removedCount = 0;
    const updatedProducts = currentProducts.map(item => {
      const promoInfo = promotionMap.get(item.productCode || '');

      // Nếu item đang dùng khuyến mãi VND (discountAmount > 0, discountPercent = 0) → giữ nguyên, không sửa
      const isVndBased = (() => {
        const pct = Number(item.discountPercent ?? 0) || 0;
        const amt = Number(item.discountAmount ?? item.discount ?? 0) || 0;
        return pct === 0 && amt > 0;
      })();
      if (isVndBased) {
        console.debug('[ProductTable][RECALC] Skip VND-based promotion item (keep as is):', {
          productCode: item.productCode,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount ?? item.discount,
          promotionId: item.promotionId,
        });
        return item;
      }

      // Case A: Item có trong promotionMap → ÁP DỤNG promotion
      if (promoInfo) {
        // Nếu đã có promotion, discount giống nhau VÀ promotionId trùng → giữ nguyên (tránh re-render không cần thiết)
        // Lưu ý: cần so sánh cả promotionId để tránh giữ lại promotion cũ khi backend đổi sang promotion mới nhưng % giống nhau
        if (
          item.eligibleForPromotion &&
          item.discountPercent === promoInfo.discountPercent &&
          item.promotionId === promoInfo.promotionId
        ) {
          return item;
        }

        updatedCount++;
        console.debug('[ProductTable][RECALC] Applied promotion to item:', {
          productCode: item.productCode,
          productName: item.productName?.substring(0, 30),
          newDiscountPercent: promoInfo.discountPercent,
        });

        // Tính discountedPrice từ basePrice
        const basePrice = item.price;
        const discountAmount = basePrice * (promoInfo.discountPercent / 100);
        const discountedPrice = basePrice - discountAmount;

        const subtotal = Math.round((item.quantity || 0) * discountedPrice);
        const vatAmount = Math.round((subtotal * (item.vat || 0)) / 100);
        const totalAmount = subtotal + vatAmount;

        return {
          ...item,
          eligibleForPromotion: true,
          discountPercent: promoInfo.discountPercent,
          discount: discountAmount,
          discountedPrice,
          subtotal,
          vatAmount,
          totalAmount,
          promotionId: promoInfo.promotionId,
        };
      }

      // Case B: Item không có trong promotionMap → LOẠI BỎ promotion (%)
      // LƯU Ý: KHÔNG đụng vào các dòng VND-based (đã return ở trên)
      if (item.eligibleForPromotion) {
        removedCount++;
        console.debug('[ProductTable][RECALC] Removed promotion from item:', {
          productCode: item.productCode,
          productName: item.productName?.substring(0, 30),
          reason: 'Không có promotion khả dụng hoặc tổng đơn không đủ điều kiện',
          previousDiscountPercent: item.discountPercent,
        });

        // Khôi phục giá gốc
        const basePrice = item.price;
        const subtotal = Math.round((item.quantity || 0) * basePrice);
        const vatAmount = Math.round((subtotal * (item.vat || 0)) / 100);
        const totalAmount = subtotal + vatAmount;

        return {
          ...item,
          eligibleForPromotion: false,
          discountPercent: 0,
          discount: 0,
          discountedPrice: basePrice,
          subtotal,
          vatAmount,
          totalAmount,
          promotionId: undefined,
          promotionText: undefined,
        };
      }

      // Case C: Item không có promotion và không có trong promotionMap → giữ nguyên
      return item;
    });

    console.debug('[ProductTable][RECALC] Completed:', {
      updatedCount,      // Số items được ÁP DỤNG promotion
      removedCount,      // Số items được LOẠI BỎ promotion
      totalProducts: updatedProducts.length,
      promotionMapSize: promotionMap.size,
    });

    return updatedProducts;
  } catch (err) {
    console.warn('[ProductTable][RECALC] Error:', err);
    return currentProducts;
  }
}

function ProductTable({
  products,
  setProducts,
  invoiceType,
  vatChoice,
  customerIndustry,
  onDelete,
  onUpdate,
  onReloadAfterDeactivate,
  soId,
  warehouseName,
  isVatOrder,
  isSOBG = false,
  customerCode,
  paymentTerms,
  saleOrders,
  onRecalculatePromotions,
}: ProductTableProps) {
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [editingQuantityValue, setEditingQuantityValue] = useState<string>('');
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingProduct, setConfirmingProduct] = useState<ProductTableItem | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deletingProductIds, setDeletingProductIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDelete = async (id: string) => {
    const productToDelete = products.find((p) => p.id === id);
    if (productToDelete) {
      // If product has been saved to CRM (isSodCreated) ask for confirmation and deactivate first
      // Consider a product saved to CRM only if isSodCreated === true AND id looks like a GUID.
      const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isSaved = productToDelete.isSodCreated === true && GUID_PATTERN.test(String(productToDelete.id));

      const performRemoval = async (prod?: ProductTableItem) => {
        try {
          console.log('[ProductTable][DELETE] Starting deletion for product:', {
            id,
            productCode: productToDelete.productCode,
            isSodCreated: productToDelete.isSodCreated,
          });

          // Set loading state
          setDeletingProductIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });

          // LUÔN filter sản phẩm ra khỏi list trước
          const productsAfterDelete = products.filter((p) => p.id !== id);
          console.log('[ProductTable][DELETE] Filtered products:', {
            beforeCount: products.length,
            afterCount: productsAfterDelete.length,
          });

          // Set products ngay lập tức để UI responsive
          setProducts(productsAfterDelete);

          // Sau đó gọi parent onDelete để handle logic bổ sung (inventory release, recalculate promotions, etc.)
          if (onDelete) {
            console.log('[ProductTable][DELETE] Calling parent onDelete callback');
            try {
              await onDelete(prod || productToDelete);
              console.log('[ProductTable][DELETE] Parent onDelete completed successfully');
            } catch (err: any) {
              console.error('[ProductTable][DELETE] Error in parent onDelete:', err);
              // Nếu parent onDelete fail, vẫn giữ products đã filter
            }
          } else {
            console.log('[ProductTable][DELETE] No parent onDelete, handling recalculate locally');
            // Nếu không có onDelete từ parent, tự recalculate ở đây
            // ============================================================
            // QUAN TRỌNG: Recalculate promotion eligibility sau khi xóa sản phẩm
            // Khi xóa sản phẩm, tổng tiền đơn giảm → các items còn lại có thể
            // KHÔNG còn đủ điều kiện promotion (totalAmountCondition)
            // ============================================================
            if (soId && productsAfterDelete.length > 0) {
              // Nếu có custom recalculate function (cho SOBG), dùng nó
              // Ngược lại, dùng hàm recalculatePromotionEligibility mặc định (cho SO)
              if (onRecalculatePromotions) {
                onRecalculatePromotions(productsAfterDelete).then(recalculated => {
                  setProducts(recalculated);
                }).catch(err => {
                  console.warn('[ProductTable][DELETE] Error recalculating promotions:', err);
                  setProducts(productsAfterDelete);
                });
              } else {
                recalculatePromotionEligibility(
                  productsAfterDelete,
                  soId,
                  customerCode || '',
                  saleOrders
                ).then(recalculated => {
                  // Luôn update products sau khi xóa, dù có thay đổi promotion hay không
                  setProducts(recalculated);

                  // Log nếu có thay đổi về promotion
                  const hasChanges = recalculated.some((p, idx) => {
                    const original = productsAfterDelete[idx];
                    return original && (
                      p.eligibleForPromotion !== original.eligibleForPromotion ||
                      p.discountPercent !== original.discountPercent ||
                      p.discountedPrice !== original.discountedPrice
                    );
                  });
                  if (hasChanges) {
                    console.debug('[ProductTable][DELETE] Recalculated promotions after delete:', {
                      productCodeDeleted: productToDelete.productCode,
                      hasPromotionChanges: true,
                    });
                  }
                }).catch(err => {
                  console.warn('[ProductTable][DELETE] Error recalculating promotions after delete:', err);
                  // Nếu có lỗi recalculate, vẫn set products đã filter (không có promotion changes)
                  setProducts(productsAfterDelete);
                });
              }
            }
          }
        } catch (err: any) {
          console.error('[ProductTable][DELETE] Error in performRemoval:', err);
        } finally {
          // Clear loading state
          setDeletingProductIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          console.log('[ProductTable][DELETE] Deletion completed, loading state cleared');
        }
      };

      if (!isSaved) {
        // Unsaved products: remove with loading state
        await performRemoval();
        return;
      }
      // Saved products: show custom confirmation modal
      setConfirmingProduct(productToDelete);
      setShowConfirmModal(true);
    }
  };

  const handleQuantityChange = async (product: ProductTableItem, newQuantity: number) => {
    if (newQuantity <= 0) {
      return; // Không cho phép số lượng <= 0
    }

    // ============================================================
    // QUAN TRỌNG: Khi thay đổi số lượng, cần recalculate promotion eligibility
    // Vì tổng tiền thay đổi → items có thể đủ/không đủ điều kiện promotion
    // ============================================================

    // Tính lại các giá trị với số lượng mới
    // IMPORTANT: Tính từ base price và discountPercent (không dùng discountedPrice vì có thể có surcharge)
    const basePrice = product.price;
    const discountPercent = product.discountPercent || 0;
    const discountAmount = basePrice * (discountPercent / 100);
    const discountedPriceCalc = basePrice - discountAmount;

    // Tính subtotal từ discountedPriceCalc (KHÔNG có surcharge)
    const newSubtotal = Math.round(newQuantity * discountedPriceCalc);
    const newVatAmount = Math.round((newSubtotal * product.vat) / 100);
    const newTotalAmount = newSubtotal + newVatAmount;

    // Cập nhật sản phẩm trước (với quantity mới)
    const productsWithNewQty = products.map((p) => {
      if (p.id === product.id) {
        const originalQty = p.originalQuantity !== undefined ? p.originalQuantity : p.quantity;
        const isModified = product.isSodCreated === true && newQuantity !== originalQty;

        return {
          ...p,
          quantity: newQuantity,
          subtotal: newSubtotal,
          vatAmount: newVatAmount,
          totalAmount: newTotalAmount,
          isModified: isModified,
          originalQuantity: p.originalQuantity !== undefined
            ? p.originalQuantity
            : (product.isSodCreated === true ? p.quantity : undefined),
        };
      }
      return p;
    });

    // Recalculate promotion eligibility cho tất cả items
    // Nếu soId có giá trị, gọi API để check lại promotion
    if (soId) {
      try {
        console.debug('[ProductTable][QuantityChange] Recalculating promotions after quantity change:', {
          productCode: product.productCode,
          oldQty: product.quantity,
          newQty: newQuantity,
          isSOBG,
          hasCustomRecalculate: !!onRecalculatePromotions,
        });

        // Nếu có custom recalculate function (cho SOBG), dùng nó
        // Ngược lại, dùng hàm recalculatePromotionEligibility mặc định (cho SO)
        const recalculatedProducts = onRecalculatePromotions
          ? await onRecalculatePromotions(productsWithNewQty)
          : await recalculatePromotionEligibility(
            productsWithNewQty,
            soId,
            customerCode || '',
            saleOrders
          );
        setProducts(recalculatedProducts);
      } catch (err) {
        console.warn('[ProductTable][QuantityChange] Error recalculating promotions:', err);
        // Vẫn set products với quantity mới, không có promotion update
        setProducts(productsWithNewQty);
      }
    } else {
      // Không có soId, chỉ cập nhật quantity
      setProducts(productsWithNewQty);
    }
  };

  const handleQuantityEditStart = (product: ProductTableItem) => {
    setEditingQuantityId(product.id);
    setEditingQuantityValue(product.quantity.toString());
  };

  const handleQuantityEditEnd = async (product: ProductTableItem) => {
    const newQuantity = parseFloat(editingQuantityValue) || product.quantity;

    if (newQuantity > 0 && newQuantity !== product.quantity) {
      await handleQuantityChange(product, newQuantity);
    }
    setEditingQuantityId(null);
    setEditingQuantityValue('');
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent, product: ProductTableItem) => {
    if (e.key === 'Enter') {
      handleQuantityEditEnd(product);
    } else if (e.key === 'Escape') {
      setEditingQuantityId(null);
      setEditingQuantityValue('');
    }
  };

  const handleConfirmUpdate = async (product: ProductTableItem) => {
    if (!onUpdate || !product.isSodCreated) {
      return;
    }

    setUpdatingProductId(product.id);
    try {
      await onUpdate(product);
      // Sau khi update thành công, reset isModified và cập nhật originalQuantity
      const updatedProducts = products.map((p) => {
        if (p.id === product.id) {
          return {
            ...p,
            isModified: false,
            originalQuantity: p.quantity,
          };
        }
        return p;
      });
      setProducts(updatedProducts);
    } catch (error) {
      console.error('Error updating product:', error);
      // Revert lại số lượng về originalQuantity khi update thất bại
      const originalQty = product.originalQuantity ?? product.quantity;
      const revertedProducts = products.map((p) => {
        if (p.id === product.id) {
          // Tính lại các giá trị với số lượng gốc
          const originalSubtotal = originalQty * (p.discountedPrice || p.price);
          const originalVatAmount = (originalSubtotal * p.vat) / 100;
          const originalTotalAmount = originalSubtotal + originalVatAmount;

          return {
            ...p,
            quantity: originalQty,
            subtotal: originalSubtotal,
            vatAmount: originalVatAmount,
            totalAmount: originalTotalAmount,
            isModified: false, // Reset isModified vì đã revert
          };
        }
        return p;
      });
      setProducts(revertedProducts);
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleConfirmModalYes = async () => {
    if (!confirmingProduct) return;

    // Set loading state
    setDeletingProductIds(prev => {
      const next = new Set(prev);
      next.add(confirmingProduct.id);
      return next;
    });
    setDeactivating(true);

    try {
      const apiEndpoint = isSOBG ? '/api/admin-app/deactivate-sobg-detail' : '/api/admin-app/deactivate-sale-order-detail';
      const resp = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detailId: confirmingProduct.id }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error('Deactivation failed:', data);
        showToast.error(data.details?.error || data.error || 'Không thể vô hiệu hoá sản phẩm');
        return;
      }
      showToast.success('Đã vô hiệu hoá sản phẩm thành công');
      // perform onDelete - parent sẽ handle recalculate và set products
      try {
        if (onDelete) {
          await onDelete(confirmingProduct);
          // KHÔNG set products ở đây vì parent đã set rồi
        } else {
          // Nếu không có onDelete từ parent, tự remove từ list
          setProducts(products.filter(p => p.id !== confirmingProduct.id));
        }
      } catch (err: any) {
        console.warn('Error in onDelete after deactivate:', err);
        // Nếu có lỗi, vẫn remove từ list để UI không bị stuck
        if (!onDelete) {
          setProducts(products.filter(p => p.id !== confirmingProduct.id));
        }
      }

      // Reload lại danh sách từ backend để đảm bảo sync (đặc biệt khi list đang dùng expand/cache)
      try {
        await onReloadAfterDeactivate?.();
      } catch (err) {
        console.warn('[ProductTable] Reload after deactivate failed:', err);
      }
    } catch (err: any) {
      console.error('Error deactivating product:', err);
      showToast.error(err?.message || 'Lỗi khi vô hiệu hoá sản phẩm');
    } finally {
      // Clear loading state
      setDeletingProductIds(prev => {
        const next = new Set(prev);
        next.delete(confirmingProduct.id);
        return next;
      });
      setDeactivating(false);
      setShowConfirmModal(false);
      setConfirmingProduct(null);
    }
  };

  const handleConfirmModalNo = () => {
    setShowConfirmModal(false);
    setConfirmingProduct(null);
  };

  const showSurchargeColumn =
    invoiceType !== null && invoiceType !== undefined &&
    vatChoice === 191920001 &&
    customerIndustry === 191920004;

  // Sắp xếp theo thời gian add (createdOn) - mới nhất lên đầu
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      // Nếu không có createdOn, đặt xuống cuối
      if (!a.createdOn && !b.createdOn) return 0;
      if (!a.createdOn) return 1;
      if (!b.createdOn) return -1;

      // Sắp xếp theo thời gian (mới nhất lên đầu)
      const dateA = new Date(a.createdOn).getTime();
      const dateB = new Date(b.createdOn).getTime();
      return dateB - dateA; // Descending order
    });
  }, [products]);

  const totalOrderAmount = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  }, [products]);

  const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === '') return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          return dateStr;
        }
        return dateStr;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (product: ProductTableItem) => {
    const crmGuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sodCreated = product.isSodCreated
      ?? crmGuidPattern.test(product.id || '')
      ?? (product.id?.toLowerCase().startsWith('crdfd_') ?? false);

    return (
      <span className={`admin-app-table-status-badge ${sodCreated ? 'admin-app-status-success' : 'admin-app-status-pending'}`}>
        {sodCreated ? '✓' : '○'}
      </span>
    );
  };

  return (
    <div className="admin-app-table-compact-wrapper">
      <div className="admin-app-table-compact-header">
        <h3 className="admin-app-table-title">Danh sách sản phẩm</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {products.length > 0 && (
            <>
              <span className="admin-app-table-count">{products.length} sản phẩm</span>
              <span className="admin-app-table-total" style={{ fontWeight: 600 }}>
                {totalOrderAmount.toLocaleString('vi-VN')} đ
              </span>
            </>
          )}
          {onReloadAfterDeactivate && (
            <button
              type="button"
              onClick={async () => {
                try {
                  setIsRefreshing(true);
                  await onReloadAfterDeactivate();
                } catch (err) {
                  console.warn('[ProductTable] Refresh data failed:', err);
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              style={{
                marginLeft: 12,
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid #d1d5db',
                backgroundColor: isRefreshing ? '#e5e7eb' : '#f9fafb',
                cursor: isRefreshing ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#111827',
              }}
              title="Làm mới dữ liệu danh sách sản phẩm từ CRM"
            >
              {isRefreshing ? 'Đang làm mới...' : 'Làm mới'}
            </button>
          )}
        </div>
      </div>

      <div className="admin-app-table-compact-container">
        <table className="admin-app-table-compact">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>STT</th>
              <th style={{ width: '250px', minWidth: '200px' }}>SP</th>
              <th style={{ width: '80px' }}>ĐV</th>
              <th style={{ width: '70px' }}>SL</th>
              <th style={{ width: '100px' }}>Giá</th>
              {showSurchargeColumn && <th style={{ width: '80px' }}>Phụ phí</th>}
              <th style={{ width: '80px' }}>CK</th>
              <th style={{ width: '100px' }}>VAT</th>
              <th style={{ width: '120px' }}>Tổng</th>
              <th style={{ width: '100px' }}>Ngày giao</th>
              <th style={{ width: '60px' }}>TT</th>
              <th style={{ width: '60px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={showSurchargeColumn ? 12 : 11} className="admin-app-table-empty-compact">
                  Chưa có đơn hàng
                </td>
              </tr>
            ) : (
              sortedProducts.map((product, idx) => {
                const isEditing = editingQuantityId === product.id;
                const isModified = product.isModified === true;
                const showConfirmButton = product.isSodCreated && isModified;

                return (
                  <tr key={product.id} className={isModified ? 'admin-app-row-modified' : ''}>
                    <td className="admin-app-cell-center">{idx + 1}</td>
                    <td className="admin-app-cell-product-name" title={product.productName}>
                      {product.productName}
                      {isModified && (
                        <span className="admin-app-modified-badge" title="Dòng đã sửa">⚠️</span>
                      )}
                    </td>
                    <td>{product.unit}</td>
                    <td className="admin-app-cell-right">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editingQuantityValue}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            // Allow empty string, numbers, and decimal points
                            if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                              setEditingQuantityValue(inputValue);
                            }
                          }}
                          onBlur={() => handleQuantityEditEnd(product)}
                          onKeyDown={(e) => handleQuantityKeyDown(e, product)}
                          className="admin-app-quantity-input"
                          autoFocus
                          style={{
                            width: '60px',
                            textAlign: 'right',
                            padding: '2px 4px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => handleQuantityEditStart(product)}
                          style={{
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            minWidth: '40px',
                          }}
                          title="Click để sửa số lượng"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0f9ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {product.quantity}
                        </span>
                      )}
                    </td>
                    <td className="admin-app-cell-right">{product.price.toLocaleString('vi-VN')}</td>
                    {showSurchargeColumn && (
                      <td className="admin-app-cell-right">{product.surcharge.toLocaleString('vi-VN')}</td>
                    )}
                    <td className="admin-app-cell-right">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        {/* Discount value */}
                        <span>
                          {(() => {
                            // 1️⃣ Ưu tiên hiển thị chiết khấu %
                            const pctSource =
                              product.discountPercent !== undefined && product.discountPercent !== null
                                ? product.discountPercent
                                : product.discount !== undefined && product.discount !== null
                                  ? product.discount
                                  : null;

                            const pctNum = pctSource !== null ? Number(pctSource) : 0;
                            if (!Number.isNaN(pctNum) && pctNum > 0) {
                              let pctLabel: string;
                              if (Number.isInteger(pctNum)) {
                                // Ví dụ: 5 -> "5"
                                pctLabel = pctNum.toString();
                              } else if (Math.abs(pctNum) < 1) {
                                // Các giá trị nhỏ hơn 1%: hiển thị 2 chữ số thập phân
                                // VD: 0.88 -> "0.88"
                                pctLabel = pctNum.toFixed(2);
                              } else {
                                // Các giá trị >= 1%: hiển thị 1 chữ số thập phân
                                // VD: 22.56 -> "22.6"
                                pctLabel = pctNum.toFixed(1);
                              }
                              return `${pctLabel}%`;
                            }

                            // 2️⃣ Nếu không có %, hiển thị chiết khấu VNĐ (crdfd_chieckhauvn -> discountAmount)
                            const amountRaw =
                              product.discountAmount !== undefined &&
                              product.discountAmount !== null &&
                              Number(product.discountAmount) > 0
                                ? Number(product.discountAmount)
                                : 0;

                            if (amountRaw > 0) {
                              const roundedAmount = Math.round(amountRaw);
                              return `${roundedAmount.toLocaleString('vi-VN')} VND`;
                            }

                            // 3️⃣ Không có discount nào
                            return '';
                          })()}
                        </span>
                        {/* Promotion eligibility badge - đổi màu theo loại CK (VND vs %) */}
                        {(() => {
                          const pctNum = Number(product.discountPercent ?? product.discount ?? 0) || 0;
                          const vndAmount = Number(product.discountAmount ?? 0) || 0;
                          const isVndBased = pctNum <= 0 && vndAmount > 0;

                          if (product.eligibleForPromotion === true) {
                            const bgColor = isVndBased ? '#eff6ff' : '#dcfce7'; // VND -> xanh dương nhạt, % -> xanh lá
                            const textColor = isVndBased ? '#1d4ed8' : '#166534';
                            const title = isVndBased
                              ? 'Item đủ điều kiện khuyến mãi (VND)'
                              : 'Item đủ điều kiện khuyến mãi (%)';
                            const label = isVndBased ? '✓ KM VND' : '✓ KM %';
                            return (
                              <span
                                style={{
                                  fontSize: '9px',
                                  padding: '1px 4px',
                                  backgroundColor: bgColor,
                                  color: textColor,
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                }}
                                title={title}
                              >
                                {label}
                              </span>
                            );
                          }

                          if (product.eligibleForPromotion === false) {
                            return (
                              <span
                                style={{
                                  fontSize: '9px',
                                  padding: '1px 4px',
                                  backgroundColor: '#f3f4f6',
                                  color: '#6b7280',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                }}
                                title="Item không đủ điều kiện khuyến mãi"
                              >
                                - KM
                              </span>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="admin-app-cell-right">{product.vat}%</td>
                    {/* Ensure 'Tổng' shows subtotal + VAT (trust subtotal & vatAmount or compute them) */}
                    {(() => {
                      const displaySubtotal = product.subtotal ?? ((product.discountedPrice || product.price) * product.quantity);
                      const displayVatAmount = product.vatAmount ?? Math.round((displaySubtotal * (product.vat || 0)) / 100);
                      const displayTotal = Math.round(displaySubtotal + displayVatAmount);
                      return (
                        <td className="admin-app-cell-right admin-app-cell-total">{displayTotal.toLocaleString('vi-VN')}</td>
                      );
                    })()}
                    <td className="admin-app-cell-center" style={{ fontSize: '12px' }}>
                      {formatDate(product.deliveryDate)}
                    </td>
                    <td className="admin-app-cell-center" title={`Người duyệt: ${product.approver || '-'}\nNgày giao: ${formatDate(product.deliveryDate)}`}>
                      {getStatusBadge(product)}
                    </td>
                    <td className="admin-app-cell-center">
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                        {showConfirmButton && (
                          <button
                            className="admin-app-confirm-btn-compact"
                            onClick={() => handleConfirmUpdate(product)}
                            disabled={updatingProductId === product.id}
                            title="Xác nhận cập nhật"
                            style={{
                              padding: '2px 6px',
                              fontSize: '11px',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: updatingProductId === product.id ? 'not-allowed' : 'pointer',
                              opacity: updatingProductId === product.id ? 0.6 : 1,
                            }}
                          >
                            {updatingProductId === product.id ? '...' : '✓'}
                          </button>
                        )}
                        <button
                          className="admin-app-delete-btn-compact"
                          onClick={() => handleDelete(product.id)}
                          title="Xóa"
                          disabled={deletingProductIds.has(product.id)}
                          style={{
                            cursor: deletingProductIds.has(product.id) ? 'not-allowed' : 'pointer',
                            opacity: deletingProductIds.has(product.id) ? 0.6 : 1,
                          }}
                        >
                          {deletingProductIds.has(product.id) ? '...' : '×'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Confirmation Modal */}
      {showConfirmModal && confirmingProduct && (
        <div className="admin-app-popup-overlay">
          <div className="admin-app-popup" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
            <div className="admin-app-popup-header">
              <h3 id="confirm-modal-title" className="admin-app-popup-title">Xác nhận</h3>
            </div>
            <div className="admin-app-popup-content">
              <p>{`Sản phẩm "${confirmingProduct.productName}" đã được lưu. Bạn có chắc muốn vô hiệu hóa (deactivate) nó?`}</p>
            </div>
            <div className="admin-app-popup-actions" style={{ justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="admin-app-btn admin-app-btn-secondary"
                onClick={handleConfirmModalNo}
                disabled={deactivating}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="admin-app-btn admin-app-btn-primary"
                onClick={handleConfirmModalYes}
                disabled={deactivating}
              >
                {deactivating ? 'Đang vô hiệu...' : 'Vô hiệu hoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ProductTable);

