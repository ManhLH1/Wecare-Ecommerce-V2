# Admin App - Logic Flow Documentation

Tài liệu mô tả chi tiết logic luồng xử lý cho từng tác vụ trong Admin App.

---

## 1. Giá (Price Loading)

### 1.1. Điều kiện kích hoạt
- **Trigger**: Khi có `selectedProductCode` và `product` được chọn
- **Dependencies**: `selectedProductCode`, `product`, `customerCode`, `unitId`, `vatPercent`, `vatText`, `shouldReloadPrice`, `units`

### 1.2. Luồng xử lý

```
1. Kiểm tra điều kiện
   ├─ Nếu không có selectedProductCode hoặc product
   │  └─ Reset apiPrice = null, tắt priceLoading → RETURN
   │
   └─ Nếu có đủ điều kiện
      └─ Bật priceLoading = true

2. Xác định loại đơn hàng
   ├─ isVatOrder = (vatPercent > 0) || (vatText.toLowerCase().includes('có vat'))
   └─ Gọi API fetchProductPrice(productCode, customerCode)
      └─ API trả về: { price, priceNoVat, unitName, priceGroupText, ... }

3. Auto-set đơn vị từ API (nếu có)
   ├─ Nếu API trả về unitName
   │  ├─ Tìm unit trong danh sách units khớp với unitName
   │  └─ Nếu tìm thấy và chưa có unitId hoặc unit khác
   │     └─ Set unitId và unit từ API
   │
   └─ Tiếp tục xử lý giá

4. Chọn giá theo loại đơn hàng
   ├─ Nếu isVatOrder = true
   │  └─ basePrice = price (giá có VAT)
   │
   └─ Nếu isVatOrder = false
      └─ basePrice = priceNoVat (giá không VAT)

5. Format và làm tròn giá
   ├─ roundedBase = Math.round(basePrice)
   ├─ displayPrice = giaFormat || priceFormatted || roundedBase
   └─ priceStr = normalizePriceInput(displayPrice)

6. Lưu giá để check warning
   ├─ Nếu roundedBase > 0
   │  └─ setApiPrice(roundedBase)
   │
   └─ Nếu roundedBase = null hoặc <= 0
      └─ setApiPrice(null)

7. Set giá vào input (có điều kiện)
   ├─ Nếu priceStr != '' và roundedBase > 0
   │  ├─ setBasePriceForDiscount(roundedBase)
   │  ├─ Nếu (priceEntryMethod != 'Theo chiết khấu') || (!approvePrice)
   │  │  └─ handlePriceChange(priceStr) → Set giá vào input
   │  │
   │  └─ Nếu đang ở chế độ "Theo chiết khấu" và đã bật "Duyệt giá"
   │     └─ Không set giá (sẽ tính từ chiết khấu)
   │
   └─ Nếu priceStr = '' hoặc roundedBase = null/0
      ├─ Nếu (!approvePrice) || (priceEntryMethod != 'Nhập thủ công')
      │  └─ handlePriceChange('') → Clear giá
      │
      └─ Nếu approvePrice = true và priceEntryMethod = 'Nhập thủ công'
         └─ Giữ giá cũ (user đang nhập thủ công)

8. Lưu priceGroupText
   └─ setPriceGroupText(result?.priceGroupText || result?.priceGroupName || result?.priceGroup || '')

9. Tắt loading
   └─ setPriceLoading(false)
```

### 1.3. Trạng thái input giá
- **Disabled**: Khi `isFormDisabled = true` hoặc `approvePrice = false`
- **ReadOnly**: Khi `priceLoading = true` hoặc `approvePrice = false` hoặc `(approvePrice = true và priceEntryMethod = 'Theo chiết khấu')`

### 1.4. Validation
- Giá phải > 0 để có thể thêm sản phẩm (kể cả khi bật "Duyệt giá")

---

## 2. Promotion (Khuyến mãi)

### 2.1. Điều kiện kích hoạt
- **Trigger**: Khi có `selectedProductCode` và `customerCode`
- **Dependencies**: `selectedProductCode`, `customerCode`, `vatText`, `vatPercent`

### 2.2. Luồng xử lý

