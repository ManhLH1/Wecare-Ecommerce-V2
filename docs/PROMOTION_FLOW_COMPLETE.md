# 📚 Tổng Hợp Luồng Promotion Chi Tiết - Wecare Ecommerce V3

**Ngày tạo:** 2025-01-27  
**Version:** 2.0  
**Scope:** Toàn bộ hệ thống promotion từ Backend API đến Frontend

---

## 📋 Mục Lục

1. [Tổng Quan Hệ Thống Promotion](#1-tổng-quan-hệ-thống-promotion)
2. [Cấu Trúc Dữ Liệu Promotion](#2-cấu-trúc-dữ-liệu-promotion)
3. [Backend APIs](#3-backend-apis)
4. [Frontend - Admin App](#4-frontend---admin-app)
5. [Frontend - Customer App (Cart/Product)](#5-frontend---customer-app-cartproduct)
6. [Logic Tính Tổng Tiền Áp Dụng](#6-logic-tính-tổng-tiền-áp-dụng)
7. [Luồng Xử Lý Promotion](#7-luồng-xử-lý-promotion)
8. [Các Trường Hợp Đặc Biệt](#8-các-trường-hợp-đặc-biệt)
9. [Validation & Error Handling](#9-validation--error-handling)
10. [Performance & Optimization](#10-performance--optimization)

---

## 1. Tổng Quan Hệ Thống Promotion

### 1.1. Các Loại Promotion

Hệ thống hỗ trợ 2 loại promotion chính:

#### **A. Promotion Theo Sản Phẩm (Product Promotion)**
- **Mục đích:** Áp dụng chiết khấu cho từng sản phẩm cụ thể
- **Điều kiện:**
  - Sản phẩm phải có trong `crdfd_masanpham_multiple` hoặc `cr1bb_manhomsp_multiple`
  - Có thể có điều kiện tổng tiền (`cr1bb_tongtienapdung`)
  - Có thể có điều kiện số lượng (`cr1bb_soluongapdung`)
  - Có thể có điều kiện điều khoản thanh toán (`cr1bb_ieukhoanthanhtoanapdung`)
- **Loại chiết khấu:**
  - **Percent-based** (`vn = 191920000`): Giảm theo %
  - **VND-based** (`vn = 191920001`): Giảm theo số tiền cố định
- **Mức chiết khấu:**
  - `value` (mức 1): Chiết khấu cơ bản
  - `value2` (mức 2): Chiết khấu khi đạt điều kiện số lượng hoặc tổng tiền
  - `value3` (mức 3): Chiết khấu cao nhất (nếu có)

#### **B. Promotion Theo Đơn Hàng (Order Promotion)**
- **Mục đích:** Áp dụng chiết khấu cho toàn bộ đơn hàng
- **Điều kiện:**
  - Tổng giá trị đơn hàng >= `cr1bb_tongtienapdung`
  - Có thể có điều kiện điều khoản thanh toán
- **Loại:** Chỉ percent-based (`chietKhau2 = true`)
- **Sử dụng:** Dùng cho chiết khấu 2 (CK2) trong admin app

### 1.2. Các Field Quan Trọng

| Field CRM | Field Frontend | Mô tả |
|-----------|----------------|-------|
| `cr1bb_tongtienapdung` | `totalAmountCondition` / `tongTienApDung` | Điều kiện tổng tiền tối thiểu |
| `crdfd_masanpham_multiple` | `productCodes` / `crdfd_masanpham_multiple` | Danh sách mã sản phẩm (comma-separated) |
| `cr1bb_manhomsp_multiple` | `productGroupCodes` / `cr1bb_manhomsp_multiple` | Danh sách mã nhóm sản phẩm (comma-separated) |
| `crdfd_value` | `value` | Giá trị chiết khấu mức 1 |
| `cr1bb_value2` | `value2` | Giá trị chiết khấu mức 2 |
| `crdfd_value3` | `value3` | Giá trị chiết khấu mức 3 |
| `crdfd_vn` | `vn` / `vndOrPercent` | Loại chiết khấu (191920000 = %, 191920001 = VNĐ) |
| `cr1bb_soluongapdung` | `quantityCondition` / `soluongapdung` | Điều kiện số lượng tối thiểu |
| `cr1bb_ieukhoanthanhtoanapdung` | `paymentTerms` | Điều khoản thanh toán áp dụng |

---

## 2. Cấu Trúc Dữ Liệu Promotion

### 2.1. Interface Promotion (TypeScript)

```typescript
interface Promotion {
  // ID & Info
  id?: string;
  name?: string;
  description?: string;
  
  // Discount Values
  value?: string | number;        // Mức 1
  value2?: string | number;        // Mức 2
  value3?: string | number;        // Mức 3
  valueWithVat?: number;           // Giá trị có VAT
  valueNoVat?: number;             // Giá trị không VAT
  
  // Discount Type
  vn?: string;                     // 191920000: %, 191920001: VNĐ
  vndOrPercent?: string;           // Alias cho vn
  
  // Product Conditions
  productCodes?: string;           // Danh sách mã SP (comma-separated)
  crdfd_masanpham_multiple?: string;
  productGroupCodes?: string;      // Danh sách mã nhóm SP
  cr1bb_manhomsp_multiple?: string;
  
  // Total Amount Condition
  totalAmountCondition?: number | string;  // Điều kiện tổng tiền
  tongTienApDung?: number | string;        // Alias
  cr1bb_tongtienapdung?: number | string;  // Field từ CRM
  
  // Quantity Conditions
  quantityCondition?: number;
  soluongapdung?: number;
  cumulativeQuantity?: boolean;    // Cộng dồn số lượng
  
  // Payment Terms
  paymentTerms?: string;
  cr1bb_ieukhoanthanhtoanapdung?: string;
  
  // Dates
  startDate?: string;
  endDate?: string;
  
  // Status
  statecode?: number;              // 0 = Active
  crdfd_promotion_deactive?: string; // 'Active' = Active
}
```

### 2.2. Mapping Field Names

Do có nhiều nguồn dữ liệu (CRM, API, Frontend), các field có thể có tên khác nhau:

| Context | Field Name | Notes |
|---------|------------|-------|
| CRM | `cr1bb_tongtienapdung` | Field gốc từ Dynamics CRM |
| API Response | `totalAmountCondition` | Được map từ CRM |
| Admin App | `totalAmountCondition` | Dùng trong ProductEntryForm, SalesOrderForm |
| Customer App | `tongTienApDung` | Dùng trong cart, product detail |
| TypeScript Interface | Cả 3 tên | Để backward compatibility |

---

## 3. Backend APIs

### 3.1. `/api/admin-app/promotions.ts`

**Mục đích:** Lấy danh sách promotions cho sản phẩm cụ thể (dùng trong admin app)

**Input:**
- `productCode`: Mã sản phẩm (có thể comma-separated)
- `customerCode`: Mã khách hàng
- `region`: Vùng (miền Trung/Nam)
- `paymentTerms`: Điều khoản thanh toán

**Output:**
```typescript
Promotion[] // Danh sách promotions khả dụng
```

**Logic:**
1. Filter promotions theo:
   - `statecode = 0` (Active)
   - `crdfd_promotion_deactive = 'Active'`
   - `startDate <= now AND (endDate >= now OR endDate = null)`
   - `productCode` có trong `crdfd_masanpham_multiple` (contains)
   - `customerCode` có trong `cr3b9_ma_khachhang_apdung` (nếu có)
   - `paymentTerms` khớp (nếu có)
   - **KHÔNG filter theo `totalAmountCondition`** (để frontend tự filter)

2. Normalize payment terms
3. Annotate với `applicable` và `paymentTermsMismatch`

**Đặc điểm:**
- ❌ **KHÔNG filter `totalAmountCondition` ở backend**
- ✅ Frontend phải tự filter sau khi nhận kết quả
- ✅ Có cache và request deduplication

### 3.2. `/api/admin-app/promotion-orders.ts`

**Mục đích:** Lấy promotions cho đơn hàng (Order-level promotions, CK2)

**Input:**
- `soId`: ID Sales Order
- `customerCode`: Mã khách hàng
- `totalAmount`: Tổng tiền đơn hàng
- `productCodes`: Danh sách mã sản phẩm
- `productGroupCodes`: Danh sách mã nhóm sản phẩm
- `paymentTerms`: Điều khoản thanh toán

**Output:**
```typescript
{
  availablePromotions: PromotionOrderItem[];  // Promotions khả dụng
  allPromotions: PromotionOrderItem[];        // Tất cả promotions (trước filter)
  specialPromotions?: PromotionOrderItem[];   // Promotions đặc biệt
}
```

**Logic:**
1. Fetch promotions với filters:
   - `statecode = 0` (Active)
   - `crdfd_promotion_deactive = 'Active'`
   - `startDate <= now AND (endDate >= now OR endDate = null)`
   - `customerCode` match
   - ✅ **Filter `totalAmountCondition`:** `cr1bb_tongtienapdung <= totalAmount` (nếu `totalAmount > 0`)
   - `type = 'Order'` và `chietKhau2 = true`

2. Filter theo product codes/groups (client-side)
3. Enrich với promotion order details nếu có `soId`

**Đặc điểm:**
- ✅ **CÓ filter `totalAmountCondition` ở backend**
- ✅ Chỉ trả về Order-type promotions với CK2
- ⚠️ Inconsistency với `promotions.ts` (một có filter, một không)

### 3.3. `/api/admin-app/save-sale-order-details.ts`

**Mục đích:** Lưu chi tiết đơn hàng và validate promotion

**Validation Logic:**
```typescript
// Validate total amount condition
const minTotalReq = Number(promoData?.cr1bb_tongtienapdung) || 0;
if (minTotalReq > 0 && Number(orderTotal) < minTotalReq) {
  // Skip applying promotion for this product
  promotionApplicableForThisProduct = false;
}
```

**Đặc điểm:**
- ✅ Validate lại ở backend khi save
- ✅ Không fail toàn bộ save, chỉ skip promotion cho sản phẩm đó
- ⚠️ Chỉ check khi `minTotalReq > 0`

---

## 4. Frontend - Admin App

### 4.1. ProductEntryForm.tsx

**Mục đích:** Form thêm sản phẩm vào đơn hàng với promotion

#### **A. Khi Thêm Sản Phẩm (handleAddWithInventoryCheck)**

**Luồng:**
1. User chọn sản phẩm → Auto fetch promotions từ `/api/admin-app/promotions`
2. User chọn promotion (hoặc auto-select promotion đầu tiên)
3. Khi click "Thêm":
   - Tính tổng tiền từ các sản phẩm match với promotion:
     ```typescript
     const calculateTotalForPromotion = (
       products: Array<{...}>,
       promotion: Promotion,
       newProduct?: {...}
     ): number => {
       // Parse productCodes và productGroupCodes từ promotion
       const allowedProductCodes = promotion.productCodes?.split(',') || [];
       const allowedProductGroupCodes = promotion.productGroupCodes?.split(',') || [];
       
       // Tính tổng chỉ từ sản phẩm match
       let total = 0;
       // ... tính từ products hiện tại
       // ... cộng thêm newProduct nếu match
       return total;
     };
     ```
   - So sánh với `totalAmountCondition`:
     ```typescript
     const totalForThisPromotion = calculateTotalForPromotion(
       currentProducts || [],
       sel,
       newProductForCalc
     );
     const meetsTotalCondition = minTotalCondition === 0 || 
                                 totalForThisPromotion >= minTotalCondition;
     ```
   - Nếu đủ điều kiện → áp dụng discount, ngược lại → discount = 0

**Code Location:**
- Lines 2362-2454: Logic check promotion khi thêm sản phẩm
- Lines 2367-2425: Helper `calculateTotalForPromotion`

#### **B. Khi Thay Đổi Quantity/Discount (useEffect)**

**Luồng:**
1. User thay đổi quantity hoặc discount percent
2. Re-check promotion eligibility:
   ```typescript
   const effectiveTotal = calculateTotalForPromotion(
     currentProducts || [],
     selected,
     newProductForCalc
   );
   if (minTotal > 0 && effectiveTotal < minTotal) {
     setPromotionDiscountPercent(0);
     // Show warning
   }
   ```

**Code Location:**
- Lines 2695-2763: Logic re-check khi thay đổi

### 4.2. SalesOrderForm.tsx

**Mục đích:** Form quản lý đơn hàng với promotion

#### **A. Khi Thêm Sản Phẩm (handleAddProduct)**

**Luồng:**
1. User click "Thêm" từ ProductEntryForm
2. Gọi `/api/admin-app/promotion-orders` với:
   - `totalAmount`: Tổng tất cả sản phẩm (để backend filter sơ bộ)
   - `productCode`: Mã sản phẩm đang thêm
   - `productGroupCode`: Mã nhóm sản phẩm
3. Với mỗi promotion từ API, tính lại tổng chính xác:
   ```typescript
   const totalForThisPromotion = calculateTotalForPromotion(
     productList,
     p,
     newProductForCalc
   );
   ```
4. Filter promotions:
   - Percent-based (`vn = 191920000`)
   - `totalForThisPromotion >= totalAmountCondition`
5. Chọn promotion tốt nhất (value cao nhất)
6. Set `eligibleForPromotion = true` nếu có promotion phù hợp
7. Gọi `recalculatePromotionEligibility` để check lại các items khác

**Code Location:**
- Lines 726-1073: `handleAddProduct`
- Lines 786-850: Helper `calculateTotalForPromotion`
- Lines 920-979: Filter và chọn promotion

#### **B. Recalculate Promotion Eligibility**

**Mục đích:** Tính lại promotion cho tất cả items khi có thay đổi

**Luồng:**
1. Fetch promotions cho tất cả product codes (batch)
2. Với mỗi item, filter promotions:
   ```typescript
   const totalForThisPromotion = calculateTotalForPromotion(
     currentProducts,
     p
   );
   const meetsTotal = !minTotal || minTotal === 0 || 
                      totalForThisPromotion >= minTotal;
   ```
3. Chọn promotion tốt nhất cho mỗi item
4. Update items với promotion mới hoặc remove promotion nếu không đủ điều kiện

**Code Location:**
- Lines 99-347: `recalculatePromotionEligibility`
- Lines 119-165: Helper `calculateTotalForPromotion`
- Lines 247-260: Filter promotions theo tổng tiền

### 4.3. ProductTable.tsx

**Logic tương tự SalesOrderForm.tsx**, dùng cho các trường hợp đặc biệt (SOBG, etc.)

**Code Location:**
- Lines 89-350: `recalculatePromotionEligibility`
- Lines 116-165: Helper `calculateTotalForPromotion`

---

## 5. Frontend - Customer App (Cart/Product)

### 5.1. promotionUtils.ts

**Mục đích:** Utility functions cho promotion logic

#### **A. calculatePromotionPrice**

**Logic:**
```typescript
// Nếu có tongTienApDung
if (promotion.tongTienApDung && promotion.productCodes && cartItems) {
  // Tính tổng từ các sản phẩm trong productCodes
  const totalProductValue = calculateCartTotalByProductCodes(
    cartItems, 
    promotion.productCodes
  );
  
  // So sánh với tongTienApDung
  const isValue2Applied = totalProductValue >= promotion.tongTienApDung;
  const promotionValue = isValue2Applied 
    ? (promotion.value2 || promotion.value) 
    : promotion.value;
}
```

**Đặc điểm:**
- ✅ Tính tổng chỉ từ sản phẩm trong `productCodes`
- ✅ Dùng `>=` để áp dụng value2
- ⚠️ Tính tổng từ giá gốc, không xét discount

**Code Location:**
- Lines 144-185: `calculatePromotionPrice`

### 5.2. cartUtils.ts

**Logic tương tự promotionUtils.ts** nhưng có một số khác biệt:

**Đặc điểm:**
- ⚠️ Dùng `<=` để check mức 1 (dễ gây nhầm lẫn)
- ⚠️ Mutate object trực tiếp
- ⚠️ Tính tổng từ `regularPrice` hoặc `cr1bb_giaban`

**Code Location:**
- Lines 148-191: Logic `tongTienApDung`

---

## 6. Logic Tính Tổng Tiền Áp Dụng

### 6.1. Helper Function: calculateTotalForPromotion

**Mục đích:** Tính tổng tiền chỉ từ các sản phẩm match với promotion

**Input:**
- `products`: Danh sách sản phẩm hiện tại trong đơn
- `promotion`: Promotion object
- `newProduct`: Sản phẩm đang thêm (optional)

**Logic:**
```typescript
const calculateTotalForPromotion = (
  products: ProductTableItem[],
  promotion: Promotion,
  newProduct?: {...}
): number => {
  // 1. Parse productCodes và productGroupCodes
  const productCodesStr = promotion.productCodes || 
                          promotion.crdfd_masanpham_multiple || '';
  const productGroupCodesStr = promotion.productGroupCodes || 
                               promotion.cr1bb_manhomsp_multiple || '';
  
  const allowedProductCodes = productCodesStr
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);
  const allowedProductGroupCodes = productGroupCodesStr
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);
  
  // 2. Check có filter không
  const hasProductFilter = allowedProductCodes.length > 0 || 
                           allowedProductGroupCodes.length > 0;
  
  // 3. Tính tổng từ products hiện tại
  let total = 0;
  if (products && products.length > 0) {
    total += products.reduce((sum, item) => {
      const matchesProductCode = !hasProductFilter || 
        (item.productCode && allowedProductCodes.includes(item.productCode));
      const matchesProductGroupCode = !hasProductFilter || 
        (item.productGroupCode && allowedProductGroupCodes.includes(item.productGroupCode));
      
      if (matchesProductCode || matchesProductGroupCode) {
        const basePrice = item.price;  // Dùng BASE PRICE
        const lineSubtotal = basePrice * (item.quantity || 0);
        const lineVat = Math.round((lineSubtotal * (item.vat ?? 0)) / 100);
        return sum + lineSubtotal + lineVat;
      }
      return sum;
    }, 0);
  }
  
  // 4. Thêm newProduct nếu match
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

**Đặc điểm:**
- ✅ Tính tổng chỉ từ sản phẩm match với promotion
- ✅ Dùng **BASE PRICE** (giá gốc), không phải discountedPrice
- ✅ Nếu promotion không có điều kiện về sản phẩm → tính tổng tất cả
- ✅ Match theo productCode HOẶC productGroupCode

**Location:**
- `SalesOrderForm.tsx`: Lines 119-165, 786-850
- `ProductEntryForm.tsx`: Lines 2367-2425, 2700-2763
- `ProductTable.tsx`: Lines 116-165

### 6.2. So Sánh Với Logic Cũ

| Aspect | Logic Cũ | Logic Mới |
|--------|----------|-----------|
| **Tính tổng** | Tất cả sản phẩm trong đơn | Chỉ sản phẩm match với promotion |
| **Match criteria** | Không có | productCode trong `crdfd_masanpham_multiple` HOẶC productGroupCode trong `cr1bb_manhomsp_multiple` |
| **Base price** | BASE PRICE | BASE PRICE (giữ nguyên) |
| **Khi không có filter** | Tính tổng tất cả | Tính tổng tất cả (fallback) |

---

## 7. Luồng Xử Lý Promotion

### 7.1. Luồng Thêm Sản Phẩm (Admin App)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User chọn sản phẩm trong ProductEntryForm                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Auto fetch promotions từ /api/admin-app/promotions        │
│    - Input: productCode, customerCode, paymentTerms          │
│    - Output: Promotion[] (chưa filter totalAmountCondition)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Auto-select promotion đầu tiên (hoặc user chọn)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User click "Thêm" → handleAddWithInventoryCheck           │
│    a. Tính tổng tiền từ sản phẩm match với promotion:        │
│       calculateTotalForPromotion(currentProducts,           │
│                                   promotion,                 │
│                                   newProduct)                │
│    b. So sánh với totalAmountCondition:                      │
│       totalForThisPromotion >= minTotalCondition?            │
│    c. Nếu đủ → áp dụng discount, ngược lại → discount = 0    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Call onAdd() → handleAddProduct trong SalesOrderForm      │
│    a. Gọi /api/admin-app/promotion-orders với totalAmount   │
│    b. Với mỗi promotion, tính lại tổng chính xác:           │
│       calculateTotalForPromotion(productList, promotion,     │
│                                   newProduct)                │
│    c. Filter: percent-based AND meets total condition         │
│    d. Chọn promotion tốt nhất (value cao nhất)               │
│    e. Set eligibleForPromotion = true                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Recalculate promotion eligibility cho TẤT CẢ items        │
│    - Fetch promotions batch cho tất cả product codes          │
│    - Với mỗi item, tính tổng và filter promotions            │
│    - Update items với promotion mới hoặc remove promotion    │
└─────────────────────────────────────────────────────────────┘
```

### 7.2. Luồng Recalculate Promotion

```
┌─────────────────────────────────────────────────────────────┐
│ Trigger: Thêm item mới, thay đổi quantity, thay đổi price   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Fetch promotions batch cho tất cả product codes            │
│    - Input: uniqueCodes[], customerCode, paymentTerms         │
│    - Output: Promotion[] (chưa filter totalAmountCondition)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Với mỗi item trong currentProducts:                       │
│    a. Lấy promotions cho productCode của item                │
│    b. Với mỗi promotion:                                     │
│       - Tính totalForThisPromotion =                         │
│         calculateTotalForPromotion(currentProducts,           │
│                                     promotion)               │
│       - Check: totalForThisPromotion >= totalAmountCondition? │
│    c. Filter: percent-based AND meets total condition        │
│    d. Chọn promotion tốt nhất                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Update items:                                              │
│    - Nếu có promotion phù hợp → áp dụng discount              │
│    - Nếu không đủ điều kiện → remove promotion                │
└─────────────────────────────────────────────────────────────┘
```

### 7.3. Luồng Customer App (Cart)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User thêm sản phẩm vào cart                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch promotion cho sản phẩm                              │
│    - API: /api/getPromotionData hoặc tương tự                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Tính giá promotion:                                       │
│    a. Nếu có tongTienApDung:                                 │
│       - Tính tổng từ sản phẩm trong productCodes:            │
│         calculateCartTotalByProductCodes(cartItems,           │
│                                          productCodes)        │
│       - So sánh: totalProductValue >= tongTienApDung?        │
│       - Nếu đủ → dùng value2, ngược lại → dùng value         │
│    b. Nếu không có tongTienApDung:                           │
│       - Dùng logic theo số lượng (soluongapdung)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Các Trường Hợp Đặc Biệt

### 8.1. Promotion Không Có Điều Kiện Sản Phẩm

**Khi nào:** `productCodes` và `productGroupCodes` đều rỗng

**Xử lý:**
```typescript
const hasProductFilter = allowedProductCodes.length > 0 || 
                         allowedProductGroupCodes.length > 0;

// Nếu không có filter → tính tổng tất cả sản phẩm
if (!hasProductFilter) {
  // Tính tổng tất cả items
}
```

### 8.2. totalAmountCondition = 0 hoặc null

**Xử lý:**
```typescript
const minTotalCondition = Number(sel.totalAmountCondition || 0) || 0;
const meetsTotalCondition = minTotalCondition === 0 || 
                             totalForThisPromotion >= minTotalCondition;
```

**Logic:**
- `totalAmountCondition = 0` → Coi như không có điều kiện → luôn đáp ứng
- `totalAmountCondition = null/undefined` → Không có điều kiện → luôn đáp ứng
- `totalAmountCondition > 0` → Phải đạt điều kiện

### 8.3. Promotion Có Cả productCode Và productGroupCode

**Xử lý:**
```typescript
const matchesProductCode = !hasProductFilter || 
  (item.productCode && allowedProductCodes.includes(item.productCode));
const matchesProductGroupCode = !hasProductFilter || 
  (item.productGroupCode && allowedProductGroupCodes.includes(item.productGroupCode));

// Match nếu có productCode HOẶC productGroupCode
if (matchesProductCode || matchesProductGroupCode) {
  // Tính vào tổng
}
```

**Logic:** Match theo **OR** (HOẶC), không phải AND

### 8.4. Payment Terms Mismatch

**Xử lý:**
```typescript
// Trong promotions.ts API
if (requestedNormalized && promoPaymentTerms) {
  if (!isPaymentTermAllowed(requestedNormalized, promoTermsArray)) {
    applicable = false;
    paymentTermsMismatch = true;
  }
}
```

**Kết quả:**
- Promotion vẫn được trả về nhưng `applicable = false`
- Frontend có thể show warning nhưng vẫn cho phép user chọn

### 8.5. Multiple Promotions Cho Cùng Sản Phẩm

**Xử lý:**
```typescript
// Chọn promotion có value cao nhất
const bestPromo = candidates.reduce((best, current) => {
  const bestVal = Number(best.valueWithVat || best.value) || 0;
  const currVal = Number(current.valueWithVat || current.value) || 0;
  return currVal > bestVal ? current : best;
}, candidates[0]);
```

**Logic:** Ưu tiên promotion có giá trị chiết khấu cao nhất

---

## 9. Validation & Error Handling

### 9.1. Frontend Validation

**ProductEntryForm:**
- ✅ Check `totalAmountCondition` trước khi áp dụng promotion
- ✅ Show warning nếu không đủ điều kiện
- ✅ Không fail, chỉ set discount = 0

**SalesOrderForm:**
- ✅ Validate khi thêm sản phẩm
- ✅ Recalculate khi có thay đổi
- ✅ Log đầy đủ để debug

### 9.2. Backend Validation

**save-sale-order-details.ts:**
```typescript
// Validate total amount condition
const minTotalReq = Number(promoData?.cr1bb_tongtienapdung) || 0;
if (minTotalReq > 0 && Number(orderTotal) < minTotalReq) {
  promotionApplicableForThisProduct = false;
  // Log warning, không fail save
}
```

**Đặc điểm:**
- ✅ Validate lại ở backend
- ✅ Không fail toàn bộ save
- ✅ Chỉ skip promotion cho sản phẩm đó

### 9.3. Error Handling

**API Errors:**
- Try-catch trong tất cả API calls
- Fallback về state cũ nếu có lỗi
- Log đầy đủ để debug

**Calculation Errors:**
- Validate input trước khi tính toán
- Handle NaN, null, undefined
- Fallback về giá trị mặc định

---

## 10. Performance & Optimization

### 10.1. Caching

**Backend:**
- `promotions.ts`: Có cache với TTL ngắn
- `promotion-orders.ts`: Có cache cho promotion data
- Request deduplication để tránh duplicate calls

**Frontend:**
- ProductDataCache trong ProductEntryForm
- Cache promotions theo productCode + customerCode

### 10.2. Batch Requests

**SalesOrderForm:**
```typescript
// Fetch promotions batch cho tất cả product codes
const promotionsAll = await fetchProductPromotionsBatch(
  uniqueCodes,
  customerCode,
  region,
  paymentTerms
);
```

**Lợi ích:**
- Giảm số lượng API calls
- Tăng performance khi có nhiều sản phẩm

### 10.3. Optimization Tips

1. **Tính tổng chỉ khi cần:**
   - Chỉ tính khi có `totalAmountCondition > 0`
   - Cache kết quả tính toán nếu có thể

2. **Filter sớm:**
   - Backend filter khi có thể
   - Frontend filter thêm để chính xác

3. **Debounce recalculate:**
   - Debounce khi user thay đổi quantity/price
   - Tránh recalculate quá nhiều lần

---

## 📊 Tóm Tắt

### ✅ Điểm Mạnh

1. **Logic tính tổng chính xác:** Chỉ tính từ sản phẩm match với promotion
2. **Validation nhiều lớp:** Frontend + Backend
3. **Error handling tốt:** Không fail toàn bộ, chỉ skip promotion
4. **Debug log đầy đủ:** Dễ trace và fix bugs
5. **Performance optimization:** Cache, batch requests, deduplication

### ⚠️ Cần Cải Thiện

1. **Inconsistency giữa APIs:**
   - `promotions.ts` không filter `totalAmountCondition`
   - `promotion-orders.ts` có filter
   - → Nên thống nhất

2. **Xử lý `totalAmountCondition = 0`:**
   - Hiện tại coi như không có điều kiện
   - Cần confirm với business logic

3. **Tên field không nhất quán:**
   - `totalAmountCondition` vs `tongTienApDung` vs `cr1bb_tongtienapdung`
   - → Nên chuẩn hóa

4. **Logic Customer App vs Admin App:**
   - Customer App: Tính tổng từ `productCodes`
   - Admin App: Tính tổng từ sản phẩm match với promotion
   - → Có thể khác nhau, cần review

---

## 🔗 References

- [Review Promotion Tổng Tiền Admin App](./REVIEW_PROMOTION_TONG_TIEN_ADMIN_APP.md)
- [Review Promotion Tổng Tiền Áp Dụng](./REVIEW_PROMOTION_TONG_TIEN_AP_DUNG.md)
- [Promotion Model](../src/model/promotion.ts)
- [Promotion Utils](../src/utils/promotionUtils.ts)

---

**Người tạo:** Auto (AI Assistant)  
**Ngày cập nhật:** 2025-01-27  
**Version:** 2.0
