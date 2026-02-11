import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import Slider from 'react-slick';
import { getItem } from '@/utils/SecureStorage';
import { useRouter } from 'next/navigation';
import { useProductGroupHierarchy } from '@/hooks/useProductGroupHierarchy';
import { generateProductUrl } from '@/utils/urlGenerator';
import { usePermission } from '@/hooks/usePermission';
import HeroBannerImage from '@/assets/img/sample hero-section wecare.png';
import FeaturedCategories from '@/components/FeaturedCategories';
import NewsImage1 from '@/assets/img/Artboard 1.png';
import NewsImage2 from '@/assets/img/Artboard 2.png';
import NewsImage3 from '@/assets/img/Artboard 3.png';

interface JDStyleMainContentProps {
  categoryGroups: any[];
  onCategorySelect: (group: any) => void;
  getIcon: (groupName: string) => React.ReactNode;
}

const JDStyleMainContent: React.FC<JDStyleMainContentProps> = ({
  categoryGroups,
  onCategorySelect,
  getIcon,
}) => {
  const [userType, setUserType] = useState<string | null>(null);
  const { permission } = usePermission();
  const [topRanked, setTopRanked] = useState<any[]>([]);
  const [latestProducts, setLatestProducts] = useState<any[]>([]);
  const [bestPromotions, setBestPromotions] = useState<any[]>([]);
  const [latestNews, setLatestNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserType(getItem('type'));
    }
  }, []);

  // Function to get menu items based on user type and permissions
  const getMenuItems = () => {
    const baseItems = [
      { icon: '🅿️', label: 'Tất cả sản phẩm', href: '/san-pham' },
      { icon: '🔥', label: 'Sản phẩm bán chạy', href: '/top-san-pham-ban-chay' },
    ];

    // Add user-specific items based on type and permissions
    if (userType === "customer") {
      return [
        ...baseItems,
        { icon: '🏷️', label: 'Khuyến mãi', href: '/promotion' },
        { icon: '🕑', label: 'Lịch sử đơn hàng', href: '/history-order' },
        { icon: '💳', label: 'Lịch sử thanh toán', href: '/history-payment' },
        { icon: '📰', label: 'Tin tức', href: '/post' },
      ];
    } else if (userType === "saleonline") {
      // Sale Online: Có thể xem giá, không thể tạo đơn hàng
      return [
        ...baseItems,
        { icon: '🏷️', label: 'Khuyến mãi', href: '/promotion' },
        { icon: '💰', label: 'Giá theo khách hàng', href: '/price-by-customer' },
        { icon: '📰', label: 'Tin tức', href: '/post' },
      ];
    } else if (userType === "saledirect") {
      // Sale Direct: Có thể tạo đơn hàng, không thể xem lịch sử
      return [
        ...baseItems,
        { icon: '🛒', label: 'Đặt hàng', href: '/sale-orders' },
        { icon: '📰', label: 'Tin tức', href: '/post' },
      ];
    } else if (userType === "sale") {
      // Sale thường: Chỉ có menu cơ bản
      return [
        ...baseItems,
        { icon: '📰', label: 'Tin tức', href: '/post' },
      ];
    }

    // Default items for non-logged in users
    return [
      ...baseItems,
      { icon: '🏷️', label: 'Khuyến mãi', href: '/promotion' },
      { icon: '📰', label: 'Tin tức', href: '/post' },
    ];
  };

  const [sliderHeight, setSliderHeight] = useState<number | null>(null);
  const [currentPromoIdx, setCurrentPromoIdx] = useState(0);
  const heroContainerRef = useRef<HTMLDivElement | null>(null);
  const newsScrollerRef = useRef<HTMLDivElement | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [newsScrollProgress, setNewsScrollProgress] = useState<number>(0);
  const router = useRouter();
  const { hierarchy } = useProductGroupHierarchy();
  const promoProducts = React.useMemo(() => {
    // Prefer products bundled with the currently visible promotion in the hero slider
    const productsFromBest = (bestPromotions?.[currentPromoIdx] as any)?.products;
    if (Array.isArray(productsFromBest) && productsFromBest.length) {
      return productsFromBest;
    }
    // Fallback: filter from topRanked by promotion ids
    try {
      const ids = (bestPromotions || []).map((bp: any) => bp.promotion_id || bp.promotionId).filter(Boolean);
      if (!ids.length) return [] as any[];
      return (topRanked || []).filter((p: any) => {
        const pid = p?.promotion?.promotionId || p?.promotionId;
        return p?.has_promotion && pid && ids.includes(pid);
      });
    } catch {
      return [] as any[];
    }
  }, [bestPromotions, currentPromoIdx, topRanked]);

  // Check login status
  useEffect(() => {
    const checkLoginStatus = () => {
      if (typeof window !== "undefined") {
        const hasId = getItem("id");
        const hasToken = getItem("token");
        const userName = getItem("userName");
        setIsLoggedIn(!!(hasId || hasToken || userName));
        setUserName(userName || '');
      }
    };

    checkLoginStatus();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userName" || e.key === "id" || e.key === "token") {
        checkLoginStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Helper: robustly extract price from various shapes
  const extractPrice = (p: any): number | null => {
    const direct = p?.cr1bb_giaban ?? p?.giaban ?? p?.price;
    const toNum = (v: any) => {
      if (v === null || v === undefined) return NaN;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };
    let n = toNum(direct);
    if (Number.isFinite(n) && n > 0) return n;

    // Try nested json price
    let priceJson: any = p?.cr1bb_json_gia ?? p?.json_gia ?? p?.prices;
    try {
      if (typeof priceJson === 'string') priceJson = JSON.parse(priceJson);
    } catch { }

    const candidates: any[] = Array.isArray(priceJson) ? priceJson : [priceJson];
    for (const c of candidates) {
      if (!c || typeof c !== 'object') continue;
      const cand = c.crdfd_gia ?? c.basePrice ?? c.gia ?? c.price ?? c.crdfd_giatheovc ?? c.priceWithVAT;
      n = toNum(cand);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  };

  useEffect(() => {
    // Chỉ fetch 1 lần
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchAll = async () => {
      try {
        setLoading(true);
        const customerId = typeof window !== 'undefined' ? localStorage.getItem('id') : '';
        const [topRes, latestRes, promoRes, newsRes] = await Promise.all([
          axios.get('/api/getTop30ProductsWithPromotion', { params: { customerId } }),
          axios.get('/api/getLatestProducts'),
          axios.get('/api/getBestPromotions'),
          axios.get('/api/getDataContent?tag='),
        ]);
        setTopRanked(Array.isArray(topRes.data) ? topRes.data.slice(0, 10) : []);
        setLatestProducts(Array.isArray(latestRes.data) ? latestRes.data.slice(0, 10) : []);
        setBestPromotions(Array.isArray(promoRes.data) ? promoRes.data : []);

        // Helper function to convert Google Drive URL to direct image URL
        const convertGoogleDriveUrl = (url: string): string => {
          if (!url) return '';

          // Handle drive.usercontent.google.com/download?id=xxx format
          const downloadMatch = url.match(/drive\.usercontent\.google\.com\/download\?id=([a-zA-Z0-9_-]+)/);
          if (downloadMatch) {
            return `https://lh3.googleusercontent.com/d/${downloadMatch[1]}`;
          }

          // Handle drive.google.com/file/d/xxx/view format
          const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (fileMatch) {
            return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
          }

          // Handle drive.google.com/uc?id=xxx format
          const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
          if (ucMatch) {
            return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
          }

          return url;
        };

        // Parse news data
        if (newsRes.data.success && Array.isArray(newsRes.data.data.value)) {
          const sortedNews = newsRes.data.data.value
            .sort((a: any, b: any) => new Date(b.cr1bb_created_on).getTime() - new Date(a.cr1bb_created_on).getTime())
            .slice(0, 3)
            .map((news: any) => ({
              ...news,
              cr1bb_img_url: convertGoogleDriveUrl(news.cr1bb_img_url)
            }));
          setLatestNews(sortedNews);
        }
      } catch (e) {
        setTopRanked([]);
        setLatestProducts([]);
        setBestPromotions([]);
        setLatestNews([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const ProductCard = ({ product }: { product: any }) => (
    <button
      onClick={() => {
        const id = product.crdfd_masanpham || product.productId || product.crdfd_productsid;
        if (id) {
          // Store product data in localStorage for the product detail page
          localStorage.setItem('productDetail', JSON.stringify(product));
          router.push(`/san-pham/chi-tiet/${id}`);
        }
      }}
      className="w-full flex flex-col p-3 rounded-lg border hover:bg-gray-50 transition-colors duration-200 hover:border-gray-300"
    >
      <div className="w-full h-28 bg-gray-100 rounded-md mb-2 flex items-center justify-center overflow-hidden">
        {product.cr1bb_imageurl || product.cr1bb_imageurlproduct ? (
          <img
            src={product.cr1bb_imageurl || product.cr1bb_imageurlproduct}
            alt={product.crdfd_name || product.crdfd_tensanphamtext}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-gray-400 text-2xl">{getIcon(product.crdfd_name || product.crdfd_tensanphamtext || 'Sản phẩm')}</span>
        )}
      </div>


      <div className="text-center">
        <div className="text-sm font-medium text-gray-800 line-clamp-2">
          {product.crdfd_name || product.crdfd_tensanphamtext}
        </div>
        {product.crdfd_masanpham && (
          <div className="text-xs font-normal text-gray-500 mt-1">{product.crdfd_masanpham}</div>
        )}
        {product.cr1bb_giaban && (
          <div className="text-sm text-cyan-600 font-semibold mt-1">
            {Number(product.cr1bb_giaban).toLocaleString()}₫
          </div>
        )}
        {product.has_promotion && product.promotion?.value && (
          <div className="text-[11px] font-medium text-rose-600 mt-1">KM: {product.promotion.value}{product.promotion.type === 'Percent' ? '%' : '₫'}</div>
        )}
      </div>
    </button>
  );

  // Toggle to show/hide extra sections below hero
  const showExtraSections = false;

  // Đặt chiều cao cố định cho slider
  useEffect(() => {
    setSliderHeight(420);
  }, []);

  // Mobile news scroller indicator progress
  useEffect(() => {
    const el = newsScrollerRef.current;
    if (!el) return;
    let rafId = 0;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const max = el.scrollWidth - el.clientWidth;
        const progress = max > 0 ? el.scrollLeft / max : 0;
        setNewsScrollProgress(progress);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [latestNews]);

  return (
    <div className="flex-1 mb-0 lg:mb-0">
      {/* Quick Menu - Mobile: compact icon cards with horizontal scroller */}
      <div className="mb-0 lg:hidden -mt-2">
        <div className="w-full overflow-x-auto scrollbar-hide -mx-2 px-2 lg:mx-0 lg:px-0">
          <nav className="flex gap-3 items-center py-0 min-w-max overflow-x-auto scrollbar-hide snap-x snap-mandatory px-1 touch-manipulation">
            {getMenuItems().map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                className="no-underline snap-start flex flex-col items-center justify-center w-14 shrink-0 px-0 py-1"
              >
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-cyan-600 text-xl shadow-sm transition-transform duration-150 active:scale-95">
                  <span aria-hidden className="select-none">{item.icon}</span>
                </div>
                <span className="mt-1 text-[11px] text-gray-700 text-center truncate w-full">{item.label}</span>
              </Link>
            ))}

            {/* Compact primary CTA */}
            <Link
              href="/san-pham"
              className="no-underline snap-start flex items-center justify-center w-14 shrink-0 px-0 py-1"
            >
              <div className="w-12 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-semibold">Tất cả</div>
            </Link>
          </nav>
        </div>
      </div>

      {/* Hero Section + Tin tức bên phải (Desktop: ngang, Mobile: dọc) */}
      <div id="hero-banner" ref={heroContainerRef} className="flex flex-col lg:flex-row gap-0 lg:gap-2 mb-0 lg:mb-4 lg:pl-0 lg:items-stretch">
        {/* Hero Banner */}
        <div className="w-full lg:w-[70%] border border-gray-200 rounded-t-xl shadow-sm overflow-hidden  lg:pb">
          {/* Mobile: aspect ratio 16:9, Desktop: fixed height */}
          <div className="hero-banner-container relative w-full aspect-[16/9] lg:aspect-auto">
            {bestPromotions.length > 0 ? (
              <div
                className="relative w-full h-full cursor-pointer active:opacity-90 transition-opacity touch-manipulation"
                onClick={() => (window.location.href = '/promotion')}
              >
                <Image
                  src={HeroBannerImage}
                  alt="Wecare - Chương trình khuyến mãi"
                  fill
                  className="object-cover object-center"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 70vw"
                />
                {/* Mobile CTA overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black/60 to-transparent lg:hidden" style={{ paddingTop: '14px' }}>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-white text-sm font-medium px-3 py-2 rounded-md bg-black/30 backdrop-blur-sm"
                      aria-label="Xem ưu đãi"
                    >
                      Xem ưu đãi
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 p-4 md:p-6 text-white h-full flex flex-col justify-center">
                <h2 className="text-xl md:text-2xl font-bold mb-2">Ưu đãi tốt nhất hôm nay</h2>
                <p className="text-cyan-100 mb-4 text-sm md:text-base">Tổng hợp khuyến mãi, sản phẩm mới, xếp hạng cao</p>
                <button
                  className="bg-white text-cyan-600 px-4 md:px-6 py-2 font-medium hover:bg-gray-50 active:scale-95 transition-all w-fit rounded-lg touch-manipulation"
                  onClick={() => window.location.href = '/promotion'}
                >
                  Xem khuyến mãi
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Mobile-only spacer to guarantee visual gap under hero */}
        <div className="block md:hidden h-2" aria-hidden />

        {/* Force mobile margin-bottom on hero banner in case other styles override spacing */}
        <style jsx>{`
          @media (max-width: 768px) {
            #hero-banner {
              margin-bottom: 2rem !important;
            }
          }
          
          /* Desktop: Force 520px height for hero banner and news section */
          @media (min-width: 1024px) {
            .hero-banner-container {
              height: 520px !important;
            }
            .hero-news-container {
              height: 520px !important;
            }
          }
        `}</style>

        {/* Tin tức - Mobile: horizontal scroll, Desktop: vertical stack */}
        <div className="hero-news-container w-full lg:w-[30%]">
          {/* Mobile: horizontal scroll với snap */}
          <div ref={newsScrollerRef} className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide snap-x snap-mandatory lg:snap-none -mx-2 px-2 lg:mx-0 lg:px-0 lg:h-full">
            {/* Tin tức 1 */}
            <div className="flex-shrink-0 w-[75vw] sm:w-[60vw] lg:w-full h-[140px] sm:h-[160px] lg:flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative snap-start">
              <Link
                href="/post"
                className="block w-full h-full no-underline group relative touch-manipulation"
              >
                <Image
                  src={NewsImage1}
                  alt="Tin tức Wecare"
                  fill
                  className="object-cover group-hover:scale-105 group-active:scale-100 transition-transform duration-300"
                  sizes="(max-width: 768px) 75vw, (max-width: 1024px) 60vw, 300px"
                />
              </Link>
            </div>

            {/* Tin tức 2 */}
            <div className="flex-shrink-0 w-[75vw] sm:w-[60vw] lg:w-full h-[140px] sm:h-[160px] lg:flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative snap-start">
              <Link
                href="/post"
                className="block w-full h-full no-underline group relative touch-manipulation"
              >
                <Image
                  src={NewsImage2}
                  alt="Tin tức Wecare"
                  fill
                  className="object-cover group-hover:scale-105 group-active:scale-100 transition-transform duration-300"
                  sizes="(max-width: 768px) 75vw, (max-width: 1024px) 60vw, 300px"
                />
              </Link>
            </div>

            {/* Tin tức 3 */}
            <div className="flex-shrink-0 w-[75vw] sm:w-[60vw] lg:w-full h-[140px] sm:h-[160px] lg:flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative snap-start">
              <Link
                href="/post"
                className="block w-full h-full no-underline group relative touch-manipulation"
              >
                <Image
                  src={NewsImage3}
                  alt="Tin tức Wecare"
                  fill
                  className="object-cover group-hover:scale-105 group-active:scale-100 transition-transform duration-300"
                  sizes="(max-width: 768px) 75vw, (max-width: 1024px) 60vw, 300px"
                />
              </Link>
            </div>
          </div>

          {/* Mobile scroll indicator - subtle moving thumb */}
          <div className="flex justify-center mt-2 lg:hidden">
            <div className="relative w-24 h-1 bg-gray-200/40 rounded-full">
              <div
                className="absolute top-0 h-1 bg-cyan-500 rounded-full"
                style={{
                  width: '22%',
                  left: `${Math.min(100, Math.max(0, newsScrollProgress * 100))}%`,
                  transform: 'translateX(-50%)',
                  transition: 'left 140ms ease-out',
                  boxShadow: '0 1px 6px rgba(3,105,161,0.12)',
                }}
              />
            </div>
          </div>
        </div>
      </div>



      {showExtraSections && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Xếp hạng cao</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading ? (
              [...Array(10)].map((_, i) => (<div key={i} className="h-40 bg-gray-100 rounded animate-pulse" />))
            ) : (
              topRanked.map((p, i) => <ProductCard key={p.productId || i} product={p} />)
            )}
          </div>
        </div>
      )}

      {showExtraSections && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sản phẩm mới</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading ? (
              [...Array(10)].map((_, i) => (<div key={i} className="h-40 bg-gray-100 rounded animate-pulse" />))
            ) : (
              latestProducts.map((p, i) => <ProductCard key={p.crdfd_productsid || i} product={p} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JDStyleMainContent;
