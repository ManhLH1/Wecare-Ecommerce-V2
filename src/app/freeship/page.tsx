"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const ShippingPolicyPage = () => {
  return (
    <div className="bg-gray-50">
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-green-600 to-blue-700 text-white overflow-hidden">
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
                Chính Sách Vận Chuyển
              </h2>
              <p className="text-lg md:text-xl text-green-100 max-w-3xl mx-auto leading-relaxed">
                Cam kết giao hàng nhanh chóng, an toàn và đúng hẹn
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Shipping Policy Content */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">CHÍNH SÁCH VẬN CHUYỂN</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-blue-500 mx-auto mb-8"></div>
              </div>

              <div className="prose prose-lg max-w-none">
                <div className="space-y-8">
                  {/* 1. Phương thức giao hàng */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Phương thức giao hàng</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Wecare Group hợp tác với các đơn vị vận chuyển và chành xe uy tín trên toàn quốc nhằm đảm bảo hàng hóa được giao đến tay khách hàng nhanh chóng – an toàn – đúng hẹn.
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Hỗ trợ giao hàng tận nơi theo địa chỉ khách hàng yêu cầu hoặc giao tại chành xe theo thỏa thuận.</li>
                      <li>Phù hợp cho đơn hàng nhỏ lẻ lẫn đơn hàng số lượng lớn, hàng cồng kềnh.</li>
                    </ul>
                  </div>

                  {/* 2. Thời gian vận chuyển */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Thời gian vận chuyển</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Sau khi đơn hàng được xác nhận, Wecare Group tiến hành chốt đơn và bàn giao hàng cho đơn vị vận chuyển/chành xe trong thời gian sớm nhất.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      Thời gian giao hàng dự kiến: <strong>Từ 1 – 5 ngày làm việc</strong>, tùy khu vực và hình thức vận chuyển.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      Thời gian vận chuyển được tính từ lúc Wecare Group xác nhận đơn hàng thành công đến khi khách hàng nhận được hàng, không bao gồm ngày lễ, thứ 7 và Chủ nhật.
                    </p>
                  </div>

                  {/* 3. Phí vận chuyển */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Phí vận chuyển</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Wecare Group hỗ trợ FREESHIP nhiều khu vực, kể cả đơn hàng giá trị nhỏ và đơn hàng số lượng lớn.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      Trường hợp phát sinh phí, mức phí được thông báo rõ ràng trước khi xác nhận đơn. Ưu tiên giao hàng qua chành xe uy tín, tối ưu chi phí. Phí vận chuyển được hỗ trợ tối đa hoặc áp dụng theo cước thực tế của đơn vị vận chuyển, luôn báo trước cho khách hàng.
                    </p>
                  </div>

                  {/* 4. Trường hợp chậm trễ giao hàng */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Trường hợp chậm trễ giao hàng</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Trong trường hợp phát sinh chậm trễ do lỗi hoàn toàn từ phía Wecare Group, chúng tôi sẽ:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                      <li>Chủ động liên hệ khách hàng qua số điện thoại hoặc Zalo OA.</li>
                      <li>Thông báo rõ nguyên nhân và thời gian giao hàng dự kiến mới.</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed">
                      Khách hàng có quyền yêu cầu hủy đơn hàng hoặc yêu cầu hoàn tiền theo chính sách của công ty nếu không tiếp tục nhận hàng.
                    </p>
                  </div>

                  {/* 5. Cam kết của Wecare Group */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Cam kết của Wecare Group</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Giao hàng nhanh – đúng – đủ.</li>
                      <li>Hỗ trợ tối đa chi phí vận chuyển cho khách hàng.</li>
                      <li>Linh hoạt hình thức giao nhận, phù hợp mọi nhu cầu từ cá nhân đến doanh nghiệp.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-12 bg-green-50 rounded-lg p-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Liên hệ vận chuyển</h3>
                <p className="text-gray-700 mb-4">
                  Nếu bạn có bất kỳ câu hỏi nào về chính sách vận chuyển, vui lòng liên hệ với chúng tôi:
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">037 833 9009</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700">support@wecare.com.vn</span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Thời gian làm việc:</strong> Thứ 2 - Thứ 6 (8:00 - 17:00)</p>
                </div>
              </div>

              {/* Back to Home */}
              <div className="text-center mt-8">
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
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

export default ShippingPolicyPage;


