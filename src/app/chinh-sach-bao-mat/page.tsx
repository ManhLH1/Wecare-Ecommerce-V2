"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/footer';
import Toolbar from '@/components/toolbar';
import LogoSvg from '@/assets/img/Logo-Wecare.png';

const PrivacyPolicyPage = () => {
  return (
    <div className="bg-white min-h-screen">
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

        {/* Table of Contents */}
        <section className="py-8 bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                <a href="#thu-thap" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-300">
                  Thu thập thông tin
                </a>
                <a href="#muc-dich" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-300">
                  Mục đích sử dụng
                </a>
                <a href="#bao-mat" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-300">
                  Bảo mật
                </a>
                <a href="#quyen-chinh-sua" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-300">
                  Quyền chỉnh sửa
                </a>
                <a href="#cap-nhat" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-300">
                  Cập nhật
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Policy Content */}
        <section className="py-16 bg-white">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="title-section text-center mb-6">Chính Sách Bảo Mật Thông Tin Khách Hàng</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8"></div>
              </div>

              <div className="space-y-8">
                {/* 1. Loại thông tin được thu thập */}
                <div id="thu-thap" className="scroll-mt-24">
                  <div className="flex items-start mb-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mr-4 shadow-lg">
                      1
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 pt-2">Loại thông tin được thu thập</h3>
                  </div>

                  <div className="space-y-4 text-gray-700 leading-relaxed">
                    <p>
                      Trong quá trình khách hàng truy cập và sử dụng website, Wecare Group có thể tiếp nhận các dữ liệu cá nhân do khách hàng chủ động cung cấp thông qua biểu mẫu liên hệ, đăng ký tư vấn hoặc đặt mua sản phẩm.
                    </p>

                    <div className="bg-white rounded-xl p-6 border border-blue-100">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Các dữ liệu có thể bao gồm:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                          <span>Họ tên</span>
                        </div>
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                          <span>Số điện thoại</span>
                        </div>
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                          <span>Địa chỉ email</span>
                        </div>
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                          <span>Địa chỉ liên hệ</span>
                        </div>
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg md:col-span-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                          <span>Nội dung trao đổi</span>
                        </div>
                      </div>
                    </div>

                    <p>
                      Việc thu thập thông tin nhằm phục vụ cho hoạt động tư vấn, xác nhận nhu cầu, xử lý giao dịch và liên hệ với khách hàng, qua đó đảm bảo quyền lợi hợp pháp của người tiêu dùng trong quá trình sử dụng sản phẩm và dịch vụ của Wecare Group.
                    </p>

                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                      <div className="flex items-start">
                        <svg className="w-6 h-6 text-amber-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="font-semibold text-amber-800 mb-1">Lưu ý quan trọng</p>
                          <p className="text-amber-700 text-sm">
                            Khách hàng có trách nhiệm tự bảo mật các thông tin đã cung cấp cũng như chịu trách nhiệm đối với toàn bộ hoạt động phát sinh liên quan đến dữ liệu cá nhân của mình. Trường hợp phát hiện hành vi sử dụng trái phép, mạo danh, vi phạm bảo mật hoặc sử dụng thông tin đăng ký của bên thứ ba, khách hàng cần thông báo kịp thời cho Wecare Group để phối hợp xử lý.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Mục đích và phạm vi sử dụng dữ liệu */}
                <div id="muc-dich" className="scroll-mt-24">
                  <div className="flex items-start mb-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mr-4 shadow-lg">
                      2
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 pt-2">Mục đích và phạm vi sử dụng dữ liệu</h3>
                  </div>

                  <div className="space-y-4 text-gray-700 leading-relaxed">
                    <p>
                      Thông tin cá nhân của khách hàng được Wecare Group sử dụng cho các mục đích sau:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-green-100 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </div>
                          <h5 className="font-semibold text-gray-900">Xác nhận đơn hàng</h5>
                        </div>
                        <p className="text-sm text-gray-600">Hỗ trợ giao nhận sản phẩm theo yêu cầu của khách hàng</p>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-green-100 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h5 className="font-semibold text-gray-900">Cung cấp thông tin</h5>
                        </div>
                        <p className="text-sm text-gray-600">Thông tin liên quan đến sản phẩm, dịch vụ khi khách hàng có nhu cầu</p>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-green-100 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                          </div>
                          <h5 className="font-semibold text-gray-900">Tiếp thị & Khuyến mại</h5>
                        </div>
                        <p className="text-sm text-gray-600">Gửi thông tin chương trình ưu đãi hoặc khuyến mại</p>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-green-100 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </div>
                          <h5 className="font-semibold text-gray-900">Thông báo cập nhật</h5>
                        </div>
                        <p className="text-sm text-gray-600">Thông báo các hoạt động phát sinh trên website</p>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-green-100 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <h5 className="font-semibold text-gray-900">Hỗ trợ giao dịch</h5>
                        </div>
                        <p className="text-sm text-gray-600">Xử lý các tình huống cần thiết trong quá trình giao dịch</p>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-green-100 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <h5 className="font-semibold text-gray-900">Tuân thủ pháp luật</h5>
                        </div>
                        <p className="text-sm text-gray-600">Cung cấp thông tin theo yêu cầu của cơ quan nhà nước có thẩm quyền</p>
                      </div>
                    </div>

                    <div className="bg-green-100 border border-green-200 p-4 rounded-xl mt-4">
                      <div className="flex items-center">
                        <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-800 font-medium">
                          Wecare Group không sử dụng dữ liệu cá nhân của khách hàng cho các mục đích ngoài phạm vi liên quan đến giao dịch, liên hệ và chăm sóc khách hàng.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Bảo mật thông tin cá nhân */}
                <div id="bao-mat" className="scroll-mt-24">
                  <div className="flex items-start mb-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mr-4 shadow-lg">
                      3
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 pt-2">Bảo mật thông tin cá nhân</h3>
                  </div>

                  <div className="space-y-6 text-gray-700 leading-relaxed">
                    <div className="flex items-start bg-white p-5 rounded-xl border border-purple-100">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Biện pháp bảo vệ</h4>
                        <p className="text-gray-600">
                          Wecare Group áp dụng các biện pháp quản lý và kỹ thuật phù hợp nhằm bảo vệ dữ liệu cá nhân của khách hàng khỏi nguy cơ truy cập trái phép, mất mát hoặc sử dụng sai mục đích.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start bg-white p-5 rounded-xl border border-purple-100">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Sự đồng ý của khách hàng</h4>
                        <p className="text-gray-600">
                          Việc thu thập và xử lý thông tin cá nhân được thực hiện trên cơ sở sự đồng ý của khách hàng, trừ trường hợp pháp luật có quy định khác.
                        </p>
                      </div>
                    </div>

                    <div className="bg-purple-100 border border-purple-200 p-5 rounded-xl">
                      <div className="flex items-start">
                        <svg className="w-8 h-8 text-purple-600 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div>
                          <h4 className="font-bold text-purple-900 mb-2">Cam kết của Wecare Group</h4>
                          <p className="text-purple-800">
                            Wecare Group cam kết <strong>không chia sẻ</strong>, <strong>không chuyển giao</strong> hoặc <strong>tiết lộ dữ liệu cá nhân</strong> cho bất kỳ tổ chức hay cá nhân nào khác khi chưa có sự chấp thuận từ khách hàng.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-purple-100">
                        <div className="flex items-center mb-3">
                          <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <h5 className="font-semibold text-gray-900">Xử lý sự cố</h5>
                        </div>
                        <p className="text-sm text-gray-600">
                          Trong trường hợp xảy ra sự cố an toàn dữ liệu do nguyên nhân khách quan, Wecare Group sẽ phối hợp với cơ quan chức năng để xử lý và thông báo đến khách hàng.
                        </p>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-purple-100">
                        <div className="flex items-center mb-3">
                          <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h5 className="font-semibold text-gray-900">Trách nhiệm khách hàng</h5>
                        </div>
                        <p className="text-sm text-gray-600">
                          Khách hàng có trách nhiệm cung cấp thông tin chính xác. Wecare Group không chịu trách nhiệm nếu thông tin cung cấp không đầy đủ hoặc không chính xác.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Quyền chỉnh sửa và xóa dữ liệu */}
                <div id="quyen-chinh-sua" className="scroll-mt-24">
                  <div className="flex items-start mb-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-orange-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mr-4 shadow-lg">
                      4
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 pt-2">Quyền chỉnh sửa và xóa dữ liệu</h3>
                  </div>

                  <div className="space-y-6 text-gray-700 leading-relaxed">
                    <div className="bg-white p-6 rounded-xl border border-orange-100">
                      <div className="flex items-center mb-4">
                        <svg className="w-8 h-8 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <h4 className="text-lg font-semibold text-gray-900">Quyền của khách hàng</h4>
                      </div>
                      <p className="text-gray-600 mb-4">
                        Khách hàng có quyền yêu cầu kiểm tra, chỉnh sửa hoặc xóa toàn bộ hay một phần dữ liệu cá nhân đã cung cấp cho Wecare Group.
                      </p>

                      <div className="bg-orange-50 p-5 rounded-xl border border-orange-200">
                        <div className="flex items-center mb-3">
                          <svg className="w-6 h-6 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="font-semibold text-orange-900">Gửi yêu cầu tại:</span>
                        </div>
                        <a
                          href="mailto:mkt.lead@wecare-i.com"
                          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-300"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          mkt.lead@wecare-i.com
                        </a>
                        <p className="text-sm text-orange-700 mt-3">
                          Sau khi tiếp nhận yêu cầu hợp lệ, Wecare Group sẽ tiến hành xử lý theo quy định nội bộ.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Cập nhật chính sách */}
                <div id="cap-nhat" className="scroll-mt-24">
                  <div className="flex items-start mb-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-cyan-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mr-4 shadow-lg">
                      5
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 pt-2">Cập nhật chính sách</h3>
                  </div>

                  <div className="space-y-4 text-gray-700 leading-relaxed">
                    <div className="bg-white p-6 rounded-xl border border-cyan-100">
                      <div className="flex items-start">
                        <svg className="w-8 h-8 text-cyan-600 mr-4 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <div>
                          <p className="text-gray-700 mb-4">
                            Wecare Group có quyền điều chỉnh nội dung Chính sách Bảo mật này khi cần thiết nhằm phù hợp với hoạt động kinh doanh và quy định pháp luật.
                          </p>
                          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                            <div className="flex items-center">
                              <svg className="w-5 h-5 text-cyan-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-cyan-800 font-medium">
                                Phiên bản cập nhật sẽ được công bố công khai trên website và có hiệu lực kể từ thời điểm đăng tải.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">Liên hệ với chúng tôi</h3>
                  <p className="text-blue-100 mb-6">
                    Nếu bạn có bất kỳ câu hỏi nào về Chính sách Bảo mật này, vui lòng liên hệ với chúng tôi:
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <a href="tel:0378339009" className="flex items-center bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl transition-colors duration-300">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="font-medium">037 833 9009</span>
                    </a>
                    <a href="mailto:mkt.lead@wecare-i.com" className="flex items-center bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl transition-colors duration-300">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">mkt.lead@wecare-i.com</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Back to Home */}
              <div className="text-center mt-8">
                <Link
                  href="/"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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

      <Toolbar />
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
