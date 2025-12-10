# Wecare E-commerce - Siêu thị công nghiệp

## 📋 Tổng quan dự án

Wecare E-commerce là một hệ thống thương mại điện tử B2B chuyên biệt dành cho ngành công nghiệp, được xây dựng bằng **Next.js 14** với **TypeScript**. Hệ thống cung cấp nền tảng mua sắm trực tuyến cho các doanh nghiệp với đầy đủ tính năng quản lý sản phẩm, đơn hàng, khuyến mãi và hệ thống phân quyền người dùng phức tạp.

## 🚀 Tính năng chính

### 🛍️ **E-commerce Core**
- **Catalog sản phẩm**: Hiển thị danh mục sản phẩm theo nhóm ngành hàng
- **Tìm kiếm thông minh**: Tìm kiếm sản phẩm với autocomplete và filter
- **Giỏ hàng**: Quản lý giỏ hàng với tính năng thêm/xóa/cập nhật số lượng
- **Đặt hàng**: Hệ thống đặt hàng với xác nhận và theo dõi trạng thái
- **Khuyến mãi**: Quản lý và áp dụng các chương trình khuyến mãi

### 👥 **Quản lý người dùng**
- **Đăng nhập/Đăng xuất**: Xác thực người dùng với Microsoft Azure AD
- **Phân quyền**: Hệ thống phân quyền phức tạp theo chức vụ và phòng ban
- **Profile khách hàng**: Quản lý thông tin cá nhân và lịch sử mua hàng

### 📊 **Dashboard & Analytics**
- **Lịch sử đơn hàng**: Theo dõi đơn hàng đã đặt
- **Lịch sử thanh toán**: Quản lý thông tin thanh toán
- **Báo cáo**: Dashboard cho nhân viên kinh doanh

### 🎓 **Hệ thống đào tạo**
- **Quản lý khóa học**: Tạo và quản lý các khóa đào tạo
- **Đánh giá**: Hệ thống đánh giá và chấm điểm
- **Theo dõi tiến độ**: Giám sát quá trình học tập
- **Training Auth Guard**: Bảo vệ các trang đào tạo
- **Training Login Form**: Form đăng nhập riêng cho đào tạo

### 🔍 **Tìm kiếm nâng cao**
- **Tìm kiếm bằng hình ảnh**: Upload hình ảnh để tìm sản phẩm tương tự
- **Tìm kiếm từ khóa**: Tìm kiếm thông minh với autocomplete
- **Tìm kiếm theo URL**: Tìm sản phẩm từ URL
- **Vector Database**: Hỗ trợ tìm kiếm semantic

### 📱 **Tính năng UI/UX**
- **Responsive Design**: Tối ưu cho mọi thiết bị
- **Dark/Light Mode**: Chế độ sáng/tối
- **Toast Notifications**: Thông báo real-time
- **Loading States**: Trạng thái loading mượt mà
- **Error Boundaries**: Xử lý lỗi graceful
- **Floating Zalo**: Widget chat Zalo
- **Google Tag Manager**: Analytics và tracking

## 🏗️ Kiến trúc hệ thống

### **Frontend Stack**
- **Next.js 14.2.7**: Framework React với App Router
- **TypeScript 5.8.2**: Type-safe development
- **Tailwind CSS 3.4.1**: Utility-first CSS framework
- **Material-UI 5.15.11**: Component library
- **Framer Motion 12.15.0**: Animation library
- **React 18**: UI library
- **Styled Components 6.1.13**: CSS-in-JS styling
- **React Icons 5.5.0**: Icon library
- **Lucide React 0.344.0**: Modern icon set
- **Heroicons 2.2.0**: Tailwind icon library

### **Backend Integration**
- **Microsoft Dynamics CRM**: Hệ thống quản lý khách hàng
- **Azure Blob Storage 12.26.0**: Lưu trữ file và hình ảnh
- **Azure AD (MSAL) 2.13.0**: Xác thực và phân quyền
- **Axios 1.7.7**: HTTP client
- **Pino 9.4.0**: Structured logging
- **Multer 2.0.2**: File upload handling

### **State Management & Performance**
- **React Context**: Global state management
- **Local Storage**: Client-side data persistence
- **LRU Cache 11.0.2**: In-memory caching
- **Node Cache 5.1.2**: Server-side caching
- **P-limit 6.1.0**: Concurrency control
- **Use Debounce 10.0.4**: Input debouncing

## 📁 Cấu trúc dự án

```
wecare-ecommerce/
├── src/
│   ├── app/                          # App Router (Next.js 14)
│   │   ├── [...slug]/               # Dynamic catch-all routes
│   │   ├── [masanpham]/             # Product detail pages
│   │   ├── api/                     # API routes (Next.js 14)
│   │   ├── customer/                # Customer management
│   │   ├── daotao/                  # Training system
│   │   ├── debug-info/              # Debug information
│   │   ├── demo/                    # Demo pages
│   │   ├── history-order/           # Order history
│   │   ├── history-payment/         # Payment history
│   │   ├── image-filter-demo/       # Image filtering demo
│   │   ├── login/                   # Authentication
│   │   ├── new-arrivals/            # New products
│   │   ├── post/                    # Blog posts
│   │   ├── price-by-customer/       # Customer pricing
│   │   ├── product-catalog/         # Product catalog
│   │   ├── product-list/            # Product listing (26 files)
│   │   ├── product-list-example/    # Product list examples
│   │   ├── profile-customer/        # Customer profile
│   │   ├── promotion/               # Promotions
│   │   ├── sale-orders/             # Sales orders
│   │   ├── san-pham/                # Product pages (9 files)
│   │   ├── test-siderbar/           # Sidebar testing
│   │   ├── thong-tin-thanh-toan-cong-ty/ # Company payment info
│   │   ├── tim-kiem-bang-hinh-anh/  # Image search
│   │   ├── top-san-pham-ban-chay/   # Top selling products
│   │   ├── tuyen-dung/              # Recruitment
│   │   ├── config.ts                # App configuration
│   │   ├── globals.css              # Global styles
│   │   ├── layout.tsx               # Root layout
│   │   ├── loading.tsx              # Loading component
│   │   ├── not-found.tsx            # 404 page
│   │   └── page.tsx                 # Home page
│   ├── assets/                      # Static assets
│   │   └── img/                     # Images (15 files)
│   ├── components/                   # Reusable components (68 files)
│   │   ├── component_Header/        # Header components (8 files)
│   │   ├── shadcn/                  # Shadcn UI components
│   │   ├── ui/                      # UI components (13 files)
│   │   ├── AddToCartWithPromotion.tsx
│   │   ├── BusinessOpportunitySection.tsx
│   │   ├── CartGlobalManager.tsx
│   │   ├── CartManager.tsx
│   │   ├── CategorySection.tsx
│   │   ├── EvaluationForm.tsx
│   │   ├── FloatingZalo.tsx
│   │   ├── footer.tsx
│   │   ├── GTMAlternative.tsx
│   │   ├── header.tsx
│   │   ├── HeroSection.tsx
│   │   ├── LatestProductsSection.tsx
│   │   ├── LoginForm.tsx
│   │   ├── PermissionGuard.tsx
│   │   ├── PromotionPopup.tsx
│   │   ├── PromotionsSection.tsx
│   │   ├── ToastManager.tsx
│   │   └── ... (other components)
│   ├── constants/                   # Application constants
│   │   └── constants.ts
│   ├── hooks/                       # Custom hooks (8 files)
│   ├── lib/                         # Utility libraries
│   │   ├── gtm.ts                   # Google Tag Manager
│   │   └── utils.ts
│   ├── middleware.ts                # Next.js middleware
│   ├── model/                       # Data models & interfaces (45 files)
│   ├── types/                       # TypeScript type definitions
│   │   └── toast.ts
│   └── utils/                       # Helper functions (16 files)
├── pages/
│   ├── api/                         # Legacy API routes (40+ endpoints)
│   │   ├── auth/                    # Authentication APIs
│   │   │   └── trainingLogin.ts
│   │   ├── productGroups/           # Product group APIs
│   │   │   └── cache.ts
│   │   ├── getCustomerData.ts       # Customer data
│   │   ├── getProductData.ts        # Product data
│   │   ├── getPromotionData.ts      # Promotion data
│   │   ├── searchProductsByImage.ts # Image search
│   │   ├── uploadFile.ts            # File upload
│   │   └── ... (other API endpoints)
│   └── test-upload.tsx              # Upload testing
├── public/                          # Static assets
│   ├── images/                      # Image assets
│   ├── pdfjs/                       # PDF.js library
│   ├── Logo-Wecare.png
│   ├── logo.svg
│   └── ... (other static files)
├── components/                      # Legacy components
│   ├── TrainingAuthGuard.tsx
│   └── TrainingLoginForm.tsx
├── data/                            # Data storage
│   └── vector-db/                   # Vector database
├── docker-compose.yml               # Docker configuration
├── Dockerfile                       # Docker image
├── next.config.mjs                  # Next.js configuration
├── package.json                     # Dependencies
├── tailwind.config.ts               # Tailwind CSS config
├── tsconfig.json                    # TypeScript config
└── README.md                        # This file
```

