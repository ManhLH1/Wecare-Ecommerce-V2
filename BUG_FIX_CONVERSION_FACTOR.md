# 🔧 BUG FIX: Conversion Factor = 0 Issue

## 📋 Vấn Đề

User report: **"Kho Tp. Hồ Chí Minh: 5 - Cần: 0 | Có: 0 -> có bị sai"**

Khi thêm sản phẩm vào SO với số lượng = 1 (Số lượng hiển thị đúng), nhưng leadtime calculation nhận được:
- `var_input_soluong = 1` ✅
- `var_selected_donvi_conversion = 0` ❌ (nên là 1 hoặc > 0)
- Result: `requestedQty = 1 * 0 = 0` ❌

## 🔍 Root Cause

### 1. API Response Issue (pages/api/admin-app/units.ts)
CRM field `crdfd_giatrichuyenoi` có thể là:
- `undefined` (chưa set)
- `0` (set nhưng value = 0)
- Positive number (correct value)

API chỉ lấy 1 field conversion, nên khi field này là 0, không có fallback.

### 2. ProductEntryForm Issue (src/app/admin-app/_components/ProductEntryForm.tsx)
Code lấy conversion factor:
```typescript
// OLD CODE - BUG
const conversionFactor =
  (currentUnit as any)?.crdfd_giatrichuyenoi ??      // Nếu undefined thì fallback
  (currentUnit as any)?.crdfd_giatrichuyendoi ??     // (field này không tồn tại!)
  (currentUnit as any)?.crdfd_conversionvalue ??     // (field này không tồn tại!)
  1;  // Nếu tất cả undefined thì = 1
```

**Problem:** Khi `crdfd_giatrichuyenoi = 0`, nó KHÔNG undefined, nên không fallback mà dùng 0 trực tiếp!
- `0 ?? ...` → `0` (không đi fallback)
- `Number(0) || 1` → `1` (hoặc)

## ✅ Fix Applied

### File 1: pages/api/admin-app/units.ts

**Change 1: Mở rộng select fields**
```typescript
// OLD
const columns = "crdfd_unitconvertionid,cr44a_masanpham,crdfd_onvichuyenoitransfome,crdfd_giatrichuyenoi,crdfd_onvichuan";

// NEW - Thêm 2 field fallback từ CRM
const columns = "crdfd_unitconvertionid,cr44a_masanpham,crdfd_onvichuyenoitransfome,crdfd_giatrichuyenoi,crdfd_conversionfactor,crdfd_conversionvalue,crdfd_onvichuan";
```

**Change 2: Mapping logic với fallback**
```typescript
// OLD
return {
  crdfd_unitsid: unitId,
  crdfd_name: unitName,
  crdfd_giatrichuyenoi: item.crdfd_giatrichuyenoi,
  crdfd_onvichuan: item.crdfd_onvichuan,
};

// NEW - Fallback nếu primary field = 0
return {
  crdfd_unitsid: unitId,
  crdfd_name: unitName,
  crdfd_giatrichuyenoi: giatrichuyenoi > 0 
    ? giatrichuyenoi 
    : (conversionfactor > 0 ? conversionfactor : (conversionvalue > 0 ? conversionvalue : 0)),
  crdfd_conversionfactor: conversionfactor,
  crdfd_conversionvalue: conversionvalue,
  crdfd_onvichuan: onvichuan,
};
```

### File 2: src/app/admin-app/_components/ProductEntryForm.tsx (dòng 2595-2605)

**Change: Sử dụng fallback chuỗi để tìm value > 0**
```typescript
// OLD - BUG: Nếu crdfd_giatrichuyenoi = 0, dùng 0 ngay
const conversionFactor =
  (currentUnit as any)?.crdfd_giatrichuyenoi ??
  (currentUnit as any)?.crdfd_giatrichuyendoi ??
  (currentUnit as any)?.crdfd_conversionvalue ??
  1;

// NEW - Kiểm tra value > 0, mới dùng; nếu không thì fallback
const conversionFactor = 
  ((currentUnit as any)?.crdfd_giatrichuyenoi > 0) 
    ? Number((currentUnit as any).crdfd_giatrichuyenoi)
    : ((currentUnit as any)?.crdfd_conversionfactor > 0)
    ? Number((currentUnit as any).crdfd_conversionfactor)
    : ((currentUnit as any)?.crdfd_conversionvalue > 0)
    ? Number((currentUnit as any).crdfd_conversionvalue)
    : 1;
```

## 📊 Test Scenarios

### Scenario 1: CRM có crdfd_giatrichuyenoi = 2
```
API returns: crdfd_giatrichuyenoi: 2
FE calculates: 2 > 0? YES → conversionFactor = 2 ✅
Result: quantity (1) * 2 = 2
```

### Scenario 2: CRM có crdfd_giatrichuyenoi = 0, crdfd_conversionfactor = 3
```
API returns: crdfd_giatrichuyenoi: 0, crdfd_conversionfactor: 3
FE calculates: 0 > 0? NO → fallback to 3 > 0? YES → conversionFactor = 3 ✅
Result: quantity (1) * 3 = 3
```

### Scenario 3: CRM tất cả = 0 hoặc undefined
```
API returns: All = 0
FE calculates: All > 0? NO → fallback to default 1 ✅
Result: quantity (1) * 1 = 1
```

## 🚀 Impact

### Before Fix
```
Sản phẩm "Kho Tp. Hồ Chí Minh: 5"
Số lượng: 1
Đơn vị: Thùng (crdfd_giatrichuyenoi = 0 ← sai config CRM)
↓
var_input_soluong = 1
var_selected_donvi_conversion = 0 ❌
↓
requestedQty = 1 * 0 = 0
Tồn kho = 5
isOutOfStock = 0 > 5? NO → CÒN HÀNG ❌ (nên là HẾT HÀNG!)
```

### After Fix
```
Sản phẩm "Kho Tp. Hồ Chí Minh: 5"
Số lượng: 1
Đơn vị: Thùng (crdfd_giatrichuyenoi = 0 ← sai config CRM)
                ↓ fallback to crdfd_conversionfactor = 2
↓
var_input_soluong = 1
var_selected_donvi_conversion = 2 ✅
↓
requestedQty = 1 * 2 = 2
Tồn kho = 5
isOutOfStock = 2 > 5? NO → CÒN HÀNG ✅ (đúng!)
```

## 🔧 Files Modified

1. **pages/api/admin-app/units.ts**
   - Line 42: Thêm 2 field `crdfd_conversionfactor`, `crdfd_conversionvalue`
   - Lines 64-75: Cập nhật mapping logic với fallback

2. **src/app/admin-app/_components/ProductEntryForm.tsx**
   - Lines 2595-2605: Cập nhật conversion factor calculation với fallback chuỗi

## ✨ Quality Assurance

- [x] No TypeScript errors
- [x] Backward compatible (fallback to 1 if all fields = 0)
- [x] Handles all CRM field variations
- [x] Better error resilience

## 📝 Notes

- Cần inform CRM team để check và set đúng `crdfd_giatrichuyenoi` value cho tất cả units
- Hoặc standardize trên field nào: `crdfd_giatrichuyenoi` vs `crdfd_conversionfactor` vs `crdfd_conversionvalue`
- Nếu CRM không có field này, sẽ fallback default = 1, không crash

## 🎯 Verification

User cần test lại:
1. Thêm sản phẩm từ Kho HCM với số lượng = 1
2. Chọn đơn vị có conversion factor
3. Kiểm tra console log: `Cần: X | Có: Y` (X phải > 0, không phải 0)
4. Leadtime calculation phải đúng

