'use client';

import React from 'react';
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

  // debug: valid categories computed (logging removed)

  // Show loading skeleton when loading
  if (loading) {
    return (
      <section className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600">
        <div className="relative px-[5px] md:px-[50px]">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-white">DANH MỤC NỔI BẬT</h3>
                <span className="inline-block w-14 h-1 bg-amber-300 rounded" />
              </div>
              <a href="/san-pham" className="text-sm text-amber-300 hover:text-white hover:underline">Xem tất cả</a>
            </div>
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
        </div>
      </section>
    );
  }

  if (!validCategories || validCategories.length === 0) {
    // Show debug info for production troubleshooting
    console.error('[FeaturedCategories] No valid categories found. Raw categories:', categories);
    return (
      <section className="w-full py-6">
        <div className="w-full text-center text-sm text-gray-500 px-4">
          Không có danh mục nổi bật thỏa điều kiện (cần ảnh).
          <div className="text-xs text-red-500 mt-1">
            Debug: Received {categories?.length || 0} categories
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-4 bg-white md:py-3 md:bg-gradient-to-r md:from-cyan-500 md:to-cyan-600">
      <div className="relative px-4 md:px-[5px] md:px-[50px]">
        <div className="p-0 md:p-1">
          {/* Mobile: Clean design */}
          <div className="block md:hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Danh mục sản phẩm</h3>
              <a href="/san-pham" className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">Xem tất cả</a>
            </div>

            {/* Grid 2 columns for mobile */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {validCategories.slice(0, 6).map(cat => (
                <Link
                  key={cat.id || cat.productGroupId || cat.productGroupCode || String(Math.random())}
                  href={cat.href || `/san-pham?group=${encodeURIComponent(cat.productGroupCode || '')}`}
                  className="block text-center no-underline group"
                >
                  <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all duration-200 touch-manipulation">
                    <div className="w-full flex items-center justify-center mb-3">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className={`h-12 w-12 object-contain ${cat.hasPlaceholderImage ? 'opacity-60' : ''}`}
                      />
                    </div>
                    <div className="text-sm font-medium text-gray-700 group-hover:text-cyan-600 line-clamp-2 leading-tight">
                      {cat.name}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Xem thêm button */}
            {validCategories.length > 6 && (
              <div className="text-center">
                <a
                  href="/san-pham"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-cyan-600 font-medium"
                >
                  Xem thêm danh mục
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* Desktop: Original design */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-white">DANH MỤC NỔI BẬT</h3>
                <span className="inline-block w-14 h-1 bg-amber-300 rounded" />
              </div>
              <a href="/san-pham" className="text-sm text-amber-300 hover:text-white hover:underline">Xem tất cả</a>
            </div>

            {(() => {
              const displayItems = validCategories.slice(0, 20);
              const columns = Math.max(1, Math.ceil(displayItems.length / 2));
              const gridStyle: React.CSSProperties = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
              return (
              <div className="grid gap-1 items-stretch" style={gridStyle}>
                  {displayItems.map(cat => (
                    <Link key={cat.id || cat.productGroupId || cat.productGroupCode || String(Math.random())} href={cat.href || `/san-pham?group=${encodeURIComponent(cat.productGroupCode || '')}`} className="block text-center no-underline">
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
    </section>
  );
};

export default FeaturedCategories;


