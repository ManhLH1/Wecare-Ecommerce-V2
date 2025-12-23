import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaBoxOpen,
  FaFlask,
  FaRecycle,
  FaWrench,
  FaCog,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";

interface CategoryMenuMobileProps {
  categoryHierarchy: any;
  categoryGroups: any[];
  loadingCategory: boolean;
  onCategorySelect: (item: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

const CategoryMenuMobile: React.FC<CategoryMenuMobileProps> = ({
  categoryHierarchy,
  categoryGroups,
  loadingCategory,
  onCategorySelect,
  isOpen,
  onClose,
}) => {
  const [selectedMainCategory, setSelectedMainCategory] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Add fade-in animation style
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Auto-select first category when data loads (giữ nguyên thứ tự từ API - đã sắp xếp theo CSV)
  useEffect(() => {
    if (categoryGroups && categoryGroups.length > 0 && !selectedMainCategory) {
      // Không sắp xếp lại, giữ nguyên thứ tự từ API
      setSelectedMainCategory(categoryGroups[0]);
    }
  }, [categoryGroups, selectedMainCategory]);

  // Reset states when closing
  useEffect(() => {
    if (!isOpen) {
      setExpandedCategories(new Set());
    }
  }, [isOpen]);

  // Hàm icon cho từng nhóm
  const getIcon = (groupName: string) => {
    switch (groupName) {
      case "Kim khí & phụ kiện":
        return <FaWrench />;
      case "Bao bì":
        return <FaBoxOpen />;
      case "Hóa chất":
        return <FaFlask />;
      case "Vật tư tiêu hao":
        return <FaRecycle />;
      case "Công cụ - dụng cụ":
        return <FaCog />;
      case "Phụ tùng thay thế":
        return <FaWrench />;
      default:
        return <FaBoxOpen />;
    }
  };

  // Lấy subcategories cho category được chọn (giữ nguyên thứ tự từ API - đã sắp xếp theo CSV)
  const getSubCategories = (categoryId: string) => {
    if (!categoryHierarchy?.byLevel?.["2"]) return [];
    // Không sắp xếp lại, giữ nguyên thứ tự từ API
    return categoryHierarchy.byLevel["2"]
      .filter((item: any) => item._crdfd_nhomsanphamcha_value === categoryId);
  };

  if (!isOpen) return null;

  if (loadingCategory) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl max-w-sm mx-4">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#049DBF] mb-4"></div>
            <div className="text-center text-sm sm:text-base font-medium text-gray-700">Đang tải danh mục...</div>
          </div>
        </div>
      </div>
    );
  }

  // Giữ nguyên thứ tự từ API (đã sắp xếp theo CSV)
  const sortedCategories = categoryGroups;

