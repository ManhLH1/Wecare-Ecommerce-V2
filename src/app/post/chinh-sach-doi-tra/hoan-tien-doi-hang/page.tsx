"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';
import { ChevronLeftIcon, HomeIcon } from '@heroicons/react/24/solid';

const RefundExchangeDetailPage = () => {
  return (
    <div className="bg-gray-50">
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-purple-600 to-pink-700 text-white overflow-hidden">
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
                  HOÀN TIỀN HOẶC ĐỔI HÀNG
                </h1>
              </div>
              <p className="text-lg md:text-xl text-purple-100 max-w-3xl mx-auto leading-relaxed">
                Quy trình xử lý hoàn tiền và đổi hàng nhanh chóng, đảm bảo quyền lợi khách hàng.
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
              <span className="text-gray-900">Hoàn tiền hoặc đổi hàng</span>
            </li>
          </ol>
        </nav>

        {/* Main Content */}
        <section className="py-12 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              {/* 1. Quy trình đổi hàng */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Quy trình đổi hàng</h3>
                    <p className="text-gray-700 mb-6">
                      Khi sản phẩm đổi trả được chấp nhận, quy trình đổi hàng sẽ được thực hiện như sau:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">1</span>
                          <h4 className="text-blue-800 font-semibold">Xác nhận đổi trả</h4>
                        </div>
                        <p className="text-blue-700 text-sm">
                          Wecare Group xác nhận và thông báo kết quả kiểm tra điều kiện đổi trả qua Zalo OA hoặc điện thoại.
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">2</span>
                          <h4 className="text-blue-800 font-semibold">Chuẩn bị hàng mới</h4>
                        </div>
                        <p className="text-blue-700 text-sm">
                          Wecare Group chuẩn bị sản phẩm thay thế (nếu đổi hàng) và tiến hành giao hàng.
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">3</span>
                          <h4 className="text-blue-800 font-semibold">Giao hàng mới</h4>
                        </div>
                        <p className="text-blue-700 text-sm">
                          Sản phẩm mới được giao đến địa chỉ đã đăng ký mua hàng, miễn phí vận chuyển.
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">4</span>
                          <h4 className="text-blue-800 font-semibold">Nhận lại hàng cũ</h4>
                        </div>
                        <p className="text-blue-700 text-sm">
                          Khách hàng bàn giao sản phẩm cần đổi trả cho nhân viên giao hàng.
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                      <p className="text-green-800 font-medium">
                        Wecare Group sẽ gửi sản phẩm mới tới địa chỉ đã đăng ký mua hàng.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Quy trình hoàn tiền */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Quy trình hoàn tiền</h3>
                    <p className="text-gray-700 mb-6">
                      Khi yêu cầu hoàn tiền được chấp nhận, quy trình sẽ được thực hiện như sau:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">1</span>
                          <h4 className="text-green-800 font-semibold">Xác nhận hoàn tiền</h4>
                        </div>
                        <p className="text-green-700 text-sm">
                          Wecare Group xác nhận yêu cầu hoàn tiền và thông báo cho khách hàng.
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">2</span>
                          <h4 className="text-green-800 font-semibold">Cung cấp thông tin</h4>
                        </div>
                        <p className="text-green-700 text-sm">
                          Khách hàng cung cấp số tài khoản ngân hàng để nhận hoàn tiền.
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">3</span>
                          <h4 className="text-green-800 font-semibold">Xử lý hoàn tiền</h4>
                        </div>
                        <p className="text-green-700 text-sm">
                          Wecare Group tiến hành xử lý hoàn tiền theo số tài khoản khách hàng cung cấp.
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">4</span>
                          <h4 className="text-green-800 font-semibold">Thông báo hoàn tất</h4>
                        </div>
                        <p className="text-green-700 text-sm">
                          Khách hàng nhận được thông báo hoàn thành và kiểm tra tài khoản.
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                      <p className="text-green-800 font-medium">
                        Wecare Group sẽ hoàn tiền theo số tài khoản ngân hàng do khách hàng cung cấp, theo thời gian xử lý của hệ thống thanh toán.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Thời gian xử lý */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Thời gian xử lý</h3>
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-4">
                      <ul className="space-y-2 text-amber-800">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span><strong>Thời gian phản hồi:</strong> Tối đa 07 ngày làm việc kể từ khi nhận được yêu cầu đổi trả.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span><strong>Thời gian nhận hàng:</strong> Không quá 15 ngày kể từ ngày giao hàng thành công.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span><strong>Thời gian hoàn tiền:</strong> 03-07 ngày làm việc sau khi xác nhận hoàn tất (tùy ngân hàng).</span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                      <p className="text-red-800 text-sm font-medium">
                        ⚠️ Trường hợp khách hàng gửi sản phẩm sau 15 ngày, Wecare Group không giải quyết đổi trả.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Đóng gói gửi sản phẩm */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Đóng gói gửi sản phẩm đổi trả</h3>
                    <p className="text-gray-700 mb-4">
                      Khách hàng vui lòng đóng gói sản phẩm hoàn trả theo hướng dẫn sau:
                    </p>
                    <ul className="space-y-2 text-gray-700 mb-4">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sử dụng hộp đóng gói ban đầu hoặc hộp có kích thước phù hợp.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Chèn đầy vật liệu đệm để tránh va đập trong quá trình vận chuyển.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Dán kín bưu kiện và ghi rõ &quot;HÀNG ĐỔI TRẢ&quot;.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Kèm theo chứng từ mua hàng và phiếu yêu cầu đổi trả (nếu có).</span>
                      </li>
                    </ul>
                    <p className="text-gray-600 text-sm">
                      <strong>Địa chỉ gửi:</strong> Sẽ được cung cấp khi liên hệ với nhân viên kinh doanh để xác nhận đổi trả.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Bạn cần hỗ trợ thêm?</h3>
                  <p className="text-gray-600 mb-6">
                    Nếu có bất kỳ thắc mắc nào về quy trình hoàn tiền hoặc đổi hàng, vui lòng liên hệ với chúng tôi.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/lien-he"
                      className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Liên hệ ngay
                    </Link>
                    <Link
                      href="/post/chinh-sach-doi-tra"
                      className="inline-flex items-center px-6 py-3 border-2 border-purple-600 text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
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

export default RefundExchangeDetailPage;
