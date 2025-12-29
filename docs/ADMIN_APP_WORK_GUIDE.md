# HƯỚNG DẪN LÀM VIỆC - ADMIN APP

## Tổng quan dự án

Admin App là module quản lý đơn hàng bán hàng (Sales Order) được tách biệt hoàn toàn khỏi dự án chính Wecare Ecommerce. Module này phục vụ việc tạo và quản lý các đơn hàng bán hàng với giao diện chuyên nghiệp và tối ưu hóa hiệu suất.

## Cấu trúc thư mục

```
admin-app/
├── layout.tsx                 # Layout riêng cho admin-app
├── page.tsx                   # Trang chính
├── admin-app.css             # Styles riêng biệt
├── README.md                  # Tài liệu tổng quan
├── API_DOCUMENTATION.md       # Tài liệu API endpoints
├── SO_FLOW.md                 # Luồng hoạt động SO
├── PROMOTION_CASES.md         # Logic khuyến mãi
├── ADD_SAVE_BUTTON_RULES.md   # Quy tắc nút Add/Save
├── MOBILE_OPTIMIZATION.md     # Tối ưu mobile
├── _components/               # Components riêng
│   ├── AdminAuthGuard.tsx     # Bảo vệ xác thực
│   ├── AdminLoginForm.tsx     # Form đăng nhập
│   ├── SalesOrderForm.tsx     # Form chính SO
│   ├── SalesOrderBaoGiaForm.tsx # Form báo giá
│   ├── ProductEntryForm.tsx   # Form nhập sản phẩm
│   ├── ProductTable.tsx       # Bảng hiển thị sản phẩm
│   ├── SalesOrderFormWrapper.tsx # Wrapper SO/SOBG
│   ├── Dropdown.tsx           # Dropdown custom
│   └── LoadingSpinner.tsx     # Spinner loading
├── _api/
│   └── adminApi.ts            # API client
├── _hooks/
│   └── useDropdownData.ts     # Custom hooks
├── _utils/
│   └── implicitAuthService.ts # Auth service
└── login/, oauth-callback/    # Pages xác thực
```

## Các tính năng chính

### 1. Quản lý đơn hàng bán hàng (SO - Sales Order)

#### 1.1 Tạo đơn hàng mới
- **Khách hàng**: Chọn từ dropdown (hỗ trợ tìm kiếm)
- **Đơn hàng**: Chọn SO từ danh sách của khách hàng
- **Thông tin giao hàng**: Ngày giao, ghi chú, đơn hàng gấp
- **Duyệt giá**: Checkbox cho duyệt giá đặc biệt

#### 1.2 Nhập sản phẩm
- **Sản phẩm**: Dropdown với tìm kiếm theo tên/mã
- **Kho**: Chọn kho lưu trữ
- **Đơn vị**: Tự động load theo sản phẩm
- **Số lượng & Giá**: Nhập số lượng, tự động tính giá
- **VAT**: Tự động theo cấu hình đơn hàng
- **Khuyến mãi**: Tự động load và áp dụng

#### 1.3 Bảng sản phẩm
Hiển thị danh sách sản phẩm đã thêm với các cột:
- STT, Tên sản phẩm, Đơn vị, Số lượng
- Giá, Phụ phí, Chiết khấu, Giá đã CK
- VAT, Tổng tiền, Người duyệt, Ngày giao

### 2. Quản lý báo giá (SOBG - Sales Order Bao Gia)

Tương tự SO nhưng dành cho đơn hàng báo giá với logic riêng.

### 3. Xác thực & Bảo mật

- **OAuth2**: Tích hợp với hệ thống xác thực doanh nghiệp
- **Token Management**: Tự động refresh token
- **Auth Guard**: Bảo vệ các route yêu cầu đăng nhập

## Luồng làm việc

### 1. Quy trình tạo đơn hàng

```
1. Đăng nhập → 2. Chọn khách hàng → 3. Chọn SO
   ↓
4. Nhập thông tin giao hàng → 5. Thêm sản phẩm
   ↓
6. Áp dụng khuyến mãi → 7. Kiểm tra tồn kho
   ↓
8. Lưu đơn hàng → 9. Đồng bộ với CRM
```

### 2. Quy tắc nghiệp vụ quan trọng

#### Tồn kho
- **Đơn VAT**: Không kiểm tra tồn kho
- **Đơn không VAT**: Bắt buộc kiểm tra tồn kho
- **Bypass tồn kho**: Cho các nhóm sản phẩm đặc biệt:
  - NSP-00027, NSP-000872, NSP-000409, NSP-000474