## 🔧 API Endpoints

### **Sản phẩm & Catalog**
- `GET /api/getProductData` - Lấy danh sách sản phẩm
- `GET /api/getProductGroup` - Lấy nhóm sản phẩm
- `GET /api/getProductsByGroupCode` - Sản phẩm theo nhóm
- `GET /api/getTop30ProductsWithPromotion` - Top sản phẩm khuyến mãi

### **Khách hàng & Đơn hàng**
- `GET /api/getCustomerData` - Thông tin khách hàng
- `GET /api/getDataDathangSO` - Lịch sử đặt hàng
- `POST /api/postDataDathangSO` - Tạo đơn hàng mới
- `GET /api/getSaleOrdersData` - Dữ liệu đơn bán hàng

### **Khuyến mãi**
- `GET /api/getAllPromotions` - Tất cả khuyến mãi
- `GET /api/getPromotionData` - Chi tiết khuyến mãi
- `GET /api/getPromotionProducts` - Sản phẩm khuyến mãi

### **Nhân viên & Phân quyền**
- `GET /api/getEmployeData` - Thông tin nhân viên
- `POST /api/auth/trainingLogin` - Đăng nhập đào tạo

### **Đào tạo**
- `GET /api/getDaoTaoData` - Dữ liệu đào tạo
- `GET /api/getDanhSachHocVien` - Danh sách học viên
- `POST /api/submitEvaluation` - Nộp bài đánh giá

### **Tuyển dụng**
- `GET /api/getPositionData` - Vị trí tuyển dụng
- `POST /api/submitApplication` - Nộp đơn ứng tuyển

### **File & Upload**
- `POST /api/uploadFile` - Upload file lên Azure Blob
- `DELETE /api/deleteFile` - Xóa file

### **Tìm kiếm & AI**
- `POST /api/searchProductsByImage` - Tìm kiếm sản phẩm bằng hình ảnh
- `GET /api/searchProductsByKeywords` - Tìm kiếm sản phẩm bằng từ khóa
- `GET /api/searchProductByUrl` - Tìm kiếm sản phẩm theo URL
- `GET /api/testNilonSearch` - Test tìm kiếm Nilon
- `GET /api/testSynonymsSearch` - Test tìm kiếm từ đồng nghĩa

### **Debug & Testing**
- `GET /api/debugProductGroup` - Debug thông tin nhóm sản phẩm
- `GET /api/testProducts` - Test API sản phẩm
- `GET /api/testSearch` - Test tìm kiếm
- `GET /api/countCustomer` - Đếm số lượng khách hàng
- `GET /api/countProducts` - Đếm số lượng sản phẩm
- `GET /api/countProductGroups` - Đếm số lượng nhóm sản phẩm
- `GET /api/checkDuplicate` - Kiểm tra trùng lặp

## 🔐 Hệ thống phân quyền

Hệ thống sử dụng phân quyền dựa trên **chức vụ** và **phòng ban**:

### **Permission Types**
- **ONLINE**: Chỉ xem giá, không đặt hàng
- **DIRECT**: Xem giá và đặt hàng
- **NONE**: Không có quyền đặc biệt

### **Sales Flow**
- **ITEM_PRICE_BY_CUSTOMER**: Luồng xem giá theo khách hàng
- **SALE_ORDER**: Luồng đặt hàng trực tiếp

### **Chức vụ có quyền đặc biệt**

#### **Online Permission (283640045)**
- Trưởng phòng Phát triển Kinh doanh (283640049)
- Trưởng nhóm Kinh doanh Online (283640073)
- Giám sát Kinh doanh Online (283640051)
- Chuyên viên Kinh doanh Online (283640056)
- **Nhân viên Kinh doanh Online (283640045)**
- Sales Admin Kinh doanh Online (283640072)

#### **Direct Permission**
- Trưởng nhóm khu vực Kinh doanh bán lẻ (283640032)
- Giám sát vùng Kinh doanh bán lẻ (283640033)
- Nhân viên Kinh doanh bán lẻ (283640034)
- Quản lý Đội ngũ hiện trường (283640089)

### **Permission Logic Flow**
```typescript
// Luồng kiểm tra permission
const permission = getPermissionByChucVu(chucVuVi);

if (chucVuVi === 283640045) {
  // Nhân viên Kinh doanh Online -> Price by Customer
  return {
    type: 'ONLINE',
    canViewPrice: true,
    canCreateOrder: false,
    salesFlow: 'ITEM_PRICE_BY_CUSTOMER'
  };
} else if (directPermissionRoles.includes(chucVuVi)) {
  // Nhân viên bán lẻ -> Sale Order
  return {
    type: 'DIRECT', 
    canViewPrice: true,
    canCreateOrder: true,
    salesFlow: 'SALE_ORDER'
  };
}
```

Chi tiết xem file: [PERMISSION_SYSTEM.md](./PERMISSION_SYSTEM.md)

## 🔄 Luồng nghiệp vụ chính

### **1. Luồng Đăng nhập & Xác thực**

```mermaid
graph TD
    A[User truy cập /login] --> B[Nhập email + password]
    B --> C{Kiểm tra email format}
    C -->|Email| D[Gọi API /getEmployeData]
    C -->|Không phải email| E[Gọi API /getCustomerData]
    
    D --> F{Password = phone?}
    F -->|Đúng| G[Lưu thông tin sale vào localStorage]
    F -->|Sai| H[Hiển thị lỗi]
    
    E --> I{Password đúng?}
    I -->|Đúng| J[Lưu thông tin customer vào localStorage]
    I -->|Sai| H
    
    G --> K{Kiểm tra phòng ban đặc biệt?}
    K -->|Có| L[Áp dụng permission đặc biệt]
    K -->|Không| M[Permission mặc định]
    
    L --> N[Redirect về trang chủ]
    M --> N
    J --> N
```

### **2. Luồng Phân quyền Truy cập**

```mermaid
graph TD
    A[User đã đăng nhập] --> B{Kiểm tra userType}
    B -->|sale| C{Kiểm tra departmentId}
    B -->|customer| D[Quyền customer thường]
    
    C -->|191920005| E{Kiểm tra chucVuVi}
    C -->|Khác| F[Quyền sale thường]
    
    E -->|283640045| G[ONLINE Permission]
    E -->|283640032,33,34,89| H[DIRECT Permission] 
    E -->|Khác| I[ONLINE Permission khác]
    
    G --> J[Chỉ xem giá - Price by Customer]
    H --> K[Xem giá + Đặt hàng - Sale Order]
    I --> J
    
    J --> L[Redirect /price-by-customer]
    K --> M[Redirect /sale-orders]
```

