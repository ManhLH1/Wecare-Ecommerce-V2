import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Slider from 'react-slick';
import { getItem } from '@/utils/SecureStorage';
import { useRouter } from 'next/navigation';
import { useProductGroupHierarchy } from '@/hooks/useProductGroupHierarchy';
import { generateProductUrl } from '@/utils/urlGenerator';
import { usePermission } from '@/hooks/usePermission';

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
  const [loading, setLoading] = useState(true);
  const rightCardRef = useRef<HTMLDivElement | null>(null);

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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>('');
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
    } catch {}

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
    const fetchAll = async () => {
      try {
        setLoading(true);
        const customerId = typeof window !== 'undefined' ? localStorage.getItem('id') : '';
        const [topRes, latestRes, promoRes] = await Promise.all([
          axios.get('/api/getTop30ProductsWithPromotion', { params: { customerId } }),
          axios.get('/api/getLatestProducts'),
          axios.get('/api/getBestPromotions'),
        ]);
        setTopRanked(Array.isArray(topRes.data) ? topRes.data.slice(0, 10) : []);
        setLatestProducts(Array.isArray(latestRes.data) ? latestRes.data.slice(0, 10) : []);
        setBestPromotions(Array.isArray(promoRes.data) ? promoRes.data : []);
      } catch (e) {
        setTopRanked([]);
        setLatestProducts([]);
        setBestPromotions([]);
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
      <div className="text-left">
        <div className="text-sm font-semibold text-gray-800 line-clamp-2">
          {product.crdfd_name || product.crdfd_tensanphamtext}
        </div>
        {product.crdfd_masanpham && (
          <div className="text-xs text-gray-500 mt-1">{product.crdfd_masanpham}</div>
        )}
        {product.cr1bb_giaban && (
          <div className="text-sm text-cyan-600 font-bold mt-1">
            {Number(product.cr1bb_giaban).toLocaleString()}₫
          </div>
        )}
        {product.has_promotion && product.promotion?.value && (
          <div className="text-[11px] text-rose-600 mt-1">KM: {product.promotion.value}{product.promotion.type === 'Percent' ? '%' : '₫'}</div>
        )}
      </div>
    </button>
  );

  // Toggle to show/hide extra sections below hero
  const showExtraSections = false;

  useEffect(() => {
    const computeHeight = () => {
      const node = rightCardRef.current;
      if (!node) return;
      // Reset to natural height to measure accurately
      const prevHeight = node.style.height;
      node.style.height = '';
      const naturalHeight = node.offsetHeight || 0;
      // Calculate available viewport height for hero so it fits in first screen
      const heroTop = heroContainerRef.current?.getBoundingClientRect().top || 0;
      const viewportAvailable = Math.max(240, Math.floor(window.innerHeight - heroTop - 24));
      const targetHeight = Math.min(naturalHeight, viewportAvailable);
      if (targetHeight > 0) {
        setSliderHeight(targetHeight);
        node.style.height = `${targetHeight}px`;
      } else {
        node.style.height = prevHeight;
      }
    };
    computeHeight();
    window.addEventListener('resize', computeHeight);
    return () => window.removeEventListener('resize', computeHeight);
  }, []);

  return (
    <div className="flex-1">
      {/* Quick Menu - Desktop and Mobile (scrollable) */}
      <div className="mb-3">
        <div className="w-full overflow-x-auto scrollbar-hide">
          <nav className="flex gap-4 items-center px-2 py-2 bg-white border border-gray-200 rounded-xl shadow-sm min-w-max">
            {getMenuItems().map((item, idx) => (
              <Link key={idx} href={item.href} className="no-underline group flex items-center gap-2 whitespace-nowrap">
                <span className="text-base">{item.icon}</span>
                <span className="text-xs sm:text-[13px] font-medium text-gray-700 group-hover:text-gray-900">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div ref={heroContainerRef} className="grid grid-cols-1 lg:[grid-template-columns:1.4fr_0.6fr] gap-2 mb-3 items-stretch">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full" style={{ height: sliderHeight || undefined }}>
          {bestPromotions.length > 0 ? (
            <Slider
              dots
              arrows={false}
              autoplay
              autoplaySpeed={4000}
              infinite
              slidesToShow={1}
              slidesToScroll={1}
              appendDots={(dots) => (
                <div style={{ bottom: 8 }}>
                  <ul className="!mb-2">{dots}</ul>
                </div>
              )}
              customPaging={() => (
                <button className="w-2.5 h-2.5 bg-gray-300 rounded-full block" />
              )}
              afterChange={(idx: number) => setCurrentPromoIdx(idx)}
            >
              {bestPromotions.map((p: any, i: number) => (
                <div key={p.promotion_id || i}>
                  <div className="relative w-full bg-white" style={{ height: sliderHeight || 420 }}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="absolute inset-0 w-full h-full object-contain object-center" />
                    ) : null}
                    <div className="absolute bottom-4 left-4 z-10">
                      <button
                        className="bg-white/90 hover:bg-white text-cyan-700 px-5 py-2 rounded-lg font-medium shadow-sm transition-colors"
                        onClick={() => (window.location.href = '/promotion')}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          ) : (
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Ưu đãi tốt nhất hôm nay</h2>
              <p className="text-cyan-100 mb-4">Tổng hợp khuyến mãi, sản phẩm mới, xếp hạng cao</p>
              <button className="bg-white text-cyan-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors" onClick={() => window.location.href = '/promotion'}>
                Xem khuyến mãi
              </button>
            </div>
          )}
        </div>
        <div ref={rightCardRef} className="bg-white border border-gray-200 rounded-2xl p-3 text-center shadow-sm h-full overflow-hidden w-full">
          {isLoggedIn ? (
            // Logged in state - show special offers
            <>
              <div className="mx-auto w-10 h-10 rounded-full bg-gradient-to-r from-orange-50 to-red-50 flex items-center justify-center mb-1.5 shadow-sm ring-1 ring-orange-100">
                <span className="text-xl">🎉</span>
              </div>
              <div className="text-base font-extrabold text-gray-900 mb-1">
                Chào mừng {userName || 'bạn'}!
              </div>
              <div className="text-[10px] text-gray-500 mb-2">
                Ưu đãi đặc biệt dành riêng cho bạn
              </div>
              <button
                onClick={() => (window.location.href = '/promotion')}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-1.5 rounded-full mb-1.5 transition-colors text-[13px]"
              >
                Xem ưu đãi đặc biệt
              </button>
              <div className="h-px w-full bg-gray-100 my-1" />
              <div className="mt-1 grid grid-cols-3 gap-1 pb-0.5">
                {[
                  { icon: '🔥', title: 'Ưu đãi', sub: 'Hot', href: '/promotion' },
                  { icon: '⭐', title: 'Sản phẩm', sub: 'Yêu thích', href: '/san-pham' },
                  { icon: '💎', title: 'VIP', sub: 'Member', href: '/profile-customer' },
                ].map((it, idx) => (
                  <Link key={idx} href={it.href} className="flex flex-col items-center no-underline">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-orange-50 to-red-50 flex items-center justify-center text-[15px] mb-0.5 ring-1 ring-orange-100">
                      <span>{it.icon}</span>
                    </div>
                    <div className="text-[10px] font-medium text-gray-900 leading-tight">{it.title}</div>
                    <div className="text-[9px] text-gray-500 leading-tight">{it.sub}</div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            // Not logged in state - show login prompt
            <>
              <div className="mx-auto w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center mb-1.5 shadow-sm ring-1 ring-cyan-100">
                <span className="text-xl">🤝</span>
              </div>
              <div className="text-base font-extrabold text-gray-900 mb-1">Đăng nhập để nhận ưu đãi</div>
              <div className="text-[10px] text-gray-500 mb-2">Xem CTKM riêng cho bạn, tích điểm và đổi quà</div>
              <button
                onClick={() => (window.location.href = '/login')}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-1.5 rounded-full mb-1.5 transition-colors text-[13px]"
              >
                Đăng nhập ngay
              </button>
              <div className="h-px w-full bg-gray-100 my-1" />
              <div className="mt-1 grid grid-cols-4 gap-1 pb-0.5">
                {[
                  { icon: '🎟️', title: 'Ưu đãi', sub: 'Voucher' },
                  { icon: '🫘', title: 'Điểm', sub: 'Tích lũy' },
                  { icon: '🎁', title: 'Đổi', sub: 'Quà tặng' },
                  { icon: '💬', title: 'Hỗ trợ', sub: 'Chat' },
                ].map((it, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center text-[15px] mb-0.5 ring-1 ring-cyan-100">
                      <span>{it.icon}</span>
                    </div>
                    <div className="text-[10px] font-medium text-gray-900 leading-tight">{it.title}</div>
                    <div className="text-[9px] text-gray-500 leading-tight">{it.sub}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Promo shortcut cards under hero - mimic JD layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_0.7fr] lg:grid-cols-[1.4fr_0.6fr] gap-3 mb-4">
        {/* New Products Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-3 bg-white">
            <div className="text-base font-semibold text-gray-900 mb-1.5">Sản phẩm khuyến mãi</div>
            <div className="flex gap-2.5 overflow-x-auto whitespace-nowrap scrollbar-hide">
              {loading ? (
                <>
                  {[...Array(2)].map((_, si) => (
                    <div key={si} className="inline-flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 min-w-[360px] animate-pulse">
                      <div className="w-18 h-18 bg-gray-200 rounded-lg" />
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </>
              ) : promoProducts.length >= 2 ? (
                <div
                  className="group inline-flex items-stretch gap-2.5 p-3 bg-white rounded-xl border border-gray-100 hover:border-cyan-200 hover:shadow-md transition-all min-w-[420px]"
                >
                  <div className="grid grid-cols-2 gap-3 items-center">
                    {promoProducts.slice(0, 2).map((p: any, idx: number) => {
                      const priceVal = extractPrice(p);
                      const hasPrice = priceVal !== null && priceVal > 0;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 overflow-hidden cursor-pointer"
                          onClick={() => {
                            try {
                              localStorage.setItem('productDetail', JSON.stringify(p));
                            } catch {}
                            const newUrl = generateProductUrl(p, hierarchy);
                            router.push(newUrl);
                          }}
                        >
                          <div className="relative w-18 h-18 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center ring-1 ring-gray-100">
                            {p.image || p.cr1bb_imageurl || p.cr1bb_imageurlproduct ? (
                              <img src={p.image || p.cr1bb_imageurl || p.cr1bb_imageurlproduct} alt={(p.name || p.crdfd_name || p.crdfd_tensanphamtext) || 'product'} className="w-full h-full object-contain" onError={(e: any) => { e.currentTarget.src = '/no-image.png'; }} />
                            ) : (
                              <span className="text-gray-300 text-lg">🖼️</span>
                            )}
                            {p.promotion?.value && (
                              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded">-{p.promotion.value}{p.promotion.type === 'Percent' ? '%' : '₫'}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="text-[13px] font-medium text-gray-800 whitespace-normal w-full" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word' }}>
                              {p.name || p.crdfd_name || p.crdfd_tensanphamtext || ''}
                            </div>
                            <div className="text-[13px] font-semibold text-cyan-700 truncate mt-0.5">
                              {hasPrice ? `${priceVal!.toLocaleString()}₫` : ''}
                            </div>
                            <div className="mt-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {!loading && promoProducts.length === 0 && (
                <div className="h-24 bg-white/60 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 text-sm">Không có dữ liệu</div>
              )}
            </div>
          </div>
        </div>

        {/* Wecare solution summary (replacing Top Ranked) */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-2 bg-white">
            <h3 className="text-[13px] md:text-sm font-semibold text-gray-900 leading-snug mb-1">
              Wecare – Giải pháp toàn diện giúp doanh nghiệp dễ dàng nhập hàng,
              tối ưu chuỗi cung ứng và nâng cao hiệu quả vận hành.
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-start gap-1.5">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px]">📦</div>
                <div>
                  <div className="text-[12px] font-extrabold text-blue-600">18,000+</div>
                  <div className="text-[10px] text-gray-500">sản phẩm</div>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px]">🗂️</div>
                <div>
                  <div className="text-[12px] font-extrabold text-indigo-600">600+</div>
                  <div className="text-[10px] text-gray-500">danh mục</div>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px]">👥</div>
                <div>
                  <div className="text-[12px] font-extrabold text-emerald-600">10,000+</div>
                  <div className="text-[10px] text-gray-500">khách hàng</div>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[10px]">🗺️</div>
                <div>
                  <div className="text-[12px] font-extrabold text-rose-600">Toàn quốc</div>
                  <div className="text-[10px] text-gray-500">hiện diện</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showExtraSections && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Xếp hạng cao</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading ? (
              [...Array(10)].map((_, i) => (<div key={i} className="h-40 bg-gray-100 rounded animate-pulse"/>))
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
              [...Array(10)].map((_, i) => (<div key={i} className="h-40 bg-gray-100 rounded animate-pulse"/>))
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
