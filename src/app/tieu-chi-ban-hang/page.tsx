"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const SalesCriteriaPage = () => {
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
                  TIÊU CHÍ BÁN HÀNG
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                Cam kết chất lượng - Uy tín - Chuyên nghiệp
              </h2>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Wecare Group luôn đặt lợi ích khách hàng lên hàng đầu,
                mang đến những trải nghiệm mua sắm tốt nhất với tiêu chí bán hàng chuyên nghiệp.
              </p>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Sales Criteria Introduction */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Tiêu chí bán hàng của WeCare Group</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Cam kết với khách hàng</h3>
                  <div className="space-y-4 text-body">
                    <p>
                      Wecare Group xây dựng nền tảng kinh doanh vững chắc dựa trên 6 tiêu chí bán hàng cốt lõi,
                      đảm bảo mang đến cho khách hàng trải nghiệm mua sắm tốt nhất với sản phẩm chất lượng,
                      dịch vụ chuyên nghiệp và giá cả cạnh tranh.
                    </p>
                    <p>
                      Chúng tôi cam kết đồng hành cùng quý khách hàng trong mọi giai đoạn từ tư vấn,
                      đặt hàng cho đến giao nhận và bảo hành sản phẩm.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 shadow-lg">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
                        <div className="text-sm text-gray-600">Hàng chính hãng</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">500+</div>
                        <div className="text-sm text-gray-600">Nhóm sản phẩm</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">3.000+</div>
                        <div className="text-sm text-gray-600">Khách hàng</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
                        <div className="text-sm text-gray-600">Hỗ trợ</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sales Criteria Details */}
        <section className="py-16 bg-gray-50">
          <div className="container-responsive">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Genuine Products */}
                <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">HÀNG CHÍNH HÃNG – NGUỒN GỐC RÕ RÀNG</h3>
                  <p className="text-body text-center">
                    Wecare Group định hướng phát triển bền vững với các sản phẩm chính hãng 100%, có đầy đủ chứng từ và xuất xứ rõ ràng. Chúng tôi hợp tác trực tiếp với các thương hiệu uy tín trong và ngoài nước, cam kết chất lượng, độ bền cao cùng chế độ bảo hành minh bạch theo tiêu chuẩn nhà sản xuất.
                  </p>
                </div>

                {/* 2. Competitive Pricing */}
                <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">GIÁ THÀNH CẠNH TRANH – TỐI ƯU CHI PHÍ</h3>
                  <p className="text-body text-center">
                    Nhờ lợi thế phân phối trực tiếp và mối quan hệ chặt chẽ với các nhãn hàng, Wecare Group luôn mang đến mức giá cạnh tranh, phù hợp với nhu cầu đầu tư của khách hàng cá nhân và doanh nghiệp. Chính sách giá rõ ràng, nhiều ưu đãi hấp dẫn cho đơn hàng lớn và khách hàng lâu năm.
                  </p>
                </div>

                {/* 3. Diverse Products */}
                <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">ĐA DẠNG SẢN PHẨM CÔNG NGHIỆP</h3>
                  <p className="text-body text-center">
                    Wecare Group cung cấp danh mục sản phẩm phong phú với hàng ngàn mặt hàng thuộc nhiều lĩnh vực như: vật tư kim khí, thiết bị ngành điện, ngành nước, hóa chất công nghiệp… đáp ứng đa dạng nhu cầu sử dụng trong sản xuất và kinh doanh.
                  </p>
                </div>

                {/* 4. Enthusiastic Consultation */}
                <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">TƯ VẤN NHIỆT TÌNH – ĐÚNG NHU CẦU</h3>
                  <p className="text-body text-center">
                    Đội ngũ nhân viên Wecare Group luôn làm việc với tinh thần nhiệt tình – tận tâm – trách nhiệm, sẵn sàng lắng nghe và tư vấn chi tiết từng thắc mắc của khách hàng. Chúng tôi cam kết tư vấn đúng sản phẩm, đúng công năng, giúp khách hàng đưa ra quyết định nhanh chóng và hiệu quả.
                  </p>
                </div>

                {/* 5. Fast Delivery */}
                <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">GIAO HÀNG NHANH CHÓNG – LINH HOẠT</h3>
                  <p className="text-body text-center">
                    Wecare Group hỗ trợ giao hàng nhanh trên toàn quốc, đảm bảo đúng tiến độ, an toàn và thuận tiện cho khách hàng trong quá trình nhận và sử dụng sản phẩm.
                  </p>
                </div>

                {/* 6. Professional After-sales Service */}
                <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">DỊCH VỤ HẬU MÃI CHU ĐÁO</h3>
                  <p className="text-body text-center">
                    Chúng tôi chú trọng xây dựng dịch vụ hậu mãi chuyên nghiệp với các chính sách bảo hành chính hãng, hỗ trợ kỹ thuật, tư vấn sử dụng và bảo trì. Wecare Group luôn đồng hành cùng khách hàng trong suốt quá trình sử dụng, hướng đến sự hài lòng và hợp tác lâu dài.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Liên hệ với chúng tôi ngay hôm nay</h2>
              <p className="text-lg text-gray-600 mb-8">
                Đội ngũ chuyên nghiệp của Wecare Group luôn sẵn sàng hỗ trợ quý khách hàng
                với những giải pháp tốt nhất cho nhu cầu kinh doanh của bạn.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/lien-he"
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Liên hệ ngay
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/san-pham"
                  className="inline-flex items-center px-8 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-300"
                >
                  Xem sản phẩm
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

export default SalesCriteriaPage;
