# Luồng hoạt động SO (Đơn hàng bán hàng) – Admin App

Tài liệu này mô tả **luồng hoạt động của SO** trong Admin App theo đúng code hiện tại (frontend) và các API liên quan.

## 1) Mục tiêu & phạm vi

- **SO (Sales Order)**: màn nhập sản phẩm theo Sales Order, thêm các dòng “Sales Order Detail” (SOD) và lưu lên CRM thông qua API `/api/admin-app/*`.
- Tài liệu tập trung vào:
  - UI/UX flow (các bước thao tác)
  - Quy tắc validate/disable (đặc biệt: tồn kho, VAT, duyệt giá)
  - Dòng dữ liệu (mapping) từ UI → API save

## 2) Các file/component chính

- **Wrapper & mode (SO/SOBG)**
  - `src/app/admin-app/_components/SalesOrderFormWrapper.tsx`
    - Toggle `SO` / `SOBG`
    - Gắn theme class: `admin-app-mode-so` / `admin-app-mode-sobg`

- **Form SO**
  - `src/app/admin-app/_components/SalesOrderForm.tsx`
    - Panel trái: “Thông tin đơn hàng” (Khách hàng, Sales Order, Ngày giao, Ghi chú, Đơn hàng gấp, Duyệt giá)
    - Panel phải: `ProductEntryForm`
    - Bảng dòng hàng: `ProductTable`
    - Load SOD theo `soId` và save SOD lên CRM

- **Form nhập sản phẩm (dùng chung SO/SOBG)**
  - `src/app/admin-app/_components/ProductEntryForm.tsx`
    - Chọn sản phẩm/kho/đơn vị, nhập số lượng/giá
    - Kiểm tra tồn kho (và bypass theo nhóm SP)
    - Load giá theo khách hàng + đơn vị + VAT
    - Load khuyến mãi theo sản phẩm + khách hàng, chọn KM và tính % giảm

- **Dropdown custom (có tooltip + copy)**
  - `src/app/admin-app/_components/Dropdown.tsx`
    - Hiện meta khi hover (mã KH/mã SP), có nút copy
    - Search lọc theo cả `label` và `dropdownMetaText`

- **API client**
  - `src/app/admin-app/_api/adminApi.ts`
  - Tài liệu endpoint: `src/app/admin-app/API_DOCUMENTATION.md`

## 3) Luồng tổng quát (end-user)

### Bước 1: Chọn Khách hàng

- Người dùng mở dropdown **Khách hàng**.
- Khi hover 1 khách hàng:
  - Hiện **mã KH** (field `cr44a_makhachhang` fallback `cr44a_st`)
  - Có nút **copy** mã
- Khi chọn khách hàng:
  - Set `customerId`, `customer` (label)
  - Set `customerCode`
  - Reset kho (`warehouse`) để tránh dùng nhầm kho của khách hàng trước

**Dữ liệu nguồn**:
- Hook: `useCustomers(search)` → `fetchCustomers(search)` → `GET /api/admin-app/customers`

### Bước 2: Chọn Sales Order (SO)

- SO dropdown chỉ enable khi đã có `customerId`.
- Khi chọn SO:
  - Set `soId`, `so` (label)
  - Derive VAT text từ record SO (ưu tiên `cr1bb_vattext`, fallback OptionSet `crdfd_vat`)
  - Load danh sách SOD từ CRM theo `soId` để hiển thị vào bảng

**Dữ liệu nguồn**:
- Hook: `useSaleOrders(customerId?)` → `GET /api/admin-app/sale-orders?...`
- Load chi tiết: `fetchSaleOrderDetails(soId)` → `GET /api/admin-app/sale-order-details?soId=...`

### Bước 3: Nhập dòng sản phẩm (ProductEntryForm)

#### 3.1 Chọn Sản phẩm

- Dropdown sản phẩm có:
  - Hover hiển thị **mã SP** (`crdfd_masanpham`) + nút copy
  - Search có thể gõ theo **tên hoặc mã**
- Khi chọn sản phẩm:
  - Set `productId`, `product` (label)
  - Set `selectedProductCode = crdfd_masanpham` và đồng bộ `productCode`
  - Set `selectedProduct` để dùng các rule (nhóm SP, VAT option, bản chất giá…)
  - Reset `unitId/unit` (vì danh sách đơn vị phụ thuộc sản phẩm)

#### 3.2 Chọn Kho & Đơn vị

