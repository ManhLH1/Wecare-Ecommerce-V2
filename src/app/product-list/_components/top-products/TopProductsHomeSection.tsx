import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Product from '@/model/Product';
import { useToast } from "@/hooks/useToast";
import { TOAST_MESSAGES } from "@/types/toast";

interface TopProductsHomeSectionProps {
  onAddToCart: (product: Product) => void;
  limit?: number;
}

export default function TopProductsHomeSection({ onAddToCart, limit = 5 }: TopProductsHomeSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/getTop30ProductsWithPromotion');
        const data = await response.json();
        setProducts(data.slice(0, limit));
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit]);

  const handleAddToCart = (product: Product) => {
    try {
      onAddToCart(product);
      success(TOAST_MESSAGES.SUCCESS.ADD_TO_CART);
    } catch (err) {
      error(TOAST_MESSAGES.ERROR.ADD_TO_CART);
    }
  };

  if (loading) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => (
        <div
          key={product.crdfd_productsid}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
        >
          <div className="relative aspect-square">
            <Image
              src={product.cr1bb_imageurlproduct || '/placeholder.png'}
              alt={product.crdfd_name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            />
            {product.promotion && (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-medium">
                -{product.promotion.crdfd_value}%
              </div>
            )}
          </div>
          <div className="p-4 flex flex-col items-center text-center">
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
              {product.crdfd_name}
            </h3>
            <div className="space-y-1">
              {product.promotion ? (
                <>
                  <p className="text-red-600 font-semibold">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(Number(product.cr1bb_giaban) * (1 - Number(product.promotion.crdfd_value) / 100))}
                  </p>
                  <p className="text-gray-500 text-sm line-through">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(Number(product.cr1bb_giaban))}
                  </p>
                </>
              ) : (
                <p className="text-gray-900 font-semibold">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND'
                  }).format(Number(product.cr1bb_giaban))}
                </p>
              )}
            </div>
            <button
              onClick={() => handleAddToCart(product)}
              className="mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-colors duration-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              Thêm vào giỏ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 