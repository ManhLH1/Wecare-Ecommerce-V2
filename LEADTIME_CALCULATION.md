# Logic Tính Ngày Giao (Lead Time) trong Admin App - 2025 Update

## Tổng quan

Admin App có **2 hệ thống tính toán ngày giao** riêng biệt với **logic mới 2025**:

1. **Frontend Auto-Calculation**: Tính toán ngay lập tức khi nhập liệu
2. **Backend Calculation**: Tính toán khi lưu dữ liệu

## 1. Frontend Auto-Calculation - Logic Mới 2025

### Vị trí
- `src/app/admin-app/_components/ProductEntryForm.tsx` (useEffect dòng 2114-2194)
- `src/utils/computeDeliveryDate.ts`

### Trigger
Khi có thay đổi về:
- Sản phẩm được chọn
- Khuyến mãi được chọn
- Số lượng nhập
- Đơn vị được chọn
- Thông tin khách hàng

### Thứ tự ưu tiên mới (2025)

#### 1. Leadtime theo quận/huyện (Ưu tiên cao nhất)
```typescript
if (districtLeadtime && districtLeadtime > 0) {
  let result = addWorkingDays(effectiveOrderTime, districtLeadtime);
  result = applySundayAdjustment(result, warehouseCode);
  return result;
}
```

**Chi tiết:**
- Đơn vị: **ca làm việc** (working days)
- Bỏ qua thứ 7, Chủ nhật
- Kho HCM: Nếu kết quả rơi vào Chủ nhật → dời sang Thứ 2
- Không áp dụng cut-off weekend

#### 2. Rule cho hàng thiếu tồn kho (Chỉ áp dụng khi hết hàng)
```typescript
const isOutOfStock = requestedQty > theoreticalStock;
if (isOutOfStock && warehouseCode) {
  // Logic theo kho và promotion
}
```

**Chi tiết theo kho:**

##### **Kho HCM:**
- **Hàng bình thường:** +2 ca
- **Promotion Apollo/Kim Tín:** +6 ca

##### **Kho Bình Định:**
- **Hàng bình thường:** +4 ca
- **Promotion Apollo/Kim Tín:** +6 ca

**Xác định promotion Apollo/Kim Tín:**
```typescript
function isApolloKimTinPromotion(promotion) {
  const name = promotion?.name?.toLowerCase() || '';
  return name.includes('apollo') || name.includes('kim tín');
}
```

#### 3. Cut-off & Weekend (Chỉ áp dụng cho hàng thiếu tồn)

##### **Weekend Reset:**
```typescript
if ((dayOfWeek === 6 && hour >= 12) || dayOfWeek === 0) {
  // Thứ 7 sau 12:00 hoặc Chủ nhật → reset sang sáng Thứ 2 (8:00)
  return nextMonday.setHours(8, 0, 0, 0);
}
```

##### **Chủ Nhật Adjustment (chỉ Kho HCM):**
```typescript
if (warehouseCode === 'KHOHCM' && resultDate.getDay() === 0) {
  // Chủ nhật → Thứ 2
  return addDays(resultDate, 1);
}
```

#### 4. Default (Legacy)
```typescript
return addWorkingDays(effectiveOrderTime, 1); // +1 working day
```

### Logic cũ (trước 2025) - Backward Compatibility

#### 1. Promotion Lead Time
```typescript
if (promotion && promoLead !== undefined &&
    (promoPhanLoai === undefined || promoPhanLoai === 'Hãng')) {
  return Now() + (promoLead * 12) giờ
}
```

#### 2. Khách hàng ngành "Shop"
```typescript
if (varNganhNghe === 'Shop') {
  return Now() + (districtLeadtime * 12) giờ
}
```

#### 3. Kiểm tra tồn kho (cũ)
```typescript
if (requestedQty > theoreticalStock) {
  return Today() + productLeadTime (ngày)
}
```

### Fallback Logic
Nếu có lỗi trong tính toán chính:
```typescript
const daysToAdd = (quantity > stockQuantity) ? 2 : 1;
return Today() + daysToAdd ngày
```

## 2. Backend Calculation - Cập nhật 2025

### Vị trí
- `pages/api/admin-app/save-sale-order-details.ts` (hàm `calculateDeliveryDateAndShift`)
- `pages/api/admin-app/save-sobg-details.ts` (hàm `calculateDeliveryDateAndShift`)

### Trigger
Khi gọi API save (`saveSaleOrderDetails` hoặc `saveSOBGDetails`)