### **3. Luồng Mua sắm E-commerce**

```mermaid
graph TD
    A[Trang chủ] --> B[Duyệt danh mục sản phẩm]
    B --> C[Chọn nhóm sản phẩm]
    C --> D[Xem danh sách sản phẩm]
    D --> E[Xem chi tiết sản phẩm]
    
    E --> F{Thêm vào giỏ hàng}
    F -->|Có| G[Cập nhật giỏ hàng]
    F -->|Không| H[Tiếp tục mua sắm]
    
    G --> I[Xem giỏ hàng]
    I --> J{Checkout}
    J -->|Customer| K[Tạo đơn hàng trực tiếp]
    J -->|Sale Online| L[Gửi yêu cầu báo giá]
    J -->|Sale Direct| K
    
    K --> M[Xác nhận đơn hàng]
    L --> N[Chờ phê duyệt giá]
    
    M --> O[Theo dõi đơn hàng]
    N --> P[Phê duyệt giá] --> M
```

### **4. Luồng Quản lý Đơn hàng (Sale)**

```mermaid
graph TD
    A[Sale đăng nhập] --> B{Permission type}
    B -->|ONLINE| C[Truy cập Price by Customer]
    B -->|DIRECT| D[Truy cập Sale Orders]
    
    C --> E[Chọn khách hàng]
    E --> F[Xem giá sản phẩm theo khách hàng]
    F --> G[Tư vấn giá cho khách hàng]
    
    D --> H[Tab Sale Order]
    D --> I[Tab Sale Confirm]
    
    H --> J[Chọn khách hàng]
    J --> K[Tạo đơn hàng]
    K --> L[Thêm sản phẩm vào đơn]
    L --> M[Gửi đơn hàng]
    
    I --> N[Xem đơn hàng chờ xác nhận]
    N --> O[Duyệt/Từ chối đơn hàng]
    O --> P[Cập nhật trạng thái]
```

### **5. Luồng Khuyến mãi & Tính giá chi tiết**

```mermaid
graph TD
    A[Hệ thống tải khuyến mãi] --> B[Lưu cache promotionData]
    B --> C[User xem sản phẩm]
    C --> D{Sản phẩm có khuyến mãi?}
    
    D -->|Có| E[Hiển thị badge khuyến mãi]
    D -->|Không| F[Hiển thị giá thường]
    
    E --> G[Click xem chi tiết KM]
    G --> H[Modal hiển thị thông tin KM]
    H --> I{Thêm vào giỏ hàng}
    
    I -->|Có| J[Áp dụng giá khuyến mãi]
    I -->|Không| K[Đóng modal]
    
    J --> L[Tính toán giá cuối]
    L --> M[Hiển thị trong giỏ hàng]
```

#### **🎯 Các loại Khuyến mãi (Chi tiết đầy đủ)**

**1. Khuyến mãi theo Số lượng (Quantity-based) - 3 mức**
```typescript
interface QuantityPromotion {
  // Cấu hình cơ bản
  crdfd_name: string,                    // Tên khuyến mãi
  crdfd_conditions?: string,             // Điều kiện khuyến mãi
  congdonsoluong: true,                  // Có cộng dồn số lượng
  
  // 3 mức giá khuyến mãi
  value: number,                         // Giá trị KM mức 1 (mặc định)
  value2: number,                        // Giá trị KM mức 2
  value3?: number,                       // Giá trị KM mức 3 (tùy chọn)
  
  // Điều kiện số lượng
  soluongapdung: number,                 // Số lượng để lên mức 2
  soluongapdungmuc3?: number,            // Số lượng để lên mức 3
  
  // Loại giảm giá
  vn: "191920000" | "191920001",         // 191920000=%, 191920001=tiền
  
  // Thời gian hiệu lực
  crdfd_start_date: string,              // Ngày bắt đầu
  crdfd_end_date: string,                // Ngày kết thúc
  
  // Áp dụng cho sản phẩm/nhóm
  crdfd_masanpham_multiple?: string,     // Danh sách mã SP (phân cách bằng ,)
  crdfd_multiple_manhomsp?: string,      // Danh sách mã nhóm SP
}

// Logic áp dụng chi tiết:
const calculateQuantityBasedPromotion = (promotion, totalQuantity) => {
  let appliedValue, level;
  
  if (promotion.value3 && totalQuantity >= promotion.soluongapdungmuc3) {
    appliedValue = promotion.value3;
    level = 3;
    status = `Đạt mức 3: Mua từ ${promotion.soluongapdungmuc3} sản phẩm`;
  } else if (promotion.value2 && totalQuantity >= promotion.soluongapdung) {
    appliedValue = promotion.value2;
    level = 2;
    const nextLevel = promotion.soluongapdungmuc3 - totalQuantity;
    status = `Đạt mức 2: Mua thêm ${nextLevel} để lên mức 3`;
  } else {
    appliedValue = promotion.value;
    level = 1;
    const nextLevel = promotion.soluongapdung - totalQuantity;
    status = `Mức 1: Mua thêm ${nextLevel} để lên mức 2`;
  }
  
  return { appliedValue, level, status };
};
```

**2. Khuyến mãi theo Tổng tiền (Amount-based)**
```typescript
interface AmountPromotion {
  // Điều kiện tổng tiền
  tongTienApDung: number,                // Tổng tiền tối thiểu (VND)
  productCodes: string[],                // Danh sách mã SP áp dụng
  
  // 2 mức giá
  value: number,                         // Giá trị KM khi < tongTienApDung
  value2: number,                        // Giá trị KM khi >= tongTienApDung
  
  // Loại giảm giá
  vn: "191920000" | "191920001",         // % hoặc tiền
  
  // Thông tin bổ sung
  crdfd_conditions: string,              // Mô tả điều kiện
  crdfd_name: string,                    // Tên khuyến mãi
}

// Logic tính toán:
const calculateAmountBasedPromotion = (promotion, cartItems) => {
  // Tính tổng tiền của các sản phẩm trong danh sách
  const applicableItems = cartItems.filter(item => 
    promotion.productCodes.includes(item.productId)
  );
  
  const totalAmount = applicableItems.reduce((sum, item) => 
    sum + (parseFloat(item.price) * item.quantity), 0
  );
  
  // Xác định mức giảm giá
  const isLevel2 = totalAmount >= promotion.tongTienApDung;
  const appliedValue = isLevel2 ? promotion.value2 : promotion.value;
  
  // Tính progress
  const progress = Math.min((totalAmount / promotion.tongTienApDung) * 100, 100);
  const remainingAmount = Math.max(promotion.tongTienApDung - totalAmount, 0);
  
  return {
    appliedValue,
    level: isLevel2 ? 2 : 1,
    totalAmount,
    progress,
    remainingAmount,
    status: isLevel2 
      ? `Đạt mức 2: Tổng tiền ${totalAmount.toLocaleString()} VND`
      : `Mức 1: Mua thêm ${remainingAmount.toLocaleString()} VND để lên mức 2`
  };
};
```

