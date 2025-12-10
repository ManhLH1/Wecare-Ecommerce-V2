import React, { useState, useRef, useEffect } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check scroll position to show/hide buttons
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      
      // Show left button if scrolled to the right
      setShowLeftButton(scrollLeft > 10);
      
      // Hide right button if at the end
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Check initial scroll position
  useEffect(() => {
    checkScrollPosition();
  }, [items]);

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -140, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 140, behavior: "smooth" });
    }
  };

  return (
    <section className="block md:hidden mx-1 mt-1 rounded-2xl">
      <div className="relative px-1 pb-2">
        {/* Left button - hiện khi đã scroll */}
        {showLeftButton && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white text-gray-700 p-1.5 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 backdrop-blur-sm border border-gray-200 transition-all duration-200"
            aria-label="Scroll left"
            style={{ width: '28px', height: '28px' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
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
        )}

        {/* Container scroll với padding cho buttons */}
        <div
          ref={scrollContainerRef}
          id="shortcut-scroll-mobile"
          className="flex overflow-x-auto scrollbar-hide gap-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onScroll={checkScrollPosition}
        >
          {items.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="group flex flex-col items-center justify-center transition-all duration-200 cursor-pointer py-1 flex-shrink-0 no-underline"
              style={{ minWidth: "65px", textDecoration: "none" }}
            >
              {/* Icon container - nhỏ hơn */}
              <div className="relative mb-1 group-hover:scale-105 transition-all duration-200">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-gray-200 group-hover:border-gray-300 transition-all duration-200 shadow-sm group-hover:shadow-md">
                  <span className="text-base">{item.icon}</span>
                </div>
              </div>

              {/* Label - text nhỏ hơn */}
              <span className="text-xs font-normal text-gray-600 text-center leading-tight group-hover:text-gray-800 transition-colors duration-200 line-clamp-2 px-1">
                {item.label.length > 10
                  ? item.label.substring(0, 8) + "..."
                  : item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Right button - luôn hiện trừ khi ở cuối */}
        {showRightButton && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white text-gray-700 p-1.5 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 backdrop-blur-sm border border-gray-200 transition-all duration-200"
            aria-label="Scroll right"
            style={{ width: '28px', height: '28px' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
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
        )}
      </div>
    </section>
  );
};

export default ShortcutSection;
