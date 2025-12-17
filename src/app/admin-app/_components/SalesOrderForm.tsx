'use client';

import { useState, useEffect } from 'react';
import ProductEntryForm from './ProductEntryForm';
import ProductTable from './ProductTable';
import Dropdown from './Dropdown';
import { useCustomers, useSaleOrders } from '../_hooks/useDropdownData';
import { fetchSaleOrderDetails, SaleOrderDetail } from '../_api/adminApi';

interface ProductItem {
  id: string;
  stt?: number;
  productName: string;
  unit: string;
  quantity: number;
  price: number;
  surcharge: number;
  discount: number;
  discountedPrice: number;
  vat: number;
  totalAmount: number;
  approver: string;
  deliveryDate: string;
}

export default function SalesOrderForm() {
  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [so, setSo] = useState('');
  const [soId, setSoId] = useState('');

  // Fetch data for dropdowns
  const { customers, loading: customersLoading } = useCustomers(customerSearch);
  // Load SO - if customerId is selected, filter by customer, otherwise load all
  const { saleOrders, loading: soLoading, error: soError } = useSaleOrders(customerId || undefined);
  const [product, setProduct] = useState('');
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

      try {
        const details = await fetchSaleOrderDetails(soId);
        // Map SaleOrderDetail to ProductItem
        const mappedProducts: ProductItem[] = details.map((detail: SaleOrderDetail) => ({
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
          totalAmount: detail.totalAmount,
          approver: detail.approver,
          deliveryDate: detail.deliveryDate || '',
        }));
        // Sort by STT descending (already sorted by API, but ensure it)
        mappedProducts.sort((a, b) => (b.stt || 0) - (a.stt || 0));
        setProductList(mappedProducts);
      } catch (error) {
        console.error('Error loading sale order details:', error);
        setProductList([]);
      }
    };

    loadSaleOrderDetails();
  }, [soId]);

  const handleAddProduct = () => {
    if (!product || quantity <= 0) return;

    const priceNum = parseFloat(price) || 0;
    const subtotalCalc = quantity * priceNum;
    const vatCalc = (subtotalCalc * vatPercent) / 100;
    const totalCalc = subtotalCalc + vatCalc;

    const newProduct: ProductItem = {
      id: Date.now().toString(),
      productName: product,
      unit: unit || 'Cái',
      quantity,
      price: priceNum,
      surcharge: 0,
      discount: 0,
      discountedPrice: priceNum,
      vat: vatPercent,
      totalAmount: totalCalc,
      approver: '',
      deliveryDate: deliveryDate,
    };

    setProductList([...productList, newProduct]);
    
    // Reset form
    setProduct('');
    setUnit('');
    setQuantity(0);
    setPrice('');
    setSubtotal(0);
    setVatPercent(0);
    setVatAmount(0);
    setTotalAmount(0);
  };

  const handleSave = () => {
    // Handle save logic
    console.log('Saving order...', {
      customer,
      so,
      productList,
      deliveryDate,
      note,
    });
  };

  const handleRefresh = () => {
    // Reset all fields
    setCustomer('');
    setCustomerId('');
    setCustomerCode('');
    setSo('');
    setSoId('');
    setProduct('');
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
    setProductList([]);
  };

  return (
    <div className="admin-app-wrapper">
      {/* Header with Version */}
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
          onAdd={handleAddProduct}
          onSave={handleSave}
          onRefresh={handleRefresh}
        />

        {/* Product Table */}
        <ProductTable products={productList} setProducts={setProductList} />
      </div>
    </div>
  );
}

