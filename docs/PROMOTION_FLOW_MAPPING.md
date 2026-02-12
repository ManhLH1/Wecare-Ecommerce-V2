# 🔄 Luồng Promotion & Mapping Chi Tiết

**Ngày tạo:** 2025-01-27  
**Mục đích:** Document toàn bộ luồng promotion từ CRM → API → Frontend và các điểm mapping

---

## 📊 Tổng Quan Luồng

```
CRM (Dynamics 365)
    ↓
API Endpoints (Next.js)
    ↓
Frontend Components
    ↓
Apply Promotion
```

---

## 1️⃣ CRM → API Mapping

### 1.1. API: `pages/api/admin-app/promotions.ts`

**Endpoint:** `/api/admin-app/promotions`  
**Mục đích:** Fetch danh sách promotions cho admin app

**Select Fields từ CRM:**
```typescript:269:274:pages/api/admin-app/promotions.ts
"cr1bb_manhomsp_multiple",
"cr1bb_manhomspmuakem",
"cr1bb_masanphammuakem",
"crdfd_salehangton",
"cr1bb_onvitinh",
```

**Mapping Logic:**
```typescript:285:316:pages/api/admin-app/promotions.ts
let promotions = (response.data.value || []).map((promo: any) => ({
  id: promo.crdfd_promotionid,
  name: promo.crdfd_name,
  conditions: promo.crdfd_conditions,
  type: promo.crdfd_type,
  value: promo.crdfd_value,
  value2: promo.cr1bb_value2,
  chietKhau2: promo.cr1bb_chietkhau2,
  value3: promo.crdfd_value3,
  valueWithVat: promo.crdfd_value_co_vat,
  valueNoVat: promo.crdfd_value_khong_vat,
  valueBuyTogether: promo.cr3b9_valuemuakem,
  vn: promo.crdfd_vn,
  startDate: promo.crdfd_start_date,
  endDate: promo.crdfd_end_date,
  productNames: promo.crdfd_tensanpham_multiple,
  productCodes: promo.crdfd_masanpham_multiple,
  productGroupCodes: promo.cr1bb_manhomsp_multiple,  // ⭐ MAPPING CHÍNH
  buyTogetherGroupCodes: promo.cr1bb_manhomspmuakem,
  buyTogetherProductCodes: promo.cr1bb_masanphammuakem,
  customerCodes: promo.cr3b9_ma_khachhang_apdung,
  totalAmountCondition: promo.cr1bb_tongtienapdung,
  quantityCondition: promo.cr1bb_soluongapdung,
  quantityConditionLevel3: promo.crdfd_soluongapdungmuc3,
  cumulativeQuantity: promo.cr1bb_congdonsoluong,
  promotionTypeText: promo.crdfd_promotiontypetext,
  paymentTerms: promo.cr1bb_ieukhoanthanhtoanapdung,
  paymentTermsLevel3: promo.cr1bb_ieukhoanthanhtoanapdungmuc3,
  paymentTermsLevel2: promo.cr3b9_dieukhoanthanhtoanapdungmuc2,
  saleInventoryOnly: promo.crdfd_salehangton,
  unitName: promo.cr1bb_onvitinh,
}));
```

**⭐ Mapping quan trọng:**
- `cr1bb_manhomsp_multiple` (CRM) → `productGroupCodes` (API Response)
- `crdfd_masanpham_multiple` (CRM) → `productCodes` (API Response)

---

### 1.2. API: `pages/api/admin-app/promotion-orders.ts`

**Endpoint:** `/api/admin-app/promotion-orders`  
**Mục đích:** Fetch promotions cho đơn hàng (Order context)

**Select Fields:**
```typescript:469:482:pages/api/admin-app/promotion-orders.ts
const selectFields = [
  "crdfd_promotionid",
  "crdfd_name",
  "crdfd_type",
  "crdfd_value",
  "crdfd_vn",
  "cr1bb_chietkhau2",
  "crdfd_masanpham_multiple",
  "cr1bb_manhomsp_multiple",  // ⭐ Field quan trọng
  "cr1bb_tongtienapdung",
  "cr1bb_ieukhoanthanhtoanapdung",
  "crdfd_start_date",
  "crdfd_end_date"
];
```

