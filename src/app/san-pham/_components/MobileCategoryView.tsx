"use client";
import React, { useState } from "react";
import { FaTimes, FaChevronRight, FaSpinner, FaBox, FaHome } from "react-icons/fa";

interface MobileCategoryViewProps {
  categoryHierarchy: any;
  categoryGroups: any[];
  loadingCategory: boolean;
  onCategorySelect: (item: any) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const MobileCategoryView: React.FC<MobileCategoryViewProps> = ({
  categoryHierarchy,
  categoryGroups,
  loadingCategory,
  onCategorySelect,
  onClose,
  showCloseButton = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // Get subcategories for selected category
  const getSubcategories = (categoryId: string) => {
    if (!categoryHierarchy?.byLevel?.["2"]) return [];
    return categoryHierarchy.byLevel["2"].filter(
      (child: any) => child._crdfd_nhomsanphamcha_value === categoryId
    );
  };

  const handleCategoryClick = (item: any) => {
    setSelectedCategory(item);
    // Debug: Log the subcategories
    const subcategories = getSubcategories(item.crdfd_productgroupid);
    console.log('Selected category:', item.crdfd_productname, 'ID:', item.crdfd_productgroupid);
    console.log('Category hierarchy:', categoryHierarchy);
    console.log('Level 2 groups:', categoryHierarchy?.byLevel?.["2"]);
    console.log('Subcategories found:', subcategories.length);
    console.log('Subcategories:', subcategories);
  };

  const handleSubcategoryClick = (subcategory: any) => {
    onCategorySelect(subcategory);
  };

  return (
    <div className="w-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-[#049DBF] to-[#04B2D9]">
        <h2 className="text-lg font-bold text-white">Danh mục sản phẩm</h2>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 text-white"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="flex h-[500px]">
        {/* Left Column - Main Categories */}
        <div className="w-1/2 bg-white border-r border-gray-200 overflow-y-auto">
          {loadingCategory ? (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="w-4 h-4 text-[#049DBF] animate-spin" />
              <span className="ml-2 text-gray-600 text-sm">Đang tải...</span>
            </div>
          ) : categoryGroups && categoryGroups.length > 0 ? (
            <div className="p-2">
              {/* All Products Option */}
              <button
                onClick={() => {
                  onCategorySelect({ crdfd_productgroupid: 'all', crdfd_productname: 'Tất cả sản phẩm' });
                }}
                className={`flex items-start justify-between w-full p-3 text-left transition-colors mb-1 ${
                  selectedCategory?.crdfd_productgroupid === 'all' 
                    ? 'bg-[#049DBF] text-white' 
                    : 'hover:bg-gray-50'
                }`}
              >
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                     <FaHome className="w-4 h-4 text-[#049DBF]" />
                   </div>
                   <span className="text-sm font-medium leading-tight break-words">Tất cả sản phẩm</span>
                 </div>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full flex-shrink-0">
                  {categoryGroups.reduce((sum, item) => sum + (item.productCount || 0), 0)}
                </span>
              </button>

              {/* Category Items */}
              <div className="space-y-0">
                {categoryGroups.map((item) => (
                  <button
                    key={item.crdfd_productgroupid}
                    onClick={() => handleCategoryClick(item)}
                    className={`flex items-start justify-between w-full p-3 text-left transition-colors ${
                      selectedCategory?.crdfd_productgroupid === item.crdfd_productgroupid 
                        ? 'bg-[#049DBF] text-white' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                         {item.crdfd_image_url ? (
                           <img
                             src={item.crdfd_image_url}
                             alt={item.crdfd_productname}
                             className="w-full h-full rounded object-cover"
                           />
                         ) : (
                           <FaBox className="w-4 h-4 text-gray-500" />
                         )}
                       </div>
                       <span className="text-sm font-medium leading-tight break-words">
                         {item.crdfd_productname}
                       </span>
                     </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      selectedCategory?.crdfd_productgroupid === item.crdfd_productgroupid
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.productCount || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <FaBox className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium text-sm">Không có danh mục</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Subcategories */}
        <div className="w-1/2 bg-gray-50 overflow-y-auto">
          {selectedCategory ? (
            <div className="p-3">
              <h3 className="text-base font-bold text-gray-800 mb-3">
                {selectedCategory.crdfd_productname}
              </h3>
              {(() => {
                const subcategories = getSubcategories(selectedCategory.crdfd_productgroupid);
                if (subcategories.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <FaBox className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium text-sm">Không có danh mục con</p>
                        <p className="text-gray-500 text-xs">Chọn danh mục khác</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {subcategories.map((subcategory: any) => (
                      <button
                        key={subcategory.crdfd_productgroupid}
                        onClick={() => handleSubcategoryClick(subcategory)}
                        className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                          {subcategory.crdfd_image_url ? (
                            <img
                              src={subcategory.crdfd_image_url}
                              alt={subcategory.crdfd_productname}
                              className="w-full h-full rounded-lg object-cover"
                            />
                          ) : (
                            <FaBox className="w-6 h-6 text-gray-500" />
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-800 mb-1 leading-tight break-words">
                          {subcategory.crdfd_productname}
                        </p>
                        <p className="text-xs text-gray-500">
                          {subcategory.productCount || 0}
                        </p>
                      </button>
                    ))}
                    {/* View More Card - Only show if there are subcategories */}
                    <button
                      onClick={() => onCategorySelect(selectedCategory)}
                      className="bg-white border-2 border-dashed border-gray-300 p-3 rounded-lg hover:border-[#049DBF] transition-colors text-center"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl text-gray-400">+</span>
                      </div>
                      <p className="text-xs font-medium text-gray-600">Xem thêm</p>
                      <p className="text-xs text-gray-400">+1</p>
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FaBox className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium text-sm">Chọn danh mục</p>
                <p className="text-gray-500 text-xs">để xem sản phẩm</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Local styles */}
      <style jsx>{`
        /* Custom scrollbar for mobile */
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 2px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.5);
        }

        /* Touch optimization for mobile */
        @media (max-width: 768px) {
          .overflow-y-auto {
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileCategoryView;
