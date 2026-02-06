# So sánh nút thêm sản phẩm: SO vs SOBG

## 📋 Tổng quan

Nút thêm sản phẩm ở **SO (SalesOrderForm)** và **SOBG (SalesOrderBaoGiaForm)** có **sự khác biệt đáng kể** về logic xử lý promotion và tính toán giá.

---

## 🔍 So sánh chi tiết

### 1. Validation (Giống nhau)

| Khía cạnh | SO | SOBG |
|-----------|-----|------|
| Kiểm tra product | ✅ | ✅ |
| Kiểm tra unit | ✅ | ✅ |
| Kiểm tra quantity > 0 | ✅ | ✅ |
| Kiểm tra giá (approvePrice logic) | ✅ | ✅ |

**Code giống nhau**:
```typescript
const priceNum = parseFloat(price || '0') || 0;
const hasValidPrice = approvePrice ? priceNum >= 0 : priceNum > 0;
if (!product || !unit || quantity <= 0 || !hasValidPrice) { ... }
```

---

### 2. Invoice Surcharge (Giống nhau)

| Khía cạnh | SO | SOBG |
|-----------|-----|------|
| Tính phụ phí hoá đơn | ✅ | ✅ |
| Logic: 1.5% cho "Hộ kinh doanh" + "Không VAT" | ✅ | ✅ |

**Code giống nhau**:
```typescript
const isHoKinhDoanh = selectedSo?.cr1bb_loaihoaon === 191920001;
const isNonVat = vatPercent === 0;
const invoiceSurchargeRate = isHoKinhDoanh && isNonVat ? 0.015 : 0;
```

---

### 3. Promotion Auto-Fetch (KHÁC NHAU - Quan trọng)

| Khía cạnh | SO | SOBG |
|-----------|-----|------|
| **Gọi API fetchPromotionOrders khi thêm sản phẩm** | ✅ **CÓ** | ❌ **KHÔNG** |
| Tính promotionalItemsTotal | ✅ | ❌ |
| Tính estimatedPromotionalTotal | ✅ | ❌ |
| Infer discountPercent từ promotion | ✅ | ❌ |
| Infer promotionId từ promotion | ✅ | ❌ |
| eligibleForPromotion flag | ✅ | ❌ |

**SO có logic phức tạp**:
```typescript
// SO: Tính tổng tiền của các items ĐÃ CÓ promotion
const promotionalItemsTotal = productList
  .filter(item => item.eligibleForPromotion)
  .reduce((sum, item) => {
    const lineSubtotal = item.price * (item.quantity || 0);
    const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
    return sum + lineSubtotal + lineVat;
  }, 0);

// Tính tổng ước tính cho item mới
const newProductTotalEstimate = newProductSubtotalEstimate + newProductVatEstimate;
const estimatedPromotionalTotal = promotionalItemsTotal + newProductTotalEstimate;

// Gọi API để check promotion
if (soId) {
  const res = await fetchPromotionOrders(
    soId,
    customerCode || undefined,
    estimatedPromotionalTotal,
    productCode ? [productCode] : [],
    productGroupCode ? [productGroupCode] : [],
    selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan
  );
  
  // Lấy promotion phù hợp và infer discountPercent
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

**SOBG không có logic này**:
```typescript
// SOBG: Chỉ dùng discountPercent từ state hoặc overrides
const usedDiscountPercent = overrides?.discountPercent ?? discountPercent ?? 0;
const usedDiscountAmount = overrides?.discountAmount ?? discountAmount ?? 0;
```

---

### 4. Discount Calculation (KHÁC NHAU)

| Khía cạnh | SO | SOBG |
|-----------|-----|------|
| **Ưu tiên discount** | 1. overrides<br>2. inferredDiscountPercent<br>3. 0 | 1. overrides<br>2. state discountPercent<br>3. 0 |
| **Có auto-infer từ promotion** | ✅ | ❌ |

**SO**:
```typescript
// ƯU TIÊN DISCOUNT:
// 1. overrides.discountPercent (từ ProductEntryForm - manual entry)
// 2. inferredDiscountPercent (từ promotion valid - đáp ứng điều kiện)
// 3. 0 (không có discount)
const usedDiscountPercent = overrides?.discountPercent ?? inferredDiscountPercent ?? 0;
```

**SOBG**:
```typescript
// Chỉ dùng từ overrides hoặc state, không có auto-infer
const usedDiscountPercent = overrides?.discountPercent ?? discountPercent ?? 0;
const usedDiscountAmount = overrides?.discountAmount ?? discountAmount ?? 0;
```

---

### 5. Price Calculation (KHÁC NHAU - Quan trọng)

| Khía cạnh | SO | SOBG |
|-----------|-----|------|
| **Tính discountedPriceCalc** | ✅ (trước surcharge) | ✅ |
| **Tính finalPrice** | ✅ (có surcharge) | ✅ |
| **Dùng giá nào để tính subtotal/vat/total** | ✅ **discountedPriceCalc** (không có surcharge) | ❌ **finalPrice** (có surcharge) |

**SO** (đúng):
```typescript
const discountedPriceCalc = basePrice * (1 - (usedDiscountPercent || 0) / 100) - (usedDiscountAmount || 0);
const finalPrice = discountedPriceCalc * (1 + invoiceSurchargeRate);

