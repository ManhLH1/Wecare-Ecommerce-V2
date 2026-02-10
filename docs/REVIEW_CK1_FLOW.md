# Review Luồng Promotion Chiết Khấu 1 (CK1) ở Sales Order

## 📋 Tổng quan

**Chiết khấu 1 (CK1)** là promotion áp dụng cho **toàn bộ đơn hàng**, khác với CK2 áp dụng cho từng dòng sản phẩm.

---

## 🔄 Luồng hiện tại

### 1. Frontend - ProductEntryForm

**File**: `src/app/admin-app/_components/ProductEntryForm.tsx`

**Chức năng**:
- Tính toán `promotionDiscountPercent` từ promotion được chọn (dòng 2536-2597)
- Áp dụng chiết khấu vào từng dòng sản phẩm khi nhập
- Khi bật "Duyệt giá" → CK1 = 0 (dòng 2541-2546)

**Logic chính**:
```typescript
// Sync discount percent from promotion selection
useEffect(() => {
  if (approvePrice) {
    setPromotionDiscountPercent(0); // CK1 = 0 khi duyệt giá
    return;
  }
  
  const selected = promotions.find(...);
  const promoPct = derivePromotionPercent(selected);
  setPromotionDiscountPercent(promoPct);
  recomputeTotals(price, quantity, promoPct, vatPercent);
}, [selectedPromotionId, promotions, ...]);
```

**Vấn đề**:
- ✅ Tính toán CK1 ở mức dòng sản phẩm (line-level)
- ⚠️ CK1 nên áp dụng ở mức đơn hàng (order-level), không phải từng dòng

---

### 2. Frontend - SalesOrderForm

**File**: `src/app/admin-app/_components/SalesOrderForm.tsx`

**Chức năng**:
- Apply promotion order qua `handleApplyPromotionOrder` (dòng 1541-1770)
- Gọi API `apply-promotion-order.ts` với:
  - `chietKhau2: false` nếu là CK1
  - `orderTotal: currentOrderTotal` để validate điều kiện tổng tiền

**Logic chính**:
```typescript
const result = await applyPromotionOrder({
  soId: soId,
  promotionId: promo.id,
  promotionName: promo.name,
  promotionValue: promo.value || 0,
  vndOrPercent: normalizedVndOrPercent,
  chietKhau2: String(promo.chietKhau2) === '191920001' || ...,
  productCodes: promo.productCodes,
  productGroupCodes: promo.productGroupCodes,
  orderTotal: currentOrderTotal,
});
```

**Vấn đề**:
- ✅ Validate điều kiện tổng tiền trước khi apply
- ✅ Validate điều khoản thanh toán
- ⚠️ Sau khi apply CK1, không có logic tính lại tổng đơn hàng với CK1

---

### 3. Backend - apply-promotion-order.ts

**File**: `pages/api/admin-app/apply-promotion-order.ts`

**Chức năng chính**:

#### 3.1. Validate promotion (dòng 91-131)
- ✅ Lấy promotion từ CRM
- ✅ Kiểm tra tổng tiền đơn hàng ≥ giá trị tối thiểu (nếu có)
- ✅ Sử dụng `orderTotal` từ UI để validate (không fetch SODs)

#### 3.2. Xử lý CK1 vs CK2 (dòng 183-230)
```typescript
// FIX 2: KIỂM TRA - Nếu CK2 = true nhưng không có product/group filter → REJECT
if (effectiveChietKhau2) {
  // CK2 logic: validate filter, update SODs
} else {
  // CK1 logic: chỉ tạo Orders x Promotion
}
```

#### 3.3. Tạo/Cập nhật Orders x Promotion (dòng 299-370)
- ✅ Check existing record để tránh duplicate
- ✅ Reuse existing record nếu đã có
- ✅ Tạo mới nếu chưa có