  const currentSubCategories = selectedMainCategory
    ? getSubCategories(selectedMainCategory.crdfd_productgroupid)
    : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" style={{ animation: 'fadeIn 0.2s ease-out' }}>
      {/* Click overlay to close - chỉ trigger khi click vào phần tối */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main container - prevent event bubbling */}
      <div
        className="relative bg-white h-full max-w-4xl mx-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()} // Ngăn bubbling
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-[#049DBF] to-[#04B2D9] text-white flex-shrink-0">
          {/* Left spacer - invisible */}
          <div className="w-8 sm:w-10"></div>

          {/* Centered title */}
          <h2 className="text-base sm:text-lg font-bold text-center flex-1">
            Danh mục sản phẩm
          </h2>

          {/* Right button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center touch-manipulation"
            aria-label="Đóng menu"
          >
            <FaTimes className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content - Two panel layout */}
        <div className="flex h-[calc(100vh-80px)] sm:h-[calc(100vh-88px)] overflow-hidden">
          {/* Left Panel - Categories List */}
          <div className="w-2/5 sm:w-2/5 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
            {sortedCategories.map((group, idx) => (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation(); // Ngăn event bubble lên overlay
                  setSelectedMainCategory(group);
                }}
                className={`
                  flex items-center justify-between p-2.5 sm:p-3 cursor-pointer transition-all duration-200 touch-manipulation active:scale-[0.98]
                  ${
                    selectedMainCategory?.crdfd_productgroupid ===
                    group.crdfd_productgroupid
                      ? "bg-[#049DBF] text-white border-r-3 sm:border-r-4 border-[#04B2D9] shadow-sm"
                      : "hover:bg-gray-100 active:bg-gray-200 border-r-3 sm:border-r-4 border-transparent"
                  }
                `}
              >
                {/* Icon & Name */}
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <span className={`text-lg sm:text-xl flex-shrink-0 ${
                    selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid 
                      ? 'text-white' 
                      : 'text-[#049DBF]'
                  }`}>
                    {getIcon(group.crdfd_productname)}
                  </span>
                  <span className={`font-medium text-xs sm:text-sm truncate ${
                    selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                      ? 'text-white'
                      : 'text-gray-800'
                  }`}>
                    {group.crdfd_productname}
                  </span>
                </div>

                {/* Count & Arrow */}
                <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                  {group.productCount !== undefined &&
                    group.productCount > 0 && (
                      <span
                        className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          selectedMainCategory?.crdfd_productgroupid ===
                          group.crdfd_productgroupid
                            ? "bg-white/20 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {group.productCount > 999 ? '999+' : group.productCount}
                      </span>
                    )}
                  <FaChevronRight className={`text-xs sm:text-sm ${
                    selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                      ? 'text-white/80'
                      : 'text-gray-400'
                  }`} />
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel - Subcategories Grid */}
          <div className="w-3/5 overflow-y-auto p-3 sm:p-4 flex-1 min-w-0">
            {selectedMainCategory ? (
              currentSubCategories.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-2 border-b border-gray-200">
                    <span className="text-xl sm:text-2xl text-[#049DBF] flex-shrink-0">
                      {getIcon(selectedMainCategory.crdfd_productname)}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-gray-800">
                      {selectedMainCategory.crdfd_productname}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {(() => {
                      const maxItemsToShow = 7;
                      const isExpanded = expandedCategories.has(
                        selectedMainCategory.crdfd_productgroupid
                      );
                      const itemsToShow = isExpanded
                        ? currentSubCategories
                        : currentSubCategories.slice(0, maxItemsToShow);
                      const hasMore =
                        currentSubCategories.length > maxItemsToShow;

                      return (
                        <>
                          {itemsToShow.map((item: any) => (
                            <div
                              key={item.crdfd_productgroupid}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation(); // Ngăn event bubble lên overlay
                                onCategorySelect(item);
                                onClose();
                              }}
                              className="flex flex-col items-center p-2 sm:p-3 rounded-xl bg-white border border-gray-200 hover:border-[#049DBF] hover:bg-blue-50 active:bg-blue-100 active:scale-95 transition-all duration-200 shadow-sm cursor-pointer touch-manipulation group"
                            >
                              {/* Product Image/Icon */}
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full mb-2 sm:mb-3 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-all overflow-hidden flex-shrink-0">
                                {item.crdfd_image_url ? (
                                  <img
                                    src={item.crdfd_image_url}
                                    alt={item.crdfd_productname}
                                    className="w-full h-full object-cover rounded-full transition-transform duration-300 ease-in-out group-hover:scale-110"
                                  />
                                ) : (
                                  <span className="text-[#049DBF] text-2xl sm:text-3xl">
                                    {getIcon(item.crdfd_productname)}
                                  </span>
                                )}
                              </div>

                              {/* Product Name */}
                              <p className="text-[10px] sm:text-xs text-center text-gray-700 font-semibold line-clamp-2 min-h-[2.5em] leading-tight">
                                {item.crdfd_productname}
                              </p>

                              {/* Product Count */}
                              {item.productCount !== undefined &&
                                item.productCount > 0 && (
                                  <span className="text-[9px] sm:text-[10px] text-gray-500 mt-1 font-medium">
                                    ({item.productCount > 999 ? '999+' : item.productCount})
                                  </span>
                                )}
                            </div>
                          ))}

                          {/* View All / Show Less Button */}
                          {hasMore && (
                            <div
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation(); // Ngăn event bubble lên overlay
                                setExpandedCategories((prev) => {
                                  const newSet = new Set(prev);
                                  if (
                                    newSet.has(
                                      selectedMainCategory.crdfd_productgroupid
                                    )
                                  ) {
                                    newSet.delete(
                                      selectedMainCategory.crdfd_productgroupid
                                    );
                                  } else {
                                    newSet.add(
                                      selectedMainCategory.crdfd_productgroupid
                                    );
                                  }
                                  return newSet;
                                });
                              }}
                              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#049DBF] hover:bg-blue-50 active:bg-blue-100 active:scale-95 transition-all duration-200 bg-gray-50 cursor-pointer touch-manipulation"
                            >
                              <span className="text-xs sm:text-sm font-semibold text-gray-700">
                                {isExpanded ? "Thu gọn" : "Xem thêm"}
                              </span>
                              {!isExpanded && (
                                <span className="text-[10px] sm:text-xs text-gray-500 mt-1 font-medium">
                                  +{currentSubCategories.length - maxItemsToShow} danh mục
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                // No subcategories
                <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
                  <div className="text-4xl sm:text-5xl mb-4 text-gray-300">
                    {getIcon(selectedMainCategory.crdfd_productname)}
                  </div>
                  <p className="text-center text-sm sm:text-base mb-4 font-medium">
                    Không có danh mục con
                  </p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // Ngăn event bubble lên overlay
                      onCategorySelect(selectedMainCategory);
                      onClose();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-[#049DBF] to-[#04B2D9] text-white rounded-xl hover:from-[#04B2D9] hover:to-[#049DBF] active:scale-95 transition-all font-semibold text-sm sm:text-base shadow-md touch-manipulation"
                  >
                    Xem tất cả sản phẩm
                  </button>
                </div>
              )
            ) : (
              // No category selected
              <div className="flex items-center justify-center h-full text-gray-400 px-4">
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl mb-3 opacity-50">📦</div>
                  <p className="text-sm sm:text-base font-medium">
                    Chọn danh mục để xem sản phẩm
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 flex-shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation(); // Ngăn event bubble lên overlay
              onCategorySelect({
                crdfd_productgroupid: "all",
                crdfd_productname: "Tất cả sản phẩm",
              });
              onClose();
            }}
            className="w-full text-center text-[#049DBF] hover:text-[#04B2D9] active:text-[#049DBF] font-bold text-sm sm:text-base transition-colors py-2 touch-manipulation"
          >
            Xem tất cả sản phẩm →
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryMenuMobile;
