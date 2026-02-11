"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const CooperationPage = () => {
  return (
    <div className="bg-white">
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24">
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
                  HỢP TÁC VỚI CHÚNG TÔI
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                Đồng hành cùng sự phát triển bền vững
              </h2>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Xây dựng mối quan hệ hợp tác lâu dài trên tinh thần cùng phát triển,
                cùng tạo giá trị cho khách hàng và đối tác trên toàn quốc.
              </p>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Introduction Section */}
        <section className="py-8 bg-white">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="title-section text-center mb-3">Về sự hợp tác cùng Wecare Group</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-4"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Sứ mệnh của chúng tôi</h3>
                  <div className="space-y-2 text-body">
                    <p className="leading-relaxed">
                      Trong bối cảnh sản xuất và vận hành ngày càng đòi hỏi tính ổn định, hiệu quả và tối ưu chi phí,
                      Wecare Group được thành lập với sứ mệnh xây dựng một hệ sinh thái cung ứng thiết bị – vật tư công nghiệp toàn diện,
                      nơi mọi doanh nghiệp, từ cửa hàng bán lẻ đến nhà máy, khu công nghiệp đều có thể tìm thấy giải pháp phù hợp,
                      chính hãng và tối ưu nhất.
                    </p>
                    <p className="leading-relaxed">
                      Với định hướng phát triển bền vững, Wecare Group không chỉ đơn thuần là nhà phân phối,
                      mà còn là đối tác chiến lược đồng hành lâu dài, luôn sẵn sàng mở rộng hợp tác trên tinh thần cùng phát triển –
                      cùng tạo giá trị cho khách hàng và đối tác trên toàn quốc.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">5+</div>
                        <div className="text-sm text-gray-600">Năm kinh nghiệm</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">10.000+</div>
                        <div className="text-sm text-gray-600">Khách hàng</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">10.000+</div>
                        <div className="text-sm text-gray-600">Mã sản phẩm</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">100%</div>
                        <div className="text-sm text-gray-600">Chính hãng</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cooperation Reasons */}
        <section className="py-8 bg-white">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="title-section text-center mb-3">Tại sao nên hợp tác cùng Wecare Group?</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-4"></div>
              </div>

              {/* 1. Strong Capabilities & Experience */}
              <div className="p-5 mb-5">
                <div className="flex items-start">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">1. Năng lực & kinh nghiệm vững chắc</h3>
                    <p className="text-body mb-2 leading-relaxed">
                      Wecare Group sở hữu hơn 5 năm kinh nghiệm trong lĩnh vực cung ứng thiết bị – vật tư công nghiệp.
                      Chúng tôi đã và đang phục vụ hơn 10.000 khách hàng, bao gồm các cửa hàng bán lẻ, nhà máy sản xuất,
                      doanh nghiệp xây dựng và khu công nghiệp trên khắp cả nước.
                    </p>
                    <p className="text-body">
                      Sự am hiểu thị trường cùng kinh nghiệm thực tiễn giúp Wecare đưa ra giải pháp cung ứng phù hợp,
                      linh hoạt và hiệu quả cho từng đối tác.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Diverse Product Catalog */}
              <div className="p-5 mb-5">
                <div className="flex items-start">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">2. Danh mục sản phẩm đa dạng – nguồn hàng ổn định</h3>
                    <p className="text-body mb-2 leading-relaxed">
                      Wecare Group hiện cung ứng hơn 10.000 mã sản phẩm, đáp ứng đầy đủ các nhu cầu thiết yếu trong sản xuất và vận hành công nghiệp.
                    </p>
                    <p className="text-body mb-2 leading-relaxed">
                      Danh mục sản phẩm phong phú, luôn sẵn hàng tại kho, giúp đối tác chủ động nguồn cung – giảm rủi ro đứt gãy chuỗi cung ứng.
                    </p>
                    <p className="text-body mb-2 leading-relaxed">
                      Chúng tôi là đơn vị phân phối chính hãng của nhiều thương hiệu uy tín hàng đầu trên thị trường như:
                      Apollo, Cadivi, Đạt Hòa, Hoa Sen, Panasonic, Nanoco,…
                    </p>
                    <p className="text-body leading-relaxed">
                      Toàn bộ sản phẩm đều có đầy đủ giấy tờ pháp lý, hóa đơn VAT, đảm bảo minh bạch và an tâm tuyệt đối khi kinh doanh.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Superior Cooperation & Sales Policies */}
              <div className="p-5 mb-5">
                <div className="flex items-start">
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">3. Chính sách hợp tác & bán hàng vượt trội</h3>
                    <p className="text-body mb-2 leading-relaxed">
                      Wecare Group xây dựng chính sách bán hàng cạnh tranh và linh hoạt, đặc biệt tối ưu cho hệ thống cửa hàng và đại lý:
                    </p>
                    <ul className="space-y-1.5 text-body mb-2 leading-relaxed">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Chiết khấu hấp dẫn theo sản lượng, giúp tối đa hóa lợi nhuận</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Giá cả ổn định, cạnh tranh lâu dài</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Hỗ trợ tư vấn sản phẩm và giải pháp phù hợp với từng mô hình kinh doanh</span>
                      </li>
                    </ul>
                    <p className="text-body leading-relaxed">
                      Chúng tôi cam kết mang đến lợi ích thực tế và bền vững, giúp đối tác tăng trưởng doanh thu và mở rộng thị trường.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Fast & Professional Logistics */}
              <div className="p-5 mb-5">
                <div className="flex items-start">
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">4. Hậu cần – giao nhận nhanh chóng, chuyên nghiệp</h3>
                    <p className="text-body mb-2 leading-relaxed">
                      Wecare Group đầu tư mạnh vào hệ thống kho vận và logistics nhằm đảm bảo:
                    </p>
                    <ul className="space-y-1.5 text-body mb-2 leading-relaxed">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Giao hàng nhanh chóng, tận nơi trên toàn quốc</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Miễn phí vận chuyển</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        <span>Tồn kho lớn, đáp ứng đơn hàng số lượng lớn trong thời gian ngắn</span>
                      </li>
                    </ul>
                    <p className="text-body leading-relaxed">
                      Nhờ đó, đối tác có thể giảm áp lực tồn kho, tiết kiệm chi phí vận hành và nâng cao hiệu quả kinh doanh.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Flexible Return Policy */}
              <div className="p-5 mb-5">
                <div className="flex items-start">
                  <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">5. Chính sách đổi trả linh hoạt – an tâm hợp tác</h3>
                    <p className="text-body mb-2 leading-relaxed">
                      Nhằm đảm bảo quyền lợi tối đa cho đối tác, Wecare Group áp dụng chính sách đổi trả linh hoạt trong vòng 10 ngày,
                      không phát sinh bất kỳ chi phí nào.
                    </p>
                    <p className="text-body leading-relaxed">
                      Chính sách này thể hiện cam kết của chúng tôi trong việc đặt lợi ích đối tác lên hàng đầu,
                      xây dựng niềm tin và mối quan hệ hợp tác lâu dài.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-8 bg-white">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Bắt đầu hợp tác cùng Wecare Group</h2>
              <p className="text-lg text-gray-600 mb-5 leading-relaxed">
                Hãy liên hệ với chúng tôi ngay hôm nay để khám phá cơ hội hợp tác
                và cùng nhau tạo nên những giá trị bền vững trong ngành công nghiệp.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/lien-he"
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Liên hệ hợp tác
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/san-pham"
                  className="inline-flex items-center px-8 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-300"
                >
                  Khám phá sản phẩm
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

export default CooperationPage;