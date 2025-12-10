import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { formatPrice, formatDiscountPercentage } from '@/utils/format';
import { getItem } from "@/utils/SecureStorage";
import { MESSAGES } from "@/constants/constants";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Product {
  crdfd_productsid: string;
  crdfd_name: string;
  crdfd_fullname: string;
  crdfd_masanpham: string;
  crdfd_manhomsp: string;
  cr1bb_nhomsanphamcha: string;
  cr1bb_giaban: string;
  cr1bb_imageurlproduct: string;
  cr1bb_json_gia: any[];
  don_vi_DH?: string;
  crdfd_onvichuantext?: string;
}

interface ProductCatalogProps {
  initialCategory?: string;
  onAddToCart?: (product: any, quantity: number) => void;
  showPrices?: boolean;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({
  initialCategory,
  onAddToCart,
  showPrices = true
}) => {
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // User authentication information
  const Idlogin = getItem("id");
  const typeLogin = getItem("type");
  const selectedCustomerId = getItem("selectedCustomerId");
  const isLoggedIn = !!Idlogin && !!typeLogin;
  const shouldShowPrices = showPrices && isLoggedIn;
  const doiTuong = getItem("customerGroupIds");
  const notifySuccess = useCallback(() => {
    toast.success("Thêm vào giỏ hàng thành công");
  }, []);

  // Error notification
  const notifyError = useCallback(() => {
    toast.error("Số lượng phải lớn hơn 0");
  }, []);

  // Fetch products from API
  const fetchProducts = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        pageSize: 10
      };
      
      if (search) {
        params.fullname = search;
      } else if (initialCategory) {
        params.product_group_Id = initialCategory;
      }
      const response = await axios.get('/api/getProductsOnly', { params });
      setCategories(response.data.data);
      setCurrentPage(response.data.pagination.currentPage);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [initialCategory]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle search
  const handleSearch = useCallback(() => {
    fetchProducts(1, searchTerm);
  }, [fetchProducts, searchTerm]);

