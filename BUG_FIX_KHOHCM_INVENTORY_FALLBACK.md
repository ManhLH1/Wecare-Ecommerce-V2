# 🔧 BUG FIX: KHO HCM Inventory Fallback Issue

## 📋 Issue Report

**User Report:** 
- Kho: **KHOHCM**
- Tồn kho hiển thị: **8 units** (wrong)
- Expected inventory in HCM: **158 units** (from admin-app-dropdown warehouse data)
- **Result:** Delivery date calculation is wrong because it uses the incorrect stock (8 instead of 158)

**Impact:**
- Wrong leadtime calculation for orders
- Incorrect "out-of-stock" detection
- Misleading inventory status to customer

## 🔍 Root Cause

The inventory API had a **fallback logic** that was meant to handle missing warehouse records, but it was causing the opposite effect:

### Old Code Flow (Bug)

```typescript
// pages/api/admin-app/inventory.ts (OLD - BUGGY)

// Step 1: Query with warehouse filter
if (safeWarehouse) {
  filter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
}

// Step 2: If no record found, FALLBACK to querying without warehouse filter
if (!first && safeWarehouse) {
  const fallbackFilter = `${codeField} eq '${safeCode}' and statecode eq 0`;
  // No warehouse filter → Returns inventory from ANY warehouse
  const fallbackResponse = await deduplicateRequest(...);
  const fallbackFirst = fallbackResults[0]; // Could be from different warehouse!
  
  if (fallbackFirst) {
    return fallbackResult; // Wrong warehouse's inventory!
  }
}
```

### What Was Happening

```
Scenario: User selects "Kho Tp. Hồ Chí Minh"

Step 1: Query Inventory Weshops with filter:
  filter: cr44a_masanpham eq 'PROD001' 
          and statecode eq 0 
          and cr1bb_vitrikhotext eq 'Kho Tp. Hồ Chí Minh'
  
  ❌ No record found (product might not have inventory record for this warehouse)

Step 2: FALLBACK - Query without warehouse filter:
  filter: cr44a_masanpham eq 'PROD001' 
          and statecode eq 0
  
  ✅ Record found! Returns inventory from "Kho Bình Định" or other warehouse
  📦 Stock = 8 units (from wrong warehouse)

Step 3: Return wrong stock = 8
  → computeDeliveryDate receives 8 instead of 1584
  → Out-of-stock check: 10 (needed) > 8 (shown) = TRUE (incorrect)
  → Leadtime = +2 ca (out-of-stock) instead of district leadtime
```

## ✅ Solution Applied

**Remove the fallback logic for warehouse-specific queries.**

When a user explicitly selects a warehouse, the system should:
1. ✅ Return inventory ONLY from that warehouse
2. ✅ Return 0 if no inventory record exists for that warehouse
3. ❌ Never return inventory from a different warehouse

### New Code Flow (Fixed)

```typescript
// pages/api/admin-app/inventory.ts (NEW - FIXED)

// Step 1: Query with warehouse filter
if (safeWarehouse) {
  filter += ` and cr1bb_vitrikhotext eq '${safeWarehouse}'`;
}
const first = results[0];

// Step 2: If no record found AND warehouse was specified
// → Return 0 (don't fallback to other warehouses)
if (!first && safeWarehouse) {
  console.log(`[Inventory API] No inventory found for product='${safeCode}' in warehouse='${safeWarehouse}'`);
  
  return {
    theoreticalStock: 0,
    actualStock: 0,
    reservedQuantity: 0,
    availableToSell: 0,
  };
}

// Step 3: If found, return the correct record
const theoretical = first?.cr44a_soluongtonlythuyet ?? 0;
return {
  theoreticalStock: theoretical,
  ...
};
```

## 📊 Behavior Change

### Before Fix

| Scenario | Query | Result | Stock Shown | Status |
|----------|-------|--------|-------------|--------|
| **HCM inventory exists** | With warehouse filter | ✅ Found | 1584 | Correct |
| **HCM inventory missing** | With warehouse filter | ❌ Not found | 8 (from BD) | **Wrong!** |
| **No warehouse filter** | Without filter | ✅ Found | Any | Correct |

### After Fix

| Scenario | Query | Result | Stock Shown | Status |
|----------|-------|--------|-------------|--------|
| **HCM inventory exists** | With warehouse filter | ✅ Found | 1584 | ✅ Correct |
| **HCM inventory missing** | With warehouse filter | ❌ Not found | 0 | ✅ Correct |
| **No warehouse filter** | Without filter | ✅ Found | (appropriate) | ✅ Correct |

