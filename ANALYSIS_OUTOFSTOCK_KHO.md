# 🔍 PHÂN TÍCH: Logic Out-of-Stock theo Kho

## Current Implementation Analysis

### Kho HCM (KHOHCM)
```typescript
isOutOfStock = theoreticalStock <= 0
```

| Scenario | theoreticalStock | requestedQty | isOutOfStock | Status |
|----------|------------------|--------------|--------------|--------|
| Đơn 100 cái, tồn 50 | 50 | 100 | FALSE | ❓ CÒN HÀNG - NHƯNG THIẾU! |
| Đơn 100 cái, tồn 0 | 0 | 100 | TRUE | HẾT HÀNG ✅ |
| Đơn 100 cái, tồn -10 | -10 | 100 | TRUE | HẾT HÀNG ✅ |

**Issue:** Kho HCM chỉ check `tồn ≤ 0`, không check `nhu cầu > tồn`
→ **Có thể cho đơn hàng cùng lúc nhiều SO vượt tồn kho thực**

---

### Kho Bình Định (KHOBD)
```typescript
isOutOfStock = bdStock <= 0 || (requestedQty - bdStock) > 0
```

| Scenario | theoreticalStock | requestedQty | isOutOfStock | Status |
|----------|------------------|--------------|--------------|--------|
| Đơn 100 cái, tồn 50 | 50 | 100 | TRUE | HẾT (100-50=50 > 0) ✅ |
| Đơn 100 cái, tồn 100 | 100 | 100 | FALSE | CÒN (100-100=0, không > 0) ✅ |
| Đơn 100 cái, tồn 150 | 150 | 100 | FALSE | CÒN (100-150=-50, không > 0) ✅ |

**Logic:** Check cả 2:
1. `bdStock <= 0` → Tồn kho âm/không
2. `(requestedQty - bdStock) > 0` → Nhu cầu vượt tồn

---

### Kho Khác
```typescript
isOutOfStock = requestedQty > theoreticalStock
```

| Scenario | theoreticalStock | requestedQty | isOutOfStock | Status |
|----------|------------------|--------------|--------------|--------|
| Đơn 100, tồn 50 | 50 | 100 | TRUE | HẾT (100 > 50) ✅ |
| Đơn 100, tồn 100 | 100 | 100 | FALSE | CÒN (100 > 100? NO) ✅ |

---

## 🔴 THE BUG: Kho HCM Logic Quá Lỏng Lẻo

Kho HCM không check `requestedQty > theoreticalStock`!

### Scenario Từ Screenshot
- **Đơn hàng:** Sản phẩm "Cải", qty = 10
- **Tồn kho lý thuyết:** Giả sử = 5 (không đủ)
- **Conversion:** 1

Calculation:
```typescript
requestedQty = 10 * 1 = 10
theoreticalStock = 5
warehouseCode = 'KHOHCM'

// Current (SAI)
isOutOfStock = (5 <= 0) ? TRUE : FALSE
            = FALSE  // ← CÒN HÀNG (SAI! Vì 10 > 5)

// Correct (CẦN FIX)
isOutOfStock = (10 > 5) ? TRUE : FALSE
            = TRUE  // ← HẾT HÀNG (ĐÚNG)
```

---

## Rule Definition Analysis

### Từ Rule User Cung Cấp:
```
├─ 2) Rule + leadtime cho hàng thiếu tồn kho
│  ├─ Kho HCM
│  │   ├─ Hàng bình thường  → +2 ca
│  │   └─ Hàng chạy chương trình promotion...   → +6 ca
│  │
│  └─ Kho Bình Định
│      ├─ Hàng bình thường  → +4 ca
│      └─ Hàng chạy chương trình promotion...   → +6 ca
```

**Không rõ:** "hàng thiếu tồn kho" định nghĩa như thế nào?

Có 2 cách hiểu:

#### Cách 1: "Thiếu" = Tồn kho <= 0 (chỉ không có hàng)
```typescript
// Kho HCM
isOutOfStock = (theoreticalStock <= 0)  // Current implementation
```
→ Chỉ áp dụng khi kho hoàn toàn hết hàng

#### Cách 2: "Thiếu" = Nhu cầu > Tồn (không đủ cho đơn này)
```typescript
// Kho HCM - should be like KHOBD
isOutOfStock = (requestedQty > theoreticalStock)
```
→ Áp dụng khi đơn hàng yêu cầu nhiều hơn tồn kho (có thể là partial out-of-stock)

---

## Current vs Recommended

| Kho | Current | Recommended | Reason |
|-----|---------|-------------|--------|
| HCM | `tồn ≤ 0` | `nhu cầu > tồn` | Kiểm soát SO không vượt tồn |
| BD | `tồn ≤ 0` OR `nhu cầu > tồn` | Giữ nguyên | ✅ Chính xác |
| Khác | `nhu cầu > tồn` | Giữ nguyên | ✅ Chính xác |

---

## 🎯 PROPOSED FIX

### Option A: Align HCM with KHOBD Logic
```typescript
if (warehouseCode === 'KHOHCM') {
    // Check both: tồn kho âm AND nhu cầu vượt tồn
    isOutOfStock = theoreticalStock <= 0 || (requestedQty > theoreticalStock);
} else if (warehouseCode === 'KHOBD') {
    isOutOfStock = theoreticalStock <= 0 || (requestedQty - theoreticalStock) > 0;
} else {
    isOutOfStock = requestedQty > theoreticalStock;
}
```

**Benefit:** Kiểm soát ketat hơn, không cho SO vượt tồn

---

### Option B: Specific to HCM (Stricter)
```typescript
if (warehouseCode === 'KHOHCM') {
    // Strict: chỉ cho phép SO nếu nhu cầu ≤ tồn kho
    isOutOfStock = requestedQty > theoreticalStock;
} else if (warehouseCode === 'KHOBD') {
    // Current KHOBD logic
    isOutOfStock = theoreticalStock <= 0 || (requestedQty - theoreticalStock) > 0;
}
```

**Benefit:** Rõ ràng, dễ hiểu, strict control

---

### Option C: Keep Current + Fix Inventory Loading
```typescript
// Keep current logic
isOutOfStock = theoreticalStock <= 0;

// But FIX: Ensure inventory is loaded BEFORE calculating leadtime
// This way, theoreticalStock will be correct, not 0 by default
```

**Benefit:** Minimal code change, fix root cause (async loading issue)

---

## 📌 RECOMMENDATION

**Combine Option B + Option C:**

1. **Fix the logic** (Option B):
   - Kho HCM: Check `requestedQty > theoreticalStock` (not just `<= 0`)
   - Align with KHOBD logic for consistency

2. **Fix the timing** (Option C):
   - Ensure inventory loads BEFORE leadtime calculation
   - This fixes screenshot issue where `theoreticalStock = 0`

**Result:**
- Leadtime calculation uses correct inventory
- Out-of-stock detection is accurate
- No accidental SO overselling

