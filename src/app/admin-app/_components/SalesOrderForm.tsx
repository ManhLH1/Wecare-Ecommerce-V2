'use client';

import { useState, useEffect } from 'react';
import ProductEntryForm from './ProductEntryForm';
import ProductTable from './ProductTable';
import Dropdown from './Dropdown';
import { useCustomers, useSaleOrders } from '../_hooks/useDropdownData';
import { fetchSaleOrderDetails, SaleOrderDetail, saveSaleOrderDetails } from '../_api/adminApi';
import { showToast } from '../../../components/ToastManager';

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

  // Fetch data for dropdowns
  const { customers, loading: customersLoading } = useCustomers(customerSearch);
  // Load SO - if customerId is selected, filter by customer, otherwise load all
  const { saleOrders, loading: soLoading, error: soError } = useSaleOrders(customerId || undefined);
  const [product, setProduct] = useState('');
  const [productCode, setProductCode] = useState('');
  const [unit, setUnit] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [quantity, setQuantity] = useState(0);
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
  const soLabelText = selectedVatText ? `Sales Order (SO) - ${selectedVatText}` : 'Sales Order (SO)';

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
    // Validation: product, unit, quantity, price (or approve price checked)
    if (!product || !unit || quantity <= 0 || (!price && !approvePrice)) {
      console.warn('❌ Add Product Failed: Missing required fields', {
        product: !!product,
        unit: !!unit,
        quantity,
        price: !!price,
        approvePrice,
      });
      return;
    }

    setIsAdding(true);
    // Add small delay for animation feedback
    await new Promise(resolve => setTimeout(resolve, 100));

    const priceNum = parseFloat(price) || 0;
    
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
    
    // Calculate amounts
    const subtotalCalc = quantity * finalPrice;
    const vatCalc = (subtotalCalc * vatPercent) / 100;
    const totalCalc = subtotalCalc + vatCalc;

    // Auto-increment STT
    const maxStt = productList.length > 0 ? Math.max(...productList.map((p) => p.stt || 0)) : 0;
    const newStt = maxStt + 1;

    const newProduct: ProductItem = {
      id: `${Date.now()}-${newStt}`,
      stt: newStt,
      productCode: productCode,
      productName: product,
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
      note: note,
      urgentOrder: urgentOrder,
      approvePrice: approvePrice,
      approveSupPrice: approveSupPrice,
      promotionText: promotionText,
      invoiceSurcharge: invoiceSurchargeRate,
      createdOn: new Date().toISOString(),
    };

    console.log('✅ Add Product Success:', newProduct);
    setProductList([...productList, newProduct]);
    
    // Reset form fields (mimic PowerApps Reset())
    setProduct('');
    setProductCode('');
    setUnit('');
    setQuantity(0);
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
    // Chỉ kiểm tra danh sách sản phẩm - không check các field input phía trên
    if (productList.length === 0) {
      showToast.error('Không có data để tạo đơn bán chi tiết!');
      return;
    }

    if (!soId) {
      showToast.error('Vui lòng chọn Sales Order trước khi lưu.');
      return;
    }

    setIsSaving(true);
    try {
      // Load danh sách SOD hiện có từ CRM
      const existingSOD = await fetchSaleOrderDetails(soId);
      const existingProductIds = new Set(
        existingSOD
          .map((sod) => sod.id)
          .filter((id): id is string => !!id && id.startsWith('crdfd_'))
      );

      // Lấy các sản phẩm CHƯA CÓ trong SOD từ CRM
      // Sản phẩm mới là những sản phẩm không có ID từ CRM hoặc ID không nằm trong danh sách SOD hiện có
      const newProducts = productList.filter((item) => {
        // Nếu không có ID hoặc ID không phải từ CRM → sản phẩm mới
        if (!item.id || !item.id.startsWith('crdfd_')) {
          return true;
        }
        // Nếu có ID từ CRM nhưng không có trong SOD hiện có → cũng là sản phẩm mới (có thể bị xóa)
        return !existingProductIds.has(item.id);
      });

      if (newProducts.length === 0) {
        showToast.warning('Không có sản phẩm mới để lưu. Tất cả sản phẩm đã có trong SOD.');
        return;
      }

      const selectedSo = saleOrders.find((so) => so.crdfd_sale_orderid === soId);
      const isVatOrder = selectedVatText?.toLowerCase().includes('có vat') || false;

      // Map chỉ các sản phẩm mới (chưa có trong SOD) to API format
      // Không gửi ID vì đây là sản phẩm mới, chưa có trong CRM
      const productsToSave = newProducts.map((item) => ({
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
        note: item.note,
        urgentOrder: item.urgentOrder,
        approvePrice: item.approvePrice,
        approveSupPrice: item.approveSupPrice,
        approveSupPriceId: item.approveSupPriceId,
        approver: item.approver,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
        promotionText: item.promotionText,
        invoiceSurcharge: item.invoiceSurcharge,
      }));

      const result = await saveSaleOrderDetails({
        soId,
        warehouseName: warehouse,
        isVatOrder,
        customerIndustry: customerIndustry,
        products: productsToSave,
      });

      showToast.success(result.message || 'Tạo đơn bán chi tiết thành công!');
      
      // Reload sale order details
      if (soId) {
        setIsLoadingDetails(true);
        try {
          const details = await fetchSaleOrderDetails(soId);
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
            };
          });
          mappedProducts.sort((a, b) => (b.stt || 0) - (a.stt || 0));
          setProductList(mappedProducts);
        } finally {
          setIsLoadingDetails(false);
        }
      }
      
      // Reset form after successful save
      handleRefresh();
    } catch (error: any) {
      console.error('Error saving sale order details:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi lưu đơn hàng. Vui lòng thử lại.';
      showToast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = () => {
    // Reset all fields
    setCustomer('');
    setCustomerId('');
    setCustomerCode('');
    setSo('');
    setSoId('');
    setProduct('');
    setProductCode('');
    setUnit('');
    setWarehouse('');
    setQuantity(0);
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

  return (
    <>
      {/* Header with Version - Only show if not hidden */}
      {!hideHeader && (
        <div className="admin-app-header">
          <div className="admin-app-header-left">
            <div className="admin-app-title">Admin App</div>
            <div className="admin-app-subtitle">Quản lý đơn hàng bán hàng</div>
          </div>
          <div className="admin-app-header-right">
            <span className="admin-app-badge admin-app-badge-version">
              V0
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="admin-app-content">
        {/* Customer and SO Section */}
        <div className="admin-app-section">
          <h3 className="admin-app-section-title">Thông tin đơn hàng</h3>
          <div className="admin-app-form-row">
            <div className="admin-app-field-group admin-app-field-group-large">
              <label className="admin-app-label">Khách hàng <span className="admin-app-required">*</span></label>
              <Dropdown
                options={customers.map((c) => ({
                  value: c.crdfd_customerid,
                  label: c.crdfd_name,
                  ...c,
                }))}
                value={customerId}
                onChange={(value, option) => {
                  setCustomerId(value);
                  setCustomer(option?.label || '');
                  // Use cr44a_makhachhang (mã khách hàng) instead of cr44a_st
                  setCustomerCode(option?.cr44a_makhachhang || option?.cr44a_st || '');
                  // Save industry for delivery date logic
                  setCustomerIndustry(option?.crdfd_nganhnghe ?? null);
                  // Reset warehouse when customer changes
                  setWarehouse('');
                }}
                placeholder="Chọn khách hàng"
                loading={customersLoading}
                searchable
                onSearch={setCustomerSearch}
              />
            </div>

            <div className="admin-app-field-group admin-app-field-group-large">
              <label className="admin-app-label">{soLabelText}</label>
              <Dropdown
                options={saleOrders.map((so) => {
                  const baseLabel = so.crdfd_name || so.crdfd_so_code || so.crdfd_so_auto || 'SO không tên';
                  const vatLabelText = getVatLabelText(so) || 'Không VAT';
                  const label = `${baseLabel} - ${vatLabelText}`;
                  return {
                    value: so.crdfd_sale_orderid,
                    label,
                    vatLabelText,
                    ...so,
                  };
                })}
                value={soId}
                onChange={(value, option) => {
                  setSoId(value);
                  setSo(option?.label || '');
                }}
                placeholder={customerId ? "Chọn SO" : "Chọn khách hàng trước"}
                loading={soLoading}
                disabled={!customerId}
              />
              {soError && (
                <div className="admin-app-error" style={{ fontSize: '11px', color: '#ff4444', marginTop: '4px' }}>
                  {soError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Entry Section */}
        <ProductEntryForm
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
        />

        {/* Product Table */}
        <ProductTable products={productList} setProducts={setProductList} />
      </div>
    </>
  );
}

