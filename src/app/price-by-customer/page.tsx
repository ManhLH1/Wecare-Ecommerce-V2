"use client";
import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import PriceViewer from "./price-viewer";
import PermissionGuard from "@/components/PermissionGuard";
import { FaHome, FaUserTie, FaShoppingBag, FaUser } from "react-icons/fa";
import { getItem } from "@/utils/SecureStorage";
import Image from "next/image";
import Link from "next/link";
import LogoSvg from "@/assets/img/Logo-Wecare.png";
import CartProvider, { useCart } from "@/components/CartManager";
import Cart from "../product-list/_components/cart/cart";
import { CartItem as CartItemInterface } from "@/model/interface/ProductCartData";

// Custom Header without search for Price by Customer page
const PriceByCustomerHeader = memo(({ cartItemsCount, onCartClick }: { cartItemsCount: number; onCartClick: () => void }) => {
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
            <Link href="/" className="flex items-center space-x-3 group">
              <span className="rounded-full bg-white p-1 flex items-center justify-center w-12 h-12 shadow-sm border border-gray-100 group-hover:shadow-md transition-all duration-200">
                <Image
                  src={LogoSvg}
                  alt="Wecare Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </span>
              <span className="text-xl font-extrabold tracking-wide leading-tight select-none drop-shadow-sm no-underline group-hover:text-cyan-600 transition-colors duration-200">
                WECARE
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="/san-pham" className="no-underline text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-md px-2 py-1 transition-colors duration-200">
              Tất cả sản phẩm
            </a>
            <a href="/top-san-pham-ban-chay" className="no-underline text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-md px-2 py-1 transition-colors duration-200">
              Sản phẩm bán chạy
            </a>
            <a href="/promotion" className="no-underline text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-md px-2 py-1 transition-colors duration-200">
              Khuyến mãi
            </a>
            <a href="/price-by-customer" className="no-underline text-blue-600 font-medium hover:bg-gray-50 rounded-md px-2 py-1 transition-colors duration-200">
              Giá theo khách hàng
            </a>
            <a href="/post" className="no-underline text-gray-600 hover:text-cyan-600 hover:bg-gray-50 rounded-md px-2 py-1 transition-colors duration-200">
              Tin tức
            </a>
          </nav>

          {/* User Info */}
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
});

PriceByCustomerHeader.displayName = 'PriceByCustomerHeader';

// Memoized Header Section Component
const HeaderSection = memo(() => (
  <section className="py-4 pr-10 bg-white mb-3 drop-shadow-lg inset-shadow-3xs rounded-lg">
    <div className="p-3">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 mb-2 gap-1" aria-label="Breadcrumb">
        <FaHome className="inline mr-1 text-blue-500" />
        <span className="mx-1">/</span>
        <FaUserTie className="inline text-purple-500" />
        <span className="text-gray-700 font-semibold">Price by Customer</span>
      </nav>
      
      {/* Title and Description */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
          <FaUserTie className="text-white text-xl" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaUserTie className="text-purple-500" /> 
            Price by Customer
          </h2>
          <p className="text-gray-500">Xem giá sản phẩm theo từng khách hàng</p>
        </div>
      </div>
    </div>
  </section>
));

HeaderSection.displayName = 'HeaderSection';

// Memoized Login Required Section
const LoginRequiredSection = memo(() => (
  <section className="bg-slate-100">
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-8 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
            <FaUserTie className="text-purple-600 text-2xl" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Yêu cầu đăng nhập</h2>
        <p className="text-gray-600 mb-6">Vui lòng đăng nhập để truy cập nội dung của trang web.</p>
        <a 
          href="/login" 
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md hover:shadow-lg"
        >
          Đến trang đăng nhập
        </a>
      </div>
    </div>
  </section>
));

LoginRequiredSection.displayName = 'LoginRequiredSection';

// Main Content Component
const PriceByCustomerInterfaceContent = () => {
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart } = useCart();
  const [isLoggedIn] = useState(true); // Removed unused state setter
  const [selectedCustomer, setSelectedCustomer] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const handleCustomerSelect = useCallback(
    (customer: { value: string; label: string } | null) => {
      setSelectedCustomer(customer);
      clearCart();
    },
    [clearCart]
  );

  // Debug function to log cart items
  const debugAddToCart = useCallback((product: any, quantity: number) => {
    console.log("🔍 Debug AddToCart - Product:", product);
    console.log("🔍 Debug AddToCart - Quantity:", quantity);
    console.log("🔍 Debug AddToCart - Product keys:", Object.keys(product));
    addToCart(product, quantity);
  }, [addToCart]);

  // Updated cartItemsCount calculation
  const cartItemsCount = cartItems.length;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <PriceByCustomerHeader cartItemsCount={cartItemsCount} onCartClick={toggleCart} />
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        customerSelectId={selectedCustomer?.value || ""}
        onClearCart={clearCart}
        items={cartItems.map(item => {
          console.log("🔍 Debug Cart Item:", item);
          return { ...item, isApplyPromotion: false };
        }) as unknown as CartItemInterface[]}
        customerId={""}
      />
      <main className="pt-20 flex-1 px-2">
        {!isLoggedIn ? (
          <LoginRequiredSection />
        ) : (
          <PermissionGuard 
            requiredSalesFlow="ITEM_PRICE_BY_CUSTOMER"
            fallback={
              <div className="text-center py-8">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                  <h3 className="font-bold">Thông báo</h3>
                  <p>Chức năng này chỉ dành cho nhân viên Online. Vui lòng sử dụng Sale Order để đặt hàng.</p>
                </div>
              </div>
            }
          >
            <div className="max-w-7xl mx-auto">
              <HeaderSection />
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <PriceViewer 
                  onCustomerSelect={handleCustomerSelect}
                  selectedCustomer={selectedCustomer}
                  addToCart={debugAddToCart}
                />
              </div>
            </div>
          </PermissionGuard>
        )}
      </main>
      <Toolbar />
      <Footer />
    </div>
  );
};

// Main PriceByCustomerInterface component
const PriceByCustomerInterface = memo(() => {
  return (
    <CartProvider>
      <PriceByCustomerInterfaceContent />
    </CartProvider>
  );
});

PriceByCustomerInterface.displayName = 'PriceByCustomerInterface';

export default PriceByCustomerInterface; 