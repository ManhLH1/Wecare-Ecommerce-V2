import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaBoxOpen,
  FaFlask,
  FaRecycle,
  FaWrench,
  FaCog,
  FaChevronRight,
} from "react-icons/fa";
import CategoryMenuMobile from "./CategoryMenuMobile";

interface CategoryMenuProps {
  categoryHierarchy: any;
  categoryGroups: any[];
  loadingCategory: boolean;
  onCategorySelect: (item: any) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const CategoryMenu: React.FC<CategoryMenuProps> = ({
  categoryHierarchy,
  categoryGroups,
  loadingCategory,
  onCategorySelect,
  isMobile = false,
  isOpen = true,
  onClose = () => {},
}) => {
  // All hooks must be declared at the top level before any conditional logic
  const [selectedMainCategory, setSelectedMainCategory] = useState<any>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-select first category when data loads
  useEffect(() => {
    if (categoryGroups && categoryGroups.length > 0 && !selectedMainCategory) {
      const sortedCategories = categoryGroups
        .slice()
        .sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
      setSelectedMainCategory(sortedCategories[0]);
    }
  }, [categoryGroups, selectedMainCategory]);

  // Scroll to specific category section
  const scrollToCategory = useCallback((categoryId: string) => {
    // Method 1: Using refs
    const categoryElement = categoryRefs.current[categoryId];
    if (categoryElement && rightPanelRef.current) {
      const containerRect = rightPanelRef.current.getBoundingClientRect();
      const elementRect = categoryElement.getBoundingClientRect();
      const scrollTop = rightPanelRef.current.scrollTop;
      const targetScrollTop =
        scrollTop + elementRect.top - containerRect.top - 20;

      rightPanelRef.current.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
      });
      return;
    }

    // Method 2: Fallback using getElementById with better timing
    // setTimeout(() => {
    //   const element = document.getElementById(`category-${categoryId}`);
    //   if (element && rightPanelRef.current) {
    //     const containerRect = rightPanelRef.current.getBoundingClientRect();
    //     const elementRect = element.getBoundingClientRect();
    //     const scrollTop = rightPanelRef.current.scrollTop;
    //     const targetScrollTop = scrollTop + elementRect.top - containerRect.top - 20;

    //     rightPanelRef.current.scrollTo({
    //       top: targetScrollTop,
    //       behavior: 'smooth'
    //     });
    //   }
    // }, 150);
  }, []);

  // Handle scroll to highlight current category in view
  const handleScroll = useCallback(() => {
    if (!rightPanelRef.current) return;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce scroll handling
    scrollTimeoutRef.current = setTimeout(() => {
      const container = rightPanelRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerHeight = containerRect.height;
      const threshold = containerTop + 25//+ containerHeight * 2; // 30% from top

      let closestCategory = null;
      let smallestDistance = Infinity;

      // Check each category section
      Object.entries(categoryRefs.current).forEach(([categoryId, element]) => {
        if (!element) return;

        const elementRect = element.getBoundingClientRect();
        const elementTop = elementRect.top;
        const elementBottom = elementRect.bottom;

        // Check if category is in viewport
        if (elementBottom > containerTop && elementTop < containerTop + containerHeight) {
          // Calculate distance from threshold
          const distance = Math.abs(elementTop - threshold);
          
          // If this category is closer to our threshold, select it
          if (distance < smallestDistance) {
            smallestDistance = distance;
            closestCategory = categoryGroups.find(cat => 
              cat.crdfd_productgroupid === categoryId
            );
          }
        }
      });

      // Update selected category if we found one and it's different
      if (closestCategory && closestCategory !== selectedMainCategory) {
        setSelectedMainCategory(closestCategory);
      }
    }, 100); // 100ms debounce
  }, [categoryGroups, selectedMainCategory]);

  // Add scroll event listener
  useEffect(() => {
    const container = rightPanelRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    
    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Hàm icon cho từng nhóm
  const getIcon = (groupName: string) => {
    switch (groupName) {
      case "Kim khí & phụ kiện":
        return <FaBoxOpen />;
      case "Bao bì":
        return <FaBoxOpen />;
      case "Hóa chất":
        return <FaFlask />;
      case "Vật tư tiêu hao":
        return <FaRecycle />;
      case "Công cụ - dụng cụ":
        return <FaWrench />;
      case "Phụ tùng thay thế":
        return <FaCog />;
      default:
        return <FaBoxOpen />;
    }
  };

  // Lấy subcategories cho category được chọn
  const getSubCategories = (categoryId: string) => {
    if (!categoryHierarchy?.byLevel?.["2"]) return [];
    return categoryHierarchy.byLevel["2"]
      .filter((item: any) => item._crdfd_nhomsanphamcha_value === categoryId)
      .sort((a: any, b: any) => (b.productCount || 0) - (a.productCount || 0));
  };

  // Lấy tất cả subcategories theo từng nhóm chính
  const getAllSubCategoriesGrouped = () => {
    if (!categoryHierarchy?.byLevel?.["2"]) return [];

    const sortedCategories = categoryGroups
      .slice()
      .sort((a, b) => (b.productCount || 0) - (a.productCount || 0));

    return sortedCategories
      .map((category) => ({
        mainCategory: category,
        subCategories: getSubCategories(category.crdfd_productgroupid),
      }))
      .filter((group) => group.subCategories.length > 0);
  };

  // Tính tổng số lượng sản phẩm từ tất cả danh mục con
  const getTotalProductCountFromSubCategories = () => {
    if (!categoryHierarchy?.byLevel?.["2"]) return 0;
    
    return categoryHierarchy.byLevel["2"].reduce((total: number, subCategory: any) => {
      return total + (subCategory.productCount || 0);
    }, 0);
  };

  // Mobile version - moved after all hooks
  if (isMobile) {
    return (
      <CategoryMenuMobile
        categoryHierarchy={categoryHierarchy}
        categoryGroups={categoryGroups}
        loadingCategory={loadingCategory}
        onCategorySelect={onCategorySelect}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  // Handle category click
  const handleCategoryClick = (category: any) => {
    // console.log('Clicking category:', category.crdfd_productname, category.crdfd_productgroupid);
    setSelectedMainCategory(category);

    // Add a small delay to ensure state update
    setTimeout(() => {
      scrollToCategory(category.crdfd_productgroupid);
    }, 50);
  };

  // Handle expand/collapse for View All
  const toggleExpandCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  if (loadingCategory) {
    return (
      <div className="w-[800px] h-[400px] bg-white rounded-lg shadow-xl border flex items-center justify-center">
        <div className="text-center py-6 text-[#04A1B3]">Đang tải...</div>
      </div>
    );
  }

  const sortedCategories = categoryGroups
    .slice()
    .sort((a, b) => (b.productCount || 0) - (a.productCount || 0));

  const allSubCategoriesGrouped = getAllSubCategoriesGrouped();
  const totalProductCountFromSubCategories = getTotalProductCountFromSubCategories();

  return (
    <div
      className="w-[calc(100vw-2rem)] min-w-[800px] max-w-[1600px] bg-white rounded-lg overflow-hidden"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        left: "clamp(0vw, 0rem, 0px)",
      }}
    >
      <div className="flex h-[550px]">
        {/* Left Panel - Main Categories */}
        <div className="w-[300px] bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-2">
            <h3 className="text-sm font-semibold text-gray-800 px-3 py-2 border-b border-gray-200">
              Danh mục sản phẩm
            </h3>
            <ul className="mt-2">
              {sortedCategories.map((group, idx) => (
                <li key={group.crdfd_productgroupid || idx} className="mb-1">
                  <button
                    className={`flex items-center w-full px-3 py-2 text-sm font-medium transition-all duration-200 rounded-md group ${
                      selectedMainCategory?.crdfd_productgroupid ===
                      group.crdfd_productgroupid
                        ? "bg-blue-50 text-[#049DBF] border-l-3 border-[#049DBF]"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => handleCategoryClick(group)}
                    // onMouseEnter={() => setHoveredCategory(group)}
                    // onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white mr-3 group-hover:shadow-sm">
                      <span className="text-[#049DBF] text-sm">
                        {getIcon(group.crdfd_productname)}
                      </span>
                    </span>
                    <span className="flex-1 text-left truncate">
                      {group.crdfd_productname}
                    </span>
                    {group.productCount !== undefined &&
                      group.productCount > 0 && (
                        <span className="text-xs text-gray-400 ml-2">
                          ({group.productCount})
                        </span>
                      )}
                    {/* <FaChevronRight className={`w-3 h-3 ml-2 transition-transform duration-200 ${
                      (hoveredCategory || selectedMainCategory)?.crdfd_productgroupid === group.crdfd_productgroupid
                        ? 'text-orange-500 transform rotate-90'
                        : 'text-gray-400'
                    }`} /> */}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Panel - Subcategories */}
      <div ref={rightPanelRef} className="flex-1 bg-white overflow-y-auto max-w-[calc(100%-300px)]">
          {allSubCategoriesGrouped.length > 0 ? (
            <div className="p-4 max-w-full">
              {allSubCategoriesGrouped.map(
          ({ mainCategory, subCategories }) => (
            <div
              key={mainCategory.crdfd_productgroupid}
              id={`category-${mainCategory.crdfd_productgroupid}`}
              ref={(el) => {
                categoryRefs.current[mainCategory.crdfd_productgroupid] =
            el;
              }}
              className="mb-8"
            >
              {/* Category Header */}
              <div
                className={`flex items-center mb-4 pb-3 border-b transition-all duration-200 ${
            selectedMainCategory?.crdfd_productgroupid ===
            mainCategory.crdfd_productgroupid
              ? "border-[#049DBF] bg-blue-50 rounded-lg p-3 -m-3 mb-1"
              : "border-gray-200"
                }`}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 mr-3 flex-shrink-0">
            <span className="text-[#049DBF]">
              {getIcon(mainCategory.crdfd_productname)}
            </span>
                </span>
                <h3
            className={`text-lg font-semibold transition-colors truncate ${
              selectedMainCategory?.crdfd_productgroupid ===
              mainCategory.crdfd_productgroupid
                ? "text-[#049DBF]"
                : "text-gray-800"
            }`}
                >
            {mainCategory.crdfd_productname}
                </h3>
                <span className="ml-auto text-sm text-gray-500 flex-shrink-0">
            {subCategories.length} danh mục con
                </span>
              </div>

              {/* Subcategories Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-w-full">
                {(() => {
            const maxItemsToShow = 11;
            const isExpanded = expandedCategories.has(
              mainCategory.crdfd_productgroupid
            );
            const itemsToShow = isExpanded
              ? subCategories
              : subCategories.slice(0, maxItemsToShow);
            const hasMore = subCategories.length > maxItemsToShow;

            return (
              <>
                {itemsToShow.map((item: any) => (
                  <button
              key={item.crdfd_productgroupid}
              onClick={() => onCategorySelect(item)}
              className="flex flex-col items-center p-3 rounded-lg hover:bg-blue-50 transition-all duration-200 text-center group w-full max-w-[200px] mx-auto"
                  >
              {/* Product Image */}
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-2 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-all overflow-hidden flex-shrink-0">
                <span className="text-gray-400 group-hover:text-[#049DBF] text-lg">
                  {item.crdfd_image_url ? (
                    <img
                src={item.crdfd_image_url}
                alt={item.crdfd_productname}
                className="w-full h-full object-cover rounded-full transition-transform duration-300 ease-in-out group-hover:scale-110"
                    />
                  ) : (
                    getIcon(item.crdfd_productname)
                  )}
                </span>
              </div>

              {/* Product Name */}
              <h4 className="text-sm font-medium text-gray-700 group-hover:text-[#049DBF] leading-tight line-clamp-2 mb-1 break-words">
                {item.crdfd_productname}
              </h4>

              {/* Product Count */}
              {item.productCount !== undefined &&
                item.productCount > 0 && (
                  <p className="text-xs text-gray-400">
                    {item.productCount} sản phẩm
                  </p>
                )}
                  </button>
                ))}

                {/* View All / Show Less Button */}
                {hasMore && (
                  <button
              onClick={() =>
                toggleExpandCategory(
                  mainCategory.crdfd_productgroupid
                )
              }
              className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#049DBF] hover:bg-blue-50 transition-all duration-200 text-center group w-full max-w-[200px] mx-auto"
                  >
              <div className="w-16 h-16 rounded-lg mb-2 flex items-center justify-center bg-gray-50 group-hover:bg-blue-100 transition-all flex-shrink-0">
                <span className="text-gray-400 group-hover:text-[#049DBF] text-lg">
                  <FaChevronRight
                    className={`transform transition-transform duration-200 ${
                isExpanded ? "rotate-270" : "rotate-90"
                    }`}
                  />
                </span>
              </div>
              <h4 className="text-sm font-medium text-gray-600 group-hover:text-[#049DBF] leading-tight">
                {isExpanded ? "Show Less" : "View All"}
              </h4>
              <p className="text-xs text-gray-400">
                {isExpanded
                  ? "Collapse"
                  : `+${
                subCategories.length - maxItemsToShow
                    } more`}
              </p>
                  </button>
                )}
              </>
            );
                })()}
              </div>
            </div>
          )
              )}
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

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Tổng cộng {sortedCategories.length} danh mục chính •{" "}
            {allSubCategoriesGrouped.reduce(
              (total, group) => total + group.subCategories.length,
              0
            )}{" "}
            danh mục con • {totalProductCountFromSubCategories.toLocaleString()} sản phẩm
          </span>
          <button
            onClick={() =>
              onCategorySelect({
                crdfd_productgroupid: "all",
                crdfd_productname: "Tất cả sản phẩm",
              })
            }
            className="text-xs text-[#049DBF] hover:text-blue-800 font-medium"
          >
            Xem tất cả sản phẩm →
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryMenu;
