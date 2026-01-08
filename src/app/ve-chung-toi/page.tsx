"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const AboutUsPage = () => {
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
                Đồng hành cùng sự phát triển bền vững
              </h2>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Wecare Group tập trung vào giải pháp cung ứng kim khí – điện nước – vật tư công trình cho đại lý,
                nhà thầu và cửa hàng chuyên ngành trên toàn quốc.
              </p>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Company Introduction */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Về WeCare Group</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Chúng tôi là ai?</h3>
                  <div className="space-y-4 text-body">
                    <p>
                      Wecare Group tập trung vào giải pháp cung ứng kim khí – điện nước – vật tư công trình
                      cho đại lý, nhà thầu và cửa hàng chuyên ngành trên toàn quốc. Với triết lý &ldquo;Đặt sự tử tế lên hàng đầu&rdquo;,
                      Wecare hướng đến việc trở thành nguồn hàng sỉ ổn định, đầy đủ và đáng tin cậy, giúp đối tác
                      tối ưu chi phí nhập hàng, đảm bảo tiến độ thi công và nâng cao hiệu quả kinh doanh lâu dài.
                    </p>
                    <p>
                      Bên cạnh đó, Wecare Group không ngừng mở rộng danh mục sản phẩm, nâng cấp kho bãi và tối ưu
                      quy trình giao nhận để đáp ứng nhu cầu thực tế của hơn 1.000+ đại lý & nhà thầu. Chúng tôi cũng
                      hỗ trợ doanh nghiệp trong công tác xuất VAT, tư vấn chọn vật tư phù hợp và xây dựng giải pháp
                      cung ứng trọn gói cho công trình. Với định hướng chuyên nghiệp – nhanh chóng – minh bạch,
                      Wecare Group đang trở thành một trong những đơn vị cung ứng sỉ được tin tưởng nhất trong ngành
                      kim khí – điện nước tại Việt Nam.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 shadow-lg">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
                        <div className="text-sm text-gray-600">Nhóm sản phẩm</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">10.000+</div>
                        <div className="text-sm text-gray-600">Mã hàng chi tiết</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">3.000+</div>
                        <div className="text-sm text-gray-600">Khách hàng</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">500+</div>
                        <div className="text-sm text-gray-600">Nhà cung cấp</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission, Vision, Core Values */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Sứ mệnh, Tầm nhìn & Giá trị cốt lõi</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Mission */}
                <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">Sứ mệnh</h3>
                  <ul className="text-body space-y-2 text-center">
                    <li>• Đóng góp vào tiến trình đưa Việt Nam trở thành trung tâm sản xuất quan trọng của thế giới.</li>
                    <li>• Tạo nền tảng cung ứng ổn định, hiệu quả và có chiều sâu cho doanh nghiệp sản xuất trong nhiều ngành công nghiệp.</li>
                  </ul>
                </div>

                {/* Vision */}
                <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">Tầm nhìn</h3>
                  <p className="text-body text-center">
                    Định hình lại lĩnh vực thu mua công nghiệp và toàn bộ chuỗi cung ứng bằng Data & AI,
                    xây dựng một mô hình vận hành chuẩn hóa, minh bạch và có khả năng đáp ứng cho các
                    doanh nghiệp sản xuất ở quy mô lớn hơn trong tương lai.
                  </p>
                </div>

                {/* Core Values */}
                <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">Giá trị cốt lõi</h3>
                  <ul className="text-body space-y-2">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      <span><strong>Tử tế:</strong> Minh bạch, đúng cam kết và tôn trọng chuẩn mực trong mọi hoạt động.</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      <span><strong>Bền bỉ:</strong> Duy trì tính ổn định và kỷ luật trong vận hành, kiên định với mục tiêu dài hạn.</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      <span><strong>Đột phá:</strong> Không ngừng cải tiến, ứng dụng công nghệ mới để nâng cao hiệu suất chuỗi cung ứng.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* History and Development */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Lịch sử hình thành và phát triển</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="relative">
                <div className="space-y-8">
                  {/* Company History Content */}
                  <div className="bg-white rounded-xl p-8 shadow-md">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Năng Lực & Quá Trình Phát Triển Của Wecare Group</h3>
                    <div className="space-y-6 text-body">
                      <p>
                        Wecare Group được thành lập vào ngày 25/09/2020, với định hướng xây dựng một hệ thống cung ứng
                        vật tư công nghiệp hoạt động theo tiêu chuẩn cao, lấy công nghệ và dữ liệu làm nền tảng vận hành.
                        Từ những ngày đầu, chúng tôi xác lập mục tiêu phát triển một mô hình có tính tổ chức, ổn định
                        và phù hợp với yêu cầu khắt khe của ngành công nghiệp.
                      </p>
                      <p>
                        Trong quá trình vận hành, Wecare duy trì tốc độ phát triển nhất quán, mở rộng năng lực đáp ứng
                        và hoàn thiện cấu trúc chuỗi cung ứng theo hướng chuyên nghiệp hóa. Sự phát triển này đã tạo
                        tiền đề cho một cột mốc quan trọng: ngày 15/07/2025, Wecare chính thức mở rộng chi nhánh,
                        đánh dấu bước chuyển từ một đơn vị phân phối tập trung sang mô hình có quy mô lớn hơn,
                        giàu năng lực tổ chức hơn và đủ sức đảm nhận những yêu cầu cung ứng phức tạp.
                      </p>
                      <p>
                        Ngày hôm nay, năng lực của Wecare được thể hiện qua hệ thống quản trị thống nhất, khả năng
                        kiểm soát chất lượng ở từng giai đoạn và độ ổn định trong việc đáp ứng nhu cầu từ nhiều nhóm
                        khách hàng công nghiệp. Chúng tôi vận hành dựa trên tính chính xác, sự minh bạch và khả năng
                        điều phối nguồn lực hiệu quả, giúp giảm rủi ro và nâng cao hiệu suất cho doanh nghiệp hợp tác.
                      </p>
                      <p>
                        Wecare hướng đến mô hình cung ứng bền vững và có chiều sâu, đủ mạnh để đồng hành lâu dài
                        cùng các doanh nghiệp trong các kế hoạch tăng trưởng và vận hành chiến lược.
                      </p>
                    </div>
                  </div>

                  {/* Key Milestones */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 rounded-xl p-6 shadow-md text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">25/09/2020</div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Thành lập công ty</h4>
                      <p className="text-body text-sm">
                        Khởi đầu hành trình xây dựng hệ thống cung ứng vật tư công nghiệp
                        chuẩn hóa với công nghệ và dữ liệu làm nền tảng.
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-xl p-6 shadow-md text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">15/07/2025</div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Mở rộng chi nhánh</h4>
                      <p className="text-body text-sm">
                        Chuyển từ đơn vị phân phối tập trung sang mô hình có quy mô lớn hơn,
                        giàu năng lực tổ chức và đảm nhận yêu cầu cung ứng phức tạp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Organization Structure */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Cơ Cấu Tổ Chức - Ban Điều Hành</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="bg-gray-50 rounded-xl p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">CEO</h3>
                    <p className="text-body text-sm text-gray-600">TBD</p>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">CEO</h3>
                    <p className="text-body text-sm text-gray-600">TBD</p>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">CEO</h3>
                    <p className="text-body text-sm text-gray-600">TBD</p>
                  </div>
                </div>
                <p className="text-center text-body text-sm text-gray-500 mt-6">
                  *(Hình ảnh và thông tin chi tiết sẽ được cập nhật)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Thành Tựu Của Chúng Tôi</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-md text-center hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-2">500+</div>
                  <div className="text-sm text-gray-600 mb-2">Nhóm sản phẩm</div>
                  <div className="text-xs text-gray-500">Bu lông, ốc vít, băng keo, dây rút, hóa chất…</div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md text-center hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-2">10.000+</div>
                  <div className="text-sm text-gray-600 mb-2">Mã hàng chi tiết</div>
                  <div className="text-xs text-gray-500">Mã sản phẩm cụ thể và chi tiết</div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md text-center hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mb-2">3.000+</div>
                  <div className="text-sm text-gray-600 mb-2">Khách hàng</div>
                  <div className="text-xs text-gray-500">Cửa hàng kim khí, điện nước & nhà máy</div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md text-center hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-orange-600 mb-2">500+</div>
                  <div className="text-sm text-gray-600 mb-2">Nhà cung cấp</div>
                  <div className="text-xs text-gray-500">Miền Nam, Trung Quốc, miền Bắc và vùng khác</div>
                </div>
              </div>

              <div className="mt-8 bg-white rounded-xl p-6 shadow-md">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Nhân viên</h3>
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-red-600 mb-2">100+</div>
                  <div className="text-sm text-gray-600 mb-4">Nhân viên</div>
                  <div className="text-xs text-gray-500 text-center max-w-md mx-auto">
                    Các bộ phận: Kho vận, Kế Toán, Kinh Doanh, IT, Mua hàng, Xuất nhập khẩu, Nhân sự
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Company Culture */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Văn hóa doanh nghiệp</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-md text-center hover:shadow-lg transition-shadow duration-300">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Tử tế</h3>
                    <p className="text-body text-sm">
                      Minh bạch, đúng cam kết và tôn trọng chuẩn mực trong mọi hoạt động.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md text-center hover:shadow-lg transition-shadow duration-300">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Bền bỉ</h3>
                    <p className="text-body text-sm">
                      Duy trì tính ổn định và kỷ luật trong vận hành, kiên định với mục tiêu dài hạn.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md text-center hover:shadow-lg transition-shadow duration-300">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Đột phá</h3>
                    <p className="text-body text-sm">
                      Không ngừng cải tiến, ứng dụng công nghệ mới để nâng cao hiệu suất chuỗi cung ứng.
                    </p>
                  </div>
                </div>
            </div>
          </div>
        </section>

        {/* Certifications and Partners */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Chứng nhận và Đối tác</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Certifications */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Chứng nhận chất lượng</h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
                      <h4 className="font-semibold text-gray-900 mb-2">ISO 9001:2015</h4>
                      <p className="text-body text-sm">
                        Hệ thống quản lý chất lượng được chứng nhận quốc tế, đảm bảo quy trình
                        kinh doanh đạt chuẩn mực cao nhất.
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-green-500">
                      <h4 className="font-semibold text-gray-900 mb-2">Chứng nhận an toàn</h4>
                      <p className="text-body text-sm">
                        Cam kết về an toàn lao động và bảo vệ môi trường trong tất cả hoạt động kinh doanh.
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-purple-500">
                      <h4 className="font-semibold text-gray-900 mb-2">Chứng nhận phân phối</h4>
                      <p className="text-body text-sm">
                        Đối tác phân phối chính thức của các thương hiệu hàng đầu trong ngành.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Strategic Partners */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Đối tác chiến lược</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow duration-300">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-blue-600 font-bold">A</span>
                      </div>
                      <div className="font-semibold text-gray-900 text-sm">Công ty A</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow duration-300">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-green-600 font-bold">B</span>
                      </div>
                      <div className="font-semibold text-gray-900 text-sm">Công ty B</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow duration-300">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-purple-600 font-bold">C</span>
                      </div>
                      <div className="font-semibold text-gray-900 text-sm">Công ty C</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow duration-300">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-orange-600 font-bold">D</span>
                      </div>
                      <div className="font-semibold text-gray-900 text-sm">Công ty D</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Phản hồi từ khách hàng và đối tác</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-bold">KH</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Nguyễn Văn A</div>
                      <div className="text-sm text-gray-600">CEO Công ty ABC</div>
                    </div>
                  </div>
                  <div className="flex text-yellow-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-body text-sm italic">
                    &ldquo;WeCare Group đã đồng hành cùng chúng tôi trong suốt 3 năm qua.
                    Dịch vụ chuyên nghiệp, sản phẩm chất lượng, luôn đáp ứng đúng hẹn.&rdquo;
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-green-600 font-bold">DT</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Trần Thị B</div>
                      <div className="text-sm text-gray-600">Giám đốc Công ty XYZ</div>
                    </div>
                  </div>
                  <div className="flex text-yellow-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-body text-sm italic">
                    &ldquo;Đội ngũ tư vấn chuyên nghiệp, giải pháp phù hợp với nhu cầu kinh doanh.
                    Rất hài lòng với chất lượng dịch vụ của WeCare Group.&rdquo;
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-purple-600 font-bold">PP</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Lê Văn C</div>
                      <div className="text-sm text-gray-600">Chủ doanh nghiệp</div>
                    </div>
                  </div>
                  <div className="flex text-yellow-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-body text-sm italic">
                    &ldquo;Từ khi hợp tác với WeCare Group, hiệu quả kinh doanh tăng 30%.
                    Sản phẩm chất lượng, giá cả cạnh tranh, dịch vụ hậu mãi tốt.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Partnership Opportunities */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Cơ hội hợp tác</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Chính sách đại lý</h3>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-blue-900 mb-3">Hỗ trợ đào tạo</h4>
                      <p className="text-blue-800">
                        Cung cấp chương trình đào tạo chuyên sâu về sản phẩm và kỹ năng kinh doanh
                        cho đội ngũ đại lý, đảm bảo năng lực cạnh tranh trên thị trường.
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-green-900 mb-3">Hỗ trợ marketing</h4>
                      <p className="text-green-800">
                        Cung cấp tài liệu marketing, hỗ trợ quảng bá thương hiệu,
                        chương trình khuyến mãi chung để tăng doanh số.
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-purple-900 mb-3">Hỗ trợ tài chính</h4>
                      <p className="text-purple-800">
                        Chính sách thanh toán linh hoạt, hỗ trợ vốn lưu động,
                        ưu đãi về chiết khấu và hoa hồng hấp dẫn.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Lợi ích khi hợp tác</h3>
                  <div className="bg-gray-50 rounded-xl p-8">
                    <ul className="space-y-4">
                      <li className="flex items-start">
                        <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <strong className="text-gray-900">Doanh thu ổn định:</strong>
                          <span className="text-gray-700 ml-1">Hoa hồng và chiết khấu hấp dẫn từ mỗi giao dịch</span>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <strong className="text-gray-900">Hỗ trợ toàn diện:</strong>
                          <span className="text-gray-700 ml-1">Đào tạo, marketing, kỹ thuật 24/7</span>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <strong className="text-gray-900">Mở rộng mạng lưới:</strong>
                          <span className="text-gray-700 ml-1">Kết nối với cộng đồng doanh nghiệp lớn</span>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <strong className="text-gray-900">Công nghệ hiện đại:</strong>
                          <span className="text-gray-700 ml-1">Hệ thống quản lý và bán hàng online</span>
                        </div>
                      </li>
                    </ul>

                    <div className="mt-8 text-center">
                      <Link
                        href="/lien-he"
                        className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        Liên hệ hợp tác
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Các sản phẩm tiêu biểu</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
                <p className="text-body max-w-3xl mx-auto">
                  Khám phá các sản phẩm chất lượng cao từ WeCare Group,
                  đáp ứng mọi nhu cầu kinh doanh và sản xuất của doanh nghiệp bạn.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Vật tư công nghiệp</h3>
                    <p className="text-body text-sm mb-4">
                      Các loại vật tư, phụ kiện công nghiệp chất lượng cao,
                      đáp ứng tiêu chuẩn kỹ thuật nghiêm ngặt.
                    </p>
                    <Link
                      href="/san-pham"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Khám phá ngay
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="h-48 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                    <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Hóa chất công nghiệp</h3>
                    <p className="text-body text-sm mb-4">
                      Hóa chất chuyên dụng cho công nghiệp, đảm bảo an toàn
                      và hiệu quả trong quá trình sản xuất.
                    </p>
                    <Link
                      href="/san-pham"
                      className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
                    >
                      Khám phá ngay
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="h-48 bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                    <svg className="w-16 h-16 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Thiết bị công nghiệp</h3>
                    <p className="text-body text-sm mb-4">
                      Thiết bị và máy móc công nghiệp hiện đại,
                      hỗ trợ tối ưu hóa quy trình sản xuất.
                    </p>
                    <Link
                      href="/san-pham"
                      className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Khám phá ngay
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="text-center mt-12">
                <Link
                  href="/san-pham"
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Xem tất cả sản phẩm
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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

export default AboutUsPage;
