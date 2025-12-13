"use client";
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  FaClipboardList,
  FaPlus,
  FaRedo,
  FaWarehouse,
  FaPlusSquare,
  FaSyncAlt,
  FaClipboardCheck,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import axios from "axios";
import { getItem, setItem } from "@/utils/SecureStorage";
import { X } from "lucide-react";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";

type AdminRow = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  surcharge: number; // ví dụ 0.03 = 3%
  discount: number; // ví dụ 0.03 = 3%
  vat: number; // %
  expectedDate: string;
  approver?: string;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("vi-VN", { minimumFractionDigits: 0 });

// Helper function to get actual price from product
const getActualPrice = (product: any): number => {
  if (product.cr1bb_json_gia && Array.isArray(product.cr1bb_json_gia) && product.cr1bb_json_gia.length > 0) {
    const activePrice = product.cr1bb_json_gia.find(
      (item: any) => item.crdfd_trangthaihieulucname === "Còn hiệu lực" || item.crdfd_trangthaihieuluc === 191920000
    );
    if (activePrice && activePrice.crdfd_gia) return parseFloat(activePrice.crdfd_gia);
    if (product.cr1bb_json_gia[0] && product.cr1bb_json_gia[0].crdfd_gia) {
      return parseFloat(product.cr1bb_json_gia[0].crdfd_gia);
    }
    return 0;
  }
  if (product.crdfd_gia && product.crdfd_gia > 0) return product.crdfd_gia;
  if (product.crdfd_giatheovc && product.crdfd_giatheovc > 0) return product.crdfd_giatheovc;
  return 0;
};

// Helper function to get VAT from product
const getVAT = (product: any): number => {
  if (product.crdfd_gtgt_value !== undefined && product.crdfd_gtgt_value !== null) {
    return product.crdfd_gtgt_value;
  }
  if (product.crdfd_gtgt !== undefined && product.crdfd_gtgt !== null) {
    return product.crdfd_gtgt;
  }
  return 8; // Default VAT
};