**Mapping:**
```typescript:491:504:pages/api/admin-app/promotion-orders.ts
return (response.data.value || []).map((promo: any) => ({
  id: promo.crdfd_promotionid,
  name: promo.crdfd_name,
  type: promo.crdfd_type,
  value: parsePromotionValue(promo.crdfd_value),
  vndOrPercent: promo.crdfd_vn,
  chietKhau2: normalizeChietKhau2(promo.cr1bb_chietkhau2),
  productCodes: promo.crdfd_masanpham_multiple,
  productGroupCodes: promo.cr1bb_manhomsp_multiple,  // ⭐ MAPPING
  totalAmountCondition: promo.cr1bb_tongtienapdung,
  ieukhoanthanhtoanapdung: promo.cr1bb_ieukhoanthanhtoanapdung,
  startDate: promo.crdfd_start_date,
  endDate: promo.crdfd_end_date,
}));
```

**Match Logic:**
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

**⚠️ Vấn đề:** Dùng `includes()` trên string → có thể match substring sai

---

### 1.3. API: `pages/api/getPromotionsForProducts.ts`

**Endpoint:** `/api/getPromotionsForProducts`  
**Mục đích:** Fetch promotions cho danh sách sản phẩm

**Select Fields:**
```typescript:75:90:pages/api/getPromotionsForProducts.ts
const columns = [
  "crdfd_promotionid",
  "crdfd_name",
  "crdfd_conditions",
  "crdfd_type",
  "crdfd_value",
  "crdfd_vn",
  "crdfd_start_date",
  "crdfd_end_date",
  "crdfd_tensanpham_multiple",
  "crdfd_masanpham_multiple",  // ⚠️ Chỉ có product codes, không có product group codes
  "crdfd_promotiontypetext",
  "cr1bb_soluongapdung",
  "crdfd_value_co_vat",
  "crdfd_value_khong_vat"
].join(",");
```

**Mapping:**
```typescript:103:118:pages/api/getPromotionsForProducts.ts
const promotions = (response.data.value || []).map((promo: any) => ({
  id: promo.crdfd_promotionid,
  name: promo.crdfd_name,
  conditions: promo.crdfd_conditions,
  type: promo.crdfd_type,
  value: promo.crdfd_value,
  vn: promo.crdfd_vn,
  startDate: promo.crdfd_start_date,
  endDate: promo.crdfd_end_date,
  productNames: promo.crdfd_tensanpham_multiple,
  productCodes: promo.crdfd_masanpham_multiple,
  promotionTypeText: promo.crdfd_promotiontypetext,
  quantityCondition: promo.cr1bb_soluongapdung,
  valueWithVat: promo.crdfd_value_co_vat,
  valueNoVat: promo.crdfd_value_khong_vat,
}));
```

**⚠️ Vấn đề:** API này không select `cr1bb_manhomsp_multiple` → không hỗ trợ product group codes

---

## 2️⃣ API → Frontend Usage

### 2.1. Admin App - ProductEntryForm

**Component:** `src/app/admin-app/_components/ProductEntryForm.tsx`

**Fetch Promotions:**
- Gọi API: `/api/admin-app/promotions` hoặc `/api/admin-app/promotion-orders`
- Nhận response với `productGroupCodes` đã được map

**Sử dụng `productGroupCodes`:**
```typescript:2391:2449:src/app/admin-app/_components/ProductEntryForm.tsx
const calculateTotalForPromotion = (
  products: Array<{ productCode?: string; productGroupCode?: string; price: number; quantity: number; vat?: number }>,
  promotion: Promotion,
  newProduct?: { productCode?: string; productGroupCode?: string; price: number; quantity: number; vat?: number }
): number => {
  const promoAny = promotion as any;
  const productCodesStr = promotion.productCodes || promoAny.crdfd_masanpham_multiple || '';
  const productGroupCodesStr = promotion.productGroupCodes || promoAny.cr1bb_manhomsp_multiple || '';
  
  // Parse comma-separated string thành array
  const allowedProductCodes = productCodesStr
    .split(',')
    .map((c: string) => c.trim())
    .filter(Boolean);
  const allowedProductGroupCodes = productGroupCodesStr
    .split(',')
    .map((c: string) => c.trim())
    .filter(Boolean);
  
  // ... logic tính tổng chỉ từ sản phẩm match
};
```

