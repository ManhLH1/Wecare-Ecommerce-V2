import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  FaSearch, FaShoppingBag, FaHome, FaBoxOpen, FaClipboardList, FaTags, FaNewspaper, FaFlag, FaFlask, FaRecycle, FaWrench, FaCog, FaChevronRight, FaCheckCircle, FaTruck, FaUndoAlt, FaCalendarAlt, FaClock, FaTag, FaFire, FaMoneyBillAlt
} from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import Image from "next/image";
// Prefer dark logo from public to ensure visibility on dark backgrounds
import UserIconWithMenu from "@/components/LoginMenu";
import { getItem, removeItem, setItem } from "@/utils/SecureStorage";
import debounce from "lodash/debounce";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { fetchWithCache } from "@/utils/cache";

// Import các component riêng biệt
import MobileHeader from "./component_Header/MobileHeader";
import MobileSidebar from "./component_Header/MobileSidebar";
import DesktopHeader from "./component_Header/DesktopHeader";
import MobileSubHeader from "./component_Header/MobileSubHeader";
import DesktopSubHeader from "./component_Header/DesktopSubHeader";
import CategoryMenu from "./component_Header/CategoryMenu";

interface UnifiedHeaderHeroProps {
  cartItemsCount: number;
  onSearch: (term: string, type?: string) => void;
  isSearching?: boolean;
  onCartClick?: () => void;
  backgroundImage?: string; // kept for backwards compatibility
  backgroundImages?: string[]; // new: rotate through these images
  backgroundIntervalMs?: number; // new: rotation interval
  heroTitle?: string;
  heroSubtitle?: string;
  searchPlaceholder?: string;
  quickSearchTags?: string[];
}

