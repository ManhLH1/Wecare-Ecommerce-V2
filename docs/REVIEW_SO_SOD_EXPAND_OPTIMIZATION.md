# Review: Tối ưu SO + SOD với $expand

## 📋 Tổng quan

Review khả năng sử dụng `$expand` trong OData để gộp chung API call lấy cả Sale Orders (SO) và Sale Order Details (SOD) trong một request.

## ✅ Kết luận

**Có thể dùng `$expand` nhưng KHÔNG NÊN dùng mặc định** vì:
- Frontend hiện tại dùng lazy loading pattern (chỉ load SOD khi cần)
- Response sẽ rất lớn nếu expand (100 SO × 10 SOD = 1000+ records)
- Lãng phí bandwidth và làm chậm initial load

**Đề xuất**: Thêm option parameter `includeDetails` để tùy chọn expand khi thực sự cần.

---

## 🔍 Phân tích chi tiết

### 1. Relationship trong Dynamics CRM

**Navigation Property**: `crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O`

- Đây là relationship từ SO xuống SOD (1-n)
- Đã được sử dụng thành công trong `getSaleOrdersData.ts` (dòng 12, 26)

```12:26:pages/api/getSaleOrdersData.ts
  const expand_table_sod = "crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O";
  const expand_columns_sod =
    "_crdfd_socode_value,crdfd_name,crdfd_masanpham,crdfd_tensanphamtext,crdfd_productnum,crdfd_onvionhang,crdfd_gia,crdfd_thue,crdfd_tongtienchuavat";
  // Build filter condition
  let filter = "statecode eq 0";
  const query_sod = `$select=${expand_columns_sod};$filter=${encodeURIComponent(
    filter
  )}`;
  if (id_khachhang) {
    filter += ` and _crdfd_khachhang_value eq '${id_khachhang}'`;
  }

  const filterQuery_so = `&$filter=${encodeURIComponent(filter)}`;
  const query_so = `$select=${columns_so}${filterQuery_so}`;
  const initialEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table_so}?${query_so}&$expand=${expand_table_sod}(${query_sod})`;
```

### 2. Use Case hiện tại

#### `sale-orders.ts` API
- **Mục đích**: Lấy danh sách SO để hiển thị trong table
- **Khi nào gọi**: Khi load trang `/admin-app/sale-orders`
- **Cần SOD không**: ❌ KHÔNG - chỉ cần danh sách SO
- **Pattern**: List view → user chọn SO → mới load SOD

#### `sale-order-details.ts` API  
- **Mục đích**: Lấy SOD của 1 SO cụ thể
- **Khi nào gọi**: Khi user chọn SO (trong `SalesOrderForm`, dòng 553-569)
- **Cần SOD không**: ✅ CÓ - nhưng chỉ của 1 SO
- **Pattern**: Lazy loading - chỉ load khi cần

### 3. So sánh Performance

#### Scenario 1: Không expand (hiện tại)
```
Request 1: GET /sale-orders?customerId=xxx
  → Response: ~100 SO records (~50KB)
  
Request 2: GET /sale-order-details?soId=yyy (khi user chọn)
  → Response: ~10 SOD records (~5KB)
  
Total: 2 requests, ~55KB, 2 round trips
```

#### Scenario 2: Expand mặc định
```
Request 1: GET /sale-orders?customerId=xxx&$expand=...
  → Response: ~100 SO + ~1000 SOD records (~500KB+)
  
Total: 1 request, ~500KB+, 1 round trip
```

**Vấn đề**:
- Response lớn gấp 10x nhưng frontend không dùng SOD ngay
- Lãng phí bandwidth và memory
- Làm chậm initial load (phải parse 500KB+ JSON)
- Cache không hiệu quả (SOD thay đổi thường xuyên hơn SO)

### 4. Khi nào nên dùng $expand?

✅ **Nên dùng khi**:
- Frontend cần hiển thị cả SO và SOD ngay lập tức
- Số lượng SO nhỏ (< 10)
- Use case đặc biệt: export, report, batch processing

❌ **Không nên dùng khi**:
- Chỉ cần danh sách SO (như hiện tại)
- Số lượng SO lớn (> 20)
- SOD chỉ cần khi user chọn SO cụ thể

---

## 💡 Đề xuất giải pháp

### Option 1: Giữ nguyên (Khuyến nghị)

**Lý do**: Pattern hiện tại đã tối ưu cho use case
- Initial load nhanh (chỉ load SO)
- Lazy load SOD khi cần
- Cache hiệu quả hơn (tách biệt SO và SOD)

### Option 2: Thêm parameter `includeDetails`

Cho phép frontend chọn có expand hay không:

```typescript
// Không expand (mặc định - giữ behavior hiện tại)
GET /sale-orders?customerId=xxx

