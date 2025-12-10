import React, { useState } from 'react';

export interface CustomProduct {
  id: string;
  name: string;
  spec: string;
  finish: string;
  pricePerUnit: number;
  unit: string;
  detail?: boolean;
  image?: string;
}

interface ProductTableComponentProps {
  products: CustomProduct[];
  onSelectProduct?: (product: CustomProduct) => void;
  renderDetailComponent?: (product: CustomProduct) => React.ReactNode;
}

// Sample data for demo purposes
export const sampleProducts: CustomProduct[] = [
  {
    id: 'prod1',
    name: 'Đinh đóng gỗ DK 12F sắt không xi',
    spec: '12F',
    finish: 'không xi',
    pricePerUnit: 22100,
    unit: 'Kg'
  },
  {
    id: 'prod2',
    name: 'Đinh đóng gỗ DK 10F sắt không xi',
    spec: '10F',
    finish: 'không xi',
    pricePerUnit: 22100,
    unit: 'Kg'
  }
];

export const ProductTableComponent: React.FC<ProductTableComponentProps> = ({ 
  products, 
  onSelectProduct,
  renderDetailComponent
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const handleRowClick = (product: CustomProduct) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    
    // Toggle selected product
    setSelectedProductId(prevId => prevId === product.id ? null : product.id);
  };

  const formatPrice = (price: number, unit: string) => {
    return `${price.toLocaleString('vi-VN')} đ/${unit}`;
  };

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tên sản phẩm
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quy cách
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hoàn thiện
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Giá bán
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <React.Fragment key={product.id}>
              <tr 
                className={`hover:bg-gray-50 cursor-pointer ${selectedProductId === product.id ? 'bg-blue-50' : ''}`}
                onClick={() => handleRowClick(product)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.spec}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.finish}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatPrice(product.pricePerUnit, product.unit)}
                </td>
              </tr>
              {selectedProductId === product.id && renderDetailComponent && (
                <tr>
                  <td colSpan={4} className="p-0 border-0">
                    {renderDetailComponent(product)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTableComponent; 