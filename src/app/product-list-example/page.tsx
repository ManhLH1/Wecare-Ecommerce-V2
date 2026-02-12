"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import ProductListByGroup from "../product-list/_components/ProductListByGroup/ProductListByGroup";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getItem } from "@/utils/SecureStorage";

export default function ProductListExamplePage() {
  const [loading, setLoading] = useState(true);
  const [productGroups, setProductGroups] = useState<any>({ data: {}, pagination: null });
  const [currentPage, setCurrentPage] = useState(1);
  
  const doiTuong = getItem("customerGroupIds");
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/getProductsOnly?page=${currentPage}&pageSize=10`);
        setProductGroups(response.data);
        
        if (Object.keys(response.data.data).length === 0) {
          toast.info("Không tìm thấy sản phẩm nào", {
            position: "top-right",
            autoClose: 2000
          });
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Lỗi khi tải dữ liệu sản phẩm", {
          position: "top-right",
          autoClose: 3000
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Global styles to match ProductDetailPopup */}
      <style jsx global>{`
        /* Card styling */
        .product-card {
          transition: all 0.3s ease;
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }
        
        .product-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }
        
        /* Button styling to match ProductDetailPopup */
        button {
          background-color: #e1f5fe !important;
          color: #0277bd !important;
          border: 1px solid #b3e5fc !important;
          transition: all 0.2s ease;
          border-radius: 6px;
        }
        
        button:hover {
          background-color: #b3e5fc !important;
        }

        button[disabled] {
          background-color: #e5e7eb !important;
          color: #9ca3af !important;
          border-color: #d1d5db !important;
          cursor: not-allowed;
        }
        
        /* Group header styling */
        .bg-gray-50 {
          background-color: white !important;
        }
        
        /* Product details styling */
        .product-details {
          padding: 12px 16px;
        }
        
        .product-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.95rem;
          line-height: 1.4;
        }
        
        .product-spec {
          display: flex;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }
        
        .product-spec .label {
          font-weight: 500;
          color: #64748b;
          min-width: 80px;
        }
        
        .product-price {
          font-weight: 600;
          color: #0277bd;
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }
        
        /* Image container styling */
        .product-image-container {
          position: relative;
          width: 100%;
          padding-top: 100%;
          background-color: #f9fafb;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .product-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 12px;
          transition: transform 0.3s ease;
        }

        .product-image:hover {
          transform: scale(1.05);
        }
        
        /* Pagination styling */
        .pagination-btn {
          background-color: white !important;
          color: #0277bd !important;
          border: 1px solid #e5e7eb !important;
        }
        
        .pagination-btn.active {
          background-color: #e1f5fe !important;
          border-color: #b3e5fc !important;
        }
        
        /* Promotion info */
        .promotion-info {
          margin-top: 8px;
          padding: 8px 12px;
          background-color: #e1f5fe;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #0277bd;
          border: 1px solid rgba(179, 229, 252, 0.5);
        }
        
        /* Group header tweaks */
        .bg-gray-50 {
          background-color: white !important;
          border-bottom: 1px solid #e5e7eb;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 6px;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      
      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-200">
          Danh mục sản phẩm
        </h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <div className="mt-4 text-sm text-gray-600 text-center">Đang tải dữ liệu sản phẩm...</div>
            </div>
          </div>
        ) : Object.keys(productGroups.data).length > 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            {/* Product list wrapper */}
            <div className="product-list-wrapper">
              <ProductListByGroup
                data={productGroups.data}
                pagination={productGroups.pagination}
                onPageChange={handlePageChange}
              />
            </div>
            
            {/* Additional product navigation section styled like ProductDetailPopup */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/50">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="text-sm text-gray-600">
                  Hiển thị {productGroups.pagination?.currentPage || 1} / {productGroups.pagination?.totalPages || 1} trang
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="px-4 py-2 text-sm rounded-md"
                  >
                    Quay lại trang chủ
                  </button>
                  <button 
                    onClick={() => window.location.href = '/product-list'}
                    className="px-4 py-2 text-sm rounded-md no-underline"
                  >
                    Xem tất cả sản phẩm
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-10 border border-gray-200 rounded-lg bg-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <p className="text-gray-700 text-center mb-2 text-lg">Không tìm thấy sản phẩm nào phù hợp</p>
            <p className="text-gray-500 text-sm text-center mb-4">Vui lòng thử lại với các điều kiện tìm kiếm khác</p>
            <button 
              onClick={() => setCurrentPage(1)} 
              className="mt-2 px-4 py-2 rounded-md"
            >
              Quay lại trang đầu
            </button>
          </div>
        )}
      </div>
      
      {/* ScrollToTop button with ProductDetailPopup styling */}
      <div className="fixed bottom-4 right-4 z-10">
        <button 
          onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} 
          className="p-3 rounded-full shadow-md hover:shadow-lg border transition-all"
          aria-label="Cuộn lên đầu trang"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
      
      <ToastContainer 
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
      />
    </div>
  );
} 