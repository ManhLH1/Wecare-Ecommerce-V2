"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import axios from 'axios';

interface ProductCard {
  id: string;
  image: string;
  title: string;
  rating?: number;
  price?: string;
  description?: string;
}

interface LatestProductsSectionProps {
  className?: string;
}

const LatestProductsSection: React.FC<LatestProductsSectionProps> = ({ className = "" }) => {
  const [latestProducts, setLatestProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch latest products from API
  useEffect(() => {
    const fetchLatestProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/getLatestProducts");

        // Convert API data to ProductCard format
        const products = (response.data || []).slice(0, 15).map((product: any, index: number) => {
          const rawImage: string = product.cr1bb_imageurlproduct || product.cr1bb_imageurl || '';
          const safeImage = !rawImage || /via\.placeholder\.com/i.test(rawImage)
            ? '/placeholder-image.jpg'
            : rawImage;

          return {
            id: product.crdfd_productsid || `latest-product-${index}`,
            image: safeImage,
            title: product.crdfd_name || 'Sản phẩm mới',
            rating: 4.0, // Mock rating for new products
            description: 'Sản phẩm mới nhất',
            price: 'Liên hệ'
          } as ProductCard;
        });

        setLatestProducts(products);
      } catch (error) {
        console.error("Error fetching latest products:", error);
        // Fallback to mock data if API fails
        setLatestProducts([
          {
            id: 'latest-1',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 1',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-2',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-3',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 3',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-4',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 4',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-5',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 5',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-6',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 6',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-7',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 7',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-8',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 8',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestProducts();
  }, []);

  return (
    <section className={`bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl mx-2 md:mx-0 mb-6 shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-200/50 ${className}`}>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent mb-2">
              Sản phẩm mới
            </h2>
            <p className="text-sm text-gray-600 font-medium">15+ sản phẩm mới nhất 1</p>
          </div>
          <Link href="/new-arrivals" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            Xem thêm
          </Link>
        </div>

        <div className="space-y-8">
          {loading ? (
            // Loading skeleton
            <div className="space-y-8">
              <div className="animate-pulse">
                <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg h-5 mb-6 w-56"></div>
                <div className="grid grid-cols-2 gap-6">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-md">
                      <div className="h-28 md:h-32 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse"></div>
                      <div className="p-4">
                        <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded h-4 w-4/5 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="animate-pulse">
                <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg h-5 mb-2 w-32"></div>
                <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg h-4 mb-6 w-64"></div>
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-md">
                  <div className="h-24 md:h-28 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse"></div>
                  <div className="p-4">
                    <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded h-4 w-3/4 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : latestProducts.length > 0 ? (
            <>
              {/* First Section: Products added today */}
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-3"></div>
                  <p className="text-lg font-semibold text-gray-800">{latestProducts.length}+ sản phẩm mới nhất</p>
                </div>

                {/* Product Grid 2x2 */}
                <div className="grid grid-cols-2 gap-6">
                  {latestProducts.slice(0, 4).map((product) => (
                    <div key={product.id} className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200/50 hover:border-blue-300/50">
                      <div className="relative h-28 md:h-32 p-4 bg-gradient-to-br from-gray-50 to-white">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          className="object-contain group-hover:scale-110 transition-transform duration-500 ease-out"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-image.jpg';
                          }}
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      {/* Product info below image */}
                      <div className="p-4 bg-white flex flex-col items-center">
                        <h4 className="text-sm text-gray-800 font-semibold truncate leading-tight group-hover:text-blue-600 transition-colors duration-300 text-center">
                          {product.title}
                        </h4>
                        <div className="flex items-center mt-2 justify-center">
                          <div className="flex space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500 ml-2">4.5</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Second Section: New this week */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-3"></div>
                  <h3 className="text-lg font-semibold text-gray-800">Mới tuần này</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6 font-medium">Chỉ sản phẩm từ nhà cung cấp đã xác minh</p>
                {latestProducts.length > 4 ? (
                  <div className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200/50 hover:border-green-300/50">
                    <div className="relative h-24 md:h-28 p-4 bg-gradient-to-br from-gray-50 to-white">
                      <Image
                        src={latestProducts[4].image}
                        alt={latestProducts[4].title}
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-image.jpg';
                        }}
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    {/* Product info below image */}
                    <div className="p-4 bg-white flex flex-col items-center">
                      <h4 className="text-sm text-gray-800 font-semibold truncate leading-tight group-hover:text-green-600 transition-colors duration-300 text-center">
                        {latestProducts[4].title}
                      </h4>
                      <div className="flex items-center mt-2 justify-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Đã xác minh
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200/50 hover:border-green-300/50">
                    <div className="relative h-24 md:h-28 p-4 bg-gradient-to-br from-gray-50 to-white">
                      <Image
                        src="/placeholder-image.jpg"
                        alt="Sản phẩm mới"
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-500 ease-out"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    {/* Product info below image */}
                    <div className="p-4 bg-white flex flex-col items-center">
                      <h4 className="text-sm text-gray-800 font-semibold truncate leading-tight group-hover:text-green-600 transition-colors duration-300 text-center">
                        Sản phẩm mới
                      </h4>
                      <div className="flex items-center mt-2 justify-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Đã xác minh
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2">Không có sản phẩm mới nào</p>
              <p className="text-sm text-gray-400">Hãy quay lại sau để xem sản phẩm mới</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LatestProductsSection;
