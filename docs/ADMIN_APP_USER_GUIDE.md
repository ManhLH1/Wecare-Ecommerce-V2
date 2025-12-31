# HƯỚNG DẪN SỬ DỤNG ADMIN APP

## Tổng quan

Admin App là công cụ quản lý đơn hàng bán hàng (Sales Order - SO) và báo giá (Sales Order Bao Gia - SOBG) được thiết kế để tối ưu hóa quy trình tạo và quản lý đơn hàng một cách hiệu quả và chính xác.

---

## 1. Truy cập Admin App


### 1.2. Đăng nhập
- Sử dụng tài khoản doanh nghiệp để đăng nhập
- Hỗ trợ xác thực OAuth2 tự động
- Token được làm mới tự động khi hết hạn

---

## 2. Tạo Đơn Hàng Bán Hàng (SO)

### 2.1. Chọn Khách Hàng

1. **Tìm kiếm khách hàng**:
   - Nhập tên khách hàng vào ô tìm kiếm
   - Dropdown sẽ hiển thị danh sách khách hàng phù hợp
   - Click chọn khách hàng cần tạo đơn hàng

2. **Xác nhận thông tin khách hàng**:
   - Mã khách hàng sẽ được tự động điền
   - Hệ thống sẽ load danh sách đơn hàng của khách hàng

### 2.2. Chọn Đơn Hàng (SO)

1. **Chọn từ dropdown**:
   - Sau khi chọn khách hàng, dropdown "Đơn hàng" sẽ hiển thị
   - Chọn đơn hàng cần thêm sản phẩm
   - Thông tin VAT sẽ được tự động load

2. **Thông tin quan trọng**:
   - **Đơn VAT**: Không kiểm tra tồn kho, giá có VAT
   - **Đơn không VAT**: Bắt buộc kiểm tra tồn kho, giá không VAT

### 2.3. Nhập Thông Tin Giao Hàng

1. **Ngày giao hàng**:
   - Chọn ngày dự kiến giao hàng
   - Hệ thống tự động tính dựa trên ngành nghề và lead time

2. **Ghi chú đơn hàng**:
   - Nhập ghi chú đặc biệt (tùy chọn)
   - Thông tin này sẽ được lưu với đơn hàng

3. **Đơn hàng gấp**:
   - Check nếu đơn hàng cần ưu tiên xử lý
   - Ưu tiên giao hàng và xử lý

### 2.4. Thêm Sản Phẩm

#### Bước 1: Chọn Sản Phẩm
- Nhập tên hoặc mã sản phẩm vào ô tìm kiếm
- Dropdown sẽ hiển thị danh sách sản phẩm phù hợp
- Click chọn sản phẩm cần thêm

#### Bước 2: Chọn Kho và Đơn Vị
- **Kho**: Tự động chọn kho mặc định
- **Đơn vị**: Tự động load và chọn đơn vị phù hợp với sản phẩm

#### Bước 3: Nhập Số Lượng và Kiểm Tra Tồn Kho
- Nhập số lượng cần đặt hàng
- Hệ thống tự động:
  - Kiểm tra tồn kho (đối với đơn không VAT)
  - Hiển thị cảnh báo nếu không đủ tồn kho
  - Reserve số lượng để đảm bảo không bị trùng đặt

#### Bước 4: Xác Định Giá

**Phương thức 1: Nhập Thủ Công**
- Nhập giá trực tiếp vào ô giá
- Validate: Giá phải > 0

**Phương thức 2: Theo Chiết Khấu**
- Chọn tỷ lệ chiết khấu từ dropdown (1%, 2%, ..., 10%, 20%)
- Giá sẽ được tự động tính dựa trên giá gốc

#### Bước 5: Duyệt Giá Đặc Biệt (Tùy Chọn)
- Check "Duyệt giá" nếu cần áp dụng giá đặc biệt
- Chọn người duyệt từ dropdown
- Nhập giá hoặc chiết khấu theo yêu cầu

#### Bước 6: Áp Dụng Khuyến Mãi
- Hệ thống tự động load khuyến mãi phù hợp
- Có thể chọn từ dropdown các chương trình khuyến mãi
- Khuyến mãi được áp dụng tự động vào giá

#### Bước 7: Thêm vào Danh Sách
- Click nút "➕ Thêm sản phẩm"
- Sản phẩm sẽ xuất hiện trong bảng bên dưới
- Có thể tiếp tục thêm sản phẩm khác

### 2.5. Quản Lý Danh Sách Sản Phẩm