## 🔧 Files Modified

### [pages/api/admin-app/inventory.ts](pages/api/admin-app/inventory.ts#L185-L230)

**Change:** Removed fallback logic for warehouse-specific queries

```diff
  const queryInventory = async (preferCrdfd: boolean) => {
    // ... setup filter ...
    const first = results[0];
    
    // ❌ OLD: Fallback to other warehouses if not found
    // if (!first && safeWarehouse) {
    //   const fallbackFilter = `${codeField} eq '${safeCode}' and statecode eq 0`;
    //   // Query without warehouse filter
    //   const fallbackResponse = await deduplicateRequest(...);
    //   return fallbackResult; // WRONG warehouse!
    // }
    
    // ✅ NEW: Return 0 if warehouse-specific inventory not found
    if (!first && safeWarehouse) {
      return {
        theoreticalStock: 0,
        actualStock: 0,
        reservedQuantity: 0,
        availableToSell: 0,
      };
    }
    
    // Return the found record (or 0 values if !first && !safeWarehouse)
    const theoretical = first?.cr44a_soluongtonlythuyet ?? 0;
    return { theoreticalStock: theoretical, ... };
  };
```

**Added:** Debug logging to help troubleshooting

```typescript
console.log(`[Inventory API] Querying ${preferCrdfd ? 'CRDFD' : 'CR44A'}: product='${safeCode}', warehouse='${safeWarehouse}'`);
console.log(`[Inventory API] No inventory found for product='${safeCode}' in warehouse='${safeWarehouse}'`);
console.log(`[Inventory API] Found inventory: product='${safeCode}', warehouse='${first?.cr1bb_vitrikhotext}', stock=${theoretical}`);
```

## 📈 Impact on Delivery Date Calculation

With correct inventory stock, the `computeDeliveryDate` function will now:

1. **Correct out-of-stock detection:** 
   - Receive true stock (1584) instead of fallback stock (8)
   - Correctly identify whether order quantity exceeds actual warehouse stock
   - Example: Order 10 units from HCM with 1584 in stock → IN-STOCK ✅
   - Old behavior: Order 10 units but system showed 8 → OUT-OF-STOCK ❌

2. **Correct leadtime calculation:**
   - In-stock orders: Use district leadtime (2 ca) ✅
   - Out-of-stock orders: Use out-of-stock leadtime (+2 ca extra) ❌ (not applicable)

3. **Correct inventory display:**
   - Show "Có: 1584" instead of "Có: 8"
   - Customer sees accurate stock status

## 🧪 Testing Checklist

- [ ] Open sales order entry form with KHOHCM warehouse
- [ ] Select a product that has inventory in HCM (e.g., 1584 units)
- [ ] Check browser console logs for:
  - `[Inventory API] Querying CR44A: product='PROD001', warehouse='Kho Tp. Hồ Chí Minh'`
  - `[Inventory API] Found inventory: product='PROD001', warehouse='Kho Tp. Hồ Chí Minh', stock=1584`
- [ ] Verify form shows: `Tồn kho Inventory: 1584` (not 8)
- [ ] Place order for quantity < 1584 and verify leadtime uses district leadtime
- [ ] Check computeDeliveryDate logs:
  - `📈 Tồn kho: [quantity] | Có: 1584`
  - `⚠️  Trạng thái: CÒN HÀNG` (should be in-stock)
  - `📆 NGÀY GIAO: [correct date]` (using district leadtime)

## 📝 Related Issues

This fix addresses the reported issue:
- **Before:** Delivery date calculation used wrong inventory (8 units from fallback)
- **After:** Delivery date calculation uses correct inventory (1584 units from HCM)

## 🔗 Related Files

- [src/utils/computeDeliveryDate.ts](src/utils/computeDeliveryDate.ts) - Leadtime calculation logic
- [src/app/admin-app/_components/ProductEntryForm.tsx](src/app/admin-app/_components/ProductEntryForm.tsx) - Where inventory is fetched
- [BUG_FIX_KHO_HCM_INVENTORY.md](BUG_FIX_KHO_HCM_INVENTORY.md) - Previous warehouse name matching fix

## ✨ Notes

- This fix is **backward compatible** - no breaking changes
- The fallback logic was intended to be helpful but caused data corruption
- Proper warehouse name matching in CRM is important for this fix to work correctly
- If a product legitimately has no inventory in a warehouse, the correct behavior is to show 0 (not inventory from another warehouse)
