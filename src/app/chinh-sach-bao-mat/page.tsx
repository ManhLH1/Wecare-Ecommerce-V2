"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const PrivacyPolicyPage = () => {
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
                  WECARE GROUP
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                Chính Sách Bảo Mật
              </h2>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Cam kết bảo vệ thông tin cá nhân và dữ liệu của khách hàng
              </p>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Privacy Policy Content */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Chính Sách Bảo Mật Thông Tin Khách Hàng Và Xử Lý Dữ Liệu Cá Nhân</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="prose prose-lg max-w-none">
                <div className="space-y-8">
                  {/* 1. Sự chấp thuận */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Sự chấp thuận</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Bằng việc truy cập vào và sử dụng các dịch vụ của Wecare Group, bạn đồng ý rằng thông tin cá nhân của bạn sẽ được thu thập và sử dụng như được nêu trong Chính sách bảo mật này. Trường hợp bạn không đồng ý với Chính sách này, bạn có thể dừng cung cấp thông tin cho chúng tôi.
                    </p>
                  </div>

                  {/* 2. Phạm vi thu thập */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Phạm vi thu thập</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Khi truy cập và sử dụng các dịch vụ tại website và ứng dụng của Wecare Group, bạn có thể sẽ được yêu cầu cung cấp trực tiếp cho chúng tôi thông tin cá nhân bao gồm:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li><strong>Thông tin đăng ký tài khoản:</strong> Email, Họ tên, Số điện thoại liên lạc, địa chỉ giao hàng, thông tin đăng nhập tài khoản (tên đăng nhập, mật khẩu)</li>
                      <li><strong>Thông tin doanh nghiệp:</strong> Tên công ty, mã số thuế, địa chỉ kinh doanh, ngành nghề</li>
                      <li><strong>Thông tin giao dịch:</strong> Lịch sử đơn hàng, phương thức thanh toán, thông tin hóa đơn</li>
                      <li><strong>Thông tin liên hệ:</strong> Số điện thoại, email, địa chỉ giao hàng</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      Chúng tôi cũng có thể thu thập thông tin về số lần truy cập, các trang bạn xem, số liên kết bạn click và những thông tin khác liên quan đến việc kết nối đến website Wecare Group.
                    </p>
                  </div>

                  {/* 3. Mục đích thu thập và sử dụng thông tin */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Mục đích thu thập và sử dụng thông tin</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Wecare Group thu thập và sử dụng thông tin cá nhân với mục đích phù hợp và hoàn toàn tuân thủ nội dung của "Chính sách bảo mật" này. Cụ thể:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-3 ml-4">
                      <li><strong>Xử lý đơn hàng:</strong> Gọi điện/tin nhắn xác nhận việc đặt hàng, thông báo về trạng thái đơn hàng & thời gian giao hàng, xác nhận việc huỷ đơn hàng và xử lý các vấn đề khác liên quan đến đơn đặt hàng của bạn</li>
                      <li><strong>Tạo và duy trì tài khoản:</strong> Để tạo và duy trì tài khoản của bạn tại hệ thống của chúng tôi</li>
                      <li><strong>Gửi thông tin kinh doanh:</strong> Gửi thư cảm ơn, giới thiệu sản phẩm/dịch vụ mới, thông tin khuyến mãi của Wecare Group</li>
                      <li><strong>Hỗ trợ kinh doanh:</strong> Tư vấn kỹ thuật về sản phẩm, hướng dẫn sử dụng vật tư công trình, hỗ trợ xuất VAT</li>
                      <li><strong>Phản hồi và hỗ trợ:</strong> Giải quyết khiếu nại, yêu cầu của khách hàng</li>
                      <li><strong>Cá nhân hóa dịch vụ:</strong> Cải thiện trải nghiệm mua hàng, đề xuất sản phẩm phù hợp với nhu cầu kinh doanh của bạn</li>
                      <li><strong>An ninh:</strong> Ngăn ngừa các hoạt động phá hủy tài khoản hoặc giả mạo khách hàng</li>
                      <li><strong>Tuân thủ pháp luật:</strong> Các trường hợp có sự yêu cầu của cơ quan nhà nước có thẩm quyền</li>
                    </ul>
                  </div>

                  {/* 4. Thời gian lưu trữ thông tin */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Thời gian lưu trữ thông tin</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Dữ liệu cá nhân của Khách hàng sẽ được lưu trữ cho đến khi có yêu cầu hủy bỏ hoặc theo quy định pháp luật về lưu trữ dữ liệu. Còn lại trong mọi trường hợp thông tin cá nhân khách hàng sẽ được bảo mật trên hệ thống của Wecare Group.
                    </p>
                  </div>

                  {/* 5. Đơn vị thu thập và quản lý thông tin cá nhân */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Đơn vị thu thập và quản lý thông tin cá nhân</h3>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-900 font-semibold text-lg mb-2">Công ty TNHH Wecare Group</p>
                      <div className="text-gray-700 space-y-1">
                        <p><strong>Địa chỉ:</strong> Trụ sở 1: Lô B39, KCN Phú Tài, P. Quy Nhơn Bắc, Gia Lai</p>
                        <p><strong>Địa chỉ:</strong> Trụ sở 2: 14-16-18-20, Đường 36, P. Bình Phú, TP.HCM</p>
                        <p><strong>Điện thoại:</strong> 037 833 9009</p>
                        <p><strong>Email:</strong> support@wecare.com.vn</p>
                      </div>
                    </div>
                  </div>

                  {/* 6. Quyền của Khách hàng đối với thông tin cá nhân */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">6. Quyền của Khách hàng đối với thông tin cá nhân</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Khách hàng có quyền:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                      <li>Cung cấp thông tin cá nhân cho chúng tôi và có thể thay đổi quyết định đó vào bất cứ lúc nào</li>
                      <li>Yêu cầu chỉnh sửa thông tin cá nhân cơ bản như: tên, địa chỉ, thông tin doanh nghiệp</li>
                      <li>Yêu cầu xóa thông tin cá nhân theo quy định pháp luật</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Để thực hiện các quyền trên, khách hàng có thể:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Gọi điện thoại đến tổng đài chăm sóc khách hàng 037 833 9009</li>
                      <li>Gửi email đến support@wecare.com.vn</li>
                      <li>Để lại yêu cầu trực tiếp tại văn phòng công ty</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      Khi nhận được yêu cầu từ Khách hàng, Wecare Group sẽ kiểm tra thông tin và liên lạc với Khách hàng để xác nhận thông tin, thông báo cho Khách hàng biết những rủi ro, ảnh hưởng hoặc thiệt hại có thể xảy ra từ việc chỉnh sửa, xóa dữ liệu đó.
                    </p>
                  </div>

                  {/* 7. Cam kết bảo mật thông tin cá nhân khách hàng */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">7. Cam kết bảo mật thông tin cá nhân khách hàng và an toàn dữ liệu</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Khách hàng có quyền yêu cầu thay đổi hoặc huỷ bỏ thông tin cá nhân của mình. Thông tin cá nhân của khách hàng trên hệ thống Wecare Group được cam kết bảo mật tuyệt đối theo chính sách bảo vệ thông tin cá nhân.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      <strong>Chúng tôi cam kết:</strong>
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Chỉ sử dụng thông tin khách hàng vào các mục đích đã nêu tại mục 3</li>
                      <li>Bảo mật tuyệt đối mọi thông tin giao dịch và dữ liệu khách hàng</li>
                      <li>Sử dụng các biện pháp quản lý, kỹ thuật phù hợp để bảo vệ thông tin</li>
                      <li>Tuân thủ các tiêu chuẩn, quy chuẩn kỹ thuật về bảo đảm an toàn thông tin mạng</li>
                      <li>Lưu trữ thông tin cá nhân khách hàng trong môi trường vận hành an toàn</li>
                      <li>Thông báo kịp thời cho khách hàng trong trường hợp có sự cố bảo mật</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      Wecare Group chỉ cung cấp thông tin cá nhân cho các bên thứ ba khi được sự đồng ý của khách hàng hoặc theo yêu cầu của pháp luật.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-12 bg-blue-50 rounded-lg p-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Liên hệ với chúng tôi</h3>
                <p className="text-gray-700 mb-4">
                  Nếu bạn có bất kỳ câu hỏi nào về Chính sách Bảo mật này, vui lòng liên hệ với chúng tôi:
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">037 833 9009</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700">support@wecare.com.vn</span>
                  </div>
                </div>
              </div>

              {/* Back to Home */}
              <div className="text-center mt-8">
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
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

export default PrivacyPolicyPage;
