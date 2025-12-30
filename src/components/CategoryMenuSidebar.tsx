"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { FaChevronRight } from "react-icons/fa";

interface CategoryMenuSidebarProps {
  categoryHierarchy: any;
  categoryGroups: any[];
  loadingCategory: boolean;
  onCategorySelect: (item: any) => void;
}

// Enhanced icon function
const getIcon = (groupName: string) => {
  const normalized = groupName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d");

  if (normalized.includes("may moc") || normalized.includes("maymoc")) return "⚙️";
  if (normalized.includes("thiet bi cong nghiep")) return "🏭";
  if (normalized.includes("thiet bi") && !normalized.includes("van chuyen") && !normalized.includes("bao ho")) return "🔧";
  if (normalized.includes("van chuyen") || normalized.includes("vanchuyen")) return "🚚";
  if (normalized.includes("bao ho") || normalized.includes("an toan") || normalized.includes("lao dong")) return "🛡️";
  if (normalized.includes("bao bi") || normalized.includes("dong goi")) return "📦";
  if (normalized.includes("phu tung") || normalized.includes("thay the")) return "🔧";
  if (normalized.includes("vat tu tieu hao") || normalized.includes("tieu hao")) return "♻️";
  if (normalized.includes("kim khi") || normalized.includes("phu kien")) return "📦";
  if (normalized.includes("cong cu") || normalized.includes("dung cu")) return "🔨";
  if (normalized.includes("hoa chat") || normalized.includes("hoachat")) return "🧪";
  if (normalized.includes("dien") || normalized.includes("dien tu")) return "⚡";
  if (normalized.includes("nha may") || normalized.includes("xuong")) return "🏭";
  if (normalized.includes("luu kho") || normalized.includes("kho hang")) return "🚚";
  return "📋";
};