```
1. Kiểm tra điều kiện
   ├─ Nếu không có selectedProductCode hoặc customerCode
   │  └─ Reset promotions = [], selectedPromotionId = '' → RETURN
   │
   └─ Nếu có đủ điều kiện
      └─ Bật promotionLoading = true

2. Gọi API fetchProductPromotions
   └─ API: GET /api/admin-app/promotions?productCode=...&customerCode=...
      └─ Trả về danh sách promotions

3. Filter promotions theo loại đơn hàng
   ├─ Xác định isVatOrder = (vatText.includes('có vat')) || (vatPercent > 0)
   │
   └─ Filter promotions:
      ├─ Nếu promotion.saleInventoryOnly = true
      │  ├─ Và isVatOrder = true
      │  │  └─ Loại bỏ promotion này (chỉ áp dụng cho đơn Không VAT)
      │  │
      │  └─ Và isVatOrder = false
      │     └─ Giữ lại promotion
      │
      └─ Nếu promotion.saleInventoryOnly = false
         └─ Giữ lại promotion

4. Auto-select promotion đầu tiên
   ├─ setPromotions(filteredPromotions)
   ├─ firstId = normalizePromotionId(filteredPromotions[0]?.id)
   └─ setSelectedPromotionId(firstId)

5. Đảm bảo luôn có promotion được chọn
   └─ useEffect: Nếu promotions.length > 0 và selectedPromotionId không tồn tại
      └─ Auto-select promotion đầu tiên

6. Tắt loading
   └─ setPromotionLoading(false)
```

### 2.3. Hiển thị Promotion
- **Section hiển thị**: Chỉ hiển thị khi `promotionLoading = true` hoặc `promotions.length > 0`
- **Auto-select**: Luôn chọn promotion đầu tiên trong danh sách
- **Copy button**: Cho phép copy tên promotion

### 2.4. Promotion Text
- Khi chọn promotion → `setPromotionText(promotion.name)`
- Promotion text được lưu vào `product.promotionText` khi add sản phẩm

---

## 3. Add Sản phẩm (Add Product)

### 3.1. Điều kiện kích hoạt
- **Trigger**: User click nút "➕ Thêm sản phẩm"
- **Validation**: 
  - `product` phải có giá trị
  - `unit` phải có giá trị
  - `quantity > 0`
  - `price > 0` (bắt buộc, kể cả khi bật "Duyệt giá")

### 3.2. Luồng xử lý

```
1. Validation
   ├─ Kiểm tra product, unit, quantity > 0, price > 0
   │  └─ Nếu thiếu → Show toast error → RETURN
   │
   └─ Nếu đủ điều kiện → Tiếp tục

2. Reserve Inventory (trong ProductEntryForm.tsx)
   ├─ Xác định isVatOrder
   ├─ Tính baseQuantity (theo đơn vị chuẩn)
   ├─ Gọi updateInventory với operation = 'reserve'
   │  ├─ skipStockCheck = true nếu isVatOrder = true hoặc isSpecialProduct
   │  └─ Reserve số lượng baseQuantity
   │
   ├─ Nếu reserve thành công
   │  ├─ Reload inventory sau 300ms
   │  └─ Tiếp tục add sản phẩm
   │
   └─ Nếu reserve thất bại
      └─ Show error → RETURN (không add sản phẩm)

3. Tính toán giá trị
   ├─ Tính invoiceSurchargeRate:
   │  ├─ Nếu (isHoKinhDoanh = true) && (isNonVat = true)
   │  │  └─ invoiceSurchargeRate = 0.015 (1.5%)
   │  │
   │  └─ Ngược lại
   │     └─ invoiceSurchargeRate = 0
   │
   ├─ Tính discountedPrice:
   │  └─ discountedPrice = price * (1 - discountPercent/100) - discountAmount
   │
   └─ Tính finalPrice:
      └─ finalPrice = discountedPrice * (1 + invoiceSurchargeRate)

4. Kiểm tra sản phẩm trùng
   ├─ Tìm trong productList:
   │  ├─ sameProduct: (productCode khớp) || (productName khớp nếu không có productCode)
   │  ├─ sameUnit: unit khớp
   │  ├─ samePrice: |price - existingPrice| < 0.01
   │  └─ notSaved: isSodCreated = false (chỉ combine với sản phẩm chưa lưu)
   │
   └─ Nếu tìm thấy sản phẩm trùng
      └─ COMBINE (xem bước 5)
      │
      └─ Nếu không tìm thấy
         └─ ADD NEW (xem bước 6)

5. COMBINE với sản phẩm hiện có
   ├─ newQuantity = existingQuantity + quantity
   ├─ Tính lại: newSubtotal, newVatAmount, newTotalAmount
   │
   ├─ Format note:
   │  ├─ Nếu approvePrice = true và có approver
   │  │  └─ formattedNote = "Duyệt giá bởi [approver]"
   │  │
   │  └─ Ngược lại
   │     └─ formattedNote = note từ input
   │
   ├─ Merge notes:
   │  └─ note = existingNote && formattedNote 
   │     ? `${existingNote}; ${formattedNote}`
   │     : existingNote || formattedNote
   │
   └─ Update product trong list:
      └─ Cập nhật quantity, subtotal, vatAmount, totalAmount, note, ...
         └─ isSodCreated = false (đảm bảo vẫn là chưa lưu)

6. ADD NEW sản phẩm
   ├─ Tính toán:
   │  ├─ subtotalCalc = quantity * finalPrice
   │  ├─ vatCalc = (subtotalCalc * vatPercent) / 100
   │  └─ totalCalc = subtotalCalc + vatCalc
   │
   ├─ Auto-increment STT:
   │  └─ newStt = maxStt + 1
   │
   ├─ Format note:
   │  ├─ Nếu approvePrice = true và có approver
   │  │  └─ formattedNote = "Duyệt giá bởi [approver]"
   │  │
   │  └─ Ngược lại
   │     └─ formattedNote = note từ input
   │
   └─ Tạo newProduct:
      ├─ id = `${Date.now()}-${newStt}`
      ├─ stt = newStt
      ├─ createdOn = new Date().toISOString()
      ├─ isSodCreated = false
      └─ Các field khác: productCode, productName, unit, quantity, price, ...

7. Reset form fields
   ├─ Clear: product, productCode, productGroupCode, unit, quantity, price, ...
   ├─ Reset: subtotal, vatAmount, totalAmount, approvePrice, approver, ...
   └─ Giữ lại: warehouse, customer, SO, deliveryDate

8. Show success message
   └─ showToast.success('Đã thêm sản phẩm vào danh sách!')
```

