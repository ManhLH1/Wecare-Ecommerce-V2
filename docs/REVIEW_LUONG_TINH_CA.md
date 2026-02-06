# Review Luồng Tính Ca

## 📋 Tổng quan

Hệ thống có 2 khái niệm "ca" liên quan đến tính toán ngày giao hàng:

1. **Leadtime theo ca** (1 ca = 12 giờ) - Dùng để tính số giờ leadtime
2. **Ca giao hàng** (Ca sáng/Ca chiều) - Xác định ca giao hàng dựa trên giờ của ngày giao

---

## 1. Leadtime theo ca (1 ca = 12 giờ)

### 1.1 Định nghĩa

- **1 ca = 12 giờ** (không phải 24 giờ)
- Dùng để tính leadtime từ kho đến khách hàng
- Có 2 cách tính:
  - **24/7**: Tính liên tục, bao gồm cả T7/CN
  - **Skip Weekend**: Chỉ tính giờ trong tuần (Mon-Fri)

### 1.2 Các nguồn leadtime theo ca

#### A. Leadtime quận/huyện (districtLeadtime)
- Lấy từ **Sales Setting** → Quận/Huyện → `cr1bb_leadtimetheoca`
- Áp dụng cho **hàng còn tồn kho**
- Tính **24/7** (bao gồm T7/CN)
- Ví dụ: Quận 1 = 2 ca = 24 giờ

#### B. Leadtime bổ sung cho hàng hết tồn kho

| Kho | Bình thường | Apollo/Kim Tín |
|-----|-------------|----------------|
| **KHOHCM** | +2 ca | +6 ca |
| **KHOBD** | +4 ca | +6 ca |

**Lưu ý:**
- KHOHCM: Skip weekend (chỉ tính Mon-Fri)
- KHOBD: Tính 24/7 (bao gồm T7/CN)

#### C. Leadtime từ Promotion
- Field: `crdfd_promotions.cr1bb_leadtimepromotion` (số ca)
- Chỉ áp dụng khi:
  - Promotion được chọn
  - `cr1bb_leadtimepromotion` không rỗng
  - `cr1bb_phanloaichuongtrinh` = 'Hãng' hoặc null
- Tính **24/7** (bao gồm T7/CN)

### 1.3 Luồng tính leadtime theo ca

```
┌─────────────────────────────────────────────────────────────┐
│              BẮT ĐẦU TÍNH LEADTIME THEO CA                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │ Có districtLeadtime?             │
            │ (từ Sales Setting)                │
            └─────────────────────────────────┘
                   │                    │
                  YES                   NO
                   │                    │
                   ▼                    ▼
    ┌────────────────────────┐   ┌────────────────────────┐
    │ LOGIC 2025             │   │ LOGIC LEGACY           │
    │ (Ưu tiên cao nhất)     │   │ (Tương thích ngược)   │
    └────────────────────────┘   └────────────────────────┘
```

#### Logic 2025 (Có districtLeadtime)

```
┌─────────────────────────────────────────────────────────────┐
│              CÓ DISTRICT LEADTIME                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │ Hết hàng?                        │
            │ (requestedQty > theoreticalStock)│
            └─────────────────────────────────┘
                   │                    │
                  YES                   NO
                   │                    │
                   ▼                    ▼
    ┌────────────────────────┐   ┌────────────────────────┐
    │ HẾT HÀNG               │   │ CÒN HÀNG               │
    │                        │   │                        │
    │ Tổng = district +     │   │ Tổng = district        │
    │       ca bổ sung       │   │                        │
    │                        │   │ Tính 24/7              │
    │ KHOHCM: Skip weekend   │   │ (T7/CN tính)           │
    │ KHOBD: 24/7            │   │                        │
    └────────────────────────┘   └────────────────────────┘
```

**Ví dụ:**
- KHOHCM + Quận 2 ca + Hết hàng = 2 + 2 = **4 ca** (Skip weekend)
- KHOBD + Quận 2 ca + Hết hàng = 2 + 4 = **6 ca** (24/7)
- KHOHCM + Quận 2 ca + Apollo = 2 + 6 = **8 ca** (Skip weekend)

#### Logic Legacy (Không có districtLeadtime)

