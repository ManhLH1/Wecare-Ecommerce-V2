import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import axios from "axios";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight, FaSearch } from "react-icons/fa";

interface CategoryItem {
  id: string;
  name: string;
  code?: string;
  image?: string;
  href?: string;
}

const PrevArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
    aria-label="Previous"
  >
    <FaChevronLeft className="text-gray-600 text-sm" />
  </button>
);

const NextArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
    aria-label="Next"
  >
    <FaChevronRight className="text-gray-600 text-sm" />
  </button>
);

const sliderSettings = {
  dots: false,
  infinite: true,
  speed: 500,
  // Increase slides on wide screens since cards are now portrait
  slidesToShow: 5,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3500,
  pauseOnHover: true,
  pauseOnFocus: true,
  prevArrow: <PrevArrow />,
  nextArrow: <NextArrow />,
  responsive: [
    { breakpoint: 1800, settings: { slidesToShow: 6 } },
    { breakpoint: 1400, settings: { slidesToShow: 5 } },
    { breakpoint: 1100, settings: { slidesToShow: 4 } },
    { breakpoint: 800, settings: { slidesToShow: 2 } },
    { breakpoint: 480, settings: { slidesToShow: 1 } },
  ],
};


const FeaturedCategoriesProducts: React.FC<{
  categories?: CategoryItem[];
  loading?: boolean;
}> = ({ categories = [], loading = false }) => {
  type GroupState = { category: CategoryItem; products: any[]; loading: boolean };
  const [groupsWithProducts, setGroupsWithProducts] = useState<GroupState[]>(
    []
  );
  // simple in-memory cache to avoid refetching groups repeatedly
  const productsCacheRef = React.useRef<Map<string, any[]>>(new Map());
  // modal state for promotion details
  const [promoModal, setPromoModal] = useState<{ open: boolean; promo: any | null }>({
    open: false,
    promo: null,
  });

  useEffect(() => {
    if (!categories || categories.length === 0) {
      setGroupsWithProducts([]);
      return;
    }

    const topFive = categories.slice(0, 5);

    // Initialize group states as loading placeholders
    setGroupsWithProducts(
      topFive.map((cat) => ({ category: cat, products: [], loading: true }))
    );

    let cancelled = false;

    // Fetch each group's products independently so we can update UI as results arrive
    const fetchForGroup = async (cat: CategoryItem) => {
      const extracted: any[] = [];

      // Primary: ask getProductsOnly for this product group by product_group_Id (preferred)
      try {
        const params = new URLSearchParams();
        if (cat.id) params.append("product_group_Id", cat.id);
        params.append("page", "1");
        params.append("pageSize", "8");
        const res = await axios.get(`/api/getProductsOnly?${params.toString()}`);
        if (res?.data) {
          // Response shape: { data: { [groupName]: { products: [] } }, pagination: { ... } }
          const dataObj = res.data.data || res.data;
          if (dataObj && typeof dataObj === "object") {
            Object.values(dataObj).forEach((g: any) => {
              if (g && Array.isArray(g.products)) extracted.push(...g.products);
            });
          }
        }
        if (extracted.length > 0) return extracted;
      } catch (e) {
        console.warn("[FeaturedCategoriesProducts] getProductsOnly by product_group_Id failed for", cat.id, (e as Error)?.message);
      }

      // Secondary: try groupCode-specific endpoint if we have a code that may match CRM group value
      if (cat.code) {
        try {
          const res2 = await axios.get(`/api/getProductsByGroupCode?groupCode=${encodeURIComponent(cat.code)}&pageSize=8`);
          if (res2?.data?.products && Array.isArray(res2.data.products) && res2.data.products.length > 0) {
            return res2.data.products;
          }
        } catch (err) {
          console.warn("[FeaturedCategoriesProducts] getProductsByGroupCode failed for", cat.code, "status:", (err as any)?.response?.status);
        }
      }

      return [];
    };

    (async () => {
      await Promise.all(
        topFive.map(async (cat) => {
          if (cancelled) return;

          // if cached, use it immediately and skip network call
          const cached = productsCacheRef.current.get(cat.id);
          if (cached && Array.isArray(cached) && cached.length > 0) {
            setGroupsWithProducts((prev) =>
              prev.map((g) =>
                g.category.id === cat.id ? { ...g, products: cached, loading: false } : g
              )
            );
            return;
          }

          const products = await fetchForGroup(cat);
          if (cancelled) return;
          // try to fetch promotions for these products (batch by productCode)
          (async () => {
            try {
              const productCodes: string[] = Array.from(
                new Set(
                  (products || [])
                    .map((pp: any) => pp.crdfd_masanpham || pp.crdfd_masanphamtext || pp.crdfd_code || pp.code)
                    .filter(Boolean)
                    .map((v: any) => String(v))
                )
              );

              if (productCodes.length > 0) {
                const params = { productCodes: productCodes.join(",") };
                const res = await axios.get("/api/getPromotionsForProducts", { params });
                const promotionsData = res?.data || {};

                // attach promotion info to product objects where applicable
                products.forEach((pp: any) => {
                  const code = pp.crdfd_masanpham || pp.crdfd_masanphamtext || pp.crdfd_code || pp.code;
                  if (code && promotionsData.promotions && promotionsData.promotions[code]) {
                    // Get the best promotion (highest value)
                    const availablePromotions = promotionsData.promotions[code];
                    if (availablePromotions.length > 0) {
                      const bestPromotion = availablePromotions.reduce((best: any, current: any) => {
                        const currentValue = parseFloat(current.value) || 0;
                        const bestValue = parseFloat(best?.value) || 0;
                        return currentValue > bestValue ? current : best;
                      }, null);

                      pp.promotion = bestPromotion;
                    } else {
                      pp.promotion = null;
                    }
                  } else {
                    pp.promotion = null;
                  }
                });
              } else {
                // No product codes, set all promotions to null
                products.forEach((pp: any) => {
                  pp.promotion = null;
                });
              }
            } catch (e) {
              console.warn('[FeaturedCategoriesProducts] promotions fetch failed', e);
              // Set all promotions to null on error
              products.forEach((pp: any) => {
                pp.promotion = null;
              });
            }
          })();
          // store in cache
          try {
            productsCacheRef.current.set(cat.id, products || []);
          } catch (e) {
            // ignore cache set errors
          }
          setGroupsWithProducts((prev) =>
            prev.map((g) =>
              g.category.id === cat.id ? { ...g, products: products || [], loading: false } : g
            )
          );
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [categories]);

  if (loading) {
    return (
      <div className="relative px-2 md:px-6 my-3 my-lg-5">
        {Array.from({ length: 3 }).map((_, groupIndex) => (
          <section key={`loading-group-${groupIndex}`} className="mb-6">
            {/* Category header skeleton */}
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
            </div>

            {/* Products grid skeleton */}
            <div className="bg-white rounded-md p-3 shadow-sm border border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, productIndex) => (
                  <div key={`loading-product-${groupIndex}-${productIndex}`} className="animate-pulse">
                    <div className="bg-gray-100 rounded p-2 text-center h-[300px] flex flex-col justify-between">
                      {/* Product image placeholder */}
                      <div className="h-[140px] bg-gray-200 rounded mb-2"></div>

                      {/* Product name placeholder */}
                      <div className="h-3 bg-gray-200 rounded mx-auto w-3/4 mb-2"></div>

                      {/* Product price placeholder */}
                      <div className="h-4 bg-gray-200 rounded mx-auto w-1/2 mb-1"></div>

                      {/* Product original price placeholder */}
                      <div className="h-3 bg-gray-300 rounded mx-auto w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (!groupsWithProducts || groupsWithProducts.length === 0) return null;

  return (
    <div className="relative px-2 md:px-6 my-3 my-lg-5">
      {groupsWithProducts.map(({ category, products, loading: groupLoading }) => (
        <section key={category.id} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">
              <Link
                href={category.href || "/san-pham"}
                className="text-cyan-600 no-underline hover:text-cyan-700 text-2xl uppercase"
                style={{ textDecoration: "none" }}
              >
                {category.name}
              </Link>
            </h3>
            <Link href={category.href || "/san-pham"} className="text-sm text-gray-500 hover:text-gray-700 no-underline" style={{ textDecoration: "none" }}>
              Xem tất cả
            </Link>
          </div>

          {groupLoading ? (
            // Simple skeleton placeholders while this group's products are being fetched
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`${category.id}-ph-${idx}`} className="animate-pulse bg-white rounded p-2 text-center h-[300px] flex flex-col justify-between">
                  <div className="h-[140px] bg-gray-100 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded mx-auto w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded mx-auto w-1/2" />
                </div>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="bg-white rounded-md p-3 shadow-sm">
              <Slider {...sliderSettings}>
                {products.map((p: any, idx: number) => {
                  const title = p.crdfd_tensanphamtext || p.crdfd_name || p.name || "";
                  const imageSrc = p.cr1bb_imageurlproduct || p.cr1bb_imageurl || p.imageUrl || p.image || "";
                  // derive price and original price robustly from common fields
                  const getPriceInfo = (prod: any) => {
                    let sale = null;
                    let original = null;
                    try {
                      if (Array.isArray(prod.cr1bb_json_gia) && prod.cr1bb_json_gia.length > 0) {
                        const item = prod.cr1bb_json_gia[0];
                        sale = parseFloat(item.crdfd_gia ?? item.cr1bb_giakhongvat ?? item.cr1bb_giaban ?? NaN);
                        // try to find original within the product or item
                        original = parseFloat(item.originalPrice ?? prod.cr1bb_originalprice ?? prod.originalPrice ?? NaN);
                      } else if (typeof prod.cr1bb_json_gia === "string") {
                        try {
                          const parsed = JSON.parse(prod.cr1bb_json_gia);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            const item = parsed[0];
                            sale = parseFloat(item.crdfd_gia ?? item.cr1bb_giakhongvat ?? item.cr1bb_giaban ?? NaN);
                            original = parseFloat(item.originalPrice ?? prod.cr1bb_originalprice ?? prod.originalPrice ?? NaN);
                          }
                        } catch (e) {
                          // ignore parse error
                        }
                      }
                    } catch (e) {
                      // ignore errors
                    }

                    // fallback fields
                    if (!sale || Number.isNaN(sale)) {
                      sale = parseFloat(prod.cr1bb_giaban ?? prod.price ?? prod.crdfd_giatheovc ?? prod.crdfd_gia ?? NaN);
                    }
                    if (!original || Number.isNaN(original)) {
                      original = parseFloat(prod.cr1bb_giakhuyenmai ?? prod.originalPrice ?? prod.cr1bb_originalprice ?? NaN);
                    }

                    sale = Number.isFinite(sale) ? sale : null;
                    original = Number.isFinite(original) ? original : null;
                    const discount = original && sale && original > sale ? Math.round(((original - sale) / original) * 100) : null;
                    return { sale, original, discount };
                  };

                  const { sale: priceVal, original: originalVal, discount: discountPerc } = getPriceInfo(p);
                  const productId = p.crdfd_productsid || p.productId || p.id || `${category.id}-${idx}`;
                  const key = productId;

                  return (
                    <div key={key} className="px-2 py-2">
                      <div
                        className="relative rounded-lg bg-white p-2 flex flex-col justify-between text-center shadow-sm hover:shadow-md transition-transform transition-colors transform-gpu hover:-translate-y-1"
                        style={{ height: 300, border: '1px solid #049dbf' }}
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

                        {/* Compare control removed for cleaner layout */}

                        <div className="flex-1 flex flex-col items-center justify-start pt-1">
                          <div className="w-full max-w-[220px] p-2 flex items-center justify-center h-[140px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageSrc || ""}
                              alt={title || category.name}
                              className="object-contain max-w-full max-h-[120px] block"
                              onError={(e: any) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src =
                                  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='14'>No image</text></svg>";
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-2 flex flex-col items-center" style={{ minHeight: 72 }}>
                          <h3 className="text-base md:text-lg font-semibold text-gray-800 leading-snug mb-2 line-clamp-3 min-h-[54px] flex items-center justify-center text-center">
                            <Link href={p.href || category.href || "/san-pham"} className="text-gray-800 no-underline" style={{ textDecoration: "none" }}>
                              {title}
                            </Link>
                          </h3>

                          <div className="text-base text-red-600 font-bold">
                            {priceVal ? `${priceVal.toLocaleString("vi-VN")}₫` : ""}
                          </div>
                          {originalVal ? (
                            <div className="text-xs text-gray-400 line-through mt-1">
                              {originalVal ? `${originalVal.toLocaleString("vi-VN")}₫` : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Slider>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Không có sản phẩm hiển thị cho danh mục này.</div>
          )}
        </section>
      ))}
      {/* Promotion detail modal */}
      {promoModal.open && promoModal.promo ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPromoModal({ open: false, promo: null })}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-4 z-10">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">{promoModal.promo.name || "Chi tiết khuyến mãi"}</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close promotion dialog"
                onClick={() => setPromoModal({ open: false, promo: null })}
              >
                ✕
              </button>
            </div>
            <div className="mt-3 text-sm text-gray-700">
              <div className="mb-2"><strong>Điều kiện:</strong> {promoModal.promo.conditions || promoModal.promo.crdfd_conditions || "-"}</div>
              <div className="mb-2"><strong>Áp dụng cho:</strong> {promoModal.promo.productNames || promoModal.promo.productCodes || "Sản phẩm liên quan"}</div>
              <div className="mb-2"><strong>Giá trị:</strong> {promoModal.promo.valueWithVat || promoModal.promo.value || promoModal.promo.vn || "-"}</div>
              <div className="text-xs text-gray-500 mt-2">
                {promoModal.promo.startDate ? `Từ: ${new Date(promoModal.promo.startDate).toLocaleDateString()}` : ""}
                {promoModal.promo.endDate ? ` - Đến: ${new Date(promoModal.promo.endDate).toLocaleDateString()}` : ""}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FeaturedCategoriesProducts;


