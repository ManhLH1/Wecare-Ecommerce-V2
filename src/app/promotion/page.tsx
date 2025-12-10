"use client";

import React, { useEffect, useState, useCallback, Suspense, useMemo, useContext } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import Link from "next/link";
import Image from "next/image";
import img from "../promotion.png";
import { getItem, setItem } from "@/utils/SecureStorage";
import Select from "react-select";
import { FaUser, FaSearch, FaCalendarAlt, FaTag, FaGift, FaCreditCard, FaPercent, FaFilter, FaClock, FaTimes } from "react-icons/fa";
import { formatDateToDDMMYYYY } from '@/utils/utils';
import { useCart } from "@/components/CartManager";
import CartWeb from "@/app/product-list/_components/cart/CartWeb";
import { CartContext } from "@/components/CartGlobalManager";
import { useSearchParams } from "next/navigation";

// Interfaces for new data structure
interface PromotionData {
  name: string;
  conditions: string | null;
  productGroupCodes: string | null;
  productGroupNames: string | null;
  productCodes: string | null;
  productNames: string | null;
  type: string;
  customerGroupText: string;
  value: number;
  vn: number;
  value2: number | null;
  value3: number | null;
  congdonsoluong: boolean;
  soluongapdung: number | null;
  startDate: string;
  endDate: string | null;
  promotionType: string;
  promotionId: string;
  ieuKhoanThanhToanApDung: string | null;
  soluongapdungmuc3: number | null;
  tenSanPhamMuaKem: string | null;
  maSanPhamMuaKem: string | null;
  maNhomSPMultiple: string | null;
  maNhomSPMuaKem: string | null;
  maKhachHangApDung: string | null;
  tongTienApDung: number | null;
  promotion_id: string;
  image: string | null;
}

interface CustomerGroup {
  customerId: string;
  customerGroupId: string;
  customerCode: string;
  customerName: string;
  customerGroupName: string;
  customerPromotionJson: string | null;
  promotions: PromotionData[];
}

interface Customer {
  crdfd_customerid: string;
  crdfd_name: string;
}

interface CustomerOption {
  value: string;
  label: string;
}

// Lazy loaded components
const JDStyleHeader = React.lazy(() => import("@/components/JDStyleHeader"));
const Footer = React.lazy(() => import("@/components/footer"));
const Toolbar = React.lazy(() => import("@/components/toolbar"));
import { EmptyState } from "@/components/ui/empty-state";

// Loading fallback component
const LoadingFallback = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
};