```
┌─────────────────────────────────────────────────────────────┐
│              KHÔNG CÓ DISTRICT LEADTIME                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │ Ưu tiên 1: Promotion?             │
            │ (cr1bb_leadtimepromotion)         │
            └─────────────────────────────────┘
                   │                    │
                  YES                   NO
                   │                    │
                   ▼                    ▼
    ┌────────────────────────┐   ┌────────────────────────┐
    │ + (promo * 12h)       │   │ Ưu tiên 2: Shop?      │
    │ (24/7 + adjust)       │   │ (varNganhNghe)        │
    └────────────────────────┘   └────────────────────────┘
                                       │                    │
                                      YES                   NO
                                       │                    │
                                       ▼                    ▼
                            ┌──────────────────┐   ┌──────────────────┐
                            │ + (quanhuyen*12) │   │ Ưu tiên 3: OOS?  │
                            │ (24/7 + adjust)  │   │ (requested>stock)│
                            └──────────────────┘   └──────────────────┘
                                                      │                    │
                                                     YES                   NO
                                                      │                    │
                                                      ▼                    ▼
                                           ┌──────────────────┐   ┌──────────────────┐
                                           │ Weekend Reset!   │   │ Default:         │
                                           │ + SP_leadtime    │   │ +1 working day   │
                                           │ (T7>12/CN→T2)    │   │ (Mon-Fri)        │
                                           └──────────────────┘   └──────────────────┘
```

### 1.4 Các hàm tính toán leadtime theo ca

#### A. `addDaysWithFraction()` - Tính 24/7
```typescript
// 1 ca = 12 hours, count continuously including T7/CN
function addDaysWithFraction(base: Date, days: number): Date {
  const d = new Date(base);
  const totalHours = Math.round(days * 12);
  d.setHours(d.getHours() + totalHours);
  return d;
}
```

**Dùng cho:**
- District leadtime (hàng còn)
- KHOBD (hàng hết)
- Promotion leadtime (legacy)

#### B. `addWorkingDaysWithFraction()` - Skip Weekend
```typescript
// 1 ca = 12 hours, count only Mon-Fri hours
function addWorkingDaysWithFraction(base: Date, days: number, warehouseCode?: string): Date {
  // KHOHCM: Skip weekend (Mon-Fri only)
  // KHOBD: 24/7 calculation
}
```

**Dùng cho:**
- KHOHCM (hàng hết)
- District leadtime + hết hàng (KHOHCM)

---

## 2. Ca giao hàng (Ca sáng/Ca chiều)

### 2.1 Định nghĩa

- **Ca sáng**: 0:00 - 12:00 (OptionSet = `283640000`)
- **Ca chiều**: 12:00 - 23:59 (OptionSet = `283640001`)
- Xác định dựa trên **giờ** của ngày giao hàng đã tính

### 2.2 Luồng tính ca giao hàng

```
┌─────────────────────────────────────────────────────────────┐
│              TÍNH CA GIAO HÀNG                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │ Đã có ngày giao hàng?             │
            │ (deliveryDateNew)                 │
            └─────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │ Lấy giờ của ngày giao hàng       │
            │ hour = result.getHours()          │
            └─────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │ hour >= 0 && hour <= 12?         │
            └─────────────────────────────────┘
                   │                    │
                  YES                   NO
                   │                    │
                   ▼                    ▼
        ┌──────────────────┐   ┌──────────────────┐
        │ CA_SANG          │   │ CA_CHIEU         │
        │ (283640000)      │   │ (283640001)      │
        └──────────────────┘   └──────────────────┘
```

### 2.3 Code tính ca giao hàng

#### Trong `computeDeliveryDate.ts`:
```typescript
const hour = result.getHours();
const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
```

#### Trong `save-sale-order-details.ts`:
```typescript
const hour = result.getHours();
const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
```

#### Trong `save-sobg-details.ts`:
```typescript
const hour = result.getHours();
const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
```

### 2.4 Lưu vào CRM

#### Sale Order Details:
- Field: `cr1bb_ca` (OptionSet)
- Value: `283640000` (Ca sáng) hoặc `283640001` (Ca chiều)

#### SOD Báo Giá:
- Field: `cr1bb_ca` (OptionSet)
- Value: `283640000` (Ca sáng) hoặc `283640001` (Ca chiều)

---

## 3. Điều chỉnh Chủ nhật (Sunday Adjustment)

### 3.1 Quy tắc

**Chỉ áp dụng cho KHOHCM:**

| Ngày giao tính | Giờ | Kết quả |
|---------------|-----|---------|
| Thứ 7 | < 12:00 | Giữ nguyên |
| Thứ 7 | ≥ 12:00 | → Thứ 2, 08:00 |
| Chủ nhật | Any | → Thứ 2, 08:00 |

