# 🔧 FIX: Leadtime T7/CN Kho HCM - Chi Tiết Thay Đổi

## 📋 Tóm Tắt Vấn Đề

**Vấn đề:** Leadtime cho hàng **in-stock** ở kho HCM đang **skip T7/CN (weekend)**, nhưng theo rule mới 2025, nó phải **tính 24/7** (bao gồm T7/CN).

**Nguyên nhân:** Hàm `addWorkingDaysWithFraction` cũ áp dụng **skip weekend cho tất cả kho**, không phân biệt in-stock vs out-of-stock.

---

## ✅ Thay Đổi Được Thực Hiện

### 1. **Tách hàm tính leadtime**

#### Trước (SAI ❌):
```typescript
// Áp dụng skip weekend cho TẤT CẢ leadtime quận (sai)
function addWorkingDaysWithFraction(base, days, warehouseCode) {
    if (warehouseCode === 'KHOHCM') {
        // Skip weekend ← SAIT cho in-stock items
    }
}
```

#### Sau (ĐÚNG ✅):
```typescript
// 1. Tính 24/7 - dùng cho IN-STOCK items
function addDaysWithFraction(base: Date, days: number): Date {
    const totalHours = Math.round(days * 12);
    d.setHours(d.getHours() + totalHours); // Tính liên tục, có T7/CN
    return d;
}

// 2. Skip Weekend (Mon-Fri only) - dùng cho OUT-OF-STOCK items
function addWorkingDaysWithFraction(base: Date, days: number): Date {
    // Chỉ đếm Mon-Fri hours
    // Skip T7/CN
}
```

---

### 2. **Update Priority 1 - District Leadtime Logic**

#### Trước (SAI ❌):
```typescript
if (districtLeadtime && districtLeadtime > 0) {
    // In-stock: addWorkingDaysWithFraction(orderTime, districtLeadtime, 'KHOHCM')
    // → Skip weekend ← SAI!
    result = addWorkingDaysWithFraction(orderTime, districtLeadtime, warehouseCode);
}
```

#### Sau (ĐÚNG ✅):
```typescript
if (districtLeadtime && districtLeadtime > 0) {
    if (isOutOfStock && warehouseCode) {
        // Out-of-stock: skip weekend
        const effectiveOrderTime = getWeekendResetTime(orderTime); // Weekend reset
        let result = addWorkingDaysWithFraction(effectiveOrderTime, totalCa);
        result = applySundayAdjustment(result, warehouseCode);
        return result;
    } else {
        // In-stock: TÍnh 24/7 ← FIX!
        console.log('   📅 TÍNH 24/7 (T7/CN được tính)');
        let result = addDaysWithFraction(orderTime, districtLeadtime);
        result = applySundayAdjustment(result, warehouseCode);
        return result;
    }
}
```

---

### 3. **Update Priority 2 - Out of Stock Rules**

#### Trước (SAI ❌):
```typescript
if (isOutOfStock && warehouseCode) {
    let result = addWorkingDaysWithFraction(effectiveOrderTime, leadtimeCa, warehouseCode);
}
```

#### Sau (ĐÚNG ✅):
```typescript
if (isOutOfStock && warehouseCode) {
    console.log(`   🏭 Áp dụng Skip Weekend (chỉ tính Mon-Fri) cho out-of-stock`);
    let result = addWorkingDaysWithFraction(effectiveOrderTime, leadtimeCa);
    result = applySundayAdjustment(result, warehouseCode);
}
```

---

### 4. **Update Test Cases**

Các test cases cũ không phản ánh rule mới, đã update:

| Test Case | Cũ | Mới | Giải Thích |
|-----------|-----|-----|-----------|
| District Leadtime Priority | Skip weekend | **24/7** | In-stock tính 24/7 |
| District Leadtime NO Reset | Skip weekend | **24/7** | In-stock tính 24/7 |
| Result falls Sunday | Skip weekend + adjust | **24/7 + Adjust** | Tính T7/CN rồi adjust |
| Weekend Reset Sat 2PM | Skip weekend | **Skip weekend** | Out-of-stock reset + skip |

---

## 📊 Bảng So Sánh Logic Cũ vs Mới

