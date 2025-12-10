import React, { useState, useEffect } from "react";
import { FaShoppingCart, FaTag, FaPager, FaBox, FaHome, FaHistory, FaMoneyBillWave, FaNewspaper, FaUser } from "react-icons/fa";
import UserIconWithMenu from "@/components/LoginMenuMobie";
import Image from "next/image";
import LogoSvg from "@/assets/img/logo.svg";
import { getItem, setItem } from "@/utils/SecureStorage";

const Toolbar = () => {
  const [isActivepromotion, setIsActivepromotion] = useState(false);
  const [isActiveproductlist, setIsActiveproductlist] = useState(false);
  const [isActivesaleorders, setIsActivesaleorders] = useState(false);
  const [isActivemain, setIsActivemain] = useState(false);
  const [isActiveproduct, setIsActiveproduct] = useState(false);
  const [isActiveTopProducts, setIsActiveTopProducts] = useState(false);
  const [isActiveHistoryOrder, setIsActiveHistoryOrder] = useState(false);
  const [isActiveHistoryPayment, setIsActiveHistoryPayment] = useState(false);
  const [isActivePriceByCustomer, setIsActivePriceByCustomer] = useState(false);
  const [isActiveNews, setIsActiveNews] = useState(false);
  const [typelogin, setTypelogin] = useState("");

  useEffect(() => {
    // Kiểm tra đường dẫn hiện tại
    setIsActivepromotion(window.location.pathname === "/promotion");
    setIsActivesaleorders(window.location.pathname === "/sale-orders");
    setIsActiveproduct(window.location.pathname === "/san-pham");
    setIsActiveproductlist(window.location.pathname === "/product-list");
    setIsActiveTopProducts(window.location.pathname === "/top-san-pham-ban-chay");
    setIsActiveHistoryOrder(window.location.pathname === "/history-order");
    setIsActiveHistoryPayment(window.location.pathname === "/history-payment");
    setIsActivePriceByCustomer(window.location.pathname === "/price-by-customer");
    setIsActiveNews(window.location.pathname === "/post");
    setIsActiveproductlist(
      window.location.pathname === "/product-list" && getItem("temple") == "my"
    );
    setIsActivemain(
      window.location.pathname === "/" ||
        (window.location.pathname === "/product-list" &&
          getItem("temple") == "all")
    );
  }, []);
  useEffect(() => {
    const type_login = getItem("type") || "";
    setTypelogin(type_login);
  }, []);

  // Function to get menu items based on user type - same logic as JDStyleHeader
  const getMenuItems = () => {
    const baseItems = [
      { href: "/san-pham", label: "Sản phẩm", icon: FaBox, isActive: isActiveproduct },
      { href: "/top-san-pham-ban-chay", label: "Bán chạy", icon: FaTag, isActive: isActiveTopProducts },
    ];

    // Add user-specific items based on type
    if (typelogin === "customer") {
      const customerItems = [
        ...baseItems,
        { href: "/product-list", label: "Sản phẩm của tôi", icon: FaUser, isActive: isActiveproductlist },
        { href: "/promotion", label: "Khuyến mãi", icon: FaTag, isActive: isActivepromotion },
        { href: "/post", label: "Tin tức", icon: FaNewspaper, isActive: isActiveNews },
      ];
      console.log("Toolbar - Customer menu items:", customerItems); // Debug log
      return customerItems;
    } else if (typelogin === "saleonline") {
      // Sale Online: Có thể xem giá, không thể tạo đơn hàng
      return [
        { href: "/san-pham", label: "Sản phẩm", icon: FaBox, isActive: isActiveproduct },
        { href: "/promotion", label: "Khuyến mãi", icon: FaTag, isActive: isActivepromotion },
        { href: "/price-by-customer", label: "Giá KH", icon: FaMoneyBillWave, isActive: isActivePriceByCustomer },
        { href: "/post", label: "Tin tức", icon: FaNewspaper, isActive: isActiveNews },
      ];
    } else if (typelogin === "saledirect") {
      // Sale Direct: Có thể tạo đơn hàng, không thể xem lịch sử
      return [
        { href: "/san-pham", label: "Sản phẩm", icon: FaBox, isActive: isActiveproduct },
        { href: "/promotion", label: "Khuyến mãi", icon: FaTag, isActive: isActivepromotion },
        { href: "/sale-orders", label: "Đặt hàng", icon: FaShoppingCart, isActive: isActivesaleorders },
        { href: "/post", label: "Tin tức", icon: FaNewspaper, isActive: isActiveNews },
      ];
    } else if (typelogin === "sale") {
      // Sale thường: Chỉ có menu cơ bản
      return [
        ...baseItems,
        { href: "/post", label: "Tin tức", icon: FaNewspaper, isActive: isActiveNews },
      ];
    }

    // Default items for non-logged in users
    const defaultItems = [
      ...baseItems,
      { href: "/promotion", label: "Khuyến mãi", icon: FaTag, isActive: isActivepromotion },
      { href: "/post", label: "Tin tức", icon: FaNewspaper, isActive: isActiveNews },
    ];
    console.log("Toolbar - Default menu items:", defaultItems); // Debug log
    return defaultItems;
  };
  const menuItems = getMenuItems();

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Background with gradient and blur effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white to-white/95 backdrop-blur-md dark:from-gray-900 dark:via-gray-800 dark:to-gray-800/95"></div>
        
        {/* Border with gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600"></div>
        
        {/* Shadow overlay */}
        <div className="absolute inset-0 shadow-2xl shadow-black/10 dark:shadow-black/30"></div>
        
        {/* Content */}
        <div className="relative flex justify-around items-center px-2 py-3">
          {/* Home button - always show */}
          <button
            className={`group flex flex-col items-center justify-center min-w-0 flex-1 transition-all duration-300 ease-out ${
              isActivemain 
                ? "text-customBlue scale-110" 
                : "text-gray-600 dark:text-gray-400 hover:text-customBlue hover:scale-105"
            }`}
            onClick={() => {
              setItem("temple", "all");
              window.location.href = "/";
            }}
          >
            <div className={`relative p-2 rounded-full transition-all duration-300 ${
              isActivemain 
                ? "bg-customBlue/10 dark:bg-customBlue/20" 
                : "group-hover:bg-customBlue/5 dark:group-hover:bg-customBlue/10"
            }`}>
              <FaHome className={`transition-all duration-300 ${
                isActivemain ? "text-customBlue" : "text-gray-600 dark:text-gray-400 group-hover:text-customBlue"
              }`} style={{ fontSize: "1.3rem" }} />
              {isActivemain && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-customBlue rounded-full animate-pulse"></div>
              )}
            </div>
            <span className={`text-xs mt-1 font-medium transition-all duration-300 ${
              isActivemain 
                ? "text-customBlue" 
                : "text-gray-600 dark:text-gray-400 group-hover:text-customBlue"
            }`}>
              Trang chủ
            </span>
          </button>

          {/* Dynamic menu items based on user type */}
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <button
                key={index}
                className={`group flex flex-col items-center justify-center min-w-0 flex-1 transition-all duration-300 ease-out ${
                  item.isActive 
                    ? "text-customBlue scale-110" 
                    : "text-gray-600 dark:text-gray-400 hover:text-customBlue hover:scale-105"
                }`}
                onClick={() => {
                  if (item.href === "/sale-orders" || item.href === "/product-list") {
                    setItem("temple", "my");
                  }
                  window.location.href = item.href;
                }}
              >
                <div className={`relative p-2 rounded-full transition-all duration-300 ${
                  item.isActive 
                    ? "bg-customBlue/10 dark:bg-customBlue/20" 
                    : "group-hover:bg-customBlue/5 dark:group-hover:bg-customBlue/10"
                }`}>
                  <IconComponent className={`transition-all duration-300 ${
                    item.isActive ? "text-customBlue" : "text-gray-600 dark:text-gray-400 group-hover:text-customBlue"
                  }`} style={{ fontSize: "1.3rem" }} />
                  {item.isActive && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-customBlue rounded-full animate-pulse"></div>
                  )}
                </div>
                <span className={`text-xs mt-1 font-medium transition-all duration-300 ${
                  item.isActive 
                    ? "text-customBlue" 
                    : "text-gray-600 dark:text-gray-400 group-hover:text-customBlue"
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* User menu - always show */}
          <div className="flex flex-col items-center justify-center min-w-0 flex-1">
            <UserIconWithMenu />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
