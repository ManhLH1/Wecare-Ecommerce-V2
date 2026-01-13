import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaShoppingCart, FaCamera, FaChevronDown, FaTag, FaBoxOpen, FaFire, FaGem, FaClock, FaMoneyBillWave, FaNewspaper, FaUserCircle, FaQuestionCircle, FaBars, FaTh } from 'react-icons/fa';
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import LogoSvg from "@/assets/img/Logo-Wecare.png";
import UserIconWithMenu from "@/components/LoginMenu";
import { getItem } from "@/utils/SecureStorage";
import { usePermission } from "@/hooks/usePermission";
import axios from "axios";
import CategoryMenu from "./component_Header/CategoryMenu";
import MobileCategoryMenu from "./component_Header/MobileCategoryMenu";
import { fetchWithCache } from "@/utils/cache";

interface JDStyleHeaderProps {
  cartItemsCount: number;
  onSearch: (term: string) => void;
  onCartClick: () => void;
  hideSearch?: boolean;
}

const JDStyleHeader: React.FC<JDStyleHeaderProps> = ({
  cartItemsCount,
  onSearch,
  onCartClick,
  hideSearch = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/" || pathname === "";
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiKeywords, setAiKeywords] = useState<{
    productName: string;
    brand: string | null;
    specification: string | null;
    material: string | null;
    surfaceFinish?: string | null;
    synonyms: string[];
  } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const { permission, isLoading: permissionLoading } = usePermission();

  // Category menu state - Mobile: always starts closed
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  // Initialize isDesktop based on window width immediately to prevent auto-open on mobile
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [categoryHierarchy, setCategoryHierarchy] = useState<any>(null);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Support menu dropdown state
  const [showSupportMenu, setShowSupportMenu] = useState(false);
  const supportMenuRef = useRef<HTMLDivElement>(null);

  // Scroll direction tracking for category dropdown
  const lastScrollY = useRef<number>(0);

  useEffect(() => {
    const checkLoginStatus = () => {
      if (typeof window !== "undefined") {
        const hasId = getItem("id");
        const hasToken = getItem("token");
        const hasUserName = getItem("userName");
        const type = getItem("type");
        setIsLoggedIn(!!(hasId || hasToken || hasUserName));
        setUserType(type);
      }
    };

    checkLoginStatus();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userName" || e.key === "id" || e.key === "token" || e.key === "type") {
        checkLoginStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleSearch = (value: string) => {
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

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
    const encoded = encodeURIComponent(term);

    // Use the new URL structure with search parameter
    router.push(`/san-pham/${slug}?search=${encoded}`);
  };

  const handleOpenImageModal = () => setShowImageModal(true);
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setImagePreview(null);
    setAiKeywords(null);
    setAiError(null);
    stopCamera();
  };

  const handleImageInput = async (file?: File | null) => {
    if (!file) return;
    try {
      setIsUploading(true);
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      setImagePreview(base64);
      // Lưu tạm để màn hình /tim-kiem-bang-hinh-anh có thể lấy dùng nếu cần
      if (typeof window !== 'undefined') {
        localStorage.setItem('imageSearch:pendingImage', base64);
        localStorage.setItem('imageSearch:pendingFileName', file.name || 'image.jpg');
        localStorage.setItem('imageSearch:pendingMime', file.type || 'image/jpeg');
      }
      // Phân tích ngay trong popup để hiển thị từ khóa
      try {
        setIsAnalyzing(true);
        setAiError(null);
        const res = await fetch('/api/searchProductsByImage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: base64, mimeType: file.type || 'image/jpeg' }),
        });
        if (!res.ok) throw new Error('Phân tích hình ảnh thất bại');
        const data = await res.json();
        if (!data.success || !data.keywords) throw new Error(data.error || 'Không nhận được từ khóa');
        setAiKeywords(data.keywords);
        // Lưu để trang đích có thể dùng ngay
        if (typeof window !== 'undefined') {
          localStorage.setItem('imageSearch:aiKeywords', JSON.stringify(data.keywords));
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setIsAnalyzing(false);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Camera functions
  const startCamera = async () => {
    setCameraLoading(true);
    try {
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAiError('Trình duyệt không hỗ trợ camera. Vui lòng sử dụng trình duyệt mới hơn.');
        setCameraLoading(false);
        return;
      }

      // Check if we're on HTTPS or localhost
      const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost';
      if (!isSecureContext) {
        setAiError('Camera chỉ hoạt động trên HTTPS hoặc localhost. Vui lòng sử dụng chức năng upload file.');
        setCameraLoading(false);
        return;
      }

      console.log('🎥 Requesting camera access...');

      // Try with back camera first, then fallback to any camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
          }
        });
      } catch (backCameraError) {
        console.log('Back camera not available, trying any camera...');
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } catch (fallbackError) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
      }

      console.log('📹 Stream obtained:', {
        active: stream.active,
        tracks: stream.getTracks().length
      });

      setCameraStream(stream);
      setShowCamera(true);
      setAiError(null);
      setCameraLoading(false);
    } catch (error: any) {
      console.error('Error accessing camera:', error);

      let errorMessage = 'Không thể truy cập camera. ';

      if (error.name === 'NotAllowedError') {
        errorMessage += 'Vui lòng cấp quyền truy cập camera trong trình duyệt và thử lại.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Không tìm thấy camera trên thiết bị. Vui lòng kiểm tra thiết bị có camera.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Trình duyệt không hỗ trợ camera. Vui lòng sử dụng trình duyệt mới hơn.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác và thử lại.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Camera không hỗ trợ cài đặt yêu cầu. Vui lòng thử lại.';
      } else {
        errorMessage += 'Lỗi không xác định. Vui lòng thử lại hoặc sử dụng chức năng upload file.';
      }

      setAiError(errorMessage);
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.save();
        context.scale(-1, 1);
        context.drawImage(video, -video.videoWidth, 0, video.videoWidth, video.videoHeight);
        context.restore();

        canvas.toBlob((blob: Blob | null) => {
          if (blob) {
            const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            handleImageInput(file);
            stopCamera();
          } else {
            setAiError('Không thể chụp ảnh. Vui lòng thử lại.');
          }
        }, 'image/jpeg', 0.9);
      } else {
        setAiError('Camera chưa sẵn sàng. Vui lòng đợi một chút và thử lại.');
      }
    }
  };

  // Check camera support on component mount
  useEffect(() => {
    const checkCameraSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraSupported(false);
        return;
      }

      // Check if we're on HTTPS or localhost
      const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost';
      if (!isSecureContext) {
        setCameraSupported(false);
        return;
      }

      setCameraSupported(true);
    };

    checkCameraSupport();
  }, []);

  // Detect desktop viewport to auto-open category dropdown like sieuthihaiminh.vn
  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === "undefined") return;
      const newIsDesktop = window.innerWidth >= 1024;
      setIsDesktop(newIsDesktop);
      // If switching to mobile, ensure menu is closed
      if (!newIsDesktop) {
        setShowCategoryMenu(false);
      }
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  // Auto-open CategoryMenu when hero banner is visible, auto-close when it scrolls away
  // This behavior ONLY applies on DESKTOP homepage. Mobile NEVER auto-opens.
  useEffect(() => {
    // CRITICAL: Mobile check must be FIRST and ALWAYS return early
    if (typeof window === "undefined") return;

    // Mobile: Always ensure closed, never auto-open - check immediately
    if (!isDesktop) {
      setShowCategoryMenu(false);
      return;
    }

    // Desktop only from here
    if (!isHomePage) {
      // On non-homepage desktop, don't auto-show based on scroll
      setShowCategoryMenu(false);
      return;
    }

    // Desktop homepage only: auto-open/close based on hero banner visibility
    // Use Intersection Observer to detect when hero banner is visible
    let observer: IntersectionObserver | null = null;

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      // Find the hero banner container by ID
      const heroContainer = document.getElementById('hero-banner');

      if (heroContainer) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              // Open menu when hero banner is intersecting (visible)
              // Close menu when hero banner is not intersecting (scrolled away)
              setShowCategoryMenu(entry.isIntersecting);
            });
          },
          {
            // Trigger when at least 30% of hero banner is visible
            threshold: 0.3,
            // Add some margin to trigger slightly before/after hero banner edge
            rootMargin: '0px 0px -100px 0px'
          }
        );

        observer.observe(heroContainer);
      } else {
        // Fallback: if can't find hero banner, open menu at top of page
        const handleScroll = () => {
          const currentScrollY = window.scrollY;
          setShowCategoryMenu(currentScrollY < 100);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => window.removeEventListener("scroll", handleScroll);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [isDesktop, isHomePage]);

  // Fetch category data
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

  // Handle category select
  const handleCategorySelect = (item: any) => {
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
    setShowCategoryMenu(false);
  };

  // Close category menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is inside category menu dropdown (desktop only)
      if (isDesktop && showCategoryMenu) {
        // Check if click is inside the button container
        const isInsideButton = categoryMenuRef.current?.contains(target);
        // Check if click is inside the dropdown menu (by checking for CategoryMenu component elements)
        const isInsideDropdown = (target as Element)?.closest('.category-menu-dropdown') !== null;

        // Only close if clicking outside both button and dropdown
        if (!isInsideButton && !isInsideDropdown) {
          setShowCategoryMenu(false);
        }
      }

      // Support menu click outside handling
      if (supportMenuRef.current && !supportMenuRef.current.contains(target)) {
        setShowSupportMenu(false);
      }
    };
    if (showCategoryMenu || showSupportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCategoryMenu, showSupportMenu, isDesktop]);

  // Assign camera stream to video element when it changes
  useEffect(() => {
    if (cameraStream && videoRef.current && showCamera) {
      console.log('🔗 Assigning stream to video element');
      videoRef.current.srcObject = cameraStream;

      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => {
              console.log('✅ Video is now playing');
              setCameraLoading(false);
            })
            .catch((err) => {
              console.error('❌ Error playing video:', err);
              setAiError('Không thể phát video từ camera. Vui lòng thử lại.');
              setCameraLoading(false);
            });
        }
      };
    }
  }, [cameraStream, showCamera]);

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Function to get menu items based on user type and permissions
  const getMenuItems = () => {
    const baseItems = [
      { href: "/san-pham", label: "Tất cả sản phẩm" },
      { href: "/top-san-pham-ban-chay", label: "Sản phẩm bán chạy" },
    ];

    // Add user-specific items based on type and permissions
    if (userType === "customer") {
      return [
        ...baseItems,
        { href: "/promotion", label: "Khuyến mãi" },
        { href: "/post", label: "Tin tức" },
      ];
    } else if (userType === "saleonline") {
      // Sale Online: Có thể xem giá, không thể tạo đơn hàng
      return [
        ...baseItems,
        { href: "/promotion", label: "Khuyến mãi" },
        { href: "/price-by-customer", label: "Giá theo khách hàng" },
        { href: "/post", label: "Tin tức" },
      ];
    } else if (userType === "saledirect") {
      // Sale Direct: Có thể tạo đơn hàng, không thể xem lịch sử
      return [
        ...baseItems,
        { href: "/sale-orders", label: "Đặt hàng" },
        { href: "/post", label: "Tin tức" },
      ];
    } else if (userType === "sale") {
      // Sale thường: Chỉ có menu cơ bản
      return [
        ...baseItems,
        { href: "/post", label: "Tin tức" },
      ];
    }

    // Default items for non-logged in users
    return [
      ...baseItems,
      { href: "/promotion", label: "Khuyến mãi" },
      { href: "/post", label: "Tin tức" },
    ];
  };

  return (
    <>
      <header className="w-full fixed top-0 left-0 z-50 bg-white shadow-sm">
        {/* Top Navigation Bar - Tạm thời ẩn */}
        <div className="hidden w-full bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between text-xs h-6">
              <div className="flex items-center gap-2">
                {getMenuItems().map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className="text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-1.5 rounded-md transition-all duration-200 no-underline flex items-center text-xs font-medium hover:shadow-sm"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {/* Cart Icon */}
                {typeof window !== "undefined" && (
                  <button
                    type="button"
                    onClick={onCartClick}
                    className="relative flex items-center justify-center focus:outline-none text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 p-2 rounded-md transition-all duration-200 hover:shadow-md hover:scale-105"
                  >
                    <FaShoppingCart className="text-sm" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold px-1 border-2 border-white shadow-lg z-10 animate-pulse">
                        {cartItemsCount}
                      </span>
                    )}
                  </button>
                )}

                {isLoggedIn === null ? (
                  <div className="w-[80px] h-[16px] bg-gray-200 animate-pulse rounded flex items-center"></div>
                ) : isLoggedIn ? (
                  <div className="flex items-center">
                    <UserIconWithMenu />
                  </div>
                ) : (
                  <button
                    className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 px-3 py-1.5 rounded-md transition-all duration-200 font-medium text-xs flex items-center hover:shadow-sm"
                    onClick={() => (window.location.href = "/login")}
                  >
                    Đăng nhập
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Header with Search */}
        <div className="w-full bg-white border-b border-gray-200">
          <div className="w-full max-w-[2560px] mx-auto px-4 md:px-6 lg:px-8 xl:px-16 py-2">
            <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 lg:gap-6">
              {/* Logo - Bên trái - Compact */}
              <Link
                href="/"
                className="flex items-center gap-1.5 sm:gap-2 no-underline group hover:opacity-90 transition-opacity duration-200 flex-shrink-0"
                prefetch={false}
              >
                <span className="rounded-full bg-white p-0.5 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 shadow-sm border border-gray-100 group-hover:shadow-md transition-all duration-200">
                  <Image
                    src={LogoSvg}
                    alt="Wecare Logo"
                    width={36}
                    height={36}
                    className="object-contain rounded-full w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10"
                  />
                </span>
                <span
                  className="logo-text text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-extrabold tracking-tight leading-tight select-none no-underline group-hover:text-cyan-600 transition-colors duration-200"
                  style={{
                    textDecoration: "none",
                    borderBottom: "none",
                    color: '#3492ab',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  WECARE
                </span>
              </Link>

              {/* Search Bar - Ở giữa - Compact - Vuông vức - Thu nhỏ chiều dài */}
              {!hideSearch && (
                <div className="flex-1 flex justify-center px-2 sm:px-3 md:px-4 lg:px-6 max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
                  <form onSubmit={handleSearchSubmit} className="w-full">
                    <div className="relative flex items-stretch bg-gray-100 rounded-lg overflow-hidden shadow-inner ring-1 ring-gray-200 hover:ring-2 hover:ring-cyan-300 focus-within:ring-2 focus-within:ring-cyan-400 transition-all duration-200 h-8 sm:h-9 md:h-10 lg:h-11">
                      {/* Search Icon */}
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#FF9D00' }}>
                        <FaSearch className="h-3.5 w-3.5" />
                      </span>
                      {/* Search Input */}
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Bạn cần tìm gì hôm nay ?"
                        className="flex-1 pl-10 pr-3 py-1.5 text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent text-base font-normal"
                        aria-label="Tìm kiếm"
                      />
                      {/* Search Button - Màu cam/amber như reference */}
                      <button
                        type="submit"
                        className="px-3 md:px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all duration-200 flex items-center justify-center hover:shadow-md active:scale-95"
                        aria-label="Tìm kiếm"
                      >
                        <FaSearch className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Utility Icons - Bên phải: Giỏ hàng, Đăng nhập, Hỗ trợ - Compact - Tăng khoảng cách */}
              <div className="flex items-center gap-2 sm:gap-3.5 md:gap-3 flex-shrink-0 ml-2 sm:ml-3 md:ml-4">
                {/* Giỏ hàng */}
                {typeof window !== "undefined" && (
                  <button
                    type="button"
                    onClick={onCartClick}
                    className="relative flex flex-row items-center justify-center gap-2 focus:outline-none text-gray-700 hover:text-cyan-600 transition-colors duration-200 group px-2 py-1"
                    title="Giỏ hàng"
                  >
                    <FaShoppingCart className="text-xl sm:text-2xl group-hover:scale-110 transition-transform" />
                    <span
                      className="text-sm font-medium text-gray-600 group-hover:text-cyan-600 whitespace-nowrap hidden sm:block"
                    >
                      Giỏ hàng
                    </span>
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold px-1 border-2 border-white shadow-lg z-10">
                        {cartItemsCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Đăng nhập */}
                {isLoggedIn === null ? (
                  <div className="w-[45px] sm:w-[50px] h-[35px] sm:h-[40px] bg-gray-200 animate-pulse rounded flex flex-col items-center justify-center">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-300 rounded-full mb-0.5"></div>
                    <div className="w-8 sm:w-10 h-2 bg-gray-300 rounded hidden sm:block"></div>
                  </div>
                ) : isLoggedIn ? (
                  <div className="flex flex-row items-center justify-center gap-2 px-2 py-1">
                    <div>
                      <UserIconWithMenu />
                    </div>
                    <span
                      className="text-sm font-medium text-gray-600 whitespace-nowrap hidden sm:block"
                    >
                      Tài khoản
                    </span>
                  </div>
                ) : (
                  <button
                    className="flex flex-row items-center justify-center gap-2 text-gray-700 hover:text-cyan-600 transition-colors duration-200 group px-2 py-1"
                    onClick={() => (window.location.href = "/login")}
                    title="Đăng nhập"
                  >
                    <FaUserCircle className="text-xl sm:text-2xl group-hover:scale-110 transition-transform" />
                    <span
                      className="text-sm font-medium text-gray-600 group-hover:text-cyan-600 whitespace-nowrap hidden sm:block"
                    >
                      Đăng nhập
                    </span>
                  </button>
                )}

                {/* Hỗ trợ - Desktop only - Có dropdown menu */}
                <div className="hidden md:flex flex-row items-center relative" ref={supportMenuRef}>
                  <button
                    onClick={() => setShowSupportMenu(!showSupportMenu)}
                    className="relative flex flex-row items-center justify-center gap-2 text-gray-700 hover:text-cyan-600 transition-colors duration-200 group px-2 py-1"
                    title="Hỗ trợ"
                  >
                    <FaQuestionCircle className="text-xl sm:text-2xl group-hover:scale-110 transition-transform" />
                    <span
                      className="text-sm font-medium text-gray-600 group-hover:text-cyan-600 flex items-center gap-0.5"
                    >
                      Hỗ trợ
                      <FaChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${showSupportMenu ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {showSupportMenu && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      {/* Menu Items từ getMenuItems() */}
                      {getMenuItems().map((item, index) => (
                        <Link
                          key={index}
                          href={item.href}
                          onClick={() => setShowSupportMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors duration-200 no-underline font-normal hover:font-medium"
                        >
                          {item.label}
                        </Link>
                      ))}

                      {/* Divider */}
                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Hỗ trợ Items */}
                      <Link
                        href="/tra-cuu-don-hang"
                        onClick={() => setShowSupportMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors duration-200 no-underline font-medium"
                      >
                        Tra cứu đơn hàng
                      </Link>
                      <Link
                        href="/hinh-thuc-thanh-toan"
                        onClick={() => setShowSupportMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors duration-200 no-underline font-medium"
                      >
                        Hình thức thanh toán
                      </Link>
                      <Link
                        href="/huong-dan-mua-hang"
                        onClick={() => setShowSupportMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors duration-200 no-underline font-medium"
                      >
                        Hướng dẫn mua hàng
                      </Link>
                      <Link
                        href="/trung-tam-bao-hanh"
                        onClick={() => setShowSupportMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors duration-200 no-underline font-medium"
                      >
                        Trung tâm bảo hành
                      </Link>
                      <Link
                        href="/kinh-nghiem-hay"
                        onClick={() => setShowSupportMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors duration-200 no-underline font-medium"
                      >
                        Kinh nghiệm hay
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub Header - Danh mục sản phẩm */}
        <div className="w-full border-b" style={{ backgroundColor: '#3492ab' }}>
          <div className="w-full max-w-[2560px] mx-auto px-4 md:px-6 lg:px-8 xl:px-16">
            <div className="flex items-center">
              {/* Nút Danh mục sản phẩm - Desktop: hover, Mobile: click để mở full screen */}
              <div
                className="relative"
                ref={categoryMenuRef}
                onMouseEnter={() => !isHomePage && isDesktop && setShowCategoryMenu(true)}
                onMouseLeave={() => !isHomePage && isDesktop && setShowCategoryMenu(false)}
              >
                <button
                  onClick={() => {
                    // Mobile: mở full screen modal
                    if (!isDesktop) {
                      setShowCategoryMenu(true);
                    }
                    // Desktop: toggle dropdown (nếu không dùng hover)
                  }}
                  className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-none font-medium text-sm shadow-sm h-[45px] leading-tight cursor-pointer select-none w-full text-left active:bg-amber-600 transition-colors touch-manipulation"
                >
                  <FaBars className="text-base" />
                  <span className="whitespace-nowrap">Danh mục sản phẩm</span>
                  <FaChevronDown className={`text-xs transition-transform duration-200 ${showCategoryMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Desktop: Dropdown Menu - Style giống sieuthihaiminh.vn */}
                {showCategoryMenu && isDesktop && (
                  <div
                    className="category-menu-dropdown absolute top-full left-0 mt-0 z-50 bg-white rounded-b-lg shadow-2xl border border-gray-200 overflow-hidden"
                    style={{ height: '500px' }}
                    onMouseEnter={() => !isHomePage && isDesktop && setShowCategoryMenu(true)}
                    onMouseLeave={() => !isHomePage && isDesktop && setShowCategoryMenu(false)}
                  >
                    <CategoryMenu
                      categoryHierarchy={categoryHierarchy}
                      categoryGroups={categoryGroups}
                      loadingCategory={loadingCategory}
                      onCategorySelect={handleCategorySelect}
                      isMobile={false}
                      isOpen={true}
                      onClose={() => setShowCategoryMenu(false)}
                    />
                  </div>
                )}
              </div>

              {/* Tab Menu Items - Nằm bên phải nút Danh mục sản phẩm */}
              <div className="hidden lg:flex items-center ml-6 gap-1">
                {getMenuItems().map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className="flex items-center gap-1.5 text-white hover:bg-white/10 px-3 py-2 rounded transition-all duration-200 no-underline text-sm font-medium whitespace-nowrap"
                  >
                    {item.label === "Sản phẩm bán chạy" && <FaFire className="text-orange-400" />}
                    {item.label === "Khuyến mãi" && <FaTag className="text-yellow-400" />}
                    {item.label === "Tin tức" && <FaNewspaper className="text-cyan-300" />}
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>
      {showImageModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">Tìm kiếm bằng hình ảnh</h3>
              <button onClick={handleCloseImageModal} className="text-gray-500 hover:text-gray-700 text-sm">Đóng</button>
            </div>
            <div className="space-y-3">
              {/* Camera view - Show first when camera is active */}
              {showCamera ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">📷 Camera đang hoạt động</span>
                    <button
                      onClick={stopCamera}
                      className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Đóng camera
                    </button>
                  </div>

                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                      onCanPlay={() => console.log('📺 Video can play now')}
                      onPlay={() => console.log('▶️ Video is playing')}
                    />
                    {cameraLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                          <p className="text-sm">Đang khởi động camera...</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <button
                        onClick={capturePhoto}
                        disabled={cameraLoading}
                        className="w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-100 transition-all border-4 border-white disabled:opacity-50"
                        title="Chụp ảnh"
                      >
                        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-center text-gray-500 bg-blue-50 p-2 rounded border border-blue-200">
                    💡 Hướng camera vào sản phẩm và nhấn nút đỏ để chụp
                  </div>

                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-sm text-gray-700 font-medium">Chọn cách tải ảnh lên</span>

                  {/* Upload file option */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-cyan-400 transition-colors">
                    <label className="flex flex-col items-center cursor-pointer">
                      <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-600 mb-1">Chọn ảnh từ thiết bị</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageInput((e.target.files && e.target.files[0]) ? e.target.files[0] : undefined)}
                        className="hidden"
                      />
                      <span className="text-xs text-gray-400">hoặc kéo thả ảnh vào đây</span>
                    </label>
                  </div>

                  {/* Camera option - Only show on mobile */}
                  {cameraSupported && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="md:hidden w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Mở camera để chụp ảnh
                    </button>
                  )}

                  {/* Camera support info */}
                  {!cameraSupported && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                      💡 Camera không khả dụng. Vui lòng sử dụng HTTPS hoặc chọn ảnh từ thiết bị.
                    </div>
                  )}
                </div>
              )}
              {imagePreview && (
                <div className="rounded border border-gray-200 p-2">
                  <img src={imagePreview} alt="Preview" className="max-h-60 w-full object-contain" />
                </div>
              )}
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-cyan-700 bg-cyan-50 border border-cyan-200 p-2 rounded">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span className="text-sm">Đang phân tích hình ảnh với AI...</span>
                </div>
              )}
              {aiError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">{aiError}</div>
              )}
              {/* AI Keywords - COMMENTED OUT
            {aiKeywords && (
              <div className="rounded border border-blue-200 p-3 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    <span className="text-sm font-semibold text-gray-800">Từ Khóa AI Tạo Ra</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    aiKeywords.productName,
                    ...(aiKeywords.synonyms || []),
                    aiKeywords.brand || undefined,
                    aiKeywords.specification || undefined,
                    aiKeywords.material || undefined,
                    (aiKeywords as any).surfaceFinish || undefined,
                  ]
                    .filter((x): x is string => Boolean(x))
                    .map((kw) => (
                      <span key={kw} className="px-2 py-1 text-xs rounded-full bg-blue-600 text-white">{kw}</span>
                    ))}
                </div>
              </div>
            )}
            */}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={handleCloseImageModal} className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Hủy</button>
                <button
                  disabled={!imagePreview || isUploading || !aiKeywords}
                  onClick={() => {
                    if (aiKeywords) {
                      // Sử dụng productName chính để tìm kiếm
                      // API sẽ tự động phân tách thành các từ khóa nhỏ
                      const searchKeywords = aiKeywords.productName || '';

                      // Chuyển đổi từ khóa thành slug
                      const toSlug = (str: string) =>
                        str
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/\p{Diacritic}/gu, "")
                          .replace(/[đĐ]/g, "d")
                          .replace(/[^a-z0-9\s]/g, "")
                          .replace(/\s+/g, "-");

                      const slug = toSlug(searchKeywords);
                      // Redirect đến trang san-pham với slug
                      window.location.href = `/san-pham/${slug}?search=${encodeURIComponent(searchKeywords)}`;
                    }
                  }}
                  className="px-3 py-1.5 text-sm rounded bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {isUploading ? 'Đang xử lý...' : (isAnalyzing ? 'Đang phân tích...' : 'Tìm kiếm')}
                </button>
              </div>
              <p className="text-xs text-gray-500">Ảnh tải lên sẽ được phân tích và chuyển hướng đến trang sản phẩm.</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Full Screen Category Menu Modal */}
      {!isDesktop && (
        <MobileCategoryMenu
          isOpen={showCategoryMenu}
          onClose={() => setShowCategoryMenu(false)}
          categoryHierarchy={categoryHierarchy}
          categoryGroups={categoryGroups}
          loadingCategory={loadingCategory}
          onCategorySelect={handleCategorySelect}
        />
      )}
    </>
  );
};

export default JDStyleHeader;

