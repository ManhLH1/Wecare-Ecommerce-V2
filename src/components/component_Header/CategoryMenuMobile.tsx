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
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg">
          <div className="text-center">Đang tải danh mục...</div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      {/* Click overlay to close - chỉ trigger khi click vào phần tối */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main container - prevent event bubbling */}
      <div
        className="relative bg-white h-full max-w-4xl mx-auto shadow-lg"
        onClick={(e) => e.stopPropagation()} // Ngăn bubbling
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b bg-[#049DBF] text-white">
          {/* Left spacer - invisible */}
          <div className="w-8"></div>

          {/* Centered title */}
          <h2 className="text-lg font-semibold text-center flex-1">
            Danh mục sản phẩm
          </h2>

          {/* Right button */}
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-600 rounded transition-colors w-8 h-8 flex items-center justify-center"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content - Two panel layout */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Left Panel - Categories List */}
          <div className="w-2/5 border-r bg-gray-50 overflow-y-auto">
            {sortedCategories.map((group, idx) => (
              <div
                key={idx}
                onClick={(e) => {
                  //   e.preventDefault();
                  //   e.stopPropagation(); // Ngăn event bubble lên overlay
                  //   console.log('Category clicked:', group.crdfd_productname);
                  setSelectedMainCategory(group);
                }}
                className={`
                  flex items-center justify-between p-3 cursor-pointer transition-all duration-200
                  ${
                    selectedMainCategory?.crdfd_productgroupid ===
                    group.crdfd_productgroupid
                      ? "bg-[#049DBF] text-white border-r-4 border-blue-600"
                      : "hover:bg-gray-100 border-r-4 border-transparent"
                  }
                `}
              >
                {/* Icon & Name */}
                <div className="flex items-center space-x-2">
                  {/* <span className={`text-base ${selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid ? 'text-white' : 'text-[#049DBF]'}`}>
                    {getIcon(group.crdfd_productname)}
                  </span> */}
                  <span className="font-medium text-sm">
                    {group.crdfd_productname}
                  </span>
                </div>

                {/* Count & Arrow */}
                <div className="flex items-center space-x-2">
                  {group.productCount !== undefined &&
                    group.productCount > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          selectedMainCategory?.crdfd_productgroupid ===
                          group.crdfd_productgroupid
                            ? "bg-blue-700 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {group.productCount}
                      </span>
                    )}
                  <FaChevronRight className="text-xs opacity-60" />
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel - Subcategories Grid */}
          <div className="w-3/5 overflow-y-auto p-3">
            {selectedMainCategory ? (
              currentSubCategories.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-gray-800 mb-3">
                    {selectedMainCategory.crdfd_productname}
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
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
                                console.log(
                                  "Subcategory clicked:",
                                  item.crdfd_productname
                                );
                                onCategorySelect(item);
                                onClose();
                              }}
                              className="flex flex-col items-center p-2 rounded-lg bg-white border border-gray-100 hover:border-[#049DBF] hover:bg-blue-50 transition-all duration-200 shadow-sm cursor-pointer"
                            >
                              {/* Product Image */}
                              <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-2 flex items-center justify-center group-hover:from-orange-100 group-hover:to-orange-200 transition-all overflow-hidden">
                                {item.crdfd_image_url ? (
                                  <img
                                    src={item.crdfd_image_url}
                                    alt={item.crdfd_productname}
                                    className="w-full h-full object-cover rounded-full transition-transform duration-300 ease-in-out group-hover:scale-110"
                                  />
                                ) : (
                                  <span className="text-gray-400 text-base">
                                    {getIcon(item.crdfd_productname)}
                                  </span>
                                )}
                              </div>

                              {/* Product Name */}
                              <p className="text-[11px] text-center text-gray-700 font-medium line-clamp-2">
                                {item.crdfd_productname}
                              </p>

                              {/* Product Count */}
                              {item.productCount !== undefined &&
                                item.productCount > 0 && (
                                  <span className="text-[10px] text-gray-500 mt-1">
                                    {item.productCount}
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
                              className="flex flex-col items-center justify-center p-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-[#049DBF] hover:bg-blue-50 transition-all duration-200 bg-gray-50 cursor-pointer"
                            >
                              <span className="text-xs font-medium text-gray-600">
                                {isExpanded ? "Thu gọn" : "Xem thêm"}
                              </span>
                              {!isExpanded && (
                                <span className="text-[10px] text-gray-500 mt-1">
                                  +
                                  {currentSubCategories.length - maxItemsToShow}
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
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="text-3xl mb-3 text-gray-300">
                    {getIcon(selectedMainCategory.crdfd_productname)}
                  </div>
                  <p className="text-center text-sm mb-3">
                    Không có danh mục con
                  </p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // Ngăn event bubble lên overlay
                      onCategorySelect(selectedMainCategory);
                      onClose();
                    }}
                    className="px-5 py-2 bg-[#049DBF] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                  >
                    Xem tất cả sản phẩm
                  </button>
                </div>
              )
            ) : (
              // No category selected
              <div className="flex items-center justify-center h-full text-gray-500">
                <p className="text-center text-sm">
                  Chọn danh mục để xem sản phẩm
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
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
            className="w-full text-center text-[#049DBF] hover:text-blue-800 font-medium transition-colors"
          >
            Xem tất cả sản phẩm →
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryMenuMobile;
