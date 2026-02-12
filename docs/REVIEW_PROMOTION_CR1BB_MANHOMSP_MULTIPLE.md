# 📋 Review Luồng Promotion Add Theo `cr1bb_manhomsp_multiple`

**Ngày review:** 2025-01-27  
**Scope:** Toàn bộ luồng promotion add sản phẩm theo mã nhóm sản phẩm (`cr1bb_manhomsp_multiple`)

---

## 🎯 Tổng Quan

Luồng promotion add theo `cr1bb_manhomsp_multiple` cho phép áp dụng promotion cho sản phẩm dựa trên **mã nhóm sản phẩm** thay vì chỉ theo mã sản phẩm cụ thể. Điều này giúp:
- Áp dụng promotion cho nhiều sản phẩm cùng nhóm một lúc
- Quản lý promotion linh hoạt hơn ở CRM
- Tính tổng tiền chỉ từ các sản phẩm trong nhóm để check điều kiện

---

## 📊 Luồng Xử Lý Chi Tiết

### 1. **API Level - Fetch Promotions**

#### 1.1. `pages/api/admin-app/promotions.ts`
- **Mục đích:** Fetch danh sách promotions từ CRM
- **Field liên quan:** `cr1bb_manhomsp_multiple` được select từ CRM
- **Mapping:** 
  ```typescript
  productGroupCodes: promo.cr1bb_manhomsp_multiple
  ```
- **Vị trí:** Line 269, 302

#### 1.2. `pages/api/admin-app/promotion-orders.ts`
- **Mục đích:** Fetch promotions cho đơn hàng (Order context)
- **Select field:** `cr1bb_manhomsp_multiple` (line 477)
- **Mapping:** 
  ```typescript
  productGroupCodes: promo.cr1bb_manhomsp_multiple
  ```
- **Filter logic:** `doesPromotionMatchProducts()` (line 263-273)
  - Check nếu `productGroupCodes` của promotion có chứa mã nhóm sản phẩm từ request
  - Sử dụng `includes()` để match (có thể gây false positive nếu substring match)

**⚠️ VẤN ĐỀ TIỀM ẨN:**
```typescript:263:273:pages/api/admin-app/promotion-orders.ts
const doesPromotionMatchProducts = (promo: AvailablePromotion, productCodes: string[], productGroups: string[]): boolean => {
  const hasProductMatch = productCodes.some(code =>
    promo.productCodes && promo.productCodes.includes(code)
  );

  const hasGroupMatch = productGroups.some(code =>
    promo.productGroupCodes && promo.productGroupCodes.includes(code)
  );

  return hasProductMatch || hasGroupMatch;
};
```

**Vấn đề:** 
- `includes()` có thể match substring (ví dụ: "NSP-001" match "NSP-0010")
- Nên dùng exact match với comma-separated parsing

---

### 2. **Frontend Level - Product Entry Form**

#### 2.1. `src/app/admin-app/_components/ProductEntryForm.tsx`

**A. Tính tổng tiền cho promotion (calculateTotalForPromotion)**

