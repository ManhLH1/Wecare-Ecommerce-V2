"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';
import { ChevronLeftIcon, HomeIcon } from '@heroicons/react/24/solid';

const ReturnPolicyDetailPage = () => {
  return (
    <div className="bg-gray-50">
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white overflow-hidden">
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
                  ĐIỀU KIỆN ĐỔI TRẢ HÀNG
                </h1>
              </div>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Tìm hiểu các điều kiện cần thiết để được đổi trả sản phẩm trong vòng 10 ngày kể từ ngày nhận hàng.
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
              <span className="text-gray-900">Điều kiện đổi trả hàng</span>
            </li>
          </ol>
        </nav>

        {/* Main Content */}
        <section className="py-12 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              {/* 1. Điều kiện cụ thể */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Điều kiện cụ thể</h3>
                    <p className="text-gray-700 mb-6">
                      Sản phẩm đủ điều kiện đổi trả là sản phẩm đáp ứng đầy đủ các yêu cầu dưới đây và không thuộc danh mục sản phẩm không hỗ trợ đổi trả của Wecare Group.
                    </p>

                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6">
                      <ul className="space-y-3 text-green-700">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Sản phẩm được yêu cầu đổi trả trong vòng <strong>10 ngày</strong> (xác nhận theo dấu bưu điện hoặc đơn vị vận chuyển) kể từ ngày khách hàng nhận hàng.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Sản phẩm còn nguyên trạng như khi nhận, nguyên vẹn tem mác, bao bì và phụ kiện đi kèm (hộp, túi, linh kiện, sách hướng dẫn…).</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Có chứng từ mua hàng hợp lệ (phiếu bán hàng, hóa đơn, thông tin đơn hàng).</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Quà tặng khuyến mãi có giá trị (nếu có) phải được hoàn trả đầy đủ.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Sản phẩm không bị dơ bẩn, nứt vỡ, hư hỏng, trầy xước, biến dạng, có mùi lạ hoặc dấu hiệu đã qua sử dụng.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Sản phẩm còn trong bao bì có dán mã sản phẩm của Wecare Group.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Các trường hợp được chấp nhận đổi trả */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Các trường hợp được chấp nhận đổi trả</h3>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sản phẩm bị giao sai, giao thiếu phụ kiện, thiếu hàng.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sản phẩm bị hư hỏng, vỡ trong quá trình vận chuyển.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sản phẩm lỗi kỹ thuật do nhà sản xuất.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sản phẩm giao nhầm mẫu mã, màu sắc so với đơn đặt hàng.</span>
                      </li>
                    </ul>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mt-6">
                      <p className="text-blue-800 font-medium mb-2">Lưu ý quan trọng:</p>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Sản phẩm đổi lại phải có giá trị bằng hoặc cao hơn sản phẩm cần đổi.</li>
                        <li>• Trường hợp Wecare Group giao sai sản phẩm, công ty sẽ đổi lại miễn phí.</li>
                        <li>• Mỗi sản phẩm chỉ được đổi trả 01 lần.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Sản phẩm không được đổi trả */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Sản phẩm không được đổi trả</h3>
                    <p className="text-gray-700 mb-4">
                      Một số sản phẩm không nằm trong danh mục hỗ trợ đổi trả của Wecare Group:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="text-red-500 mr-3 mt-1">×</span>
                        <span>Sản phẩm đã quá thời hạn 10 ngày kể từ ngày nhận hàng.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-3 mt-1">×</span>
                        <span>Sản phẩm đã qua sử dụng, có dấu hiệu hư hỏng do lỗi của khách hàng.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-3 mt-1">×</span>
                        <span>Sản phẩm không còn nguyên tem mác, bao bì, phụ kiện đi kèm.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-3 mt-1">×</span>
                        <span>Sản phẩm khuyến mãi, giá đặc biệt.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Bạn cần hỗ trợ thêm?</h3>
                  <p className="text-gray-600 mb-6">
                    Nếu có bất kỳ thắc mắc nào về điều kiện đổi trả hàng, vui lòng liên hệ với chúng tôi.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/lien-he"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Liên hệ ngay
                    </Link>
                    <Link
                      href="/post/chinh-sach-doi-tra"
                      className="inline-flex items-center px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
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

export default ReturnPolicyDetailPage;
