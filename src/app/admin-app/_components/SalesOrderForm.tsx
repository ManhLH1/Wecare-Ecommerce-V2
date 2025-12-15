'use client';

import { useState } from 'react';
import ProductEntryForm from './ProductEntryForm';
import ProductTable from './ProductTable';
import Dropdown from './Dropdown';
import { useCustomers, useSaleOrders } from '../_hooks/useDropdownData';

interface ProductItem {
  id: string;
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
  const [activeTab, setActiveTab] = useState<'copilot' | 'data'>('copilot');
  const [customer, setCustomer] = useState('');
  const [customerId, setCustomerId] = useState('');
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
  const [deliveryDate, setDeliveryDate] = useState('14/12/2025');
  const [note, setNote] = useState('');
  const [productList, setProductList] = useState<ProductItem[]>([]);

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
      {/* Header with Tabs and Version */}
      <div className="admin-app-header">
        <div className="admin-app-tabs">
          <button
            className={`admin-app-tab ${activeTab === 'copilot' ? 'active' : ''}`}
            onClick={() => setActiveTab('copilot')}
          >
            Copilot
          </button>
          <button
            className={`admin-app-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            Data
          </button>
        </div>
        <div className="admin-app-version">V2.93.86</div>
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
              <label className="admin-app-label">Sales Order (SO)</label>
              <Dropdown
                options={saleOrders.map((so) => ({
                  value: so.crdfd_sale_orderid,
                  label: so.crdfd_name || so.crdfd_so_code || so.crdfd_so_auto || 'SO không tên',
                  ...so,
                }))}
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

