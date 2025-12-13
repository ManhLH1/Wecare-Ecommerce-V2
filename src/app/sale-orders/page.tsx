"use client";
import React, {
  useReducer,
  useCallback,
  useEffect,
  createContext,
  useContext,
  useState,
  useRef,
} from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Image from "next/image";
import Link from "next/link";
import LogoSvg from "@/assets/img/Logo-Wecare.png";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import SaleOrder from "../../app/sale-orders/sale-order/sale-order";
import SaleConfirm from "../../app/sale-orders/sale-confirm/sale-confirm";
import Cart from "../product-list/_components/cart/cart";
import Products from "../../../src/model/Product";
import CartProvider, { useCart } from "@/components/CartManager";
import { CartItem as CartItemInterface } from "@/model/interface/ProductCartData";
import PermissionGuard from "@/components/PermissionGuard";
import { FaHome, FaShippingFast, FaShoppingBag, FaUser } from "react-icons/fa";
import { getItem } from "@/utils/SecureStorage";

// Custom Header without search for Sale Orders page
const SaleOrdersHeader = ({ cartItemsCount, onCartClick }: { cartItemsCount: number; onCartClick: () => void }) => {
  const saleName = getItem("saleName") || "User";
  const userName = getItem("userName") || saleName;
  const userType = getItem("type") || "";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('id');
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('type');
        localStorage.removeItem('saleName');
        localStorage.removeItem('selectedCustomerId');
      } catch (e) {}
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group no-underline">
              <span className="rounded-full bg-white p-1 flex items-center justify-center w-12 h-12 shadow-sm border border-gray-100 group-hover:shadow-md transition-all duration-200">
                <Image src={LogoSvg} alt="Wecare Logo" width={36} height={36} className="object-contain" />
              </span>
              <span className="text-xl font-extrabold tracking-wide leading-tight select-none drop-shadow-sm no-underline group-hover:text-cyan-600 transition-colors duration-200">
                WECARE
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="/san-pham" className="no-underline text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-md px-2 py-1 transition-colors duration-200">Tất cả sản phẩm</a>
            <a href="/promotion" className="no-underline text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-md px-2 py-1 transition-colors duration-200">Khuyến mãi</a>
            <a href="/price-by-customer" className="no-underline text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-md px-2 py-1 transition-colors duration-200">Giá theo khách hàng</a>
            <a href="/sale-orders" className="no-underline text-blue-600 font-medium hover:bg-gray-50 rounded-md px-2 py-1 transition-colors duration-200">Sale Orders</a>
          </nav>

          {/* User + Cart */}
          <div className="flex items-center space-x-4" ref={menuRef}>
            <button
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md px-2 py-1 transition-colors"
              onClick={() => setMenuOpen(v => !v)}
            >
              <FaUser className="text-sm" />
              <span className="text-sm font-medium">{userName}</span>
            </button>
            <button onClick={onCartClick} className="relative">
              <FaShoppingBag className="text-gray-700 text-xl" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                  {cartItemsCount}
                </span>
              )}
            </button>
            {menuOpen && (
              <div className="absolute top-14 right-4 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm text-gray-500">Đăng nhập với</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                  {userType && <p className="text-xs text-gray-500 mt-0.5">Loại tài khoản: {userType}</p>}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-md"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// SalesManagementInterfaceContent component
const SalesManagementInterfaceContent = () => {
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart } =
    useCart();
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState<"saleorder" | "sale_confirm">("saleorder");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    value: string;
    label: string;
  } | null>(null);

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const handleCustomerSelect = useCallback(
    (customer: { value: string; label: string } | null) => {
      setSelectedCustomer(customer);
      clearCart();
    },
    [clearCart]
  );

  const handleSearch = useCallback((term: string) => {
    // Search disabled on this page header
  }, []);

  // Updated cartItemsCount calculation
  const cartItemsCount = cartItems.length;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <SaleOrdersHeader cartItemsCount={cartItemsCount} onCartClick={toggleCart} />
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        customerSelectId={selectedCustomer?.value || ""}
        onClearCart={clearCart}
        items={cartItems.map(item => ({ ...item, isApplyPromotion: false })) as unknown as CartItemInterface[]}
        customerId={""}
      />
      <main className="px-1 sm:px-2 pt-20 flex-1">
        {!isLoggedIn ? (
          <section className="bg-slate-100">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Yêu cầu đăng nhập</h2>
                <p className="text-gray-600">Vui lòng đăng nhập để truy cập nội dung của trang web.</p>
                <a href="/login" className="mt-6 inline-block bg-customBlue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300">Đến trang đăng nhập</a>
              </div>
            </div>
          </section>
        ) : (
          <PermissionGuard 
            requiredSalesFlow="SALE_ORDER"
            fallback={
              <div className="text-center py-8">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  <h3 className="font-bold">Thông báo</h3>
                  <p>Chức năng này chỉ dành cho nhân viên Direct. Vui lòng sử dụng Price by Customer để xem giá.</p>
                </div>
              </div>
            }
          >
          <section className="py-4 px-2 sm:px-4 bg-white mb-3 drop-shadow-lg inset-shadow-3xs rounded-lg">
            <div className="p-3">
               {/* Breadcrumb */}
               <nav className="flex items-center text-sm text-gray-500 mb-2 gap-1" aria-label="Breadcrumb">
                 <FaHome className="inline mr-1 text-blue-500" />
                 <span className="mx-1">/</span>
                 <FaShippingFast className="inline text-blue-500" />
                 <span className="text-gray-700 font-semibold">Sale Orders</span>
               </nav>
              {/* Tiêu đề và mô tả */}
              <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2"><FaShippingFast className="text-blue-500" /> Quản lý Sale Orders</h2>
              <p className="text-gray-500 mb-4">Tạo, xác nhận và quản lý các đơn hàng bán hàng của bạn.</p>
              {/* Tab chuyển đổi */}
              <div className="flex space-x-4 w-full mb-4 border-b border-gray-200 overflow-x-auto">
                <button
                  className={`py-2 px-4 w-1/2 md:w-auto transition-all duration-200 rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${activeTab === "saleorder" ? "border-b-2 border-blue-500 font-bold text-blue-700 bg-blue-50" : "text-gray-700 hover:bg-gray-50"}`}
                  onClick={() => setActiveTab("saleorder")}
                >
                  Sale Order
                </button>
                <button
                  className={`py-2 px-4 w-1/2 md:w-auto transition-all duration-200 rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${activeTab === "sale_confirm" ? "border-b-2 border-blue-500 font-bold text-blue-700 bg-blue-50" : "text-gray-700 hover:bg-gray-50"}`}
                  onClick={() => setActiveTab("sale_confirm")}
                >
                  Sale Confirm
                </button>
              </div>
              {/* Nội dung tab */}
              <div className="w-full">
                {activeTab === "saleorder" && (
                  <SaleOrder addToCart={addToCart} onCustomerSelect={handleCustomerSelect} selectedCustomer={selectedCustomer} />
                )}
                {activeTab === "sale_confirm" && <SaleConfirm />}
              </div>
            </div>
          </section>
          </PermissionGuard>
        )}
      </main>
      <Toolbar />
      <Footer />
    </div>
  );
};

// Main SalesManagementInterface component
const SalesManagementInterface = () => {
  return (
    <CartProvider>
      <SalesManagementInterfaceContent />
    </CartProvider>
  );
};

export default SalesManagementInterface;
