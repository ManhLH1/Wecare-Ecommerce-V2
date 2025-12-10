import React, { useState, useEffect } from "react";
import { formatPrice } from "@/utils/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateProductUrl } from "@/utils/urlGenerator";
import { useProductGroupHierarchy } from "@/hooks/useProductGroupHierarchy";

interface Product {
  crdfd_productsid: string;
  crdfd_name: string;
  crdfd_fullname: string;
  crdfd_masanpham: string;
  cr1bb_giaban: string;
  cr1bb_imageurlproduct: string | null;
  cr1bb_imageurl: string | null;
  crdfd_manhomsp: string;
  crdfd_quycach: string;
  crdfd_chatlieu: string | null;
  crdfd_hoanthienbemat: string;
  cr1bb_nhomsanphamcha: string;
  cr1bb_json_gia: any[];
  crdfd_gtgt: number;
  _crdfd_productgroup_value: string;
  crdfd_thuonghieu: string | null;
  crdfd_nhomsanphamtext: string;
}

interface ProductGroup {
  products: Product[];
  count: number;
  priceRange: {
    min: number;
    max: number;
  };
}

interface ProductListByGroupProps {
  data: Record<string, ProductGroup>;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalGroups: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  onPageChange?: (page: number) => void;
  showPrices?: boolean;
  onProductClick?: (product: Product) => void;
  isRelatedProducts?: boolean; // Thêm prop mới cho sản phẩm liên quan
}

