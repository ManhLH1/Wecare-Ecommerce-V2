"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const ReturnPolicyPage = () => {
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
                  CHÍNH SÁCH ĐỔI TRẢ
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                An tâm mua sắm - Bảo vệ quyền lợi
              </h2>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Wecare Group cam kết bảo vệ quyền lợi khách hàng với chính sách
                đổi trả linh hoạt trong vòng 10 ngày kể từ ngày nhận hàng.
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
                <h2 className="title-section text-center mb-6">Chính sách đổi trả hàng và hoàn tiền</h2>
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
                      Khi mua hàng tại Wecare Group, trong thời gian <strong>10 ngày</strong> kể từ ngày nhận hàng, khách hàng được chấp nhận đổi lại sản phẩm hoặc đổi sang sản phẩm có giá trị cao hơn (khách hàng thanh toán phần chênh lệch nếu có).
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                  <p className="text-amber-800 text-sm">
                    <strong>Lưu ý:</strong> Trước khi tiến hành đổi trả, quý khách vui lòng lưu ý các nội dung về điều kiện đổi trả, phương thức, chi phí, cách thức và quy định đóng gói.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Return Policy Details */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              {/* 1. Return Conditions */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Điều kiện đổi trả hàng</h3>
                    <p className="text-body mb-4">
                      Sản phẩm đủ điều kiện đổi trả là sản phẩm đáp ứng đầy đủ các yêu cầu dưới đây và không thuộc danh mục sản phẩm không hỗ trợ đổi trả của Wecare Group.
                    </p>

                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6">
                      <h4 className="text-green-800 font-semibold mb-3">Điều kiện cụ thể:</h4>
                      <ul className="space-y-2 text-green-700 text-sm">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Sản phẩm được yêu cầu đổi trả trong vòng <strong>10 ngày</strong> (xác nhận theo dấu bưu điện hoặc đơn vị vận chuyển) kể từ ngày khách hàng nhận hàng.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Sản phẩm còn nguyên trạng như khi nhận, nguyên vẹn tem mác, bao bì và phụ kiện đi kèm (hộp, túi, linh kiện, sách hướng dẫn…).</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Có chứng từ mua hàng hợp lệ (phiếu bán hàng, hóa đơn, thông tin đơn hàng).</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Quà tặng khuyến mãi có giá trị (nếu có) phải được hoàn trả đầy đủ.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Sản phẩm không bị dơ bẩn, nứt vỡ, hư hỏng, trầy xước, biến dạng, có mùi lạ hoặc dấu hiệu đã qua sử dụng.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span>Sản phẩm còn trong bao bì có dán mã sản phẩm của Wecare Group.</span>
                        </li>
                      </ul>
                    </div>

                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Các trường hợp được chấp nhận đổi trả:</h4>
                    <ul className="space-y-2 text-body mb-4">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sản phẩm bị giao sai, giao thiếu phụ kiện, thiếu hàng.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sản phẩm bị hư hỏng, vỡ trong quá trình vận chuyển.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sản phẩm lỗi kỹ thuật do nhà sản xuất.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Sản phẩm giao nhầm mẫu mã, màu sắc so với đơn đặt hàng.</span>
                      </li>
                    </ul>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <p className="text-blue-800">
                        <strong>Lưu ý quan trọng:</strong>
                      </p>
                      <ul className="text-blue-700 text-sm mt-2 space-y-1">
                        <li>• Sản phẩm đổi lại phải có giá trị bằng hoặc cao hơn sản phẩm cần đổi.</li>
                        <li>• Trường hợp Wecare Group giao sai sản phẩm, công ty sẽ đổi lại miễn phí.</li>
                        <li>• Mỗi sản phẩm chỉ được đổi trả 01 lần.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Return/Exchange Methods */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Phương thức trả hoặc đổi hàng đã mua</h3>
                    <p className="text-body mb-4">
                      Để tiến hành đổi trả sản phẩm, khách hàng vui lòng thực hiện theo các bước sau:
                    </p>

                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6">
                      <div className="flex items-start mb-3">
                        <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-white text-sm font-bold">1</span>
                        </span>
                        <p className="text-green-800">
                          Liên hệ với Wecare Group qua Nhân viên kinh doanh phụ trách đơn hàng để kiểm tra điều kiện sản phẩm và điều kiện đổi trả.
                        </p>
                      </div>
                      <div className="flex items-start">
                        <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-white text-sm font-bold">2</span>
                        </span>
                        <p className="text-green-800 mb-3">
                          Lựa chọn hình thức đổi trả:
                        </p>
                        <ul className="text-green-700 text-sm ml-9 space-y-1">
                          <li>• Mang sản phẩm đến trực tiếp tại văn phòng Wecare Group.</li>
                          <li>• Gửi sản phẩm qua đơn vị vận chuyển.</li>
                        </ul>
                      </div>
                    </div>

                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Trường hợp mang đến trực tiếp:</h4>
                    <p className="text-body mb-4">
                      Khách hàng vui lòng mang theo sản phẩm và chứng từ mua hàng.
                    </p>

                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Trường hợp gửi qua đơn vị vận chuyển:</h4>
                    <ul className="space-y-2 text-body mb-4">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Đóng gói cẩn thận.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Xác nhận tình trạng hàng hóa với đơn vị vận chuyển: còn nguyên tem niêm phong, nguyên vỏ hộp, sản phẩm không bị vỡ hoặc hư hỏng, đầy đủ phụ kiện.</span>
                      </li>
                    </ul>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <p className="text-blue-800">
                        Nếu sản phẩm đáp ứng đủ điều kiện đổi trả, Wecare Group sẽ xác nhận và phản hồi trong vòng <strong>07 ngày làm việc</strong> qua Zalo OA hoặc số điện thoại khách hàng đã cung cấp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Related Costs */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Các chi phí liên quan đến việc đổi trả</h3>
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className="text-amber-800 font-medium">Trường hợp sản phẩm gửi về không đạt điều kiện đổi trả:</p>
                          <p className="text-amber-700 text-sm mt-1">
                            Khách hàng chịu chi phí để Wecare Group gửi trả lại sản phẩm.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Refund/Exchange Process */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Cách thức hoàn tiền hoặc đổi hàng</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                        <h4 className="text-blue-800 font-semibold mb-2">Đổi hàng:</h4>
                        <p className="text-blue-700 text-sm">
                          Wecare Group sẽ gửi sản phẩm mới tới địa chỉ đã đăng ký mua hàng.
                        </p>
                      </div>
                      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                        <h4 className="text-green-800 font-semibold mb-2">Hoàn tiền:</h4>
                        <p className="text-green-700 text-sm">
                          Wecare Group sẽ hoàn tiền theo số tài khoản ngân hàng do khách hàng cung cấp, theo thời gian xử lý của hệ thống thanh toán.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Packaging and Return Timeline */}
              <div className="bg-white rounded-xl p-8 shadow-md mb-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mr-6 flex-shrink-0">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Đóng gói gửi sản phẩm và thời gian đổi trả</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-lg">
                        <h4 className="text-gray-800 font-semibold mb-2">Quy định đóng gói:</h4>
                        <p className="text-gray-700 text-sm">
                          Khách hàng vui lòng đóng gói sản phẩm hoàn trả kèm chứng từ mua hàng và gửi trực tiếp về văn phòng Wecare Group (địa chỉ sẽ được cung cấp khi liên hệ đổi trả).
                        </p>
                      </div>

                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                        <h4 className="text-blue-800 font-semibold mb-2">Thời gian xử lý:</h4>
                        <p className="text-blue-700 text-sm mb-2">
                          Thời gian Wecare Group nhận được hàng không quá <strong>15 ngày</strong> kể từ ngày giao hàng thành công.
                        </p>
                        <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg">
                          <p className="text-red-800 text-sm font-medium">
                            ⚠️ Trường hợp khách hàng gửi sản phẩm sau 15 ngày, Wecare Group không giải quyết đổi trả.
                          </p>
                        </div>
                      </div>
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
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Cần hỗ trợ đổi trả?</h2>
              <p className="text-lg text-gray-600 mb-8">
                Nếu Quý khách có thắc mắc về chính sách đổi trả hoặc cần hỗ trợ xử lý đơn hàng,
                đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ 24/7.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/lien-he"
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Liên hệ hỗ trợ
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/san-pham"
                  className="inline-flex items-center px-8 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-300"
                >
                  Tiếp tục mua sắm
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

export default ReturnPolicyPage;
