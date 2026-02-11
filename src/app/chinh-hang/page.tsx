"use client";
import React from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import JDStyleHeader from "@/components/JDStyleHeader";

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
        <div className="w-full max-w-[2560px] mx-auto pt-[115px]">
          <div className="flex flex-col lg:flex-row">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <main className="w-full max-w-[2560px] mx-auto pt-0">

                {/* Page Header */}
                <section className="py-8 md:py-12">
                  <div className="text-center">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 uppercase">
                      HƯỚNG DẪN THANH TOÁN
                    </h1>
                    <div className="w-24 h-1 bg-blue-600 mx-auto mb-6"></div>
                    <p className="text-lg md:text-xl text-gray-600 max-w-[1400px] mx-auto leading-relaxed">
                      Hướng dẫn chi tiết các quy định và phương thức thanh toán để đảm bảo xử lý đơn hàng nhanh chóng, minh bạch.
                    </p>
                  </div>
                </section>

                {/* Payment Content */}
                <section className="pb-12 px-4 sm:px-6 lg:px-8">
                  <div className="mx-auto w-full max-w-[1800px]">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">

                      {/* Nội dung chính */}
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
                        <p className="font-semibold text-xl text-gray-900">1. Quy định thanh toán:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Quý khách vui lòng thanh toán <strong>100% giá trị đơn hàng</strong> trước khi tiến hành giao hàng.</li>
                          <li>Khoản thanh toán chỉ được xem là hoàn tất khi số tiền đã được ghi có vào tài khoản chính thức của Wecare Group.</li>
                          <li>Quý khách không thanh toán tiền mặt trực tiếp cho nhân viên kinh doanh để tránh rủi ro.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">2. Hình thức thanh toán:</p>
                        <p className="mb-3">Wecare Group áp dụng phương thức chuyển khoản qua ngân hàng tại Việt Nam.</p>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
                          <h4 className="text-xl font-bold text-gray-900 mb-4 uppercase text-center">THÔNG TIN CHUYỂN KHOẢN</h4>
                          <div className="space-y-3 text-center">
                            <p className="text-lg"><strong className="text-gray-900">Tên chủ tài khoản:</strong> <span className="font-semibold">CÔNG TY CỔ PHẦN WECARE GROUP</span></p>
                            <p className="text-lg"><strong className="text-gray-900">Số tài khoản:</strong> <span className="font-bold text-xl">228704070009898</span></p>
                            <p className="text-lg"><strong className="text-gray-900">Ngân hàng:</strong> <span className="font-semibold">HDBank</span></p>
                          </div>
                        </div>

                        <p className="font-semibold text-gray-900">⚠️ Lưu ý: Quý khách vui lòng kiểm tra kỹ thông tin tài khoản trước khi chuyển.</p>

                        <p className="font-semibold text-xl text-gray-900">3. Xác nhận thanh toán & giao hàng:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Sau khi chuyển khoản thành công, chụp lại biên lai/mã giao dịch và gửi qua Zalo OA để được xác nhận.</li>
                          <li>Khi Wecare Group nhận được thông báo ghi có từ ngân hàng, chúng tôi sẽ xác nhận đơn hàng và thông báo thời gian giao hàng cụ thể.</li>
                          <li><strong>Công ty không chịu trách nhiệm cho trường hợp chuyển nhầm hoặc sai thông tin tài khoản.</strong></li>
                        </ul>
                      </div>
                    </div>

                    {/* Contact & Addresses - text thuần, tránh bị tách trang */}
                    <div
                      className="mt-8 bg-white p-0 text-base md:text-lg text-gray-800 leading-relaxed"
                      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                    >
                      <p className="text-2xl font-bold text-gray-900 mb-2">WECARE GROUP _ SIÊU THỊ CÔNG NGHIỆP</p>
                      <p>- Hotline: 037 833 9009 - 0934 794 477 - 0823 871 339</p>
                      <p>- Website: https://wecare.com.vn</p>
                      <p>- Zalo OA: https://zalo.me/wecare</p>
                      <p>- Trụ sở chính: Lô B39, Khu Công nghiệp Phú Tài, Phường Quy Nhơn Bắc, Tỉnh Gia Lai.</p>
                      <p>- Chi nhánh HCM: 14-16-18-20, Đường 36, P. Bình Phú, Q6, TP. Hồ Chí Minh.</p>
                    </div>

                    {/* Back to Home */}
                    <div className="text-center mt-8">
                      <Link
                        href="/"
                        className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Về trang chủ
                      </Link>
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
