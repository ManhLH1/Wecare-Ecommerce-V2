import React, { useState } from 'react';
import { CustomProduct } from './product-table-component';

interface ProductDetailSectionProps {
  product: CustomProduct;
  onClose: () => void;
  onAddToCart?: (product: CustomProduct, quantity: number) => void;
}

const ProductDetailSection: React.FC<ProductDetailSectionProps> = ({
  product,
  onClose,
  onAddToCart
}) => {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
    onClose();
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="bg-white p-6 border rounded-md shadow-sm my-4">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-medium text-gray-900">{product.name}</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 hover:bg-gray-100 transition-all"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Details */}
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2 sm:col-span-1">
              <span className="text-sm font-medium text-gray-600">Quy cách:</span>
              <span className="text-sm ml-2 text-gray-800">{product.spec || "N/A"}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-sm font-medium text-gray-600">Hoàn thiện:</span>
              <span className="text-sm ml-2 text-gray-800">{product.finish || "N/A"}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-sm font-medium text-gray-600">Đơn vị:</span>
              <span className="text-sm ml-2 text-gray-800">{product.unit || "Cái"}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-sm font-medium text-gray-600">Đơn giá:</span>
              <span className="text-sm ml-2 font-semibold text-blue-700">{formatPrice(product.pricePerUnit)}/{product.unit}</span>
            </div>
          </div>
        </div>

        {/* Quantity and Add to Cart */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Số lượng:</label>
            <div className="flex items-center border rounded-md">
              <button 
                onClick={() => handleQuantityChange(-1)}
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 bg-white border-r transition-colors"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <input 
                type="text"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1) {
                    setQuantity(val);
                  }
                }}
                className="w-16 text-center py-1 bg-white"
                aria-label="Quantity"
              />
              <button 
                onClick={() => handleQuantityChange(1)}
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 bg-white border-l transition-colors"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
          
          <div className="text-right mb-2">
            <span className="text-sm text-gray-600">Thành tiền:</span>
            <span className="ml-2 text-lg font-bold text-blue-700">{formatPrice(product.pricePerUnit * quantity)}</span>
          </div>
          
          <button
            onClick={handleAddToCart}
            className="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50"
          >
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailSection; 