| Scenario | Logic Cũ | Logic Mới | Fix |
|----------|----------|-----------|-----|
| **HCM + In-stock + Leadtime quận** | ❌ Skip T7/CN | ✅ Tính 24/7 | **FIX: Tính T7/CN** |
| **HCM + Out-of-stock** | Skip T7/CN | Skip T7/CN | ✅ Không thay đổi |
| **HCM + In-stock → result Sunday** | ❌ Skip T7/CN + adjust | ✅ Tính 24/7 + adjust | **FIX: Tính T7/CN trước adjust** |
| **BD + In-stock** | ✅ Tính 24/7 | ✅ Tính 24/7 | ✅ Không thay đổi |
| **BD + Out-of-stock** | ✅ Tính 24/7 | ✅ Tính 24/7 | ✅ Không thay đổi |

---

## 🎯 Example Scenarios

### Scenario 1: In-stock + Friday Evening
- **Order time:** Friday 6:00 PM
- **District leadtime:** 2 ca (24 hours)
- **Expected delivery:** Sunday 6:00 PM

**Cũ (SAI):**
```
Fri 6PM → skip T7/CN → Mon 6PM ✅ nhưng skip T7/CN = sai logic
```

**Mới (ĐÚNG):**
```
Fri 6PM + 24h (tính 24/7) = Sun 6PM → Adjust = Mon 8AM ✅
```

---

### Scenario 2: Out-of-stock + Friday
- **Order time:** Friday 10:00 AM
- **Extra leadtime for out-of-stock:** 2 ca (24 hours)
- **Expected delivery:** Tuesday (skip weekend)

**Cũ & Mới (KHÔNG ĐỔI):**
```
Fri 10AM → skip T7 & CN → Mon 10AM + 1 working day = Tue 10AM ✅
```

---

## 🧪 Test Cases Mới

### Test 1: District Leadtime IN-STOCK (24/7)
```typescript
params: {
    warehouseCode: 'KHOHCM',
    districtLeadtime: 2, // 2 ca = 24 hours
    now: new Date('2025-01-15T10:00:00'), // Wednesday
},
expected: '2025-01-16' // +24h = Thursday
```

### Test 2: District Leadtime IN-STOCK Fri→Sun
```typescript
params: {
    warehouseCode: 'KHOHCM',
    districtLeadtime: 2,
    orderCreatedOn: new Date('2025-01-17T18:00:00'), // Friday 6PM
},
expected: '2025-01-20' // +24h = Sun → Adjust to Mon 8AM
```

### Test 3: Out-of-Stock Skip Weekend
```typescript
params: {
    warehouseCode: 'KHOHCM',
    var_input_soluong: 10,
    var_selected_SP_tonkho: 5, // Out of stock
    now: new Date('2025-01-15T10:00:00'), // Wednesday
},
expected: '2025-01-17' // +2 working days = Friday (skip T7/CN)
```

---

## 📝 Summary of Changes

### Files Modified:
- ✅ `src/utils/computeDeliveryDate.ts`

### Functions Changed:
1. **NEW:** `addDaysWithFraction()` - Calculate 24/7 without weekend skip
2. **UPDATED:** `addWorkingDaysWithFraction()` - Now only for skip-weekend logic
3. **UPDATED:** Priority 1 logic - Use `addDaysWithFraction` for in-stock
4. **UPDATED:** Priority 2 logic - Use `addWorkingDaysWithFraction` for out-of-stock

### Test Cases Updated:
- 13 test cases updated to reflect new 24/7 logic for in-stock items

---

## ✨ Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **In-stock T7/CN** | ❌ Skipped | ✅ Counted (24/7) |
| **Out-of-stock T7/CN** | ✅ Skipped | ✅ Skipped |
| **Weekend Reset** | ✅ Out-of-stock only | ✅ Out-of-stock only |
| **Sunday Adjustment** | ✅ HCM only | ✅ HCM only |
| **Code clarity** | 🟡 Mixed logic | ✅ Separated functions |

---

## 🚀 Deployment Notes

1. **No breaking changes** - Legacy logic unchanged
2. **Only affects** in-stock items with district leadtime
3. **Test thoroughly** with real orders
4. **Monitor** delivery date calculations in admin dashboard
