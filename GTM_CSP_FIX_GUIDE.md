# Hướng dẫn sửa lỗi Content Security Policy cho Google Tag Manager

## Vấn đề gặp phải

```
Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=G-8Z0G457R7M' because it violates the following Content Security Policy directive: "script-src 'self' 'unsafe-eval' 'unsafe-inline'".

Refused to load the script 'https://www.googletagmanager.com/gtm.js?id=GTM-NG7R2R2L' because it violates the following Content Security Policy directive: "script-src 'self' 'unsafe-eval' 'unsafe-inline'".
```

## Giải pháp đã áp dụng

### 1. Cập nhật Content Security Policy trong `next.config.mjs`

```javascript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src 'self' https://drive.google.com https://docs.google.com https://www.googletagmanager.com; connect-src 'self' https: https://www.google-analytics.com https://analytics.google.com https://ssl.google-analytics.com https://www.googletagmanager.com; object-src 'none'; base-uri 'self'; form-action 'self';"
}
```

**Các domain đã được thêm vào CSP:**
- `https://www.googletagmanager.com` - Cho GTM scripts
- `https://www.google-analytics.com` - Cho GA4 scripts
- `https://ssl.google-analytics.com` - Cho secure GA4 connections
- `https://analytics.google.com` - Cho analytics connections

### 2. Tạo component GTM Alternative

Tạo `src/components/GTMAlternative.tsx` với approach khác:

```typescript
// Sử dụng inline scripts thay vì external script loading
<Script id="gtm-inline" strategy="afterInteractive">
  {`
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');
  `}
</Script>
```

### 3. Cập nhật layout.tsx

```typescript
import GTMAlternative, { GTMAlternativeNoscript } from "@/components/GTMAlternative";

// Trong head
<GTMAlternative />

// Trong body
<GTMAlternativeNoscript />
```

## Cách test

### 1. Restart development server

```bash
npm run dev
# hoặc
yarn dev
```

### 2. Kiểm tra Console

Mở Developer Tools (F12) và kiểm tra:
- **Console tab**: Không còn CSP errors
- **Network tab**: GTM và GA4 scripts load thành công
- **Application tab**: Kiểm tra dataLayer trong window object

### 3. Test GTM Preview Mode

1. Vào [Google Tag Manager](https://tagmanager.google.com)
2. Chọn container `GTM-NG7R2R2L`
3. Click "Preview"
4. Nhập URL website
5. Kiểm tra các tags và triggers

### 4. Test GA4 Real-time

1. Vào [Google Analytics](https://analytics.google.com)
2. Chọn property với ID `G-8Z0G457R7M`
3. Vào "Realtime" > "Overview"
4. Refresh website và kiểm tra real-time data

## Debug Commands

### Kiểm tra dataLayer trong Console

```javascript
// Kiểm tra dataLayer
console.log(window.dataLayer);

// Test push event
window.dataLayer.push({
  event: 'test_event',
  test_parameter: 'test_value'
});

// Kiểm tra gtag function
console.log(typeof window.gtag);
```

### Kiểm tra CSP trong Network tab

1. Mở Developer Tools
2. Vào Network tab
3. Refresh page
4. Tìm các requests đến:
   - `googletagmanager.com`
   - `google-analytics.com`
5. Kiểm tra status code (200 = success)

## Troubleshooting

### Nếu vẫn gặp CSP errors:

1. **Clear browser cache** và hard refresh (Ctrl+Shift+R)
2. **Restart development server**
3. **Kiểm tra CSP syntax** trong next.config.mjs
4. **Test trên incognito mode**

### Nếu GTM không load:

1. Kiểm tra GTM ID có đúng không
2. Kiểm tra network connectivity
3. Test với GTM Preview mode
4. Kiểm tra console errors

### Nếu GA4 không track:

1. Kiểm tra GA4 ID có đúng không
2. Kiểm tra gtag function có load không
3. Test với GA4 DebugView
4. Kiểm tra real-time reports

## Alternative Solutions

### Nếu CSP vẫn chặn:

1. **Tạm thời disable CSP** (chỉ cho development):
```javascript
// Trong next.config.mjs - tạm thời comment out headers
// async headers() {
//   return [...];
// }
```

2. **Sử dụng environment variables**:
```javascript
// Chỉ enable GTM trong production
const isProduction = process.env.NODE_ENV === 'production';
```

3. **Load GTM qua middleware**:
```javascript
// Tạo middleware để inject GTM scripts
```

## Best Practices

1. **Luôn test CSP changes** trên development trước
2. **Sử dụng GTM Preview mode** để debug
3. **Monitor console errors** thường xuyên
4. **Backup CSP config** trước khi thay đổi
5. **Test trên multiple browsers**

## Files đã thay đổi

- ✅ `next.config.mjs` - Cập nhật CSP
- ✅ `src/components/GTMAlternative.tsx` - Component GTM mới
- ✅ `src/app/layout.tsx` - Sử dụng GTM alternative
- ✅ `GTM_CSP_FIX_GUIDE.md` - Hướng dẫn này

## Kết quả mong đợi

- ❌ **Trước**: CSP errors chặn GTM và GA4
- ✅ **Sau**: GTM và GA4 load thành công, không còn CSP errors
- 📊 **Bonus**: Tracking hoạt động bình thường
