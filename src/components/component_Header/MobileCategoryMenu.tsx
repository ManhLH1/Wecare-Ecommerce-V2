import React, { useState, useCallback, useEffect } from "react";
import { FaTimes, FaChevronRight, FaChevronDown, FaSpinner, FaBox, FaHome } from "react-icons/fa";

interface MobileCategoryMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categoryHierarchy: any;
  categoryGroups: any[];
  loadingCategory: boolean;
  onCategorySelect: (item: any) => void;
}

const MobileCategoryMenu: React.FC<MobileCategoryMenuProps> = ({
  isOpen,
  onClose,
  categoryHierarchy,
  categoryGroups,
  loadingCategory,
  onCategorySelect,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Reset expanded categories when menu closes
  useEffect(() => {
    if (!isOpen) {
      setExpandedCategories(new Set());
    }
  }, [isOpen]);

  // Get subcategories for a category
  const getSubCategories = useCallback((categoryId: string, level: number = 1) => {
    if (!categoryHierarchy) return [];
    
    // Try hierarchy first (supports 3 levels)
    if (categoryHierarchy.hierarchy) {
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
      if (category && category.children) {
        return category.children.filter((child: any) => (child.productCount || 0) > 0);
      }
    }
    
    // Fallback: use byLevel
    if (categoryHierarchy.byLevel?.[level]) {
      return categoryHierarchy.byLevel[level].filter(
        (child: any) => 
          child._crdfd_nhomsanphamcha_value === categoryId && 
          (child.productCount || 0) > 0
      );
    }
    
    return [];
  }, [categoryHierarchy]);

  // Toggle expand/collapse
  const toggleExpand = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const renderCategoryItem = useCallback((item: any, level: number = 0) => {
    const subCategories = getSubCategories(item.crdfd_productgroupid, level + 1);
    const hasChildren = subCategories.length > 0;
    const isExpanded = expandedCategories.has(item.crdfd_productgroupid);

    return (
      <div 
        key={item.crdfd_productgroupid} 
        className="border-b border-gray-100"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              // Toggle expand/collapse - DON'T close menu
              toggleExpand(item.crdfd_productgroupid);
            } else {
              // No children, select but DON'T close menu (only X button closes)
              onCategorySelect(item);
            }
          }}
          className="flex items-center justify-between w-full p-3 sm:p-4 text-left active:bg-amber-50 transition-colors touch-manipulation"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {item.crdfd_image_url ? (
              <img
                src={item.crdfd_image_url}
                alt={item.crdfd_productname}
                className="w-8 h-8 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                <FaBox className="w-4 h-4 text-amber-600" />
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <span className="text-gray-800 font-medium block truncate">{item.crdfd_productname}</span>
              {item.productCount !== undefined && (
                <span className="text-xs text-gray-500">({item.productCount} sản phẩm)</span>
              )}
            </div>
          </div>
          {hasChildren && (
            <div className="flex-shrink-0 ml-2">
              {isExpanded ? (
                <FaChevronDown className="w-4 h-4 text-amber-500" />
              ) : (
                <FaChevronRight className="w-4 h-4 text-amber-400" />
              )}
            </div>
          )}
        </button>
        
        {/* Subcategories - Show when expanded */}
        {hasChildren && isExpanded && (
          <div className="bg-gray-50 pl-4">
            {/* Option to select parent category */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCategorySelect(item);
                // DON'T close menu - only X button closes
              }}
              className="flex items-center gap-3 w-full p-3 text-left active:bg-amber-100 transition-colors touch-manipulation text-sm text-gray-700"
            >
              <div className="w-6 h-6 rounded bg-amber-200 flex items-center justify-center flex-shrink-0">
                <FaBox className="w-3 h-3 text-amber-600" />
              </div>
              <span className="font-medium">Tất cả {item.crdfd_productname}</span>
            </button>
            
            {/* Subcategory items */}
            {subCategories.map((subItem: any) => (
              <div 
                key={subItem.crdfd_productgroupid} 
                className="border-t border-gray-200"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCategorySelect(subItem);
                    // DON'T close menu - only X button closes
                  }}
                  className="flex items-center gap-3 w-full p-3 text-left active:bg-amber-100 transition-colors touch-manipulation"
                >
                  <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <FaBox className="w-3 h-3 text-amber-500" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-gray-700 text-sm block truncate">{subItem.crdfd_productname}</span>
                    {subItem.productCount !== undefined && (
                      <span className="text-xs text-gray-500">({subItem.productCount} sản phẩm)</span>
                    )}
                  </div>
                </button>
                
                {/* Level 3 subcategories if any */}
                {(() => {
                  const level3Items = getSubCategories(subItem.crdfd_productgroupid, 3);
                  const isLevel3Expanded = expandedCategories.has(subItem.crdfd_productgroupid);
                  
                  if (level3Items.length === 0) return null;
                  
                  return (
                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(subItem.crdfd_productgroupid);
                        }}
                        className="flex items-center gap-2 w-full pl-8 pr-3 py-2 text-left active:bg-amber-100 transition-colors touch-manipulation text-xs text-gray-600"
                      >
                        {isLevel3Expanded ? (
                          <FaChevronDown className="w-3 h-3 text-amber-500" />
                        ) : (
                          <FaChevronRight className="w-3 h-3 text-amber-400" />
                        )}
                        <span>Xem thêm ({level3Items.length})</span>
                      </button>
                      
                      {isLevel3Expanded && (
                        <div className="bg-white pl-8">
                          {level3Items.map((level3Item: any) => (
                            <button
                              key={level3Item.crdfd_productgroupid}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCategorySelect(level3Item);
                                // DON'T close menu - only X button closes
                              }}
                              className="flex items-center gap-2 w-full p-2 text-left active:bg-amber-50 transition-colors touch-manipulation text-xs text-gray-600 border-t border-gray-100"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0"></span>
                              <span className="truncate">{level3Item.crdfd_productname}</span>
                              {level3Item.productCount && (
                                <span className="text-gray-400 text-[10px]">({level3Item.productCount})</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [expandedCategories, getSubCategories, toggleExpand, onCategorySelect, onClose]);

  return (
    <>
      {/* Enhanced Backdrop - Full screen overlay - No click to close, only visual */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[55] animate-fadeIn"
        />
      )}

      {/* Enhanced Category Menu - Full Screen on Mobile */}
      <div 
        className={`fixed top-0 left-0 h-full w-full bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        onClick={(e) => {
          // CRITICAL: Stop all clicks inside menu from bubbling to backdrop
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          // Also stop touch events
          e.stopPropagation();
        }}
      >
        {/* Enhanced Header */}
        <div 
          className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex-shrink-0 safe-area-top"
        >
          <h2 className="text-lg sm:text-xl font-bold text-white">Danh mục sản phẩm</h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2.5 sm:p-3 rounded-full bg-white/20 active:bg-white/30 backdrop-blur-sm transition-all duration-200 text-white active:scale-95 touch-manipulation"
            aria-label="Đóng menu"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Enhanced Content - Scrollable với safe area bottom */}
        <div 
          className="flex-1 overflow-y-auto min-h-0 safe-area-bottom" 
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {loadingCategory ? (
            <div className="flex items-center justify-center p-8">
              <FaSpinner className="w-6 h-6 text-amber-500 animate-spin" />
              <span className="ml-3 text-gray-600 font-medium">Đang tải danh mục...</span>
            </div>
          ) : categoryGroups && categoryGroups.length > 0 ? (
            <div className="p-3 sm:p-4">
              {/* All Products Option */}
              <div className="border-b border-gray-200 mb-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCategorySelect({ crdfd_productgroupid: 'all', crdfd_productname: 'Tất cả sản phẩm' });
                    // DON'T close menu - only X button closes
                  }}
                  className="flex items-center justify-between w-full p-3 sm:p-4 text-left active:bg-amber-50 transition-colors rounded-lg touch-manipulation"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <FaHome className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-gray-800 font-semibold text-base">Tất cả sản phẩm</span>
                  </div>
                </button>
              </div>

              {/* Category Items */}
              <div className="space-y-1">
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg active:bg-amber-600 transition-colors touch-manipulation"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Local styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

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
    </>
  );
};

export default MobileCategoryMenu;
