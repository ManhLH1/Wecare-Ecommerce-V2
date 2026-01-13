"use client";
import React from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import JDStyleHeader from "@/components/JDStyleHeader";
import JDStyleMainContent from "@/components/JDStyleMainContent";

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
        <div className="w-full max-w-[2560px] mx-auto pt-[115px] px-4">
          <div className="flex flex-col lg:flex-row">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <main className="w-full max-w-[2560px] mx-auto pt-0 px-4">

                {/* Page Header */}
                <section className="py-6 md:py-8">
                  <div className="text-center px-4 sm:px-6">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 uppercase leading-tight">
                      CHÍNH SÁCH ĐỔI TRẢ HÀNG VÀ HOÀN TIỀN
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-6"></div>
                    <p className="text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                      Khi mua hàng tại Wecare Group, trong thời gian 10 ngày kể từ ngày nhận hàng, khách hàng được chấp nhận đổi lại sản phẩm hoặc đổi sang sản phẩm có giá trị cao hơn (khách hàng thanh toán phần chênh lệch nếu có).
                    </p>
                  </div>
                </section>

                {/* Return Policy Content */}
                <section className="pb-12">
                  <div className="mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl px-4 sm:px-6 lg:px-8">

                  <div className="space-y-8 md:space-y-10">
                    {/* 1. Điều kiện đổi trả hàng */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        1. Điều kiện đổi trả hàng
                      </h3>
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
                        <p>Sản phẩm đủ điều kiện đổi trả là sản phẩm đáp ứng đầy đủ các yêu cầu dưới đây và không thuộc danh mục sản phẩm không hỗ trợ đổi trả của Wecare Group.</p>

                        <p className="font-semibold text-xl">Điều kiện cụ thể:</p>
                        <ul className="space-y-3 ml-6">
                          <li>• Sản phẩm được yêu cầu đổi trả trong vòng <strong className="text-blue-600">10 ngày</strong> (xác nhận theo dấu bưu điện hoặc đơn vị vận chuyển) kể từ ngày khách hàng nhận hàng.</li>
                          <li>• Sản phẩm còn nguyên trạng như khi nhận, nguyên vẹn tem mác, bao bì và phụ kiện đi kèm (hộp, túi, linh kiện, sách hướng dẫn…).</li>
                          <li>• Có chứng từ mua hàng hợp lệ (phiếu bán hàng, hóa đơn, thông tin đơn hàng).</li>
                          <li>• Quà tặng khuyến mãi có giá trị (nếu có) phải được hoàn trả đầy đủ.</li>
                          <li>• Sản phẩm không bị dơ bẩn, nứt vỡ, hư hỏng, trầy xước, biến dạng, có mùi lạ hoặc dấu hiệu đã qua sử dụng.</li>
                          <li>• Sản phẩm còn trong bao bì có dán mã sản phẩm của Wecare Group.</li>
                        </ul>

                        <p className="font-semibold text-xl">Các trường hợp được chấp nhận đổi trả:</p>
                        <ul className="space-y-3 ml-6">
                          <li>• Sản phẩm bị giao sai, giao thiếu phụ kiện, thiếu hàng.</li>
                          <li>• Sản phẩm bị hư hỏng, vỡ trong quá trình vận chuyển.</li>
                          <li>• Sản phẩm lỗi kỹ thuật do nhà sản xuất.</li>
                          <li>• Sản phẩm giao nhầm mẫu mã, màu sắc so với đơn đặt hàng.</li>
                          <li>• Sản phẩm đổi lại phải có giá trị bằng hoặc cao hơn sản phẩm cần đổi. Trường hợp Wecare Group giao sai sản phẩm, công ty sẽ đổi lại miễn phí.</li>
                          <li>• <strong className="text-red-600">Mỗi sản phẩm chỉ được đổi trả 01 lần.</strong></li>
                        </ul>
                      </div>
                    </div>

                    {/* 2. Phương thức trả hoặc đổi hàng đã mua */}
                    <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        2. Phương thức trả hoặc đổi hàng đã mua
                      </h3>
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
                        <p>Để tiến hành đổi trả sản phẩm, khách hàng vui lòng thực hiện theo các bước sau:</p>
                        <ul className="space-y-3 ml-6">
                          <li>• Liên hệ với Wecare Group qua Nhân viên kinh doanh phụ trách đơn hàng để kiểm tra điều kiện sản phẩm và điều kiện đổi trả.</li>
                        </ul>

                        <p className="font-semibold text-xl">Lựa chọn hình thức đổi trả:</p>
                        <ul className="space-y-3 ml-6">
                          <li>• <strong className="text-blue-600">Mang sản phẩm đến trực tiếp tại văn phòng Wecare Group.</strong></li>
                          <li>• <strong className="text-blue-600">Gửi sản phẩm qua đơn vị vận chuyển.</strong></li>
                        </ul>

                        <p><strong className="text-green-600">Trường hợp mang đến trực tiếp,</strong> khách hàng vui lòng mang theo sản phẩm và chứng từ mua hàng.</p>

                        <p><strong className="text-green-600">Trường hợp gửi qua đơn vị vận chuyển,</strong> khách hàng cần:</p>
                        <ul className="space-y-3 ml-6">
                          <li>• Đóng gói cẩn thận.</li>
                          <li>• Xác nhận tình trạng hàng hóa với đơn vị vận chuyển: còn nguyên tem niêm phong, nguyên vỏ hộp, sản phẩm không bị vỡ hoặc hư hỏng, đầy đủ phụ kiện.</li>
                        </ul>

                        <p>Nếu sản phẩm đáp ứng đủ điều kiện đổi trả, Wecare Group sẽ xác nhận và phản hồi trong vòng <strong className="text-red-600">07 ngày làm việc</strong> qua Zalo OA hoặc số điện thoại khách hàng đã cung cấp.</p>
                      </div>
                    </div>

                    {/* 3. Các chi phí liên quan đến việc đổi trả */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        3. Các chi phí liên quan đến việc đổi trả
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed">
                        <p>Khách hàng có thể phát sinh một số chi phí sau khi đổi trả hàng: Trường hợp sản phẩm gửi về không đạt điều kiện đổi trả, khách hàng chịu chi phí để Wecare Group gửi trả lại sản phẩm.</p>
                      </div>
                    </div>

                    {/* 4. Cách thức hoàn tiền hoặc đổi hàng */}
                    <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        4. Cách thức hoàn tiền hoặc đổi hàng
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed space-y-4">
                        <p><strong className="text-green-600">Trường hợp khách hàng yêu cầu đổi hàng,</strong> Wecare Group sẽ gửi sản phẩm mới tới địa chỉ đã đăng ký mua hàng.</p>
                        <p><strong className="text-green-600">Trường hợp khách hàng yêu cầu hoàn tiền,</strong> Wecare Group sẽ hoàn tiền theo số tài khoản ngân hàng do khách hàng cung cấp, theo thời gian xử lý của hệ thống thanh toán.</p>
                      </div>
                    </div>

                    {/* 5. Đóng gói gửi sản phẩm và thời gian xử lý đổi trả */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        5. Đóng gói gửi sản phẩm và thời gian xử lý đổi trả
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed space-y-4">
                        <p>Khách hàng vui lòng đóng gói sản phẩm hoàn trả kèm chứng từ mua hàng và gửi trực tiếp về văn phòng Wecare Group (địa chỉ sẽ được cung cấp khi liên hệ đổi trả).</p>
                        <p>Thời gian Wecare Group nhận được hàng không quá <strong className="text-blue-600">15 ngày</strong> kể từ ngày giao hàng thành công.</p>
                        <p className="font-semibold text-red-600">Trường hợp khách hàng gửi sản phẩm sau 15 ngày, Wecare Group không giải quyết đổi trả.</p>
                      </div>
                    </div>
                </div>
              </div>

                    {/* Important Notes */}
                    <div className="mt-12 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 md:p-8">
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-yellow-800 mb-4 uppercase">Lưu ý quan trọng</h3>
                          <div className="text-lg text-yellow-700 space-y-3">
                            <p>• Chính sách đổi trả chỉ áp dụng trong vòng <strong className="text-red-600">10 ngày</strong> kể từ ngày nhận hàng</p>
                            <p>• Sản phẩm phải còn nguyên vẹn, đầy đủ phụ kiện và chứng từ mua hàng</p>
                            <p>• Mỗi sản phẩm chỉ được đổi trả <strong className="text-red-600">01 lần</strong></p>
                            <p>• Vui lòng liên hệ nhân viên kinh doanh trước khi gửi sản phẩm về</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6 md:p-8 text-center">
                      <h3 className="text-3xl font-bold text-gray-900 mb-6 uppercase">Liên hệ đổi trả</h3>
                      <p className="text-xl text-gray-700 mb-6">
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
                      <div className="text-lg text-gray-600 border-t border-gray-300 pt-4">
                        <p><strong className="text-blue-600">Thời gian làm việc:</strong> Thứ 2 - Thứ 6 (8:00 - 17:00)</p>
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