const UnifiedHeaderHero: React.FC<UnifiedHeaderHeroProps> = ({
  cartItemsCount,
  onSearch,
  isSearching = false,
  onCartClick,
  backgroundImage = "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80", // Electronic components background
  backgroundImages,
  backgroundIntervalMs = 12000,
  heroTitle = "WECARE - Siêu thị công nghiệp cho doanh nghiệp",
  heroSubtitle = "Nền tảng thương mại B2B dành cho doanh nghiệp",
  searchPlaceholder = "Tìm kiếm sản phẩm, ngành hàng, thương hiệu...",
  quickSearchTags = ["Thiết bị", "Linh kiện", "Vật tư", "Phụ kiện", "Khuyến mãi"]
}) => {
  // States
  const router = useRouter();
  const [typelogin, setTypelogin] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("product");
  const [activePath, setActivePath] = useState("/");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [categoryHierarchy, setCategoryHierarchy] = useState<any>(null);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Simple promotions ticker messages (can be wired to API later)
  const promoMessages = useMemo(
    () => [
      "Miễn phí vận chuyển đơn từ 1.000.000đ",
      "Giảm 10% cho đơn đầu tiên của bạn",
      "Flash sale mỗi thứ 6 hàng tuần",
      "Mua 2 tặng 1 áp dụng một số sản phẩm",
    ],
    []
  );
  const promoText = useMemo(() => promoMessages.join("  •  "), [promoMessages]);

  // Background slideshow state
  const slideshowImages = useMemo(() => {
    const fallback = [
      backgroundImage,
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=2069&q=80", // Electronic circuit boards
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=2069&q=80", // Industrial components and parts
      "https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=2069&q=80", // Mechanical parts and components
      "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=2069&q=80", // Electrical components and wiring
      "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=2069&q=80", // Electrical components and wiring (replacement)
      "https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=2069&q=80", // Mechanical parts and components (replacement)
    ];
    const list = (backgroundImages && backgroundImages.length > 0) ? backgroundImages : fallback;
    // ensure unique, non-empty
    return list.filter((src) => typeof src === 'string' && src.trim().length > 0);
  }, [backgroundImages, backgroundImage]);

  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    if (slideshowImages.length <= 1) return;
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % slideshowImages.length);
    }, backgroundIntervalMs);
    return () => clearInterval(timer);
  }, [slideshowImages, backgroundIntervalMs]);

  // Kiểm tra trạng thái đăng nhập
  useEffect(() => {
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

  // Debounced search handler
  const debouncedSearch = useMemo(
    () =>
      debounce((term: string, type: string) => {
        onSearch(term.toLowerCase(), type);
      }, 500),
    [onSearch]
  );

  // Clear search handler
  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    onSearch("", searchType.toLowerCase());
  }, [onSearch, searchType]);

  // Search input handler
  const handleSearchInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value.toLowerCase();
      setSearchTerm(inputValue);
      debouncedSearch(inputValue.trim(), searchType.toLowerCase());
    },
    [debouncedSearch, searchType]
  );

  // Effect to handle login type
  useEffect(() => {
    const type_login = getItem("type") || "";
    setTypelogin(type_login);
  }, [typelogin]);

  // Effect to handle responsive design
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect to handle active menu
  useEffect(() => {
    const pathname = window.location.pathname;
    setActivePath(pathname);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    if (showCategoryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCategoryDropdown]);

  // Fetch category data (cache 1 hour)
  useEffect(() => {
    const fetchProductGroups = async () => {
      setLoadingCategory(true);
      try {
        const data = await fetchWithCache<any>(
          "cache:getProductGroupHierarchyLeftpanel",
          1000 * 60 * 60,
          async () => {
            const res = await axios.get('/api/getProductGroupHierarchyLeftpanel');
            return res.data;
          }
        );

        if (data && data.byLevel && data.byLevel["1"]) {
          setCategoryHierarchy(data);
          setCategoryGroups(data.byLevel["1"]);
          console.log('Category data loaded (cached or fresh):', data.byLevel["1"].length, 'items');
        } else {
          console.log('No category data found in response');
          setCategoryHierarchy(null);
          setCategoryGroups([]);
        }
      } catch (e) {
        console.error('Error fetching category data:', e);
        setCategoryHierarchy(null);
        setCategoryGroups([]);
      } finally {
        setLoadingCategory(false);
      }
    };
    fetchProductGroups();
  }, []);

  // Handle category select
  const handleCategorySelect = (item: any) => {
    const productGroupId = item.crdfd_productgroupid;
    if (!productGroupId) return;
    
    if (productGroupId === 'all') return;
    
    const productNameSlug = item.crdfd_productname
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    const newUrl = `/san-pham/${productNameSlug}`;
    router.push(newUrl);
  };

  // Render category menu
  const renderCategoryMenu = (isMobile: boolean = false, isOpen: boolean = true, onClose: () => void = () => {}) => (
    <CategoryMenu
      categoryHierarchy={categoryHierarchy}
      categoryGroups={categoryGroups}
      loadingCategory={loadingCategory}
      onCategorySelect={handleCategorySelect}
      isMobile={isMobile}
      isOpen={isOpen}
      onClose={onClose}
    />
  );

  // Convert to slug
  const toSlug = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  };

  // Handle search submit
  const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = searchTerm.trim();
    const type = searchType.toLowerCase();
    if (!term) return;
    const slug = toSlug(term);
    const encoded = encodeURIComponent(term);
    // Always navigate to slug route with original term in query for consistent behavior
    router.push(`/san-pham/${slug}?search=${encoded}`);
  }, [searchTerm, searchType, router]);

  // Handle category toggle
  const handleCategoryToggle = useCallback(() => {
    // Check if mobile
    if (window.innerWidth < 768) {
      setMobileCategoryOpen(true);
    } else {
      setShowCategoryDropdown((v) => !v);
    }
  }, []);

  // Scroll state for sticky header
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOutOfHero, setIsOutOfHero] = useState(false);
  const [logoSize, setLogoSize] = useState({ width: 200, height: 200 });
  const [mobileLogoSize, setMobileLogoSize] = useState({ width: 28, height: 28 });

  // Effect to handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      
      // Calculate hero section height (60vh for desktop, 50vh for mobile)
      const heroHeight = window.innerWidth < 768 ? window.innerHeight * 0.5 : window.innerHeight * 0.6;
      
      // For mobile, start sticky behavior earlier (30px)
      // For desktop, start after 100px
      const threshold = window.innerWidth < 768 ? 30 : 100;
      setIsScrolled(scrollTop > threshold);
      
      // Check if scrolled out of hero section completely
      setIsOutOfHero(scrollTop > heroHeight);

      // Calculate logo size based on scroll position
      const maxSize = 200;
      const minSize = 120;
      const scrollProgress = Math.min(scrollTop / 200, 1); // Complete transition over 200px
      const currentSize = maxSize - (scrollProgress * (maxSize - minSize));
      setLogoSize({ width: currentSize, height: currentSize });

      // Calculate mobile logo size
      const mobileMaxSize = 32;
      const mobileMinSize = 24;
      const mobileCurrentSize = mobileMaxSize - (scrollProgress * (mobileMaxSize - mobileMinSize));
      setMobileLogoSize({ width: mobileCurrentSize, height: mobileCurrentSize });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Animated Background - Covers entire header and hero area */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Ken Burns + Crossfade slideshow */}
        {slideshowImages.map((img, idx) => (
          <div
            key={`${img}-${idx}`}
            className={`absolute inset-0 hero-kenburns will-change-transform transition-opacity duration-[1500ms] ${idx === bgIndex ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={idx !== bgIndex}
          >
            <Image
              src={img}
              alt="Background"
              fill
              className="object-cover"
              priority={idx === 0}
              sizes="100vw"
            />
          </div>
        ))}

        {/* Animated gradient glow layers */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -inset-32 bg-[radial-gradient(45%_60%_at_20%_20%,rgba(59,130,246,0.25),transparent_60%)] animate-glow-1" />
          <div className="absolute -inset-32 bg-[radial-gradient(40%_55%_at_80%_30%,rgba(251,146,60,0.18),transparent_60%)] animate-glow-2" />
        </div>

        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Local styles for animations */}
      <style jsx>{`
        @keyframes kenburnsZoom {
          0% { transform: scale(1) translate3d(0, 0, 0); }
          50% { transform: scale(1.06) translate3d(-1%, -1%, 0); }
          100% { transform: scale(1.12) translate3d(0, 0, 0); }
        }
        .hero-kenburns { animation: kenburnsZoom 18s ease-in-out infinite alternate; }

        @keyframes glowMove1 {
          0% { transform: translate3d(-10%, -6%, 0) rotate(0deg); opacity: .55; }
          50% { transform: translate3d(6%, 4%, 0) rotate(8deg); opacity: .7; }
          100% { transform: translate3d(-8%, -4%, 0) rotate(-4deg); opacity: .55; }
        }
        .animate-glow-1 { animation: glowMove1 24s ease-in-out infinite; filter: blur(40px); }

        @keyframes glowMove2 {
          0% { transform: translate3d(8%, -8%, 0) rotate(0deg); opacity: .45; }
          50% { transform: translate3d(-6%, 6%, 0) rotate(-6deg); opacity: .6; }
          100% { transform: translate3d(10%, -6%, 0) rotate(4deg); opacity: .45; }
        }
        .animate-glow-2 { animation: glowMove2 28s ease-in-out infinite; filter: blur(50px); }

        /* Sticky header styles */
        .sticky-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        /* Mobile sticky header */
        .md\\:hidden.sticky-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
        }

        /* Mobile header when out of hero */
        .md\\:hidden.sticky-header.out-of-hero {
          background: rgba(255, 255, 255, 1) !important;
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

        /* Mobile header height fix */
        .mobile-header {
          height: 40px;
          min-height: 40px;
        }

        /* Mobile navigation height fix */
        .mobile-nav {
          height: 32px;
          min-height: 32px;
        }

        .sticky-nav {
          position: fixed;
          top: 0; /* no extra top padding */
          left: 0;
          right: 0;
          z-index: 50;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        /* Dark sticky nav when out of hero */
        .sticky-nav.out-of-hero {
          background: rgba(255, 255, 255, 0.95) !important;
          color: #1f2937 !important;
        }

        /* Smooth transitions */
        .header-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Search bar focus effects */
        .search-bar:focus-within {
          box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.15), 0 10px 30px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
          border-color: rgba(251, 146, 60, 0.6);
        }

        .search-bar {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-bar:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        /* Search bar appear animation */
        .search-appear {
          animation: searchSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes searchSlideIn {
          from {
            opacity: 0;
            transform: translateY(-15px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Ensure content doesn't jump when header becomes sticky */
        .content-padding {
          padding-top: 64px; /* nav height only */
        }

        /* Mobile content padding */
        @media (max-width: 768px) {
          .content-padding {
            padding-top: 58px; /* mobile unchanged */
          }
        }

        /* Mobile navigation height fix */
        .mobile-nav-height {
          height: 32px;
          min-height: 32px;
        }

        /* Mobile header height fix */
        .mobile-header-height {
          height: 56px;
          min-height: 56px;
        }

        /* Enhanced header layout for scrolled state */
        .sticky-header .search-appear {
          margin-left: 0 !important;
          width: 100% !important;
          max-width: 600px !important;
        }

        /* Search bar in header when scrolled */
        .search-appear {
          width: 100%;
          max-width: 600px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Search bar in navigation bar */
        .sticky-nav .search-bar {
          max-width: 600px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Compact navigation when scrolled */
        .sticky-nav .flex.items-center.gap-4 {
          gap: 1rem !important;
        }

        /* Responsive search bar positioning */
        @media (max-width: 1280px) {
          .sticky-header .search-appear,
          .search-appear,
          .sticky-nav .search-bar {
            max-width: 500px !important;
          }
        }

        @media (max-width: 1024px) {
          .sticky-header .search-appear,
          .search-appear,
          .sticky-nav .search-bar {
            max-width: 450px !important;
          }
        }

        @media (max-width: 768px) {
          .sticky-header .search-appear,
          .search-appear,
          .sticky-nav .search-bar {
            max-width: 400px !important;
          }
        }

        /* Mobile hero optimizations */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2rem;
            line-height: 1.2;
          }
          
          .hero-subtitle {
            font-size: 1.125rem;
            line-height: 1.4;
          }
          
          .search-container {
            margin: 1.5rem 0;
          }
          
          .search-input {
            font-size: 1rem;
            padding: 0.75rem 1rem;
          }
          
          .search-button {
            font-size: 1rem;
            padding: 0.75rem 1.5rem;
          }

          /* Mobile search bar optimizations */
          .search-bar {
            border-radius: 12px;
          }
          
          .search-bar input {
            font-size: 14px;
            padding: 8px 12px;
          }
          
          .search-bar button[type="submit"] {
            font-size: 14px;
            padding: 8px 16px;
          }

          /* Mobile search container adjustments */
          .search-appear {
            width: 100%;
            max-width: 416px;
          }
        }

        /* Extra small screens */
        @media (max-width: 480px) {
          .search-appear {
            width: 100%;
            max-width: 384px;
          }
        }

        /* Enhanced mobile responsiveness */
        @media (max-width: 480px) {
          .hero-title {
            font-size: 1.75rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
          }
          
          .search-container {
            margin: 1rem 0;
          }
        }

        /* Promotions marquee */
        @keyframes promoMarquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .promo-marquee {
          white-space: nowrap;
          will-change: transform;
          animation: promoMarquee 28s linear infinite;
        }
        .promo-mask {
          mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
          -webkit-mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
        }
      `}</style>

              {/* Content Container */}
        <div className="relative z-10">
          {/* Top Header Bar - chỉ hiển thị khi chưa scroll */}
          {!isScrolled && (
            <div className="bg-black/30 text-white backdrop-blur-sm border-b border-white/10 header-transition">
              <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-10 text-xs sm:text-sm">
                  {/* Left - Empty space */}
                  <div className="w-20"></div>

                  {/* Center - Promotions ticker */}
                  <div className="flex-1 overflow-hidden promo-mask">
                    <div className="promo-marquee">
                      {promoText}  •  {promoText}
                    </div>
                  </div>

                  {/* Right - Shopping cart and login */}
                  <div className="flex items-center gap-2 sm:gap-3 w-auto justify-end">
                    {isLoggedIn === null ? (
                      <div className="w-20 h-8 bg-gray-100 animate-pulse rounded-lg"></div>
                    ) : !isLoggedIn ? (
                      <Link href="/login" className="bg-orange-500 hover:bg-orange-600 text-white px-2.5 sm:px-3 py-1.5 rounded-lg no-underline text-xs sm:text-sm font-medium transition-colors whitespace-nowrap">Đăng nhập</Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}  

        {/* Mobile Header */}
        <div className={`md:hidden mobile-header ${isScrolled ? 'sticky-header' : ''}`}>
          <MobileHeader
            searchTerm={searchTerm}
            cartItemsCount={cartItemsCount}
            onSearchInput={handleSearchInput}
            onSearchSubmit={handleSearchSubmit}
            onClearSearch={handleClearSearch}
            onCartClick={onCartClick}
            isOutOfHero={isOutOfHero}
            logoSize={mobileLogoSize}
            onMenuToggle={() => setMobileMenuOpen(true)}
            onCategoryToggle={() => setMobileCategoryOpen(true)}
          />
        </div>

        {/* Main Navigation - Desktop Only */}
        <nav className={`hidden md:block ${isOutOfHero ? 'bg-white/95 backdrop-blur-sm border-b border-gray-200' : 'bg-white/10 backdrop-blur-sm border-b border-white/20'} header-transition ${isScrolled ? 'sticky-nav' : 'relative z-40'}`}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center min-w-[200px]">
                <Link href="/" className="flex items-center no-underline">
                  <Image
                    src="/Logo-Wecare.png"
                    alt="Wecare Logo"
                    width={300}
                    height={300}
                    priority
                    style={{ 
                      height: logoSize.height, 
                      width: logoSize.width,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                  />
                </Link>
              </div>

              {/* Search Bar - positioned next to logo */}
              {isScrolled && (
                <div className="flex-1 max-w-4xl mx-8">
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <div className="search-bar flex items-center bg-white/95 backdrop-blur-sm rounded-full shadow-lg overflow-hidden border border-gray-200 hover:border-orange-300/50 transition-all duration-300">
                      <div className="flex items-center pl-4 pr-2">
                        <FaSearch className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchInput}
                        placeholder="Tìm kiếm sản phẩm, ngành hàng, thương hiệu..."
                        className="flex-1 px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none bg-transparent text-base font-medium"
                        aria-label="Ô tìm kiếm"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-500 bg-transparent rounded-full p-2 mr-1 transition-all duration-200"
                          onClick={handleClearSearch}
                          aria-label="Xoá tìm kiếm"
                        >
                          <IoMdClose size={18} />
                        </button>
                      )}
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 font-semibold transition-all duration-300 text-base rounded-r-full shadow-sm hover:shadow-md"
                        aria-label="Thực hiện tìm kiếm"
                      >
                        Tìm kiếm
                      </button>
                    </div>
                  </form>
                </div>
              )}

                            {/* Navigation Links - Vietnamese menu with icons - All on the right */}
              <div className="flex items-center gap-4 flex-nowrap">
                <button
                  onClick={handleCategoryToggle}
                  className={`group transition-colors flex items-center gap-2 no-underline whitespace-nowrap ${isOutOfHero ? 'text-gray-800 hover:text-orange-600 visited:text-gray-800' : 'text-white hover:text-orange-300 visited:text-white'}`}
                  aria-haspopup="true"
                  aria-expanded={showCategoryDropdown}
                >
                  <FaTags className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                  <span className={`${isScrolled ? 'hidden group-hover:inline-block text-orange-600' : (isOutOfHero ? 'inline-block group-hover:text-orange-600' : 'inline-block group-hover:text-orange-300')} ml-1 font-medium transition-colors`}>Danh mục</span>
                </button>
                <Link href="/san-pham" className={`group flex items-center gap-2 transition-colors no-underline whitespace-nowrap ${isOutOfHero ? 'text-gray-800 hover:text-orange-600 visited:text-gray-800' : 'text-white hover:text-orange-300 visited:text-white'}`}>
                  <FaBoxOpen className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                  <span className={`${isScrolled ? 'hidden group-hover:inline-block text-orange-600' : (isOutOfHero ? 'inline-block group-hover:text-orange-600' : 'inline-block group-hover:text-orange-300')} ml-1 font-medium transition-colors`}>Tất cả sản phẩm</span>
                </Link>
                <Link href="/top-san-pham-ban-chay" className={`group flex items-center gap-2 transition-colors no-underline whitespace-nowrap ${isOutOfHero ? 'text-gray-800 hover:text-orange-600 visited:text-gray-800' : 'text-white hover:text-orange-300 visited:text-white'}`}>
                  <FaFire className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                  <span className={`${isScrolled ? 'hidden group-hover:inline-block text-orange-600' : (isOutOfHero ? 'inline-block group-hover:text-orange-600' : 'inline-block group-hover:text-orange-300')} ml-1 font-medium transition-colors`}>Sản phẩm bán chạy</span>
                </Link>
                <Link href="/promotion" className={`group flex items-center gap-2 transition-colors no-underline whitespace-nowrap ${isOutOfHero ? 'text-gray-800 hover:text-orange-600 visited:text-gray-800' : 'text-white hover:text-orange-300 visited:text-white'}`}>
                  <FaTag className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                  <span className={`${isScrolled ? 'hidden group-hover:inline-block text-orange-600' : (isOutOfHero ? 'inline-block group-hover:text-orange-600' : 'inline-block group-hover:text-orange-300')} ml-1 font-medium transition-colors`}>Khuyến mãi</span>
                </Link>
                <Link href="/history-order" className={`group flex items-center gap-2 transition-colors no-underline whitespace-nowrap ${isOutOfHero ? 'text-gray-800 hover:text-orange-600 visited:text-gray-800' : 'text-white hover:text-orange-300 visited:text-white'}`}>
                  <FaClock className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                  <span className={`${isScrolled ? 'hidden group-hover:inline-block text-orange-600' : (isOutOfHero ? 'inline-block group-hover:text-orange-600' : 'inline-block group-hover:text-orange-300')} ml-1 font-medium transition-colors`}>Lịch sử đơn hàng</span>
                </Link>
                <Link href="/history-payment" className={`group flex items-center gap-2 transition-colors no-underline whitespace-nowrap ${isOutOfHero ? 'text-gray-800 hover:text-orange-600 visited:text-gray-800' : 'text-white hover:text-orange-300 visited:text-white'}`}>
                  <FaMoneyBillAlt className="w-5 h-5 group-hover:text-orange-500 transition-colors" />
                  <span className={`${isScrolled ? 'hidden group-hover:inline-block text-orange-600' : (isOutOfHero ? 'inline-block group-hover:text-orange-600' : 'inline-block group-hover:text-orange-300')} ml-1 font-medium transition-colors`}>Lịch sử thanh toán</span>
                </Link>
                <Link href="/post" className={`group flex items-center gap-2 transition-colors no-underline whitespace-nowrap ${isOutOfHero ? 'text-gray-800 hover:text-orange-600 visited:text-gray-800' : 'text-white hover:text-orange-300 visited:text-white'}`}>
                  <FaNewspaper className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                  <span className={`${isScrolled ? 'hidden group-hover:inline-block text-orange-600' : (isOutOfHero ? 'inline-block group-hover:text-orange-600' : 'inline-block group-hover:text-orange-300')} ml-1 font-medium transition-colors`}>Tin tức</span>
                </Link>
                
                {/* Shopping Cart */}
                <Link href="#" onClick={onCartClick} className={`group flex items-center gap-2 transition-colors no-underline whitespace-nowrap ${isOutOfHero ? 'text-gray-800 hover:text-orange-600 visited:text-gray-800' : 'text-white hover:text-orange-300 visited:text-white'}`}>
                  <FaShoppingBag className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                  <span className={`${isScrolled ? 'hidden group-hover:inline-block text-orange-600' : (isOutOfHero ? 'inline-block group-hover:text-orange-600' : 'inline-block group-hover:text-orange-300')} ml-1 font-medium transition-colors`}></span>
                  {cartItemsCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">
                      {cartItemsCount > 99 ? '99+' : cartItemsCount}
                    </span>
                  )}
                </Link>
                
                <UserIconWithMenu />
              </div>
            </div>
          </div>

          {/* Dropdown Category Menu under nav (desktop) */}
          {showCategoryDropdown && (
            <>
              {/* Backdrop to capture outside clicks */}
              <div className="fixed inset-0 z-40" onClick={() => setShowCategoryDropdown(false)} />
              <div className={`${isScrolled ? 'fixed top-16 left-0 right-0 z-50' : 'absolute left-0 right-0 top-full z-50'}`} ref={categoryRef}>
                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="mt-2 rounded-b-xl overflow-hidden shadow-2xl ring-1 ring-black/10">
                    {renderCategoryMenu(false, true, () => setShowCategoryDropdown(false))}
                  </div>
                </div>
              </div>
            </>
          )}
        </nav>



        {/* Hero Section */}
        <div className={`relative z-10 flex items-center justify-center min-h-[50vh] md:min-h-[60vh] px-4 sm:px-6 lg:px-8 ${isScrolled ? 'content-padding' : ''}`}>
          <div className="text-center max-w-4xl mx-auto">
            {/* Hero Title */}
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight">
              {heroTitle}
            </h1>
            
            {/* Hero Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-6 sm:mb-8 px-2">
              {heroSubtitle}
            </p>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto mb-6 sm:mb-8 px-2">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="search-bar flex items-center bg-white/95 backdrop-blur-sm rounded-full shadow-2xl overflow-hidden border border-gray-200 hover:border-orange-300/50 transition-all duration-300">
                  <div className="flex items-center pl-3 sm:pl-4 pr-2">
                    <FaSearch className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInput}
                    placeholder={searchPlaceholder}
                    className="flex-1 px-3 sm:px-4 py-3 sm:py-4 text-gray-800 placeholder-gray-500 focus:outline-none bg-transparent text-sm sm:text-base"
                    aria-label="Ô tìm kiếm hero"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-500 bg-transparent rounded-full p-2 sm:p-2.5 mr-1 transition-all duration-200"
                      onClick={handleClearSearch}
                      aria-label="Xoá tìm kiếm"
                    >
                      <IoMdClose size={18} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 sm:px-8 py-3 sm:py-4 font-semibold transition-all duration-300 text-sm sm:text-base rounded-r-full shadow-sm hover:shadow-md"
                    aria-label="Thực hiện tìm kiếm"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Search Tags */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-2">
              <span className="text-white/80 text-sm whitespace-nowrap">Từ khóa phổ biến:</span>
              {quickSearchTags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchTerm(tag);
                    handleSearchSubmit();
                  }}
                  className="bg-white/15 hover:bg-white/25 text-white/95 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm transition-colors backdrop-blur-sm whitespace-nowrap"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-headers removed: Category now lives in the main menu dropdown */}
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onCategoryToggle={() => setMobileCategoryOpen(true)}
        categoryHierarchy={categoryHierarchy}
        categoryGroups={categoryGroups}
        loadingCategory={loadingCategory}
        onCategorySelect={handleCategorySelect}
      />

      {/* Mobile Category Menu */}
      <CategoryMenu
        categoryHierarchy={categoryHierarchy}
        categoryGroups={categoryGroups}
        loadingCategory={loadingCategory}
        onCategorySelect={handleCategorySelect}
        isMobile={true}
        isOpen={isMobileCategoryOpen}
        onClose={() => setMobileCategoryOpen(false)}
      />
    </div>
  );
};

export default UnifiedHeaderHero;