### 3.3. Inventory Reservation
- **Khi nào reserve**: Trước khi add sản phẩm vào danh sách
- **Số lượng reserve**: `baseQuantity` (theo đơn vị chuẩn)
- **Skip stock check**: 
  - Đơn VAT: `skipStockCheck = true`
  - Sản phẩm đặc biệt: `skipStockCheck = true`
  - Đơn Không VAT: `skipStockCheck = false` (check tồn kho)

### 3.4. Combine Logic
- **Điều kiện combine**: 
  - Cùng productCode (hoặc productName nếu không có productCode)
  - Cùng unit
  - Cùng price (tolerance 0.01)
  - Sản phẩm hiện có chưa lưu (`isSodCreated = false`)
- **Kết quả**: Cộng dồn quantity, tính lại subtotal/VAT/total, merge notes

---

## 4. Save Sản phẩm (Save to CRM)

### 4.1. Điều kiện kích hoạt
- **Trigger**: User click nút "💾 Lưu"
- **Validation**:
  - Phải có ít nhất 1 sản phẩm chưa lưu (`isSodCreated !== true`)
  - Phải có `soId`

### 4.2. Luồng xử lý

```
1. Validation
   ├─ Kiểm tra có sản phẩm chưa lưu
   │  └─ unsavedProducts = productList.filter(p => !p.isSodCreated)
   │     └─ Nếu length = 0 → Show warning → RETURN
   │
   └─ Kiểm tra có soId
      └─ Nếu không có → Show error → RETURN

2. Load existing SOD từ CRM
   ├─ Gọi fetchSaleOrderDetails(soId)
   ├─ existingProductIds = Set(existingSOD.map(sod => sod.id))
   └─ crmGuidPattern = /^[0-9a-f]{8}-...$/i

3. Filter sản phẩm mới
   ├─ newProducts = productList.filter(item => {
   │  ├─ Nếu !item.id → return true (sản phẩm mới)
   │  │
   │  ├─ Nếu item.isSodCreated = true → return false (đã lưu)
   │  │
   │  ├─ Nếu item.id là GUID hoặc bắt đầu bằng 'crdfd_'
   │  │  └─ return !existingProductIds.has(item.id)
   │  │
   │  └─ Ngược lại (id tạm local)
   │     └─ return true
   │
   └─ Nếu newProducts.length = 0 → Show warning → RETURN

4. Map sản phẩm sang format API
   ├─ productsToSave = newProducts.map(item => {
   │  ├─ Format note:
   │  │  ├─ Nếu item.approvePrice = true và có item.approver
   │  │  │  └─ formattedNote = "Duyệt giá bởi [approver]"
   │  │  │
   │  │  └─ Ngược lại
   │  │     └─ formattedNote = item.note || ''
   │  │
   │  └─ Return object:
   │     ├─ id: undefined (không gửi ID cho sản phẩm mới)
   │     ├─ productCode, productName, unit, quantity, price, ...
   │     ├─ note: formattedNote
   │     └─ Các field khác: discountPercent, discountAmount, promotionText, ...
   │
   └─ Lưu lại thông tin để check promotion order:
      ├─ savedSoId = soId
      ├─ savedCustomerCode = customerCode
      ├─ savedProductCodes = productsToSave.map(p => p.productCode)
      ├─ savedProductGroupCodes = productsToSave.map(p => p.productGroupCode)
      └─ savedTotalAmount = orderSummary.total

5. Gọi API save
   ├─ Gọi saveSaleOrderDetails({
   │  ├─ soId,
   │  ├─ warehouseName: warehouse,
   │  ├─ isVatOrder,
   │  ├─ customerIndustry,
   │  ├─ customerLoginId,
   │  ├─ customerId,
   │  ├─ userInfo,
   │  └─ products: productsToSave
   │ })
   │
   └─ API xử lý:
      ├─ Tạo SOD records trong CRM
      ├─ Update inventory (reserve → final)
      │  ├─ Đơn VAT: Trừ trực tiếp từ Kho Bình Định (không check tồn kho)
      │  └─ Đơn Không VAT: Trừ từ Inventory Weshops (có check tồn kho)
      │
      └─ Giải phóng reserved quantity:
         └─ newReservedQuantity = Math.max(0, reservedQuantity - quantity)

6. Clear form sau khi save thành công
   ├─ Clear tất cả fields: product, productCode, unit, quantity, price, ...
   ├─ Reset: customer, customerId, customerCode, so, soId
   └─ Clear: productList = []

7. Check Promotion Order
   ├─ Gọi fetchPromotionOrders(
   │  ├─ savedSoId,
   │  ├─ savedCustomerCode,
   │  ├─ savedTotalAmount,
   │  ├─ savedProductCodes,
   │  └─ savedProductGroupCodes
   │ )
   │
   ├─ Kiểm tra:
   │  ├─ hasExistingPromotionOrder = false (chưa có promotion order)
   │  └─ availablePromotions.length > 0 (có promotion khả dụng)
   │
   └─ Nếu đủ điều kiện:
      ├─ setSoId(savedSoId) (giữ lại để apply promotion)
      ├─ setPromotionOrderList(availablePromotions)
      └─ setShowPromotionOrderPopup(true) → Hiển thị popup

8. Show success message
   └─ showToast.success('Tạo đơn bán chi tiết thành công!')
```

