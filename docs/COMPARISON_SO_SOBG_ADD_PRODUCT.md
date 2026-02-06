# So sánh Logic Nút Thêm Sản Phẩm: SO vs SOBG

## 📋 Tổng quan

Nút thêm sản phẩm ở **SOBG** **KHÔNG hoạt động giống** với **SO**. Có nhiều khác biệt quan trọng về logic promotion và tính toán.

---

## ✅ Giống nhau

### 1. Validation
- ✅ Kiểm tra product, unit, quantity, price
- ✅ Cho phép giá = 0 khi bật "Duyệt giá"
- ✅ Hiển thị thông báo lỗi cụ thể

### 2. Invoice Surcharge
- ✅ Tính phụ phí hoá đơn 1.5% cho "Hộ kinh doanh" + "Không VAT"
- ✅ Logic giống nhau

### 3. Reset Form
- ✅ Reset các field sau khi thêm
- ✅ Giữ lại warehouse, customer, deliveryDate

---

## ❌ Khác biệt quan trọng

### 1. **Promotion Auto-Fetch** (QUAN TRỌNG)

#### SO (SalesOrderForm)
```typescript
// Dòng 736-839: Fetch promotion từ API
if (soId) {
  const res = await fetchPromotionOrders(
    soId,
    customerCode || undefined,
    estimatedPromotionalTotal,
    productCode ? [productCode] : [],
    productGroupCode ? [productGroupCode] : [],
    selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan
  );
  
  // Tính inferredDiscountPercent từ promotion
  const candidates = allPromotions.filter(p => {
    const isPercent = vndCodeEquals(p, 191920000);
    const minTotal = Number(p.totalAmountCondition || 0);
    const meetsTotalCondition = minTotal === 0 || estimatedPromotionalTotal >= minTotal;
    return isPercent && meetsTotalCondition;
  });
  
  if (candidates && candidates.length > 0) {
    const pick = candidates[0];
    inferredDiscountPercent = Number(pick.value) || 0;
    inferredPromotionId = pick.id;
    currentItemEligibleForPromotion = true;
  }
}
```

#### SOBG (SalesOrderBaoGiaForm)
```typescript
// ❌ KHÔNG có logic fetch promotion từ API
// Chỉ dùng discountPercent từ state hoặc overrides
const usedDiscountPercent = overrides?.discountPercent ?? discountPercent ?? 0;
```

**Hậu quả**:
- SOBG không tự động áp dụng promotion khi thêm sản phẩm
- User phải tự chọn promotion thủ công
- Không có auto-detection promotion eligibility

---

### 2. **Promotion Eligibility Recalculation**

#### SO (SalesOrderForm)
```typescript
// Dòng 964-970: Recalculate promotion eligibility cho TẤT CẢ items
const recalculatedProducts = await recalculatePromotionEligibility(
  productsWithNew,
  soId,
  customerCode,
  selectedSo
);
setProductList(recalculatedProducts);
```

#### SOBG (SalesOrderBaoGiaForm)
```typescript
// ❌ KHÔNG có logic recalculate promotion eligibility
setProductList([...productList, newProduct]);
```

**Hậu quả**:
- SOBG không tự động cập nhật promotion eligibility cho các items khác
- Các items cũ không được re-check promotion khi thêm item mới

---

### 3. **Field `eligibleForPromotion`**

#### SO (SalesOrderForm)
```typescript
// Dòng 937: Có field eligibleForPromotion
eligibleForPromotion: currentItemEligibleForPromotion,
```

#### SOBG (SalesOrderBaoGiaForm)
```typescript
// ❌ KHÔNG có field eligibleForPromotion
// ProductItem interface không có field này
```

**Hậu quả**:
- SOBG không track được item nào có promotion
- Không thể filter/group items theo promotion eligibility

---

### 4. **Tính Subtotal (QUAN TRỌNG)**

