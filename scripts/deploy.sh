#!/bin/bash
set -e

# Configuration từ environment variables
SERVER_HOST="${DEPLOY_SERVER_HOST:-48.217.233.52}"
SERVER_USER="${DEPLOY_SERVER_USER:-wecare}"
SERVER_PORT="${DEPLOY_SERVER_PORT:-8080}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/wecare/Wecare-Ecommerce-V2}"
DOCKER_IMAGE_NAME="wecare-ecommerce"
DOCKER_IMAGE_TAG="${CIRCLE_SHA1:-latest}"

echo "🚀 Starting deployment to ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}"

# Tìm Docker image file
IMAGE_FILE=$(ls /tmp/wecare-ecommerce-*.tar.gz 2>/dev/null | head -1)

if [ -z "$IMAGE_FILE" ]; then
  echo "❌ Error: Docker image file not found in /tmp/"
  exit 1
fi

echo "📦 Found Docker image: $IMAGE_FILE"

# Copy Docker image lên server
echo "📤 Copying Docker image to server..."
scp -i ~/.ssh/deploy_key -P ${SERVER_PORT} -o StrictHostKeyChecking=no ${IMAGE_FILE} ${SERVER_USER}@${SERVER_HOST}:/tmp/

# SSH vào server và deploy
echo "🔧 Deploying on server..."
ssh -i ~/.ssh/deploy_key -p ${SERVER_PORT} -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} << EOF
set -e

# Tạo thư mục deploy nếu chưa có
mkdir -p ${DEPLOY_PATH}
cd ${DEPLOY_PATH}

# Load Docker image
echo "📥 Loading Docker image..."
docker load -i /tmp/wecare-ecommerce-*.tar.gz || true

# Stop và remove container cũ (nếu có)
echo "🛑 Stopping old container..."
docker stop ${DOCKER_IMAGE_NAME} 2>/dev/null || true
docker rm ${DOCKER_IMAGE_NAME} 2>/dev/null || true

# Remove old image (giữ lại latest)
echo "🧹 Cleaning up old images..."
docker image prune -f || true

# Chạy container mới
echo "▶️  Starting new container..."
docker run -d \\
  --name ${DOCKER_IMAGE_NAME} \\
  --restart unless-stopped \\
  -p 8080:8080 \\
  -e NODE_ENV=production \\
  ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}

# Tag image as latest
docker tag ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} ${DOCKER_IMAGE_NAME}:latest

# Cleanup
echo "🧹 Cleaning up..."
rm -f /tmp/wecare-ecommerce-*.tar.gz

# Kiểm tra container đang chạy
echo "✅ Checking container status..."
sleep 2
docker ps | grep ${DOCKER_IMAGE_NAME} || echo "⚠️  Container might not be running"

# Kiểm tra logs
echo "📋 Recent container logs:"
docker logs --tail 20 ${DOCKER_IMAGE_NAME} || true

echo "🎉 Deployment completed!"
EOF

echo "✅ Deployment finished successfully!"