**3. Khuyến mãi Mua kèm (Bundle Promotion)**
```typescript
interface BundlePromotion {
  // Sản phẩm chính (được giảm giá)
  crdfd_masanpham_multiple: string,      // Mã sản phẩm chính
  crdfd_tensanpham_multiple: string,     // Tên sản phẩm chính
  
  // Sản phẩm mua kèm (điều kiện)
  maSanPhamMuaKem: string,               // Mã SP phải mua kèm
  tenSanPhamMuaKem: string,              // Tên SP mua kèm
  maNhomSPMuaKem?: string,               // Hoặc mã nhóm SP mua kèm
  tenNhomSPMuaKem?: string,              // Tên nhóm SP mua kèm
  
  // Giá trị khuyến mãi
  value: number,                         // Giá trị giảm cho SP chính
  vn: "191920000" | "191920001",         // % hoặc tiền
  
  // Thông tin khuyến mãi
  crdfd_name: string,                    // Tên KM
  crdfd_conditions: string,              // Điều kiện chi tiết
}

// Logic kiểm tra phức tạp:
const checkBundlePromotion = (promotion, cartItems, mainProductId) => {
  // 1. Kiểm tra sản phẩm chính có trong giỏ không
  const mainProduct = cartItems.find(item => 
    item.productId === mainProductId
  );
  
  if (!mainProduct) return { eligible: false, reason: "Không có sản phẩm chính" };
  
  // 2. Kiểm tra sản phẩm mua kèm
  const requiredProducts = promotion.maSanPhamMuaKem.split(',').map(code => code.trim());
  const requiredGroups = promotion.maNhomSPMuaKem?.split(',').map(code => code.trim()) || [];
  
  const hasBundledProduct = cartItems.some(item => {
    // Kiểm tra theo mã sản phẩm
    if (requiredProducts.includes(item.productId)) return true;
    
    // Kiểm tra theo nhóm sản phẩm
    if (requiredGroups.includes(item.productGroupCode)) return true;
    
    return false;
  });
  
  if (!hasBundledProduct) {
    return { 
      eligible: false, 
      reason: `Cần mua kèm: ${promotion.tenSanPhamMuaKem}`,
      requiredProducts: promotion.tenSanPhamMuaKem
    };
  }
  
  return { eligible: true, appliedValue: promotion.value };
};
```

**4. Khuyến mãi theo Nhóm khách hàng (Customer Group)**
```typescript
interface CustomerGroupPromotion {
  // Nhóm khách hàng
  _crdfd_customergroup_value: string,    // ID nhóm khách hàng
  crdfd_customergrouptext: string,       // Tên nhóm khách hàng
  
  // Khách hàng cụ thể (tùy chọn)
  cr3b9_ma_khachhang_apdung?: string,    // Danh sách mã KH (phân cách bằng ,)
  
  // Điều kiện thanh toán
  ieuKhoanThanhToanApDung?: string,      // Điều kiện thanh toán
  
  // Giá trị khuyến mãi
  value: number,
  vn: "191920000" | "191920001",
  
  // Loại khuyến mãi
  crdfd_type: "Product" | "Order" | "Revenue",
}

// Logic kiểm tra quyền:
const checkCustomerEligibility = async (customerId, promotion) => {
  // 1. Lấy thông tin nhóm khách hàng
  const customerGroups = await getCustomerGroups(customerId);
  const customerGroupIds = customerGroups.map(g => g.customerGroupId);
  
  // 2. Kiểm tra nhóm khách hàng
  const isGroupEligible = !promotion._crdfd_customergroup_value || 
    customerGroupIds.includes(promotion._crdfd_customergroup_value);
  
  // 3. Kiểm tra khách hàng cụ thể (nếu có)
  let isCustomerSpecific = true;
  if (promotion.cr3b9_ma_khachhang_apdung) {
    const allowedCustomers = promotion.cr3b9_ma_khachhang_apdung.split(',')
      .map(code => code.trim());
    const customerCode = await getCustomerCode(customerId);
    isCustomerSpecific = allowedCustomers.includes(customerCode);
  }
  
  return {
    eligible: isGroupEligible && isCustomerSpecific,
    customerGroups,
    reason: !isGroupEligible ? "Nhóm khách hàng không đủ điều kiện" :
            !isCustomerSpecific ? "Khách hàng không trong danh sách áp dụng" : null
  };
};
```

**5. Khuyến mãi có Điều kiện đặc biệt**
```typescript
interface ConditionalPromotion {
  // Điều kiện loại bỏ
  cr3b9_loaibopromotionname?: "yes" | "no", // Loại bỏ promotion
  
  // Điều kiện thời gian
  crdfd_start_date: string,                 // Ngày bắt đầu
  crdfd_end_date: string,                   // Ngày kết thúc
  
  // Trạng thái
  statecode: 0 | 1,                         // 0=Active, 1=Inactive
  crdfd_promotion_deactive: "Active" | "Inactive",
  
  // Loại khuyến mãi
  crdfd_type: "Product" | "Order" | "Revenue",
  
  // Điều kiện tùy chỉnh
  crdfd_conditions?: string,                // Mô tả điều kiện
  
  // Ưu tiên
  crdfd_priority?: number,                  // Độ ưu tiên (số cao hơn = ưu tiên hơn)
}

// Logic kiểm tra điều kiện:
const validatePromotionConditions = (promotion, context) => {
  // 1. Kiểm tra loại bỏ promotion
  if (context.productPricing?.some(p => p.cr3b9_loaibopromotionname === "yes")) {
    return { valid: false, reason: "Sản phẩm được loại bỏ khỏi khuyến mãi" };
  }
  
  // 2. Kiểm tra thời gian
  const now = new Date();
  const startDate = new Date(promotion.crdfd_start_date);
  const endDate = new Date(promotion.crdfd_end_date);
  
  if (now < startDate) {
    return { valid: false, reason: "Khuyến mãi chưa bắt đầu" };
  }
  
  if (now > endDate) {
    return { valid: false, reason: "Khuyến mãi đã kết thúc" };
  }
  
  // 3. Kiểm tra trạng thái
  if (promotion.statecode !== 0 || promotion.crdfd_promotion_deactive !== "Active") {
    return { valid: false, reason: "Khuyến mãi không hoạt động" };
  }
  
  // 4. Kiểm tra loại khuyến mãi
  if (promotion.crdfd_type === "Order" && context.orderType !== "sale_order") {
    return { valid: false, reason: "Khuyến mãi chỉ áp dụng cho đơn hàng" };
  }
  
  return { valid: true };
};
```

#### **💰 Logic tính giá Khuyến mãi**

```typescript
// Hàm tính giá chính
const calculatePromotionPrice = (
  originalPrice: number,
  promotion: Promotion,
  totalQuantity: number,
  cartItems?: CartItem[]
) => {
  // 1. Ưu tiên kiểm tra tongTienApDung
  if (promotion.tongTienApDung && promotion.productCodes) {
    const totalValue = cartItems
      .filter(item => promotion.productCodes.includes(item.productId))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const appliedValue = totalValue >= promotion.tongTienApDung 
      ? promotion.value2 
      : promotion.value;
    
    return applyDiscountValue(originalPrice, appliedValue, promotion.vn);
  }

  // 2. Kiểm tra sản phẩm mua kèm
  if (promotion.maSanPhamMuaKem) {
    const hasBundledProduct = cartItems?.some(item => 
      promotion.maSanPhamMuaKem.includes(item.productId)
    );
    
    if (!hasBundledProduct) {
      return originalPrice; // Không đủ điều kiện
    }
  }

  // 3. Logic theo số lượng (3 mức)
  let appliedValue;
  if (promotion.value3 && totalQuantity >= promotion.soluongapdungmuc3) {
    appliedValue = promotion.value3;  // Mức 3
  } else if (promotion.value2 && totalQuantity >= promotion.soluongapdung) {
    appliedValue = promotion.value2;  // Mức 2
  } else {
    appliedValue = promotion.value;   // Mức 1
  }

  return applyDiscountValue(originalPrice, appliedValue, promotion.vn);
};

// Hàm áp dụng giảm giá
const applyDiscountValue = (
  price: number, 
  value: number, 
  type: "191920000" | "191920001"
) => {
  if (type === "191920000") {
    // Giảm theo phần trăm
    return Math.max(0, price * (1 - value / 100));
  } else {
    // Giảm theo số tiền cố định
    return Math.max(0, price - value);
  }
};
```

#### **🔄 Workflow xử lý Promotion (Chi tiết đầy đủ)**