### 3.2 Code

```typescript
function applySundayAdjustment(resultDate: Date, warehouseCode?: string): Date {
  if (warehouseCode === 'KHOHCM') {
    const day = resultDate.getDay(); // 0 = Sun, 6 = Sat
    const hour = resultDate.getHours();
    if (day === 0 || (day === 6 && hour >= 12)) {
      const daysToAdd = day === 0 ? 1 : 2;
      const monday = new Date(resultDate);
      monday.setDate(resultDate.getDate() + daysToAdd);
      monday.setHours(8, 0, 0, 0); // Monday 8:00 AM
      return monday;
    }
  }
  return resultDate;
}
```

**Lưu ý:** Sau khi điều chỉnh, ca giao hàng sẽ được tính lại dựa trên giờ mới (08:00 = Ca sáng).

---

## 4. Weekend Reset (Legacy)

### 4.1 Quy tắc

**Chỉ áp dụng cho hàng hết tồn kho (Legacy logic):**

- Thứ 7 sau 12:00 → Reset về Thứ 2, 08:00
- Chủ nhật → Reset về Thứ 2, 08:00

### 4.2 Code

```typescript
function getWeekendResetTime(orderTime: Date): Date {
  const d = new Date(orderTime);
  const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

  if ((dayOfWeek === 6 && d.getHours() >= 12) || dayOfWeek === 0) {
    const daysToAdd = dayOfWeek === 6 ? 2 : 1;
    d.setDate(d.getDate() + daysToAdd);
    d.setHours(8, 0, 0, 0); // Monday 8:00 AM
    return d;
  }
  return orderTime;
}
```

**Lưu ý:** Logic 2025 **KHÔNG** dùng weekend reset cho hàng hết tồn kho (tính trực tiếp 24/7 hoặc skip weekend).

---

## 5. So sánh Logic 2025 vs Legacy

| Đặc điểm | Logic 2025 | Legacy |
|----------|-----------|--------|
| **Weekend Reset** | ❌ Không có | ✅ Có (chỉ OOS) |
| **Hàng còn** | 24/7 + adjust CN | Default +1 WD |
| **Hàng hết** | Kho + skip/24/7 | SP_leadtime + reset |
| **District leadtime** | ✅ Ưu tiên cao nhất | ❌ Không có |
| **Tốc độ** | Nhanh hơn | Chậm hơn |

---

## 6. Các file liên quan

### 6.1 Core Logic
- `src/utils/computeDeliveryDate.ts` - Hàm tính ngày giao hàng chính
- `pages/api/admin-app/save-sale-order-details.ts` - Tính ca cho Sale Order
- `pages/api/admin-app/save-sobg-details.ts` - Tính ca cho SO Báo Giá

### 6.2 Validation
- `pages/api/admin-app/leadtime-validation.ts` - Validate leadtime

### 6.3 Documentation
- `docs/LEADTIME_FLOW.md` - Tài liệu chi tiết về leadtime

---

## 7. Ví dụ minh họa

### Ví dụ 1: KHOHCM + Còn hàng + Quận 2 ca
```
Input: T6 18:00, district=2, còn hàng
Tính leadtime: 18:00 T6 + 24h = 18:00 T7
Adjust CN: T7 18:00 ≥ 12:00 → T2 08:00
Tính ca: 08:00 → CA_SANG
Output: Thứ 2, 08:00, Ca sáng
```

### Ví dụ 2: KHOHCM + Hết hàng + Quận 2 ca
```
Input: T4 10:00, district=2, hết hàng
Tính leadtime: Tổng = 2 + 2 = 4 ca = 48h
KHOHCM skip weekend → T4 10:00 → T6 10:00
Tính ca: 10:00 → CA_SANG
Output: Thứ 6, 10:00, Ca sáng
```

### Ví dụ 3: KHOBD + Hết hàng + Apollo
```
Input: T7 10:00, district=2, hết hàng, Apollo
Tính leadtime: Tổng = 2 + 6 = 8 ca = 96h
KHOBD 24/7 → T7 10:00 + 96h = CN 10:00
Tính ca: 10:00 → CA_SANG
Output: Chủ nhật, 10:00, Ca sáng (KHOBD không adjust CN)
```