```typescript:2391:2449:src/app/admin-app/_components/ProductEntryForm.tsx
const calculateTotalForPromotion = (
  products: Array<{ productCode?: string; productGroupCode?: string; price: number; quantity: number; vat?: number }>,
  promotion: Promotion,
  newProduct?: { productCode?: string; productGroupCode?: string; price: number; quantity: number; vat?: number }
): number => {
  const promoAny = promotion as any;
  const productCodesStr = promotion.productCodes || promoAny.crdfd_masanpham_multiple || '';
  const productGroupCodesStr = promotion.productGroupCodes || promoAny.cr1bb_manhomsp_multiple || '';
  
  // Parse danh sách mã sản phẩm và mã nhóm sản phẩm (comma-separated)
  const allowedProductCodes = productCodesStr
    .split(',')
    .map((c: string) => c.trim())
    .filter(Boolean);
  const allowedProductGroupCodes = productGroupCodesStr
    .split(',')
    .map((c: string) => c.trim())
    .filter(Boolean);
  
  // Nếu promotion không có điều kiện về sản phẩm/nhóm sản phẩm → tính tổng tất cả
  const hasProductFilter = allowedProductCodes.length > 0 || allowedProductGroupCodes.length > 0;
  
  let total = 0;
  
  // Tính tổng từ các sản phẩm hiện tại trong đơn
  if (products && products.length > 0) {
    total += products.reduce((sum, item) => {
      const matchesProductCode = !hasProductFilter || 
        (item.productCode && allowedProductCodes.includes(item.productCode));
      const matchesProductGroupCode = !hasProductFilter || 
        (item.productGroupCode && allowedProductGroupCodes.includes(item.productGroupCode));
      
      if (matchesProductCode || matchesProductGroupCode) {
        const basePrice = item.price;
        const lineSubtotal = basePrice * (item.quantity || 0);
        const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
        return sum + lineSubtotal + lineVat;
      }
      return sum;
    }, 0);
  }
  
  // Thêm sản phẩm đang thêm vào tổng nếu match với promotion
  if (newProduct) {
    const matchesProductCode = !hasProductFilter || 
      (newProduct.productCode && allowedProductCodes.includes(newProduct.productCode));
    const matchesProductGroupCode = !hasProductFilter || 
      (newProduct.productGroupCode && allowedProductGroupCodes.includes(newProduct.productGroupCode));
    
    if (matchesProductCode || matchesProductGroupCode) {
      const basePrice = newProduct.price;
      const lineSubtotal = basePrice * (newProduct.quantity || 0);
      const lineVat = Math.round((lineSubtotal * (newProduct.vat ?? 0)) / 100);
      total += lineSubtotal + lineVat;
    }
  }
  
  return total;
};
```

**✅ ĐIỂM TỐT:**
- Parse comma-separated string thành array
- Trim và filter empty values
- Check exact match với `includes()` trên array (an toàn hơn substring match)
- Tính tổng chỉ từ sản phẩm match với promotion
- Xử lý cả sản phẩm hiện có và sản phẩm mới đang thêm

**⚠️ VẤN ĐỀ:**
- Case sensitivity: Không normalize case (uppercase/lowercase) → có thể miss match nếu CRM lưu "NSP-001" nhưng frontend gửi "nsp-001"
- Không có logging để debug khi không match

**B. Check điều kiện tổng tiền trước khi áp dụng promotion**

```typescript:2451:2478:src/app/admin-app/_components/ProductEntryForm.tsx
// Tính tổng tiền từ các sản phẩm match với promotion
const newProductForCalc = {
  productCode: selectedProductCode,
  productGroupCode: selectedProductGroupCode,
  price: Number(price) || 0,
  quantity: quantity || 0,
  vat: vatPercent || 0,
};
const totalForThisPromotion = calculateTotalForPromotion(
  currentProducts || [],
  sel,
  newProductForCalc
);

const meetsTotalCondition = minTotalCondition === 0 || totalForThisPromotion >= minTotalCondition;

console.debug('[ProductEntryForm][PROMO DEBUG] Promotion condition check:', {
  promotionId: sel.id,
  promotionName: sel.name,
  totalAmountCondition: minTotalCondition,
  productCodes: sel.productCodes || (sel as any).crdfd_masanpham_multiple,
  productGroupCodes: sel.productGroupCodes || (sel as any).cr1bb_manhomsp_multiple,
  currentProductsCount: currentProducts?.length || 0,
  newProductCode: selectedProductCode,
  newProductGroupCode: selectedProductGroupCode,
  totalForThisPromotion,
  meetsTotalCondition,
});
```

**✅ ĐIỂM TỐT:**
- Tính tổng tiền CHỈ từ các sản phẩm match với promotion (không tính tất cả sản phẩm)
- Check điều kiện `totalAmountCondition` trước khi áp dụng
- Có debug logging để trace

---

#### 2.2. `src/app/admin-app/_components/SalesOrderForm.tsx`