// Có expand (cho use case đặc biệt)
GET /sale-orders?customerId=xxx&includeDetails=true
```

**Implementation**:

```typescript
const { customerId, includeDetails } = req.query;
const shouldExpand = includeDetails === 'true';

let query = `$select=${columns}&$filter=${encodeURIComponent(filter)}&$orderby=createdon desc&$top=100`;

if (shouldExpand) {
  const expandColumns = [
    "crdfd_saleorderdetailid",
    "crdfd_tensanphamtext",
    "crdfd_productnum",
    "crdfd_gia",
    // ... các field cần thiết từ sale-order-details.ts
  ].join(",");
  
  const expandFilter = "statecode eq 0";
  const expandQuery = `$select=${expandColumns};$filter=${encodeURIComponent(expandFilter)}`;
  query += `&$expand=crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O(${expandQuery})`;
}
```

**Ưu điểm**:
- Backward compatible (mặc định không expand)
- Linh hoạt cho use case đặc biệt
- Frontend tự quyết định có cần SOD hay không

**Nhược điểm**:
- Code phức tạp hơn
- Cần maintain 2 code paths

### Option 3: Tạo API riêng cho use case expand

Tạo endpoint mới: `/sale-orders-with-details` cho use case đặc biệt.

**Ưu điểm**:
- Tách biệt rõ ràng
- Không ảnh hưởng API hiện tại

**Nhược điểm**:
- Duplicate code
- Thêm endpoint mới

---

## 📊 Bảng so sánh

| Tiêu chí | Không expand (hiện tại) | Expand mặc định | Expand optional |
|----------|------------------------|-----------------|-----------------|
| Initial load time | ⚡ Nhanh (~50KB) | 🐌 Chậm (~500KB+) | ⚡ Nhanh (mặc định) |
| Bandwidth | ✅ Tối ưu | ❌ Lãng phí | ✅ Tối ưu (mặc định) |
| Memory usage | ✅ Thấp | ❌ Cao | ✅ Thấp (mặc định) |
| Cache efficiency | ✅ Tốt (tách biệt) | ❌ Kém | ✅ Tốt (mặc định) |
| Flexibility | ❌ Không linh hoạt | ❌ Không linh hoạt | ✅ Linh hoạt |
| Code complexity | ✅ Đơn giản | ✅ Đơn giản | ⚠️ Phức tạp hơn |
| Use case match | ✅ Phù hợp | ❌ Không phù hợp | ✅ Phù hợp |

---

## 🎯 Khuyến nghị cuối cùng

**Giữ nguyên pattern hiện tại** (2 API riêng biệt) vì:

1. ✅ **Performance tốt nhất**: Initial load nhanh, chỉ load data cần thiết
2. ✅ **Cache hiệu quả**: SO và SOD có lifecycle khác nhau, tách cache tốt hơn
3. ✅ **Code đơn giản**: Dễ maintain, dễ debug
4. ✅ **Phù hợp use case**: Frontend không cần SOD khi load danh sách

**Chỉ nên thêm `includeDetails` parameter nếu**:
- Có use case cụ thể cần expand (ví dụ: export, report)
- Frontend yêu cầu rõ ràng
- Có performance requirement đặc biệt

---

## 📝 Code Reference

- Relationship name: `crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O`
- Example usage: `pages/api/getSaleOrdersData.ts` (dòng 12, 26)
- Frontend usage: 
  - `src/app/admin-app/sale-orders/page.tsx` - Load danh sách SO
  - `src/app/admin-app/_components/SalesOrderForm.tsx` (dòng 553-569) - Load SOD khi chọn SO
