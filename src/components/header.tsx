import React, { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import {
  FaSearch, FaShoppingBag, FaHome, FaBoxOpen, FaClipboardList, FaTags, FaNewspaper, FaFlag, FaFlask, FaRecycle, FaWrench, FaCog, FaChevronRight, FaCheckCircle, FaTruck, FaUndoAlt, FaCalendarAlt, FaClock, FaTag
} from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import Image from "next/image";
import LogoSvg from "@/assets/img/Logo-Wecare.png";
import UserIconWithMenu from "@/components/LoginMenu";
import { getItem, removeItem, setItem } from "@/utils/SecureStorage";
import debounce from "lodash/debounce";
import Link from "next/link";
import axios from "axios";

// Import các component riêng biệt
import MobileHeader from "./component_Header/MobileHeader";
import DesktopHeader from "./component_Header/DesktopHeader";
import MobileSubHeader from "./component_Header/MobileSubHeader";
import DesktopSubHeader from "./component_Header/DesktopSubHeader";
import CategoryMenu from "./component_Header/CategoryMenu";

interface HeaderProps {
  cartItemsCount: number;
  onSearch: (term: string, type?: string) => void;
  isSearching?: boolean;
  onCartClick?: () => void;
  hideSubHeader?: boolean;
  isHeaderVisible?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  cartItemsCount,
  onSearch,
  isSearching = false,
  onCartClick,
  hideSubHeader = false,
  isHeaderVisible = true,
}) => {
  // States
  const [typelogin, setTypelogin] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("product");
  const [activePath, setActivePath] = useState("/");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  // 1. Thay fetchCategoryTree và categoryTree bằng logic lấy từ sidebar cũ
  const [categoryHierarchy, setCategoryHierarchy] = useState<any>(null);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);

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

  // Add styles for animations
  useEffect(() => {
    const styles = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateX(10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes slideUp {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-100%);
          opacity: 0;
        }
      }

      .header-container {
        transition: transform 0.3s ease-in-out;
      }

      .header-container.hidden {
        transform: translateY(-100%);
      }

      .search-container {
        transition: all 0.3s ease;
        border: 2px solid transparent;
      }

      .search-container:hover {
        border-color: #e2e8f0;
      }

      .search-container:focus-within {
        border-color: #04A1B3;
      }

      .clear-button-enter {
        animation: fadeIn 0.2s ease-out;
      }

      .search-input-wrapper {
        position: relative;
        flex: 1;
      }

      .search-input {
        padding-right: 70px !important;
      }

      .clear-button {
        transition: all 0.3s ease;
      }

      .clear-button:hover {
        background-color: rgba(59, 130, 246, 0.1) !important;
        transform: scale(1.1);  
      }

      .search-icon {
        transition: all 0.3s ease;
      }

      .input-group {
        align-items: stretch;
      }

      .input-group:hover .search-input,
      .input-group:hover .input-group-text {
        background-color: #ffffff !important;
      }

      .search-input:focus,
      .search-input:focus + .input-group-append .input-group-text {
        background-color: #ffffff !important; 
      }

      .input-group-append {
        display: flex;
      }

      .input-group-text {
        display: flex;
        align-items: center;
        padding-top: 0;
        padding-bottom: 0;
        height: 100%;
      }

      .nav-link {
        position: relative;
        transition: all 0.3s ease;
        font-weight: 700 !important;
        line-height: 1.6;
      }

      .nav-link::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: #04A1B3;
        transform: scaleX(0);
        transition: transform 0.3s ease;
      }

      .nav-link.active {
        color: #04A1B3 !important;
        font-weight: 800 !important;
      }

      .nav-link.active::after {
        transform: scaleX(1);
      }

      .nav-link:hover {
        color: #04A1B3 !important;
      }

      .nav-link:hover::after {
        transform: scaleX(1);
      }
      
      .nav-link:active {
        transform: scale(0.97);
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    return () => {
      if (styleSheet.parentNode === document.head) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);

  // Effect to handle active menu
  useEffect(() => {
    const pathname = window.location.pathname;
    setActivePath(pathname);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node) && !isDesktop) {
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

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px);} to { opacity: 1; transform: none;} } .animate-fadeIn { animation: fadeIn 0.18s ease; }`;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode === document.head) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // 1. Thay fetchCategoryTree và categoryTree bằng logic lấy từ sidebar cũ
  useEffect(() => {
    const fetchProductGroups = async () => {
      setLoadingCategory(true);
      try {
        const res = await axios.get('/api/getProductGroupHierarchyLeftpanel');
        if (res.data && res.data.byLevel && res.data.byLevel["1"]) {
          setCategoryHierarchy(res.data);
          setCategoryGroups(res.data.byLevel["1"]);
        } else {
          setCategoryHierarchy(null);
          setCategoryGroups([]);
        }
      } catch (e) {
        setCategoryHierarchy(null);
        setCategoryGroups([]);
      } finally {
        setLoadingCategory(false);
      }
    };
    fetchProductGroups();
  }, []);

  // 3. Hàm chọn danh mục
  const handleCategorySelect = (item: any) => {
    // Chuyển trang filter hoặc filter tại chỗ nếu đang ở /san-pham
    const productGroupId = item.crdfd_productgroupid;
    if (!productGroupId) return;
    
    if (productGroupId === 'all') {
      window.location.href = '/san-pham';
      return;
    }
    
    const productNameSlug = item.crdfd_productname
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    const newUrl = `/san-pham/${productNameSlug}`;
    window.location.href = newUrl;
  };

  // 4. Render menu danh mục phân cấp - Sử dụng component riêng
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

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .logo-text {
        text-decoration: none !important;
        border-bottom: none !important;
        box-shadow: none !important;
      }
      .logo-text:hover, .logo-text:active, .logo-text:focus {
        text-decoration: none !important;
        border-bottom: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode === document.head) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Thêm hàm xử lý submit search
  // Thêm hàm chuyển đổi search term thành slug
  const toSlug = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  };
  // Thay đổi handleSearchSubmit để chuyển hướng đúng dạng /san-pham/{slug}
  const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = searchTerm.trim();
    const type = searchType.toLowerCase();
    if (!term) return;
    
    // Always redirect to the new URL structure with search parameter
    const slug = toSlug(term);
    const encoded = encodeURIComponent(term);
    window.location.href = `/san-pham/${slug}?search=${encoded}`;
  }, [searchTerm, searchType]);

  // Handlers cho category dropdown
  const handleCategoryToggle = useCallback(() => {
    setShowCategoryDropdown((v) => !v);
  }, []);

  return (
    <div className={`header-container ${!isHeaderVisible ? 'hidden' : ''}`}>
      {/* Mobile Header - Hybrid Approach với CSS Classes */}
      <MobileHeader 
        className="block md:hidden"
        searchTerm={searchTerm}
        cartItemsCount={cartItemsCount}
        onSearchInput={handleSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onCartClick={onCartClick}
      />

      {/* Desktop Header - Hybrid Approach với CSS Classes */}
      <DesktopHeader 
        className="hidden md:block"
        cartItemsCount={cartItemsCount}
        onCartClick={onCartClick}
      />
      
      {/* Mobile Sub-header */}
      {!hideSubHeader && (
        <MobileSubHeader 
          className="block md:hidden"
          categoryRef={categoryRef}
          showCategoryDropdown={showCategoryDropdown}
          onCategoryToggle={handleCategoryToggle}
          loadingCategory={loadingCategory}
          renderCategoryMenu={renderCategoryMenu}
        />
      )}

      {/* Desktop Sub-header */}
      {!hideSubHeader && (
        <DesktopSubHeader 
          className="hidden md:block"
          categoryRef={categoryRef}
          showCategoryDropdown={showCategoryDropdown}
          onCategoryToggle={handleCategoryToggle}
          loadingCategory={loadingCategory}
          renderCategoryMenu={renderCategoryMenu}
        />
      )}
    </div>
  );
};

export default Header;