**Logic tương tự ProductEntryForm:**

```typescript:864:921:src/app/admin-app/_components/SalesOrderForm.tsx
const calculateTotalForPromotion = (
  products: ProductTableItem[],
  promotion: any,
  newProduct?: { productCode?: string; productGroupCode?: string; price: number; quantity: number; vat?: number }
): number => {
  const productCodesStr = promotion.productCodes || promotion.crdfd_masanpham_multiple || '';
  const productGroupCodesStr = promotion.productGroupCodes || promotion.cr1bb_manhomsp_multiple || '';
  
  // Parse danh sách mã sản phẩm và mã nhóm sản phẩm (comma-separated)
  const allowedProductCodes = productCodesStr
    .split(',')
    .map((c: string) => c.trim())
    .filter(Boolean);
  const allowedProductGroupCodes = productGroupCodesStr
    .split(',')
    .map((c: string) => c.trim())
    .filter(Boolean);
  
  // Nếu promotion không có điều kiện về sản phẩm/nhóm sản phẩm → tính tổng tất cả
  const hasProductFilter = allowedProductCodes.length > 0 || allowedProductGroupCodes.length > 0;
  
  let total = 0;
  
  // Tính tổng từ các sản phẩm hiện tại trong đơn
  if (products && products.length > 0) {
    total += products.reduce((sum, item) => {
      const matchesProductCode = !hasProductFilter || 
        (item.productCode && allowedProductCodes.includes(item.productCode));
      const matchesProductGroupCode = !hasProductFilter || 
        (item.productGroupCode && allowedProductGroupCodes.includes(item.productGroupCode));
      
      if (matchesProductCode || matchesProductGroupCode) {
        const basePrice = item.price;
        const lineSubtotal = basePrice * (item.quantity || 0);
        const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
        return sum + lineSubtotal + lineVat;
      }
      return sum;
    }, 0);
  }
  
  // Thêm sản phẩm đang thêm vào tổng nếu match với promotion
  if (newProduct) {
    const matchesProductCode = !hasProductFilter || 
      (newProduct.productCode && allowedProductCodes.includes(newProduct.productCode));
    const matchesProductGroupCode = !hasProductFilter || 
      (newProduct.productGroupCode && allowedProductGroupCodes.includes(newProduct.productGroupCode));
    
    if (matchesProductCode || matchesProductGroupCode) {
      const basePrice = newProduct.price;
      const lineSubtotal = basePrice * (newProduct.quantity || 0);
      const lineVat = Math.round((lineSubtotal * (newProduct.vat ?? 0)) / 100);
      total += lineSubtotal + lineVat;
    }
  }
  
  return total;
};
```

**⚠️ VẤN ĐỀ:**
- Code duplicate với ProductEntryForm → nên extract thành utility function

---

#### 2.3. `src/app/admin-app/_components/ProductTable.tsx`

**Recalculate promotion eligibility:**

```typescript:116:153:src/app/admin-app/_components/ProductTable.tsx
const calculateTotalForPromotion = (
  products: ProductTableItem[],
  promotion: Promotion
): number => {
  const promoAny = promotion as any;
  const productCodesStr = promotion.productCodes || promoAny.crdfd_masanpham_multiple || '';
  const productGroupCodesStr = promotion.productGroupCodes || promoAny.cr1bb_manhomsp_multiple || '';

  // Parse danh sách mã sản phẩm và mã nhóm sản phẩm (comma-separated)
  const allowedProductCodes = productCodesStr
    .split(',')
    .map((c: string) => c.trim())
    .filter(Boolean);
  const allowedProductGroupCodes = productGroupCodesStr
    .split(',')
    .map((c: string) => c.trim())
    .filter(Boolean);

  // Nếu promotion không có điều kiện về sản phẩm/nhóm sản phẩm → tính tổng tất cả
  const hasProductFilter = allowedProductCodes.length > 0 || allowedProductGroupCodes.length > 0;

  return products.reduce((sum, item) => {
    // Kiểm tra item có match với promotion không
    const matchesProductCode = !hasProductFilter ||
      (item.productCode && allowedProductCodes.includes(item.productCode));
    const matchesProductGroupCode = !hasProductFilter ||
      (item.productGroupCode && allowedProductGroupCodes.includes(item.productGroupCode));

    // Chỉ tính tổng nếu item match với promotion
    if (matchesProductCode || matchesProductGroupCode) {
      const basePrice = item.price;
      const lineSubtotal = basePrice * (item.quantity || 0);
      const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
      return sum + lineSubtotal + lineVat;
    }
    return sum;
  }, 0);
};
```

