"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import Select from "react-select";
import ProductGroupList from "../../product-list/productgroup-list";
import { Products } from "../../../model/interface/ProductCartData";
import axios from "axios";
import { FaUser, FaSearch, FaShoppingCart } from "react-icons/fa";
import { useCart } from "@/components/CartManager";
import { X } from "lucide-react";
import { getItem, setItem } from "@/utils/SecureStorage";
import Loading from "@/components/loading";
import SaleOrderType from "@/model/saleOder";

// Simple debounce function
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

interface SaleOrderProps {
  addToCart: (product: Products, quantity: number) => void;
  onCustomerSelect: (
    customer: {
      value: string;
      label: string;
    } | null
  ) => void;
  selectedCustomer: {
    value: string;
    label: string;
  } | null;
}

interface Customer {
  crdfd_customerid: string;
  crdfd_name: string;
  cr1bb_ngunggiaodich?: number | null;
  debtInfo?: {
    cr1bb_tongcongno?: number | null;
  };
}

// Custom Infinite Scroll Select Component
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

const SaleOrder: React.FC<SaleOrderProps> = ({
  addToCart,
  onCustomerSelect,
  selectedCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [selectedGroupImage, setSelectedGroupImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGroupMinPrice, setSelectedGroupMinPrice] = useState<
    number | null
  >(null);
  const [selectedGroupMaxPrice, setSelectedGroupMaxPrice] = useState<
    number | null
  >(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState<
    string | null
  >(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const { clearCart } = useCart();
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());
  const [saleOrders, setSaleOrders] = useState<SaleOrderType[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SaleOrderType | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Products | null>(null);

  // Hàm load options async với pageSize
  const loadOptions = useCallback(async (inputValue: string, pageSize: number = 10) => {
    try {
      const saleName = getItem("saleName");
      const customerId = getItem("id");
      const searchParam = inputValue ? `&search=${encodeURIComponent(inputValue)}` : '';
      
      // Sử dụng saleName làm customerId để tìm khách hàng của sale này
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
      return [];
    }
  }, []);

  // Test load để kiểm tra API
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

  const handleAddToCart = useCallback(
    (product: Products, quantity: number) => {
      addToCart({
        ...product,
        crdfd_giatheovc: Number(product.crdfd_giatheovc),
        unit: product.unit || ""
      }, quantity);
    },
    [addToCart]
  );

  // Hàm lấy đơn hàng của khách hàng
  const fetchSaleOrders = useCallback(async (customerId: string) => {
    try {
      setLoadingOrders(true);
      const response = await axios.get<SaleOrderType[]>(
        `/api/getSaleOrdersData?id_khachhang=${customerId}`
      );
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        setSaleOrders(response.data);
        // Tự động chọn đơn hàng gần nhất (đã được sort theo ngày giảm dần trong API)
        setSelectedOrder(response.data[0]);
      } else {
        setSaleOrders([]);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Error fetching sale orders:", error);
      setSaleOrders([]);
      setSelectedOrder(null);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const handleCustomerChange = (
    selectedOption: {
      value: string;
      label: string;
    } | null
  ) => {
    onCustomerSelect(selectedOption);
    clearCart();
    setSearchTerm(""); // Reset search input
    setSelectedProduct(null); // Reset selected product
    // Reset refreshTimestamp để trigger reload danh sách sản phẩm
    setRefreshTimestamp(Date.now());

    // Extract customerId when a customer is selected and console log it
    if (selectedOption) {
      const customerId = selectedOption.value;
      setItem("selectedCustomerId", customerId);
      // Lấy đơn hàng gần nhất của khách hàng
      fetchSaleOrders(customerId);
    } else {
      console.log("No customer selected - handleCustomerChange - line 103: ");
      setSaleOrders([]);
      setSelectedOrder(null);
    }
  };

  // Hàm xử lý khi chọn đơn hàng từ dropdown
  const handleOrderChange = (order: SaleOrderType | null) => {
    setSelectedOrder(order);
    clearCart();
    setSelectedProduct(null);
    setRefreshTimestamp(Date.now());
  };

  // Kiểm tra đơn hàng có VAT hay không
  const isOrderWithVAT = selectedOrder ? (selectedOrder.crdfd_gtgtnew > 0) : false;

  // Hàm handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = () => {
    setSearchKey(searchTerm);
  };





  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="w-full px-2 mx-auto bg-white rounded-lg shadow-md pt-2">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">
          Đơn hàng mới
        </h1>

        {customerError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl px-8 py-10 shadow-lg flex flex-col items-center max-w-md mx-auto">
              <div className="bg-blue-100 rounded-full p-4 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-xl font-semibold text-gray-800 mb-3 text-center">Cần thiết lập thông tin khách hàng</div>
              <div className="text-gray-600 text-sm text-center leading-relaxed mb-6">
                Để tạo đơn hàng, bạn cần được phân công phụ trách khách hàng. Hãy liên hệ với quản trị viên để được hỗ trợ.
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button 
                  onClick={() => window.location.reload()} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Thử lại
                </button>
                <button 
                  onClick={() => window.history.back()} 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label
                htmlFor="customerSelect"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                <FaUser className="inline mr-2" />
                Chọn khách hàng:
              </label>
              <InfiniteScrollSelect
                loadOptions={loadOptions}
                value={selectedCustomer}
                onChange={handleCustomerChange}
                placeholder="Gõ tên khách hàng để tìm kiếm..."
              />
            </div>

            {selectedCustomer && (
              <div className="mb-4">
                <label
                  htmlFor="orderSelect"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  {isOrderWithVAT ? "Đơn hàng Có VAT" : "Đơn hàng"}:
                </label>
                {loadingOrders ? (
                  <div className="px-3 py-2 border border-gray-300 rounded-lg">
                    <Loading />
                  </div>
                ) : (
                  <Select
                    id="orderSelect"
                    instanceId="orderSelect"
                    options={saleOrders.map((order) => ({
                      value: order.crdfd_sale_orderid || order.crdfd_so_code,
                      label: order.crdfd_name || order.crdfd_so_code || "Đơn hàng không tên",
                      order: order,
                    }))}
                    value={
                      selectedOrder
                        ? {
                            value: selectedOrder.crdfd_sale_orderid || selectedOrder.crdfd_so_code,
                            label: selectedOrder.crdfd_name || selectedOrder.crdfd_so_code || "Đơn hàng không tên",
                            order: selectedOrder,
                          }
                        : null
                    }
                    onChange={(option) => {
                      handleOrderChange(option?.order || null);
                    }}
                    isClearable
                    isSearchable
                    placeholder="Chọn đơn hàng..."
                    styles={{
                      container: (base) => ({ ...base, width: "100%" }),
                    }}
                  />
                )}
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="searchProduct"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                <FaSearch className="inline mr-2" />
                Tìm kiếm sản phẩm:
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  id="searchProduct"
                  className="w-full sm:w-auto flex-grow px-3 py-2 border border-gray-300 rounded-md sm:rounded-l-md sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 sm:mb-0"
                  placeholder="Nhập tên sản phẩm..."
                  value={searchTerm} // Controlled by searchTerm state
                  onChange={handleSearchChange}
                />
                {searchTerm && (
                  <button
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchTerm("")}
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            {selectedCustomer ? (
              <div className="mt-4">
                <ProductGroupList
                  searchTerm={searchTerm}
                  searchKey={searchKey}
                  selectedProductGroup={selectedProductGroup}
                  selectedGroupImage={selectedGroupImage}
                  selectedGroupMinPrice={selectedGroupMinPrice}
                  selectedGroupMaxPrice={selectedGroupMaxPrice}
                  breadcrumb={breadcrumb}
                  quantity={0}
                  onAddToCart={handleAddToCart}
                  customerSelectId={selectedCustomer.value}
                  refreshTimestamp={refreshTimestamp}
                />
                {/* Các field chi tiết sản phẩm sẽ được hiển thị sau khi chọn sản phẩm từ ProductGroupList */}
                {/* ProductGroupList đã xử lý việc hiển thị và thêm sản phẩm vào cart */}
              </div>
            ) : (
              <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                <p className="font-bold">Chú ý:</p>
                <p>Vui lòng chọn một khách hàng để xem danh sách sản phẩm.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SaleOrder;
