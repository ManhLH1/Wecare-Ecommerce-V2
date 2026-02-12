# 🔍 Hướng Dẫn: Lấy Nhóm Sản Phẩm Để Truyền Vào `/promotions`

**Ngày tạo:** 2025-01-27  
**Mục đích:** Hướng dẫn cách lấy `productGroupCodes` từ sản phẩm và truyền vào API `/promotions`

---

## 📊 Tổng Quan

API `/promotions` hiện tại **CHƯA hỗ trợ** `productGroupCodes` trong query params.  
API `/promotion-orders` **ĐÃ hỗ trợ** `productGroupCodes`.

**Cần làm:**
1. Lấy `productGroupCode` từ sản phẩm
2. Thêm support `productGroupCodes` vào API `/promotions` (nếu cần)
3. Hoặc sử dụng API `/promotion-orders` nếu cần filter theo nhóm sản phẩm

---

## 🎯 Cách Lấy `productGroupCode` Từ Sản Phẩm

### 1️⃣ **Từ ProductEntryForm (Khi User Chọn Sản Phẩm)**

**Code hiện tại:**
```typescript:921:933:src/app/admin-app/_components/ProductEntryForm.tsx
const selectedProductGroupCode = useMemo(() => {
  const fromState = (selectedProduct as any)?.crdfd_manhomsp as string | undefined;
  if (fromState) return fromState;

  const fromId = products.find((p) => p.crdfd_productsid === productId)?.crdfd_manhomsp;
  if (fromId) return fromId;

  const fromCode =
    selectedProductCode
      ? products.find((p) => p.crdfd_masanpham === selectedProductCode)?.crdfd_manhomsp
      : undefined;
  return fromCode || '';
}, [selectedProduct, products, productId, selectedProductCode]);
```

**Cách lấy:**
- **Từ `selectedProduct`:** `selectedProduct?.crdfd_manhomsp`
- **Từ `products` array:** Tìm theo `productId` hoặc `productCode`
- **Field trong CRM:** `crdfd_manhomsp` (Mã nhóm sản phẩm)

---

### 2️⃣ **Từ Sale Order Detail (Khi Load Đơn Hàng)**

**Code hiện tại:**
```typescript:358:358:src/app/admin-app/_components/SalesOrderBaoGiaForm.tsx
productGroupCode: detail.productGroupCode, // Lấy từ API
```

**API trả về:**
```typescript:166:166:pages/api/admin-app/sale-order-details.ts
productGroupCode: item.crdfd_manhomsp || undefined, // Thêm productGroupCode
```

**Field trong CRM:** `crdfd_manhomsp` từ table `crdfd_saleorderdetail`

---

### 3️⃣ **Từ Danh Sách Sản Phẩm Trong Đơn**

**Code hiện tại:**
```typescript:1487:1487:src/app/admin-app/_components/SalesOrderForm.tsx
const productGroupCodes = productList.map(p => p.productGroupCode).filter((c): c is string => typeof c === 'string' && c.trim() !== '');
```

**Cách lấy:**
```typescript
// Lấy tất cả productGroupCodes từ danh sách sản phẩm
const productGroupCodes = productList
  .map(p => p.productGroupCode)
  .filter((c): c is string => typeof c === 'string' && c.trim() !== '');
```

---

## 🔧 Cách Truyền Vào API

### Option 1: Sử Dụng API `/promotion-orders` (Đã Hỗ Trợ)

**API endpoint:** `/api/admin-app/promotion-orders`

**Query params:**
- `productCodes`: Comma-separated (ví dụ: `"SP-001,SP-002"`)
- `productGroupCodes`: Comma-separated (ví dụ: `"NSP-000373,NSP-000374"`)

**Code example:**
```typescript
// Lấy productGroupCodes từ danh sách sản phẩm
const productGroupCodes = productList
  .map(p => p.productGroupCode)
  .filter((c): c is string => typeof c === 'string' && c.trim() !== '');

// Gọi API
const params: Record<string, string> = {
  customerCode: customerCode,
  productCodes: productCodes.join(','),
  productGroupCodes: productGroupCodes.join(','), // ✅ Đã hỗ trợ
};

const response = await axios.get('/api/admin-app/promotion-orders', { params });
```