### 4.3. Inventory Update Logic (Backend)

#### 4.3.1. Đơn Không VAT (Inventory Weshops)
```
1. Lấy current inventory và reserved quantity
2. Kiểm tra tồn kho:
   ├─ Nếu currentInventory < quantity
   │  └─ Throw error: "Không đủ tồn kho"
   │
   └─ Nếu đủ tồn kho
      ├─ newCurrentInventory = currentInventory - quantity
      ├─ newReservedQuantity = Math.max(0, reservedQuantity - quantity)
      └─ Update vào CRM
```

#### 4.3.2. Đơn VAT (Kho Bình Định)
```
1. Lấy current inventory và reserved quantity
2. Không check tồn kho (skipStockCheck = true)
3. Update trực tiếp:
   ├─ newCurrentInventory = currentInventory - quantity
   ├─ newReservedQuantity = Math.max(0, reservedQuantity - quantity)
   └─ Update vào CRM
```

### 4.4. Promotion Order Popup

#### 4.4.1. Hiển thị popup
- **Điều kiện**: 
  - Save thành công
  - Chưa có promotion order nào được áp dụng (`hasExistingPromotionOrder = false`)
  - Có promotion order khả dụng (`availablePromotions.length > 0`)

#### 4.4.2. User chọn và xác nhận
```
1. User chọn promotion từ dropdown
   └─ setSelectedPromotionOrder(promo)

2. User click "Xác nhận"
   ├─ Gọi applyPromotionOrder({
   │  ├─ soId,
   │  ├─ promotionId,
   │  ├─ promotionName,
   │  ├─ promotionValue,
   │  ├─ vndOrPercent,
   │  ├─ chietKhau2: (chietKhau2 === 191920001),
   │  ├─ productCodes,
   │  └─ productGroupCodes
   │ })
   │
   └─ API xử lý:
      ├─ Tạo record Orders x Promotion
      ├─ Nếu chietKhau2 = true:
      │  ├─ Lấy danh sách SOD của SO
      │  ├─ Filter SOD matching productCodes/productGroupCodes
      │  └─ Update crdfd_chieckhau2 trên các SOD matching
      │     ├─ Nếu vndOrPercent = "%": crdfd_chieckhau2 = value / 100
      │     └─ Nếu vndOrPercent = "VNĐ": crdfd_chieckhau2 = value
      │
      └─ Return success

3. Sau khi apply thành công
   ├─ Show success message
   ├─ Close popup
   ├─ Clear promotion order list
   └─ Clear soId
```

