# Tìm Kiếm Sản Phẩm Bằng Hình Ảnh

## Tổng Quan

Màn hình "Tìm Kiếm Sản Phẩm Bằng Hình Ảnh" là một tính năng AI-powered cho phép người dùng tìm kiếm sản phẩm vật liệu xây dựng bằng cách upload hình ảnh. Hệ thống sử dụng Google Gemini AI để phân tích hình ảnh và trích xuất thông tin sản phẩm, sau đó tìm kiếm trong cơ sở dữ liệu sản phẩm.

## Tính Năng Chính

### 1. Upload Hình Ảnh
- **Drag & Drop**: Kéo thả file ảnh vào vùng upload
- **Click to Upload**: Click để chọn file từ máy tính
- **Hỗ trợ định dạng**: JPG, PNG, WEBP
- **Giới hạn kích thước**: 10MB
- **Preview**: Hiển thị preview hình ảnh sau khi upload

### 2. AI Analysis
- **Google Gemini AI**: Phân tích hình ảnh với model gemini-1.5-flash
- **Trích xuất thông tin**:
  - Tên sản phẩm
  - Thương hiệu
  - Quy cách (kích thước)
  - Chất liệu
  - Bề mặt hoàn thiện
  - Từ khóa liên quan (synonyms)

### 3. Tìm Kiếm Thông Minh
- **Tự động tìm kiếm**: Sau khi AI phân tích xong
- **Tìm kiếm thủ công**: Nhập từ khóa trực tiếp
- **Debounced search**: Tìm kiếm tự động sau 500ms khi người dùng ngừng nhập

### 4. Bộ Lọc Nâng Cao
- **Lọc theo thương hiệu**: Prime, Viglacera, INAX, TOTO, etc.
- **Lọc theo quy cách**: 60x60cm, 30x60cm, 80x80cm, etc.
- **Lọc theo chất liệu**: Granite, Ceramic, Porcelain, etc.

### 5. Hiển Thị Kết Quả
- **Nhóm theo danh mục**: Gạch ốp lát, Thiết bị vệ sinh, Sơn nội thất, etc.
- **Product cards**: Hiển thị thông tin chi tiết sản phẩm
- **Pagination**: Phân trang kết quả
- **Loading states**: Skeleton loading cho UX tốt hơn

## Cấu Trúc File

```
src/app/tim-kiem-bang-hinh-anh/
├── page.tsx                 # Component chính
└── README.md               # Tài liệu này

pages/api/
├── searchProductsByImage.ts # API phân tích hình ảnh
└── getProductFilters.ts     # API lấy danh sách filters

src/components/
└── Icons.tsx               # Icon components
```

## API Endpoints

### 1. POST /api/searchProductsByImage
**Mục đích**: Phân tích hình ảnh và tìm kiếm sản phẩm

**Request**:
```javascript
const formData = new FormData();
formData.append('image', file);

fetch('/api/searchProductsByImage', {
  method: 'POST',
  body: formData,
});
```

**Response**:
```json
{
  "success": true,
  "keywords": {
    "productName": "Gạch ốp lát",
    "brand": "Prime",
    "specification": "60x60 cm",
    "material": "Granite",
    "surfaceFinish": "Bóng",
    "synonyms": ["gạch men", "gạch bóng kiếng", "gạch granite"]
  },
  "products": {
    "data": { /* grouped products */ },
    "pagination": { /* pagination info */ }
  }
}
```

### 2. GET /api/getProductFilters
**Mục đích**: Lấy danh sách filters có sẵn

**Response**:
```json
{
  "success": true,
  "filters": {
    "brands": ["Prime", "Viglacera", "INAX", "TOTO"],
    "specifications": ["60x60 cm", "30x60 cm", "80x80 cm"],
    "materials": ["Granite", "Ceramic", "Porcelain"]
  }
}
```

## Cấu Hình

### Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Dependencies
```json
{
  "@google/generative-ai": "^0.21.0",
  "multer": "^1.4.5-lts.1"
}
```

## Cách Sử Dụng

### 1. Truy Cập Màn Hình
```
http://localhost:3000/tim-kiem-bang-hinh-anh
```

### 2. Upload Hình Ảnh
- Kéo thả file ảnh vào vùng upload
- Hoặc click "Click để upload" để chọn file
- Hệ thống sẽ tự động phân tích hình ảnh

### 3. Xem Kết Quả AI
- Sau khi phân tích, AI sẽ hiển thị các từ khóa được trích xuất
- Click vào từ khóa để tìm kiếm
- Hệ thống tự động áp dụng filters dựa trên thông tin AI

### 4. Tinh Chỉnh Tìm Kiếm
- Nhập từ khóa thủ công vào ô tìm kiếm
- Sử dụng bộ lọc để thu hẹp kết quả
- Kết quả sẽ được cập nhật real-time

## Xử Lý Lỗi

### 1. Lỗi Upload File
- Kiểm tra định dạng file (chỉ JPG, PNG, WEBP)
- Kiểm tra kích thước file (tối đa 10MB)

### 2. Lỗi AI Analysis
- Kiểm tra GEMINI_API_KEY
- Kiểm tra kết nối internet
- Fallback về mock data nếu API lỗi

### 3. Lỗi Tìm Kiếm Sản Phẩm
- Fallback về mock data
- Hiển thị thông báo lỗi cho người dùng

## Tối Ưu Hóa

### 1. Performance
- Debounced search để giảm API calls
- Skeleton loading cho UX tốt hơn
- Lazy loading cho hình ảnh sản phẩm

### 2. SEO
- Meta tags phù hợp
- Structured data cho sản phẩm
- Alt text cho hình ảnh

### 3. Accessibility
- ARIA labels cho screen readers
- Keyboard navigation
- High contrast mode support

## Mở Rộng

### 1. Thêm Model AI Khác
- Có thể tích hợp thêm các AI model khác
- So sánh kết quả từ nhiều model

### 2. Lưu Lịch Sử Tìm Kiếm
- Lưu lịch sử upload và tìm kiếm
- Gợi ý dựa trên lịch sử

### 3. Tích Hợp Social Features
- Chia sẻ kết quả tìm kiếm
- Đánh giá sản phẩm
- Wishlist

## Troubleshooting

### 1. AI Không Phân Tích Được Hình Ảnh
- Kiểm tra chất lượng hình ảnh
- Thử với hình ảnh rõ nét hơn
- Kiểm tra API key Gemini

### 2. Không Tìm Thấy Sản Phẩm
- Thử từ khóa khác
- Giảm bớt filters
- Kiểm tra database sản phẩm

### 3. Performance Chậm
- Kiểm tra kích thước hình ảnh
- Tối ưu API calls
- Sử dụng CDN cho hình ảnh

## Liên Hệ

Nếu có vấn đề hoặc cần hỗ trợ, vui lòng liên hệ team phát triển.
