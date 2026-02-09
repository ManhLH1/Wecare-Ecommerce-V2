# Review Luồng Promotion Chiết Khấu Tổng Tiền Áp Dụng

## 📋 Tổng Quan

Luồng promotion chiết khấu tổng tiền (`tongTienApDung`) cho phép áp dụng mức giảm giá khác nhau dựa trên tổng giá trị các sản phẩm trong danh sách `productCodes`.

**Logic chính:**
- Nếu tổng giá trị sản phẩm trong `productCodes` >= `tongTienApDung` → áp dụng `value2`
- Nếu < `tongTienApDung` → áp dụng `value` (mức 1)

---

## 🔍 Phân Tích Chi Tiết

### 1. **Các File Xử Lý Logic**

#### ✅ `src/utils/promotionUtils.ts` - Logic Core (Tốt)

```72:79:src/utils/promotionUtils.ts
export const calculateCartTotalByProductCodes = (
  cartItems: CartItem[],
  productCodes: string[]
): number => {
  return cartItems
    .filter(item => productCodes.includes(item.productId))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);
};
```

**Điểm mạnh:**
- Logic rõ ràng, dễ hiểu
- Tái sử dụng được ở nhiều nơi
- Type-safe với TypeScript

**Vấn đề:**
- ⚠️ **Không xử lý giá đã discount**: Tính tổng dựa trên `item.price` (giá gốc), không phải giá sau discount
- ⚠️ **Không có validation**: Không kiểm tra `productCodes` rỗng hoặc `cartItems` null

#### ⚠️ `src/app/product-list/_components/cart/cartUtils.ts` - Logic Cart (Có vấn đề)

```148:191:src/app/product-list/_components/cart/cartUtils.ts
  // --- BẮT ĐẦU: Logic tongTienApDung ---
  if (item.promotion.tongTienApDung && item.promotion.productCodes && allItems) {
    // Chuyển đổi productCodes thành mảng
    const codes = Array.isArray(item.promotion.productCodes)
      ? item.promotion.productCodes
      : (item.promotion.productCodes || '').split(',').map(c => c.trim());

    // Tính tổng giá trị của tất cả sản phẩm thuộc danh sách codes
    const totalProductValue = allItems
      .filter(cartItem => {
        const itemId = cartItem.productId || cartItem.crdfd_masanpham;
        return itemId && codes.includes(itemId);
      })
      .reduce((sum, cartItem) => {
        const price = parseFloat(cartItem.regularPrice || cartItem.cr1bb_giaban || "0");
        return sum + (price * (cartItem.quantity || 1));
      }, 0);

    // Chuyển đổi tongTienApDung sang số
    const tongTienApDungNum = parseFloat(String(item.promotion.tongTienApDung));

    // Xác định mức giảm giá dựa vào tổng tiền
    let promotionValue;
    if (totalProductValue <= tongTienApDungNum) {
      promotionValue = parseFloat(String(item.promotion.value));
    } else {
      promotionValue = parseFloat(String(item.promotion.value2));
    }

    // Tính giá sau khuyến mãi
    let discountedPrice;
    if (item.promotion.vn === 191920000) { // Giảm theo %
      discountedPrice = originalPrice * (1 - promotionValue / 100);
    } else { // Giảm theo số tiền
      discountedPrice = originalPrice - promotionValue;
    }

    // Cập nhật thông tin khuyến mãi
    item.promotion.isValue2Applied = totalProductValue > tongTienApDungNum;
    item.promotion.isValue3Applied = false;
    item.promotion.appliedValue = promotionValue.toString();

    return Math.max(0, Math.round(discountedPrice));
  }
```

**Vấn đề nghiêm trọng:**

1. ❌ **Logic so sánh SAI**: 
   - Dòng 171: `if (totalProductValue <= tongTienApDungNum)` → áp dụng `value` (mức 1)
   - Dòng 186: `isValue2Applied = totalProductValue > tongTienApDungNum` → đúng
   - **Mâu thuẫn**: Nếu `totalProductValue === tongTienApDungNum` thì áp dụng `value` nhưng `isValue2Applied = false` (đúng), nhưng nếu `totalProductValue > tongTienApDungNum` thì áp dụng `value2` và `isValue2Applied = true` → **Logic này đúng nhưng dễ gây nhầm lẫn**

2. ⚠️ **Không xử lý giá đã discount**: Tính tổng dựa trên `regularPrice` hoặc `cr1bb_giaban` (giá gốc), không phải giá sau discount của các item khác

3. ⚠️ **Mutate object**: Dòng 186-188 mutate trực tiếp `item.promotion` → có thể gây side effect

#### ✅ `src/utils/promotionUtils.ts` - calculatePromotionPrice (Tốt hơn)