#### Khuyến mãi
- Load theo cặp sản phẩm + khách hàng
- Ưu tiên VAT phù hợp (có VAT/không VAT)
- Tự động tính % giảm và cập nhật tổng tiền

#### Duyệt giá
- Khi bật "Duyệt giá" bắt buộc chọn người duyệt
- Có 2 phương thức: Nhập thủ công hoặc theo chiết khấu

## API Endpoints

### Base URL: `/api/admin-app/`

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/customers` | GET | Danh sách khách hàng |
| `/products` | GET | Danh sách sản phẩm |
| `/sale-orders` | GET | Danh sách đơn hàng |
| `/units` | GET | Danh sách đơn vị |
| `/warehouses` | GET | Danh sách kho |
| `/prices` | GET | Lấy giá sản phẩm |
| `/inventory` | GET | Kiểm tra tồn kho |
| `/promotions` | GET | Danh sách khuyến mãi |
| `/save-sale-order-details` | POST | Lưu chi tiết đơn hàng |

### Authentication
- Tất cả API sử dụng Bearer token
- Token tự động refresh khi hết hạn
- Retry logic cho network errors

## Tối ưu hóa hiệu suất

### 1. Caching Layer
- **Long cache (5 phút)**: Products, customers, units, warehouses
- **Short cache (1 phút)**: Inventory, prices, sale-orders
- LRU Cache với giới hạn entries

### 2. Request Optimization
- Connection pooling với HTTP keep-alive
- Request deduplication tránh duplicate calls
- Parallel API calls trong prices endpoint

### 3. UX Improvements
- Debounce search (300ms)
- Loading states cho tất cả actions
- Toast notifications cho feedback

## Công nghệ sử dụng

- **Frontend**: Next.js 13+ (App Router), React, TypeScript
- **Styling**: Tailwind CSS với custom CSS
- **State Management**: React hooks + Context
- **API**: Axios với custom client
- **Authentication**: OAuth2 + JWT
- **Backend**: Dynamics CRM integration

## Quy tắc phát triển

### 1. Code Style
- TypeScript strict mode
- ESLint + Prettier
- Component naming: PascalCase
- File naming: kebab-case

### 2. CSS Isolation
- Prefix: `admin-app-*`
- CSS Modules hoặc Tailwind với prefix
- Không ảnh hưởng đến global styles

### 3. Error Handling
- Try-catch cho tất cả async operations
- Toast error messages
- Graceful fallbacks

### 4. Performance
- React.memo cho components tĩnh
- useMemo/useCallback cho expensive calculations
- Lazy loading cho heavy components

## Testing & Debugging

### 1. Development
```bash
npm run dev
# Truy cập: http://localhost:3000/admin-app
```

### 2. Build & Deploy
```bash
npm run build
npm run start
```

### 3. Debug Tools
- React DevTools
- Network tab (Chrome DevTools)
- Console logs với prefix `[AdminApp]`

## Các vấn đề thường gặp

### 1. Authentication Issues
- Kiểm tra token validity
- Clear browser cache
- Check OAuth configuration

### 2. API Errors
- Verify endpoint URLs
- Check request headers
- Monitor network connectivity

### 3. Performance Issues
- Check cache hit rates
- Monitor API response times
- Verify connection pooling

### 4. UI Responsiveness
- Test trên multiple screen sizes
- Check mobile optimization
- Verify touch interactions

## Roadmap phát triển

### Phase 1 (Hoàn thành)
- ✅ Core SO/SOBG functionality
- ✅ Authentication & authorization
- ✅ API optimization & caching
- ✅ Mobile responsive design

### Phase 2 (Đang phát triển)
- 🔄 Advanced promotion rules
- 🔄 Bulk operations
- 🔄 Export/Import features
- 🔄 Real-time inventory updates

### Phase 3 (Tương lai)
- 📋 Dashboard & analytics
- 📋 Workflow automation
- 📋 Integration với external systems
- 📋 Advanced reporting

## Liên hệ & Hỗ trợ

### Technical Leads
- **Frontend**: [Tên developer]
- **Backend**: [Tên developer]
- **DevOps**: [Tên developer]

### Documentation
- User Guide: `ADMIN_APP_USER_GUIDE.md` (Hướng dẫn sử dụng)
- API docs: `API_DOCUMENTATION.md`
- Business logic: `SO_FLOW.md`
- Promotion logic: `PROMOTION_CASES.md`

### Best Practices
- Code reviews bắt buộc cho mọi PR
- Unit tests cho critical functions
- Documentation update khi thay đổi logic

---

**Lưu ý**: Tài liệu này được cập nhật liên tục. Vui lòng check git history để xem các thay đổi gần đây.
