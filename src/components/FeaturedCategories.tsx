'use client';

import React from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  image?: string;
  href?: string;
  code?: string;
}

interface FeaturedCategoriesProps {
  categories: Category[];
}

const FeaturedCategories: React.FC<FeaturedCategoriesProps> = ({ categories }) => {
  if (!categories || categories.length === 0) {
    // Nothing matched — render a small, generic hint (no debug-specific level text)
    return (
      <section className="w-full max-w-[1920px] mx-auto py-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          Không có danh mục nổi bật thỏa điều kiện (cần ảnh).
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-[1920px] mx-auto py-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold">DANH MỤC NỔI BẬT</h3>
              <span className="inline-block w-14 h-1 bg-amber-300 rounded" />
            </div>
            <a href="/san-pham" className="text-sm text-amber-500 hover:underline">Xem tất cả</a>
          </div>

          {/*
            Display categories in exactly 3 rows.
            Compute number of columns = ceil(items / 3) and use CSS gridTemplateColumns
          */}
          {(() => {
            const displayItems = categories.slice(0, 30);
            const columns = Math.max(1, Math.ceil(displayItems.length / 3));
            const gridStyle: React.CSSProperties = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
            return (
              <div className="grid gap-2 items-stretch" style={gridStyle}>
                {displayItems.map(cat => (
                 <Link key={cat.id} href={cat.href || '#'} className="block text-center no-underline">
                   <div className="bg-white rounded-sm border border-gray-200 hover:shadow-sm transition h-full flex flex-col items-center min-h-[120px]">
                     <div className="w-full p-2 flex items-center justify-center">
                       {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="mx-auto h-20 w-20 object-contain" />
                       ) : (
                         <div className="h-20 w-20 flex items-center justify-center text-xs text-gray-400">No image</div>
                       )}
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


