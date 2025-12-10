'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface MobileFilterTagsProps {
  filterOptions: {
    thuongHieu: FilterOption[];
    quyCach: FilterOption[];
    hoanThien: FilterOption[];
    chatLieu: FilterOption[];
    donVi: FilterOption[];
    priceRange: { min: number; max: number };
  };
  selectedFilters: any;
  onFilterChange: (filterType: string, value: any) => void;
  onPriceChange: (value: number[]) => void;
  onClearFilters: () => void;
  filteredProductsCount?: number;
}

const MobileFilterTags: React.FC<MobileFilterTagsProps> = ({
  filterOptions,
  selectedFilters,
  onFilterChange,
  onPriceChange,
  onClearFilters,
  filteredProductsCount = 0,
}) => {
  const { priceRange } = filterOptions;
  const currentPrice = selectedFilters.priceRange || [priceRange.min, priceRange.max];

//   // Helper function to extract price from product (same logic as AdvancedFilter)
//   const extractProductPrice = (product: any): number => {
//     // First try to get price from cr1bb_json_gia array
//     if (product.cr1bb_json_gia && Array.isArray(product.cr1bb_json_gia) && product.cr1bb_json_gia.length > 0) {
//       // Find active price entry
//       const activePrice = product.cr1bb_json_gia.find(
//         (item: any) => 
//           item.crdfd_trangthaihieulucname === "Còn hiệu lực" || 
//           item.crdfd_trangthaihieuluc === 191920000
//       );

//       if (activePrice && activePrice.crdfd_gia) {
//         return parseFloat(activePrice.crdfd_gia);
//       }

//       // If no active price found, take the first price
//       if (product.cr1bb_json_gia[0] && product.cr1bb_json_gia[0].crdfd_gia) {
//         return parseFloat(product.cr1bb_json_gia[0].crdfd_gia);
//       }
//     }

//     // Fallback to other price fields
//     if (product.crdfd_gia && product.crdfd_gia > 0) {
//       return product.crdfd_gia;
//     }

//     if (product.crdfd_giatheovc && product.crdfd_giatheovc > 0) {
//       return product.crdfd_giatheovc;
//     }

//     return 0; // Return 0 if no price found
//   };

  // Helper function to get filter display name
  const getFilterDisplayName = (filterType: string): string => {
    switch (filterType) {
      case 'thuongHieu': return 'Thương hiệu';
      case 'quyCach': return 'Quy cách';
      case 'hoanThien': return 'Hoàn thiện';
      case 'chatLieu': return 'Chất liệu';
      case 'donVi': return 'Đơn vị';
      default: return filterType;
    }
  };

  // Helper function to remove a specific filter value
  const removeFilterValue = (filterType: string, valueToRemove: string) => {
    const currentValues = selectedFilters[filterType] || [];
    const newValues = currentValues.filter((value: string) => value !== valueToRemove);
    onFilterChange(filterType, newValues);
  };

  // Helper function to clear price filter
  const clearPriceFilter = () => {
    onPriceChange([priceRange.min, priceRange.max]);
  };

  // Get all active filters for display
  const getActiveFilters = () => {
    const activeFilters: Array<{
      type: string;
      displayName: string;
      value: string;
      displayValue: string;
    }> = [];

    // Add regular filters
    Object.keys(selectedFilters).forEach(filterType => {
      if (filterType !== 'priceRange' && selectedFilters[filterType]?.length > 0) {
        selectedFilters[filterType].forEach((value: string) => {
          activeFilters.push({
            type: filterType,
            displayName: getFilterDisplayName(filterType),
            value: value,
            displayValue: value
          });
        });
      }
    });

    // Add price range filter if it's not the default
    if (currentPrice[0] !== priceRange.min || currentPrice[1] !== priceRange.max) {
      activeFilters.push({
        type: 'priceRange',
        displayName: 'Khoảng giá',
        value: 'priceRange',
        displayValue: `${currentPrice[0].toLocaleString()} - ${currentPrice[1].toLocaleString()} VNĐ`
      });
    }

    return activeFilters;
  };

  const activeFilters = getActiveFilters();

  // Don't render anything if no filters are active
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="lg:hidden w-full bg-white p-3 rounded-lg shadow-sm border mb-4">
      {/* Active Filters Tags */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-700">
            Bộ lọc đã chọn ({activeFilters.length})
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 h-auto"
          >
            Xóa tất cả
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <div
              key={`${filter.type}-${filter.value}-${index}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs border border-blue-200"
            >
              <span className="font-medium">{filter.displayName}:</span>
              <span className="max-w-20 truncate">{filter.displayValue}</span>
              <button
                onClick={() => {
                  if (filter.type === 'priceRange') {
                    clearPriceFilter();
                  } else {
                    removeFilterValue(filter.type, filter.value);
                  }
                }}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                aria-label={`Xóa bộ lọc ${filter.displayName}: ${filter.displayValue}`}
              >
                <X size={10} className="text-blue-600" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Show filtered results count */}
      {filteredProductsCount > 0 && (
        <div className="p-2 bg-green-50 rounded border-l-4 border-green-500">
          <div className="text-xs font-medium text-green-800">
            Tìm thấy {filteredProductsCount} sản phẩm phù hợp
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileFilterTags;
