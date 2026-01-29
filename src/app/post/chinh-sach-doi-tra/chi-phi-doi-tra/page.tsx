"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';
import { ChevronLeftIcon, HomeIcon } from '@heroicons/react/24/solid';

const ReturnCostDetailPage = () => {
  return (
    <div className="bg-gray-50">
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-amber-600 to-orange-700 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative container-responsive py-16 md:py-20">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center mb-6">
                <Image
                  src={LogoSvg}
                  alt="Wecare Logo"
                  width={64}
                  height={64}
                  className="object-contain mr-4"
                />
                <h1 className="text-3xl md:text-4xl font-bold tracking-wider">
                  CHI PHÍ LIÊN QUAN ĐẾN ĐỔI TRẢ
                </h1>
              </div>
              <p className="text-lg md:text-xl text-amber-100 max-w-3xl mx-auto leading-relaxed">
                Thông tin về các chi phí phát sinh và chính sách miễn phí vận chuyển khi đổi trả hàng.
              </p>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Breadcrumb */}
        <nav
          className="max-w-6xl mx-auto px-4 py-4"
          aria-label="Breadcrumb"
        >
          <ol className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <li className="inline-flex items-center">
              <Link
                href="/"
                className="block no-underline inline-flex items-center hover:text-gray-700 transition-colors"
              >
                <HomeIcon className="w-5 h-5 mr-1 text-gray-400" />
                Trang chủ
              </Link>
            </li>
            <li>
              <ChevronLeftIcon className="w-4 h-4 text-gray-400" />
            </li>
            <li>
              <Link
                href="/post/chinh-sach-doi-tra"
                className="block no-underline hover:text-blue-600 transition-colors"
              >
                Chính sách đổi trả
              </Link>
            </li>
            <li>
              <ChevronLeftIcon className="w-4 h-4 text-gray-400" />
            </li>
            <li>
              <span className="text-gray-900">Chi phí liên quan đến đổi trả</span>
            </li>
          </ol>
        </nav>

        {/* Main Content */}
        <section className="py-12 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              {/* 1. Miễn phí vận chuyển */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Miễn phí vận chuyển đổi trả</h3>
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <p className="text-green-800 font-medium text-lg">MIỄN PHÍ VẬN CHUYỂN TOÀN QUỐC</p>
                          <p className="text-green-700 mt-2">
                            Wecare Group hỗ trợ miễn phí vận chuyển toàn quốc đối với tất cả đơn hàng đổi trả. Quý khách sẽ không phát sinh bất kỳ chi phí giao hàng nào trong quá trình đổi trả.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700">
                      Điều này áp dụng cho cả trường hợp sản phẩm giao sai, giao thiếu hoặc sản phẩm bị lỗi do nhà sản xuất. Wecare Group sẽ chịu hoàn toàn chi phí vận chuyển để mang sản phẩm mới đến cho quý khách hoặc nhận lại sản phẩm cần đổi trả.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Chi phí phát sinh */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Chi phí khách hàng cần chịu</h3>
                    <p className="text-gray-700 mb-4">
                      Trong một số trường hợp, khách hàng có thể phải chịu các chi phí sau:
                    </p>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span><strong>Phí đóng gói đặc biệt:</strong> Nếu sản phẩm cần đóng gói đặc biệt để vận chuyển an toàn (không phải lỗi của Wecare Group).</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span><strong>Phí bảo hiểm hàng hóa:</strong> Đối với các sản phẩm có giá trị cao cần bảo hiểm trong quá trình vận chuyển.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span><strong>Phí gửi trả lại:</strong> Nếu sản phẩm gửi về không đạt điều kiện đổi trả, khách hàng chịu chi phí để Wecare Group gửi trả lại sản phẩm.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. Trường hợp sản phẩm không đạt điều kiện */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Sản phẩm không đạt điều kiện đổi trả</h3>
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-6">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className="text-red-800 font-medium">Trường hợp sản phẩm gửi về không đạt điều kiện đổi trả:</p>
                          <p className="text-red-700 text-sm mt-1">
                            Khách hàng chịu chi phí để Wecare Group gửi trả lại sản phẩm. Chi phí này sẽ được thông báo trước khi gửi trả.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700">
                      Vì vậy, trước khi gửi sản phẩm đổi trả, quý khách nên liên hệ với nhân viên kinh doanh để xác nhận sản phẩm có đáp ứng điều kiện đổi trả hay không, tránh phát sinh chi phí không cần thiết.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Thanh toán chênh lệch */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Thanh toán chênh lệch giá trị</h3>
                    <p className="text-gray-700 mb-4">
                      Khi đổi sản phẩm sang sản phẩm có giá trị cao hơn:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Khách hàng thanh toán phần chênh lệch giá trị sản phẩm.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Phương thức thanh toán: Tiền mặt, chuyển khoản hoặc thẻ tín dụng.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Bạn cần hỗ trợ thêm?</h3>
                  <p className="text-gray-600 mb-6">
                    Nếu có bất kỳ thắc mắc nào về chi phí đổi trả hàng, vui lòng liên hệ với chúng tôi.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/lien-he"
                      className="inline-flex items-center px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Liên hệ ngay
                    </Link>
                    <Link
                      href="/post/chinh-sach-doi-tra"
                      className="inline-flex items-center px-6 py-3 border-2 border-amber-600 text-amber-600 font-semibold rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      Quay lại
                    </Link>
                  </div>
                </div>
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

export default ReturnCostDetailPage;