### Tham số mới (2025)
```typescript
interface CalculateDeliveryDateAndShiftParams {
  product: SaleOrderDetailInput;
  allProducts: SaleOrderDetailInput[];
  customerIndustry?: number;
  baseDeliveryDate?: string;
  warehouseCode?: string;        // NEW: 'KHOHCM' | 'KHOBD'
  orderCreatedOn?: string;       // NEW: Timestamp tạo đơn
  districtLeadtime?: number;     // NEW: Leadtime quận/huyện (ca)
}
```

### Logic tính toán mới (2025)

#### 1. Weekend Reset (áp dụng cho tất cả)
```typescript
function getWeekendResetTime(orderTime: Date): Date {
  const dayOfWeek = orderTime.getDay(); // 0 = Sunday, 6 = Saturday

  if ((dayOfWeek === 6 && orderTime.getHours() >= 12) || dayOfWeek === 0) {
    // Thứ 7 sau 12:00 hoặc Chủ nhật → reset sang sáng Thứ 2
    const daysToAdd = dayOfWeek === 6 ? 2 : 1;
    const monday = new Date(orderTime);
    monday.setDate(orderTime.getDate() + daysToAdd);
    monday.setHours(8, 0, 0, 0); // 8:00 AM Monday
    return monday;
  }

  return orderTime;
}
```

#### 2. Leadtime theo quận/huyện (ưu tiên cao nhất)
```typescript
if (districtLeadtime && districtLeadtime > 0) {
  let result = addWorkingDays(effectiveOrderTime, districtLeadtime);
  result = applySundayAdjustment(result, warehouseCode);
  return { deliveryDateNew: result.toISOString().split('T')[0], shift };
}
```

#### 3. Rule cho hàng thiếu tồn kho
```typescript
const isOutOfStock = requestedQty > theoreticalStock;
if (isOutOfStock && warehouseCode) {
  let leadtimeCa = 0;

  if (warehouseCode === 'KHOHCM') {
    leadtimeCa = isApolloKimTinPromotion(product) ? 6 : 2;
  } else if (warehouseCode === 'KHOBD') {
    leadtimeCa = isApolloKimTinPromotion(product) ? 6 : 4;
  }

  if (leadtimeCa > 0) {
    let result = addWorkingDays(effectiveOrderTime, leadtimeCa);
    result = applySundayAdjustment(result, warehouseCode);
    return { deliveryDateNew: result.toISOString().split('T')[0], shift };
  }
}
```

#### 4. Chủ Nhật Adjustment (chỉ kho HCM)
```typescript
function applySundayAdjustment(resultDate: Date, warehouseCode?: string): Date {
  if (warehouseCode === 'KHOHCM' && resultDate.getDay() === 0) {
    return addDays(resultDate, 1); // Chủ nhật → Thứ 2
  }
  return resultDate;
}
```

### Logic cũ (Backward Compatibility)

#### Điều kiện áp dụng
**Chỉ áp dụng cho khách hàng ngành "Shop"** (`customerIndustry === 191920001`)

#### Logic tính toán theo loại sản phẩm

##### Thiết bị nước hoặc Ống cứng PVC
```typescript
if (thietBiNuoc.length > 0 &&
    ((countThietBiNuoc >= 50 && sumThietBiNuoc >= 100_000_000) ||
     sumOngCung >= 100_000_000)) {
  if (sumThietBiNuoc >= 200_000_000 || sumOngCung >= 200_000_000) {
    leadTimeHours = 24; // 24 giờ
  } else {
    leadTimeHours = 12; // 12 giờ
  }
}
```

##### Thiết bị điện
```typescript
if (thietBiDien.length > 0 && sumThietBiDien >= 200_000_000) {
  leadTimeHours = 12; // 12 giờ
}
```

##### Vật tư kim khí
```typescript
if (vatTuKimKhi.length > 0 && countKimKhi >= 100) {
  leadTimeHours = 12; // 12 giờ
}
```

### Tính toán ngày giao mới (legacy)
```typescript
const newDate = new Date(baseDeliveryDate);
newDate.setHours(newDate.getHours() + leadTimeHours);
```

### Xác định ca làm việc
- **CA_SANG** (283640000): 0:00 - 12:00
- **CA_CHIEU** (283640001): 12:00 - 23:59

```typescript
const hour = newDate.getHours();
const shift = (hour >= 0 && hour <= 12) ? CA_SANG : CA_CHIEU;
```

## 3. Phân loại sản phẩm

### Thiết bị nước
- Danh mục cấp 2: "Thiết bị nước"
- Hoặc danh mục cấp 4: "Ống cứng PVC"

### Thiết bị điện
- Danh mục cấp 2: "Thiết bị điện"

### Vật tư kim khí
- Danh mục cấp 2: "Vật tư kim khí"

