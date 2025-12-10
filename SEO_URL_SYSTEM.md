# Hệ thống URL SEO cho Sản phẩm

## Tổng quan

Hệ thống URL mới được thiết kế để tạo ra các URL thân thiện với SEO cho trang sản phẩm chi tiết, theo format:

```
/ngành-nghề-tên-sản-phẩm-quy-cách
```

Ví dụ: `/nganh-dien-day-dien-mem-boc-nhua-2x1-do`

## Cấu trúc URL

### Format cũ
- `/SP-013313` (mã sản phẩm)
- `/san-pham/chi-tiet/SP-013313`

### Format mới
- `/nganh-dien-day-dien-mem-boc-nhua` (thay vì `/sanpham-xich-tai-daiichi-1001r-1001r`)
- Cấu trúc: `/ngành-nghề-tên-sản-phẩm` (không bao gồm quy cách)
- **Ngành nghề** được lấy từ nhóm sản phẩm cha trong hierarchy

## Các thành phần

1. **Ngành nghề**: Nhóm sản phẩm cấp cao nhất (ví dụ: "Ngành Điện")
2. **Tên sản phẩm**: Tên chính của sản phẩm
3. **Quy cách**: Không còn được bao gồm trong URL (để URL ngắn gọn hơn)

## Cách hoạt động

### 1. Tạo URL mới
```typescript
import { generateProductUrl } from '@/utils/urlGenerator';
import { useProductGroupHierarchy } from '@/hooks/useProductGroupHierarchy';

const { hierarchy } = useProductGroupHierarchy();

const product = {
  crdfd_masanpham: 'SP-013313',
  crdfd_tensanphamtext: 'Dây điện mềm bọc nhựa',
  crdfd_quycach: '2x1 đỏ',
  cr1bb_nhomsanphamcha: 'Ngành Điện' // Ưu tiên field này
};

const newUrl = generateProductUrl(product, hierarchy);
// Kết quả: '/nganh-dien-day-dien-mem-boc-nhua'
```

### 2. Phân tích URL
```typescript
import { parseProductUrl } from '@/utils/urlGenerator';

const result = parseProductUrl('/nganh-dien-day-dien-mem-boc-nhua');
// Kết quả: {
//   industryCategory: 'nganh-dien',
//   productName: 'day-dien-mem-boc-nhua',
//   specifications: ''
// }
```

### 3. Chuyển đổi văn bản
```typescript
import { textToSlug } from '@/utils/urlGenerator';

const slug = textToSlug('Dây điện mềm bọc nhựa');
// Kết quả: 'day-dien-mem-boc-nhua'
```

## Redirect và tương thích ngược

### URL cũ vẫn hoạt động
- `/SP-013313` → redirect đến `/nganh-dien-day-dien-mem-boc-nhua-2x1-do`
- `/san-pham/chi-tiet/SP-013313` → redirect đến URL mới

### Middleware xử lý
- Tự động redirect URL cũ sang format mới
- Giữ nguyên đích đến của trang sản phẩm

## Các file đã cập nhật

### 1. Utility Functions
- `src/utils/urlGenerator.ts` - Các hàm tạo và phân tích URL

### 2. Routing
- `src/middleware.ts` - Xử lý redirect và routing
- `src/app/[...slug]/page.tsx` - Catch-all route cho URL mới

### 3. API
- `pages/api/searchProductByUrl.ts` - API tìm kiếm sản phẩm theo URL

### 4. Components đã cập nhật
- `src/components/BusinessOpportunitySection.tsx`
- `src/app/product-list/_components/products/ProductsList.tsx`
- `src/app/san-pham/chi-tiet/_components/RelatedProductSidebarItem.tsx`
- `src/app/product-list/_components/ProductDetailPopup/ProductDetailPopup .tsx`
- `src/app/product-list/_components/ProductListByGroup/ProductListByGroup.tsx`
- `src/app/san-pham/chi-tiet/_components/RelatedProductsSection.tsx`
- `src/app/product-list/_components/top-products/top-products-list.tsx`
- `src/app/product-list/_components/purchased-products/purchased-products-list.tsx`
- `src/app/new-arrivals/page.tsx`

### 5. Hooks mới
- `src/hooks/useProductGroupHierarchy.ts` - Hook để fetch product group hierarchy

### 6. Product Detail Pages
- `src/app/san-pham/chi-tiet/[masanpham]/page.tsx`
- `src/app/[masanpham]/page.tsx`

## Lợi ích SEO

1. **URL có ý nghĩa**: Chứa thông tin về sản phẩm
2. **Từ khóa**: Bao gồm các từ khóa quan trọng
3. **Cấu trúc rõ ràng**: Dễ hiểu và dễ nhớ
4. **Tương thích ngược**: URL cũ vẫn hoạt động

## Testing

Chạy test để kiểm tra các hàm URL generator:

```bash
npm test src/utils/__tests__/urlGenerator.test.ts
```

## Lưu ý

1. URL mới sẽ được tạo tự động khi người dùng click vào sản phẩm
2. URL cũ vẫn hoạt động và sẽ được redirect
3. Hệ thống tự động cập nhật URL trong browser history
4. Không ảnh hưởng đến chức năng hiện tại của website
5. **Ngành nghề** được lấy từ nhóm sản phẩm cha trong hierarchy, không còn sử dụng "sanpham" chung chung
6. Ưu tiên các field: `cr1bb_nhomsanphamcha` > `crdfd_nhomsanphamchatext` > `crdfd_nhomsanphamtext`
7. **Fallback logic**: Nếu không tìm thấy ngành nghề, sẽ sử dụng từ đầu tiên của tên sản phẩm hoặc "dung-cu" làm mặc định
