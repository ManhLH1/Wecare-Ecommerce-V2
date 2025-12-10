import React from "react";
import { FaTimes, FaTags, FaStar, FaHeart, FaPhone, FaEnvelope, FaMapMarkerAlt, FaUser, FaShoppingCart, FaGift, FaNewspaper, FaFlag, FaClipboardList, FaCog, FaSignOutAlt } from "react-icons/fa";
import Link from "next/link";
import { getItem, removeItem } from "@/utils/SecureStorage";
import CategoryMenu from "./CategoryMenu";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryToggle: () => void;
  categoryHierarchy: any;
  categoryGroups: any[];
  loadingCategory: boolean;
  onCategorySelect: (item: any) => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  onCategoryToggle,
  categoryHierarchy,
  categoryGroups,
  loadingCategory,
  onCategorySelect,
}) => {
  const userType = getItem("type");
  const userName = getItem("name");
  const userEmail = getItem("email");

  const handleLogout = () => {
    removeItem("id");
    removeItem("name");
    removeItem("email");
    removeItem("type");
    removeItem("token");
    window.location.href = "/login";
  };

  return (
    <>
      {/* Enhanced Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 animate-fadeIn"
          onClick={onClose}
        />
      )}

      {/* Enhanced Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-all duration-300 ease-out flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Enhanced Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 p-6 relative">
            {/* Decorative wave */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-white" style={{
              clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 50%)'
            }} />
            
            {/* Logo and Title */}
            <div className="flex items-center gap-3 mb-4">
              <Link href="/" className="flex items-center gap-3 no-underline">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 bg-teal-600 rounded-lg"></div>
                  </div>
                </div>
                <div>
                  <span className="text-xl font-bold block" style={{ color: 'white' }}>WECARE</span>
                  <span className="text-sm text-white/80" style={{ textDecoration: 'none' }}>Siêu thị công nghiệp</span>
                </div>
              </Link>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 text-white hover:scale-110"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Enhanced Navigation Menu - Scrollable */}
        <div className="flex-1 overflow-y-auto menu-scroll min-h-0">
          <div className="p-4 space-y-4">
            {/* Quick Access - Danh mục */}
            <div className="mb-6">
              <button
                onClick={() => {
                  onCategoryToggle();
                  onClose();
                }}
                className="group flex items-center gap-4 w-full p-4 rounded-2xl hover:bg-teal-50 transition-all duration-300 text-gray-700 hover:text-gray-900 hover:shadow-md no-underline border border-teal-200"
                style={{ textDecoration: 'none' }}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 group-hover:scale-110 transition-all duration-300 shadow-md">
                  <FaTags className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-base" style={{ textDecoration: 'none' }}>Danh mục sản phẩm</span>
                  <p className="text-sm text-gray-500 mt-1" style={{ textDecoration: 'none' }}>Xem tất cả danh mục</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                </div>
              </button>
            </div>

            {/* Main Navigation */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 px-2" style={{ textDecoration: 'none' }}>Menu chính</h3>
              
              <Link href="/" className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-300 text-gray-700 hover:text-gray-900 no-underline" onClick={onClose}>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 transition-all duration-300 shadow-md">
                  <FaNewspaper className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-medium" style={{ textDecoration: 'none' }}>Trang chủ</span>
                  <p className="text-xs text-gray-500 mt-1" style={{ textDecoration: 'none' }}>Trang chủ chính</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
              </Link>

              <Link href="/san-pham" className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-300 text-gray-700 hover:text-gray-900 no-underline" onClick={onClose}>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 group-hover:scale-110 transition-all duration-300 shadow-md">
                  <FaShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-medium" style={{ textDecoration: 'none' }}>Sản phẩm</span>
                  <p className="text-xs text-gray-500 mt-1" style={{ textDecoration: 'none' }}>Danh sách sản phẩm</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
              </Link>

              <Link href="/promotion" className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-300 text-gray-700 hover:text-gray-900 no-underline" onClick={onClose}>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 group-hover:scale-110 transition-all duration-300 shadow-md">
                  <FaGift className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-medium" style={{ textDecoration: 'none' }}>Khuyến mãi</span>
                  <p className="text-xs text-gray-500 mt-1" style={{ textDecoration: 'none' }}>Ưu đãi đặc biệt</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                </div>
              </Link>

              <Link href="/tuyen-dung" className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-300 text-gray-700 hover:text-gray-900 no-underline" onClick={onClose}>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 group-hover:scale-110 transition-all duration-300 shadow-md">
                  <FaFlag className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-medium" style={{ textDecoration: 'none' }}>Tuyển dụng</span>
                  <p className="text-xs text-gray-500 mt-1" style={{ textDecoration: 'none' }}>Cơ hội nghề nghiệp</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                </div>
              </Link>

              <Link href="/post" className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-300 text-gray-700 hover:text-gray-900 no-underline" onClick={onClose}>
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 group-hover:scale-110 transition-all duration-300 shadow-md">
                  <FaClipboardList className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-medium" style={{ textDecoration: 'none' }}>Tin tức</span>
                  <p className="text-xs text-gray-500 mt-1" style={{ textDecoration: 'none' }}>Tin tức & sự kiện</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Local styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out;
        }

        /* Custom scrollbar for mobile */
        .menu-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
        }
        
        .menu-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .menu-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .menu-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 3px;
        }
        
        .menu-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.5);
        }

        /* Ensure content is scrollable */
        .min-h-0 {
          min-height: 0;
        }

        /* Touch optimization for mobile */
        @media (max-width: 768px) {
          .menu-scroll {
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
          }
        }
      `}</style>
    </>
  );
};

export default MobileSidebar;
