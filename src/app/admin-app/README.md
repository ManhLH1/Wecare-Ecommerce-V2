# Admin App - Quản lý đơn hàng

## Mô tả
Module quản lý đơn hàng bán hàng (Sales Order) được tách biệt hoàn toàn khỏi dự án chính.

## Cấu trúc

```
admin-app/
├── layout.tsx              # Layout riêng cho admin-app
├── page.tsx                # Trang chính
├── admin-app.css           # Styles riêng biệt
├── _components/            # Components riêng
│   ├── SalesOrderForm.tsx  # Form chính quản lý đơn hàng
│   ├── ProductEntryForm.tsx # Form nhập sản phẩm
│   └── ProductTable.tsx    # Bảng hiển thị sản phẩm
└── README.md               # Tài liệu này
```

## Tính năng

### 1. Tabs
- **Copilot**: Tab chính (mặc định)
- **Data**: Tab dữ liệu

### 2. Thông tin đơn hàng
- Khách hàng (dropdown)
- Đơn hàng
- SO (Sales Order - dropdown)

### 3. Nhập sản phẩm
- Sản phẩm không VAT (dropdown)
- Đơn vị (dropdown)
- Số lượng
- Giá
- Thành tiền (tự động tính)
- VAT (%)
- GTGT (tự động tính)
- Tổng tiền (tự động tính)

### 4. Tùy chọn
- Duyệt giá (checkbox)
- Duyệt giá SUP (checkbox)
- Đơn hàng gấp (checkbox)

### 5. Thông tin giao hàng
- Ngày giao NM (date picker)
- Ghi chú

### 6. Nút thao tác
- **+**: Thêm sản phẩm vào danh sách
- **💾**: Lưu đơn hàng
- **↻**: Làm mới form

### 7. Bảng sản phẩm
Hiển thị danh sách sản phẩm đã thêm với các cột:
- STT
- Tên sản phẩm
- Đơn vị
- Số lượng
- Giá
- Phụ phí
- Chiết khấu
- Giá đã CK
- VAT
- Tổng tiền
- Người duyệt
- Ngày giao
- Thao tác (Xóa)

## UI/UX

- Background: Nền xám nhạt với pattern chấm trắng
- Header: Tabs và version number
- Form: Layout dạng grid, responsive
- Table: Header màu teal, scroll ngang trên mobile
- Inputs: Border xám, focus màu xanh
- Buttons: Hover effects, transitions mượt

## Tách biệt khỏi dự án chính

- CSS riêng: `admin-app.css` với prefix `admin-app-*`
- Components riêng: Nằm trong `_components/`
- Layout riêng: Không ảnh hưởng đến layout chính
- Styles: Sử dụng `isolation: isolate` để tránh conflict

## Sử dụng

Truy cập: `/admin-app`

## Phát triển tiếp

- Kết nối API để lấy dữ liệu khách hàng, sản phẩm
- Validation form
- Lưu đơn hàng vào database
- Export/Import đơn hàng
- In đơn hàng