#### SO (SalesOrderForm)
```typescript
// Dòng 880: Dùng discountedPriceCalc (KHÔNG có invoice surcharge)
const subtotalCalc = Math.round(quantity * discountedPriceCalc);
const vatCalc = Math.round((subtotalCalc * (vatPercent || 0)) / 100);
const totalCalc = subtotalCalc + vatCalc;

// discountedPrice = price sau discount, TRƯỚC VAT và invoice surcharge
discountedPrice: approvePrice ? (priceNoVat ?? discountedPriceCalc) : discountedPriceCalc,
```

#### SOBG (SalesOrderBaoGiaForm)
```typescript
// Dòng 408: Dùng finalPrice (CÓ invoice surcharge)
const subtotalCalc = quantity * finalPrice;
const vatCalc = (subtotalCalc * vatPercent) / 100;
const totalCalc = subtotalCalc + vatCalc;

// discountedPrice = finalPrice (CÓ invoice surcharge)
discountedPrice: finalPrice,
```

**Hậu quả**:
- SOBG tính subtotal SAI: đã bao gồm invoice surcharge
- SO tính đúng: subtotal = quantity × (price sau discount), invoice surcharge track riêng

---

### 5. **Promotion ID Logic**

#### SO (SalesOrderForm)
```typescript
// Dòng 897: Ưu tiên overrides > inferred > empty
const promoIdToUse = overrides?.promotionId ?? inferredPromotionId ?? '';
```

#### SOBG (SalesOrderBaoGiaForm)
```typescript
// Dòng 404: Ưu tiên overrides > state (có thể là stale)
const promoIdToUse = overrides?.promotionId ?? promotionId;
```

**Hậu quả**:
- SOBG có thể dùng promotionId cũ (stale) nếu không có overrides
- SO đảm bảo không dùng stale promotionId (fallback về empty)

---

### 6. **Promotional Total Calculation**

#### SO (SalesOrderForm)
```typescript
// Dòng 710-717: Tính tổng CHỈ promotional items
const promotionalItemsTotal = productList
  .filter(item => item.eligibleForPromotion)
  .reduce((sum, item) => {
    const lineSubtotal = item.price * (item.quantity || 0);
    const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
    return sum + lineSubtotal + lineVat;
  }, 0);

// Dùng estimatedPromotionalTotal để check promotion condition
const estimatedPromotionalTotal = promotionalItemsTotal + newProductTotalEstimate;
```

#### SOBG (SalesOrderBaoGiaForm)
```typescript
// ❌ KHÔNG có logic tính promotional total
// Không filter items theo eligibleForPromotion
```

**Hậu quả**:
- SOBG không thể check promotion condition dựa trên tổng promotional items
- SO có thể check chính xác: chỉ tính items có promotion vào điều kiện tổng tiền

---

## 📊 Bảng so sánh

| Tính năng | SO | SOBG | Ghi chú |
|-----------|----|------|---------|
| **Auto-fetch promotion** | ✅ Có | ❌ Không | SOBG không tự động fetch |
| **Promotion eligibility** | ✅ Có | ❌ Không | SOBG không track eligibility |
| **Recalculate eligibility** | ✅ Có | ❌ Không | SOBG không recalculate |
| **Field eligibleForPromotion** | ✅ Có | ❌ Không | SOBG không có field này |
| **Subtotal calculation** | ✅ Đúng | ❌ Sai | SOBG dùng finalPrice (có surcharge) |
| **Promotion ID logic** | ✅ Safe | ⚠️ Có thể stale | SOBG có thể dùng ID cũ |
| **Promotional total** | ✅ Có | ❌ Không | SOBG không tính riêng |

---

## 🐛 Vấn đề phát hiện

### 1. SOBG tính subtotal SAI
```typescript
// SOBG (SAI):
const subtotalCalc = quantity * finalPrice; // finalPrice đã có invoice surcharge

// SO (ĐÚNG):
const subtotalCalc = Math.round(quantity * discountedPriceCalc); // discountedPriceCalc chưa có surcharge
```