**Bước 1: Fetch Promotions từ CRM với Customer Context**
```typescript
// API: /api/getPromotionDataNewVersion
const fetchPromotionsWithCustomerContext = async (customerId, productCodes, productGroupCodes) => {
  // 1. Lấy thông tin nhóm khách hàng
  const customerGroups = await getCustomerGroups(customerId);
  const customerGroupIds = customerGroups.map(g => g.customerGroupId);
  
  // 2. Xây dựng filter phức tạp
  const promotionFilter = customerGroupIds.map(id => 
    `statecode eq 0 and _crdfd_customergroup_value eq '${id}' or _crdfd_customergroup_value eq null`
  ).join(' or ');
  
  // 3. Filter theo sản phẩm và nhóm sản phẩm
  let additionalFilters = [];
  
  if (productCodes) {
    const productFilter = productCodes.map(code => 
      `contains(crdfd_masanpham_multiple,'${code}')`
    ).join(' or ');
    additionalFilters.push(`(${productFilter})`);
  }
  
  if (productGroupCodes) {
    const groupFilter = productGroupCodes.map(code => 
      `contains(crdfd_multiple_manhomsp,'${code}')`
    ).join(' or ');
    additionalFilters.push(`(${groupFilter})`);
  }
  
  // 4. Filter theo mã khách hàng cụ thể
  const customerCode = await getCustomerCode(customerId);
  const customerSpecificFilter = `
    (startswith(cr3b9_ma_khachhang_apdung,'${customerCode},') or 
     endswith(cr3b9_ma_khachhang_apdung,',${customerCode}') or 
     contains(cr3b9_ma_khachhang_apdung,',${customerCode},') or 
     cr3b9_ma_khachhang_apdung eq '${customerCode}')
  `;
  
  // 5. Combine tất cả filters
  const finalFilter = [
    `(${promotionFilter})`,
    'statecode eq 0',
    'crdfd_promotion_deactive eq \'Active\'',
    `crdfd_start_date le ${new Date().toISOString()}`,
    `crdfd_end_date ge ${new Date().toISOString()}`,
    ...additionalFilters,
    `(${customerSpecificFilter})`
  ].join(' and ');
  
  return await fetchPromotions(finalFilter);
};
```

**Bước 2: Advanced Promotion Matching**
```typescript
const findBestPromotion = (promotions, productCode, productGroupCode, pricing) => {
  // 1. Kiểm tra loại bỏ promotion
  if (pricing?.some(p => p.cr3b9_loaibopromotionname === "yes")) {
    return null;
  }
  
  // 2. Tìm promotions theo mã sản phẩm (ưu tiên cao nhất)
  const productPromotions = promotions.filter(promo => {
    if (!promo.crdfd_masanpham_multiple) return false;
    
    const codes = promo.crdfd_masanpham_multiple
      .split(/,\s*/)
      .map(code => code.trim().toLowerCase());
    
    return codes.includes(productCode.toLowerCase());
  });
  
  // 3. Tìm promotions theo nhóm sản phẩm
  const groupPromotions = promotions.filter(promo => {
    if (!promo.crdfd_multiple_manhomsp) return false;
    
    const groupCodes = promo.crdfd_multiple_manhomsp
      .split(/,\s*/)
      .map(code => code.trim().toLowerCase());
    
    return groupCodes.includes(productGroupCode.toLowerCase());
  });
  
  // 4. Chọn promotion tốt nhất (giá trị cao nhất)
  const allApplicablePromotions = [...productPromotions, ...groupPromotions];
  
  if (allApplicablePromotions.length === 0) return null;
  
  // Sắp xếp theo độ ưu tiên và giá trị
  return allApplicablePromotions.reduce((best, current) => {
    const bestValue = parseFloat(best.crdfd_value || "0");
    const currentValue = parseFloat(current.crdfd_value || "0");
    
    // Ưu tiên promotion theo sản phẩm trước
    if (productPromotions.includes(current) && !productPromotions.includes(best)) {
      return current;
    }
    
    // Nếu cùng loại, chọn giá trị cao hơn
    return currentValue > bestValue ? current : best;
  });
};
```

**Bước 3: Complex Price Calculation Engine**
```typescript
const calculateComplexPromotionPrice = (
  originalPrice: number,
  promotion: any,
  cartItems: CartItem[],
  customerId: string
) => {
  // 1. Validate promotion conditions
  const conditionCheck = validatePromotionConditions(promotion, {
    customerId,
    cartItems,
    currentDate: new Date()
  });
  
  if (!conditionCheck.valid) {
    return {
      finalPrice: originalPrice,
      appliedDiscount: 0,
      reason: conditionCheck.reason,
      promotionApplied: false
    };
  }
  
  // 2. Xử lý theo loại promotion
  let calculationResult;
  
  if (promotion.tongTienApDung) {
    // Amount-based promotion
    calculationResult = calculateAmountBasedPromotion(promotion, cartItems);
  } else if (promotion.maSanPhamMuaKem) {
    // Bundle promotion
    const bundleCheck = checkBundlePromotion(promotion, cartItems);
    if (!bundleCheck.eligible) {
      return {
        finalPrice: originalPrice,
        appliedDiscount: 0,
        reason: bundleCheck.reason,
        promotionApplied: false,
        requiredProducts: bundleCheck.requiredProducts
      };
    }
    calculationResult = { appliedValue: bundleCheck.appliedValue, level: 1 };
  } else {
    // Quantity-based promotion
    const totalQuantity = getTotalQuantityByPromotion(cartItems, promotion.promotionId);
    calculationResult = calculateQuantityBasedPromotion(promotion, totalQuantity);
  }
  
  // 3. Áp dụng giảm giá
  const finalPrice = applyDiscountValue(
    originalPrice, 
    calculationResult.appliedValue, 
    promotion.vn
  );
  
  // 4. Tính toán thông tin bổ sung
  const appliedDiscount = originalPrice - finalPrice;
  const discountPercentage = (appliedDiscount / originalPrice) * 100;
  
  return {
    finalPrice: Math.max(0, Math.round(finalPrice)),
    originalPrice,
    appliedDiscount: Math.round(appliedDiscount),
    discountPercentage: Math.round(discountPercentage * 100) / 100,
    promotionLevel: calculationResult.level,
    promotionName: promotion.crdfd_name,
    promotionConditions: promotion.crdfd_conditions,
    status: calculationResult.status,
    progress: calculationResult.progress,
    nextLevelInfo: calculationResult.nextLevel,
    promotionApplied: true
  };
};
```

**Bước 4: Real-time Cart Synchronization**
```typescript
const synchronizeCartPromotions = (cartItems: CartItem[]) => {
  // 1. Group items by promotion
  const promotionGroups = new Map();
  
  cartItems.forEach(item => {
    if (item.promotion?.promotionId) {
      const promotionId = item.promotion.promotionId;
      if (!promotionGroups.has(promotionId)) {
        promotionGroups.set(promotionId, []);
      }
      promotionGroups.get(promotionId).push(item);
    }
  });
  
  // 2. Recalculate prices for each promotion group
  const updatedItems = cartItems.map(item => {
    if (!item.promotion) return item;
    
    const promotionItems = promotionGroups.get(item.promotion.promotionId) || [item];
    
    // Calculate total quantity and amount for this promotion
    const totalQuantity = promotionItems.reduce((sum, pItem) => sum + pItem.quantity, 0);
    const totalAmount = promotionItems.reduce((sum, pItem) => 
      sum + (parseFloat(pItem.regularPrice) * pItem.quantity), 0
    );
    
    // Recalculate price
    const priceCalculation = calculateComplexPromotionPrice(
      parseFloat(item.regularPrice),
      item.promotion,
      cartItems,
      item.customerId
    );
    
    return {
      ...item,
      finalPrice: priceCalculation.finalPrice,
      appliedDiscount: priceCalculation.appliedDiscount,
      discountPercentage: priceCalculation.discountPercentage,
      promotionLevel: priceCalculation.promotionLevel,
      promotionStatus: priceCalculation.status,
      promotionProgress: priceCalculation.progress,
      nextLevelInfo: priceCalculation.nextLevelInfo,
      // Update promotion metadata
      promotion: {
        ...item.promotion,
        isValue2Applied: priceCalculation.promotionLevel === 2,
        isValue3Applied: priceCalculation.promotionLevel === 3,
        appliedValue: priceCalculation.appliedDiscount.toString(),
        currentLevel: priceCalculation.promotionLevel,
        totalQuantity,
        totalAmount
      }
    };
  });
  
  // 3. Validate cross-promotion dependencies
  return validateCrossPromotionDependencies(updatedItems);
};
```