// Custom Infinite Scroll Select Component - copied from sale-order
const InfiniteScrollSelect = ({ 
  loadOptions, 
  value, 
  onChange, 
  placeholder 
}: {
  loadOptions: (inputValue: string, pageSize: number) => Promise<any[]>;
  value: any;
  onChange: (option: any) => void;
  placeholder: string;
}) => {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [inputValue, setInputValue] = useState(value?.label || '');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async (searchValue: string = '', currentPageSize: number = 10) => {
    try {
      setLoading(true);
      const newOptions = await loadOptions(searchValue, currentPageSize);
      // Vì API luôn trả về danh sách từ đầu đến pageSize hiện tại,
      // ta thay thế toàn bộ danh sách options để tránh trùng lặp key
      const uniqueOptionsMap = new Map<string, any>();
      for (const opt of newOptions) {
        uniqueOptionsMap.set(opt.value, opt);
      }
      setOptions(Array.from(uniqueOptionsMap.values()));
      
      setHasMore(newOptions.length === currentPageSize); // Có thêm data nếu trả về đủ pageSize
      setPageSize(currentPageSize);
    } catch (error) {
      console.error('Error loading options:', error);
    } finally {
      setLoading(false);
    }
  }, [loadOptions]);

  // Load data ban đầu khi component mount
  useEffect(() => {
    loadMore('', 10);
  }, [loadMore]);

  // Sync inputValue với value prop
  useEffect(() => {
    setInputValue(value?.label || '');
  }, [value]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !loading && hasMore) {
      loadMore(inputValue, pageSize + 10);
    }
  }, [loading, hasMore, inputValue, pageSize, loadMore]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setPageSize(10);
    setHasMore(true);
    // Load data khi user gõ
    if (value.trim() === '') {
      loadMore('', 10);
    } else {
      loadMore(value, 10);
    }
    // Mở dropdown khi user gõ
    setIsOpen(true);
  }, [loadMore]);

  const handleSelect = useCallback((option: any) => {
    onChange(option);
    setIsOpen(false);
    setInputValue(option.label);
  }, [onChange]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      
      {inputValue && (
        <button
          className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => {
            setInputValue('');
            onChange(null);
            // Reload danh sách ban đầu khi clear
            loadMore('', 10);
            setIsOpen(true); // Mở dropdown để hiển thị danh sách ban đầu
          }}
        >
          <X size={16} />
        </button>
      )}
      
      {isOpen && options.length > 0 && (
        <div 
          ref={containerRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          onScroll={handleScroll}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </div>
          ))}
          
          {loading && (
            <div className="px-3 py-2 text-gray-500 text-center">
              Loading...
            </div>
          )}
          
          {!hasMore && options.length > 0 && (
            <div className="px-3 py-2 text-gray-500 text-center">
              No more results
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminAppPage: React.FC = () => {
  // State for API data
  const [availableProducts, setAvailableProducts] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  
  // State for order management
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [orderCode, setOrderCode] = useState("");
  const [orderType, setOrderType] = useState<"SO" | "BO">("SO");
  const [orderVat, setOrderVat] = useState<"Có VAT" | "Không VAT">("Có VAT");
  const [note, setNote] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState<"Ca sáng" | "Ca chiều">("Ca sáng");
  const [approvePrice, setApprovePrice] = useState(false);
  const [approveSupPrice, setApproveSupPrice] = useState(false);
  const [urgentOrder, setUrgentOrder] = useState(false);
  const [cartItemsCount] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [inputQuantity, setInputQuantity] = useState<number>(0);
  const [inputPrice, setInputPrice] = useState<number>(0);
  const [inputVat, setInputVat] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [nextId, setNextId] = useState<number>(100);

  // Hàm load options async với pageSize - copied from sale-order
  const loadCustomerOptions = useCallback(async (inputValue: string, pageSize: number = 10) => {
    try {
      const saleName = getItem("saleName");
      const customerId = getItem("id");
      const searchParam = inputValue ? `&search=${encodeURIComponent(inputValue)}` : '';
      
      // Sử dụng saleName và customerId để tìm khách hàng
      const res = await axios.get(`/api/getCustomerDataLazyLoad?customerId=${customerId}&saleName=${saleName}${searchParam}&page=1&pageSize=${pageSize}`);
      
      if (res.data?.data) {
        // Kiểm tra xem data có phải là array không
        const dataArray = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
        const options = dataArray.map((customer: any) => ({
          value: customer.crdfd_customerid,
          label: `${customer.crdfd_name}${
            customer.cr1bb_ngunggiaodich !== null
              ? ` (Công nợ: ${customer.debtInfo?.cr1bb_tongcongno?.toLocaleString(
                  "vi-VN"
                )} VNĐ)`
              : ""
          }`,
          isBlocked: customer.cr1bb_ngunggiaodich !== null,
        }));
        return options;
      }
      return [];
    } catch (error) {
      console.error('Error loading customer options:', error);
      return [];
    }
  }, []);

  // Test load để kiểm tra API - copied from sale-order
  useEffect(() => {
    const testLoad = async () => {
      const saleName = getItem("saleName");
      const customerId = getItem("id");
      try {
        const res = await axios.get(`/api/getCustomerDataLazyLoad?customerId=${customerId}&saleName=${saleName}&page=1&pageSize=10`);
        if (res.data?.error) {
          setCustomerError("Không tìm thấy khách hàng");
        } else {
          setCustomerError(null);
        }
      } catch (error) {
        setCustomerError("Không tìm thấy khách hàng");
      }
    };
    testLoad();
  }, []);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch products - you can add filters as needed
        const response = await axios.get('/api/getProductsOnly', {
          params: {
            page: 1,
            pageSize: 100, // Adjust as needed
            all: false
          }
        });

        if (response.data && response.data.data) {
          // Transform API response to AdminRow format
          const products: AdminRow[] = [];
          const groupedData = response.data.data;
          
          // Iterate through grouped products
          Object.keys(groupedData).forEach((category) => {
            const categoryProducts = groupedData[category].products || [];
            categoryProducts.forEach((product: any, index: number) => {
              const price = getActualPrice(product);
              const vat = getVAT(product);
              
              products.push({
                id: parseInt(product.crdfd_productsid?.replace(/-/g, '').substring(0, 10) || `${Date.now()}${index}`, 16) % 1000000,
                name: product.crdfd_fullname || product.crdfd_name || '',
                unit: product.crdfd_unitname || product.crdfd_onvichuantext || '',
                quantity: 1,
                price: price,
                surcharge: 0.03, // Default surcharge, can be fetched from API if available
                discount: 0.03, // Default discount, can be fetched from API if available
                vat: vat,
                expectedDate: new Date().toISOString().split("T")[0],
              });
            });
          });
          
          setAvailableProducts(products);
          
          // Set default selected product
          if (products.length > 0 && selectedProductId === null) {
            setSelectedProductId(products[0].id);
            setInputQuantity(products[0].quantity);
            setInputPrice(products[0].price);
            setInputVat(products[0].vat);
          }
        }
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback((term: string) => {
    // Placeholder: admin page không cần search, nhưng giữ hook để khớp header
    console.debug("admin-app search", term);
  }, []);

  const handleCartClick = useCallback(() => {
    // Placeholder: mở cart global nếu cần
    console.debug("admin-app cart click");
  }, []);

  // Handle customer change - copied from sale-order
  const handleCustomerChange = useCallback((
    selectedOption: {
      value: string;
      label: string;
    } | null
  ) => {
    setSelectedCustomer(selectedOption);
    
    // Extract customerId when a customer is selected
    if (selectedOption) {
      const customerId = selectedOption.value;
      setItem("selectedCustomerId", customerId);
    }
  }, []);

  // Update input fields when product selection changes
  useEffect(() => {
    const product = availableProducts.find((p) => p.id === selectedProductId);
    if (product) {
      setInputQuantity(product.quantity || 1);
      setInputPrice(product.price);
      setInputVat(product.vat);
    }
  }, [selectedProductId, availableProducts]);

  const totals = useMemo(() => {
    const detail = rows.map((row) => {
      const priceAfterDiscount = Math.round(
        row.price * (1 - row.discount + row.surcharge)
      );
      const lineTotal = priceAfterDiscount * row.quantity;
      const vatAmount = Math.round((lineTotal * row.vat) / 100);
      return { ...row, priceAfterDiscount, lineTotal, vatAmount };
    });

    const grandTotal = detail.reduce(
      (acc, row) => acc + row.lineTotal + row.vatAmount,
      0
    );
    return { detail, grandTotal };
  }, [rows]);

  const selectedProduct = useMemo(
    () =>
      availableProducts.find((r) => r.id === selectedProductId) ??
      (availableProducts.length > 0 ? availableProducts[0] : null),
    [selectedProductId, availableProducts]
  );

  const selectedPriceAfterDiscount = useMemo(() => {
    if (!selectedProduct) return 0;
    return Math.round(
      inputPrice * (1 - (selectedProduct.discount || 0) + (selectedProduct.surcharge || 0))
    );
  }, [inputPrice, selectedProduct]);

  const selectedLineTotal = useMemo(() => {
    const baseTotal = selectedPriceAfterDiscount * inputQuantity;
    const vatAmount = Math.round((baseTotal * inputVat) / 100);
    return { baseTotal, vatAmount, grand: baseTotal + vatAmount };
  }, [selectedPriceAfterDiscount, inputQuantity, inputVat]);

  // Handle add product to order
  const handleAddProduct = useCallback(() => {
    if (!selectedProduct) {
      alert("Vui lòng chọn sản phẩm");
      return;
    }
    
    if (inputQuantity <= 0) {
      alert("Vui lòng nhập số lượng lớn hơn 0");
      return;
    }

    const newRow: AdminRow = {
      id: nextId,
      name: selectedProduct.name,
      unit: selectedProduct.unit,
      quantity: inputQuantity,
      price: inputPrice,
      surcharge: selectedProduct.surcharge || 0,
      discount: selectedProduct.discount || 0,
      vat: inputVat,
      expectedDate: new Date().toISOString().split("T")[0],
    };

    setRows((prev) => [...prev, newRow]);
    setNextId((prev) => prev + 1);

    // Reset form
    setInputQuantity(selectedProduct.quantity || 1);
    setInputPrice(selectedProduct.price);
    setInputVat(selectedProduct.vat);
  }, [
    inputQuantity,
    inputPrice,
    inputVat,
    selectedProduct,
    nextId,
  ]);

  // Handle delete product from order
  const handleDeleteProduct = useCallback(
    (id: number) => {
      setRows((prev) => prev.filter((row) => row.id !== id));
    },
    []
  );

  // Handle update quantity in table
  const handleUpdateQuantity = useCallback(
    (id: number, newQuantity: number) => {
      if (newQuantity <= 0) return;
      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, quantity: newQuantity } : row
        )
      );
    },
    []
  );

  // Handle update price in table
  const handleUpdatePrice = useCallback(
    (id: number, newPrice: number) => {
      if (newPrice < 0) return;
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, price: newPrice } : row))
      );
    },
    []
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRows([]);
    setNextId(100);
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <JDStyleHeader
        cartItemsCount={cartItemsCount}
        onSearch={handleSearch}
        onCartClick={handleCartClick}
        hideSearch
      />

      <main className="px-2 sm:px-4 pt-20 pb-10">
        <div className="bg-white rounded-lg shadow-md border border-gray-100 px-3 sm:px-5 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-lg border border-blue-100 hover:bg-blue-100 transition">
                <FaClipboardList />
                Bán hàng thường
              </button>
              <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                <FaRedo />
              </button>
            </div>
            <div className="flex items-center gap-2 text-gray-700 text-sm font-semibold">
              <span>Loại đơn</span>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as "SO" | "BO")}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="SO">SO</option>
                <option value="BO">BO</option>
              </select>
              <span className="px-3 py-1 rounded-md border border-gray-200 bg-white text-sm font-semibold">
                {orderType}
              </span>
            </div>
          </div>

          {/* Header với Khách hàng và Đơn hàng */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-xs font-semibold text-gray-600">
                  Khách hàng
                </label>
                {customerError ? (
                  <div className="p-2 bg-yellow-100 border border-yellow-400 rounded-md text-yellow-700 text-sm">
                    {customerError}
                  </div>
                ) : (
                  <InfiniteScrollSelect
                    loadOptions={loadCustomerOptions}
                    value={selectedCustomer}
                    onChange={handleCustomerChange}
                    placeholder="Khách hàng"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-xs font-semibold text-gray-600">
                  Đơn hàng
                </label>
                <input
                  value={orderCode || orderType}
                  onChange={(e) => setOrderCode(e.target.value)}
                  placeholder={orderType}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="text-xs text-gray-500">V2.93.86</div>
          </div>

          {/* Product Input Section */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">
                  {orderVat === "Có VAT" ? "Sản phẩm có VAT" : "Sản phẩm không VAT"}
                </label>
                <select
                  value={selectedProductId || ''}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  disabled={availableProducts.length === 0}
                >
                  <option value="">Chọn sản phẩm</option>
                  {availableProducts.length > 0 ? (
                    availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))
                  ) : (
                    <option>No products available</option>
                  )}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">
                  Đơn vị
                </label>
                <select
                  value={selectedProduct?.unit || ''}
                  onChange={(e) => {
                    // Update unit if needed
                  }}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  disabled={!selectedProduct}
                >
                  <option>{selectedProduct?.unit || 'Chọn đơn vị'}</option>
                  <option>Con</option>
                  <option>Kg</option>
                  <option>Bịch 95-100 con</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">
                  Số lượng
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={inputQuantity}
                    onChange={(e) =>
                      setInputQuantity(Number(e.target.value) || 0)
                    }
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                    <button
                      type="button"
                      onClick={() => setInputQuantity(prev => prev + 1)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputQuantity(prev => Math.max(0, prev - 1))}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ▼
                    </button>
                  </div>
                </div>
                {stockQuantity > 0 && (
                  <span className="text-xs text-gray-500 mt-1">SL theo kho: {stockQuantity.toFixed(2)}</span>
                )}
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">
                  Giá
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={inputPrice}
                    onChange={(e) => setInputPrice(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                    <button
                      type="button"
                      onClick={() => setInputPrice(prev => prev + 1000)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputPrice(prev => Math.max(0, prev - 1000))}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">
                  Thành tiền
                </label>
                <input
                  value={formatCurrency(selectedLineTotal.baseTotal)}
                  readOnly
                  className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">
                  VAT (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={inputVat}
                    onChange={(e) => setInputVat(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                    <button
                      type="button"
                      onClick={() => setInputVat(prev => Math.min(100, prev + 1))}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputVat(prev => Math.max(0, prev - 1))}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">
                  GTGT
                </label>
                <input
                  value={formatCurrency(selectedLineTotal.vatAmount)}
                  readOnly
                  className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">
                  Tổng tiền
                </label>
                <input
                  value={formatCurrency(selectedLineTotal.grand)}
                  readOnly
                  className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={approvePrice}
                  onChange={(e) => setApprovePrice(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Duyệt giá
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={approveSupPrice}
                  onChange={(e) => setApproveSupPrice(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Duyệt giá SUP
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={urgentOrder}
                  onChange={(e) => setUrgentOrder(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Đơn hàng gấp
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-700 font-semibold">Giá bình thường</span>
                <input
                  type="text"
                  className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none w-32"
                  placeholder="Giá bình thường"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-semibold">Ngày giao NM</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 font-semibold">Ca</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as "Ca sáng" | "Ca chiều")}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Ca sáng">Ca sáng</option>
                  <option value="Ca chiều">Ca chiều</option>
                </select>
              </div>
              <div className="flex-1">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddProduct}
                  className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                  title="Thêm"
                >
                  <FaPlus className="text-sm" />
                </button>
                <button
                  className="p-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition"
                  title="Lưu"
                >
                  <FaClipboardCheck className="text-sm" />
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                  title="Làm mới"
                >
                  <FaSyncAlt className="text-sm" />
                </button>
              </div>
            </div>
          </div>

          {/* Bảng dữ liệu */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-[#2b8c8c] text-white uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 w-14">STT</th>
                  <th className="px-3 py-2 min-w-[220px]">Tên sản phẩm</th>
                  <th className="px-3 py-2">Đơn vị</th>
                  <th className="px-3 py-2">Số lượng</th>
                  <th className="px-3 py-2">Giá</th>
                  <th className="px-3 py-2">Phụ phí</th>
                  <th className="px-3 py-2">Chiết khấu</th>
                  <th className="px-3 py-2">Giá đã CK</th>
                  <th className="px-3 py-2">VAT</th>
                  <th className="px-3 py-2">Tổng tiền</th>
                  <th className="px-3 py-2">Người duyệt</th>
                  <th className="px-3 py-2">Ngày giao</th>
                  <th className="px-3 py-2">Ca</th>
                  <th className="px-3 py-2">Kho đáp ứng</th>
                  <th className="px-3 py-2 w-20">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                      Chưa có đơn hàng
                    </td>
                  </tr>
                ) : (
                  totals.detail.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 bg-white hover:bg-gray-50"
                    >
                      <td className="px-3 py-2 text-gray-800 font-semibold">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2 text-gray-800">{row.name}</td>
                      <td className="px-3 py-2 text-gray-800">{row.unit}</td>
                      <td className="px-3 py-2 text-gray-800">
                        <input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(
                              row.id,
                              Number(e.target.value) || 1
                            )
                          }
                          className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        <input
                          type="number"
                          min={0}
                          value={row.price}
                          onChange={(e) =>
                            handleUpdatePrice(row.id, Number(e.target.value) || 0)
                          }
                          className="w-24 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        {(row.surcharge * 100).toFixed(0)}%
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        {(row.discount * 100).toFixed(0)}%
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        {formatCurrency(row.priceAfterDiscount)}
                      </td>
                      <td className="px-3 py-2 text-gray-800">{row.vat}%</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold">
                        {formatCurrency(row.lineTotal + row.vatAmount)}
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        {row.approver || "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-800 whitespace-nowrap">
                        {row.expectedDate.split("-").reverse().join("/")}
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        <select
                          value={shift}
                          onChange={(e) => setShift(e.target.value as "Ca sáng" | "Ca chiều")}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="Ca sáng">Ca sáng</option>
                          <option value="Ca chiều">Ca chiều</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        <button
                          onClick={() => handleDeleteProduct(row.id)}
                          className="p-1 rounded-md text-red-600 hover:bg-red-50 transition"
                          title="Xóa sản phẩm"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td
                    colSpan={10}
                    className="px-3 py-3 text-right text-sm font-semibold text-gray-700"
                  >
                    Tổng tiền
                  </td>
                  <td className="px-3 py-3 text-gray-900 font-bold">
                    {formatCurrency(totals.grandTotal)}
                  </td>
                  <td />
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>

      <Toolbar />
      <Footer />
    </div>
  );
};

export default AdminAppPage;
