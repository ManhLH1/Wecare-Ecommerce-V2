# Hướng dẫn thiết lập CircleCI cho Wecare Ecommerce

## Tổng quan

File cấu hình CircleCI đã được tạo tại `.circleci/config.yml`. File này sẽ tự động build, test và deploy ứng dụng Next.js của bạn.

## Các bước thiết lập

### 1. Đăng ký tài khoản CircleCI

1. Truy cập https://app.circleci.com
2. Đăng nhập bằng GitHub/GitLab/Bitbucket
3. Chọn repository `Wecare-Ecommerce-V2`

### 2. Kích hoạt project trên CircleCI

1. Vào **Projects** trên dashboard CircleCI
2. Tìm repository `Wecare-Ecommerce-V2`
3. Click **Set Up Project**
4. Chọn **Use Existing Config** (vì đã có file `.circleci/config.yml`)
5. Click **Start Building**

### 3. Cấu hình Environment Variables (nếu cần)

Nếu ứng dụng cần các biến môi trường để build:

1. Vào **Project Settings** > **Environment Variables**
2. Thêm các biến cần thiết:
   - `NODE_ENV=production`
   - Các API keys, database URLs, etc. (nếu cần)

### 4. Cấu hình Docker Registry (tùy chọn)

Nếu muốn push Docker image lên registry:

1. Thêm environment variables:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `DOCKER_REGISTRY` (nếu dùng private registry)

2. Cập nhật job `build-docker` trong `.circleci/config.yml` để push image

## Cấu trúc Workflow

Workflow hiện tại bao gồm:

1. **build-and-test**: 
   - Cài đặt dependencies
   - Chạy linter
   - Build Next.js app
   - Chạy trên các branch: `main`, `develop`, và các branch `feature/*`

2. **build-docker**:
   - Build Docker image từ Dockerfile
   - Chỉ chạy trên `main` và `develop`
   - Yêu cầu job `build-and-test` hoàn thành thành công

3. **deploy** (đã comment):
   - Có thể mở rộng để deploy lên Vercel, AWS, Azure, etc.

## Tùy chỉnh

### Thêm test scripts

Nếu có test scripts trong `package.json`:

```yaml
- run:
    name: Run Tests
    command: npm test
```

### Deploy lên Vercel

Thêm job deploy:

```yaml
deploy-vercel:
  docker:
    - image: cimg/base:stable
  steps:
    - checkout
    - run:
        name: Install Vercel CLI
        command: npm install -g vercel
    - run:
        name: Deploy to Vercel
        command: vercel --prod --token $VERCEL_TOKEN
```

### Deploy Docker image lên registry

```yaml
- run:
    name: Login to Docker Registry
    command: |
      echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin $DOCKER_REGISTRY
- run:
    name: Push Docker Image
    command: |
      docker push $DOCKER_REGISTRY/wecare-ecommerce:${CIRCLE_SHA1}
      docker push $DOCKER_REGISTRY/wecare-ecommerce:latest
```

## Monitoring

- Xem build status tại: https://app.circleci.com
- Nhận thông báo qua email hoặc Slack (cấu hình trong Project Settings)
- Xem logs chi tiết của từng job

## Troubleshooting

### Build fails với lỗi memory

Thêm vào job:
```yaml
- run:
    name: Build with increased memory
    command: NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Build chậm

- Cache đã được cấu hình tự động
- Có thể thêm cache cho `.next` folder nếu cần

### Docker build fails

Kiểm tra:
- Dockerfile có đúng không
- Có đủ quyền truy cập Docker không
- Environment variables có đầy đủ không

## Tài liệu tham khảo

- [CircleCI Documentation](https://circleci.com/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [CircleCI Node.js Examples](https://circleci.com/developer/orbs/orb/circleci/node)

