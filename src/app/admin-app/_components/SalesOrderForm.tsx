'use client';

import { useState, useEffect } from 'react';
import ProductEntryForm from './ProductEntryForm';
import ProductTable from './ProductTable';
import Dropdown from './Dropdown';
import { useCustomers, useSaleOrders } from '../_hooks/useDropdownData';
import { fetchSaleOrderDetails, SaleOrderDetail, saveSaleOrderDetails, updateInventory, fetchInventory, fetchUnits, fetchPromotionOrders, applyPromotionOrder, PromotionOrderItem } from '../_api/adminApi';
import { showToast } from '../../../components/ToastManager';
import { getItem } from '../../../utils/SecureStorage';
import { getStoredUser } from '../_utils/implicitAuthService';

interface ProductItem {
  id: string;
  stt?: number;
  productCode?: string;
  productId?: string;
  productName: string;
  productGroupCode?: string;
  productCategoryLevel4?: string;
  unit: string;
  unitId?: string;
  quantity: number;
  price: number;
  surcharge: number;
  discount: number;
  discountedPrice: number;
  vat: number;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  approver: string;
  deliveryDate: string;
  isSodCreated?: boolean;
  warehouse?: string;
  note?: string;
  urgentOrder?: boolean;
  approvePrice?: boolean;
  approveSupPrice?: boolean;
  approveSupPriceId?: string;
  discountPercent?: number;
  discountAmount?: number;
  promotionText?: string;
  invoiceSurcharge?: number; // Phụ phí hoá đơn
  createdOn?: string;
}

interface SalesOrderFormProps {
  hideHeader?: boolean;
}

