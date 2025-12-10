import React, { useState } from 'react';

interface ProductDetailDialogProps {
  product?: {
    name: string;
    groupName: string;
    code: string;
    groupCode: string;
    brand: string;
    spec: string;
    finish: string;
    price: number;
    unit: string;
    imageUrl?: string;
    priceRange?: { min: number; max: number };
  };
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: any, quantity: number) => void;
}

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart
}) => {
  const [quantity, setQuantity] = useState(1);

  if (!isOpen || !product) return null;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    onClose();
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString() + ' đ';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">{product.groupName}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Product Image */}
          <div className="md:col-span-1">
            <div className="relative pt-[100%] bg-gray-100 rounded-lg">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="absolute top-0 left-0 w-full h-full object-contain p-2"
                  onError={(e) => {
                    const imgElement = e.target as HTMLImageElement;
                    imgElement.src = '/images/no-image.png';
                  }}
                />
              ) : (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                  <span className="text-gray-400">Không có hình ảnh</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="md:col-span-2">
            <h1 className="text-xl font-bold text-gray-800 mb-3">
              {product.name}
            </h1>

            {product.priceRange && (
              <p className="text-sm text-gray-600 mb-3">
                {formatPrice(product.priceRange.min)} - {formatPrice(product.priceRange.max)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
              <div className="col-span-2 sm:col-span-1">
                <span className="text-sm text-gray-600">Mã Nhóm:</span>
                <span className="text-sm ml-2">{product.groupCode}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-sm text-gray-600">Mã sản phẩm:</span>
                <span className="text-sm ml-2">{product.code}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-sm text-gray-600">Thương hiệu:</span>
                <span className="text-sm ml-2">{product.brand}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-sm text-gray-600">Quy cách:</span>
                <span className="text-sm ml-2">{product.spec}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-sm text-gray-600">Hoàn thiện:</span>
                <span className="text-sm ml-2">{product.finish}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-sm text-gray-600">Giá:</span>
                <span className="text-sm ml-2 font-semibold">{formatPrice(product.price)}</span>
              </div>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center">
              <div className="flex items-center border rounded-md mb-3 sm:mb-0 mr-0 sm:mr-4">
                <button 
                  onClick={() => handleQuantityChange(-1)}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100"
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
                  className="w-12 text-center border-x py-1"
                />
                <button 
                  onClick={() => handleQuantityChange(1)}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full sm:w-auto px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                Thêm vào giỏ
              </button>
            </div>

            {/* Total Price */}
            <div className="mt-4 text-right">
              <span className="text-gray-600">Tổng:</span>
              <span className="ml-2 text-lg font-bold">{formatPrice(product.price * quantity)}</span>
            </div>
          </div>
        </div>

        {/* Product Variants Table */}
        <div className="px-4 pb-4">
          <h3 className="text-md font-semibold mb-2">Sản phẩm cùng nhóm</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-50 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider border-b">
                    Tên sản phẩm
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider border-b">
                    Quy cách
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider border-b">
                    Hoàn thiện
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider border-b">
                    Giá bán
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50 bg-blue-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                    {product.name}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {product.spec}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {product.finish}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right">
                    {formatPrice(product.price)}/{product.unit}
                  </td>
                </tr>
                {/* Example variants - would be replaced with actual data */}
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    {product.name.replace(product.spec, '12F')}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    12F
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {product.finish}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    {formatPrice(product.price + 1000)}/{product.unit}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailDialog; 