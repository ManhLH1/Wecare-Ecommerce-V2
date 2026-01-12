"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const PricingPolicyPage = () => {
  return (
    <div className="bg-gray-50">
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white overflow-hidden">
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
                Chính Sách Giá & Chương Trình Khuyến Mãi
              </h2>
              <p className="text-lg md:text-xl text-pink-100 max-w-3xl mx-auto leading-relaxed">
                Hệ thống chính sách giá minh bạch, linh hoạt và các chương trình ưu đãi định kỳ.
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </section>

        {/* Pricing Policy Content */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">CHÍNH SÁCH GIÁ & CHƯƠNG TRÌNH KHUYẾN MÃI</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mb-8"></div>
                <p className="text-gray-600 text-lg">
                  Wecare xây dựng hệ thống chính sách giá minh bạch và linh hoạt, kết hợp với các chương trình ưu đãi - khuyến mãi được triển khai định kỳ theo tuần, tháng và quý, nhằm hỗ trợ khách hàng tối ưu chi phí mua hàng và đảm bảo nguồn cung ổn định.
                </p>
              </div>

              <div className="prose prose-lg max-w-none">
                <div className="space-y-8">
                  {/* 1. Chính sách giá & chiết khấu */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Chính sách giá & chiết khấu</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Giá bán sản phẩm được niêm yết rõ ràng và cập nhật theo từng thời điểm, phù hợp với biến động thị trường.</li>
                      <li>Chiết khấu trực tiếp được áp dụng dựa trên số lượng, giá trị đơn hàng hoặc danh mục sản phẩm.</li>
                      <li>Đối với khách hàng mua số lượng lớn, khách hàng dự án hoặc đối tác hợp tác dài hạn, Wecare áp dụng chính sách giá riêng theo thỏa thuận cụ thể.</li>
                    </ul>
                  </div>

                  {/* 2. Chương trình ưu đãi & khuyến mãi định kỳ */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Chương trình ưu đãi & khuyến mãi định kỳ</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Wecare triển khai các chương trình ưu đãi định kỳ nhằm tạo điều kiện cho khách hàng tiếp cận mức giá tốt và nhiều lợi ích bổ sung:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li><strong>Ưu đãi theo tuần:</strong> Áp dụng cho từng nhóm sản phẩm hoặc danh mục cụ thể.</li>
                      <li><strong>Ưu đãi theo tháng:</strong> Bao gồm giảm giá trực tiếp, combo sản phẩm, hỗ trợ vận chuyển và voucher.</li>
                      <li><strong>Ưu đãi theo quý:</strong> Áp dụng cho nhóm sản phẩm chủ lực hoặc theo sản lượng mua tích lũy trong quý.</li>
                    </ul>
                  </div>

                  {/* 3. Chính sách vận chuyển (tóm tắt) */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Chính sách vận chuyển</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Miễn phí vận chuyển (Freeship) cho các đơn hàng đạt giá trị tối thiểu theo quy định của từng chương trình. Phạm vi và thời gian giao hàng được sắp xếp phù hợp với từng khu vực.
                    </p>
                  </div>

                  {/* 4. Voucher & ưu đãi dành cho khách hàng mới */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Voucher & ưu đãi dành cho khách hàng mới</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                      <li>Voucher trị giá <strong>50.000đ</strong> áp dụng cho khách hàng đặt đơn hàng lần đầu qua Zalo Official Account (Zalo OA) của Wecare.</li>
                      <li>Voucher được trừ trực tiếp vào giá trị đơn hàng theo điều kiện áp dụng tại thời điểm sử dụng.</li>
                      <li>Mỗi khách hàng chỉ được áp dụng 01 lần cho đơn hàng đầu tiên.</li>
                    </ul>
                  </div>

                  {/* 5. Cập nhật & điều chỉnh chính sách */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Cập nhật & điều chỉnh chính sách</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Các chính sách giá và chương trình ưu đãi - khuyến mãi được cập nhật định kỳ theo tuần, tháng và quý. Wecare có quyền điều chỉnh nội dung chính sách nhằm phù hợp với tình hình kinh doanh và sẽ thông báo trước khi áp dụng.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-12 bg-pink-50 rounded-lg p-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Liên hệ</h3>
                <p className="text-gray-700 mb-4">
                  Nếu bạn có câu hỏi về chính sách giá hoặc chương trình khuyến mại, vui lòng liên hệ:
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-pink-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">037 833 9009</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-pink-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg"
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

export default PricingPolicyPage;


