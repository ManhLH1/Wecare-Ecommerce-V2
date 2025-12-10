"use client";

import React from 'react';
import JDStyleHeader from '@/components/JDStyleHeader';
import Footer from '@/components/footer';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header giống trang home */}
      <JDStyleHeader 
        cartItemsCount={0}
        onSearch={() => {}}
        onCartClick={() => {}}
      />

      {/* Main Content - Loading Section với khoảng cách từ header */}
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 pt-32">
        <div className="w-full max-w-2xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            {/* Spinner với kích thước lớn hơn */}
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-[#04A1B3] animate-spin" />
            </div>
            
            {/* Text với typography đẹp hơn */}
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-gray-800">Đang tải dữ liệu</h2>
              <p className="text-gray-600 leading-relaxed">
                Hệ thống đang xử lý yêu cầu của bạn<br />
                Vui lòng chờ trong giây lát...
              </p>
            </div>

            {/* Progress indicator đơn giản */}
            <div className="mt-8 flex justify-center">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[#04A1B3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#04A1B3] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#04A1B3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}