"use client";
import React from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import JDStyleHeader from "@/components/JDStyleHeader";
import JDStyleMainContent from "@/components/JDStyleMainContent";

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
                    <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 uppercase leading-tight">
                      CHÍNH SÁCH VẬN CHUYỂN
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-6"></div>
                    <p className="text-lg md:text-xl text-gray-600 max-w-[1400px] mx-auto leading-relaxed">
                      Cam kết giao hàng nhanh chóng, an toàn và đúng hẹn
                    </p>
                  </div>
                </section>

                {/* Shipping Policy Content */}
                <section className="pb-12 px-4 sm:px-6 lg:px-8">
                  <div className="mx-auto w-full max-w-[1800px]">
                    <div className="space-y-8 md:space-y-10">
                    {/* 1. Phương thức giao hàng */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        1. Phương thức giao hàng
                      </h3>
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
                        <p>Wecare Group hợp tác với các đơn vị vận chuyển và chành xe uy tín trên toàn quốc nhằm đảm bảo hàng hóa được giao đến tay khách hàng nhanh chóng – an toàn – đúng hẹn.</p>
                        <ul className="space-y-3 ml-6">
                          <li>• Hỗ trợ giao hàng tận nơi theo địa chỉ khách hàng yêu cầu hoặc giao tại chành xe theo thỏa thuận.</li>
                          <li>• Phù hợp cho đơn hàng nhỏ lẻ lẫn đơn hàng số lượng lớn, hàng cồng kềnh.</li>
                        </ul>
                      </div>
                    </div>

                    {/* 2. Thời gian vận chuyển */}
                    <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        2. Thời gian vận chuyển
                      </h3>
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
                        <p>Sau khi đơn hàng được xác nhận, Wecare Group tiến hành chốt đơn và bàn giao hàng cho đơn vị vận chuyển/chành xe trong thời gian sớm nhất.</p>
                        <p>Thời gian giao hàng dự kiến: <strong className="text-blue-600">Từ 1 – 5 ngày làm việc</strong>, tùy khu vực và hình thức vận chuyển.</p>
                        <p>Thời gian vận chuyển được tính từ lúc Wecare Group xác nhận đơn hàng thành công đến khi khách hàng nhận được hàng, không bao gồm ngày lễ, thứ 7 và Chủ nhật.</p>
                      </div>
                    </div>

                    {/* 3. Phí vận chuyển */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        3. Phí vận chuyển
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed space-y-4">
                        <p>Wecare Group hỗ trợ <strong className="text-green-600">FREESHIP</strong> nhiều khu vực, kể cả đơn hàng giá trị nhỏ và đơn hàng số lượng lớn.</p>
                        <p>Trường hợp phát sinh phí, mức phí được thông báo rõ ràng trước khi xác nhận đơn. Ưu tiên giao hàng qua chành xe uy tín, tối ưu chi phí. Phí vận chuyển được hỗ trợ tối đa hoặc áp dụng theo cước thực tế của đơn vị vận chuyển, luôn báo trước cho khách hàng.</p>
                      </div>
                    </div>

                    {/* 4. Trường hợp chậm trễ giao hàng */}
                    <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        4. Trường hợp chậm trễ giao hàng
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed space-y-4">
                        <p>Trong trường hợp phát sinh chậm trễ do lỗi hoàn toàn từ phía Wecare Group, chúng tôi sẽ:</p>
                        <ul className="space-y-3 ml-6">
                          <li>• Chủ động liên hệ khách hàng qua số điện thoại hoặc Zalo OA.</li>
                          <li>• Thông báo rõ nguyên nhân và thời gian giao hàng dự kiến mới.</li>
                        </ul>
                        <p>Khách hàng có quyền yêu cầu hủy đơn hàng hoặc yêu cầu hoàn tiền theo chính sách của công ty nếu không tiếp tục nhận hàng.</p>
                      </div>
                    </div>

                    {/* 5. Cam kết của Wecare Group */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        5. Cam kết của Wecare Group
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed">
                        <ul className="space-y-3 ml-6">
                          <li>• Giao hàng nhanh – đúng – đủ.</li>
                          <li>• Hỗ trợ tối đa chi phí vận chuyển cho khách hàng.</li>
                          <li>• Linh hoạt hình thức giao nhận, phù hợp mọi nhu cầu từ cá nhân đến doanh nghiệp.</li>
                        </ul>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6 md:p-8 text-center">
                      <h3 className="text-3xl font-bold text-gray-900 mb-6 uppercase">Liên hệ vận chuyển</h3>
                      <p className="text-xl text-gray-700 mb-6">
                        Nếu bạn có bất kỳ câu hỏi nào về chính sách vận chuyển, vui lòng liên hệ với chúng tôi:
                      </p>
                      <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8 mb-6">
                        <div className="flex items-center text-lg">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <span className="text-gray-700 font-semibold">037 833 9009</span>
                        </div>
                        <div className="flex items-center text-lg">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-gray-700 font-semibold">support@wecare.com.vn</span>
                        </div>
                      </div>
                      <div className="text-lg text-gray-600 border-t border-gray-300 pt-4">
                        <p><strong className="text-blue-600">Thời gian làm việc:</strong> Thứ 2 - Thứ 6 (8:00 - 17:00)</p>
                      </div>
                    </div>

                    {/* Back to Home */}
                    <div className="text-center mt-8">
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

export default ShippingPolicyPage;


