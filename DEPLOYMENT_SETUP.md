# Hướng dẫn cấu hình Deployment lên Server

## 📋 Tổng quan

CircleCI đã được cấu hình để tự động deploy lên server `48.217.233.52` sau khi build thành công.

## 🔧 Cấu hình Environment Variables trong CircleCI

Bạn cần thêm các environment variables sau vào CircleCI project settings:

### 1. Truy cập CircleCI Project Settings
- Vào https://app.circleci.com
- Chọn project của bạn
- Vào **Project Settings** → **Environment Variables**

### 2. Thêm các biến môi trường sau:

| Variable Name | Giá trị mặc định | Mô tả |
|--------------|------------------|-------|
| `DEPLOY_SERVER_HOST` | `48.217.233.52` | Địa chỉ IP hoặc domain của server |
| `DEPLOY_SERVER_USER` | `wecare` | Username để SSH vào server |
| `DEPLOY_SERVER_PORT` | `3000` | Port SSH (đã cấu hình: 3000) |
| `DEPLOY_PATH` | `/home/wecare/Wecare-Ecommerce-V2` | Thư mục deploy trên server |
| `DEPLOY_SSH_PRIVATE_KEY` | **(Bắt buộc)** | Private SSH key để kết nối server |

### 3. Cấu hình SSH Key

#### Tạo SSH Key (nếu chưa có):
```bash
ssh-keygen -t rsa -b 4096 -C "circleci-deploy" -f ~/.ssh/circleci_deploy_key
```

#### Copy public key lên server:
```bash
# Với port 3000
ssh-copy-id -i ~/.ssh/circleci_deploy_key.pub -p 3000 wecare@48.217.233.52

# Hoặc copy thủ công nếu ssh-copy-id không hoạt động:
cat ~/.ssh/circleci_deploy_key.pub | ssh -p 3000 wecare@48.217.233.52 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

#### Thêm private key vào CircleCI:
1. Copy nội dung của file `~/.ssh/circleci_deploy_key` (private key)
2. Vào CircleCI → Project Settings → Environment Variables
3. Thêm variable `DEPLOY_SSH_PRIVATE_KEY` với giá trị là toàn bộ nội dung private key (bao gồm cả `-----BEGIN RSA PRIVATE KEY-----` và `-----END RSA PRIVATE KEY-----`)

## 🚀 Quy trình Deploy

Khi push code lên branch `main` hoặc `master`, CircleCI sẽ:

1. ✅ Install dependencies
2. ✅ Run lint
3. ✅ Run tests
4. ✅ Build Next.js application
5. ✅ Build Docker image
6. 🚀 **Deploy lên server** (chỉ trên branch main/master)

## 📦 Cấu trúc Deploy trên Server

Sau khi deploy, trên server sẽ có:

```
/home/wecare/Wecare-Ecommerce-V2/
└── (Docker container chạy ở đây)
```

Docker container sẽ:
- Chạy trên port `3000`
- Tự động restart khi server reboot
- Có tên container: `wecare-ecommerce`

## 🔍 Kiểm tra Deployment

### Trên Server:
```bash
# Kiểm tra container đang chạy
docker ps | grep wecare-ecommerce

# Xem logs
docker logs wecare-ecommerce

# Kiểm tra ứng dụng
curl http://localhost:3000
```

### Từ bên ngoài:
Truy cập: `http://48.217.233.52:3000` (nếu firewall cho phép)

## ⚙️ Tùy chỉnh

### Thay đổi port:
Nếu muốn chạy trên port khác (ví dụ 8080), sửa trong `.circleci/config.yml`:
```yaml
-p 8080:3000
```

Và cập nhật firewall/server config để expose port đó.

### Thêm environment variables cho container:
Sửa trong `scripts/deploy.sh`, thêm vào lệnh `docker run`:
```bash
-e YOUR_ENV_VAR=value \
```

## 🐛 Troubleshooting

### Lỗi SSH Connection:
- Kiểm tra SSH key đã được thêm đúng vào CircleCI
- Kiểm tra server có cho phép SSH từ IP của CircleCI
- Kiểm tra `DEPLOY_SERVER_PORT` có đúng không

### Lỗi Docker trên Server:
- Đảm bảo Docker đã được cài đặt trên server
- Kiểm tra user có quyền chạy Docker (thường cần thêm vào group `docker`)

### Container không chạy:
```bash
# Xem logs để debug
docker logs wecare-ecommerce

# Kiểm tra port có bị conflict không
netstat -tulpn | grep 3000
```

## 📝 Notes

- Deployment chỉ chạy trên branch `main` và `master`
- Mỗi lần deploy sẽ stop container cũ và chạy container mới
- Docker image được tag với commit SHA để dễ trace
- Image cũ sẽ được tự động cleanup