- Kho: load theo `customerId` (và các rule bên trong BE/CRM)
- Đơn vị: load theo `selectedProductCode`

#### 3.3 Tồn kho (Inventory) & bypass theo nhóm SP

- Với đơn **Có VAT**: không chặn theo tồn kho.
- Với đơn **Không VAT**:
  - Mặc định sẽ gọi API tồn kho và **chặn Add/Save** khi tồn kho không đủ.
  - **Ngoại lệ (bypass tồn kho)** nếu `Mã nhóm SP` thuộc:
    - `NSP-00027`
    - `NSP-000872`
    - `NSP-000409`
    - `NSP-000474`
  - Khi bypass:
    - Không gọi API tồn kho
    - Không chặn Add/Save vì tồn kho

#### 3.4 Giá (Price) & bản chất giá phát ra

- Khi có `selectedProductCode`:
  - Load giá theo `fetchProductPrice(productCode, customerCode, unitId, ..., isVatOrder)`
  - Chọn field giá dựa trên `cr1bb_banchatgiaphatra` của sản phẩm và trạng thái VAT

#### 3.5 Khuyến mãi (Promotion)

- Load promotion theo `fetchProductPromotions(selectedProductCode, customerCode)`
- Người dùng chọn chương trình trong `<select>`
- Có nút **⧉ copy tên chương trình** (copy `promo.name`)
- % giảm được suy ra từ record promotion (ưu tiên các field value khác nhau)

#### 3.6 Duyệt giá & người duyệt

- Khi bật **Duyệt giá**:
  - Bắt buộc chọn **Người duyệt**
  - Có thêm phần chọn “Phương thức” (Nhập thủ công / Theo chiết khấu)

### Bước 4: Add dòng sản phẩm vào bảng

- Nút Add (trong `ProductEntryForm`) chạy `handleAddWithInventoryCheck`:
  - Kiểm tra điều kiện (chọn KH + SO + sản phẩm + kho + đơn vị + số lượng…)
  - Kiểm tra tồn kho (trừ các trường hợp bypass/VAT)
  - Nếu OK → gọi `onAdd()` từ `SalesOrderForm`
- `SalesOrderForm.handleAddProduct` sẽ push vào `productList` (state) và reset một số input để nhập dòng tiếp theo.

### Bước 5: Save lên CRM (tạo/đẩy SOD)

- Nút Save (header hoặc trong `ProductEntryForm` tùy `showInlineActions`) gọi `SalesOrderForm.handleSave`.
- Flow trong `handleSave`:
  1. Validate: phải có `soId` và `productList.length > 0`
  2. Load danh sách SOD hiện có từ CRM (`fetchSaleOrderDetails(soId)`)
  3. Lọc ra “sản phẩm mới” (chưa tồn tại / chưa `isSodCreated`)
  4. Map `ProductItem` → payload `saveSaleOrderDetails({ soId, warehouseName, isVatOrder, customerIndustry, products })`
  5. POST lên API, show toast thành công/thất bại
  6. Refresh form + reload lại SOD để sync UI với CRM

## 4) Trạng thái UI quan trọng

- **Panel “Thông tin đơn hàng”** có thể collapse; khi collapse sẽ có nút **◀** để mở lại.
- **Disable/Enable**:
  - SO dropdown disable nếu chưa chọn khách hàng
  - ProductEntryForm disable nếu chưa chọn KH + SO
  - Add/Save có thể disable bởi:
    - chưa đủ dữ liệu bắt buộc
    - cảnh báo giá
    - tồn kho không đủ (trừ VAT/bypass)
    - bật duyệt giá nhưng chưa chọn người duyệt

## 5) Gợi ý debug nhanh

- Kiểm tra mapping khách hàng/SO/sản phẩm:
  - `SalesOrderForm.tsx` (khách hàng + SO)
  - `ProductEntryForm.tsx` (sản phẩm + kho + đơn vị)
- Kiểm tra tồn kho:
  - `ProductEntryForm.tsx` → `loadInventory`, `checkInventoryBeforeAction`, `INVENTORY_BYPASS_PRODUCT_GROUP_CODES`
- Kiểm tra save:
  - `SalesOrderForm.tsx` → `handleSave` + mapping payload

## 6) SO vs SOBG (khác nhau chính)

- **UI**: hiện đã đồng bộ layout (compact 2 cột).
- **Nghiệp vụ**: label/ý nghĩa Sale Order khác (SO vs SOBG) nhưng dùng chung `ProductEntryForm` và chung cơ chế save SOD.


