'use client';

import React, { useState, useEffect } from "react";
import {
  FaFireAlt,
  FaNewspaper,
  FaProductHunt,
  FaClock,
  FaTag,
  FaMoneyBill,
  FaShoppingCart,
  FaUserTie,
} from "react-icons/fa";
import { getItem } from "@/utils/SecureStorage";

interface DesktopSubHeaderProps {
  className?: string;
  categoryRef: React.RefObject<HTMLDivElement>;
  showCategoryDropdown: boolean;
  onCategoryToggle: () => void;
  loadingCategory: boolean;
  renderCategoryMenu: () => React.ReactNode;
}

const DesktopSubHeader: React.FC<DesktopSubHeaderProps> = ({
  className = "",
  categoryRef,
  showCategoryDropdown,
  onCategoryToggle,
  loadingCategory,
  renderCategoryMenu,
}) => {
  const [userType, setUserType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Thêm loading state

  useEffect(() => {
    // Chỉ chạy trên client-side
    if (typeof window !== 'undefined') {
      setUserType(getItem('type'));
      setIsLoading(false); // Đã kiểm tra xong
    }
  }, []);

  // "customer", "sale", or null
  const isLoggedIn = !!userType;
  
  return (
    <div
      className={`${className} w-full bg-white flex items-center px-10 relative shadow-sm`}
      style={{ marginTop: 65, height: 50 }}
    >
      <div className="flex items-center h-full">
        {/* Nút Danh mục */}
        <div ref={categoryRef} className="relative h-full flex items-center">
          <button
            className="flex items-center gap-2 text-[#049DBF] font-bold text-base px-3 py-2 focus:outline-none hover:text-orange-600 bg-transparent border-none shadow-none rounded-none transition-colors group"
            onClick={onCategoryToggle}
            // onMouseEnter={onCategoryToggle}
            style={{ background: "transparent" }}
          >
            <svg
              className="w-6 h-6 group-hover:text-orange-500 transition-colors"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span className="group-hover:text-orange-600 transition-colors">Danh mục</span>
            <svg
              className="w-4 h-4 ml-1 group-hover:text-orange-500 transition-colors"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showCategoryDropdown && (
            <div
              className="absolute left-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-[#04B2D9] z-50 animate-fadeIn max-h-[70vh] p-2 overflow-y-auto overflow-x-hidden scrollbar-none"
              style={{ 
                scrollbarWidth: "none", 
                msOverflowStyle: "none",
                left: "0px",
                width: "auto",
                minWidth: "280px",
                maxWidth: "1100px"
              }}
            >
              {/* Hide scrollbar for Webkit browsers */}
              <style>{`
                .scrollbar-none::-webkit-scrollbar { display: none; }
              `}</style>
              {loadingCategory ? (
                <div className="text-center py-6 text-[#04A1B3]">
                  Đang tải...
                </div>
              ) : (
                renderCategoryMenu()
              )}
            </div>
          )}
        </div>

        {/* Sọc đứng ngăn cách */}
        <div className="h-6 w-px bg-gray-200 mx-4" />

        {/* Navigation Links */}
        <div className="flex items-center gap-8 ml-auto">
          <a
            href="/san-pham"
            className="flex items-center gap-2 text-gray-700 font-medium hover:text-orange-600 transition-colors no-underline group"
          >
            <FaProductHunt className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
            <span className="group-hover:text-orange-600 transition-colors">Tất cả sản phẩm</span>
          </a>
          <a
            href="/top-san-pham-ban-chay"
            className="flex items-center gap-2 text-gray-700 font-medium hover:text-orange-600 transition-colors no-underline group"
          >
            <FaFireAlt className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
            <span className="group-hover:text-orange-600 transition-colors">Sản phẩm bán chạy</span>
          </a>
          
          {/* Hiển thị theo trạng thái đăng nhập và loại user */}
          {isLoading ? (
            // Hiển thị skeleton loading cho menu items
            <>
              <div className="h-6 w-20 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-6 w-28 bg-gray-200 animate-pulse rounded"></div>
            </>
          ) : (
            <>
              {isLoggedIn && userType === "customer" && (
                <>
                  <a
                    href="/promotion"
                    className="flex items-center gap-2 text-gray-700 font-medium hover:text-orange-600 transition-colors no-underline group"
                  >
                    <FaTag className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                    <span className="group-hover:text-orange-600 transition-colors">Khuyến mãi</span>
                  </a>
                  <a
                    href="/history-order"
                    className="flex items-center gap-2 text-gray-700 font-medium hover:text-orange-600 transition-colors no-underline group"
                  >
                    <FaClock className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                    <span className="group-hover:text-orange-600 transition-colors">Lịch sử đơn hàng</span>
                  </a>
                  <a
                    href="/history-payment"
                    className="flex items-center gap-2 text-gray-700 font-medium hover:text-orange-600 transition-colors no-underline group"
                  >
                    <FaMoneyBill className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                    <span className="group-hover:text-orange-600 transition-colors">Lịch sử thanh toán</span>
                  </a>
                </>
              )}
              
              {isLoggedIn && userType === "saledirect" && (
                <>
                  <a
                    href="/sale-orders"
                    className="flex items-center gap-2 text-gray-700 font-medium hover:text-orange-600 transition-colors no-underline group"
                  >
                    <FaShoppingCart className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                    <span className="group-hover:text-orange-600 transition-colors">Đặt hàng</span>
                  </a>
                </>
              )}
              {isLoggedIn && userType === "saleonline" && (
                <a
                  href="/price-by-customer"
                  className="flex items-center gap-2 text-gray-700 font-medium hover:text-orange-600 transition-colors no-underline group"
                >
                  <FaUserTie className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                  <span className="group-hover:text-orange-600 transition-colors">Giá theo khách hàng</span>
                </a>
              )}
            </>
          )}
          
          <a
            href="/post"
            className="flex items-center gap-2 text-gray-700 font-medium hover:text-orange-600 transition-colors no-underline group"
          >
            <FaNewspaper className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
            <span className="group-hover:text-orange-600 transition-colors">Tin tức</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DesktopSubHeader;
