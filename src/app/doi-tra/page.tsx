"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const ReturnPolicyPage = () => {
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
                Chính Sách Đổi Trả
              </h2>
              <p className="text-lg md:text-xl text-green-100 max-w-3xl mx-auto leading-relaxed">
                Cam kết hỗ trợ khách hàng đổi trả sản phẩm trong 10 ngày
              </p>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Return Policy Content */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">CHÍNH SÁCH ĐỔI TRẢ HÀNG VÀ HOÀN TIỀN</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-blue-500 mx-auto mb-8"></div>
                <p className="text-gray-600 text-lg">
                  Khi mua hàng tại Wecare Group, trong thời gian 10 ngày kể từ ngày nhận hàng, khách hàng được chấp nhận đổi lại sản phẩm hoặc đổi sang sản phẩm có giá trị cao hơn (khách hàng thanh toán phần chênh lệch nếu có).
                </p>
              </div>

              <div className="prose prose-lg max-w-none">
                <div className="space-y-8">
                  {/* 1. Điều kiện đổi trả hàng */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Điều kiện đổi trả hàng</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Sản phẩm đủ điều kiện đổi trả là sản phẩm đáp ứng đầy đủ các yêu cầu dưới đây và không thuộc danh mục sản phẩm không hỗ trợ đổi trả của Wecare Group.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4 font-semibold">
                      Điều kiện cụ thể:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                      <li>Sản phẩm được yêu cầu đổi trả trong vòng <strong>10 ngày</strong> (xác nhận theo dấu bưu điện hoặc đơn vị vận chuyển) kể từ ngày khách hàng nhận hàng.</li>
                      <li>Sản phẩm còn nguyên trạng như khi nhận, nguyên vẹn tem mác, bao bì và phụ kiện đi kèm (hộp, túi, linh kiện, sách hướng dẫn…).</li>
                      <li>Có chứng từ mua hàng hợp lệ (phiếu bán hàng, hóa đơn, thông tin đơn hàng).</li>
                      <li>Quà tặng khuyến mãi có giá trị (nếu có) phải được hoàn trả đầy đủ.</li>
                      <li>Sản phẩm không bị dơ bẩn, nứt vỡ, hư hỏng, trầy xước, biến dạng, có mùi lạ hoặc dấu hiệu đã qua sử dụng.</li>
                      <li>Sản phẩm còn trong bao bì có dán mã sản phẩm của Wecare Group.</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mb-4 font-semibold">
                      Các trường hợp được chấp nhận đổi trả:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Sản phẩm bị giao sai, giao thiếu phụ kiện, thiếu hàng.</li>
                      <li>Sản phẩm bị hư hỏng, vỡ trong quá trình vận chuyển.</li>
                      <li>Sản phẩm lỗi kỹ thuật do nhà sản xuất.</li>
                      <li>Sản phẩm giao nhầm mẫu mã, màu sắc so với đơn đặt hàng.</li>
                      <li>Sản phẩm đổi lại phải có giá trị bằng hoặc cao hơn sản phẩm cần đổi. Trường hợp Wecare Group giao sai sản phẩm, công ty sẽ đổi lại miễn phí.</li>
                      <li><strong>Mỗi sản phẩm chỉ được đổi trả 01 lần.</strong></li>
                    </ul>
                  </div>

                  {/* 2. Phương thức trả hoặc đổi hàng đã mua */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Phương thức trả hoặc đổi hàng đã mua</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Để tiến hành đổi trả sản phẩm, khách hàng vui lòng thực hiện theo các bước sau:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                      <li>Liên hệ với Wecare Group qua Nhân viên kinh doanh phụ trách đơn hàng để kiểm tra điều kiện sản phẩm và điều kiện đổi trả.</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mb-4 font-semibold">
                      Lựa chọn hình thức đổi trả:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                      <li><strong>Mang sản phẩm đến trực tiếp tại văn phòng Wecare Group.</strong></li>
                      <li><strong>Gửi sản phẩm qua đơn vị vận chuyển.</strong></li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      <strong>Trường hợp mang đến trực tiếp,</strong> khách hàng vui lòng mang theo sản phẩm và chứng từ mua hàng.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      <strong>Trường hợp gửi qua đơn vị vận chuyển,</strong> khách hàng cần:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                      <li>Đóng gói cẩn thận.</li>
                      <li>Xác nhận tình trạng hàng hóa với đơn vị vận chuyển: còn nguyên tem niêm phong, nguyên vỏ hộp, sản phẩm không bị vỡ hoặc hư hỏng, đầy đủ phụ kiện.</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed">
                      Nếu sản phẩm đáp ứng đủ điều kiện đổi trả, Wecare Group sẽ xác nhận và phản hồi trong vòng <strong>07 ngày làm việc</strong> qua Zalo OA hoặc số điện thoại khách hàng đã cung cấp.
                    </p>
                  </div>

                  {/* 3. Các chi phí liên quan đến việc đổi trả */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Các chi phí liên quan đến việc đổi trả</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Khách hàng có thể phát sinh một số chi phí sau khi đổi trả hàng: Trường hợp sản phẩm gửi về không đạt điều kiện đổi trả, khách hàng chịu chi phí để Wecare Group gửi trả lại sản phẩm.
                    </p>
                  </div>

                  {/* 4. Cách thức hoàn tiền hoặc đổi hàng */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Cách thức hoàn tiền hoặc đổi hàng</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      <strong>Trường hợp khách hàng yêu cầu đổi hàng,</strong> Wecare Group sẽ gửi sản phẩm mới tới địa chỉ đã đăng ký mua hàng.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      <strong>Trường hợp khách hàng yêu cầu hoàn tiền,</strong> Wecare Group sẽ hoàn tiền theo số tài khoản ngân hàng do khách hàng cung cấp, theo thời gian xử lý của hệ thống thanh toán.
                    </p>
                  </div>

                  {/* 5. Đóng gói gửi sản phẩm và thời gian xử lý đổi trả */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Đóng gói gửi sản phẩm và thời gian xử lý đổi trả</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Khách hàng vui lòng đóng gói sản phẩm hoàn trả kèm chứng từ mua hàng và gửi trực tiếp về văn phòng Wecare Group (địa chỉ sẽ được cung cấp khi liên hệ đổi trả).
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Thời gian Wecare Group nhận được hàng không quá <strong>15 ngày</strong> kể từ ngày giao hàng thành công.
                    </p>
                    <p className="text-gray-700 leading-relaxed font-semibold">
                      Trường hợp khách hàng gửi sản phẩm sau 15 ngày, Wecare Group không giải quyết đổi trả.
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Lưu ý quan trọng</h3>
                    <ul className="text-yellow-700 space-y-1 text-sm">
                      <li>• Chính sách đổi trả chỉ áp dụng trong vòng 10 ngày kể từ ngày nhận hàng</li>
                      <li>• Sản phẩm phải còn nguyên vẹn, đầy đủ phụ kiện và chứng từ mua hàng</li>
                      <li>• Mỗi sản phẩm chỉ được đổi trả 01 lần</li>
                      <li>• Vui lòng liên hệ nhân viên kinh doanh trước khi gửi sản phẩm về</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-12 bg-green-50 rounded-lg p-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Liên hệ đổi trả</h3>
                <p className="text-gray-700 mb-4">
                  Để được hỗ trợ đổi trả sản phẩm, vui lòng liên hệ với chúng tôi:
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

export default ReturnPolicyPage;