**Backward Compatibility:**
- Check cả `promotion.productGroupCodes` (đã map từ API)
- Và `promoAny.cr1bb_manhomsp_multiple` (raw CRM field) để đảm bảo tương thích

---

### 2.2. Admin App - SalesOrderForm

**Component:** `src/app/admin-app/_components/SalesOrderForm.tsx`

**Logic tương tự ProductEntryForm:**
```typescript:864:921:src/app/admin-app/_components/SalesOrderForm.tsx
const calculateTotalForPromotion = (
  products: ProductTableItem[],
  promotion: any,
  newProduct?: { productCode?: string; productGroupCode?: string; price: number; quantity: number; vat?: number }
): number => {
  const productCodesStr = promotion.productCodes || promotion.crdfd_masanpham_multiple || '';
  const productGroupCodesStr = promotion.productGroupCodes || promotion.cr1bb_manhomsp_multiple || '';
  
  // Parse và match logic...
};
```

---

### 2.3. Admin App - ProductTable

**Component:** `src/app/admin-app/_components/ProductTable.tsx`

**Recalculate khi products thay đổi:**
```typescript:116:153:src/app/admin-app/_components/ProductTable.tsx
const calculateTotalForPromotion = (
  products: ProductTableItem[],
  promotion: Promotion
): number => {
  const promoAny = promotion as any;
  const productCodesStr = promotion.productCodes || promoAny.crdfd_masanpham_multiple || '';
  const productGroupCodesStr = promotion.productGroupCodes || promoAny.cr1bb_manhomsp_multiple || '';

  // Parse và tính tổng...
};
```

---

### 2.4. Frontend Public - usePromotion Hook

**Hook:** `src/hooks/usePromotion.ts`

**Fetch từ API:**
```typescript:62:97:src/hooks/usePromotion.ts
const fetchPromotions = useCallback(async (customerId: string) => {
  if (!customerId) return;

  try {
    setLoading(true);
    setError(null);

    const response = await axios.get(`/api/getPromotionDataNewVersion?id=${customerId}`);
    const promotionData = response.data;

    if (!promotionData || !Array.isArray(promotionData)) {
      setPromotions([]);
      return;
    }

    // Parse promotions từ response
    const allPromotions: Promotion[] = [];
    promotionData.forEach((group: any) => {
      if (group.promotions && Array.isArray(group.promotions)) {
        group.promotions.forEach((apiPromo: any) => {
          const parsed = parsePromotionFromApi(apiPromo);
          if (parsed.promotionId) {
            allPromotions.push(parsed as Promotion);
          }
        });
      }
    });

    setPromotions(allPromotions);
  } catch (err) {
    console.error('Error fetching promotions:', err);
    setError('Không thể tải dữ liệu khuyến mãi');
  } finally {
    setLoading(false);
  }
}, []);
```

**Parse function:** `parsePromotionFromApi()` trong `src/utils/promotionUtils.ts`

---

## 3️⃣ Type Definitions

### 3.1. Promotion Interface (Model)

**File:** `src/model/promotion.ts`