---

## 5. Các Tác vụ Khác

### 5.1. Inventory Loading

#### 5.1.1. Điều kiện kích hoạt
- **Trigger**: Khi có `selectedProductCode` và `warehouse`
- **Dependencies**: `selectedProductCode`, `warehouse`, `vatText`, `vatPercent`, `productGroupCode`

#### 5.1.2. Luồng xử lý
```
1. Kiểm tra điều kiện
   ├─ Nếu không có selectedProductCode hoặc warehouse
   │  └─ Reset inventory messages → RETURN
   │
   └─ Nếu có đủ điều kiện
      └─ Bật inventoryLoading = true

2. Xác định loại inventory
   ├─ isVatOrder = (vatText.includes('có vat')) || (vatPercent > 0)
   ├─ isSpecialProduct = INVENTORY_BYPASS_PRODUCT_GROUP_CODES.includes(productGroupCode)
   └─ shouldBypassInventoryCheck = isVatOrder || isSpecialProduct

3. Fetch Inventory (Non-VAT)
   ├─ Nếu không phải đơn VAT
   │  ├─ Gọi fetchInventory với isVatOrder = false
   │  ├─ Lấy từ Inventory Weshops
   │  └─ Hiển thị: "Tồn kho (Inventory): [số lượng]"
   │
   └─ Luôn fetch để hiển thị (kể cả đơn VAT)

4. Fetch Kho Bình Định (VAT)
   ├─ Nếu isSpecialProduct = true
   │  └─ isVatOrderForInventory = true (luôn lấy từ Kho Bình Định)
   │
   ├─ Nếu isVatOrder = true
   │  └─ isVatOrderForInventory = true
   │
   └─ Gọi fetchInventory với isVatOrder = true
      └─ Hiển thị: "Tồn kho (Kho Bình Định): [số lượng]"

5. Hiển thị inventory
   ├─ Nếu isVatOrder = true (đang dùng Kho Bình Định)
   │  ├─ khoBinhDinhMessage: fontStyle = 'normal'
   │  └─ inventoryInventoryMessage: fontStyle = 'italic'
   │
   └─ Nếu isVatOrder = false (đang dùng Inventory)
      ├─ inventoryInventoryMessage: fontStyle = 'normal'
      └─ khoBinhDinhMessage: fontStyle = 'italic'

6. Warning messages
   ├─ Nếu shouldBypassInventoryCheck = true
   │  └─ bypassWarningMessage = "Bỏ qua kiểm tra tồn kho"
   │
   └─ Nếu currentInventory < requestedQuantity (và không bypass)
      └─ inventoryWarningMessage = "Không đủ tồn kho"
```

### 5.2. Delete Sản phẩm

#### 5.2.1. Luồng xử lý
```
1. User click nút "×" trên sản phẩm
   └─ Gọi handleDelete(product.id)

2. Kiểm tra sản phẩm có inventory đã reserve
   ├─ Nếu product.warehouse và product.quantity > 0
   │  └─ Release inventory:
   │     ├─ Tính baseQuantity (theo đơn vị chuẩn)
   │     ├─ Xác định isVatOrder
   │     └─ Gọi updateInventory với operation = 'release'
   │
   └─ Nếu không có inventory
      └─ Bỏ qua bước release

3. Xóa sản phẩm khỏi list
   └─ setProductList(products.filter(p => p.id !== product.id))
```

