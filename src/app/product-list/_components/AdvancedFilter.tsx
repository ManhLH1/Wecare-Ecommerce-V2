
'use client';

import React, { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, Search } from 'lucide-react';


interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface AdvancedFilterProps {
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
  allProducts?: any[]; // Add all products data to calculate dynamic options
  filteredProductsCount?: number; // Add filtered products count
  onSearchProduct?: (term: string) => void; // quick search handler
}

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  filterOptions,
  selectedFilters,
  onFilterChange,
  onPriceChange,
  onClearFilters,
  allProducts = [],
  filteredProductsCount = 0,
  onSearchProduct,
}) => {
  const { priceRange } = filterOptions;
  const currentPrice = selectedFilters.priceRange || [priceRange.min, priceRange.max];

  // State for search terms in each filter section
  const [searchTerms, setSearchTerms] = useState<{[key: string]: string}>({
    thuongHieu: '',
    quyCach: '',
    hoanThien: '',
    chatLieu: '',
    donVi: '',
  });
  // Quick product search term
  const [quickSearch, setQuickSearch] = useState<string>("");

  // Helper function to update search term for a specific filter
  const updateSearchTerm = (filterType: string, term: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [filterType]: term
    }));
  };

  // Helper function to highlight search term in text
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">
          {part}
        </span>
      ) : part
    );
  };
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

  // Helper function to extract price from product
  const extractProductPrice = (product: any): number => {
    // First try to get price from cr1bb_json_gia array
    if (product.cr1bb_json_gia && Array.isArray(product.cr1bb_json_gia) && product.cr1bb_json_gia.length > 0) {
      // Find active price entry
      const activePrice = product.cr1bb_json_gia.find(
        (item: any) => 
          item.crdfd_trangthaihieulucname === "Còn hiệu lực" || 
          item.crdfd_trangthaihieuluc === 191920000
      );

      if (activePrice && activePrice.crdfd_gia) {
        return parseFloat(activePrice.crdfd_gia);
      }

      // If no active price found, take the first price
      if (product.cr1bb_json_gia[0] && product.cr1bb_json_gia[0].crdfd_gia) {
        return parseFloat(product.cr1bb_json_gia[0].crdfd_gia);
      }
    }

    // Fallback to other price fields
    if (product.crdfd_gia && product.crdfd_gia > 0) {
      return product.crdfd_gia;
    }

    if (product.crdfd_giatheovc && product.crdfd_giatheovc > 0) {
      return product.crdfd_giatheovc;
    }

    return 0; // Return 0 if no price found
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

  // Calculate dynamic filter options based on currently selected filters
  const calculateDynamicOptions = (targetFilterType: string) => {
    if (!allProducts.length) return filterOptions[targetFilterType as keyof typeof filterOptions] as FilterOption[];

    // Get all products that match currently selected filters (excluding the target filter type)
    const filteredProducts = allProducts.filter(product => {
      // Apply all filters except the target filter type
      const filtersToApply = Object.keys(selectedFilters).filter(key => 
        key !== targetFilterType && key !== 'priceRange' && selectedFilters[key].length > 0
      );

      // Check regular filters
      const regularFiltersMatch = filtersToApply.every(filterType => {
        const filterValues = selectedFilters[filterType];
        if (!filterValues || filterValues.length === 0) return true;

        const productValue = getProductFieldValue(product, filterType);
        return productValue && filterValues.includes(productValue.trim());
      });

      // Check price range filter if it's not the target filter type
      let priceFilterMatch = true;
      if (targetFilterType !== 'priceRange' && (currentPrice[0] !== priceRange.min || currentPrice[1] !== priceRange.max)) {
        const productPrice = extractProductPrice(product);
        priceFilterMatch = productPrice >= currentPrice[0] && productPrice <= currentPrice[1];
      }

      return regularFiltersMatch && priceFilterMatch;
    });

    // Count occurrences for the target filter type from filtered products
    const countMap = new Map<string, number>();
    filteredProducts.forEach(product => {
      const value = getProductFieldValue(product, targetFilterType);
      if (value && value.trim()) {
        const trimmedValue = value.trim();
        countMap.set(trimmedValue, (countMap.get(trimmedValue) || 0) + 1);
      }
    });

    // Convert to FilterOption array and sort by count
    return Array.from(countMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Helper function to get product field value based on filter type
  const getProductFieldValue = (product: any, filterType: string): string => {
    switch (filterType) {
      case 'thuongHieu': return product.crdfd_thuonghieu || '';
      case 'quyCach': return product.crdfd_quycach || '';
      case 'hoanThien': return product.crdfd_hoanthienbemat || '';
      case 'chatLieu': return product.crdfd_chatlieu || '';
      case 'donVi': return product.crdfd_onvichuantext || '';
      default: return '';
    }
  };

  // Memoized filtered options for each filter type
  const getFilteredOptions = useMemo(() => {
    const result: {[key: string]: FilterOption[]} = {};
    
    ['thuongHieu', 'quyCach', 'hoanThien', 'chatLieu', 'donVi'].forEach(filterType => {
      const dynamicOptions = allProducts.length > 0 ? calculateDynamicOptions(filterType) : filterOptions[filterType as keyof typeof filterOptions] as FilterOption[];
      const searchTerm = searchTerms[filterType] || '';
      
      if (!searchTerm) {
        result[filterType] = dynamicOptions;
      } else {
        result[filterType] = dynamicOptions.filter(option => 
          option.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    });
    
    return result;
  }, [allProducts, filterOptions, searchTerms, selectedFilters, currentPrice]);

  const renderFilterSection = (title: string, filterType: string, options: FilterOption[]) => {
    // Use dynamic options if we have product data, otherwise use static options
    const dynamicOptions = allProducts.length > 0 ? calculateDynamicOptions(filterType) : options;
    const hasActiveFilter = selectedFilters[filterType]?.length > 0;
    
    // Get filtered options from memoized data
    const searchTerm = searchTerms[filterType] || '';
    const filteredOptions = getFilteredOptions[filterType] || [];
    
    // Only show search input if there are more than 8 options
    const showSearchInput = dynamicOptions.length > 8;
    
    return (
      <AccordionItem value={title}>
        <AccordionTrigger className="text-base font-semibold">
          <div className="flex items-center">
            {title}
            {hasActiveFilter && (
              <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {selectedFilters[filterType].length}
              </span>
            )}
            {dynamicOptions.length > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({searchTerm ? `${filteredOptions.length}/` : ''}{dynamicOptions.length})
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            {/* Search Input */}
            {showSearchInput && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Tìm kiếm ${title.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => updateSearchTerm(filterType, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      updateSearchTerm(filterType, '');
                    }
                  }}
                  className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => updateSearchTerm(filterType, '')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Xóa tìm kiếm (ESC)"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            
            {/* Options List */}
            <div className="space-y-2">
              {/* Select All Search Results (if searching and has results) */}
              {searchTerm && filteredOptions.length > 1 && (
                <div className="pb-2 border-b border-gray-200">
                  <button
                    onClick={() => {
                      const currentValues = selectedFilters[filterType] || [];
                      const newOptions = filteredOptions.filter(option => !currentValues.includes(option.value));
                      if (newOptions.length > 0) {
                        const newValues = [...currentValues, ...newOptions.map(opt => opt.value)];
                        onFilterChange(filterType, newValues);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Chọn tất cả kết quả ({filteredOptions.length})
                  </button>
                </div>
              )}
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${filterType}-${option.value}`}
                        checked={selectedFilters[filterType]?.includes(option.value)}
                        onCheckedChange={(checked) => {
                          const currentValues = selectedFilters[filterType] || [];
                          const newValues = checked
                            ? [...currentValues, option.value]
                            : currentValues.filter((v: string) => v !== option.value);
                          onFilterChange(filterType, newValues);
                        }}
                      />
                      <label
                        htmlFor={`${filterType}-${option.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {highlightSearchTerm(option.label, searchTerm)} ({option.count})
                      </label>
                    </div>
                  ))
                ) : searchTerm ? (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    <div className="mb-2">🔍 Không tìm thấy &quot;{searchTerm}&quot;</div>
                    <button 
                      onClick={() => updateSearchTerm(filterType, '')}
                      className="text-blue-600 hover:text-blue-800 underline text-xs"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 py-2">
                    {hasActiveFilter 
                      ? "Không có options phù hợp với bộ lọc hiện tại" 
                      : "Không có dữ liệu"
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="w-full">
        <div className="mb-2">
          <h3 className="text-lg font-bold">Bộ lọc nâng cao</h3>
        </div>
        {/* Quick product search below heading */}
        <form
          className="mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            const term = quickSearch.trim();
            if (!term) return;
            if (onSearchProduct) {
              onSearchProduct(term);
            } else {
              // Default behavior: navigate to /san-pham with search param
              const encoded = encodeURIComponent(term);
              if (typeof window !== 'undefined') {
                // Use the new URL structure for search
                const toSlug = (str: string) =>
                  str
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/\p{Diacritic}/gu, "")
                    .replace(/[đĐ]/g, "d")
                    .replace(/[^a-z0-9\s]/g, "")
                    .replace(/\s+/g, "-");
                const slug = toSlug(term);
                window.location.href = `/san-pham/${slug}?search=${encoded}`;
              }
            }
          }}
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                name="adv-quick-search"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Tìm sản phẩm..."
                className="w-full h-9 pl-9 pr-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">Tìm</button>
            <button
              type="button"
              onClick={() => {
                setQuickSearch("");
                if (onSearchProduct) {
                  onSearchProduct("");
                } else if (typeof window !== 'undefined') {
                  // Clear search: chỉ xoá query, giữ nguyên path
                  const usp = new URLSearchParams(window.location.search);
                  usp.delete('search');
                  const newUrl = `${window.location.pathname}?${usp.toString()}`;
                  window.history.replaceState({}, '', newUrl);
                }
              }}
              className="h-9 px-3 rounded-md border text-sm hover:bg-gray-50"
            >
              Xóa
            </button>
          </div>
        </form>

        {/* Active Filters Tags */}
        {getActiveFilters().length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Bộ lọc đã chọn:</div>
            <div className="flex flex-wrap gap-2">
              {getActiveFilters().map((filter, index) => (
                <div
                  key={`${filter.type}-${filter.value}-${index}`}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm border border-blue-200"
                >
                  <span className="font-medium">{filter.displayName}:</span>
                  <span>{filter.displayValue}</span>
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
                    <X size={12} className="text-blue-600" />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 h-auto"
              >
                Xóa tất cả
              </Button>
            </div>
          </div>
        )}

        {/* Show filtered results count */}
        {getActiveFilters().length > 0 && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
            <div className="text-sm font-medium text-green-800">
              Tìm thấy {filteredProductsCount} sản phẩm phù hợp với {getActiveFilters().length} bộ lọc
            </div>
          </div>
        )}
        
        <Accordion type="multiple" defaultValue={['Thương hiệu', 'Khoảng giá']}>
            {renderFilterSection('Thương hiệu', 'thuongHieu', filterOptions.thuongHieu)}
            {renderFilterSection('Quy cách', 'quyCach', filterOptions.quyCach)}
            {renderFilterSection('Hoàn thiện', 'hoanThien', filterOptions.hoanThien)}
            {renderFilterSection('Chất liệu', 'chatLieu', filterOptions.chatLieu)}
            {renderFilterSection('Đơn vị', 'donVi', filterOptions.donVi)}

            <AccordionItem value="Khoảng giá">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center">
                    Khoảng giá
                    {(currentPrice[0] !== priceRange.min || currentPrice[1] !== priceRange.max) && (
                      <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        1
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="p-2">
                        <Slider
                            min={priceRange.min}
                            max={priceRange.max}
                            step={1000}
                            value={currentPrice}
                            onValueChange={onPriceChange}
                        />
                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                            <span>{currentPrice[0].toLocaleString()} VNĐ</span>
                            <span>{currentPrice[1].toLocaleString()} VNĐ</span>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        {/* <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onClearFilters}>Xóa bộ lọc</Button>
            <Button onClick={onApplyFilters}>Áp dụng</Button>
        </div> */}
    </div>
  );
};

export default AdvancedFilter;
