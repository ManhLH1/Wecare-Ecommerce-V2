# Chi tiết các trường hợp Khuyến mãi (KM) – Admin App

Tài liệu này mô tả **toàn bộ các trường hợp/logic khuyến mãi** đang chạy trong `ProductEntryForm` (dùng chung cho SO & SOBG).

## 1) File/logic liên quan

- UI + logic: `src/app/admin-app/_components/ProductEntryForm.tsx`
- API: `fetchProductPromotions` trong `src/app/admin-app/_api/adminApi.ts`

## 2) Khi nào hệ thống gọi API khuyến mãi?

KM được load theo *cặp*:
- **Sản phẩm**: `selectedProductCode` (mã SP `crdfd_masanpham`)
- **Khách hàng**: `customerCode` (mã KH `cr44a_makhachhang` / fallback `cr44a_st`)

Điều kiện:
- Nếu **thiếu `selectedProductCode` hoặc thiếu `customerCode`**:
  - `promotions = []`
  - `selectedPromotionId = ''`
  - UI hiển thị: “Không có KM”
- Nếu đủ:
  - Gọi `fetchProductPromotions(selectedProductCode, customerCode)`
  - Thành công:
    - `promotions = data`
    - auto-select chương trình đầu tiên: `selectedPromotionId = data[0]?.id`
  - Thất bại:
    - `promotions = []`
    - `selectedPromotionId = ''`
    - set `promotionError = 'Không tải được khuyến mãi'` (hiện tại chỉ set state; UI có thể chưa show rõ error)

## 3) Cách chọn “chương trình KM” trên UI

UI dùng native `<select>`:
- `value` = `effectivePromotionId` (ưu tiên `selectedPromotionId`, fallback `promotions[0]?.id`)
- Khi user đổi option → `setSelectedPromotionId(...)`

### Copy tên chương trình

Ngay cạnh `<select>` có nút **⧉**:
- Copy `selectedPromotion?.name` vào clipboard
- Toast:
  - success: “Đã copy tên chương trình”
  - fail: “Copy thất bại”

## 4) Cách hiển thị % KM trong danh sách option

Mỗi option render label:

- `promo.name` + ` - <value>%` (nếu tìm được value hợp lệ)

Giá trị % hiển thị trong option được chọn theo thứ tự fallback **phụ thuộc vào loại đơn hàng**:

#### SO có VAT (isVatOrder = true):
1. `promo.valueWithVat` (crdfd_value_co_vat) - **ưu tiên**
2. `promo.valueNoVat` (crdfd_value_khong_vat) - fallback
3. `promo.value`
4. `promo.value2`
5. `promo.value3`
6. `promo.valueBuyTogether`

#### SO không VAT (isVatOrder = false):
1. `promo.valueNoVat` (crdfd_value_khong_vat) - **ưu tiên**
2. `promo.valueWithVat` (crdfd_value_co_vat) - fallback
3. `promo.value`
4. `promo.value2`
5. `promo.value3`
6. `promo.valueBuyTogether`

Nếu field đó parse được number → show ` - <number>%`

## 5) Suy ra “% giảm” thực sự từ chương trình KM

Hàm lõi: `derivePromotionPercent(promo)`

### 5.1 Trường hợp “KM chỉ áp dụng cho đơn Không VAT”

- Nếu promo có flag `(promo as any).crdfd_salehangton === true`
- Và đơn hiện tại là **Có VAT** (`vatText` có “có vat” hoặc `vatPercent > 0`)
→ **bỏ qua KM**: trả về `0%`

### 5.2 Ưu tiên field để lấy % giảm

`derivePromotionPercent` duyệt candidates theo thứ tự **phụ thuộc vào loại đơn hàng**:

#### SO có VAT (isVatOrder = true):
1. `promo.valueWithVat` (crdfd_value_co_vat) - **ưu tiên**
2. `promo.valueNoVat` (crdfd_value_khong_vat) - fallback
3. `promo.value`
4. `promo.value2`
5. `promo.value3`
6. `promo.valueBuyTogether`

#### SO không VAT (isVatOrder = false):
1. `promo.valueNoVat` (crdfd_value_khong_vat) - **ưu tiên**
2. `promo.valueWithVat` (crdfd_value_co_vat) - fallback
3. `promo.value`
4. `promo.value2`
5. `promo.value3`
6. `promo.valueBuyTogether`

**Rule:**
- Nếu `num` trong (0, 1] → coi là **tỉ lệ dạng 0.x** → convert sang %: `Math.round(num * 100)`
  - Ví dụ: `0.15` → `15%`
- Nếu `num > 0` → coi là **% trực tiếp** → dùng `num` luôn
- Nếu không có field hợp lệ → `0%`

## 6) Đồng bộ KM → state giảm giá & tổng tiền

Khi `selectedPromotionId` hoặc `promotions` thay đổi:
- Tìm `selectedPromotion` theo id (fallback `promotions[0]`)
- `promoPct = derivePromotionPercent(selectedPromotion)`
- Set:
  - `promotionDiscountPercent = promoPct`
  - `discountPercent = promoPct` (**propagate** ra state dùng chung tính toán)
  - `promotionText = selectedPromotion?.name || ''`
- Recompute totals: `recomputeTotals(price, quantity, promoPct || discountPercent, vatPercent)`

> Lưu ý: `promoPct || discountPercent` nghĩa là nếu `promoPct` = 0 thì dùng `discountPercent` hiện tại.

## 7) KM ảnh hưởng giá trị dòng hàng như thế nào?

Tổng tiền được tính qua `recomputeTotals(...)`:
- `effectivePrice = priceNum * (1 - promoDiscountPct/100)` (nếu `promoDiscountPct > 0`)
- VAT:
  - Nếu đơn “Không VAT” → VAT hiệu lực = 0
  - Nếu đơn VAT → dùng `vatPct`
- `subtotal = qty * effectivePrice`
- `vatAmount = subtotal * VAT / 100`
- `totalAmount = subtotal + vatAmount`

## 8) Các “case” phổ biến (checklist)

- **Case A – Chưa chọn sản phẩm**: không gọi API KM, UI “Không có KM”
- **Case B – Chưa có mã KH**: không gọi API KM, UI “Không có KM”
- **Case C – Có KM, auto chọn dòng đầu**: `selectedPromotionId` tự set theo `data[0].id`
- **Case D – KM trả về dạng 0.x**: auto convert sang %
- **Case E – KM chỉ áp dụng Không VAT**:
  - đơn VAT → % giảm = 0
  - đơn không VAT → áp dụng bình thường
- **Case F – Copy tên chương trình**: click ⧉ copy `promo.name`