#### Xem Danh Sách Sản Phẩm
Bảng hiển thị các cột:
- STT, Tên sản phẩm, Đơn vị, Số lượng
- Giá, Phụ phí, Chiết khấu, Giá đã CK
- VAT, Tổng tiền, Người duyệt, Ngày giao

#### Chỉnh Sửa Sản Phẩm
- Click vào các ô để chỉnh sửa trực tiếp
- Thay đổi số lượng, giá, chiết khấu
- Tự động tính lại tổng tiền

#### Xóa Sản Phẩm
- Click nút "×" ở cuối dòng
- Xác nhận xóa sản phẩm
- Tồn kho được tự động giải phóng

#### Gộp Sản Phẩm Trùng
- Nếu thêm sản phẩm giống nhau (cùng mã, đơn vị, giá)
- Hệ thống sẽ tự động cộng dồn số lượng
- Ghi chú được kết hợp

### 2.6. Lưu Đơn Hàng

1. **Kiểm tra thông tin**:
   - Đảm bảo tất cả sản phẩm đã được thêm
   - Kiểm tra tổng tiền và VAT

2. **Lưu vào hệ thống**:
   - Click nút "💾 Lưu"
   - Hệ thống sẽ:
     - Tạo chi tiết đơn hàng trong CRM
     - Cập nhật tồn kho
     - Chuyển từ reserve sang final

3. **Xử lý khuyến mãi đơn hàng**:
   - Sau khi lưu thành công, popup có thể hiển thị
   - Chọn chương trình khuyến mãi áp dụng cho toàn đơn hàng
   - Xác nhận để áp dụng

---

## 3. Tạo Đơn Báo Giá (SOBG)

### 3.1. Quy Trình Tương Tự SO
Đơn báo giá có quy trình tương tự đơn hàng bán hàng, với một số điểm khác biệt:

1. **Không kiểm tra tồn kho**: Không cần kiểm tra tồn kho thực tế
2. **Logic giá riêng biệt**: Sử dụng bảng giá báo giá
3. **Không cập nhật inventory**: Không ảnh hưởng đến tồn kho thực tế

### 3.2. Các Bước Thực Hiện
- Làm theo quy trình tạo SO từ mục 2
- Hệ thống sẽ tự động nhận diện là đơn báo giá
- Không có bước reserve/giữ chỗ tồn kho

---

## 4. Các Tình Huống Thường Gặp

### 4.1. Đơn Hàng VAT vs Không VAT

#### Đơn VAT
- **Giá**: Bao gồm VAT
- **Tồn kho**: Không kiểm tra
- **Kho**: Sử dụng Kho Bình Định
- **Dành cho**: Khách hàng yêu cầu xuất hóa đơn VAT

#### Đơn Không VAT
- **Giá**: Chưa bao gồm VAT
- **Tồn kho**: Bắt buộc kiểm tra
- **Kho**: Sử dụng Inventory Weshops
- **Dành cho**: Khách hàng không cần hóa đơn VAT

### 4.2. Xử Lý Tồn Kho

#### Kiểm Tra Tồn Kho
- Hiển thị số lượng tồn kho hiện tại
- Cảnh báo màu đỏ nếu không đủ tồn kho
- Không cho thêm sản phẩm nếu hết tồn kho (trừ đơn VAT)

#### Sản Phẩm Đặc Biệt
Một số nhóm sản phẩm bỏ qua kiểm tra tồn kho:
- NSP-00027, NSP-000872, NSP-000409, NSP-000474

#### Reserve và Release
- **Reserve**: Giữ chỗ khi thêm vào danh sách
- **Release**: Giải phóng khi xóa sản phẩm
- **Final**: Xác nhận khi lưu đơn hàng

### 4.3. Xử Lý Khuyến Mãi

#### Khuyến Mãi Sản Phẩm
- Tự động load theo cặp sản phẩm + khách hàng
- Ưu tiên khuyến mãi phù hợp với loại đơn hàng (VAT/không VAT)
- Có thể chọn từ dropdown các chương trình khuyến mãi

#### Khuyến Mãi Đơn Hàng
- Áp dụng cho toàn bộ đơn hàng sau khi lưu
- Tính theo tổng giá trị đơn hàng
- Có thể giảm theo % hoặc số tiền cố định

### 4.4. Duyệt Giá Đặc Biệt

#### Khi Nào Sử Dụng
- Khi cần áp dụng giá đặc biệt cho khách hàng
- Giá thấp hơn giá chuẩn của hệ thống
- Cần có sự phê duyệt từ cấp trên

