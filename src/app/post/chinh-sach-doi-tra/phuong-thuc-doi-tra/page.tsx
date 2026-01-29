"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';
import { ChevronLeftIcon, HomeIcon } from '@heroicons/react/24/solid';

const ExchangeMethodDetailPage = () => {
  return (
    <div className="bg-gray-50">
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-green-600 to-emerald-700 text-white overflow-hidden">
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
                  PHƯƠNG THỨC TRẢ HOẶC ĐỔI HÀNG
                </h1>
              </div>
              <p className="text-lg md:text-xl text-green-100 max-w-3xl mx-auto leading-relaxed">
                Hướng dẫn chi tiết các bước và phương thức để bạn có thể đổi hoặc trả hàng một cách thuận tiện.
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
              <span className="text-gray-900">Phương thức trả hoặc đổi hàng</span>
            </li>
          </ol>
        </nav>

        {/* Main Content */}
        <section className="py-12 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              {/* 1. Quy trình đổi trả */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Quy trình đổi trả hàng</h3>
                    <p className="text-gray-700 mb-6">
                      Để tiến hành đổi trả sản phẩm, khách hàng vui lòng thực hiện theo các bước sau:
                    </p>

                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6">
                      <div className="flex items-start mb-4">
                        <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-white text-sm font-bold">1</span>
                        </span>
                        <div>
                          <p className="text-green-800 font-medium">Liên hệ với Wecare Group</p>
                          <p className="text-green-700 text-sm mt-1">
                            Liên hệ với Nhân viên kinh doanh phụ trách đơn hàng để kiểm tra điều kiện sản phẩm và điều kiện đổi trả.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-white text-sm font-bold">2</span>
                        </span>
                        <div>
                          <p className="text-green-800 font-medium">Lựa chọn hình thức đổi trả</p>
                          <ul className="text-green-700 text-sm mt-1 space-y-1">
                            <li>• Mang sản phẩm đến trực tiếp tại văn phòng Wecare Group.</li>
                            <li>• Gửi sản phẩm qua đơn vị vận chuyển.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Trường hợp mang đến trực tiếp */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Trường hợp mang đến trực tiếp</h3>
                    <p className="text-gray-700 mb-4">
                      Khách hàng vui lòng mang theo:
                    </p>
                    <ul className="space-y-2 text-gray-700 mb-4">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sản phẩm cần đổi trả (còn nguyên bao bì, tem mác).</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Chứng từ mua hàng (hóa đơn, phiếu bán hàng).</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Giấy tờ tùy thân (CMND/CCCD) để xác minh.</span>
                      </li>
                    </ul>
                    <p className="text-gray-600 text-sm">
                      <strong>Địa chỉ:</strong> Quý khách sẽ được thông báo địa chỉ cụ thể khi liên hệ với nhân viên kinh doanh.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Trường hợp gửi qua đơn vị vận chuyển */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Trường hợp gửi qua đơn vị vận chuyển</h3>
                    <p className="text-gray-700 mb-4">
                      Khi gửi sản phẩm qua đơn vị vận chuyển, quý khách vui lòng lưu ý:
                    </p>
                    <ul className="space-y-3 text-gray-700 mb-6">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span><strong>Đóng gói cẩn thận:</strong> Sử dụng bao bì chống va đập, đảm bảo sản phẩm không bị hư hỏng trong quá trình vận chuyển.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span><strong>Xác nhận tình trạng hàng hóa:</strong> Cùng đơn vị vận chuyển kiểm tra và xác nhận sản phẩm còn nguyên tem niêm phong, nguyên vỏ hộp.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span><strong>Ghi rõ thông tin:</strong> Địa chỉ người nhận, số điện thoại và ghi chú &quot;HÀNG ĐỔI TRẢ&quot;.</span>
                      </li>
                    </ul>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <p className="text-blue-800">
                        <strong>Thời gian phản hồi:</strong> Nếu sản phẩm đáp ứng đủ điều kiện đổi trả, Wecare Group sẽ xác nhận và phản hồi trong vòng <strong>07 ngày làm việc</strong> qua Zalo OA hoặc số điện thoại khách hàng đã cung cấp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Bạn cần hỗ trợ thêm?</h3>
                  <p className="text-gray-600 mb-6">
                    Nếu có bất kỳ thắc mắc nào về phương thức đổi trả hàng, vui lòng liên hệ với chúng tôi.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/lien-he"
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Liên hệ ngay
                    </Link>
                    <Link
                      href="/post/chinh-sach-doi-tra"
                      className="inline-flex items-center px-6 py-3 border-2 border-green-600 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-colors"
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

export default ExchangeMethodDetailPage;