**Bước 5: Advanced Display & UX Logic**
```typescript
const generatePromotionDisplayInfo = (item: CartItem) => {
  if (!item.promotion || !item.promotionApplied) {
    return { hasPromotion: false };
  }
  
  const promotion = item.promotion;
  const currentLevel = promotion.currentLevel || 1;
  
  // Generate progress bar info
  let progressInfo = {};
  
  if (promotion.tongTienApDung) {
    // Amount-based progress
    const progress = Math.min((promotion.totalAmount / promotion.tongTienApDung) * 100, 100);
    const remaining = Math.max(promotion.tongTienApDung - promotion.totalAmount, 0);
    
    progressInfo = {
      type: 'amount',
      current: promotion.totalAmount,
      target: promotion.tongTienApDung,
      progress,
      remaining,
      unit: 'VND',
      message: remaining > 0 
        ? `Mua thêm ${remaining.toLocaleString()} VND để được giảm giá cao hơn`
        : 'Đã đạt mức giảm giá tối đa'
    };
  } else {
    // Quantity-based progress
    const currentTarget = currentLevel === 1 ? promotion.soluongapdung : promotion.soluongapdungmuc3;
    const progress = Math.min((promotion.totalQuantity / currentTarget) * 100, 100);
    const remaining = Math.max(currentTarget - promotion.totalQuantity, 0);
    
    progressInfo = {
      type: 'quantity',
      current: promotion.totalQuantity,
      target: currentTarget,
      progress,
      remaining,
      unit: 'sản phẩm',
      message: remaining > 0 
        ? `Mua thêm ${remaining} sản phẩm để được giảm giá cao hơn`
        : 'Đã đạt mức giảm giá tối đa'
    };
  }
  
  // Generate badge info
  const badgeInfo = {
    text: `Giảm ${item.discountPercentage}%`,
    color: currentLevel === 3 ? 'gold' : currentLevel === 2 ? 'silver' : 'bronze',
    level: currentLevel,
    savings: `Tiết kiệm ${item.appliedDiscount.toLocaleString()} VND`
  };
  
  // Generate tooltip info
  const tooltipInfo = {
    title: promotion.name,
    conditions: promotion.conditions,
    currentLevel: `Đang ở mức ${currentLevel}`,
    appliedDiscount: `Giảm ${item.discountPercentage}%`,
    originalPrice: `Giá gốc: ${item.originalPrice.toLocaleString()} VND`,
    finalPrice: `Giá sau KM: ${item.finalPrice.toLocaleString()} VND`
  };
  
  return {
    hasPromotion: true,
    progressInfo,
    badgeInfo,
    tooltipInfo,
    canUpgrade: progressInfo.remaining > 0,
    maxLevel: promotion.value3 ? 3 : (promotion.value2 ? 2 : 1)
  };
};
```

### **6. Luồng Đào tạo**

```mermaid
graph TD
    A[Truy cập /training] --> B[Đăng nhập training]
    B --> C[API trainingLogin]
    C --> D{Xác thực thành công?}
    
    D -->|Có| E[Hiển thị danh sách khóa học]
    D -->|Không| F[Lỗi đăng nhập]
    
    E --> G[Chọn khóa học]
    G --> H[Xem nội dung bài học]
    H --> I[Hoàn thành bài học]
    
    I --> J{Có bài kiểm tra?}
    J -->|Có| K[Làm bài kiểm tra]
    J -->|Không| L[Chuyển bài tiếp theo]
    
    K --> M[Nộp bài]
    M --> N[Chấm điểm tự động]
    N --> O{Đạt điểm tối thiểu?}
    
    O -->|Có| P[Cập nhật tiến độ]
    O -->|Không| Q[Làm lại bài kiểm tra]
    
    P --> L
```

### **7. Luồng Tuyển dụng**

```mermaid
graph TD
    A[Truy cập /tuyen-dung] --> B[Xem danh sách vị trí tuyển dụng]
    B --> C[API getPositionData]
    C --> D[Hiển thị các vị trí đang mở]
    
    D --> E[Click "Ứng tuyển"]
    E --> F[Điền form ứng tuyển]
    F --> G[Upload CV/Documents]
    G --> H[API uploadFile]
    
    H --> I[API submitApplication]
    I --> J{Gửi thành công?}
    
    J -->|Có| K[Hiển thị thông báo thành công]
    J -->|Không| L[Hiển thị lỗi]
    
    K --> M[Email xác nhận gửi cho ứng viên]
    M --> N[HR nhận thông báo có đơn mới]
```

## ⚙️ Cài đặt và chạy dự án

### **Yêu cầu hệ thống**
- Node.js >= 18.0.0
- npm >= 8.0.0
- TypeScript >= 5.8.2
- Docker (optional) >= 20.0.0
- Git >= 2.30.0

### **Cài đặt dependencies**
```bash
# Clone repository
git clone <repository-url>
cd wecare-ecommerce

# Install dependencies
npm install

# Hoặc sử dụng yarn
yarn install

# Hoặc sử dụng pnpm
pnpm install
```

### **Cấu hình môi trường**
Tạo file `.env.local`:
```env
# Azure Configuration
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id

# Dynamics CRM
CRM_BASE_URL=https://wecare-ii.crm5.dynamics.com
CRM_API_VERSION=v9.2

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT=your_storage_account
AZURE_STORAGE_KEY=your_storage_key
AZURE_STORAGE_CONTAINER=your_container_name

# Application Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Cache Configuration (Optional)
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Cloudinary (for image optimization)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Development/Production flags
NODE_ENV=development
NEXT_PUBLIC_ENV=development
```

### **Cấu hình chi tiết**

#### **1. Azure AD Authentication**
```javascript
// config/azure.js
export const azureConfig = {
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  tenantId: process.env.AZURE_TENANT_ID,
  scope: 'https://graph.microsoft.com/.default',
  authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
};
```

#### **2. Dynamics CRM Configuration**
```javascript
// config/crm.js
export const crmConfig = {
  baseUrl: 'https://wecare-ii.crm5.dynamics.com',
  apiVersion: 'v9.2',
  endpoints: {
    customers: '/api/data/v9.2/contacts',
    products: '/api/data/v9.2/crdfd_productss',
    orders: '/api/data/v9.2/crdfd_athangsos',
    employees: '/api/data/v9.2/crdfd_employees',
    promotions: '/api/data/v9.2/crdfd_promotions'
  }
};
```

#### **3. Cache Strategy**
```javascript
// config/cache.js
export const cacheConfig = {
  defaultTTL: 3600, // 1 hour
  strategies: {
    products: { ttl: 1800 },      // 30 minutes
    promotions: { ttl: 900 },     // 15 minutes
    customers: { ttl: 3600 },     // 1 hour
    static: { ttl: 86400 }        // 24 hours
  }
};
```

### **Chạy development server**
```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem kết quả.

### **Build production**
```bash
npm run build
npm start
```

### **Available Scripts**
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Type checking
npx tsc --noEmit     # Check TypeScript without emitting files

# Docker commands
docker build -t wecare-ecommerce .     # Build Docker image
docker-compose up -d                   # Start with Docker Compose
docker-compose logs -f wecare-ecommerce # View logs
```