**Code hiện tại đang dùng:**
```typescript:2509:2510:src/app/admin-app/_components/SalesOrderForm.tsx
const productGroupCodes = productList.map(p => p.productGroupCode).filter(Boolean) as string[];
const res = await fetchPromotionOrders(soId, customerCode, orderTotal, productCodes, productGroupCodes, selectedSo?.crdfd_ieukhoanthanhtoan || selectedSo?.crdfd_dieu_khoan_thanh_toan);
```

---

### Option 2: Thêm Support `productGroupCodes` Vào API `/promotions`

**File:** `pages/api/admin-app/promotions.ts`

**Cần thêm:**

1. **Parse `productGroupCodes` từ query params:**
```typescript
const { productCode, customerCode, customerCodes, region, paymentTerms, productGroupCodes } = req.query;
```

2. **Thêm filter cho `productGroupCodes`:**
```typescript
// Support multiple product group codes (comma separated)
if (productGroupCodes && typeof productGroupCodes === "string" && productGroupCodes.trim()) {
  const productGroupCodesArray = productGroupCodes
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  
  if (productGroupCodesArray.length > 0) {
    const productGroupFilter = productGroupCodesArray
      .map((code) => `contains(cr1bb_manhomsp_multiple,'${escapeODataValue(code)}')`)
      .join(" or ");
    filters.push(`(${productGroupFilter})`);
  }
}
```

3. **Client-side filtering (để exact match):**
```typescript
// Filter promotions by product group codes (exact match)
if (productGroupCodesArray.length > 0) {
  promotions = promotions.filter((promo: any) => {
    const promoGroupCodesStr = promo.productGroupCodes || "";
    
    // Nếu promotion không có productGroupCodes → áp dụng cho tất cả
    if (!promoGroupCodesStr || promoGroupCodesStr.trim() === "") {
      return true;
    }
    
    // Parse và check exact match
    const promoGroupCodesList = promoGroupCodesStr
      .split(',')
      .map((c: string) => c.trim().toUpperCase())
      .filter(Boolean);
    
    return productGroupCodesArray.some((code: string) => 
      promoGroupCodesList.includes(code.trim().toUpperCase())
    );
  });
}
```

---

## 📝 Ví Dụ Implementation

### Ví Dụ 1: Lấy `productGroupCode` Từ Sản Phẩm Đã Chọn

```typescript
// Trong ProductEntryForm hoặc component tương tự
const getProductGroupCode = (product: Product | null): string => {
  if (!product) return '';
  
  // Ưu tiên: từ selectedProduct
  if ((product as any)?.crdfd_manhomsp) {
    return (product as any).crdfd_manhomsp;
  }
  
  // Fallback: tìm trong products array
  const found = products.find(
    (p) => p.crdfd_productsid === product.crdfd_productsid || 
           p.crdfd_masanpham === product.crdfd_masanpham
  );
  
  return found?.crdfd_manhomsp || '';
};
```

---

### Ví Dụ 2: Lấy Tất Cả `productGroupCodes` Từ Danh Sách Sản Phẩm

```typescript
// Lấy unique productGroupCodes từ danh sách sản phẩm
const getUniqueProductGroupCodes = (
  productList: Array<{ productCode?: string; productGroupCode?: string }>
): string[] => {
  const groupCodes = productList
    .map(p => p.productGroupCode)
    .filter((c): c is string => typeof c === 'string' && c.trim() !== '');
  
  // Remove duplicates
  return [...new Set(groupCodes)];
};

// Sử dụng
const productGroupCodes = getUniqueProductGroupCodes(productList);
```

---

### Ví Dụ 3: Gọi API `/promotion-orders` Với `productGroupCodes`

