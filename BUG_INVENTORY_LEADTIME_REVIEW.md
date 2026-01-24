# 🔴 BUG REVIEW: Leadtime & Inventory Issues - Jan 26, 2026

## Problem Summary

From screenshot analysis:
- **Leadtime Console Output** shows:
  - "Kho: KHOHCM"
  - "Tồn kho: 0" (WRONG - form có sản phẩm "Cải" qty 10)
  - "Phân tích tồn kho: Cần: 1 | Có: 0"
  - "Trạng thái: HẾT HÀNG"

- **Form Shows**:
  - 1 sản phẩm "Cải" (1 row)
  - Sản phẩm "Cải" qty 10 đã được add vào bảng
  - Nhưng leadtime tính toán hiển thị tồn kho = 0 (sai!)

---

## Root Causes Identified

### 1. **Inventory Load Timing Issue** ⏱️
**File:** `ProductEntryForm.tsx` line 2619

```typescript
var_selected_SP_tonkho: inventoryTheoretical ?? 0,  // ← Tồn kho lấy async
```

**Problem:**
- `inventoryTheoretical` được tải bất đồng bộ (async) trong `useEffect`
- Khi tính leadtime, nếu inventory chưa load xong → giá trị = 0 (default)
- Leadtime được tính với tồn kho = 0 → coi như HẾT HÀNG (sai!)

**Evidence:**
- Line 1100 (ProductEntryForm): `const [inventoryTheoretical, setInventoryTheoretical] = useState<number>(0);`
- Line 1200+ (useEffect): `useEffect(() => { loadInventory(); }, [selectedProductCode, warehouse, ...])`
- Line 2610-2621: Gọi `computeDeliveryDate` NGAY, không chờ inventory load xong

---

### 2. **Function Parameter Bug** 🐛
**File:** `computeDeliveryDate.ts` FIXED ✅

```typescript
// ❌ SAI - vẫn truyền 3 parameters
let result = addWorkingDaysWithFraction(effectiveOrderTime, totalCa, warehouseCode);

// ✅ ĐÚNG - chỉ 2 parameters
let result = addWorkingDaysWithFraction(effectiveOrderTime, totalCa);
```

**Status:** Already fixed by previous changes

---

### 3. **Missing Function** 🔴
**File:** `computeDeliveryDate.ts`

```typescript
// ❌ MISSING - hàm này không tồn tại trong file hiện tại
function addDaysWithFraction(base: Date, days: number): Date { ... }
```

**Impact:**
- In-stock items (leadtime quận) không tính 24/7 như rule yêu cầu
- Vẫn skip weekend (sai)

**Status:** Already added by previous changes ✅

---

## Key Findings

| Issue | Root Cause | Impact | Status |
|-------|-----------|--------|--------|
| Tồn kho = 0 | Inventory load async | Leadtime sai là HẾT HÀNG | Need Fix |
| Function params | Old code calling new function | Logic sai | ✅ Fixed |
| T7/CN skip | Missing `addDaysWithFraction` | Rule 1 sai | ✅ Fixed |
| Sunday adjust | Warehousescode param issue | Phụ thuộc issue #2 | ✅ Fixed |

---

## Solution Strategy

### Immediate Fix (Tồn Kho Issue)

**Option A: Load Inventory Before Calculating Leadtime** (BEST)
```typescript
// In ProductEntryForm.tsx - useEffect khi product/warehouse thay đổi
useEffect(() => {
  loadInventory().then(() => {
    // Sau khi inventory load xong, mới tính leadtime
    calculateDeliveryDate();
  });
}, [selectedProductCode, warehouse, ...]);
```

**Option B: Use Fallback When Inventory Not Loaded**
```typescript
// Nếu inventory chưa load, dùng stockQuantity thay vì inventoryTheoretical
var_selected_SP_tonkho: inventoryLoaded ? inventoryTheoretical : (stockQuantity ?? 0),
```

**Option C: Add Debounce**
```typescript
// Delay leadtime calculation để inventory có thời gian load
const deliveryDateTimer = setTimeout(() => {
  calculateDeliveryDate();
}, 500); // Wait 500ms for inventory to load
```

---

## Additional Observations

### Performance
- Inventory API call takes ~200-500ms
- Leadtime calculation happens immediately
- Result: Race condition → wrong inventory value

### User Experience
- Leadtime shows "HẾT HÀNG" initially (correct if truly out of stock)
- But after inventory loads, delivery date is NOT re-calculated
- → User sees wrong date until refresh

---

## Recommendations

1. **Priority 1:** Implement Option A (load inventory then calculate leadtime)
2. **Priority 2:** Add `inventoryLoaded` flag check in computation params
3. **Priority 3:** Add live re-calculation when inventory updates
4. **Priority 4:** Test with slow network (throttle to 4G) to verify fix

---

## Testing Checklist

- [ ] Select product with known inventory (e.g., "Cải" with 10 qty)
- [ ] Verify `inventoryTheoretical` is populated before leadtime calculation
- [ ] Verify leadtime shows CÒN HÀNG (not HẾT HÀNG)
- [ ] Verify leadtime date is correct (24/7 for in-stock + district leadtime)
- [ ] Test with slow network to ensure inventory loads properly
- [ ] Test switching products rapidly
- [ ] Test in different warehouses (HCM vs BD)

