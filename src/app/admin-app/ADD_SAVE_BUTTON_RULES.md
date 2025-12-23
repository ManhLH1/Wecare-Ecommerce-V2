# Các trường hợp disable / enable nút Add & Save – Admin App

Tài liệu này mô tả các điều kiện **disable/enable** cho nút **Add** và **Save** trong `ProductEntryForm` (dùng chung cho SO & SOBG).

> Nút Add/Save trong `ProductEntryForm` có thể xuất hiện ở 2 nơi:
> - **Inline actions** trong card “Thông tin sản phẩm” (khi `showInlineActions = true`)
> - **Header compact** của form (nút Lưu ở header gọi `handleSave` của form cha)

## 1) File/logic liên quan

- `src/app/admin-app/_components/ProductEntryForm.tsx`
  - `buttonsDisabled` (useMemo)
  - `addButtonDisabledReason` (useMemo)
  - `checkInventoryBeforeAction` (async)
  - `handleAddWithInventoryCheck`, `handleSaveWithInventoryCheck`
- Form cha:
  - `src/app/admin-app/_components/SalesOrderForm.tsx`
  - `src/app/admin-app/_components/SalesOrderBaoGiaForm.tsx`

## 2) Khái niệm state quan trọng

- **isFormDisabled**: true khi chưa chọn đủ context
  - `!customerId || !soId`
- **approvePrice**: bật “Duyệt giá”
- **approver**: người duyệt (bắt buộc khi `approvePrice = true`)
- **vatText / vatPercent**: xác định đơn VAT / không VAT
- **inventoryTheoretical**: tồn kho lý thuyết hiện tại
- **shouldBypassInventoryCheck**: bypass tồn kho theo nhóm SP
  - Nhóm SP bypass: `INVENTORY_BYPASS_PRODUCT_GROUP_CODES`

## 3) Rule tổng: khi nào Add/Save bị disable ở UI?

### 3.1 Disable cứng theo form context

Nếu `isFormDisabled = true` → **disable Add/Save**
- Lý do: chưa chọn **Khách hàng + SO**
- Message: `"Chọn KH và SO trước"`

### 3.2 Disable do bật duyệt giá nhưng thiếu Người duyệt

Nếu `approvePrice = true` và `!approver` → **disable Add/Save**
- Message: `"Vui lòng chọn Người duyệt"`

### 3.3 Các trường hợp “luôn enable”

Nếu rơi vào 1 trong 2 nhóm dưới đây thì `buttonsDisabled` trả về `false` (enable), bỏ qua các check bên dưới:

- **Bypass theo nhóm SP**:
  - `selectedProductGroupCode` thuộc `INVENTORY_BYPASS_PRODUCT_GROUP_CODES`
- **Bypass theo khách hàng kho**:
  - `customerName` normalize = `"kho wecare"` hoặc `"kho wecare (ho chi minh)"`

### 3.4 Trường hợp “Đơn hàng khuyến mãi” (orderType)

Nếu `orderType` là “Đơn hàng khuyến mãi” → **enable**
- OptionSet đang hardcode: `PROMO_ORDER_OPTION = 191920002`
- Ngoài ra code còn fallback theo string normalize:
  - `"don hang khuyen mai"` / `"đon hang khuyen mai"`

### 3.5 Disable do cảnh báo giá / tồn kho

Nếu không nằm trong các nhóm “luôn enable” ở trên:

- **Cảnh báo giá**:
  - `priceWarningMessage` khác `"Giá bình thường"`
  - Ngoại lệ: `"SO và sản phẩm không khớp GTGT"` **chỉ cảnh báo**, không disable
  - Nếu có cảnh báo giá thực sự → **disable**

- **Tồn kho**:
  - Chỉ áp dụng chặn tồn kho khi **đơn Không VAT** (không VAT)
  - Nếu `inventoryTheoretical <= 0` hoặc `requestedQty > inventoryTheoretical` → **disable**
  - Với đơn VAT: không chặn theo tồn kho trong `buttonsDisabled`

## 4) Rule runtime: check trước khi Add/Save (inventory re-check)

Ngay cả khi UI enable, khi click Add/Save thì `handleAddWithInventoryCheck` / `handleSaveWithInventoryCheck` sẽ gọi:
- `checkInventoryBeforeAction()`

Logic `checkInventoryBeforeAction`:

- Nếu **đơn VAT** → return `true` (không chặn)
- Nếu **bypass nhóm SP** (`shouldBypassInventoryCheck`) → return `true`
- Nếu thiếu dữ liệu bắt buộc → return `false` + toast:
  - chưa có sản phẩm: “Vui lòng chọn sản phẩm trước khi thực hiện.”
  - chưa có kho: “Vui lòng chọn vị trí kho trước khi thực hiện.”
  - số lượng <= 0: “Số lượng phải lớn hơn 0.”
- Nếu đủ:
  - Gọi `fetchInventory(selectedProductCode, warehouse, isVatOrder)`
  - Nếu API fail → toast error → return false
  - Nếu tồn kho không đủ → toast warning (kèm số còn / số cần) → return false
  - Nếu đủ → return true

## 5) `addButtonDisabledReason` (text lý do disable)

Khi `buttonsDisabled = true`, UI hiển thị lý do theo thứ tự:

1. `isFormDisabled` → “Chọn KH và SO trước”
2. `approvePrice && !approver` → “Vui lòng chọn Người duyệt”
3. Thiếu dữ liệu cơ bản:
   - thiếu sản phẩm → “Vui lòng chọn sản phẩm”
   - thiếu kho → “Vui lòng chọn kho”
   - thiếu số lượng → “Số lượng phải > 0”
4. Cảnh báo giá (trừ mismatch GTGT) → trả luôn `priceWarningMessage`
5. Tồn kho (chỉ Non-VAT):
   - `inv <= 0` → “Sản phẩm hết tồn kho”
   - `requestedQty > inv` → “Không đủ tồn kho (còn X / cần Y)”
6. Fallback → “Không đủ điều kiện”

## 6) Checklist nhanh theo case

- **Case 1**: Chưa chọn KH/SO → disable (reason “Chọn KH và SO trước”)
- **Case 2**: Bật Duyệt giá nhưng chưa chọn Người duyệt → disable
- **Case 3**: Nhóm SP thuộc danh sách bypass → luôn enable + click Add/Save không check tồn kho
- **Case 4**: Khách hàng “Kho wecare …” → luôn enable
- **Case 5**: Đơn hàng khuyến mãi (orderType) → luôn enable
- **Case 6**: Đơn Không VAT + tồn kho thiếu → disable + click cũng bị chặn bởi re-check
- **Case 7**: Đơn VAT → không bị chặn bởi tồn kho (nhưng vẫn có thể bị chặn bởi cảnh báo giá/duyệt giá)


