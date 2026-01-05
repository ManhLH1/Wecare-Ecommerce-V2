import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaTruck, FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface RemotePromotion {
  id: string;
  name?: string;
  valueWithVat?: string | number;
  vn?: string | number;
  image?: string;
  startDate?: string;
  endDate?: string;
  productCodes?: string;
  products?: Array<{
    id?: string;
    name?: string;
    code?: string;
    price?: number | null;
    image?: string;
    promoPrice?: number | null;
  }>;
}

export default function IndustrialVacuumShowcase() {
  const [promotions, setPromotions] = useState<RemotePromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/promotions-recent");
        if (!res.ok) throw new Error("Failed to load promotions");
        const data: any = await res.json();
        const p = Array.isArray(data) ? data[0] : data;
        if (!p) {
          if (mounted) setPromotions([]);
          return;
        }

        const promo: RemotePromotion = {
          id: p.id || p.crdfd_promotionid,
          name: p.name || p.crdfd_name,
          valueWithVat: p.valueWithVat || p.crdfd_value_co_vat || p.crdfd_value || "",
          vn: p.vn || p.crdfd_vn || p.cr1bb_vn || "",
          image: p.image || p.cr1bb_urlimage || "",
          startDate: p.startDate || p.crdfd_start_date,
          endDate: p.endDate || p.crdfd_end_date,
          productCodes: p.productCodes || p.crdfd_masanpham_multiple || ""
        };

        const codesRaw = promo.productCodes || "";
        // fetch more codes to ensure we can show up to 15 products with price
        const codes = String(codesRaw).split(",").map((c) => c.trim()).filter(Boolean).slice(0, 30);
        if (codes.length) {
          try {
            const prodRes = await fetch(`/api/products-by-codes?codes=${encodeURIComponent(codes.join(","))}`);
              if (prodRes.ok) {
                  const items: any[] = await prodRes.json();
              const vnStr = promo.vn !== undefined && promo.vn !== null ? String(promo.vn).trim() : "";
              const percentCode = "191920000";
              const vndCode = "191920001";
              const promoValueNumeric = Number(String(promo.valueWithVat || "").replace(/[^\d.-]/g, ""));

                  promo.products = (items || []).map((it: any) => {
                const basePrice = it.price !== undefined && it.price !== null ? Number(it.price) : null;
                let promoPrice: number | null = null;
                if (basePrice !== null && !Number.isNaN(basePrice)) {
                  if (vnStr === percentCode && !Number.isNaN(promoValueNumeric)) {
                    promoPrice = Math.max(0, Math.round(basePrice * (1 - promoValueNumeric / 100)));
                  } else if (vnStr === vndCode && !Number.isNaN(promoValueNumeric)) {
                    promoPrice = Math.max(0, Math.round(basePrice - promoValueNumeric));
                  } else {
                    promoPrice = null;
                  }
                }

                return {
                  id: it.id,
                  name: it.name,
                  code: it.code,
                  price: it.price,
                  image: it.image,
                  promoPrice,
                };
                  }).filter((prod) => (prod.price !== null && prod.price !== undefined) || (prod.promoPrice !== null && prod.promoPrice !== undefined));
            } else {
              promo.products = [];
            }
          } catch (err) {
            console.error("Error fetching products for promotion", p.id, err);
            promo.products = [];
          }
        } else {
          promo.products = [];
        }

        if (mounted) setPromotions([promo]);
      } catch (e) {
        console.error("Error fetching recent promotions", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // For A: display each product as its own card (up to 5 products from the single promotion)
  const productItems = loading
    ? new Array(15).fill(null)
    : (promotions[0]?.products || []).filter((p: any) => (p && (p.price || p.promoPrice))).slice(0, 15);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (delta?: number) => {
    if (!scrollerRef.current) return;
    const container = scrollerRef.current;
    // try to scroll by one card width (+ gap)
    const firstCard = container.querySelector<HTMLElement>(".product-card");
    const gap = 24;
    const cardWidth = firstCard ? firstCard.offsetWidth + gap : Math.round(container.clientWidth * 0.8);
    const step = (typeof delta === "number") ? delta * cardWidth : cardWidth;
    container.scrollBy({
      left: step,
      behavior: "smooth",
    });
  };

  // update activeIndex on scroll (snap)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const firstCard = el.querySelector<HTMLElement>(".product-card");
        const gap = 24;
        const cardWidth = firstCard ? firstCard.offsetWidth + gap : 300;
        const index = Math.round(el.scrollLeft / cardWidth);
        setActiveIndex(index);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // autoplay scroll for showcase: auto-advance, pause on hover/focus
  useEffect(() => {
    let intervalId: number | null = null;
    const isPaused = { value: false };

    const start = () => {
      if (intervalId) return;
      intervalId = window.setInterval(() => {
        if (!isPaused.value) scrollBy(1);
      }, 3500);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const el = scrollerRef.current;
    if (el) {
      const onEnter = () => (isPaused.value = true);
      const onLeave = () => (isPaused.value = false);
      const onFocus = () => (isPaused.value = true);
      const onBlur = () => (isPaused.value = false);
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      el.addEventListener("focusin", onFocus);
      el.addEventListener("focusout", onBlur);
      start();
      return () => {
        stop();
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        el.removeEventListener("focusin", onFocus);
        el.removeEventListener("focusout", onBlur);
      };
    }

    start();
    return () => stop();
  }, [scrollerRef]);

  return (
    <section className="max-w-7xl mx-auto p-4 bg-white my-4">
      <div className="flex items-center justify-between mb-3">
        <div className="bg-[#1a3a8a] text-white px-5 py-2 rounded-t-xl flex items-center gap-2 text-sm font-bold uppercase">
          {promotions[0]?.name || "MÁY HÚT BỤI CÔNG NGHIỆP"}
        </div>
        <div className="flex gap-2">
          <Link href="/san-pham?group=supper-clean" className="text-xs px-3 py-1 rounded-md border border-gray-200 bg-transparent text-gray-700">Máy hút bụi Supper Clean</Link>
          <Link href="/san-pham?group=topclean" className="text-xs px-3 py-1 rounded-md border border-gray-200 bg-transparent text-gray-700">Máy hút bụi TopClean</Link>
          <Link href="/san-pham" className="text-xs px-3 py-1 rounded-md border border-gray-200 bg-transparent text-gray-700">Xem tất cả</Link>
        </div>
      </div>

      <div className="bg-blue-500 rounded-b-xl rounded-tr-xl p-6 relative flex flex-col md:flex-row gap-6 items-stretch overflow-hidden">
        <div className="w-full md:w-1/4 flex flex-col items-center justify-center text-center text-white shrink-0 py-4">
          <div className="relative mb-6">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-tight italic drop-shadow-md">
              MÁY HÚT BỤI <br />
              <span className="text-orange-400">CÔNG NGHIỆP</span>
            </h2>
            {/* changed label from 'GIÁ TỐT' to 'GIẢM' per request */}
            <div className="mt-2 flex items-center gap-3">
              <div className="inline-block bg-white text-blue-600 px-4 py-1 rounded-full font-bold skew-x-[-10deg]">
                GIẢM
              </div>
              {promotions[0]?.valueWithVat && String(promotions[0]?.vn || "").trim() === "191920000" && (
                <div className="text-sm bg-red-600 text-white px-3 py-1 rounded-full font-semibold">GIẢM {formatPromotionValue(promotions[0].valueWithVat, promotions[0]?.vn)}</div>
              )}
            </div>
          </div>

          <div className="relative mb-8">
            {/* 'Chỉ từ' label removed per request */}
            <div className="bg-gradient-to-b from-[#fff200] via-[#ffcc00] to-[#ff9900] p-4 rounded-2xl shadow-xl border-4 border-white/20 min-w-[160px]">
              <div className="text-6xl font-black text-[#d32f2f] flex items-end justify-center">
                {/* show formatted promotion value + icon */}
                <span className="flex items-end gap-2">
                  {promotions[0]?.valueWithVat ? (
                    <>
                      <span>{formatPromotionValue(promotions[0].valueWithVat, promotions[0]?.vn)}</span>
                    </>
                  ) : (
                    <>
                      <span>2</span>
                      <span className="text-2xl mb-2 ml-1">TRIỆU</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#1d4ed8] px-4 py-2 rounded-lg border border-white/20">
            <div className="bg-red-500 p-1.5 rounded">
              <FaTruck className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold leading-none">Free Shipping</p>
              <p className="text-[11px] font-medium leading-tight">Nội thành HN, HCM</p>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
        <div className="relative">
          {/* Left / Right arrows */}
          <button
            aria-label="scroll-left"
            onClick={() => scrollBy(-1)}
            className="hidden md:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 text-gray-600 rounded-full shadow z-20 hover:bg-white"
          >
            <FaChevronLeft />
          </button>
          <button
            aria-label="scroll-right"
            onClick={() => scrollBy(1)}
            className="hidden md:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 text-gray-600 rounded-full shadow z-20 hover:bg-white"
          >
            <FaChevronRight />
          </button>

          <div
            ref={scrollerRef}
            onWheel={(e) => {
              // translate vertical wheel into horizontal scroll for convenience
              if (!scrollerRef.current) return;
              if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                scrollerRef.current.scrollBy({ left: e.deltaY, behavior: "smooth" });
                e.preventDefault();
              }
            }}
            className="overflow-x-auto scrollbar-hide py-6 snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" as any, scrollSnapType: "x mandatory" as any, width: "100%", margin: "0", padding: "0 48px", boxSizing: "border-box" as any }}
          >
            <div className="flex gap-4 items-stretch px-2 flex-nowrap">
              {productItems.map((prod: any, idx: number) => {
                const parsed = prod?.priceJsonParsed || {};
                const ratingNum = (() => {
                  const candidates = [parsed.rating, parsed.ratingValue, parsed.stars, parsed.avgRating, parsed.rate];
                  for (const c of candidates) {
                    if (c !== undefined && c !== null) {
                      const n = Number(String(c).replace(/[^\d.]/g, ""));
                      if (!Number.isNaN(n) && n > 0) return Math.min(5, Math.max(0, Math.round(n)));
                    }
                  }
                  return 4;
                })();

                const soldCount = (() => {
                  const keys = ["soldQty", "sold", "soluong", "quantity", "sales", "sold_count"];
                  for (const k of keys) {
                    if (parsed[k] !== undefined && parsed[k] !== null) {
                      const n = Number(String(parsed[k]).replace(/[^\d]/g, ""));
                      if (!Number.isNaN(n)) return n;
                    }
                  }
                  return prod?.promoPrice ? Math.floor(Math.random() * 200) + 1 : 0;
                })();

                // New card layout: image area, discount badge, title, price yellow box, stars and sold pill
                return (
                  <div
                    key={idx}
                    className="product-card bg-white rounded-lg border border-gray-200 hover:shadow-2xl transition transform hover:scale-105 h-full flex flex-col items-stretch p-0 flex-shrink-0 snap-start"
                    style={{ width: "300px", minWidth: "300px" }}
                  >
                    <div className="relative bg-white rounded-t-lg overflow-hidden" style={{ height: 200, boxShadow: "inset 0 0 0 6px rgba(255,255,255,0.6)" }}>
                      {prod?.image ? (
                        <Image src={prod.image} alt={prod?.name || prod?.code || "product"} fill className="object-contain p-4 bg-white" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-500">Không có ảnh</div>
                      )}
                      {/* discount badge larger */}
                      <div className="absolute -top-2 left-3 z-20">
                        <div className="bg-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">GIẢM {promotions[0]?.valueWithVat && String(promotions[0]?.vn || "").trim() === "191920000" ? formatPromotionValue(promotions[0].valueWithVat, promotions[0]?.vn) : ""}</div>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-800 mb-3" style={{ minHeight: 54, lineHeight: "1.2rem" }}>
                          {prod?.name || prod?.code || (loading ? "Đang tải..." : "Không có dữ liệu")}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs text-gray-400 line-through">{prod?.price ? (prod.price).toLocaleString("vi-VN") + " ₫" : ""}</div>
                          <div className="ml-auto">
                            <div className="inline-block px-5 py-3 bg-gradient-to-b from-yellow-300 to-yellow-400 text-red-700 font-extrabold rounded-lg text-xl shadow-inner">
                              {prod?.promoPrice ? (prod.promoPrice).toLocaleString("vi-VN") + " ₫" : (prod?.price ? (prod.price).toLocaleString("vi-VN") + " ₫" : "")}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-yellow-400" aria-hidden>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < ratingNum ? "text-yellow-400" : "text-gray-300"}>★</span>
                          ))}
                        </div>
                        <div className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">Đã bán {soldCount || ""}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

// Helper: format promotion value based on vn option set
function formatPromotionValue(rawValue?: string | number, vn?: string | number) {
  if (rawValue === undefined || rawValue === null) return "";
  const percentCode = "191920000";
  const vndCode = "191920001";

  const cleaned = String(rawValue).trim();
  const numeric = Number(cleaned.replace(/[^\d.-]/g, ""));
  const vnStr = vn !== undefined && vn !== null ? String(vn).trim() : "";

  if (vnStr === percentCode) {
    if (!Number.isNaN(numeric)) return `${numeric}%`;
    return cleaned.endsWith("%") ? cleaned : `${cleaned}%`;
  }

  if (vnStr === vndCode) {
    if (!Number.isNaN(numeric)) {
      try {
        return numeric.toLocaleString("vi-VN") + " ₫";
      } catch {
        return `${numeric} ₫`;
      }
    }
    return `${cleaned} ₫`;
  }

  // fallback: if numeric, return formatted number
  if (!Number.isNaN(numeric)) {
    try {
      return numeric.toLocaleString("vi-VN");
    } catch {
      return String(numeric);
    }
  }
  return cleaned;
}

// vn badge intentionally removed - badges suppressed per request
