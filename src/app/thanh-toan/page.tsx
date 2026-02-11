"use client";
import React from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import JDStyleHeader from "@/components/JDStyleHeader";

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
        <div className="w-full max-w-[2560px] mx-auto pt-[115px]">
          <div className="flex flex-col lg:flex-row">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <main className="w-full max-w-[2560px] mx-auto pt-0">

                {/* Page Header */}
                <section className="py-8 md:py-12">
                  <div className="text-center">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 uppercase">
                      CHÍNH SÁCH GIÁ & CHƯƠNG TRÌNH KHUYẾN MÃI
                    </h1>
                    <div className="w-24 h-1 bg-blue-600 mx-auto mb-6"></div>
                    <p className="text-lg md:text-xl text-gray-600 max-w-[1400px] mx-auto leading-relaxed">
                      Hệ thống chính sách giá minh bạch, linh hoạt và các chương trình ưu đãi định kỳ.
                    </p>
                  </div>
                </section>

                {/* Pricing Policy Content */}
                <section className="pb-16 px-4 sm:px-6 lg:px-8">
                  <div className="mx-auto w-full max-w-[1800px]">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">

                      {/* Nội dung chính */}
                      <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-4">
                        <p className="font-semibold text-xl text-gray-900">1. Chính sách giá & chiết khấu:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Giá bán sản phẩm được niêm yết rõ ràng và cập nhật theo từng thời điểm, phù hợp với biến động thị trường.</li>
                          <li>Chiết khấu trực tiếp được áp dụng dựa trên số lượng, giá trị đơn hàng hoặc danh mục sản phẩm.</li>
                          <li>Đối với khách hàng mua số lượng lớn, khách hàng dự án hoặc đối tác hợp tác dài hạn, Wecare áp dụng chính sách giá riêng theo thỏa thuận cụ thể.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">2. Chương trình ưu đãi & khuyến mãi định kỳ:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li><strong>Ưu đãi theo tuần:</strong> Áp dụng cho từng nhóm sản phẩm hoặc danh mục cụ thể.</li>
                          <li><strong>Ưu đãi theo tháng:</strong> Bao gồm giảm giá trực tiếp, combo sản phẩm, hỗ trợ vận chuyển và voucher.</li>
                          <li><strong>Ưu đãi theo quý:</strong> Áp dụng cho nhóm sản phẩm chủ lực hoặc theo sản lượng mua tích lũy trong quý.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">3. Chính sách vận chuyển:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Miễn phí vận chuyển (<strong>Freeship</strong>) cho các đơn hàng đạt giá trị tối thiểu theo quy định của từng chương trình.</li>
                          <li>Phạm vi và thời gian giao hàng được sắp xếp phù hợp với từng khu vực.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">4. Voucher & ưu đãi dành cho khách hàng mới:</p>
                        <ul className="space-y-2 ml-6 list-disc">
                          <li>Voucher trị giá <strong className="text-xl">50.000đ</strong> áp dụng cho khách hàng đặt đơn hàng lần đầu qua Zalo OA của Wecare.</li>
                          <li>Voucher được trừ trực tiếp vào giá trị đơn hàng theo điều kiện áp dụng tại thời điểm sử dụng.</li>
                          <li>Mỗi khách hàng chỉ được áp dụng <strong>01 lần</strong> cho đơn hàng đầu tiên.</li>
                        </ul>

                        <p className="font-semibold text-xl text-gray-900">5. Cập nhật & điều chỉnh chính sách:</p>
                        <p>Các chính sách giá và chương trình ưu đãi được cập nhật định kỳ theo tuần, tháng và quý. Wecare có quyền điều chỉnh nội dung chính sách nhằm phù hợp với tình hình kinh doanh và sẽ thông báo trước khi áp dụng.</p>
                      </div>
                    </div>

                    {/* Contact Information - text thuần, tránh bị tách trang */}
                    <div
                      className="mt-8 bg-white p-0 text-base md:text-lg text-gray-800 leading-relaxed"
                      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                    >
                      <p className="text-2xl font-bold text-gray-900 mb-2 uppercase">Liên hệ</p>
                      <p>Nếu bạn có câu hỏi về chính sách giá hoặc chương trình khuyến mại, vui lòng liên hệ:</p>
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

export default PricingPolicyPage;
