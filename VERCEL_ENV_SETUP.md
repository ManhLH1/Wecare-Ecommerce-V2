# Hướng dẫn cấu hình Environment Variables cho Vercel

## File đã tạo
- `import.env` - File chứa template các biến môi trường để import vào Vercel

## Cách sử dụng

### Cách 1: Import trực tiếp vào Vercel
1. Mở Vercel Dashboard → Project Settings → Environment Variables
2. Click vào nút "Import .env" hoặc "Import"
3. Copy toàn bộ nội dung từ file `import.env` và paste vào
4. Thay thế các giá trị `your_*_here` bằng giá trị thực tế của bạn

### Cách 2: Thêm từng biến thủ công
1. Mở Vercel Dashboard → Project Settings → Environment Variables
2. Thêm từng biến một theo danh sách bên dưới

## Danh sách biến môi trường cần thiết

### 🔐 Azure AD Authentication (Bắt buộc)
```
AZURE_CLIENT_ID=6fba5a54-1729-4c41-b444-8992ae22c909
AZURE_CLIENT_SECRET=Lfd8Q~LwEJlIy9j~UCdDoK4I7sus4_mswLLK_cAQ
AZURE_TENANT_ID=08dd70ab-ac3b-4a33-acd1-ef3fe1729e61
```
**Lưu ý:** Hiện tại các giá trị này đang hardcode trong `pages/api/getAccessToken.ts`. Nên cập nhật code để sử dụng environment variables.

### 📦 Azure Blob Storage (Bắt buộc)
```
AZURE_STORAGE_ACCOUNT=speechbob
AZURE_STORAGE_KEY=gTk7yFWOcCWjddWQ7jo7Zw6eJa3da7rU+ijtrdeUP9xc3wkeYz1MJcoZHlvqn/2q2O7TqcSo6dc9+AStR+StCA==
AZURE_STORAGE_CONTAINER=hr-cv
```
**Lưu ý:** Hiện tại các giá trị này đang hardcode trong `pages/api/uploadFile.ts` và `pages/api/deleteFile.ts`. Nên cập nhật code để sử dụng environment variables.

### 🤖 Google Gemini AI (Bắt buộc cho tính năng tìm kiếm bằng hình ảnh)
```
GEMINI_API_KEY=your_gemini_api_key_here
```
Lấy API key từ: https://makersuite.google.com/app/apikey

### 🌐 Next.js Public Variables (Bắt buộc)
```
NEXT_PUBLIC_API_URL=https://your-vercel-app.vercel.app
NEXT_PUBLIC_GTM_ID=GTM-NG7R2R2L
NEXT_PUBLIC_GA4_ID=G-8Z0G457R7M
```
**Lưu ý:** Thay `your-vercel-app.vercel.app` bằng URL thực tế của Vercel deployment.

### ⚙️ Next.js Configuration (Tùy chọn)
```
NODE_ENV=production
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_here
```
**Lưu ý:** 
- `NODE_ENV` sẽ tự động được set bởi Vercel
- `NEXTAUTH_SECRET` chỉ cần nếu bạn sử dụng NextAuth (có thể generate bằng: `openssl rand -base64 32`)

### 📊 Dynamics CRM (Tùy chọn - có thể hardcode)
```
CRM_BASE_URL=https://wecare-ii.crm5.dynamics.com
CRM_API_VERSION=v9.2
```

## ⚠️ Quan trọng: Cập nhật code để sử dụng Environment Variables

Hiện tại một số giá trị đang bị hardcode trong code. Bạn nên cập nhật:

### 1. `pages/api/getAccessToken.ts`
Thay đổi từ:
```typescript
const client_id = "6fba5a54-1729-4c41-b444-8992ae22c909";
const client_secret = "Lfd8Q~LwEJlIy9j~UCdDoK4I7sus4_mswLLK_cAQ";
const tenant_id = "08dd70ab-ac3b-4a33-acd1-ef3fe1729e61";
```

Thành:
```typescript
const client_id = process.env.AZURE_CLIENT_ID!;
const client_secret = process.env.AZURE_CLIENT_SECRET!;
const tenant_id = process.env.AZURE_TENANT_ID!;
```

### 2. `pages/api/uploadFile.ts` và `pages/api/deleteFile.ts`
Thay đổi từ:
```typescript
const accountName = "speechbob";
const accountKey = "gTk7yFWOcCWjddWQ7jo7Zw6eJa3da7rU+ijtrdeUP9xc3wkeYz1MJcoZHlvqn/2q2O7TqcSo6dc9+AStR+StCA==";
const containerName = "hr-cv";
```

Thành:
```typescript
const accountName = process.env.AZURE_STORAGE_ACCOUNT!;
const accountKey = process.env.AZURE_STORAGE_KEY!;
const containerName = process.env.AZURE_STORAGE_CONTAINER!;
```

## 🔒 Bảo mật

- **KHÔNG** commit file `.env` hoặc `import.env` có chứa giá trị thực vào Git
- Chỉ sử dụng file `import.env` như template
- Tất cả giá trị nhạy cảm phải được thêm trực tiếp vào Vercel Dashboard
- Sử dụng Vercel Environment Variables cho Production, Preview, và Development environments riêng biệt

## ✅ Kiểm tra sau khi deploy

Sau khi thêm environment variables và deploy, kiểm tra:
1. API `/api/getAccessToken` hoạt động
2. API `/api/uploadFile` hoạt động
3. Tính năng tìm kiếm bằng hình ảnh hoạt động
4. Google Tag Manager và Analytics tracking hoạt động