**Fix cần thiết**:
```typescript
// SOBG nên dùng:
const subtotalCalc = Math.round(quantity * discountedPriceCalc);
// Invoice surcharge track riêng trong field invoiceSurcharge
```

---

### 2. SOBG không auto-detect promotion
- User phải tự chọn promotion thủ công
- Không có auto-detection khi thêm sản phẩm
- Không có promotion eligibility tracking

**Fix cần thiết**:
- Thêm logic fetch promotion từ API (tương tự SO)
- Thêm field `eligibleForPromotion` vào ProductItem
- Thêm hàm `recalculatePromotionEligibility` cho SOBG

---

### 3. SOBG không recalculate promotion eligibility
- Khi thêm item mới, các items cũ không được re-check promotion
- Có thể dẫn đến inconsistency: item mới đủ điều kiện nhưng items cũ không được update

**Fix cần thiết**:
- Thêm logic recalculate sau khi thêm product (tương tự SO)

---

## 💡 Đề xuất cải thiện

### 1. Đồng bộ logic tính subtotal
```typescript
// SOBG nên sửa thành:
const discountedPriceCalc = basePrice * (1 - (usedDiscountPercent || 0) / 100) - (usedDiscountAmount || 0);
const finalPrice = discountedPriceCalc * (1 + invoiceSurchargeRate);

// Tính subtotal từ discountedPriceCalc (KHÔNG có surcharge)
const subtotalCalc = Math.round(quantity * discountedPriceCalc);
const vatCalc = Math.round((subtotalCalc * (vatPercent || 0)) / 100);
const totalCalc = subtotalCalc + vatCalc;

// discountedPrice = discountedPriceCalc (chưa có surcharge)
discountedPrice: discountedPriceCalc,
```

---

### 2. Thêm auto-fetch promotion cho SOBG
```typescript
// Thêm logic tương tự SO:
if (soId) {
  const res = await fetchPromotionOrders(
    soId,
    customerCode || undefined,
    estimatedPromotionalTotal,
    productCode ? [productCode] : [],
    productGroupCode ? [productGroupCode] : [],
    selectedSo?.crdfd_ieukhoanthanhtoan
  );
  
  // Tính inferredDiscountPercent từ promotion
  // ...
}
```

---

### 3. Thêm promotion eligibility tracking
```typescript
// Thêm field vào ProductItem interface:
interface ProductItem {
  // ... existing fields
  eligibleForPromotion?: boolean; // Track promotion eligibility
}

// Thêm logic recalculate:
const recalculatedProducts = await recalculatePromotionEligibility(
  productsWithNew,
  soId,
  customerCode,
  selectedSo
);
```

---

## ✅ Checklist cần làm

- [ ] Sửa logic tính subtotal trong SOBG (dùng discountedPriceCalc thay vì finalPrice)
- [ ] Thêm auto-fetch promotion cho SOBG khi thêm sản phẩm
- [ ] Thêm field `eligibleForPromotion` vào ProductItem interface
- [ ] Thêm hàm `recalculatePromotionEligibility` cho SOBG
- [ ] Đồng bộ logic promotion ID (fallback về empty thay vì stale)
- [ ] Test và verify logic sau khi sửa

---

## 📝 Kết luận

**Nút thêm sản phẩm ở SOBG KHÔNG hoạt động giống SO**:
- ❌ Không có auto-fetch promotion
- ❌ Không có promotion eligibility tracking
- ❌ Tính subtotal SAI (bao gồm invoice surcharge)
- ❌ Không recalculate promotion eligibility

**Cần sửa ngay**:
1. Sửa logic tính subtotal
2. Thêm auto-fetch promotion
3. Thêm promotion eligibility tracking
4. Đồng bộ logic với SO
