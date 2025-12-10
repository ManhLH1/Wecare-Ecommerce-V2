"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getItem } from "@/utils/SecureStorage";
import axios from "axios";
import { FaCalendarAlt, FaCreditCard, FaGift, FaPercent, FaTag, FaTimes, FaExpand } from "react-icons/fa";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import Image from "next/image";
// Toolbar removed for cleaner detail page
import { useCart } from "@/components/CartManager";
import { CartContext } from "@/components/CartGlobalManager";

interface NormalizedPromotion {
  promotionId: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  image?: string | null;
  value?: number | null;
  value2?: number | null;
  value3?: number | null;
  vn?: number | null; // 191920000: %, else VND
  congdonsoluong?: boolean | null;
  soluongapdung?: number | null;
  tongTienApDung?: number | null;
  conditions?: string | null;
  productNames?: string | null;
  productGroupNames?: string | null;
  tenSanPhamMuaKem?: string | null;
}

function formatCurrency(amount: number | null | undefined, vn: number | null | undefined) {
  if (amount == null || vn == null) return "-";
  if (vn === 191920000) return `${amount.toLocaleString("vi-VN")}%`;
  return `${amount.toLocaleString("vi-VN")} đ`;
}

export default function PromotionDetailPage({ params }: { params: { promotionId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [promotion, setPromotion] = useState<NormalizedPromotion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { cartItems } = useCart();
  const { openCart } = React.useContext(CartContext);

  const customerId = useMemo(() => getItem("id"), []);

  useEffect(() => {
    let mounted = true;
    const fetchSinglePromotion = async () => {
      setLoading(true);
      setError(null);
      try {
        const targetId = params.promotionId;

        // Try new version API first (grouped by customer groups)
        if (customerId) {
          try {
            const res = await axios.get(`/api/getPromotionDataNewVersion?id=${customerId}&includeImage=true`);
            const groups = Array.isArray(res.data) ? res.data : [];
            const all: any[] = groups.flatMap((g: any) => Array.isArray(g.promotions) ? g.promotions : []);
            const foundNew = all.find((p: any) => (p.promotionId === targetId) || (p.crdfd_promotionid === targetId) || (p.promotion_id === targetId));
            if (foundNew) {
              const normalized: NormalizedPromotion = {
                promotionId: foundNew.promotionId || foundNew.crdfd_promotionid || foundNew.promotion_id,
                name: foundNew.name || foundNew.promotionType || foundNew.crdfd_name || "Khuyến mãi",
                startDate: foundNew.startDate ?? foundNew.cr1bb_startdate ?? null,
                endDate: foundNew.endDate ?? foundNew.cr1bb_enddate ?? null,
                image: foundNew.image || foundNew.cr1bb_urlimage || null,
                value: foundNew.value ?? (foundNew.crdfd_value != null ? Number(foundNew.crdfd_value) : null),
                value2: foundNew.value2 ?? null,
                value3: foundNew.value3 ?? null,
                vn: foundNew.vn ?? (foundNew.cr1bb_vn != null ? Number(foundNew.cr1bb_vn) : null),
                congdonsoluong: foundNew.congdonsoluong ?? false,
                soluongapdung: foundNew.soluongapdung ?? null,
                tongTienApDung: foundNew.tongTienApDung ?? null,
                conditions: foundNew.conditions ?? null,
                productNames: foundNew.productNames ?? null,
                productGroupNames: foundNew.productGroupNames ?? null,
                tenSanPhamMuaKem: foundNew.tenSanPhamMuaKem ?? null,
              };
              if (mounted) setPromotion(normalized);
              return;
            }
          } catch {
            // fallthrough
          }
        }

        // Fallback to legacy API
        if (customerId) {
          try {
            const res = await axios.get(`/api/getPromotionData?id=${customerId}&includeImage=true`);
            const list = Array.isArray(res.data) ? res.data : [];
            const foundOld = list.find((p: any) => p.promotionId === targetId || p.promotion_id === targetId || p.crdfd_promotionid === targetId);
            if (foundOld) {
              const normalized: NormalizedPromotion = {
                promotionId: foundOld.promotionId || foundOld.promotion_id || foundOld.crdfd_promotionid,
                name: foundOld.crdfd_name || foundOld.name || "Khuyến mãi",
                startDate: foundOld.cr1bb_startdate ?? foundOld.startDate ?? null,
                endDate: foundOld.cr1bb_enddate ?? foundOld.endDate ?? null,
                image: foundOld.cr1bb_urlimage || foundOld.image || null,
                value: foundOld.crdfd_value != null ? Number(foundOld.crdfd_value) : (foundOld.value ?? null),
                value2: foundOld.value2 != null ? Number(foundOld.value2) : null,
                value3: null,
                vn: foundOld.cr1bb_vn != null ? Number(foundOld.cr1bb_vn) : (foundOld.vn ?? null),
                congdonsoluong: foundOld.congdonsoluong ?? false,
                soluongapdung: foundOld.soluongapdung ?? null,
                tongTienApDung: null,
                conditions: foundOld.conditions ?? null,
                productNames: foundOld.productNames ?? null,
                productGroupNames: foundOld.productGroupNames ?? null,
                tenSanPhamMuaKem: foundOld.tenSanPhamMuaKem ?? null,
              };
              if (mounted) setPromotion(normalized);
              return;
            }
          } catch {
            // fallthrough
          }
        }

        // As a last resort, try best promotions (no customer required)
        try {
          const res = await axios.get('/api/getBestPromotions');
          const arr = Array.isArray(res.data) ? res.data : [];
          const found = arr.find((p: any) => p.promotion_id === targetId);
          if (found) {
            const normalized: NormalizedPromotion = {
              promotionId: found.promotion_id,
              name: found.name || "Khuyến mãi",
              startDate: found.startDate ?? null,
              endDate: found.endDate ?? null,
              image: found.image ?? null,
              value: found.value ?? null,
              value2: null,
              value3: null,
              vn: found.vn ?? null,
              congdonsoluong: null,
              soluongapdung: null,
              tongTienApDung: null,
              conditions: found.conditions ?? null,
              productNames: found.productNames ?? null,
              productGroupNames: found.productGroupNames ?? null,
              tenSanPhamMuaKem: null,
            };
            if (mounted) setPromotion(normalized);
            return;
          }
        } catch {
          // ignore
        }

        if (mounted) setError("Không tìm thấy khuyến mãi.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSinglePromotion();
    return () => {
      mounted = false;
    };
  }, [customerId, params.promotionId]);

  // Process image URL to ensure it's a valid full URL
  const processImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    // If already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative path from Dynamics CRM, prepend the base URL
    if (url.includes('EntityImage') || url.includes('cr1bb_urlimage')) {
      return `https://wecare-ii.crm5.dynamics.com${url.startsWith('/') ? url : '/' + url}`;
    }
    
    return url;
  };

  const processedImageUrl = processImageUrl(promotion?.image);

  // Preload image when promotion data is loaded
  useEffect(() => {
    if (processedImageUrl) {
      setImageLoaded(false);
      setImageError(false);
      
      const img = new window.Image();
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        setImageError(true);
        setImageLoaded(true);
      };
      img.src = processedImageUrl;
    } else {
      setImageLoaded(true);
    }
  }, [processedImageUrl, promotion?.image]);

  return (
    <div className="bg-[#F6F9FC] min-h-screen">
      <JDStyleHeader
        cartItemsCount={cartItems.length}
        onSearch={() => {}}
        onCartClick={openCart}
      />

      <main className="container mx-auto px-4 py-6 pt-24">
        {/* Tiêu đề trang */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <button
              onClick={() => router.back()}
              className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Quay lại
            </button>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#2B3445] mb-2">Chi tiết khuyến mãi</h1>
              <p className="text-[#4B566B]">Thông tin chương trình khuyến mãi áp dụng cho bạn</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded p-4">{error}</div>
        )}

        {!loading && !error && promotion && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Hero image at top */}
            <div className="w-full relative bg-gradient-to-br from-blue-50 to-purple-50 group">
              <div className="w-full h-[400px] flex items-center justify-center overflow-hidden relative">
                {!imageLoaded && processedImageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                      <p className="text-gray-600 text-sm">Đang tải hình ảnh...</p>
                    </div>
                  </div>
                )}
                {processedImageUrl ? (
                  imageError ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-32 h-32 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
                        <FaGift className="w-16 h-16 text-red-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">Không thể tải hình ảnh</h3>
                      <p className="text-gray-500 text-sm mb-2">URL: {processedImageUrl.substring(0, 50)}...</p>
                      <button 
                        onClick={() => window.open(processedImageUrl, '_blank')}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Mở trong tab mới
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <Image
                        src={processedImageUrl}
                        alt={promotion.name}
                        width={1000}
                        height={400}
                        className={`w-full h-full object-contain transition-all duration-300 cursor-pointer ${
                          imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        } hover:scale-105`}
                        onClick={() => setShowFullImage(true)}
                        onLoadingComplete={() => setImageLoaded(true)}
                        onError={() => {
                          setImageError(true);
                          setImageLoaded(true);
                        }}
                        unoptimized
                        priority
                      />
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                      <FaGift className="w-16 h-16 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Chương trình khuyến mãi</h3>
                    <p className="text-gray-500 text-sm">Hình ảnh chưa được cập nhật</p>
                  </div>
                )}
              </div>
              {processedImageUrl && !imageError && (
                <>
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer" onClick={() => setShowFullImage(true)}>
                    <FaExpand className="w-4 h-4" />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg cursor-pointer" onClick={() => setShowFullImage(true)}></div>
                </>
              )}
            </div>
            <div className="p-5">
                <h2 className="text-xl font-semibold mb-2 text-[#2B3445]">{promotion.name}</h2>
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <FaCalendarAlt className="mr-2" />
                  <span>
                    {promotion.startDate ? new Date(promotion.startDate).toLocaleDateString("vi-VN") : ""}
                    {promotion.endDate ? ` - ${new Date(promotion.endDate).toLocaleDateString("vi-VN")}` : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                    <div className="flex items-center text-emerald-800 font-semibold mb-1">
                      <FaGift className="mr-2" /> Giá trị khuyến mãi
                    </div>
                    <div className="text-emerald-700 font-bold text-lg">
                      {formatCurrency(promotion.value ?? null, promotion.vn ?? null)}
                    </div>
                    {promotion.value2 != null && (
                      <div className="text-sm text-gray-700">+ {formatCurrency(promotion.value2, promotion.vn ?? null)}</div>
                    )}
                    {promotion.value3 != null && (
                      <div className="text-sm text-gray-700">+ {formatCurrency(promotion.value3, promotion.vn ?? null)}</div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="flex items-center text-blue-800 font-semibold mb-1">
                      <FaTag className="mr-2" /> Thông tin bổ sung
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>
                        Cộng dồn: <span className={promotion.congdonsoluong ? "text-green-700" : "text-red-700"}>{promotion.congdonsoluong ? "Có" : "Không"}</span>
                      </div>
                      {promotion.soluongapdung != null && <div>SL áp dụng: {promotion.soluongapdung}</div>}
                      {promotion.tongTienApDung != null && <div>Tổng tiền áp dụng: {promotion.tongTienApDung.toLocaleString("vi-VN")} đ</div>}
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                    <div className="flex items-center text-orange-800 font-semibold mb-1">
                      {promotion.vn === 191920000 ? <FaPercent className="mr-2" /> : <FaCreditCard className="mr-2" />}
                      Hình thức
                    </div>
                    <div className="text-sm text-gray-700">
                      {promotion.vn === 191920000 ? "Chiết khấu theo %" : "Giá trị tiền tệ"}
                    </div>
                  </div>
                </div>

                {promotion.conditions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                    <div className="font-semibold text-yellow-800 mb-1">Điều kiện áp dụng</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{promotion.conditions}</div>
                  </div>
                )}

                {(promotion.productNames || promotion.productGroupNames || promotion.tenSanPhamMuaKem) && (
                  <div className="space-y-5">
                    {promotion.productNames && (
                      <div>
                        <div className="font-semibold mb-2">Sản phẩm cụ thể</div>
                        <div className="bg-gray-50 border rounded p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {promotion.productNames
                              .split(',')
                              .map(s => s.trim())
                              .filter(Boolean)
                              .sort((a, b) => a.localeCompare(b, 'vi'))
                              .map((product, idx) => (
                                <div key={`${product}-${idx}`} className="flex items-center bg-white border rounded-lg px-3 py-2 shadow-sm">
                                  <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-semibold mr-2 flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="text-sm text-gray-800 truncate" title={product}>{product}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {promotion.productGroupNames && (
                      <div>
                        <div className="font-semibold mb-2">Nhóm sản phẩm</div>
                        <div className="bg-gray-50 border rounded p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {promotion.productGroupNames
                              .split(',')
                              .map(s => s.trim())
                              .filter(Boolean)
                              .sort((a, b) => a.localeCompare(b, 'vi'))
                              .map((group, idx) => (
                                <div key={`${group}-${idx}`} className="flex items-center bg-white border rounded-lg px-3 py-2 shadow-sm">
                                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold mr-2 flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="text-sm text-gray-800 truncate" title={group}>{group}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {promotion.tenSanPhamMuaKem && (
                      <div>
                        <div className="font-semibold mb-2">Sản phẩm mua kèm</div>
                        <div className="bg-gray-50 border rounded p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {promotion.tenSanPhamMuaKem
                              .split(',')
                              .map(s => s.trim())
                              .filter(Boolean)
                              .sort((a, b) => a.localeCompare(b, 'vi'))
                              .map((bp, idx) => (
                                <div key={`${bp}-${idx}`} className="flex items-center bg-white border rounded-lg px-3 py-2 shadow-sm">
                                  <span className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-semibold mr-2 flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="text-sm text-gray-800 truncate" title={bp}>{bp}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Full Image Modal */}
        {showFullImage && promotion && processedImageUrl && !imageError && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullImage(false);
                }}
                className="absolute -top-12 right-0 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-200 z-10"
              >
                <FaTimes className="w-5 h-5" />
              </button>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <Image
                  src={processedImageUrl}
                  alt={promotion.name}
                  width={1200}
                  height={480}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  unoptimized
                  priority
                />
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                Click để đóng
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}


