import React from 'react';
import Reveal from '@/components/ui/Reveal';

interface CategoryGroup {
  crdfd_productgroupid: string;
  crdfd_productname: string;
  productCount?: number;
}

interface CategorySectionProps {
  categoryGroups: CategoryGroup[];
  loadingCategory: boolean;
  onCategorySelect: (group: CategoryGroup) => void;
  getIcon: (groupName: string) => React.ReactNode;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  categoryGroups,
  loadingCategory,
  onCategorySelect,
  getIcon,
}) => {
  return (
    <section className="px-[5px] md:px-[50px] mt-4 mb-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="mb-4 md:mb-6 text-left pt-4">
        <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2 text-center">
          Danh mục ngành hàng
        </h2>
        <p className="text-sm md:text-base text-gray-600 text-center">
          Khám phá các sản phẩm theo ngành hàng
        </p>
      </div>

      {loadingCategory ? (
        <>
          {/* Mobile: giữ grid */}
          <div className="grid grid-cols-4 gap-4 pb-4 md:hidden">
            {[...Array(8)].map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse flex flex-col items-center"
              >
                <div className="bg-gray-200 rounded-full w-12 h-12 mb-2"></div>
                <div className="bg-gray-200 rounded h-2 w-10"></div>
              </div>
            ))}
          </div>
          {/* Desktop: grid layout */}
          <div className="hidden md:grid md:grid-cols-5 gap-6 pb-4">
            {[...Array(10)].map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse flex flex-col items-center"
              >
                <div className="bg-gray-200 rounded-full w-20 h-20 mb-3"></div>
                <div className="bg-gray-200 rounded h-4 w-16"></div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Mobile: 2 dòng với scroll ngang */}
          <div className="relative md:hidden">
            {/* Nút scroll trái */}
            <button
              onClick={() => {
                const container = document.getElementById(
                  "category-scroll-mobile"
                );
                if (container) {
                  container.scrollBy({ left: -200, behavior: "smooth" });
                }
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 backdrop-blur-sm border border-gray-200"
              aria-label="Scroll left"
              style={{ minWidth: 32, minHeight: 32 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Container scroll */}
            <div
              id="category-scroll-mobile"
              className="overflow-x-auto scrollbar-hide py-2 px-8"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {/* Grid với 2 dòng cố định và scroll ngang */}
              <div
                className="grid gap-x-3 gap-y-2"
                style={{
                  gridTemplateRows: "repeat(2, 1fr)",
                  gridAutoFlow: "column",
                  minWidth: "max-content",
                  gridAutoColumns: "80px",
                }}
              >
                {categoryGroups.map((group, idx) => (
                  <Reveal key={group.crdfd_productgroupid || idx} as="div" delay={idx * 40}>
                    <button
                      onClick={() => onCategorySelect(group)}
                      className="group flex flex-col items-center justify-between transition-all duration-200 cursor-pointer py-1"
                      style={{ height: "100px" }}
                    >
                      {/* Icon container - circular */}
                      <div className="relative group-hover:scale-105 transition-all duration-200 flex-shrink-0">
                        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 group-hover:border-blue-400 transition-all duration-200 shadow-md group-hover:shadow-lg">
                          <span className="text-xl text-blue-600">
                            {getIcon(group.crdfd_productname)}
                          </span>
                        </div>
                      </div>

                      {/* Category name - với chiều cao cố định */}
                      <div
                        className="flex items-end justify-center px-1"
                        style={{ height: "30px" }}
                      >
                      <span className="text-xs font-semibold text-gray-700 text-center leading-tight group-hover:text-blue-700 transition-colors duration-200 line-clamp-2">
                        {group.crdfd_productname}
                      </span>
                      </div>
                    </button>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Nút scroll phải */}
            <button
              onClick={() => {
                const container = document.getElementById(
                  "category-scroll-mobile"
                );
                if (container) {
                  container.scrollBy({ left: 200, behavior: "smooth" });
                }
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 backdrop-blur-sm border border-gray-200"
              aria-label="Scroll right"
              style={{ minWidth: 32, minHeight: 32 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Desktop: 5 cột, thiết kế tròn lớn hơn */}
          <div className="hidden md:grid md:grid-cols-5 gap-0 pb-6 justify-items-center">
            {categoryGroups.map((group, idx) => (
              <Reveal key={group.crdfd_productgroupid || idx} as="div" delay={idx * 60}>
                <button
                  onClick={() => onCategorySelect(group)}
                  className="group flex flex-col items-center justify-center transition-all duration-200 cursor-pointer py-2"
                >
                  {/* Icon container - circular */}
                  <div className="relative mb-2 group-hover:scale-105 transition-all duration-200">
                    <div className="w-28 h-28 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 group-hover:border-blue-400 transition-all duration-200 shadow-lg group-hover:shadow-xl">
                      <span className="text-5xl text-blue-600">
                        {getIcon(group.crdfd_productname)}
                      </span>
                    </div>
                  </div>

                  {/* Category name */}
                  <span className="text-sm font-semibold text-gray-700 text-center leading-tight group-hover:text-blue-700 transition-colors duration-200 line-clamp-2 px-2">
                    {group.crdfd_productname}
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default CategorySection;
