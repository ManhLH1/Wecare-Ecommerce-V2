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
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 uppercase">
                  CHÍNH SÁCH ĐỔI TRẢ HÀNG VÀ HOÀN TIỀN
                    </h1>
                    <div className="w-24 h-1 bg-blue-600 mx-auto mb-6"></div>
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
                          <li>Sản phẩm được yêu cầu đổi trả trong vòng <strong>10 ngày</strong> kể từ ngày nhận hàng.</li>
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
                          <li><strong>Mỗi sản phẩm chỉ được đổi trả 01 lần.</strong></li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">3. Phương thức đổi trả:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li><strong>Mang đến trực tiếp:</strong> Khách hàng mang sản phẩm và chứng từ mua hàng đến văn phòng Wecare Group.</li>
                          <li><strong>Gửi qua đơn vị vận chuyển:</strong> Đóng gói cẩn thận và gửi về Wecare Group.</li>
                          <li>Wecare Group sẽ phản hồi trong vòng <strong>07 ngày làm việc</strong>.</li>
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

                        <div className="mt-6 bg-gray-50 border-l-4 border-gray-300 p-4 rounded-r-lg">
                          <p className="text-gray-800 font-medium">
                            Lưu ý: Thời gian Wecare Group nhận được hàng không quá 15 ngày kể từ ngày giao hàng thành công. Sau 15 ngày, yêu cầu đổi trả sẽ không được giải quyết.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information - text thuần, tránh bị tách trang */}
                    <div
                      className="mt-8 bg-white p-0 text-base md:text-lg text-gray-800 leading-relaxed"
                      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                    >
                      <p className="font-bold uppercase mb-2">Liên hệ đổi trả</p>
                      <p>Để được hỗ trợ đổi trả sản phẩm, vui lòng liên hệ:</p>
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

export default ReturnPolicyPage;
