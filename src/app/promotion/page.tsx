"use client";

import React, { useEffect, useState, useCallback, Suspense, useMemo, useContext } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import img from "../promotion.png";
import { getItem, setItem } from "@/utils/SecureStorage";
import Select from "react-select";
import { FaUser, FaSearch, FaCalendarAlt, FaTag, FaGift, FaCreditCard, FaPercent, FaFilter, FaClock, FaTimes, FaTruck, FaShieldAlt, FaUndo, FaMoneyBillWave, FaStar, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { formatDateToDDMMYYYY } from '@/utils/utils';
import { useCart } from "@/components/CartManager";
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

// Benefits Bar Component
const BenefitsBar = () => (
  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <FaUndo className="text-yellow-300" />
          </div>
          <div className="text-center md:text-left">
            <div className="font-bold text-sm">ĐỔI TRẢ</div>
            <div className="text-xs opacity-90">TRONG 10 NGÀY</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <FaTruck className="text-yellow-300" />
          </div>
          <div className="text-center md:text-left">
            <div className="font-bold text-sm">FREE SHIP</div>
            <div className="text-xs opacity-90">NỘI THÀNH</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <FaShieldAlt className="text-yellow-300" />
          </div>
          <div className="text-center md:text-left">
            <div className="font-bold text-sm">HÀNG</div>
            <div className="text-xs opacity-90">CHÍNH HÃNG</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <FaMoneyBillWave className="text-yellow-300" />
          </div>
          <div className="text-center md:text-left">
            <div className="font-bold text-sm">THANH TOÁN</div>
            <div className="text-xs opacity-90">KHI NHẬN HÀNG</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Promotion Card Component - Style like dienmayhoanglien
const PromotionCard = ({ promotion, onViewDetail }: { promotion: PromotionData & { customerGroupName?: string }, onViewDetail: (id: string) => void }) => {
  const discountPercent = promotion.vn === 191920000 ? promotion.value : Math.round((promotion.value / 1000000) * 10);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* Badge */}
      <div className="relative">
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-2 py-1 rounded text-xs font-bold">
            MUA ONLINE
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-b text-lg font-bold -mt-0.5">
            {discountPercent}%
          </div>
        </div>

        {/* Image */}
        <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          {promotion.image ? (
            <Image
              src={promotion.image}
              alt={promotion.name}
              width={150}
              height={120}
              className="object-contain max-h-32 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Image
              src={img}
              alt="Khuyến mãi"
              width={150}
              height={120}
              className="object-contain max-h-32 opacity-60"
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px] mb-2 group-hover:text-blue-600 transition-colors">
          {promotion.name}
        </h3>

        {/* Price */}
        <div className="mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-red-600">
              {promotion.value.toLocaleString('vi-VN')}
              <span className="text-sm">{promotion.vn === 191920000 ? '%' : 'đ'}</span>
            </span>
          </div>
          {promotion.value2 && (
            <div className="text-xs text-gray-400 line-through">
              {promotion.value2.toLocaleString('vi-VN')}đ
            </div>
          )}
        </div>

        {/* Rating & Sold - Mock data */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <FaStar key={i} className={i < 4 ? "text-yellow-400" : "text-gray-300"} size={10} />
            ))}
            <span className="ml-1">(đánh giá)</span>
          </div>
        </div>

        {/* Progress bar - Sold */}
        <div className="bg-orange-100 rounded-full h-5 relative overflow-hidden">
          <div
            className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full transition-all duration-500"
            style={{ width: '65%' }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white drop-shadow">
            Đã áp dụng nhiều lần
          </span>
        </div>

        {/* Date */}
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <FaClock size={10} />
          <span>
            {formatDateToDDMMYYYY(promotion.startDate)}
            {promotion.endDate && ` - ${formatDateToDDMMYYYY(promotion.endDate)}`}
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onViewDetail(promotion.promotionId)}
          className="w-full mt-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 rounded-lg font-medium text-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
        >
          Xem chi tiết
        </button>
      </div>
    </div>
  );
};

