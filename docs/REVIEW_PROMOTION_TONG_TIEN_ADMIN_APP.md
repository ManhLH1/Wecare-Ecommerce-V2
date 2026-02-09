# Review Luồng Promotion Theo Tổng Tiền Áp Dụng - Admin App

## 📋 Tổng Quan

Luồng promotion theo tổng tiền (`totalAmountCondition` / `cr1bb_tongtienapdung`) trong admin-app kiểm tra điều kiện tổng giá trị đơn hàng trước khi áp dụng promotion cho sản phẩm.

**Logic chính:**
- Promotion chỉ được áp dụng khi tổng giá trị đơn hàng >= `totalAmountCondition`
- Nếu không đủ điều kiện → không áp dụng promotion (giữ giá gốc)
- Tổng tiền được tính từ **BASE PRICE** (giá gốc), không phải giá sau discount

---

## 🔍 Phân Tích Chi Tiết Luồng

### 1. **Backend API - Filter Promotions**

#### ✅ `pages/api/admin-app/promotion-orders.ts` - Filter ở Backend

```435:447:pages/api/admin-app/promotion-orders.ts
  // Total amount filter
  // Promotion chỉ được áp dụng khi:
  // - Không có điều kiện tổng tiền (cr1bb_tongtienapdung eq null), HOẶC
  // - Tổng tiền đơn >= điều kiện tối thiểu (amount >= cr1bb_tongtienapdung)
  // Nếu amount < cr1bb_tongtienapdung thì promotion KHÔNG được áp dụng
  if (totalAmount && typeof totalAmount === "string") {
    const amount = parseFloat(totalAmount);
    if (!isNaN(amount) && amount > 0) {
      filters.push(
        `(cr1bb_tongtienapdung eq null or cr1bb_tongtienapdung le ${amount})`
      );
    }
  }
```

**Điểm mạnh:**
- ✅ Filter ở backend giảm tải cho frontend
- ✅ Logic rõ ràng: `cr1bb_tongtienapdung le ${amount}` (điều kiện <= tổng tiền)
- ✅ Xử lý null: promotion không có điều kiện vẫn được trả về

**Vấn đề:**
- ⚠️ Chỉ filter khi `totalAmount > 0`, nếu `totalAmount = 0` thì không filter → có thể trả về promotions không đủ điều kiện

#### ⚠️ `pages/api/admin-app/promotions.ts` - KHÔNG Filter ở Backend

API này **KHÔNG** filter theo `totalAmountCondition` ở backend, để frontend tự filter.

**Vấn đề:**
- ❌ **Inconsistency**: `promotion-orders.ts` có filter, `promotions.ts` không có
- ⚠️ Frontend phải tự filter → có thể fetch nhiều promotions không cần thiết

---

### 2. **Frontend - Thêm Sản Phẩm**

#### ✅ `src/app/admin-app/_components/ProductEntryForm.tsx` - Check Khi Thêm

```2360:2383:src/app/admin-app/_components/ProductEntryForm.tsx
            // KIỂM TRA ĐIỀU KIỆN TỔNG TIỀN (totalAmountCondition) TRƯỚC KHI ÁP DỤNG PROMOTION
            // Nếu promotion có điều kiện tổng tiền tối thiểu, chỉ áp dụng khi tổng đơn >= điều kiện
            // Tính estimatedOrderTotal tương tự SalesOrderForm: currentOrderTotal + newProductTotalEstimate
            const minTotalCondition = Number(sel.totalAmountCondition || 0) || 0;
            // Dùng orderTotal (tổng hiện tại) + totalAmount (sản phẩm đang thêm, CHƯA có discount)
            const estimatedOrderTotal = Number(orderTotal || 0) + Number(totalAmount || 0);
            const meetsTotalCondition = minTotalCondition === 0 || estimatedOrderTotal >= minTotalCondition;

            console.debug('[ProductEntryForm][PROMO DEBUG] Promotion condition check:', {
              promotionId: sel.id,
              promotionName: sel.name,
              totalAmountCondition: minTotalCondition,
              orderTotal: orderTotal,
              totalAmount: totalAmount,
              estimatedOrderTotal,
              meetsTotalCondition,
            });

            if (!meetsTotalCondition) {
              // Không đủ điều kiện tổng tiền -> không áp dụng promotion, để giá gốc
              computedDiscountPercent = 0;
              computedDiscountAmount = 0;
              console.debug('[ProductEntryForm][PROMO DEBUG] Condition NOT met, discount = 0');
            } else {
```