const PromotionComponent = () => {
  // State declarations
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [expandedPromotionId, setExpandedPromotionId] = useState<string | null>(null);
  const [listcustomers, setListcustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<{[key: string]: boolean}>({});
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Add pagination and filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<{start: string, end: string}>({
    start: "",
    end: ""
  });
  const [showFilters, setShowFilters] = useState(false);

  // Get cart context
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart } = useCart();
  const { openCart } = useContext(CartContext);

  const handleSearch = (term: string) => {
    if (term.trim()) {
      const toSlug = (str: string) =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[đĐ]/g, "d")
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "-");
      const slug = toSlug(term);
      window.location.href = `/san-pham/${slug}`;
    }
  };

  // Get all promotions from all customer groups
  const allPromotions = useMemo(() => {
    const promotions = customerGroups.flatMap(group => 
      group.promotions.map(promotion => ({
        ...promotion,
        customerGroupName: group.customerGroupName,
        customerName: group.customerName
      }))
    );
    
    // Remove duplicates based on promotionId
    const uniquePromotions = promotions.filter((promotion, index, self) => 
      index === self.findIndex(p => p.promotionId === promotion.promotionId)
    );
    
    return uniquePromotions;
  }, [customerGroups]);

  // Filter promotions
  const filteredPromotions = useMemo(() => {
    return allPromotions.filter(promotion => {
      const matchesSearch = promotion.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      const matchesType = !typeFilter || promotion.type === typeFilter;
      const matchesDate = (!dateFilter.start || new Date(promotion.startDate) >= new Date(dateFilter.start)) &&
                         (!dateFilter.end || !promotion.endDate || new Date(promotion.endDate) <= new Date(dateFilter.end));
      return matchesSearch && matchesType && matchesDate;
    });
  }, [allPromotions, searchTerm, typeFilter, dateFilter]);

  const paginatedPromotions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPromotions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPromotions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);

  // Get unique promotion types for filter
  const promotionTypes = useMemo(() => {
    const types = new Set(allPromotions.map(p => p.type).filter(Boolean));
    return Array.from(types);
  }, [allPromotions]);

  // Helper functions
  const formatCurrency = (amount: number, vn: number) => {
    if (vn === 191920000) { // Percentage
      return `${amount.toLocaleString('vi-VN')}%`;
    } else { // VND
      return `${amount.toLocaleString('vi-VN')} đ`;
    }
  };

  const getPromotionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'order': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'product': return 'bg-green-100 text-green-800 border-green-200';
      case 'bundle': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Fetch promotions function
  const fetchPromotions = useCallback(async (id: string | null) => {
    try {
      setLoading(true);
      if (!id) {
        // Fetch default promotions for non-logged users
        setCustomerGroups([]);
      } else {
        const response = await axios.get(
          `/api/getPromotionDataNewVersion?id=${id}&includeImage=true`
        );
        setCustomerGroups(response.data);
      }
    } catch (error) {
      console.error("Error fetching promotions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const initializeData = async () => {
      const storedId = getItem("id");
      const typeLogin = getItem("type");
      const storedName = getItem("userName");
      setUserType(typeLogin);
      setIsLoggedIn(!!storedName);

      if (storedId && storedName) {
        if (typeLogin === "sale" || typeLogin === "saledirect" || typeLogin === "saleonline") {
          setLoading(false);
        } else {
          fetchPromotions(storedId);
        }
      } else {
        fetchPromotions(null);
      }
    };

    initializeData();
  }, [fetchPromotions]);

  // Fetch customer data for sales users
  useEffect(() => {
    const fetchCustomerData = async () => {
      const Idlogin = getItem("id");
      const saleName = getItem("saleName") || getItem("userName");
      if (Idlogin && (userType === "sale" || userType === "saledirect" || userType === "saleonline")) {
        setLoadingCustomers(true);
        setCustomerError(null);
        try {
          const response = await axios.get(
            `/api/getCustomerDataLazyLoad?customerId=${Idlogin}&saleName=${saleName}&page=1&pageSize=100`
          );
          if (response.data?.data) {
            const dataArray = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
            setListcustomers(dataArray);
          } else {
            setCustomerError("Không tìm thấy khách hàng nào");
          }
        } catch (error) {
          console.error("Error fetching customers:", error);
          setCustomerError("Không thể tải danh sách khách hàng");
        } finally {
          setLoadingCustomers(false);
        }
      }
    };

    fetchCustomerData();
  }, [userType]);

  // Event handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (type: 'start' | 'end', value: string) => {
    setDateFilter(prev => ({
      ...prev,
      [type]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setDateFilter({ start: "", end: "" });
    setCurrentPage(1);
  };

  const togglePromotionDetails = (promotionId: string) => {
    setExpandedPromotionId(prev => prev === promotionId ? null : promotionId);
  };

  const removeDiacritics = (str: string): string => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const customFilter = (option: any, inputValue: string) => {
    const label = removeDiacritics(option.label.toLowerCase());
    const input = removeDiacritics(inputValue.toLowerCase());
    return label.includes(input);
  };

  const handleCustomerChange = (selectedOption: CustomerOption | null) => {
    setSelectedCustomer(selectedOption);
    if (selectedOption) {
      setItem("selectedCustomerId", selectedOption.value);
      fetchPromotions(selectedOption.value);
    } else {
      setCustomerGroups([]);
    }
  };

  const toggleProducts = (promotionId: string, section: string) => {
    const key = `${promotionId}-${section}`;
    setExpandedProducts(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle deep-linking to a promotion via ?promotionId=
  useEffect(() => {
    const targetId = searchParams?.get("promotionId");
    if (!targetId) return;
    // Ensure data is loaded and we can display the target
    if (loading) return;

    // If pagination hides the item, try to navigate to a page containing it
    const idx = filteredPromotions.findIndex(p => p.promotionId === targetId);
    if (idx !== -1) {
      const page = Math.floor(idx / itemsPerPage) + 1;
      if (currentPage !== page) {
        setCurrentPage(page);
        // Delay expanding until page state applied
        setTimeout(() => setExpandedPromotionId(targetId), 0);
      } else {
        setExpandedPromotionId(targetId);
      }

      // Scroll to the promotion row when ready
      setTimeout(() => {
        const el = document.getElementById(`promotion-row-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [searchParams, loading, filteredPromotions, itemsPerPage, currentPage]);

  // Render promotion row
  const renderPromotionRow = (promotion: PromotionData & { customerGroupName?: string; customerName?: string }) => (
    <div id={`promotion-row-${promotion.promotionId}`} key={promotion.promotionId} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 mb-4">
      {/* Main row content */}
      <div className="flex flex-col lg:flex-row">
        {/* Image section */}
        <div className="lg:w-48 lg:flex-shrink-0">
          {promotion.image ? (
            <div className="h-32 lg:h-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none">
              <Image
                src={promotion.image}
                alt={promotion.name}
                width={200}
                height={120}
                className="object-cover rounded-lg shadow-sm max-h-28 lg:max-h-full w-auto"
                onError={() => {
                  // Handle image error
                }}
          />
        </div>
          ) : (
            <div className="h-32 lg:h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none">
              <Image
                src={img}
                alt="Khuyến mãi"
                width={200}
                height={120}
                className="object-cover rounded-lg shadow-sm max-h-28 lg:max-h-full w-auto"
              />
            </div>
          )}
        </div>

        {/* Content section */}
        <div className="flex-1 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between h-full">
            {/* Left content */}
            <div className="flex-1 lg:mr-6">
              {/* Header with title and badges */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {promotion.name}
                  </h3>
                  
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPromotionTypeColor(promotion.type)}`}>
                      {promotion.type}
              </span>
                    
                    {promotion.customerGroupName && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FaUser className="mr-1" />
                        {promotion.customerGroupName}
                      </span>
                    )}
            </div>
          </div>

                {/* Value section */}
                <div className="text-right lg:ml-4">
                  <div className="flex items-center justify-end space-x-2 mb-1">
                    {promotion.vn === 191920000 ? <FaPercent className="text-orange-500" /> : <FaCreditCard className="text-green-500" />}
                    <span className="text-xl lg:text-2xl font-bold text-emerald-600">
                      {formatCurrency(promotion.value, promotion.vn)}
                    </span>
          </div>
                  {promotion.value2 && (
                    <div className="text-sm text-gray-600">
                      + {formatCurrency(promotion.value2, promotion.vn)}
          </div>
                  )}
        </div>
      </div>

              {/* Info row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 mb-3">
                {/* Date */}
                <div className="flex items-center mb-2 sm:mb-0">
                  <FaCalendarAlt className="mr-2" />
                  <span>
                    {formatDateToDDMMYYYY(promotion.startDate)}
                    {promotion.endDate && ` - ${formatDateToDDMMYYYY(promotion.endDate)}`}
                  </span>
          </div>

                {/* Additional info */}
                <div className="flex items-center space-x-4">
                  {promotion.congdonsoluong && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Cộng dồn
                    </span>
                  )}
                  {promotion.soluongapdung && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      SL: {promotion.soluongapdung}
                    </span>
                  )}
                </div>
              </div>

              {/* Conditions preview */}
              {promotion.conditions && (
                <div className="mb-3">
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {promotion.conditions}
                    </p>
                  </div>
              )}
                </div>

            {/* Action buttons */}
            <div className="lg:w-56 lg:flex-shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => togglePromotionDetails(promotion.promotionId)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 lg:py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  {expandedPromotionId === promotion.promotionId ? 'Thu gọn' : 'Xem'}
                </button>
                <Link
                  href={`/promotion/detail/${promotion.promotionId}`}
                  className="w-full text-center bg-white border border-gray-200 text-gray-800 py-2 lg:py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 no-underline"
                >
                  Chi tiết
                </Link>
              </div>
            </div>
          </div>
        </div>
                      </div>
                      
        {/* Expanded details */}
        {expandedPromotionId === promotion.promotionId && (
          <div className="border-t bg-gray-50 p-6 space-y-4">
            {/* Detailed information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Promotion values */}
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <h5 className="font-semibold text-emerald-800 mb-3 flex items-center">
                  <FaGift className="mr-2" />
                  Giá trị khuyến mãi
                            </h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">Giá trị chính:</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(promotion.value, promotion.vn)}</span>
                  </div>
                  {promotion.value2 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Giá trị 2:</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(promotion.value2, promotion.vn)}</span>
                    </div>
                  )}
                  {promotion.value3 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Giá trị 3:</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(promotion.value3, promotion.vn)}</span>
                    </div>
                              )}
                            </div>
                          </div>

              {/* Additional info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <FaTag className="mr-2" />
                  Thông tin bổ sung
                            </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Cộng dồn:</span>
                    <span className={promotion.congdonsoluong ? "text-green-600" : "text-red-600"}>
                      {promotion.congdonsoluong ? "Có" : "Không"}
                                  </span>
                              </div>
                  {promotion.soluongapdung && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">SL áp dụng:</span>
                      <span className="font-medium">{promotion.soluongapdung}</span>
                                </div>
                              )}
                  {promotion.tongTienApDung && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tổng tiền áp dụng:</span>
                      <span className="font-medium">{promotion.tongTienApDung.toLocaleString('vi-VN')} đ</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

            {/* Full conditions */}
            {promotion.conditions && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h5 className="font-semibold text-yellow-800 mb-2">Điều kiện áp dụng:</h5>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{promotion.conditions}</p>
                              </div>
            )}

            {/* Product information */}
            {(promotion.productNames || promotion.productGroupNames) && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h5 className="font-semibold text-purple-800 mb-3">Sản phẩm áp dụng:</h5>
                
                {promotion.productNames && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Sản phẩm cụ thể:
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {promotion.productNames.split(',').slice(0, expandedProducts[`${promotion.promotionId}-products`] ? undefined : 9).map((product, idx) => (
                          <div key={idx} className="flex items-center bg-gradient-to-r from-purple-50 to-blue-50 px-3 py-2 rounded-lg border border-purple-100 hover:shadow-sm transition-all">
                            <span className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-semibold mr-2 flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm text-gray-700 truncate">{product.trim()}</span>
                          </div>
                        ))}
                      </div>
                      {promotion.productNames.split(',').length > 9 && (
                        <div className="mt-3 text-center">
                                    <button
                            onClick={() => toggleProducts(promotion.promotionId, 'products')}
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            {expandedProducts[`${promotion.promotionId}-products`] 
                              ? (
                                <>
                                  <span>Thu gọn</span>
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <span>Xem thêm {promotion.productNames.split(',').length - 9} sản phẩm</span>
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                          </button>
                                </div>
                              )}
                    </div>
                            </div>
                          )}

                {promotion.productGroupNames && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Nhóm sản phẩm:
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {promotion.productGroupNames.split(',').slice(0, expandedProducts[`${promotion.promotionId}-groups`] ? undefined : 6).map((group, idx) => (
                          <div key={idx} className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 rounded-lg border border-blue-100 hover:shadow-sm transition-all">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-semibold mr-3 flex-shrink-0">
                              {idx + 1}
                                  </span>
                            <span className="text-sm text-gray-700 truncate">{group.trim()}</span>
                              </div>
                        ))}
                      </div>
                      {promotion.productGroupNames.split(',').length > 6 && (
                        <div className="mt-3 text-center">
                                        <button
                            onClick={() => toggleProducts(promotion.promotionId, 'groups')}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {expandedProducts[`${promotion.promotionId}-groups`] 
                              ? (
                                <>
                                  <span>Thu gọn</span>
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <span>Xem thêm {promotion.productGroupNames.split(',').length - 6} nhóm</span>
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                                        </button>
                        </div>
                                      )}
                    </div>
                                    </div>
                                      )}
                                    </div>
                                  )}

            {/* Bundle products */}
            {promotion.tenSanPhamMuaKem && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h5 className="font-semibold text-orange-800 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  Sản phẩm mua kèm:
                </h5>
                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {promotion.tenSanPhamMuaKem.split(',').map((product, idx) => (
                      <div key={idx} className="flex items-center bg-gradient-to-r from-orange-50 to-yellow-50 px-3 py-2 rounded-lg border border-orange-100 hover:shadow-sm transition-all">
                        <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-semibold mr-2 flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700 truncate">{product.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
  );

  // Main render
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col overflow-x-hidden">
      {/* JD Style Layout */}
      <div className="bg-white">
        {/* Header with Search */}
        <Suspense fallback={<LoadingFallback />}>
          <JDStyleHeader
            cartItemsCount={cartItems.length}
            onSearch={handleSearch}
            onCartClick={openCart}
          />
        </Suspense>

        {/* Main Layout - No Sidebar */}
        <div className="max-w-6xl mx-auto px-4 py-6" style={{ paddingTop: '140px' }}>
          <div className="flex flex-col">
            {/* Main Content - Full Width */}
            <div className="w-full">
              <main className="w-full">
                {/* Hero Section */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
                  <div className="px-6 py-8 text-center">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                      Khuyến Mãi Đặc Biệt
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      Khám phá những ưu đãi hấp dẫn cho doanh nghiệp của bạn
                    </p>
                  </div>
                </section>

                {/* Customer Selection for Sales Users */}
                {(userType === "sale" || userType === "saledirect" || userType === "saleonline") && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FaUser className="mr-2 text-blue-600" />
                Chọn khách hàng
              </h3>
              {loadingCustomers ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-600">Đang tải danh sách khách hàng...</span>
                </div>
              ) : customerError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="text-red-600 mr-2">⚠️</div>
                    <span className="text-red-700">{customerError}</span>
                  </div>
                </div>
              ) : (
                <Select
                  instanceId="customerSelect"
                  options={listcustomers.map((customer) => ({
                    value: customer.crdfd_customerid,
                    label: customer.crdfd_name,
                  }))}
                  onChange={handleCustomerChange}
                  value={selectedCustomer}
                  isClearable
                  isSearchable
                  placeholder="Chọn khách hàng để xem khuyến mãi..."
                  filterOption={customFilter}
                  className="text-sm"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: "48px",
                      borderRadius: "0.5rem",
                      borderColor: "#e5e7eb",
                    }),
                  }}
                />
              )}
            </div>
          )}

                {/* Filters Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <FaFilter className="mr-2 text-purple-600" />
                Bộ lọc tìm kiếm
              </h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden bg-purple-600 text-white px-4 py-2 rounded-lg"
              >
                {showFilters ? <FaTimes /> : <FaFilter />}
              </button>
            </div>

                  <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 ${showFilters ? 'block' : 'hidden lg:grid'}`}>
                    {/* Search */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        🔍 Tìm kiếm
                      </label>
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={handleSearchChange}
                          placeholder="Tên khuyến mãi..."
                          className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Type filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        🏷️ Loại khuyến mãi
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => handleTypeFilterChange(e.target.value)}
                        className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      >
                        <option value="">Tất cả loại</option>
                        {promotionTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date filters */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        📅 Từ ngày
                      </label>
                      <input
                        type="date"
                        value={dateFilter.start}
                        onChange={(e) => handleDateFilterChange('start', e.target.value)}
                        className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        📅 Đến ngày
                      </label>
                      <input
                        type="date"
                        value={dateFilter.end}
                        onChange={(e) => handleDateFilterChange('end', e.target.value)}
                        className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      />
                    </div>
                  </div>
          </div>

                {/* Results Summary */}
                {filteredPromotions.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <p className="text-blue-800 font-medium">
                        Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPromotions.length)} của {filteredPromotions.length} khuyến mãi
                      </p>
                      {(searchTerm || typeFilter || dateFilter.start || dateFilter.end) && (
                        <button
                          onClick={clearFilters}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                          title="Xóa bộ lọc"
                        >
                          <FaTimes className="inline mr-1" />
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Content */}
                {loading ? (
                  <div className="py-16">
                    <EmptyState isLoading description="Đang tải dữ liệu khuyến mãi..." />
                  </div>
                ) : paginatedPromotions.length > 0 ? (
                  <>
                    {/* Promotions List */}
                    <div className="space-y-6 mb-8">
                      {paginatedPromotions.map(renderPromotionRow)}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-6">
                        <nav className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-2 rounded font-medium ${
                              currentPage === 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            Trước
                          </button>
              
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      
                      return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded font-medium ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            {page}
                          </button>
                      );
                    })}

                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-2 rounded font-medium ${
                              currentPage === totalPages
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            Sau
                          </button>
                        </nav>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-16">
                    <EmptyState
                      title="Không có khuyến mãi"
                      description={
                        userType === "sale" && !selectedCustomer
                          ? "Vui lòng chọn khách hàng để xem khuyến mãi"
                          : "Hiện tại không có khuyến mãi nào phù hợp với bộ lọc của bạn"
                      }
                      actionLabel={searchTerm || typeFilter || dateFilter.start || dateFilter.end ? "Xóa bộ lọc" : undefined}
                      onAction={searchTerm || typeFilter || dateFilter.start || dateFilter.end ? clearFilters : undefined}
                    />
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <Footer />
      </Suspense>

      <Suspense fallback={<LoadingFallback />}>
        <Toolbar />
      </Suspense>

      {/* CartWeb is now managed globally */}
    </div>
  );
};

export default PromotionComponent;