```174:184:src/utils/promotionUtils.ts
  // Trường hợp có điều kiện tổng tiền (tongTienApDung)
  const totalProductValue = calculateCartTotalByProductCodes(cartItems, promotion.productCodes);
  const isValue2Applied = totalProductValue >= promotion.tongTienApDung;
  const promotionValue = isValue2Applied ? (promotion.value2 || promotion.value) : promotion.value;

  return {
    finalPrice: applyPromotionValue(basePrice, promotionValue, promotion.vn),
    isValue2Applied,
    isValue3Applied: false,
    appliedValue: promotionValue
  };
```

**Điểm mạnh:**
- Logic rõ ràng: `>=` để áp dụng value2
- Không mutate object
- Return object rõ ràng

**Vấn đề:**
- ⚠️ **Fallback `value2 || promotion.value`**: Nếu `value2` không có, fallback về `value` → có thể không đúng ý định

#### ⚠️ `src/app/admin-app/_components/ProductEntryForm.tsx` - Admin Form (Có vấn đề)

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

**Vấn đề:**

1. ❌ **Logic khác với cart**: 
   - Admin form: Kiểm tra `totalAmountCondition` của **toàn bộ đơn hàng** (`orderTotal`)
   - Cart: Kiểm tra tổng giá trị của **các sản phẩm trong `productCodes`**
   - **Không nhất quán**: Admin form dùng `totalAmountCondition` (điều kiện tổng đơn), cart dùng `tongTienApDung` (điều kiện tổng sản phẩm trong danh sách)

2. ⚠️ **Tên field khác nhau**: 
   - Admin: `totalAmountCondition`
   - Cart/Product: `tongTienApDung`
   - API: `cr1bb_tongtienapdung`
   - **Cần chuẩn hóa**

---

## 🐛 Các Vấn Đề Chính

### 1. **Inconsistency giữa Admin và Cart**

| Aspect | Admin Form | Cart Utils |
|--------|------------|------------|
| **Field name** | `totalAmountCondition` | `tongTienApDung` |
| **Scope** | Tổng toàn bộ đơn hàng | Tổng sản phẩm trong `productCodes` |
| **Logic** | `estimatedOrderTotal >= minTotalCondition` | `totalProductValue >= tongTienApDung` |
| **Kết quả** | Áp dụng/không áp dụng promotion | Áp dụng `value` hoặc `value2` |

**Vấn đề:** Hai logic này khác nhau hoàn toàn:
- Admin form: Kiểm tra điều kiện để **có được áp dụng promotion hay không**
- Cart: Kiểm tra điều kiện để **chọn mức giảm giá (value vs value2)**

### 2. **Logic So Sánh Không Nhất Quán**

- `cartUtils.ts`: `totalProductValue <= tongTienApDungNum` → `value` (dòng 171)
- `promotionUtils.ts`: `totalProductValue >= promotion.tongTienApDung` → `value2` (dòng 176)

**Cả hai đều đúng nhưng dễ gây nhầm lẫn khi đọc code.**

### 3. **Tính Tổng Giá Trị Không Xét Discount**

Cả `cartUtils.ts` và `promotionUtils.ts` đều tính tổng dựa trên **giá gốc**, không phải giá sau discount:

```typescript
// cartUtils.ts - dòng 162
const price = parseFloat(cartItem.regularPrice || cartItem.cr1bb_giaban || "0");

// promotionUtils.ts - dòng 78
.reduce((sum, item) => sum + (item.price * item.quantity), 0);
```

**Câu hỏi:** Có nên tính tổng dựa trên giá sau discount không? (Tùy business logic)

### 4. **Thiếu Validation**

- Không kiểm tra `productCodes` rỗng
- Không kiểm tra `tongTienApDung` hợp lệ (>= 0)
- Không kiểm tra `value2` có tồn tại khi `isValue2Applied = true`

### 5. **Mutate Object Trong cartUtils.ts**

```typescript
// Dòng 186-188
item.promotion.isValue2Applied = totalProductValue > tongTienApDungNum;
item.promotion.isValue3Applied = false;
item.promotion.appliedValue = promotionValue.toString();
```

**Vấn đề:** Mutate trực tiếp có thể gây side effect, khó debug.

---

## ✅ Điểm Mạnh

1. **Tách logic rõ ràng**: `promotionUtils.ts` có các hàm utility tái sử dụng được
2. **Type-safe**: Sử dụng TypeScript interface
3. **Xử lý nhiều format**: Parse `productCodes` từ string hoặc array
4. **Fallback logic**: Có xử lý khi `value2` không có

---

## 🔧 Đề Xuất Cải Thiện

### 1. **Chuẩn Hóa Tên Field**

```typescript
// Thống nhất dùng một tên
interface Promotion {
  tongTienApDung?: number | string; // Tên chính
  // Alias cho backward compatibility
  totalAmountCondition?: number | string; // Map từ API
  cr1bb_tongtienapdung?: number | string; // Map từ CRM
}
```