**✅ ĐIỂM TỐT:**
- Logic nhất quán với các component khác
- Tính tổng chỉ từ items match với promotion

---

### 3. **Backend API - Apply Promotion**

#### 3.1. `pages/api/admin-app/apply-promotion-order.ts`

**Match product group codes:**

```typescript:111:114:pages/api/admin-app/apply-sobg-promotion-order.ts
const promoGroupCodes = promoData.cr1bb_manhomsp_multiple;
```

**⚠️ VẤN ĐỀ:**
- Cần check code chi tiết hơn để xem cách parse và match

---

## 🔍 Phân Tích Vấn Đề

### ❌ **Vấn Đề 1: Case Sensitivity**

**Mô tả:** Không normalize case khi match product group codes

**Ví dụ:**
- CRM lưu: `"NSP-001,NSP-002"`
- Frontend gửi: `"nsp-001"` (lowercase)
- Kết quả: Không match → promotion không được áp dụng

**Giải pháp:**
```typescript
// Normalize cả hai bên về uppercase trước khi compare
const normalizeCode = (code: string) => code.trim().toUpperCase();
const allowedProductGroupCodes = productGroupCodesStr
  .split(',')
  .map(normalizeCode)
  .filter(Boolean);
const matchesProductGroupCode = !hasProductFilter || 
  (item.productGroupCode && allowedProductGroupCodes.includes(normalizeCode(item.productGroupCode)));
```

---

### ❌ **Vấn Đề 2: Code Duplication**

**Mô tả:** Function `calculateTotalForPromotion` được duplicate ở nhiều nơi:
- `ProductEntryForm.tsx` (2 lần: line 2391 và 2853)
- `SalesOrderForm.tsx` (line 864)
- `ProductTable.tsx` (line 116)

**Giải pháp:** Extract thành utility function:
```typescript
// src/utils/promotionUtils.ts
export function calculateTotalForPromotion(
  products: Array<{ productCode?: string; productGroupCode?: string; price: number; quantity: number; vat?: number }>,
  promotion: Promotion,
  newProduct?: { productCode?: string; productGroupCode?: string; price: number; quantity: number; vat?: number }
): number {
  // ... logic chung
}
```

---

### ⚠️ **Vấn Đề 3: Substring Match trong API**

**Mô tả:** `doesPromotionMatchProducts()` dùng `includes()` có thể match substring

**Ví dụ:**
- Promotion có: `"NSP-001,NSP-002"`
- Request có: `"NSP-0010"` (typo hoặc mã khác)
- Kết quả: Match sai → promotion được áp dụng nhầm

**Giải pháp:**
```typescript
const doesPromotionMatchProducts = (promo: AvailablePromotion, productCodes: string[], productGroups: string[]): boolean => {
  // Parse promotion's codes thành array
  const promoProductCodes = (promo.productCodes || '')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean);
  const promoGroupCodes = (promo.productGroupCodes || '')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean);

  // Normalize request codes
  const normalizedProductCodes = productCodes.map(c => c.trim().toUpperCase());
  const normalizedGroupCodes = productGroups.map(c => c.trim().toUpperCase());

  // Exact match
  const hasProductMatch = normalizedProductCodes.some(code =>
    promoProductCodes.includes(code)
  );
  const hasGroupMatch = normalizedGroupCodes.some(code =>
    promoGroupCodes.includes(code)
  );

  return hasProductMatch || hasGroupMatch;
};
```

