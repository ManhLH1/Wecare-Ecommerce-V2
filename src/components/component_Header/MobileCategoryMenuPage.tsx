import React from "react";
import { FaTimes, FaChevronRight, FaSpinner, FaBox, FaHome } from "react-icons/fa";

interface MobileCategoryMenuPageProps {
  categoryHierarchy: any;
  categoryGroups: any[];
  loadingCategory: boolean;
  onCategorySelect: (item: any) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const MobileCategoryMenuPage: React.FC<MobileCategoryMenuPageProps> = ({
  categoryHierarchy,
  categoryGroups,
  loadingCategory,
  onCategorySelect,
  onClose,
  showCloseButton = false,
}) => {
  // Debug info

  const renderCategoryItem = (item: any, level: number = 0) => {
    const hasChildren = categoryHierarchy?.byLevel?.[level + 1]?.some(
      (child: any) => child._crdfd_nhomsanphamcha_value === item.crdfd_productgroupid
    );

    return (
      <div key={item.crdfd_productgroupid} className="border-b border-gray-100">
        <button
          onClick={() => {
            onCategorySelect(item);
          }}
          className="flex items-center justify-between w-full p-4 text-left hover:bg-teal-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {item.crdfd_image_url ? (
              <img
                src={item.crdfd_image_url}
                alt={item.crdfd_productname}
                className="w-8 h-8 rounded object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-teal-100 flex items-center justify-center">
                <FaBox className="w-4 h-4 text-teal-600" />
              </div>
            )}
            <div className="flex-1 text-left">
              <span className="text-gray-800 font-medium block">{item.crdfd_productname}</span>
              {item.productCount !== undefined && (
                <span className="text-xs text-gray-500">({item.productCount} sản phẩm)</span>
              )}
            </div>
          </div>
          {hasChildren && <FaChevronRight className="w-4 h-4 text-teal-400" />}
        </button>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 flex-shrink-0">
        <h2 className="text-xl font-bold text-white">Danh mục sản phẩm</h2>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 text-white hover:scale-110"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loadingCategory ? (
          <div className="flex items-center justify-center p-8">
            <FaSpinner className="w-6 h-6 text-teal-500 animate-spin" />
            <span className="ml-3 text-gray-600 font-medium">Đang tải danh mục...</span>
          </div>
        ) : categoryGroups && categoryGroups.length > 0 ? (
          <div className="p-4">
            {/* All Products Option */}
            <div className="border-b border-gray-100 mb-4">
              <button
                onClick={() => {
                  onCategorySelect({ crdfd_productgroupid: 'all', crdfd_productname: 'Tất cả sản phẩm' });
                }}
                className="flex items-center justify-between w-full p-4 text-left hover:bg-teal-50 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <FaHome className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-gray-800 font-semibold text-base">Tất cả sản phẩm</span>
                </div>
              </button>
            </div>

            {/* Category Items */}
            <div className="space-y-2">
              {categoryGroups.map((item) => renderCategoryItem(item, 0))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaBox className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-2">Không có danh mục nào</p>
              <p className="text-gray-500 text-sm mb-4">Vui lòng thử lại sau</p>
              <div className="text-xs text-gray-400 mb-4">
                Debug: {categoryGroups?.length || 0} items, Loading: {loadingCategory ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Local styles */}
      <style jsx>{`
        /* Custom scrollbar for mobile */
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.5);
        }

        /* Ensure content is scrollable */
        .min-h-0 {
          min-height: 0;
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

export default MobileCategoryMenuPage;