// IMPORTANT: Use discountedPriceCalc (not finalPrice) to match orderSummary calculation logic
// Invoice surcharge is tracked separately in invoiceSurcharge field
const subtotalCalc = Math.round(quantity * discountedPriceCalc);
const vatCalc = Math.round((subtotalCalc * (vatPercent || 0)) / 100);
const totalCalc = subtotalCalc + vatCalc;
```

**SOBG** (sai):
```typescript
const discountedPriceCalc = basePrice * (1 - (usedDiscountPercent || 0) / 100) - (usedDiscountAmount || 0);
const finalPrice = discountedPriceCalc * (1 + invoiceSurchargeRate);

// ❌ SAI: Dùng finalPrice (có surcharge) để tính subtotal/vat/total
// Điều này làm surcharge bị tính vào subtotal và VAT, không đúng logic
const subtotalCalc = quantity * finalPrice;  // ❌ SAI
const vatCalc = (subtotalCalc * vatPercent) / 100;
const totalCalc = subtotalCalc + vatCalc;
```

**Vấn đề SOBG**:
- Invoice surcharge (1.5%) bị tính vào subtotal
- VAT được tính trên subtotal đã có surcharge → VAT cao hơn
- Tổng tiền không khớp với logic tính toán chuẩn

---

### 6. Recalculate Promotion Eligibility (KHÁC NHAU)

| Khía cạnh | SO | SOBG |
|-----------|-----|------|
| **Gọi recalculatePromotionEligibility sau khi thêm** | ✅ **CÓ** | ❌ **KHÔNG** |
| **Cập nhật eligibleForPromotion cho tất cả items** | ✅ | ❌ |

**SO**:
```typescript
// Thêm product mới vào danh sách tạm
const productsWithNew = [...productList, newProduct];

// QUAN TRỌNG: Recalculate promotion eligibility cho TẤT CẢ items
// Nếu item mới có promotion (eligibleForPromotion = true),
// các items khác CHƯA có promotion có thể đã đủ điều kiện
const recalculatedProducts = await recalculatePromotionEligibility(
  productsWithNew,
  soId,
  customerCode,
  selectedSo
);
setProductList(recalculatedProducts);
```

**SOBG**:
```typescript
// Chỉ thêm vào list, không recalculate
setProductList([...productList, newProduct]);
```

---

### 7. Product Object Structure (KHÁC NHAU)

| Field | SO | SOBG |
|-------|-----|------|
| `eligibleForPromotion` | ✅ | ❌ |
| `discountedPrice` | ✅ (discountedPriceCalc, không có surcharge) | ✅ (finalPrice, có surcharge) |
| `promotionId` | ✅ (có inferredPromotionId) | ✅ (chỉ từ overrides/state) |

**SO**:
```typescript
const newProduct: ProductTableItem = {
  // ...
  discountedPrice: approvePrice ? (priceNoVat ?? discountedPriceCalc) : discountedPriceCalc,
  eligibleForPromotion: currentItemEligibleForPromotion,
  promotionId: promoIdToUse, // có thể từ inferredPromotionId
  // ...
};
```

**SOBG**:
```typescript
const newProduct: ProductItem = {
  // ...
  discountedPrice: finalPrice, // ❌ có surcharge
  // Không có eligibleForPromotion
  promotionId: promoIdToUse, // chỉ từ overrides/state
  // ...
};
```

---

## 🐛 Vấn đề phát hiện

### 1. SOBG thiếu Promotion Auto-Fetch
- **Hậu quả**: Khi thêm sản phẩm, SOBG không tự động tìm promotion phù hợp
- **Ảnh hưởng**: User phải tự chọn promotion, dễ bỏ sót promotion hợp lệ

### 2. SOBG tính sai subtotal/vat/total
- **Hậu quả**: Invoice surcharge bị tính vào subtotal và VAT
- **Ảnh hưởng**: Tổng tiền không khớp với logic chuẩn, VAT cao hơn thực tế

### 3. SOBG thiếu Recalculate Promotion Eligibility
- **Hậu quả**: Khi thêm sản phẩm mới, các sản phẩm cũ không được re-check promotion eligibility
- **Ảnh hưởng**: Có thể bỏ sót promotion cho các items cũ khi tổng đơn đạt ngưỡng

---

## 💡 Đề xuất sửa

### 1. Thêm Promotion Auto-Fetch cho SOBG

```typescript
// Trong handleAddProduct của SOBG, thêm logic tương tự SO:

