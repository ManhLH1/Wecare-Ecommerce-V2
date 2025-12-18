# Hướng dẫn Setup CircleCI cho Wecare Ecommerce

## 📋 Tổng quan

File cấu hình CircleCI đã được tạo tại `.circleci/config.yml`. File này sẽ tự động build, test và tạo Docker image cho ứng dụng Next.js của bạn.

## 🚀 Các bước setup trên app.circleci.com

### Bước 1: Đăng nhập và kết nối Repository

1. Truy cập [app.circleci.com](https://app.circleci.com)
2. Đăng nhập bằng GitHub/GitLab/Bitbucket account
3. Click vào **"Add Projects"** hoặc **"Projects"** trong sidebar
4. Tìm repository `Wecare-Ecommerce-V2` và click **"Set Up Project"**
5. Chọn **"Use Existing Config"** (vì đã có file `.circleci/config.yml`)
6. Click **"Start Building"**

### Bước 2: Cấu hình Environment Variables

CircleCI cần các biến môi trường để build ứng dụng. Thêm các biến sau trong **Project Settings → Environment Variables**:

#### Biến bắt buộc cho Build:

```bash
# Azure AD Authentication
AZURE_CLIENT_ID=your_azure_client_id_here
AZURE_CLIENT_SECRET=your_azure_client_secret_here
AZURE_TENANT_ID=your_azure_tenant_id_here

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT=your_storage_account_name
AZURE_STORAGE_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER=your_container_name

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Next.js Public Variables
NEXT_PUBLIC_API_URL=https://your-api-url.com
NEXT_PUBLIC_GTM_ID=GTM-NG7R2R2L
NEXT_PUBLIC_GA4_ID=G-8Z0G457R7M

# Next.js Configuration
NODE_ENV=production
NEXTAUTH_URL=https://your-app-url.com
NEXTAUTH_SECRET=your_nextauth_secret_here

# Dynamics CRM
CRM_BASE_URL=https://wecare-ii.crm5.dynamics.com
CRM_API_VERSION=v9.2
```

**Lưu ý:** 
- Các giá trị này giống với file `import.env` nhưng cần thay thế bằng giá trị thực tế
- Không commit các giá trị thực vào Git
- Sử dụng CircleCI Environment Variables để bảo mật

### Bước 3: Kiểm tra Build

1. Push code lên repository để trigger build tự động
2. Hoặc click **"Rerun workflow"** trong CircleCI dashboard
3. Xem logs để đảm bảo build thành công

## 📦 Cấu trúc Workflow

Workflow hiện tại bao gồm các jobs sau:

1. **install-dependencies**: Cài đặt npm packages và cache
2. **lint**: Chạy ESLint để kiểm tra code quality
3. **test**: Chạy tests (nếu có)
4. **build**: Build Next.js application
5. **build-docker**: Build Docker image (chỉ chạy trên main/master/develop branches)

## 🔧 Tùy chỉnh Workflow

### Thêm Deployment Job

Nếu muốn tự động deploy sau khi build thành công, thêm job vào workflow:

```yaml
deploy:
  docker:
    - image: cimg/node:20.0
  steps:
    - checkout
    - attach_workspace:
        at: ~/project
    - run:
        name: Deploy to Production
        command: |
          # Thêm lệnh deploy của bạn ở đây
          # Ví dụ: deploy lên Vercel, AWS, Docker Hub, etc.
```

### Thay đổi Branches trigger Docker Build

Sửa phần `filters` trong job `build-docker`:

```yaml
filters:
  branches:
    only:
      - main
      - production
      - staging
```

### Thêm Docker Registry Push

Nếu muốn push Docker image lên registry (Docker Hub, AWS ECR, etc.):

```yaml
push-docker:
  machine:
    image: ubuntu-2204:current
  steps:
    - checkout
    - setup_remote_docker:
        version: 24.0.5
    - attach_workspace:
        at: ~/project
    - run:
        name: Login to Docker Registry
        command: |
          echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
    - run:
        name: Push Docker Image
        command: |
          docker tag wecare-ecommerce:${CIRCLE_SHA1} your-registry/wecare-ecommerce:${CIRCLE_SHA1}
          docker tag wecare-ecommerce:${CIRCLE_SHA1} your-registry/wecare-ecommerce:latest
          docker push your-registry/wecare-ecommerce:${CIRCLE_SHA1}
          docker push your-registry/wecare-ecommerce:latest
```

Thêm biến môi trường:
- `DOCKER_USERNAME`: Username cho Docker registry
- `DOCKER_PASSWORD`: Password cho Docker registry

## 📊 Monitoring và Notifications

### Email Notifications

CircleCI tự động gửi email khi:
- Build fails
- Build succeeds (có thể tắt trong Settings)

### Slack Notifications

1. Vào **Project Settings → Notifications**
2. Kết nối Slack workspace
3. Chọn channel để nhận notifications

### GitHub Status Checks

CircleCI tự động update status checks trên GitHub PRs. Không cần cấu hình thêm.

## 🐛 Troubleshooting

### Build fails với "Missing environment variables"

- Kiểm tra tất cả environment variables đã được thêm trong CircleCI
- Đảm bảo không có typo trong tên biến

### Docker build fails

- Kiểm tra Dockerfile có đúng format
- Đảm bảo `setup_remote_docker` được gọi trước khi build

### Build chậm

- CircleCI tự động cache `node_modules` giữa các builds
- Nếu vẫn chậm, kiểm tra network hoặc thêm cache cho các bước khác

### Next.js build fails

- Kiểm tra logs để xem lỗi cụ thể
- Đảm bảo tất cả environment variables cần thiết đã được set
- Kiểm tra `next.config.mjs` có đúng cấu hình

## 📚 Tài liệu tham khảo

- [CircleCI Documentation](https://circleci.com/docs/)
- [CircleCI Node.js Examples](https://circleci.com/docs/language-javascript/)
- [CircleCI Docker Examples](https://circleci.com/docs/docker/)

## ✅ Checklist Setup

- [ ] Đã kết nối repository với CircleCI
- [ ] Đã thêm tất cả environment variables
- [ ] Đã test build thành công
- [ ] Đã cấu hình notifications (nếu cần)
- [ ] Đã setup deployment (nếu cần)

## 🔐 Bảo mật

- **KHÔNG** commit file `.env` có giá trị thực vào Git
- Sử dụng CircleCI Environment Variables cho tất cả secrets
- Sử dụng Contexts nếu cần chia sẻ variables giữa nhiều projects
- Review code trước khi merge để tránh leak secrets

