import React from "react";
import { FaCheckCircle, FaTruck, FaCalendarAlt, FaClock, FaTag } from "react-icons/fa";

interface MobileSubHeaderProps {
  className?: string;
  categoryRef: React.RefObject<HTMLDivElement>;
  showCategoryDropdown: boolean;
  onCategoryToggle: () => void;
  loadingCategory: boolean;
  renderCategoryMenu: (isMobile?: boolean, isOpen?: boolean, onClose?: () => void) => React.ReactNode;
}

const MobileSubHeader: React.FC<MobileSubHeaderProps> = ({
  className = "",
  categoryRef,
  showCategoryDropdown,
  onCategoryToggle,
  loadingCategory,
  renderCategoryMenu,
}) => {
  return (
    <div className={`${className} w-full bg-white flex items-center px-2 sm:px-3 h-12 sm:h-14 relative border-t border-[#e6f9f1] shadow-sm`} style={{marginTop: '48px'}}>
      {/* Nút Danh mục */}
      <div ref={categoryRef} className="relative h-full flex items-center flex-shrink-0">
        <button
          className="flex items-center gap-1.5 sm:gap-2 text-[#049DBF] font-bold text-sm sm:text-base px-2 sm:px-3 py-2 focus:outline-none hover:text-[#04B2D9] bg-transparent border-none shadow-none rounded-lg transition-all touch-manipulation active:scale-95 active:bg-gray-50"
          onClick={onCategoryToggle}
          style={{background: 'transparent', minHeight: '44px'}}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="whitespace-nowrap">Danh mục</span>
          <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Sọc đứng ngăn cách */}
        <div className="h-6 sm:h-7 w-px bg-[#e6f9f1] mx-2 sm:mx-3 flex-shrink-0" />
        
        {showCategoryDropdown && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1">
            {renderCategoryMenu(true, showCategoryDropdown, onCategoryToggle)}
          </div>
        )}
      </div>
      
      {/* Cam kết với marquee effect */}
      <div
        className="flex-1 w-full overflow-x-auto whitespace-nowrap flex items-center gap-2 sm:gap-3 py-1 text-xs sm:text-sm relative hide-scrollbar"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`
          @media (max-width: 767px) {
            .marquee-camket {
              display: inline-flex;
              animation: marquee-camket 20s linear infinite;
            }
            @keyframes marquee-camket {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .marquee-camket:hover { animation-play-state: paused; }
            .marquee-camket:active { animation-play-state: paused; }
          }
        `}</style>
        <div className="marquee-camket flex items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-1 text-[#049DBF] font-bold whitespace-nowrap flex-shrink-0">
            Cam kết
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaCheckCircle className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Hàng chính hãng 100%</span><span className="xs:hidden">Chính hãng</span>
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaTruck className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Miễn phí vận chuyển</span><span className="xs:hidden">Miễn phí ship</span>
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaCalendarAlt className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Đổi trả hàng</span><span className="xs:hidden">Đổi trả</span>
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaClock className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Giao hàng nhanh chóng</span><span className="xs:hidden">Giao nhanh</span>
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaTag className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Giá siêu rẻ</span><span className="xs:hidden">Giá rẻ</span>
          </span>
          {/* Lặp lại để hiệu ứng marquee mượt */}
          <span className="flex items-center gap-1 text-[#049DBF] font-bold whitespace-nowrap ml-6 sm:ml-8 flex-shrink-0">
            Cam kết
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaCheckCircle className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Hàng chính hãng 100%</span><span className="xs:hidden">Chính hãng</span>
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaTruck className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Miễn phí vận chuyển</span><span className="xs:hidden">Miễn phí ship</span>
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaCalendarAlt className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Đổi trả hàng</span><span className="xs:hidden">Đổi trả</span>
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaClock className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Giao hàng nhanh chóng</span><span className="xs:hidden">Giao nhanh</span>
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap flex-shrink-0">
            <FaTag className="text-[#049DBF] text-xs sm:text-sm flex-shrink-0" /> <span className="hidden xs:inline">Giá siêu rẻ</span><span className="xs:hidden">Giá rẻ</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default MobileSubHeader;
