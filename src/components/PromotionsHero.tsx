"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Promotion {
  cr1bb_header: string;
  cr1bb_title: string;
  cr1bb_excerpt: string;
  cr1bb_content: string;
  cr1bb_img_url: string;
  cr1bb_tags: string;
  cr1bb_content2: string;
  cr1bb_linkfileembedded: string;
}

const PromotionsHero = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [visiblePromotions, setVisiblePromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const response = await fetch('/api/getDataContent?tag=Khuyến%20mãi');
        if (!response.ok) {
          throw new Error('Failed to fetch promotions');
        }
        const result = await response.json();
        if (!result.success || !result.data.value) {
          throw new Error('Invalid data format');
        }
        const allPromotions = result.data.value;
        setPromotions(allPromotions);
        setVisiblePromotions(allPromotions.slice(0, 6));
      } catch (err) {
        console.error('Error fetching promotions:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  useEffect(() => {
    if (visiblePromotions.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.min(3, visiblePromotions.length));
    }, 6000);

    return () => clearInterval(interval);
  }, [visiblePromotions.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.min(3, visiblePromotions.length));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.min(3, visiblePromotions.length)) % Math.min(3, visiblePromotions.length));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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

  if (promotions.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        Không có khuyến mãi nào hiện tại
      </div>
    );
  }

  const featuredPromotions = visiblePromotions.slice(0, 3);

  return (
    <div className="space-y-12">
      {/* Enhanced Carousel for Latest 3 Promotions */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="relative h-[225px] md:h-[300px]">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          
          {/* Slides */}
          {featuredPromotions.map((promotion, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-out transform ${
                currentSlide === index 
                  ? 'opacity-100 translate-x-0' 
                  : currentSlide < index 
                    ? 'opacity-0 translate-x-full' 
                    : 'opacity-0 -translate-x-full'
              }`}
            >
              {/* Background Image with Gradient Overlay */}
              <div className="absolute inset-0">
                <Image
                  src={promotion.cr1bb_img_url || '/placeholder.jpg'}
                  alt={promotion.cr1bb_title}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-900/50 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="relative h-full z-20">
                <div className="container mx-auto px-4 h-full flex items-center">
                  <div className="max-w-2xl space-y-3">
                    {/* Badge */}
                    <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-medium">
                      {promotion.cr1bb_header || 'Khuyến mãi mới'}
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                      {promotion.cr1bb_title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-base md:text-lg text-white/90 line-clamp-2 leading-relaxed">
                      {promotion.cr1bb_excerpt}
                    </p>
                    
                    {/* CTA Button - Positioned to the left and above navigation controls */}
                    {promotion.cr1bb_linkfileembedded && (
                      <div className="absolute bottom-12 left-4">
                        <Link 
                          href={promotion.cr1bb_linkfileembedded}
                          className="inline-flex items-center px-4 py-2 bg-white text-blue-600 font-semibold rounded-full hover:bg-blue-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                        >
                          Xem chi tiết
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Arrows */}
          <div className="absolute bottom-8 right-8 flex items-center gap-4 z-30">
            <button
              onClick={prevSlide}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 group"
              aria-label="Previous slide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white transition-transform duration-300 transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 group"
              aria-label="Next slide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white transition-transform duration-300 transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Navigation Dots */}
          <div className="absolute bottom-8 left-8 z-30 flex items-center gap-3">
            {featuredPromotions.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`relative w-12 h-2 rounded-full transition-all duration-500 ${
                  currentSlide === index 
                    ? 'bg-white w-20' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Other Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visiblePromotions.slice(3).map((promotion, index) => (
          <div 
            key={index}
            className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
          >
            <div className="relative h-36 overflow-hidden">
              <Image
                src={promotion.cr1bb_img_url || '/placeholder.jpg'}
                alt={promotion.cr1bb_title}
                fill
                className="object-cover transform group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="p-4">
              <div className="mb-2">
                <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
                  {promotion.cr1bb_header || 'Khuyến mãi'}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors duration-300">
                {promotion.cr1bb_title}
              </h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {promotion.cr1bb_excerpt}
              </p>
              {promotion.cr1bb_linkfileembedded && (
                <Link 
                  href={promotion.cr1bb_linkfileembedded}
                  className="inline-flex items-center text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-300"
                >
                  Xem thêm
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View All Button */}
      {promotions.length > visiblePromotions.length && (
        <div className="text-center">
          <Link 
            href="/promotions"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-full hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 no-underline"
          >
            Xem tất cả khuyến mãi
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
};

export default PromotionsHero;
