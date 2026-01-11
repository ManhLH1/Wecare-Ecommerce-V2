## Hướng dẫn sử dụng — Tạo đơn Báo Giá chi tiết (SOBG)

> File: `docs/ADMIN_APP_SOBG_USER_GUIDE.md`  
> Liên quan: `src/app/admin-app/_components/SalesOrderBaoGiaForm.tsx`, `src/app/admin-app/_components/ProductEntryForm.tsx`, `pages/api/admin-app/get-sale-order-baogia.ts`, `pages/api/admin-app/prices.ts`

### Mục đích
- Hướng dẫn nhân viên bán hàng/CSKH sử dụng màn hình **Tạo đơn báo giá chi tiết (SOBG)** trong Admin App: chọn khách hàng, chọn SOBG, thêm sản phẩm, xem giá/rewards, áp dụng khuyến mãi và lưu chi tiết.

### Truy cập
- Vào Admin App → `Tạo đơn báo giá chi tiết` (compact layout).

### 1) Chọn Khách hàng
- Sử dụng ô tìm kiếm khách hàng. Bạn có thể tìm theo tên, mã, hoặc SĐT.
- Sau khi chọn, hệ thống sẽ:
  - Thiết lập `customerId`, `customerCode`.
  - Hiển thị badge **Wecare Rewards** dưới dropdown khách hàng (nếu có).
  - Tự động load danh sách SOBG (SO báo giá) liên quan tới khách hàng.

### 2) Chọn SO báo giá (SOBG)
- Chọn một SOBG trong dropdown `SO báo giá`. Một số thông tin hiển thị ngay:
  - VAT text (ví dụ "Có VAT" / "Không VAT") dưới label SO.
  - Điều khoản thanh toán (nếu có).
- Khi chọn SOBG, hệ thống sẽ load chi tiết sản phẩm tương ứng (SOBG details).

### 3) Khu vực Giá (ProductEntryForm)
- Vị trí: phần `Giá` trong ProductEntryForm.
- Những badge/label quan trọng:
  - **Price group badge**: hiển thị `priceGroupText` (ví dụ "Shop", "Miền Nam", ...). Nếu có discount theo nhóm sẽ hiển thị `(-x%)`.
  - **Wecare Rewards badge**: hiển thị giá trị rewards khách hàng và kèm `% giảm` nếu API/giá nhóm hỗ trợ.

### 4) Quy tắc chọn giá hiển thị
- Hệ thống lấy dữ liệu giá từ API (`/api/admin-app/prices`) trả về nhiều trường như:
  - `finalPrice` (ưu tiên hiển thị) — giá đã áp dụng mọi chính sách/chiết khấu phía server.
  - `price` / `priceWithVat` — giá gốc có VAT
  - `priceNoVat` — giá chưa VAT
  - `discountRate` / `crdfd_discount_rate` — discount do server cung cấp (decimal hoặc percent)

- Quy tắc hiện tại:
 1. Nếu API trả về `finalPrice` thì UI sẽ **luôn ưu tiên dùng `finalPrice`** để hiển thị giá (kể cả khi đổi đơn vị).
 2. Nếu không có `finalPrice`, fallback:
   - Nếu SO có VAT và `priceNoVat` tồn tại → dùng `priceNoVat`.
   - Ngược lại → dùng `price` / giá đầu tiên server trả về.
 3. `basePriceForDiscount` (dùng để tính chiết khấu client-side và hiển thị "Giá đã giảm") được lấy từ `priceNoVat` / `priceWithVat` hoặc fallback; nhưng bạn có thể yêu cầu đổi để dùng `finalPrice` làm base nếu muốn.

### 5) Đổi đơn vị (Unit)
- Khi thay đổi đơn vị, UI sẽ cố gắng map tới một mục giá tương ứng trong `prices` trả về từ server.
- Nếu giá của unit đó có `finalPrice`, hệ thống sẽ dùng `finalPrice` cho ô `Giá`.