```typescript:12:104:src/model/promotion.ts
export interface Promotion {
  // ID & Info
  promotionId?: string;
  id?: string;
  name?: string;
  crdfd_name?: string;
  description?: string;
  crdfd_conditions?: string;
  conditions?: string;
  imageUrl?: string;
  cr1bb_urlimage?: string;
  
  // Discount Values
  value?: string | number;
  value2?: string | number;
  value3?: string | number;
  crdfd_value?: string | number;
  cr1bb_value2?: string | number;
  crdfd_value3?: string | number;
  
  // Discount Type
  vn?: string;                    // 191920000: %, 191920001: VNĐ
  crdfd_vn?: string;
  cr1bb_vn?: string;
  
  // Quantity Conditions
  cumulativeQuantity?: boolean;    // congdonsoluong: true = cộng dồn, false = không
  congdonsoluong?: boolean;
  quantityThreshold?: number;     // soluongapdung
  soluongapdung?: number;
  quantityThreshold3?: number;    // soluongapdungmuc3
  soluongapdungmuc3?: number;
  
  // Total Amount Condition (tongTienApDung)
  totalAmountThreshold?: number;   // cr1bb_tongtienapdung
  tongTienApDung?: number | string;
  productCodes?: string;          // Danh sách mã sản phẩm áp dụng (string từ CRM)
  crdfd_masanpham_multiple?: string;
  
  // Product Groups
  productGroupCodes?: string;     // Mã nhóm sản phẩm ⭐
  productGroupNames?: string;     // Tên nhóm sản phẩm
  crdfd_multiple_manhomsp?: string;
  crdfd_multiple_tennhomsp?: string;
  
  // Dates
  startDate?: string;
  endDate?: string;
  crdfd_start_date?: string;
  crdfd_end_date?: string;
  cr1bb_startdate?: string;
  cr1bb_enddate?: string;
  
  // Status
  status?: string;
  statecode?: number;
  crdfd_promotion_deactive?: string;
  
  // Customer
  customerGroupText?: string;
  customerGroupIds?: string[];
  crdfd_customergrouptext?: string;
  _crdfd_customergroup_value?: string;
  
  // Payment Terms
  paymentTerms?: string;
  ieuKhoanThanhToanApDung?: string;
  cr1bb_ieukhoanthanhtoanapdung?: string;
  
  // Buy Together (Mua kèm)
  buyTogetherProducts?: string;
  buyTogetherGroups?: string;
  tenSanPhamMuaKem?: string;
  maSanPhamMuaKem?: string;
  tenNhomSPMuaKem?: string;
  maNhomSPMuaKem?: string;
  cr3b9_tensanphammuakem?: string;
  cr1bb_masanphammuakem?: string;
  cr3b9_tennhomspmuakem?: string;
  cr1bb_manhomspmuakem?: string;
  
  // Type
  type?: string;
  crdfd_type?: string;
  promotionType?: string;
  crdfd_promotiontypetext?: string;
  
  // Customer specific
  maKhachHangApDung?: string;
  cr3b9_ma_khachhang_apdung?: string;
  customerCodes?: string;
}
```

**⭐ Lưu ý:** Interface này hỗ trợ cả:
- `productGroupCodes` (normalized field từ API)
- `crdfd_multiple_manhomsp` (raw CRM field - có thể không dùng)
- `cr1bb_manhomsp_multiple` (raw CRM field - được dùng trong code)

---

### 3.2. Admin API Interface

**File:** `src/app/admin-app/_api/adminApi.ts`

```typescript:97:139:src/app/admin-app/_api/adminApi.ts
export interface Promotion {
  id: string;
  name: string;
  conditions?: string;
  type?: string;
  value?: string;
  value2?: string;
  value3?: string;
  valueWithVat?: string;  // Discount % có VAT (dùng khi value = 0)
  valueNoVat?: string;
  valueBuyTogether?: string;
  vn?: string;
  startDate?: string;
  endDate?: string;
  /**
   * Danh sách mã sản phẩm áp dụng (backend trả dạng string, thường là chuỗi có phân tách).
   * Tại sao optional: một số promotion có thể không ràng buộc sản phẩm.
   */
  productCodes?: string;
  /**
   * Danh sách mã nhóm sản phẩm áp dụng (nếu có).
   */
  productGroupCodes?: string;  // ⭐
  promotionTypeText?: string;
  totalAmountCondition?: string;
  quantityCondition?: string;
  quantityConditionLevel3?: string;
  cumulativeQuantity?: string;
  paymentTerms?: string;
  // Added fields for server-side applicability annotation
  paymentTermsNormalized?: string;
  applicable?: boolean;
  paymentTermsMismatch?: boolean;
  warningMessage?: string;
  paymentTermsLevel2?: string;
  paymentTermsLevel3?: string;
  saleInventoryOnly?: any;
  unitName?: string;
  // Chiết khấu 2 flag (từ cr1bb_chietkhau2 trong CRM)
  chietKhau2?: number;
  // vndOrPercent field (used by vndCodeEquals for compatibility)
  vndOrPercent?: string | number;
}
```

---

## 4️⃣ Luồng Áp Dụng Promotion

### 4.1. Admin App - Add Product với Promotion

