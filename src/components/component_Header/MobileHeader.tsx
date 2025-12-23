import React, { useState, useEffect } from "react";
import { FaSearch, FaBars, FaShoppingCart } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import Image from "next/image";
import Link from "next/link";
import LogoSvg from "@/assets/img/Logo-Wecare.png";

interface MobileHeaderProps {
  className?: string;
  searchTerm: string;
  cartItemsCount: number;
  onSearchInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  onClearSearch: () => void;
  onCartClick?: () => void;
  isOutOfHero?: boolean;
  logoSize?: { width: number; height: number };
  onMenuToggle?: () => void;
  onCategoryToggle?: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  className = "",
  searchTerm,
  cartItemsCount,
  onSearchInput,
  onSearchSubmit,
  onClearSearch,
  onCartClick,
  isOutOfHero = false,
  logoSize = { width: 28, height: 28 },
  onMenuToggle,
  onCategoryToggle,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for sticky behavior
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const threshold = 30; // Start sticky behavior earlier for mobile
      setIsScrolled(scrollTop > threshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <header
        className={`${className} w-full shadow-md fixed top-0 left-0 z-50 transition-all duration-300 bg-white border-b border-gray-200 ${isScrolled ? 'sticky-header' : ''}`}
      >
        <div className={`w-full flex items-center justify-between px-3 sm:px-4 ${isScrolled ? 'py-2.5' : 'py-2'} gap-2 sm:gap-3 ${isScrolled ? 'h-14 sm:h-16' : 'h-12 sm:h-14'}`}>
          {/* Logo + tên web */}
          <Link
            href="/"
            className={`flex items-center gap-1.5 sm:gap-2 no-underline transition-all duration-300 flex-shrink-0 ${
              isScrolled ? 'min-w-[90px] sm:min-w-[100px]' : 'absolute left-1/2 transform -translate-x-1/2'
            }`}
            prefetch={false}
          >
            <div className={`flex items-center justify-center overflow-hidden transition-all duration-300 ${
              isScrolled 
                ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white shadow-sm border border-gray-100' 
                : 'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/95 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.25)] border-2 border-white/80'
            }`}>
              <Image
                src={LogoSvg}
                alt="Wecare Logo"
                width={24}
                height={24}
                style={{
                  width: isScrolled ? '22px' : '40px',
                  height: isScrolled ? '22px' : '40px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                className="object-contain"
              />
            </div>
            <span
              className={`logo-text font-bold tracking-wide leading-tight select-none no-underline whitespace-nowrap transition-all duration-300 ${
                isScrolled 
                  ? 'text-xs sm:text-sm drop-shadow-sm' 
                  : 'text-lg sm:text-xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] font-black'
              }`}
              style={{ 
                textDecoration: "none", 
                borderBottom: "none",
                color: '#049DBF'
              }}
            >
              WECARE
            </span>
          </Link>

          {/* Thanh tìm kiếm */}
          <div className={`flex justify-center transition-all duration-300 ${
            isScrolled ? 'flex-1 mx-2 sm:mx-3' : 'w-0 opacity-0 overflow-hidden'
          }`}>
            <form
              className="relative w-full max-w-2xl flex items-center"
              onSubmit={onSearchSubmit}
            >
              <div className="search-bar flex items-center bg-white rounded-full shadow-lg overflow-hidden border border-gray-200 w-full h-10 sm:h-11">
                <div className="flex items-center pl-2.5 sm:pl-3 pr-1">
                  <FaSearch className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                </div>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={onSearchInput}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    className="w-full px-2 sm:px-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none bg-transparent text-sm sm:text-base font-medium"
                    placeholder="Tìm kiếm sản phẩm..."
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-white rounded-full p-1.5 sm:p-2 shadow-sm transition-all touch-manipulation"
                      onClick={onClearSearch}
                      aria-label="Xoá tìm kiếm"
                    >
                      <IoMdClose size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="text-white px-3 sm:px-4 h-full font-semibold transition-colors text-xs sm:text-sm rounded-r-full touch-manipulation active:opacity-80"
                  style={{ backgroundColor: '#049DBF' }}
                >
                  Tìm
                </button>
              </div>
            </form>
          </div>

          {/* Menu Toggle + Cart */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Cart Button */}
            <button
              type="button"
              onClick={onCartClick}
              className="relative flex items-center justify-center rounded-full p-2 sm:p-2.5 shadow-sm transition-all bg-white hover:bg-gray-50 touch-manipulation active:scale-95"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <FaShoppingCart className="text-[#049DBF] text-lg sm:text-xl" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center text-[10px] sm:text-xs font-bold px-1 border-2 border-white shadow">
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </span>
              )}
            </button>

            {/* Menu Toggle */}
            <button
              type="button"
              onClick={onMenuToggle}
              className={`flex items-center justify-center rounded-full shadow-sm transition-all bg-white hover:bg-gray-50 touch-manipulation active:scale-95 ${
                isScrolled ? 'p-2.5 w-10 h-10 sm:w-11 sm:h-11' : 'p-2 w-9 h-9 sm:w-10 sm:h-10'
              }`}
            >
              <FaBars className="text-base sm:text-lg text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu - Only show when scrolled */}
      {/* {isScrolled && (
        <nav className={`fixed top-12 left-0 right-0 z-40 transition-all duration-300 mobile-nav-height ${
          isOutOfHero 
            ? 'bg-white/95 backdrop-blur-md border-b border-gray-200' 
            : 'bg-black/90 backdrop-blur-md border-b border-white/20'
        }`}>

        </nav>
      )} */}

      {/* Local styles for mobile header */}
      <style jsx>{`
        .sticky-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }

        .search-bar:focus-within {
          box-shadow: 0 0 0 3px rgba(4, 157, 191, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
          border-color: rgba(4, 157, 191, 0.5);
        }

        .search-bar {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          height: 40px;
        }

        @media (min-width: 640px) {
          .search-bar {
            height: 44px;
          }
        }

        .search-bar:hover {
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }

        /* Touch-friendly buttons */
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        /* Hide scrollbar for horizontal scroll */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Ensure content doesn't jump when header becomes sticky */
        .content-padding {
          padding-top: 56px; /* Mobile header height */
        }

        /* Mobile navigation when scrolled */
        .mobile-nav-scrolled {
          position: fixed;
          top: 56px;
          left: 0;
          right: 0;
          z-index: 40;
          backdrop-filter: blur(10px);
        }

        /* Mobile navigation height fix */
        .mobile-nav-height {
          height: 36px;
          min-height: 36px;
        }

        /* Enhanced mobile navigation spacing */
        .mobile-nav-container {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(229, 231, 235, 0.5);
        }

        .mobile-nav-items {
          display: flex;
          align-items: center;
          gap: 24px;
          overflow-x: auto;
          padding-bottom: 6px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .mobile-nav-items::-webkit-scrollbar {
          display: none;
        }

        .mobile-nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          transition: all 0.2s ease;
          flex-shrink: 0;
          height: 32px;
        }

        .mobile-nav-item:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .mobile-nav-item.dark {
          color: white;
        }

        .mobile-nav-item.dark:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: #f97316; /* orange-500 */
        }

        .mobile-nav-item.light {
          color: #374151; /* gray-700 */
        }

        .mobile-nav-item.light:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: #f97316; /* orange-500 */
        }

        .mobile-nav-icon {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        /* Additional spacing fixes */
        .mobile-nav-spacing {
          margin-right: 24px;
        }

        .mobile-nav-item-spacing {
          margin-right: 12px;
        }

        /* Ensure proper touch targets */
        .mobile-nav-touch-target {
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Enhanced scroll behavior */
        .mobile-nav-scroll {
          scroll-behavior: smooth;
          scroll-padding-left: 24px;
        }

        /* Remove any blue colors that might be interfering */
        .mobile-nav-no-blue {
          color: inherit !important;
        }

        .mobile-nav-no-blue * {
          color: inherit !important;
        }

        /* Logo centering when search is hidden */
        .logo-center {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .logo-left {
          display: flex;
          align-items: center;
          min-width: 80px;
        }

        /* Search bar transitions */
        .search-hidden {
          width: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .search-visible {
          flex: 1;
          opacity: 1;
          transition: all 0.3s ease;
        }
      `}</style>
    </>
  );
};

export default MobileHeader;
