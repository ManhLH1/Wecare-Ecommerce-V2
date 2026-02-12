# 🔍 Mapping `crdfd_masanpham_multiple` - So Sánh Với Trường Nào?

**Ngày tạo:** 2025-01-27  
**Mục đích:** Giải thích `crdfd_masanpham_multiple` được so sánh với trường nào và lấy từ đâu

---

## 📊 Tổng Quan

`crdfd_masanpham_multiple` là field trong CRM (Dynamics 365) thuộc bảng **`crdfd_promotions`** (Promotion).

**Định dạng:** Comma-separated string chứa danh sách mã sản phẩm  
**Ví dụ:** `"SP-001,SP-002,SP-003"`

---

## 🎯 So Sánh Với Trường Nào?

### 1️⃣ **Trong Admin App - ProductEntryForm**

**So sánh với:** `productCode` từ form input (khi user chọn sản phẩm)

**Code:**
```typescript:2397:2419:src/app/admin-app/_components/ProductEntryForm.tsx
const productCodesStr = promotion.productCodes || promoAny.crdfd_masanpham_multiple || '';

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
```

**Nguồn `productCode`:**
- Từ `selectedProductCode` khi user chọn sản phẩm từ dropdown
- Hoặc từ `item.productCode` trong danh sách sản phẩm hiện tại trong đơn

---

### 2️⃣ **Trong Admin App - Apply Promotion API**

**So sánh với:** `crdfd_masanpham` từ SOD (Sales Order Detail)

**Code:**
```typescript:707:710:pages/api/admin-app/apply-promotion-order.ts
for (const sod of sodList) {
  const sodProductCodeRaw = sod.crdfd_masanpham || '';
  const sodProductGroupCodeRaw = sod.crdfd_manhomsp || '';
  const sodProductCode = String(sodProductCodeRaw).trim().toUpperCase();
```

**Nguồn `crdfd_masanpham`:**
- Từ CRM table **`crdfd_saleorderdetail`** (Sales Order Detail)
- Field `crdfd_masanpham` trong SOD record

**Query SOD:**
```typescript:476:478:pages/api/admin-app/apply-promotion-order.ts
const sodQueryCheck = `$filter=${encodeURIComponent(sodFiltersCheck.join(" and "))}&$select=crdfd_gia,crdfd_soluong,crdfd_masanpham,crdfd_manhomsp`;
const sodEndpointCheck = `${BASE_URL}${SOD_TABLE}?${sodQueryCheck}`;
const sodRespCheck = await axios.get(sodEndpointCheck, { headers });
```

**Match logic:**
```typescript:715:719:pages/api/admin-app/apply-promotion-order.ts
const sodSetHas = productCodeSet.has(sodProductCodeNormalized);
const sodIncludesAny = productCodeListNormalized.some((code: string) =>
  sodProductCodeNormalized.includes(code) && sodProductCodeNormalized.length > code.length
);
const matchesProduct = productCodeSet.size > 0 && (sodSetHas || sodIncludesAny);
```

---

### 3️⃣ **Trong API - Promotion Orders**

**So sánh với:** `productCodes` array từ request body

**Code:**
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

**Nguồn `productCodes`:**
- Từ request body khi frontend gọi API:
  ```typescript
  POST /api/admin-app/promotion-orders
  {
    productCodes: ["SP-001", "SP-002"],
    productGroups: ["NHOM-001"]
  }
  ```

---

### 4️⃣ **Trong API - Save SOBG Details**

**So sánh với:** `pair.productCode` từ request body

**Code:**
```typescript:404:406:pages/api/admin-app/save-sobg-details.ts
if (pair.productCode && row.crdfd_masanpham_multiple &&
    row.crdfd_masanpham_multiple.toLowerCase().includes(pair.productCode.toLowerCase())) {
    score += 2; // Product code match is highest priority
}
```

**Nguồn `pair.productCode`:**
- Từ request body khi frontend gửi danh sách sản phẩm cần tìm promotion

---

## 📍 Nguồn Gốc Của Các Trường So Sánh

### A. `crdfd_masanpham_multiple` (Promotion)
- **Nguồn:** CRM table `crdfd_promotions`
- **Field:** `crdfd_masanpham_multiple`
- **Kiểu:** Comma-separated string
- **Ví dụ:** `"SP-001,SP-002,SP-003"`

### B. `crdfd_masanpham` (SOD - Sales Order Detail)
- **Nguồn:** CRM table `crdfd_saleorderdetail`
- **Field:** `crdfd_masanpham`
- **Kiểu:** String (single product code)
- **Ví dụ:** `"SP-001"`

