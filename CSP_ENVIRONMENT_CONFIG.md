# Cấu hình Content Security Policy cho Development và Production

## 🎯 Mục tiêu

Cấu hình CSP khác nhau cho 2 môi trường:
- **Development**: Cho phép webpack dev server, HMR, và debug tools
- **Production**: Bảo mật tối đa, loại bỏ các tính năng development

## 📋 Cấu hình hiện tại

### Development CSP
```javascript
const devCSP = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com;
  connect-src 'self' webpack://* ws://localhost:* wss://localhost:* https://www.google-analytics.com https://analytics.google.com https://ssl.google-analytics.com https://www.googletagmanager.com;
  img-src 'self' data: https:;
  style-src 'self' 'unsafe-inline' https:;
  font-src 'self' https:;
  frame-src 'self' https://drive.google.com https://docs.google.com https://www.googletagmanager.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`;
```

### Production CSP
```javascript
const prodCSP = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com;
  connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://ssl.google-analytics.com https://www.googletagmanager.com;
  img-src 'self' data: https:;
  style-src 'self' 'unsafe-inline' https:;
  font-src 'self' https:;
  frame-src 'self' https://drive.google.com https://docs.google.com https://www.googletagmanager.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`;
```

## 🔍 Sự khác biệt chính

| Directive | Development | Production | Lý do |
|-----------|-------------|------------|-------|
| `script-src` | Có `'unsafe-eval'` | Không có `'unsafe-eval'` | Development cần eval cho HMR |
| `connect-src` | Có `webpack://*`, `ws://localhost:*` | Không có | Development cần webpack dev server |
| Source Maps | Bật | Tắt (`productionBrowserSourceMaps: false`) | Bảo mật production |

## 🚀 Cách sử dụng

### Development Mode
```bash
npm run dev
# hoặc
yarn dev
```

**Kết quả:**
- ✅ Hot Module Replacement (HMR) hoạt động
- ✅ Webpack dev server không bị chặn
- ✅ Source maps cho debugging
- ✅ GTM và GA4 load thành công

### Production Mode
```bash
npm run build
npm run start
# hoặc
yarn build
yarn start
```

**Kết quả:**
- ✅ CSP bảo mật tối đa
- ✅ Không có source maps (bảo mật)
- ✅ GTM và GA4 vẫn hoạt động
- ✅ Không có webpack dev server

## 🧪 Testing

### Test Development
1. Chạy `npm run dev`
2. Mở Developer Tools (F12)
3. Kiểm tra Console - không có CSP errors
4. Kiểm tra Network tab - webpack dev server hoạt động
5. Test HMR - thay đổi code và xem hot reload

### Test Production
1. Chạy `npm run build && npm run start`
2. Mở Developer Tools (F12)
3. Kiểm tra Console - không có CSP errors
4. Kiểm tra Network tab - không có webpack:// requests
5. Test GTM và GA4 - kiểm tra tracking

## 🔧 Debug Commands

### Kiểm tra CSP hiện tại
```javascript
// Trong Console
console.log(document.querySelector('meta[http-equiv="Content-Security-Policy"]'));

// Hoặc kiểm tra response headers
fetch('/').then(response => {
  console.log(response.headers.get('Content-Security-Policy'));
});
```

### Test GTM và GA4
```javascript
// Kiểm tra dataLayer
console.log(window.dataLayer);

// Test push event
window.dataLayer.push({
  event: 'test_event',
  test_parameter: 'test_value'
});

// Kiểm tra gtag
console.log(typeof window.gtag);
```

## 🛠️ Troubleshooting

### Nếu gặp CSP errors trong development:

1. **Kiểm tra NODE_ENV**:
   ```bash
   echo $NODE_ENV
   # Phải là 'development'
   ```

2. **Restart dev server**:
   ```bash
   npm run dev
   ```

3. **Clear browser cache** và hard refresh (Ctrl+Shift+R)

### Nếu gặp CSP errors trong production:

1. **Kiểm tra build**:
   ```bash
   npm run build
   # Không có errors
   ```

2. **Kiểm tra NODE_ENV**:
   ```bash
   NODE_ENV=production npm run start
   ```

3. **Test với curl**:
   ```bash
   curl -I http://localhost:3000
   # Kiểm tra CSP header
   ```

## 📊 Monitoring

### Development Monitoring
- Console errors
- Network tab - webpack dev server
- HMR functionality
- GTM/GA4 loading

### Production Monitoring
- Console errors
- Network tab - external scripts
- GTM Preview mode
- GA4 Real-time reports

## 🔒 Security Best Practices

### Development
- ✅ Cho phép `'unsafe-eval'` cho HMR
- ✅ Cho phép webpack dev server
- ✅ Source maps cho debugging

### Production
- ❌ Không có `'unsafe-eval'`
- ❌ Không có webpack dev server
- ❌ Không có source maps
- ✅ Chỉ cho phép external scripts cần thiết

## 📁 Files liên quan

- ✅ `next.config.mjs` - Cấu hình CSP chính
- ✅ `src/components/GTMAlternative.tsx` - GTM component
- ✅ `src/app/layout.tsx` - Layout với GTM
- ✅ `CSP_ENVIRONMENT_CONFIG.md` - Hướng dẫn này

## 🎉 Kết quả

- **Development**: HMR + Debug + GTM/GA4 ✅
- **Production**: Security + Performance + GTM/GA4 ✅
- **No CSP errors**: Cả 2 môi trường ✅
- **GTM/GA4 working**: Tracking hoạt động ✅
