'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import PromotionProductsPopup from '@/components/PromotionProductsPopup';

interface PromotionGroup {
  productGroupId: string;
  productGroupName: string;
  productGroupCode: string;
  imageUrl?: string;
  productCount?: number;
  minPrice?: number;
}

export default function CustomerPromotions({ params }: { params: { customerId: string } }) {
  const [promotionGroups, setPromotionGroups] = useState<PromotionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PromotionGroup | null>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const response = await axios.get(`/api/getPromotionProducts?customerId=${params.customerId}`);
        setPromotionGroups(Array.isArray(response.data.promotionGroups) ? response.data.promotionGroups : []);
      } catch (err) {
        setError('Không thể tải dữ liệu khuyến mãi. Vui lòng thử lại sau.');
        console.error('Error fetching promotions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [params.customerId]);

  const handleGroupClick = (group: PromotionGroup) => {
    setSelectedGroup(group);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-100 py-8">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 bg-gradient-to-r from-blue-50 to-white rounded-xl px-6 py-4 shadow-sm border border-blue-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full border border-gray-200 shadow-sm overflow-hidden">
              <Image
                src="/Logo-Wecare.png"
                alt="Wecare Logo"
                width={56}
                height={56}
                className="object-contain"
              />
            </div>
            <span className="w-2 h-2 bg-blue-400 rounded-full mx-2"></span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-700 uppercase tracking-wide text-center">
              SẢN PHẨM KHUYẾN MÃI
            </h1>
          </div>
          <div className="bg-gradient-to-r from-yellow-100 to-orange-50 px-6 py-3 rounded-xl border border-yellow-200 flex items-center gap-3 shadow-sm">
            <span className="text-2xl">🎉</span>
            <p className="text-yellow-800 font-semibold text-base">Giảm giá 3% cho tất cả sản phẩm</p>
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/70">
            <div className="flex space-x-2 mb-4">
              <span className="inline-block w-4 h-4 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.32s]"></span>
              <span className="inline-block w-4 h-4 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.16s]"></span>
              <span className="inline-block w-4 h-4 bg-blue-300 rounded-full animate-bounce"></span>
            </div>
            <span className="text-lg font-semibold text-blue-700">Đang tải dữ liệu...</span>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-center p-3 bg-red-50 rounded-lg text-sm max-w-lg mx-auto">
            {error}
          </div>
        )}

        {!loading && !error && (
          promotionGroups.length > 0 ? (
            <section className="bg-gradient-to-br from-blue-50 via-white to-yellow-50 rounded-2xl shadow-lg px-4 sm:px-8 py-8 mb-8 border border-blue-100">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {Array.isArray(promotionGroups) && promotionGroups.map((group) => (
                  <div
                    key={group.productGroupId}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-blue-200 group"
                    onClick={() => handleGroupClick(group)}
                  >
                    <div className="aspect-[4/3] relative bg-white flex items-center justify-center border-b border-gray-50">
                      <Image
                        src={group.imageUrl || '/placeholder-product.jpg'}
                        alt={group.productGroupName}
                        fill
                        className="object-contain p-4"
                      />
                      <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow">-3%</div>
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                      <h2 className="font-bold text-base text-gray-800 truncate group-hover:text-blue-600 transition-colors mb-1">
                        {group.productGroupName}
                      </h2>
                      <span className="text-base font-semibold text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded shadow-sm border border-red-100 whitespace-nowrap mb-1">
                        <svg width='18' height='18' fill='currentColor' className='text-red-400' viewBox='0 0 20 20'><path d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-13v2H9V5a1 1 0 112 0zm-1 4a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm0 6a1 1 0 100-2 1 1 0 000 2z'/></svg>
                        Giá chỉ từ {group.minPrice ? Math.round(group.minPrice * 0.97).toLocaleString('vi-VN') + 'đ' : '---'}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                          <svg width='16' height='16' fill='currentColor' className='text-yellow-500' viewBox='0 0 20 20'><path d='M10 2a1 1 0 01.894.553l1.382 2.803 3.09.449a1 1 0 01.554 1.707l-2.236 2.18.528 3.08a1 1 0 01-1.451 1.054L10 13.347l-2.767 1.459a1 1 0 01-1.451-1.054l.528-3.08-2.236-2.18a1 1 0 01.554-1.707l3.09-.449L9.106 2.553A1 1 0 0110 2z'/></svg>
                          {group.productCount} sản phẩm
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="bg-gradient-to-br from-blue-100 via-white to-yellow-100 rounded-2xl shadow-xl px-8 py-12 border border-blue-200 flex flex-col items-center max-w-md w-full">
                <div className="animate-bounce mb-6">
                  <svg width="72" height="72" fill="none" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="36" fill="#E0E7FF" />
                    <path d="M24 46c0-5.522 8.955-10 20-10s20 4.478 20 10" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
                    <ellipse cx="36" cy="32" rx="10" ry="12" fill="#DBEAFE" />
                    <ellipse cx="36" cy="32" rx="5" ry="6" fill="#60A5FA" />
                    <path d="M30 38c1.5 2 6.5 2 8 0" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center drop-shadow-sm">Hiện chưa có nhóm sản phẩm mới nào</h2>
                <p className="text-gray-600 text-base mb-6 text-center">Bạn hãy quay lại sau để xem các chương trình khuyến mãi mới nhất nhé!</p>
                <a href="/" className="inline-block bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold px-6 py-2 rounded-full shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200">Về trang chủ</a>
              </div>
            </div>
          )
        )}

        {selectedGroup && (
          <PromotionProductsPopup
            isOpen={!!selectedGroup}
            onClose={() => setSelectedGroup(null)}
            groupCode={selectedGroup.productGroupCode}
            groupName={selectedGroup.productGroupName}
          />
        )}
      </div>
    </div>
  );
}


