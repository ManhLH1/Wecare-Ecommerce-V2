import React, { useState, useEffect } from "react";
import { FaShoppingBag } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import LogoSvg from "@/assets/img/Logo-Wecare.png";
import UserIconWithMenu from "@/components/LoginMenu";
import { getItem } from "@/utils/SecureStorage";

interface DesktopHeaderProps {
  className?: string;
  cartItemsCount: number;
  onCartClick?: () => void;
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  className = "",
  cartItemsCount,
  onCartClick,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = chưa kiểm tra, true/false = đã kiểm tra

  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập ngay khi component mount
    const checkLoginStatus = () => {
      if (typeof window !== "undefined") {
        const hasId = getItem("id");
        const hasToken = getItem("token");
        const hasUserName = getItem("userName");
        setIsLoggedIn(!!(hasId || hasToken || hasUserName));
      }
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

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === "undefined") return;

      const mainSearchForm = document.getElementById("main-search-form");
      if (mainSearchForm) {
        const { bottom } = mainSearchForm.getBoundingClientRect();
        setShowSearch(bottom < 0);
      } else {
        setShowSearch(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = (searchTerm || "").trim();
    if (!term) return;

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
  };

  return (
    <div className={className}>
      {/* Header Content - Tầng 1 */}
      <header className="w-full fixed top-0 left-0 z-50 bg-white">
        <div
          className="w-full flex items-center justify-between px-10 py-2 bg-white"
          style={{ height: 65 }}
        >
          {/* Logo + tên web */}
          <Link
            href="/"
            className="flex items-center gap-3 min-w-[200px] no-underline"
            prefetch={false}
          >
            <span className="rounded-full bg-white p-1 flex items-center justify-center w-14 h-14">
              <Image
                src={LogoSvg}
                alt="Wecare Logo"
                width={48}
                height={48}
                className="object-contain rounded-full"
              />
            </span>
            <span
              className="logo-text text-3xl font-extrabold tracking-wide leading-tight select-none drop-shadow-sm no-underline"
              style={{ 
                textDecoration: "none", 
                borderBottom: "none",
                color: '#049DBF'
              }}
            >
              WECARE
            </span>
          </Link>

          {/* Search Bar - Conditionally rendered */}
          <div
            className={`flex-1 flex justify-center px-8 transition-opacity duration-300 ${
              showSearch ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <form onSubmit={handleSearchSubmit} className="w-full max-w-xl">
              <div className="relative flex items-stretch bg-gray-100 rounded-full shadow-inner overflow-hidden ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-amber-400 transition h-11">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="flex-1 pl-12 pr-4 py-2 text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
                  aria-label="Tìm kiếm"
                />
                <button
                  type="submit"
                  className="px-5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-r-full transition"
                  aria-label="Search"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Giỏ hàng */}
            {typeof window !== "undefined" && (
              <button
                type="button"
                onClick={onCartClick}
                className="relative flex items-center justify-center focus:outline-none bg-white rounded-full p-3 shadow-md hover:bg-[#e6f9f1] transition-all w-12 h-12"
              >
                <FaShoppingBag className="text-[#049DBF] text-2xl" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full min-w-[20px] h-[20px] flex items-center justify-center text-xs font-bold px-1 border-2 border-[#04B2D9] shadow">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            )}

            {/* User Menu hoặc Login */}
            {isLoggedIn === null ? (
              // Hiển thị placeholder trong khi đang kiểm tra
              <div className="w-[140px] h-[55px] bg-gray-100 animate-pulse rounded-full"></div>
            ) : isLoggedIn ? (
              <UserIconWithMenu />
            ) : (
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#04B2D9] bg-gradient-to-r from-cyan-100 to-blue-50 text-[#04B2D9] font-bold text-lg shadow hover:from-cyan-200 hover:to-blue-100 hover:text-[#049DBF] transition-all whitespace-nowrap active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#04B2D9]"
                style={{
                  boxShadow: "0 2px 12px 0 rgba(4,178,217,0.10)",
                  height: 55,
                }}
                onClick={() => (window.location.href = "/login")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#04B2D9]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c1.656 0 3-1.344 3-3s-1.344-3-3-3-3 1.344-3 3 1.344 3 3 3zm0 2c-2.67 0-8 1.337-8 4v2h16v-2c0-2.663-5.33-4-8-4z"
                  />
                </svg>
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};

export default DesktopHeader;