## 🐳 Docker & Containerization

### **Docker Configuration**
```dockerfile
# Dockerfile (khuyến nghị)
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

### **Docker Compose Setup**
```yaml
# docker-compose.yml (hiện tại)
version: "3.8"
services:
  wecare-ecommerce:
    image: wecare-ecommerce:latest
    hostname: wecare.com.vn
    ports:
      - "3000:3000"
    restart: always
    volumes:
      - "./public:/app/public"
      - "./src:/app/src"
    networks:
      - dev
```

### **Production Docker Compose**
```yaml
# docker-compose.prod.yml (khuyến nghị)
version: "3.8"
services:
  wecare-ecommerce:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_ENV=production
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - wecare-ecommerce
```

### **Commands**
```bash
# Build Docker image
docker build -t wecare-ecommerce .

# Run development
docker-compose up -d

# Run production
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f wecare-ecommerce

# Scale service
docker-compose up -d --scale wecare-ecommerce=3
```

## 📱 Responsive Design

Hệ thống được thiết kế responsive với:
- **Mobile-first approach**
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch-friendly interface** cho mobile
- **Desktop optimized layout** cho màn hình lớn

## 🎨 Styling & Design System

### **Color Palette**
```typescript
// Primary Colors
primaryColor: {
  light: "#FFE1E6",
  main: "rgb(2 132 199)",      // Cyan-600
  dark: "#4F4CB6",
  text: "#ffffff",
  500: "#D23F57",              // Red accent
}

// Secondary Colors  
secondaryColor: {
  main: "rgba(15, 52, 96, 1)",  // Dark blue
  light: "rgba(15, 52, 96, 0.2)",
  text: "#ffffff",
}

// Gray Scale
gray: {
  900: "#2B3445",              // Main text
  800: "#373F50",              // Paragraph  
  700: "#4B566B",
  600: "#7D879C",              // Low priority text
  500: "#AEB4BE",
  400: "#DAE1E7",              // Border
  300: "#E3E9EF", 
  200: "#F3F5F9",              // Line stroke
  100: "#F6F9FC",
  white: "#FFFFFF",
}

// Status Colors
successColor: { 
  main: "rgba(51, 208, 103, 1)", 
  light: "rgba(51, 208, 103, 0.15)" 
}
errorColor: { 
  main: "#E94560", 
  light: "#FFE1E6" 
}
warningColor: { 
  main: "#FFCD4E" 
}

// Custom Brand Colors
customBlue: "#3899B4"          // Wecare brand blue
```

### **Typography System**
```css
/* Font Family */
font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 
             'Helvetica Neue', sans-serif;

/* Font Sizes */
text-xs: 12px     /* Small labels */
text-sm: 14px     /* Body text */
text-base: 16px   /* Default */
text-lg: 18px     /* Subheadings */
text-xl: 20px     /* Card titles */
text-2xl: 24px    /* Section headers */
text-3xl: 30px    /* Page titles */
```

### **Spacing & Layout**
```css
/* Custom Spacing */
padding: {
  '50': '50px',
  '68': '68px', 
  '100': '100px'
}

/* Layout Constants */
headerHeight: "140px"
mobileHeaderHeight: "64px"
containerWidth: "1200px"
sidenavWidth: "280px"
```

### **Breakpoints**
```typescript
screens: {
  'xs': '425px',    // Extra small devices
  'sm': '640px',    // Small devices (phones)
  'md': '768px',    // Medium devices (tablets)
  'lg': '1024px',   // Large devices (desktops)
  'xl': '1280px',   // Extra large devices
}
```

### **Animations & Effects**
```css
/* Custom Keyframes */
@keyframes bounce-gentle {
  0%, 100% { transform: translateY(-5%) }
  50% { transform: translateY(0) }
}

@keyframes shine {
  0% { left: '-100%' }
  50%, 100% { left: '100%' }
}

/* Animation Classes */
.animate-bounce-gentle: 2s ease-in-out infinite
.animate-shine: 2s forwards linear infinite
.animate-spin-fast: 0.6s linear infinite

/* Hover Effects */
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
}

/* Glass Effect */
.glass-effect {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
```

### **Component Styling**
- **Material-UI**: Customized theme với Wecare colors
- **Tailwind CSS**: Utility-first styling với custom extensions
- **Styled Components**: Dynamic styling cho complex components
- **CSS Modules**: Scoped styles cho specific components

## 🔒 Security & Performance

### **Security Measures**
```typescript
// API Security
- Rate limiting: express-rate-limit (7.4.1)
- Input validation: Required fields validation
- Duplicate prevention: checkDuplicateApplication()
- Access token management: Secure token caching
- Permission-based access control
- CORS configuration
- SQL injection prevention (OData filters)

// Client-side Security
- Secure localStorage: SecureStorage utility
- Permission guards: PermissionGuard components
- Route protection: Middleware validation
- XSS prevention: React built-in protection
```

### **Performance Optimizations**
```typescript
// Caching Strategy
const CACHE_CONFIG = {
  accessToken: { ttl: 3300000 },    // 55 minutes
  productData: { ttl: 1800000 },    // 30 minutes
  customerData: { ttl: 3600000 },   // 1 hour
  pricingData: { ttl: 1800000 },    // 30 minutes
};

// Connection Pooling
- HTTP Keep-Alive: 50 seconds
- Max Sockets: 50
- Concurrent Requests: 3 (p-limit)
- Batch Processing: 100 items per batch

// Memory Management
- LRU Cache: Automatic cleanup
- Circuit Breaker: Fault tolerance
- Memory monitoring: checkMemoryUsage()
```

### **Monitoring & Logging**
```typescript
// Structured Logging (Pino)
logger.error("Error in API:", {
  error: { message, stack, name },
  query: req.query,
  timestamp: new Date().toISOString(),
});

// Performance Monitoring
- Memory usage tracking
- API response times
- Cache hit/miss rates
- Error rate monitoring
```

## 🔍 SEO & Performance

### **SEO Features**
- **Meta tags** tối ưu
- **Open Graph** tags
- **JSON-LD** structured data
- **Sitemap** tự động
- **Robot.txt** configuration

### **Performance Optimizations**
- **Image optimization** với Next.js Image
- **Code splitting** tự động
- **Lazy loading** components
- **Caching strategy** với Redis
- **CDN** integration

## 🧪 Testing & Quality Assurance

### **Testing Stack**
```json
// Hiện tại chưa có test setup trong package.json
// Khuyến nghị thêm:
{
  "devDependencies": {
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "cypress": "^13.0.0",
    "@types/jest": "^29.0.0"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open"
  }
}
```

### **Code Quality Tools**
```bash
# ESLint (đã có)
npm run lint

# Prettier (khuyến nghị thêm)
npm run format

# TypeScript check
npx tsc --noEmit

# Bundle analyzer
npm run analyze
```

### **Error Handling Patterns**
```typescript
// API Error Handling
const handleError = (res: NextApiResponse, error: AxiosError) => {
  if (error.response) {
    return res.status(error.response.status).json({
      error: error.response.data,
      message: "API request failed",
    });
  }
  // Network errors, timeout errors, etc.
};

// Client Error Boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <MyComponent />
</ErrorBoundary>
```

### **Data Validation**
```typescript
// Server-side validation
if (!applicationData.crdfd_hovaten || !applicationData.crdfd_sdt) {
  return res.status(400).json({ 
    error: "Missing required fields",
    receivedData: applicationData 
  });
}

// Duplicate checking
const isDuplicate = await checkDuplicateApplication(
  token, hovaten, sdt, yeucautuyendungid
);
```

## 📈 Monitoring & Analytics

### **Performance Monitoring**
- Next.js Analytics
- Web Vitals tracking
- Error boundary implementation

### **User Analytics**
- Google Analytics integration
- Custom event tracking
- User behavior analysis

## 🚀 Deployment

### **Vercel (Recommended)**
```bash
npm install -g vercel
vercel
```

### **Manual Deployment**
1. Build the project: `npm run build`
2. Start production server: `npm start`
3. Configure reverse proxy (nginx/apache)
4. Set up SSL certificate

### **Environment Variables**
Đảm bảo cấu hình đúng các biến môi trường trong production.

## 🤝 Contributing

### **Development Workflow**
1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

### **Development Best Practices**
```bash
# Pre-commit checks
npm run lint                    # Check code style
npx tsc --noEmit               # Type check
npm run build                  # Ensure build works

# Git workflow
git checkout -b feature/name   # Create feature branch
git add .                      # Stage changes
git commit -m "feat: add feature"  # Commit with conventional format
git push origin feature/name   # Push to remote

# Code formatting
# Use Prettier (recommended)
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}"