## 4. Lưu trữ kết quả

### Frontend
- Hiển thị ngay trong form nhập liệu
- Cập nhật state `deliveryDate`

### Backend - SO (Sales Order)
- `crdfd_ngaygiaodukientonghop`: Ngày giao từ form (YYYY-MM-DD)
- `crdfd_exdeliverrydate`: Ngày giao tính toán (YYYY-MM-DD)
- `cr1bb_ca`: Ca làm việc (OptionSet)

### Backend - SOBG (Sales Order Báo Giá)
- `crdfd_ngaygiaodukien`: Ngày giao tính toán (YYYY-MM-DD)
- `cr1bb_ca`: Ca làm việc (OptionSet)

## 5. Sự khác biệt giữa 2 hệ thống

| Frontend Logic | Backend Logic |
|----------------|---------------|
| Tính ngay khi nhập liệu | Tính khi lưu dữ liệu |
| Dựa trên từng sản phẩm | Dựa trên toàn bộ đơn hàng |
| Sử dụng `computeDeliveryDate` | Sử dụng `calculateDeliveryDateAndShift` |
| Ưu tiên promotion lead time | Chỉ áp dụng cho Shop với điều kiện tổng tiền |
| Logic Canvas/PowerApps | Logic nghiệp vụ đặc thù |

## 6. Lưu ý quan trọng

1. **Frontend hiển thị** có thể khác với **Backend lưu trữ**
2. **Promotion lead time** override tất cả logic khác
3. **Backend logic** chỉ áp dụng cho khách hàng Shop với điều kiện doanh số
4. **Fallback logic** đảm bảo hệ thống luôn có ngày giao
5. **Ca làm việc** được tính dựa trên giờ của ngày giao cuối cùng

## 7. Các trường dữ liệu quan trọng

### Frontend Parameters (2025)
- `warehouseCode`: Mã kho ('KHOHCM' | 'KHOBD')
- `orderCreatedOn`: Thời gian tạo đơn
- `districtLeadtime`: Leadtime quận/huyện (ca)

### Legacy Parameters
- `cr1bb_leadtimepromotion`: Lead time promotion (ngày)
- `cr1bb_phanloaichuongtrinh`: Phân loại chương trình promotion
- `crdfd_nganhnghe`: Ngành nghề khách hàng
- `crdfd_leadtime`: Lead time sản phẩm (ngày)
- `crdfd_tonkho`: Tồn kho lý thuyết
- `cr1bb_leadtimetheoca`: Lead time theo quận/huyện (legacy)

## 8. Debug và Troubleshooting

### Kiểm tra logic frontend:
- Xem console log trong ProductEntryForm.tsx
- Debug `computeDeliveryDate` function
- Kiểm tra các tham số: `warehouseCode`, `orderCreatedOn`, `districtLeadtime`

### Kiểm tra logic backend:
- Xem log trong `calculateDeliveryDateAndShift`
- Kiểm tra `customerIndustry` value
- Verify `warehouseCode` và `districtLeadtime` được truyền đúng

### Các điểm dễ nhầm lẫn:
- **Đơn vị thời gian:** ngày vs giờ vs ca làm việc
- **Thứ tự ưu tiên:** District > Out-of-stock > Legacy
- **Weekend logic:** Reset vs Adjustment khác nhau
- **Kho HCM vs Bình Định:** Logic leadtime khác nhau

### Test Cases quan trọng (✅ Đã test và pass):
- **Thứ 7 sau 12:00:** → Reset sang Thứ 2 8:00 ✅
- **Chủ nhật:** → Reset sang Thứ 2 8:00 (tất cả), + dời nếu kết quả CN (chỉ HCM) ✅
- **Out of stock + Apollo/Kim Tín:** → +6 ca (cả 2 kho) ✅
- **Out of stock bình thường HCM:** → +2 ca ✅
- **Out of stock bình thường Bình Định:** → +4 ca ✅
- **District leadtime:** → Override tất cả logic khác ✅
- **Legacy promotion:** → Vẫn hoạt động nếu không có district leadtime ✅
- **Shop customer legacy:** → Leadtime theo quận/huyện ✅
- **Default case:** → +1 working day ✅

### Test Results:
```
📊 Test Results: 11/11 tests passed 🎉
- ✅ District Leadtime Priority
- ✅ Out of Stock HCM Normal (+2 ca)
- ✅ Out of Stock HCM Apollo Promotion (+6 ca)
- ✅ Out of Stock Binh Dinh Normal (+4 ca)
- ✅ Weekend Reset - Saturday after 12:00
- ✅ Weekend Reset - Sunday
- ✅ Sunday Adjustment HCM
- ✅ Legacy Promotion Lead Time
- ✅ Shop Customer Legacy
- ✅ Out of Stock Legacy (+3 days)
- ✅ Default Case (+1 working day)
```