### Ví dụ 4: KHOBD + Còn hàng + Quận 2 ca
```
Input: T7 10:00, district=2, còn hàng
Tính leadtime: T7 10:00 + 24h = CN 10:00
Tính ca: 10:00 → CA_SANG
Output: Chủ nhật, 10:00, Ca sáng (KHOBD không adjust CN)
```

---

## 8. Xử lý Timezone & CreatedOn

### 8.1 Kiểm tra: Có +7h đối với createdOn không?

**Kết luận: KHÔNG**, luồng tính ca ở SO và SOBG **KHÔNG** đang +7h đối với `createdOn`.

#### A. SO (Sale Order Details)

```typescript
// Lấy createdon từ CRM
const soResp = await apiClient.get(`${SALE_ORDERS_TABLE}(${soId})?$select=createdon`, { headers });
orderCreatedOn = soData.createdon;

// Parse - KHÔNG có +7h
let orderTime = orderCreatedOn ? new Date(orderCreatedOn) : new Date();
```

**File:** `pages/api/admin-app/save-sale-order-details.ts:827`

#### B. SOBG (SO Báo Giá Details)

```typescript
// Hiện tại: undefined (TODO: get from SOBG record)
orderCreatedOn?: string

// Parse - KHÔNG có +7h
let effectiveOrderTime = orderCreatedOn ? new Date(orderCreatedOn) : new Date();
```

**File:** `pages/api/admin-app/save-sobg-details.ts:1270`

#### C. Frontend (Business Rule Check)

```typescript
// Có +7h nhưng CHỈ để check business rule (có thể add product hay không)
// KHÔNG dùng trong tính toán ca
const sevenHoursLater = new Date(createdDate);
sevenHoursLater.setHours(sevenHoursLater.getHours() + 7);
```

**File:** `src/app/admin-app/sale-orders/page.tsx:46`

**Lưu ý:** Frontend dùng +7h để check xem có thể add product sau 7 giờ từ lúc tạo đơn, nhưng **KHÔNG** dùng trong tính toán ca giao hàng.

### 8.2 Vấn đề Timezone & Khuyến nghị

**Vấn đề:**
- CRM trả về `createdon` dạng UTC (ví dụ: `"2025-01-15T10:00:00Z"`)
- JavaScript `new Date()` tự động convert về **local timezone** của server
- Nếu server ở GMT+7, sẽ có offset 7 giờ tự động
- **Nhưng:** Cần đảm bảo tính toán leadtime dựa trên giờ Việt Nam (GMT+7)

**Ví dụ:**
```typescript
// CRM trả về: "2025-01-15T10:00:00Z" (UTC)
const orderTime = new Date("2025-01-15T10:00:00Z");
// Server GMT+7 → orderTime = 2025-01-15 17:00:00 (GMT+7)
// → getHours() = 17 (chiều) thay vì 10 (sáng)
```

**⚠️ KHuyến nghị: CreatedOn cần +7h trước khi tính toán leadtime**

Để đảm bảo tính toán chính xác theo giờ Việt Nam (GMT+7), cần normalize `createdOn` từ UTC sang GMT+7 trước khi tính toán:

```typescript
/**
 * Normalize createdOn từ UTC sang GMT+7 (Việt Nam)
 * @param createdOn - Timestamp từ CRM (UTC format, ví dụ: "2025-01-15T10:00:00Z")
 * @returns Date object đã được điều chỉnh +7h (giờ Việt Nam)
 */
function normalizeCreatedOnToVietnamTime(createdOn: string | undefined): Date {
  if (!createdOn) {
    return new Date(); // Fallback to current time
  }
  
  // Parse UTC time
  const utcDate = new Date(createdOn);
  if (isNaN(utcDate.getTime())) {
    return new Date(); // Fallback if invalid
  }
  
  // Add 7 hours (7 * 60 * 60 * 1000 milliseconds) to convert UTC to GMT+7
  const vietnamTime = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
  
  return vietnamTime;
}
```

**Ví dụ:**
```typescript
// Input: "2025-01-15T10:00:00Z" (UTC)
// Output: Date object với giờ = 17:00 (GMT+7)
// → getHours() = 17 (chiều) - đúng với giờ Việt Nam
```

**Cách sử dụng:**

```typescript
// SO (save-sale-order-details.ts)
let orderTime = normalizeCreatedOnToVietnamTime(orderCreatedOn);

// SOBG (save-sobg-details.ts)
let effectiveOrderTime = normalizeCreatedOnToVietnamTime(orderCreatedOn);
```

