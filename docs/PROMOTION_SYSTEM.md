# Hệ thống Promotion trong Sales Order (SO) & SO Báo Giá (SOBG)

## 1. Tổng quan

Hệ thống promotion cho phép áp dụng chiết khấu vào đơn hàng bán hàng.

### Các loại promotion

| Loại | Mô tả | Ví dụ |
|------|-------|-------|
| **Chiết khấu 1 (CK1)** | Áp dụng cho toàn bộ đơn hàng | Giảm 10% tổng đơn |
| **Chiết khấu 2 (CK2)** | Áp dụng cho từng dòng sản phẩm | Giảm 7% cho SP MPE |
| **Khuyến mãi đặc biệt** | Áp dụng trước VAT | "[ALL] GIẢM GIÁ ĐẶC BIỆT" |

### Các API

| API | Entity | Mô tả |
|-----|--------|-------|
| `apply-promotion-order.ts` | `crdfd_ordersxpromotions` | Áp dụng promotion cho SO |
| `apply-sobg-promotion-order.ts` | `crdfd_sobaogiaxpromotions` | Áp dụng promotion cho SOBG |

---

## 2. Luồng xử lý chung (SO & SOBG)

```
┌──────────────┐    POST    ┌─────────────────────┐
│   Frontend   │ ─────────► │ apply-promotion-    │
│              │            │     order.ts API    │
└──────────────┘            └─────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │  Orders x Promotion │
                            └─────────────────────┘
                                      │
                                      ▼ (nếu CK2)
                            ┌─────────────────────┐
                            │  Update SODs        │
                            │  (crdfd_chieckhau2, │
                            │   crdfd_giack2)     │
                            └─────────────────────┘
```

---

## 3. Luồng chi tiết

### Bước 1: Nhận request

Frontend gửi:
```json
{
  "soId": "...",              // hoặc "sobgId" cho SOBG
  "promotionId": "...",
  "promotionName": "T1.2026 - MPE - 7%",
  "promotionValue": 7,
  "vndOrPercent": "%",
  "chietKhau2": true,
  "productCodes": "SP-001,SP-002",
  "orderTotal": 5000000
}
```

### Bước 2: Validate promotion

- Lấy promotion từ CRM
- Kiểm tra tổng tiền đơn hàng ≥ giá trị tối thiểu (nếu có yêu cầu)

### Bước 3: Validate CK2

**Quy tắc:** CK2 bắt buộc phải có danh sách SP hoặc nhóm SP

```
┌─────────────────────────────────────┐
│ chietKhau2 = true?                  │
└─────────────────────────────────────┘
           │           │
          YES          NO
           │           │
           ▼           ▼
┌──────────────────┐  ┌───────┐
│ Có productCodes  │  │  CK1  │
│ hoặc groupCodes? │  │       │
└──────────────────┘  └───────┘
           │           │
          YES          NO
           │           │
           ▼           ▼
     ┌─────────┐   ❌ REJECT
     │  CK2    │     400 Error
     └─────────┘
```

### Bước 4: Kiểm tra promotion đặc biệt

Một số promotion chỉ tạo Orders x Promotion, không update SODs:
- "[ALL] GIẢM GIÁ ĐẶC BIỆT _ V1"
- "[ALL] VOUCHER ĐẶT HÀNG TRÊN ZALO OA"
- "[ALL] VOUCHER SINH NHẬT - 50.000Đ"

### Bước 5: Tạo/Cập nhật Orders x Promotion

```
┌─────────────────────────────────────────┐
│ SO/SOBG + Promotion đã tồn tại?         │
└─────────────────────────────────────────┘
           │                    │
          YES                   NO
           │                    │
           ▼                    ▼
    ┌─────────────┐      ┌─────────────────┐
    │ Reuse        │      │ Tạo mới         │
    │ (tiếp tục   │      │ Orders x        │
    │ CK2 logic)  │      │ Promotion       │
    └─────────────┘      └─────────────────┘
```

### Bước 6: Kiểm tra điều khoản thanh toán

```
┌─────────────────────────────────────┐
│ Promotion có yêu cầu TT?            │
└─────────────────────────────────────┘
           │           │
          YES          NO
           │           │
           ▼           ▼
    ┌───────────┐  ┌───────┐
    │ SO match? │  │  OK   │
    └───────────┘  └───────┘
       │      │
      YES     NO
       │      │
       ▼      ▼
     OK   ❌ Skip CK2
```

### Bước 7: Lấy danh sách SOD

Fetch tất cả SOD của SO/SOBG từ CRM và filter client-side (tránh lỗi CRM lookup filter).

### Bước 8: Match SOD với filter

Chỉ những SOD có mã SP nằm trong danh sách filter mới được update:

```
Filter: SP-018579, SP-018580, SP-018581

SOD1: SP-018579  → ✅ MATCH → Cập nhật CK2
SOD2: SP-018580  → ✅ MATCH → Cập nhật CK2
SOD3: SP-999999  → ❌ SKIP  → Không update
```

### Bước 9: Update từng SOD

Với mỗi SOD match:
1. Lấy giá gốc (`crdfd_giagoc`)
2. Tính giá sau CK2:
   - `%`: `gia_goc * (1 - gia_tri)`
   - `VNĐ`: `max(0, gia_goc - gia_tri)`
3. Update CRM:
   - `crdfd_chieckhau2` = giá trị CK
   - `crdfd_giack2` = giá sau CK2

### Bước 10: Tính lại tổng đơn hàng

```
crdfd_tongtientruocthue = Σ (số lượng × crdfd_giack2)
crdfd_tienthue          = Σ (số lượng × crdfd_giack2 × VAT%)
crdfd_tongtien          = crdfd_tongtientruocthue + crdfd_tienthue
```

### Bước 11: Trả về kết quả

```json
{
  "success": true,
  "ordersXPromotionId": "...",
  "updatedSodCount": 3,
  "reused": false,
  "message": "Đã áp dụng promotion... và cập nhật CK2 cho 3 sản phẩm"
}
```

---

## 4. Bảng quyết định

| Điều kiện | Hành vi |
|-----------|---------|
| CK2 + có filter + match SOD | ✅ Update CK2 cho SOD |
| CK2 + có filter + không match | ⏭️ Skip |
| CK2 + không có filter | ❌ REJECT 400 |
| CK1 | ✅ Chỉ tạo Orders x Promotion |
| Special promotion | ✅ Chỉ tạo Orders x Promotion |
| Payment term không match | ⏭️ Skip CK2 |
| Fetch SO fail | ⚠️ Skip CK2 (an toàn) |

---

## 5. Sự khác biệt SO vs SOBG

| Khía cạnh | SO | SOBG |
|-----------|-----|------|
| **Table** | `crdfd_sale_orders` | `crdfd_sobaogias` |
| **SOD Table** | `crdfd_saleorderdetails` | `crdfd_sodbaogias` |
| **Orders x PM** | `crdfd_ordersxpromotions` | `crdfd_sobaogiaxpromotions` |
| **Giá SOD** | `crdfd_giagoc`, `crdfd_gia` | `crdfd_giagoc`, `crdfd_ongia` |
| **Tổng tiền** | `crdfd_tongtientruocthue`, `crdfd_tienthue`, `crdfd_tongtien` | `crdfd_tongtienkhongvat`, `crdfd_tongtien` |
| **Loại CK** | `crdfd_loai`: "Phần trăm" hoặc "VNĐ" | `crdfd_loai`: "Phần trăm" hoặc "Tiền" |

---

## 6. Debug log

| Log | Ý nghĩa |
|-----|---------|
| `[ApplyPromotion] ✓ CK2 Validation PASSED` | SO: CK2 validation thành công |
| `[ApplySOBGPromotion] ✓ CK2 Validation PASSED` | SOBG: CK2 validation thành công |
| `[ApplyPromotion] ✓ SOD xxx WILL receive CK2` | SO: SOD match filter |
| `[ApplySOBGPromotion] ✓ SOD xxx WILL receive CK2` | SOBG: SOD match filter |
| `[ApplyPromotion] ✗ SOD xxx SKIPPED` | SO: SOD không match |
| `[ApplySOBGPromotion] ✗ SOD xxx SKIPPED` | SOBG: SOD không match |
| `[updateSodChietKhau2] ✅ CK2 written successfully` | SO: Update thành công |
| `[updateSodBaoGiaChietKhau2] ✅ CK2 written successfully` | SOBG: Update thành công |
| `[updateSodChietKhau2] ❌ failed` | SO: Update thất bại |
| `[updateSodBaoGiaChietKhau2] ❌ failed` | SOBG: Update thất bại |

---

## 7. Các Fix đã áp dụng

### Fix 1: CK2 Validation bắt buộc filter
CK2 phải có `productCodes` HOẶC `productGroupCodes`, nếu không → REJECT 400.

### Fix 2: SOD Matching dùng Set.has()
Thay vì `string.includes()` → dùng `Set.has()` để exact match, tránh false positive.

### Fix 3: Client-side filter
Fetch tất cả SODs và filter ở client-side, tránh lỗi CRM lookup filter.

### Fix 4: Reuse nhưng vẫn chạy CK2
Khi Orders x Promotion đã tồn tại → vẫn tiếp tục chạy CK2 logic.

### Fix 5: Fetch SO fail → Skip CK2
Nếu fetch SO/SOBG fail → set `disallowedByPaymentTerms = true` để an toàn.

### Fix 6: ParseCodeList hỗ trợ JSON
Hỗ trợ nhiều format: array, JSON string, comma/semicolon/pipe separated.
