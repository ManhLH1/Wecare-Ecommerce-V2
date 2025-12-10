"use client";
import React, { useState, useCallback, useEffect, useMemo, memo, useRef } from "react";
import Select from "react-select";
import ProductGroupList from "../product-list/productgroup-list";
import { FaUser, FaSearch, FaEye, FaInfoCircle } from "react-icons/fa";
import { Package, TrendingUp, DollarSign } from "lucide-react";
import { getItem, setItem } from "@/utils/SecureStorage";
import Loading from "@/components/loading";
import axios from "axios";
import AsyncSelect from 'react-select/async';

// Simple debounce function
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

interface PriceViewerProps {
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
  addToCart?: (product: any, quantity: number) => void;
}

interface Customer {
  crdfd_customerid: string;
  crdfd_name: string;
  cr1bb_ngunggiaodich?: number | null;
  debtInfo?: {
    cr1bb_tongcongno?: number | null;
  };
}

// Debounce hook for search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Memoized Customer Selection Section
const CustomerSelectionSection = memo(({ 
  loading, 
  customerError, 
  selectedCustomer, 
  onCustomerChange 
}: {
  loading: boolean;
  customerError: string | null;
  selectedCustomer: any;
  onCustomerChange: (option: any) => void;
}) => {
  // Lấy saleId từ localStorage
  const saleId = getItem("id");

  // Không cần defaultOptions, sẽ load khi user tương tác
  const [defaultOptions] = useState<any[]>([]);
  
  // Thêm useEffect để test load options khi component mount
  useEffect(() => {
    const testLoad = async () => {
      const saleName = getItem("saleName");
      try {
        const res = await axios.get(`/api/getCustomerDataLazyLoad?customerId=${saleName}&saleName=${saleName}&page=1&pageSize=20`);
      } catch (error) {
        console.error("Test load error:", error);
      }
    };
    testLoad();
  }, []);

  // Hàm load options async với pageSize
  const loadOptions = useCallback(async (inputValue: string, pageSize: number = 10) => {
    try {
      const saleName = getItem("saleName");
      
      const searchParam = inputValue ? `&search=${encodeURIComponent(inputValue)}` : '';
      // Sử dụng saleName làm customerId để tìm khách hàng của sale này
      const res = await axios.get(`/api/getCustomerDataLazyLoad?customerId=${saleName}&saleName=${saleName}${searchParam}&page=1&pageSize=${pageSize}`);
      
      if (res.data?.data) {
        // Kiểm tra xem data có phải là array không
        const dataArray = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
        const options = dataArray.map((customer: any) => ({
          value: customer.crdfd_customerid,
          label: customer.crdfd_name,
        }));
        return options;
      }
      return [];
    } catch (error) {
      return [];
    }
  }, [saleId]);

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 min-h-[300px]">
      <div className="flex items-center gap-3 mb-4">
        <FaUser className="text-gray-600 text-lg" />
        <h2 className="text-lg font-medium text-gray-800">Chọn Khách Hàng</h2>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loading />
        </div>
      ) : customerError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FaInfoCircle className="text-red-500" />
            <span className="text-red-700">{customerError}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <InfiniteScrollSelect
            loadOptions={loadOptions}
            value={selectedCustomer}
            onChange={onCustomerChange}
            placeholder="Gõ tên khách hàng để tìm kiếm..."
          />
          {selectedCustomer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FaUser className="text-green-600 text-sm" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedCustomer.label}</h3>
                    <p className="text-sm text-gray-500">ID: {selectedCustomer.value}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <FaEye className="text-xs" />
                  Đang xem giá
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CustomerSelectionSection.displayName = 'CustomerSelectionSection';

// Memoized Search Section
const SearchSection = memo(({ 
  searchTerm, 
  onSearchChange, 
  onSearch 
}: {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
}) => (
  <div className="bg-white rounded-lg p-6 border border-gray-200">
    <div className="flex items-center gap-3 mb-4">
      <FaSearch className="text-gray-600 text-lg" />
      <h2 className="text-lg font-medium text-gray-800">Tìm Kiếm Sản Phẩm</h2>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm sản phẩm</label>
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Nhập tên sản phẩm..."
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <button
          onClick={onSearch}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          Tìm
        </button>
      </div>
    </div>
  </div>
));

SearchSection.displayName = 'SearchSection';

// Memoized Product Display Section
const ProductDisplaySection = memo(({ 
  selectedCustomer, 
  searchKey, 
  selectedGroupImage,
  selectedGroupMinPrice,
  selectedGroupMaxPrice,
  selectedProductGroup,
  breadcrumb,
  addToCart
}: {
  selectedCustomer: any;
  searchKey: string;
  selectedGroupImage: string;
  selectedGroupMinPrice: number | null;
  selectedGroupMaxPrice: number | null;
  selectedProductGroup: string | null;
  breadcrumb: string[];
  addToCart?: (product: any, quantity: number) => void;
}) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="bg-blue-600 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="text-white text-lg" />
          <div>
            <h2 className="text-white font-medium text-lg">Danh Sách Sản Phẩm</h2>
            <p className="text-blue-100 text-sm">Khách hàng: {selectedCustomer.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-white text-sm">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>Giá theo khách hàng</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            <span>Chỉ xem</span>
          </div>
        </div>
      </div>
    </div>

    <div className="p-6">
      <ProductGroupList
        searchTerm={searchKey}
        selectedGroupImage={selectedGroupImage}
        selectedGroupMinPrice={selectedGroupMinPrice}
        selectedGroupMaxPrice={selectedGroupMaxPrice}
        selectedProductGroup={selectedProductGroup}
        breadcrumb={breadcrumb}
        isPriceViewer={true}
        sortBy="name"
        filterBy="all"
        onAddToCart={addToCart}
        customerSelectId={selectedCustomer.value}
      />
    </div>
  </div>
));

ProductDisplaySection.displayName = 'ProductDisplaySection';

// Memoized Info Section
const InfoSection = memo(() => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
    <div className="flex items-start gap-4">
      <div className="p-2 bg-blue-100 rounded-lg">
        <FaInfoCircle className="text-blue-600 text-lg" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-blue-900 mb-3">Hướng Dẫn Sử Dụng</h3>
        <ul className="text-blue-800 space-y-2 text-sm">
          <li>• Chọn khách hàng từ danh sách để xem giá sản phẩm dành riêng cho khách hàng đó</li>
          <li>• Sử dụng thanh tìm kiếm để lọc sản phẩm theo tên</li>
          <li>• Sắp xếp sản phẩm theo giá hoặc tên</li>
          <li>• Lọc sản phẩm theo loại (khuyến mãi, mới, bán chạy)</li>
          <li>• Chế độ này chỉ cho phép xem giá, không thể tạo đơn hàng</li>
        </ul>
      </div>
    </div>
  </div>
));

