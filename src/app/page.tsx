"use client";
import React, {
  useCallback,
  useEffect,
  useState,
  Suspense,
  useMemo,
  useContext,
} from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import ViewAllButton from "@/components/ui/ViewAllButton";
import { useCart } from "@/components/CartManager";
import { getItem } from "@/utils/SecureStorage";
import dynamic from "next/dynamic";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import hero1 from "@/assets/img/1.png";
import hero2 from "@/assets/img/2.png";
import hero3 from "@/assets/img/3.png";

import ProductsList from "./product-list/_components/products/ProductsList";
import TopProductsSection from "../app/product-list/_components/top-products/TopProductsHomeSection";
import ProductGroupList from "./product-list/productgroup-list";
import NewsSection from "@/components/NewsSection";
import CategorySection from "@/components/CategorySection";
import ShortcutSection from "@/components/ShortcutSection";
import HomeBenefitsPanel from "@/components/HomeBenefitsPanel";
import HeroSection from "@/components/HeroSection";
import UnifiedHeaderHero from "@/components/UnifiedHeaderHero";
import JDStyleHeader from "@/components/JDStyleHeader";
import JDStyleMainContent from "@/components/JDStyleMainContent";
import axios from "axios";
import { fetchWithCache } from "@/utils/cache";
import { toast } from "react-toastify";
import IndustriesListCategory from "@/components/IndustriesListCategory";
import mienphivanchuyen1 from "@/assets/img/mienphivanchuyen1.jpg";
import mienphivanchuyen2 from "@/assets/img/mienphivanchuyen2.jpg";
import { Products } from "@/model/interface/ProductCartData";
import { CartContext } from "@/components/CartGlobalManager";
import {
  FaSearch,
  FaShoppingBag,
  FaDollarSign,
  FaCalculator,
  FaUserTie,
  FaHandshake,
  FaTruck,
  FaRedo,
  FaShieldAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import TopProductsList from "./product-list/_components/top-products/top-products-list";
import BusinessOpportunitySection from "@/components/BusinessOpportunitySection";
import useCountUp from "@/hooks/useCountUp";
import PromotionPopup from "@/components/PromotionPopup";

// // Dynamic imports for better performance
// const ProductGroupList = dynamic(() => import("./product-list/productgroup-list"), {
//   loading: () => <Loading />,
//   ssr: false
// });

// const TopProductsSection = dynamic(() => import("./product-list/_components/top-products/TopProductsSection"), {
//   loading: () => <Loading />,
//   ssr: false
// });

// const News = dynamic(() => import("@/components/News"), {
//   loading: () => <Loading />,
//   ssr: false
// });

// const PromotionsHero = dynamic(() => import("@/components/PromotionsHero"), {
//   loading: () => <Loading />,
//   ssr: false
// });

// const PromotionsSection = dynamic(() => import("@/components/PromotionsSection"), {
//   loading: () => <Loading />,
//   ssr: false
// });

// const TopProductsHomeSection = dynamic(() => import("./product-list/_components/top-products/TopProductsHomeSection"), {
//   loading: () => <Loading />,
//   ssr: false
// });

// const NewsSection = dynamic(() => import('@/components/NewsSection'), { ssr: false, loading: () => <Loading /> });

// Loading component cải thiện cho mobile
const Loading = () => {
  return (
    <div className="flex justify-center items-center h-full py-8 md:py-12">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-pulse"></div>
        <div className="mt-3 md:mt-4 text-center">
          <div className="text-gray-600 font-medium text-sm md:text-base">Đang tải...</div>
          <div className="text-gray-400 text-xs md:text-sm">
            Vui lòng chờ trong giây lát
          </div>
        </div>
      </div>
    </div>
  );
};

interface TopProduct {
  crdfd_tensanphamtext: string;
  total: number;
  productId: string;
  cr1bb_imageurl: string;
  cr1bb_imageurlproduct: string;
  crdfd_thuonghieu: string;
  crdfd_quycach: string;
  crdfd_hoanthienbemat: string;
  crdfd_masanpham: string;
  _crdfd_productgroup_value: string;
  crdfd_gtgt: number;
  crdfd_gtgt_value?: number | null;
  cr1bb_giaban: number;
  crdfd_giatheovc: string;
  cr1bb_nhomsanpham: string;
  crdfd_onvi: string;
  _crdfd_onvi_value: string;
  crdfd_onvichuantext: string;
  crdfd_maonvi: string;
  cr1bb_tylechuyenoi: number;
  crdfd_nhomoituongtext: string;
  don_vi_DH: string;
  has_promotion: boolean;
  promotion: any | null;
}

interface ApiError extends Error {
  message: string;
}

// Reveal on scroll helper component
const Reveal = ({
  children,
  className = "",
  direction = "up",
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "scale";
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = elementRef.current as Element | null;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hiddenTransform =
    direction === "up"
      ? "translate-y-4"
      : direction === "down"
        ? "-translate-y-4"
        : direction === "left"
          ? "-translate-x-4"
          : direction === "right"
            ? "translate-x-4"
            : direction === "scale"
              ? "scale-95"
              : "translate-y-4";

  const Tag: any = as;

  return (
    <Tag
      ref={elementRef as any}
      className={`${className} transition-all duration-700 will-change-transform ${isVisible
        ? "opacity-100 translate-x-0 translate-y-0 scale-100"
        : `opacity-0 ${hiddenTransform}`
        }`}
      style={{
        transitionDelay: `${delay}ms`,
        transitionProperty: "opacity, transform",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </Tag>
  );
};

// HomeContent component
const HomeContent = () => {
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart } =
    useCart();
  const { openCart } = useContext(CartContext); // Add this to use global cart

  // Debug section - remove after testing
  const debugAddTestProduct = () => {
    const testProduct = {
      crdfd_productsid: "test-123",
      crdfd_masanpham: "TEST-PRODUCT",
      crdfd_name: "Test Product",
      cr1bb_giaban: "100000",
      quantity: 1,
      price: "100000",
      productName: "Test Product",
      productId: "test-123",
    } as any;

    addToCart(testProduct, 1);
    setTimeout(() => {
      openCart();
    }, 1000);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedGroupImage, setSelectedGroupImage] = useState("");
  const [selectedGroupMinPrice, setSelectedGroupMinPrice] = useState<
    number | null
  >(null);
  const [selectedGroupMaxPrice, setSelectedGroupMaxPrice] = useState<
    number | null
  >(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState<
    string | null
  >(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  // Remove local isCartOpen state - use global cart instead
  const [isDesktop, setIsDesktop] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const userId = getItem("id");
  const [quantity, setQuantity] = useState(1);
  const [customerSelectId, setCustomerSelectId] = useState("");
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<ApiError | null>(null);

  // --- State cho employee data ---
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  // --- Danh mục ngành hàng lấy từ API giống header.tsx ---
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<any>(null);
  const [loadingCategory, setLoadingCategory] = useState(true);

  // --- State cho count products ---
  const [countProducts, setCountProducts] = useState<number>(17000);
  const [loadingCount, setLoadingCount] = useState(true);

  // --- State cho count productgroups ---
  const [countProductGroups, setCountProductGroups] = useState<number>(600);
  const [loadingCountPG, setLoadingCountPG] = useState(true);

  // --- State cho count customer ---
  const [countCustomer, setCountCustomer] = useState<number>(9000);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  // hook animation countup
  const animatedProducts = useCountUp(countProducts);
  const animatedProductGroups = useCountUp(countProductGroups);
  const animatedCustomer = useCountUp(countCustomer);

  // --- Fetch employee data khi userType là sale ---
  useEffect(() => {
    const fetchEmployeeData = async () => {
      const userType = getItem("type");
      const userEmail = getItem("email");

      if (userType === "sale" && userEmail) {
        setLoadingEmployee(true);
        try {
          const response = await axios.get(
            `/api/getEmployeData?user=${userEmail}`
          );
          setEmployeeData(response.data);
        } catch (error) {
          console.error("Lỗi khi lấy dữ liệu nhân viên:", error);
        } finally {
          setLoadingEmployee(false);
        }
      }
    };

    fetchEmployeeData();
  }, []);

  useEffect(() => {
    const fetchProductGroups = async () => {
      setLoadingCategory(true);
      try {
        const data = await fetchWithCache<any>(
          "cache:getProductGroupHierarchyLeftpanel",
          1000 * 60 * 60, // 1 hour
          async () => {
            const res = await axios.get("/api/getProductGroupHierarchyLeftpanel");
            return res.data;
          }
        );
        if (data && data.byLevel && data.byLevel["1"]) {
          setCategoryGroups(data.byLevel["1"]);
          setCategoryHierarchy(data);
        } else {
          setCategoryGroups([]);
          setCategoryHierarchy(null);
        }
      } catch (e) {
        setCategoryGroups([]);
        setCategoryHierarchy(null);
      } finally {
        setLoadingCategory(false);
      }
    };
    fetchProductGroups();
  }, []);

  useEffect(() => {
    const fetchCountProducts = async () => {
      setLoadingCount(true);
      try {
        const response = await axios.get("/api/countProducts");
        setCountProducts(Math.floor(response.data.count / 1000) * 1000);
      } catch (error) {
        console.error("Error fetching count products:", error);
        setCountProducts(0);
      } finally {
        setLoadingCount(false);
      }
    };
    fetchCountProducts();
  }, []);

  useEffect(() => {
    const fetchCountProductGroups = async () => {
      setLoadingCountPG(true);
      try {
        const response = await axios.get("/api/countProductGroups");
        setCountProductGroups(Math.floor(response.data.count / 100) * 100);
      } catch (error) {
        console.error("Error fetching count productgroups:", error);
        setCountProductGroups(0);
      } finally {
        setLoadingCountPG(false);
      }
    };
    fetchCountProductGroups();
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomer(true);
      try {
        const response = await axios.get("/api/countCustomer");
        setCountCustomer(Math.floor(response.data.count / 1000) * 1000);
      } catch (error) {
        console.error("Error fetching count customers:", error);
        setCountCustomer(0);
      } finally {
        setLoadingCustomer(false);
      }
    };
    fetchCustomers();
  }, []);

  // Hàm xác định label, icon và href cho Sale Orders dựa trên chucVuVi
  const getSaleOrdersConfig = (isDesktop = false) => {
    if (employeeData && employeeData.chucVuVi === 283640045) {
      return {
        label: "Price by Customer",
        icon: "👔",
        href: "/price-by-customer",
      };
    }
    return {
      label: "Sale Orders",
      icon: "🚚",
      href: "/sale-orders",
    };
  };

  // Hàm icon cho từng nhóm với emoji giống trang /top-san-pham-ban-chay
  const getIcon = (groupName: string) => {
    const normalized = groupName
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[đĐ]/g, "d");

    // Máy móc & Thiết bị công nghiệp
    if (normalized.includes("may moc") || normalized.includes("maymoc"))
      return "⚙️";
    if (
      normalized.includes("thiet bi cong nghiep") ||
      normalized.includes("thietbicongnghiep")
    )
      return "🏭";
    if (
      normalized.includes("thiet bi") &&
      !normalized.includes("van chuyen") &&
      !normalized.includes("bao ho")
    )
      return "🔧";

    // Thiết bị vận chuyển
    if (
      normalized.includes("thiet bi van chuyen") ||
      normalized.includes("vanchuyen") ||
      normalized.includes("van chuyen")
    ) {
      return "🚚";
    }

    // Bảo hộ lao động
    if (
      normalized.includes("bao ho") ||
      normalized.includes("an toan") ||
      normalized.includes("lao dong")
    ) {
      return "🛡️";
    }

    // Bao bì & Đóng gói
    if (normalized.includes("bao bi") || normalized.includes("dong goi")) {
      return "📦";
    }

    // Phụ tùng thay thế
    if (normalized.includes("phu tung") || normalized.includes("thay the")) {
      return "🔧";
    }

    // Vật tư tiêu hao
    if (
      normalized.includes("vat tu tieu hao") ||
      normalized.includes("tieu hao")
    ) {
      return "♻️";
    }

    // Kim khí & Phụ kiện
    if (normalized.includes("kim khi") || normalized.includes("phu kien")) {
      return "📦";
    }

    // Công cụ - Dụng cụ
    if (normalized.includes("cong cu") || normalized.includes("dung cu")) {
      return "🔨";
    }

    // Hóa chất
    if (normalized.includes("hoa chat") || normalized.includes("hoachat")) {
      return "🧪";
    }

    // Điện & Điện tử
    if (normalized.includes("dien") || normalized.includes("dien tu")) {
      return "⚡";
    }

    // Nhà máy & Xưởng
    if (normalized.includes("nha may") || normalized.includes("xuong")) {
      return "🏭";
    }

    // Lưu kho & Vận chuyển
    if (normalized.includes("luu kho") || normalized.includes("kho hang")) {
      return "🚚";
    }

    // Default icon
    return "📋";
  };
  // Hàm chọn danh mục
  const handleCategorySelect = (item: any) => {
    const productGroupId = item.crdfd_productgroupid;
    if (!productGroupId) return;
    const productNameSlug = item.crdfd_productname
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
    const newUrl = `/san-pham/${productNameSlug}`;
    window.location.href = newUrl;
  };

  // const toggleCart = () => setIsCartOpen((prev) => !prev);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  // Auto slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % 3);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Function to check if it's desktop view
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Add scroll function for smooth scrolling to sections
  const scrollToSection = useCallback((sectionId: string) => {
    // Immediate feedback
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 120;
      const elementPosition = element.offsetTop - headerHeight;

      // Use requestAnimationFrame for smoother scroll
      requestAnimationFrame(() => {
        window.scrollTo({
          top: elementPosition,
          behavior: "smooth",
        });
      });
    }
  }, []);

  const handleShortcutClick = useCallback(
    (item: any) => {
      if (item.isScroll) {
        scrollToSection("hot-products");
      }
    },
    [scrollToSection]
  );

  const handleSearch = (term: React.SetStateAction<string>) => {
    setSearchTerm(term);
  };

  // Helper: convert text to slug for product group links
  const toSlug = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");

  const handleSelectGroup = useCallback(
    (
      groupName: string | null,
      image: string,
      giaMin: string,
      giaMax: string
    ) => {
      setSelectedProductGroup((prev) =>
        prev !== groupName ? groupName : prev
      );
      setSelectedGroupImage((prev) => (prev !== image ? image : prev));
      setSelectedGroupMinPrice((prev) =>
        prev !== parseFloat(giaMin) ? parseFloat(giaMin) : prev
      );
      setSelectedGroupMaxPrice((prev) =>
        prev !== parseFloat(giaMax) ? parseFloat(giaMax) : prev
      );
      setBreadcrumb((prev) =>
        groupName && (!prev.length || prev[prev.length - 1] !== groupName)
          ? [...prev, groupName]
          : prev
      );
    },
    []
  );

  const cartItemsCount = cartItems.length;

  // Add this useEffect to fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const customerId = getItem("id");
        const response = await axios.get("/api/getTop30ProductsWithPromotion", {
          params: { customerId },
        });
        setProducts(response.data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
        const apiError = new Error(
          error instanceof Error ? error.message : "Failed to fetch products"
        ) as ApiError;
        setProductsError(apiError);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Add custom styles for animations
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      
      .animate-fade-in-up {
        animation: fadeInUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      
      .animate-slide-in-left {
        animation: slideInLeft 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      
      .animate-pulse-slow {
        animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      @keyframes bounceY {
        0%, 100% { transform: translate3d(0, 0, 0); }
        50% { transform: translate3d(0, 4px, 0); }
      }
      .animate-bounce-slow {
        animation: bounceY 1.2s cubic-bezier(0.33, 1, 0.68, 1) infinite;
      }
      
      .hover-lift {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .hover-lift:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
      
      .gradient-text {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .glass-effect {
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.18);
      }
      
      /* Product card improvements */
      .product-card {
        transition: all 0.2s ease;
        border: 1px solid #e5e7eb;
      }
      
      .product-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.1);
        border-color: #3b82f6;
      }
      
      .product-card .add-button {
        background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
        transition: all 0.2s ease;
      }
      
      .product-card .add-button:hover {
        transform: scale(1.02);
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
      }
      
      /* Section improvements */
      .section-header {
        position: relative;
      }
      
      .section-header::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 0;
        width: 60px;
        height: 3px;
        background: linear-gradient(90deg, #3b82f6, #06b6d4);
        border-radius: 2px;
      }
      
      /* Loading improvements */
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
      }
      
             @keyframes loading {
         0% {
           background-position: 200% 0;
         }
         100% {
           background-position: -200% 0;
         }
       }
       
       /* Hide scrollbar */
       .scrollbar-hide {
         -ms-overflow-style: none;
         scrollbar-width: none;
       }
       .scrollbar-hide::-webkit-scrollbar {
         display: none;
       }
       
       /* Remove underline from links */
       .no-underline {
         text-decoration: none !important;
       }
       .no-underline:hover {
         text-decoration: none !important;
       }

      /* Respect reduced motion preferences */
      @media (prefers-reduced-motion: reduce) {
        .animate-fade-in-up,
        .animate-slide-in-left,
        .animate-pulse,
        .animate-pulse-slow,
        .animate-bounce,
        .animate-bounce-slow,
        .animate-spin,
        .animate-in {
          animation: none !important;
        }
        .transition-all,
        .transition {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (style.parentNode === document.head) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const handleAddToCart = useCallback(
    async (product: TopProduct, quantity: number) => {
      try {
        // Convert TopProduct to the format expected by addToCart
        const cartProduct = {
          crdfd_productsid: product.productId,
          crdfd_name: product.crdfd_tensanphamtext,
          cr1bb_giaban: product.cr1bb_giaban.toString(),
          cr1bb_imageurl: product.cr1bb_imageurl,
          unit: product.don_vi_DH,
          price: product.cr1bb_giaban.toString(),
          don_vi_DH: product.don_vi_DH,
          crdfd_giatheovc: parseFloat(product.crdfd_giatheovc) || 0,
          crdfd_thuonghieu: product.crdfd_thuonghieu || "",
          crdfd_quycach: product.crdfd_quycach || "",
          crdfd_hoanthienbemat: product.crdfd_hoanthienbemat || "",
          crdfd_masanpham: product.crdfd_masanpham || "",
          _crdfd_productgroup_value: product._crdfd_productgroup_value || "",
          crdfd_onvichuantext: product.crdfd_onvichuantext || "",
          _crdfd_onvi_value: product._crdfd_onvi_value || "",
          cr1bb_tylechuyenoi: product.cr1bb_tylechuyenoi?.toString() || "0",
          promotion: product.promotion,
          // Add other required fields with default values
          priceChangeReason: "",
          isPriceUpdated: false,
          crdfd_chatlieu: "",
          crdfd_nhomsanphamtext: product.crdfd_nhomoituongtext || "",
          crdfd_productgroup: "",
          cr1bb_giaban_Bg: "",
          cr1bb_nhomsanphamcha: "",
          crdfd_manhomsp: "",
          crdfd_fullname: product.crdfd_tensanphamtext,
          cr1bb_imageurlproduct: product.cr1bb_imageurl,
          // Add missing required properties
          cr1bb_banchatgiaphatra: undefined,
          cr1bb_giakhongvat: undefined,
          crdfd_onvichuan: product.don_vi_DH,
          crdfd_onvi: product._crdfd_onvi_value || "",
          crdfd_trangthaihieulucname: undefined,
          crdfd_trangthaihieuluc: undefined,
          crdfd_gtgt: product.crdfd_gtgt ?? 0,
          crdfd_gtgt_value: product.crdfd_gtgt_value ?? product.crdfd_gtgt ?? 0,
        };

        await addToCart(cartProduct, quantity);
        // Removed openCart() - no auto-open cart after adding product
        toast.success("Thêm vào giỏ hàng thành công", {
          position: "top-right",
          autoClose: 1200,
          hideProgressBar: false,
          closeOnClick: true,
          rtl: false,
          pauseOnFocusLoss: true,
          draggable: true,
          draggablePercent: 5,
          pauseOnHover: true,
          theme: "light",
        });
      } catch (error) {
        console.error("Error adding to cart:", error);
        toast.error("Có lỗi xảy ra khi thêm vào giỏ hàng");
      }
    },
    [addToCart]
  );

  // Chuyển TopProduct sang Products cho TopProductsList
  const convertTopProductToProducts = (product: TopProduct): Products => ({
    crdfd_productsid: product.productId,
    crdfd_fullname: product.crdfd_tensanphamtext,
    crdfd_name: product.crdfd_tensanphamtext,
    crdfd_masanpham: product.crdfd_masanpham,
    crdfd_thuonghieu: product.crdfd_thuonghieu,
    crdfd_quycach: product.crdfd_quycach,
    cr1bb_giaban: product.cr1bb_giaban.toString(),
    _crdfd_productgroup_value: product._crdfd_productgroup_value || "",
    don_vi_DH: product.don_vi_DH,
    crdfd_onvichuantext: product.crdfd_onvichuantext,
    cr1bb_imageurlproduct:
      product.cr1bb_imageurlproduct || product.cr1bb_imageurl,
    cr1bb_imageurl: product.cr1bb_imageurl,
    crdfd_hoanthienbemat: product.crdfd_hoanthienbemat,
    crdfd_nhomsanphamtext: product.crdfd_nhomoituongtext,
    _crdfd_onvi_value: product._crdfd_onvi_value,
    crdfd_gtgt: product.crdfd_gtgt,
    crdfd_gtgt_value: product.crdfd_gtgt_value ?? undefined,
    crdfd_giatheovc: product.crdfd_giatheovc
      ? Number(product.crdfd_giatheovc)
      : undefined,
    crdfd_onvichuan: product.don_vi_DH,
    crdfd_onvi: product._crdfd_onvi_value,
    crdfd_trangthaihieulucname: undefined,
    crdfd_trangthaihieuluc: undefined,
    cr1bb_tylechuyenoi: product.cr1bb_tylechuyenoi
      ? product.cr1bb_tylechuyenoi.toString()
      : undefined,
    promotion: product.promotion
      ? {
        promotionId: product.promotion.promotionId || "",
        value: product.promotion.value,
        value2: product.promotion.value2,
        cr1bb_vn: product.promotion.vn,
        name: product.promotion.name,
        conditions: product.promotion.conditions,
        soluongapdung: product.promotion.soluongapdung
          ? Number(product.promotion.soluongapdung)
          : undefined,
      }
      : undefined,
  });

  // Wrapper để truyền đúng kiểu cho ProductGroupList
  const handleAddToCartWrapper = (product: Products, quantity: number) => {
    // Chuyển đổi Products sang TopProduct (map các trường cơ bản, các trường thiếu để mặc định)
    const topProduct: TopProduct = {
      crdfd_tensanphamtext: product.crdfd_name || product.crdfd_fullname || "",
      total: 0,
      productId: product.crdfd_productsid || "",
      cr1bb_imageurl:
        product.cr1bb_imageurl || product.cr1bb_imageurlproduct || "",
      cr1bb_imageurlproduct:
        product.cr1bb_imageurlproduct || product.cr1bb_imageurl || "",
      crdfd_thuonghieu: product.crdfd_thuonghieu || "",
      crdfd_quycach: product.crdfd_quycach || "",
      crdfd_hoanthienbemat: product.crdfd_hoanthienbemat || "",
      crdfd_masanpham: product.crdfd_masanpham || "",
      cr1bb_giaban: Number(product.cr1bb_giaban) || 0,
      crdfd_giatheovc: String(product.crdfd_giatheovc || ""),
      crdfd_onvichuantext: product.crdfd_onvichuantext || "",
      don_vi_DH: product.don_vi_DH || "",
      _crdfd_productgroup_value: product._crdfd_productgroup_value || "",
      crdfd_nhomoituongtext: product.crdfd_nhomsanphamtext || "",
      cr1bb_nhomsanpham: product.cr1bb_nhomsanphamcha || "",
      crdfd_gtgt: product.crdfd_gtgt || 0,
      crdfd_gtgt_value: product.crdfd_gtgt_value || 0,
      _crdfd_onvi_value: product._crdfd_onvi_value || "",
      cr1bb_tylechuyenoi: product.cr1bb_tylechuyenoi
        ? Number(product.cr1bb_tylechuyenoi)
        : 0,
      promotion: product.promotion,
      has_promotion: product.hasPromotion || false,
      crdfd_onvi: product.crdfd_onvi || "",
      crdfd_maonvi: "",
    };
    handleAddToCart(topProduct, quantity).catch(console.error);
  };

  // Section style: tiêu đề căn trái, không có mô tả
  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="py-6 md:py-12">
      <div
        className={`mb-2 md:mb-6 text-left ${title === "Sản phẩm bán chạy" ? "px-[5px] md:px-[50px]" : ""
          }`}
      >
        {title === "Sản phẩm bán chạy" && !isDesktop ? null : (
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 mb-1 md:mb-2">
            {title}
          </h2>
        )}
      </div>
      <div className="relative">{children}</div>
    </section>
  );

  // Detect mobile/desktop
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  const userType = getItem("type");
  const showHotProducts = false;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col overflow-x-hidden">
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Wecare E-commerce - Siêu thị công nghiệp",
              url: "https://wecare-ecommerce.com",
              potentialAction: {
                "@type": "SearchAction",
                target:
                  "https://wecare-ecommerce.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </Head>

      {/* JD Style Layout */}
      <div className="bg-white">
        {/* Header with Search */}
        <JDStyleHeader
          cartItemsCount={cartItemsCount}
          onSearch={handleSearch}
          onCartClick={openCart}
        />

        {/* Main Layout */}
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 xl:px-16 pt-[115px]">
          <div className="flex flex-col lg:flex-row">
            {/* Spacer for CategoryMenu dropdown on Desktop */}
            <div className="hidden lg:block w-[280px] flex-shrink-0" />
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <JDStyleMainContent
                categoryGroups={categoryGroups}
                onCategorySelect={handleCategorySelect}
                getIcon={getIcon}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="w-full max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 xl:px-16 pt-0">

        {/* DESKTOP Feature Cards dưới Hero (ẩn theo yêu cầu) */}
        <section id="features-b2b" className="hidden">
          <Reveal as="div" direction="up" className="rounded-none p-6 lg:p-8 bg-gradient-to-br from-slate-800 to-neutral-800 shadow-xl ring-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
              {[{
                icon: "📦", title: "Danh mục vật tư & thiết bị", desc: "Kho sản phẩm chuẩn doanh nghiệp: vật tư, thiết bị, linh kiện đáp ứng đa dạng ngành nghề."
              }, {
                icon: "🛡️", title: "Giao dịch bảo chứng", desc: "Chứng từ đầy đủ (Hợp đồng, Hóa đơn VAT), điều khoản thanh toán linh hoạt, bảo vệ đơn hàng end‑to‑end."
              }, {
                icon: "🚚", title: "Quy trình mua hàng một cửa", desc: "Luồng B2B liền mạch: yêu cầu báo giá → phê duyệt → đặt hàng → giao nhận → đối soát."
              }, {
                icon: "🤝", title: "Giải pháp theo nhu cầu doanh nghiệp", desc: "Giá/chiết khấu theo hợp đồng, chính sách công nợ & hạn mức, hỗ trợ kỹ thuật và chăm sóc sau bán."
              }].map((item, idx) => (
                <Reveal key={idx} as="div" delay={idx * 120} className="rounded-2xl bg-slate-700/60 hover:bg-slate-700/80 transition hover:ring-amber-400/30 shadow-[0_1px_0_rgba(0,0,0,0.25)_inset] ring-1 ring-slate-600 p-6 lg:p-7 text-slate-100">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">{item.icon}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100 leading-snug">
                      {item.title}
                    </div>
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed">
                    {item.desc}
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </section>
        {/* Shortcut Section - MOBILE UI với swipe */}
        <ShortcutSection
          items={[
            { icon: "🛒", label: "Tất cả sản phẩm 1", href: "/san-pham" },
            {
              icon: "🔥",
              label: "Sản phẩm bán chạy",
              href: "/top-san-pham-ban-chay",
            },
            { icon: "🏷️", label: "Khuyến mãi", href: "/promotion" },
            { icon: "📰", label: "Tin tức", href: "/post" },
            // Ẩn lịch sử đơn hàng và thanh toán cho tất cả user types
            // Chỉ hiển thị cho các user type khác nếu cần
            ...(userType === "sale"
              ? [
                {
                  icon: "👔",
                  label: getSaleOrdersConfig(false).label,
                  href: getSaleOrdersConfig(false).href,
                },
              ]
              : []),
          ]}
        />
        {/* Home Benefits Panel - banners similar to sample */}
        <HomeBenefitsPanel />
        {/* Shortcut Section - DESKTOP với thiết kế tròn (ẩn theo yêu cầu) */}
        <section className="hidden">
          <div className="flex flex-nowrap w-full gap-4 p-6 bg-transparent justify-center">
            {[
              {
                icon: "🛒",
                label: "Tất cả sản phẩm",
                href: "/san-pham",
                isScroll: false,
              },
              {
                icon: "🔥",
                label: "Sản phẩm bán chạy",
                href: "/top-san-pham-ban-chay",
                isScroll: false,
              },
              {
                icon: "🏷️",
                label: "Khuyến mãi",
                href: "/promotion",
                isScroll: false,
              },
              { icon: "📰", label: "Tin tức", href: "/post", isScroll: false },
              // Ẩn lịch sử đơn hàng và thanh toán nếu là sale
              ...(userType !== "sale"
                ? [
                  {
                    icon: "📜",
                    label: "Lịch sử đơn hàng",
                    href: "/history-order",
                    isScroll: false,
                  },
                  {
                    icon: "💳",
                    label: "Lịch sử thanh toán",
                    href: "/history-payment",
                    isScroll: false,
                  },
                ]
                : []),
              ...(userType === "sale"
                ? [
                  {
                    icon: "👔",
                    label: getSaleOrdersConfig(true).label,
                    href: getSaleOrdersConfig(true).href,
                    isScroll: false,
                  },
                ]
                : []),
            ].map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                className="group flex flex-col items-center justify-center transition-all duration-200 cursor-pointer py-3"
                style={{ textDecoration: "none" }}
              >
                {/* Icon container - circular */}
                <div className="relative mb-3 group-hover:scale-105 transition-all duration-200">
                  <div className="w-24 h-24 flex items-center justify-center rounded-full bg-white border border-gray-200 group-hover:border-gray-300 transition-all duration-200 shadow-sm group-hover:shadow-md">
                    <span className="text-4xl">{item.icon}</span>
                  </div>
                </div>

                {/* Label */}
                <span className="text-sm font-normal text-gray-600 text-center leading-tight group-hover:text-gray-800 transition-colors duration-200 px-2">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
        {/* Company Intro Section (hidden) */}
        <section className="relative mb-3 hidden">
          {/* Nền full-width để tách vùng */}
          <div aria-hidden className="pointer-events-none absolute inset-0 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-stone-100" />
          {/* Đường phân tách trên/dưới để nổi khối rõ hơn */}
          <div aria-hidden className="pointer-events-none absolute -top-px left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-px w-screen bg-stone-200/90" />
          <div aria-hidden className="pointer-events-none absolute -bottom-px left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-px w-screen bg-stone-200/90" />
          <div className="relative px-[5px] md:px-[50px]">
            <div className="py-6 md:py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <Reveal as="div" direction="up" className="md:basis-3/5">
                <h2 className="text-xl md:text-3xl font-bold text-gray-900 leading-tight">
                  Wecare – Giải pháp toàn diện giúp doanh nghiệp dễ dàng nhập
                  hàng, tối ưu chuỗi cung ứng và nâng cao hiệu quả vận hành.
                </h2>
              </Reveal>
              <Reveal as="div" direction="up" delay={150} className="md:basis-2/5 grid grid-cols-2 gap-x-8 gap-y-8">
                <div className="flex items-start h-20 md:h-24">
                  <span className="inline-block w-[3px] md:w-[4px] h-8 md:h-10 bg-gray-300 rounded mr-3 md:mr-4 flex-shrink-0"></span>
                  <div className="flex flex-col justify-center h-full">
                    <div className="text-2xl md:text-3xl font-extrabold text-blue-600">
                      {animatedProducts.toLocaleString()}+
                    </div>
                    <div className="text-xs md:text-sm text-gray-900 mt-1">
                      sản phẩm
                    </div>
                  </div>
                </div>
                <div className="flex items-start h-20 md:h-24">
                  <span className="inline-block w-[3px] md:w-[4px] h-8 md:h-10 bg-gray-300 rounded mr-3 md:mr-4 flex-shrink-0"></span>
                  <div className="flex flex-col justify-center h-full">
                    <div className="text-2xl md:text-3xl font-extrabold text-blue-600">
                      {animatedProductGroups.toLocaleString()}+
                    </div>
                    <div className="text-xs md:text-sm text-gray-900 mt-1">
                      danh mục
                    </div>
                  </div>
                </div>
                <div className="flex items-start h-20 md:h-24">
                  <span className="inline-block w-[3px] md:w-[4px] h-8 md:h-10 bg-gray-300 rounded mr-3 md:mr-4 flex-shrink-0"></span>
                  <div className="flex flex-col justify-center h-full">
                    <div className="text-2xl md:text-3xl font-extrabold text-blue-600">
                      {animatedCustomer.toLocaleString()}+
                    </div>
                    <div className="text-xs md:text-sm text-gray-900 mt-1">
                      khách hàng đã phục vụ
                    </div>
                  </div>
                </div>
                <div className="flex items-start h-20 md:h-24">
                  <span className="inline-block w-[3px] md:w-[4px] h-8 md:h-10 bg-gray-300 rounded mr-3 md:mr-4 flex-shrink-0"></span>
                  <div className="flex flex-col justify-center h-full">
                    <img
                      src="/ban-do-viet-nam-vector-inkythuatso.svg"
                      alt="Bản đồ Việt Nam"
                      className="w-16 h-12 md:w-20 md:h-16 object-contain filter drop-shadow-lg mb-2"
                      style={{
                        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                        maxWidth: '100%',
                        height: 'auto'
                      }}
                    />
                    <div className="text-xs md:text-sm text-gray-900">
                      có mặt trên toàn quốc
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
        {/* Divider */}
        {/* <div className="w-full h-[6px] bg-gray-100 rounded-full my-2"></div> */}

        {/* Business Opportunity Section */}
        <section className="relative">
          {/* Nền full-width tinh tế, khác vùng dưới nhưng không quá nổi */}
          <div aria-hidden className="pointer-events-none absolute inset-0 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-slate-50" />
          {/* Viền mảnh, trung tính */}
          <div aria-hidden className="pointer-events-none absolute -top-px left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-px w-screen bg-slate-200/70" />
          <div aria-hidden className="pointer-events-none absolute -bottom-px left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-px w-screen bg-slate-200/70" />
          <div className="relative">
            <Reveal as="div" direction="up">
              <BusinessOpportunitySection />
            </Reveal>
          </div>
        </section>
      {/* Panels Section - add below BusinessOpportunity like mẫu */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal as="div" direction="up">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <a href="/policy/freeship" className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white text-2xl">
                    <FaTruck />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">FREE SHIP</div>
                    <div className="text-sm text-gray-500">Miễn phí vận chuyển trên toàn quốc</div>
                  </div>
                </div>
              </a>

              <a href="/policy/returns" className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl">
                    <FaRedo />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">ĐỔI TRẢ</div>
                    <div className="text-sm text-gray-500">Đổi trả trong vòng 10 ngày</div>
                  </div>
                </div>
              </a>

              <a href="/about/authentic" className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl">
                    <FaShieldAlt />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">HÀNG CHÍNH HÃNG</div>
                    <div className="text-sm text-gray-500">Cam kết hàng chính hãng 100%</div>
                  </div>
                </div>
              </a>

              <a href="/payment/cod" className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl">
                    <FaMoneyBillWave />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">THANH TOÁN TẠI NHÀ</div>
                    <div className="text-sm text-gray-500">Thanh toán khi nhận hàng (COD)</div>
                  </div>
                </div>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

        {/* Divider */}
        {/* <div className="w-full h-[6px] bg-gray-100 rounded-full my-2"></div> */}
        {/* Products Section - MOBILE UI (hidden via showHotProducts) */}
        {showHotProducts && (
          <section
            id="hot-products"
            className="block md:hidden mx-2 py-4 bg-white mb-3 drop-shadow-lg inset-shadow-3xs rounded-lg"
          >
            <Reveal as="div" className="p-3" direction="up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    Sản phẩm bán chạy
                  </h2>
                </div>
                <ViewAllButton
                  href="/top-san-pham-ban-chay"
                  variant="primary"
                  size="md"
                  aria-label="Xem tất cả sản phẩm bán chạy"
                >
                  Xem tất cả
                </ViewAllButton>
              </div>
              <Suspense
                fallback={
                  <div className="grid grid-cols-1 gap-4">
                    {[...Array(10)].map((_, idx) => (
                      <div key={idx} className="animate-pulse">
                        <div className="bg-gray-200 rounded-lg h-48 mb-3"></div>
                        <div className="bg-gray-200 rounded h-4 mb-2"></div>
                        <div className="bg-gray-200 rounded h-3 w-1/2"></div>
                      </div>
                    ))}
                  </div>
                }
              >
                <ProductsList
                  products={products.slice(0, 10)}
                  onAddToCart={handleAddToCart}
                  loading={productsLoading}
                  error={productsError}
                />
              </Suspense>
            </Reveal>
          </section>
        )}
        {/* Products Section - DESKTOP (hidden via showHotProducts) */}
        {showHotProducts && (
          <section
            id="hot-products"
            className="hidden md:block py-4 px-2 bg-white mb-3 drop-shadow-lg inset-shadow-3xs rounded-lg shadow-sm"
          >
            <Reveal as="div" className="p-3" direction="up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                    Sản phẩm bán chạy
                  </h2>
                </div>
                <ViewAllButton
                  href="/top-san-pham-ban-chay"
                  variant="primary"
                  size="md"
                  aria-label="Xem tất cả sản phẩm bán chạy"
                >
                  Xem tất cả
                </ViewAllButton>
              </div>
              <Suspense
                fallback={
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4">
                    {[...Array(10)].map((_, idx) => (
                      <div key={idx} className="animate-pulse">
                        <div className="bg-gray-200 rounded-lg h-48 mb-3"></div>
                        <div className="bg-gray-200 rounded h-4 mb-2"></div>
                        <div className="bg-gray-200 rounded h-3 w-1/2"></div>
                      </div>
                    ))}
                  </div>
                }
              >
                <ProductsList
                  products={products.slice(0, 10)}
                  onAddToCart={handleAddToCart}
                  loading={productsLoading}
                  error={productsError}
                />
              </Suspense>
            </Reveal>
          </section>
        )}
        {/* Divider */}
        {/* <div className="w-full h-[6px] bg-gray-100 rounded-full my-2"></div> */}

        {/* News Section - Cải thiện layout */}
        {/* dư section */}
        {/* <section className="block md:hidden mx-2 py-4 bg-white mb-3 drop-shadow-lg inset-shadow-3xs rounded-lg shadow-sm">
          <Reveal as="div" className="p-3" direction="up">
            <div className="relative rounded-xl shadow-sm p-4 bg-white">
              <NewsSection />
            </div>
          </Reveal>
        </section> */}
        {/* </section> */}
        <Reveal as="div" direction="up">
          <NewsSection />
        </Reveal>
        {/* </section> */}
      </main>

      <Footer />
      <Toolbar />
    </div>
  );
};

// Main Home component
export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <>
      <PromotionPopup />
      <HomeContent />
    </>
  );
}