const ProductListByGroup: React.FC<ProductListByGroupProps> = ({
  data,
  pagination,
  onPageChange,
  showPrices = true,
  onProductClick,
  isRelatedProducts = false // Mặc định false
}) => {
  const router = useRouter();
  const { hierarchy } = useProductGroupHierarchy();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Tự động mở rộng nhóm nếu là sản phẩm liên quan
  useEffect(() => {
    if (isRelatedProducts) {
      const autoExpandGroups = Object.keys(data).reduce((acc, groupName) => {
        acc[groupName] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setExpandedGroups(autoExpandGroups);
    }
  }, [data, isRelatedProducts]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Helper to extract price from the cr1bb_giaban string or use price from json_gia
  const extractPrice = (product: Product): string => {
    if (!showPrices) return "Liên hệ CSKH";

    // Try to get price from json_gia first
    if (product.cr1bb_json_gia && product.cr1bb_json_gia.length > 0) {
      const priceInfo = product.cr1bb_json_gia[0];
      if (priceInfo.crdfd_gia) {
        return `${parseInt(priceInfo.crdfd_gia).toLocaleString()} đ/${priceInfo.crdfd_onvichuantext || ''}`;
      }
    }

    // Fallback to extracting from cr1bb_giaban string
    if (product.cr1bb_giaban) {
      const priceMatch = product.cr1bb_giaban.match(/(\d+)/);
      if (priceMatch) {
        return `${parseInt(priceMatch[0]).toLocaleString()} đ`;
      }
    }

    return "Liên hệ để được báo giá";
  };

  const handleProductClick = (product: Product) => {
    if (onProductClick) {
      onProductClick(product);
    } else {
      // Lưu thông tin sản phẩm vào localStorage và chuyển hướng
      localStorage.setItem("productDetail", JSON.stringify(product));
      
      // Generate new SEO-friendly URL with hierarchy
      const newUrl = generateProductUrl(product, hierarchy);
      router.push(newUrl);
    }
  };

  const handleNavigatePage = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  return (
    <div className="w-full">
      {/* Group listings */}
      {Object.entries(data).map(([groupName, groupData]) => (
        <div key={groupName} className={`mb-6 border border-gray-200 rounded-lg overflow-hidden shadow-sm ${isRelatedProducts ? 'bg-white' : ''}`}>
          {/* Group header - Ẩn nếu là sản phẩm liên quan */}
          {!isRelatedProducts && (
            <div 
              className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
              onClick={() => toggleGroup(groupName)}
            >
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-800">{groupName}</h2>
                <span className="ml-2 text-sm text-gray-500">({groupData.count} sản phẩm)</span>
              </div>
              <div className="flex items-center">
                {showPrices && groupData.priceRange.min > 0 && (
                  <div className="mr-4 text-sm">
                    <span className="text-gray-600">Giá: </span>
                    <span className="font-medium">
                      {formatPrice(groupData.priceRange.min)}
                      {groupData.priceRange.max > groupData.priceRange.min && 
                        ` - ${formatPrice(groupData.priceRange.max)}`}
                    </span>
                  </div>
                )}
                <button 
                  className="text-blue-600 hover:text-blue-800"
                  aria-label={expandedGroups[groupName] ? "Thu gọn" : "Mở rộng"}
                >
                  {expandedGroups[groupName] ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Product grid - Luôn hiển thị nếu là sản phẩm liên quan */}
          {(expandedGroups[groupName] || isRelatedProducts) && (
            <div className={`${isRelatedProducts ? 'p-0' : 'p-4'} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`}>
              {groupData.products.map((product) => (
                <div 
                  key={product.crdfd_productsid}
                  className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer ${isRelatedProducts ? 'hover:border-blue-300 hover:scale-105' : 'hover:shadow-md'}`}
                  onClick={() => handleProductClick(product)}
                >
                  {/* Product image */}
                  <div className="relative w-full pt-[100%] bg-gray-50">
                    {(() => {
                      const imageUrl = product.cr1bb_imageurlproduct || product.cr1bb_imageurl;
                      
                      if (!imageUrl) {
                        return (
                          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-gray-400">Không có hình ảnh</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <img
                          src={imageUrl}
                          alt={product.crdfd_name}
                          className="absolute top-0 left-0 w-full h-full object-contain p-2"
                          onError={(e) => {
                            const imgElement = e.target as HTMLImageElement;
                            imgElement.src = '/images/no-image.png';
                          }}
                        />
                      );
                    })()}
                  </div>

                  {/* Product details */}
                  <div className="p-3">
                    <h3 className={`font-medium text-gray-800 line-clamp-2 mb-1 ${isRelatedProducts ? 'text-sm' : 'text-sm'}`} title={product.crdfd_fullname}>
                      {product.crdfd_fullname}
                    </h3>
                    
                    {/* Chỉ hiển thị thông tin chi tiết nếu không phải sản phẩm liên quan */}
                    {!isRelatedProducts && (
                      <div className="flex flex-col text-xs space-y-1 mt-2">
                        {product.crdfd_quycach && (
                          <div className="flex">
                            <span className="text-gray-500 min-w-[70px]">Quy cách:</span>
                            <span>{product.crdfd_quycach}</span>
                          </div>
                        )}
                        {product.crdfd_chatlieu && (
                          <div className="flex">
                            <span className="text-gray-500 min-w-[70px]">Chất liệu:</span>
                            <span>{product.crdfd_chatlieu}</span>
                          </div>
                        )}
                        {product.crdfd_thuonghieu && (
                          <div className="flex">
                            <span className="text-gray-500 min-w-[70px]">Thương hiệu:</span>
                            <span>{product.crdfd_thuonghieu}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {showPrices && (
                      <div className="mt-2">
                        <p className={`font-semibold text-blue-600 ${isRelatedProducts ? 'text-sm' : 'text-sm'}`}>{extractPrice(product)}</p>
                      </div>
                    )}
                    
                    <div className="mt-3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Pagination - Chỉ hiển thị nếu không phải sản phẩm liên quan */}
      {!isRelatedProducts && pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <nav className="flex items-center">
            <button
              onClick={() => handleNavigatePage(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className={`mx-1 px-3 py-1 rounded-md ${
                pagination.hasPrevPage 
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Trước
            </button>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show current page and adjacent pages
                return (
                  page === 1 || 
                  page === pagination.totalPages || 
                  Math.abs(page - pagination.currentPage) <= 1
                );
              })
              .map((page, index, array) => {
                // Add ellipsis when there are gaps
                const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsisBefore && (
                      <span className="mx-1 px-3 py-1 text-gray-500">...</span>
                    )}
                    
                    <button
                      onClick={() => handleNavigatePage(page)}
                      className={`mx-1 px-3 py-1 rounded-md ${
                        pagination.currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      }`}
                    >
                      {page}
                    </button>
                    
                    {showEllipsisAfter && (
                      <span className="mx-1 px-3 py-1 text-gray-500">...</span>
                    )}
                  </React.Fragment>
                );
              })}
            
            <button
              onClick={() => handleNavigatePage(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className={`mx-1 px-3 py-1 rounded-md ${
                pagination.hasNextPage 
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Tiếp
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default ProductListByGroup; 