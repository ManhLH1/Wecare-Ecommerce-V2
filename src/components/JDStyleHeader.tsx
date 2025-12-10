import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaShoppingBag, FaCamera, FaChevronDown, FaTag, FaBoxOpen, FaFire, FaGem, FaClock, FaMoneyBillWave, FaNewspaper, FaUser } from 'react-icons/fa';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoSvg from "@/assets/img/Logo-Wecare.png";
import UserIconWithMenu from "@/components/LoginMenu";
import { getItem } from "@/utils/SecureStorage";
import { usePermission } from "@/hooks/usePermission";

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
      {/* Top Navigation Bar - Hidden on mobile */}
      <div className="hidden md:block w-full bg-gray-50 border-b border-gray-200">
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
                  <FaShoppingBag className="text-sm" />
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
      <div className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-2">
          <div className={`flex items-center ${hideSearch ? 'justify-between' : 'justify-between'} gap-2`}>
            {/* Logo - Compact on mobile */}
            <Link
              href="/"
              className="flex items-center gap-2 md:gap-3 no-underline group hover:scale-105 transition-transform duration-200 flex-shrink-0"
              prefetch={false}
            >
              <span className="rounded-full bg-white p-1 flex items-center justify-center w-8 h-8 md:w-12 md:h-12 shadow-sm border border-gray-100 group-hover:shadow-md transition-all duration-200">
                <Image
                  src={LogoSvg}
                  alt="Wecare Logo"
                  width={24}
                  height={24}
                  className="object-contain rounded-full md:w-9 md:h-9"
                />
              </span>
              <span
                className="logo-text text-sm md:text-xl font-extrabold tracking-wide leading-tight select-none drop-shadow-sm no-underline group-hover:text-cyan-600 transition-colors duration-200"
                style={{ 
                  textDecoration: "none", 
                  borderBottom: "none",
                  color: '#049DBF'
                }}
              >
                WECARE
              </span>
            </Link>

            {/* Search Bar - Hidden when hideSearch is true */}
            {!hideSearch && (
              <div className="flex-1 flex justify-center px-1 md:px-6">
                <form onSubmit={handleSearchSubmit} className="w-full max-w-xl">
                  <div className="relative flex items-stretch bg-white border-2 border-cyan-500 rounded overflow-hidden hover:border-cyan-600 hover:shadow-md transition-all duration-200 focus-within:border-cyan-600 focus-within:shadow-lg">
                    {/* Search Input */}
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm sản phẩm..."
                      className="flex-1 px-2 md:px-3 py-1.5 text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent text-xs md:text-sm"
                      aria-label="Tìm kiếm"
                    />
                    {/* Image Search Button */}
                    <button
                      type="button"
                      onClick={handleOpenImageModal}
                      className="px-2 md:px-3 bg-white text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 border-l border-cyan-100 transition-all duration-200 text-xs md:text-sm flex items-center gap-1"
                      title="Tìm bằng hình ảnh"
                      aria-label="Tìm bằng hình ảnh"
                    >
                      <FaCamera className="text-sm" />
                      <span className="hidden md:inline">Ảnh</span>
                    </button>
                    
                    {/* Search Button */}
                    <button
                      type="submit"
                      className="px-2 md:px-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-all duration-200 text-xs md:text-sm hover:shadow-md hover:scale-105 active:scale-95"
                      aria-label="Search"
                    >
                      Tìm
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Mobile Cart & User - Only show on mobile */}
            <div className="flex items-center gap-2 md:hidden">
              {/* Cart Icon */}
              {typeof window !== "undefined" && (
                <button
                  type="button"
                  onClick={onCartClick}
                  className="relative flex items-center justify-center focus:outline-none text-gray-600 hover:text-cyan-600 p-2 rounded-md transition-all duration-200"
                >
                  <FaShoppingBag className="text-sm" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[16px] h-[16px] flex items-center justify-center text-xs font-bold px-1 border border-white shadow-lg z-10">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              )}
              
              {/* User Menu */}
              {isLoggedIn === null ? (
                <div className="w-[60px] h-[16px] bg-gray-200 animate-pulse rounded"></div>
              ) : isLoggedIn ? (
                <UserIconWithMenu />
              ) : (
                <button
                  className="text-cyan-600 hover:text-cyan-700 px-2 py-1 rounded-md transition-all duration-200 font-medium text-xs"
                  onClick={() => (window.location.href = "/login")}
                >
                  Đăng nhập
                </button>
              )}
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
                    
                    // Debug logging
                    console.log('=== HEADER IMAGE SEARCH DEBUG ===');
                    console.log('AI Keywords:', aiKeywords);
                    console.log('Product Name (full):', aiKeywords.productName);
                    console.log('Synonyms (available but not used in search):', aiKeywords.synonyms);
                    console.log('Final Search Keywords (will be split by API):', searchKeywords);
                    console.log('Generated slug:', slug);
                    console.log('Redirect URL:', `/san-pham/${slug}?search=${encodeURIComponent(searchKeywords)}`);
                    console.log('==================================');
                    
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
    </>
  );
};

export default JDStyleHeader;
