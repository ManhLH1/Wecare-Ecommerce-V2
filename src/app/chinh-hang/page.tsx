"use client";
import React from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import JDStyleHeader from "@/components/JDStyleHeader";
import JDStyleMainContent from "@/components/JDStyleMainContent";

const PaymentGuidePage: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col overflow-x-hidden">
      {/* JD Style Layout */}
      <div className="bg-white">
        {/* Header with Search */}
        <JDStyleHeader
          cartItemsCount={0}
          onSearch={() => {}}
          onCartClick={() => {}}
        />

        {/* Main Layout */}
        <div className="w-full max-w-[2560px] mx-auto pt-[115px] px-4">
          <div className="flex flex-col lg:flex-row">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <main className="w-full max-w-[2560px] mx-auto pt-0 px-4">

                {/* Page Header */}
                <section className="py-8 md:py-12">
                  <div className="text-center">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 uppercase">
                      HƯỚNG DẪN THANH TOÁN
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-6"></div>
                    <p className="text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                      Hướng dẫn chi tiết các quy định và phương thức thanh toán để đảm bảo xử lý đơn hàng nhanh chóng, minh bạch.
                    </p>
                  </div>
                </section>

                {/* Payment Content */}
                <section className="pb-12">
                  <div className="mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl px-4 sm:px-6 lg:px-8">

                  <div className="space-y-10">
                    {/* 1. Quy định thanh toán */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        1. Quy định thanh toán
                      </h3>
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed">
                        <ul className="space-y-3 ml-6">
                          <li>• Quý khách vui lòng thanh toán <strong className="text-blue-600">100% giá trị đơn hàng</strong> trước khi tiến hành giao hàng và trước thời điểm Wecare Group phát hành hóa đơn.</li>
                          <li>• Khoản thanh toán chỉ được xem là hoàn tất khi số tiền đã được ghi có vào tài khoản chính thức của Wecare Group.</li>
                          <li>• Quý khách không thanh toán tiền mặt trực tiếp cho nhân viên kinh doanh để tránh rủi ro và đảm bảo quyền lợi.</li>
                        </ul>
                      </div>
                    </div>

                    {/* 2. Hình thức thanh toán */}
                    <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        2. Hình thức thanh toán
                      </h3>
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
                        <p>Hiện nay, Wecare Group áp dụng phương thức chuyển khoản qua ngân hàng tại Việt Nam. Vui lòng chuyển khoản theo thông tin bên dưới và kiểm tra kỹ trước khi chuyển.</p>

                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-4 sm:p-6">
                          <h4 className="text-xl font-bold text-blue-800 mb-4 uppercase text-center">THÔNG TIN CHUYỂN KHOẢN</h4>
                          <div className="space-y-3 text-center">
                            <p className="text-lg"><strong className="text-gray-900">Tên chủ tài khoản:</strong> <span className="text-blue-600 font-semibold">CÔNG TY CỔ PHẦN WECARE GROUP</span></p>
                            <p className="text-lg"><strong className="text-gray-900">Số tài khoản:</strong> <span className="text-red-600 font-bold text-xl">228704070009898</span></p>
                            <p className="text-lg"><strong className="text-gray-900">Ngân hàng:</strong> <span className="text-green-600 font-semibold">HDBank</span></p>
                          </div>
                        </div>

                        <p className="font-semibold text-red-600">⚠️ Lưu ý: Quý khách vui lòng kiểm tra kỹ thông tin tài khoản trước khi chuyển để tránh nhầm lẫn.</p>
                      </div>
                    </div>

                    {/* 3. Xác nhận thanh toán & giao hàng */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        3. Xác nhận thanh toán & giao hàng
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed">
                        <ul className="space-y-3 ml-6">
                          <li>• Sau khi chuyển khoản thành công, Quý khách vui lòng chụp lại biên lai/mã giao dịch và gửi cho chúng tôi qua Zalo OA để được xác nhận.</li>
                          <li>• Khi Wecare Group nhận được thông báo ghi có từ ngân hàng, chúng tôi sẽ xác nhận đơn hàng và thông báo thời gian giao hàng cụ thể.</li>
                          <li>• <strong className="text-red-600">Công ty không chịu trách nhiệm cho trường hợp chuyển nhầm hoặc sai thông tin tài khoản.</strong></li>
                        </ul>
                      </div>
                    </div>

                    {/* Contact & Addresses */}
                    <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        Liên hệ & Thông tin
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed space-y-4">
                        <div className="text-center mb-6">
                          <p className="text-2xl font-bold text-blue-600 mb-4">WECARE GROUP _ SIÊU THỊ CÔNG NGHIỆP</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                <span className="text-white text-sm">📞</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">Hotline:</p>
                                <p className="text-blue-600 font-medium">037 833 9009 - 0934 794 477 - 0823 871 339</p>
                              </div>
                            </div>

                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                <span className="text-white text-sm">🌐</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">Website:</p>
                                <a href="https://wecare.com.vn" className="text-blue-600 hover:text-blue-800 font-medium" target="_blank" rel="noopener noreferrer">https://wecare.com.vn</a>
                              </div>
                            </div>

                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                <span className="text-white text-sm">📱</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">Zalo OA:</p>
                                <a href="https://zalo.me/wecare" className="text-blue-600 hover:text-blue-800 font-medium" target="_blank" rel="noopener noreferrer">https://zalo.me/wecare</a>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-start">
                              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                                <span className="text-white text-sm">🏢</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">Trụ sở chính:</p>
                                <p className="text-gray-700">Lô B39, Khu Công nghiệp Phú Tài,<br />Phường Quy Nhơn Bắc, Tỉnh Gia Lai.</p>
                              </div>
                            </div>

                            <div className="flex items-start">
                              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                                <span className="text-white text-sm">🏢</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">Chi nhánh HCM:</p>
                                <p className="text-gray-700">14-16-18-20, Đường 36,<br />P. Bình Phú, Q6, TP.Hồ Chí Minh.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back to Home */}
                    <div className="text-center mt-8 px-4 sm:px-6">
                      <Link
                        href="/"
                        className="w-full md:inline-flex md:w-auto justify-center items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Về trang chủ
                      </Link>
                    </div>
                  </div>
                  </div>
                </section>
              </main>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PaymentGuidePage;