```typescript
import { fetchPromotionOrders } from '@/app/admin-app/_api/adminApi';

// Lấy productGroupCodes từ danh sách sản phẩm
const productGroupCodes = productList
  .map(p => p.productGroupCode)
  .filter((c): c is string => typeof c === 'string' && c.trim() !== '');

// Gọi API
const result = await fetchPromotionOrders(
  soId,
  customerCode,
  orderTotal,
  productCodes,        // ["SP-001", "SP-002"]
  productGroupCodes,   // ["NSP-000373", "NSP-000374"]
  paymentTerms
);
```

---

### Ví Dụ 4: Thêm Support `productGroupCodes` Vào API `/promotions`

**File:** `pages/api/admin-app/promotions.ts`

**Thêm vào handler:**
```typescript
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ... existing code ...
  
  const { productCode, customerCode, customerCodes, region, paymentTerms, productGroupCodes } = req.query;
  
  // ... existing validation ...
  
  // ✅ THÊM: Parse productGroupCodes
  const productGroupCodesArray: string[] = [];
  if (productGroupCodes && typeof productGroupCodes === "string" && productGroupCodes.trim()) {
    productGroupCodesArray.push(
      ...productGroupCodes
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    );
  }
  
  // ✅ THÊM: Filter promotions by productGroupCodes trong OData query
  if (productGroupCodesArray.length > 0) {
    const productGroupFilter = productGroupCodesArray
      .map((code) => `contains(cr1bb_manhomsp_multiple,'${escapeODataValue(code)}')`)
      .join(" or ");
    filters.push(`(${productGroupFilter})`);
  }
  
  // ... existing code để fetch promotions ...
  
  // ✅ THÊM: Client-side filtering để exact match
  if (productGroupCodesArray.length > 0) {
    promotions = promotions.filter((promo: any) => {
      const promoGroupCodesStr = promo.productGroupCodes || "";
      
      // Nếu promotion không có productGroupCodes → áp dụng cho tất cả
      if (!promoGroupCodesStr || promoGroupCodesStr.trim() === "") {
        return true;
      }
      
      // Parse và check exact match (case-insensitive)
      const promoGroupCodesList = promoGroupCodesStr
        .split(',')
        .map((c: string) => c.trim().toUpperCase())
        .filter(Boolean);
      
      return productGroupCodesArray.some((code: string) => 
        promoGroupCodesList.includes(code.trim().toUpperCase())
      );
    });
  }
  
  // ... rest of the code ...
}
```

**Update cache key:**
```typescript
const cacheKey = getCacheKey("promotions", {
  productCode,
  customerCode,
  customerCodes,
  region,
  paymentTerms,
  productGroupCodes, // ✅ Thêm vào cache key
});
```

---

## 🔗 Liên Kết

- [CRDFD_MASANPHAM_MULTIPLE_MAPPING.md](./CRDFD_MASANPHAM_MULTIPLE_MAPPING.md) - Mapping `crdfd_masanpham_multiple`
- [PROMOTION_FLOW_MAPPING.md](./PROMOTION_FLOW_MAPPING.md) - Luồng promotion chi tiết
- [REVIEW_PROMOTION_CR1BB_MANHOMSP_MULTIPLE.md](./REVIEW_PROMOTION_CR1BB_MANHOMSP_MULTIPLE.md) - Review product group codes

---

## ✅ Tóm Tắt

1. **Lấy `productGroupCode`:**
   - Từ `selectedProduct?.crdfd_manhomsp` khi user chọn sản phẩm
   - Từ `detail.productGroupCode` khi load đơn hàng
   - Từ `item.productGroupCode` trong danh sách sản phẩm

2. **Truyền vào API:**
   - **Option 1:** Dùng `/promotion-orders` (đã hỗ trợ `productGroupCodes`)
   - **Option 2:** Thêm support `productGroupCodes` vào `/promotions` (cần implement)

3. **Format:**
   - Comma-separated string: `"NSP-000373,NSP-000374"`
   - Array: `["NSP-000373", "NSP-000374"]`

4. **Best Practices:**
   - Normalize case (uppercase) để tránh miss match
   - Exact match thay vì substring match
   - Filter empty strings sau khi split
   - Include trong cache key nếu thêm vào API `/promotions`