#### 3.4. Xử lý CK1 (dòng 610-617)
```typescript
} else {
  // Not chiết khấu 2 or special promotion: skip SOD updates entirely.
  updatedSodCount = 0;
}

// Note: we intentionally skip updating Sale Order header fields (crdfd_chietkhau2)
// because header-level discount storage is managed elsewhere or not desired.
console.log('[ApplyPromotion] Skipping Sale Order header update for crdfd_chietkhau2 per configuration.');
```

**Vấn đề nghiêm trọng**:
- ❌ **CK1 không update tổng đơn hàng**: Chỉ tạo record `Orders x Promotion`, không tính lại `crdfd_tongtien`, `crdfd_tongtientruocthue`, `crdfd_tienthue`
- ❌ **CK1 không được lưu vào SO header**: Comment rõ "Skipping Sale Order header update"
- ⚠️ **CK1 chỉ tồn tại trong Orders x Promotion**: Không có cách nào để tính toán tổng đơn hàng sau CK1 từ backend

---

## 🐛 Vấn đề phát hiện

### 1. CK1 không được tính vào tổng đơn hàng

**Hiện trạng**:
- CK1 chỉ tạo record trong `crdfd_ordersxpromotions`
- Tổng đơn hàng (`crdfd_tongtien`) không được cập nhật sau khi apply CK1
- Frontend phải tự tính toán CK1 để hiển thị

**Hậu quả**:
- Tổng đơn hàng trong CRM không chính xác
- Báo cáo, xuất hóa đơn có thể sai
- Không có single source of truth cho tổng đơn sau CK1

**Ví dụ**:
```
Đơn hàng: 10,000,000đ
CK1: 10% → Giảm 1,000,000đ
Tổng sau CK1: 9,000,000đ

Nhưng trong CRM:
- crdfd_tongtien vẫn = 10,000,000đ ❌
- crdfd_ordersxpromotions có record CK1 ✅
```

---

### 2. CK1 được tính ở line-level thay vì order-level

**Hiện trạng**:
- `ProductEntryForm` tính `promotionDiscountPercent` cho từng dòng
- CK1 nên áp dụng cho tổng đơn, không phải từng dòng

**Vấn đề**:
- Nếu có nhiều dòng với giá khác nhau, CK1 sẽ được tính khác nhau cho mỗi dòng
- CK1 nên: `Tổng đơn × CK1%` → Chia đều hoặc áp dụng vào tổng

---

### 3. Không có logic tính lại tổng đơn sau CK1

**So sánh với CK2**:
- CK2: Có hàm `recalculateOrderTotals()` (dòng 649-701) để tính lại tổng sau khi update SODs
- CK1: **KHÔNG có** logic tương tự

**Code CK2**:
```typescript
if (updatedSodCount > 0) {
  await recalculateOrderTotals(soId, headers);
}
```

**Code CK1**:
```typescript
// Không có gì cả ❌
```

---

### 4. Frontend phải tự tính CK1

**Hiện trạng**:
- Frontend phải fetch `Orders x Promotion` để biết có CK1 nào
- Frontend phải tự tính tổng đơn sau CK1
- Không có API trả về tổng đơn đã áp dụng CK1

---

## 💡 Đề xuất cải thiện

### 1. Thêm logic tính lại tổng đơn cho CK1

**Trong `apply-promotion-order.ts`**, sau khi tạo Orders x Promotion cho CK1:

```typescript
// Sau khi tạo Orders x Promotion cho CK1
if (!effectiveChietKhau2 && !isSpecialPromotion) {
  try {
    // Fetch tổng đơn hiện tại
    const soEndpoint = `${BASE_URL}${SALE_ORDERS_TABLE}(${soId})?$select=crdfd_tongtien,crdfd_tongtientruocthue,crdfd_tienthue`;
    const soResp = await axios.get(soEndpoint, { headers });
    const currentTotal = Number(soResp.data.crdfd_tongtien) || 0;
    
    // Tính CK1
    let discountAmount = 0;
    if (loai === "%") {
      discountAmount = currentTotal * chietKhau2ValueToStore;
    } else {
      discountAmount = chietKhau2ValueToStore;
    }
    
    // Tính lại tổng
    const newTotal = Math.max(0, currentTotal - discountAmount);
    const newSubtotal = Math.round(newTotal / (1 + (vatPercent || 0) / 100));
    const newVat = newTotal - newSubtotal;
    
    // Update SO header
    await axios.patch(
      `${BASE_URL}${SALE_ORDERS_TABLE}(${soId})`,
      {
        crdfd_tongtien: Math.round(newTotal),
        crdfd_tongtientruocthue: Math.round(newSubtotal),
        crdfd_tienthue: Math.round(newVat),
        // Có thể thêm field crdfd_chietkhau1 để lưu giá trị CK1
      },
      { headers }
    );
  } catch (err) {
    console.warn('[ApplyPromotion] Failed to recalculate totals for CK1:', err);
  }
}
```

---

### 2. Lưu giá trị CK1 vào SO header

**Thêm field mới** (nếu chưa có):
- `crdfd_chietkhau1`: Giá trị CK1 (số hoặc %)
- `crdfd_loaichietkhau1`: "VNĐ" hoặc "%"

**Hoặc sử dụng field hiện có**:
- `crdfd_chietkhau2` trên SO header (nếu có) → đổi tên logic thành `crdfd_chietkhau` (dùng cho cả CK1 và CK2)

---

### 3. Tạo hàm `recalculateOrderTotalsForCK1()`

**Tương tự `recalculateOrderTotals()` cho CK2**:

```typescript
async function recalculateOrderTotalsForCK1(
  soId: string,
  promotionValue: number,
  vndOrPercent: string,
  headers: Record<string, string>
) {
  try {
    // Fetch SO hiện tại
    const soEndpoint = `${BASE_URL}${SALE_ORDERS_TABLE}(${soId})?$select=crdfd_tongtien,crdfd_tongtientruocthue,crdfd_tienthue`;
    const soResp = await axios.get(soEndpoint, { headers });
    const currentTotal = Number(soResp.data.crdfd_tongtien) || 0;
    const currentSubtotal = Number(soResp.data.crdfd_tongtientruocthue) || 0;
    const currentVat = Number(soResp.data.crdfd_tienthue) || 0;
    
    // Fetch tất cả Orders x Promotion (CK1) của SO này
    const opQuery = `$filter=_crdfd_so_value eq ${soId} and crdfd_type eq 'Order' and statecode eq 0&$select=crdfd_chieckhau2,crdfd_loai`;
    const opEndpoint = `${BASE_URL}${ORDERS_X_PROMOTION_TABLE}?${opQuery}`;
    const opResp = await axios.get(opEndpoint, { headers });
    const ck1Promotions = opResp.data.value || [];
    
    // Tính tổng CK1
    let totalCK1Discount = 0;
    for (const promo of ck1Promotions) {
      const value = Number(promo.crdfd_chieckhau2) || 0;
      const loai = promo.crdfd_loai || 'Phần trăm';
      if (loai === 'Phần trăm') {
        totalCK1Discount += currentTotal * value;
      } else {
        totalCK1Discount += value;
      }
    }
    
    // Tính lại tổng
    const newTotal = Math.max(0, currentTotal - totalCK1Discount);
    // Tính lại subtotal và VAT tỷ lệ
    const ratio = currentTotal > 0 ? newTotal / currentTotal : 1;
    const newSubtotal = Math.round(currentSubtotal * ratio);
    const newVat = Math.round(currentVat * ratio);
    
    // Update SO
    await axios.patch(
      `${BASE_URL}${SALE_ORDERS_TABLE}(${soId})`,
      {
        crdfd_tongtien: Math.round(newTotal),
        crdfd_tongtientruocthue: newSubtotal,
        crdfd_tienthue: newVat,
      },
      { headers }
    );
  } catch (error) {
    console.error("Error recalculating order totals for CK1:", error);
    throw error;
  }
}
```