**Lý do:**
- CRM lưu `createdon` ở UTC (GMT+0)
- Business logic cần tính theo giờ Việt Nam (GMT+7)
- Đảm bảo tính toán leadtime và ca giao hàng chính xác theo múi giờ địa phương
- Tránh sai lệch khi server chạy ở timezone khác

**Quan trọng:** 
- Phải áp dụng cho **CẢ** SO và SOBG
- Phải normalize **TRƯỚC** khi tính toán leadtime
- Giữ nguyên logic tính ca sau khi đã normalize

---

## 9. Vấn đề tiềm ẩn & Khuyến nghị

### 9.1 Vấn đề

1. **Inconsistency giữa các file:**
   - Logic tính ca được duplicate ở 3 file khác nhau
   - Có thể dẫn đến bug khi update logic

2. **Hardcode OptionSet values:**
   - `CA_SANG = 283640000`
   - `CA_CHIEU = 283640001`
   - Nên tách ra constants file

3. **Logic tính ca đơn giản:**
   - Chỉ dựa vào giờ (0-12 = sáng, >12 = chiều)
   - Không xét đến business rules phức tạp hơn

4. **SOBG thiếu orderCreatedOn:**
   - Hiện tại: `undefined` (TODO comment)
   - Cần fetch từ SOBG record để tính chính xác

5. **Timezone chưa được normalize:**
   - `createdOn` từ CRM là UTC nhưng chưa được +7h
   - Cần normalize trước khi tính toán leadtime
   - Xem phần 8.2 để biết cách implement

### 9.2 Khuyến nghị

1. **⚠️ Ưu tiên: Normalize timezone cho createdOn:**
   - Tạo helper function `normalizeCreatedOnToVietnamTime()` (xem phần 8.2)
   - Áp dụng cho **CẢ** SO và SOBG
   - Normalize **TRƯỚC** khi tính toán leadtime

2. **Tách logic tính ca ra utility function:**
   ```typescript
   // src/utils/calculateShift.ts
   export function calculateShift(deliveryDate: Date): number {
     const hour = deliveryDate.getHours();
     return (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
   }
   ```

3. **Tạo constants file:**
   ```typescript
   // src/constants/crmOptions.ts
   export const CA_SANG = 283640000;
   export const CA_CHIEU = 283640001;
   ```

4. **Unify logic:**
   - Dùng `computeDeliveryDate()` từ `computeDeliveryDate.ts` cho tất cả cases
   - Tránh duplicate logic

5. **Thêm unit tests:**
   - Test các edge cases (T7, CN, giờ biên)
   - Test logic 2025 vs Legacy
   - Test timezone normalization (UTC → GMT+7)

---

## 10. Checklist Review

### ✅ Logic tính leadtime theo ca
- [x] District leadtime (24/7) cho hàng còn
- [x] Ca bổ sung cho hàng hết (KHOHCM: skip, KHOBD: 24/7)
- [x] Apollo/Kim Tín promotion (+6 ca)
- [x] Legacy promotion leadtime
- [x] Legacy Shop industry logic

### ✅ Logic tính ca giao hàng
- [x] Tính từ giờ của ngày giao
- [x] 0-12 = Ca sáng, >12 = Ca chiều
- [x] Lưu vào CRM (cr1bb_ca)

### ✅ Điều chỉnh đặc biệt
- [x] Sunday adjustment (KHOHCM only)
- [x] Weekend reset (Legacy only)

### ⚠️ Cần cải thiện
- [ ] **Ưu tiên:** Normalize timezone cho createdOn (+7h)
- [ ] Tách logic tính ca ra utility
- [ ] Tạo constants file
- [ ] Thêm unit tests
- [ ] Unify logic giữa các file

---

## 11. Kết luận

Luồng tính ca hiện tại hoạt động đúng nhưng có thể cải thiện:

1. **Ưu điểm:**
   - Logic rõ ràng, dễ hiểu
   - Hỗ trợ cả Logic 2025 và Legacy
   - Xử lý đúng các edge cases (T7, CN)

2. **Nhược điểm:**
   - **Timezone chưa được normalize:** createdOn từ CRM (UTC) chưa được +7h
   - Code duplicate ở nhiều file
   - Hardcode OptionSet values
   - Thiếu unit tests

3. **Hướng cải thiện:**
   - **Ưu tiên:** Normalize timezone cho createdOn (+7h) trước khi tính toán
   - Refactor để tái sử dụng code
   - Tách constants ra file riêng
   - Thêm unit tests