### 5.3. Form Validation

#### 5.3.1. Disable nút "Add"
```
buttonsDisabled = true nếu:
├─ isFormDisabled = true (chưa chọn KH hoặc SO)
├─ approvePrice = true và !approver (chưa chọn người duyệt)
├─ quantity <= 0
├─ price <= 0 (bắt buộc, kể cả khi bật "Duyệt giá")
├─ (Đơn Không VAT) currentInventory < requestedQuantity (và không bypass)
└─ Các điều kiện khác...
```

#### 5.3.2. Disable nút "Save"
```
isSaveDisabled = true nếu:
├─ isSaving = true (đang lưu)
└─ hasUnsavedProducts = false (không có sản phẩm mới)
   └─ hasUnsavedProducts = productList.some(p => p.isSodCreated !== true)
```

### 5.4. Price Entry Methods

#### 5.4.1. Nhập thủ công
- User nhập giá trực tiếp vào input
- Giá input được validate: phải > 0
- Khi bật "Duyệt giá": Input được enable, user có thể sửa

#### 5.4.2. Theo chiết khấu
- User chọn tỉ lệ chiết khấu (1%, 2%, ..., 10%, 20%)
- Giá được tính: `finalPrice = basePrice * (1 - discountRate / 100)`
- Input giá là readonly khi ở chế độ này

### 5.5. Discount Calculation

```
1. Tính discount từ promotion (nếu có)
   └─ promotionDiscountPercent = selectedPromotion?.value || 0

2. Tính discount từ input
   ├─ discountPercent (từ dropdown)
   └─ discountAmount (từ input VNĐ)

3. Tính giá sau discount
   └─ discountedPrice = price * (1 - discountPercent/100) - discountAmount

4. Tính giá cuối cùng (có phụ phí)
   └─ finalPrice = discountedPrice * (1 + invoiceSurchargeRate)
```

### 5.6. VAT Calculation

```
1. Xác định VAT percent
   ├─ Từ SO: vatPercent (số)
   └─ Từ SO text: vatText ("Có VAT" hoặc "Không VAT")

2. Tính VAT amount
   └─ vatAmount = (subtotal * vatPercent) / 100

3. Tính total amount
   └─ totalAmount = subtotal + vatAmount
```

### 5.7. Product Selection

#### 5.7.1. Auto-load units khi chọn sản phẩm
```
1. Khi chọn sản phẩm
   ├─ setSelectedProductCode(product.crdfd_masanpham)
   ├─ setProductGroupCode(product.crdfd_manhomsp)
   └─ Load units từ API

2. Auto-select unit đầu tiên (nếu chưa có unit)
   └─ setUnit(units[0].crdfd_name)
```

#### 5.7.2. Auto-load warehouse
```
1. Khi có warehouses list
   └─ Auto-select warehouse đầu tiên (nếu chưa có warehouse)
```

### 5.8. Note Formatting

#### 5.8.1. Khi add sản phẩm
```
Nếu approvePrice = true và có approver:
└─ note = "Duyệt giá bởi [approver]"
│
Ngược lại:
└─ note = note từ input
```

#### 5.8.2. Khi combine sản phẩm
```
Nếu cả 2 đều có note:
└─ note = "existingNote; newNote"
│
Ngược lại:
└─ note = existingNote || newNote
```

### 5.9. Delivery Date Calculation

```
1. Xác định ngành nghề
   ├─ Nếu customerIndustry = "Shop bán lẻ"
   │  └─ ngành nghề = "Shop"
   │
   └─ Ngược lại
      └─ ngành nghề = "Nhà máy"

2. Tính ngày giao
   ├─ Nếu ngành nghề = "Shop"
   │  └─ deliveryDate = Now() + (leadtime_quanhuyen * 12 hours)
   │
   └─ Nếu ngành nghề = "Nhà máy"
      ├─ Nếu quantity * conversionRate > tồn kho lý thuyết
      │  └─ deliveryDate = Today() + leadtime
      │
      └─ Ngược lại
         └─ deliveryDate = Today() + 1
```

---

## 6. Error Handling

### 6.1. API Errors
- **Price API error**: Clear giá, show warning (nếu có)
- **Promotion API error**: Clear promotions, show error message
- **Inventory API error**: Show error, không cho add sản phẩm
- **Save API error**: Show error, giữ lại form data

### 6.2. Validation Errors
- **Missing fields**: Show toast error với message cụ thể
- **Invalid values**: Show toast error, highlight field (nếu có)