# Component development
# Use Storybook for component development
npm run storybook
```

### **Code Standards**
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Conventional commits

## 📚 Documentation

### **API Documentation**
- Swagger/OpenAPI specs trong `/docs/api`
- Postman collection có sẵn

### **Component Documentation**
- Storybook cho UI components
- JSDoc comments trong code

### **Luồng nghiệp vụ chi tiết**

#### **Authentication Flow**
1. **Customer Login**: Username + Password → `/api/getCustomerData`
2. **Sale Login**: Email + Phone → `/api/getEmployeData`  
3. **Training Login**: Email + Phone → `/api/auth/trainingLogin`
4. **Permission Check**: Department + Role → Permission assignment
5. **Session Management**: LocalStorage + Token validation

#### **E-commerce Flow**
1. **Product Discovery**: Category → Product Group → Product List
2. **Product Details**: Specifications + Pricing + Promotions
3. **Cart Management**: Add/Update/Remove items
4. **Checkout Process**: Customer selection → Order creation
5. **Order Tracking**: Status updates + History

#### **Sales Management Flow**
1. **Price by Customer**: Customer selection → Price lookup
2. **Sale Order**: Customer → Products → Order creation
3. **Sale Confirm**: Order approval → Status update
4. **Reporting**: Sales data + Analytics

#### **Content Management Flow**
1. **News/Articles**: CRM content → Website display
2. **Promotions**: Campaign setup → Product application
3. **Training Materials**: Course creation → Progress tracking
4. **Job Postings**: Position creation → Application handling

## 🔧 Database Schema & Data Models

### **Microsoft Dynamics CRM Entities**
```typescript
// Core Entities
- contacts: Khách hàng (customers)
- crdfd_productss: Sản phẩm (products)
- crdfd_athangsos: Đơn hàng (sale orders)
- crdfd_employees: Nhân viên (employees)
- crdfd_promotions: Khuyến mãi (promotions)
- crdfd_yeucautuyendungs: Yêu cầu tuyển dụng (job requirements)
- crdfd_thongtinungviens: Thông tin ứng viên (applicants)
- cr1bb_data_website_ecommerces: Nội dung website (content)

// Key Fields
interface Product {
  crdfd_productsid: string;          // Product ID
  crdfd_name: string;                // Product name
  crdfd_masanpham: string;           // Product code
  cr1bb_giaban: number;              // Selling price
  crdfd_thuonghieu: string;          // Brand
  crdfd_quycach: string;             // Specifications
  _crdfd_productgroup_value: string; // Product group ID
}

interface Customer {
  contactid: string;                 // Customer ID
  fullname: string;                  // Full name
  cr44a_makhachhang: string;         // Customer code
  emailaddress1: string;             // Email
  telephone1: string;                // Phone
}
```

### **Data Flow Architecture**
```mermaid
graph TD
    A[Next.js Frontend] --> B[API Routes]
    B --> C[Access Token Service]
    C --> D[Microsoft Dynamics CRM]
    
    B --> E[LRU Cache Layer]
    E --> F[Memory Management]
    
    B --> G[Azure Blob Storage]
    G --> H[File Upload/Download]
    
    D --> I[OData API v9.2]
    I --> J[Entity Framework]
```

## 🐛 Troubleshooting & Debugging

### **Common Issues**

**1. Build errors**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build

# TypeScript errors
npx tsc --noEmit
```

**2. Authentication issues**
```bash
# Check environment variables
echo $AZURE_CLIENT_ID
echo $AZURE_CLIENT_SECRET

# Verify token expiration
# Token TTL: 55 minutes (3300000ms)
```

**3. API connection errors**
```bash
# Test CRM connectivity
curl -H "Authorization: Bearer $TOKEN" \
  "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/contacts"

# Check rate limiting
# express-rate-limit: 100 requests per 15 minutes
```

**4. Memory issues**
```typescript
// Monitor memory usage
function checkMemoryUsage() {
  const used = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: Math.round(used.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB'
  });
}
```

**5. Cache issues**
```bash
# Clear application cache
# LRU Cache auto-cleanup based on TTL
# Manual cleanup: cleanupCaches()

# Redis cache (if using)
redis-cli FLUSHALL
```

**6. Image optimization issues**
```bash
# Clear Next.js image cache
rm -rf .next/cache/images

# Check image optimization settings
# next.config.mjs - images.remotePatterns
```

**7. TypeScript compilation errors**
```bash
# Clear TypeScript cache
rm -rf .next
rm -rf node_modules/.cache

# Check TypeScript configuration
npx tsc --showConfig
```

**8. Middleware issues**
```bash
# Check middleware configuration
# src/middleware.ts - matcher patterns
# Verify route matching logic
```

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=* npm run dev

# Next.js debug
NEXT_DEBUG=1 npm run dev

# API debug
NODE_ENV=development npm run dev
```

## 📞 Support

### **Technical Support**
- Email: support@wecare.com.vn
- Documentation: [Wiki](./docs/)
- Issue tracking: GitHub Issues

### **Business Support**
- Sales: sales@wecare.com.vn
- Phone: +84 xxx xxx xxx

## 📄 License

Dự án này thuộc bản quyền của **Wecare Corporation**. Vui lòng liên hệ để biết thêm thông tin về license.

## 🙏 Acknowledgments

- **Next.js Team** - Awesome framework
- **Vercel** - Deployment platform
- **Microsoft** - Azure services
- **Tailwind CSS** - Styling framework
- **Material-UI** - Component library

## 📋 Development Roadmap

### **Phase 1: Current (v0.1.0)**
- ✅ Core E-commerce functionality
- ✅ Permission system implementation
- ✅ Training module
- ✅ Recruitment system
- ✅ Basic performance optimizations

### **Phase 2: Planned (v0.2.0)**
- 🔄 Testing framework implementation
- 🔄 Advanced analytics dashboard
- 🔄 Mobile app development
- 🔄 Advanced caching with Redis
- 🔄 CI/CD pipeline setup

### **Phase 3: Future (v1.0.0)**
- 🔮 Microservices architecture
- 🔮 Real-time notifications
- 🔮 Advanced AI recommendations
- 🔮 Multi-language support
- 🔮 Advanced reporting system

## 📊 Project Metrics

### **Codebase Stats**
- **Total Files**: ~200+ files
- **Lines of Code**: ~50,000+ lines
- **API Endpoints**: 40+ endpoints
- **Components**: 68+ React components
- **Dependencies**: 70+ packages
- **TypeScript Files**: 100% TypeScript coverage
- **Test Coverage**: TBD (testing framework to be implemented)

### **Performance Benchmarks**
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.0s
- **Cumulative Layout Shift**: < 0.1
- **Cache Hit Rate**: ~85%

---

**Phiên bản**: v0.1.0  
**Cập nhật lần cuối**: 2024-12-19  
**Tác giả**: Wecare Development Team  
**Repository**: wecare-ecommerce  
**License**: Proprietary - Wecare Corporation  
**Documentation**: Comprehensive README with detailed setup, API docs, and troubleshooting guides