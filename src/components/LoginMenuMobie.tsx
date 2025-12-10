import { getItem } from "@/utils/SecureStorage";
import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaInfoCircle,
  FaSignOutAlt,
  FaTag,
  FaCreditCard,
  FaHistory,
  FaPager,
} from "react-icons/fa";

export default function UserIconWithMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isActivelogin, setIsActivelogin] = useState(false);

  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập và lấy tên người dùng từ localStorage
    const checkLoginStatus = () => {
      const storedName = getItem("userName");
      const hasId = getItem("id");
      const hasToken = getItem("token");
      const loggedIn = !!(storedName || hasId || hasToken); // Xác định đã đăng nhập chưa

      setIsLoggedIn(loggedIn);
      setIsActivelogin(window.location.pathname === "/login");
    };

    checkLoginStatus();

    // Lắng nghe sự kiện storage để cập nhật khi đăng nhập/đăng xuất ở tab khác
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userName" || e.key === "id" || e.key === "token") {
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
      if (isMenuOpen && !target.closest('.user-menu-mobile-container')) {
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
      // Xử lý đăng xuất
      localStorage.clear();
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
    <div className="relative user-menu-mobile-container">
      <button
        className={`group flex flex-col items-center justify-center transition-all duration-300 ease-out ${
          isMenuOpen || isActivelogin 
            ? "text-customBlue scale-110" 
            : "text-gray-600 dark:text-gray-400 hover:text-customBlue hover:scale-105"
        }`}
        onClick={toggleMenu}
      >
        <div className={`relative p-2 rounded-full transition-all duration-300 ${
          isMenuOpen || isActivelogin 
            ? "bg-customBlue/10 dark:bg-customBlue/20" 
            : "group-hover:bg-customBlue/5 dark:group-hover:bg-customBlue/10"
        }`}>
          <FaUser className={`transition-all duration-300 ${
            isMenuOpen || isActivelogin ? "text-customBlue" : "text-gray-600 dark:text-gray-400 group-hover:text-customBlue"
          }`} style={{ fontSize: "1.3rem" }} />
          {(isMenuOpen || isActivelogin) && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-customBlue rounded-full animate-pulse"></div>
          )}
        </div>
        <span className={`text-xs mt-1 font-medium transition-all duration-300 ${
          isMenuOpen || isActivelogin 
            ? "text-customBlue" 
            : "text-gray-600 dark:text-gray-400 group-hover:text-customBlue"
        }`}>
          Tài khoản
        </span>
      </button>

      {isLoggedIn && isMenuOpen && (
        <div className="absolute right-0 bottom-full mb-3 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 rounded-xl shadow-2xl shadow-black/20 dark:shadow-black/40 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-customBlue/5 to-customBlue/10 dark:from-customBlue/10 dark:to-customBlue/20 border-b border-gray-200/50 dark:border-gray-600/50">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Menu tài khoản</p>
          </div>
          
          {/* Menu items */}
          <ul className="py-2">
            <li
              className="px-4 py-3 hover:bg-customBlue/5 dark:hover:bg-customBlue/10 cursor-pointer flex items-center transition-all duration-200 group"
              onClick={() => handleOptionClick("/profile-customer")}
            >
              <FaInfoCircle className="ml-1 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-customBlue transition-colors duration-200" /> 
              <span className="text-gray-700 dark:text-gray-300 group-hover:text-customBlue transition-colors duration-200">Thông tin</span>
            </li>
            <li
              className="px-4 py-3 hover:bg-customBlue/5 dark:hover:bg-customBlue/10 cursor-pointer flex items-center transition-all duration-200 group"
              onClick={() => handleOptionClick("/history-payment")}
            >
              <FaCreditCard className="ml-1 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-customBlue transition-colors duration-200" /> 
              <span className="text-gray-700 dark:text-gray-300 group-hover:text-customBlue transition-colors duration-200">Lịch sử thanh toán</span>
            </li>
            <li
              className="px-4 py-3 hover:bg-customBlue/5 dark:hover:bg-customBlue/10 cursor-pointer flex items-center transition-all duration-200 group"
              onClick={() => handleOptionClick("/history-order")}
            >
              <FaHistory className="ml-1 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-customBlue transition-colors duration-200" /> 
              <span className="text-gray-700 dark:text-gray-300 group-hover:text-customBlue transition-colors duration-200">Lịch sử đặt hàng</span>
            </li>
            <li
              className="px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer flex items-center transition-all duration-200 group border-t border-gray-200/50 dark:border-gray-600/50 mt-2"
              onClick={() => handleOptionClick("/logout")}
            >
              <FaSignOutAlt className="ml-1 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-red-500 transition-colors duration-200" /> 
              <span className="text-gray-700 dark:text-gray-300 group-hover:text-red-500 transition-colors duration-200">Đăng xuất</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