// Tính promotionalItemsTotal
const promotionalItemsTotal = productList
  .filter(item => item.eligibleForPromotion) // Cần thêm field này
  .reduce((sum, item) => {
    const lineSubtotal = item.price * (item.quantity || 0);
    const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
    return sum + lineSubtotal + lineVat;
  }, 0);

// Tính estimatedPromotionalTotal
const newProductSubtotalEstimate = Math.round(quantity * basePrice);
const newProductVatEstimate = Math.round((newProductSubtotalEstimate * (vatPercent || 0)) / 100);
const newProductTotalEstimate = newProductSubtotalEstimate + newProductVatEstimate;
const estimatedPromotionalTotal = promotionalItemsTotal + newProductTotalEstimate;

// Gọi API fetchPromotionOrders
if (sobgId) {
  const res = await fetchPromotionOrders(
    sobgId,
    customerCode || undefined,
    estimatedPromotionalTotal,
    productCode ? [productCode] : [],
    productGroupCode ? [productGroupCode] : [],
    selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan
  );
  
  // Infer discountPercent và promotionId
  // ... (tương tự SO)
}
```

### 2. Sửa Price Calculation cho SOBG

```typescript
// Sửa từ:
const subtotalCalc = quantity * finalPrice;  // ❌ SAI

// Thành:
const subtotalCalc = Math.round(quantity * discountedPriceCalc);  // ✅ ĐÚNG
const vatCalc = Math.round((subtotalCalc * vatPercent) / 100);
const totalCalc = subtotalCalc + vatCalc;

// Và sửa discountedPrice:
discountedPrice: discountedPriceCalc,  // Không có surcharge
```

### 3. Thêm Recalculate Promotion Eligibility cho SOBG

```typescript
// Sau khi thêm product:
const productsWithNew = [...productList, newProduct];

// Recalculate promotion eligibility (cần implement hàm này cho SOBG)
const recalculatedProducts = await recalculatePromotionEligibilitySOBG(
  productsWithNew,
  sobgId,
  customerCode,
  selectedSo
);
setProductList(recalculatedProducts);
```

### 4. Thêm field `eligibleForPromotion` cho ProductItem (SOBG)

```typescript
interface ProductItem {
  // ... existing fields
  eligibleForPromotion?: boolean;  // Thêm field này
}
```

---

## ✅ Checklist cần làm

- [ ] Thêm promotion auto-fetch logic vào SOBG handleAddProduct
- [ ] Sửa price calculation (dùng discountedPriceCalc thay vì finalPrice)
- [ ] Thêm field eligibleForPromotion vào ProductItem
- [ ] Implement recalculatePromotionEligibilitySOBG
- [ ] Test và verify logic hoạt động đúng

---

## 📝 Kết luận

**Nút thêm sản phẩm ở SOBG KHÔNG hoạt động giống SO**:
- ❌ Thiếu promotion auto-fetch
- ❌ Tính sai subtotal/vat/total (surcharge bị tính vào)
- ❌ Thiếu recalculate promotion eligibility
- ❌ Thiếu field eligibleForPromotion

**Cần sửa ngay để đảm bảo consistency giữa SO và SOBG**.
