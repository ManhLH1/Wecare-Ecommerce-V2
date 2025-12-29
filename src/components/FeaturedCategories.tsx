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
}

const FeaturedCategories: React.FC<FeaturedCategoriesProps> = ({ categories }) => {
  console.log('[FeaturedCategories] Received categories:', categories?.length || 0, categories?.slice(0, 3));

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

  console.log('[FeaturedCategories] Valid categories after filtering:', validCategories.length, validCategories.slice(0, 3));

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
    <section className="w-full py-6">
      <div className="w-full px-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold">DANH MỤC NỔI BẬT</h3>
              <span className="inline-block w-14 h-1 bg-amber-300 rounded" />
            </div>
            <a href="/san-pham" className="text-sm text-amber-500 hover:underline">Xem tất cả</a>
          </div>

          {/*
            Display categories in exactly 2 rows.
            Compute number of columns = ceil(items / 2) and use CSS gridTemplateColumns
          */}
          {(() => {
            const displayItems = validCategories.slice(0, 20);
            const columns = Math.max(1, Math.ceil(displayItems.length / 2));
            const gridStyle: React.CSSProperties = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
            return (
              <div className="grid gap-2 items-stretch" style={gridStyle}>
                {displayItems.map(cat => (
                 <Link key={cat.id || cat.productGroupId || cat.productGroupCode || String(Math.random())} href={cat.href || `/san-pham?group=${encodeURIComponent(cat.productGroupCode || '')}`} className="block text-center no-underline">
                   <div className="bg-white rounded-sm border border-gray-200 hover:shadow-sm transition h-full flex flex-col items-center min-h-[120px]">
                     <div className="w-full p-2 flex items-center justify-center">
                       <img
                         src={cat.image}
                         alt={cat.name}
                         className={`mx-auto h-20 w-20 object-contain ${cat.hasPlaceholderImage ? 'opacity-60' : ''}`}
                       />
                     </div>
                     <div className="w-full mt-auto bg-gray-50 border-t px-2 py-2">
                       <div className="text-xs text-gray-700 truncate no-underline">{cat.name}</div>
                     </div>
                   </div>
                 </Link>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;


