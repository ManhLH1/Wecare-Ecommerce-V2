'use client';

import { useEcommerceTracking } from '@/hooks/useGTM';
import { useState } from 'react';

// Ví dụ component sử dụng GTM tracking
export default function GTMExample() {
  const { trackProductView, trackAddToCart, trackSearch } = useEcommerceTracking();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock product data
  const mockProduct = {
    id: 'PROD-001',
    name: 'Sản phẩm mẫu',
    category: 'Điện tử',
    price: 1000000
  };

  const handleProductClick = () => {
    // Track khi user xem chi tiết sản phẩm
    trackProductView(
      mockProduct.id,
      mockProduct.name,
      mockProduct.category,
      mockProduct.price
    );
  };

  const handleAddToCart = () => {
    // Track khi user thêm vào giỏ hàng
    trackAddToCart(
      mockProduct.id,
      mockProduct.name,
      mockProduct.category,
      mockProduct.price,
      1
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Track khi user tìm kiếm
      trackSearch(searchTerm);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">GTM Tracking Example</h2>
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm sản phẩm..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
        >
          Tìm kiếm
        </button>
      </form>

      {/* Product Card */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">{mockProduct.name}</h3>
        <p className="text-gray-600 mb-2">Danh mục: {mockProduct.category}</p>
        <p className="text-green-600 font-bold mb-4">
          {mockProduct.price.toLocaleString('vi-VN')} VNĐ
        </p>
        
        <div className="space-y-2">
          <button
            onClick={handleProductClick}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
          >
            Xem chi tiết (Track Product View)
          </button>
          
          <button
            onClick={handleAddToCart}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
          >
            Thêm vào giỏ hàng (Track Add to Cart)
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <h4 className="font-semibold text-blue-800 mb-2">Hướng dẫn test:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. Mở Developer Tools (F12)</li>
          <li>2. Vào tab Console</li>
          <li>3. Click các button để xem events được track</li>
          <li>4. Kiểm tra window.dataLayer để xem data</li>
        </ul>
      </div>
    </div>
  );
}
