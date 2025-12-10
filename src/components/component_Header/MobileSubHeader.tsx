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
    <div className={`${className} w-full bg-white flex items-center px-2 h-12 relative border-t border-[#e6f9f1] shadow-sm`} style={{marginTop: 65}}>
      {/* Nút Danh mục */}
      <div ref={categoryRef} className="relative h-full flex items-center">
        <button
          className="flex items-center gap-2 text-[#049DBF] font-bold text-sm px-2 py-1 focus:outline-none hover:text-[#049DBF] bg-transparent border-none shadow-none rounded-none transition"
          onClick={onCategoryToggle}
          style={{background: 'transparent'}}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>Danh mục</span>
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Sọc đứng ngăn cách */}
        <div className="h-7 w-px bg-[#e6f9f1] mx-3" />
        
        {showCategoryDropdown && (
          renderCategoryMenu(true, showCategoryDropdown, onCategoryToggle)
        )}
      </div>
      
      {/* Cam kết với marquee effect */}
      <div
        className="flex-1 w-full overflow-x-auto whitespace-nowrap flex items-center gap-3 py-1 text-xs relative hide-scrollbar"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`
          @media (max-width: 767px) {
            .marquee-camket {
              display: inline-flex;
              animation: marquee-camket 18s linear infinite;
            }
            @keyframes marquee-camket {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .marquee-camket:hover { animation-play-state: paused; }
          }
        `}</style>
        <div className="marquee-camket flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#049DBF] font-bold whitespace-nowrap">
            Cam kết
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaCheckCircle className="text-[#049DBF] mr-1" /> Hàng chính hãng 100%
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaTruck className="text-[#049DBF] mr-1" /> Miễn phí vận chuyển
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaCalendarAlt className="text-[#049DBF] mr-1" /> Đổi trả hàng
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaClock className="text-[#049DBF] mr-1" /> Giao hàng nhanh chóng
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaTag className="text-[#049DBF] mr-1" /> Giá siêu rẻ
          </span>
          {/* Lặp lại để hiệu ứng marquee mượt */}
          <span className="flex items-center gap-1 text-[#049DBF] font-bold whitespace-nowrap ml-8">
            Cam kết
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaCheckCircle className="text-[#049DBF] mr-1" /> Hàng chính hãng 100%
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaTruck className="text-[#049DBF] mr-1" /> Miễn phí vận chuyển
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaCalendarAlt className="text-[#049DBF] mr-1" /> Đổi trả hàng
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaClock className="text-[#049DBF] mr-1" /> Giao hàng nhanh chóng
          </span>
          <span className="flex items-center gap-1 text-gray-700 whitespace-nowrap">
            <FaTag className="text-[#049DBF] mr-1" /> Giá siêu rẻ
          </span>
        </div>
      </div>
    </div>
  );
};

export default MobileSubHeader;
