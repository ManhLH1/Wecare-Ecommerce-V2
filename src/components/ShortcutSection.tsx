import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ShortcutItem {
  icon: string;
  label: string;
  href: string;
}

interface ShortcutSectionProps {
  items: ShortcutItem[];
}

const ShortcutSection: React.FC<ShortcutSectionProps> = ({ items }) => {
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check scroll position to show/hide buttons
  const checkScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      
      // Show left button if scrolled to the right
      setShowLeftButton(scrollLeft > 10);
      
      // Hide right button if at the end
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  // Check initial scroll position
  useEffect(() => {
    checkScrollPosition();
    // Add resize listener for responsive behavior
    window.addEventListener('resize', checkScrollPosition);
    return () => window.removeEventListener('resize', checkScrollPosition);
  }, [items, checkScrollPosition]);

  // Scroll functions with haptic feedback simulation
  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -160, behavior: "smooth" });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 160, behavior: "smooth" });
    }
  }, []);

  // Touch feedback handlers
  const handleTouchStart = (index: number) => {
    setActiveIndex(index);
  };

  const handleTouchEnd = () => {
    setActiveIndex(null);
  };

  return (
    <section className="block md:hidden mx-2 mt-2 mb-3">
      <div className="relative">
        {/* Left gradient fade + button */}
        <div className={`absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none transition-opacity duration-200 ${showLeftButton ? 'opacity-100' : 'opacity-0'}`} />
        {showLeftButton && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white text-gray-600 p-2 rounded-full shadow-lg active:scale-90 backdrop-blur-sm border border-gray-100 transition-all duration-150 touch-manipulation"
            aria-label="Scroll left"
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
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Scroll container với snap behavior cho mobile */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-3 px-1 py-2 snap-x snap-mandatory"
          style={{ 
            scrollbarWidth: "none", 
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch" // iOS momentum scrolling
          }}
          onScroll={checkScrollPosition}
        >
          {items.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className={`group flex flex-col items-center justify-center cursor-pointer flex-shrink-0 no-underline snap-start transition-all duration-150 touch-manipulation ${
                activeIndex === idx ? 'scale-95' : 'scale-100'
              }`}
              style={{ minWidth: "72px" }}
              onTouchStart={() => handleTouchStart(idx)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              {/* Icon container với gradient background */}
              <div className={`relative mb-1.5 transition-transform duration-150 ${
                activeIndex === idx ? 'scale-95' : 'group-active:scale-95'
              }`}>
                <div className={`w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-white to-gray-50 border transition-all duration-200 shadow-sm ${
                  activeIndex === idx 
                    ? 'border-cyan-400 shadow-cyan-100 shadow-md' 
                    : 'border-gray-200 group-hover:border-cyan-300 group-hover:shadow-md'
                }`}>
                  <span className="text-xl">{item.icon}</span>
                </div>
                {/* Active indicator dot */}
                {activeIndex === idx && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-500 rounded-full" />
                )}
              </div>

              {/* Label với better readability */}
              <span className={`text-[11px] font-medium text-center leading-tight transition-colors duration-200 line-clamp-2 px-0.5 max-w-[72px] ${
                activeIndex === idx ? 'text-cyan-600' : 'text-gray-600 group-hover:text-gray-800'
              }`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Right gradient fade + button */}
        <div className={`absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none transition-opacity duration-200 ${showRightButton ? 'opacity-100' : 'opacity-0'}`} />
        {showRightButton && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white text-gray-600 p-2 rounded-full shadow-lg active:scale-90 backdrop-blur-sm border border-gray-100 transition-all duration-150 touch-manipulation"
            aria-label="Scroll right"
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
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
      
      {/* Scroll indicator dots */}
      <div className="flex justify-center gap-1 mt-1">
        {items.length > 4 && (
          <>
            <div className={`h-1 rounded-full transition-all duration-300 ${showLeftButton ? 'w-1.5 bg-gray-300' : 'w-4 bg-cyan-500'}`} />
            <div className={`h-1 rounded-full transition-all duration-300 ${!showLeftButton && !showRightButton ? 'w-4 bg-cyan-500' : 'w-1.5 bg-gray-300'}`} />
            <div className={`h-1 rounded-full transition-all duration-300 ${showRightButton ? 'w-1.5 bg-gray-300' : 'w-4 bg-cyan-500'}`} />
          </>
        )}
      </div>
    </section>
  );
};

export default ShortcutSection;