## 10. API Validation Tool

### Leadtime Validation API
**Endpoint:** `GET /api/admin-app/leadtime-validation`

**Mục đích:** Kiểm tra và audit các SO/SOBG có thông tin sai về promotion, giá cả và leadtime.

### Query Parameters:
- `days` (number, default: 7): Số ngày quá khứ để kiểm tra
- `limit` (number, default: 50): Giới hạn số kết quả trả về
- `checkPrices` (boolean, default: true): Kiểm tra giá cả
- `checkLeadtime` (boolean, default: true): Kiểm tra leadtime

### Response Format:
```json
{
  "success": true,
  "summary": {
    "totalRecords": 25,
    "totalIssues": 15,
    "dateRange": { "start": "2025-01-10", "end": "2025-01-17" },
    "checkedDays": 7
  },
  "results": [
    {
      "id": "so-guid",
      "type": "SO",
      "soNumber": "SO2025001",
      "customerName": "Công ty ABC",
      "customerCode": "KH001",
      "industry": "Shop",
      "warehouse": "KHOHCM",
      "createdOn": "2025-01-15T10:00:00Z",
      "details": [
        {
          "productName": "Sản phẩm A",
          "productCode": "SP001",
          "quantity": 10,
          "unit": "Cái",
          "price": 100000,
          "discountedPrice": 90000,
          "promotionName": "Apollo Special",
          "promotionValue": 1.5,
          "expectedDeliveryDate": "2025-01-17",
          "calculatedDeliveryDate": "2025-01-16",
          "deliveryDateMatch": false,
          "priceIssues": ["Giá chiết khấu không khớp: expected 90000, got 95000"],
          "leadtimeIssues": ["Ngày giao không khớp: expected 2025-01-17, got 2025-01-16"]
        }
      ],
      "hasIssues": true,
      "issueCount": 2
    }
  ]
}
```

### Các loại vấn đề được phát hiện:

#### **Price Issues:**
- Giá chiết khấu không khớp với % chiết khấu
- Giá promotion không đúng
- Giá gốc vs giá chiết khấu không consistent

#### **Leadtime Issues:**
- Ngày giao thực tế khác với ngày tính toán
- Leadtime promotion không được áp dụng đúng
- Weekend reset không đúng
- Sunday adjustment missing

### Cách sử dụng:
```bash
# Kiểm tra 7 ngày gần nhất
GET /api/admin-app/leadtime-validation

# Kiểm tra 30 ngày, tối đa 100 kết quả
GET /api/admin-app/leadtime-validation?days=30&limit=100

# Chỉ kiểm tra leadtime, bỏ qua giá
GET /api/admin-app/leadtime-validation?checkPrices=false
```

### Database Tables Queried:
- `crdfd_sale_orders` (SO)
- `crdfd_saleorderdetails` (SOD)
- `crdfd_sobaogias` (SOBG)
- `crdfd_sodbaogias` (SOBGD)
- `crdfd_promotions` (Promotion)
- `crdfd_customers` (Customer)
- `crdfd_warehous` (Warehouse)

### Performance Notes:
- API sử dụng batch queries để tối ưu performance
- Có thể query parallel cho SO và SOBG
- Limit mặc định 50 records để tránh timeout
- Sử dụng index trên `createdon` và `statecode`
- Mỗi record được validate riêng biệt với multiple sub-queries

### Implementation Status:
- ✅ **API Created:** `/api/admin-app/leadtime-validation`
- ✅ **SO Validation:** Kiểm tra sale orders và sale order details
- ✅ **SOBG Validation:** Kiểm tra báo giá và báo giá details
- ✅ **Price Validation:** So sánh giá gốc vs giá chiết khấu
- ✅ **Leadtime Validation:** Tính toán và so sánh ngày giao
- ✅ **Warehouse Mapping:** HCM vs Bình Định logic
- ✅ **Promotion Detection:** Apollo/Kim Tín special handling
- ✅ **Error Handling:** Graceful error handling cho missing data
- ✅ **API Testing:** Tested successfully với empty dataset

### Next Steps for Production:
1. **District Leadtime Mapping:** Implement customer district → leadtime mapping
2. **Inventory Integration:** Add real inventory checks thay vì assume out-of-stock
3. **Promotion Rules:** Enhance promotion detection logic
4. **Performance Optimization:** Add caching cho customer/warehouse lookups
5. **Batch Processing:** Implement background processing cho large datasets