**Điểm mạnh:**
- ✅ Check điều kiện trước khi áp dụng promotion
- ✅ Tính `estimatedOrderTotal` = tổng hiện tại + sản phẩm mới (chưa có discount)
- ✅ Logic rõ ràng: `estimatedOrderTotal >= minTotalCondition`
- ✅ Debug log đầy đủ

**Vấn đề:**
- ⚠️ Dùng `Number(sel.totalAmountCondition || 0) || 0` → nếu `totalAmountCondition = 0` thì coi như không có điều kiện (có thể đúng hoặc sai tùy business logic)
- ⚠️ `totalAmount` là tổng của sản phẩm đang thêm, cần đảm bảo tính đúng (có VAT hay không?)

---

### 3. **Frontend - Recalculate Khi Thay Đổi Quantity**

#### ✅ `src/app/admin-app/_components/SalesOrderForm.tsx` - Recalculate

```116:126:src/app/admin-app/_components/SalesOrderForm.tsx
    // 3. Tính TỔNG TẤT CẢ items dùng BASE PRICE (giá gốc) để check điều kiện promotion
    // QUAN TRỌNG: Dùng price (giá gốc) để tính tổng, KHÔNG dùng discountedPrice
    // Vì điều kiện promotion (totalAmountCondition) áp dụng cho GIÁ TRỊ ĐƠN HÀNG GỐC,
    // sau đó mới tính discount cho từng item
    const totalOrderAmount = currentProducts.reduce((sum, item) => {
      // Dùng price (giá gốc), không phải discountedPrice
      const basePrice = item.price;
      const lineSubtotal = basePrice * (item.quantity || 0);
      const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
      return sum + lineSubtotal + lineVat;
    }, 0);
```

```193:205:src/app/admin-app/_components/SalesOrderForm.tsx
        // Filter promotions: percent-based và meets total condition
        const candidates = promotions.filter(p => {
          const isPercent = vndCodeEquals(p, 191920000);
          // Xử lý null/undefined/string "null" đúng cách
          // Dùng ?? thay vì || để handle string "null" (vì "" ?? 0 = "" ≠ 0)
          const rawCond = p.totalAmountCondition ?? null;
          // Chỉ convert sang number nếu là giá trị truthy, ngược lại coi như 0
          const minTotal = rawCond !== null ? Number(rawCond) : 0;
          // Nếu minTotal = 0 hoặc NaN → coi như không có điều kiện tối thiểu → luôn đáp ứng
          const meetsTotal = !minTotal || minTotal === 0 || isNaN(minTotal) || totalOrderAmount >= minTotal;

          return isPercent && meetsTotal;
        });
```

**Điểm mạnh:**
- ✅ Tính tổng từ BASE PRICE (giá gốc) + VAT → đúng logic
- ✅ Xử lý null/undefined đúng cách với `??`
- ✅ Filter promotions theo điều kiện tổng tiền
- ✅ Chỉ áp dụng cho percent-based promotions (`isPercent`)

**Vấn đề:**
- ⚠️ Logic `!minTotal || minTotal === 0 || isNaN(minTotal)` → nếu `minTotal = 0` thì coi như không có điều kiện
  - **Câu hỏi**: Nếu promotion có `totalAmountCondition = 0`, có nghĩa là "không có điều kiện" hay "phải >= 0"?
- ⚠️ Chỉ filter percent-based, không filter VND-based promotions

#### ✅ `src/app/admin-app/_components/ProductTable.tsx` - Tương Tự

Logic tương tự `SalesOrderForm.tsx`, có thêm debug log chi tiết hơn.

---

### 4. **Backend - Validate Khi Save**

#### ✅ `pages/api/admin-app/save-sale-order-details.ts` - Validate

```1754:1760:pages/api/admin-app/save-sale-order-details.ts
            // Validate total amount condition (if promotion requires minimum)
            const minTotalReq = Number(promoData?.cr1bb_tongtienapdung) || 0;
            if (minTotalReq > 0 && Number(orderTotal) < minTotalReq) {
              // Skip applying promotion for this product (do not fail the whole save)
              promotionApplicableForThisProduct = false;
              console.log(`[Save SOD] Skipping promotion ${promotionIdClean} for product ${product.productCode} due to min total (${minTotalReq})`);
            }
```

**Điểm mạnh:**
- ✅ Validate lại ở backend khi save → đảm bảo data integrity
- ✅ Không fail toàn bộ save, chỉ skip promotion cho sản phẩm đó
- ✅ Log rõ ràng khi skip

**Vấn đề:**
- ⚠️ Chỉ check `minTotalReq > 0` → nếu `minTotalReq = 0` thì không validate (có thể đúng hoặc sai)

---

## 🐛 Các Vấn Đề Chính

