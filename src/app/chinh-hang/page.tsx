"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const PaymentGuidePage = () => {
  return (
    <div className="bg-gray-50">
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-indigo-600 to-blue-700 text-white overflow-hidden">
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
                  WECARE GROUP
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                Hướng Dẫn Thanh Toán
              </h2>
              <p className="text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
                Hướng dẫn chi tiết các quy định và phương thức thanh toán để đảm bảo xử lý đơn hàng nhanh chóng, minh bạch.
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Payment Content */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">HƯỚNG DẪN THANH TOÁN</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 mx-auto mb-8"></div>
                <p className="text-gray-600 text-lg">
                  Để đảm bảo quá trình thanh toán, xử lý đơn hàng và giao nhận hàng hóa được thực hiện thuận lợi, nhanh chóng và minh bạch, Wecare Group đề nghị Quý khách tuân thủ các hướng dẫn sau.
                </p>
              </div>

              <div className="prose prose-lg max-w-none">
                <div className="space-y-8">
                  {/* 1. Quy định thanh toán */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Quy định thanh toán</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Quý khách vui lòng thanh toán <strong>100% giá trị đơn hàng</strong> trước khi tiến hành giao hàng và trước thời điểm Wecare Group phát hành hóa đơn.</li>
                      <li>Khoản thanh toán chỉ được xem là hoàn tất khi số tiền đã được ghi có vào tài khoản chính thức của Wecare Group.</li>
                      <li>Quý khách không thanh toán tiền mặt trực tiếp cho nhân viên kinh doanh để tránh rủi ro và đảm bảo quyền lợi.</li>
                    </ul>
                  </div>

                  {/* 2. Hình thức thanh toán */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Hình thức thanh toán</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Hiện nay, Wecare Group áp dụng phương thức chuyển khoản qua ngân hàng tại Việt Nam. Vui lòng chuyển khoản theo thông tin bên dưới và kiểm tra kỹ trước khi chuyển.
                    </p>
                    <div className="bg-gray-100 rounded p-4 text-sm">
                      <p><strong>THÔNG TIN CHUYỂN KHOẢN</strong></p>
                      <p>Tên chủ tài khoản: <strong>CÔNG TY CỔ PHẦN WECARE GROUP</strong></p>
                      <p>Số tài khoản: <strong>228704070009898</strong></p>
                      <p>Ngân hàng: <strong>HDBank</strong></p>
                    </div>
                    <p className="text-gray-700 text-sm mt-3"><strong>Lưu ý:</strong> Quý khách vui lòng kiểm tra kỹ thông tin tài khoản trước khi chuyển để tránh nhầm lẫn.</p>
                  </div>

                  {/* 3. Xác nhận thanh toán & giao hàng */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Xác nhận thanh toán & giao hàng</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Sau khi chuyển khoản thành công, Quý khách vui lòng chụp lại biên lai/mã giao dịch và gửi cho chúng tôi qua Zalo OA để được xác nhận.</li>
                      <li>Khi Wecare Group nhận được thông báo ghi có từ ngân hàng, chúng tôi sẽ xác nhận đơn hàng và thông báo thời gian giao hàng cụ thể.</li>
                      <li>Công ty không chịu trách nhiệm cho trường hợp chuyển nhầm hoặc sai thông tin tài khoản.</li>
                    </ul>
                  </div>

                  {/* Contact & Addresses */} 
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Liên hệ & Thông tin</h3>
                    <div className="text-gray-700 space-y-2">
                      <p><strong>WECARE GROUP _ SIÊU THỊ CÔNG NGHIỆP</strong></p>
                      <p>☎ Hotline: 037 833 9009 - 0934 794 477 - 0823 871 339</p>
                      <p>🌐 Website: <a href="https://wecare.com.vn" className="text-blue-600">https://wecare.com.vn</a></p>
                      <p>📞 Zalo OA: <a href="https://zalo.me/wecare" className="text-blue-600">https://zalo.me/wecare</a></p>
                      <p>🏚 Trụ sở chính: Lô B39, Khu Công nghiệp Phú Tài, Phường Quy Nhơn Bắc, Tỉnh Gia Lai.</p>
                      <p>🏚 Chi nhánh HCM: 14-16-18-20, Đường 36, P. Bình Phú, Q6, TP.Hồ Chí Minh.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back to Home */}
              <div className="text-center mt-8">
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
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

      <Footer />
    </div>
  );
};

export default PaymentGuidePage;


