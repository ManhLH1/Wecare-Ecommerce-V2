import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  onClose = () => { },
}) => {
  // All hooks must be declared at the top level before any conditional logic
  const [selectedMainCategory, setSelectedMainCategory] = useState<any>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(false);
  const hidePanelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter categories: only keep ones that have products and subcategories with products
  const findCategoryNode = useCallback(
    (categoryId: string, nodes: any[]): any | null => {
      for (const node of nodes) {
        if (node.crdfd_productgroupid === categoryId) return node;
        if (node.children && node.children.length > 0) {
          const found = findCategoryNode(categoryId, node.children);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  const filteredCategories = useMemo(() => {
    if (!categoryHierarchy?.hierarchy) return categoryGroups || [];
    const roots: any[] = [];
    for (const cat of categoryGroups || []) {
      const node = findCategoryNode(cat.crdfd_productgroupid, categoryHierarchy.hierarchy);
      if (!node) continue;
      const lv2WithProducts = (node.children || []).filter(
        (lv2: any) =>
          (lv2.productCount || 0) > 0 ||
          (lv2.children || []).some((lv3: any) => (lv3.productCount || 0) > 0)
      );
      if ((cat.productCount || 0) > 0 && lv2WithProducts.length > 0) {
        roots.push(cat);
      }
    }
    return roots;
  }, [categoryGroups, categoryHierarchy, findCategoryNode]);

  // Auto-select first category when data loads (giữ nguyên thứ tự từ API - đã sắp xếp theo CSV)
  useEffect(() => {
    if (filteredCategories && filteredCategories.length > 0 && !selectedMainCategory) {
      setSelectedMainCategory(filteredCategories[0]);
    }
  }, [filteredCategories, selectedMainCategory]);

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

  // Clear hide timeout on unmount
  useEffect(() => {
    return () => {
      if (hidePanelTimeoutRef.current) clearTimeout(hidePanelTimeoutRef.current);
    };
  }, []);

  // NOTE: Scroll handling for dropdown is now managed in JDStyleHeader.tsx
  // with scroll direction detection (close on scroll down, open on scroll up)

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

  // Lấy subcategories (LV2) cho category được chọn từ hierarchy, lọc sản phẩm > 0
  const getSubCategories = (categoryId: string) => {
    if (!categoryHierarchy?.hierarchy) return [];

    const findCategory = (categories: any[]): any => {
      for (const cat of categories) {
        if (cat.crdfd_productgroupid === categoryId) return cat;
        if (cat.children && cat.children.length > 0) {
          const found = findCategory(cat.children);
          if (found) return found;
        }
      }
      return null;
    };

    const category = findCategory(categoryHierarchy.hierarchy);
    const children = category?.children || [];
    return children
      .filter(
        (lv2: any) =>
          (lv2.productCount || 0) > 0 ||
          (lv2.children || []).some((lv3: any) => (lv3.productCount || 0) > 0)
      )
      .map((lv2: any) => ({
        ...lv2,
        children: (lv2.children || []).filter((lv3: any) => (lv3.productCount || 0) > 0),
      }));
  };

  // Lấy tất cả subcategories (LV2 và LV3) theo từng nhóm chính
  const getAllSubCategoriesGrouped = () => {
    // Ưu tiên sử dụng hierarchy nếu có (hỗ trợ 3 level)
    if (categoryHierarchy?.hierarchy) {
      return filteredCategories
        .map((category) => {
          const categoryInHierarchy = categoryHierarchy.hierarchy.find(
            (cat: any) => cat.crdfd_productgroupid === category.crdfd_productgroupid
          );

          return {
            mainCategory: category,
            subCategories: getSubCategories(category.crdfd_productgroupid),
          };
        })
        .filter((group) => group.subCategories.length > 0);
    }

    // Fallback: sử dụng byLevel (chỉ hỗ trợ 2 level)
    if (categoryHierarchy?.byLevel?.["2"]) {
      return filteredCategories
        .map((category) => ({
          mainCategory: category,
          subCategories: getSubCategories(category.crdfd_productgroupid),
        }))
        .filter((group) => group.subCategories.length > 0);
    }

    return [];
  };

  // Tính tổng số lượng sản phẩm từ tất cả danh mục con (LV2 và LV3)
  const getTotalProductCountFromSubCategories = () => {
    if (!categoryHierarchy) return 0;

    // Sử dụng hierarchy nếu có
    if (categoryHierarchy.hierarchy) {
      let total = 0;
      const countProducts = (categories: any[]) => {
        categories.forEach((cat: any) => {
          if (cat.level && cat.level > 1) {
            total += cat.productCount || 0;
          }
          if (cat.children && cat.children.length > 0) {
            countProducts(cat.children);
          }
        });
      };
      countProducts(categoryHierarchy.hierarchy);
      return total;
    }

    // Fallback: sử dụng byLevel
    if (categoryHierarchy.byLevel?.["2"]) {
      return categoryHierarchy.byLevel["2"].reduce((total: number, subCategory: any) => {
        return total + (subCategory.productCount || 0);
      }, 0);
    }

    return 0;
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
    setShowRightPanel(true);

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

  const handleCategoryHover = (category: any) => {
    if (hidePanelTimeoutRef.current) {
      clearTimeout(hidePanelTimeoutRef.current);
    }
    setShowRightPanel(true);
    setSelectedMainCategory(category);
  };

  const handleMouseLeavePanel = () => {
    if (hidePanelTimeoutRef.current) {
      clearTimeout(hidePanelTimeoutRef.current);
    }
    hidePanelTimeoutRef.current = setTimeout(() => {
      setShowRightPanel(false);
    }, 120);
  };

  // Giữ nguyên thứ tự từ API (đã sắp xếp theo CSV) và đã lọc
  const sortedCategories = filteredCategories;

  // Chỉ hiển thị danh mục đang chọn để tránh scroll dài
  const allSubCategoriesGrouped = useMemo(() => {
    if (!selectedMainCategory) return [];
    const group = getAllSubCategoriesGrouped().find(
      (g) => g.mainCategory.crdfd_productgroupid === selectedMainCategory.crdfd_productgroupid
    );
    return group ? [group] : [];
  }, [selectedMainCategory, getAllSubCategoriesGrouped]);
  const totalProductCountFromSubCategories = getTotalProductCountFromSubCategories();

  if (loadingCategory) {
    return (
      <div className="w-[800px] h-[400px] bg-white rounded-lg shadow-xl border flex items-center justify-center">
        <div className="text-center py-6 text-[#04A1B3]">Đang tải...</div>
      </div>
    );
  }

  const collapsedWidth = 280;
  const expandedWidth = 1100;

  return (
    <div
      className="bg-white rounded-b-lg overflow-hidden transition-all duration-200"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        left: "clamp(0vw, 0rem, 0px)",
        width: showRightPanel ? `${expandedWidth}px` : `${collapsedWidth}px`,
        minWidth: showRightPanel ? `${expandedWidth}px` : `${collapsedWidth}px`,
        maxWidth: showRightPanel ? `${expandedWidth}px` : `${collapsedWidth}px`,
      }}
      onMouseLeave={handleMouseLeavePanel}
    >
      <div className="flex">
        {/* Left Panel - Main Categories - Style giống sieuthihaiminh.vn */}
        <div className="w-[280px] bg-gray-50 border-r border-gray-200">
          <div>
            <ul className="mt-1 p-2">
              {sortedCategories.map((group, idx) => (
                <li key={group.crdfd_productgroupid || idx} className="mb-0.5">
                  <button
                    className={`flex items-center w-full px-3 py-2.5 text-sm font-medium transition-all duration-200 rounded-md group ${selectedMainCategory?.crdfd_productgroupid ===
                      group.crdfd_productgroupid
                      ? "bg-amber-50 text-amber-700 border-l-4 border-amber-500 shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    onClick={() => handleCategoryClick(group)}
                    onMouseEnter={() => handleCategoryHover(group)}
                  >
                    <span className={`flex items-center justify-center w-8 h-8 rounded-md mr-2 transition-colors ${selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                      ? "bg-amber-100"
                      : "bg-white group-hover:bg-gray-50"
                      }`}>
                      <span className={`text-base ${selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                        ? "text-amber-600"
                        : "text-gray-600"
                        }`}>
                        {getIcon(group.crdfd_productname)}
                      </span>
                    </span>
                    <span className="flex-1 text-left truncate font-medium">
                      {group.crdfd_productname}
                    </span>
                    {group.productCount !== undefined &&
                      group.productCount > 0 && (
                        <span className={`text-xs ml-2 ${selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                          ? "text-amber-600"
                          : "text-gray-400"
                          }`}>
                          ({group.productCount})
                        </span>
                      )}
                    <FaChevronRight className={`w-3 h-3 ml-2 transition-transform duration-200 ${selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                      ? 'text-amber-600 transform rotate-90'
                      : 'text-gray-400'
                      }`} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Panel - Subcategories - Chỉ hiện khi hover */}
        {showRightPanel && (
          <div
            ref={rightPanelRef}
            className="flex-1 bg-white max-w-[calc(100%-280px)]"
            onMouseEnter={() => setShowRightPanel(true)}
            onMouseLeave={handleMouseLeavePanel}
          >
            {allSubCategoriesGrouped.length > 0 ? (
              <div className="p-6 max-w-full flex flex-col items-center">
                {allSubCategoriesGrouped.map(
                  ({ mainCategory, subCategories }) => (
                    <div
                      key={mainCategory.crdfd_productgroupid}
                      id={`category-${mainCategory.crdfd_productgroupid}`}
                      ref={(el) => {
                        categoryRefs.current[mainCategory.crdfd_productgroupid] =
                          el;
                      }}
                      className="mb-6 w-full"
                    >
                      {/* Subcategories - LV2 và LV3 - Hiển thị theo dạng columns căn giữa */}
                      <div className="grid grid-cols-4 gap-8 justify-items-center mx-auto">
                        {subCategories.map((lv2Item: any) => {
                          const lv3Items = lv2Item.children || [];

                          return (
                            <div key={lv2Item.crdfd_productgroupid} className="flex flex-col items-center text-center">
                              {/* LV2 Header - Bold text, clickable */}
                              <button
                                onClick={() => onCategorySelect(lv2Item)}
                                className="text-center mb-2 group"
                              >
                                <h4 className="text-sm font-bold text-gray-900 group-hover:text-amber-600 transition-colors leading-tight">
                                  {lv2Item.crdfd_productname}
                                </h4>
                              </button>

                              {/* LV3 Items - Simple text links, always visible */}
                              {lv3Items.length > 0 ? (
                                <div className="flex flex-col space-y-0.5 items-center">
                                  {lv3Items.map((lv3Item: any) => (
                                    <button
                                      key={lv3Item.crdfd_productgroupid}
                                      onClick={() => onCategorySelect(lv3Item)}
                                      className="text-center text-sm text-gray-600 hover:text-amber-600 transition-colors py-1 leading-relaxed"
                                    >
                                      {lv3Item.crdfd_productname}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
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
        )}
      </div>

      {/* Footer - Style giống sieuthihaiminh.vn */}
      {showRightPanel && (
        <div className="bg-gray-50 border-t-2 border-gray-200 px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-medium">
              Tổng cộng <strong className="text-gray-900">{sortedCategories.length}</strong> danh mục chính •{" "}
              <strong className="text-gray-900">{(() => {
                let lv2Count = 0;
                let lv3Count = 0;
                allSubCategoriesGrouped.forEach(group => {
                  group.subCategories.forEach((lv2: any) => {
                    lv2Count++;
                    if (lv2.children) {
                      lv3Count += lv2.children.length;
                    }
                  });
                });
                return `${lv2Count} LV2${lv3Count > 0 ? ` • ${lv3Count} LV3` : ''}`;
              })()}</strong>{" "}
              danh mục con • <strong className="text-gray-900">{totalProductCountFromSubCategories.toLocaleString()}</strong> sản phẩm
            </span>
            <button
              onClick={() =>
                onCategorySelect({
                  crdfd_productgroupid: "all",
                  crdfd_productname: "Tất cả sản phẩm",
                })
              }
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold hover:underline transition-all duration-200"
            >
              Xem tất cả sản phẩm →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryMenu;
