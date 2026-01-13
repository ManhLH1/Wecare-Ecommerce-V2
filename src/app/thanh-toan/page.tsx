"use client";
import React from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import JDStyleHeader from "@/components/JDStyleHeader";
import JDStyleMainContent from "@/components/JDStyleMainContent";

const PricingPolicyPage: React.FC = () => {
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
                <section className="py-8 md:py-12">
                  <div className="text-center">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 uppercase">
                      CHÍNH SÁCH GIÁ & CHƯƠNG TRÌNH KHUYẾN MÃI
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-6"></div>
                    <p className="text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                      Hệ thống chính sách giá minh bạch, linh hoạt và các chương trình ưu đãi định kỳ.
                    </p>
                  </div>
                </section>

                {/* Pricing Policy Content */}
                <section className="pb-16">
                  <div className="max-w-5xl mx-auto">

                  <div className="space-y-10">
                    {/* 1. Chính sách giá & chiết khấu */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        1. Chính sách giá & chiết khấu
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed">
                        <ul className="space-y-3 ml-6">
                          <li>• Giá bán sản phẩm được niêm yết rõ ràng và cập nhật theo từng thời điểm, phù hợp với biến động thị trường.</li>
                          <li>• Chiết khấu trực tiếp được áp dụng dựa trên số lượng, giá trị đơn hàng hoặc danh mục sản phẩm.</li>
                          <li>• Đối với khách hàng mua số lượng lớn, khách hàng dự án hoặc đối tác hợp tác dài hạn, Wecare áp dụng chính sách giá riêng theo thỏa thuận cụ thể.</li>
                        </ul>
                      </div>
                    </div>

                    {/* 2. Chương trình ưu đãi & khuyến mãi định kỳ */}
                    <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        2. Chương trình ưu đãi & khuyến mãi định kỳ
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed space-y-4">
                        <p>Wecare triển khai các chương trình ưu đãi định kỳ nhằm tạo điều kiện cho khách hàng tiếp cận mức giá tốt và nhiều lợi ích bổ sung:</p>
                        <ul className="space-y-3 ml-6">
                          <li>• <strong className="text-blue-600">Ưu đãi theo tuần:</strong> Áp dụng cho từng nhóm sản phẩm hoặc danh mục cụ thể.</li>
                          <li>• <strong className="text-green-600">Ưu đãi theo tháng:</strong> Bao gồm giảm giá trực tiếp, combo sản phẩm, hỗ trợ vận chuyển và voucher.</li>
                          <li>• <strong className="text-purple-600">Ưu đãi theo quý:</strong> Áp dụng cho nhóm sản phẩm chủ lực hoặc theo sản lượng mua tích lũy trong quý.</li>
                        </ul>
                      </div>
                    </div>

                    {/* 3. Chính sách vận chuyển (tóm tắt) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        3. Chính sách vận chuyển
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed">
                        <p>Miễn phí vận chuyển (<strong className="text-green-600">Freeship</strong>) cho các đơn hàng đạt giá trị tối thiểu theo quy định của từng chương trình. Phạm vi và thời gian giao hàng được sắp xếp phù hợp với từng khu vực.</p>
                      </div>
                    </div>

                    {/* 4. Voucher & ưu đãi dành cho khách hàng mới */}
                    <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        4. Voucher & ưu đãi dành cho khách hàng mới
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed">
                        <ul className="space-y-3 ml-6">
                          <li>• Voucher trị giá <strong className="text-red-600 text-xl">50.000đ</strong> áp dụng cho khách hàng đặt đơn hàng lần đầu qua Zalo Official Account (Zalo OA) của Wecare.</li>
                          <li>• Voucher được trừ trực tiếp vào giá trị đơn hàng theo điều kiện áp dụng tại thời điểm sử dụng.</li>
                          <li>• Mỗi khách hàng chỉ được áp dụng <strong className="text-blue-600">01 lần</strong> cho đơn hàng đầu tiên.</li>
                        </ul>
                      </div>
                    </div>

                    {/* 5. Cập nhật & điều chỉnh chính sách */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase text-center">
                        5. Cập nhật & điều chỉnh chính sách
                      </h3>
                      <div className="text-lg text-gray-700 leading-relaxed">
                        <p>Các chính sách giá và chương trình ưu đãi - khuyến mãi được cập nhật định kỳ theo tuần, tháng và quý. Wecare có quyền điều chỉnh nội dung chính sách nhằm phù hợp với tình hình kinh doanh và sẽ thông báo trước khi áp dụng.</p>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mt-12 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-xl p-8 text-center">
                      <h3 className="text-3xl font-bold text-gray-900 mb-6 uppercase">Liên hệ</h3>
                      <p className="text-xl text-gray-700 mb-6">
                        Nếu bạn có câu hỏi về chính sách giá hoặc chương trình khuyến mại, vui lòng liên hệ:
                      </p>
                      <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8 mb-6">
                        <div className="flex items-center text-lg">
                          <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <span className="text-gray-700 font-semibold">037 833 9009</span>
                        </div>
                        <div className="flex items-center text-lg">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-gray-700 font-semibold">support@wecare.com.vn</span>
                        </div>
                      </div>
                      <div className="text-lg text-gray-600 border-t border-gray-300 pt-4">
                        <p><strong className="text-pink-600">Thời gian làm việc:</strong> Thứ 2 - Thứ 6 (8:00 - 17:00)</p>
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

export default PricingPolicyPage;


