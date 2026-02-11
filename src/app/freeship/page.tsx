"use client";
import React from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import JDStyleHeader from "@/components/JDStyleHeader";

const ShippingPolicyPage: React.FC = () => {
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
                <section className="py-6 md:py-8">
                  <div className="text-center px-4 sm:px-6">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 uppercase">
                      CHÍNH SÁCH VẬN CHUYỂN
                    </h1>
                    <div className="w-24 h-1 bg-blue-600 mx-auto mb-6"></div>
                    <p className="text-lg md:text-xl text-gray-600 max-w-[1400px] mx-auto leading-relaxed">
                      Cam kết giao hàng nhanh chóng, an toàn và đúng hẹn
                    </p>
                  </div>
                </section>

                {/* Shipping Policy Content */}
                <section className="pb-12 px-4 sm:px-6 lg:px-8">
                  <div className="mx-auto w-full max-w-[1800px]">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">

                      {/* Nội dung chính - không phân cụm */}
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
                        <p className="font-semibold text-xl text-gray-900">1. Phương thức giao hàng:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Wecare Group hợp tác với các đơn vị vận chuyển và chành xe uy tín trên toàn quốc.</li>
                          <li>Hỗ trợ giao hàng tận nơi hoặc giao tại chành xe theo thỏa thuận.</li>
                          <li>Phù hợp cho đơn hàng nhỏ lẻ lẫn đơn hàng số lượng lớn, hàng cồng kềnh.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">2. Thời gian vận chuyển:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Thời gian giao hàng dự kiến: <strong>Từ 1 – 5 ngày làm việc</strong>, tùy khu vực và hình thức vận chuyển.</li>
                          <li>Thời gian được tính từ khi xác nhận đơn hàng thành công đến khi khách hàng nhận được hàng.</li>
                          <li>Không bao gồm ngày lễ, thứ 7 và Chủ nhật.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">3. Phí vận chuyển:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Wecare Group hỗ trợ <strong>FREESHIP</strong> nhiều khu vực.</li>
                          <li>Phí vận chuyển được thông báo rõ ràng trước khi xác nhận đơn.</li>
                          <li>Ưu tiên giao hàng qua chành xe uy tín, tối ưu chi phí cho khách hàng.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">4. Trường hợp chậm trễ giao hàng:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Wecare Group chủ động liên hệ khách hàng qua số điện thoại hoặc Zalo OA.</li>
                          <li>Thông báo rõ nguyên nhân và thời gian giao hàng dự kiến mới.</li>
                          <li>Khách hàng có quyền yêu cầu hủy đơn hoặc hoàn tiền nếu không tiếp tục nhận hàng.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">5. Cam kết của Wecare Group:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Giao hàng nhanh – đúng – đủ.</li>
                          <li>Hỗ trợ tối đa chi phí vận chuyển cho khách hàng.</li>
                          <li>Linh hoạt hình thức giao nhận, phù hợp mọi nhu cầu từ cá nhân đến doanh nghiệp.</li>
                        </ul>
                      </div>
                    </div>

                    {/* Contact Information - text thuần, tránh bị tách trang */}
                    <div
                      className="mt-8 bg-white p-0 text-base md:text-lg text-gray-800 leading-relaxed"
                      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                    >
                      <p className="font-bold uppercase mb-2">Liên hệ vận chuyển</p>
                      <p>Nếu bạn có câu hỏi về chính sách vận chuyển, vui lòng liên hệ:</p>
                      <p>- Hotline: 037 833 9009</p>
                      <p>- Email: support@wecare.com.vn</p>
                      <p>- Thời gian làm việc: Thứ 2 - Thứ 7 (8:00 - 17:00)</p>
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

export default ShippingPolicyPage;