const PromotionComponent = () => {
  // State declarations
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [listcustomers, setListcustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Pagination and filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Get cart context
  const { cartItems } = useCart();
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
      return matchesSearch && matchesType;
    });
  }, [allPromotions, searchTerm, typeFilter]);

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

  // Fetch promotions function
  const fetchPromotions = useCallback(async (id: string | null) => {
    try {
      setLoading(true);
      if (!id) {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDetail = (promotionId: string) => {
    window.location.href = `/promotion/detail/${promotionId}`;
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

  // Main render
  return (
    <div className="bg-gray-100 min-h-screen flex flex-col overflow-x-hidden">
      {/* Header */}
      <Suspense fallback={<LoadingFallback />}>
        <JDStyleHeader
          cartItemsCount={cartItems.length}
          onSearch={handleSearch}
          onCartClick={openCart}
        />
      </Suspense>

      {/* Benefits Bar */}
      <div style={{ paddingTop: '120px' }}>
        <BenefitsBar />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        {/* Page Title */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaGift className="text-red-500" />
                Khuyến Mãi Đặc Biệt
              </h1>
              <p className="text-gray-600 mt-1">Khám phá những ưu đãi hấp dẫn dành cho bạn</p>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Tìm kiếm khuyến mãi..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Selection for Sales Users */}
        {(userType === "sale" || userType === "saledirect" || userType === "saleonline") && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FaUser className="mr-2 text-blue-600" />
              Chọn khách hàng để xem khuyến mãi
            </h3>
            {loadingCustomers ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Đang tải...</span>
              </div>
            ) : customerError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {customerError}
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
                placeholder="Chọn khách hàng..."
                filterOption={customFilter}
                className="text-sm"
              />
            )}
          </div>
        )}

        {/* Filter Tabs */}
        {promotionTypes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setTypeFilter(""); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!typeFilter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Tất cả ({allPromotions.length})
              </button>
              {promotionTypes.map(type => (
                <button
                  key={type}
                  onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${typeFilter === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {type} ({allPromotions.filter(p => p.type === type).length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Banner - Only show on desktop */}
          <div className="hidden lg:block lg:w-72 flex-shrink-0">
            <div className="bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg p-6 text-white sticky top-32">
              <div className="text-center">
                <div className="text-4xl mb-2">🎉</div>
                <h2 className="text-xl font-bold mb-2">SIÊU KHUYẾN MÃI</h2>
                <p className="text-blue-100 text-sm mb-4">Giảm giá cực sốc cho tất cả sản phẩm</p>
                <div className="bg-white/20 rounded-lg p-4 mb-4">
                  <div className="text-4xl font-bold text-yellow-300">
                    {filteredPromotions.length}
                  </div>
                  <div className="text-sm">Khuyến mãi đang diễn ra</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FaGift className="text-yellow-300" />
                    <span>Ưu đãi đặc biệt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaTruck className="text-yellow-300" />
                    <span>Freeship nội thành</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaShieldAlt className="text-yellow-300" />
                    <span>Hàng chính hãng</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm p-12">
                <EmptyState isLoading description="Đang tải khuyến mãi..." />
              </div>
            ) : filteredPromotions.length > 0 ? (
              <>
                {/* Results count */}
                <div className="bg-white rounded-lg shadow-sm px-4 py-3 mb-4 flex items-center justify-between">
                  <span className="text-gray-600 text-sm">
                    Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPromotions.length)} của {filteredPromotions.length} khuyến mãi
                  </span>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <FaTimes size={12} /> Xóa tìm kiếm
                    </button>
                  )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedPromotions.map((promotion) => (
                    <PromotionCard
                      key={promotion.promotionId}
                      promotion={promotion}
                      onViewDetail={handleViewDetail}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg ${currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        <FaChevronLeft />
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
                            className={`w-10 h-10 rounded-lg font-medium ${currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            {page}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg ${currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        <FaChevronRight />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12">
                <EmptyState
                  title="Không có khuyến mãi"
                  description={
                    userType === "sale" && !selectedCustomer
                      ? "Vui lòng chọn khách hàng để xem khuyến mãi"
                      : "Hiện tại không có khuyến mãi nào"
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <Footer />
      </Suspense>

      <Suspense fallback={<LoadingFallback />}>
        <Toolbar />
      </Suspense>
    </div>
  );
};

export default PromotionComponent;