#### Quy Trình Duyệt Giá
1. Check "Duyệt giá"
2. Chọn người duyệt
3. Nhập giá hoặc chiết khấu
4. Lưu ghi chú "Duyệt giá bởi [tên người duyệt]"

---

## 5. Xử Lý Lỗi Thường Gặp

### 5.1. Lỗi Đăng Nhập
- **Lỗi**: Không thể đăng nhập
- **Nguyên nhân**: Token hết hạn, sai tài khoản
- **Giải pháp**: Clear cache trình duyệt, đăng nhập lại

### 5.2. Lỗi Load Dữ Liệu
- **Lỗi**: Không load được khách hàng/sản phẩm
- **Nguyên nhân**: Mất kết nối, API lỗi
- **Giải pháp**: Refresh trang, kiểm tra kết nối mạng

### 5.3. Lỗi Tồn Kho
- **Lỗi**: "Không đủ tồn kho"
- **Nguyên nhân**: Số lượng yêu cầu > tồn kho hiện tại
- **Giải pháp**: Giảm số lượng hoặc chọn sản phẩm khác

### 5.4. Lỗi Lưu Đơn Hàng
- **Lỗi**: Không thể lưu đơn hàng
- **Nguyên nhân**: Dữ liệu không hợp lệ, lỗi hệ thống
- **Giải pháp**: Kiểm tra lại thông tin, thử lại sau

### 5.5. Lỗi Giá Sản Phẩm
- **Lỗi**: Không load được giá
- **Nguyên nhân**: Sản phẩm chưa có giá cho khách hàng
- **Giải pháp**: Liên hệ bộ phận kinh doanh để cập nhật giá

---

## 6. Mẹo và Thủ Thuật

### 6.1. Tối Ưu Hiệu Suất
- **Tìm kiếm**: Sử dụng từ khóa chính xác để tìm nhanh
- **Nhập liệu**: Nhập số lượng trước, để hệ thống load giá
- **Batch processing**: Thêm nhiều sản phẩm cùng lúc trước khi lưu

### 6.2. Tránh Lỗi Thường Gặp
- **Kiểm tra trước khi lưu**: Xem lại toàn bộ thông tin đơn hàng
- **Điền đầy đủ thông tin**: Đảm bảo không thiếu trường bắt buộc
- **Kiểm tra tồn kho**: Xác nhận đủ tồn kho trước khi thêm sản phẩm

### 6.3. Phím Tắt và Tiện Ích
- **Tab**: Chuyển nhanh giữa các trường nhập liệu
- **Enter**: Thêm sản phẩm nhanh (sau khi điền đủ thông tin)
- **Debounce search**: Chờ 300ms sau lần nhập cuối để tìm kiếm

---

## 7. Danh Sách Kiểm Tra

### 7.1. Trước Khi Thêm Sản Phẩm
- [ ] Đã chọn khách hàng
- [ ] Đã chọn đơn hàng (SO)
- [ ] Đã nhập số lượng > 0
- [ ] Đã kiểm tra tồn kho (nếu là đơn không VAT)
- [ ] Giá > 0 hoặc đã bật duyệt giá với người duyệt

### 7.2. Trước Khi Lưu Đơn Hàng
- [ ] Tất cả sản phẩm đã được thêm vào danh sách
- [ ] Thông tin giao hàng đã đầy đủ
- [ ] Tổng tiền và VAT đã chính xác
- [ ] Đã kiểm tra khuyến mãi (nếu có)

### 7.3. Sau Khi Lưu Thành Công
- [ ] Đơn hàng đã được tạo trong CRM
- [ ] Tồn kho đã được cập nhật
- [ ] Khuyến mãi đơn hàng đã được áp dụng (nếu có)
- [ ] Thông tin đơn hàng đã được gửi đến bộ phận liên quan

---

## 8. Liên Hệ Hỗ Trợ

### 8.1. Technical Support
- **Frontend Issues**: Đội ngũ phát triển frontend
- **Backend Issues**: Đội ngũ phát triển backend
- **Business Logic**: Bộ phận kinh doanh

### 8.2. Documentation
- **Technical Guide**: `ADMIN_APP_WORK_GUIDE.md`
- **Logic Flow**: `ADMIN_APP_LOGIC_FLOW.md`
- **API Documentation**: `API_DOCUMENTATION.md`

### 8.3. Training Materials
- Video hướng dẫn sử dụng
- Workshop thực hành
- Q&A sessions

---

**Version**: 1.0.0
**Last Updated**: 2025-01-29
**Author**: Development Team

*Tài liệu này được cập nhật liên tục. Vui lòng kiểm tra phiên bản mới nhất trước khi sử dụng.*
