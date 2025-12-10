"use client";
import React, { useEffect, useState, useCallback, Suspense } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { getItem } from '@/utils/SecureStorage';
import { formatDateToDDMMYYYY } from '@/utils/utils';
import { useCart } from '@/components/CartManager';
import AddToCartWithPromotion from '@/components/AddToCartWithPromotion';
import img from '../app/promotion.png';
import Link from 'next/link';

interface Promotion {
  promotionId: string;
  crdfd_name: string;
  cr1bb_startdate: string;
  cr1bb_enddate: string;
  cr1bb_urlimage: string;
  products: any[];
  crdfd_value: string;
  value2?: string;
  soluongapdung: number;
  congdonsoluong: boolean;
  cr1bb_vn: "191920000" | "191920001";
}

// PromotionImage component
const PromotionImage = ({ cr1bb_urlimage, handleImageError, imageError }: {
  cr1bb_urlimage: string;
  handleImageError: () => void;
  imageError: boolean;
}) => {
  return (
    <>
      {cr1bb_urlimage ? (
        <>
          <div className="relative w-full h-48">
            <Image
              src={cr1bb_urlimage}
              alt="Promotion"
              fill
              className="object-cover rounded-lg"
              onError={handleImageError}
            />
          </div>
          {imageError && <p>Không thể tải hình ảnh</p>}
        </>
      ) : (
        <div className="relative w-full h-48">
          <Image
            src={img}
            alt="Promotion"
            fill
            className="object-cover rounded-lg"
          />
        </div>
      )}
    </>
  );
};

const PromotionsSection = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPromotionId, setExpandedPromotionId] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const { cartItems } = useCart();

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const convertedCartItems = cartItems.map(item => ({
    ...item,
    productId: item.crdfd_productsid,
    productName: item.crdfd_name,
    crdfd_productsid: item.crdfd_productsid,
    crdfd_name: item.crdfd_name,
    price: Number(item.price) || 0,
    quantity: item.quantity,
    promotionId: item.promotionId,
    isApplyPromotion: item.promotionId ? true : false,
    promotion: item.promotion ? {
      ...item.promotion,
      appliedValue: item.promotion.appliedValue?.toString(),
      isValue2Applied: item.promotion.isValue2Applied,
      soluongapdung: item.promotion.soluongapdung,
      soluongcondon: item.promotion.soluongcondon
    } : undefined
  }));

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const customerId = getItem("id");
        const response = await axios.get(`/api/getPromotionData?id=${customerId}&includeImage=true`);
        setPromotions(response.data);
      } catch (err) {
        console.error('Error fetching promotions:', err);
        setError('Failed to load promotions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  if (promotions.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        Không có khuyến mãi nào
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-end mb-8">
          <Link 
            href="/promotion"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-full hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 no-underline"
          >
            Xem tất cả
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {promotions.slice(0, 6).map((promotion) => {
            const convertedPromotion = {
              promotionId: promotion.promotionId,
              soluongapdung: promotion.soluongapdung || 0,
              value: Number(promotion.crdfd_value),
              value2: promotion.value2 ? Number(promotion.value2) : undefined,
              congdonsoluong: promotion.congdonsoluong || false,
              vn: promotion.cr1bb_vn
            };

            return (
              <div
                key={promotion.promotionId}
                className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <Suspense fallback={
                  <div className="relative w-full h-48">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded-t-xl"></div>
                  </div>
                }>
                  <Link href={`/promotion/detail/${promotion.promotionId}`} className="block">
                    <PromotionImage
                      cr1bb_urlimage={promotion.cr1bb_urlimage}
                      handleImageError={handleImageError}
                      imageError={imageError}
                    />
                  </Link>
                </Suspense>
                
                <div className="p-6">
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
                      Khuyến mãi
                    </span>
                  </div>
                  <Link href={`/promotion/detail/${promotion.promotionId}`} className="no-underline">
                    <h3 className="text-xl font-bold mb-2 text-gray-800 group-hover:text-blue-600 transition-colors duration-300 cursor-pointer">
                      {promotion.crdfd_name}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-600 mb-4">
                    Thời gian: {formatDateToDDMMYYYY(promotion.cr1bb_startdate)} - {formatDateToDDMMYYYY(promotion.cr1bb_enddate)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedPromotionId(expandedPromotionId === promotion.promotionId ? null : promotion.promotionId)}
                      className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-full hover:bg-blue-100 transition-all duration-300"
                    >
                      {expandedPromotionId === promotion.promotionId ? 'Ẩn chi tiết' : 'Xem nhanh'}
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-2 transform transition-transform duration-300 ${expandedPromotionId === promotion.promotionId ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <Link
                      href={`/promotion/detail/${promotion.promotionId}`}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-full hover:from-blue-700 hover:to-cyan-600 transition-all duration-300"
                    >
                      Xem chi tiết
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                  
                  {expandedPromotionId === promotion.promotionId && (
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      {promotion.products?.map((product, index) => (
                        <AddToCartWithPromotion
                          key={index}
                          product={{
                            productId: product.crdfd_productsid,
                            productName: product.crdfd_name,
                            price: Number(product.price),
                            promotionId: promotion.promotionId,
                            crdfd_gtgt: Number(promotion.crdfd_value)
                          }}
                          promotions={[convertedPromotion]}
                          currentCartItems={convertedCartItems}
                          onAddToCart={() => {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PromotionsSection; 