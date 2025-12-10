import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaChevronDown, FaPlay, FaPause } from 'react-icons/fa';
import Image from 'next/image';

interface MobileOptimizedHeroProps {
  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  quickSearchTags: string[];
  backgroundImages?: string[];
  onSearch: (term: string) => void;
  autoSlideInterval?: number;
}

const MobileOptimizedHero: React.FC<MobileOptimizedHeroProps> = ({
  heroTitle,
  heroSubtitle,
  searchPlaceholder,
  quickSearchTags,
  backgroundImages = [
    "/images/hero/Hero_1920x1080.png",
    "/images/hero/Hero 1080x1080.png",
  ],
  onSearch,
  autoSlideInterval = 5000
}) => {
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Auto background slideshow
  useEffect(() => {
    if (!isAutoPlaying || backgroundImages.length <= 1) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundImages.length);
    }, autoSlideInterval);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, backgroundImages.length, autoSlideInterval]);

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  };

  // Handle quick tag click
  const handleQuickTagClick = (tag: string) => {
    setSearchTerm(tag);
    onSearch(tag);
  };

  // Toggle auto play
  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  return (
    <div className="relative min-h-[70vh] md:hidden">
      {/* Background Slideshow */}
      <div className="absolute inset-0 overflow-hidden">
        {backgroundImages.map((bgImage, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentBgIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={bgImage}
              alt={`Background ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
              sizes="100vw"
            />
            {/* Enhanced overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-center min-h-[70vh] px-4 py-8">
        {/* Auto-play controls */}
        {backgroundImages.length > 1 && (
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={toggleAutoPlay}
              className="bg-black/50 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              aria-label={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
            >
              {isAutoPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
            </button>
          </div>
        )}

        {/* Slide indicator */}
        {backgroundImages.length > 1 && (
          <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {currentBgIndex + 1} / {backgroundImages.length}
          </div>
        )}

        {/* Hero Content */}
        <div className="text-center max-w-md mx-auto">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight drop-shadow-lg">
            {heroTitle}
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg text-white/90 mb-6 leading-relaxed drop-shadow-md">
            {heroSubtitle}
          </p>

          {/* Search Bar */}
          <div className="mb-6">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className={`flex items-center bg-white rounded-full shadow-2xl overflow-hidden transition-all duration-300 ${
                isSearchFocused ? 'ring-2 ring-orange-500/50' : ''
              }`}>
                <div className="flex items-center pl-4 pr-2">
                  <FaSearch className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={searchPlaceholder}
                  className="flex-1 px-3 py-3 text-gray-800 placeholder-gray-500 focus:outline-none bg-transparent text-base"
                />
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 font-semibold transition-colors text-base"
                >
                  Tìm
                </button>
              </div>
            </form>
          </div>

          {/* Quick Search Tags */}
          <div className="mb-6">
            <p className="text-white/80 text-sm mb-3">Từ khóa phổ biến:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {quickSearchTags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickTagClick(tag)}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full text-sm transition-all duration-200 backdrop-blur-sm hover:scale-105 active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce">
            <FaChevronDown className="text-white/70 w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Background navigation dots */}
      {backgroundImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex space-x-2">
            {backgroundImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBgIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentBgIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Local styles */}
      <style jsx>{`
        /* Enhanced mobile animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-content {
          animation: fadeInUp 0.8s ease-out;
        }

        /* Smooth transitions */
        .bg-transition {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Enhanced touch interactions */
        @media (max-width: 768px) {
          .touch-optimized {
            touch-action: manipulation;
          }
        }

        /* Improved text readability */
        .text-shadow {
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default MobileOptimizedHero;