  // Handle quantity change
  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  }, []);

  // Select product to view details
  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
  }, []);

  // Close product popup
  const handleClosePopup = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;
    
    if (quantity > 0 && onAddToCart) {
      onAddToCart(selectedProduct, quantity);
      notifySuccess();
      setTimeout(handleClosePopup, 1200);
    } else {
      notifyError();
    }
  }, [selectedProduct, quantity, onAddToCart, notifySuccess, notifyError, handleClosePopup]);

  // Parse price helper
  const parsePrice = useCallback((price: string | number | null | undefined): number => {
    if (typeof price === "number") return price;
    if (typeof price === "string") return parseFloat(price) || 0;
    return 0;
  }, []);

  // Format price for display
  const formatPriceDisplay = useCallback((price: string | number | null | undefined): string => {
    if (!shouldShowPrices) {
      return "Liên hệ CSKH";
    }
    if (price === null || price === undefined || price === 0 || price === "") {
      return "Liên hệ để được báo giá";
    }
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return isNaN(numPrice)
      ? "Liên hệ để được báo giá"
      : `${Math.round(numPrice).toLocaleString()} đ`;
  }, [shouldShowPrices]);

  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer position="top-right" autoClose={2000} />
      
      {/* Search Bar */}
      <div className="mb-6 flex">
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm..."
          className="flex-grow p-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 transition"
          onClick={handleSearch}
        >
          Tìm kiếm
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Product Categories */}
      {!loading && Object.keys(categories).length === 0 && (
        <div className="text-center text-gray-500 py-10">
          Không tìm thấy sản phẩm nào.
        </div>
      )}

      {Object.keys(categories).map((categoryName) => (
        <div key={categoryName} className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
            {categoryName}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories[categoryName].products.map((product: Product) => (
              <div 
                key={product.crdfd_productsid}
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => handleSelectProduct(product)}
              >
                {/* Product Image */}
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  {product.cr1bb_imageurlproduct ? (
                    <img
                      src={product.cr1bb_imageurlproduct}
                      alt={product.crdfd_name}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        const imgElement = e.target as HTMLImageElement;
                        imgElement.src = '/images/no-image.png';
                      }}
                    />
                  ) : (
                    <span className="text-gray-400">Không có hình ảnh</span>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-gray-800 font-medium text-sm line-clamp-2 h-10">
                    {product.crdfd_name}
                  </h3>
                  
                  <div className="mt-2 text-sm">
                    <div className="text-gray-600">
                      Mã: {product.crdfd_masanpham}
                    </div>
                    
                    {shouldShowPrices && parsePrice(product.cr1bb_giaban) > 0 && (
                      <div className="font-semibold text-blue-600 mt-1">
                        {formatPriceDisplay(product.cr1bb_giaban)}
                      </div>
                    )}
                    
                    {(!shouldShowPrices || parsePrice(product.cr1bb_giaban) === 0) && (
                      <div className="font-semibold text-blue-600 mt-1">
                        Liên hệ báo giá
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="flex items-center">
            <button
              onClick={() => fetchProducts(currentPage - 1, searchTerm)}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-l mr-1 disabled:opacity-50"
            >
              Trước
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => fetchProducts(page, searchTerm)}
                className={`px-3 py-1 border mx-1 ${
                  currentPage === page ? 'bg-blue-500 text-white' : ''
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => fetchProducts(currentPage + 1, searchTerm)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-r ml-1 disabled:opacity-50"
            >
              Sau
            </button>
          </nav>
        </div>
      )}
      
      {/* Product Detail Popup */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="relative bg-white px-4 lg:px-8 py-4 lg:py-6 border border-gray-300 rounded-lg">
              <button
                onClick={handleClosePopup}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Product Image */}
                <div className="w-full lg:w-1/3">
                  <div className="relative w-full pt-[100%]">
                    {selectedProduct.cr1bb_imageurlproduct ? (
                      <img
                        src={selectedProduct.cr1bb_imageurlproduct}
                        alt={selectedProduct.crdfd_name}
                        className="absolute top-0 left-0 w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          const imgElement = e.target as HTMLImageElement;
                          imgElement.src = '/images/no-image.png';
                        }}
                        style={{ backgroundColor: '#f3f4f6' }}
                      />
                    ) : (
                      <div className="absolute top-0 left-0 w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400">Không có hình ảnh</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Product Details */}
                <div className="w-full lg:w-2/3">
                  <h2 className="text-lg lg:text-xl font-semibold text-gray-800 mb-2">
                    {selectedProduct.crdfd_name}
                  </h2>
                  
                  <div className="text-sm text-gray-600 mb-4">
                    Mã sản phẩm: {selectedProduct.crdfd_masanpham}
                  </div>
                  
                  <div className="mt-0.5 lg:mt-1.5">
                    {parsePrice(selectedProduct.cr1bb_giaban) === 0 ? (
                      <p className="text-xs lg:text-sm text-gray-700 flex items-center font-inter">
                        <span className="font-semibold min-w-[70px] lg:min-w-[90px]">Giá:</span>
                        <span className="text-blue-600">{MESSAGES.PRODUCT.LIEN_HE_DE_DUOC_BAO_GIA}</span>
                      </p>
                    ) : (
                      <div className="grid gap-0.5">
                        {shouldShowPrices && (
                          <div className="flex items-center">
                            <span className="font-semibold min-w-[70px] lg:min-w-[90px] text-xs lg:text-sm">Giá:</span>
                            <span className="text-xs lg:text-sm">
                              <span className="text-gray-500">{formatPriceDisplay(selectedProduct.cr1bb_giaban)}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Quantity Controls */}
                  <div className="mt-6 flex items-center">
                    <span className="text-sm font-medium text-gray-700 mr-4">Số lượng:</span>
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-l"
                    >
                      -
                    </button>
                    <div className="w-12 h-8 flex items-center justify-center border-t border-b border-gray-300">
                      {quantity}
                    </div>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-r"
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <div className="mt-6">
                    <button
                      onClick={handleAddToCart}
                      className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                      disabled={!shouldShowPrices}
                    >
                      Thêm vào giỏ hàng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog; 