### 2. **Tách Logic Admin vs Cart**

**Admin Form** (`totalAmountCondition`):
- Điều kiện để **áp dụng promotion** (có/không)
- Scope: Tổng toàn bộ đơn hàng

**Cart/Product** (`tongTienApDung`):
- Điều kiện để **chọn mức giảm giá** (value vs value2)
- Scope: Tổng sản phẩm trong `productCodes`

**Giải pháp:** Tách thành 2 hàm riêng:
```typescript
// Kiểm tra điều kiện áp dụng promotion (Admin)
function checkPromotionEligibility(
  promotion: Promotion,
  orderTotal: number
): boolean

// Tính mức giảm giá dựa trên tổng tiền (Cart)
function calculatePromotionLevelByTotal(
  promotion: Promotion,
  cartItems: CartItem[]
): { level: 1 | 2; value: number }
```

### 3. **Sửa Logic So Sánh**

```typescript
// Thống nhất: >= để áp dụng value2
const isValue2Applied = totalProductValue >= promotion.tongTienApDung;
const promotionValue = isValue2Applied 
  ? (promotion.value2 ?? promotion.value) 
  : promotion.value;
```

### 4. **Thêm Validation**

```typescript
function validatePromotionForTotalAmount(
  promotion: Promotion
): { valid: boolean; error?: string } {
  if (!promotion.tongTienApDung) {
    return { valid: true }; // Không có điều kiện tổng tiền
  }
  
  const threshold = parsePromotionValue(promotion.tongTienApDung);
  if (threshold < 0) {
    return { valid: false, error: 'tongTienApDung phải >= 0' };
  }
  
  if (!promotion.productCodes || promotion.productCodes.length === 0) {
    return { valid: false, error: 'productCodes không được rỗng khi có tongTienApDung' };
  }
  
  if (threshold > 0 && !promotion.value2) {
    console.warn('Promotion có tongTienApDung nhưng không có value2');
  }
  
  return { valid: true };
}
```

### 5. **Tránh Mutate Object**

```typescript
// Thay vì mutate
item.promotion.isValue2Applied = ...;

// Nên return object mới
return {
  ...item,
  promotion: {
    ...item.promotion,
    isValue2Applied: ...,
    appliedValue: ...
  }
};
```

### 6. **Tài Liệu Hóa Logic**

Thêm JSDoc rõ ràng:

```typescript
/**
 * Tính mức giảm giá dựa trên điều kiện tổng tiền
 * 
 * Logic:
 * - Nếu tổng giá trị sản phẩm trong productCodes >= tongTienApDung → áp dụng value2
 * - Nếu < tongTienApDung → áp dụng value
 * 
 * @param promotion - Promotion có tongTienApDung và productCodes
 * @param cartItems - Danh sách sản phẩm trong giỏ hàng
 * @returns Mức giảm giá (1 hoặc 2) và giá trị tương ứng
 */
```

### 7. **Unit Tests**

Cần test các trường hợp:
- `totalProductValue < tongTienApDung` → `value`
- `totalProductValue === tongTienApDung` → `value2`
- `totalProductValue > tongTienApDung` → `value2`
- `value2` không có → fallback về `value`
- `productCodes` rỗng → không áp dụng logic tổng tiền

---

## 📊 Tóm Tắt

| Vấn đề | Mức độ | File ảnh hưởng |
|--------|--------|----------------|
| Inconsistency Admin vs Cart | 🔴 Cao | `ProductEntryForm.tsx`, `cartUtils.ts` |
| Logic so sánh không nhất quán | 🟡 Trung bình | `cartUtils.ts`, `promotionUtils.ts` |
| Tính tổng không xét discount | 🟡 Trung bình | `cartUtils.ts`, `promotionUtils.ts` |
| Thiếu validation | 🟡 Trung bình | Tất cả |
| Mutate object | 🟢 Thấp | `cartUtils.ts` |

---

## 🎯 Kế Hoạch Hành Động

1. **Ngắn hạn (1-2 ngày)**:
   - Sửa logic so sánh trong `cartUtils.ts` cho nhất quán
   - Thêm validation cơ bản
   - Tránh mutate object

2. **Trung hạn (1 tuần)**:
   - Tách logic Admin vs Cart
   - Chuẩn hóa tên field
   - Thêm unit tests

3. **Dài hạn (2 tuần)**:
   - Refactor toàn bộ logic vào `promotionUtils.ts`
   - Tài liệu hóa đầy đủ
   - Review với team về business logic (tính tổng có xét discount không)

---

**Người review:** Auto (AI Assistant)  
**Ngày review:** 2025-01-XX  
**Version:** 1.0
