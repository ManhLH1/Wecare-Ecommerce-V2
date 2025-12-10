# Hướng Dẫn Khắc Phục Lỗi Camera

## Vấn Đề
Khi sử dụng chức năng chụp ảnh từ camera trong popup tìm kiếm bằng hình ảnh, có thể gặp lỗi "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập."

## Nguyên Nhân Và Giải Pháp

### 1. **Vấn Đề Bảo Mật (HTTPS)**
**Nguyên nhân:** Camera chỉ hoạt động trên HTTPS hoặc localhost
**Giải pháp:**
- Sử dụng HTTPS cho production
- Hoặc truy cập qua localhost trong development
- Tránh sử dụng HTTP trên domain thật

### 2. **Quyền Truy Cập Camera**
**Nguyên nhân:** Trình duyệt chặn quyền truy cập camera
**Giải pháp:**
- Click vào icon camera bị chặn trong thanh địa chỉ
- Chọn "Cho phép" truy cập camera
- Hoặc vào Settings > Privacy > Camera và cho phép website

### 3. **Trình Duyệt Không Hỗ Trợ**
**Nguyên nhân:** Trình duyệt cũ không hỗ trợ getUserMedia API
**Giải pháp:**
- Cập nhật trình duyệt lên phiên bản mới
- Sử dụng Chrome, Firefox, Safari, Edge phiên bản gần đây

### 4. **Camera Đang Được Sử Dụng**
**Nguyên nhân:** Ứng dụng khác đang sử dụng camera
**Giải pháp:**
- Đóng các ứng dụng khác đang sử dụng camera
- Khởi động lại trình duyệt
- Kiểm tra Task Manager (Windows) hoặc Activity Monitor (Mac)

## Các Cải Tiến Đã Thực Hiện

### 1. **Fallback Mechanism**
- Thử camera sau trước, nếu không được thì dùng camera trước
- Hiển thị thông báo lỗi chi tiết theo từng trường hợp
- Tự động ẩn button camera nếu không hỗ trợ

### 2. **Error Handling**
- `NotAllowedError`: "Vui lòng cấp quyền truy cập camera trong trình duyệt"
- `NotFoundError`: "Không tìm thấy camera trên thiết bị"
- `NotSupportedError`: "Trình duyệt không hỗ trợ camera"
- `NotReadableError`: "Camera đang được sử dụng bởi ứng dụng khác"

### 3. **User Experience**
- Hiển thị thông báo hướng dẫn khi camera không khả dụng
- Vẫn có thể upload file ảnh thay thế
- UI responsive và thân thiện với mobile

## Hướng Dẫn Cho Người Dùng

### Trên Desktop:
1. Đảm bảo có webcam
2. Cho phép quyền truy cập camera khi trình duyệt yêu cầu
3. Sử dụng HTTPS

### Trên Mobile:
1. Cho phép quyền truy cập camera trong trình duyệt
2. Đảm bảo không có ứng dụng nào khác đang sử dụng camera
3. Sử dụng HTTPS hoặc localhost

### Fallback Options:
- Nếu camera không hoạt động, vẫn có thể upload file ảnh
- Chức năng AI phân tích vẫn hoạt động bình thường
- Không ảnh hưởng đến trải nghiệm tìm kiếm sản phẩm

## Testing Checklist

- [ ] Test trên HTTPS
- [ ] Test trên localhost
- [ ] Test trên mobile (iOS/Android)
- [ ] Test trên các trình duyệt khác nhau
- [ ] Test khi từ chối quyền camera
- [ ] Test khi không có camera
- [ ] Test fallback upload file

## Code Changes

### Files Modified:
- `src/components/JDStyleHeader.tsx`
- `src/app/san-pham/_components/ProductTree.tsx`

### Key Features Added:
- Camera support detection
- Enhanced error handling
- Fallback mechanisms
- Better user feedback
- Mobile optimization
