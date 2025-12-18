# Hướng dẫn cấu hình SSH Key cho Deployment

## ⚠️ Lưu ý quan trọng

Bạn đã cung cấp **SSH Public Key**, nhưng để CircleCI có thể SSH vào server, bạn cần cung cấp **SSH Private Key**.

## 🔑 SSH Key hiện tại của bạn

**Public Key:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINR7AO0IgkcDD1VdW8FAT7W6dHAYVxUpDol4eHUeGV0f khoanguyen.270799@gmail.com
```

## 📝 Các bước cấu hình

### 1. Tìm Private Key tương ứng

Nếu bạn đã có cặp key này, private key thường nằm ở:
- `~/.ssh/id_ed25519` (nếu dùng ed25519)
- `~/.ssh/id_rsa` (nếu dùng RSA)

### 2. Nếu chưa có Private Key

Nếu bạn chỉ có public key mà không có private key, bạn cần tạo cặp key mới:

```bash
# Tạo SSH key mới (ed25519 - khuyến nghị)
ssh-keygen -t ed25519 -C "khoanguyen.270799@gmail.com" -f ~/.ssh/circleci_deploy_key

# Hoặc nếu muốn dùng RSA
ssh-keygen -t rsa -b 4096 -C "khoanguyen.270799@gmail.com" -f ~/.ssh/circleci_deploy_key
```

### 3. Copy Public Key lên server

```bash
# Với port 3000
ssh-copy-id -i ~/.ssh/circleci_deploy_key.pub -p 3000 wecare@48.217.233.52

# Hoặc copy thủ công
cat ~/.ssh/circleci_deploy_key.pub | ssh -p 3000 wecare@48.217.233.52 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### 4. Test kết nối SSH

```bash
# Test SSH connection
ssh -i ~/.ssh/circleci_deploy_key -p 3000 wecare@48.217.233.52

# Nếu kết nối thành công, bạn sẽ thấy shell prompt của server
```

### 5. Thêm Private Key vào CircleCI

1. **Đọc Private Key:**
   ```bash
   cat ~/.ssh/circleci_deploy_key
   ```

2. **Copy toàn bộ nội dung** (bao gồm cả các dòng):
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   ...
   -----END OPENSSH PRIVATE KEY-----
   ```

3. **Thêm vào CircleCI:**
   - Vào https://app.circleci.com
   - Chọn project của bạn
   - Vào **Project Settings** → **Environment Variables**
   - Thêm variable mới:
     - **Name:** `DEPLOY_SSH_PRIVATE_KEY`
     - **Value:** Paste toàn bộ nội dung private key (giữ nguyên format)

## 🔒 Bảo mật

- ⚠️ **KHÔNG BAO GIỜ** commit private key vào Git
- ⚠️ **KHÔNG BAO GIỜ** chia sẻ private key
- ✅ Chỉ thêm private key vào CircleCI Environment Variables
- ✅ Sử dụng SSH key riêng cho deployment (không dùng key cá nhân)

## ✅ Kiểm tra cấu hình

Sau khi thêm private key vào CircleCI, bạn có thể test bằng cách:

1. Push code lên branch `main` hoặc `master`
2. Xem CircleCI build logs
3. Kiểm tra bước "Deploy to Server" có thành công không

## 🐛 Troubleshooting

### Lỗi "Permission denied (publickey)"
- Kiểm tra private key đã được thêm đúng vào CircleCI
- Kiểm tra public key đã được thêm vào `~/.ssh/authorized_keys` trên server
- Kiểm tra quyền file trên server: `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`

### Lỗi "Connection refused"
- Kiểm tra SSH port có đúng là 3000 không
- Kiểm tra firewall có cho phép kết nối từ CircleCI IP không
- Test kết nối thủ công: `ssh -p 3000 wecare@48.217.233.52`

### Lỗi "Host key verification failed"
- Script đã tự động thêm host key vào known_hosts
- Nếu vẫn lỗi, có thể cần thêm thủ công vào CircleCI

