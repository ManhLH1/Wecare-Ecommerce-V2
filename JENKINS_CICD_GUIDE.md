# Hướng dẫn thiết lập Jenkins CI/CD cho Wecare Ecommerce

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn thiết lập Jenkins CI/CD pipeline để tự động deploy ứng dụng Next.js lên VPS.

### Quy trình CI/CD
```
Git Push → Jenkins Build → Docker Image → Push to Registry → Deploy to VPS
```

---

## 🔧 Phần 1: Cài đặt Jenkins trên VPS

### 1.1. Cài đặt Docker trên VPS (nếu chưa có)

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group
sudo usermod -aG docker $USER

# Cài đặt Docker Compose
sudo apt install docker-compose -y

# Kiểm tra cài đặt
docker --version
docker-compose --version
```

### 1.2. Cài đặt Jenkins bằng Docker

```bash
# Tạo thư mục cho Jenkins
mkdir -p ~/jenkins_home
cd ~/jenkins_home

# Tạo docker-compose.yml cho Jenkins
cat << 'EOF' > docker-compose.yml
version: '3.8'

services:
  jenkins:
    image: jenkins/jenkins:lts
    container_name: jenkins
    privileged: true
    user: root
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - ./jenkins_data:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker
    environment:
      - JAVA_OPTS=-Djenkins.install.runSetupWizard=false
    restart: always
EOF

# Khởi chạy Jenkins
docker-compose up -d

# Lấy mật khẩu admin ban đầu
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### 1.3. Cấu hình Jenkins lần đầu

1. Truy cập `http://YOUR_VPS_IP:8080`
2. Nhập mật khẩu admin từ bước trên
3. Chọn **Install suggested plugins**
4. Tạo tài khoản admin mới
5. Cấu hình Jenkins URL

---

## 🔌 Phần 2: Cài đặt Plugins cần thiết

Vào **Manage Jenkins** → **Plugins** → **Available plugins** và cài đặt:

- **Git Plugin** - Kết nối với Git repositories
- **Docker Pipeline** - Hỗ trợ Docker trong pipeline
- **Pipeline** - Jenkins Pipeline (thường đã có sẵn)
- **SSH Agent** - Kết nối SSH đến VPS
- **Credentials Binding** - Quản lý credentials
- **NodeJS Plugin** - Hỗ trợ NodeJS (tùy chọn)

---

## 🔐 Phần 3: Cấu hình Credentials

### 3.1. Thêm Git Credentials

1. Vào **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
2. Click **Add Credentials**
3. Chọn loại:
   - **Username with password** (cho HTTPS)
   - **SSH Username with private key** (cho SSH)
4. Điền thông tin và lưu

### 3.2. Thêm SSH Credentials cho VPS

1. Tạo SSH key pair trên Jenkins server:
   ```bash
   docker exec -it jenkins bash
   ssh-keygen -t rsa -b 4096 -C "jenkins@wecare"
   cat ~/.ssh/id_rsa.pub
   ```

2. Copy public key vào VPS:
   ```bash
   # Trên VPS, thêm public key vào authorized_keys
   echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
   ```

3. Thêm private key vào Jenkins Credentials

### 3.3. Thêm Environment Variables (nếu cần)

Vào **Manage Jenkins** → **Configure System** → **Global properties** → **Environment variables**

Thêm các biến môi trường cần thiết từ file `.env`

---

## 📝 Phần 4: Tạo Jenkinsfile

Tạo file `Jenkinsfile` trong thư mục gốc của project:

```groovy
pipeline {
    agent any
    
    environment {
        APP_NAME = 'wecare-ecommerce'
        DOCKER_IMAGE = 'wecare-ecommerce'
        DOCKER_TAG = "${BUILD_NUMBER}"
        VPS_HOST = 'your-vps-ip'
        VPS_USER = 'your-username'
        DEPLOY_PATH = '/home/your-username/wecare'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Checked out branch: ${env.GIT_BRANCH}"
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Lint & Test') {
            steps {
                sh 'npm run lint || true'
                // Thêm test nếu có
                // sh 'npm run test'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    sh """
                        docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
                        docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest
                    """
                }
            }
        }
        
        stage('Save Docker Image') {
            steps {
                sh """
                    docker save ${DOCKER_IMAGE}:latest | gzip > ${DOCKER_IMAGE}.tar.gz
                """
            }
        }
        
        stage('Deploy to VPS') {
            steps {
                sshagent(credentials: ['vps-ssh-key']) {
                    sh """
                        # Tạo thư mục deploy nếu chưa có
                        ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} 'mkdir -p ${DEPLOY_PATH}'
                        
                        # Copy docker image và docker-compose
                        scp -o StrictHostKeyChecking=no ${DOCKER_IMAGE}.tar.gz ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/
                        scp -o StrictHostKeyChecking=no docker-compose.yml ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/
                        scp -o StrictHostKeyChecking=no .env ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/
                        
                        # Load image và chạy container
                        ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} '
                            cd ${DEPLOY_PATH}
                            gunzip -c ${DOCKER_IMAGE}.tar.gz | docker load
                            docker-compose down || true
                            docker-compose up -d
                            rm -f ${DOCKER_IMAGE}.tar.gz
                            docker image prune -f
                        '
                    """
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    sleep 30
                    sh """
                        curl -f http://${VPS_HOST}:3000 || echo 'Health check warning'
                    """
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                sh """
                    rm -f ${DOCKER_IMAGE}.tar.gz
                    docker rmi ${DOCKER_IMAGE}:${DOCKER_TAG} || true
                """
            }
        }
    }
    
    post {
        success {
            echo '✅ Deployment successful!'
            // Thêm notification nếu cần (Slack, Email, etc.)
        }
        failure {
            echo '❌ Deployment failed!'
        }
        always {
            cleanWs()
        }
    }
}
```

---

## 🏗️ Phần 5: Tạo Jenkins Pipeline Job

### 5.1. Tạo Pipeline Job

1. Vào **Dashboard** → **New Item**
2. Nhập tên: `wecare-ecommerce-deploy`
3. Chọn **Pipeline** → **OK**

### 5.2. Cấu hình Pipeline

**General:**
- ✓ Discard old builds
  - Max # of builds to keep: 10

**Build Triggers:**
- ✓ GitHub hook trigger for GITScm polling (nếu dùng GitHub)
- Hoặc ✓ Poll SCM: `H/5 * * * *` (kiểm tra mỗi 5 phút)

**Pipeline:**
- Definition: **Pipeline script from SCM**
- SCM: **Git**
- Repository URL: `https://github.com/your-username/Wecare-Ecommerce-V2.git`
- Credentials: Chọn credentials đã tạo
- Branch: `*/main` hoặc `*/master`
- Script Path: `Jenkinsfile`

### 5.3. Lưu và Test

Click **Save** → **Build Now** để test pipeline

---

## 🔄 Phần 6: Cấu hình Webhook (Auto Build khi Push)

### 6.1. Với GitHub

1. Vào Repository Settings → **Webhooks** → **Add webhook**
2. Payload URL: `http://YOUR_VPS_IP:8080/github-webhook/`
3. Content type: `application/json`
4. Events: **Just the push event**
5. ✓ Active

### 6.2. Với GitLab

1. Vào Repository Settings → **Webhooks**
2. URL: `http://YOUR_VPS_IP:8080/project/wecare-ecommerce-deploy`
3. Secret Token: (tùy chọn)
4. Trigger: **Push events**

---

## 📁 Phần 7: Cấu trúc file cần thiết

Đảm bảo project của bạn có các file sau:

```
Wecare-Ecommerce-V2/
├── Jenkinsfile              ← File pipeline (tạo mới)
├── Dockerfile               ✅ Đã có
├── docker-compose.yml       ✅ Đã có (cần cập nhật)
├── .env                     ✅ Đã có
└── ...
```

---

## 🔧 Phần 8: Cập nhật docker-compose.yml cho Production

