import { getItem } from "@/utils/SecureStorage";
import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaInfoCircle,
  FaSignOutAlt,
  FaCreditCard,
  FaShoppingCart,
} from "react-icons/fa";
import { usePermission } from "@/hooks/usePermission";

export default function UserIconWithMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const { permission } = usePermission();

  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập và lấy tên người dùng từ localStorage
    const checkLoginStatus = () => {
      const storedName = getItem("userName");
      const hasId = getItem("id");
      const hasToken = getItem("token");
      const type = getItem("type");
      const loggedIn = !!(storedName || hasId || hasToken); // Xác định đã đăng nhập chưa

      setUserName(storedName);
      setUserType(type);
      setIsLoggedIn(loggedIn);
    };

    checkLoginStatus();

    // Lắng nghe sự kiện storage để cập nhật khi đăng nhập/đăng xuất ở tab khác
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userName" || e.key === "id" || e.key === "token" || e.key === "type") {
        checkLoginStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !target.closest('.user-menu-container')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const toggleMenu = () => {
    if (isLoggedIn) {
      setIsMenuOpen((prev) => !prev);
    } else {
      // Điều hướng đến form đăng nhập nếu chưa đăng nhập
      window.location.href = "/login";
    }
  };

  const handleOptionClick = (path: string) => {
    if (path === "/logout") {
      // Xóa tất cả các mục trong localStorage khi đăng xuất
      localStorage.clear();
      setUserName(null);
      setIsLoggedIn(false);
      setIsMenuOpen(false);
      // Điều hướng về trang chủ sau khi đăng xuất
      window.location.href = "/";
    } else {
      setIsMenuOpen(false);
      window.location.href = path;
    }
  };

  return (
    <div className="relative d-none d-sm-block user-menu-container">
      <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity duration-200 min-w-0" onClick={toggleMenu}>
        <FaUser className="mx-1" style={{ fontSize: "1.25rem", color: '#f97316' }} />
        {userName && (
          <span
            className="ml-1 text-orange-600 font-semibold hidden sm:block truncate max-w-[5rem] sm:max-w-[6rem] md:max-w-[8rem] lg:max-w-[10rem] xl:max-w-[12rem]"
            style={{
              fontSize: "clamp(0.60rem, 1.1vw, 0.75rem)",
              marginRight: "0px"
            }}
            title={userName}
          >
            {userName}
          </span>
        )}
      </div>
      {isLoggedIn && isMenuOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <ul className="py-2">
            <li
              className="py-2 hover:bg-gray-100 cursor-pointer flex items-center"
              onClick={() => handleOptionClick("/profile-customer")}
            >
              <FaInfoCircle className="ml mr-3" /> Thông tin
            </li>
            
            {/* Show "Sản phẩm của tôi" for customers only */}
            {userType === "customer" && (
              <li
                className="py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleOptionClick("/product-list")}
              >
                <FaShoppingCart className="ml-1 mr-3" /> Sản phẩm của tôi
              </li>
            )}
            
            {/* Show "Giá theo khách hàng" for Sale Online only */}
            {userType === "saleonline" && (
              <li
                className="py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleOptionClick("/price-by-customer")}
              >
                <FaCreditCard className="ml-1 mr-3" /> Giá theo khách hàng
              </li>
            )}
            
            {/* Show "Đặt hàng" for Sale Direct only */}
            {userType === "saledirect" && (
              <li
                className="py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleOptionClick("/sale-orders")}
              >
                <FaShoppingCart className="ml-1 mr-3" /> Đặt hàng
              </li>
            )}
            
            {/* Show payment history for customers only */}
            {userType === "customer" && (
              <li
                className="py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleOptionClick("/history-payment")}
              >
                <FaCreditCard className="ml-1 mr-3" /> Lịch sử thanh toán
              </li>
            )}
            
            <li
              className="py-2 hover:bg-gray-100 cursor-pointer flex items-center"
              onClick={() => handleOptionClick("/logout")}
            >
              <FaSignOutAlt className="ml-1 mr-3" /> Đăng xuất
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
