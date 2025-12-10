# Hướng dẫn cấu hình Google Tag Manager (GTM) cho Wecare E-commerce

## Tổng quan

Dự án đã được cấu hình Google Tag Manager (GTM) và Google Analytics 4 (GA4) để theo dõi các sự kiện e-commerce và hành vi người dùng.

## Cấu trúc files

### 1. `/src/lib/gtm.ts`
- Chứa cấu hình GTM và GA4 IDs
- Định nghĩa các hàm tracking events
- Khai báo kiểu dữ liệu cho TypeScript

### 2. `/src/components/GTM.tsx`
- Component chính để load GTM và GA4 scripts
- Component GTMNoscript cho fallback khi JavaScript bị tắt

### 3. `/src/hooks/useGTM.ts`
- Hook để sử dụng GTM tracking trong components
- Tự động track page views khi route thay đổi
- Hook riêng cho e-commerce tracking

### 4. `/src/app/layout.tsx`
- Import và sử dụng GTM components
- Cấu hình trong head và body

## Cách sử dụng

### 1. Tracking cơ bản

```tsx
import { useGTM } from '@/hooks/useGTM';

function MyComponent() {
  const { trackEvent } = useGTM();

  const handleClick = () => {
    trackEvent.custom('button_click', {
      button_name: 'cta_button',
      page_location: window.location.href
    });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### 2. E-commerce Tracking

```tsx
import { useEcommerceTracking } from '@/hooks/useGTM';

function ProductCard({ product }) {
  const { trackProductView, trackAddToCart } = useEcommerceTracking();

  const handleViewProduct = () => {
    trackProductView(
      product.id,
      product.name,
      product.category,
      product.price
    );
  };

  const handleAddToCart = () => {
    trackAddToCart(
      product.id,
      product.name,
      product.category,
      product.price,
      1
    );
  };

  return (
    <div>
      <h3 onClick={handleViewProduct}>{product.name}</h3>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}
```

### 3. Track Purchase

```tsx
import { useEcommerceTracking } from '@/hooks/useGTM';

function CheckoutSuccess({ order }) {
  const { trackPurchase } = useEcommerceTracking();

  useEffect(() => {
    const items = order.items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price,
      quantity: item.quantity
    }));

    trackPurchase(order.id, order.total, items);
  }, [order]);

  return <div>Thank you for your purchase!</div>;
}
```

## Cấu hình GTM Container

### 1. Tạo Tags trong GTM

#### Google Analytics 4 Configuration Tag
- **Tag Type**: Google Analytics: GA4 Configuration
- **Measurement ID**: G-8Z0G457R7M
- **Trigger**: All Pages

#### E-commerce Events
- **Tag Type**: Google Analytics: GA4 Event
- **Configuration Tag**: [GA4 Configuration Tag]
- **Event Name**: view_item, add_to_cart, purchase, search
- **Event Parameters**: Sử dụng Data Layer Variables

### 2. Tạo Triggers

#### Page View Trigger
- **Trigger Type**: Page View
- **This trigger fires on**: All Pages

#### Custom Event Triggers
- **Trigger Type**: Custom Event
- **Event name**: view_item, add_to_cart, purchase, search

### 3. Tạo Variables

#### Data Layer Variables
- **Variable Type**: Data Layer Variable
- **Data Layer Variable Name**: item_id, item_name, item_category, price, quantity, etc.

## Testing

### 1. GTM Preview Mode
1. Vào GTM Container
2. Click "Preview"
3. Nhập URL website
4. Kiểm tra các events được fire

### 2. Google Analytics Real-time
1. Vào GA4 Property
2. Chọn "Realtime"
3. Kiểm tra các events đang được track

### 3. Browser Developer Tools
```javascript
// Kiểm tra dataLayer
console.log(window.dataLayer);

// Push event thủ công để test
window.dataLayer.push({
  event: 'test_event',
  test_parameter: 'test_value'
});
```

## Best Practices

### 1. Performance
- Sử dụng `strategy="afterInteractive"` cho GTM scripts
- Khởi tạo dataLayer trước khi load GTM
- Sử dụng dynamic imports cho components nặng

### 2. Privacy
- Tuân thủ GDPR/CCPA
- Implement cookie consent
- Có thể disable tracking khi user không đồng ý

### 3. Data Quality
- Validate dữ liệu trước khi push vào dataLayer
- Sử dụng consistent naming conventions
- Test thoroughly trước khi deploy

## Troubleshooting

### 1. Events không được track
- Kiểm tra GTM Container ID
- Verify triggers và tags configuration
- Check browser console cho errors

### 2. Duplicate events
- Đảm bảo không có multiple GTM containers
- Check GA4 configuration tag settings

### 3. Data không hiển thị trong GA4
- Có thể mất 24-48h để data xuất hiện
- Kiểm tra Real-time reports trước
- Verify measurement ID

## Environment Variables

Có thể sử dụng environment variables để quản lý GTM IDs:

```env
NEXT_PUBLIC_GTM_ID=GTM-NG7R2R2L
NEXT_PUBLIC_GA4_ID=G-8Z0G457R7M
```

Sau đó update trong `/src/lib/gtm.ts`:

```typescript
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-NG7R2R2L';
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-8Z0G457R7M';
```