const CategoryMenuSidebar: React.FC<CategoryMenuSidebarProps> = ({
  categoryHierarchy,
  categoryGroups,
  loadingCategory,
  onCategorySelect,
}) => {
  const [selectedMainCategory, setSelectedMainCategory] = useState<any>(null);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(false);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const hidePanelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Get subcategories for a category
  const getSubcategories = useCallback((categoryId: string) => {
    if (!categoryHierarchy?.byLevel?.["2"]) return [];
    return categoryHierarchy.byLevel["2"].filter(
      (item: any) => item._crdfd_nhomsanphamcha_value === categoryId
    );
  }, [categoryHierarchy]);

  // Filter and sort categories
  const sortedCategories = useMemo(() => {
    if (!categoryGroups || categoryGroups.length === 0) return [];
    return categoryGroups
      .filter((g: any) => g.productCount === undefined || g.productCount > 0)
      .sort((a: any, b: any) => (b.cr1bb_soh6thang || 0) - (a.cr1bb_soh6thang || 0))
      .slice(0, 12);
  }, [categoryGroups]);

  // Get all subcategories for selected category
  const allSubCategoriesGrouped = useMemo(() => {
    if (!selectedMainCategory) return [];
    const subcategories = getSubcategories(selectedMainCategory.crdfd_productgroupid);
    if (subcategories.length === 0) return [];
    return [{ mainCategory: selectedMainCategory, subCategories: subcategories }];
  }, [selectedMainCategory, getSubcategories]);

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
    }, 150);
  };

  const handleCategoryClick = (category: any) => {
    onCategorySelect(category);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hidePanelTimeoutRef.current) {
        clearTimeout(hidePanelTimeoutRef.current);
      }
    };
  }, []);

  if (loadingCategory) {
    return (
      <div className="w-[280px] bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-4">
          <div className="space-y-3">
            {[...Array(8)].map((_, idx) => (
              <div key={idx} className="animate-pulse flex items-center">
                <div className="w-5 h-5 bg-gray-200 rounded mr-3"></div>
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={sidebarRef}>
      {/* Left Panel - Main Categories - Fixed Width, Height matches Hero Section (500px) */}
      {/* Header đã ở trên header bar chính, sidebar chỉ hiển thị danh sách */}
      <div
        className="w-[280px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden h-[500px]"
        onMouseLeave={handleMouseLeavePanel}
      >

        <ul className="py-1 pb-4 overflow-y-auto h-full">
          {sortedCategories.map((group: any, idx: number) => (
            <li
              key={group.crdfd_productgroupid || idx}
              className={`${idx !== sortedCategories.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <button
                className={`flex items-center w-full px-4 py-2.5 text-sm transition-all duration-200 group ${selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                  ? "bg-amber-50 text-amber-700 border-l-4 border-amber-500"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                onClick={() => handleCategoryClick(group)}
                onMouseEnter={() => handleCategoryHover(group)}
              >
                <span className={`flex items-center justify-center w-6 h-6 mr-3 text-lg transition-colors ${selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                  ? "text-amber-600"
                  : "text-gray-500"
                  }`}>
                  {getIcon(group.crdfd_productname)}
                </span>
                <span className={`flex-1 text-left truncate ${selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                  ? "font-semibold"
                  : "font-normal"
                  }`}>
                  {group.crdfd_productname}
                </span>
                <FaChevronRight className={`w-3 h-3 transition-transform duration-200 ${selectedMainCategory?.crdfd_productgroupid === group.crdfd_productgroupid
                  ? 'text-amber-600'
                  : 'text-gray-400'
                  }`} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Panel - Subcategories - OVERLAY on top of content */}
      {showRightPanel && allSubCategoriesGrouped.length > 0 && (
        <div
          ref={rightPanelRef}
          className="absolute left-[280px] top-0 z-50 bg-white rounded-r-lg shadow-2xl border border-gray-200 border-l-0"
          style={{
            width: 'calc(100vw - 320px)',
            maxWidth: '900px',
            minHeight: '400px',
            maxHeight: 'calc(100vh - 150px)',
          }}
          onMouseEnter={() => {
            if (hidePanelTimeoutRef.current) {
              clearTimeout(hidePanelTimeoutRef.current);
            }
            setShowRightPanel(true);
          }}
          onMouseLeave={handleMouseLeavePanel}
        >
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            {allSubCategoriesGrouped.map(({ mainCategory, subCategories }) => (
              <div key={mainCategory.crdfd_productgroupid} className="mb-6">
                {/* Header */}
                <div className="flex items-center mb-4 pb-3 border-b border-gray-200">
                  <span className="text-2xl mr-3">{getIcon(mainCategory.crdfd_productname)}</span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{mainCategory.crdfd_productname}</h3>
                    <p className="text-sm text-gray-500">
                      {subCategories.length} danh mục con • {mainCategory.productCount || 0} sản phẩm
                    </p>
                  </div>
                  <button
                    onClick={() => handleCategoryClick(mainCategory)}
                    className="ml-auto bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Xem tất cả
                  </button>
                </div>

                {/* Subcategories Grid */}
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
                  {subCategories.map((lv2Item: any) => {
                    const lv3Items = lv2Item.children || [];
                    return (
                      <div key={lv2Item.crdfd_productgroupid} className="space-y-2">
                        {/* LV2 Header */}
                        <button
                          onClick={() => onCategorySelect(lv2Item)}
                          className="text-left group w-full"
                        >
                          <h4 className="text-sm font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                            {lv2Item.crdfd_productname}
                          </h4>
                          {lv2Item.productCount > 0 && (
                            <span className="text-xs text-gray-400">({lv2Item.productCount})</span>
                          )}
                        </button>

                        {/* LV3 Items */}
                        {lv3Items.length > 0 && (
                          <ul className="space-y-1 pl-2 border-l-2 border-gray-100">
                            {lv3Items.slice(0, 5).map((lv3Item: any) => (
                              <li key={lv3Item.crdfd_productgroupid}>
                                <button
                                  onClick={() => onCategorySelect(lv3Item)}
                                  className="text-xs text-gray-600 hover:text-amber-600 transition-colors text-left"
                                >
                                  {lv3Item.crdfd_productname}
                                </button>
                              </li>
                            ))}
                            {lv3Items.length > 5 && (
                              <li>
                                <button
                                  onClick={() => onCategorySelect(lv2Item)}
                                  className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                                >
                                  + {lv3Items.length - 5} more
                                </button>
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryMenuSidebar;

