# Toast System Usage Guide

## Tổng quan

Hệ thống Toast được thiết kế để hiển thị thông báo một cách thống nhất trong toàn bộ dự án. Hệ thống này sử dụng `react-toastify` làm nền tảng và cung cấp các tính năng mở rộng.

## Cấu trúc Files

```
src/
├── components/
│   ├── ToastManager.tsx      # Component chính quản lý toast
│   └── ToastExample.tsx      # Ví dụ sử dụng
├── hooks/
│   └── useToast.ts           # Custom hook để sử dụng toast
└── types/
    └── toast.ts              # Type definitions và constants
```

## Cách sử dụng

### 1. Sử dụng Custom Hook (Khuyến nghị)

```tsx
import { useToast } from '@/hooks/useToast';

const MyComponent = () => {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Thành công!');
  };

  const handleError = () => {
    toast.error('Có lỗi xảy ra!');
  };

  const handleWarning = () => {
    toast.warning('Cảnh báo!');
  };

  const handleInfo = () => {
    toast.info('Thông tin');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
      <button onClick={handleWarning}>Warning</button>
      <button onClick={handleInfo}>Info</button>
    </div>
  );
};
```

### 2. Sử dụng trực tiếp từ showToast

```tsx
import { showToast } from '@/components/ToastManager';

const handleClick = () => {
  showToast.success('Thành công!');
  showToast.error('Lỗi!');
  showToast.warning('Cảnh báo!');
  showToast.info('Thông tin!');
};
```

### 3. Sử dụng với Promise

```tsx
import { useToast } from '@/hooks/useToast';

const MyComponent = () => {
  const toast = useToast();

  const handleAsyncOperation = async () => {
    const promise = fetch('/api/data');
    
    toast.promise(promise, {
      pending: 'Đang tải...',
      success: 'Tải thành công!',
      error: 'Tải thất bại!',
    });
  };

  return <button onClick={handleAsyncOperation}>Load Data</button>;
};
```

### 4. Sử dụng với Custom Options

```tsx
import { useToast } from '@/hooks/useToast';

const MyComponent = () => {
  const toast = useToast();

  const handleCustomToast = () => {
    toast.success('Thành công!', {
      autoClose: 5000,
      position: 'bottom-center',
      hideProgressBar: true,
    });
  };

  return <button onClick={handleCustomToast}>Custom Toast</button>;
};
```

### 5. Sử dụng Constants

```tsx
import { useToast } from '@/hooks/useToast';
import { TOAST_MESSAGES } from '@/types/toast';

const MyComponent = () => {
  const toast = useToast();

  const handleAddToCart = () => {
    // Sử dụng message có sẵn
    toast.success(TOAST_MESSAGES.SUCCESS.ADD_TO_CART);
  };

  const handleValidationError = () => {
    toast.error(TOAST_MESSAGES.ERROR.QUANTITY_INVALID);
  };

  return (
    <div>
      <button onClick={handleAddToCart}>Add to Cart</button>
      <button onClick={handleValidationError}>Show Error</button>
    </div>
  );
};
```

## Các loại Toast

### Success Toast
- Màu xanh lá (#10B981)
- Dùng cho thông báo thành công

### Error Toast
- Màu đỏ (#EF4444)
- Dùng cho thông báo lỗi

### Warning Toast
- Màu vàng (#F59E0B)
- Dùng cho cảnh báo

### Info Toast
- Màu xanh dương (#3B82F6)
- Dùng cho thông tin

## Tùy chỉnh

### Thay đổi vị trí
```tsx
toast.success('Message', { position: 'bottom-center' });
```

### Thay đổi thời gian hiển thị
```tsx
toast.success('Message', { autoClose: 5000 });
```

### Ẩn progress bar
```tsx
toast.success('Message', { hideProgressBar: true });
```

### Tùy chỉnh style
```tsx
toast.success('Message', {
  style: {
    background: '#custom-color',
    color: '#white',
  }
});
```

## Dismiss Toast

### Dismiss tất cả
```tsx
toast.dismiss();
```

### Dismiss toast cụ thể
```tsx
const toastId = toast.success('Message');
toast.dismissToast(toastId);
```

## Best Practices

1. **Sử dụng constants**: Luôn sử dụng `TOAST_MESSAGES` cho các thông báo thường dùng
2. **Hook vs Direct**: Ưu tiên sử dụng `useToast` hook trong components
3. **Thời gian hiển thị**: Điều chỉnh `autoClose` phù hợp với độ quan trọng của thông báo
4. **Vị trí**: Sử dụng `top-right` cho thông báo thường, `bottom-center` cho thông báo quan trọng
5. **Promise**: Sử dụng `toast.promise` cho các async operations

## Migration từ Toast cũ

Nếu bạn đang sử dụng `react-toastify` trực tiếp:

```tsx
// Cũ
import { toast } from 'react-toastify';
toast.success('Message');

// Mới
import { useToast } from '@/hooks/useToast';
const toast = useToast();
toast.success('Message');
```

Hoặc:

```tsx
// Cũ
import { toast } from 'react-toastify';
toast.success('Message');

// Mới
import { showToast } from '@/components/ToastManager';
showToast.success('Message');
```