**Luồng:**
1. User chọn sản phẩm → có `productCode` và `productGroupCode`
2. Fetch promotions từ `/api/admin-app/promotion-orders` với `productCodes` và `productGroups`
3. API filter promotions match với sản phẩm
4. Frontend tính tổng tiền từ các sản phẩm match với promotion
5. Check điều kiện `totalAmountCondition`
6. Nếu đủ điều kiện → hiển thị promotion trong dropdown
7. User chọn promotion → apply vào đơn hàng

**Code flow:**
```
ProductEntryForm
  → fetchPromotions(productCodes, productGroups)
  → API: /api/admin-app/promotion-orders
  → doesPromotionMatchProducts() check match
  → calculateTotalForPromotion() tính tổng
  → check totalAmountCondition
  → show in dropdown
  → applyPromotion()
```

---

### 4.2. Apply Promotion API

**API:** `pages/api/admin-app/apply-promotion-order.ts` hoặc `apply-sobg-promotion-order.ts`

**Logic apply:**
- Nhận `promotionId`, `productCodes`, `productGroups`
- Fetch promotion details từ CRM
- Validate điều kiện
- Tính discount
- Lưu vào order

---

## 5️⃣ Mapping Summary Table

| CRM Field | API Response Field | Frontend Usage | Notes |
|-----------|-------------------|----------------|-------|
| `cr1bb_manhomsp_multiple` | `productGroupCodes` | `promotion.productGroupCodes` | ⭐ Main mapping |
| `crdfd_masanpham_multiple` | `productCodes` | `promotion.productCodes` | Product codes |
| `cr1bb_tongtienapdung` | `totalAmountCondition` | `promotion.totalAmountCondition` | Điều kiện tổng tiền |
| `cr1bb_soluongapdung` | `quantityCondition` | `promotion.quantityCondition` | Điều kiện số lượng |
| `crdfd_value` | `value` | `promotion.value` | Giá trị discount |
| `crdfd_vn` | `vn` | `promotion.vn` | Loại discount (%, VNĐ) |

---

## 6️⃣ Vấn Đề & Giải Pháp

### ❌ Vấn đề 1: Substring Match trong API

**File:** `pages/api/admin-app/promotion-orders.ts`

**Vấn đề:**
```typescript
promo.productGroupCodes.includes(code)  // Có thể match substring
```

**Giải pháp:** Parse thành array và exact match:
```typescript
const promoGroupCodes = (promo.productGroupCodes || '')
  .split(',')
  .map(c => c.trim().toUpperCase())
  .filter(Boolean);
const hasGroupMatch = productGroups.some(code =>
  promoGroupCodes.includes(code.trim().toUpperCase())
);
```

---

### ❌ Vấn đề 2: Case Sensitivity

**Vấn đề:** Không normalize case khi match

**Giải pháp:** Normalize cả hai bên về uppercase:
```typescript
const normalizeCode = (code: string) => code.trim().toUpperCase();
```

---

### ⚠️ Vấn đề 3: API `getPromotionsForProducts` thiếu field

**Vấn đề:** Không select `cr1bb_manhomsp_multiple`

**Giải pháp:** Thêm field vào select columns

---

## 7️⃣ Best Practices

1. **Luôn parse comma-separated string thành array** trước khi match
2. **Normalize case** (uppercase) để tránh miss match
3. **Exact match** thay vì substring match
4. **Backward compatibility:** Check cả normalized field và raw CRM field
5. **Type safety:** Dùng interface `Promotion` từ `src/model/promotion.ts`

---

## ✅ Kết Luận

**Mapping chính:**
- `cr1bb_manhomsp_multiple` (CRM) → `productGroupCodes` (API) → `promotion.productGroupCodes` (Frontend)

**Luồng:**
1. CRM lưu `cr1bb_manhomsp_multiple` dạng comma-separated string
2. API select field và map thành `productGroupCodes`
3. Frontend parse string thành array và match với `productGroupCode` của sản phẩm
4. Tính tổng tiền chỉ từ sản phẩm match
5. Check điều kiện và apply promotion

**Cần cải thiện:**
- Fix substring match trong API
- Normalize case khi match
- Extract utility functions để tránh code duplication
