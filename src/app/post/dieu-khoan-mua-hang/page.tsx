"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const PurchaseTermsPage = () => {
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
                  ĐIỀU KHOẢN MUA HÀNG
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                Cam kết minh bạch - Uy tín - Chuyên nghiệp
              </h2>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Wecare Group cam kết đảm bảo quyền lợi tối đa cho khách hàng
                thông qua các điều khoản mua hàng minh bạch và rõ ràng.
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
                <h2 className="title-section text-center mb-6">Điều khoản mua hàng của Wecare Group</h2>
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
                      Khi Quý khách đặt mua sản phẩm tại Wecare Group, chúng tôi hiểu rằng Quý khách đã tin tưởng lựa chọn giải pháp từ một đối tác uy tín. Vì vậy, các điều khoản sau đây được áp dụng nhằm đảm bảo quyền lợi và sự minh bạch trong toàn bộ quá trình hợp tác:
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Purchase Terms Details */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              {/* 1. Payment Obligations */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Nghĩa vụ thanh toán</h3>
                    <p className="text-body mb-4">
                      Quý khách vui lòng thực hiện thanh toán đúng thời hạn đã thỏa thuận tại đơn đặt hàng hoặc hợp đồng mua bán.
                    </p>
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className="text-amber-800 font-medium">Lưu ý quan trọng:</p>
                          <p className="text-amber-700 text-sm">
                            Trong trường hợp phát sinh chậm thanh toán so với thời hạn cam kết, phần dư nợ quá hạn sẽ áp dụng mức lãi 3%/tháng, với thời gian tính lãi tối đa 60 ngày.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Invoice Issuance */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Xuất hóa đơn tài chính</h3>
                    <p className="text-body mb-4">
                      Wecare Group sẽ phát hành hóa đơn GTGT cho Quý khách khi đáp ứng đầy đủ các điều kiện sau:
                    </p>
                    <ul className="space-y-3 text-body mb-4">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Hàng hóa đã được bàn giao đúng theo đơn hàng đã xác nhận</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Hai bên đã đối chiếu và xác nhận công nợ</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Wecare Group đã nhận đủ giá trị thanh toán</span>
                      </li>
                    </ul>
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                      <p className="text-green-800 text-sm">
                        Việc xuất hóa đơn được thực hiện trong thời gian sớm nhất để phục vụ công tác chứng từ của Quý khách.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Scope of Application */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Phạm vi áp dụng</h3>
                    <p className="text-body">
                      Điều khoản này áp dụng cho tất cả các giao dịch mua bán hàng hóa giữa Wecare Group và Quý khách hàng, bao gồm cả giao dịch qua website, qua nhân viên kinh doanh hoặc tại kho hàng.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Priority Terms */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Điều khoản ưu tiên</h3>
                    <p className="text-body mb-4">
                      Trong trường hợp hai bên có ký Hợp đồng nguyên tắc hoặc Hợp đồng mua bán riêng, các điều khoản trong hợp đồng đó sẽ được ưu tiên áp dụng nếu có sự khác biệt so với quy định tại website này.
                    </p>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <p className="text-blue-800 text-sm">
                        <strong>Lưu ý:</strong> Các điều khoản hợp đồng riêng sẽ có giá trị pháp lý cao hơn so với quy định chung trên website.
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
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Cần hỗ trợ thêm?</h2>
              <p className="text-lg text-gray-600 mb-8">
                Nếu Quý khách có bất kỳ thắc mắc nào về điều khoản mua hàng hoặc cần tư vấn thêm,
                đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ 24/7.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/lien-he"
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Liên hệ ngay
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/san-pham"
                  className="inline-flex items-center px-8 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-300"
                >
                  Xem sản phẩm
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

export default PurchaseTermsPage;
