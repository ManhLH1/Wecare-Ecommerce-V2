import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface HeroBanner {
  src: any;
  alt: string;
}

interface HeroSectionProps {
  banners: HeroBanner[];
  autoSlideInterval?: number; // milliseconds
}

const HeroSection: React.FC<HeroSectionProps> = ({ 
  banners, 
  autoSlideInterval = 4000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto slide functionality
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [banners.length, autoSlideInterval]);

  // Go to specific slide
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Previous slide
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  // Next slide
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (!banners.length) return null;

  return (
    <section className="block md:hidden px-4 pt-12 pb-24">
      <div className="relative">
        {/* Main slide container */}
        <div className="relative h-[220px] sm:h-[240px] rounded-2xl overflow-hidden shadow-2xl">
          {banners.map((banner, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-out ${
                index === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
            >
              <Image
                src={banner.src}
                alt={banner.alt}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 90vw, 400px"
                style={{ border: 'none' }}
              />
              
              {/* Enhanced gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
            </div>
          ))}

          {/* Navigation buttons - Improved for mobile */}
          {banners.length > 1 && (
            <>
              {/* Previous button */}
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white text-gray-700 p-2.5 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-sm"
                aria-label="Previous slide"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* Next button */}
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white text-gray-700 p-2.5 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-sm"
                aria-label="Next slide"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Slide counter - New feature for mobile */}
          {banners.length > 1 && (
            <div className="absolute top-3 right-3 z-20 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
              {currentIndex + 1} / {banners.length}
            </div>
          )}
        </div>

        {/* Enhanced dots indicator */}
        {banners.length > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-500 ease-out ${
                  index === currentIndex
                    ? 'w-8 h-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-md'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400 rounded-full'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Auto-play indicator */}
        {banners.length > 1 && (
          <div className="flex justify-center mt-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span>Tự động chuyển</span>
            </div>
          </div>
        )}
      </div>

      {/* Local styles for enhanced mobile experience */}
      <style jsx>{`
        /* Enhanced touch interactions for mobile */
        @media (max-width: 768px) {
          .slide-container {
            touch-action: pan-y pinch-zoom;
          }
        }

        /* Smooth transitions for mobile */
        .slide-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Enhanced shadow for mobile */
        .mobile-shadow {
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        /* Responsive height adjustments */
        @media (max-width: 480px) {
          .hero-height {
            height: 200px;
          }
        }

        @media (min-width: 481px) and (max-width: 768px) {
          .hero-height {
            height: 240px;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
