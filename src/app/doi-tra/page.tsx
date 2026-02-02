"use client";

import React from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import JDStyleHeader from "@/components/JDStyleHeader";

const ReturnPolicyPage = () => {
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
                      CHÍNH SÁCH ĐỔI TRẢ HÀNG VÀ HOÀN TIỀN
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-6"></div>
                    <p className="text-lg md:text-xl text-gray-600 max-w-[1400px] mx-auto leading-relaxed">
                      Khi mua hàng tại Wecare Group, trong thời gian 10 ngày kể từ ngày nhận hàng, khách hàng được chấp nhận đổi lại sản phẩm hoặc đổi sang sản phẩm có giá trị cao hơn (khách hàng thanh toán phần chênh lệch nếu có).
                    </p>
                  </div>
                </section>

                {/* Return Policy Content */}
                <section className="pb-12 px-4 sm:px-6 lg:px-8">
                  <div className="mx-auto w-full max-w-[1800px]">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">

                      {/* Nội dung chính - không phân cụm */}
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
                        <p className="font-semibold text-xl text-gray-900">1. Điều kiện đổi trả hàng:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Sản phẩm được yêu cầu đổi trả trong vòng <strong className="text-blue-600">10 ngày</strong> kể từ ngày nhận hàng.</li>
                          <li>Sản phẩm còn nguyên trạng như khi nhận, nguyên vẹn tem mác, bao bì và phụ kiện đi kèm.</li>
                          <li>Có chứng từ mua hàng hợp lệ (phiếu bán hàng, hóa đơn, thông tin đơn hàng).</li>
                          <li>Sản phẩm không bị dơ bẩn, nứt vỡ, hư hỏng, trầy xước, biến dạng, có mùi lạ hoặc dấu hiệu đã qua sử dụng.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">2. Các trường hợp được chấp nhận đổi trả:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Sản phẩm bị giao sai, giao thiếu phụ kiện, thiếu hàng.</li>
                          <li>Sản phẩm bị hư hỏng, vỡ trong quá trình vận chuyển.</li>
                          <li>Sản phẩm lỗi kỹ thuật do nhà sản xuất.</li>
                          <li>Sản phẩm giao nhầm mẫu mã, màu sắc so với đơn đặt hàng.</li>
                          <li><strong className="text-red-600">Mỗi sản phẩm chỉ được đổi trả 01 lần.</strong></li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">3. Phương thức đổi trả:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li><strong>Mang đến trực tiếp:</strong> Khách hàng mang sản phẩm và chứng từ mua hàng đến văn phòng Wecare Group.</li>
                          <li><strong>Gửi qua đơn vị vận chuyển:</strong> Đóng gói cẩn thận và gửi về Wecare Group.</li>
                          <li>Wecare Group sẽ phản hồi trong vòng <strong className="text-red-600">07 ngày làm việc</strong>.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">4. Chi phí đổi trả:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li><strong>Miễn phí vận chuyển</strong> đối với trường hợp giao sai, giao thiếu hoặc sản phẩm lỗi do nhà sản xuất.</li>
                          <li>Khách hàng chịu chi phí nếu sản phẩm gửi về không đạt điều kiện đổi trả.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">5. Hoàn tiền hoặc đổi hàng:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li><strong>Đổi hàng:</strong> Wecare Group gửi sản phẩm mới đến địa chỉ đã đăng ký.</li>
                          <li><strong>Hoàn tiền:</strong> Chuyển khoản theo số tài khoản ngân hàng do khách hàng cung cấp.</li>
                          <li>Thời gian hoàn tiền: 03-07 ngày làm việc (tùy ngân hàng).</li>
                        </ul>

                        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                          <p className="text-yellow-800 font-medium">
                            Lưu ý: Thời gian Wecare Group nhận được hàng không quá 15 ngày kể từ ngày giao hàng thành công. Sau 15 ngày, yêu cầu đổi trả sẽ không được giải quyết.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6 md:p-8 text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 uppercase">Liên hệ đổi trả</h3>
                      <p className="text-lg text-gray-700 mb-6">
                        Để được hỗ trợ đổi trả sản phẩm, vui lòng liên hệ với chúng tôi:
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
                      <div className="text-base text-gray-600 border-t border-gray-300 pt-4">
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

export default ReturnPolicyPage;
