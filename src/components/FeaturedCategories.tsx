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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4 items-stretch">
            {categories.map(cat => (
              <Link key={cat.id} href={cat.href || '#'} className="block text-center no-underline">
                <div className="bg-white rounded-md border border-gray-100 shadow-sm hover:shadow-md transition h-full flex flex-col items-center">
                  <div className="w-full p-4 flex items-center justify-center">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="mx-auto h-24 w-24 object-contain" />
                    ) : (
                      <div className="h-24 w-24 flex items-center justify-center text-sm text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="w-full mt-auto bg-gray-50 border-t px-3 py-3">
                    <div className="text-sm text-gray-700 truncate no-underline">{cat.name}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;


