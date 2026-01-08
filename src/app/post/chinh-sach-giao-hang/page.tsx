"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const ShippingPolicyPage = () => {
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
                  CHÍNH SÁCH GIAO HÀNG
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                Nhanh chóng - An toàn - Đúng hẹn
              </h2>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Wecare Group cam kết mang đến trải nghiệm giao hàng thuận tiện,
                an toàn và đúng thời gian cam kết cho mọi khách hàng.
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
                <h2 className="title-section text-center mb-6">Chính sách giao hàng của Wecare Group</h2>
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
                      Wecare Group luôn nỗ lực mang đến cho Quý khách trải nghiệm mua sắm thuận tiện và nhanh chóng. Chính sách giao hàng dưới đây được áp dụng nhằm đảm bảo việc cung cấp sản phẩm cho Quý khách đúng thời gian và chất lượng cam kết.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Shipping Policy Details */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              {/* 1. Shipping Scope */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Phạm vi giao hàng</h3>
                    <p className="text-body">
                      Wecare Group hỗ trợ giao hàng trên phạm vi toàn quốc, thông qua đội ngũ giao nhận nội bộ hoặc các đơn vị vận chuyển uy tín.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Delivery Time */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Thời gian giao hàng</h3>
                    <p className="text-body mb-4">
                      Thời gian giao hàng phụ thuộc vào:
                    </p>
                    <ul className="space-y-2 text-body mb-4">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span><strong>Địa chỉ nhận hàng:</strong> Vùng miền, khoảng cách địa lý</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span><strong>Tình trạng tồn kho:</strong> Sẵn sàng hoặc cần thời gian chuẩn bị</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span><strong>Yêu cầu giao hàng của đơn đặt hàng:</strong> Thời gian cụ thể theo thỏa thuận</span>
                      </li>
                    </ul>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <p className="text-blue-800">
                        Ngay sau khi xác nhận đơn hàng và hoàn tất thanh toán, chúng tôi sẽ tiến hành chuẩn bị và giao hàng trong thời gian sớm nhất có thể.
                      </p>
                      <p className="text-blue-800 text-sm mt-2">
                        Mọi lịch giao hàng sẽ được thông báo trước để Quý khách chủ động tiếp nhận.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Shipping Cost */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Chi phí giao hàng</h3>
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <p className="text-green-800 font-medium">MIỄN PHÍ VẬN CHUYỂN TOÀN QUỐC</p>
                          <p className="text-green-700 text-sm">
                            Wecare Group hỗ trợ miễn phí vận chuyển toàn quốc đối với tất cả đơn hàng. Quý khách sẽ không phát sinh bất kỳ chi phí giao hàng nào trong suốt quá trình nhận hàng.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Inspection & Handover */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Kiểm tra & bàn giao hàng hóa</h3>
                    <p className="text-body mb-4">
                      Khi nhận hàng, Quý khách vui lòng:
                    </p>
                    <ul className="space-y-3 text-body mb-4">
                      <li className="flex items-start">
                        <span className="text-green-500 mr-3 flex-shrink-0">✔</span>
                        <span>Kiểm tra số lượng, chủng loại, tình trạng sản phẩm</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-3 flex-shrink-0">✔</span>
                        <span>Ký xác nhận vào biên bản giao hàng hoặc chứng từ đi kèm</span>
                      </li>
                    </ul>
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className="text-amber-800 font-medium">Quan trọng:</p>
                          <p className="text-amber-700 text-sm">
                            Nếu phát hiện sản phẩm thiếu, hư hỏng hoặc sai khác so với đơn đặt hàng, Quý khách vui lòng thông báo ngay cho Wecare Group để được hỗ trợ kịp thời.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Transportation Risk */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Rủi ro trong quá trình vận chuyển</h3>
                    <p className="text-body mb-4">
                      Rủi ro và trách nhiệm đối với hàng hóa sẽ được chuyển sang Quý khách kể từ thời điểm ký nhận bàn giao hàng thành công.
                    </p>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <p className="text-blue-800">
                        Trong trường hợp tổn thất xảy ra do quá trình vận chuyển, Wecare Group sẽ phối hợp cùng đơn vị vận chuyển để xử lý thỏa đáng nhằm bảo vệ quyền lợi Quý khách.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Policy Adjustments */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">6. Điều chỉnh chính sách</h3>
                    <p className="text-body mb-4">
                      Chính sách giao hàng có thể được điều chỉnh theo từng thời điểm để phù hợp với thực tế vận hành.
                    </p>
                    <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg">
                      <p className="text-indigo-800">
                        Mọi thay đổi sẽ được cập nhật công khai trên website Wecare Group.
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
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Cần hỗ trợ giao hàng?</h2>
              <p className="text-lg text-gray-600 mb-8">
                Nếu Quý khách có thắc mắc về chính sách giao hàng hoặc cần hỗ trợ đặt hàng,
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

export default ShippingPolicyPage;