**Query để lấy:**
```typescript:90:92:pages/api/admin-app/sale-order-details.ts
"crdfd_masanpham",        // Mã sản phẩm (productCode) - nếu có trong SOD
"crdfd_manhomsp",         // Mã nhóm sản phẩm
```

### C. `productCode` (Form Input)
- **Nguồn:** User chọn sản phẩm từ dropdown trong ProductEntryForm
- **Kiểu:** String (single product code)
- **Ví dụ:** `"SP-001"`

**Lấy từ:**
```typescript:2452:2458:src/app/admin-app/_components/ProductEntryForm.tsx
const newProductForCalc = {
  productCode: selectedProductCode,
  productGroupCode: selectedProductGroupCode,
  price: Number(price) || 0,
  quantity: quantity || 0,
  vat: vatPercent || 0,
};
```

---

## 🔄 Luồng So Sánh

### Luồng 1: Admin App - Thêm Sản Phẩm Vào Đơn

```
1. User chọn sản phẩm từ dropdown
   → selectedProductCode = "SP-001"
   ↓
2. Fetch promotions từ API
   → API trả về: promotion.productCodes = "SP-001,SP-002,SP-003"
   ↓
3. Parse promotion.productCodes thành array
   → ["SP-001", "SP-002", "SP-003"]
   ↓
4. So sánh: allowedProductCodes.includes(selectedProductCode)
   → ["SP-001", "SP-002", "SP-003"].includes("SP-001") = true
   ↓
5. Nếu match → tính tổng tiền và hiển thị promotion
```

### Luồng 2: Apply Promotion - Áp Dụng Vào Đơn Hàng

```
1. User chọn promotion và apply vào đơn hàng
   ↓
2. API fetch SODs từ CRM
   → sod.crdfd_masanpham = "SP-001"
   ↓
3. API fetch promotion từ CRM
   → promoData.crdfd_masanpham_multiple = "SP-001,SP-002,SP-003"
   ↓
4. Parse promotion thành array và normalize
   → ["SP-001", "SP-002", "SP-003"] (uppercase)
   ↓
5. So sánh: productCodeListNormalized.includes(sodProductCodeNormalized)
   → ["SP-001", "SP-002", "SP-003"].includes("SP-001") = true
   ↓
6. Nếu match → apply promotion vào SOD đó
```

---

## ⚠️ Vấn Đề Hiện Tại

### 1. Substring Match (Có thể match sai)

**Vấn đề:**
```typescript:265:265:pages/api/admin-app/promotion-orders.ts
promo.productCodes && promo.productCodes.includes(code)
```

**Ví dụ sai:**
- `promo.productCodes = "SP-001,SP-002"`
- `code = "SP-00"` → `includes("SP-00")` = `true` ❌ (sai!)

**Giải pháp:** Parse thành array và exact match:
```typescript
const promoProductCodes = (promo.productCodes || '')
  .split(',')
  .map(c => c.trim().toUpperCase())
  .filter(Boolean);
const hasProductMatch = productCodes.some(code =>
  promoProductCodes.includes(code.trim().toUpperCase())
);
```

---

### 2. Case Sensitivity

**Vấn đề:** Không normalize case → có thể miss match

**Ví dụ:**
- `promo.productCodes = "SP-001,SP-002"` (lowercase)
- `code = "SP-001"` (uppercase) → không match ❌

**Giải pháp:** Normalize cả hai bên về uppercase:
```typescript
const normalizeCode = (code: string) => code.trim().toUpperCase();
```

---

## 📋 Tóm Tắt Mapping

| Trường So Sánh | Nguồn | Kiểu | Ví Dụ |
|----------------|-------|------|-------|
| `crdfd_masanpham_multiple` | CRM `crdfd_promotions` | Comma-separated string | `"SP-001,SP-002,SP-003"` |
| `crdfd_masanpham` (SOD) | CRM `crdfd_saleorderdetail` | String | `"SP-001"` |
| `productCode` (Form) | User input từ dropdown | String | `"SP-001"` |
| `productCodes` (API Request) | Request body | Array<string> | `["SP-001", "SP-002"]` |

---

## ✅ Best Practices

1. **Luôn parse comma-separated string thành array** trước khi match
2. **Normalize case** (uppercase) để tránh miss match
3. **Exact match** thay vì substring match (`includes()`)
4. **Trim whitespace** trước khi so sánh
5. **Filter empty strings** sau khi split

---

## 🔗 Liên Kết

- [PROMOTION_FLOW_MAPPING.md](./PROMOTION_FLOW_MAPPING.md) - Luồng promotion chi tiết
- [REVIEW_PROMOTION_CR1BB_MANHOMSP_MULTIPLE.md](./REVIEW_PROMOTION_CR1BB_MANHOMSP_MULTIPLE.md) - Review product group codes