### 6.3. Inventory Errors
- **Không đủ tồn kho**: Block add sản phẩm (trừ đơn VAT và sản phẩm đặc biệt)
- **Reserve thất bại**: Không cho add sản phẩm, show error

---

## 7. State Management

### 7.1. Form State
- **Product fields**: product, productCode, productGroupCode, unit, quantity, price, ...
- **Order fields**: customer, customerId, customerCode, so, soId, deliveryDate, ...
- **Calculation fields**: subtotal, vatAmount, totalAmount, discountPercent, discountAmount
- **Flags**: approvePrice, approveSupPrice, urgentOrder

### 7.2. List State
- **productList**: Array<ProductItem>
- **Mỗi ProductItem có**:
  - `id`: Unique identifier (local hoặc CRM GUID)
  - `isSodCreated`: Boolean - đã lưu vào CRM chưa
  - `createdOn`: Timestamp - thời gian add vào list
  - Các field khác: productCode, productName, quantity, price, ...

### 7.3. Loading States
- `priceLoading`: Đang load giá
- `promotionLoading`: Đang load promotion
- `inventoryLoading`: Đang load tồn kho
- `isSaving`: Đang lưu vào CRM
- `isAdding`: Đang thêm sản phẩm vào list

---

## 8. API Endpoints

### 8.1. Price API
- **Endpoint**: `GET /api/admin-app/prices`
- **Params**: `productCode`, `customerCode`
- **Response**: `{ price, priceNoVat, unitName, priceGroupText, ... }`

### 8.2. Promotion API
- **Endpoint**: `GET /api/admin-app/promotions`
- **Params**: `productCode`, `customerCode`
- **Response**: `Promotion[]`

### 8.3. Inventory API
- **Endpoint**: `POST /api/admin-app/update-inventory`
- **Body**: `{ productCode, quantity, warehouseName, operation, isVatOrder, skipStockCheck, ... }`
- **Operations**: `'reserve'`, `'release'`, `'add'`, `'final'`

### 8.4. Save API
- **Endpoint**: `POST /api/admin-app/save-sale-order-details`
- **Body**: `{ soId, products, isVatOrder, ... }`
- **Response**: `{ success, message, ... }`

### 8.5. Promotion Order API
- **Endpoint**: `GET /api/admin-app/promotion-orders`
- **Params**: `soId`, `customerCode`, `totalAmount`, `productCodes`, `productGroupCodes`
- **Response**: `{ existingPromotionOrders, hasExistingPromotionOrder, availablePromotions, ... }`

### 8.6. Apply Promotion Order API
- **Endpoint**: `POST /api/admin-app/apply-promotion-order`
- **Body**: `{ soId, promotionId, promotionName, promotionValue, vndOrPercent, chietKhau2, ... }`
- **Response**: `{ success, ordersXPromotionId, updatedSodCount, message }`

---

## 9. Notes & Best Practices

### 9.1. Inventory Reservation
- **Luôn reserve trước khi add**: Đảm bảo không bị double-reserve
- **Release khi delete**: Giải phóng inventory khi xóa sản phẩm
- **Final khi save**: Chuyển từ reserve sang final khi lưu vào CRM

### 9.2. Price Handling
- **Luôn validate price > 0**: Không cho add sản phẩm không có giá
- **Giữ giá khi nhập thủ công**: Nếu user đang nhập thủ công và bật "Duyệt giá", không clear giá khi API trả về null

### 9.3. Product Combining
- **Chỉ combine với sản phẩm chưa lưu**: Tránh conflict với data đã lưu trong CRM
- **Merge notes**: Kết hợp notes từ cả 2 sản phẩm

### 9.4. Error Recovery
- **Giữ form data khi error**: User không mất dữ liệu đã nhập
- **Clear inventory khi error**: Đảm bảo inventory được giải phóng nếu có lỗi

---

## 10. Future Enhancements

### 10.1. Có thể bổ sung
- [ ] Batch add sản phẩm từ file Excel
- [ ] Undo/Redo cho các thao tác
- [ ] Auto-save draft
- [ ] Export danh sách sản phẩm
- [ ] Advanced promotion calculation (multi-level)
- [ ] Real-time inventory sync
- [ ] Product search với filters
- [ ] Bulk edit sản phẩm trong list

---

**Last Updated**: 2025-01-XX
**Version**: 1.0.0

