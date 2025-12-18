"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FaCamera } from "react-icons/fa";
import MobileCategoryView from "./MobileCategoryView";

type ProductGroup = {
  crdfd_productgroupid: string;
  crdfd_productname: string;
  _crdfd_nhomsanphamcha_value?: string;
  productCount?: number;
  crdfd_image_url?: string;
};

type HierarchyResponse = {
  byLevel?: Record<string, ProductGroup[]>;
};

const textToSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");

interface ProductTreeProps {
  onCategorySelect?: (group: ProductGroup) => void;
  onSearchProduct?: (term: string) => void;
}

const ProductTree: React.FC<ProductTreeProps> = ({ onCategorySelect, onSearchProduct }) => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryHierarchy, setCategoryHierarchy] = useState<HierarchyResponse | null>(null);

  // UI states
  const [selectedMainCategory, setSelectedMainCategory] = useState<ProductGroup | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Image search states
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

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch hierarchy
  useEffect(() => {
    const fetchHierarchy = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get("/api/getProductGroupHierarchy");
        setCategoryHierarchy(res.data as HierarchyResponse);
      } catch (e: any) {
        setError("Không thể tải danh mục. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    fetchHierarchy();
  }, []);

  const level1Groups: ProductGroup[] = useMemo(() => {
    // Giữ nguyên thứ tự từ API (đã sắp xếp theo CSV)
    return (categoryHierarchy?.byLevel?.["1"] || []).slice();
  }, [categoryHierarchy]);

  const level2Groups: ProductGroup[] = useMemo(() => {
    return (categoryHierarchy?.byLevel?.["2"] || []).slice();
  }, [categoryHierarchy]);

  // Auto-select first category
  useEffect(() => {
    if (!selectedMainCategory && level1Groups.length > 0) {
      setSelectedMainCategory(level1Groups[0]);
    }
  }, [level1Groups, selectedMainCategory]);

  const getSubCategories = useCallback(
    (categoryId: string) =>
      // Giữ nguyên thứ tự từ API (đã sắp xếp theo CSV)
      level2Groups.filter((g) => g._crdfd_nhomsanphamcha_value === categoryId),
    [level2Groups]
  );

  const grouped = useMemo(() => {
    return level1Groups
      .map((main) => ({ main, sub: getSubCategories(main.crdfd_productgroupid) }))
      .filter((x) => x.sub.length > 0);
  }, [level1Groups, getSubCategories]);

  const scrollToCategory = useCallback((categoryId: string) => {
    const categoryElement = categoryRefs.current[categoryId];
    if (categoryElement && rightPanelRef.current) {
      const containerRect = rightPanelRef.current.getBoundingClientRect();
      const elementRect = categoryElement.getBoundingClientRect();
      const scrollTop = rightPanelRef.current.scrollTop;
      const targetScrollTop = scrollTop + elementRect.top - containerRect.top - 20;
      rightPanelRef.current.scrollTo({ top: targetScrollTop, behavior: "smooth" });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!rightPanelRef.current) return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const container = rightPanelRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerHeight = containerRect.height;
      const threshold = containerTop + 25;

      let closest: ProductGroup | null = null;
      let smallest = Infinity;

      Object.entries(categoryRefs.current).forEach(([categoryId, el]) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const inView = r.bottom > containerTop && r.top < containerTop + containerHeight;
        if (inView) {
          const distance = Math.abs(r.top - threshold);
          if (distance < smallest) {
            smallest = distance;
            const found = level1Groups.find((g) => g.crdfd_productgroupid === categoryId) || null;
            closest = found;
          }
        }
      });

      if (closest && closest !== selectedMainCategory) setSelectedMainCategory(closest);
    }, 100);
  }, [level1Groups, selectedMainCategory]);

  useEffect(() => {
    const container = rightPanelRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [handleScroll]);

  const toggleExpandCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const onMainCategoryClick = (group: ProductGroup) => {
    setSelectedMainCategory(group);
    setTimeout(() => scrollToCategory(group.crdfd_productgroupid), 50);
  };

  const onSubCategoryClick = (group: ProductGroup) => {
    if (onCategorySelect) onCategorySelect(group);
    const slug = textToSlug(group.crdfd_productname);
    router.push(`/san-pham/${slug}`);
  };

  // Image search handlers
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
        // Enhanced camera constraints for better mobile support
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' }, // Use back camera on mobile
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
          } 
        });
        console.log('✅ Got back camera stream');
      } catch (backCameraError) {
        console.log('⚠️ Back camera not available, trying any camera...');
        // Fallback to any available camera with more flexible constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
          console.log('✅ Got camera stream (fallback 1)');
        } catch (fallbackError) {
          // Final fallback with minimal constraints
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          });
          console.log('✅ Got camera stream (fallback 2)');
        }
      }

      console.log('📹 Stream obtained:', {
        active: stream.active,
        tracks: stream.getTracks().length,
        videoTrack: stream.getVideoTracks()[0]?.getSettings()
      });

      // Set states - useEffect will handle assigning stream to video element
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
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Apply mirror effect to match video display
        context.save();
        context.scale(-1, 1);
        context.drawImage(video, -video.videoWidth, 0, video.videoWidth, video.videoHeight);
        context.restore();
        
        // Convert to blob with better quality
        canvas.toBlob((blob) => {
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
        }, 'image/jpeg', 0.9); // Higher quality
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
      videoRef.current.srcObject = cameraStream;
      
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => console.log('✅ Video is now playing'))
            .catch((err) => {
              console.error('❌ Error playing video:', err);
              setAiError('Không thể phát video từ camera. Vui lòng thử lại.');
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

  const handleImageSearch = () => {
    if (aiKeywords) {
      // Sử dụng productName chính để tìm kiếm
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
  };

  if (loading) {
    return (
      <div className="w-[800px] h-[400px] bg-white rounded-lg shadow-xl border flex items-center justify-center">
        <div className="text-center py-6 text-[#04A1B3]">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-6 text-center text-red-600">{error}</div>
    );
  }

  const totalMain = level1Groups.length;
  const totalSub = grouped.reduce((acc, g) => acc + g.sub.length, 0);
  const totalSubProducts = level2Groups.reduce((acc, g) => acc + (g.productCount || 0), 0);

  return (
    <div
      className="w-full max-w-[1400px] lg:rounded-xl overflow-hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none", left: "clamp(0vw, 0rem, 0px)" }}
    >
      {/* Section header - Desktop only */}
      <div className="hidden lg:block px-4 pt-4 pb-3">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Khám phá danh mục</h2>
            <p className="text-xs text-gray-500 mt-1">Chọn danh mục để xem các nhóm sản phẩm chi tiết</p>
          </div>
          <form
            className="w-full md:w-[420px]"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const input = form.querySelector('input[name="quick-search"]') as HTMLInputElement | null;
              const term = (input?.value || "").trim();
              if (term && onSearchProduct) onSearchProduct(term);
            }}
          >
            <div className="flex items-center gap-2">
              <input
                name="quick-search"
                placeholder="Tìm kiếm sản phẩm..."
                className="flex-1 h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#049DBF] focus:border-transparent"
              />
              <button 
                type="button"
                onClick={handleOpenImageModal}
                className="h-9 px-3 rounded-md bg-white text-[#049DBF] border border-[#049DBF] text-sm hover:bg-[#049DBF] hover:text-white transition-colors flex items-center gap-1"
                title="Tìm bằng hình ảnh"
              >
                <FaCamera className="text-xs" />
                <span className="hidden sm:inline">Ảnh</span>
              </button>
              <button type="submit" className="h-9 px-3 rounded-md bg-[#049DBF] text-white text-sm hover:bg-[#038aa5] transition-colors">Tìm</button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Category View */}
      <div className="lg:hidden px-1 py-0">
        <MobileCategoryView
          categoryHierarchy={categoryHierarchy}
          categoryGroups={level1Groups}
          loadingCategory={loading}
          onCategorySelect={onSubCategoryClick}
          showCloseButton={false}
        />
      </div>

      <div className="hidden lg:flex lg:h-[560px]">
        {/* Left Panel (desktop) */}
        <div className="w-[300px] border-r border-gray-200 overflow-y-auto">
          <div className="p-2">
            <h3 className="text-sm font-semibold text-gray-800 px-3 py-2 border-b border-gray-200">Danh mục sản phẩm</h3>
            <ul className="mt-2">
              {level1Groups.map((group) => (
                <li key={group.crdfd_productgroupid} className="mb-1">
                  <button
                    className={`flex items-center w-full px-3 py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                      selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                        ? "bg-blue-50 text-[#049DBF] border-l-4 border-[#049DBF]"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => onMainCategoryClick(group)}
                  >
                    <span className="flex-1 text-left truncate">{group.crdfd_productname}</span>
                    {group.productCount !== undefined && group.productCount > 0 && (
                      <span className="text-xs text-gray-400 ml-2">({group.productCount})</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Panel - Desktop only */}
        <div ref={rightPanelRef} className="flex-1 overflow-y-auto lg:max-w-[calc(100%-300px)]">
          {grouped.length > 0 ? (
            <div className="p-4 max-w-full">
              {grouped.map(({ main, sub }) => {
                const isExpanded = expandedCategories.has(main.crdfd_productgroupid);
                const maxItems = 11;
                const itemsToShow = isExpanded ? sub : sub.slice(0, maxItems);
                const hasMore = sub.length > maxItems;
                return (
                  <div
                    key={main.crdfd_productgroupid}
                    id={`category-${main.crdfd_productgroupid}`}
                    ref={(el) => {
                      categoryRefs.current[main.crdfd_productgroupid] = el;
                    }}
                    className="mb-8"
                  >
                    <div
                      className={`flex items-center mb-4 pb-3 border-b transition-all duration-200 ${
                        selectedMainCategory?.crdfd_productgroupid === main.crdfd_productgroupid
                          ? "border-[#049DBF] bg-blue-50 rounded-lg p-3 -m-3 mb-1"
                          : "border-gray-200"
                      }`}
                    >
                      <h3
                        className={`text-lg font-semibold transition-colors truncate ${
                          selectedMainCategory?.crdfd_productgroupid === main.crdfd_productgroupid
                            ? "text-[#049DBF]"
                            : "text-gray-800"
                        }`}
                      >
                        {main.crdfd_productname}
                      </h3>
                      <span className="ml-auto text-sm text-gray-500 flex-shrink-0">{sub.length} danh mục con</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-w-full">
                      {itemsToShow.map((item) => (
                        <button
                          key={item.crdfd_productgroupid}
                          onClick={() => onSubCategoryClick(item)}
                          className="flex flex-col items-center p-3 rounded-lg hover:bg-blue-50 transition-all duration-200 text-center group w-full max-w-[200px] mx-auto"
                        >
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-2 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-all overflow-hidden flex-shrink-0">
                            {item.crdfd_image_url ? (
                              <img
                                src={item.crdfd_image_url}
                                alt={item.crdfd_productname}
                                className="w-full h-full object-cover rounded-full transition-transform duration-300 ease-in-out group-hover:scale-110"
                              />
                            ) : (
                              <span className="text-gray-400 group-hover:text-[#049DBF] text-lg">{item.crdfd_productname[0]}</span>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-gray-700 group-hover:text-[#049DBF] leading-tight line-clamp-2 mb-1 break-words">
                            {item.crdfd_productname}
                          </h4>
                          {item.productCount !== undefined && item.productCount > 0 && (
                            <p className="text-xs text-gray-400">{item.productCount} sản phẩm</p>
                          )}
                        </button>
                      ))}

                      {hasMore && (
                        <button
                          onClick={() => toggleExpandCategory(main.crdfd_productgroupid)}
                          className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#049DBF] hover:bg-blue-50 transition-all duration-200 text-center group w-full max-w-[200px] mx-auto"
                        >
                          <div className="w-16 h-16 rounded-lg mb-2 flex items-center justify-center bg-gray-50 group-hover:bg-blue-100 transition-all flex-shrink-0">
                            <span className="text-gray-400 group-hover:text-[#049DBF] text-lg">{isExpanded ? "−" : "+"}</span>
                          </div>
                          <h4 className="text-sm font-medium text-gray-600 group-hover:text-[#049DBF] leading-tight">
                            {isExpanded ? "Thu gọn" : "Xem tất cả"}
                          </h4>
                          <p className="text-xs text-gray-400">
                            {isExpanded ? "" : `+${sub.length - maxItems} danh mục`}
                          </p>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-6 text-[#049DBF]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049DBF] mx-auto mb-4"></div>
                <p className="text-gray-500 text-sm">Đang tải danh mục...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Search Modal */}
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
              
              {/* Image Preview */}
              {imagePreview && !showCamera && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Ảnh đã chọn</span>
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setAiKeywords(null);
                        setAiError(null);
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                  <div className="rounded-lg border-2 border-gray-300 p-2 bg-gray-50">
                    <img src={imagePreview} alt="Preview" className="max-h-60 w-full object-contain rounded" />
                  </div>
                </div>
              )}
              
              {/* Analyzing State */}
              {isAnalyzing && (
                <div className="flex items-center gap-3 text-cyan-700 bg-cyan-50 border border-cyan-200 p-3 rounded-lg">
                  <svg className="w-5 h-5 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Đang phân tích hình ảnh với AI...</div>
                    <div className="text-xs text-cyan-600 mt-0.5">Vui lòng đợi trong giây lát</div>
                  </div>
                </div>
              )}
              
              {/* Error State */}
              {aiError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>{aiError}</div>
                </div>
              )}
              
              {/* AI Keywords Result - COMMENTED OUT
              {aiKeywords && (
                <div className="rounded-lg border border-blue-200 p-3 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-800">Kết quả phân tích AI</span>
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
                      .map((kw, index) => (
                        <span 
                          key={`${kw}-${index}`} 
                          className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm"
                        >
                          {kw}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button 
                  onClick={handleCloseImageModal} 
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  disabled={!imagePreview || isUploading || !aiKeywords || isAnalyzing || showCamera}
                  onClick={handleImageSearch}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {isUploading ? '⏳ Đang xử lý...' : (isAnalyzing ? '🔍 Đang phân tích...' : '🔍 Tìm kiếm ngay')}
                </button>
              </div>
              {!showCamera && !isAnalyzing && (
                <p className="text-xs text-center text-gray-500 pt-2">
                  💡 Ảnh sẽ được phân tích bằng AI và tự động chuyển đến trang sản phẩm phù hợp
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTree;