export default function SalesOrderForm({ hideHeader = false }: SalesOrderFormProps) {
  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [so, setSo] = useState('');
  const [soId, setSoId] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isOrderInfoCollapsed, setIsOrderInfoCollapsed] = useState(false);

  // Fetch data for dropdowns
  const { customers, loading: customersLoading } = useCustomers(customerSearch);
  // Load SO - if customerId is selected, filter by customer, otherwise load all
  const { saleOrders, loading: soLoading, error: soError } = useSaleOrders(customerId || undefined);
  const [product, setProduct] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productGroupCode, setProductGroupCode] = useState('');
  const [unit, setUnit] = useState('');
  const [unitId, setUnitId] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [approvePrice, setApprovePrice] = useState(false);
  const [approveSupPrice, setApproveSupPrice] = useState(false);
  const [urgentOrder, setUrgentOrder] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [customerIndustry, setCustomerIndustry] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [approver, setApprover] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promotionText, setPromotionText] = useState('');
  const [productList, setProductList] = useState<ProductItem[]>([]);

  // Promotion Order Popup state
  const [showPromotionOrderPopup, setShowPromotionOrderPopup] = useState(false);
  const [promotionOrderList, setPromotionOrderList] = useState<PromotionOrderItem[]>([]);
  const [selectedPromotionOrder, setSelectedPromotionOrder] = useState<PromotionOrderItem | null>(null);
  const [isApplyingPromotion, setIsApplyingPromotion] = useState(false);

  // Kiểm tra có sản phẩm chưa lưu để enable nút Save
  // Sản phẩm mới = isSodCreated không phải true (có thể là false, undefined, null)
  const hasUnsavedProducts = productList.some(p => p.isSodCreated !== true);
  const isSaveDisabled = isSaving || !hasUnsavedProducts;

  // Tổng hợp tiền toàn đơn hàng
  const orderSummary = productList.reduce(
    (acc, item) => {
      const lineSubtotal = (item.discountedPrice || item.price) * item.quantity;
      const lineVat = (lineSubtotal * item.vat) / 100;
      acc.subtotal += lineSubtotal;
      acc.vat += lineVat;
      acc.total += lineSubtotal + lineVat;
      return acc;
    },
    { subtotal: 0, vat: 0, total: 0 }
  );

  // Helper to derive VAT text from SO record
  const getVatLabelText = (so: any) => {
    if (!so) return '';
    const vatTextFromCrm = (so.cr1bb_vattext || '').trim();
    if (vatTextFromCrm) return vatTextFromCrm;
    if (so.crdfd_vat === 191920000) return 'Có VAT';
    if (so.crdfd_vat === 191920001) return 'Không VAT';
    return '';
  };

  const selectedSo = saleOrders.find((so) => so.crdfd_sale_orderid === soId);
  const selectedVatText = getVatLabelText(selectedSo);
  const isNonVatSelected = (selectedVatText || '').toLowerCase().includes('không');

  // Load Sale Order Details when soId changes (formData equivalent)
  useEffect(() => {
    const loadSaleOrderDetails = async () => {
      if (!soId) {
        setProductList([]);
        return;
      }

      setIsLoadingDetails(true);
      try {
        const details = await fetchSaleOrderDetails(soId);
        // Map SaleOrderDetail to ProductItem
        const mappedProducts: ProductItem[] = details.map((detail: SaleOrderDetail) => {
          const subtotal = (detail.discountedPrice || detail.price) * detail.quantity;
          const vatAmount = (subtotal * detail.vat) / 100;
          return {
            id: detail.id,
            stt: detail.stt,
            productName: detail.productName,
            unit: detail.unit,
            quantity: detail.quantity,
            price: detail.price,
            surcharge: detail.surcharge,
            discount: detail.discount,
            discountedPrice: detail.discountedPrice,
            vat: detail.vat,
            subtotal,
            vatAmount,
            totalAmount: detail.totalAmount,
            approver: detail.approver,
            deliveryDate: detail.deliveryDate || '',
            isSodCreated: true,
          };
        });
        // Sort by STT descending (already sorted by API, but ensure it)
        mappedProducts.sort((a, b) => (b.stt || 0) - (a.stt || 0));
        setProductList(mappedProducts);
      } catch (error) {
        console.error('Error loading sale order details:', error);
        setProductList([]);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadSaleOrderDetails();
  }, [soId]);

  const handleAddProduct = async () => {
    // Validation: product, unit, quantity, price (bắt buộc phải có giá > 0)
    const priceNum = parseFloat(price || '0') || 0;
    const hasValidPrice = priceNum > 0;
    
    if (!product || !unit || quantity <= 0 || !hasValidPrice) {
      console.warn('❌ Add Product Failed: Missing required fields', {
        product: !!product,
        unit: !!unit,
        quantity,
        price: priceNum,
        hasValidPrice,
        approvePrice,
      });
      
      // Hiển thị thông báo lỗi cụ thể
      if (!product) {
        showToast.error('Vui lòng chọn sản phẩm');
      } else if (!unit) {
        showToast.error('Vui lòng chọn đơn vị');
      } else if (quantity <= 0) {
        showToast.error('Số lượng phải lớn hơn 0');
      } else if (!hasValidPrice) {
        showToast.error('Vui lòng nhập giá');
      }
      return;
    }

    setIsAdding(true);
    // Add small delay for animation feedback
    await new Promise(resolve => setTimeout(resolve, 100));

    // Calculate invoice surcharge (Phụ phí hoá đơn)
    // 1.5% for "Hộ kinh doanh" + "Không VAT" orders
    const selectedSo = saleOrders.find((so) => so.crdfd_sale_orderid === soId);
    const isHoKinhDoanh = selectedSo?.cr1bb_loaihoaon === 191920001; // TODO: confirm OptionSet value
    const isNonVat = vatPercent === 0;
    const invoiceSurchargeRate = isHoKinhDoanh && isNonVat ? 0.015 : 0;

    // Calculate discounted price (giá đã giảm)
    // For now, use price directly; in future integrate with promotion logic
    const discountedPriceCalc = priceNum * (1 - discountPercent / 100) - discountAmount;
    const finalPrice = discountedPriceCalc * (1 + invoiceSurchargeRate);

    // Check if product already exists with same productCode/productName, unit, and price
    // Only combine products that haven't been saved to CRM (isSodCreated = false)
    const existingProductIndex = productList.findIndex((p) => {
      const sameProduct = (productCode && p.productCode === productCode) || 
                         (!productCode && p.productName === product);
      const sameUnit = p.unit === unit;
      const samePrice = Math.abs(p.price - priceNum) < 0.01; // Compare with small tolerance for floating point
      const notSaved = !p.isSodCreated; // Only combine unsaved products
      
      return sameProduct && sameUnit && samePrice && notSaved;
    });

    if (existingProductIndex !== -1) {
      // Combine with existing product: add quantities and recalculate
      const existingProduct = productList[existingProductIndex];
      const newQuantity = existingProduct.quantity + quantity;
      
      // Recalculate amounts with new total quantity
      const newSubtotal = newQuantity * finalPrice;
      const newVatAmount = (newSubtotal * vatPercent) / 100;
      const newTotalAmount = newSubtotal + newVatAmount;

      // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [người duyệt]", ngược lại lấy từ input
      const formattedNoteForMerge = approvePrice && approver 
        ? `Duyệt giá bởi ${approver}`
        : note;
      
      // Update existing product
      const updatedProduct: ProductItem = {
        ...existingProduct,
        quantity: newQuantity,
        subtotal: newSubtotal,
        vatAmount: newVatAmount,
        totalAmount: newTotalAmount,
        // Update other fields from new input (in case they changed)
        discount: discountAmount,
        discountedPrice: finalPrice,
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        vat: vatPercent,
        invoiceSurcharge: invoiceSurchargeRate,
        // Merge notes if both have notes
        note: existingProduct.note && formattedNoteForMerge 
          ? `${existingProduct.note}; ${formattedNoteForMerge}` 
          : existingProduct.note || formattedNoteForMerge,
        // Đảm bảo isSodCreated = false khi combine (vì chỉ combine với sản phẩm chưa lưu)
        isSodCreated: false,
      };

      // Update product list
      const updatedList = [...productList];
      updatedList[existingProductIndex] = updatedProduct;
      setProductList(updatedList);
    } else {
      // Add new product
      // Calculate amounts
      const subtotalCalc = quantity * finalPrice;
      const vatCalc = (subtotalCalc * vatPercent) / 100;
      const totalCalc = subtotalCalc + vatCalc;

      // Auto-increment STT
      const maxStt = productList.length > 0 ? Math.max(...productList.map((p) => p.stt || 0)) : 0;
      const newStt = maxStt + 1;

      // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [người duyệt]", ngược lại lấy từ input
      const formattedNote = approvePrice && approver 
        ? `Duyệt giá bởi ${approver}`
        : note;

      const newProduct: ProductItem = {
        id: `${Date.now()}-${newStt}`,
        stt: newStt,
        productCode: productCode,
        productName: product,
        productGroupCode: productGroupCode,
        unit: unit,
        quantity,
        price: priceNum,
        surcharge: 0,
        discount: discountAmount,
        discountedPrice: finalPrice,
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        vat: vatPercent,
        subtotal: subtotalCalc,
        vatAmount: vatCalc,
        totalAmount: totalCalc,
        approver: approver,
        deliveryDate: deliveryDate,
        warehouse: warehouse,
        note: formattedNote,
        urgentOrder: urgentOrder,
        approvePrice: approvePrice,
        approveSupPrice: approveSupPrice,
        promotionText: promotionText,
        invoiceSurcharge: invoiceSurchargeRate,
        createdOn: new Date().toISOString(),
        isSodCreated: false,
      };

      setProductList([...productList, newProduct]);
    }

    // NOTE: Inventory reservation đã được xử lý trong ProductEntryForm.tsx (handleAddWithInventoryCheck)
    // Không cần reserve lại ở đây để tránh reserve 2 lần

    // Reset form fields (mimic PowerApps Reset())
    setProduct('');
    setProductCode('');
    setProductGroupCode('');
    setUnit('');
    setQuantity(1);
    setPrice('');
    setSubtotal(0);
    setVatAmount(0);
    setTotalAmount(0);
    setApprovePrice(false);
    setApproveSupPrice(false);
    setUrgentOrder(false);
    setApprover('');
    setDiscountPercent(0);
    setDiscountAmount(0);
    setPromotionText('');
    setNote('');
    // Keep warehouse, customer, SO, deliveryDate as they are reused

    setIsAdding(false);
    showToast.success('Đã thêm sản phẩm vào danh sách!');
  };

  const handleSave = async () => {
    // Chỉ kiểm tra có sản phẩm chưa lưu (isSodCreated = false)
    const unsavedProducts = productList.filter(p => !p.isSodCreated);
    if (unsavedProducts.length === 0) {
      showToast.warning('Không có sản phẩm mới để lưu.');
      return;
    }

    if (!soId) {
      showToast.error('Vui lòng chọn Sales Order trước khi lưu.');
      return;
    }

    setIsSaving(true);
    try {
      const customerLoginIdRaw = getItem('id');
      const customerLoginId =
        (typeof customerLoginIdRaw === 'string' ? customerLoginIdRaw : String(customerLoginIdRaw || '')).trim() || undefined;

      // Load danh sách SOD hiện có từ CRM
      const existingSOD = await fetchSaleOrderDetails(soId);
      const existingProductIds = new Set(
        existingSOD
          .map((sod) => sod.id)
          .filter((id): id is string => !!id)
      );
      const crmGuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Lấy các sản phẩm CHƯA CÓ trong SOD từ CRM
      // Sản phẩm mới là những sản phẩm không có ID từ CRM hoặc ID không nằm trong danh sách SOD hiện có
      const newProducts = productList.filter((item) => {
        // Không có ID → sản phẩm mới
        if (!item.id) return true;

        // Đã đánh dấu là SOD đã tạo → bỏ qua
        if (item.isSodCreated) return false;

        const idLower = item.id.toLowerCase();
        // Id CRM dạng GUID hoặc prefix crdfd_ → coi là đã tạo (nếu tìm thấy trong CRM)
        if (crmGuidPattern.test(item.id) || idLower.startsWith('crdfd_')) {
          return !existingProductIds.has(item.id);
        }

        // Các id tạm (local) khác → cho phép lưu
        return true;
      });

      if (newProducts.length === 0) {
        showToast.warning('Không có sản phẩm mới để lưu. Tất cả sản phẩm đã có trong SOD.');
        return;
      }

      const selectedSo = saleOrders.find((so) => so.crdfd_sale_orderid === soId);
      const isVatOrder = selectedVatText?.toLowerCase().includes('có vat') || false;

      // Map chỉ các sản phẩm mới (chưa có trong SOD) to API format
      // Không gửi ID vì đây là sản phẩm mới, chưa có trong CRM
      const productsToSave = newProducts.map((item) => {
        // Format note: nếu có duyệt giá thì format "Duyệt giá bởi [người duyệt]", ngược lại lấy từ item.note
        const formattedNote = item.approvePrice && item.approver 
          ? `Duyệt giá bởi ${item.approver}`
          : item.note || '';
        
        return {
          id: undefined, // Không gửi ID cho sản phẩm mới - sẽ được tạo mới trong CRM
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          productGroupCode: item.productGroupCode,
          productCategoryLevel4: item.productCategoryLevel4,
          unitId: item.unitId,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          discountedPrice: item.discountedPrice ?? item.price,
          originalPrice: item.price,
          vat: item.vat,
          vatAmount: item.vatAmount,
          subtotal: item.subtotal,
          totalAmount: item.totalAmount,
          stt: item.stt || 0,
          deliveryDate: item.deliveryDate,
          note: formattedNote,
          urgentOrder: item.urgentOrder,
          approvePrice: item.approvePrice,
          approveSupPrice: item.approveSupPrice,
          approveSupPriceId: item.approveSupPriceId,
          approver: item.approver,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          promotionText: item.promotionText,
          invoiceSurcharge: item.invoiceSurcharge,
        };
      });

      // Lấy user info từ localStorage
      const userInfo = getStoredUser();
      
      const result = await saveSaleOrderDetails({
        soId,
        warehouseName: warehouse,
        isVatOrder,
        customerIndustry: customerIndustry,
        customerLoginId,
        customerId: customerId || undefined,
        userInfo: userInfo ? {
          username: userInfo.username,
          name: userInfo.name,
          email: userInfo.email,
        } : undefined,
        products: productsToSave,
      });

      showToast.success(result.message || 'Tạo đơn bán chi tiết thành công!');

      // Lưu lại soId và customerCode để check promotion order
      const savedSoId = soId;
      const savedCustomerCode = customerCode;
      const savedProductCodes = productsToSave.map(p => p.productCode).filter(Boolean) as string[];
      const savedProductGroupCodes = productsToSave.map(p => p.productGroupCode).filter(Boolean) as string[];
      const savedTotalAmount = orderSummary.total;

      // Clear all form fields after successful save
      setProduct('');
      setProductCode('');
      setProductGroupCode('');
      setUnit('');
      setUnitId('');
      setWarehouse('');
      setQuantity(1);
      setPrice('');
      setSubtotal(0);
      setVatPercent(0);
      setVatAmount(0);
      setTotalAmount(0);
      setStockQuantity(0);
      setApprovePrice(false);
      setApproveSupPrice(false);
      setUrgentOrder(false);
      setDeliveryDate('');
      setNote('');
      setApprover('');
      setDiscountPercent(0);
      setDiscountAmount(0);
      setPromotionText('');
      setCustomer('');
      setCustomerId('');
      setCustomerCode('');
      setCustomerIndustry(null);
      setSo('');
      setSoId('');
      setProductList([]);

      // Check promotion order sau khi save thành công
      try {
        const promotionOrderResult = await fetchPromotionOrders(
          savedSoId,
          savedCustomerCode,
          savedTotalAmount,
          savedProductCodes,
          savedProductGroupCodes
        );
        
        // Nếu chưa có promotion order nào được áp dụng VÀ có promotion order khả dụng
        if (!promotionOrderResult.hasExistingPromotionOrder && promotionOrderResult.availablePromotions.length > 0) {
          // Lưu lại soId để dùng khi apply promotion
          setSoId(savedSoId);
          setPromotionOrderList(promotionOrderResult.availablePromotions);
          setShowPromotionOrderPopup(true);
        }
      } catch (error) {
        // Silent error - promotion order is optional
      }
    } catch (error: any) {
      console.error('Error saving sale order details:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi lưu đơn hàng. Vui lòng thử lại.';
      showToast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear các selected khi đổi SO (giữ lại customer, SO mới, deliveryDate)
  const clearFormOnSoChange = () => {
    setProduct('');
    setProductCode('');
    setProductGroupCode('');
    setUnit('');
    setWarehouse('');
    setQuantity(1);
    setPrice('');
    setSubtotal(0);
    setVatAmount(0);
    setTotalAmount(0);
    setStockQuantity(0);
    setApprovePrice(false);
    setApproveSupPrice(false);
    setUrgentOrder(false);
    setApprover('');
    setDiscountPercent(0);
    setDiscountAmount(0);
    setPromotionText('');
    setNote('');
    // Keep customer, SO (đang được set mới), deliveryDate as they are reused
  };

  const handleRefresh = async () => {
    // Cộng lại tồn kho cho tất cả sản phẩm trong danh sách (chỉ những sản phẩm chưa được save vào CRM)
    const productsToRestore = productList.filter(p => !p.isSodCreated);
    if (productsToRestore.length > 0) {
      const isVatOrder = !isNonVatSelected;
      for (const product of productsToRestore) {
        if (product.productCode && product.warehouse && product.quantity > 0) {
          try {
            await updateInventory({
              productCode: product.productCode,
              quantity: product.quantity,
              warehouseName: product.warehouse,
              operation: 'add',
              isVatOrder,
            });
          } catch (error: any) {
            // Silent error - continue với các sản phẩm khác
            // Continue với các sản phẩm khác
          }
        }
      }
    }

    // Reset all fields
    setCustomer('');
    setCustomerId('');
    setCustomerCode('');
    setSo('');
    setSoId('');
    setProduct('');
    setProductCode('');
    setProductGroupCode('');
    setUnit('');
    setWarehouse('');
    setQuantity(1);
    setPrice('');
    setSubtotal(0);
    setVatPercent(0);
    setVatAmount(0);
    setTotalAmount(0);
    setStockQuantity(0);
    setApprovePrice(false);
    setApproveSupPrice(false);
    setUrgentOrder(false);
    setDeliveryDate('14/12/2025');
    setNote('');
    setApprover('');
    setDiscountPercent(0);
    setDiscountAmount(0);
    setPromotionText('');
    setProductList([]);
  };

  // Xử lý khi xác nhận chọn Promotion Order
  const handleApplyPromotionOrder = async () => {
    if (!selectedPromotionOrder || !soId) {
      showToast.warning('Vui lòng chọn Promotion Order');
      return;
    }

    setIsApplyingPromotion(true);
    try {
      const result = await applyPromotionOrder({
        soId: soId,
        promotionId: selectedPromotionOrder.id,
        promotionName: selectedPromotionOrder.name,
        promotionValue: selectedPromotionOrder.value,
        vndOrPercent: selectedPromotionOrder.vndOrPercent,
        chietKhau2: selectedPromotionOrder.chietKhau2 === 191920001, // 191920001 = Yes
        productCodes: selectedPromotionOrder.productCodes,
        productGroupCodes: selectedPromotionOrder.productGroupCodes,
      });

      if (result.success) {
        showToast.success(result.message || 'Đã áp dụng Promotion Order thành công!');
        setShowPromotionOrderPopup(false);
        setSelectedPromotionOrder(null);
        setPromotionOrderList([]);
        setSoId(''); // Clear soId sau khi apply
      }
    } catch (error: any) {
      showToast.error(error.message || 'Không thể áp dụng Promotion Order');
    } finally {
      setIsApplyingPromotion(false);
    }
  };

  // Đóng popup promotion order
  const handleClosePromotionOrderPopup = () => {
    setShowPromotionOrderPopup(false);
    setSelectedPromotionOrder(null);
    setPromotionOrderList([]);
    setSoId(''); // Clear soId
  };

  return (
    <div className="admin-app-compact-layout">
      {/* Promotion Order Popup */}
      {showPromotionOrderPopup && (
        <div className="admin-app-popup-overlay">
          <div className="admin-app-popup">
            <div className="admin-app-popup-header">
              <h3 className="admin-app-popup-title">Promotion Order</h3>
            </div>
            <div className="admin-app-popup-content">
              <div className="admin-app-field-compact">
                <label className="admin-app-label-inline">Chọn Promotion Order</label>
                <select
                  className="admin-app-input admin-app-input-compact"
                  value={selectedPromotionOrder?.id || ''}
                  onChange={(e) => {
                    const promo = promotionOrderList.find(p => p.id === e.target.value);
                    setSelectedPromotionOrder(promo || null);
                  }}
                >
                  <option value="">-- Chọn Promotion --</option>
                  {promotionOrderList.map((promo) => (
                    <option key={promo.id} value={promo.id}>
                      {promo.name} ({promo.vndOrPercent === '%' ? `${promo.value}%` : `${promo.value?.toLocaleString('vi-VN')} VNĐ`})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="admin-app-popup-actions">
              <button
                type="button"
                className="admin-app-btn admin-app-btn-secondary"
                onClick={handleClosePromotionOrderPopup}
                disabled={isApplyingPromotion}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="admin-app-btn admin-app-btn-primary"
                onClick={handleApplyPromotionOrder}
                disabled={!selectedPromotionOrder || isApplyingPromotion}
              >
                {isApplyingPromotion ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header - 56px */}
      {!hideHeader && (
        <div className="admin-app-header-compact">
          <div className="admin-app-header-compact-left">
            <div className="admin-app-title-compact">Admin</div>
            <div className="admin-app-status-badge">
              {soId ? 'SO ✓' : 'Chưa SO'}
            </div>
          </div>
          <div className="admin-app-header-compact-right">
            <button
              className="admin-app-header-btn admin-app-header-btn-save"
              onClick={handleSave}
              disabled={isSaveDisabled}
              title="Lưu"
            >
              {isSaving ? (
                <>
                  <div className="admin-app-spinner admin-app-spinner-small" style={{ marginRight: '6px' }}></div>
                  Đang lưu...
                </>
              ) : (
                '💾 Lưu'
              )}
            </button>
            <button
              className="admin-app-header-btn admin-app-header-btn-submit"
              disabled
              title="Gửi duyệt"
            >
              ✔ Gửi duyệt
            </button>
            <button
              className="admin-app-header-btn admin-app-header-btn-create"
              disabled
              title="Tạo đơn"
            >
              🧾 Tạo đơn
            </button>
            <span className="admin-app-badge admin-app-badge-version">
              V0
            </span>
          </div>
        </div>
      )}

      {/* Main Content - 2 Columns Layout */}
      <div className="admin-app-content-compact">
        {isOrderInfoCollapsed && (
          <button
            type="button"
            className="admin-app-orderinfo-reveal"
            onClick={() => setIsOrderInfoCollapsed(false)}
            title="Mở Thông tin đơn hàng"
            aria-label="Mở Thông tin đơn hàng"
          >
            ◀
          </button>
        )}
        {/* Left Column - Order Info (Slide Out) */}
        <div className={`admin-app-column-left ${isOrderInfoCollapsed ? 'admin-app-column-collapsed' : ''}`}>
          <div className="admin-app-card-compact">
            <div className="admin-app-card-header-collapsible" onClick={() => setIsOrderInfoCollapsed(!isOrderInfoCollapsed)}>
              <h3 className="admin-app-card-title">Thông tin đơn hàng</h3>
              <button className="admin-app-collapse-btn" title={isOrderInfoCollapsed ? 'Mở rộng' : 'Ẩn sang trái'}>
                {isOrderInfoCollapsed ? '◀' : '▶'}
              </button>
            </div>
            <div className="admin-app-form-compact">
              <div className="admin-app-field-compact">
                <label className="admin-app-label-inline">Khách hàng <span className="admin-app-required">*</span></label>
                <Dropdown
                  options={customers.map((c) => {
                    const regionText = c.cr1bb_vungmien_text ? ` - ${c.cr1bb_vungmien_text}` : '';
                    const code = c.cr44a_makhachhang || c.cr44a_st || '';
                    return {
                      value: c.crdfd_customerid,
                      label: `${c.crdfd_name}${regionText}`,
                      dropdownTooltip: code ? `Mã KH: ${code}` : undefined,
                      dropdownMetaText: code || undefined,
                      dropdownCopyText: code || undefined,
                      ...c,
                    };
                  })}
                  value={customerId}
                  onChange={(value, option) => {
                    setCustomerId(value);
                    setCustomer(option?.label || '');
                    setCustomerCode(option?.cr44a_makhachhang || option?.cr44a_st || '');
                    setCustomerIndustry(option?.crdfd_nganhnghe ?? null);
                    // Clear SO và các selected khi đổi customer
                    setSo('');
                    setSoId('');
                    setProduct('');
                    setProductCode('');
                    setProductGroupCode('');
                    setUnit('');
                    setWarehouse('');
                    setQuantity(1);
                    setPrice('');
                    setSubtotal(0);
                    setVatAmount(0);
                    setTotalAmount(0);
                    setStockQuantity(0);
                    setApprovePrice(false);
                    setApproveSupPrice(false);
                    setUrgentOrder(false);
                    setApprover('');
                    setDiscountPercent(0);
                    setDiscountAmount(0);
                    setPromotionText('');
                    setNote('');
                  }}
                  placeholder="Chọn khách hàng"
                  loading={customersLoading}
                  searchable
                  onSearch={setCustomerSearch}
                />
              </div>

              <div className="admin-app-field-compact">
                <label className="admin-app-label-inline">
                  Sales Order
                  {selectedVatText && (
                    <span
                      className={`admin-app-badge-vat ${isNonVatSelected ? 'is-non-vat' : 'is-vat'}`}
                      title={selectedVatText}
                    >
                      {selectedVatText}
                    </span>
                  )}
                </label>
                <Dropdown
                  options={saleOrders.map((so) => {
                    // Hiển thị đầy đủ thông tin: tên SO hoặc mã SO
                    // Ưu tiên crdfd_so_code, nếu không có thì dùng crdfd_so_auto
                    const soCode = so.crdfd_so_code || so.crdfd_so_auto || '';
                    const soName = (so.crdfd_name || '').trim();
                    
                    // Kiểm tra xem soName đã chứa soCode chưa để tránh lặp
                    let baseLabel: string;
                    if (soName && soCode) {
                      const soNameLower = soName.toLowerCase();
                      const soCodeLower = soCode.toLowerCase();
                      // Nếu name đã chứa code (hoặc code là substring của name) thì chỉ dùng name
                      if (soNameLower.includes(soCodeLower)) {
                        baseLabel = soName;
                      } else {
                        // Nếu name không chứa code, ghép lại: code - name
                        baseLabel = `${soCode} - ${soName}`;
                      }
                    } else if (soCode) {
                      baseLabel = soCode;
                    } else if (soName) {
                      baseLabel = soName;
                    } else {
                      baseLabel = 'SO không tên';
                    }
                    
                    const vatLabelText = getVatLabelText(so) || 'Không VAT';
                    return {
                      value: so.crdfd_sale_orderid,
                      label: baseLabel,
                      vatLabelText,
                      dropdownTooltip: baseLabel, // Tooltip để hiển thị đầy đủ khi hover
                      ...so,
                    };
                  })}
                  value={soId}
                  onChange={(value, option) => {
                    setSoId(value);
                    setSo(option?.label || '');
                    // Clear các selected khi đổi SO
                    clearFormOnSoChange();
                  }}
                  placeholder={customerId ? "Chọn SO" : "Chọn khách hàng trước"}
                  loading={soLoading}
                  disabled={!customerId}
                />
                {soError && (
                  <div className="admin-app-error-inline">{soError}</div>
                )}
              </div>

              <div className="admin-app-form-row-mini">
                <div className="admin-app-field-compact admin-app-field-mini">
                  <label className="admin-app-label-inline">Ngày giao</label>
                  <div className="admin-app-input-wrapper">
                    <input
                      type="text"
                      className="admin-app-input admin-app-input-compact"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      placeholder="dd/mm/yyyy"
                      disabled={!customerId || !soId}
                    />
                    <span className="admin-app-calendar-icon">📅</span>
                  </div>
                </div>
                <div className="admin-app-field-compact admin-app-field-mini admin-app-field-span-2">
                  <label className="admin-app-label-inline">Ghi chú</label>
                  <input
                    type="text"
                    className="admin-app-input admin-app-input-compact"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú"
                    disabled={!customerId || !soId}
                  />
                </div>
              </div>

              <div className="admin-app-checkboxes-inline admin-app-checkboxes-inline-right">
                <label className={`admin-app-chip-toggle ${urgentOrder ? 'is-active' : ''} ${(!customerId || !soId) ? 'is-disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={urgentOrder}
                    onChange={(e) => setUrgentOrder(e.target.checked)}
                    disabled={!customerId || !soId}
                  />
                  <span>Đơn hàng gấp</span>
                </label>
                <label className={`admin-app-chip-toggle ${approvePrice ? 'is-active' : ''} ${(!customerId || !soId) ? 'is-disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={approvePrice}
                    onChange={(e) => {
                      setApprovePrice(e.target.checked);
                      // Reset approver when "Duyệt giá" is unchecked
                      if (!e.target.checked) {
                        setApprover('');
                      }
                    }}
                    disabled={!customerId || !soId}
                  />
                  <span>Duyệt giá</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Product Info (70%) */}
        <div className="admin-app-column-right">
          <ProductEntryForm
            isAdding={isAdding}
            isSaving={isSaving}
            isLoadingDetails={isLoadingDetails}
            showInlineActions={hideHeader}
            hasUnsavedProducts={hasUnsavedProducts}
            product={product}
            setProduct={setProduct}
            productCode={productCode}
            setProductCode={setProductCode}
            unit={unit}
            setUnit={setUnit}
            warehouse={warehouse}
            setWarehouse={setWarehouse}
            customerId={customerId}
            customerCode={customerCode}
            customerName={customer}
            vatText={selectedVatText}
            orderType={selectedSo?.crdfd_loai_don_hang}
            soId={soId}
            quantity={quantity}
            setQuantity={setQuantity}
            price={price}
            setPrice={setPrice}
            subtotal={subtotal}
            setSubtotal={setSubtotal}
            vatPercent={vatPercent}
            setVatPercent={setVatPercent}
            vatAmount={vatAmount}
            setVatAmount={setVatAmount}
            totalAmount={totalAmount}
            setTotalAmount={setTotalAmount}
            stockQuantity={stockQuantity}
            setStockQuantity={setStockQuantity}
            approvePrice={approvePrice}
            setApprovePrice={setApprovePrice}
            approveSupPrice={approveSupPrice}
            setApproveSupPrice={setApproveSupPrice}
            urgentOrder={urgentOrder}
            setUrgentOrder={setUrgentOrder}
            deliveryDate={deliveryDate}
            setDeliveryDate={setDeliveryDate}
            note={note}
            setNote={setNote}
            approver={approver}
            setApprover={setApprover}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            discountAmount={discountAmount}
            setDiscountAmount={setDiscountAmount}
            promotionText={promotionText}
            setPromotionText={setPromotionText}
            onAdd={handleAddProduct}
            onSave={handleSave}
            onRefresh={handleRefresh}
            onInventoryReserved={() => {}} // Callback để trigger reload inventory
            onProductGroupCodeChange={setProductGroupCode} // Callback để cập nhật productGroupCode
          />
        </div>
      </div>

      {/* Product Table - Fixed Height, No Scroll */}
      <div className="admin-app-table-wrapper">
        <ProductTable 
          products={productList} 
          setProducts={setProductList}
          onDelete={async (product) => {
            // Giải phóng hàng khi xóa sản phẩm (chỉ cho sản phẩm chưa được save vào CRM)
            if (!product.isSodCreated && product.productCode && product.warehouse && product.quantity > 0) {
              try {
                const isVatOrder = !isNonVatSelected;
                
                // Tính base quantity từ quantity và unit
                let baseQuantity = product.quantity;
                if (product.unit && product.productCode) {
                  try {
                    const units = await fetchUnits(product.productCode);
                    const selectedUnit = units.find((u) => u.crdfd_name === product.unit);
                    if (selectedUnit) {
                      const conversionFactor = (selectedUnit as any)?.crdfd_giatrichuyenoi ?? 
                                              (selectedUnit as any)?.crdfd_giatrichuyendoi ?? 
                                              (selectedUnit as any)?.crdfd_conversionvalue ?? 
                                              1;
                      const factorNum = Number(conversionFactor);
                      if (!isNaN(factorNum) && factorNum > 0) {
                        baseQuantity = product.quantity * factorNum;
                      }
                    }
                  } catch (unitError) {
                    console.warn('Không thể lấy conversion factor, sử dụng quantity trực tiếp:', unitError);
                  }
                }
                
                await updateInventory({
                  productCode: product.productCode,
                  quantity: baseQuantity, // Sử dụng base quantity
                  warehouseName: product.warehouse,
                  operation: 'release', // Giải phóng hàng
                  isVatOrder,
                });
              } catch (error: any) {
                showToast.error(error.message || 'Không thể giải phóng tồn kho. Vui lòng thử lại.');
              }
            }
          }}
        />
      </div>
      
      {/* Loading overlay khi đang save/load details */}
      {(isSaving || isLoadingDetails) && (
        <div className="admin-app-form-loading-overlay">
          <div className="admin-app-spinner admin-app-spinner-medium"></div>
          <div className="admin-app-form-loading-text">
            {isSaving ? 'Đang lưu đơn hàng...' : 'Đang tải chi tiết đơn hàng...'}
          </div>
        </div>
      )}
    </div>
  );
}

