"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FaChevronDown, FaChevronRight, FaTimes } from "react-icons/fa";
import { useProductGroupHierarchy } from "@/hooks/useProductGroupHierarchy";

interface ProductGroup {
  crdfd_productgroupid: string;
  crdfd_productname: string;
  _crdfd_nhomsanphamcha_value: string | null;
  crdfd_nhomsanphamchatext: string | null;
  children?: ProductGroup[];
  productCount?: number;
}

interface CategorySidebarProps {
  currentSlug?: string;
  onCategorySelect?: (category: ProductGroup) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

// Hàm chuyển text thành slug
const textToSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "-"); // Replace spaces with hyphens
};

// Enhanced icon function
const getIcon = (groupName: string) => {
  const normalized = groupName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d");

  if (normalized.includes("may moc") || normalized.includes("maymoc"))
    return "⚙️";
  if (normalized.includes("thiet bi cong nghiep") || normalized.includes("thietbicongnghiep"))
    return "🏭";
  if (normalized.includes("thiet bi") && !normalized.includes("van chuyen") && !normalized.includes("bao ho"))
    return "🔧";
  if (normalized.includes("van chuyen") || normalized.includes("vanchuyen"))
    return "🚚";
  if (normalized.includes("bao ho") || normalized.includes("an toan") || normalized.includes("lao dong"))
    return "🛡️";
  if (normalized.includes("bao bi") || normalized.includes("dong goi"))
    return "📦";
  if (normalized.includes("phu tung") || normalized.includes("thay the"))
    return "🔧";
  if (normalized.includes("vat tu tieu hao") || normalized.includes("tieu hao"))
    return "♻️";
  if (normalized.includes("kim khi") || normalized.includes("phu kien"))
    return "📦";
  if (normalized.includes("cong cu") || normalized.includes("dung cu"))
    return "🔨";
  if (normalized.includes("hoa chat") || normalized.includes("hoachat"))
    return "🧪";
  if (normalized.includes("dien") || normalized.includes("dien tu"))
    return "⚡";
  if (normalized.includes("nha may") || normalized.includes("xuong"))
    return "🏭";
  if (normalized.includes("luu kho") || normalized.includes("kho hang"))
    return "🚚";

  return "📋";
};

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  currentSlug,
  onCategorySelect,
  isMobile = false,
  isOpen = false,
  onClose,
}) => {
  const router = useRouter();
  const { hierarchy, loading, error } = useProductGroupHierarchy();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Tìm category hiện tại dựa trên slug
  useEffect(() => {
    if (currentSlug && hierarchy.length > 0) {
      const findCategoryBySlug = (categories: ProductGroup[]): ProductGroup | null => {
        for (const cat of categories) {
          if (textToSlug(cat.crdfd_productname) === currentSlug) {
            return cat;
          }
          if (cat.children && cat.children.length > 0) {
            const found = findCategoryBySlug(cat.children);
            if (found) return found;
          }
        }
        return null;
      };

      const foundCategory = findCategoryBySlug(hierarchy);
      if (foundCategory) {
        setSelectedCategoryId(foundCategory.crdfd_productgroupid);
        // Mở rộng tất cả parent categories
        const expandParents = (categories: ProductGroup[], targetId: string, parents: string[] = []): string[] => {
          for (const cat of categories) {
            if (cat.crdfd_productgroupid === targetId) {
              return parents;
            }
            if (cat.children && cat.children.length > 0) {
              const found = expandParents(cat.children, targetId, [...parents, cat.crdfd_productgroupid]);
              if (found.length > 0) return found;
            }
          }
          return [];
        };
        const parentsToExpand = expandParents(hierarchy, foundCategory.crdfd_productgroupid);
        setExpandedCategories(new Set(parentsToExpand));
      }
    }
  }, [currentSlug, hierarchy]);

  // Toggle mở rộng category
  const toggleExpand = useCallback((categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Xử lý click vào category
  const handleCategoryClick = useCallback((category: ProductGroup) => {
    setSelectedCategoryId(category.crdfd_productgroupid);
    
    if (onCategorySelect) {
      onCategorySelect(category);
    }
    
    // Close mobile drawer
    if (isMobile && onClose) {
      onClose();
    }
    
    // Navigate to category page
    const slug = textToSlug(category.crdfd_productname);
    router.push(`/san-pham/${slug}`);
  }, [router, onCategorySelect, isMobile, onClose]);

  // Render category item với children
  const renderCategoryItem = useCallback((category: ProductGroup, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.crdfd_productgroupid);
    const isSelected = selectedCategoryId === category.crdfd_productgroupid;
    const paddingLeft = 12 + level * 16;

    return (
      <div key={category.crdfd_productgroupid} className="w-full">
        <div
          className={`flex items-center justify-between cursor-pointer py-2.5 px-3 rounded-lg transition-all duration-200 group ${
            isSelected
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-md"
              : "hover:bg-gray-50 text-gray-700 hover:shadow-sm"
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => handleCategoryClick(category)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {level === 0 && (
              <span className={`text-lg flex-shrink-0 ${isSelected ? 'opacity-100' : 'opacity-80'}`}>
                {getIcon(category.crdfd_productname)}
              </span>
            )}
            <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-700 group-hover:text-cyan-600'}`}>
              {category.crdfd_productname}
            </span>
            {category.productCount !== undefined && category.productCount > 0 && (
              <span className={`text-xs flex-shrink-0 ${isSelected ? 'text-cyan-100' : 'text-gray-400'}`}>
                ({category.productCount})
              </span>
            )}
          </div>
          {hasChildren && (
            <button
              onClick={(e) => toggleExpand(category.crdfd_productgroupid, e)}
              className={`p-1 rounded transition-transform duration-200 flex-shrink-0 ${
                isSelected ? 'text-white hover:bg-white/20' : 'text-gray-400 hover:text-cyan-500 hover:bg-gray-100'
              }`}
            >
              {isExpanded ? (
                <FaChevronDown className="w-3 h-3" />
              ) : (
                <FaChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1 border-l-2 border-gray-100 ml-4">
            {category.children!.map((child) => renderCategoryItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedCategories, selectedCategoryId, handleCategoryClick, toggleExpand]);

  // Filter categories có sản phẩm
  const filteredHierarchy = useMemo(() => {
    const filterCategories = (categories: ProductGroup[]): ProductGroup[] => {
      return categories
        .filter((cat) => cat.productCount === undefined || cat.productCount > 0)
        .map((cat) => ({
          ...cat,
          children: cat.children ? filterCategories(cat.children) : undefined,
        }));
    };
    return filterCategories(hierarchy);
  }, [hierarchy]);

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p className="text-red-500 text-sm">Không thể tải danh mục</p>
      </div>
    );
  }

  // Content của sidebar
  const sidebarContent = (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-semibold text-base flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Danh mục sản phẩm
        </h3>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Category List */}
      <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          // Loading skeleton
          <div className="space-y-2">
            {[...Array(8)].map((_, idx) => (
              <div key={idx} className="animate-pulse flex items-center px-3 py-2.5">
                <div className="w-6 h-6 bg-gray-200 rounded mr-3"></div>
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredHierarchy.map((category) => renderCategoryItem(category))}
          </div>
        )}
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </>
  );

  // Mobile drawer mode
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={onClose}
        />
        
        {/* Drawer */}
        <div
          className={`fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop sticky sidebar mode
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
      {sidebarContent}
    </div>
  );
};

export default CategorySidebar;