---

### ✅ **Điểm Tốt**

1. **Logic tính tổng tiền chính xác:** Chỉ tính từ sản phẩm match với promotion, không tính tất cả
2. **Check điều kiện tổng tiền:** Validate `totalAmountCondition` trước khi áp dụng
3. **Xử lý cả sản phẩm mới và cũ:** Tính tổng bao gồm sản phẩm đang thêm vào
4. **Debug logging:** Có console.debug để trace

---

## 📝 Đề Xuất Cải Thiện

### 1. **Tạo Utility Function Chung**

```typescript
// src/utils/promotionUtils.ts
export interface ProductForPromotion {
  productCode?: string;
  productGroupCode?: string;
  price: number;
  quantity: number;
  vat?: number;
}

export function normalizeProductGroupCode(code: string): string {
  return code.trim().toUpperCase();
}

export function parseProductGroupCodes(codesStr: string): string[] {
  return codesStr
    .split(',')
    .map(normalizeProductGroupCode)
    .filter(Boolean);
}

export function doesProductMatchPromotion(
  product: ProductForPromotion,
  promotion: Promotion
): boolean {
  const promoAny = promotion as any;
  const productCodesStr = promotion.productCodes || promoAny.crdfd_masanpham_multiple || '';
  const productGroupCodesStr = promotion.productGroupCodes || promoAny.cr1bb_manhomsp_multiple || '';
  
  const allowedProductCodes = parseProductGroupCodes(productCodesStr);
  const allowedProductGroupCodes = parseProductGroupCodes(productGroupCodesStr);
  
  const hasProductFilter = allowedProductCodes.length > 0 || allowedProductGroupCodes.length > 0;
  
  if (!hasProductFilter) return true; // No filter = match all
  
  const matchesProductCode = product.productCode && 
    allowedProductCodes.includes(normalizeProductGroupCode(product.productCode));
  const matchesProductGroupCode = product.productGroupCode && 
    allowedProductGroupCodes.includes(normalizeProductGroupCode(product.productGroupCode));
  
  return matchesProductCode || matchesProductGroupCode;
}

export function calculateTotalForPromotion(
  products: ProductForPromotion[],
  promotion: Promotion,
  newProduct?: ProductForPromotion
): number {
  let total = 0;
  
  // Tính từ sản phẩm hiện có
  if (products && products.length > 0) {
    total += products.reduce((sum, item) => {
      if (doesProductMatchPromotion(item, promotion)) {
        const lineSubtotal = item.price * (item.quantity || 0);
        const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
        return sum + lineSubtotal + lineVat;
      }
      return sum;
    }, 0);
  }
  
  // Thêm sản phẩm mới nếu match
  if (newProduct && doesProductMatchPromotion(newProduct, promotion)) {
    const lineSubtotal = newProduct.price * (newProduct.quantity || 0);
    const lineVat = Math.round((lineSubtotal * (newProduct.vat ?? 0)) / 100);
    total += lineSubtotal + lineVat;
  }
  
  return total;
}
```

### 2. **Fix API Match Logic**

Update `doesPromotionMatchProducts()` trong `promotion-orders.ts` để dùng exact match với normalization.

### 3. **Thêm Unit Tests**

Test các trường hợp:
- Match exact product group code
- Case insensitive match
- Comma-separated multiple codes
- Empty/null codes
- Substring không match (false positive prevention)

---

## ✅ Kết Luận

**Luồng hiện tại:**
- ✅ Logic cơ bản đúng: Parse comma-separated, match exact, tính tổng chính xác
- ⚠️ Cần cải thiện: Case sensitivity, code duplication, substring match prevention
- 📝 Đề xuất: Extract utility functions, normalize codes, thêm tests

**Priority:**
1. **High:** Fix case sensitivity (có thể gây bug production)
2. **Medium:** Extract utility functions (maintainability)
3. **Low:** Fix substring match trong API (defensive programming)