---

### 4. Sửa logic CK1 ở ProductEntryForm

**Hiện tại**: Tính CK1 cho từng dòng
**Đề xuất**: 
- Bỏ tính CK1 ở line-level
- Chỉ tính CK1 ở order-level (trong SalesOrderForm hoặc sau khi apply promotion order)

---

## 📊 So sánh CK1 vs CK2

| Khía cạnh | CK1 | CK2 |
|-----------|-----|-----|
| **Áp dụng** | Toàn bộ đơn hàng | Từng dòng sản phẩm |
| **Filter** | Không cần | Bắt buộc có productCodes/groupCodes |
| **Update SODs** | ❌ Không | ✅ Có (crdfd_chieckhau2, crdfd_giack2) |
| **Tính lại tổng** | ❌ Không | ✅ Có (recalculateOrderTotals) |
| **Lưu vào SO header** | ❌ Không | ⚠️ Không (nhưng có trong SODs) |
| **Orders x Promotion** | ✅ Có | ✅ Có |

---

## ✅ Checklist cần làm

- [ ] Thêm logic tính lại tổng đơn cho CK1 trong `apply-promotion-order.ts`
- [ ] Tạo hàm `recalculateOrderTotalsForCK1()` tương tự CK2
- [ ] Lưu giá trị CK1 vào SO header (field mới hoặc field hiện có)
- [ ] Sửa logic CK1 ở `ProductEntryForm` (bỏ line-level, chỉ order-level)
- [ ] Test với nhiều CK1 cùng lúc (tổng hợp)
- [ ] Test với CK1 + CK2 cùng lúc
- [ ] Cập nhật documentation

---

## 🔍 Files cần review/sửa

1. `pages/api/admin-app/apply-promotion-order.ts` - Thêm logic CK1
2. `src/app/admin-app/_components/ProductEntryForm.tsx` - Sửa logic CK1
3. `src/app/admin-app/_components/SalesOrderForm.tsx` - Review logic apply CK1
4. `docs/PROMOTION_SYSTEM.md` - Cập nhật documentation

---

## 📝 Kết luận

**Luồng CK1 hiện tại có vấn đề nghiêm trọng**:
- CK1 không được tính vào tổng đơn hàng trong CRM
- CK1 chỉ tồn tại trong `Orders x Promotion`, không có tác động thực tế đến tổng đơn
- Frontend phải tự tính toán CK1, dễ dẫn đến inconsistency

**Cần sửa ngay**:
1. Thêm logic tính lại tổng đơn cho CK1
2. Lưu giá trị CK1 vào SO header
3. Đảm bảo single source of truth cho tổng đơn sau CK1

---

## ✅ Đã áp dụng cải thiện

### SO (Sales Order)
- ✅ Đã thêm logic tính lại tổng đơn cho CK1 trong `apply-promotion-order.ts`
- ✅ Đã tạo hàm `recalculateOrderTotalsForCK1()` (cần implement)

### SOBG (SO Báo Giá)
- ✅ Đã thêm logic tính lại tổng đơn cho CK1 trong `apply-sobg-promotion-order.ts`
- ✅ Đã tạo hàm `recalculateSOBGTotalsForCK1()` với logic:
  - Fetch tổng đơn hiện tại từ SOBG header hoặc tính từ SODs
  - Fetch tất cả Orders x Promotion (CK1) của SOBG
  - Tính tổng CK1 từ tất cả promotion records (fetch từ CRM)
  - Tính lại `crdfd_tongtien` và `crdfd_tongtienkhongvat`
  - Update SOBG header với tổng mới

**Lưu ý SOBG**:
- SOBG Orders x Promotion không có field `crdfd_chieckhau2` để lưu giá trị
- Cần fetch từ promotion records (`crdfd_promotions`) để lấy `crdfd_value` và `crdfd_vn`
- Hỗ trợ nhiều CK1 cùng lúc (tính tổng tất cả)
