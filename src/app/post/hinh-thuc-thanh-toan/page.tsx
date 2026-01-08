"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const PaymentMethodsPage = () => {
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
                  HÌNH THỨC THANH TOÁN
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                An toàn - Minh bạch - Thuận tiện
              </h2>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Wecare Group cam kết mang đến trải nghiệm thanh toán an toàn,
                minh bạch và thuận tiện nhất cho mọi khách hàng.
              </p>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Introduction */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Chính sách thanh toán của Wecare Group</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 shadow-lg">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-body">
                      Để mang đến trải nghiệm giao dịch an toàn, minh bạch và thuận tiện, Wecare Group áp dụng phương thức thanh toán chuyển khoản ngân hàng cho toàn bộ đơn hàng.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Methods Details */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              {/* 1. Payment Method */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Hình thức thanh toán</h3>
                    <p className="text-body mb-4">
                      Quý khách vui lòng thanh toán 100% giá trị đơn hàng trước khi giao hàng và trước khi Wecare Group phát hành hóa đơn.
                    </p>
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-green-800 font-medium">Xác nhận thanh toán thành công:</p>
                          <p className="text-green-700 text-sm">
                            Khoản thanh toán được xem là xác nhận thành công khi số tiền được ghi có vào tài khoản của Wecare Group.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Order Processing Procedure */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Quy trình xử lý đơn hàng</h3>
                    <ul className="space-y-3 text-body mb-4">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sau khi thanh toán được xác nhận, Wecare Group sẽ tiến hành chuẩn bị hàng hóa theo đúng đơn đặt hàng.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Hàng hóa sẽ được giao đến Quý khách đúng thời gian, địa điểm đã thống nhất, đảm bảo nhanh chóng và đúng cam kết.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. Bank Transfer Information */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Thông tin chuyển khoản</h3>
                    <p className="text-body mb-6">
                      Hiện nay, Wecare Group – Siêu Thị Công Nghiệp hỗ trợ thanh toán chuyển khoản qua các ngân hàng tại Việt Nam.
                    </p>

                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">THÔNG TIN TÀI KHOẢN NGÂN HÀNG</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Ngân hàng</div>
                          <div className="font-semibold text-gray-900">………………………………………</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Chi nhánh</div>
                          <div className="font-semibold text-gray-900">………………………………………</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Số tài khoản</div>
                          <div className="font-semibold text-gray-900">………………………………………</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Chủ tài khoản</div>
                          <div className="font-semibold text-gray-900">………………………………………</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mt-6">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className="text-amber-800 font-medium">Lưu ý quan trọng:</p>
                          <p className="text-amber-700 text-sm">
                            Quý khách vui lòng ghi rõ nội dung chuyển khoản (tên đơn vị hoặc mã đơn hàng) để chúng tôi có thể xác nhận nhanh chóng và hỗ trợ kịp thời.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mt-4">
                      <p className="text-blue-800 text-sm italic">
                        * Ghi chú: thông tin tài khoản ngân hàng sẽ được cập nhật sau
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Cần hỗ trợ thanh toán?</h2>
              <p className="text-lg text-gray-600 mb-8">
                Nếu Quý khách gặp khó khăn trong việc thanh toán hoặc có thắc mắc về quy trình,
                đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ 24/7.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/lien-he"
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Liên hệ hỗ trợ
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/thong-tin-thanh-toan-cong-ty"
                  className="inline-flex items-center px-8 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-300"
                >
                  Thông tin thanh toán công ty
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
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

export default PaymentMethodsPage;