### 6) Chiết khấu & Khuyến mãi
- Bạn có thể dùng 2 kiểu nhập giá:
  - **Nhập thủ công**: người dùng gõ giá trực tiếp.
  - **Theo chiết khấu**: nhập % chiết khấu, hệ thống sẽ tính giá.
- Khi có chương trình khuyến mãi, dropdown `Chương trình khuyến mãi` sẽ hiện danh sách. Nếu promotion có value (%) hoặc VNĐ, UI sẽ hiển thị `Giảm: x%` hoặc `Giảm: x VNĐ`.
- Sau khi lưu SOBG, hệ thống sẽ kiểm tra Promotion Orders (nếu có) và có thể hiển thị popup để chọn/áp dụng promotion.

### 7) Thêm sản phẩm vào SOBG
Steps:
1. Chọn sản phẩm → hệ thống load giá và đơn vị.
2. Chọn đơn vị (nếu cần) — giá sẽ cập nhật (ưu tiên `finalPrice`).
3. Nhập số lượng, điều chỉnh VAT/chiết khấu nếu cần.
4. Nhấn `➕ Thêm sản phẩm` để thêm vào danh sách.

Lưu ý:
- Nếu SOBG đang ở trạng thái "Có VAT", sản phẩm không VAT có thể bị chặn (tùy rule).
- Khi thêm, hệ thống có thể `reserve` tồn kho (trừ trường hợp SOBG/feature bị disable).

### 8) Lưu chi tiết SOBG
- Sau khi thêm sản phẩm, nhấn `💾 Lưu` để ghi các SOD chi tiết xuống CRM qua `save-sobg-details` API.
- Sau lưu thành công:
  - Các dòng saved sẽ được đánh dấu `isSodCreated = true`.
  - Hệ thống có thể mở popup promotion để áp dụng Promotion Orders.

### 9) Thông báo lỗi & Troubleshooting
- Nếu không load được giá: kiểm tra console/network (API `prices`), đảm bảo `customerCode`/`customerId` và `productCode` được gửi.
- Nếu giá hiển thị khác mong đợi: `finalPrice` do server trả là giá đã tính nhiều rule (khuyến mãi, reward), UI ưu tiên hiện `finalPrice`.
- Nếu badge `Wecare Rewards` không hiện: kiểm tra customer record có trường `crdfd_wecare_rewards` hay không (`get-sale-order-baogia.ts` đã expand trường này).

### 10) Câu hỏi thường gặp (FAQ)
- Q: Tại sao giá thay đổi khi đổi đơn vị?  
  A: Vì server trả về nhiều price rows theo unit; UI map unit → price. Nếu price này có `finalPrice`, sẽ hiển thị `finalPrice`.
- Q: UI dùng giá nào để tính "Giá đã giảm"?  
  A: Hiện dùng `basePriceForDiscount` (thường là priceNoVat/priceWithVat) × (1 - promo%). Có thể yêu cầu dùng `finalPrice` thay base nếu cần.

### 11) Tệp & logic liên quan (tham chiếu kỹ thuật)
- Frontend:
  - `src/app/admin-app/_components/SalesOrderBaoGiaForm.tsx` — form chính SOBG, truyền `customerWecareRewards` vào ProductEntryForm.
  - `src/app/admin-app/_components/ProductEntryForm.tsx` — area nhập sản phẩm, hiển thị giá/rewards/discount, load prices/promotions.
- Backend:
  - `pages/api/admin-app/get-sale-order-baogia.ts` — API trả danh sách SOBG (đã expand `crdfd_wecare_rewards`).
  - `pages/api/admin-app/prices.ts` — API lấy giá/discountRate/price groups (logic chọn finalPrice, discount).

---
Nếu bạn muốn, tôi có thể:
- Thêm ảnh chụp màn hình vào hướng dẫn (gợi ý vị trí các thành phần).  
- Thay đổi cách tính hiển thị (ví dụ: dùng `finalPrice` làm base để tính giảm %).  
- Dịch sang tiếng Anh.


