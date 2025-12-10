"use client";
import React, { useEffect, useState } from 'react';
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

  // Lấy 5 item: 1 hero đầu + 2 item hàng 2 + 2 item hàng 3 (bố cục 1 - 2 - 2)
  const items = news.slice(0, 5);

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
    <div className="relative mb-2 md:mb-24 py-6 md:py-10">
      {/* Nền riêng biệt toàn chiều ngang (không dùng section) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-stone-100"
      />
      {/* Đường phân tách mảnh phía trên và dưới cho cảm giác vùng riêng */}
      <div aria-hidden className="pointer-events-none absolute -top-px left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-px w-screen bg-stone-200/80" />
      <div aria-hidden className="pointer-events-none absolute -bottom-px left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-px w-screen bg-stone-200/80" />
      <div className="relative space-y-3 max-w-12xl xl:max-w-12xl mx-auto px-2 md:px-10">
        {/* Header tối giản (bỏ section khung nền) */}
        <div className="flex justify-between items-center">
          <h2 className="text-base md:text-2xl font-semibold text-gray-900 mb-1 md:mb-2">Tin tức mới nhất</h2>
          <Link
            href="/post"
            aria-label="Xem tất cả tin tức"
            className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline transition-all duration-200 bg-blue-50 px-2 py-1 rounded-full -mr-2 md:-mr-3"
          >
            Xem tất cả
          </Link>
        </div>

        {/* Bố cục ngang 1 - 2 - 2: Grid 4 cột, 2 hàng. Hero to hơn (span 2 cột x 2 hàng). */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 md:[grid-auto-rows:minmax(0,1fr)] gap-2 md:gap-4">
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