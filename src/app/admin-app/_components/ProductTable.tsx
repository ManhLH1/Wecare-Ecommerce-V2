'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { showToast } from '../../../components/ToastManager';
import { fetchPromotionOrders, PromotionOrderItem } from '../_api/adminApi';

// Helper function để check percent-based promotion
const vndCodeEquals = (p: any, code: number) => {
  if (p === null || p === undefined) return false;
  const v = p.vndOrPercent ?? p.crdfd_vn ?? p.vndOrPercent;
  if (v === undefined || v === null) return false;
  const vs = String(v).trim();
  return vs === String(code);
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
  soId?: string; // SO ID để update
  warehouseName?: string; // Warehouse name
  isVatOrder?: boolean; // Is VAT order
  isSOBG?: boolean; // nếu true gọi API deactivate SOBG detail thay vì SOD
  customerCode?: string; // Customer code cho promotion calculation
  paymentTerms?: string; // Payment terms cho promotion calculation
}

// ============================================================
// Hàm recalculate promotion eligibility cho TẤT CẢ items
// Called khi thay đổi quantity hoặc thêm item mới có promotion
// ============================================================
async function recalculatePromotionEligibility(
  currentProducts: ProductTableItem[],
  soIdValue: string,
  customerCodeValue: string,
  paymentTermsValue: string | undefined
): Promise<ProductTableItem[]> {
  if (!soIdValue || currentProducts.length === 0) return currentProducts;

  console.debug('[ProductTable][RECALC] Starting recalculation:', {
    totalProducts: currentProducts.length,
    soId: soIdValue,
    customerCode: customerCodeValue,
  });

  // 1. Tìm items đã có promotion (eligibleForPromotion = true)
  const promoItems = currentProducts.filter(item => item.eligibleForPromotion);
  const nonPromoItems = currentProducts.filter(item => !item.eligibleForPromotion);

  // 2. Tính TỔNG TẤT CẢ items dùng BASE PRICE (giá gốc) để check điều kiện promotion
  // QUAN TRỌNG: Dùng price (giá gốc) để tính tổng, KHÔNG dùng discountedPrice
  // Vì điều kiện promotion (totalAmountCondition) áp dụng cho GIÁ TRỊ ĐƠN HÀNG GỐC,
  // sau đó mới tính discount cho từng item
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

  // 3. Fetch tất cả promotions một lần với promotionalItemsTotal
  try {
    const res = await fetchPromotionOrders(
      soIdValue,
      customerCodeValue || undefined,
      totalOrderAmount, // Dùng totalOrderAmount (TẤT CẢ items)
      [],
      [],
      paymentTermsValue
    );

    const allPromotions = (res.availablePromotions?.length > 0) 
      ? res.availablePromotions 
      : res.allPromotions || [];

    // 4. Build map: productCode → best promotion (percent-based, meets total condition)
    const promotionMap = new Map<string, { discountPercent: number; promotionId: string }>();

    console.debug('[ProductTable][RECALC] Promotions from API:', {
      count: allPromotions.length,
      totalOrderAmount,
    });

    for (const p of allPromotions) {
      const isPercent = vndCodeEquals(p, 191920000);
      const minTotal = Number(p.totalAmountCondition || 0);
      const meetsTotal = minTotal === 0 || totalOrderAmount >= minTotal;

      if (isPercent && meetsTotal) {
        const value = Number(p.value) || 0;
        const promoId = p.id;

        // Parse productCodes từ promotion
        const promoProductCodes = (p.productCodes || '').split(',').map(s => s.trim()).filter(Boolean);
        const promoGroupCodes = (p.productGroupCodes || '').split(',').map(s => s.trim()).filter(Boolean);

        console.debug('[ProductTable][RECALC] Matching promotion:', {
          promoId,
          promoName: p.name?.substring(0, 50),
          value,
          minTotal,
          totalOrderAmount,
          meetsTotal,
          promoProductCodes,
          promoGroupCodes,
        });

        // QUAN TRỌNG: Duyệt TẤT CẢ items (promoItems + nonPromoItems)
        // để khi tổng đơn đủ điều kiện, TẤT CẢ items matching đều được apply promotion
        const allItems = [...nonPromoItems, ...promoItems];
        for (const item of allItems) {
          const matchesProduct = promoProductCodes.length === 0 || promoProductCodes.includes(item.productCode || '');
          const matchesGroup = promoGroupCodes.length === 0 || promoGroupCodes.includes(item.productGroupCode || '');

          console.debug('[ProductTable][RECALC] Checking item against promotion:', {
            itemProductCode: item.productCode,
            itemProductName: item.productName?.substring(0, 30),
            promoProductCodes,
            promoGroupCodes,
            matchesProduct,
            matchesGroup,
            willGetPromotion: matchesProduct || matchesGroup,
            currentEligible: item.eligibleForPromotion,
          });

          if (matchesProduct || matchesGroup) {
            // Lưu promotion tốt nhất (discount cao nhất)
            const existing = promotionMap.get(item.productCode || '');
            if (!existing || value > existing.discountPercent) {
              promotionMap.set(item.productCode || '', {
                discountPercent: value,
                promotionId: promoId
              });
            }
          }
        }
      }
    }

    console.debug('[ProductTable][RECALC] Promotion map built:', {
      mapSize: promotionMap.size,
      nonPromoItemCount: nonPromoItems.length,
      willUpdateCount: Array.from(promotionMap.keys()),
    });

    // 5. Update TẤT CẢ items dựa trên promotionMap
    // Logic đơn giản:
    // - Nếu item có trong promotionMap → ÁP DỤNG promotion
    // - Nếu item không có trong promotionMap → LOẠI BỎ promotion
    let updatedCount = 0;
    let removedCount = 0;
    const updatedProducts = currentProducts.map(item => {
      const promoInfo = promotionMap.get(item.productCode || '');

      // Case A: Item có trong promotionMap → ÁP DỤNG promotion
      if (promoInfo) {
        // Nếu đã có promotion và discount giống nhau → giữ nguyên (tránh re-render không cần thiết)
        if (item.eligibleForPromotion && item.discountPercent === promoInfo.discountPercent) {
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

      // Case B: Item không có trong promotionMap → LOẠI BỎ promotion
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
  soId,
  warehouseName,
  isVatOrder
  , isSOBG = false
  , customerCode
  , paymentTerms
}: ProductTableProps) {
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [editingQuantityValue, setEditingQuantityValue] = useState<string>('');
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingProduct, setConfirmingProduct] = useState<ProductTableItem | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const handleDelete = (id: string) => {
    const productToDelete = products.find((p) => p.id === id);
    if (productToDelete) {
      // If product has been saved to CRM (isSodCreated) ask for confirmation and deactivate first
      // Consider a product saved to CRM only if isSodCreated === true AND id looks like a GUID.
      const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isSaved = productToDelete.isSodCreated === true && GUID_PATTERN.test(String(productToDelete.id));

      const performRemoval = async (prod?: ProductTableItem) => {
        try {
          // Call parent onDelete to handle inventory adjustments (if provided)
          if (onDelete) {
            await onDelete(prod || productToDelete);
          }
        } catch (err: any) {
          console.warn('Error in onDelete handler:', err);
        } finally {
          // Remove from UI list
          const productsAfterDelete = products.filter((p) => p.id !== id);
          setProducts(productsAfterDelete);

          // ============================================================
          // QUAN TRỌNG: Recalculate promotion eligibility sau khi xóa sản phẩm
          // Khi xóa sản phẩm, tổng tiền đơn giảm → các items còn lại có thể
          // KHÔNG còn đủ điều kiện promotion (totalAmountCondition)
          // ============================================================
          if (soId && productsAfterDelete.length > 0) {
            recalculatePromotionEligibility(
              productsAfterDelete,
              soId,
              customerCode || '',
              paymentTerms
            ).then(recalculated => {
              // Chỉ update nếu có thay đổi (có items được loại bỏ promotion)
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
                setProducts(recalculated);
              }
            }).catch(err => {
              console.warn('[ProductTable][DELETE] Error recalculating promotions after delete:', err);
            });
          }
        }
      };

      if (!isSaved) {
        // Unsaved products: remove immediately without confirmation
        performRemoval();
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
    const newSubtotal = newQuantity * (product.discountedPrice || product.price);
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
        });

        const recalculatedProducts = await recalculatePromotionEligibility(
          productsWithNewQty,
          soId,
          customerCode || '',
          paymentTerms
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
      // perform onDelete and remove from list
      try {
        if (onDelete) await onDelete(confirmingProduct);
      } catch (err: any) {
        console.warn('Error in onDelete after deactivate:', err);
      }
      setProducts(products.filter(p => p.id !== confirmingProduct.id));
    } catch (err: any) {
      console.error('Error deactivating product:', err);
      showToast.error(err?.message || 'Lỗi khi vô hiệu hoá sản phẩm');
    } finally {
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
        {products.length > 0 && (
          <>
            <span className="admin-app-table-count">{products.length} sản phẩm</span>
            <span className="admin-app-table-total" style={{ marginLeft: 12, fontWeight: 600 }}>
              {totalOrderAmount.toLocaleString('vi-VN')} đ
            </span>
          </>
        )}
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
                          {product.discountPercent !== undefined && product.discountPercent !== null && product.discountPercent > 0
                            ? `${(Number.isInteger(product.discountPercent) ? product.discountPercent : Number(product.discountPercent).toFixed(1))}%`
                            : product.discountAmount !== undefined && product.discountAmount !== null && product.discountAmount > 0
                              ? product.discountAmount.toLocaleString('vi-VN')
                              : product.discount !== undefined && product.discount !== null && product.discount > 0
                                ? product.discount.toLocaleString('vi-VN')
                                : '-'}
                        </span>
                        {/* Promotion eligibility badge */}
                        {product.eligibleForPromotion === true ? (
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '1px 4px',
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                            }}
                            title="Item đủ điều kiện khuyến mãi"
                          >
                            ✓ KM
                          </span>
                        ) : product.eligibleForPromotion === false ? (
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
                        ) : null}
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
                        >
                          ×
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

