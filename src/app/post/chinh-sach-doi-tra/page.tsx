"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';
import PromotionCard, { PromotionData } from '@/components/PromotionCard';

const promotions: PromotionData[] = [
  {
    id: 'dieu-kien-doi-tra',
    title: 'Điều kiện đổi trả hàng',
    shortDescription: 'Tìm hiểu các điều kiện cần thiết để được đổi trả sản phẩm trong vòng 10 ngày kể từ ngày nhận hàng.',
    color: 'bg-blue-100 text-blue-600',
    bgGradient: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    href: '/post/chinh-sach-doi-tra/dieu-kien-doi-tra',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'phuong-thuc-doi-tra',
    title: 'Phương thức trả hoặc đổi hàng',
    shortDescription: 'Hướng dẫn chi tiết các bước và phương thức để bạn có thể đổi hoặc trả hàng một cách thuận tiện.',
    color: 'bg-green-100 text-green-600',
    bgGradient: 'bg-gradient-to-br from-green-50 to-emerald-50',
    href: '/post/chinh-sach-doi-tra/phuong-thuc-doi-tra',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: 'chi-phi-doi-tra',
    title: 'Chi phí liên quan đến đổi trả',
    shortDescription: 'Thông tin về các chi phí phát sinh và chính sách miễn phí vận chuyển khi đổi trả hàng.',
    color: 'bg-amber-100 text-amber-600',
    bgGradient: 'bg-gradient-to-br from-amber-50 to-orange-50',
    href: '/post/chinh-sach-doi-tra/chi-phi-doi-tra',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
  },
  {
    id: 'hoan-tien-doi-hang',
    title: 'Hoàn tiền hoặc đổi hàng',
    shortDescription: 'Quy trình xử lý hoàn tiền và đổi hàng nhanh chóng, đảm bảo quyền lợi khách hàng.',
    color: 'bg-purple-100 text-purple-600',
    bgGradient: 'bg-gradient-to-br from-purple-50 to-pink-50',
    href: '/post/chinh-sach-doi-tra/hoan-tien-doi-hang',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
];

const ReturnPolicyPromotionsPage = () => {
  return (
    <div className="bg-gray-50">
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative container-responsive py-16 md:py-24">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center mb-6">
                <Image
                  src={LogoSvg}
                  alt="Wecare Logo"
                  width={64}
                  height={64}
                  className="object-contain mr-4"
                />
                <h1 className="text-4xl md:text-5xl font-bold tracking-wider">
                  CHÍNH SÁCH ĐỔI TRẢ
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                An tâm mua sắm - Bảo vệ quyền lợi
              </h2>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Wecare Group cam kết bảo vệ quyền lợi khách hàng với chính sách
                đổi trả linh hoạt trong vòng 10 ngày kể từ ngày nhận hàng.
              </p>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Promotions Grid */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Các chính sách đổi trả</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Khám phá các chính sách đổi trả hàng của Wecare Group để hiểu rõ quyền lợi của bạn khi mua sắm.
                </p>
              </div>

              {/* Promotions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {promotions.map((promotion) => (
                  <PromotionCard key={promotion.id} promotion={promotion} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Cần hỗ trợ đổi trả?</h2>
              <p className="text-lg text-gray-600 mb-8">
                Nếu Quý khách có thắc mắc về chính sách đổi trả hoặc cần hỗ trợ xử lý đơn hàng,
                đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ 24/7.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/lien-he"
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Liên hệ hỗ trợ
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/san-pham"
                  className="inline-flex items-center px-8 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-300"
                >
                  Tiếp tục mua sắm
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Toolbar />
      <Footer />
    </div>
  );
};

export default ReturnPolicyPromotionsPage;
