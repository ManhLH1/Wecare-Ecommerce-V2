import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatPrice } from '@/utils/format';
import { Eye } from "lucide-react";
import { generateProductUrl } from '@/utils/urlGenerator';
import { useProductGroupHierarchy } from '@/hooks/useProductGroupHierarchy';

interface RelatedProduct {
  crdfd_productsid: string;
  crdfd_name: string;
  crdfd_fullname: string;
  crdfd_masanpham: string;
  cr1bb_giaban: string;
  crdfd_giatheovc: string;
  cr1bb_imageurlproduct: string | null;
  cr1bb_imageurl: string | null;
  crdfd_quycach: string;
  crdfd_chatlieu: string | null;
  crdfd_thuonghieu: string | null;
}

interface RelatedProductsSectionProps {
  products: RelatedProduct[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  currentProductName: string;
}

const RelatedProductsSection: React.FC<RelatedProductsSectionProps> = ({
  products,
  isLoading,
  error,
  onRetry,
  currentProductName
}) => {
  const router = useRouter();
  const { hierarchy } = useProductGroupHierarchy();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleProductClick = (product: RelatedProduct) => {
    localStorage.setItem("productDetail", JSON.stringify(product));
    
    // Generate new SEO-friendly URL with hierarchy
    const newUrl = generateProductUrl(product, hierarchy);
    router.push(newUrl);
  };

  const extractPrice = (product: RelatedProduct): string => {
    // Ưu tiên cr1bb_giaban trước, sau đó mới đến crdfd_giatheovc
    const price = product.cr1bb_giaban || product.crdfd_giatheovc;
    
    // Kiểm tra nếu không có giá hoặc giá bằng 0
    if (!price || price === "0" || price === "" || price === "null" || price === "undefined") {
      return "Liên hệ chăm sóc khách hàng";
    }
    
    const numPrice = parseFloat(price);
    return isNaN(numPrice) || numPrice === 0
      ? "Liên hệ chăm sóc khách hàng"
      : `${Math.round(numPrice).toLocaleString()} đ`;
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8 mb-8 px-2">
        <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Sản phẩm liên quan
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Đang tải sản phẩm liên quan...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8 mb-8 px-2">
        <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Sản phẩm liên quan
        </h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Lỗi tải dữ liệu</span>
          </div>
          <p className="text-sm text-red-500">{error}</p>
          <button 
            onClick={onRetry}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8 mb-8 px-2">
        <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Sản phẩm liên quan
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span className="font-medium">Không có sản phẩm liên quan</span>
          </div>
          <p className="text-sm text-gray-400">Hiện tại không có sản phẩm nào cùng nhóm với &quot;{currentProductName}&quot;</p>
        </div>
      </div>
    );
  }

  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };
  return (
    <div className="w-full mt-8 mb-8 px-0 overflow-x-hidden relative">
      <h2 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2 tracking-tight">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Sản phẩm liên quan <span className="ml-1 text-sm font-medium text-gray-400">({products.length})</span>
      </h2>
      {/* Nút scroll trái/phải - chỉ hiện trên md trở lên */}
      <button
        type="button"
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-blue-100 border border-blue-200 rounded-full shadow-lg p-2 transition disabled:opacity-30"
        style={{ transform: 'translateY(-50%)' }}
        onClick={() => scrollBy(-320)}
        aria-label="Scroll left"
      >
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button
        type="button"
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-blue-100 border border-blue-200 rounded-full shadow-lg p-2 transition disabled:opacity-30"
        style={{ transform: 'translateY(-50%)' }}
        onClick={() => scrollBy(320)}
        aria-label="Scroll right"
      >
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
      {/* Scroll ngang */}
      <div ref={scrollRef} className="w-full flex gap-2 md:gap-3 overflow-x-auto pb-3 hide-scrollbar px-1 md:px-6 scroll-smooth snap-x snap-mandatory">
        {products.map((product) => (
          <div 
            key={product.crdfd_productsid}
            className="shrink-0 min-w-[140px] max-w-[70vw] sm:min-w-[160px] md:min-w-[180px] lg:min-w-[200px] bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex flex-col group cursor-pointer relative overflow-hidden snap-start"
            onClick={() => handleProductClick(product)}
          >
            {/* Product image */}
            <div className="relative w-full h-24 bg-white rounded-t-xl overflow-hidden flex items-center justify-center">
              {(() => {
                const imageUrl = product.cr1bb_imageurlproduct || product.cr1bb_imageurl;
                if (!imageUrl) {
                  return (
                    <img
                      src="/images/no-image.png"
                      alt={product.crdfd_name}
                      className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                    />
                  );
                }
                return (
                  <img
                    src={imageUrl}
                    alt={product.crdfd_name}
                    className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = "/images/no-image.png";
                    }}
                  />
                );
              })()}
              
            </div>
            {/* Product details */}
            <div className="flex-1 flex flex-col p-2 gap-0.5">
              <h3 className="text-xs font-bold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors mb-1" title={product.crdfd_fullname}>
                {product.crdfd_fullname}
              </h3>
              <div className="flex items-center gap-1 text-[9px] text-gray-500 mb-1">
                {product.crdfd_quycach && <span className="flex items-center gap-0.5"><svg className="w-2 h-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2" /></svg>{product.crdfd_quycach}</span>}
              </div>
              <div className="text-xs font-bold text-blue-600 mb-1">
                {extractPrice(product)}
              </div>
              <button 
                className="w-full flex items-center justify-center gap-1 px-1 py-1 rounded-md border border-gray-200 bg-white text-gray-700 font-medium text-[9px] transition-all hover:border-blue-400 hover:text-blue-600"
                onClick={e => { 
                  e.stopPropagation(); 
                  localStorage.setItem("productDetail", JSON.stringify(product));
                  
                  // Generate new SEO-friendly URL with hierarchy
                  const newUrl = generateProductUrl(product, hierarchy);
                  router.push(newUrl);
                }}
              >
                <Eye className="w-2 h-2" />
                Xem chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default RelatedProductsSection; 