import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaTruck, FaChevronLeft, FaChevronRight } from "react-icons/fa";

type Promo = {
  id: string;
  name?: string;
  valueWithVat?: string | number;
  vn?: string | number;
  image?: string;
  productCodes?: string;
};

export default function IndustrialVacuumShowcaseV2() {
  // Render showcase

  const [promo, setPromo] = useState<Promo | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // helper to format promotion value based on vn optionset
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

    if (!Number.isNaN(numeric)) {
      try {
        return numeric.toLocaleString("vi-VN");
      } catch {
        return String(numeric);
      }
    }
    return cleaned;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const pr = await fetch("/api/promotions-recent").then((r) => r.json());
        if (!mounted) return;
        if (!pr) {
          setPromo(null);
          setProducts([]);
          return;
        }
        setPromo(pr);

        const codes = (pr.productCodes || "")
          .toString()
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean)
          .slice(0, 30);

        if (codes.length) {
          const res = await fetch(`/api/products-by-codes?codes=${encodeURIComponent(codes.join(","))}`);
          const items = await res.json();
          const vnStr = pr.vn !== undefined && pr.vn !== null ? String(pr.vn).trim() : "";
          const percentCode = "191920000";
          const vndCode = "191920001";
          const promoValueNumeric = Number(String(pr.valueWithVat || "").replace(/[^\d.-]/g, ""));

          const enriched = (items || [])
            .map((it: any) => {
              const basePrice = it.price !== undefined && it.price !== null ? Number(it.price) : null;
              let promoPrice = null;
              if (basePrice !== null && !Number.isNaN(basePrice)) {
                if (vnStr === percentCode && !Number.isNaN(promoValueNumeric)) {
                  promoPrice = Math.round(basePrice * (1 - promoValueNumeric / 100));
                } else if (vnStr === vndCode && !Number.isNaN(promoValueNumeric)) {
                  promoPrice = Math.max(0, Math.round(basePrice - promoValueNumeric));
                }
              }
              return { ...it, promoPrice };
            })
            .filter((p: any) => (p.price || p.promoPrice));

          if (mounted) setProducts(enriched.slice(0, 15));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const scrollByCard = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>(".iv2-card");
    const gap = 24;
    const w = first ? first.offsetWidth + gap : 300;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  // autoplay: auto scroll by one card periodically, pause on hover/focus
  useEffect(() => {
    let intervalId: number | null = null;
    const isPaused = { value: false };

    const start = () => {
      if (intervalId) return;
      intervalId = window.setInterval(() => {
        if (!isPaused.value) scrollByCard(1);
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
    <section className="max-w-7xl mx-auto px-2 py-6 bg-gray-50 my-6 rounded-lg">
      {/* Top header tab */}
      <div className="mb-0" style={{ marginBottom: "-14px" }}>
        <div className="bg-[#1a3a8a] text-white inline-flex items-center px-6 py-2 rounded-t-xl shadow">
          <span className="font-semibold">KHUYẾN MÃI MỚI</span>
        </div>
      </div>

      <div className="bg-white rounded-b-xl rounded-tr-xl px-4 py-3 relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto flex gap-6">
          <div className="w-full md:w-1/3 text-white flex flex-col items-start gap-6">
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
              {/* show promotion name (crdfd_name) if available, otherwise default */}
              <span className="block">{promo?.name ? promo?.name : "MÁY HÚT BỤI"}</span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="bg-white text-blue-600 px-4 py-1 rounded-full font-semibold">GIẢM</div>
            
            </div>

            <div className="my-4">
                <div className="w-36 h-36 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <div className="text-4xl md:text-5xl font-black text-red-700">{promo?.valueWithVat ? formatPromotionValue(promo?.valueWithVat, promo?.vn) : "23%"}</div>
              </div>
            </div>

            <div className="mt-auto">
              <div className="bg-white/10 px-4 py-3 rounded inline-flex items-center gap-3 border border-white/20">
                <FaTruck className="text-white" />
                <div className="text-sm font-medium">Free shipping — Nội thành HN, HCM</div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/3 relative">
            <button aria-label="left" onClick={() => scrollByCard(-1)} className="hidden md:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow z-20">
              <FaChevronLeft />
            </button>
            <button aria-label="right" onClick={() => scrollByCard(1)} className="hidden md:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow z-20">
              <FaChevronRight />
            </button>

            <div ref={scrollerRef} className="overflow-x-auto scrollbar-hide py-4 snap-x snap-mandatory" style={{ scrollPadding: "0 48px" }}>
              <div className="flex gap-6 items-stretch px-4 flex-nowrap">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="iv2-card bg-white rounded-lg shadow-sm p-4 flex-shrink-0" style={{ width: 300, border: '1px solid #eef2f4' }}>
                      <div className="h-40 bg-gray-100 rounded mb-3" />
                      <div className="h-12 bg-gray-100 rounded mb-2" />
                    </div>
                  ))
                ) : (
                  products.map((p: any, i: number) => (
                    <div key={p.id || i} className="iv2-card bg-white rounded-lg shadow-sm p-3 flex-shrink-0 snap-start" style={{ width: 300, border: '1px solid #eef2f4' }}>
                      <div className="flex flex-col h-full">
                        <div className="relative h-44 flex items-center justify-center bg-gray-50 rounded-md p-3">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} className="object-contain max-h-full max-w-full" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 rounded" />
                          )}
                        </div>

                        <div className="mt-3 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-800 mb-2 line-clamp-3">{p.name}</div>
                            <div className="flex items-center">
                              <div className="text-xs text-gray-400 line-through">{p.price ? (p.price).toLocaleString("vi-VN") + " ₫" : ""}</div>
                              <div className="ml-auto">
                                <div className="text-red-600 font-bold text-lg">
                                  {p.promoPrice ? (p.promoPrice).toLocaleString("vi-VN") + " ₫" : (p.price ? (p.price).toLocaleString("vi-VN") + " ₫" : "")}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <div className="text-yellow-400">★ ★ ★ ★ ★</div>
                            <div className="text-xs text-amber-700 px-3 py-1 rounded-full bg-amber-100">Đã bán {p.sold || ""}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