InfoSection.displayName = 'InfoSection';

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
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMore = useCallback(async (searchValue: string = '', currentPageSize: number = 10) => {
    try {
      setLoading(true);
      const newOptions = await loadOptions(searchValue, currentPageSize);
      
      if (currentPageSize === 10) {
        // Reset options khi search mới
        setOptions(newOptions);
      } else {
        // Thêm options mới vào danh sách hiện tại
        setOptions(prev => [...prev, ...newOptions]);
      }
      
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
    
    // Tính toán vị trí dropdown
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Nếu không đủ chỗ ở dưới (ít hơn 200px) và có đủ chỗ ở trên, hiển thị lên trên
      if (spaceBelow < 200 && spaceAbove > 200) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
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
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          setIsOpen(true);
          // Tính toán vị trí khi focus
          if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            if (spaceBelow < 200 && spaceAbove > 200) {
              setDropdownPosition('top');
            } else {
              setDropdownPosition('bottom');
            }
          }
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      
      {isOpen && options.length > 0 && (
        <div 
          ref={containerRef}
          className={`absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto ${
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
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

const PriceViewer: React.FC<PriceViewerProps> = memo(({
  onCustomerSelect,
  selectedCustomer,
  addToCart,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGroupImage, setSelectedGroupImage] = useState("");
  const [selectedGroupMinPrice, setSelectedGroupMinPrice] = useState<number | null>(null);
  const [selectedGroupMaxPrice, setSelectedGroupMaxPrice] = useState<number | null>(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Debounced search key
  const searchKey = useDebounce(searchTerm, 300);

  // Fetch customer detail when selected
  const fetchCustomerDetail = useCallback(async (customerId: string) => {
    try {
      setLoading(true);
      setCustomerError(null);
      
      const Idlogin = getItem("id");
      const saleName = getItem("saleName");
      
      const response = await axios.get(`/api/getCustomerDataLazyLoad?customerId=${customerId}&saleName=${saleName}`);
      
      if (response.data?.error) {
        setCustomerError("Không tìm thấy thông tin khách hàng");
        setSelectedCustomerDetail(null);
      } else {
        // Xử lý response format mới với pagination
        const customerData = response.data?.data || response.data;
        setSelectedCustomerDetail(customerData);
      }
    } catch (error) {
      setCustomerError("Không tìm thấy thông tin khách hàng");
      setSelectedCustomerDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCustomerChange = useCallback(
    async (selectedOption: { value: string; label: string } | null) => {
      onCustomerSelect(selectedOption);
      
      if (selectedOption) {
        // Lưu selectedCustomerId vào localStorage để ProductTable_index có thể sử dụng
        setItem("selectedCustomerId", selectedOption.value);
        // Chỉ gọi API chi tiết khi user chọn khách hàng
        await fetchCustomerDetail(selectedOption.value);
      } else {
        // Xóa selectedCustomerId khi không chọn khách hàng
        setItem("selectedCustomerId", "");
        setSelectedCustomerDetail(null);
        setCustomerError(null);
      }
    },
    [onCustomerSelect, fetchCustomerDetail]
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleSearch = useCallback(() => {
    // Search is handled by debounced searchKey
  }, []);

  // Cleanup selectedCustomerId khi component unmount
  useEffect(() => {
    return () => {
      // Xóa selectedCustomerId khi rời khỏi trang
      setItem("selectedCustomerId", "");
    };
  }, []);

  return (
    <div className="space-y-6">
      <CustomerSelectionSection
        loading={false} // Không loading khi mở dropdown
        customerError={customerError}
        selectedCustomer={selectedCustomer}
        onCustomerChange={handleCustomerChange}
      />

      {selectedCustomer && (
        <SearchSection
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onSearch={handleSearch}
        />
      )}

      {selectedCustomer && (
        <ProductDisplaySection
          selectedCustomer={selectedCustomer}
          searchKey={searchKey}
          selectedGroupImage={selectedGroupImage}
          selectedGroupMinPrice={selectedGroupMinPrice}
          selectedGroupMaxPrice={selectedGroupMaxPrice}
          selectedProductGroup={selectedProductGroup}
          breadcrumb={breadcrumb}
          addToCart={addToCart}
        />
      )}
    </div>
  );
});

PriceViewer.displayName = 'PriceViewer';

export default PriceViewer; 