import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Slider from 'react-slick';
import { generateProductUrl } from '@/utils/urlGenerator';
import { useProductGroupHierarchy } from '@/hooks/useProductGroupHierarchy';

interface RelatedProduct {
  crdfd_productsid: string;
  crdfd_name: string;
  crdfd_fullname: string;
  crdfd_tensanphamtext?: string;
  crdfd_masanpham: string;
  crdfd_masanphamtext?: string;
  cr1bb_giaban: string;
  crdfd_giatheovc: string;
  cr1bb_imageurlproduct: string | null;
  cr1bb_imageurl: string | null;
  crdfd_quycach: string;
  crdfd_chatlieu: string | null;
  crdfd_thuonghieu: string | null;
  cr1bb_json_gia?: any;
  cr1bb_giakhuyenmai?: string;
  originalPrice?: number;
  cr1bb_originalprice?: number;
}

interface RelatedProductsSectionProps {
  products: RelatedProduct[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  currentProductName: string;
}

const PrevArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
    aria-label="Previous"
  >
    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  </button>
);

const NextArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
    aria-label="Next"
  >
    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </button>
);

const sliderSettings = {
  dots: false,
  infinite: true,
  speed: 500,
  slidesToShow: 5,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3500,
  pauseOnHover: true,
  pauseOnFocus: true,
  prevArrow: <PrevArrow />,
  nextArrow: <NextArrow />,
  responsive: [
    { breakpoint: 1600, settings: { slidesToShow: 5 } },
    { breakpoint: 1100, settings: { slidesToShow: 4 } },
    { breakpoint: 900, settings: { slidesToShow: 3 } },
    { breakpoint: 640, settings: { slidesToShow: 2 } },
    { breakpoint: 480, settings: { slidesToShow: 1 } },
  ],
};

const RelatedProductsSection: React.FC<RelatedProductsSectionProps> = ({
  products,
  isLoading,
  error,
  onRetry,
  currentProductName
}) => {
  const router = useRouter();
  const { hierarchy } = useProductGroupHierarchy();

  const extractPrice = (product: RelatedProduct): { sale: number | null; original: number | null; discount: number | null } => {
    let sale = null;
    let original = null;

    try {
      if (Array.isArray(product.cr1bb_json_gia) && product.cr1bb_json_gia.length > 0) {
        const item = product.cr1bb_json_gia[0];
        sale = parseFloat(item.crdfd_gia ?? item.cr1bb_giakhongvat ?? item.cr1bb_giaban ?? NaN);
        original = parseFloat(item.originalPrice ?? product.cr1bb_originalprice ?? product.originalPrice ?? NaN);
      } else if (typeof product.cr1bb_json_gia === 'string') {
        try {
          const parsed = JSON.parse(product.cr1bb_json_gia);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const item = parsed[0];
            sale = parseFloat(item.crdfd_gia ?? item.cr1bb_giakhongvat ?? item.cr1bb_giaban ?? NaN);
            original = parseFloat(item.originalPrice ?? product.cr1bb_originalprice ?? product.originalPrice ?? NaN);
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    if (!sale || Number.isNaN(sale)) {
      sale = parseFloat(product.cr1bb_giaban ?? product.crdfd_giatheovc ?? NaN);
    }
    if (!original || Number.isNaN(original)) {
      const rawOriginal = product.cr1bb_giakhuyenmai ?? product.originalPrice ?? product.cr1bb_originalprice;
      original = rawOriginal !== undefined ? parseFloat(String(rawOriginal)) : NaN;
    }

    sale = Number.isFinite(sale) ? sale : null;
    original = Number.isFinite(original) ? original : null;
    const discount = original && sale && original > sale ? Math.round(((original - sale) / original) * 100) : null;

    return { sale, original, discount };
  };

  const formatPrice = (price: number | null): string => {
    if (!price || price === 0) return "Liên hệ";
    return `${Math.round(price).toLocaleString("vi-VN")}₫`;
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-8 mb-8 px-2">
        <h2 className="text-lg font-bold text-cyan-600 mb-4 flex items-center gap-2 tracking-tight">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          SẢN PHẨM LIÊN QUAN
        </h2>
        <div className="bg-white rounded-md p-3 shadow-sm">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="animate-pulse">
                <div className="bg-gray-100 rounded p-2 text-center h-[260px] flex flex-col justify-between">
                  <div className="h-[120px] bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded mx-auto w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded mx-auto w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-8 mb-8 px-2">
        <h2 className="text-lg font-bold text-cyan-600 mb-4 flex items-center gap-2 tracking-tight">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          SẢN PHẨM LIÊN QUAN
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
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto mt-[5px] mb-8 px-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-cyan-600">SẢN PHẨM LIÊN QUAN</h2>
          <span className="inline-block w-14 h-1 bg-amber-300 rounded" />
        </div>
      </div>

      <div className="bg-white rounded-md p-3 shadow-sm">
        <Slider {...sliderSettings}>
          {products.map((product, idx) => {
            const title = product.crdfd_tensanphamtext || product.crdfd_fullname || product.crdfd_name || "";
            const imageSrc = product.cr1bb_imageurlproduct || product.cr1bb_imageurl || "";
            const { sale: priceVal, original: originalVal, discount: discountPerc } = extractPrice(product);
            const productCode = product.crdfd_masanpham || product.crdfd_masanphamtext || "";
            const productHref = productCode ? generateProductUrl({ ...product, productCode }, hierarchy) : "/san-pham";

            return (
              <div key={`${product.crdfd_productsid}-${idx}`} className="px-2 py-2">
                <div
                  className="relative rounded-lg bg-white p-2 flex flex-col justify-between text-center shadow-sm hover:shadow-md transition-transform transition-colors transform-gpu hover:-translate-y-1 h-[260px] sm:h-[300px] cursor-pointer"
                  style={{ border: '1px solid #049dbf' }}
                  onClick={() => {
                    localStorage.setItem("productDetail", JSON.stringify(product));
                    router.push(productHref);
                  }}
                >
                  {/* Discount ribbon */}
                  {discountPerc ? (
                    <div
                      className="absolute -top-1 -left-1 text-white font-semibold"
                      style={{
                        background: "linear-gradient(90deg,#ef4444,#dc2626)",
                        padding: "6px 10px",
                        borderTopLeftRadius: 8,
                        borderBottomRightRadius: 10,
                        boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                        fontSize: 12,
                      }}
                      aria-hidden
                    >
                      -{discountPerc}%
                    </div>
                  ) : null}

                  <div className="flex-1 flex flex-col items-center justify-start pt-1">
                    <div className="w-full max-w-[220px] p-2 flex items-center justify-center h-[120px] sm:h-[140px]">
                      <Link href={productHref} className="contents">
                        <img
                          src={imageSrc || ""}
                          alt={title}
                          className="object-contain max-w-full max-h-[90px] sm:max-h-[120px] block cursor-pointer"
                          onError={(e: any) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='14'>No image</text></svg>";
                          }}
                        />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-col items-center" style={{ minHeight: 60 }}>
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 leading-snug mb-2 line-clamp-2 min-h-[48px] sm:min-h-[54px] flex items-center justify-center text-center">
                      <Link href={productHref} className="text-gray-800 no-underline" style={{ textDecoration: "none" }}>
                        {title}
                      </Link>
                    </h3>

                    <div className="text-sm sm:text-base text-red-600 font-bold">
                      {formatPrice(priceVal)}
                    </div>
                    {originalVal ? (
                      <div className="text-xs text-gray-400 line-through mt-1">
                        {formatPrice(originalVal)}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </Slider>
      </div>
    </div>
  );
};

export default RelatedProductsSection;
