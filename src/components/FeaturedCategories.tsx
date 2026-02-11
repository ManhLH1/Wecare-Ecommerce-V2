'use client';

 import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface Category {
  id?: string;
  name?: string;
  image?: string;
  href?: string;
  code?: string;
  productGroupCode?: string;
  productGroupName?: string;
  productGroupId?: string;
  imageUrl?: string;
  orderCount?: number;
  hasPlaceholderImage?: boolean;
}

interface FeaturedCategoriesProps {
  categories: Category[];
  loading?: boolean;
}

const FeaturedCategories: React.FC<FeaturedCategoriesProps> = ({ categories, loading = false }) => {
  // debug: received categories (removed verbose logging)

  // More flexible filtering: accept any category with a name
  // If no image, we'll assign a placeholder
  const validCategories = (categories || []).filter(cat => {
    if (!cat) return false;

    const hasName = cat.productGroupName || cat.name || cat.code;
    return hasName; // Accept any category with a name
  }).map(cat => ({
    ...cat,
    // Ensure every category has an image (use placeholder if needed)
    image: cat.imageUrl || cat.image || '/placeholder-image.jpg',
    name: cat.productGroupName || cat.name || `Danh mục ${cat.productGroupCode || cat.code || ''}`
  }));

  // scroll indicator state for mobile scroller
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let rafId = 0;

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const max = el.scrollWidth - el.clientWidth;
        const progress = max > 0 ? el.scrollLeft / max : 0;
        setScrollProgress(progress);
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    // initialize
    onScroll();

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [validCategories]);
  // debug: valid categories computed (logging removed)

  // Show loading skeleton when loading
  if (loading) {
    return (
    <section className="w-full bg-white">
      <div className="relative px-2 md:px-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="h-7 bg-gray-200 rounded animate-pulse w-40"></div>
            <div className="w-14 h-1 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
        </div>

        {/* Grid skeleton */}
        <div className="grid gap-2 items-stretch" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="block text-center no-underline">
                  <div className="bg-white rounded-sm border border-gray-200 h-full flex flex-col items-center min-h-[120px] animate-pulse">
                    <div className="w-full p-2 flex items-center justify-center">
                      <div className="mx-auto h-20 w-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="w-full mt-auto bg-gray-50 border-t px-2 py-2">
                      <div className="text-xs bg-gray-200 rounded h-4 w-3/4 mx-auto"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </section>
    );
  }

  if (!validCategories || validCategories.length === 0) {
    // Show debug info for production troubleshooting
    console.error('[FeaturedCategories] No valid categories found. Raw categories:', categories);
    return (
      <section className="w-full bg-white">
        <div className="w-full text-center text-sm text-gray-500 px-0">
          Không có danh mục nổi bật thỏa điều kiện (cần ảnh).
          <div className="text-xs text-red-500 mt-1">
            Debug: Received {categories?.length || 0} categories
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white pt-2 pb-4">
      <div className="relative px-2 md:px-6">
        <div className="p-0 md:p-1">
          {/* Mobile: horizontal scroller with 2 rows */}
          <div className="block md:hidden">
            {/* Tiêu đề mobile */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-cyan-600">
                  DANH MỤC NỔI BẬT
                </h3>
                <span className="inline-block w-10 h-[3px] bg-amber-300 rounded" />
              </div>
              <a
                href="/san-pham"
                className="text-xs text-cyan-600 hover:text-cyan-700 no-underline font-normal normal-case"
                style={{ textDecoration: 'none', textTransform: 'none' }}
              >
                Xem tất cả
              </a>
            </div>

            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4" ref={scrollerRef}>
              <div
                className="grid grid-flow-col gap-3 grid-rows-2 py-1"
                style={{ gridAutoColumns: 'calc((100vw - 48px) / 3)' }}
              >
                {validCategories.slice(0, 12).map(cat => (
                <Link
                  key={cat.id || cat.productGroupId || cat.productGroupCode || String(Math.random())}
                  href={cat.href || `/san-pham?product_group_Id=${encodeURIComponent(cat.productGroupId || cat.productGroupCode || '')}`}
                    className="block text-center no-underline group snap-start"
                >
                    <div className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-all duration-200 touch-manipulation h-full flex flex-col items-center justify-start min-h-[110px]">
                      <div className="w-full flex items-center justify-center mb-2">
                      <img
                        src={cat.image}
                        alt={cat.name}
                          className={`h-14 w-14 object-contain ${cat.hasPlaceholderImage ? 'opacity-60' : ''}`}
                      />
                    </div>
                      <div className="text-xs font-medium text-gray-700 group-hover:text-cyan-600 line-clamp-2 leading-tight text-center">
                      {cat.name}
                    </div>
                  </div>
                </Link>
              ))}
              </div>
            </div>

            {/* Scroll indicator - movable thumb */}
            <div className="flex justify-center mt-2">
              <div className="relative w-20 h-1 bg-gray-200/40 rounded-full">
                <div
                  className="absolute top-0 h-1 bg-cyan-500 rounded-full"
                  style={{
                    width: '20%',
                    left: `${Math.min(100, Math.max(0, scrollProgress * 100))}%`,
                    transform: 'translateX(-50%)',
                    transition: 'left 140ms ease-out',
                    boxShadow: '0 1px 6px rgba(3,105,161,0.12)',
                  }}
                />
              </div>
              </div>
          </div>

          {/* Desktop: Consistent design */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-cyan-600">DANH MỤC NỔI BẬT</h3>
                <span className="inline-block w-14 h-1 bg-amber-300 rounded" />
              </div>
              <a href="/san-pham" className="text-sm text-cyan-600 hover:text-cyan-700 no-underline font-normal normal-case" style={{ textDecoration: "none", textTransform: "none" }}>Xem tất cả</a>
            </div>

            <div>
              {(() => {
                const displayItems = validCategories.slice(0, 20);
                const columns = Math.max(1, Math.ceil(displayItems.length / 2));
                const gridStyle: React.CSSProperties = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
                return (
                <div className="grid gap-1 items-stretch" style={gridStyle}>
                  {displayItems.map(cat => (
                    <Link key={cat.id || cat.productGroupId || cat.productGroupCode || String(Math.random())} href={cat.href || `/san-pham?product_group_Id=${encodeURIComponent(cat.productGroupId || cat.productGroupCode || '')}`} className="block text-center no-underline">
                    <div className="bg-white rounded-sm border border-gray-200 hover:shadow-sm transition h-full flex flex-col items-center min-h-[160px]">
                        <div className="w-full p-1 flex items-center justify-center">
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className={`mx-auto h-28 w-28 object-contain ${cat.hasPlaceholderImage ? 'opacity-60' : ''}`}
                          />
                        </div>
                        <div className="w-full mt-auto bg-gray-50 border-t px-1 py-1">
                          <div className="text-sm text-gray-700 truncate no-underline">{cat.name}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;