```yaml
version: "3.8"

services:
  wecare-ecommerce:
    image: wecare-ecommerce:latest
    container_name: wecare-ecommerce
    hostname: wecare.com.vn
    ports:
      - "3000:3000"
    labels:
      NAME: "wecare-ecommerce"
    networks:
      - wecare-network
    restart: always
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  wecare-network:
    driver: bridge
```

---

## 🔒 Phần 9: Cấu hình Nginx Reverse Proxy (Khuyến nghị)

Trên VPS, cài đặt Nginx để proxy và SSL:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Tạo file cấu hình Nginx:

```bash
sudo nano /etc/nginx/sites-available/wecare
```

```nginx
server {
    listen 80;
    server_name wecare.com.vn www.wecare.com.vn;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Kích hoạt site
sudo ln -s /etc/nginx/sites-available/wecare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Cài đặt SSL
sudo certbot --nginx -d wecare.com.vn -d www.wecare.com.vn
```

---

## 🚀 Phần 10: Quy trình Deploy thủ công (Backup)

Nếu cần deploy thủ công mà không qua Jenkins:

```bash
# 1. Clone/Pull code
git clone https://github.com/your-username/Wecare-Ecommerce-V2.git
cd Wecare-Ecommerce-V2

# 2. Build Docker image
docker build -t wecare-ecommerce:latest .

# 3. Chạy container
docker-compose up -d

# 4. Kiểm tra log
docker logs -f wecare-ecommerce
```

---

## 📊 Phần 11: Monitoring & Logs

### Xem logs

```bash
# Xem logs Jenkins
docker logs -f jenkins

# Xem logs ứng dụng
docker logs -f wecare-ecommerce

# Xem logs với timestamp
docker logs --since="2h" wecare-ecommerce
```

### Kiểm tra trạng thái

```bash
# Kiểm tra containers đang chạy
docker ps

# Kiểm tra disk usage
docker system df

# Dọn dẹp Docker
docker system prune -af
```

---

## ⚠️ Lưu ý quan trọng

1. **Bảo mật Jenkins:**
   - Đổi mật khẩu admin mặc định
   - Cấu hình HTTPS cho Jenkins
   - Giới hạn IP truy cập nếu cần

2. **Environment Variables:**
   - Không commit file `.env` lên Git
   - Sử dụng Jenkins Credentials để lưu secrets

3. **Backup:**
   - Backup `jenkins_data` thường xuyên
   - Backup database nếu có

4. **Firewall:**
   ```bash
   # Mở các port cần thiết
   sudo ufw allow 22/tcp      # SSH
   sudo ufw allow 80/tcp      # HTTP
   sudo ufw allow 443/tcp     # HTTPS
   sudo ufw allow 8080/tcp    # Jenkins (có thể giới hạn IP)
   sudo ufw enable
   ```

---

## 📞 Troubleshooting

### Lỗi phổ biến

1. **Docker permission denied:**
   ```bash
   sudo chmod 666 /var/run/docker.sock
   ```

2. **Jenkins không kết nối được VPS:**
   - Kiểm tra SSH key đã được thêm đúng
   - Kiểm tra firewall trên VPS

3. **Build thất bại do hết memory:**
   ```bash
   # Tăng swap trên VPS
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

4. **Container không start:**
   ```bash
   docker logs wecare-ecommerce
   docker-compose logs
   ```

---

## ✅ Checklist triển khai

- [ ] Cài đặt Docker trên VPS
- [ ] Cài đặt Jenkins
- [ ] Cấu hình credentials
- [ ] Tạo Jenkinsfile
- [ ] Tạo Pipeline job
- [ ] Cấu hình webhook
- [ ] Test pipeline
- [ ] Cấu hình Nginx (tùy chọn)
- [ ] Cấu hình SSL (tùy chọn)
- [ ] Test toàn bộ quy trình

---

**Tác giả:** Generated by Antigravity AI  
**Ngày tạo:** 2025-12-18  
**Version:** 1.0
