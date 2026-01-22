"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
 

interface News {
  cr1bb_header: string;
  cr1bb_title: string;
  cr1bb_excerpt: string;
  cr1bb_content: string;
  cr1bb_img_url: string;
  cr1bb_tags: string;
  cr1bb_content2: string;
  cr1bb_linkfileembedded: string;
  cr1bb_created_on: string;
  cr1bb_data_website_ecommerceid: string;
}

const NewsSection = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/getDataContent?tag=');
        if (response.data.success && Array.isArray(response.data.data.value)) {
          // Sort by creation date and keep up to 6 items for better selection (we will render 3)
          const sortedNews = response.data.data.value
            .sort((a: News, b: News) => new Date(b.cr1bb_created_on).getTime() - new Date(a.cr1bb_created_on).getTime())
            .slice(0, 6);
          setNews(sortedNews);
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        console.error('Error fetching news:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);
  // Lấy 5 item: 1 hero đầu + 2 item hàng 2 + 2 item hàng 3 (bố cục 1 - 2 - 2)
  const items = news.slice(0, 5);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let rafId = 0;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const max = el.scrollWidth - el.clientWidth;
        const p = max > 0 ? el.scrollLeft / max : 0;
        setProgress(p);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [items]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        Không có tin tức mới
      </div>
    );
  }

  
  const renderImageCard = (item: News, index: number) => {
    return (
      <div
        key={(item.cr1bb_data_website_ecommerceid || index) + '-img'}
        className="group relative h-full min-h-[160px] md:min-h-[220px] bg-white rounded-2xl overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.10)] ring-1 ring-stone-200"
      >
        <div className="absolute inset-0">
          {item.cr1bb_img_url ? (
            <Image
              src={item.cr1bb_img_url}
              alt={item.cr1bb_title || 'News image'}
              fill
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 640px"
              priority={index === 0}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
          <Link
            href={`/post/tag?tagname=${item.cr1bb_tags}&postid=${item.cr1bb_data_website_ecommerceid}`}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-amber-600 text-white font-semibold shadow hover:bg-amber-700 transition-colors text-sm"
          >
            Đọc thêm
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  };

  const renderSoftCard = (item: News, index: number) => {
    return (
      <div
        key={(item.cr1bb_data_website_ecommerceid || index) + '-soft'}
        className="group rounded-2xl bg-amber-50/60 border border-amber-100 shadow-[0_10px_24px_rgba(69,36,7,0.06)] p-5 sm:p-6 flex flex-col justify-between backdrop-blur-[2px]"
      >
        <div className="mb-4">
          <span className="inline-block px-3 py-1 text-[11px] sm:text-xs font-semibold text-amber-800 bg-amber-100 rounded-full ring-1 ring-amber-200/70">
            {item.cr1bb_tags || 'Tin tức mới'}
          </span>
        </div>
        <h3 className="text-stone-900 font-extrabold text-xl leading-snug sm:text-2xl">
          {item.cr1bb_title || 'Tiêu đề tin tức'}
        </h3>
        <p className="mt-2.5 text-stone-700 leading-relaxed line-clamp-3 text-[15px]">
          {item.cr1bb_excerpt || 'Thông tin chi tiết về tin tức.'}
        </p>
        <div className="mt-4">
          <Link
            href={`/post/tag?tagname=${item.cr1bb_tags}&postid=${item.cr1bb_data_website_ecommerceid}`}
            className="inline-flex items-center font-semibold text-amber-700 hover:text-amber-800 transition-colors"
          >
            Đọc thêm
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  };

  const renderHeroCard = (item: News) => {
    return (
      <div className="group relative h-full min-h-[300px] md:min-h-[480px] rounded-xl overflow-hidden shadow-[0_14px_32px_rgba(0,0,0,0.12)] ring-1 ring-stone-200 bg-white">
        <div className="absolute inset-0">
          {item.cr1bb_img_url ? (
            <Image
              src={item.cr1bb_img_url}
              alt={item.cr1bb_title || 'News image'}
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              className="object-contain w-full h-full transition-transform duration-700"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-200" />
          )}
          {/* Overlay gradient ấm trên nền để chữ rõ ràng ngay cả khi ảnh có khoảng trống */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* CTA duy nhất trên hero */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
            <Link
              href={`/post/tag?tagname=${item.cr1bb_tags}&postid=${item.cr1bb_data_website_ecommerceid}`}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-amber-600 text-white font-semibold shadow hover:bg-amber-700 transition-colors text-sm"
            >
              Đọc thêm
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative mb-20 md:mb-24 py-4 md:py-10">
      {/* Nền riêng biệt toàn chiều ngang */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-stone-100"
      />
      {/* Đường phân tách mảnh phía trên và dưới */}
      <div aria-hidden className="pointer-events-none absolute -top-px left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-px w-screen bg-stone-200/80" />
      <div aria-hidden className="pointer-events-none absolute -bottom-px left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-px w-screen bg-stone-200/80" />
      
      <div className="relative space-y-3 max-w-12xl xl:max-w-12xl mx-auto px-3 md:px-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-base md:text-2xl font-semibold text-gray-900">Tin tức mới nhất</h2>
          <Link
            href="/post"
            aria-label="Xem tất cả tin tức"
            className="text-cyan-600 hover:text-cyan-700 text-xs font-medium transition-all duration-200 bg-cyan-50 px-2.5 py-1 rounded-full active:scale-95 touch-manipulation"
          >
            Xem tất cả
          </Link>
        </div>

        {/* Mobile Layout: Horizontal scrollable cards */}
        <div className="md:hidden">
          <div ref={scrollerRef} className="flex overflow-x-auto gap-3 pb-2 -mx-3 px-3 snap-x snap-mandatory scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {items.map((item, index) => (
              <div key={(item.cr1bb_data_website_ecommerceid || index)} className="flex-shrink-0 w-[80vw] snap-start">
                <div className="group relative h-[200px] bg-white rounded-2xl overflow-hidden shadow-md ring-1 ring-stone-200">
                  <div className="absolute inset-0">
                    {item.cr1bb_img_url ? (
                      <Image
                        src={item.cr1bb_img_url}
                        alt={item.cr1bb_title || 'News image'}
                        fill
                        className="object-cover w-full h-full transition-transform duration-500 group-active:scale-100"
                        sizes="80vw"
                        priority={index === 0}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </div>

                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-medium text-amber-800 bg-amber-100/90 rounded-full mb-2">
                      {item.cr1bb_tags || 'Tin tức'}
                    </span>
                    <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-2 drop-shadow-md">
                      {item.cr1bb_title || 'Tiêu đề tin tức'}
                    </h3>
                    <Link
                      href={`/post/tag?tagname=${item.cr1bb_tags}&postid=${item.cr1bb_data_website_ecommerceid}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-600 text-white font-medium shadow hover:bg-amber-700 active:scale-95 transition-all text-xs touch-manipulation"
                    >
                      Đọc thêm
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Mobile scroll indicator - subtle moving thumb */}
          <div className="flex justify-center mt-2">
            <div className="relative w-28 h-1 bg-gray-200/40 rounded-full">
              <div
                className="absolute top-0 h-1 bg-amber-500 rounded-full"
                style={{
                  width: `${Math.max(12, Math.round(28 * (1 / Math.max(1, items.length)) ))}px`,
                  left: `${Math.min(100, Math.max(0, progress * 100))}%`,
                  transform: 'translateX(-50%)',
                  transition: 'left 120ms linear',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Layout: Grid 4 cột, 2 hàng */}
        <div className="hidden md:grid md:grid-cols-4 md:grid-rows-2 md:[grid-auto-rows:minmax(0,1fr)] gap-4">
          {/* Cột trái: Hero (span 2 cột x 2 hàng) */}
          {items[0] && (
            <div className="md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-1 h-full">
              {renderHeroCard(items[0])}
            </div>
          )}

          {/* Cột 3: 2 card trên/dưới */}
          {items[1] && (
            <div className="md:col-start-3 md:row-start-1">
              {renderImageCard(items[1], 1)}
            </div>
          )}
          {items[2] && (
            <div className="md:col-start-3 md:row-start-2">
              {renderImageCard(items[2], 2)}
            </div>
          )}

          {/* Cột 4: 2 card trên/dưới */}
          {items[3] && (
            <div className="md:col-start-4 md:row-start-1">
              {renderImageCard(items[3], 3)}
            </div>
          )}
          {items[4] && (
            <div className="md:col-start-4 md:row-start-2">
              {renderImageCard(items[4], 4)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsSection; 