### 1. **Inconsistency Giữa Các API**

| API | Filter Backend | Filter Frontend |
|-----|----------------|-----------------|
| `promotion-orders.ts` | ✅ Có (`cr1bb_tongtienapdung le ${amount}`) | ❌ Không cần |
| `promotions.ts` | ❌ Không | ✅ Có (trong `recalculatePromotionEligibility`) |

**Vấn đề:**
- `promotion-orders.ts` filter ở backend → hiệu quả hơn
- `promotions.ts` không filter → frontend phải filter → có thể fetch nhiều promotions không cần thiết

**Đề xuất:** Thêm filter `totalAmount` vào `promotions.ts` để nhất quán.

---

### 2. **Xử Lý `totalAmountCondition = 0`**

Hiện tại có 2 cách xử lý:

**Cách 1:** Coi `0` = không có điều kiện
```typescript
const minTotal = rawCond !== null ? Number(rawCond) : 0;
const meetsTotal = !minTotal || minTotal === 0 || isNaN(minTotal) || totalOrderAmount >= minTotal;
```

**Cách 2:** Chỉ check khi `> 0`
```typescript
const minTotalReq = Number(promoData?.cr1bb_tongtienapdung) || 0;
if (minTotalReq > 0 && Number(orderTotal) < minTotalReq) {
  // Skip
}
```

**Vấn đề:** Không nhất quán, cần quyết định business logic:
- Nếu `totalAmountCondition = 0` → có nghĩa là "không có điều kiện" hay "phải >= 0"?

---

### 3. **Tính Tổng Tiền - BASE PRICE vs Discounted Price**

**Hiện tại:** Tất cả đều dùng BASE PRICE (giá gốc) để tính tổng.

```typescript
const basePrice = item.price; // Giá gốc
const lineSubtotal = basePrice * (item.quantity || 0);
const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
const totalOrderAmount = sum + lineSubtotal + lineVat;
```

**Điểm mạnh:**
- ✅ Nhất quán: tất cả đều dùng BASE PRICE
- ✅ Logic rõ ràng: điều kiện áp dụng cho giá trị đơn hàng gốc

**Câu hỏi:** Có cần tính tổng dựa trên giá sau discount không? (Tùy business logic)

---

### 4. **Chỉ Filter Percent-Based Promotions**

Trong `recalculatePromotionEligibility`, chỉ filter promotions percent-based:

```typescript
const isPercent = vndCodeEquals(p, 191920000);
const meetsTotal = ...;
return isPercent && meetsTotal;
```

**Vấn đề:**
- ⚠️ VND-based promotions (`vndOrPercent !== 191920000`) không được filter theo `totalAmountCondition`
- ⚠️ Có thể áp dụng VND-based promotion ngay cả khi không đủ điều kiện tổng tiền

**Đề xuất:** Filter cả VND-based promotions theo `totalAmountCondition`.

---

### 5. **Thiếu Validation**

- ❌ Không validate `totalAmountCondition` hợp lệ (>= 0)
- ❌ Không validate `orderTotal` hợp lệ (>= 0)
- ❌ Không validate `totalAmountCondition` có tồn tại khi promotion được chọn

---

## ✅ Điểm Mạnh

1. **Tính tổng nhất quán**: Tất cả đều dùng BASE PRICE (giá gốc) + VAT
2. **Validate nhiều lớp**: Frontend check khi thêm, backend validate khi save
3. **Debug log đầy đủ**: Có console.debug để trace logic
4. **Xử lý null/undefined**: Dùng `??` để handle đúng
5. **Không fail toàn bộ**: Khi không đủ điều kiện, chỉ skip promotion, không fail save

---

## 🔧 Đề Xuất Cải Thiện

### 1. **Thêm Filter `totalAmount` vào `promotions.ts`**

```typescript
// pages/api/admin-app/promotions.ts
if (totalAmount && typeof totalAmount === "string") {
  const amount = parseFloat(totalAmount);
  if (!isNaN(amount) && amount >= 0) { // Cho phép amount = 0
    filters.push(
      `(cr1bb_tongtienapdung eq null or cr1bb_tongtienapdung le ${amount})`
    );
  }
}
```

**Lợi ích:**
- Giảm số lượng promotions trả về
- Nhất quán với `promotion-orders.ts`
- Giảm tải cho frontend

---

### 2. **Chuẩn Hóa Xử Lý `totalAmountCondition = 0`**

Tạo helper function:

```typescript
/**
 * Kiểm tra promotion có đáp ứng điều kiện tổng tiền không
 * 
 * @param totalAmountCondition - Điều kiện tổng tiền (có thể null, undefined, 0, hoặc số > 0)
 * @param orderTotal - Tổng giá trị đơn hàng
 * @returns true nếu đáp ứng điều kiện, false nếu không
 * 
 * Logic:
 * - Nếu totalAmountCondition = null/undefined → không có điều kiện → luôn đáp ứng
 * - Nếu totalAmountCondition = 0 → không có điều kiện → luôn đáp ứng
 * - Nếu totalAmountCondition > 0 → orderTotal phải >= totalAmountCondition
 */
function meetsTotalAmountCondition(
  totalAmountCondition: number | string | null | undefined,
  orderTotal: number
): boolean {
  if (totalAmountCondition == null) return true; // null hoặc undefined
  
  const minTotal = Number(totalAmountCondition);
  if (isNaN(minTotal) || minTotal <= 0) return true; // 0 hoặc không hợp lệ → không có điều kiện
  
  return orderTotal >= minTotal;
}
```

**Sử dụng:**
```typescript
const meetsTotal = meetsTotalAmountCondition(p.totalAmountCondition, totalOrderAmount);
```

---

### 3. **Filter Cả VND-Based Promotions**

```typescript
// Filter promotions: cả percent và VND, và meets total condition
const candidates = promotions.filter(p => {
  const isPercent = vndCodeEquals(p, 191920000);
  const isVnd = !isPercent;
  const meetsTotal = meetsTotalAmountCondition(p.totalAmountCondition, totalOrderAmount);
  
  return (isPercent || isVnd) && meetsTotal;
});
```

---

### 4. **Thêm Validation**

```typescript
function validateTotalAmountCondition(
  totalAmountCondition: number | string | null | undefined
): { valid: boolean; error?: string } {
  if (totalAmountCondition == null) {
    return { valid: true }; // Không có điều kiện
  }
  
  const minTotal = Number(totalAmountCondition);
  if (isNaN(minTotal)) {
    return { valid: false, error: 'totalAmountCondition không hợp lệ (NaN)' };
  }
  
  if (minTotal < 0) {
    return { valid: false, error: 'totalAmountCondition phải >= 0' };
  }
  
  return { valid: true };
}
```

---

### 5. **Tài Liệu Hóa Logic**

Thêm JSDoc cho các hàm quan trọng:

```typescript
/**
 * Tính tổng giá trị đơn hàng từ BASE PRICE (giá gốc) để check điều kiện promotion
 * 
 * QUAN TRỌNG: Dùng price (giá gốc), KHÔNG dùng discountedPrice
 * Vì điều kiện promotion (totalAmountCondition) áp dụng cho GIÁ TRỊ ĐƠN HÀNG GỐC,
 * sau đó mới tính discount cho từng item
 * 
 * @param items - Danh sách sản phẩm trong đơn
 * @returns Tổng giá trị đơn hàng (BASE PRICE + VAT)
 */
function calculateOrderTotalFromBasePrice(items: ProductTableItem[]): number {
  // ...
}
```

---

## 📊 Tóm Tắt

| Vấn đề | Mức độ | File ảnh hưởng | Trạng thái |
|--------|--------|----------------|------------|
| Inconsistency giữa APIs | 🟡 Trung bình | `promotions.ts`, `promotion-orders.ts` | Cần fix |
| Xử lý `totalAmountCondition = 0` | 🟡 Trung bình | Tất cả | Cần chuẩn hóa |
| Chỉ filter percent-based | 🟡 Trung bình | `SalesOrderForm.tsx`, `ProductTable.tsx` | Cần fix |
| Thiếu validation | 🟢 Thấp | Tất cả | Nên thêm |
| Tính tổng từ BASE PRICE | ✅ OK | Tất cả | Đúng logic |

---

## 🎯 Kế Hoạch Hành Động

### Ngắn hạn (1-2 ngày)
1. ✅ Thêm filter `totalAmount` vào `promotions.ts`
2. ✅ Tạo helper function `meetsTotalAmountCondition()`
3. ✅ Filter cả VND-based promotions

### Trung hạn (1 tuần)
1. ✅ Thêm validation cho `totalAmountCondition`
2. ✅ Tài liệu hóa logic
3. ✅ Unit tests cho helper functions

### Dài hạn (2 tuần)
1. ✅ Review với team về business logic (`totalAmountCondition = 0`)
2. ✅ Refactor code để tái sử dụng logic
3. ✅ Performance optimization (cache, batch requests)

---

**Người review:** Auto (AI Assistant)  
**Ngày review:** 2025-01-27  
**Version:** 1.0  
**Scope:** Admin App - Promotion theo tổng tiền áp dụng
